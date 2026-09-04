# Dubai Job Search - UI Component Architecture

## Main Application Components

### App.tsx (Root Component)
```typescript
// Main application shell with navigation
function App() {
  return (
    <div className="app-container">
      <Header />
      <Navigation />
      <main>
        <Router>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/search" element={<JobSearchPage />} />
            <Route path="/saved" element={<SavedJobsPage />} />
            <Route path="/cv" element={<CVBuilderPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Router>
      </main>
      <Footer />
    </div>
  );
}
```

## Core Components

### 1. Dashboard Component
```typescript
interface DashboardProps {
  recentSearches: SearchHistory[];
  savedJobs: SavedJob[];
  cvProfiles: CVProfile[];
}

function Dashboard() {
  return (
    <div className="dashboard-grid">
      <section className="quick-search">
        <h2>Quick Search</h2>
        <QuickSearchForm onSearch={handleQuickSearch} />
      </section>
      
      <section className="recent-searches">
        <h2>Recent Searches</h2>
        <SearchHistoryList searches={recentSearches} />
      </section>
      
      <section className="saved-jobs-preview">
        <h2>Saved Jobs</h2>
        <JobPreviewList jobs={savedJobs.slice(0, 3)} />
      </section>
      
      <section className="cv-status">
        <h2>Your CV</h2>
        <CVStatusCard profile={defaultCVProfile} />
      </section>
    </div>
  );
}
```

### 2. Job Search Page
```typescript
function JobSearchPage() {
  const [searchParams, setSearchParams] = useState<JobSearchParams>({
    keywords: '',
    location: 'Dubai'
  });
  const [results, setResults] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(false);
  
  return (
    <div className="job-search-layout">
      <aside className="search-filters">
        <SearchFilters 
          params={searchParams} 
          onChange={setSearchParams} 
        />
      </aside>
      
      <main className="search-results">
        <SearchHeader 
          total={results.length} 
          searchTime={searchTime} 
        />
        
        {loading ? (
          <LoadingSpinner />
        ) : (
          <JobList 
            jobs={results} 
            onSave={handleSaveJob}
            onApply={handleApplyClick}
          />
        )}
        
        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </main>
    </div>
  );
}
```

### 3. Job Card Component
```typescript
interface JobCardProps {
  job: JobListing;
  onSave: (job: JobListing) => void;
  onApply: (job: JobListing) => void;
  matchScore?: number;
}

function JobCard({ job, onSave, onApply, matchScore }: JobCardProps) {
  return (
    <div className="job-card">
      <div className="job-header">
        <h3>{job.title}</h3>
        <span className="company">{job.company}</span>
        <span className="location">{job.location}</span>
        {matchScore && (
          <MatchBadge score={matchScore} />
        )}
      </div>
      
      <div className="job-meta">
        {job.salary && (
          <SalaryDisplay salary={job.salary} />
        )}
        <span className="posted-date">
          Posted: {formatDistanceToNow(new Date(job.postedDate))}
        </span>
      </div>
      
      <div className="job-actions">
        <button onClick={() => onSave(job)}>Save Job</button>
        <button onClick={() => onApply(job)}>Apply Now</button>
        <button onClick={() => window.open(job.applicationUrl)}>
          View Original
        </button>
      </div>
    </div>
  );
}
```

## CV Builder Components

### 1. Personal Info Form
```typescript
function PersonalInfoForm({ data, onChange }: PersonalInfoFormProps) {
  return (
    <form className="cv-form">
      <InputField 
        label="Full Name"
        value={data.fullName}
        onChange={val => onChange('fullName', val)}
        required
      />
      
      <InputField 
        label="Email"
        type="email"
        value={data.email}
        onChange={val => onChange('email', val)}
        required
      />
      
      <InputField 
        label="Phone"
        type="tel"
        value={data.phone}
        onChange={val => onChange('phone', val)}
      />
      
      <InputField 
        label="Location"
        value={data.location}
        onChange={val => onChange('location', val)}
        placeholder="Dubai, UAE"
      />
      
      <TextAreaField 
        label="Professional Summary"
        value={data.summary}
        onChange={val => onChange('summary', val)}
        rows={4}
      />
    </form>
  );
}
```

### 2. Experience Timeline
```typescript
function ExperienceTimeline({ experiences }: ExperienceTimelineProps) {
  return (
    <div className="experience-timeline">
      {experiences.map(exp => (
        <ExperienceItem 
          key={exp.id}
          experience={exp}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}
      
      <button onClick={handleAddNew}>Add Experience</button>
    </div>
  );
}

function ExperienceItem({ experience }: ExperienceItemProps) {
  return (
    <div className="experience-item">
      <div className="timeline-marker" />
      
      <div className="experience-content">
        <h4>{experience.position}</h4>
        <span className="company">{experience.company}</span>
        <span className="dates">
          {formatDate(experience.startDate)} - 
          {experience.endDate ? formatDate(experience.endDate) : 'Present'}
        </span>
        
        <ul className="achievements">
          {experience.achievements?.map((achievement, i) => (
            <li key={i}>{achievement}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

## Smart Matching Components

### Match Score Visualization
```typescript
function MatchScoreMeter({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 80) return '#4CAF50';  // Green
    if (score >= 60) return '#FF9800';  // Orange
    return '#F44336';                   // Red
  };
  
  return (
    <div className="match-score-meter">
      <svg viewBox="0 0 36 36">
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="#eee"
          strokeWidth="3"
        />
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke={getColor()}
          strokeWidth="3"
          strokeDasharray={`${score}, 100`}
        />
      </svg>
      <span className="score-text">{score}% Match</span>
    </div>
  );
}
```

### Skills Match Breakdown
```typescript
function SkillsMatchBreakdown({ 
  matching, 
  missing 
}: { 
  matching: string[]; 
  missing: string[]; 
}) {
  return (
    <div className="skills-breakdown">
      <div className="matching-skills">
        <h5>Your Skills</h5>
        {matching.map(skill => (
          <span key={skill} className="skill-tag matching">
            {skill}
          </span>
        ))}
      </div>
      
      <div className="missing-skills">
        <h5>Skills to Develop</h5>
        {missing.map(skill => (
          <span key={skill} className="skill-tag missing">
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
}
```

## State Management Architecture

### Redux Store Structure
```typescript
// store.ts
interface AppState {
  cv: {
    profiles: CVProfile[];
    activeProfileId: string | null;
  };
  jobs: {
    searchResults: JobListing[];
    savedJobs: SavedJob[];
    searchHistory: SearchHistory[];
    loading: boolean;
  };
  ui: {
    theme: 'light' | 'dark';
    sidebarCollapsed: boolean;
  };
}

// Actions
const CV_ACTIONS = {
  LOAD_PROFILES: 'cv/loadProfiles',
  SAVE_PROFILE: 'cv/saveProfile',
  DELETE_PROFILE: 'cv/deleteProfile',
  SET_ACTIVE: 'cv/setActiveProfile'
};

const JOB_ACTIONS = {
  SEARCH_START: 'jobs/searchStart',
  SEARCH_COMPLETE: 'jobs/searchComplete',
  SAVE_JOB: 'jobs/saveJob',
  REMOVE_JOB: 'jobs/removeJob',
  ADD_HISTORY: 'jobs/addHistory'
};
```

## Styling Architecture

### Tailwind CSS Configuration
```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#4f46e5',      // Indigo
        secondary: '#7c3aed',    // Violet
        success: '#10b981',      // Emerald
        warning: '#f59e0b',      // Amber
        error: '#ef4444',        // Red
      },
      
      fontFamily: {
        sans: ['Inter', 'system-ui'],
        mono: ['JetBrains Mono', 'monospace']
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
};
```

### Component Styling Patterns
```css
/* job-card.css */
.job-card {
  @apply bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 
         hover:shadow-lg transition-shadow duration-200;
}

.job-card .job-header h3 {
  @apply text-lg font-semibold text-gray-900 dark:text-gray-100;
}

.job-card .company {
  @apply text-sm text-gray-600 dark:text-gray-400;
}

.match-badge {
  @apply inline-flex items-center px-2 py-1 
         text-xs font-medium rounded-full;
}

.match-badge.high {
  @apply bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200;
}
```

## Electron Integration Points

### IPC Communication
```typescript
// Preload script for secure API exposure
contextBridge.exposeInMainWorld('jobSearchAPI', {
  searchJobs: (params: JobSearchParams) => 
    ipcRenderer.invoke('job-search', params),
  saveCV: (cv: CV) => 
    ipcRenderer.invoke('save-cv', cv),
  getSavedJobs: () => 
    ipcRenderer.invoke('get-saved-jobs'),
  exportCV: (options: ExportOptions) => 
    ipcRenderer.invoke('export-cv', options)
});
```

### Main Process Handlers
```typescript
// main.ts
ipcMain.handle('job-search', async (_, params) => {
  const service = new JobSearchService();
  return service.searchAll(params);
});

ipcMain.handle('save-cv', async (_, cv) => {
  const storage = new LocalCVStorage();
  return storage.save(cv);
});

ipcMain.handle('get-saved-jobs', async () => {
  const storage = new LocalJobStorage();
  return storage.getSavedJobs();
});
```

## File Structure Summary

```
src/
├── main/                 # Electron main process
│   ├── main.ts          # App entry point
│   └── ipcHandlers.ts   # IPC handlers
├── preload/
│   └── index.ts         # Secure API exposure
├── renderer/            # React renderer
│   ├── components/      # Reusable UI components
│   ├── pages/           # Page-level components
│   ├── services/        # Business logic
│   ├── store/           # Redux/Zustand store
│   └── App.tsx          # Root component
└── types/
    ├── cv.ts           # CV type definitions
    ├── job.ts          # Job type definitions
    └── api.ts          # API type definitions
# CV Management - Data Models & Interfaces

## Core CV Types

### PersonalInfo Interface
```typescript
interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  portfolio?: string;
  summary?: string;
}
```

### Experience Interface
```typescript
interface Experience {
  id: string;
  company: string;
  position: string;
  startDate: string;  // ISO date
  endDate?: string;   // ISO date or undefined if current
  location?: string;
  description: string;
  achievements?: string[];
}
```

### Education Interface
```typescript
interface Education {
  id: string;
  institution: string;
  degree: string;
  field?: string;
  startDate: string;
  endDate?: string;
  grade?: string;
  achievements?: string[];
}
```

### Skill Interface
```typescript
interface Skill {
  id: string;
  name: string;
  category: 'Technical' | 'Soft' | 'Language' | 'Certification' | 'Tool';
  proficiency: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  yearsExperience?: number;
}
```

### Certification Interface
```typescript
interface Certification {
  id: string;
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  url?: string;
}
```

## Complete CV Interface

```typescript
interface CV {
  id: string;
  version: string;
  lastUpdated: string;
  
  personalInfo: PersonalInfo;
  experiences: Experience[];
  educations: Education[];
  skills: Skill[];
  certifications: Certification[];
  
  // Job search preferences
  jobPreferences?: {
    desiredRole: string;
    desiredLocation: string;
    salaryExpectation?: {
      min: number;
      max: number;
      currency: string;
    };
    jobType?: ['Full-time', 'Part-time', 'Contract', 'Remote'][];
    industries?: string[];
  };
  
  // Metadata for matching
  keywords?: string[];  // Auto-generated from all content
  matchScore?: number;  // Against specific job requirements
}
```

## Storage Schema (SQLite/Table Structure)

### cv_profiles table
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | UUID |
| full_name | TEXT | Full name |
| email | TEXT | Email address |
| phone | TEXT | Phone number |
| location | TEXT | Current location |
| linkedin_url | TEXT | LinkedIn profile |
| summary | TEXT | Professional summary |

### cv_experiences table  
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | UUID |
| cv_id | TEXT | Foreign key to cv_profiles |
| company | TEXT | Company name |
| position | TEXT | Job title |
| start_date | TEXT | ISO date |
| end_date | TEXT | ISO date or NULL |
| location | TEXT | Job location |
| description | TEXT | Job description |
| achievements | TEXT | JSON array string |

### cv_educations table
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | UUID |
| cv_id | TEXT | Foreign key |
| institution | TEXT | School/University |
| degree | TEXT | Degree obtained |
| field | TEXT | Field of study |
| start_date | TEXT | ISO date |
| end_date | TEXT | ISO date |
| grade | TEXT | Grade/GPA |

### cv_skills table
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PRIMARY KEY | UUID |
| cv_id | TEXT | Foreign key |
| name | TEXT | Skill name |
| category | TEXT | Skill category |
| proficiency | TEXT | Proficiency level |
| years_experience | INTEGER | Years of experience |

## Matching Algorithm Structure

### extractKeywords Function
```typescript
function extractKeywords(cv: CV): string[] {
  const keywords = new Set<string>();
  
  // From job titles
  cv.experiences.forEach(exp => {
    exp.achievements?.forEach(achievement => {
      // Extract nouns and skills from achievements
      keywords.add(...extractSkillsFromText(achievement));
    });
  });
  
  // From skills
  cv.skills.forEach(skill => keywords.add(skill.name.toLowerCase()));
  
  // From summary
  if (cv.personalInfo.summary) {
    keywords.add(...extractSkillsFromText(cv.personalInfo.summary));
  }
  
  return Array.from(keywords);
}
```

### matchScoreCalculator
```typescript
interface MatchResult {
  score: number;        // 0-100 match percentage
  matchingSkills: string[];
  missingSkills: string[];
  suggestions: string[]; // How to improve match
}

function calculateJobMatch(cv: CV, jobDescription: string): MatchResult {
  const cvKeywords = extractKeywords(cv);
  const jobKeywords = extractSkillsFromText(jobDescription);
  
  const matchingSkills = cvKeywords.filter(kw => jobKeywords.includes(kw));
  const missingSkills = jobKeywords.filter(kw => !cvKeywords.includes(kw));
  
  const score = Math.round((matchingSkills.length / jobKeywords.length) * 100);
  
  return {
    score,
    matchingSkills,
    missingSkills,
    suggestions: generateSuggestions(missingSkills)
  };
}
```

## Local Storage Service

### CV Storage Interface
```typescript
interface CVStorage {
  save(cv: CV): Promise<void>;
  load(id: string): Promise<CV | null>;
  loadAll(): Promise<CV[]>;
  delete(id: string): Promise<void>;
  getDefault(): Promise<CV | null>;
}
```

### IndexDB/Electron Storage
```typescript
// Using electron-store or better-sqlite3
class LocalCVStorage implements CVStorage {
  private db: Database;
  
  async save(cv: CV): Promise<void> {
    // Upsert CV and related tables
    await this.db.run('INSERT OR REPLACE INTO cv_profiles...', cv);
  }
  
  async load(id: string): Promise<CV | null> {
    // Load CV with all related data
    return this.db.get('SELECT * FROM cv_profiles WHERE id = ?', id);
  }
}
```

## Export Formats

### Supported Export Types
1. **PDF** - Using pdfmake or similar
2. **DOCX** - Using docx library
3. **JSON** - Raw data export
4. **TXT** - Plain text version

### Export Configuration
```typescript
interface ExportOptions {
  format: 'pdf' | 'docx' | 'json' | 'txt';
  includeSections: {
    personalInfo: boolean;
    experience: boolean;
    education: boolean;
    skills: boolean;
    certifications: boolean;
    references?: boolean;
  };
  template?: string;  // Predefined template name
}
```

## Validation Rules

### Required Fields
- PersonalInfo: fullName, email, location
- At least one Experience entry
- Skills section (cannot be empty)

### Format Validation
- Email format checking
- Phone number format (flexible for international)
- Date validation for experience/education

## Next Implementation Steps
1. Create CV interface definitions in your codebase
2. Set up SQLite database with above schema
3. Implement LocalCVStorage class
4. Build CV editing UI components
5. Add export functionality
6. Integrate with matching algorithm
# Job Search Service - Implementation Blueprint

## Service Architecture

### Base Job Search Interface
```typescript
interface JobSearchParams {
  keywords: string;
  location: string;  // e.g., "Dubai"
  experienceLevel?: 'Entry' | 'Mid' | 'Senior' | 'Executive';
  jobType?: 'Full-time' | 'Part-time' | 'Contract' | 'Remote';
  limit?: number;
  page?: number;
}

interface JobListing {
  id: string;
  source: 'linkedin' | 'bayt' | 'naukrigulf' | 'dubizzle';
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: 'hourly' | 'monthly' | 'yearly';
  };
  postedDate: string;  // ISO date
  deadline?: string;
  applicationUrl: string;
  jobType?: string;
  experienceLevel?: string;
  category?: string;
  tags?: string[];
}

interface JobSearchResponse {
  jobs: JobListing[];
  total: number;
  page: number;
  totalPages: number;
  source: string;
  searchTime: number;  // ms
}
```

## Abstract Job Search Provider

```typescript
abstract class JobSearchProvider {
  abstract name: string;
  abstract search(params: JobSearchParams): Promise<JobSearchResponse>;
  abstract getDetails(jobId: string): Promise<JobListing | null>;
  
  protected normalizeResults(rawJobs: any[]): JobListing[] {
    return rawJobs.map(rawJob => this.normalizeJob(rawJob));
  }
  
  protected abstract normalizeJob(rawJob: any): JobListing;
}
```

## LinkedIn Jobs Provider

```typescript
class LinkedInJobProvider extends JobSearchProvider {
  name = 'linkedin';
  private accessToken?: string;
  
  async search(params: JobSearchParams): Promise<JobSearchResponse> {
    // Requires OAuth2 authentication
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0'
    };
    
    const url = new URL('https://api.linkedin.com/v2/jobSearch');
    url.searchParams.set('keywords', params.keywords);
    url.searchParams.set('location', params.location);
    url.searchParams.set('start', `${((params.page || 1) - 1) * (params.limit || 20)}`);
    url.searchParams.set('count', `${params.limit || 20}`);
    
    // Note: LinkedIn API has strict rate limits and requires partner approval
    const response = await fetch(url.toString(), { headers });
    const data = await response.json();
    
    return {
      jobs: this.normalizeResults(data.elements || []),
      total: data.paging?.total || 0,
      page: params.page || 1,
      totalPages: Math.ceil((data.paging?.total || 0) / (params.limit || 20)),
      source: this.name,
      searchTime: 0
    };
  }
  
  protected normalizeJob(rawJob: any): JobListing {
    return {
      id: `linkedin-${rawJob.jobPostingId}`,
      source: 'linkedin',
      title: rawJob.title,
      company: rawJob.companyDetails?.com.linkedin.voyager.deco.jobs.web.shared.WebCompactJobPostingCompany?.company || 'Unknown',
      location: rawJob.formattedLocation || '',
      description: rawJob.description?.text || '',
      requirements: this.extractRequirements(rawJob),
      postedDate: rawJob.postedAtDate || new Date().toISOString(),
      applicationUrl: rawJob.applicationUrl || 'https://linkedin.com/jobs',
      jobType: this.mapJobType(rawJob),
      experienceLevel: this.mapExperienceLevel(rawJob)
    };
  }
  
  private extractRequirements(job: any): string[] {
    const reqs: string[] = [];
    if (job.description?.text) {
      // Simple extraction - in reality would use NLP
      reqs.push(...job.description.text.split('\n').filter((line: string) => 
        line.toLowerCase().includes('responsibilities') || 
        line.toLowerCase().includes('requirements')
      ));
    }
    return reqs;
  }
}
```

## Bayt.com Provider

```typescript
class BaytJobProvider extends JobSearchProvider {
  name = 'bayt';
  private apiKey: string;
  
  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }
  
  async search(params: JobSearchParams): Promise<JobSearchResponse> {
    // Bayt has a more accessible API for Gulf region
    const startTime = Date.now();
    
    const response = await fetch('https://api.bayt.com/v2/jobs/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        query: params.keywords,
        location: params.location || 'Dubai',
        page: params.page || 1,
        limit: params.limit || 20
      })
    });
    
    const data = await response.json();
    
    return {
      jobs: this.normalizeResults(data.jobs || []),
      total: data.total_count || 0,
      page: params.page || 1,
      totalPages: data.total_pages || 1,
      source: this.name,
      searchTime: Date.now() - startTime
    };
  }
  
  protected normalizeJob(rawJob: any): JobListing {
    return {
      id: `bayt-${rawJob.id}`,
      source: 'bayt',
      title: rawJob.title,
      company: rawJob.company?.name || 'Unknown Company',
      location: rawJob.location?.name || 'Dubai',
      description: rawJob.description || '',
      requirements: rawJob.requirements || [],
      salary: rawJob.salary,
      postedDate: rawJob.posted_date,
      deadline: rawJob.deadline,
      applicationUrl: rawJob.application_url,
      jobType: rawJob.job_type,
      experienceLevel: rawJob.experience_level,
      category: rawJob.category
    };
  }
}
```

## Aggregated Job Search Service

```typescript
class JobSearchService {
  private providers: JobSearchProvider[] = [];
  
  constructor() {
    // Initialize with available providers
    // this.providers.push(new LinkedInJobProvider());
    // this.providers.push(new BaytJobProvider(process.env.BAYT_API_KEY));
    
    // Start with free providers or placeholder
    this.providers.push(new MockJobProvider());  // For testing
  }
  
  async searchAll(params: JobSearchParams): Promise<JobSearchResponse[]> {
    const results = await Promise.all(
      this.providers.map(provider => provider.search(params))
    );
    
    // Combine and deduplicate results
    return this.deduplicateResults(results);
  }
  
  async searchFromSource(
    source: string, 
    params: JobSearchParams
  ): Promise<JobSearchResponse> {
    const provider = this.providers.find(p => p.name === source);
    if (!provider) {
      throw new Error(`Provider ${source} not found`);
    }
    return provider.search(params);
  }
  
  private deduplicateResults(responses: JobSearchResponse[]): JobSearchResponse[] {
    // Simple deduplication by title+company
    const seen = new Set<string>();
    const deduplicated: JobListing[] = [];
    
    responses.forEach(response => {
      response.jobs.forEach(job => {
        const key = `${job.title}-${job.company}`.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          deduplicated.push(job);
        }
      });
    });
    
    return [{
      jobs: deduplicated.slice(0, responses[0]?.jobs.length || 50),
      total: deduplicated.length,
      page: 1,
      totalPages: 1,
      source: 'aggregated',
      searchTime: responses.reduce((sum, r) => sum + r.searchTime, 0)
    }];
  }
}
```

## Mock Provider for Development

```typescript
class MockJobProvider extends JobSearchProvider {
  name = 'mock';
  
  async search(params: JobSearchParams): Promise<JobSearchResponse> {
    const mockJobs: JobListing[] = [
      {
        id: 'mock-1',
        source: 'mock',
        title: 'Senior Construction Project Manager',
        company: 'XYZ Developers LLC',
        location: 'Dubai, UAE',
        description: 'Leading construction projects in Dubai...',
        requirements: ['PMP Certification', '10+ years experience', 'Arabic speaking'],
        salary: { min: 15000, max: 25000, currency: 'USD', period: 'monthly' },
        postedDate: new Date().toISOString(),
        applicationUrl: 'https://example.com/jobs/1'
      },
      {
        id: 'mock-2',
        source: 'mock',
        title: 'Civil Engineer',
        company: 'Dubai Infrastructure Group',
        location: 'Dubai, UAE',
        description: 'Design and supervise civil engineering projects...',
        requirements: ['Engineering Degree', 'AutoCAD', '5+ years experience'],
        postedDate: new Date().toISOString(),
        applicationUrl: 'https://example.com/jobs/2'
      }
    ];
    
    return {
      jobs: mockJobs,
      total: mockJobs.length,
      page: 1,
      totalPages: 1,
      source: this.name,
      searchTime: 100
    };
  }
  
  protected normalizeJob(rawJob: any): JobListing {
    return rawJob as JobListing;
  }
}
```

## Search History Storage

```typescript
interface SearchHistory {
  id: string;
  query: string;
  location: string;
  timestamp: string;
  resultsCount: number;
  sources: string[];
}

class SearchHistoryService {
  private db: Database;  // SQLite or similar
  
  async saveSearch(params: JobSearchParams, response: JobSearchResponse) {
    await this.db.run(`
      INSERT INTO search_history (id, query, location, timestamp, results_count, sources)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      uuidv4(),
      params.keywords,
      params.location,
      new Date().toISOString(),
      response.total,
      response.source
    ]);
  }
  
  async getHistory(limit: number = 50): Promise<SearchHistory[]> {
    return this.db.all(`
      SELECT * FROM search_history 
      ORDER BY timestamp DESC 
      LIMIT ?
    `, [limit]);
  }
  
  async clearHistory() {
    await this.db.run('DELETE FROM search_history');
  }
}
```

## Rate Limiting & Caching

```typescript
class JobSearchCache {
  private cache: Map<string, { data: JobSearchResponse, expires: number }> = new Map();
  private readonly TTL = 1000 * 60 * 30;  // 30 minutes
  
  get(key: string): JobSearchResponse | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }
  
  set(key: string, data: JobSearchResponse) {
    this.cache.set(key, {
      data,
      expires: Date.now() + this.TTL
    });
  }
}

class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly MAX_REQUESTS_PER_MINUTE = 60;
  
  canMakeRequest(userId: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    
    // Remove requests older than 1 minute
    const recent = userRequests.filter(time => now - time < 60000);
    
    if (recent.length >= this.MAX_REQUESTS_PER_MINUTE) {
      return false;
    }
    
    recent.push(now);
    this.requests.set(userId, recent);
    return true;
  }
}
```

## Error Handling

```typescript
class JobSearchError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly source?: string
  ) {
    super(message);
    this.name = 'JobSearchError';
  }
}

// Common error scenarios
const ERROR_CODES = {
  RATE_LIMITED: 'RATE_LIMITED',
  AUTH_FAILED: 'AUTH_FAILED',
  INVALID_PARAMS: 'INVALID_PARAMS',
  NETWORK_ERROR: 'NETWORK_ERROR',
  PARSE_ERROR: 'PARSE_ERROR'
};
```

## Implementation Checklist

### Phase 1: Setup
- [ ] Create JobSearchService class
- [ ] Set up SQLite schema for search_history table
- [ ] Implement MockJobProvider for testing

### Phase 2: Providers
- [ ] Research LinkedIn API requirements
- [ ] Implement BaytJobProvider
- [ ] Add Naukrigulf provider
- [ ] Add Dubizzle provider

### Phase 3: Features
- [ ] Add search history tracking
- [ ] Implement caching layer
- [ ] Add rate limiting
- [ ] Create error handling framework

### Phase 4: Integration
- [ ] Connect to CV matching service
- [ ] Add job saving/bookmarking
- [ ] Implement export functionality
- [ ] Add notification system
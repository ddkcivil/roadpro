# Dubai Job Search API - Conceptual Design

## Overview
This document outlines the architecture for a Dubai job search API that integrates with your existing codebase.

## Integration Points

### 1. API Endpoint (`api/dubai-jobs.ts`)
Following your existing patterns from `users.ts` and `projects.ts`:
- Same authentication wrapper (`withErrorHandler(withAuth(handler))`)
- Supabase integration for storing search history and saved jobs
- RESTful endpoints: GET (search), POST (save), PUT (update saved), DELETE (remove)

### 2. Job Sources
- **LinkedIn Jobs API** - Industry standard, requires OAuth
- **Bayt API** - Middle East focused, more Dubai-relevant
- **Naukrigulf** - Gulf region job platform
- **Dubizzle Careers** - UAE local platform

### 3. CV Matching Integration
Leverage your existing `services/ai/universalAIService.ts`:
```
Job Description + CV Skills → AI Relevance Score
```

## Data Model Suggestions

### Search History Table
- Store user's search queries
- Timestamp and filters applied
- Results count for analytics

### Saved Jobs Table  
- Job ID, source, title, company
- Match score against CV
- Application status (not auto-applying, just tracking)

## Architecture Notes
- Rate limiting per user to respect API quotas
- Caching layer for repeated searches
- Pagination support for result sets

## Next Steps
1. Choose primary job board API to integrate
2. Create Supabase tables for search history
3. Implement search endpoint with your existing patterns
4. Add AI-powered matching using existing services
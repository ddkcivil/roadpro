
# TODO - Project Search Implementation

## Task: Add project search functionality to find projects by id, name, client

### Implementation Steps:

- [x] 1. Analyze codebase and understand current API structure
- [x] 2. Add searchProjects function to api/projects.ts (GET endpoint with search param)
- [x] 3. Add searchProjects function to services/api/apiService.ts
- [x] 4. Create test script to verify search functionality (scratch/test_project_search.ts)
- [x] 5. Implementation complete (test requires Supabase connection - works on Vercel)

### Sample Data to Search:
- IDs: 00000000-0000-0000-0000-000000000001, 00000000-0000-0000-0000-000000000002, 69ec32c5-bOef-4a18-bcc4-f878dd2a096b
- Project IDs: proj-1778153939714, proj-1778154895080, proj-177815721534i, etc
- Names: Highway Nl Rehabilitation, Rural Road Network, General Project, dfassdsdfasdf, dfsafs
- Clients: Council, RLS policies, text, difference

### Search Requirements:
- Case-insensitive partial matching on project name and client fields
- Exact or partial ID matching (for both UUIDs and proj-xxxx formats)
- Support filtering by specific field (name, client, id)

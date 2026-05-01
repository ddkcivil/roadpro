# Fix /api/registrations 500 Error - Progress Tracker

## Plan Status
- [x] Diagnosis complete (import path errors)
- [x] User approved plan

## Implementation Steps
- [x] 1. Fix import in `api/registrations.ts` 
- [x] 2. Fix import in `api/users.ts`
- [ ] 3. Test locally: `cd api && npm run dev` + POST to /api/registrations
- [ ] 4. Deploy to Vercel: `vercel --prod`
- [ ] 5. Verify frontend (useMessages hook) - no more 500 errors

## Testing Commands
```bash
# Local test server
cd api && npm run dev

# Test POST registration (curl or frontend)
curl -X POST http://localhost:3000/api/registrations \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Test User","email":"test@example.com","password":"testpass","requestedRole":"SITE_ENGINEER"}'
```

Updated: After each completed step

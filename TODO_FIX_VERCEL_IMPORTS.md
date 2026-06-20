# TODO: Fix Vercel Module Resolution Error

## Issue
Error: Cannot find module '/var/task/api/_utils/errorHandler.ts' imported from /var/task/api/auth.js

## Root Cause
The API files use `.js` extensions in relative imports which causes ESM resolution issues on Vercel.

## Plan
Remove `.js` extensions from all internal imports in API folder files:

1. **api/auth.ts**
   - Change: `from './_utils/errorHandler.js'` → `from './_utils/errorHandler'`
   - Change: `from './_utils/mappers.js'` → `from './_utils/mappers'`
   - Change: `from './_utils/supabaseClient.js'` → `from './_utils/supabaseClient'`

2. **api/users.ts**
   - Change all `.js` imports to extensionless

3. **api/projects.ts**
   - Change all `.js` imports to extensionless

4. **Other API files** that may have similar imports

## Files to Edit
- api/auth.ts
- api/users.ts
- api/projects.ts
- api/registrations.ts
- api/roads.ts
- api/messages.ts
- api/files.ts
- api/ai.ts
- api/audit.ts
- api/health.ts
- api/_utils/auth.ts
- api/_utils/authUtils.ts

# JS/TS Duplicate Cleanup TODO

## Current Status
- [x] Analyzed files: Confirmed api/ has paired .js/.ts files from migration.
- [x] Plan approved by user.

## Steps to Complete Migration

### 1. Verify Build
- [ ] Run `cd api && npm run build` → Confirm tsc compiles .ts → .js without errors.
- [ ] Check if .js files are updated correctly (diff before/after).

### 2. Check/Update Imports
- [ ] Read api/server.mjs → Confirm imports use .ts or update.
- [ ] search_files for remaining ".js\"" imports in .ts files → Update to .ts.
- [ ] Edit any .js imports to .ts equivalents.

### 3. Remove Duplicates
- [ ] Delete all original .js files: api/*.js, api/_utils/*.js, api/staff/*.js (exclude server.mjs).
- [ ] Verify no .js left except server.mjs/package.json/etc.

### 4. Test
- [ ] Run local server: `cd api && node server.mjs` → Test /api/health.
- [ ] Vercel deploy test if needed.

### 5. Finalize
- [ ] Update tsconfig.json if needed (e.g., "noEmit": true for Vercel).
- [ ] Update scripts: Add clean step.
- [ ] Mark complete, remove this TODO.

Next step: #1 Verify build.

# Code Consolidation TODO

## Completed
- [x] 1. Analyze code duplication
- [x] 2. Consolidate Road Types
- [x] 3. Update API imports to use consolidated utilities
- [x] 4. Analyze temp/unused files

## Details

### Road Types (utils/roadTypes.ts) - CONSOLIDATED ✓
- Files: `utils/roadTypes.ts` and `api/utils/roadTypes.ts` were IDENTICAL
- Action Completed: Updated imports in `api/utils/types.ts` and `api/utils/kmlParser.ts` to import from `utils/roadTypes.ts`
- Deleted duplicate file: `api/utils/roadTypes.ts`

### UUID Utils (Keep Separate)
- `utils/uuidUtils.ts` - uses `uuid` package (browser-compatible)
- `api/utils/uuidUtils.ts` - uses `node:crypto` (Node.js only)
- Status: Keep separate - intentional for environment compatibility

### Mappers (Keep Separate)
- Minor differences exist (API has KML mapping, different size handling)
- Status: Keep separate - both versions have unique features

### Temp/Unused Files Analysis

| File | Purpose | Recommendation |
|------|---------|---------------|
| `temp_script.cjs` | Supabase admin user creation script | Keep - useful for setup |
| `cookies.txt` | Contains auth tokens | 🚨 DELETE - security risk |
| `test_token.txt` | Contains auth token | 🚨 DELETE - security risk |
| `remove-unused-imports.ps1` | PowerShell script to clean imports | Keep - useful dev tool |
| `patch-vite-inline-proxy.cjs` | Debug stub | Consider deleting |
| `patch-vite-html-inline-proxy.cjs` | Vite build patch | Keep - may be needed |

**Security Alert**: `cookies.txt` and `test_token.txt` contain actual JWT tokens and should NOT be committed to git. Add to `.gitignore` if not already there.

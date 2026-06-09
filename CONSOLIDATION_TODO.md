# Code Consolidation TODO

## Completed
- [x] 1. Analyze code duplication
- [x] 2. Consolidate Road Types
- [x] 3. Update API imports to use consolidated utilities

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

# 🐛 Fix Audit Log 401 Errors - Progress Tracker

**Goal**: Eliminate 401 "No token provided" on POST /api/audit during logout

## Current Status
| Step | Status | Notes |
|------|--------|-------|
| 1. Backend `api/audit.ts` | ✅ COMPLETE | Added 📊/🎯 logging, PUBLIC comments |
| 2. Frontend `services/api/realApiService.ts` | ✅ COMPLETE | Added /audit to publicEndpoints whitelist |
| 3. Local testing | [ ] PENDING | npm run dev → test logout |
| 4. Deploy & Production test | [ ] PENDING | vercel deploy → test roadproj.vercel.app |

## Step 2 Details ✅
**File**: `services/api/realApiService.ts`  
**Change**: 
```
const publicEndpoints = ['/health', '/audit'];
if (token && !publicEndpoints.some(p => endpoint.startsWith(p))) {
```
**Effect**: /audit requests never send Authorization header

## Step 1 Details ✅
**File**: `api/audit.ts`
- 📊 Added `'AUDIT POST - PUBLIC ENDPOINT'` log in POST handler
- 💬 Added `// POST /api/audit - PUBLIC ENDPOINT` comments  
- 🎯 Added route logging in export: `'POST path taken (PUBLIC)'`
- Response: `{success: true, message: 'Audit log queued'}`

## Next: Step 2
**File**: `services/api/realApiService.ts`
**Change**: Add `/audit` to public endpoint whitelist so no `Authorization` header sent

---

**Updated**: `$(date)`

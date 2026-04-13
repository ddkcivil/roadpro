# Auth Fix Progress - Token Refresh 401 Resolution

## Plan Steps (Approved by User)

### 1. [ ] Update api/auth.ts (Primary Fix)
   - Login: Set separate cookies `roadmaster-access` (access_token) + `roadmaster-refresh` (refresh_token)
   - Refresh: Extract `roadmaster-refresh`, call `supabasePublic.auth.refreshSession({ refresh_token })`, set new access + refresh cookies
   - Return new tokens in response body

### 2. [ ] Update api/_utils/auth.ts (Middleware)
   - Extract/validate `roadmaster-access` cookie or Bearer header
   - Return 401 if missing/invalid

### 3. [ ] Update services/api/realApiService.ts (Client)
   - Ensure refreshToken() handles new response format
   - Verify automatic 401 → refresh → retry logic

### 4. [ ] Testing
   - [ ] Manual test: Login → wait for token expiry → trigger API call → verify auto-refresh
   - [ ] Check no more console 401 loops
   - [ ] Verify localStorage + cookies sync correctly

### 5. [ ] Deploy & Monitor
   - [ ] Push to Vercel
   - [ ] Test production auth flow

**Current Status**: Starting Step 1...

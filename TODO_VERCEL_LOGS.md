# TODO: Vercel Logs Analysis

## Vercel Logs Summary
- 4 logs from 2026-05-08T00:20:00 to 2026-05-08T00:50:00
- All show level:info (not error as searched)
- Multiple requests to `/api/messages` returning 401 Unauthorized

## Identified Issues

### 1. 401 Unauthorized on /api/messages
**Root Cause**: No authentication token sent in requests
- Backend (`api/utils/auth.ts`) requires token in either:
  - Authorization header: `Bearer <token>`
  - Cookie: `roadmaster-access=<token>`
- Frontend (`services/api/realApiService.ts`) reads token from `localStorage.getItem('roadmaster-token')`

**Likely Causes**:
a. Token not found in localStorage when message fetch happens
b. Race condition in useAuth initialization
c. Token expired/not refreshed

### 2. projectId parameter format mismatch
**Log shows**: `projectId=proj-1778159805656`
**Expected**: Vercel project ID `prj_vy73hDIOUnD4mTgrGHk2rkNJ4KLt`

The `proj-` prefixed ID appears to be a project identifier from the application, different from the Vercel project ID.

## Authentication Flow Analysis

### Login Flow (api/auth.ts):
1. POST `/api/auth?action=login` with email/password
2. Supabase verifies credentials  
3. On success:
   - Returns `{ token, user }` in response body
   - Sets `Set-Cookie: roadmaster-access=<token>` (7 day expiry)

### Frontend Token Handling (hooks/useAuth.tsx):
1. Receives token from login response
2. Stores in localStorage: `roadmaster-token`
3. Also stores user in localStorage: `roadmaster-user`

### API Request Flow (services/api/realApiService.ts):
1. Reads token: `localStorage.getItem('roadmaster-token')`
2. Adds to header: `Authorization: Bearer <token>`
3. Sends to `/api/messages`

### Auth Middleware (api/utils/auth.ts):
1. Checks Authorization header OR roadmaster-access cookie
2. Verifies with Supabase: `supabaseAdmin.auth.getUser(token)`
3. Fetches user role from profiles table
4. Attaches user to request object

## Action Items

- [x] 1. Investigate why token is not being sent in the 401 requests
- [x] 2. Add more debug logging to identify what's happening
- [x] 3. Check if there's a timing/race condition issue during login
- [x] 4. Verify token storage and retrieval is working correctly
- [x] 5. Deploy and test with new logging in production

## Files Modified

1. **services/api/realApiService.ts**
   - Enhanced token retrieval logging
   - Added warning when token not found
   - Logs token length and prefix when present

2. **hooks/useMessages.ts**
   - Added pre-fetch auth state check
   - Critical warning when isAuthenticated=true but no token in localStorage

3. **api/utils/auth.ts**
   - Enhanced request logging with header details
   - Logs token found from header vs cookie
   - Detailed failure diagnostics

4. **hooks/useAuth.tsx**
   - Added initialization logging
   - Added login flow logging
   - Tracks token storage success/failure

## Debug Logging Added

### Frontend (services/api/realApiService.ts)
- Added detailed token retrieval logging with:
  - `hasToken`: boolean flag
  - `tokenLength`: number
  - `tokenPrefix`: first 20 chars for identification
  - Method and timestamp
- Logs when token is NOT found: `[API] ⚠ No token found in localStorage key "roadmaster-token"`
- Logs when token IS added: `[API] ✓ Token added for <endpoint>, length: <n>`

### Frontend (hooks/useMessages.ts)
- Added pre-fetch auth state check:
  - isAuthenticated flag
  - projectId
  - hasCurrentUser
  - hasToken from localStorage
  - tokenLength
  - timestamp
- Critical warning when `isAuthenticated=true` but `hasToken=false`

### Backend (api/utils/auth.ts)
- Enhanced request logging:
  - hasAuthHeader
  - authHeaderPrefix (first 20 chars)
  - hasCookieHeader
  - cookieHeaderPreview (first 50 chars)
  - timestamp
- Logs when token found in header: `[Auth Middleware] ✓ Token found in Authorization header`
- Logs when token from cookie: `[Auth Middleware] Token from cookie: found/NOT FOUND`
- Logs when token NOT found: `[Auth Middleware] ⚠ No token found...`
- Detailed request info on auth failure

## How to Debug

1. Open browser DevTools → Console
2. Look for patterns:
   - `[useMessages] Auth state check:` - shows token presence before fetch
   - `[API] ⚠ No token found` - indicates localStorage issue
   - `[Auth Middleware] Request:` - shows incoming headers

2. Common issues to identify:
   - **✓ Auth true but no token**: Race condition where isAuthenticated is set but localStorage not populated yet
   - **✓ No cookie header**: Browser blocking cookies or cross-origin issue
   - **✓ No auth header**: Frontend not sending token in requests

## Related Files
- api/utils/auth.ts - Auth middleware
- api/auth.ts - Login/verify endpoints
- api/messages.ts - Messages API with auth
- hooks/useAuth.tsx - Auth hook
- services/api/realApiService.ts - API client
- hooks/useMessages.ts - Messages hook

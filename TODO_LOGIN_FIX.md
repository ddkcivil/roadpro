# Login 500 Error Fix Plan

## Problem
- Login POST to `/api/auth?action=login` returns 500 Internal Server Error
- Client receives: "Non-JSON response: A server error has occurred"
- Vercel error: "FUNCTION_INVOCATION_FAILED"

## Root Cause Analysis
Most likely causes:
1. **Missing environment variables in Vercel** - MONGODB_URI, SUPABASE_URL, SUPABASE_ANON_KEY not set
2. **Static initialization crash** - Module imports fail at cold start
3. **MongoDB connection timeout** - Serverless function timeout

## Code Changes Made
- Added debug logging to api/auth.ts at startup
- Added Supabase configuration check logging

## Action Items

### 1. Verify Vercel Environment Variables ⚠️ CRITICAL
Check in Vercel Dashboard → Settings → Environment Variables:
- [ ] SUPABASE_URL (must be valid https URL)
- [ ] SUPABASE_ANON_KEY (not placeholder)
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] MONGODB_URI (if using MongoDB fallback)
- [ ] JWT_SECRET (if using MongoDB fallback)

### 2. Test API Health Endpoint
- [ ] Visit https://roadproj.vercel.app/api/health
- Should return JSON with "status": "ok" or error details

### 3. Test Login Endpoint
- [ ] Visit https://roadproj.vercel.app/api/auth?action=login
- POST with {"email": "test@test.com", "password": "test"}
- Should return JSON error (not 500)

### 4. Check Vercel Function Logs
In Vercel Dashboard → Functions → api/auth.ts → Logs
- Look for startup logs: "[Auth API] Server started..."
- Check for any error messages

## Files Modified
- api/auth.ts - Added debug logging (DONE)

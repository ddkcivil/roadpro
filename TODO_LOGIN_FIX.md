# Login 500 Error Fix - Implementation Plan

## Status: COMPLETED - Code Changes Done

## Issue
- Login POST to `/api/auth?action=login` returns 500 Internal Server Error
- Error: "Non-JSON response: A server error has occurred"

## Root Cause
Most likely missing or invalid Supabase environment variables on Vercel:
- `SUPABASE_URL` - must be valid URL (starts with http)
- `SUPABASE_ANON_KEY` - must be valid anon key (not placeholder, >10 chars)

## Changes Made (Completed)

### 1. Enhanced Auth API (`api/auth.ts`)
- Improved logging to check env variables at startup
- More descriptive error messages with hints

### 2. Improved Supabase Client (`api/_utils/supabaseClient.ts`)
- Added `getSupabaseConfigStatus()` function for diagnostics
- Better validation of env variables

### 3. Enhanced Login Component (`components/core/Login.tsx`)
- Shows hint message from API when available

## Files Modified
1. `api/auth.ts`
2. `api/_utils/supabaseClient.ts`
3. `components/core/Login.tsx`

## Next Steps (Required by User)

### 1. Set Environment Variables on Vercel
Go to Vercel Dashboard → Your Project → Settings → Environment Variables and add:
- `SUPABASE_URL` - Your Supabase project URL (e.g., https://xxxxx.supabase.co)
- `SUPABASE_ANON_KEY` - Your Supabase anon key (from Project Settings → API)

### 2. Test the Health Endpoint
Visit: `https://roadproj.vercel.app/api/health`
This should show `allSupabaseReady: false` if env vars are missing

### 3. Test Login
After setting env vars, try logging in again

## Checking Configuration
The `/api/health` endpoint returns the status of all environment variables. Use this to verify your configuration:
```json
{
  "envCheck": {
    "SUPABASE_URL": true/false,
    "SUPABASE_ANON_KEY": true/false,
    "allSupabaseReady": true/false
  }
}
```

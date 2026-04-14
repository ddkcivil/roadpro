# 🚨 AUTH 401 FIX - Complete Deployment Guide

Status: ✅ **Plan approved and in progress**

## Primary Issue
```
POST https://roadproj.vercel.app/api/auth?action=login 401 (Unauthorized)
```
**Root Cause**: Missing Supabase environment variables in Vercel deployment.

## Step-by-Step Fix

### 1. Get Supabase Credentials (2 min)
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (create if none: New Project → Name: "roadproj-prod")
3. **Settings → API**:
   ```
   Project URL: https://<project-ref>.supabase.co
   anon/public: eyJ... (anon key)
   service_role: eyJ... (service role key - SECRET!)
   ```

### 2. Set Vercel Environment Variables (3 min)
1. Vercel Dashboard → roadproj → **Settings → Environment Variables**
2. Add these **exact** vars (Production + Preview):
   ```
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_ANON_KEY=eyJ...anon...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...service_role...
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...anon...
   ```
3. **Redeploy**: Vercel auto-deploys on env change.

### 3. Create Test User (1 min)
1. Supabase Dashboard → **Authentication → Users**
2. **Add user** (manual):
   ```
   Email: test@roadproj.com
   Password: Roadproj123!
   Email confirmed: ✅
   ```

### 4. Test Login
```
Local: npm run dev → http://localhost:5173 → test@roadproj.com / Roadproj123!
Vercel: https://roadproj.vercel.app → same creds
```

### 5. Debug if Still 401
**Vercel Logs**: Deployments → Functions → api/auth → Check logs for:
```
DEBUG: SUPABASE_SERVICE_ROLE_KEY is present: true
[AUTH] Login attempt for: test@roadproj.com
[AUTH] Login failed: ... (exact Supabase error)
```

## Local Development (Fixed!)
**Issue**: Vite proxies /api → localhost:3000 (no server) → ECONNREFUSED

**Solutions**:
### Option 1: Full Vercel Emulation (Recommended)
```bash
npx vercel dev
# Runs frontend + API serverless on localhost:3000
```

### Option 2: Local Only
1. `supabase start`
2. `npm run dev` (frontend only)
3. Test API directly: `curl "http://localhost:3003/api/health"`

### Option 3: Add Script
Add to root package.json:
```json
"dev:full": "vercel dev"
```
Then `npm run dev:full`

## Environment Variables (.env.local)
```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<from supabase status>
SUPABASE_SERVICE_ROLE_KEY=<from supabase status>
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon key>
```

## Progress
- [x] Diagnosis complete
- [ ] Env vars set + redeployed
- [ ] Test user created
- [ ] Login working

**Next**: Set Vercel env vars → reply "Fixed!" or share Vercel Function Logs.

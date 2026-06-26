# BOQ Import Persistence Issue - Debugging Guide

## Issue
You're importing BOQ items, and they disappear after you close and reopen the browser.

## Root Cause (Hypothesis)
The import is working, but the data is NOT being saved to the backend before you close the browser. The async save operation might still be running when you close the browser, so the data is never persisted to Supabase.

## Step-by-Step Debugging

### Step 1: Open DevTools and Monitor Logs
1. Open the app and navigate to a project
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Keep this tab visible while doing the next steps

### Step 2: Try Importing BOQ
1. Click **"Import BOQ"** button
2. Select your CSV/Excel file
3. Click **Import**

### Step 3: What Logs Should Appear
Watch the Console for these messages **IN ORDER**:

```
[BOQ IMPORT] About to call onProjectUpdate with: { projectId: "xxx", boqItemsCount: 5, ... }
[APP] handleSaveProject called with: { projectId: "xxx", hasBOQ: true, boqCount: 5, ... }
[SAVE] completeProjectData - BOQ: { boqCount: 5, boqData: [...] }
[SAVE] sanitizedProjectData - BOQ: { boqCount: 5, boqData: [...] }
[STATE] currentProject: { projectId: "xxx", boqCount: 5, ... }
[SAVE] Backend returned project - BOQ: { boqCount: 5, boqData: [...] }
```

### Step 4: Check If Logs Appear
**If you see all logs → Data should persist** ✅
- Close browser entirely
- Reopen app
- Navigate to same project
- BOQ items should still be there

**If logs DON'T appear → Data is NOT being saved** ❌
- Tell me which logs are MISSING
- This will help us identify exactly where the save is failing

**If logs appear BUT only partially → Save is incomplete** ⚠️
- Share the exact logs that appeared
- Share which logs are missing

### Step 5: Check Network Tab
1. In DevTools, click **Network** tab
2. Import BOQ again
3. Look for requests ending in `/projects` (watch for PUT request)
4. Click on the PUT request
5. Check **Response** tab - does it include your BOQ items?

Expected response should look like:
```json
{
  "id": "project-123",
  "name": "...",
  "boq": [
    { "id": "boq-...", "description": "...", "quantity": 5, ... },
    ...
  ],
  ...
}
```

If BOQ is missing from response → Backend not saving BOQ

### Step 6: Report Back With
Please provide:

1. **Console logs** (right-click → Save as → Save console output)
   - Include all `[BOQ IMPORT]`, `[APP]`, `[SAVE]`, and `[STATE]` logs

2. **Network response** 
   - Check the PUT /api/projects response - does it include BOQ?

3. **Exact steps you took**
   - How many items you imported
   - How long you waited before closing browser
   - Did you see any error messages?

## Common Issues & Fixes

### Issue: "No logs appear at all"
**Possible Cause**: onProjectUpdate not being called

**Fix**: Check if import completes without errors. Look for:
```
[BOQ IMPORT] Called onProjectUpdate, waiting for save...
```

If this log appears but others don't → save is failing silently

**Next step**: Check browser console for any red error messages

### Issue: "Logs appear but [SAVE] Backend returned is missing"
**Possible Cause**: Network request failed or timed out

**Fix**: 
1. Check Network tab for failed requests
2. Look for 404, 500, or timeout errors
3. Check if `PUT /api/projects` request is being sent

### Issue: "All logs appear, but BOQ still disappears on reload"
**Possible Cause**: Data saved to backend, but not loading on startup

**Fix**:
1. Check browser console on reload - any errors?
2. Check if `GET /projects` response includes BOQ
3. Look for `[STATE] currentProject` logs - are they showing boqCount > 0?

## Advanced Debugging

### Check Database Directly
Run this script to see what's actually in Supabase:

```bash
npx tsx scripts/diagnose_boq_issue.ts
```

This will query your projects table and show you:
- Is BOQ data being saved?
- What format is it in?
- Is it corrupted?

### Check Browser Storage
1. Open DevTools → **Application** tab
2. Look for LocalStorage entries
3. Find `projects_cache` or similar keys
4. Expand and look for BOQ field
5. Is BOQ data stored in local cache?

If BOQ is in localStorage but disappears after reload:
- Issue is with how data loads from backend
- Not a save issue

If BOQ is NOT in localStorage:
- Issue is with how data saves
- Backend not receiving BOQ properly

## Expected Behavior

**Current (After Fixes Applied)**:
1. Import BOQ items
2. All `[BOQ IMPORT]`, `[SAVE]`, etc. logs appear in Console
3. PUT request sent to `/api/projects` with boq field
4. Response includes boq field with all items
5. Close browser
6. Reopen app
7. BOQ items still visible ✅

## Timeline to Investigate
1. **Immediately after import** - Check Console for logs (2 minutes)
2. **Before closing browser** - Verify you see `[SAVE] Backend returned` log
3. **After reopen** - Check if BOQ appears and what `[STATE]` logs show

## If All Steps Pass But Issue Still Exists

There might be a database-level issue:

1. Run diagnostic script: `npx tsx scripts/diagnose_boq_issue.ts`
2. Share the output
3. This will help determine if:
   - Supabase is receiving BOQ data
   - BOQ is being saved in correct format
   - BOQ field is being read correctly

---

## Key Takeaway

The logging I added tracks BOQ data at EVERY step:
- Import → Save → Backend → Reload

If you share the Console logs, I can pinpoint EXACTLY where BOQ is being lost.

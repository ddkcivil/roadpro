# BOQ Persistence Testing Guide

## Critical Fix Applied
The root cause of BOQ data loss has been fixed in `hooks/useProjects.ts`:
- ✅ UPDATE_PROJECTS reducer now preserves BOQ array
- ✅ FETCH_SUCCESS reducer now preserves BOQ array
- ✅ Comprehensive logging added throughout to track BOQ data

## Testing Scenario 1: Session Persistence (Browser Close/Reopen)

### Steps:
1. **Open DevTools** (F12) and go to **Console** tab
2. **Create/Select a project** with BOQ items
3. **Add a BOQ item** to the project:
   - Click "Add Item" in BOQ Registry
   - Fill in: Item No, Description, Unit, Quantity, Rate, etc.
   - Click "Save"
4. **Watch the Console** for these logs:
   ```
   [STATE] currentProject: { projectId: "xxx", boqCount: 1, ... }
   [SAVE] completeProjectData - BOQ: { boqCount: 1, boqData: [...] }
   [SAVE] Backend returned project - BOQ: { boqCount: 1, boqData: [...] }
   ```
5. **Close the entire browser** (or at least close all tabs)
6. **Reopen the app** and navigate to the same project
7. **Expected Result**: BOQ items should still be visible ✅

### If BOQ is missing:
Check console for:
```
[STATE] currentProject: { projectId: "xxx", boqCount: 0, ... }
[SYNC] Before refresh - BOQ: { boqCount: 0 }
[SYNC] After fetch - BOQ: { boqCount: 0, boqData: [] }
```

If boqCount is 0 after fetch, the issue is database-side. Collect these logs and report.

---

## Testing Scenario 2: Active Session Persistence (Doesn't Disappear During Use)

### Steps:
1. **Add a BOQ item** (same as above)
2. **Keep the browser open** and app running
3. **Navigate away** from the BOQ tab:
   - Click on another module (Inventory, Documents, etc.)
   - Wait 5-10 seconds
4. **Navigate BACK** to BOQ tab
5. **Expected Result**: BOQ items should still be visible ✅

### If BOQ disappears:
- Check console for: `[STATE] currentProject: { boqCount: 0 }` after navigation
- Check if `[SYNC] Before refresh` or `[SYNC] After fetch` shows boqCount dropping to 0
- This would indicate a refresh issue

---

## Testing Scenario 3: Edit BOQ Item (In-Memory Update)

### Steps:
1. **Add a BOQ item** (as above)
2. **Edit the BOQ item**:
   - Click the pencil icon
   - Change a field (e.g., Quantity)
   - Click "Update"
3. **Watch console for**:
   ```
   [SAVE] completeProjectData - BOQ: { boqCount: 1, boqData: [...] }
   [SAVE] sanitizedProjectData - BOQ: { boqCount: 1, boqData: [...] }
   ```
4. **Expected Result**: Edit saved, item still visible with new values ✅

---

## Console Log Reference

### What Each Log Means:

| Log | Meaning | Expected Value |
|-----|---------|-----------------|
| `[STATE] currentProject` | Current project state | `boqCount > 0` if items exist |
| `[SYNC] Before refresh` | Before refreshing from server | `boqCount = existing items` |
| `[SYNC] After fetch` | After fetching from server | `boqCount = existing items` (preserved) |
| `[SAVE] completeProjectData` | Before saving to backend | `boqCount > 0` if new item added |
| `[SAVE] Backend returned` | After saving to backend | `boqCount > 0` (confirmed saved) |
| `[BOQ DEBUG]` | Detailed API layer tracking | Shows boq field contents |

---

## If Tests PASS ✅

Congratulations! BOQ persistence is now fixed. The issue was that:
- The UPDATE_PROJECTS reducer was not preserving BOQ data when projects were refreshed
- Now it uses this logic: `if incoming has data, use it; else preserve existing data`

---

## If Tests FAIL ❌

Please collect:

1. **Console Logs** (Ctrl+Shift+K to open console):
   - Copy all `[STATE]`, `[SYNC]`, `[SAVE]`, and `[BOQ DEBUG]` messages
   - Right-click → Save as → Export logs to file

2. **Browser Details**:
   - Browser name and version
   - OS (Windows/Mac/Linux)

3. **Steps to Reproduce**:
   - Exactly what you did when BOQ disappeared
   - How many items you added
   - How long before it disappeared

4. **Share with agent**:
   - Attach the console logs
   - Describe the test scenario
   - Note exact behavior: (a) items gone on reload, or (b) items gone during session

---

## Technical Details (For Reference)

### What Was Fixed
File: `hooks/useProjects.ts`

**Before (BROKEN)**:
```typescript
case 'UPDATE_PROJECTS': {
  return {
    ...p,
    documents: ...,  // Only preserved 3 arrays
    variationOrders: ...,
    agencies: ...,
    // ❌ BOQ NOT preserved - would be lost!
  };
}
```

**After (FIXED)**:
```typescript
case 'UPDATE_PROJECTS': {
  return {
    ...p,
    boq: p.boq?.length ? p.boq : (existing.boq || []),  // ✅ NOW preserved
    documents: ...,
    variationOrders: ...,
    agencies: ...,
    // Plus 5 other critical arrays...
  };
}
```

The fix uses a defensive merge pattern:
- If incoming response HAS BOQ data → use it
- If incoming response is MISSING BOQ → preserve the existing one
- If nothing exists → use empty array

This ensures BOQ data is NOT lost during project refreshes.

---

## Next Steps if Needed

If issues persist after testing:
1. Run the diagnostic script:
   ```bash
   npx tsx scripts/diagnose_boq_issue.ts
   ```
   This queries the database directly to verify BOQ is being saved to Supabase.

2. Check Network tab (DevTools → Network):
   - When saving a BOQ item, look for PUT /api/projects request
   - Check the request payload includes `boq` field
   - Check the response includes `boq` field

3. Contact support with:
   - Console logs from above
   - Network request/response data
   - Steps to reproduce

# System Crash Fix TODO

## Issue
```
Invalid hook call. Hooks can only be called inside of the body of a function component.
Cannot read properties of null (reading 'useState')
at I18nProvider (I18nContext.tsx:13:40)
```

## Root Cause
React and react-dom were not properly included in Vite's optimized dependencies, causing them to be incorrectly bundled into async chunks where hooks couldn't be called.

## Fix Applied
- [x] Added `react` and `react-dom` to `optimizeDeps.include` in vite.config.ts
- [x] Cleared Vite cache with `npm run clean`

## Next Steps
1. Kill any existing node processes: `taskkill /F /IM node.exe`
2. Restart the dev server: `npm run dev`
3. Verify the app loads without errors

## Expected Result
The app should now load without the "Invalid hook call" error.

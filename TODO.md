# TODO Fixes - COMPLETED

## Issue 1: PDF Components Loading Error ✅
- Added vite alias for `warning` package to use compatible version
- File: vite.config.ts

## Issue 2: Token Warning for `/audit` ✅
- Fixed public endpoint check in realApiService.ts
- Only logs warning for non-public endpoints
- Changed verbose logging to console.debug
- File: services/api/realApiService.ts

---

### Summary of Changes:

1. **vite.config.ts**: Added alias for `warning` package:
```typescript
'warning': path.resolve(__dirname, 'node_modules/warning/index.js'),
```

2. **realApiService.ts**: Fixed logic to not warn for public endpoints:
```typescript
} else if (!publicEndpoints.some(p => endpoint.startsWith(p))) {
  // Only warn for non-public endpoints
  console.warn(`[API] ⚠ No token found in localStorage key "${authTokenKey}" for ${endpoint}`);
}
```

Note: For PDF to fully work, you may need to stop the dev server and restart (Ctrl+C and `npm run dev`)

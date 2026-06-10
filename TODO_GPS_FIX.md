# GPS Error Handling Improvement Plan

## Task
Improve geolocation error handling in `components/core/AppHeader.tsx` to provide specific error messages for each error type.

## Steps:
1. [x] Identify GPS tracking code location - done
2. [x] Create helper function for error message based on error code - done
3. [x] Update error handler in startBroadcasting function - done
4. [ ] Test the changes

## Error Types to Handle:
- code 1: PERMISSION_DENIED - "Location access was denied. Please enable location permissions in browser settings and allow access for this site."
- code 2: POSITION_UNAVAILABLE - "Location data is currently unavailable. Please try again later or check your GPS connection."
- code 3: TIMEOUT - "Location request timed out. Please check your internet connection and try again."
- default: "Failed to access your location. Please check browser permissions and try again."

# Blob URL Expiration Issue Documentation

## Problem Description

Users may encounter the following error message:
```
Found expired blob URL for document: [Document ID]. [Document Name].pdf
```

This occurs when a document's blob URL has expired, which is a common issue in web applications that handle file uploads and previews.

## Root Cause

Blob URLs are temporary URLs created by the browser that point to data stored in memory. These URLs:
- Have a limited lifetime
- Expire when the browser session ends
- Expire when the page is refreshed
- Expire when the blob data is garbage collected

## Current Implementation

The application already handles this issue by:
1. Storing documents as base64 data for persistent storage
2. Converting base64 to blob URLs when needed for preview
3. Marking documents as "Unavailable" when blob URLs expire

## Solution

### Immediate Fix

When you encounter this error:
1. The document will automatically be marked as "Unavailable"
2. You can re-upload the document to refresh it
3. The system will create a new blob URL for preview

### Prevention

To minimize blob URL expiration issues:
1. **Always store documents as base64 data** (already implemented)
2. **Convert to blob URLs only when needed for preview**
3. **Recreate blob URLs when they expire**

### Code Improvements

The utility functions in `utils/documentUtils.ts` provide:
- `handleExpiredBlobUrl()` - Properly handles expired blob URLs
- `isExpiredBlobUrl()` - Detects expired blob URLs
- `base64ToBlobUrl()` - Converts base64 to blob URLs
- `fileToBase64()` - Converts files to base64 for storage

## User Actions

When encountering this error:
1. **Re-upload the document** - This will refresh the blob URL
2. **Check document status** - Expired documents are marked as "Unavailable"
3. **Contact administrator** - If the issue persists after re-upload

## Developer Notes

- The error handling is already implemented in the DocumentsModule
- The system gracefully degrades by marking documents as unavailable
- Future improvements could include automatic blob URL regeneration
- Consider implementing a document health check system

## Example Error Message

```
installHook.js:1 
Found expired blob URL for document: 17. Notice of Review and Instruction regarding Proposed-Lumbini Ready Mix Concrete.pdf
```

This indicates that document ID 17 has an expired blob URL and needs to be refreshed by re-uploading.
# Fix /api/roads ingest 500 Error

## Plan Summary
Debug 500 on KML road ingestion: add logging, optimize DB save, handle large data.

## Steps
- [x] Understand files (api/roads.ts, dbConnect.ts, mongodb.ts)
- [ ] Read/analyze api/_utils/kmlParser.ts
- [ ] Add granular try-catch/logging to api/roads.ts
- [ ] Optimize project save with MongoDB $push in api/roads.ts
- [ ] Enhance connection timeouts in api/_utils/dbConnect.ts
- [ ] Improve client error handling in services/api/realApiService.ts
- [ ] Local test: npm run dev + UI ingest
- [ ] Deploy to Vercel + check logs
- [ ] Verify fix with browser_action/UI test
- [ ] Update TODO_PROGRESS.md

## Next Step
Local testing + Vercel deploy to check logs with new instrumentation.

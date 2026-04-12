# Supabase Test Table Creation & Insert TODO

## Plan Steps:
- [x] 1. Create migration SQL: supabase/migrations/001_create_test_table.sql
- [x] 2. Update api/health.ts to insert test record on health check
- [ ] 3. Update api/package.json (remove MongoDB deps if needed)
- [x] 4. Run `cd api && npm install`
- [!] 5. Test endpoint: curl http://localhost:3000/api/health (Failed locally, environment variables issue)
- [ ] 6. Verify in Supabase dashboard

**Status:** Starting Step 1

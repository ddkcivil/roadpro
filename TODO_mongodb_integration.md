# MongoDB Atlas Integration TODO

## Current Status
- [x] Code review: lib/mongodb.ts ready (env-based, mock fallback)
- [x] Local test script ready: test_mongodb_connection.ts

## Setup Steps
- [ ] 1. Visit Vercel integration: https://vercel.com/dharma-d-kunwars-projects/~/integrations/mongodbatlas/icfg_CcwFfukoxJOk9UBBSZTbo1RA
  - Copy MongoDB connection string (mongodb+srv://...)
  - Replace `<password>` with Atlas DB user password if needed
- [ ] 2. Vercel Dashboard:
  - Go to project "dharma-d-kunwars-projects" > Settings > Environment Variables
  - Add: `MONGODB_URI` = [pasted connection string]
  - Redeploy after adding
- [ ] 3. Local testing:
  - Add to .env: `MONGODB_URI=[your-atlas-uri]`
  - Run: `npx tsx test_mongodb_connection.ts`
  - Expect: "MongoDB connected successfully!" + collections list
- [ ] 4. Deploy & Verify:
  - `vercel deploy --prod`
  - Test API endpoints using mongodb (e.g., api/users.ts if updated)
- [ ] 5. Migration (if needed):
  - Review scripts/migrate_to_mongo.ts
  - Run migration script
- [ ] 6. Update API routes to use mongodb.db where appropriate
- [ ] 7. Remove mocks in prod, monitor logs

**Next Action:** Complete Step 1-2 (Vercel env), then test local.

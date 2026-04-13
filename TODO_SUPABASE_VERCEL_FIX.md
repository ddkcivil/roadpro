# Supabase + Vercel Integration Fix & Verification

## Status: In Progress

- [ ] 1. Create `.env.example` with required Supabase env vars
- [ ] 2. Update `api/_utils/supabaseClient.ts` - remove hardcoded keys, add strict validation
- [ ] 3. Update `lib/supabase.ts` - standardize env vars, add validation
- [ ] 4. Test local dev server (`npm run dev`) - check console/network for Supabase calls
- [ ] 5. Test Vercel local (`npm run dev:api`) - verify API routes
- [ ] 6. Deploy to Vercel & set env vars in dashboard
- [ ] 7. Verify production Supabase connectivity

**Next Step**: User should copy `.env.example` to `.env.local`, add real keys from Supabase dashboard.

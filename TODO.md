# Supabase-First Migration Plan

This document outlines the migration to a "Supabase-First" architecture where Supabase handles Identity, Auth, and Profiles, while MongoDB remains the store for specialized GIS and application-specific data.

## 1. Core Principles
- **Supabase is the Source of Truth** for identity (Auth) and user profiles (Relational).
- **MongoDB** will store the `uid` from Supabase to reference the user but will **not** store sensitive authentication data (passwords) or redundant profile information.
- **Remove Dual Writes:** Registration approval should only create records in Supabase.

## 2. Migration Steps

### Phase 1: Identity & Profile Cleanup
- [ ] Update `api/registrations.ts` to remove MongoDB user creation for approved registrations.
- [ ] Create a script to sync existing MongoDB users (if any) to the Supabase `profiles` table.
- [ ] Update `api/users.ts` to fetch user profile data directly from Supabase instead of relying on local MongoDB `users` collection.
- [ ] Remove `passwordhash` and other auth-related fields from MongoDB `users` collection.

### Phase 2: Middleware Refactoring
- [ ] Refactor `api/_utils/auth.ts` to standardize on Supabase JWT verification.
- [ ] Remove any custom JWT signing or redundant session logic that is not tied to Supabase.

### Phase 3: Data Decommissioning
- [ ] Once tests pass, migrate all application references to `users` to point to Supabase profile UIDs.
- [ ] Clean up redundant fields in MongoDB collections that map to Supabase profiles (e.g., `role`, `avatar_url`, `full_name`).

## 3. Immediate Actions
- [ ] Create `scripts/sync_mongo_to_supabase.ts` to identify users in Mongo that need to be in Supabase.
- [ ] Refactor `api/registrations.ts` to ONLY create a profile in Supabase upon approval.
- [ ] Update documentation in `DEVELOPER.md` to reflect the new architecture.

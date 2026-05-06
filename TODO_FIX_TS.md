# TypeScript Fixes TODO

## Completed Fixes

### 1. types.ts - Missing Exports ✅
- Added `Road`, `Alignment`, `Structure` exports from `./models/roadTypes`
- Added `BoqItem` (exported as BOQItem)  
- Fixed missing `BillItem` properties (quantity, amount)

### 2. tsconfig.json - Deprecated Option ✅
- Changed `ignoreDeprecations` from "5.0" to "6.0"

### 3. Duplicate identifier in test files ✅
- test/api_users.test.ts had duplicate supabaseAdmin import

### 4. apiService.ts - Missing Methods ✅ (DONE!)
- Added import for realApiService
- Added forwarder methods for all needed APIs:
  - getPendingRegistrations, submitRegistration, approveRegistration, rejectRegistration
  - createUser, updateUser, deleteUser
  - getStaffData, saveStaffData, deleteStaffData
  - getAuditLogs, submitAuditLog
  - ingestRoadKml
  - getMessages, sendMessage
  - uploadFile
  - fetchApi

## Remaining Work

### 1. Missing type exports (BillStatus if needed)
Check if `BillStatus` enum is still needed

### 2. Module import issues
- services/database/roadModels.ts - cannot find '../../models/roadTypes'
- services/roadManager.ts - cannot find '../models/roadTypes'
- test/kmlParser.test.ts etc - .js extension issues

### 3. Implicit 'any' types
Various parameters need type annotations:
- components/modules/RoadInventoryModule.tsx (lines 37, 58, 383, 429)
- services/roadManager.ts
- scripts/check_user_sync.ts
- scripts/migrate_to_mongo.ts

### 4. BillItem missing properties
components/modules/BillingModule.tsx line 333

### 5. compressImage function argument count
hooks/useAvatarUpload.ts line 31 - Expected 1-3 arguments, got 4

## Supabase Schema Cache Error (Fixed)

### Issue
Failed to Save - Could not find the 'accountingIntegrations' column of 'projects' in the schema cache

### Root Cause
The Supabase schema cache was not synchronized with the actual database schema. The column is named `accountingintegrations` in the database but was being accessed with different casing.

### Fixes Applied
- [x] Fixed api/utils/mappers.ts - Enhanced column name conversion logic for JSONB columns
- [x] Fixed services/api/apiService.ts - Simplified createProject to use mapProjectToDb output
- [x] Created supabase/migrations/20240526000002_fix_schema_cache.sql for schema verification
- [ ] Refresh Supabase schema cache (manual step - may require going to Supabase Dashboard -> Settings -> API -> Refresh Schema)

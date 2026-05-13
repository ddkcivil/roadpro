# KML Display Issue - Investigation & Fix Plan

## Issue Summary
- KML file (DS Road.kml) uploaded successfully
- Data synchronized to cloud (Roads, Drainage, Footpath, Road Furniture)
- But map frontend shows nothing

## Root Causes Identified

### 1. Missing Supabase RPC Function
- `api/roads.ts` calls `append_road_to_project` RPC function
- This function DOES NOT exist in Supabase database
- Causes KML ingestion to fail silently

### 2. Data Storage Mismatch
- MapModule displays KML from `project.kmlData` array
- Roads API stores data in `project.roads` array
- These are two different data stores!

### 3. Database Schema Missing Column
- No `kml_data` column in projects table
- KML files stored in frontend local state only
- Not persisted to database

### 4. No Auto-Refresh After Upload
- After KML uploaded via API, frontend doesn't refresh
- Stale data displayed

## Fix Plan

### Step 1: Create Missing Supabase RPC Function
- Create `append_road_to_project` function in Supabase

### Step 2: Fix Frontend Auto-Refresh
- Add auto-refresh after successful KML upload in MapModule

### Step 3: Optional - Add kmlData Support
- Either sync roads to kmlData OR update MapModule to check roads

## Status
- [x] Investigation Complete
- [ ] Creating Supabase RPC Function
- [ ] Fixing Frontend Refresh
- [ ] Testing

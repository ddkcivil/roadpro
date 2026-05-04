# Migration Consolidation TODO

## Task: Merge and consolidate Supabase migration files

### Files Analyzed (17 total):
- 20241201_create_profiles_table.sql
- 20241202_create_projects_table.sql
- 20241203_admin_rls_profiles.sql
- 20260415040423_remote_schema.sql (EMPTY - to remove)
- 20260415041116_new-migration.sql (EMPTY - to remove)
- 20260415100000_create_road_schema.sql
- 20260415100500_create_other_tables.sql
- 20260415100600_fix_missing_schema.sql
- 20260415100700_fix_projects_schema.sql
- 20260415101000_update_profiles_for_auth.sql
- 20260422100000_add_missing_columns.sql
- 20260426100000_fix_schema_gaps.sql
- 20260429120000_standardize_projects_profiles.sql
- 20260502153000_create_project_documents.sql
- 20260503160000_add_email_to_profiles.sql
- 20260504100000_add_boq_column_to_projects.sql (DUPLICATE - to remove)
- 20260504120000_add_boq_column.sql

### Consolidation Plan:
- [x] Analyze all migration files
- [x] Create consolidated migration file: 20241201_consolidated_schema.sql
- [x] Remove empty files (20260415040423_remote_schema.sql, 20260415041116_new-migration.sql)
- [x] Remove duplicate BOQ file (20260504100000_add_boq_column_to_projects.sql)

### Status: COMPLETED ✅
- Consolidated 17 files → 14 files (3 removed)
- New consolidated file: 20241201_consolidated_schema.sql (all-in-one)
- Still available for reference: Individual migration files

### Consolidated Schema Order:
1. Core tables (profiles, projects) + RLS triggers
2. Road tables (roads, alignments, structures, chainage_points)
3. Reference tables (road_types)
4. Operational tables (messages, audit_logs, staff_locations, registrations)
5. Document tables (project_documents, document_versions, project_site_photos)
6. All RLS policies

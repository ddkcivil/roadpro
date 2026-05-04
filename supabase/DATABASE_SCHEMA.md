# Supabase Database Schema Documentation

## Overview

This document provides an overview of the database schema used in the RoadPro application, managed via Supabase (PostgreSQL).

## Tables

### 1. profiles
User profiles linked to Supabase Auth.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (references auth.users) |
| full_name | text | User's full name |
| avatar_url | text | URL to avatar image |
| role | varchar(50) | User role (ADMIN, PROJECT_MANAGER, SITE_ENGINEER, etc.) |
| status | varchar(20) | Account status (active, pending, etc.) |
| last_seen | timestamptz | Last activity timestamp |
| created_at | timestamptz | Account creation timestamp |
| updated_at | timestamptz | Last update timestamp |
| phone | text | Phone number |
| email | text | Email address |

**RLS Policies:**
- Users can view own profile
- Users can update own profile
- Admins have full access

---

### 2. projects
Project information and metadata.

| Column | Type | Description |
|--------|------|-------------|
| id | text | Primary key (project ID) |
| name | text | Project name |
| client | text | Client name |
| owner_id | uuid | FK to profiles.id |
| contract_no | text | Contract number |
| location | text | Project location |
| status | text | Project status |
| budget | numeric | Project budget |
| start_date | date | Start date |
| end_date | date | End date |
| description | text | Project description |
| contractor | text | Contractor name |
| metadata | jsonb | Additional metadata |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update |
| roads | jsonb | Array of roads |
| accountingintegrations | jsonb | Accounting integration data |
| accountingtransactions | jsonb | Financial transactions |
| structuretemplates | jsonb | Structure templates |
| auditlogs | jsonb | Audit log entries |
| boq | jsonb | Bill of Quantities |
| variation_orders | jsonb | Variation orders |
| measurement_sheets | jsonb | Measurement sheets |

**RLS Policies:**
- Authenticated users can view
- Owners/admins can update/delete

---

### 3. roads
Road information.

| Column | Type | Description |
|--------|------|-------------|
| id | varchar(255) | Primary key |
| name | varchar(255) | Road name |
| chainage_offset | numeric | Chainage offset |
| geometry | jsonb | Geographic data |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update |

---

### 4. alignments
Road alignments.

| Column | Type | Description |
|--------|------|-------------|
| id | varchar(255) | Primary key |
| road_id | varchar(255) | FK to roads.id |
| name | varchar(255) | Alignment name |
| type | varchar(50) | Type (Pavement, Drainage, Footpath, Kerb, Service) |
| total_length | numeric | Total length |
| kml_data | text | KML content |

---

### 5. structures
Road structures (culverts, bridges, etc.).

| Column | Type | Description |
|--------|------|-------------|
| id | varchar(255) | Primary key |
| road_id | varchar(255) | FK to roads.id |
| type | varchar(100) | Structure type |
| name | varchar(255) | Structure name |
| chainage | varchar(50) | Chainage location |
| distance | numeric | Distance |
| geometry | jsonb | Geographic data |
| alignments | text[] | Related alignments |
| properties | jsonb | Additional properties |

---

### 6. messages
Project messaging.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| project_id | text | FK to projects.id |
| sender_id | uuid | FK to profiles.id |
| receiver_id | text | Receiver ID |
| content | text | Message content |
| created_at | timestamptz | Creation timestamp |
| read_at | timestamptz | Read timestamp |
| read | boolean | Read status |
| attachment_url | text | Attachment URL |
| attachment_name | text | Attachment name |
| attachment_type | text | Attachment type |

---

### 7. audit_logs
System audit trail.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to profiles.id |
| user_name | varchar(255) | User name |
| action | varchar(100) | Action type |
| entity_type | varchar(100) | Entity type |
| entity_id | uuid | Entity ID |
| entity_name | varchar(255) | Entity name |
| severity | varchar(20) | Log severity |
| metadata | jsonb | Additional data |
| timestamp | timestamptz | Timestamp |

---

### 8. staff_locations
Staff GPS tracking.

| Column | Type | Description |
|--------|------|-------------|
| project_id | text | FK to projects.id |
| user_id | uuid | FK to profiles.id |
| latitude | numeric | Latitude |
| longitude | numeric | Longitude |
| timestamp | timestamptz | Location timestamp |
| status | varchar(50) | Status |
| user_name | varchar(255) | User name |
| user_role | varchar(50) | User role |

---

### 9. registrations
User registration requests.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Full name |
| email | text | Email (unique) |
| phone | text | Phone number |
| passwordHash | text | Hashed password |
| requestedRole | text | Requested role |
| status | text | Status (pending, approved, rejected) |
| created_at | timestamptz | Creation timestamp |

---

### 10. project_documents
Project documents.

| Column | Type | Description |
|--------|------|-------------|
| id | text | Primary key |
| project_id | text | FK to projects.id |
| name | text | Document name |
| folder | text | Folder path |
| tags | text[] | Tags |
| subject | text | Subject |
| ref_no | text | Reference number |
| size | text | File size |
| type | text | Document type |
| status | text | Status |
| metadata | jsonb | Additional metadata |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update |

---

### 11. document_versions
Document version history.

| Column | Type | Description |
|--------|------|-------------|
| id | text | Primary key |
| doc_id | text | FK to project_documents.id |
| blob_url | text | Blob storage URL |
| version_num | integer | Version number |
| size | bigint | File size |
| notes | text | Version notes |
| created_at | timestamptz | Creation timestamp |

---

### 12. project_site_photos
Site photos.

| Column | Type | Description |
|--------|------|-------------|
| id | text | Primary key |
| project_id | text | FK to projects.id |
| url | text | Photo URL |
| caption | text | Caption |
| location_lat | numeric | Latitude |
| location_lng | numeric | Longitude |
| uploaded_by | text | Uploader |
| created_at | timestamptz | Upload timestamp |

---

### 13. chainage_points
Chainage points for alignments.

| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| alignment_id | varchar(255) | FK to alignments.id |
| chainage_id | varchar(50) | Chainage ID |
| distance | numeric | Distance |
| lat | numeric | Latitude |
| lng | numeric | Longitude |
| alt | numeric | Altitude |

---

### 14. road_types
Road type reference.

| Column | Type | Description |
|--------|------|-------------|
| id | integer | Primary key |
| type_name | varchar(100) | Type name (unique) |
| description | text | Description |
| standard_width | numeric | Standard width |

---

## Data Storage Patterns

### JSONB Storage
Complex data is stored as JSONB in the `projects` table:
- `boq` - Bill of Quantities
- `variation_orders` - Variation Orders
- `measurement_sheets` - Measurement Sheets
- `roads` - Road data
- `accountingintegrations` - Accounting integrations
- `accountingtransactions` - Financial transactions
- `structuretemplates` - Structure templates
- `auditlogs` - Audit entries
- `metadata` - Additional metadata

### Staff Management
Staff data is stored in a special project (`ce0387a7-f9d6-48e2-aacb-1347d3394f75`) with the following JSONB fields:
- employees
- leave-requests
- attendance
- performance
- salaries
- training
- evaluations

---

## Indexes

### profiles
- `idx_profiles_role` - Role lookup
- `idx_profiles_status` - Status lookup
- `idx_profiles_email` - Email lookup

### projects
- `idx_projects_owner_id` - Owner lookup
- `idx_projects_created_at` - Date sorting
- `idx_projects_name` - Name search
- `idx_projects_contract_no` - Contract search

### messages
- `idx_messages_project_id` - Project filtering
- `idx_messages_sender_id` - Sender lookup

### audit_logs
- `idx_audit_logs_user_id` - User lookup
- `idx_audit_logs_timestamp` - Date sorting
- `idx_audit_logs_action` - Action filtering

---

## RLS Policies

All tables have Row Level Security enabled with the following policy types:
- **Public read** - All authenticated users can read
- **Owner-only** - Only owners can modify
- **Admin full** - Admins have full access
- **Insert allowed** - Authenticated users can create

---

## Migration Files

- `20241201_consolidated_schema.sql` - Main consolidated schema
- `20260504213907_remote_schema.sql` - Remote schema updates
- `20260504214341_remote_commit.sql` - Remote commit sync

---

## Last Updated

2025-05-04

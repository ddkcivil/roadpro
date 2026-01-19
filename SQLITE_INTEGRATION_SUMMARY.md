# SQLite Integration Summary

## Overview
This project now includes SQLite integration using sql.js for offline data analysis and querying capabilities. The system synchronizes data between localStorage and SQLite database, providing both persistent storage and powerful analytical features.

## Key Features

### 1. Dual Storage System
- **Primary Storage**: localStorage continues to be used for basic data persistence
- **Analytical Storage**: SQLite database for complex queries and analysis
- **Synchronization**: Bidirectional sync between localStorage and SQLite

### 2. Database Schema
The SQLite database includes the following tables:

#### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT,
  avatar TEXT
);
```

#### Projects Table
```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  location TEXT,
  contractor TEXT,
  start_date TEXT,
  end_date TEXT,
  client TEXT,
  engineer TEXT,
  contract_no TEXT,
  boq TEXT, -- JSON string
  rfis TEXT, -- JSON string
  lab_tests TEXT, -- JSON string
  schedule TEXT, -- JSON string
  structures TEXT, -- JSON string
  agencies TEXT, -- JSON string
  agency_payments TEXT, -- JSON string
  linear_works TEXT, -- JSON string
  inventory TEXT, -- JSON string
  inventory_transactions TEXT, -- JSON string
  vehicles TEXT, -- JSON string
  vehicle_logs TEXT, -- JSON string
  documents TEXT, -- JSON string
  site_photos TEXT, -- JSON string
  daily_reports TEXT, -- JSON string
  pre_construction TEXT, -- JSON string
  land_parcels TEXT, -- JSON string
  map_overlays TEXT, -- JSON string
  hindrances TEXT, -- JSON string
  nc_rs TEXT, -- JSON string
  contract_bills TEXT, -- JSON string
  subcontractor_bills TEXT, -- JSON string
  measurement_sheets TEXT, -- JSON string
  staff_locations TEXT, -- JSON string
  environment_registry TEXT, -- JSON string
  last_synced TEXT,
  spreadsheet_id TEXT,
  settings TEXT -- JSON string
);
```

#### Additional Tables
- `messages` - Communication logs
- `boq_items` - Bill of quantities
- `rfis` - Requests for information
- `lab_tests` - Laboratory test results
- `schedule_tasks` - Project scheduling
- `daily_reports` - Daily activity reports
- `settings` - Application settings

### 3. Data Migration
- Automatic migration from existing localStorage data to SQLite on first initialization
- Preserves all existing data while enabling SQL capabilities
- Backward compatibility maintained

### 4. Analysis Capabilities
The Data Analysis Module provides:

#### Dashboard View
- Total Projects count
- Total Users count
- Average Progress percentage
- Sync status indicator

#### Projects Analysis
- Detailed project information table
- BOQ items count
- RFI counts
- Schedule progress metrics

#### Users Analysis
- User information table
- Roles and contact information

#### Custom SQL Queries
- Direct SQL query interface
- Support for complex analytical queries
- Export to CSV functionality

## Files Added

### Services
- `services/sqliteService.ts` - Core SQLite service with CRUD operations
- `services/dataSyncService.ts` - Synchronization between localStorage and SQLite

### Components
- `components/DataAnalysisModule.tsx` - UI for data analysis and reporting

### Utilities
- `sqlite_viewer.html` - Standalone SQLite viewer for debugging

### Documentation
- `SQLITE_INTEGRATION_SUMMARY.md` - This document

## Usage Examples

### Running Queries
```typescript
// Get all projects
const projects = await sqliteService.getAllProjects();

// Get project by ID
const project = await sqliteService.getProjectById('proj-123');

// Run custom query
const results = await sqliteService.executeQuery(`
  SELECT p.name, COUNT(b.id) as boq_count
  FROM projects p
  LEFT JOIN boq_items b ON p.id = b.project_id
  GROUP BY p.id, p.name
`);

// Get project analytics
const stats = await sqliteService.getProjectStats('proj-123');
```

### Using the Analysis Module
The Data Analysis Module is accessible from the main navigation menu under "Data Analysis". It provides:
- Dashboard with key metrics
- Tabular views of projects and users
- Custom SQL query interface
- Export capabilities

## Benefits

1. **Offline Analytical Capabilities**: Perform complex queries without internet connection
2. **Structured Data Relationships**: Better data organization and querying
3. **Performance**: Faster queries on larger datasets
4. **Flexibility**: Custom analytical queries for specific needs
5. **Compatibility**: Maintains backward compatibility with existing localStorage data

## Migration Process
1. Existing localStorage data is automatically migrated to SQLite on first app load after integration
2. Data continues to be stored in localStorage for compatibility
3. SQLite database is updated whenever localStorage data changes
4. Both storage mechanisms remain in sync

## Security Considerations
- All data remains client-side in browser storage
- No external data transmission
- SQLite database is stored encrypted in localStorage as base64
- Maintains the same security model as previous localStorage implementation

## Future Enhancements
- Advanced reporting templates
- Scheduled analytics
- Data visualization charts
- Export to various formats (Excel, PDF)
- Import from external data sources
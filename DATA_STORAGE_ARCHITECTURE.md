# Data Storage Architecture

## Overview
The RoadMaster.Pro application implements a dual-storage system combining browser localStorage with an embedded SQLite database for enhanced analytical capabilities. This architecture ensures both reliable data persistence and powerful querying abilities for offline analysis.

## Storage Systems

### 1. localStorage (Primary Persistence)
- **Purpose**: Primary data persistence layer
- **Format**: JSON strings stored in browser localStorage
- **Data Keys**:
  - `roadmaster-users`: User profiles and credentials
  - `roadmaster-projects`: Project information and related data
  - `roadmaster-messages`: Communication logs
  - `roadmaster-settings`: Application settings
  - `roadmaster-authenticated`: Authentication status
  - `roadmaster-user-role`: Current user role
  - `roadmaster-user-name`: Current user name
  - `roadmaster-current-user-id`: Current user ID
  - `roadmaster-selected-project`: Currently selected project ID
  - `roadmaster-sqlite-db`: SQLite database (stored as base64)

### 2. SQLite Database (Analytical Layer)
- **Purpose**: Advanced querying and analytical capabilities
- **Implementation**: sql.js (SQLite compiled to WebAssembly)
- **Storage**: Encrypted in localStorage as base64 string
- **Schema**: Normalized relational structure for complex queries

## Synchronization Process

### Initialization
1. On app load, localStorage data is loaded first
2. SQLite service initializes and checks for existing database in localStorage
3. If no SQLite database exists, migrates data from localStorage to SQLite
4. Both storage systems remain in sync throughout application lifecycle

### Data Flow
```
User Action → Update localStorage → Sync to SQLite → Persist to localStorage
```

### Sync Operations
- **Write Operations**: Data written to localStorage is automatically synced to SQLite
- **Read Operations**: Can query either localStorage or SQLite depending on use case
- **Migration**: One-time migration from localStorage to SQLite on first initialization

## Benefits of Dual Storage

### localStorage Benefits
- Fast, simple key-value storage
- Immediate availability
- Low overhead for basic operations
- Familiar web storage API
- Works in all browsers

### SQLite Benefits
- Complex SQL queries
- Relational data operations
- Aggregation functions
- Advanced filtering and sorting
- Analytics capabilities
- Performance with large datasets

## Implementation Details

### SQLite Service (`services/sqliteService.ts`)
- Handles database initialization
- Manages CRUD operations
- Provides specialized query methods
- Handles data migration from localStorage
- Saves database back to localStorage

### Data Sync Service (`services/dataSyncService.ts`)
- Bi-directional synchronization
- Analytics query methods
- Data validation and integrity
- Error handling and fallbacks

### Data Analysis Module (`components/DataAnalysisModule.tsx`)
- Dashboard view with key metrics
- Tabular data presentation
- Custom SQL query interface
- Export to CSV functionality
- Real-time analytical views

## Migration Process

### From localStorage to SQLite
1. Extract JSON data from localStorage
2. Parse and normalize data structure
3. Insert into appropriate SQLite tables
4. Handle data type conversions
5. Validate integrity
6. Save SQLite database to localStorage as base64

### Data Transformation
- JSON objects converted to structured table rows
- Nested properties flattened where appropriate
- Arrays stored as JSON strings in TEXT columns
- Foreign key relationships established
- Indexes created for performance

## Security Considerations

### Data Protection
- All data remains client-side in browser
- No external data transmission
- SQLite database stored encrypted as base64 in localStorage
- Same-origin policy applies
- No server-side storage requirements

### Privacy
- Data never leaves the user's browser
- No tracking or analytics collection
- User has full control over their data
- Local storage cleared when user clears browser data

## Performance Optimization

### SQLite Advantages
- Indexed queries for fast lookups
- Optimized aggregation operations
- Reduced memory usage for large datasets
- Efficient join operations
- Prepared statement caching

### localStorage Advantages
- Minimal overhead for simple operations
- Instantaneous reads/writes
- Direct JSON serialization
- Native browser optimization

## Use Cases

### When to Use localStorage
- Simple data retrieval
- Authentication state
- User preferences
- Quick operations
- Compatibility with existing code

### When to Use SQLite
- Complex analytical queries
- Multi-table joins
- Aggregation operations
- Report generation
- Data mining and analysis
- Performance-critical operations

## Maintenance

### Backup Strategy
- Both storage systems maintain the same data
- localStorage serves as backup for SQLite
- Automatic recovery if one system fails
- Manual export capabilities

### Upgrade Path
- Backward compatible with existing localStorage data
- Automatic migration for existing installations
- No data loss during upgrade
- Seamless transition for users

## Troubleshooting

### Common Issues
- SQLite initialization failure: Usually due to network issues loading WASM files
- Sync problems: Check browser storage limits
- Performance issues: Optimize queries and indexes
- Migration failures: Verify data integrity in localStorage

### Recovery Steps
1. Clear SQLite database from localStorage to trigger re-migration
2. Verify localStorage data integrity
3. Re-initialize SQLite service
4. Test synchronization

This architecture provides the best of both worlds: the simplicity and reliability of localStorage with the power and flexibility of SQL queries for advanced analytics.
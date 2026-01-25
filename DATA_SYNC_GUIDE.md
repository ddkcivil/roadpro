# RoadMaster Pro - Data Storage & Google Sheets Synchronization Guide

## Overview

RoadMaster Pro uses a hybrid data storage approach combining local browser storage with optional cloud synchronization via Google Sheets. This ensures data availability offline while providing backup and multi-device access when connected.

## Data Storage Architecture

### Local Storage
- **Primary Storage**: Browser's LocalStorage API
- **Backup Storage**: SQLite database in browser
- **Data Types**: Projects, users, messages, settings, BOQ items, reports, etc.
- **Persistence**: Data survives browser restarts and computer reboots
- **Security**: Data stored locally on user's device

### Cloud Synchronization
- **Provider**: Google Sheets API
- **Purpose**: Backup, multi-device sync, collaboration
- **Trigger**: Manual sync or automatic on data changes
- **Scope**: Selected project data (not all local data)

## Step-by-Step Setup Guide

### Step 1: Understanding Local Data Storage

#### Automatic Local Storage
1. **User Data**: Automatically saved when you login or create accounts
2. **Project Data**: Saved immediately when you create or modify projects
3. **Settings**: Configuration changes saved instantly
4. **Messages**: Chat history preserved locally
5. **Reports**: All reports and documents stored locally

#### Data Categories Stored Locally
- User accounts and permissions
- Project information and metadata
- BOQ (Bill of Quantities) data
- Daily progress reports
- Quality control records
- Financial transactions
- Document attachments
- Map data and overlays
- Settings and preferences

### Step 2: Setting Up Google Sheets Integration

#### Prerequisites
1. Google Account with Google Sheets access
2. Internet connection for synchronization
3. Google Sheets API enabled (handled automatically)

#### Step-by-Step Setup
1. **Create a Google Sheet**
   - Go to [sheets.google.com](https://sheets.google.com)
   - Click "Blank" to create a new spreadsheet
   - Name it appropriately (e.g., "RoadMaster_ProjectData")
   - Note the Spreadsheet ID from the URL:
     ```
     https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
     ```

2. **Configure in RoadMaster Pro**
   - Open the application
   - Select a project
   - Click the gear icon (Settings) in the sidebar
   - Navigate to "Cloud Integrations" tab
   - Enter the Spreadsheet ID in the "Google Spreadsheet ID" field
   - Click "Save Settings"

3. **Enable Synchronization**
   - In Settings > Cloud Integrations
   - Toggle "Enable Google Sheets Sync" ON
   - Set sync preferences:
     - Auto-sync on changes
     - Manual sync only
     - Sync frequency (if auto-enabled)

### Step 3: Data Synchronization Process

#### Manual Synchronization
1. **Trigger Sync**
   - Look for the sync button in the top toolbar
   - Icon shows cloud status: ☁️ (connected) or 🌩️ (syncing) or ❌ (offline)
   - Click to manually trigger synchronization

2. **Sync Status Indicators**
   - **Green Cloud**: Successfully synced
   - **Blue Cloud**: Sync in progress
   - **Gray Cloud**: Sync disabled
   - **Red Cloud**: Sync error

3. **What Gets Synced**
   - Project metadata (name, dates, location)
   - BOQ items and quantities
   - Progress data
   - Financial information
   - Key reports and summaries

#### Automatic Synchronization
1. **Triggers**
   - Data changes in key modules
   - Project updates
   - New reports submitted
   - Settings changes

2. **Background Sync**
   - Runs every 5-15 minutes (configurable)
   - Only when online
   - Non-intrusive to user workflow

### Step 4: Google Sheets Structure

#### Spreadsheet Organization
The Google Sheet is automatically structured with multiple tabs:

1. **ProjectInfo** - Basic project information
2. **BOQ** - Bill of Quantities data
3. **Progress** - Work progress tracking
4. **Financials** - Billing and payment data
5. **Reports** - Generated reports
6. **Settings** - Application settings

#### Data Mapping
- **Local Field** → **Sheet Column**
- Project Name → Column A
- BOQ Items → Tab "BOQ", Columns A-F
- Progress Data → Tab "Progress", Date-stamped
- Financials → Tab "Financials", Transaction logs

### Step 5: Managing Data Conflicts

#### Conflict Resolution
1. **Last Write Wins**: Most recent change takes precedence
2. **Local Priority**: Local changes override cloud if conflict
3. **Manual Resolution**: Review conflicts in sync logs

#### Sync Logs
- Access via Settings > Cloud Integrations > Sync History
- View successful syncs and errors
- Download sync reports

### Step 6: Backup and Recovery

#### Local Backup
1. **Automatic Backups**
   - Daily local snapshots
   - Stored in browser storage
   - 30-day retention

2. **Manual Export**
   - Go to Exports & Reports module
   - Select "Full Project Backup"
   - Download JSON/Excel file
   - Store securely

#### Cloud Backup
1. **Google Sheets Backup**
   - Automatic versioning
   - Multiple sheet versions
   - Recovery from any point

2. **Recovery Process**
   - Access Google Sheets directly
   - Download data as CSV/Excel
   - Import back into RoadMaster Pro

### Step 7: Troubleshooting Synchronization

#### Common Issues and Solutions

**"Sync Failed" Error**
```
Possible Causes:
- Invalid Spreadsheet ID
- No internet connection
- Google API quota exceeded
- Permission issues

Solutions:
1. Verify Spreadsheet ID
2. Check internet connection
3. Wait and retry (API limits reset)
4. Ensure sheet sharing permissions
```

**Data Not Appearing in Sheets**
```
Possible Causes:
- Sync not enabled
- Manual sync not triggered
- Data format issues

Solutions:
1. Enable sync in settings
2. Click manual sync button
3. Check data validation
```

**Slow Synchronization**
```
Possible Causes:
- Large dataset
- Slow internet
- Google API throttling

Solutions:
1. Reduce sync frequency
2. Use manual sync for large updates
3. Optimize internet connection
```

**Permission Errors**
```
Error: "Access denied to Google Sheets"
Solutions:
1. Ensure spreadsheet is shared with your Google account
2. Check Google Sheets API permissions
3. Re-authorize the application
```

### Step 8: Advanced Configuration

#### Sync Preferences
1. **Sync Frequency**
   - Real-time (immediate)
   - Every 5 minutes
   - Every 15 minutes
   - Manual only

2. **Data Scope**
   - All project data
   - Critical data only
   - Custom selection

3. **Conflict Resolution**
   - Local wins
   - Cloud wins
   - Manual review

#### Multiple Projects
1. **Separate Spreadsheets**
   - Each project can have its own Google Sheet
   - Configure per project in project settings

2. **Shared Spreadsheet**
   - Multiple projects in one sheet (different tabs)
   - Automatic tab creation

### Step 9: Security Considerations

#### Data Security
- **Local Data**: Stored in browser, accessible only on your device
- **Cloud Data**: Protected by Google account security
- **Encryption**: Data encrypted in transit and at rest
- **Access Control**: Google Sheets sharing permissions apply

#### Privacy
- No data sent to RoadMaster servers
- Direct connection to Google Sheets API
- User controls all data sharing

### Step 10: Monitoring and Maintenance

#### Regular Checks
1. **Sync Status**: Check daily in the toolbar
2. **Storage Usage**: Monitor browser storage limits
3. **Backup Verification**: Test backup restoration monthly
4. **Google Quota**: Monitor API usage in Google Console

#### Maintenance Tasks
1. **Clean Old Data**: Archive completed projects
2. **Optimize Storage**: Clear unused data
3. **Update Permissions**: Review sheet sharing regularly
4. **Test Recovery**: Practice data restoration

## Quick Reference

### Sync Status Icons
- ☁️ Connected and synced
- 🌩️ Syncing in progress
- ❌ Sync error or offline
- ⚪ Sync disabled

### Keyboard Shortcuts
- `Ctrl/Cmd + Shift + S`: Manual sync
- `Ctrl/Cmd + Shift + E`: Export data

### Important URLs
- Google Sheets: https://sheets.google.com
- Google API Console: https://console.developers.google.com
- RoadMaster Settings: In-app Settings > Cloud Integrations

---

*For technical support or advanced configuration, contact your system administrator.*

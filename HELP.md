# RoadMaster Pro - User Guide

## Introduction

RoadMaster Pro is a comprehensive Engineering Operating System designed specifically for road construction and infrastructure projects. It provides end-to-end project management capabilities from planning to execution, with integrated modules for BOQ management, scheduling, quality control, financial tracking, and more.

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for cloud synchronization
- Local storage enabled for data persistence

### Installation
1. The application runs in your web browser
2. No installation required - it's a Progressive Web App (PWA)
3. Data is stored locally and can be synchronized with Google Sheets

## Step-by-Step Usage Guide

### Step 1: Access the Application
1. Open your web browser
2. Navigate to `http://localhost:5173/` (if running locally) or the deployed URL
3. The application will load with a desktop-style interface

### Step 2: Login
1. On the login screen, select your role:
   - **Admin**: Full system access
   - **Project Manager**: Project management capabilities
   - **Site Engineer**: Field operations access
   - **Consultant**: Read-only access to project data
2. Enter your name
3. Click "Login"

**Note**: The first login creates an admin user automatically.

### Step 3: Project Creation/Selection (Required First Step)
**Important**: You must create or select a project before accessing any other features of the application.

1. **After Login**: You'll be taken to the project selection screen
2. **If No Projects Exist**:
   - Click the "Create New Project" button
   - Fill in the project details:
     - **Project Name**: Full name of the project
     - **Project Code**: Unique identifier (e.g., RD-2024-001)
     - **Location**: Project site location
     - **Start Date**: Project commencement date
     - **End Date**: Expected completion date
     - **Client**: Client/Owner name
     - **Contractor**: Main contractor name
   - Click "Save" to create the project

3. **Selecting an Existing Project**:
   - Browse the list of available projects
   - Click on any project card to select it
   - The project will load and you'll enter the main application

4. **Switching Projects Later**:
   - While in the main app, click "Switch Project" in the top toolbar
   - Return to project selection screen
   - Choose a different project

**Note**: All data and modules are project-specific. You must have at least one project to use the application.

### Step 4: Main Dashboard
Once a project is selected, you'll enter the main application with the sidebar navigation.

#### Navigation Overview
- **Command Center**: Main dashboard with project overview
- **GIS Alignment**: Map view for project location and alignment
- **Communications**: Messages and notifications
- **Document Hub**: File management and storage

#### Commercial Section
- **BOQ Ledger**: Bill of Quantities management
- **Billing & Invoicing**: Invoice creation and tracking
- **Amendments**: Variation orders and contract changes
- **Financials & Commercial**: Financial overview and reporting

#### Partners Section
- **Agencies**: External agency management
- **Subcontractors**: Subcontractor information and billing
- **Subcontractor Billing**: Payment tracking for subcontractors

#### Execution Section
- **CPM Schedule**: Project scheduling and timeline
- **Structural**: Construction progress tracking
- **Chainage Progress**: Linear progress measurement
- **Visual Intel**: Photo documentation
- **Field DPR**: Daily progress reports
- **Pre-Construction**: Planning and preparation
- **Reports & Analytics**: Comprehensive reporting
- **Monthly Reports**: MPR generation

#### Operations & Quality
- **Inspections**: Quality control and RFIs
- **Materials & Resources**: Inventory management
- **Assets & Equipment**: Equipment tracking
- **Resource Management**: Personnel and resource allocation
- **Telemetry**: Fleet and vehicle tracking
- **Resource Matrix**: Resource utilization analysis
- **Quality Hub**: Quality management system
- **Material Testing**: Lab test results
- **EMP Compliance**: Environmental management
- **Data Analysis**: Advanced analytics and insights

### Step 5: Key Workflows

#### Creating a BOQ (Bill of Quantities)
1. Navigate to "BOQ Ledger"
2. Click "Add Item" or "Import from Excel"
3. Enter item details:
   - Description
   - Unit
   - Quantity
   - Rate
   - Category
4. Save the BOQ
5. Use "Variations" for contract amendments

#### Daily Progress Reporting
1. Go to "Field DPR"
2. Select date
3. Enter work completed:
   - Activities performed
   - Quantities achieved
   - Resources used
   - Issues encountered
4. Upload photos if needed
5. Submit report

#### Quality Control
1. Access "Quality Hub"
2. Create NCRs (Non-Conformance Reports) for issues
3. Log inspection results
4. Track corrective actions
5. Generate quality reports

#### Financial Management
1. Use "Billing & Invoicing" for client billing
2. Track payments in "Financials & Commercial"
3. Monitor subcontractor payments
4. Generate financial reports

### Step 6: Data Management

#### Local Storage
- All data is stored locally in your browser
- Data persists between sessions
- No internet required for basic operations

#### Cloud Synchronization
1. Go to Settings > Cloud Integrations
2. Enter Google Spreadsheet ID
3. Enable "Live Sheets" for real-time sync
4. Data will sync automatically

#### Export/Import
1. Use "Exports & Reports" module
2. Export data to Excel, PDF, or other formats
3. Import BOQ data from spreadsheets
4. Backup project data regularly

### Step 7: User Management
1. Access "User Management" (Admin only)
2. Create new users with appropriate roles
3. Set permissions for different modules
4. Manage user access levels

### Step 8: Settings and Configuration
1. Click the gear icon in the sidebar
2. Configure:
   - Company information
   - Currency and VAT rates
   - Notification preferences
   - Cloud integration settings
   - Theme preferences

## Advanced Features

### AI Assistant
- Click the robot icon for AI-powered assistance
- Ask questions about project data
- Get insights and recommendations
- Generate reports automatically

### GIS Integration
- View project location on interactive maps
- Import KML/GPX files for alignment
- Track progress geographically
- Overlay multiple data layers

### Mobile Compatibility
- Responsive design works on tablets and phones
- PWA features allow installation on mobile devices
- Optimized for field use

## Troubleshooting

### Common Issues

**App not loading:**
- Clear browser cache
- Try incognito/private mode
- Check browser compatibility

**Data not saving:**
- Ensure local storage is enabled
- Check available browser storage space
- Try refreshing the page

**Sync not working:**
- Verify Google Sheets integration
- Check internet connection
- Ensure proper permissions on spreadsheet

**Performance issues:**
- Close other browser tabs
- Clear browser cache
- Try a different browser

### Getting Help
- Check this guide for detailed instructions
- Use the AI assistant for specific questions
- Contact system administrator for technical issues

## Best Practices

1. **Regular Backups**: Export project data regularly
2. **Daily Reporting**: Maintain consistent daily progress reports
3. **Quality Documentation**: Log all inspections and tests
4. **Financial Tracking**: Keep billing and payments up to date
5. **Team Communication**: Use the messaging system for coordination
6. **Data Validation**: Regularly review and validate entered data

## Keyboard Shortcuts
- `Ctrl/Cmd + K`: Open AI assistant
- `Ctrl/Cmd + S`: Save current form
- `Esc`: Close modals and dialogs
- `Tab`: Navigate through form fields

---

*RoadMaster Pro v2.5.1 - Engineering OS for Infrastructure Projects*

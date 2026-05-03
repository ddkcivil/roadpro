# RoadMaster Pro - User Guide

Welcome to RoadMaster Pro, the advanced infrastructure management system designed for precision engineering and project oversight.

## Getting Started

### Project Selection
Upon launching the application, you'll be presented with the **Project Selector**.
- **Browse Portfolio**: View all active and planned projects.
- **Search**: Use the search bar to find projects by name or code.
- **Switching**: You can return to the portfolio at any time using the **Switch** button in the header.

### Navigation
- **Sidebar**: Access different modules like Dashboard, Map, BOQ, RFIs, and more.
- **Global Search (`Ctrl + K`)**: Instantly find structures, documents, or RFIs across the entire project.
- **Keyboard Shortcuts**: 
  - `Ctrl + K`: Global Search
  - `Ctrl + P`: Project Switcher
  - `Ctrl + B`: Toggle Sidebar

## Core Modules

### 1. Operations Center (Dashboard)
Your strategic oversight hub.
- **Performance Indices**: Track SPI (Schedule Performance Index) and CPI (Cost Performance Index).
- **Financial Analytics**: View periodic and S-curve financial data.
- **Execution Metrics**: Monitor physical progress vs. time burn.

### 2. Map Intelligence
Interactive spatial data management.
- **Alignment Visualization**: View road alignments and land parcels.
- **KML Integration**: Import and overlay spatial data layers.
- **Asset Tracking**: Monitor vehicle and staff locations in real-time.

### 3. Quality Assurance (RFI)
Manage Requests for Inspection.
- **Create RFI**: Submit new inspection requests with location and category.
- **Workflow**: Track RFIs through Open, Pending Inspection, and Approved/Rejected statuses.
- **Linked Data**: Attach checklists and BOQ items to inspection requests.

### 4. Financial Management
Full-cycle billing and BOQ tracking.
- **BOQ Manager**: Track quantities, rates, and completion percentages.
- **Billing**: Manage contract bills, subcontractor payments, and agency invoices.
- **Variations**: Document and approve project variation orders.

## Security & Collaboration

### Role-Based Access (RBAC)
Your experience is tailored to your role (Admin, Project Manager, Site Engineer, etc.).
- Some actions (like deleting projects or managing users) are restricted to administrators.
- Access denied screens will appear if you attempt to access unauthorized modules.

### Data Management & User Information

RoadMaster Pro leverages a hybrid data management approach:

*   **User Profiles & Authentication**: Your account details, login credentials, and role-based permissions are managed securely by **Supabase**. This ensures a robust and centralized system for your identity within the application.
*   **Project & Spatial Data**: Specific project data, including mapping and geospatial information, is stored in our database. This information is linked to your user profile via your unique Supabase User ID, ensuring data integrity and proper access control.

This architecture allows us to provide a seamless experience while maintaining high security standards for your information.

### Offline Support
RoadMaster Pro works even without an internet connection.
- **Offline Mode**: You can continue browsing data and making certain changes while offline.
- **Sync Status**: The header indicates your connectivity.
- **Background Sync**: Changes made offline will automatically sync once your connection is restored.

### Communications
- **Messages**: Integrated chat for team announcements and direct messaging.
- **Audit Logs**: Every sensitive operation is logged for accountability.

## Support
For technical issues or feature requests, contact the system administrator or visit the [Contact Page](#) within the app.

# Fleet & Manpower - Implementation Plan

## Status: In Development

### Features Implemented

#### 1. ✅ Maintenance Tracking in FleetModule
- **Status**: ✅ COMPLETED (2025-01-XX)
- **Description**: Add maintenance log CRUD to existing FleetModule
- **Files**: components/modules/FleetModule.tsx
- **Details**: Full CRUD with maintenance types (Routine Service, Repair, Inspection, Breakdown, Tyre Change, Oil Change), cost tracking, technician name, status tracking

### Features Still Pending

#### 2. 🔶 Vehicle Expiry Alerts
- **Status**: Pending
- **Description**: Add alerts for Insurance, Tax, Safety expiry dates
- **Files**: FleetModule.tsx, hooks/useNotifications.ts

#### 3. 🔶 Resource Allocation
- **Status**: Pending
- **Description**: Link vehicles to tasks BOQ items
- **Files**: FleetModule.tsx, types.ts

#### 4. 🔶 GPS Live Tracking Integration
- **Status**: Pending
- **Description**: Show real-time vehicle locations
- **Files**: FleetModule.tsx, services/roadManager.ts

## Implementation Steps

### Step 1: Add Maintenance Tab to FleetModule
- Add maintenance history view
- Add "Schedule Maintenance" button
- Add maintenance types: Routine Service, Repair, Inspection, Breakdown, Tyre Change, Oil Change

### Step 2: Add Expiry Alert Cards
- Insurance Expiry warning (30 days before)
- Tax Expiry warning (30 days before)
- Safety Expiry warning (30 days before)

### Step 3: Add Resource Allocation
- Link vehicle to BOQ item/task
- Show allocated quantity/hours
- Track utilization percentage

## Notes
- Reuse existing MaintenanceLog interface from types.ts
- Reuse existing Vehicle.expiry fields
- Use existing notification system

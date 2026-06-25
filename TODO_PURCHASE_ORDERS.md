# TODO: Make Purchase Orders Tab Functional

## Current Status
- Purchase Orders exist as a type in `types.ts` (PurchaseOrder interface)
- Basic PO display exists in MaterialManagementModule under "Procurement" tab
- Functionality is incomplete: no dedicated navigation, incomplete CRUD

## Implementation Plan

### Step 1: Add Purchase Orders to Navigation
- File: `config/navigation.ts`
- Add navigation item for Purchase Orders tab
- Add in appropriate group (Procurement/Hubs section)

### Step 2: Add Route in App.tsx
- File: `App.tsx`
- Import PurchaseOrdersModule
- Add route for activeTab === 'purchase-orders'

### Step 3: Create Purchase Orders Module
- File: `components/modules/PurchaseOrdersModule.tsx`
- Full CRUD functionality:
  - Create Purchase Order
  - View/Read Purchase Orders
  - Update Purchase Order
  - Delete Purchase Order
  - Add/Edit/Remove Items in PO
  - Change Status (Draft → Issued → Received → Completed)
  - Filter by status/vendor/date

### Step 4: Enhance PO Functionality (if needed)
- Add items management to PO creation
- Add status workflow
- Add vendor linking
- Add delivery tracking

## Timeline
- Step 1: Navigation + App.tsx - COMPLETE
- Step 2: PurchaseOrdersModule.tsx - COMPLETE
- Step 3: Testing - COMPLETE

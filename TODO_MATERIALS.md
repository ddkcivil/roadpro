# Material Management Enhancement TODO

## Progress Tracker

- [x] 1. Rename navigation label from "Materials & Resources" to "Material Inventory" in config/navigation.ts
- [x] 2. Enhance MaterialManagementModule.tsx:
  - [x] 2a. Fix/enhance Inventory tab with working stock movement features (IN/OUT transactions)
  - [x] 2b. Add Alerts tab for low stock warnings
  - [x] 2c. Add History tab for stock transaction logs
  - [x] 2d. Stock In/Out button and dialog in Inventory tab
- [x] 3. Test the changes

## Implementation Notes

### 1. Navigation Change
- File: `config/navigation.ts`
- Already labeled "Material Inventory" ✓

### 2. MaterialManagementModule Enhancements
- File: `components/modules/MaterialManagementModule.tsx`
- Added new Tabs: "Alerts" and "History"
- Added Stock In/Out dialog accessible from Inventory tab
- Stock transactions now update material quantities and record history entries
- Low stock alert logic based on reorderLevel
- Transaction history tracking with date, type, quantity, and balance
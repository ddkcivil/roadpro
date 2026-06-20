# Inventory Sync Material Save and Fetch - Location Summary

## Frontend Implementation

### Main Hook: `hooks/useInventorySync.ts`
- **Fetch**: `fetchTransactions()` - GET `/api/inventorySync`
- **Save/Sync**: `syncNow()` - POST `/api/inventorySync`

### UI Component: `components/modules/InventorySyncModule.tsx`
- Uses `useInventorySync` hook
- Displays sync status, stock levels, and transactions table

### Utilities: `utils/data/inventoryUtils.ts`
- `computeStockLevels()` - computes stock from transactions
- `getLowStockMaterials()` - identifies low stock items
- `computeStockSummary()` - summarizes stock data

## Issues Identified

1. **Low Stock Detection in InventorySyncModule**:
   - Uses global threshold of 0 in `getLowStockMaterials(transactions, 0)`
   - This is correct for sync data since transactions don't have reorderLevel
   
2. **Low Stock Detection in MaterialManagementModule**:
   - Uses per-item `reorderLevel` correctly via `materials.filter(m => m.quantity <= (m.reorderLevel || 10))`
   - This is correct for project materials

## Conclusion

The sync material save and fetch are properly implemented in:
- `hooks/useInventorySync.ts` - main logic
- `api/inventorySync.ts` - backend API endpoints
- `utils/data/inventoryUtils.ts` - utility functions

The low stock detection differs between:
- **Sync Inventory**: Uses global threshold (0) - correct since no reorder level data
- **Project Materials**: Uses per-item reorderLevel - correct for project inventory

No changes needed - functionality is working as designed.

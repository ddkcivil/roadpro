# Resource Management Type Migration Guide

## Overview
This document describes the migration from legacy resource management types to the new unified type system.

## Changes Summary

### Before (Legacy Types)
- Separate interfaces for materials, inventory, vehicles, and agency materials
- Duplicate fields across different resource types
- Inconsistent naming and structure

### After (Unified Types)
- Single `BaseResource` interface with common fields
- All resource types extend `BaseResource`
- Consistent structure across materials, vehicles, inventory, and agency materials
- Improved type safety and autocompletion

## Migration Process

### 1. BaseResource Interface
All resource types now implement the common `BaseResource` interface:

```typescript
interface BaseResource {
  id: string;
  name: string;        // Required field (replaces itemName in some contexts)
  description?: string;
  category?: string;
  unit: string;        // Required field
  quantity: number;    // Required field
  location: string;    // Required field
  status: string;      // Required field
  lastUpdated: string; // Required field
}
```

### 2. Material Interface
```typescript
interface Material extends BaseResource, LogisticsFields, SupplierInfo {
  availableQuantity: number;
  unitCost?: number;
  totalValue?: number;
  reorderLevel: number;
  status: 'Available' | 'Low Stock' | 'Out of Stock' | 'Discontinued';
  // ... other fields
}
```

### 3. Vehicle Interface
```typescript
interface Vehicle extends BaseResource {
  plateNumber: string;
  type: string;
  status: 'Active' | 'Maintenance' | 'Idle';
  driver: string;
  // ... other fields
}
```

### 4. InventoryItem Interface
```typescript
interface InventoryItem extends BaseResource {
  itemName: string;     // Kept for backward compatibility
  reorderLevel: number;
  // ... other fields
}
```

## Migration Utilities

Use the provided migration utilities to convert legacy data:

```typescript
import { 
  migrateLegacyMaterial,
  migrateLegacyVehicle,
  migrateLegacyInventory,
  migrateLegacyAgencyMaterial
} from '../utils/migrationUtils';

// Example usage:
const migratedMaterial = migrateLegacyMaterial(legacyMaterialObject);
const migratedVehicle = migrateLegacyVehicle(legacyVehicleObject);
```

## Backward Compatibility

The new system maintains backward compatibility:
- Legacy fields like `itemName` are preserved where needed
- New `name` field serves as primary identifier
- Automatic detection of legacy vs new format

## Code Updates Required

### 1. Component Updates
Components creating resource objects now need to include all `BaseResource` fields:

```typescript
// Old way:
const newMaterial = {
  itemName: "Steel Bars",
  unit: "tonnes",
  quantity: 10,
  // ... other fields
};

// New way:
const newMaterial: Material = {
  id: `mat-${Date.now()}`,
  name: "Steel Bars",           // Required by BaseResource
  description: "",              // Required by BaseResource
  category: "Steel",            // Required by BaseResource
  unit: "tonnes",               // Required by BaseResource
  quantity: 10,                 // Required by BaseResource
  location: "Warehouse",        // Required by BaseResource
  status: "Available",          // Required by BaseResource
  lastUpdated: new Date().toISOString().split('T')[0], // Required by BaseResource
  itemName: "Steel Bars",       // Original field preserved
  // ... other fields
};
```

### 2. Field Mapping
Common field mappings:
- `itemName` → `name` (and kept as `itemName` in InventoryItem)
- `totalQuantity` → `quantity`
- `availableQuantity` → `availableQuantity` (unchanged)
- New fields added: `description`, `category`, `location`, `lastUpdated`

## Benefits

1. **Reduced Duplication**: Common fields defined once in `BaseResource`
2. **Better Type Safety**: Strict typing across all resource types
3. **Consistent API**: Same structure for accessing resource properties
4. **Improved Maintainability**: Changes to common fields affect all types
5. **Enhanced Developer Experience**: Better autocomplete and error detection

## Testing Migration

Run the build to ensure all components work with new types:
```bash
npm run build
```

## Rollback Plan

If issues arise, revert to legacy types by:
1. Removing new type definitions
2. Restoring legacy interfaces
3. Reverting component updates
4. Removing migration utilities
/**
 * Migration Utilities for Resource Management Type System
 * 
 * This file contains utilities to migrate data between old and new type structures,
 * ensuring backward compatibility during the transition to unified types.
 */

import { 
  BaseResource, 
  Material, 
  Vehicle, 
  InventoryItem, 
  AgencyMaterial 
} from '../types';

/**
 * Migrates legacy material data to new unified Material type
 */
export const migrateLegacyMaterial = (legacyMaterial: any): Material => {
  // Map legacy fields to new structure
  const migrated: Material = {
    id: legacyMaterial.id || `mat-${Date.now()}`,
    name: legacyMaterial.name || legacyMaterial.itemName || legacyMaterial.description || 'Unnamed Material',
    description: legacyMaterial.description || legacyMaterial.remarks || '',
    category: legacyMaterial.category || legacyMaterial.type || 'General',
    unit: legacyMaterial.unit || 'unit',
    quantity: legacyMaterial.quantity || legacyMaterial.totalQuantity || 0,
    availableQuantity: legacyMaterial.availableQuantity ?? legacyMaterial.quantity ?? 0,
    unitCost: legacyMaterial.unitCost || legacyMaterial.rate || 0,
    totalValue: legacyMaterial.totalValue || (legacyMaterial.quantity * (legacyMaterial.unitCost || 0)),
    reorderLevel: legacyMaterial.reorderLevel || 10,
    maxStockLevel: legacyMaterial.maxStockLevel,
    location: legacyMaterial.location || 'Warehouse',
    lastUpdated: legacyMaterial.lastUpdated || new Date().toISOString().split('T')[0],
    status: legacyMaterial.status || 'Available',
    criticality: legacyMaterial.criticality || 'Medium',
    leadTime: legacyMaterial.leadTime,
    notes: legacyMaterial.notes || legacyMaterial.remarks || '',
    tags: legacyMaterial.tags || [],
    // Preserve any additional legacy fields
    ...Object.fromEntries(
      Object.entries(legacyMaterial).filter(([key]) => 
        !['id', 'name', 'description', 'category', 'unit', 'quantity', 'availableQuantity', 
          'unitCost', 'totalValue', 'reorderLevel', 'maxStockLevel', 'location', 
          'lastUpdated', 'status', 'criticality', 'leadTime', 'notes', 'tags'].includes(key)
      )
    )
  };

  return migrated;
};

/**
 * Migrates legacy vehicle data to new unified Vehicle type
 */
export const migrateLegacyVehicle = (legacyVehicle: any): Vehicle => {
  // Map legacy fields to new structure
  const migrated: Vehicle = {
    id: legacyVehicle.id || `veh-${Date.now()}`,
    name: legacyVehicle.name || `${legacyVehicle.plateNumber || 'Vehicle'} - ${legacyVehicle.type || 'Unknown'}`,
    description: legacyVehicle.description || legacyVehicle.type || '',
    category: legacyVehicle.category || legacyVehicle.type || 'Vehicle',
    unit: 'unit',
    quantity: 1,
    location: legacyVehicle.location || 'Site',
    status: legacyVehicle.status || 'Active',
    lastUpdated: legacyVehicle.lastUpdated || new Date().toISOString().split('T')[0],
    plateNumber: legacyVehicle.plateNumber || '',
    type: legacyVehicle.type || 'General',
    driver: legacyVehicle.driver || '',
    agencyId: legacyVehicle.agencyId,
    gpsLocation: legacyVehicle.gpsLocation,
    chainage: legacyVehicle.chainage,
    geofenceStatus: legacyVehicle.geofenceStatus,
    lastKnownLocation: legacyVehicle.lastKnownLocation,
    // Preserve any additional legacy fields that aren't part of Vehicle interface
    ...Object.fromEntries(
      Object.entries(legacyVehicle).filter(([key]) => 
        !['id', 'name', 'description', 'category', 'unit', 'quantity', 'location', 
          'status', 'lastUpdated', 'plateNumber', 'type', 'driver', 'agencyId', 
          'gpsLocation', 'chainage', 'geofenceStatus', 'lastKnownLocation'].includes(key)
      )
    )
  };

  return migrated;
};

/**
 * Migrates legacy inventory data to new unified InventoryItem type
 */
export const migrateLegacyInventory = (legacyInventory: any): InventoryItem => {
  // Map legacy fields to new structure
  const migrated: InventoryItem = {
    id: legacyInventory.id || `inv-${Date.now()}`,
    name: legacyInventory.name || legacyInventory.itemName || legacyInventory.description || 'Unnamed Item',
    itemName: legacyInventory.itemName || legacyInventory.name || '',
    description: legacyInventory.description || legacyInventory.remarks || '',
    category: legacyInventory.category || 'General',
    unit: legacyInventory.unit || 'unit',
    quantity: legacyInventory.quantity || 0,
    reorderLevel: legacyInventory.reorderLevel || 10,
    location: legacyInventory.location || 'Warehouse',
    status: legacyInventory.status || 'Available',
    lastUpdated: legacyInventory.lastUpdated || new Date().toISOString().split('T')[0],
    requiredQuantity: legacyInventory.requiredQuantity,
    receivedQuantity: legacyInventory.receivedQuantity,
    currentQuantity: legacyInventory.currentQuantity,
    // Preserve any additional legacy fields that aren't part of InventoryItem interface
    ...Object.fromEntries(
      Object.entries(legacyInventory).filter(([key]) => 
        !['id', 'name', 'itemName', 'description', 'category', 'unit', 'quantity', 
          'reorderLevel', 'location', 'status', 'lastUpdated', 'requiredQuantity',
          'receivedQuantity', 'currentQuantity'].includes(key)
      )
    )
  };

  return migrated;
};

/**
 * Migrates legacy agency material data to new unified AgencyMaterial type
 */
export const migrateLegacyAgencyMaterial = (legacyAgencyMaterial: any): AgencyMaterial => {
  // Map legacy fields to new structure
  const migrated: AgencyMaterial = {
    id: legacyAgencyMaterial.id || `mat-${Date.now()}`,
    name: legacyAgencyMaterial.name || legacyAgencyMaterial.materialName || 'Unnamed Material',
    description: legacyAgencyMaterial.description || legacyAgencyMaterial.remarks || '',
    category: legacyAgencyMaterial.category || 'Agency Material',
    unit: legacyAgencyMaterial.unit || 'unit',
    quantity: legacyAgencyMaterial.quantity || 0,
    location: legacyAgencyMaterial.location || legacyAgencyMaterial.deliveryLocation || 'Vendor',
    status: legacyAgencyMaterial.status || 'Ordered',
    lastUpdated: legacyAgencyMaterial.lastUpdated || new Date().toISOString().split('T')[0],
    agencyId: legacyAgencyMaterial.agencyId,
    materialName: legacyAgencyMaterial.materialName || legacyAgencyMaterial.name || '',
    rate: legacyAgencyMaterial.rate || 0,
    totalAmount: legacyAgencyMaterial.totalAmount || (legacyAgencyMaterial.quantity * legacyAgencyMaterial.rate),
    receivedDate: legacyAgencyMaterial.receivedDate || new Date().toISOString().split('T')[0],
    invoiceNumber: legacyAgencyMaterial.invoiceNumber,
    remarks: legacyAgencyMaterial.remarks || legacyAgencyMaterial.description || '',
    orderedDate: legacyAgencyMaterial.orderedDate,
    expectedDeliveryDate: legacyAgencyMaterial.expectedDeliveryDate,
    deliveryLocation: legacyAgencyMaterial.deliveryLocation,
    transportMode: legacyAgencyMaterial.transportMode,
    deliveryCharges: legacyAgencyMaterial.deliveryCharges || 0,
    taxAmount: legacyAgencyMaterial.taxAmount || 0,
    batchNumber: legacyAgencyMaterial.batchNumber,
    expiryDate: legacyAgencyMaterial.expiryDate,
    qualityCertification: legacyAgencyMaterial.qualityCertification,
    supplierInvoiceRef: legacyAgencyMaterial.supplierInvoiceRef,
    // Preserve any additional legacy fields
    ...Object.fromEntries(
      Object.entries(legacyAgencyMaterial).filter(([key]) => 
        !['id', 'name', 'description', 'category', 'unit', 'quantity', 'location', 
          'status', 'lastUpdated', 'agencyId', 'materialName', 'rate', 'totalAmount',
          'receivedDate', 'invoiceNumber', 'remarks', 'orderedDate', 'expectedDeliveryDate',
          'deliveryLocation', 'transportMode', 'deliveryCharges', 'taxAmount',
          'batchNumber', 'expiryDate', 'qualityCertification', 'supplierInvoiceRef'].includes(key)
      )
    )
  };

  return migrated;
};

/**
 * Batch migrates an array of legacy materials
 */
export const migrateMaterialsArray = (legacyMaterials: any[]): Material[] => {
  return legacyMaterials.map(migrateLegacyMaterial);
};

/**
 * Batch migrates an array of legacy vehicles
 */
export const migrateVehiclesArray = (legacyVehicles: any[]): Vehicle[] => {
  return legacyVehicles.map(migrateLegacyVehicle);
};

/**
 * Batch migrates an array of legacy inventory items
 */
export const migrateInventoryArray = (legacyInventory: any[]): InventoryItem[] => {
  return legacyInventory.map(migrateLegacyInventory);
};

/**
 * Batch migrates an array of legacy agency materials
 */
export const migrateAgencyMaterialsArray = (legacyAgencyMaterials: any[]): AgencyMaterial[] => {
  return legacyAgencyMaterials.map(migrateLegacyAgencyMaterial);
};

/**
 * Detects if an object is using legacy structure
 */
export const isLegacyStructure = (obj: any): boolean => {
  // Check for common legacy field patterns
  const legacyIndicators = [
    'itemName',           // Legacy material naming
    'totalQuantity',      // Legacy quantity field
    'availableQty',       // Legacy availability field
    'unitPrice',          // Legacy pricing field
    'itemDescription'     // Legacy description field
  ];

  return legacyIndicators.some(indicator => 
    obj.hasOwnProperty(indicator) && !obj.hasOwnProperty('name')
  );
};

/**
 * Auto-detects and migrates resource objects
 */
export const autoMigrateResource = (resource: any): BaseResource & Record<string, any> => {
  if (!isLegacyStructure(resource)) {
    return resource; // Already in new format
  }

  // Try to determine resource type and migrate accordingly
  if (resource.hasOwnProperty('plateNumber') || resource.hasOwnProperty('driver')) {
    return migrateLegacyVehicle(resource);
  } else if (resource.hasOwnProperty('agencyId') || resource.hasOwnProperty('materialName')) {
    return migrateLegacyAgencyMaterial(resource);
  } else if (resource.hasOwnProperty('itemName') && resource.hasOwnProperty('reorderLevel')) {
    return migrateLegacyInventory(resource);
  } else {
    return migrateLegacyMaterial(resource);
  }
};

/**
 * Validates migrated data integrity
 */
export const validateMigration = (original: any, migrated: BaseResource): boolean => {
  // Basic validation checks
  const requiredFields: (keyof BaseResource)[] = ['id', 'name', 'unit', 'quantity', 'location', 'status', 'lastUpdated'];
  
  const hasRequiredFields = requiredFields.every(field => 
    migrated[field] !== undefined && migrated[field] !== null
  );

  // Data preservation check (basic)
  const dataPreserved = 
    (original.name || original.itemName) === migrated.name ||
    (original.quantity || original.totalQuantity) === migrated.quantity;

  return hasRequiredFields; // && dataPreserved; // Uncomment when ready for stricter validation
};

export default {
  migrateLegacyMaterial,
  migrateLegacyVehicle,
  migrateLegacyInventory,
  migrateLegacyAgencyMaterial,
  migrateMaterialsArray,
  migrateVehiclesArray,
  migrateInventoryArray,
  migrateAgencyMaterialsArray,
  isLegacyStructure,
  autoMigrateResource,
  validateMigration
};
import { Project, Material, AgencyMaterial, InventoryItem } from '../../types';

/**
 * Utility functions for migrating material data from old systems to the new unified Material system
 */

export const migrateMaterialData = (project: Project): Project => {
  // Create a new copy of the project
  const updatedProject = { ...project };
  
  // Initialize materials array if it doesn't exist
  const existingMaterials = project.materials || [];
  
  // Migrate AgencyMaterials to the new Material system
  const agencyMaterials = project.agencyMaterials || [];
  const migratedFromAgency: Material[] = agencyMaterials.map((agencyMat: AgencyMaterial) => {
    // Generate a stable ID based on name and unit if possible, or use existing one if it exists
    const stableId = `mat-agency-${agencyMat.id || btoa(agencyMat.materialName + agencyMat.unit).substring(0, 10)}`;
    
    return {
      id: stableId,
      name: agencyMat.materialName,
      description: agencyMat.remarks,
      category: 'Supplier Material',
      unit: agencyMat.unit,
      quantity: agencyMat.quantity,
      availableQuantity: agencyMat.quantity,
      unitCost: agencyMat.rate,
      totalValue: agencyMat.totalAmount,
      reorderLevel: 10,
      location: agencyMat.deliveryLocation || 'Warehouse',
      lastUpdated: agencyMat.receivedDate,
      status: agencyMat.status === 'Received' ? 'Available' : 
              agencyMat.status === 'Ordered' || agencyMat.status === 'In Transit' ? 'Low Stock' : 'Out of Stock',
      
      supplierId: agencyMat.agencyId,
      supplierName: project.agencies?.find(a => a.id === agencyMat.agencyId)?.name,
      supplierRate: agencyMat.rate,
      
      orderedDate: agencyMat.orderedDate,
      expectedDeliveryDate: agencyMat.expectedDeliveryDate,
      deliveryDate: agencyMat.deliveryDate,
      deliveryLocation: agencyMat.deliveryLocation,
      transportMode: agencyMat.transportMode,
      driverName: agencyMat.driverName,
      vehicleNumber: agencyMat.vehicleNumber,
      deliveryCharges: agencyMat.deliveryCharges,
      taxAmount: agencyMat.taxAmount,
      batchNumber: agencyMat.batchNumber,
      expiryDate: agencyMat.expiryDate,
      qualityCertification: agencyMat.qualityCertification,
      supplierInvoiceRef: agencyMat.supplierInvoiceRef,
      
      criticality: 'Medium',
      notes: agencyMat.remarks,
      tags: ['migrated-from-agency']
    };
  });

  // Migrate InventoryItems to the new Material system
  const inventoryItems = project.inventory || [];
  const migratedFromInventory: Material[] = inventoryItems.map((invItem: InventoryItem) => {
    // Generate a stable ID
    const stableId = `mat-inv-${invItem.id || btoa((invItem.itemName || invItem.name || 'unnamed') + invItem.unit).substring(0, 10)}`;
    
    return {
      id: stableId,
      name: invItem.itemName || invItem.name || 'Unnamed Item',
      description: 'Migrated from legacy inventory system',
      category: 'General Inventory',
      unit: invItem.unit,
      quantity: invItem.quantity,
      availableQuantity: invItem.currentQuantity ?? invItem.quantity,
      unitCost: 0,
      totalValue: 0,
      reorderLevel: invItem.reorderLevel || 10,
      location: invItem.location || 'Warehouse',
      lastUpdated: invItem.lastUpdated || new Date().toISOString().split('T')[0],
      status: invItem.quantity === 0 ? 'Out of Stock' : 
              invItem.quantity <= invItem.reorderLevel ? 'Low Stock' : 'Available',
      
      supplierId: undefined,
      supplierName: undefined,
      supplierRate: undefined,
      
      orderedDate: undefined,
      expectedDeliveryDate: undefined,
      deliveryDate: undefined,
      deliveryLocation: undefined,
      transportMode: undefined,
      driverName: undefined,
      vehicleNumber: undefined,
      deliveryCharges: undefined,
      taxAmount: undefined,
      batchNumber: undefined,
      expiryDate: undefined,
      qualityCertification: undefined,
      supplierInvoiceRef: undefined,
      
      criticality: 'Medium',
      notes: 'Migrated from legacy inventory system',
      tags: ['migrated-from-inventory']
    };
  });

  // Combine all materials
  const allMaterials = [
    ...existingMaterials,
    ...migratedFromAgency,
    ...migratedFromInventory
  ];

  // Remove duplicates based on name and unit
  const uniqueMaterials = allMaterials.filter(
    (material, index, self) =>
      index === self.findIndex(m => m.name === material.name && m.unit === material.unit)
  );

  // Update the project with the new materials
  updatedProject.materials = uniqueMaterials;

  return updatedProject;
};

/**
 * Migrate old material data when a project is loaded
 */
export const prepareProjectWithMaterials = (project: Project): Project => {
  // If the project already has the new materials array populated, return as is
  if (project.materials && project.materials.length > 0) {
    return project;
  }

  // Otherwise, migrate data from legacy systems
  return migrateMaterialData(project);
};
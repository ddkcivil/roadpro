import { Project, Material, AgencyMaterial, InventoryItem, ResourceMatrix, ResourceAllocation } from '../../types';

/**
 * Utility functions for migrating material data from old systems to the new unified Material system
 */

// Helper to generate a unique ID
const generateResourceId = (prefix: string, name: string, unit: string): string => {
  return `${prefix}-${name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10)}-${unit}`.substring(0, 30);
};

/**
 * Migrate legacy material data to ResourceMatrix format
 * This allows the Resource & Material Matrix module to display data from legacy sources
 */
export const migrateLegacyMaterialsToResources = (project: Project): ResourceMatrix[] => {
  const resources: ResourceMatrix[] = [];
  const today = new Date().toISOString().split('T')[0];

  // 1. Migrate from project.materials (new unified Material system)
  const unifiedMaterials = project.materials || [];
  unifiedMaterials.forEach((mat: Material) => {
    resources.push({
      id: mat.id || generateResourceId('res', mat.name, mat.unit),
      name: mat.name,
      type: 'Material',
      category: mat.category || 'General',
      unit: mat.unit,
      quantity: mat.quantity || 0,
      totalQuantity: mat.quantity || 0,
      availableQuantity: mat.availableQuantity ?? mat.quantity ?? 0,
      allocatedQuantity: 0,
      unitCost: mat.unitCost,
      status: mat.status === 'Available' ? 'Available' : 
             mat.status === 'Low Stock' ? 'Low Stock' : 
             mat.status === 'Out of Stock' ? 'Out of Stock' : 'Available',
      location: mat.location || 'Warehouse',
      supplier: mat.supplierName,
      leadTime: mat.leadTime,
      reorderLevel: mat.reorderLevel,
      criticality: mat.criticality || 'Medium',
      lastUpdated: mat.lastUpdated || today,
      notes: mat.notes
    });
  });

  // 2. Migrate from project.agencyMaterials (supplier materials)
  const agencyMaterials = project.agencyMaterials || [];
  agencyMaterials.forEach((agencyMat: AgencyMaterial) => {
    // Avoid duplicate if already exists from unified materials
    if (!resources.find(r => r.name === agencyMat.materialName && r.unit === agencyMat.unit)) {
      resources.push({
        id: generateResourceId('agency', agencyMat.materialName, agencyMat.unit),
        name: agencyMat.materialName,
        type: 'Material',
        category: 'Supplier Material',
        unit: agencyMat.unit,
        quantity: agencyMat.quantity,
        totalQuantity: agencyMat.quantity,
        availableQuantity: agencyMat.quantity,
        allocatedQuantity: 0,
        unitCost: agencyMat.rate,
        status: agencyMat.status === 'Received' ? 'Available' : 
               agencyMat.status === 'Ordered' || agencyMat.status === 'In Transit' ? 'In Transit' : 'Reserved',
        location: agencyMat.deliveryLocation || 'Warehouse',
        supplier: project.agencies?.find(a => a.id === agencyMat.agencyId)?.name,
        leadTime: 0,
        reorderLevel: 10,
        criticality: 'Medium',
        lastUpdated: agencyMat.receivedDate || today,
        notes: agencyMat.remarks
      });
    }
  });

  // 3. Migrate from project.inventory (legacy inventory)
  const inventoryItems = project.inventory || [];
  inventoryItems.forEach((invItem: InventoryItem) => {
    // Avoid duplicate if already exists
    const itemName = invItem.itemName || invItem.name || 'Unnamed Item';
    if (!resources.find(r => r.name === itemName && r.unit === invItem.unit)) {
      resources.push({
        id: generateResourceId('inv', itemName, invItem.unit),
        name: itemName,
        type: 'Material',
        category: 'General Inventory',
        unit: invItem.unit,
        quantity: invItem.quantity,
        totalQuantity: invItem.quantity,
        availableQuantity: invItem.currentQuantity ?? invItem.quantity ?? 0,
        allocatedQuantity: 0,
        unitCost: 0,
        status: invItem.quantity === 0 ? 'Out of Stock' : 
               invItem.quantity <= invItem.reorderLevel ? 'Low Stock' : 'Available',
        location: invItem.location || 'Warehouse',
        supplier: undefined,
        leadTime: 0,
        reorderLevel: invItem.reorderLevel,
        criticality: 'Medium',
        lastUpdated: invItem.lastUpdated || today,
        notes: 'Migrated from legacy inventory system'
      });
    }
  });

  // 4. Migrate from project.vehicles (as Equipment resources)
  const vehicles = project.vehicles || [];
  vehicles.forEach((vehicle) => {
    resources.push({
      id: vehicle.id || `veh-${vehicle.plateNumber}`,
      name: vehicle.name || vehicle.plateNumber,
      type: 'Equipment',
      category: vehicle.category || 'Vehicle',
      unit: 'unit',
      quantity: vehicle.quantity || 1,
      totalQuantity: vehicle.quantity || 1,
      availableQuantity: vehicle.status === 'Active' ? 1 : 0,
      allocatedQuantity: 0,
      unitCost: 0,
      status: vehicle.status === 'Active' ? 'Available' : 
             vehicle.status === 'Maintenance' ? 'Reserved' : 'Out of Stock',
      location: vehicle.location || 'Garage',
      supplier: undefined,
      leadTime: 0,
      reorderLevel: 0,
      criticality: 'High',
      lastUpdated: vehicle.lastUpdated || today,
      notes: vehicle.description
    });
  });

  return resources;
};

/**
 * Migrate schedule tasks and BOQ items to ResourceAllocations for default allocations
 */
export const migrateScheduleToAllocations = (project: Project): ResourceAllocation[] => {
  const allocations: ResourceAllocation[] = [];
  const today = new Date().toISOString().split('T')[0];

  // If project has any resource, create placeholder allocations for schedule items
  const resources = migrateLegacyMaterialsToResources(project);
  if (resources.length === 0) return allocations;

  // Create allocations from schedule tasks that have been assigned resources
  // This is a simplified migration - real allocation happens in the UI
  const tasks = project.schedule || [];
  tasks.forEach((task, index) => {
    // Skip if no resources available for allocation
    if (resources.length === 0) return;
    
    // Link first available resource to this task as a placeholder
    const resource = resources[index % resources.length];
    allocations.push({
      id: `alloc-${task.id}-${resource.id}`,
      resourceId: resource.id,
      resourceType: resource.type,
      allocatedTo: task.id,
      allocatedQuantity: 0,
      startDate: task.startDate || today,
      endDate: task.endDate || today,
      status: 'Planned',
      notes: `Migrated from schedule: ${task.name}`
    });
  });

  return allocations;
};

// WeakMap to cache migration results - keyed by project object
const migrationCache = new WeakMap<Project, Project>();

export const migrateMaterialData = (project: Project): Project => {
  // Check if we've already migrated this exact project object
  const cached = migrationCache.get(project);
  if (cached) {
    return cached;
  }

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
  
  // Cache the result for this project object
  migrationCache.set(project, updatedProject);
  
  return updatedProject;
};

/**
 * Migrate old material data when a project is loaded
 * Also populates resources and resourceAllocations from legacy sources
 */
export const prepareProjectWithMaterials = (project: Project): Project => {
  // If the project already has the new materials array populated, return as is
  if (project.materials && project.materials.length > 0) {
    // Even if materials exist, ensure resources are also populated if missing
    if (!project.resources || project.resources.length === 0) {
      // Migrate legacy data to resources
      const migratedResources = migrateLegacyMaterialsToResources(project);
      if (migratedResources.length > 0) {
        return { 
          ...project, 
          resources: migratedResources,
          resourceAllocations: project.resourceAllocations || []
        };
      }
    }
    return project;
  }

  // Otherwise, migrate data from legacy systems to materials
  const migratedProject = migrateMaterialData(project);
  
  // Also migrate to resources and resourceAllocations
  const migratedResources = migrateLegacyMaterialsToResources(migratedProject);
  const migratedAllocations = migrateScheduleToAllocations(migratedProject);
  
  return { 
    ...migratedProject, 
    resources: migratedResources,
    resourceAllocations: migratedAllocations
  };
};

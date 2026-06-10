import React, { useState, useEffect } from 'react';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select as ShadcnSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Table as ShadcnTable, TableBody as ShadcnTableBody, TableCell as ShadcnTableCell, TableHeader as ShadcnTableHeader, TableRow as ShadcnTableRow } from '~/components/ui/table';
import { Tabs as ShadcnTabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Alert as ShadcnAlert, AlertDescription } from '~/components/ui/alert';
import { Badge } from '~/components/ui/badge';
import { Textarea } from '~/components/ui/textarea';
import { Plus, Package, Users, Wrench } from 'lucide-react';

interface ResourceMatrixModuleProps {
  project: any;
  onProjectUpdate: (project: any) => void;
}

const ResourceMatrixModule: React.FC<ResourceMatrixModuleProps> = ({ project, onProjectUpdate }) => {
  const [resources, setResources] = useState<any[]>(project.resources || []);
  const [allocations, setAllocations] = useState<any[]>(project.resourceAllocations || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<any>({});
  const [activeTab, setActiveTab] = useState(0);
  const [allocationForm, setAllocationForm] = useState({
    resourceId: '',
    allocatedTo: '',
    allocatedQuantity: 0,
    startDate: '',
    endDate: '',
    notes: ''
  });

  // Update local state when project changes
  useEffect(() => {
    setResources(project.resources || []);
    setAllocations(project.resourceAllocations || []);
  }, [project]);

  const handleOpenModal = (resource?: any) => {
    if (resource) {
      setEditingResource({ ...resource });
    } else {
      setEditingResource({
        name: '',
        type: 'Material', // Default type to Material
        category: '',
        unit: '',
        unitCost: 0,
        totalQuantity: 0,
        availableQuantity: 0,
        allocatedQuantity: 0,
        status: 'Available', // Default status
        criticality: 'Medium',
        supplier: '',
        leadTime: 0,
        reorderLevel: 0,
        notes: '',
        // Material-specific fields
        insuranceExpiry: '',
        taxExpiry: '',
        safetyExpiryDate: '', // Refill Date
        lastRestockDate: '',
        description: '',
        maxStockLevel: 0,
        tags: [],
      });
    }
    setIsModalOpen(true);
  };

const handleSaveResource = () => {
    // Validate required fields
    if (!editingResource.name || editingResource.name.trim() === '') {
      alert('Please enter a resource name');
      return;
    }
    
    let updatedResources;
    if (editingResource.id) {
      updatedResources = resources.map(r => r.id === editingResource.id ? editingResource : r);
    } else {
      const newResource = {
        ...editingResource,
        id: `res-${Date.now()}`,
        // Map ResourceMatrix fields to BaseResource fields
        quantity: editingResource.totalQuantity || 0, // Required by BaseResource
        location: editingResource.location || 'Warehouse', // Required by BaseResource
        lastUpdated: new Date().toISOString().split('T')[0], // Required by BaseResource
        availableQuantity: editingResource.totalQuantity || 0,
        allocatedQuantity: 0
      };
      updatedResources = [...resources, newResource];
    }
    
    setResources(updatedResources);
    onProjectUpdate({ ...project, resources: updatedResources });
    setIsModalOpen(false);
  };

  const handleDeleteResource = (id: string) => {
    if (window.confirm('Are you sure you want to delete this resource?')) {
      const updatedResources = resources.filter(r => r.id !== id);
      setResources(updatedResources);
      onProjectUpdate({ ...project, resources: updatedResources });
    }
  };

  const handleAllocateResource = () => {
    if (!allocationForm.resourceId || !allocationForm.allocatedTo || allocationForm.allocatedQuantity <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    // Check if resource has enough available quantity
    const resource = resources.find(r => r.id === allocationForm.resourceId);
    if (resource && resource.availableQuantity < allocationForm.allocatedQuantity) {
      alert(`Insufficient quantity. Available: ${resource.availableQuantity}`);
      return;
    }

    const newAllocation = {
      id: `alloc-${Date.now()}`,
      ...allocationForm,
      status: 'Planned'
    };

    const updatedAllocations = [...allocations, newAllocation];
    setAllocations(updatedAllocations);

    // Update resource quantities
    const updatedResources = resources.map(r => {
      if (r.id === allocationForm.resourceId) {
        return {
          ...r,
          availableQuantity: r.availableQuantity - allocationForm.allocatedQuantity,
          allocatedQuantity: r.allocatedQuantity + allocationForm.allocatedQuantity
        };
      }
      return r;
    });

    setResources(updatedResources);
    onProjectUpdate({ 
      ...project, 
      resources: updatedResources,
      resourceAllocations: updatedAllocations 
    });

    // Reset form
    setAllocationForm({
      resourceId: '',
      allocatedTo: '',
      allocatedQuantity: 0,
      startDate: '',
      endDate: '',
      notes: ''
    });
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'Material': return <Package size={16} />;
      case 'Labor': return <Users size={16} />;
      case 'Equipment': return <Wrench size={16} />;
      case 'Subcontractor': return <Users size={16} />;
      default: return <Package size={16} />;
    }
  };

  const getRelatedTaskName = (allocatedTo: string) => {
    // Find if allocatedTo is a schedule task
    const scheduleTask = project.schedule?.find((task: any) => task.id === allocatedTo);
    if (scheduleTask) return scheduleTask.name;

    // Find if allocatedTo is a BOQ item
    const boqItem = project.boq?.find((item: any) => item.id === allocatedTo);
    if (boqItem) return boqItem.description;

    // Find if allocatedTo is a structure component
    const structure = project.structures?.flatMap((s: any) => s.components).find((comp: any) => comp.id === allocatedTo);
    if (structure) return structure.name;

    return allocatedTo;
  };

  return (
    <div className="h-full flex flex-col">
      <Card className="p-4 mb-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">
            Resource & Material Matrix
          </h2>
          <Button
            onClick={() => handleOpenModal()}
          >
            <Plus size={16} className="mr-2" />
            Add Resource
          </Button>
        </div>

        <ShadcnTabs value={activeTab.toString()} onValueChange={(v) => setActiveTab(parseInt(v))} className="mb-4">
          <TabsList>
            <TabsTrigger value="0">Resources</TabsTrigger>
            <TabsTrigger value="1">Allocations</TabsTrigger>
            <TabsTrigger value="2">Matrix View</TabsTrigger>
          </TabsList>
        </ShadcnTabs>

        {activeTab === 0 && (
          <ShadcnTable>
            <ShadcnTableHeader>
              <ShadcnTableRow>
                <ShadcnTableCell className="font-bold">Name</ShadcnTableCell>
                <ShadcnTableCell className="font-bold">Type</ShadcnTableCell>
                <ShadcnTableCell className="font-bold">Category</ShadcnTableCell>
                <ShadcnTableCell className="font-bold">Unit</ShadcnTableCell>
                <ShadcnTableCell className="font-bold text-right">Total Qty</ShadcnTableCell>
                <ShadcnTableCell className="font-bold text-right">Available</ShadcnTableCell>
                <ShadcnTableCell className="font-bold text-right">Allocated</ShadcnTableCell>
                <ShadcnTableCell className="font-bold">Status</ShadcnTableCell>
                <ShadcnTableCell className="font-bold">Criticality</ShadcnTableCell>
                <ShadcnTableCell className="font-bold">Actions</ShadcnTableCell>
              </ShadcnTableRow>
            </ShadcnTableHeader>
            <ShadcnTableBody>
              {resources.map((resource) => (
                <ShadcnTableRow key={resource.id}>
                  <ShadcnTableCell>
                    <div className="flex items-center gap-1">
                      {getResourceIcon(resource.type)}
                      <span className="font-bold text-sm">{resource.name}</span>
                    </div>
                  </ShadcnTableCell>
                  <ShadcnTableCell>
                    <Badge>{resource.type}</Badge>
                  </ShadcnTableCell>
                  <ShadcnTableCell>{resource.category}</ShadcnTableCell>
                  <ShadcnTableCell>{resource.unit}</ShadcnTableCell>
                  <ShadcnTableCell className="text-right">{resource.totalQuantity}</ShadcnTableCell>
                  <ShadcnTableCell className="text-right">{resource.availableQuantity}</ShadcnTableCell>
                  <ShadcnTableCell className="text-right">{resource.allocatedQuantity}</ShadcnTableCell>
                  <ShadcnTableCell>
                    <Badge>{resource.status}</Badge>
                  </ShadcnTableCell>
                  <ShadcnTableCell>
                    <Badge>{resource.criticality}</Badge>
                  </ShadcnTableCell>
                  <ShadcnTableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => handleOpenModal(resource)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDeleteResource(resource.id)}>
                        Delete
                      </Button>
                    </div>
                  </ShadcnTableCell>
                </ShadcnTableRow>
              ))}
            </ShadcnTableBody>
          </ShadcnTable>
        )}

        {activeTab === 1 && (
          <>
            <Card className="p-4 mb-4 rounded-lg">
            <h3 className="text-lg font-bold mb-4">
              Allocate Resources
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="resource-select">Resource</Label>
                <ShadcnSelect value={allocationForm.resourceId} onValueChange={(value) => setAllocationForm({...allocationForm, resourceId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Resource" />
                  </SelectTrigger>
                  <SelectContent>
                    {resources.map(resource => (
                      <SelectItem key={resource.id} value={resource.id}>
                        {resource.name} ({resource.availableQuantity} available)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </ShadcnSelect>
              </div>
              <div>
                <Label htmlFor="allocate-to-select">Allocate To</Label>
                <ShadcnSelect value={allocationForm.allocatedTo || 'none'} onValueChange={(value) => setAllocationForm({...allocationForm, allocatedTo: value === "none" ? "" : value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Task/Item" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select Task/Item</SelectItem>
                    {project.schedule?.map((task: any) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.name} (Schedule)
                      </SelectItem>
                    ))}
                    {project.boq?.map((item: any) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.description} (BOQ)
                      </SelectItem>
                    ))}
                    {project.structures?.flatMap((s: any) =>
                      s.components.map((comp: any) => (
                        <SelectItem key={comp.id} value={comp.id}>
                          {comp.name} - {s.name} (Structure)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </ShadcnSelect>
              </div>
              <div>
                <Label htmlFor="quantity-input">Quantity</Label>
                <Input
                  id="quantity-input"
                  type="number"
                  value={allocationForm.allocatedQuantity}
                  onChange={(e) => setAllocationForm({...allocationForm, allocatedQuantity: Number(e.target.value)})}
                />
              </div>
              <div>
                <Label htmlFor="start-date-input">Start Date</Label>
                <Input
                  id="start-date-input"
                  type="date"
                  value={allocationForm.startDate}
                  onChange={(e) => setAllocationForm({...allocationForm, startDate: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="end-date-input">End Date</Label>
                <Input
                  id="end-date-input"
                  type="date"
                  value={allocationForm.endDate}
                  onChange={(e) => setAllocationForm({...allocationForm, endDate: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="notes-input">Notes</Label>
                <Input
                  id="notes-input"
                  value={allocationForm.notes}
                  onChange={(e) => setAllocationForm({...allocationForm, notes: e.target.value})}
                />
              </div>
              <div className="col-span-full">
                <Button onClick={handleAllocateResource}>
                  <Plus size={16} className="mr-2" />
                  Allocate Resource
                </Button>
              </div>
            </div>
          </Card>

          <ShadcnTable className="mt-4">
            <ShadcnTableHeader>
              <ShadcnTableRow>
                <ShadcnTableCell className="font-bold">Resource</ShadcnTableCell>
                <ShadcnTableCell className="font-bold">Allocated To</ShadcnTableCell>
                <ShadcnTableCell className="font-bold text-right">Quantity</ShadcnTableCell>
                <ShadcnTableCell className="font-bold">Period</ShadcnTableCell>
                <ShadcnTableCell className="font-bold">Status</ShadcnTableCell>
                <ShadcnTableCell className="font-bold">Notes</ShadcnTableCell>
              </ShadcnTableRow>
            </ShadcnTableHeader>
            <ShadcnTableBody>
              {allocations.map((allocation) => (
                <ShadcnTableRow key={allocation.id}>
                  <ShadcnTableCell>
                    {resources.find(r => r.id === allocation.resourceId)?.name || allocation.resourceId}
                  </ShadcnTableCell>
                  <ShadcnTableCell>{getRelatedTaskName(allocation.allocatedTo)}</ShadcnTableCell>
                  <ShadcnTableCell className="text-right">{allocation.allocatedQuantity}</ShadcnTableCell>
                  <ShadcnTableCell>
                    {allocation.startDate} to {allocation.endDate}
                  </ShadcnTableCell>
                  <ShadcnTableCell>
                    <Badge>{allocation.status}</Badge>
                  </ShadcnTableCell>
                  <ShadcnTableCell>{allocation.notes}</ShadcnTableCell>
                </ShadcnTableRow>
              ))}
            </ShadcnTableBody>
          </ShadcnTable>
          </>
        )}

        {activeTab === 2 && (
          <div>
            <ShadcnAlert className="mb-4">
              <AlertDescription>
                Resource-Task Matrix showing allocation of resources to specific tasks and activities
              </AlertDescription>
            </ShadcnAlert>

            <ShadcnTable>
              <ShadcnTableHeader>
                <ShadcnTableRow>
                  <ShadcnTableCell className="font-bold">Resource</ShadcnTableCell>
                  {project.schedule?.slice(0, 5).map((task: any) => (
                    <React.Fragment key={task.id}>
                      <ShadcnTableCell className="font-bold text-center">
                        {task.name.substring(0, 15)}...
                      </ShadcnTableCell>
                    </React.Fragment>
                  ))}
                  <ShadcnTableCell className="font-bold">Total Allocated</ShadcnTableCell>
                </ShadcnTableRow>
              </ShadcnTableHeader>
              <ShadcnTableBody>
                {resources.map((resource) => (
                  <ShadcnTableRow key={resource.id}>
                    <ShadcnTableCell>
                      <div className="flex items-center gap-1">
                        {getResourceIcon(resource.type)}
                        <span className="font-bold text-sm">{resource.name}</span>
                      </div>
                    </ShadcnTableCell>
                    {project.schedule?.slice(0, 5).map((task: any) => {
                      const allocation = allocations.find(a =>
                        a.resourceId === resource.id && a.allocatedTo === task.id
                      );
                      return (
                        <React.Fragment key={task.id}>
                          <ShadcnTableCell className="text-center">
                            {allocation ? allocation.allocatedQuantity : '-'}
                          </ShadcnTableCell>
                        </React.Fragment>
                      );
                    })}
                    <ShadcnTableCell className="text-right font-bold">
                      {resource.allocatedQuantity}
                    </ShadcnTableCell>
                  </ShadcnTableRow>
                ))}
              </ShadcnTableBody>
            </ShadcnTable>
          </div>
        )}
      </Card>

      {/* Resource Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingResource.id ? 'Edit Resource' : 'New Resource'}
            </DialogTitle>
            <DialogDescription>
              {editingResource.id ? 'Update the details of this resource.' : 'Add a new resource to the project matrix.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name-input">Name</Label>
              <Input
                id="name-input"
                value={editingResource.name}
                onChange={(e) => setEditingResource({...editingResource, name: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="type-select">Type</Label>
              <ShadcnSelect value={editingResource.type} onValueChange={(value) => setEditingResource({...editingResource, type: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Material">Material</SelectItem>
                  <SelectItem value="Labor">Labor</SelectItem>
                  <SelectItem value="Equipment">Equipment</SelectItem>
                  <SelectItem value="Subcontractor">Subcontractor</SelectItem>
                </SelectContent>
              </ShadcnSelect>
            </div>
            <div>
              <Label htmlFor="category-input">Category</Label>
              <Input
                id="category-input"
                value={editingResource.category}
                onChange={(e) => setEditingResource({...editingResource, category: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="unit-input">Unit</Label>
              <Input
                id="unit-input"
                value={editingResource.unit}
                onChange={(e) => setEditingResource({...editingResource, unit: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="unit-cost-input">Unit Cost</Label>
              <Input
                id="unit-cost-input"
                type="number"
                value={editingResource.unitCost}
                onChange={(e) => setEditingResource({...editingResource, unitCost: Number(e.target.value)})}
              />
            </div>
            <div>
              <Label htmlFor="total-quantity-input">Total Quantity</Label>
              <Input
                id="total-quantity-input"
                type="number"
                value={editingResource.totalQuantity}
                onChange={(e) => setEditingResource({...editingResource, totalQuantity: Number(e.target.value)})}
              />
            </div>
            <div>
              <Label htmlFor="status-select">Status</Label>
              <ShadcnSelect value={editingResource.status} onValueChange={(value) => setEditingResource({...editingResource, status: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Allocated">Allocated</SelectItem>
                  <SelectItem value="In Transit">In Transit</SelectItem>
                  <SelectItem value="Reserved">Reserved</SelectItem>
                </SelectContent>
              </ShadcnSelect>
            </div>
            <div>
              <Label htmlFor="criticality-select">Criticality</Label>
              <ShadcnSelect value={editingResource.criticality} onValueChange={(value) => setEditingResource({...editingResource, criticality: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Criticality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </ShadcnSelect>
            </div>
            <div>
              <Label htmlFor="supplier-select">Supplier</Label>
              <ShadcnSelect value={editingResource.supplier || 'none'} onValueChange={(value) => setEditingResource({...editingResource, supplier: value === "none" ? "" : value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none"><em>Select Supplier</em></SelectItem>
                  <SelectItem value="Nepal Cement Ltd">Nepal Cement Ltd</SelectItem>
                  <SelectItem value="Local Sand Suppliers">Local Sand Suppliers</SelectItem>
                  <SelectItem value="Local Stone Crushers">Local Stone Crushers</SelectItem>
                  <SelectItem value="Mukunda Steel">Mukunda Steel</SelectItem>
                  <SelectItem value="Equipment Rental Co.">Equipment Rental Co.</SelectItem>
                  <SelectItem value="Local Asphalt Plant">Local Asphalt Plant</SelectItem>
                  <SelectItem value="Local Quarry">Local Quarry</SelectItem>
                  <SelectItem value="ABC Excavation">ABC Excavation</SelectItem>
                  <SelectItem value="XYZ Concrete Works">XYZ Concrete Works</SelectItem>
                  <SelectItem value="PQR Paving Solutions">PQR Paving Solutions</SelectItem>
                  <SelectItem value="Internal Team">Internal Team</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </ShadcnSelect>
            </div>
            <div>
              <Label htmlFor="lead-time-input">Lead Time (days)</Label>
              <Input
                id="lead-time-input"
                type="number"
                value={editingResource.leadTime}
                onChange={(e) => setEditingResource({...editingResource, leadTime: Number(e.target.value)})}
              />
            </div>
            <div>
              <Label htmlFor="reorder-level-input">Reorder Level</Label>
              <Input
                id="reorder-level-input"
                type="number"
                value={editingResource.reorderLevel}
                onChange={(e) => setEditingResource({...editingResource, reorderLevel: Number(e.target.value)})}
              />
            </div>
            <div className="col-span-full">
              <Label htmlFor="notes-textarea">Notes</Label>
              <Textarea
                id="notes-textarea"
                value={editingResource.notes}
                onChange={(e) => setEditingResource({...editingResource, notes: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="description-input">Description</Label>
              <Textarea
                id="description-input"
                value={editingResource.description || ''}
                onChange={(e) => setEditingResource({...editingResource, description: e.target.value})}
                className="col-span-3"
                placeholder="Enter material description"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="max-stock-level-input">Max Stock Level</Label>
              <Input
                id="max-stock-level-input"
                type="number"
                value={editingResource.maxStockLevel}
                onChange={(e) => setEditingResource({...editingResource, maxStockLevel: Number(e.target.value)})}
              />
            </div>
            <div>
              <Label htmlFor="tags-input">Tags</Label>
              <Input
                id="tags-input"
                value={editingResource.tags?.join(', ') || ''}
                onChange={(e) => setEditingResource({...editingResource, tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)})}
                placeholder="e.g., hazardous, consumable"
              />
            </div>
            {editingResource.type === 'Material' && (
              <>
                <div>
                  <Label htmlFor="insurance-expiry-input">Insurance Expiry</Label>
                  <Input
                    id="insurance-expiry-input"
                    type="date"
                    value={editingResource.insuranceExpiry || ''}
                    onChange={(e) => setEditingResource({...editingResource, insuranceExpiry: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="tax-expiry-input">Tax Expiry</Label>
                  <Input
                    id="tax-expiry-input"
                    type="date"
                    value={editingResource.taxExpiry || ''}
                    onChange={(e) => setEditingResource({...editingResource, taxExpiry: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="safety-expiry-input">Safety Expiry / Refill Date</Label>
                  <Input
                    id="safety-expiry-input"
                    type="date"
                    value={editingResource.safetyExpiryDate || ''}
                    onChange={(e) => setEditingResource({...editingResource, safetyExpiryDate: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="restock-date-input">Last Restock Date</Label>
                  <Input
                    id="restock-date-input"
                    type="date"
                    value={editingResource.lastRestockDate || ''}
                    onChange={(e) => setEditingResource({...editingResource, lastRestockDate: e.target.value})}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveResource}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResourceMatrixModule;



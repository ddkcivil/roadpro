import React, { useState, useEffect } from 'react';
import {
  Box, 
  Paper, 
  Typography, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Tabs,
  Tab,
  Grid,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Stack,
  IconButton,
  alpha
} from '@mui/material';
import { BaseResource } from '../types';
import { Plus, X, Calendar, Package, Users, Wrench, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

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
  const [allocationTab, setAllocationTab] = useState(0);
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
        type: 'Material',
        category: '',
        unit: '',
        unitCost: 0,
        totalQuantity: 0,
        availableQuantity: 0,
        allocatedQuantity: 0,
        status: 'Available',
        criticality: 'Medium',
        supplier: '',
        leadTime: 0,
        reorderLevel: 0,
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveResource = () => {
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
        availableQuantity: editingResource.totalQuantity,
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'success';
      case 'Allocated': return 'warning';
      case 'In Transit': return 'info';
      case 'Reserved': return 'secondary';
      case 'Critical': return 'error';
      default: return 'default';
    }
  };

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'High': return 'error';
      case 'Medium': return 'warning';
      case 'Low': return 'success';
      case 'Critical': return 'error';
      default: return 'default';
    }
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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper sx={{ p: 2, mb: 2, borderRadius: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            Resource & Material Matrix
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<Plus size={16} />}
            onClick={() => handleOpenModal()}
          >
            Add Resource
          </Button>
        </Box>

        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
          <Tab label="Resources" />
          <Tab label="Allocations" />
          <Tab label="Matrix View" />
        </Tabs>

        {activeTab === 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'slate.50' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Unit</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Total Qty</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Available</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Allocated</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Criticality</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resources.map((resource) => (
                  <TableRow key={resource.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getResourceIcon(resource.type)}
                        <Typography variant="body2" fontWeight="bold">{resource.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={resource.type} 
                        size="small" 
                        variant="outlined" 
                        sx={{ 
                          fontSize: '0.7rem',
                          height: 20
                        }} 
                      />
                    </TableCell>
                    <TableCell>{resource.category}</TableCell>
                    <TableCell>{resource.unit}</TableCell>
                    <TableCell align="right">{resource.totalQuantity}</TableCell>
                    <TableCell align="right">{resource.availableQuantity}</TableCell>
                    <TableCell align="right">{resource.allocatedQuantity}</TableCell>
                    <TableCell>
                      <Chip 
                        label={resource.status} 
                        size="small" 
                        color={getStatusColor(resource.status) as any}
                        variant="outlined" 
                        sx={{ 
                          fontSize: '0.7rem',
                          height: 20
                        }} 
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={resource.criticality} 
                        size="small" 
                        color={getCriticalityColor(resource.criticality) as any}
                        variant="outlined" 
                        sx={{ 
                          fontSize: '0.7rem',
                          height: 20
                        }} 
                      />
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="small" 
                        onClick={() => handleOpenModal(resource)}
                        variant="outlined"
                      >
                        Edit
                      </Button>
                      <Button 
                        size="small" 
                        onClick={() => handleDeleteResource(resource.id)}
                        variant="outlined"
                        color="error"
                        sx={{ ml: 1 }}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {activeTab === 1 && (
          <Box>
            <Paper sx={{ p: 2, mb: 2, borderRadius: 4 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                Allocate Resources
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Resource</InputLabel>
                    <Select 
                      value={allocationForm.resourceId} 
                      label="Resource"
                      onChange={(e) => setAllocationForm({...allocationForm, resourceId: e.target.value})}
                    >
                      {resources.map(resource => (
                        <MenuItem key={resource.id} value={resource.id}>
                          {resource.name} ({resource.availableQuantity} available)
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Allocate To</InputLabel>
                    <Select 
                      value={allocationForm.allocatedTo} 
                      label="Allocate To"
                      onChange={(e) => setAllocationForm({...allocationForm, allocatedTo: e.target.value})}
                    >
                      <MenuItem value="">Select Task/Item</MenuItem>
                      {project.schedule?.map((task: any) => (
                        <MenuItem key={task.id} value={task.id}>
                          {task.name} (Schedule)
                        </MenuItem>
                      ))}
                      {project.boq?.map((item: any) => (
                        <MenuItem key={item.id} value={item.id}>
                          {item.description} (BOQ)
                        </MenuItem>
                      ))}
                      {project.structures?.flatMap((s: any) => 
                        s.components.map((comp: any) => (
                          <MenuItem key={comp.id} value={comp.id}>
                            {comp.name} - {s.name} (Structure)
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <TextField
                    label="Quantity"
                    type="number"
                    fullWidth
                    size="small"
                    value={allocationForm.allocatedQuantity}
                    onChange={(e) => setAllocationForm({...allocationForm, allocatedQuantity: Number(e.target.value)})}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <TextField
                    label="Start Date"
                    type="date"
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    value={allocationForm.startDate}
                    onChange={(e) => setAllocationForm({...allocationForm, startDate: e.target.value})}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <TextField
                    label="End Date"
                    type="date"
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    value={allocationForm.endDate}
                    onChange={(e) => setAllocationForm({...allocationForm, endDate: e.target.value})}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <TextField
                    label="Notes"
                    fullWidth
                    size="small"
                    value={allocationForm.notes}
                    onChange={(e) => setAllocationForm({...allocationForm, notes: e.target.value})}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button 
                    variant="contained" 
                    onClick={handleAllocateResource}
                    startIcon={<Plus size={16} />}
                  >
                    Allocate Resource
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'slate.50' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Resource</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Allocated To</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Quantity</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Period</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allocations.map((allocation) => (
                    <TableRow key={allocation.id} hover>
                      <TableCell>
                        {resources.find(r => r.id === allocation.resourceId)?.name || allocation.resourceId}
                      </TableCell>
                      <TableCell>{getRelatedTaskName(allocation.allocatedTo)}</TableCell>
                      <TableCell align="right">{allocation.allocatedQuantity}</TableCell>
                      <TableCell>
                        {allocation.startDate} to {allocation.endDate}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={allocation.status} 
                          size="small" 
                          variant="outlined" 
                          sx={{ 
                            fontSize: '0.7rem',
                            height: 20
                          }} 
                        />
                      </TableCell>
                      <TableCell>{allocation.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {activeTab === 2 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Resource-Task Matrix showing allocation of resources to specific tasks and activities
            </Alert>
            
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'slate.50' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Resource</TableCell>
                    {project.schedule?.slice(0, 5).map((task: any) => (
                      <React.Fragment key={task.id}>
                        <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                          {task.name.substring(0, 15)}...
                        </TableCell>
                      </React.Fragment>
                    ))}
                    <TableCell sx={{ fontWeight: 'bold' }}>Total Allocated</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {resources.map((resource) => (
                    <TableRow key={resource.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getResourceIcon(resource.type)}
                          <Typography variant="body2" fontWeight="bold">{resource.name}</Typography>
                        </Box>
                      </TableCell>
                      {project.schedule?.slice(0, 5).map((task: any) => {
                        const allocation = allocations.find(a => 
                          a.resourceId === resource.id && a.allocatedTo === task.id
                        );
                        return (
                          <React.Fragment key={task.id}>
                            <TableCell align="center">
                              {allocation ? allocation.allocatedQuantity : '-'}
                            </TableCell>
                          </React.Fragment>
                        );
                      })}
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        {resource.allocatedQuantity}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>

      {/* Resource Edit Modal */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {editingResource.id ? 'Edit Resource' : 'New Resource'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Name"
                fullWidth
                size="small"
                value={editingResource.name}
                onChange={(e) => setEditingResource({...editingResource, name: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select 
                  value={editingResource.type} 
                  label="Type"
                  onChange={(e) => setEditingResource({...editingResource, type: e.target.value})}
                >
                  <MenuItem value="Material">Material</MenuItem>
                  <MenuItem value="Labor">Labor</MenuItem>
                  <MenuItem value="Equipment">Equipment</MenuItem>
                  <MenuItem value="Subcontractor">Subcontractor</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Category"
                fullWidth
                size="small"
                value={editingResource.category}
                onChange={(e) => setEditingResource({...editingResource, category: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Unit"
                fullWidth
                size="small"
                value={editingResource.unit}
                onChange={(e) => setEditingResource({...editingResource, unit: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Unit Cost"
                type="number"
                fullWidth
                size="small"
                value={editingResource.unitCost}
                onChange={(e) => setEditingResource({...editingResource, unitCost: Number(e.target.value)})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Total Quantity"
                type="number"
                fullWidth
                size="small"
                value={editingResource.totalQuantity}
                onChange={(e) => setEditingResource({...editingResource, totalQuantity: Number(e.target.value)})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select 
                  value={editingResource.status} 
                  label="Status"
                  onChange={(e) => setEditingResource({...editingResource, status: e.target.value})}
                >
                  <MenuItem value="Available">Available</MenuItem>
                  <MenuItem value="Allocated">Allocated</MenuItem>
                  <MenuItem value="In Transit">In Transit</MenuItem>
                  <MenuItem value="Reserved">Reserved</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Criticality</InputLabel>
                <Select 
                  value={editingResource.criticality} 
                  label="Criticality"
                  onChange={(e) => setEditingResource({...editingResource, criticality: e.target.value})}
                >
                  <MenuItem value="Low">Low</MenuItem>
                  <MenuItem value="Medium">Medium</MenuItem>
                  <MenuItem value="High">High</MenuItem>
                  <MenuItem value="Critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Supplier</InputLabel>
                <Select 
                  value={editingResource.supplier || ''} 
                  label="Supplier"
                  onChange={(e) => setEditingResource({...editingResource, supplier: e.target.value})}
                >
                  <MenuItem value=""><em>Select Supplier</em></MenuItem>
                  <MenuItem value="Nepal Cement Ltd">Nepal Cement Ltd</MenuItem>
                  <MenuItem value="Local Sand Suppliers">Local Sand Suppliers</MenuItem>
                  <MenuItem value="Local Stone Crushers">Local Stone Crushers</MenuItem>
                  <MenuItem value="Mukunda Steel">Mukunda Steel</MenuItem>
                  <MenuItem value="Equipment Rental Co.">Equipment Rental Co.</MenuItem>
                  <MenuItem value="Local Asphalt Plant">Local Asphalt Plant</MenuItem>
                  <MenuItem value="Local Quarry">Local Quarry</MenuItem>
                  <MenuItem value="ABC Excavation">ABC Excavation</MenuItem>
                  <MenuItem value="XYZ Concrete Works">XYZ Concrete Works</MenuItem>
                  <MenuItem value="PQR Paving Solutions">PQR Paving Solutions</MenuItem>
                  <MenuItem value="Internal Team">Internal Team</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Lead Time (days)"
                type="number"
                fullWidth
                size="small"
                value={editingResource.leadTime}
                onChange={(e) => setEditingResource({...editingResource, leadTime: Number(e.target.value)})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Reorder Level"
                type="number"
                fullWidth
                size="small"
                value={editingResource.reorderLevel}
                onChange={(e) => setEditingResource({...editingResource, reorderLevel: Number(e.target.value)})}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes"
                fullWidth
                multiline
                rows={3}
                size="small"
                value={editingResource.notes}
                onChange={(e) => setEditingResource({...editingResource, notes: e.target.value})}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveResource}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ResourceMatrixModule;
import React, { useState, useMemo } from 'react';
import { Project, UserRole, InventoryItem, PurchaseOrder, POItem } from '../types';
import { getAutofillSuggestions, checkForDuplicates } from '../utils/autofillUtils';
import { 
    Box, Typography, Button, Grid, Table, TableHead, TableRow, TableCell, 
    TableBody, Paper, Chip, Stack, Card, CardContent, LinearProgress,
    Tooltip, IconButton, Divider, Avatar, Tabs, Tab, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField, InputAdornment,
    List, ListItem, ListItemText, ListItemSecondaryAction, Alert, Checkbox,
    Autocomplete
} from '@mui/material';
import { 
    Package, AlertTriangle, CheckCircle2, TrendingDown, Plus, 
    ArrowUpRight, ShoppingCart, History, PackageSearch, Filter,
    FileText, Truck, CreditCard, ChevronRight, Calculator,
    PlusCircle, Trash2, Save, X, Printer, Edit
} from 'lucide-react';

interface Props {
  project: Project;
  userRole: UserRole;
  onProjectUpdate: (project: Project) => void;
}

const ResourceManager: React.FC<Props> = ({ project, onProjectUpdate, userRole }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isPoDetailOpen, setIsPoDetailOpen] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [inventoryForm, setInventoryForm] = useState<Partial<InventoryItem>>({
    itemName: '',
    quantity: 0,
    unit: 'unit',
    reorderLevel: 10,
    location: 'Warehouse'
  });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  
  // Helper function to map between itemName and name fields
  const mapInventoryItemToForm = (item: InventoryItem) => ({
    id: item.id,
    itemName: item.itemName || item.name, // Use itemName if available, fallback to name
    quantity: item.quantity,
    unit: item.unit,
    reorderLevel: item.reorderLevel,
    location: item.location
  });

  const mapFormToInventoryItem = (form: Partial<InventoryItem>): Partial<InventoryItem> => ({
    ...form,
    name: form.itemName, // Set name to match itemName for BaseResource compatibility
  });
  
  // New PO State
  const [poForm, setPoForm] = useState<Partial<PurchaseOrder>>({
      poNumber: `PO-${Date.now().toString().slice(-6)}`,
      vendor: '',
      date: new Date().toISOString().split('T')[0],
      items: []
  });

  const inventory = project.inventory || [];
  const pos = project.purchaseOrders || [];

  const stats = useMemo(() => {
      const critical = inventory.filter(i => i.quantity <= i.reorderLevel);
      const warning = inventory.filter(i => i.quantity > i.reorderLevel && i.quantity <= i.reorderLevel * 1.5);
      const healthy = inventory.length - critical.length - warning.length;
      return { critical, warning, healthy };
  }, [inventory]);

  const handleAddInventoryItem = () => {
    setInventoryForm({
      itemName: '',
      quantity: 0,
      unit: 'unit',
      reorderLevel: 10,
      location: 'Warehouse'
    });
    setEditingItemId(null);
    setIsInventoryModalOpen(true);
  };

  const handleEditInventoryItem = (item: InventoryItem) => {
    setInventoryForm({
      id: item.id,
      itemName: item.itemName,
      quantity: item.quantity,
      unit: item.unit,
      reorderLevel: item.reorderLevel,
      location: item.location
    });
    setEditingItemId(item.id);
    setIsInventoryModalOpen(true);
  };

  const handleDeleteInventoryItem = (itemId: string) => {
    const updatedInventory = inventory.filter(item => item.id !== itemId);
    onProjectUpdate({
      ...project,
      inventory: updatedInventory
    });
  };

  const handleSaveInventoryItem = () => {
    // Validation
    if (!inventoryForm.itemName?.trim()) {
      alert('Item name is required');
      return;
    }
    
    if (typeof inventoryForm.quantity !== 'number' || inventoryForm.quantity < 0) {
      alert('Quantity must be a non-negative number');
      return;
    }
    
    if (typeof inventoryForm.reorderLevel !== 'number' || inventoryForm.reorderLevel < 0) {
      alert('Reorder level must be a non-negative number');
      return;
    }
    
    // Check for duplicate inventory item if not editing existing item
    if (!editingItemId) {
      const duplicateCheck = {
        itemName: inventoryForm.itemName,
        unit: inventoryForm.unit || 'unit'
      };
      
      if (checkForDuplicates.inventoryItemExists(project, duplicateCheck)) {
        if (!confirm(`An inventory item with name '${inventoryForm.itemName}' and unit '${inventoryForm.unit || 'unit'}' already exists. Do you want to add it anyway?`)) {
          return;
        }
      }
    }

    if (editingItemId) {
      // Update existing item
      const updatedInventory = inventory.map(item => 
        item.id === editingItemId 
          ? { 
              ...item, 
              ...inventoryForm,
              lastUpdated: new Date().toISOString().split('T')[0]
            } 
          : item
      );
      
      onProjectUpdate({
        ...project,
        inventory: updatedInventory
      });
    } else {
      // Add new item
      const newItem: InventoryItem = {
        id: `inv-${Date.now()}`,
        name: inventoryForm.itemName || '', // Required by BaseResource
        itemName: inventoryForm.itemName || '',
        quantity: inventoryForm.quantity || 0,
        unit: inventoryForm.unit || 'unit',
        reorderLevel: inventoryForm.reorderLevel || 10,
        location: inventoryForm.location || 'Warehouse',
        status: 'Available', // Required by BaseResource
        lastUpdated: new Date().toISOString().split('T')[0]
      };
      
      onProjectUpdate({
        ...project,
        inventory: [...inventory, newItem]
      });
    }
    
    setIsInventoryModalOpen(false);
    setInventoryForm({
      itemName: '',
      quantity: 0,
      unit: 'unit',
      reorderLevel: 10,
      location: 'Warehouse'
    });
    setEditingItemId(null);
  };

  const handleInitPO = () => {
      const suggestedItems: POItem[] = inventory
          .filter(i => i.quantity <= i.reorderLevel)
          .map(i => ({
              id: `poi-${Date.now()}-${i.id}`,
              itemId: i.id,
              itemName: i.itemName,
              quantity: i.reorderLevel * 2,
              unitPrice: 0
          }));

      setPoForm({
          poNumber: `PO-${Date.now().toString().slice(-6)}`,
          vendor: '',
          date: new Date().toISOString().split('T')[0],
          items: suggestedItems
      });
      setIsPoModalOpen(true);
  };

  const handleSavePO = () => {
      if (!poForm.vendor || !poForm.items?.length) return;
      
      const totalAmount = poForm.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
      const newPO: PurchaseOrder = {
          ...poForm,
          id: `po-${Date.now()}`,
          status: 'Issued',
          totalAmount
      } as PurchaseOrder;

      onProjectUpdate({
          ...project,
          purchaseOrders: [...pos, newPO]
      });
      setIsPoModalOpen(false);
  };

  const handleReceivePO = (poId: string) => {
      const po = pos.find(p => p.id === poId);
      if (!po || po.status === 'Received') return;

      const updatedInventory = inventory.map(item => {
          const poItem = po.items.find(pi => pi.itemName === item.itemName); // Match by item name instead of id
          if (poItem) {
              return { ...item, quantity: item.quantity + poItem.quantity, lastUpdated: new Date().toISOString().split('T')[0] };
          }
          return item;
      });

      const updatedPOs = pos.map(p => p.id === poId ? { ...p, status: 'Received' as const } : p);

      onProjectUpdate({
          ...project,
          inventory: updatedInventory,
          purchaseOrders: updatedPOs
      });
      setIsPoDetailOpen(false);
  };

  const viewingPo = pos.find(p => p.id === selectedPoId);

  return (
    <Box className="animate-in fade-in duration-500">
      <Box display="flex" justifyContent="space-between" mb={2} alignItems="center">
          <Box>
              <Typography variant="h5" fontWeight="900">Resource & Material Matrix</Typography>
              <Typography variant="body2" color="text.secondary">Site inventory management and automated reorder alerts</Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
              <Button variant="outlined" startIcon={<History size={16}/>} sx={{ borderRadius: 2, paddingX: 1.5, paddingY: 0.75 }}>Stock Ledger</Button>
              <Button 
                variant="contained" 
                startIcon={<Package size={16}/>} 
                sx={{ borderRadius: 2, paddingX: 1.5, paddingY: 0.75 }}
                onClick={handleAddInventoryItem}
              >
                Add Inventory Item
              </Button>
              <Button 
                variant="contained" 
                startIcon={<ShoppingCart size={16}/>} 
                sx={{ borderRadius: 2, paddingX: 1.5, paddingY: 0.75 }}
                onClick={handleInitPO}
              >
                Draft Purchase Order
              </Button>
          </Stack>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', mb: 2 }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ bgcolor: 'slate.50', borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="Stock Inventory" icon={<Package size={18}/>} iconPosition="start" />
              <Tab label="Purchase Orders" icon={<FileText size={18}/>} iconPosition="start" />
              <Tab label="Consumption Trends" icon={<TrendingDown size={18}/>} iconPosition="start" />
          </Tabs>

          <Box p={2}>
              {activeTab === 0 && (
                <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                        <Stack spacing={1.5}>
                            <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #ef4444', bgcolor: stats.critical.length > 0 ? 'rose.50/10' : 'white' }}>
                                <CardContent sx={{ p: 2 }}>
                                    <Box display="flex" justifyContent="space-between" mb={1}>
                                        <Typography variant="caption" fontWeight="bold" color="text.secondary">CRITICAL</Typography>
                                        <AlertTriangle size={16} className="text-rose-600"/>
                                    </Box>
                                    <Typography variant="h5" fontWeight="900" color="error.main">{stats.critical.length}</Typography>
                                </CardContent>
                            </Card>
                            <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #f59e0b' }}>
                                <CardContent sx={{ p: 2 }}>
                                    <Box display="flex" justifyContent="space-between" mb={1}>
                                        <Typography variant="caption" fontWeight="bold" color="text.secondary">WARNING</Typography>
                                        <TrendingDown size={16} className="text-amber-600"/>
                                    </Box>
                                    <Typography variant="h5" fontWeight="900" color="warning.main">{stats.warning.length}</Typography>
                                </CardContent>
                            </Card>
                            <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #10b981' }}>
                                <CardContent sx={{ p: 2 }}>
                                    <Box display="flex" justifyContent="space-between" mb={1}>
                                        <Typography variant="caption" fontWeight="bold" color="text.secondary">HEALTHY</Typography>
                                        <CheckCircle2 size={16} className="text-emerald-600"/>
                                    </Box>
                                    <Typography variant="h5" fontWeight="900" color="success.main">{stats.healthy}</Typography>
                                </CardContent>
                            </Card>
                        </Stack>
                    </Grid>

                    <Grid item xs={12} md={8}>
                        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                            <Table size="small">
                                <TableHead sx={{ bgcolor: 'slate.50' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Item Name</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Stock Level</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Threshold</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Location</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {inventory.map(item => (
                                        <TableRow key={item.id} hover>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="bold">{item.itemName}</Typography>
                                                <Typography variant="caption" color="text.secondary">{item.location}</Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight="900" color={item.quantity <= item.reorderLevel ? 'error.main' : 'inherit'}>
                                                    {item.quantity} {item.unit}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Chip label={item.reorderLevel} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2">{item.location}</Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <IconButton 
                                                  size="small" 
                                                  onClick={() => handleEditInventoryItem(item)}
                                                >
                                                  <Edit size={16}/>
                                                </IconButton>
                                                <IconButton 
                                                  size="small" 
                                                  color="error"
                                                  onClick={() => handleDeleteInventoryItem(item.id)}
                                                >
                                                  <Trash2 size={16}/>
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Paper>
                    </Grid>
                </Grid>
              )}

              {activeTab === 1 && (
                  <Box>
                      <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                          <Typography variant="subtitle1" fontWeight="bold">Procurement Ledger</Typography>
                          <Button variant="outlined" size="small" startIcon={<Filter size={14}/>}>Filter Status</Button>
                      </Box>
                      <Grid container spacing={2}>
                          {pos.map(po => (
                              <Grid item xs={12} md={6} key={po.id}>
                                  <Card variant="outlined" sx={{ borderRadius: 3, cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }} onClick={() => { setSelectedPoId(po.id); setIsPoDetailOpen(true); }}>
                                      <CardContent sx={{ p: 2 }}>
                                          <Box display="flex" justifyContent="space-between" mb={1.5}>
                                              <Box>
                                                  <Typography variant="caption" fontWeight="bold" color="primary">{po.poNumber}</Typography>
                                                  <Typography variant="subtitle2" fontWeight="bold">{po.vendor}</Typography>
                                              </Box>
                                              <Chip 
                                                label={po.status.toUpperCase()} 
                                                size="small" 
                                                color={po.status === 'Received' ? 'success' : po.status === 'Issued' ? 'primary' : 'default'} 
                                                sx={{ fontWeight: 'bold', fontSize: 9 }} 
                                              />
                                          </Box>
                                          <Divider sx={{ mb: 1.5 }} />
                                          <Box display="flex" justifyContent="space-between" alignItems="center">
                                              <Typography variant="caption" color="text.secondary">{po.date} • {po.items.length} items</Typography>
                                              <Typography variant="body2" fontWeight="bold">${po.totalAmount.toLocaleString()}</Typography>
                                          </Box>
                                      </CardContent>
                                  </Card>
                              </Grid>
                          ))}
                          {pos.length === 0 && (
                              <Grid item xs={12}>
                                  <Box py={8} textAlign="center" border="1px dashed #e2e8f0" borderRadius={4}>
                                      <FileText size={48} className="text-slate-200 mx-auto mb-2"/>
                                      <Typography color="text.secondary">No purchase orders recorded.</Typography>
                                  </Box>
                              </Grid>
                          )}
                      </Grid>
                  </Box>
              )}
          </Box>
      </Paper>

      {/* Inventory Item Modal */}
      <Dialog open={isInventoryModalOpen} onClose={() => setIsInventoryModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
          <DialogTitle sx={{ fontWeight: 'bold', borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Package className="text-indigo-600" /> {editingItemId ? 'Edit Inventory Item' : 'Add New Inventory Item'}
          </DialogTitle>
          <DialogContent>
              <Stack spacing={3} mt={3}>
                  <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Autocomplete
                          freeSolo
                          options={getAutofillSuggestions.inventoryItems(project, 'itemName', inventoryForm.itemName || '')}
                          value={inventoryForm.itemName || ''}
                          onInputChange={(event, newValue) => {
                            setInventoryForm({...inventoryForm, itemName: newValue});
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              fullWidth
                              label="Item Name"
                              size="small"
                              required
                              InputProps={{
                                ...params.InputProps,
                                type: 'search'
                              }}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={6}><TextField fullWidth label="Current Quantity" type="number" value={inventoryForm.quantity} onChange={e => setInventoryForm({...inventoryForm, quantity: Number(e.target.value)})} size="small" /></Grid>
                      <Grid item xs={6}>
                        <Autocomplete
                          freeSolo
                          options={getAutofillSuggestions.inventoryItems(project, 'unit', inventoryForm.unit || '')}
                          value={inventoryForm.unit || ''}
                          onInputChange={(event, newValue) => setInventoryForm({...inventoryForm, unit: newValue})}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              fullWidth
                              label="Unit"
                              size="small"
                              InputProps={{
                                ...params.InputProps,
                                type: 'search'
                              }}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={6}><TextField fullWidth label="Reorder Level" type="number" value={inventoryForm.reorderLevel} onChange={e => setInventoryForm({...inventoryForm, reorderLevel: Number(e.target.value)})} size="small" /></Grid>
                      <Grid item xs={6}>
                        <Autocomplete
                          freeSolo
                          options={getAutofillSuggestions.inventoryItems(project, 'location', inventoryForm.location || '')}
                          value={inventoryForm.location || ''}
                          onInputChange={(event, newValue) => setInventoryForm({...inventoryForm, location: newValue})}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              fullWidth
                              label="Location"
                              size="small"
                              InputProps={{
                                ...params.InputProps,
                                type: 'search'
                              }}
                            />
                          )}
                        />
                      </Grid>
                  </Grid>
              </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3, bgcolor: '#f8fafc' }}>
              <Button onClick={() => setIsInventoryModalOpen(false)} startIcon={<X />}>Cancel</Button>
              <Button variant="contained" startIcon={<Save />} onClick={handleSaveInventoryItem}>
                {editingItemId ? 'Update Item' : 'Add Item'}
              </Button>
          </DialogActions>
      </Dialog>

      <Dialog open={isPoModalOpen} onClose={() => setIsPoModalOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
          <DialogTitle sx={{ fontWeight: 'bold', borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <ShoppingCart className="text-indigo-600" /> New Purchase Order (PO)
          </DialogTitle>
          <DialogContent>
              <Stack spacing={3} mt={3}>
                  <Grid container spacing={2}>
                      <Grid item xs={6}><TextField fullWidth label="Vendor / Supplier Name" value={poForm.vendor} onChange={e => setPoForm({...poForm, vendor: e.target.value})} size="small" /></Grid>
                      <Grid item xs={3}><TextField fullWidth label="PO Reference" value={poForm.poNumber} disabled size="small" /></Grid>
                      <Grid item xs={3}><TextField fullWidth label="Date" type="date" value={poForm.date} InputLabelProps={{shrink:true}} disabled size="small" /></Grid>
                  </Grid>

                  <Typography variant="caption" fontWeight="bold" color="text.secondary">ORDER ITEMS</Typography>
                  <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                      <Table size="small">
                          <TableHead sx={{ bgcolor: 'slate.50' }}>
                              <TableRow>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Item Name</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Quantity</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Est. Rate</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total</TableCell>
                                  <TableCell align="right"></TableCell>
                              </TableRow>
                          </TableHead>
                          <TableBody>
                              {poForm.items?.map((item, idx) => (
                                  <TableRow key={idx}>
                                      <TableCell>{item.itemName}</TableCell>
                                      <TableCell align="right">
                                          <TextField 
                                            size="small" variant="standard" type="number" value={item.quantity} 
                                            onChange={e => {
                                                const next = [...(poForm.items || [])];
                                                next[idx].quantity = Number(e.target.value);
                                                setPoForm({...poForm, items: next});
                                            }}
                                            InputProps={{ disableUnderline: true, endAdornment: <Typography variant="caption" sx={{ ml: 1 }}>units</Typography> }}
                                            sx={{ width: 60 }}
                                          />
                                      </TableCell>
                                      <TableCell align="right">
                                          <TextField 
                                            size="small" variant="standard" type="number" value={item.unitPrice} 
                                            onChange={e => {
                                                const next = [...(poForm.items || [])];
                                                next[idx].unitPrice = Number(e.target.value);
                                                setPoForm({...poForm, items: next});
                                            }}
                                            InputProps={{ disableUnderline: true, startAdornment: <Typography variant="caption" sx={{ mr: 0.5 }}>$</Typography> }}
                                            sx={{ width: 80 }}
                                          />
                                      </TableCell>
                                      <TableCell align="right"><strong>${(item.quantity * item.unitPrice).toLocaleString()}</strong></TableCell>
                                      <TableCell align="right">
                                          <IconButton size="small" color="error"><Trash2 size={14}/></IconButton>
                                      </TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  </Paper>
                  <Box display="flex" justifyContent="space-between" alignItems="center" bgcolor="slate.900" p={2} borderRadius={2} color="white">
                      <Typography variant="subtitle2" fontWeight="bold">TOTAL PO VALUE</Typography>
                      <Typography variant="h6" fontWeight="bold">
                        ${(poForm.items?.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0) || 0).toLocaleString()}
                      </Typography>
                  </Box>
              </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3, bgcolor: '#f8fafc' }}>
              <Button onClick={() => setIsPoModalOpen(false)}>Cancel</Button>
              <Button variant="contained" startIcon={<Save/>} onClick={handleSavePO} disabled={!poForm.vendor}>Issue Purchase Order</Button>
          </DialogActions>
      </Dialog>

      <Dialog open={isPoDetailOpen} onClose={() => setIsPoDetailOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
          {viewingPo && (
              <>
                  <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
                      <Box>
                          <Typography variant="h6" fontWeight="bold">{viewingPo.poNumber}</Typography>
                          <Typography variant="caption" color="text.secondary">{viewingPo.vendor}</Typography>
                      </Box>
                      <Chip label={viewingPo.status} color={viewingPo.status === 'Received' ? 'success' : 'primary'} size="small" sx={{ fontWeight: 'bold' }} />
                  </DialogTitle>
                  <DialogContent sx={{ pt: 3 }}>
                      <Stack spacing={3}>
                          <List dense disablePadding>
                              {viewingPo.items.map((item, idx) => (
                                  <ListItem key={idx} divider>
                                      <ListItemText primary={item.itemName} secondary={`${item.quantity} units @ $${item.unitPrice}`} />
                                      <Typography variant="body2" fontWeight="bold">${(item.quantity * item.unitPrice).toLocaleString()}</Typography>
                                  </ListItem>
                              ))}
                          </List>
                          <Box display="flex" justifyContent="space-between">
                              <Typography fontWeight="bold">Order Total:</Typography>
                              <Typography fontWeight="bold" color="primary.main">${viewingPo.totalAmount.toLocaleString()}</Typography>
                          </Box>
                          {viewingPo.status === 'Issued' && (
                              <Alert severity="info" icon={<Truck/>}>
                                  This order is currently in transit. Verify delivery on site before receiving.
                              </Alert>
                          )}
                      </Stack>
                  </DialogContent>
                  <DialogActions sx={{ p: 2 }}>
                      <Button variant="outlined" startIcon={<Printer/>}>Print PO</Button>
                      <Box sx={{ flex: 1 }} />
                      <Button onClick={() => setIsPoDetailOpen(false)}>Close</Button>
                      {viewingPo.status === 'Issued' && (
                          <Button variant="contained" color="success" onClick={() => handleReceivePO(viewingPo.id)} startIcon={<CheckCircle2/>}>Confirm Receipt</Button>
                      )}
                  </DialogActions>
              </>
          )}
      </Dialog>
    </Box>
  );
};

export default ResourceManager;
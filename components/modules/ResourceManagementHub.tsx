import React, { useState, useMemo } from 'react';
import { Project, UserRole, InventoryItem, PurchaseOrder, Material, Vehicle } from '../../types';
import { getAutofillSuggestions, checkForDuplicates } from '../../utils/data/autofillUtils';
import { formatCurrency } from '../../utils/formatting/exportUtils';
import { 
    Box, Typography, Button, Grid, Table, TableHead, TableRow, TableCell, 
    TableBody, Paper, Chip, Stack, Card, CardContent, LinearProgress,
    Tooltip, IconButton, Divider, Avatar, Tabs, Tab, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField, InputAdornment,
    List, ListItem, ListItemText, ListItemSecondaryAction, Alert, Checkbox,
    Autocomplete, Select, MenuItem, FormControl, InputLabel, TableContainer
} from '@mui/material';
import { 
    Package, AlertTriangle, CheckCircle2, TrendingDown, Plus, 
    ArrowUpRight, ShoppingCart, History, PackageSearch, Filter,
    FileText, Truck, CreditCard, ChevronRight, Calculator,
    PlusCircle, Trash2, Save, X, Printer, Edit, Car, Fuel, Gauge, 
    Wrench, QrCode, TrendingUp, Warehouse, BarChart3, Search
} from 'lucide-react';

interface Props {
  project: Project;
  userRole: UserRole;
  onProjectUpdate: (project: Project) => void;
}

const ResourceManagementHub: React.FC<Props> = ({ project, onProjectUpdate, userRole }) => {
  const [activeTab, setActiveTab] = useState(0);
  
  // === INVENTORY MANAGEMENT STATE ===
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [inventoryForm, setInventoryForm] = useState<Partial<InventoryItem>>({
    itemName: '',
    quantity: 0,
    unit: 'unit',
    reorderLevel: 10,
    location: 'Warehouse'
  });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  
  // === MATERIAL MANAGEMENT STATE ===
  const [searchTerm, setSearchTerm] = useState('');
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [materialForm, setMaterialForm] = useState<Partial<Material>>({
    name: '',
    category: '',
    unit: '',
    quantity: 0,
    availableQuantity: 0,
    unitCost: 0,
    reorderLevel: 10,
    location: 'Warehouse',
    status: 'Available',
    criticality: 'Medium'
  });
  
  // === PURCHASE ORDER STATE ===
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isPoDetailOpen, setIsPoDetailOpen] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const [poForm, setPoForm] = useState<Partial<PurchaseOrder>>({
    poNumber: `PO-${Date.now().toString().slice(-6)}`,
    vendor: '',
    date: new Date().toISOString().split('T')[0],
    items: []
  });
  
  // === ASSET/FLEET STATE ===
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Vehicle | null>(null);
  const [assetForm, setAssetForm] = useState<Partial<Vehicle>>({
    plateNumber: '',
    type: '',
    status: 'Active',
    driver: '',
    agencyId: '',
    chainage: '',
    gpsLocation: undefined
  });
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);

  // === DATA SOURCES ===
  const inventory = project.inventory || [];
  const materials = project.materials || [];
  const purchaseOrders = project.purchaseOrders || [];
  const assets = project.vehicles || [];
  
  // === STATISTICS CALCULATIONS ===
  const inventoryStats = useMemo(() => {
    const critical = inventory.filter(i => i.quantity <= i.reorderLevel);
    const warning = inventory.filter(i => i.quantity > i.reorderLevel && i.quantity <= i.reorderLevel * 1.5);
    const healthy = inventory.length - critical.length - warning.length;
    const totalValue = inventory.reduce((sum, item) => sum + ((item as any).unitCost || 0) * item.quantity, 0);
    return { critical, warning, healthy, totalValue };
  }, [inventory]);

  const materialStats = useMemo(() => {
    const totalMaterials = materials.length;
    const lowStock = materials.filter(m => m.availableQuantity <= m.reorderLevel).length;
    const outOfStock = materials.filter(m => m.availableQuantity === 0).length;
    const totalValue = materials.reduce((sum, m) => sum + (m.totalValue || 0), 0);
    return { totalMaterials, lowStock, outOfStock, totalValue };
  }, [materials]);

  const assetStats = useMemo(() => {
    const active = assets.filter(a => a.status === 'Active');
    const maintenance = assets.filter(a => a.status === 'Maintenance');
    const idle = assets.filter(a => a.status === 'Idle');
    return { active, maintenance, idle };
  }, [assets]);

  // === FILTERED DATA ===
  const filteredMaterials = useMemo(() => {
    return materials.filter(material => 
      material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [materials, searchTerm]);

  // === HANDLERS ===
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

  const handleAddMaterial = () => {
    setMaterialForm({
      name: '',
      category: '',
      unit: '',
      quantity: 0,
      availableQuantity: 0,
      unitCost: 0,
      reorderLevel: 10,
      location: 'Warehouse',
      status: 'Available',
      criticality: 'Medium'
    });
    setEditingMaterialId(null);
    setIsMaterialModalOpen(true);
  };

  const handleAddAsset = () => {
    setAssetForm({
      plateNumber: '',
      type: '',
      status: 'Active',
      driver: '',
      agencyId: '',
      chainage: '',
      gpsLocation: undefined
    });
    setEditingAssetId(null);
    setIsAssetModalOpen(true);
  };

  const getStatusColor = (quantity: number, reorderLevel: number) => {
    if (quantity <= reorderLevel) return 'error';
    if (quantity <= reorderLevel * 1.5) return 'warning';
    return 'success';
  };

  return (
    <Box sx={{ height: 'calc(100vh - 140px)', overflowY: 'auto', p: 2 }}>
      <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
        <Box>
          <Typography variant="h5" fontWeight="900">Resource Management Hub</Typography>
          <Typography variant="body2" color="text.secondary">
            Unified inventory, materials, assets, and procurement management
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button 
            variant="outlined" 
            startIcon={<Package size={16}/>} 
            onClick={handleAddInventoryItem}
          >
            Add Inventory
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<ShoppingCart size={16}/>} 
            onClick={() => setIsPoModalOpen(true)}
          >
            New PO
          </Button>
          <Button 
            variant="contained" 
            startIcon={<Plus size={16}/>} 
            onClick={handleAddMaterial}
          >
            Add Material
          </Button>
        </Box>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`Inventory (${inventory.length})`} icon={<Warehouse size={16} />} iconPosition="start" />
          <Tab label={`Materials (${materials.length})`} icon={<Package size={16} />} iconPosition="start" />
          <Tab label={`Purchase Orders (${purchaseOrders.length})`} icon={<FileText size={16} />} iconPosition="start" />
          <Tab label={`Assets (${assets.length})`} icon={<Car size={16} />} iconPosition="start" />
        </Tabs>

        <Box p={3}>
          {/* Inventory Tab */}
          {activeTab === 0 && (
            <Box>
              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="error.main" fontWeight="bold">
                        {inventoryStats.critical.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Critical Stock
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="warning.main" fontWeight="bold">
                        {inventoryStats.warning.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Low Stock
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="success.main" fontWeight="bold">
                        {inventoryStats.healthy}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Healthy Stock
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="primary.main" fontWeight="bold">
                        ₹{inventoryStats.totalValue.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Value
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Paper variant="outlined" sx={{ borderRadius: 3 }}>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'slate.50' }}>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Item</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Quantity</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Unit</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Reorder Level</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Location</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Status</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {inventory.map(item => (
                        <TableRow key={item.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {item.itemName || item.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{item.quantity}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{item.unit}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{item.reorderLevel}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{item.location}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={
                                item.quantity <= item.reorderLevel ? 'Critical' :
                                item.quantity <= item.reorderLevel * 1.5 ? 'Low' : 'Healthy'
                              }
                              size="small"
                              color={getStatusColor(item.quantity, item.reorderLevel) as any}
                              variant="filled"
                              sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Button 
                                variant="outlined" 
                                size="small" 
                                startIcon={<Edit size={16}/>}
                                onClick={() => {
                                  setInventoryForm({
                                    id: item.id,
                                    itemName: item.itemName || item.name || '',
                                    quantity: item.quantity,
                                    unit: item.unit,
                                    reorderLevel: item.reorderLevel,
                                    location: item.location
                                  });
                                  setEditingItemId(item.id);
                                  setIsInventoryModalOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                              <Button 
                                variant="outlined" 
                                size="small" 
                                color="error"
                                startIcon={<Trash2 size={16}/>}
                              >
                                Delete
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
          )}

          {/* Materials Tab */}
          {activeTab === 1 && (
            <Box>
              <Box mb={3}>
                <TextField
                  fullWidth
                  placeholder="Search materials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <Search size={18} style={{ marginRight: 8 }} />
                  }}
                />
              </Box>

              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="primary.main" fontWeight="bold">
                        {materialStats.totalMaterials}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Materials
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="warning.main" fontWeight="bold">
                        {materialStats.lowStock}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Low Stock
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="error.main" fontWeight="bold">
                        {materialStats.outOfStock}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Out of Stock
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="success.main" fontWeight="bold">
                        ₹{materialStats.totalValue.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Value
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Paper variant="outlined" sx={{ borderRadius: 3 }}>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'slate.50' }}>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Material</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Category</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Available</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Unit Cost</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Location</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Status</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredMaterials.map(material => (
                        <TableRow key={material.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {material.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={material.category} 
                              size="small" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{material.availableQuantity} {material.unit}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">₹{material.unitCost?.toLocaleString()}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{material.location}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={material.status}
                              size="small"
                              color={material.status === 'Available' ? 'success' : 'warning'}
                              variant="filled"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Button 
                              variant="outlined" 
                              size="small" 
                              startIcon={<Edit size={16}/>}
                              onClick={() => {
                                setMaterialForm(material);
                                setEditingMaterialId(material.id);
                                setIsMaterialModalOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
          )}

          {/* Purchase Orders Tab */}
          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" mb={2}>Purchase Orders</Typography>
              <Paper variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
                <Typography textAlign="center" color="text.secondary">
                  Purchase Order management interface would be implemented here
                </Typography>
              </Paper>
            </Box>
          )}

          {/* Assets Tab */}
          {activeTab === 3 && (
            <Box>
              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="success.main" fontWeight="bold">
                        {assetStats.active.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active Assets
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="warning.main" fontWeight="bold">
                        {assetStats.maintenance.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        In Maintenance
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="info.main" fontWeight="bold">
                        {assetStats.idle.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Idle Assets
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="primary.main" fontWeight="bold">
                        {assets.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Assets
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Paper variant="outlined" sx={{ borderRadius: 3 }}>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'slate.50' }}>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Asset</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Driver</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Chainage</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {assets.map(asset => (
                        <TableRow key={asset.id} hover>
                          <TableCell>
                            <Stack direction="column" spacing={0.5}>
                              <Typography variant="body2" fontWeight="bold">
                                {asset.plateNumber}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ID: {asset.id}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={asset.type} 
                              size="small" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{asset.driver}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={asset.status}
                              size="small"
                              color={
                                asset.status === 'Active' ? 'success' : 
                                asset.status === 'Maintenance' ? 'warning' : 'default'
                              }
                              variant="filled"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{asset.chainage}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Button 
                                variant="outlined" 
                                size="small" 
                                startIcon={<QrCode size={16}/>}
                                onClick={() => {
                                  setSelectedAsset(asset);
                                  setIsQRModalOpen(true);
                                }}
                              >
                                QR Code
                              </Button>
                              <Button 
                                variant="outlined" 
                                size="small" 
                                startIcon={<Edit size={16}/>}
                                onClick={() => {
                                  setAssetForm(asset);
                                  setEditingAssetId(asset.id);
                                  setIsAssetModalOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default ResourceManagementHub;
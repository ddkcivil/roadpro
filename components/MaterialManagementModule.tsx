import React, { useState, useMemo } from 'react';
import { 
    Box, Typography, Button, Grid, Card, CardContent, Stack,
    Paper, Tabs, Tab, Divider, Chip, Tooltip, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField,
    Select, MenuItem, FormControl, InputLabel, Autocomplete,
    Table, TableHead, TableRow, TableCell, TableBody
} from '@mui/material';
import { 
    Package, Truck, Calculator, TrendingUp, AlertTriangle, 
    CheckCircle, Plus, Edit, Trash2, Search, Filter, X, Save,
    History, BarChart3, ShoppingCart, Warehouse
} from 'lucide-react';
import { Project, UserRole, Material, Agency } from '../types';
import { formatCurrency } from '../utils/exportUtils';

interface Props {
    project: Project;
    userRole: UserRole;
    onProjectUpdate: (project: Project) => void;
}

const MaterialManagementModule: React.FC<Props> = ({ project, onProjectUpdate, userRole }) => {
    const [activeTab, setActiveTab] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
    const [isRateModalOpen, setIsRateModalOpen] = useState(false);
    const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
    const [editingRateId, setEditingRateId] = useState<string | null>(null);
    
    // Material form state
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
    
    // Rate form state
    const [rateForm, setRateForm] = useState({
        materialId: '',
        supplierId: '',
        rate: 0,
        effectiveDate: new Date().toISOString().split('T')[0],
        description: ''
    });

    const materials = project.materials || [];
    const agencies = project.agencies || [];

    // Stats calculations
    const materialStats = useMemo(() => {
        const totalMaterials = materials.length;
        const lowStock = materials.filter(m => m.availableQuantity <= m.reorderLevel).length;
        const outOfStock = materials.filter(m => m.availableQuantity === 0).length;
        const totalValue = materials.reduce((sum, m) => sum + (m.totalValue || 0), 0);
        return { totalMaterials, lowStock, outOfStock, totalValue };
    }, [materials]);

    // Filter materials
    const filteredMaterials = useMemo(() => {
        return materials.filter(material => 
            material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            material.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            material.location.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [materials, searchTerm]);

    // Handle material operations
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

    const handleEditMaterial = (material: Material) => {
        setMaterialForm({ ...material });
        setEditingMaterialId(material.id);
        setIsMaterialModalOpen(true);
    };

    const handleDeleteMaterial = (materialId: string) => {
        if (!window.confirm('Are you sure you want to delete this material?')) return;
        const updatedMaterials = materials.filter(m => m.id !== materialId);
        onProjectUpdate({
            ...project,
            materials: updatedMaterials
        });
    };

    const handleSaveMaterial = () => {
        if (!materialForm.name?.trim() || !materialForm.unit?.trim()) {
            alert('Material name and unit are required');
            return;
        }

        const totalValue = (materialForm.quantity || 0) * (materialForm.unitCost || 0);
        const availableQuantity = materialForm.availableQuantity ?? materialForm.quantity ?? 0;
        const status: 'Available' | 'Low Stock' | 'Out of Stock' | 'Discontinued' = availableQuantity === 0 ? 'Out of Stock' : 
                      availableQuantity <= (materialForm.reorderLevel || 10) ? 'Low Stock' : 'Available';

        if (editingMaterialId) {
            // Update existing material
            const updatedMaterials = materials.map(material => 
                material.id === editingMaterialId 
                    ? { 
                        id: material.id, // Preserve the original ID
                        name: materialForm.name || material.name,
                        description: materialForm.description,
                        category: materialForm.category || material.category,
                        unit: materialForm.unit || material.unit,
                        quantity: materialForm.quantity || material.quantity || 0,
                        location: materialForm.location || material.location || 'Warehouse',
                        status: status as 'Available' | 'Low Stock' | 'Out of Stock' | 'Discontinued',
                        lastUpdated: new Date().toISOString().split('T')[0],
                        availableQuantity,
                        unitCost: materialForm.unitCost || material.unitCost || 0,
                        totalValue,
                        reorderLevel: materialForm.reorderLevel || material.reorderLevel || 10,
                        maxStockLevel: materialForm.maxStockLevel,
                        criticality: materialForm.criticality || material.criticality || 'Medium',
                        notes: materialForm.notes,
                        tags: materialForm.tags,
                        // LogisticsFields
                        deliveryLocation: materialForm.deliveryLocation,
                        transportMode: materialForm.transportMode,
                        driverName: materialForm.driverName,
                        vehicleNumber: materialForm.vehicleNumber,
                        deliveryCharges: materialForm.deliveryCharges,
                        taxAmount: materialForm.taxAmount,
                        batchNumber: materialForm.batchNumber,
                        expiryDate: materialForm.expiryDate,
                        qualityCertification: materialForm.qualityCertification,
                        supplierInvoiceRef: materialForm.supplierInvoiceRef,
                        orderedDate: materialForm.orderedDate,
                        expectedDeliveryDate: materialForm.expectedDeliveryDate,
                        deliveryDate: materialForm.deliveryDate,
                        // SupplierInfo
                        supplierId: materialForm.supplierId,
                        supplierName: materialForm.supplierName,
                        supplierRate: materialForm.supplierRate
                    } 
                    : material
            );
            
            onProjectUpdate({
                ...project,
                materials: updatedMaterials
            });
        } else {
            // Add new material
            const newMaterial: Material = {
                id: `mat-${Date.now()}`,
                name: materialForm.name || '',
                description: materialForm.description,
                category: materialForm.category,
                unit: materialForm.unit || '',
                quantity: materialForm.quantity || 0,
                location: materialForm.location || 'Warehouse',
                status: status as 'Available' | 'Low Stock' | 'Out of Stock' | 'Discontinued',
                lastUpdated: new Date().toISOString().split('T')[0],
                availableQuantity,
                unitCost: materialForm.unitCost || 0,
                totalValue,
                reorderLevel: materialForm.reorderLevel || 10,
                maxStockLevel: materialForm.maxStockLevel,
                criticality: materialForm.criticality || 'Medium',
                notes: materialForm.notes,
                tags: materialForm.tags,
                // LogisticsFields
                deliveryLocation: materialForm.deliveryLocation,
                transportMode: materialForm.transportMode,
                driverName: materialForm.driverName,
                vehicleNumber: materialForm.vehicleNumber,
                deliveryCharges: materialForm.deliveryCharges,
                taxAmount: materialForm.taxAmount,
                batchNumber: materialForm.batchNumber,
                expiryDate: materialForm.expiryDate,
                qualityCertification: materialForm.qualityCertification,
                supplierInvoiceRef: materialForm.supplierInvoiceRef,
                orderedDate: materialForm.orderedDate,
                expectedDeliveryDate: materialForm.expectedDeliveryDate,
                deliveryDate: materialForm.deliveryDate,
                // SupplierInfo
                supplierId: materialForm.supplierId,
                supplierName: materialForm.supplierName,
                supplierRate: materialForm.supplierRate
            };
            
            onProjectUpdate({
                ...project,
                materials: [...materials, newMaterial]
            });
        }
        
        setIsMaterialModalOpen(false);
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
    };

    // Handle rate operations
    const handleAddRate = (materialId: string) => {
        setRateForm({
            materialId,
            supplierId: '',
            rate: 0,
            effectiveDate: new Date().toISOString().split('T')[0],
            description: ''
        });
        setEditingRateId(null);
        setIsRateModalOpen(true);
    };

    const handleSaveRate = () => {
        if (!rateForm.supplierId || rateForm.rate <= 0) {
            alert('Please select supplier and enter valid rate');
            return;
        }

        const newRate = {
            id: `rate-${Date.now()}`,
            materialId: rateForm.materialId,
            supplierId: rateForm.supplierId,
            rate: rateForm.rate,
            effectiveDate: rateForm.effectiveDate,
            description: rateForm.description,
            status: 'Active' as const
        };

        // Update material with new rate
        const updatedMaterials = materials.map(material => {
            if (material.id === rateForm.materialId) {
                const rateHistory = [...(material.rateHistory || []), newRate];
                return {
                    ...material,
                    rateHistory,
                    supplierId: rateForm.supplierId,
                    supplierRate: rateForm.rate,
                    lastUpdated: new Date().toISOString().split('T')[0]
                };
            }
            return material;
        });

        onProjectUpdate({
            ...project,
            materials: updatedMaterials
        });

        setIsRateModalOpen(false);
        setRateForm({
            materialId: '',
            supplierId: '',
            rate: 0,
            effectiveDate: new Date().toISOString().split('T')[0],
            description: ''
        });
        setEditingRateId(null);
    };

    return (
        <Box className="animate-in fade-in duration-500">
            <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                <Box>
                    <Typography variant="h4" fontWeight="800" gutterBottom color="primary">
                        Material Management
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Unified system for material inventory and supplier rate management
                    </Typography>
                </Box>
                <Button 
                    variant="contained" 
                    startIcon={<Plus size={18}/>} 
                    onClick={handleAddMaterial}
                    sx={{ paddingX: 2, paddingY: 1, fontSize: 16, fontWeight: 600 }}
                >
                    Add Material
                </Button>
            </Box>

            <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden', mb: 3 }}>
                <Tabs 
                    value={activeTab} 
                    onChange={(_, v) => setActiveTab(v)} 
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="Materials" icon={<Package size={20}/>} iconPosition="start" />
                    <Tab label="Suppliers" icon={<Truck size={20}/>} iconPosition="start" />
                    <Tab label="Analytics" icon={<BarChart3 size={20}/>} iconPosition="start" />
                </Tabs>

                <Box p={3}>
                    {/* MATERIALS TAB */}
                    {activeTab === 0 && (
                        <Box>
                            <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                                <TextField 
                                    size="small" 
                                    placeholder="Search materials..." 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)}
                                    sx={{ width: 400 }}
                                    InputProps={{ startAdornment: <Search size={16} className="text-slate-400 mr-2"/> }}
                                />
                                <Button variant="outlined" startIcon={<Filter size={14}/>}>
                                    Filter Materials
                                </Button>
                            </Box>

                            <Grid container spacing={3} mb={4}>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #10b981' }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">
                                                    TOTAL MATERIALS
                                                </Typography>
                                                <Package size={16} className="text-emerald-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="success.main">
                                                {materialStats.totalMaterials}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #f59e0b' }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">
                                                    LOW STOCK
                                                </Typography>
                                                <AlertTriangle size={16} className="text-amber-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="warning.main">
                                                {materialStats.lowStock}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #ef4444' }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">
                                                    OUT OF STOCK
                                                </Typography>
                                                <X size={16} className="text-red-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="error.main">
                                                {materialStats.outOfStock}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #6366f1' }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">
                                                    TOTAL VALUE
                                                </Typography>
                                                <TrendingUp size={16} className="text-indigo-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="primary.main">
                                                {formatCurrency(materialStats.totalValue)}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: 'primary.main' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Material</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Category</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Available</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Unit Cost</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Total Value</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Location</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Status</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold', color: 'white' }}>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredMaterials.map(material => (
                                            <TableRow key={material.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {material.name}
                                                    </Typography>
                                                    {material.description && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            {material.description}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={material.category || 'Uncategorized'} 
                                                        size="small" 
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {material.availableQuantity} {material.unit}
                                                    </Typography>
                                                    {material.availableQuantity <= material.reorderLevel && (
                                                        <Chip 
                                                            label="Low Stock" 
                                                            size="small" 
                                                            color="warning" 
                                                            sx={{ ml: 1 }} 
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {formatCurrency(material.unitCost || 0)}
                                                </TableCell>
                                                <TableCell>
                                                    {formatCurrency(material.totalValue || 0)}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{material.location}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={material.status} 
                                                        size="small" 
                                                        color={
                                                            material.status === 'Available' ? 'success' :
                                                            material.status === 'Low Stock' ? 'warning' : 'error'
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Tooltip title="Manage Rates">
                                                        <Button 
                                                            size="small" 
                                                            onClick={() => handleAddRate(material.id)}
                                                        >
                                                            <Calculator size={16}/>
                                                        </Button>
                                                    </Tooltip>
                                                    <Tooltip title="Edit">
                                                        <Button 
                                                            size="small" 
                                                            onClick={() => handleEditMaterial(material)}
                                                        >
                                                            <Edit size={16}/>
                                                        </Button>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <Button 
                                                            size="small" 
                                                            color="error" 
                                                            onClick={() => handleDeleteMaterial(material.id)}
                                                        >
                                                            <Trash2 size={16}/>
                                                        </Button>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                
                                {filteredMaterials.length === 0 && (
                                    <Box py={8} textAlign="center">
                                        <Package size={48} className="text-slate-300 mx-auto mb-2"/>
                                        <Typography color="text.secondary">
                                            No materials found. Add your first material to get started.
                                        </Typography>
                                    </Box>
                                )}
                            </Paper>
                        </Box>
                    )}

                    {/* SUPPLIERS TAB */}
                    {activeTab === 1 && (
                        <Box>
                            <Typography variant="h6" mb={3}>Supplier Rate Management</Typography>
                            <Typography color="text.secondary">
                                Manage supplier rates for materials in the Materials tab.
                            </Typography>
                        </Box>
                    )}

                    {/* ANALYTICS TAB */}
                    {activeTab === 2 && (
                        <Box>
                            <Typography variant="h6" mb={3}>Material Analytics</Typography>
                            <Typography color="text.secondary">
                                Analytics dashboard coming soon.
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Paper>

            {/* MATERIAL MODAL */}
            <Dialog 
                open={isMaterialModalOpen} 
                onClose={() => setIsMaterialModalOpen(false)} 
                maxWidth="md" 
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Package className="text-indigo-600" /> 
                    {editingMaterialId ? 'Edit Material' : 'Add New Material'}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={3} mt={2}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Material Name"
                                    value={materialForm.name || ''}
                                    onChange={e => setMaterialForm({...materialForm, name: e.target.value})}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Category"
                                    value={materialForm.category || ''}
                                    onChange={e => setMaterialForm({...materialForm, category: e.target.value})}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Unit"
                                    value={materialForm.unit || ''}
                                    onChange={e => setMaterialForm({...materialForm, unit: e.target.value})}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Quantity"
                                    type="number"
                                    value={materialForm.quantity || 0}
                                    onChange={e => setMaterialForm({...materialForm, quantity: Number(e.target.value)})}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Available Quantity"
                                    type="number"
                                    value={materialForm.availableQuantity ?? materialForm.quantity ?? 0}
                                    onChange={e => setMaterialForm({...materialForm, availableQuantity: Number(e.target.value)})}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Unit Cost"
                                    type="number"
                                    value={materialForm.unitCost || 0}
                                    onChange={e => setMaterialForm({...materialForm, unitCost: Number(e.target.value)})}
                                    InputProps={{
                                        startAdornment: <span>{project.settings?.currency || 'Rs'}</span>
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Reorder Level"
                                    type="number"
                                    value={materialForm.reorderLevel || 10}
                                    onChange={e => setMaterialForm({...materialForm, reorderLevel: Number(e.target.value)})}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Location"
                                    value={materialForm.location || 'Warehouse'}
                                    onChange={e => setMaterialForm({...materialForm, location: e.target.value})}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Description"
                                    multiline
                                    rows={2}
                                    value={materialForm.description || ''}
                                    onChange={e => setMaterialForm({...materialForm, description: e.target.value})}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Criticality</InputLabel>
                                    <Select
                                        value={materialForm.criticality || 'Medium'}
                                        label="Criticality"
                                        onChange={e => setMaterialForm({...materialForm, criticality: e.target.value as any})}
                                    >
                                        <MenuItem value="High">High</MenuItem>
                                        <MenuItem value="Medium">Medium</MenuItem>
                                        <MenuItem value="Low">Low</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 3, bgcolor: '#f8fafc' }}>
                    <Button onClick={() => setIsMaterialModalOpen(false)} startIcon={<X />}>
                        Cancel
                    </Button>
                    <Button 
                        variant="contained" 
                        startIcon={<Save />} 
                        onClick={handleSaveMaterial}
                    >
                        {editingMaterialId ? 'Update Material' : 'Add Material'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* RATE MODAL */}
            <Dialog 
                open={isRateModalOpen} 
                onClose={() => setIsRateModalOpen(false)} 
                maxWidth="sm" 
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Calculator className="text-indigo-600" /> 
                    Manage Supplier Rates
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={3} mt={2}>
                        <Autocomplete
                            options={agencies}
                            getOptionLabel={(option) => option.name}
                            value={agencies.find(a => a.id === rateForm.supplierId) || null}
                            onChange={(_, newValue) => {
                                setRateForm({...rateForm, supplierId: newValue?.id || ''});
                            }}
                            renderInput={(params) => (
                                <TextField 
                                    {...params} 
                                    label="Select Supplier" 
                                    required 
                                />
                            )}
                        />
                        <TextField
                            fullWidth
                            label="Rate"
                            type="number"
                            value={rateForm.rate}
                            onChange={e => setRateForm({...rateForm, rate: Number(e.target.value)})}
                            InputProps={{
                                startAdornment: <span>{project.settings?.currency || 'Rs'}</span>
                            }}
                            required
                        />
                        <TextField
                            fullWidth
                            label="Effective Date"
                            type="date"
                            value={rateForm.effectiveDate}
                            onChange={e => setRateForm({...rateForm, effectiveDate: e.target.value})}
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            fullWidth
                            label="Description"
                            multiline
                            rows={2}
                            value={rateForm.description}
                            onChange={e => setRateForm({...rateForm, description: e.target.value})}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 3, bgcolor: '#f8fafc' }}>
                    <Button onClick={() => setIsRateModalOpen(false)} startIcon={<X />}>
                        Cancel
                    </Button>
                    <Button 
                        variant="contained" 
                        startIcon={<Save />} 
                        onClick={handleSaveRate}
                    >
                        Save Rate
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default MaterialManagementModule;
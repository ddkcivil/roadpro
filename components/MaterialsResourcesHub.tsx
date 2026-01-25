import React, { useState, useMemo } from 'react';
import { 
    Box, Typography, Button, Grid, Card, CardContent, Stack,
    Paper, Tabs, Tab, Divider, List, ListItem, ListItemText, 
    ListItemIcon, Chip, Avatar, Tooltip, Alert, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField,
    Select, MenuItem, FormControl, InputLabel, LinearProgress
} from '@mui/material';
import { 
    Package, Truck, Scale, FlaskConical, PackageSearch, 
    TrendingUp, AlertTriangle, CheckCircle, Wrench, Gauge,
    Plus, Edit, Trash2, QrCode, Filter, Search, X, Save,
    Calendar, FileText, History
} from 'lucide-react';
import { Project, UserRole, Vehicle, InventoryItem, LabTest, PurchaseOrder } from '../types';
import { formatCurrency } from '../utils/exportUtils';
import QRCodeGenerator from './QRCodeGenerator';

interface Props {
    project: Project;
    userRole: UserRole;
    onProjectUpdate: (project: Project) => void;
}

const MaterialsResourcesHub: React.FC<Props> = ({ project, onProjectUpdate, userRole }) => {
    const [activeTab, setActiveTab] = useState(0);
    const [activeSubTab, setActiveSubTab] = useState(0); // For assets/inventory/lab within main tabs
    const [searchTerm, setSearchTerm] = useState('');
    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
    const [isTestModalOpen, setIsTestModalOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<Vehicle | null>(null);
    const [selectedInventory, setSelectedInventory] = useState<InventoryItem | null>(null);
    const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
    
    // Asset states
    const [assetForm, setAssetForm] = useState<Partial<Vehicle>>({
        plateNumber: '',
        type: '',
        status: 'Active',
        driver: '',
        agencyId: '',
        gpsLocation: undefined
    });
    const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
    
    // Inventory states
    const [inventoryForm, setInventoryForm] = useState<Partial<InventoryItem>>({
        itemName: '',
        quantity: 0,
        unit: 'unit',
        reorderLevel: 10,
        location: 'Warehouse'
    });
    const [editingInventoryId, setEditingInventoryId] = useState<string | null>(null);
    
    // Test states
    const [testForm, setTestForm] = useState<Partial<LabTest>>({
        testName: '',
        category: 'Soil',
        sampleId: '',
        date: new Date().toISOString().split('T')[0],
        location: '',
        result: 'Pass',
        assetId: '',
        testData: {},
        calculatedValue: '',
        standardLimit: ''
    });
    const [editingTestId, setEditingTestId] = useState<string | null>(null);

    const assets = project.vehicles || [];
    const inventory = project.inventory || [];
    const labTests = project.labTests || [];

    // Stats calculations
    const assetStats = useMemo(() => {
        const active = assets.filter(a => a.status === 'Active');
        const maintenance = assets.filter(a => a.status === 'Maintenance');
        const idle = assets.filter(a => a.status === 'Idle');
        return { active: active.length, maintenance: maintenance.length, idle: idle.length };
    }, [assets]);

    const inventoryStats = useMemo(() => {
        const lowStock = inventory.filter(i => i.quantity <= (i.reorderLevel || 10));
        const totalItems = inventory.length;
        // Note: InventoryItem doesn't have a rate property, so we can't calculate total value based on rate
        // If we need value calculations, we'd need to add a rate/cost field to InventoryItem
        return { lowStock: lowStock.length, totalItems, totalValue: 0 };
    }, [inventory]);

    const testStats = useMemo(() => {
        const total = labTests.length;
        const passed = labTests.filter(t => t.result === 'Pass').length;
        const failed = labTests.filter(t => t.result === 'Fail').length;
        const passRate = total > 0 ? Math.round((passed / total) * 100) : 100;
        return { total, passed, failed, passRate };
    }, [labTests]);

    // Filter functions
    const filteredAssets = useMemo(() => {
        return assets.filter(asset => 
            asset.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            asset.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
            asset.driver.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [assets, searchTerm]);

    const filteredInventory = useMemo(() => {
        return inventory.filter(item => 
            item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.unit.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [inventory, searchTerm]);

    const filteredTests = useMemo(() => {
        return labTests.filter(test => 
            test.sampleId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            test.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            test.location.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [labTests, searchTerm]);

    // Asset functions
    const handleAddAsset = () => {
        setAssetForm({
            plateNumber: '',
            type: '',
            status: 'Active',
            driver: '',
            agencyId: '',
            gpsLocation: undefined
        });
        setEditingAssetId(null);
        setIsAssetModalOpen(true);
    };

    const handleEditAsset = (asset: Vehicle) => {
        setAssetForm({
            id: asset.id,
            plateNumber: asset.plateNumber,
            type: asset.type,
            status: asset.status,
            driver: asset.driver,
            agencyId: asset.agencyId || '',
            gpsLocation: asset.gpsLocation
        });
        setEditingAssetId(asset.id);
        setIsAssetModalOpen(true);
    };

    const handleDeleteAsset = (assetId: string) => {
        if (!window.confirm('Are you sure you want to delete this asset?')) return;
        const updatedAssets = assets.filter(asset => asset.id !== assetId);
        onProjectUpdate({
            ...project,
            vehicles: updatedAssets
        });
    };

    const handleSaveAsset = () => {
        if (!assetForm.plateNumber?.trim() || !assetForm.type?.trim()) {
            alert('Plate number and type are required');
            return;
        }

        if (editingAssetId) {
            // Update existing asset
            const updatedAssets = assets.map(asset => 
                asset.id === editingAssetId 
                    ? { 
                        ...asset, 
                        ...assetForm,
                        agencyId: assetForm.agencyId || undefined,
                        gpsLocation: assetForm.gpsLocation
                    } 
                    : asset
            );
            
            onProjectUpdate({
                ...project,
                vehicles: updatedAssets
            });
        } else {
            // Add new asset
            const newAsset: Vehicle = {
                id: `asset-${Date.now()}`,
                name: `${assetForm.plateNumber} - ${assetForm.type}`, // Required by BaseResource
                plateNumber: assetForm.plateNumber,
                type: assetForm.type,
                unit: 'unit', // Required by BaseResource
                quantity: 1, // Required by BaseResource
                status: assetForm.status || 'Active',
                driver: assetForm.driver || '',
                agencyId: assetForm.agencyId || undefined,
                location: 'Site', // Required by BaseResource
                gpsLocation: assetForm.gpsLocation,
                lastUpdated: new Date().toISOString().split('T')[0] // Required by BaseResource
            };
            
            onProjectUpdate({
                ...project,
                vehicles: [...assets, newAsset]
            });
        }
        
        setIsAssetModalOpen(false);
        setAssetForm({
            plateNumber: '',
            type: '',
            status: 'Active',
            driver: '',
            agencyId: '',
            gpsLocation: undefined
        });
        setEditingAssetId(null);
    };

    // Inventory functions
    const handleAddInventory = () => {
        setInventoryForm({
            itemName: '',
            quantity: 0,
            unit: 'unit',
            reorderLevel: 10,
            location: 'Warehouse'
        });
        setEditingInventoryId(null);
        setIsInventoryModalOpen(true);
    };

    const handleEditInventory = (item: InventoryItem) => {
        setInventoryForm({
            id: item.id,
            itemName: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
            reorderLevel: item.reorderLevel,
            location: item.location
        });
        setEditingInventoryId(item.id);
        setIsInventoryModalOpen(true);
    };

    const handleDeleteInventory = (itemId: string) => {
        if (!window.confirm('Are you sure you want to delete this inventory item?')) return;
        const updatedInventory = inventory.filter(item => item.id !== itemId);
        onProjectUpdate({
            ...project,
            inventory: updatedInventory
        });
    };

    const handleSaveInventory = () => {
        if (!inventoryForm.itemName?.trim()) {
            alert('Item name is required');
            return;
        }

        if (editingInventoryId) {
            // Update existing inventory
            const updatedInventory = inventory.map(item => 
                item.id === editingInventoryId 
                    ? { 
                        ...item, 
                        ...inventoryForm,
                        name: inventoryForm.itemName, // Sync name field for BaseResource compatibility
                        lastUpdated: new Date().toISOString().split('T')[0]
                    } 
                    : item
            );
            
            onProjectUpdate({
                ...project,
                inventory: updatedInventory
            });
        } else {
            // Add new inventory
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
        setEditingInventoryId(null);
    };

    // Test functions
    const handleAddTest = () => {
        setTestForm({
            testName: '',
            category: 'Soil',
            sampleId: '',
            date: new Date().toISOString().split('T')[0],
            location: '',
            result: 'Pass',
            assetId: '',
            testData: {},
            calculatedValue: '',
            standardLimit: ''
        });
        setEditingTestId(null);
        setIsTestModalOpen(true);
    };

    const handleEditTest = (test: LabTest) => {
        setTestForm({
            id: test.id,
            testName: test.testName,
            category: test.category,
            sampleId: test.sampleId,
            date: test.date,
            location: test.location,
            result: test.result,
            assetId: test.assetId,
            testData: test.testData,
            calculatedValue: test.calculatedValue,
            standardLimit: test.standardLimit
        });
        setEditingTestId(test.id);
        setIsTestModalOpen(true);
    };

    const handleDeleteTest = (testId: string) => {
        if (!window.confirm('Are you sure you want to delete this test?')) return;
        const updatedTests = labTests.filter(test => test.id !== testId);
        onProjectUpdate({
            ...project,
            labTests: updatedTests
        });
    };

    const handleSaveTest = () => {
        if (!testForm.testName?.trim() || !testForm.sampleId?.trim()) {
            alert('Test name and sample ID are required');
            return;
        }

        if (editingTestId) {
            // Update existing test
            const updatedTests = labTests.map(test => 
                test.id === editingTestId 
                    ? { ...test, ...testForm } 
                    : test
            );
            
            onProjectUpdate({
                ...project,
                labTests: updatedTests
            });
        } else {
            // Add new test
            const newTest: LabTest = {
                id: `test-${Date.now()}`,
                testName: testForm.testName,
                category: testForm.category as any,
                sampleId: testForm.sampleId,
                date: testForm.date || new Date().toISOString().split('T')[0],
                location: testForm.location || '',
                result: testForm.result || 'Pass',
                assetId: testForm.assetId || '',
                testData: testForm.testData || {},
                calculatedValue: testForm.calculatedValue || '',
                standardLimit: testForm.standardLimit || ''
            };
            
            onProjectUpdate({
                ...project,
                labTests: [...labTests, newTest]
            });
        }
        
        setIsTestModalOpen(false);
        setTestForm({
            testName: '',
            category: 'Soil',
            sampleId: '',
            date: new Date().toISOString().split('T')[0],
            location: '',
            result: 'Pass',
            assetId: '',
            testData: {},
            calculatedValue: '',
            standardLimit: ''
        });
        setEditingTestId(null);
    };

    return (
        <Box className="animate-in fade-in duration-500">
            <Box display="flex" justifyContent="space-between" mb={2} alignItems="center">
                <Box>
                    <Typography variant="caption" fontWeight="900" color="primary" sx={{ letterSpacing: '0.2em', textTransform: 'uppercase' }}>MATERIALS & RESOURCES</Typography>
                    <Typography variant="h4" fontWeight="900">Materials & Resources Hub</Typography>
                    <Typography variant="body2" color="text.secondary">Unified management for equipment, inventory, and material testing</Typography>
                </Box>
                <Stack direction="row" spacing={1.5}>
                    <Button variant="outlined" startIcon={<History size={16}/>} sx={{ borderRadius: 2, paddingX: 1.5, paddingY: 0.75 }}>Audit Trail</Button>
                    <Button 
                        variant="contained" 
                        startIcon={<Plus size={16}/>} 
                        sx={{ borderRadius: 2, paddingX: 1.5, paddingY: 0.75 }}
                        onClick={() => {
                            if (activeTab === 0) handleAddAsset();
                            else if (activeTab === 1) handleAddInventory();
                            else handleAddTest();
                        }}
                    >
                        Add {activeTab === 0 ? 'Asset' : activeTab === 1 ? 'Item' : 'Test'}
                    </Button>
                </Stack>
            </Box>

            <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden', mb: 2 }}>
                <Tabs 
                    value={activeTab} 
                    onChange={(_, v) => setActiveTab(v)} 
                    sx={{ bgcolor: 'slate.50', borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="Assets & Equipment" icon={<Truck size={18}/>} iconPosition="start" />
                    <Tab label="Inventory & Stock" icon={<Package size={18}/>} iconPosition="start" />
                    <Tab label="Material Testing" icon={<Scale size={18}/>} iconPosition="start" />
                </Tabs>

                <Box p={2}>
                    {/* ASSETS TAB */}
                    {activeTab === 0 && (
                        <Box>
                            <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                                <TextField 
                                    size="small" 
                                    placeholder="Search assets..." 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)}
                                    sx={{ width: 400, bgcolor: 'white' }}
                                    InputProps={{ startAdornment: <Search size={16} className="text-slate-400 mr-2"/> }}
                                />
                                <Button variant="outlined" startIcon={<Filter size={14}/>}>Filter Assets</Button>
                            </Box>

                            <Grid container spacing={3} mb={4}>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #10b981', bgcolor: 'white', height: '100%' }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">ACTIVE</Typography>
                                                <CheckCircle size={16} className="text-emerald-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="success.main">{assetStats.active}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #f59e0b', bgcolor: 'white', height: '100%' }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">MAINTENANCE</Typography>
                                                <Wrench size={16} className="text-amber-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="warning.main">{assetStats.maintenance}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #6366f1', bgcolor: 'white', height: '100%' }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">IDLE</Typography>
                                                <Gauge size={16} className="text-indigo-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="primary.main">{assetStats.idle}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #8b5cf6', bgcolor: 'white', height: '100%' }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">TOTAL</Typography>
                                                <Truck size={16} className="text-violet-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="secondary.main">{assets.length}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ backgroundColor: '#f8fafc' }}>
                                        <tr>
                                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>Plate Number</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>Type</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>Agency</th>
                                            <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>Driver</th>
                                            <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAssets.map(asset => (
                                            <tr key={asset.id} style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }} onClick={() => handleEditAsset(asset)}>
                                                <td style={{ padding: '12px' }}>
                                                    <Typography variant="body2" fontWeight="bold">{asset.plateNumber}</Typography>
                                                </td>
                                                <td style={{ padding: '12px' }}>
                                                    <Typography variant="body2">{asset.type}</Typography>
                                                </td>
                                                <td style={{ padding: '12px' }}>
                                                    <Typography variant="body2">
                                                        {asset.agencyId ? (
                                                            project.agencies?.find(a => a.id === asset.agencyId)?.name || 'Unknown Agency'
                                                        ) : 'Unassigned'}
                                                    </Typography>
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'right' }}>
                                                    <Chip 
                                                        label={asset.status} 
                                                        size="small" 
                                                        variant="outlined"
                                                        color={
                                                            asset.status === 'Active' ? 'success' :
                                                            asset.status === 'Maintenance' ? 'warning' : 'default'
                                                        }
                                                        sx={{ height: 18, fontSize: 10 }} 
                                                    />
                                                </td>
                                                <td style={{ padding: '12px' }}>
                                                    <Typography variant="body2">{asset.driver}</Typography>
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'right' }}>
                                                    <Tooltip title="QR Code">
                                                        <Button size="small" onClick={(e) => { e.stopPropagation(); setSelectedAsset(asset); }}>
                                                            <QrCode size={16}/>
                                                        </Button>
                                                    </Tooltip>
                                                    <Tooltip title="Edit">
                                                        <Button size="small" onClick={(e) => { e.stopPropagation(); handleEditAsset(asset); }}>
                                                            <Edit size={16}/>
                                                        </Button>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDeleteAsset(asset.id); }}>
                                                            <Trash2 size={16}/>
                                                        </Button>
                                                    </Tooltip>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredAssets.length === 0 && (
                                    <Box py={8} textAlign="center" border="1px dashed #e2e8f0" borderRadius={4}>
                                        <Truck size={48} className="text-slate-200 mx-auto mb-2"/>
                                        <Typography color="text.secondary">No assets registered.</Typography>
                                    </Box>
                                )}
                            </Paper>
                        </Box>
                    )}

                    {/* INVENTORY TAB */}
                    {activeTab === 1 && (
                        <Box>
                            <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                                <TextField 
                                    size="small" 
                                    placeholder="Search inventory..." 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)}
                                    sx={{ width: 400, bgcolor: 'white' }}
                                    InputProps={{ startAdornment: <Search size={16} className="text-slate-400 mr-2"/> }}
                                />
                                <Button variant="outlined" startIcon={<Filter size={14}/>}>Filter Items</Button>
                            </Box>

                            <Grid container spacing={3} mb={4}>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #10b981', bgcolor: 'white', height: '100%' }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">TOTAL ITEMS</Typography>
                                                <Package size={16} className="text-emerald-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="success.main">{inventoryStats.totalItems}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #f59e0b', bgcolor: 'white', height: '100%' }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">LOW STOCK</Typography>
                                                <AlertTriangle size={16} className="text-amber-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="warning.main">{inventoryStats.lowStock}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #6366f1', bgcolor: 'white', height: '100%' }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">TOTAL VALUE</Typography>
                                                <FileText size={16} className="text-indigo-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="primary.main">{formatCurrency(inventoryStats.totalValue)}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #8b5cf6', bgcolor: 'white', height: '100%' }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">UTILIZATION</Typography>
                                                <TrendingUp size={16} className="text-violet-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="secondary.main">68%</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ backgroundColor: '#f8fafc' }}>
                                        <tr>
                                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>Item Name</th>
                                            <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>Quantity</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>Unit</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>Location</th>
                                            <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>Value</th>
                                            <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredInventory.map(item => (
                                            <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }} onClick={() => handleEditInventory(item)}>
                                                <td style={{ padding: '12px' }}>
                                                    <Typography variant="body2" fontWeight="bold">{item.itemName}</Typography>
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'right' }}>
                                                    <Typography variant="body2" fontWeight="bold">{item.quantity}</Typography>
                                                    {item.quantity <= item.reorderLevel && (
                                                        <Chip label="Low Stock" size="small" color="warning" sx={{ ml: 1 }} />
                                                    )}
                                                </td>
                                                <td style={{ padding: '12px' }}>
                                                    <Typography variant="body2">{item.unit}</Typography>
                                                </td>
                                                <td style={{ padding: '12px' }}>
                                                    <Typography variant="body2">{item.location}</Typography>
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'right' }}>
                                                    <Typography variant="body2">{item.quantity} {item.unit}</Typography>
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'right' }}>
                                                    <Tooltip title="Edit">
                                                        <Button size="small" onClick={(e) => { e.stopPropagation(); handleEditInventory(item); }}>
                                                            <Edit size={16}/>
                                                        </Button>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDeleteInventory(item.id); }}>
                                                            <Trash2 size={16}/>
                                                        </Button>
                                                    </Tooltip>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredInventory.length === 0 && (
                                    <Box py={8} textAlign="center" border="1px dashed #e2e8f0" borderRadius={4}>
                                        <Package size={48} className="text-slate-200 mx-auto mb-2"/>
                                        <Typography color="text.secondary">No inventory items registered.</Typography>
                                    </Box>
                                )}
                            </Paper>
                        </Box>
                    )}

                    {/* LAB TESTS TAB */}
                    {activeTab === 2 && (
                        <Box>
                            <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                                <TextField 
                                    size="small" 
                                    placeholder="Search tests..." 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)}
                                    sx={{ width: 400, bgcolor: 'white' }}
                                    InputProps={{ startAdornment: <Search size={16} className="text-slate-400 mr-2"/> }}
                                />
                                <Button variant="outlined" startIcon={<Filter size={14}/>}>Filter Tests</Button>
                            </Box>

                            <Grid container spacing={3} mb={4}>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #10b981', bgcolor: 'white', height: '100%' }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">TOTAL TESTS</Typography>
                                                <Scale size={16} className="text-emerald-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="success.main">{testStats.total}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #f59e0b', bgcolor: 'white', height: '100%' }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">PASS RATE</Typography>
                                                <CheckCircle size={16} className="text-amber-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="warning.main">{testStats.passRate}%</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #ef4444', bgcolor: 'white', height: '100%' }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">FAILED TESTS</Typography>
                                                <AlertTriangle size={16} className="text-red-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="error.main">{testStats.failed}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #8b5cf6', bgcolor: 'white', height: '100%' }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">QA STATUS</Typography>
                                                <FlaskConical size={16} className="text-violet-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="secondary.main">HEALTHY</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ backgroundColor: '#f8fafc' }}>
                                        <tr>
                                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>Sample ID</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>Test Type</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>Location</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>Result</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>Date</th>
                                            <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTests.map(test => (
                                            <tr key={test.id} style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }} onClick={() => handleEditTest(test)}>
                                                <td style={{ padding: '12px' }}>
                                                    <Typography variant="body2" fontWeight="bold">{test.sampleId}</Typography>
                                                </td>
                                                <td style={{ padding: '12px' }}>
                                                    <Typography variant="body2">{test.testName}</Typography>
                                                    <Chip label={test.category} size="small" variant="outlined" sx={{ height: 16, fontSize: 8, fontWeight: 'black', textTransform: 'uppercase', mt: 0.5 }} />
                                                </td>
                                                <td style={{ padding: '12px' }}>
                                                    <Typography variant="body2">{test.location}</Typography>
                                                </td>
                                                <td style={{ padding: '12px' }}>
                                                    <Chip 
                                                        label={test.result.toUpperCase()} 
                                                        size="small" 
                                                        color={test.result === 'Pass' ? 'success' : 'error'} 
                                                        sx={{ fontWeight: '900', fontSize: 10, width: 70 }} 
                                                    />
                                                </td>
                                                <td style={{ padding: '12px' }}>
                                                    <Typography variant="body2">{test.date}</Typography>
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'right' }}>
                                                    <Tooltip title="Edit">
                                                        <Button size="small" onClick={(e) => { e.stopPropagation(); handleEditTest(test); }}>
                                                            <Edit size={16}/>
                                                        </Button>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDeleteTest(test.id); }}>
                                                            <Trash2 size={16}/>
                                                        </Button>
                                                    </Tooltip>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredTests.length === 0 && (
                                    <Box py={8} textAlign="center" border="1px dashed #e2e8f0" borderRadius={4}>
                                        <Scale size={48} className="text-slate-200 mx-auto mb-2"/>
                                        <Typography color="text.secondary">No lab tests recorded.</Typography>
                                    </Box>
                                )}
                            </Paper>
                        </Box>
                    )}
                </Box>
            </Paper>

            {/* ASSET MODAL */}
            <Dialog open={isAssetModalOpen} onClose={() => setIsAssetModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
                <DialogTitle sx={{ fontWeight: 'bold', borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Truck className="text-indigo-600" /> {editingAssetId ? 'Edit Asset' : 'Add New Asset'}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={3} mt={3}>
                        <Grid container spacing={2}>
                            <Grid item xs={12}><TextField fullWidth label="Plate Number" value={assetForm.plateNumber} onChange={e => setAssetForm({...assetForm, plateNumber: e.target.value})} size="small" required /></Grid>
                            <Grid item xs={12}><TextField fullWidth label="Asset Type" value={assetForm.type} onChange={e => setAssetForm({...assetForm, type: e.target.value})} size="small" required /></Grid>
                            <Grid item xs={6}>
                                <TextField 
                                    fullWidth 
                                    label="Status" 
                                    select
                                    value={assetForm.status} 
                                    onChange={e => setAssetForm({...assetForm, status: e.target.value as any})} 
                                    size="small"
                                    SelectProps={{ native: true }}
                                >
                                    <option value="Active">Active</option>
                                    <option value="Maintenance">Maintenance</option>
                                    <option value="Idle">Idle</option>
                                </TextField>
                            </Grid>
                            <Grid item xs={6}><TextField fullWidth label="Assigned Driver" value={assetForm.driver} onChange={e => setAssetForm({...assetForm, driver: e.target.value})} size="small" /></Grid>
                            <Grid item xs={12}>
                                <TextField 
                                    fullWidth 
                                    label="Assigned Agency/Contractor" 
                                    select
                                    value={assetForm.agencyId || ''}
                                    onChange={e => setAssetForm({...assetForm, agencyId: e.target.value})}
                                    size="small"
                                    SelectProps={{ native: true }}
                                >
                                    <option value="">None</option>
                                    {project.agencies?.filter(a => a.type === 'agency' || a.type === 'subcontractor').map(agency => (
                                        <option key={agency.id} value={agency.id}>{agency.name}</option>
                                    ))}
                                </TextField>
                            </Grid>
                        </Grid>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 3, bgcolor: '#f8fafc' }}>
                    <Button onClick={() => setIsAssetModalOpen(false)} startIcon={<X />}>Cancel</Button>
                    <Button variant="contained" startIcon={<Save />} onClick={handleSaveAsset}>
                        {editingAssetId ? 'Update Asset' : 'Add Asset'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* INVENTORY MODAL */}
            <Dialog open={isInventoryModalOpen} onClose={() => setIsInventoryModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
                <DialogTitle sx={{ fontWeight: 'bold', borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Package className="text-indigo-600" /> {editingInventoryId ? 'Edit Item' : 'Add New Item'}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={3} mt={3}>
                        <Grid container spacing={2}>
                            <Grid item xs={12}><TextField fullWidth label="Item Name" value={inventoryForm.itemName} onChange={e => setInventoryForm({...inventoryForm, itemName: e.target.value})} size="small" required /></Grid>
                            <Grid item xs={6}><TextField fullWidth label="Quantity" type="number" value={inventoryForm.quantity} onChange={e => setInventoryForm({...inventoryForm, quantity: Number(e.target.value)})} size="small" required /></Grid>
                            <Grid item xs={6}><TextField fullWidth label="Unit" value={inventoryForm.unit} onChange={e => setInventoryForm({...inventoryForm, unit: e.target.value})} size="small" required /></Grid>
                            <Grid item xs={6}><TextField fullWidth label="Reorder Level" type="number" value={inventoryForm.reorderLevel} onChange={e => setInventoryForm({...inventoryForm, reorderLevel: Number(e.target.value)})} size="small" /></Grid>
                            <Grid item xs={6}><TextField fullWidth label="Location" value={inventoryForm.location} onChange={e => setInventoryForm({...inventoryForm, location: e.target.value})} size="small" /></Grid>

                        </Grid>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 3, bgcolor: '#f8fafc' }}>
                    <Button onClick={() => setIsInventoryModalOpen(false)} startIcon={<X />}>Cancel</Button>
                    <Button variant="contained" startIcon={<Save />} onClick={handleSaveInventory}>
                        {editingInventoryId ? 'Update Item' : 'Add Item'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* TEST MODAL */}
            <Dialog open={isTestModalOpen} onClose={() => setIsTestModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
                <DialogTitle sx={{ fontWeight: 'bold', borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Scale className="text-indigo-600" /> {editingTestId ? 'Edit Test' : 'Add New Test'}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={3} mt={3}>
                        <Grid container spacing={2}>
                            <Grid item xs={12}><TextField fullWidth label="Test Name" value={testForm.testName} onChange={e => setTestForm({...testForm, testName: e.target.value})} size="small" required /></Grid>
                            <Grid item xs={6}>
                                <TextField 
                                    fullWidth 
                                    label="Category" 
                                    select
                                    value={testForm.category} 
                                    onChange={e => setTestForm({...testForm, category: e.target.value as any})} 
                                    size="small"
                                    SelectProps={{ native: true }}
                                >
                                    <option value="Soil">Soil</option>
                                    <option value="Aggregate">Aggregate</option>
                                    <option value="Concrete">Concrete</option>
                                    <option value="Bitumen">Bitumen</option>
                                </TextField>
                            </Grid>
                            <Grid item xs={6}><TextField fullWidth label="Sample ID" value={testForm.sampleId} onChange={e => setTestForm({...testForm, sampleId: e.target.value})} size="small" required /></Grid>
                            <Grid item xs={6}><TextField fullWidth label="Date" type="date" value={testForm.date} onChange={e => setTestForm({...testForm, date: e.target.value})} size="small" InputLabelProps={{ shrink: true }} /></Grid>
                            <Grid item xs={6}>
                                <TextField 
                                    fullWidth 
                                    label="Result" 
                                    select
                                    value={testForm.result} 
                                    onChange={e => setTestForm({...testForm, result: e.target.value as any})} 
                                    size="small"
                                    SelectProps={{ native: true }}
                                >
                                    <option value="Pass">Pass</option>
                                    <option value="Fail">Fail</option>
                                </TextField>
                            </Grid>
                            <Grid item xs={12}><TextField fullWidth label="Location" value={testForm.location} onChange={e => setTestForm({...testForm, location: e.target.value})} size="small" /></Grid>
                            <Grid item xs={12}><TextField fullWidth label="Calculated Value" value={testForm.calculatedValue} onChange={e => setTestForm({...testForm, calculatedValue: e.target.value})} size="small" /></Grid>
                            <Grid item xs={12}><TextField fullWidth label="Standard Limit" value={testForm.standardLimit} onChange={e => setTestForm({...testForm, standardLimit: e.target.value})} size="small" /></Grid>
                        </Grid>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 3, bgcolor: '#f8fafc' }}>
                    <Button onClick={() => setIsTestModalOpen(false)} startIcon={<X />}>Cancel</Button>
                    <Button variant="contained" startIcon={<Save />} onClick={handleSaveTest}>
                        {editingTestId ? 'Update Test' : 'Add Test'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* QR CODE MODAL */}
            <Dialog open={!!selectedAsset} onClose={() => setSelectedAsset(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
                <DialogTitle sx={{ fontWeight: 'bold', borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <QrCode className="text-indigo-600" /> Asset QR Code
                </DialogTitle>
                <DialogContent>
                    {selectedAsset && (
                        <Box display="flex" flexDirection="column" alignItems="center" py={3}>
                            <QRCodeGenerator 
                                data={`Asset ID: ${selectedAsset.id}
Plate: ${selectedAsset.plateNumber}
Type: ${selectedAsset.type}
Status: ${selectedAsset.status}
Driver: ${selectedAsset.driver}`} 
                                size={256}
                                title={`${selectedAsset.plateNumber} - ${selectedAsset.type}`}
                                description="Scan to access asset details"
                            />
                            <Box mt={3} p={2} bgcolor="slate.50" borderRadius={2} width="100%">
                                <Typography variant="body2" fontWeight="bold" mb={1}>Asset Details:</Typography>
                                <Typography variant="caption">ID: {selectedAsset.id}</Typography><br/>
                                <Typography variant="caption">Plate: {selectedAsset.plateNumber}</Typography><br/>
                                <Typography variant="caption">Type: {selectedAsset.type}</Typography><br/>
                                <Typography variant="caption">Status: {selectedAsset.status}</Typography><br/>
                                <Typography variant="caption">Driver: {selectedAsset.driver}</Typography>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3, bgcolor: '#f8fafc' }}>
                    <Button onClick={() => setSelectedAsset(null)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default MaterialsResourcesHub;
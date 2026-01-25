import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Button, Grid, Card, CardContent, Stack,
    Paper, Tabs, Tab, Divider, Chip, Tooltip, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField,
    Select, MenuItem, FormControl, InputLabel, Autocomplete,
    Table, TableHead, TableRow, TableCell, TableBody,
    IconButton, Alert
} from '@mui/material';
import {
    Package, Truck, Users, Wrench, Calculator, TrendingUp, AlertTriangle,
    CheckCircle, Plus, Edit, Trash2, Search, Filter, X, Save,
    History, BarChart3, ShoppingCart, Warehouse, PackageCheck, Scale, Download, Printer
} from 'lucide-react';
import { Project, UserRole, Material, Vehicle, LabTest, PurchaseOrder, POItem } from '../types';
import { formatCurrency } from '../utils/exportUtils';
import { getAutofillSuggestions, checkForDuplicates } from '../utils/autofillUtils';
import { generateResourcePDF } from '../utils/pdfUtils';

interface Props {
    project: Project;
    userRole: UserRole;
    onProjectUpdate: (project: Project) => void;
}

const UnifiedResourceManager: React.FC<Props> = ({ project, onProjectUpdate, userRole }) => {
    const [activeTab, setActiveTab] = useState(0);
    const [activeSubTab, setActiveSubTab] = useState(0); // For resources/inventory/equipment/tests within main tabs
    const [searchTerm, setSearchTerm] = useState('');
    const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
    const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
    const [isPoModalOpen, setIsPoModalOpen] = useState(false);
    const [isTestModalOpen, setIsTestModalOpen] = useState(false);
    
    const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
    const [editingAllocationId, setEditingAllocationId] = useState<string | null>(null);
    const [editingTestId, setEditingTestId] = useState<string | null>(null);
    
    // PDF export function
    const handleExportPDF = () => {
        generateResourcePDF(project);
    };
    
    // Resource form state
    const [resourceForm, setResourceForm] = useState<Partial<Material>>({
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

    // Allocation form state
    const [allocationForm, setAllocationForm] = useState({
        resourceId: '',
        allocatedTo: '',
        allocatedQuantity: 0,
        startDate: '',
        endDate: '',
        notes: ''
    });

    // PO form state
    const [poForm, setPoForm] = useState<Partial<PurchaseOrder>>({
        poNumber: `PO-${Date.now().toString().slice(-6)}`,
        vendor: '',
        date: new Date().toISOString().split('T')[0],
        items: []
    });

    // Test form state
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

    // Get all resources (materials, vehicles, etc.)
    const materials = project.materials || [];
    const vehicles = project.vehicles || [];
    const labTests = project.labTests || [];
    const purchaseOrders = project.purchaseOrders || [];

    // Combined resources array
    // Define a unified resource type for display purposes
    type UnifiedResource = {
        id: string;
        name: string;
        type: 'Material' | 'Equipment';
        category: string;
        unit: string;
        totalQuantity: number;
        availableQuantity: number;
        location: string;
        status: string;
        [key: string]: any; // Allow other properties
    };
    
    const allResources: UnifiedResource[] = [
        ...materials.map(m => ({ 
            ...m, 
            type: 'Material' as const, 
            totalQuantity: m.quantity, 
            availableQuantity: m.availableQuantity,
            unit: m.unit || 'unit',
            location: m.location || 'Warehouse',
            status: m.status || 'Available',
            category: m.category || 'General',
            name: m.name || m.description || 'Unnamed Material'
        })),
        ...vehicles.map(v => ({ 
            ...v, 
            type: 'Equipment' as const, 
            totalQuantity: 1, 
            availableQuantity: v.status === 'Active' ? 1 : 0,
            name: v.plateNumber || v.type || 'Unnamed Equipment', // Use plate number as name for vehicles
            unit: 'unit', // Default unit for equipment
            location: 'Site', // Default location for equipment
            category: v.type || 'Vehicle', // Use vehicle type as category
            status: v.status
        }))
    ];

    // Stats calculations
    const resourceStats = useMemo(() => {
        const totalResources = allResources.length;
        const materialsCount = materials.length;
        const equipmentCount = vehicles.length;
        const lowStock = materials.filter(m => m.availableQuantity !== undefined && m.reorderLevel !== undefined && m.availableQuantity <= m.reorderLevel).length;
        const totalValue = materials.reduce((sum, m) => sum + (m.totalValue || 0), 0);
        return { totalResources, materialsCount, equipmentCount, lowStock, totalValue };
    }, [allResources, materials, vehicles]);

    // Filter resources
    const filteredResources = useMemo(() => {
        return allResources.filter(resource =>
            resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (resource.category && resource.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
            resource.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
            resource.type.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [allResources, searchTerm]);

    // Handle resource operations
    const handleAddResource = () => {
        setResourceForm({
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
        setEditingResourceId(null);
        setIsResourceModalOpen(true);
    };

    const handleEditResource = (resource: typeof allResources[0]) => {
        if (resource.type === 'Material') {
            // Ensure status is of the correct type for Material
            const materialResource: Partial<Material> = {
                ...resource,
                status: resource.status as 'Available' | 'Low Stock' | 'Out of Stock' | 'Discontinued'
            };
            setResourceForm(materialResource);
        } else {
            // For equipment, create a partial material object with common fields
            setResourceForm({
                id: resource.id,
                name: resource.name,
                category: resource.category,
                unit: resource.unit,
                quantity: resource.totalQuantity,
                availableQuantity: resource.availableQuantity,
                location: resource.location,
                status: 'Available', // Default status for equipment
                description: resource.type
            });
        }
        setEditingResourceId(resource.id);
        setIsResourceModalOpen(true);
    };

    const handleDeleteResource = (resourceId: string) => {
        if (!window.confirm('Are you sure you want to delete this resource?')) return;
        
        // Remove from materials if it's a material
        const updatedMaterials = materials.filter(m => m.id !== resourceId);
        onProjectUpdate({
            ...project,
            materials: updatedMaterials
        });
    };

    const handleSaveResource = () => {
        if (!resourceForm.name?.trim() || !resourceForm.unit?.trim()) {
            alert('Resource name and unit are required');
            return;
        }

        const totalValue = (resourceForm.quantity || 0) * (resourceForm.unitCost || 0);
        const availableQuantity = resourceForm.availableQuantity ?? resourceForm.quantity ?? 0;
        const status = availableQuantity === 0 ? 'Out of Stock' :
                      availableQuantity <= (resourceForm.reorderLevel || 10) ? 'Low Stock' : 'Available';

        if (editingResourceId) {
            // Update existing material resource
            const updatedMaterials = materials.map(material =>
                material.id === editingResourceId
                    ? {
                        ...material,
                        ...resourceForm,
                        availableQuantity,
                        totalValue,
                        status,
                        lastUpdated: new Date().toISOString().split('T')[0]
                    } as Material
                    : material
            );

            onProjectUpdate({
                ...project,
                materials: updatedMaterials
            });
        } else {
            // Add new material resource
            const newResource: Material = {
                id: `mat-${Date.now()}`,
                name: resourceForm.name || '',
                description: resourceForm.description,
                category: resourceForm.category,
                unit: resourceForm.unit || 'unit',
                quantity: resourceForm.quantity || 0,
                availableQuantity,
                unitCost: resourceForm.unitCost || 0,
                totalValue,
                reorderLevel: resourceForm.reorderLevel || 10,
                maxStockLevel: resourceForm.maxStockLevel,
                location: resourceForm.location || 'Warehouse',
                lastUpdated: new Date().toISOString().split('T')[0],
                status,
                criticality: resourceForm.criticality || 'Medium',
                notes: resourceForm.notes,
                tags: resourceForm.tags
            };

            onProjectUpdate({
                ...project,
                materials: [...materials, newResource]
            });
        }

        setIsResourceModalOpen(false);
        setResourceForm({
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
        setEditingResourceId(null);
    };

    // Handle PO operations
    const handleInitPO = () => {
        // Suggest items that are below reorder level
        const suggestedItems: POItem[] = materials
            .filter(m => m.availableQuantity <= m.reorderLevel)
            .map(m => ({
                id: `poi-${Date.now()}-${m.id}`,
                itemId: m.id,
                itemName: m.name,
                quantity: m.reorderLevel * 2,
                unitPrice: m.unitCost || 0
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

        const totalAmount = poForm.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice!), 0);
        const newPO: PurchaseOrder = {
            ...poForm,
            id: `po-${Date.now()}`,
            status: 'Issued',
            totalAmount
        } as PurchaseOrder;

        onProjectUpdate({
            ...project,
            purchaseOrders: [...purchaseOrders, newPO]
        });
        setIsPoModalOpen(false);
    };

    // Handle test operations
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
        setTestForm({ ...test });
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

    // Equipment operations
    const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
    const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(null);
    
    const [equipmentForm, setEquipmentForm] = useState<Partial<Vehicle>>({
        plateNumber: '',
        type: '',
        status: 'Active',
        driver: '',
        agencyId: ''
    });

    const handleAddEquipment = () => {
        setEquipmentForm({
            plateNumber: '',
            type: '',
            status: 'Active',
            driver: '',
            agencyId: ''
        });
        setEditingEquipmentId(null);
        setIsEquipmentModalOpen(true);
    };

    const handleEditEquipment = (vehicle: Vehicle) => {
        setEquipmentForm({
            id: vehicle.id,
            plateNumber: vehicle.plateNumber,
            type: vehicle.type,
            status: vehicle.status,
            driver: vehicle.driver,
            agencyId: vehicle.agencyId
        });
        setEditingEquipmentId(vehicle.id);
        setIsEquipmentModalOpen(true);
    };

    const handleDeleteEquipment = (vehicleId: string) => {
        if (!window.confirm('Are you sure you want to delete this equipment?')) return;
        const updatedVehicles = vehicles.filter(v => v.id !== vehicleId);
        onProjectUpdate({
            ...project,
            vehicles: updatedVehicles
        });
    };

    const handleSaveEquipment = () => {
        if (!equipmentForm.plateNumber?.trim() || !equipmentForm.type?.trim()) {
            alert('Plate number and type are required');
            return;
        }

        if (editingEquipmentId) {
            // Update existing equipment
            const updatedVehicles = vehicles.map(vehicle =>
                vehicle.id === editingEquipmentId
                    ? { ...vehicle, ...equipmentForm }
                    : vehicle
            );

            onProjectUpdate({
                ...project,
                vehicles: updatedVehicles
            });
        } else {
            // Add new equipment
            const newVehicle: Vehicle = {
                id: `veh-${Date.now()}`,
                name: `${equipmentForm.plateNumber} - ${equipmentForm.type}`, // Required by BaseResource
                description: equipmentForm.type || '', // Required by BaseResource
                category: equipmentForm.type || 'Vehicle', // Required by BaseResource
                unit: 'unit', // Required by BaseResource
                quantity: 1, // Required by BaseResource
                location: 'Site', // Required by BaseResource
                status: equipmentForm.status || 'Active', // Required by BaseResource
                lastUpdated: new Date().toISOString().split('T')[0], // Required by BaseResource
                plateNumber: equipmentForm.plateNumber,
                type: equipmentForm.type,
                driver: equipmentForm.driver || '',
                agencyId: equipmentForm.agencyId
            };

            onProjectUpdate({
                ...project,
                vehicles: [...vehicles, newVehicle]
            });
        }

        setIsEquipmentModalOpen(false);
        setEquipmentForm({
            plateNumber: '',
            type: '',
            status: 'Active',
            driver: '',
            agencyId: ''
        });
        setEditingEquipmentId(null);
    };

    // PO operations
    const handleViewPO = (po: PurchaseOrder) => {
        setPoForm(po);
        setIsPoModalOpen(true);
    };

    const handleDeletePO = (poId: string) => {
        if (!window.confirm('Are you sure you want to delete this purchase order?')) return;
        const updatedPOs = purchaseOrders.filter(po => po.id !== poId);
        onProjectUpdate({
            ...project,
            purchaseOrders: updatedPOs
        });
    };

    return (
        <Box className="animate-in fade-in duration-500">
            <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                <Box>
                    <Typography variant="h4" fontWeight="800" gutterBottom color="primary">
                        Unified Resource Manager
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Comprehensive management for materials, equipment, inventory, and testing
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1.5}>
                    <Button variant="contained" startIcon={<Plus size={18}/>} onClick={handleAddResource}>
                        Add Resource
                    </Button>
                    <Button variant="outlined" startIcon={<ShoppingCart size={16}/>} onClick={handleInitPO}>
                        Create PO
                    </Button>
                    <Button variant="outlined" startIcon={<Printer size={16}/>} onClick={handleExportPDF}>
                        Export PDF
                    </Button>
                </Stack>
            </Box>

            <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden', mb: 3 }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, v) => setActiveTab(v)}
                    sx={{ bgcolor: 'slate.50', borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="Resources" icon={<Package size={18}/>} iconPosition="start" />
                    <Tab label="Equipment" icon={<Truck size={18}/>} iconPosition="start" />
                    <Tab label="Testing" icon={<Scale size={18}/>} iconPosition="start" />
                    <Tab label="Procurement" icon={<ShoppingCart size={18}/>} iconPosition="start" />
                </Tabs>

                <Box p={3}>
                    {/* RESOURCES TAB */}
                    {activeTab === 0 && (
                        <Box>
                            <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                                <TextField
                                    size="small"
                                    placeholder="Search resources..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    sx={{ width: 400 }}
                                    InputProps={{ startAdornment: <Search size={16} className="text-slate-400 mr-2"/> }}
                                />
                                <Button variant="outlined" startIcon={<Filter size={14}/>}>
                                    Filter Resources
                                </Button>
                            </Box>

                            <Grid container spacing={3} mb={4}>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #10b981' }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">
                                                    TOTAL RESOURCES
                                                </Typography>
                                                <Package size={16} className="text-emerald-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="success.main">
                                                {resourceStats.totalResources}
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
                                                {resourceStats.lowStock}
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
                                                {formatCurrency(resourceStats.totalValue)}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #8b5cf6' }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">
                                                    MATERIALS
                                                </Typography>
                                                <PackageCheck size={16} className="text-violet-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="secondary.main">
                                                {resourceStats.materialsCount}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: 'primary.main' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Name</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Type</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Available</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Unit Cost</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Location</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Status</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold', color: 'white' }}>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredResources.map(resource => (
                                            <TableRow key={resource.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {resource.name}
                                                    </Typography>
                                                    {'description' in resource && resource.description && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            {resource.description}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={resource.type}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {resource.availableQuantity} {resource.unit}
                                                    </Typography>
                                                    {resource.type === 'Material' && resource.availableQuantity !== undefined && resource.reorderLevel !== undefined && resource.availableQuantity <= resource.reorderLevel && (
                                                        <Chip
                                                            label="Low Stock"
                                                            size="small"
                                                            color="warning"
                                                            sx={{ ml: 1 }}
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {resource.type === 'Material' && resource.unitCost ? formatCurrency(resource.unitCost) : 'N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{resource.location}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={resource.status}
                                                        size="small"
                                                        color={
                                                            resource.status === 'Available' ? 'success' :
                                                            resource.status === 'Low Stock' ? 'warning' :
                                                            resource.status === 'Out of Stock' ? 'error' : 'default'
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Tooltip title="Edit">
                                                        <Button
                                                            size="small"
                                                            onClick={() => handleEditResource(resource)}
                                                        >
                                                            <Edit size={16}/>
                                                        </Button>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <Button
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleDeleteResource(resource.id)}
                                                        >
                                                            <Trash2 size={16}/>
                                                        </Button>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                
                                {filteredResources.length === 0 && (
                                    <Box py={8} textAlign="center">
                                        <Package size={48} className="text-slate-300 mx-auto mb-2"/>
                                        <Typography color="text.secondary">
                                            No resources found. Add your first resource to get started.
                                        </Typography>
                                    </Box>
                                )}
                            </Paper>
                        </Box>
                    )}

                    {/* EQUIPMENT TAB */}
                    {activeTab === 1 && (
                        <Box>
                            <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                                <Typography variant="h6">Equipment & Vehicles Management</Typography>
                                <Button variant="contained" startIcon={<Plus size={16}/>} onClick={handleAddEquipment}>
                                    Add Equipment
                                </Button>
                            </Box>
                            
                            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: 'primary.main' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Plate/ID</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Type</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Status</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Driver</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Location</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold', color: 'white' }}>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {vehicles.map(vehicle => (
                                            <TableRow key={vehicle.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {vehicle.plateNumber}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{vehicle.type}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={vehicle.status}
                                                        size="small"
                                                        color={
                                                            vehicle.status === 'Active' ? 'success' :
                                                            vehicle.status === 'Maintenance' ? 'warning' : 'default'
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{vehicle.driver}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">Site</Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Tooltip title="Edit">
                                                        <Button
                                                            size="small"
                                                            onClick={() => handleEditEquipment(vehicle)}
                                                        >
                                                            <Edit size={16}/>
                                                        </Button>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <Button
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleDeleteEquipment(vehicle.id)}
                                                        >
                                                            <Trash2 size={16}/>
                                                        </Button>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                
                                {vehicles.length === 0 && (
                                    <Box py={8} textAlign="center">
                                        <Truck size={48} className="text-slate-300 mx-auto mb-2"/>
                                        <Typography color="text.secondary">
                                            No equipment found. Add your first equipment to get started.
                                        </Typography>
                                    </Box>
                                )}
                            </Paper>
                        </Box>
                    )}

                    {/* TESTING TAB */}
                    {activeTab === 2 && (
                        <Box>
                            <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                                <Typography variant="h6">Material Testing</Typography>
                                <Button variant="contained" startIcon={<Plus size={16}/>} onClick={handleAddTest}>
                                    Add Test
                                </Button>
                            </Box>
                            
                            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: 'primary.main' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Sample ID</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Test Type</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Location</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Result</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Date</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold', color: 'white' }}>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {labTests.map(test => (
                                            <TableRow key={test.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {test.sampleId}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{test.testName}</Typography>
                                                    <Chip 
                                                        label={test.category} 
                                                        size="small" 
                                                        variant="outlined" 
                                                        sx={{ height: 16, fontSize: 8, fontWeight: 'black', textTransform: 'uppercase', mt: 0.5 }} 
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{test.location}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={test.result.toUpperCase()} 
                                                        size="small" 
                                                        color={test.result === 'Pass' ? 'success' : 'error'} 
                                                        sx={{ fontWeight: '900', fontSize: 10, width: 70 }} 
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{test.date}</Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Tooltip title="Edit">
                                                        <Button 
                                                            size="small" 
                                                            onClick={() => handleEditTest(test)}
                                                        >
                                                            <Edit size={16}/>
                                                        </Button>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <Button 
                                                            size="small" 
                                                            color="error" 
                                                            onClick={() => handleDeleteTest(test.id)}
                                                        >
                                                            <Trash2 size={16}/>
                                                        </Button>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                
                                {labTests.length === 0 && (
                                    <Box py={8} textAlign="center">
                                        <Scale size={48} className="text-slate-300 mx-auto mb-2"/>
                                        <Typography color="text.secondary">
                                            No tests recorded. Add your first test to get started.
                                        </Typography>
                                    </Box>
                                )}
                            </Paper>
                        </Box>
                    )}

                    {/* PROCUREMENT TAB */}
                    {activeTab === 3 && (
                        <Box>
                            <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                                <Typography variant="h6">Procurement Management</Typography>
                                <Button variant="contained" startIcon={<Plus size={16}/>} onClick={handleInitPO}>
                                    Create PO
                                </Button>
                            </Box>
                            
                            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: 'primary.main' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>PO Number</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Vendor</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Date</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Items</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Total Amount</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Status</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold', color: 'white' }}>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {purchaseOrders.map(po => (
                                            <TableRow key={po.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {po.poNumber}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{po.vendor}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{po.date}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{po.items.length} items</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{formatCurrency(po.totalAmount)}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={po.status}
                                                        size="small"
                                                        color={
                                                            po.status === 'Issued' ? 'primary' :
                                                            po.status === 'Received' ? 'success' : 'default'
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Tooltip title="View">
                                                        <Button
                                                            size="small"
                                                            onClick={() => handleViewPO(po)}
                                                        >
                                                            <Edit size={16}/>
                                                        </Button>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <Button
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleDeletePO(po.id)}
                                                        >
                                                            <Trash2 size={16}/>
                                                        </Button>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                
                                {purchaseOrders.length === 0 && (
                                    <Box py={8} textAlign="center">
                                        <ShoppingCart size={48} className="text-slate-300 mx-auto mb-2"/>
                                        <Typography color="text.secondary">
                                            No purchase orders found. Create your first PO to get started.
                                        </Typography>
                                    </Box>
                                )}
                            </Paper>
                        </Box>
                    )}
                </Box>
            </Paper>

            {/* RESOURCE MODAL */}
            <Dialog 
                open={isResourceModalOpen} 
                onClose={() => setIsResourceModalOpen(false)} 
                maxWidth="md" 
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Package className="text-indigo-600" /> 
                    {editingResourceId ? 'Edit Resource' : 'Add New Resource'}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={3} mt={2}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Resource Name"
                                    value={resourceForm.name || ''}
                                    onChange={e => setResourceForm({...resourceForm, name: e.target.value})}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Category"
                                    value={resourceForm.category || ''}
                                    onChange={e => setResourceForm({...resourceForm, category: e.target.value})}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Unit"
                                    value={resourceForm.unit || ''}
                                    onChange={e => setResourceForm({...resourceForm, unit: e.target.value})}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Total Quantity"
                                    type="number"
                                    value={resourceForm.quantity || 0}
                                    onChange={e => setResourceForm({...resourceForm, quantity: Number(e.target.value)})}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Available Quantity"
                                    type="number"
                                    value={resourceForm.availableQuantity ?? resourceForm.quantity ?? 0}
                                    onChange={e => setResourceForm({...resourceForm, availableQuantity: Number(e.target.value)})}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Unit Cost"
                                    type="number"
                                    value={resourceForm.unitCost || 0}
                                    onChange={e => setResourceForm({...resourceForm, unitCost: Number(e.target.value)})}
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
                                    value={resourceForm.reorderLevel || 10}
                                    onChange={e => setResourceForm({...resourceForm, reorderLevel: Number(e.target.value)})}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Location"
                                    value={resourceForm.location || 'Warehouse'}
                                    onChange={e => setResourceForm({...resourceForm, location: e.target.value})}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Description"
                                    multiline
                                    rows={2}
                                    value={resourceForm.description || ''}
                                    onChange={e => setResourceForm({...resourceForm, description: e.target.value})}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Criticality</InputLabel>
                                    <Select
                                        value={resourceForm.criticality || 'Medium'}
                                        label="Criticality"
                                        onChange={e => setResourceForm({...resourceForm, criticality: e.target.value as any})}
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
                    <Button onClick={() => setIsResourceModalOpen(false)} startIcon={<X />}>
                        Cancel
                    </Button>
                    <Button 
                        variant="contained" 
                        startIcon={<Save />} 
                        onClick={handleSaveResource}
                    >
                        {editingResourceId ? 'Update Resource' : 'Add Resource'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* PO MODAL */}
            <Dialog 
                open={isPoModalOpen} 
                onClose={() => setIsPoModalOpen(false)} 
                maxWidth="md" 
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ShoppingCart className="text-indigo-600" /> 
                    New Purchase Order
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={3} mt={2}>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField 
                                    fullWidth 
                                    label="Vendor / Supplier Name" 
                                    value={poForm.vendor} 
                                    onChange={e => setPoForm({...poForm, vendor: e.target.value})} 
                                    size="small" 
                                />
                            </Grid>
                            <Grid item xs={3}>
                                <TextField 
                                    fullWidth 
                                    label="PO Reference" 
                                    value={poForm.poNumber} 
                                    disabled 
                                    size="small" 
                                />
                            </Grid>
                            <Grid item xs={3}>
                                <TextField 
                                    fullWidth 
                                    label="Date" 
                                    type="date" 
                                    value={poForm.date} 
                                    InputLabelProps={{shrink:true}} 
                                    disabled 
                                    size="small" 
                                />
                            </Grid>
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
                                    {poForm.items?.map((item: any, idx: number) => (
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
                                                <IconButton size="small" color="error">
                                                    <Trash2 size={14}/>
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Paper>
                        <Box display="flex" justifyContent="space-between" alignItems="center" bgcolor="slate.900" p={2} borderRadius={2} color="white">
                            <Typography variant="subtitle2" fontWeight="bold">TOTAL PO VALUE</Typography>
                            <Typography variant="h6" fontWeight="bold">
                                ${(poForm.items?.reduce((acc, i: any) => acc + (i.quantity * i.unitPrice), 0) || 0).toLocaleString()}
                            </Typography>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 3, bgcolor: '#f8fafc' }}>
                    <Button onClick={() => setIsPoModalOpen(false)}>Cancel</Button>
                    <Button variant="contained" startIcon={<Save/>} onClick={handleSavePO} disabled={!poForm.vendor}>
                        Issue Purchase Order
                    </Button>
                </DialogActions>
            </Dialog>

            {/* TEST MODAL */}
            <Dialog 
                open={isTestModalOpen} 
                onClose={() => setIsTestModalOpen(false)} 
                maxWidth="sm" 
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Scale className="text-indigo-600" /> 
                    {editingTestId ? 'Edit Test' : 'Add New Test'}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={3} mt={2}>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField 
                                    fullWidth 
                                    label="Test Name" 
                                    value={testForm.testName} 
                                    onChange={e => setTestForm({...testForm, testName: e.target.value})} 
                                    size="small" 
                                    required 
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField 
                                    fullWidth 
                                    label="Category" 
                                    select
                                    value={testForm.category} 
                                    onChange={e => setTestForm({...testForm, category: e.target.value as any})} 
                                    size="small"
                                >
                                    <MenuItem value="Soil">Soil</MenuItem>
                                    <MenuItem value="Aggregate">Aggregate</MenuItem>
                                    <MenuItem value="Concrete">Concrete</MenuItem>
                                    <MenuItem value="Bitumen">Bitumen</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={6}>
                                <TextField 
                                    fullWidth 
                                    label="Sample ID" 
                                    value={testForm.sampleId} 
                                    onChange={e => setTestForm({...testForm, sampleId: e.target.value})} 
                                    size="small" 
                                    required 
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField 
                                    fullWidth 
                                    label="Date" 
                                    type="date" 
                                    value={testForm.date} 
                                    onChange={e => setTestForm({...testForm, date: e.target.value})} 
                                    size="small" 
                                    InputLabelProps={{ shrink: true }} 
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField 
                                    fullWidth 
                                    label="Result" 
                                    select
                                    value={testForm.result} 
                                    onChange={e => setTestForm({...testForm, result: e.target.value as any})} 
                                    size="small"
                                >
                                    <MenuItem value="Pass">Pass</MenuItem>
                                    <MenuItem value="Fail">Fail</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField 
                                    fullWidth 
                                    label="Location" 
                                    value={testForm.location} 
                                    onChange={e => setTestForm({...testForm, location: e.target.value})} 
                                    size="small" 
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField 
                                    fullWidth 
                                    label="Calculated Value" 
                                    value={testForm.calculatedValue} 
                                    onChange={e => setTestForm({...testForm, calculatedValue: e.target.value})} 
                                    size="small" 
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField 
                                    fullWidth 
                                    label="Standard Limit" 
                                    value={testForm.standardLimit} 
                                    onChange={e => setTestForm({...testForm, standardLimit: e.target.value})} 
                                    size="small" 
                                />
                            </Grid>
                        </Grid>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 3, bgcolor: '#f8fafc' }}>
                    <Button onClick={() => setIsTestModalOpen(false)} startIcon={<X />}>
                        Cancel
                    </Button>
                    <Button 
                        variant="contained" 
                        startIcon={<Save />} 
                        onClick={handleSaveTest}
                    >
                        {editingTestId ? 'Update Test' : 'Add Test'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* EQUIPMENT MODAL */}
            <Dialog 
                open={isEquipmentModalOpen} 
                onClose={() => setIsEquipmentModalOpen(false)} 
                maxWidth="sm" 
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Truck className="text-indigo-600" /> 
                    {editingEquipmentId ? 'Edit Equipment' : 'Add New Equipment'}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={3} mt={2}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Plate Number"
                                    value={equipmentForm.plateNumber || ''}
                                    onChange={e => setEquipmentForm({...equipmentForm, plateNumber: e.target.value})}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Equipment Type"
                                    value={equipmentForm.type || ''}
                                    onChange={e => setEquipmentForm({...equipmentForm, type: e.target.value})}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Status</InputLabel>
                                    <Select
                                        value={equipmentForm.status || 'Active'}
                                        label="Status"
                                        onChange={e => setEquipmentForm({...equipmentForm, status: e.target.value as any})}
                                    >
                                        <MenuItem value="Active">Active</MenuItem>
                                        <MenuItem value="Maintenance">Maintenance</MenuItem>
                                        <MenuItem value="Idle">Idle</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Assigned Driver"
                                    value={equipmentForm.driver || ''}
                                    onChange={e => setEquipmentForm({...equipmentForm, driver: e.target.value})}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControl fullWidth>
                                    <InputLabel>Assigned Agency/Contractor</InputLabel>
                                    <Select
                                        value={equipmentForm.agencyId || ''}
                                        label="Assigned Agency/Contractor"
                                        onChange={e => setEquipmentForm({...equipmentForm, agencyId: e.target.value})}
                                    >
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {project.agencies?.filter(a => a.type === 'agency' || a.type === 'subcontractor').map(agency => (
                                            <MenuItem key={agency.id} value={agency.id}>{agency.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 3, bgcolor: '#f8fafc' }}>
                    <Button onClick={() => setIsEquipmentModalOpen(false)} startIcon={<X />}>
                        Cancel
                    </Button>
                    <Button 
                        variant="contained" 
                        startIcon={<Save />} 
                        onClick={handleSaveEquipment}
                    >
                        {editingEquipmentId ? 'Update Equipment' : 'Add Equipment'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default UnifiedResourceManager;
import React, { useState, useMemo } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Badge } from '~/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Separator } from '~/components/ui/separator';
import { Textarea } from '~/components/ui/textarea';
import {
    Package, Truck, Calculator, TrendingUp, AlertTriangle,
    CheckCircle, Plus, Edit, Trash2, Search, Filter, X, Save,
    History, BarChart3, ShoppingCart, Warehouse
} from 'lucide-react';
import { Project, UserRole, Material, Agency } from '../../types';
import { formatCurrency } from '../../utils/formatting/exportUtils';

interface Props {
    project: Project;
    userRole: UserRole;
    onProjectUpdate: (project: Project) => void;
}

const MaterialManagementModule: React.FC<Props> = ({ project, onProjectUpdate, userRole }) => {
    const [activeTab, setActiveTab] = useState("0");
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
        <div className="animate-in fade-in duration-500">
            <div className="flex justify-between mb-6 items-center">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-primary">
                        Material Management
                    </h1>
                    <p className="text-muted-foreground">
                        Unified system for material inventory and supplier rate management
                    </p>
                </div>
                <Button
                    onClick={handleAddMaterial}
                    className="px-4 py-2 font-bold rounded-lg"
                >
                    <Plus size={18} className="mr-2" />
                    Add Material
                </Button>
            </div>

            <Card className="rounded-xl overflow-hidden mb-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="border-b">
                    <TabsList>
                        <TabsTrigger value="0">
                            <Package size={20} className="mr-2" />
                            Materials
                        </TabsTrigger>
                        <TabsTrigger value="1">
                            <Truck size={20} className="mr-2" />
                            Suppliers
                        </TabsTrigger>
                        <TabsTrigger value="2">
                            <BarChart3 size={20} className="mr-2" />
                            Analytics
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="p-6">
                    {/* MATERIALS TAB */}
                    {activeTab === "0" && (
                        <div>
                            <div className="flex justify-between mb-4 items-center">
                                <div className="relative w-96">
                                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Search materials..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                <Button variant="outline">
                                    <Filter size={14} className="mr-2" />
                                    Filter Materials
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                <Card className="border-l-4 border-l-green-500">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                                TOTAL MATERIALS
                                            </span>
                                            <Package size={16} className="text-green-600" />
                                        </div>
                                        <div className="text-2xl font-bold text-green-600">
                                            {materialStats.totalMaterials}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="border-l-4 border-l-yellow-500">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                                LOW STOCK
                                            </span>
                                            <AlertTriangle size={16} className="text-yellow-600" />
                                        </div>
                                        <div className="text-2xl font-bold text-yellow-600">
                                            {materialStats.lowStock}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="border-l-4 border-l-red-500">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                                OUT OF STOCK
                                            </span>
                                            <X size={16} className="text-red-600" />
                                        </div>
                                        <div className="text-2xl font-bold text-red-600">
                                            {materialStats.outOfStock}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="border-l-4 border-l-blue-500">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                                TOTAL VALUE
                                            </span>
                                            <TrendingUp size={16} className="text-blue-600" />
                                        </div>
                                        <div className="text-2xl font-bold text-blue-600">
                                            {formatCurrency(materialStats.totalValue)}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-primary">
                                            <TableHead className="text-primary-foreground font-bold">Material</TableHead>
                                            <TableHead className="text-primary-foreground font-bold">Category</TableHead>
                                            <TableHead className="text-primary-foreground font-bold">Available</TableHead>
                                            <TableHead className="text-primary-foreground font-bold">Unit Cost</TableHead>
                                            <TableHead className="text-primary-foreground font-bold">Total Value</TableHead>
                                            <TableHead className="text-primary-foreground font-bold">Location</TableHead>
                                            <TableHead className="text-primary-foreground font-bold">Status</TableHead>
                                            <TableHead className="text-primary-foreground font-bold text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredMaterials.map(material => (
                                            <TableRow key={material.id} className="hover:bg-muted/50">
                                                <TableCell>
                                                    <div className="font-medium">{material.name}</div>
                                                    {material.description && (
                                                        <div className="text-sm text-muted-foreground">
                                                            {material.description}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {material.category || 'Uncategorized'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div>{material.availableQuantity} {material.unit}</div>
                                                    {material.availableQuantity <= material.reorderLevel && (
                                                        <Badge variant="secondary" className="mt-1">
                                                            Low Stock
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {formatCurrency(material.unitCost || 0)}
                                                </TableCell>
                                                <TableCell>
                                                    {formatCurrency(material.totalValue || 0)}
                                                </TableCell>
                                                <TableCell>
                                                    <div>{material.location}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={
                                                        material.status === 'Available' ? 'default' :
                                                        material.status === 'Low Stock' ? 'secondary' : 'destructive'
                                                    }>
                                                        {material.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex gap-1 justify-end">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => handleAddRate(material.id)}
                                                                    >
                                                                        <Calculator size={16} />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Manage Rates</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => handleEditMaterial(material)}
                                                                    >
                                                                        <Edit size={16} />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Edit</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => handleDeleteMaterial(material.id)}
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Delete</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                {filteredMaterials.length === 0 && (
                                    <div className="py-16 text-center">
                                        <Package size={48} className="text-muted-foreground mx-auto mb-4" />
                                        <p className="text-muted-foreground">
                                            No materials found. Add your first material to get started.
                                        </p>
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}

                    {/* SUPPLIERS TAB */}
                    {activeTab === "1" && (
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Supplier Rate Management</h3>
                            <p className="text-muted-foreground">
                                Manage supplier rates for materials in the Materials tab.
                            </p>
                        </div>
                    )}

                    {/* ANALYTICS TAB */}
                    {activeTab === "2" && (
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Material Analytics</h3>
                            <p className="text-muted-foreground">
                                Analytics dashboard coming soon.
                            </p>
                        </div>
                    )}
                </div>
            </Card>

            {/* MATERIAL MODAL */}
            <Dialog open={isMaterialModalOpen} onOpenChange={setIsMaterialModalOpen}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="text-primary" size={20} />
                        {editingMaterialId ? 'Edit Material' : 'Add New Material'}
                    </DialogTitle>
                </DialogHeader>
                <DialogContent className="max-h-[80vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="material-name">Material Name *</Label>
                            <Input
                                id="material-name"
                                value={materialForm.name || ''}
                                onChange={(e) => setMaterialForm({...materialForm, name: e.target.value})}
                                placeholder="Enter material name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="material-category">Category</Label>
                            <Input
                                id="material-category"
                                value={materialForm.category || ''}
                                onChange={(e) => setMaterialForm({...materialForm, category: e.target.value})}
                                placeholder="Enter category"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="material-unit">Unit *</Label>
                            <Input
                                id="material-unit"
                                value={materialForm.unit || ''}
                                onChange={(e) => setMaterialForm({...materialForm, unit: e.target.value})}
                                placeholder="e.g., kg, m, pieces"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="material-quantity">Quantity</Label>
                            <Input
                                id="material-quantity"
                                type="number"
                                value={materialForm.quantity || 0}
                                onChange={(e) => setMaterialForm({...materialForm, quantity: Number(e.target.value)})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="material-available">Available Quantity</Label>
                            <Input
                                id="material-available"
                                type="number"
                                value={materialForm.availableQuantity ?? materialForm.quantity ?? 0}
                                onChange={(e) => setMaterialForm({...materialForm, availableQuantity: Number(e.target.value)})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="material-cost">Unit Cost</Label>
                            <Input
                                id="material-cost"
                                type="number"
                                value={materialForm.unitCost || 0}
                                onChange={(e) => setMaterialForm({...materialForm, unitCost: Number(e.target.value)})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="material-reorder">Reorder Level</Label>
                            <Input
                                id="material-reorder"
                                type="number"
                                value={materialForm.reorderLevel || 10}
                                onChange={(e) => setMaterialForm({...materialForm, reorderLevel: Number(e.target.value)})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="material-location">Location</Label>
                            <Input
                                id="material-location"
                                value={materialForm.location || 'Warehouse'}
                                onChange={(e) => setMaterialForm({...materialForm, location: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="material-description">Description</Label>
                            <Textarea
                                id="material-description"
                                value={materialForm.description || ''}
                                onChange={(e) => setMaterialForm({...materialForm, description: e.target.value})}
                                placeholder="Enter material description"
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="material-criticality">Criticality</Label>
                            <Select
                                value={materialForm.criticality || 'Medium'}
                                onValueChange={(value) => setMaterialForm({...materialForm, criticality: value as any})}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select criticality" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="High">High</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="Low">Low</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </DialogContent>
                <DialogFooter className="bg-muted/50">
                    <Button variant="outline" onClick={() => setIsMaterialModalOpen(false)}>
                        <X size={16} className="mr-2" />
                        Cancel
                    </Button>
                    <Button onClick={handleSaveMaterial}>
                        <Save size={16} className="mr-2" />
                        {editingMaterialId ? 'Update Material' : 'Add Material'}
                    </Button>
                </DialogFooter>
            </Dialog>

            {/* RATE MODAL */}
            <Dialog open={isRateModalOpen} onOpenChange={setIsRateModalOpen}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calculator className="text-primary" size={20} />
                        Manage Supplier Rates
                    </DialogTitle>
                </DialogHeader>
                <DialogContent>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="supplier-select">Select Supplier *</Label>
                            <Select
                                value={rateForm.supplierId}
                                onValueChange={(value) => setRateForm({...rateForm, supplierId: value})}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a supplier" />
                                </SelectTrigger>
                                <SelectContent>
                                    {agencies.map(agency => (
                                        <SelectItem key={agency.id} value={agency.id}>
                                            {agency.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rate-amount">Rate *</Label>
                            <Input
                                id="rate-amount"
                                type="number"
                                value={rateForm.rate}
                                onChange={(e) => setRateForm({...rateForm, rate: Number(e.target.value)})}
                                placeholder="Enter rate"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rate-date">Effective Date</Label>
                            <Input
                                id="rate-date"
                                type="date"
                                value={rateForm.effectiveDate}
                                onChange={(e) => setRateForm({...rateForm, effectiveDate: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rate-description">Description</Label>
                            <Textarea
                                id="rate-description"
                                value={rateForm.description}
                                onChange={(e) => setRateForm({...rateForm, description: e.target.value})}
                                placeholder="Enter description"
                                rows={3}
                            />
                        </div>
                    </div>
                </DialogContent>
                <DialogFooter className="bg-muted/50">
                    <Button variant="outline" onClick={() => setIsRateModalOpen(false)}>
                        <X size={16} className="mr-2" />
                        Cancel
                    </Button>
                    <Button onClick={handleSaveRate}>
                        <Save size={16} className="mr-2" />
                        Save Rate
                    </Button>
                </DialogFooter>
            </Dialog>
        </div>
    );
};

export default MaterialManagementModule;

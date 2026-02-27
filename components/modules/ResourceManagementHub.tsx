import React, { useState, useMemo } from 'react';
import { Project, UserRole, InventoryItem, PurchaseOrder, Material } from '../../types';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Badge } from '~/components/ui/badge';
import {
    Package, CheckCircle2, Plus, ShoppingCart, FileText, Trash2, Edit, Warehouse, Search
} from 'lucide-react';

interface Props {
  project: Project;
  userRole: UserRole;
  onProjectUpdate: (project: Project) => void;
}

const ResourceManagementHub: React.FC<Props> = ({ project, onProjectUpdate, userRole }) => {
  const [activeTab, setActiveTab] = useState("0");

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



  // === DATA SOURCES ===
  const inventory = project.inventory || [];
  const materials = project.materials || [];
  const purchaseOrders = project.purchaseOrders || [];

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



  const getStatusColor = (quantity: number, reorderLevel: number) => {
    if (quantity <= reorderLevel) return 'destructive';
    if (quantity <= reorderLevel * 1.5) return 'secondary';
    return 'default';
  };

  return (
    <div className="h-[calc(100vh-140px)] overflow-y-auto p-2">
      <div className="flex justify-between mb-6 items-center">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Resource Management Hub</h2>
          <p className="text-sm text-muted-foreground">
            Unified inventory, materials, assets, and procurement management
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleAddInventoryItem}
          >
            <Package size={16} className="mr-2" />
            Add Inventory
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsPoModalOpen(true)}
          >
            <ShoppingCart size={16} className="mr-2" />
            New PO
          </Button>
          <Button
            onClick={handleAddMaterial}
          >
            <Plus size={16} className="mr-2" />
            Add Material
          </Button>
        </div>
      </div>

      <Card className="rounded-xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="border-b">
          <TabsList>
            <TabsTrigger value="0">
              <Warehouse size={16} className="mr-2" />
              Inventory ({inventory.length})
            </TabsTrigger>
            <TabsTrigger value="1">
              <Package size={16} className="mr-2" />
              Materials ({materials.length})
            </TabsTrigger>
            <TabsTrigger value="2">
              <FileText size={16} className="mr-2" />
              Purchase Orders ({purchaseOrders.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="p-6">
          {/* Inventory Tab */}
          {activeTab === "0" && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {inventoryStats.critical.length}
                    </div>
                    <p className="text-sm text-muted-foreground">Critical Stock</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {inventoryStats.warning.length}
                    </div>
                    <p className="text-sm text-muted-foreground">Low Stock</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {inventoryStats.healthy}
                    </div>
                    <p className="text-sm text-muted-foreground">Healthy Stock</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      ₹{inventoryStats.totalValue.toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Reorder Level</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.itemName || item.name}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>{item.reorderLevel}</TableCell>
                        <TableCell>{item.location}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(item.quantity, item.reorderLevel)}>
                            {item.quantity <= item.reorderLevel ? 'Critical' :
                             item.quantity <= item.reorderLevel * 1.5 ? 'Low' : 'Healthy'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
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
                              <Edit size={16} className="mr-1" />
                              Edit
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 size={16} className="mr-1" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* Materials Tab */}
          {activeTab === "1" && (
            <div>
              <div className="mb-4">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search materials..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {materialStats.totalMaterials}
                    </div>
                    <p className="text-sm text-muted-foreground">Total Materials</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {materialStats.lowStock}
                    </div>
                    <p className="text-sm text-muted-foreground">Low Stock</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {materialStats.outOfStock}
                    </div>
                    <p className="text-sm text-muted-foreground">Out of Stock</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      ₹{materialStats.totalValue.toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMaterials.map(material => (
                      <TableRow key={material.id}>
                        <TableCell className="font-medium">
                          {material.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{material.category}</Badge>
                        </TableCell>
                        <TableCell>{material.availableQuantity} {material.unit}</TableCell>
                        <TableCell>₹{material.unitCost?.toLocaleString()}</TableCell>
                        <TableCell>{material.location}</TableCell>
                        <TableCell>
                          <Badge variant={material.status === 'Available' ? 'default' : 'secondary'}>
                            {material.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setMaterialForm(material);
                              setEditingMaterialId(material.id);
                              setIsMaterialModalOpen(true);
                            }}
                          >
                            <Edit size={16} className="mr-1" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* Purchase Orders Tab */}
          {activeTab === "2" && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Purchase Orders</h3>
              <Card className="p-6">
                <p className="text-center text-muted-foreground">
                  Purchase Order management interface would be implemented here
                </p>
              </Card>
            </div>
          )}


        </div>
      </Card>
    </div>
  );
};

export default ResourceManagementHub;

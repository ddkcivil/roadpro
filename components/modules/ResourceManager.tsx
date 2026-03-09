
import React, { useState, useMemo } from 'react';
import { Project, InventoryItem, PurchaseOrder, POItem } from '../../types';
import { checkForDuplicates } from '../../utils/data/autofillUtils';
import { 
    Package, AlertTriangle, CheckCircle2, TrendingDown,
    ShoppingCart, History, Filter,
    FileText, Truck,
    Trash2, Save, X, Printer, Edit
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { toast } from 'sonner';
import { Badge } from '~/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';

interface Props {
  project: Project;
  onProjectUpdate: (project: Project) => void;
}

const ResourceManager: React.FC<Props> = ({ project, onProjectUpdate }) => {
  const [activeTab, setActiveTab] = useState('inventory');
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
      toast.error('Item name is required');
      return;
    }
    
    if (typeof inventoryForm.quantity !== 'number' || inventoryForm.quantity < 0) {
      toast.error('Quantity must be a non-negative number');
      return;
    }
    
    if (typeof inventoryForm.reorderLevel !== 'number' || inventoryForm.reorderLevel < 0) {
      toast.error('Reorder level must be a non-negative number');
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
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between mb-2 items-center">
          <div>
              <h1 className="text-2xl font-bold">Resource & Material Matrix</h1>
              <p className="text-muted-foreground">Site inventory management and automated reorder alerts</p>
          </div>
          <div className="flex space-x-2">
              <Button variant="outline"><History className="mr-2 h-4 w-4" />Stock Ledger</Button>
              <Button onClick={handleAddInventoryItem}><Package className="mr-2 h-4 w-4" />Add Inventory Item</Button>
              <Button onClick={handleInitPO}><ShoppingCart className="mr-2 h-4 w-4" />Draft Purchase Order</Button>
          </div>
      </div>

      <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                  <TabsTrigger value="inventory"><Package className="mr-2 h-4 w-4" />Stock Inventory</TabsTrigger>
                  <TabsTrigger value="po"><FileText className="mr-2 h-4 w-4" />Purchase Orders</TabsTrigger>
                  <TabsTrigger value="trends"><TrendingDown className="mr-2 h-4 w-4" />Consumption Trends</TabsTrigger>
              </TabsList>

              <TabsContent value="inventory" className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1 space-y-4">
                        <Card className={stats.critical.length > 0 ? 'border-red-500' : ''}>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>CRITICAL</CardTitle>
                                    <AlertTriangle className="h-5 w-5 text-red-500"/>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold">{stats.critical.length}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>WARNING</CardTitle>
                                    <TrendingDown className="h-5 w-5 text-yellow-500"/>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold">{stats.warning.length}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>HEALTHY</CardTitle>
                                    <CheckCircle2 className="h-5 w-5 text-green-500"/>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold">{stats.healthy}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="md:col-span-2">
                        <Card>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item Name</TableHead>
                                            <TableHead className="text-right">Stock Level</TableHead>
                                            <TableHead className="text-right">Threshold</TableHead>
                                            <TableHead className="text-right">Location</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {inventory.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <p className="font-bold">{item.itemName}</p>
                                                    <p className="text-muted-foreground">{item.location}</p>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <p className={`font-bold ${item.quantity <= item.reorderLevel ? 'text-red-500' : ''}`}>
                                                        {item.quantity} {item.unit}
                                                    </p>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant="outline">{item.reorderLevel}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">{item.location}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEditInventoryItem(item)}>
                                                      <Edit className="h-4 w-4"/>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteInventoryItem(item.id)}>
                                                      <Trash2 className="h-4 w-4"/>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
              </TabsContent>

              <TabsContent value="po" className="p-4">
                  <div>
                      <div className="flex justify-between mb-4 items-center">
                          <h2 className="text-lg font-semibold">Procurement Ledger</h2>
                          <Button variant="outline" size="sm"><Filter className="mr-2 h-4 w-4"/>Filter Status</Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {pos.map(po => (
                              <Card key={po.id} className="cursor-pointer hover:border-primary" onClick={() => { setSelectedPoId(po.id); setIsPoDetailOpen(true); }}>
                                  <CardContent className="p-4">
                                      <div className="flex justify-between mb-2">
                                          <div>
                                              <p className="text-sm font-bold text-primary">{po.poNumber}</p>
                                              <p className="font-semibold">{po.vendor}</p>
                                          </div>
                                          <Badge variant={po.status === 'Received' ? 'default' : 'secondary'}>{po.status.toUpperCase()}</Badge>
                                      </div>
                                      <div className="border-t pt-2 flex justify-between items-center">
                                          <p className="text-sm text-muted-foreground">{po.date} • {po.items.length} items</p>
                                          <p className="font-bold">${po.totalAmount.toLocaleString()}</p>
                                      </div>
                                  </CardContent>
                              </Card>
                          ))}
                          {pos.length === 0 && (
                              <div className="col-span-2 py-16 text-center border-dashed border-2 rounded-lg">
                                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                                  <h3 className="mt-2 text-sm font-medium text-gray-900">No purchase orders</h3>
                                  <p className="mt-1 text-sm text-gray-500">Get started by creating a new purchase order.</p>
                              </div>
                          )}
                      </div>
                  </div>
              </TabsContent>
          </Tabs>
      </Card>

      {/* Inventory Item Modal */}
      <Dialog open={isInventoryModalOpen} onOpenChange={setIsInventoryModalOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle className="flex items-center"><Package className="mr-2 h-5 w-5" /> {editingItemId ? 'Edit Inventory Item' : 'Add New Inventory Item'}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="item-name" className="text-right">Item Name</Label>
                    <Input id="item-name" value={inventoryForm.itemName || ''} onChange={e => setInventoryForm({...inventoryForm, itemName: e.target.value})} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="quantity" className="text-right">Quantity</Label>
                    <Input id="quantity" type="number" value={inventoryForm.quantity} onChange={e => setInventoryForm({...inventoryForm, quantity: Number(e.target.value)})} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="unit" className="text-right">Unit</Label>
                    <Input id="unit" value={inventoryForm.unit || ''} onChange={e => setInventoryForm({...inventoryForm, unit: e.target.value})} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reorder-level" className="text-right">Reorder Level</Label>
                    <Input id="reorder-level" type="number" value={inventoryForm.reorderLevel} onChange={e => setInventoryForm({...inventoryForm, reorderLevel: Number(e.target.value)})} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="location" className="text-right">Location</Label>
                    <Input id="location" value={inventoryForm.location || ''} onChange={e => setInventoryForm({...inventoryForm, location: e.target.value})} className="col-span-3" />
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsInventoryModalOpen(false)}><X className="mr-2 h-4 w-4" />Cancel</Button>
                  <Button onClick={handleSaveInventoryItem}><Save className="mr-2 h-4 w-4" />{editingItemId ? 'Update Item' : 'Add Item'}</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={isPoModalOpen} onOpenChange={setIsPoModalOpen}>
          <DialogContent className="max-w-3xl">
              <DialogHeader>
                  <DialogTitle className="flex items-center"><ShoppingCart className="mr-2 h-5 w-5" /> New Purchase Order (PO)</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-3 gap-4">
                      <Input placeholder="Vendor / Supplier Name" value={poForm.vendor} onChange={e => setPoForm({...poForm, vendor: e.target.value})} />
                      <Input value={poForm.poNumber} disabled />
                      <Input type="date" value={poForm.date} disabled />
                  </div>

                  <h3 className="text-sm font-semibold mt-4">ORDER ITEMS</h3>
                  <Card>
                      <CardContent>
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead>Item Name</TableHead>
                                      <TableHead className="text-right">Quantity</TableHead>
                                      <TableHead className="text-right">Est. Rate</TableHead>
                                      <TableHead className="text-right">Total</TableHead>
                                      <TableHead className="text-right"></TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {poForm.items?.map((item, idx) => (
                                      <TableRow key={idx}>
                                          <TableCell>{item.itemName}</TableCell>
                                          <TableCell className="text-right">
                                              <Input 
                                                type="number" value={item.quantity} 
                                                onChange={e => {
                                                    const next = [...(poForm.items || [])];
                                                    next[idx].quantity = Number(e.target.value);
                                                    setPoForm({...poForm, items: next});
                                                }}
                                                className="w-20"
                                              />
                                          </TableCell>
                                          <TableCell className="text-right">
                                              <Input 
                                                type="number" value={item.unitPrice} 
                                                onChange={e => {
                                                    const next = [...(poForm.items || [])];
                                                    next[idx].unitPrice = Number(e.target.value);
                                                    setPoForm({...poForm, items: next});
                                                }}
                                                className="w-24"
                                              />
                                          </TableCell>
                                          <TableCell className="text-right font-bold">${(item.quantity * item.unitPrice).toLocaleString()}</TableCell>
                                          <TableCell className="text-right">
                                              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4"/></Button>
                                          </TableCell>
                                      </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                      </CardContent>
                  </Card>
                  <div className="flex justify-between items-center bg-gray-900 text-white p-4 rounded-lg">
                      <h3 className="font-semibold">TOTAL PO VALUE</h3>
                      <p className="text-2xl font-bold">
                        ${(poForm.items?.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0) || 0).toLocaleString()}
                      </p>
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsPoModalOpen(false)}>Cancel</Button>
                  <Button onClick={handleSavePO} disabled={!poForm.vendor}><Save className="mr-2 h-4 w-4"/>Issue Purchase Order</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={isPoDetailOpen} onOpenChange={setIsPoDetailOpen}>
          {viewingPo && (
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle className="flex justify-between items-center">
                          <div>
                              <h2 className="text-lg font-bold">{viewingPo.poNumber}</h2>
                              <p className="text-muted-foreground">{viewingPo.vendor}</p>
                          </div>
                          <Badge variant={viewingPo.status === 'Received' ? 'default' : 'secondary'}>{viewingPo.status}</Badge>
                      </DialogTitle>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                      <div className="space-y-2">
                          {viewingPo.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center border-b pb-2">
                                  <div>
                                      <p className="font-semibold">{item.itemName}</p>
                                      <p className="text-sm text-muted-foreground">{`${item.quantity} units @ $${item.unitPrice}`}</p>
                                  </div>
                                  <p className="font-bold">${(item.quantity * item.unitPrice).toLocaleString()}</p>
                              </div>
                          ))}
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                          <p>Order Total:</p>
                          <p className="text-primary">${viewingPo.totalAmount.toLocaleString()}</p>
                      </div>
                      {viewingPo.status === 'Issued' && (
                          <Alert>
                              <Truck className="h-4 w-4" />
                              <AlertTitle>In Transit</AlertTitle>
                              <AlertDescription>
                                  This order is currently in transit. Verify delivery on site before receiving.
                              </AlertDescription>
                          </Alert>
                      )}
                  </div>
                  <DialogFooter>
                      <Button variant="outline"><Printer className="mr-2 h-4 w-4" />Print PO</Button>
                      <div className="flex-grow" />
                      <Button variant="outline" onClick={() => setIsPoDetailOpen(false)}>Close</Button>
                      {viewingPo.status === 'Issued' && (
                          <Button onClick={() => handleReceivePO(viewingPo.id)}><CheckCircle2 className="mr-2 h-4 w-4"/>Confirm Receipt</Button>
                      )}
                  </DialogFooter>
              </DialogContent>
          )}
      </Dialog>
    </div>
  );
};

export default ResourceManager;

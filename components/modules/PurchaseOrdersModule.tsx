import React, { useState, useMemo } from 'react';
import { Project, PurchaseOrder, POItem } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Badge } from '~/components/ui/badge';
import { Package, Plus, Trash2, Edit2, FileText, ShoppingCart, Filter, X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { generateUniqueId } from '../../utils/uuidUtils';
import { toast } from 'sonner';

interface PurchaseOrdersModuleProps {
  project: Project;
  userRole: any;
  onProjectUpdate: (project: Project) => void;
}

const PurchaseOrdersModule: React.FC<PurchaseOrdersModuleProps> = ({ project, userRole, onProjectUpdate }) => {
  const purchaseOrders = project.purchaseOrders || [];
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  
  const [newPO, setNewPO] = useState({
    poNumber: '',
    vendor: '',
    date: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    description: '',
    totalAmount: 0,
    items: [] as POItem[]
  });
  
  const [newItem, setNewItem] = useState({
    itemId: '',
    itemName: '',
    quantity: 0,
    unitPrice: 0
  });

  const filteredPOs = useMemo(() => {
    if (filterStatus === 'all') return purchaseOrders;
    return purchaseOrders.filter(po => po.status.toLowerCase() === filterStatus.toLowerCase());
  }, [purchaseOrders, filterStatus]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Draft':
        return <Badge variant="outline" className="text-slate-600 border-slate-400">Draft</Badge>;
      case 'Issued':
        return <Badge variant="secondary" className="bg-blue-500 text-white">Issued</Badge>;
      case 'Received':
        return <Badge variant="secondary" className="bg-amber-500 text-white">Received</Badge>;
      case 'Completed':
        return <Badge variant="default" className="bg-emerald-500">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const resetNewPO = () => {
    setNewPO({
      poNumber: '',
      vendor: '',
      date: new Date().toISOString().split('T')[0],
      deliveryDate: '',
      description: '',
      totalAmount: 0,
      items: []
    });
    setNewItem({ itemId: '', itemName: '', quantity: 0, unitPrice: 0 });
  };

  const handleCreatePO = () => {
    if (!newPO.poNumber || !newPO.vendor) {
      toast.error("PO Number and Vendor are required");
      return;
    }
    
    if (newPO.items.length === 0) {
      toast.error("Add at least one item to the purchase order");
      return;
    }

    const po: PurchaseOrder = {
      id: generateUniqueId(),
      poNumber: newPO.poNumber,
      vendor: newPO.vendor,
      date: newPO.date,
      deliveryDate: newPO.deliveryDate || undefined,
      items: newPO.items,
      totalAmount: newPO.totalAmount,
      status: 'Draft',
      description: newPO.description || undefined
    };

    onProjectUpdate({
      ...project,
      purchaseOrders: [...purchaseOrders, po]
    });

    resetNewPO();
    setIsCreateOpen(false);
    toast.success("Purchase Order Created Successfully");
  };

  const handleUpdatePO = () => {
    if (!selectedPO) return;
    
    const updatedPOs = purchaseOrders.map(po => 
      po.id === selectedPO.id ? selectedPO : po
    );

    onProjectUpdate({
      ...project,
      purchaseOrders: updatedPOs
    });

    setIsEditOpen(false);
    setSelectedPO(null);
    resetNewPO();
    toast.success("Purchase Order Updated");
  };

  const handleDeletePO = (poId: string) => {
    if (!confirm('Are you sure you want to delete this Purchase Order?')) return;
    
    const updatedPOs = purchaseOrders.filter(po => po.id !== poId);
    onProjectUpdate({
      ...project,
      purchaseOrders: updatedPOs
    });
    toast.success("Purchase Order Deleted");
  };

  const handleStatusChange = (po: PurchaseOrder, newStatus: string) => {
    const updatedPO = { ...po, status: newStatus as PurchaseOrder['status'] };
    const updatedPOs = purchaseOrders.map(p => 
      p.id === po.id ? updatedPO : p
    );
    onProjectUpdate({
      ...project,
      purchaseOrders: updatedPOs
    });
    toast.success(`Status updated to ${newStatus}`);
  };

  const addItemToPO = () => {
    if (!newItem.itemName || newItem.quantity <= 0 || newItem.unitPrice <= 0) {
      toast.error("Fill all item fields correctly");
      return;
    }

    const item: POItem = {
      itemId: newItem.itemId || generateUniqueId(),
      itemName: newItem.itemName,
      quantity: newItem.quantity,
      unitPrice: newItem.unitPrice
    };

    const updatedItems = [...newPO.items, item];
    const newTotal = updatedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    
    setNewPO({
      ...newPO,
      items: updatedItems,
      totalAmount: newTotal
    });
    
    setNewItem({ itemId: '', itemName: '', quantity: 0, unitPrice: 0 });
  };

  const removeItemFromPO = (itemId: string) => {
    const updatedItems = newPO.items.filter(item => item.itemId !== itemId);
    const newTotal = updatedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    setNewPO({
      ...newPO,
      items: updatedItems,
      totalAmount: newTotal
    });
  };

  const openEditDialog = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setNewPO({
      poNumber: po.poNumber,
      vendor: po.vendor,
      date: po.date,
      deliveryDate: po.deliveryDate || '',
      description: po.description || '',
      totalAmount: po.totalAmount,
      items: po.items
    });
    setIsEditOpen(true);
  };

  const openViewDialog = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setIsViewOpen(true);
  };

  const getTotalPOAmount = () => {
    return purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0);
  };

  return (
    <div className="p-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">Purchase Orders</h1>
          <p className="text-muted-foreground">Project: {project?.name}</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl font-black uppercase tracking-widest text-[10px]">
              <Plus className="mr-2 h-4 w-4" /> New Purchase Order
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase">Create Purchase Order</DialogTitle>
              <DialogDescription>Fill in the details to create a new purchase order</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>PO Number *</Label>
                  <Input 
                    value={newPO.poNumber} 
                    onChange={e => setNewPO({...newPO, poNumber: e.target.value})}
                    placeholder="e.g. PO-2024-001"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Vendor *</Label>
                  <Input 
                    value={newPO.vendor} 
                    onChange={e => setNewPO({...newPO, vendor: e.target.value})}
                    placeholder="Vendor/Agency name"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Order Date *</Label>
                  <Input 
                    type="date"
                    value={newPO.date} 
                    onChange={e => setNewPO({...newPO, date: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Expected Delivery Date</Label>
                  <Input 
                    type="date"
                    value={newPO.deliveryDate} 
                    onChange={e => setNewPO({...newPO, deliveryDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea 
                  value={newPO.description}
                  onChange={e => setNewPO({...newPO, description: e.target.value})}
                  placeholder="Optional description or notes"
                  rows={2}
                />
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-base font-bold">PO Items</Label>
                  <span className="text-sm text-muted-foreground">
                    Total: NPR {newPO.totalAmount.toLocaleString()}
                  </span>
                </div>
                
                <div className="border rounded-xl p-4 bg-muted/20 space-y-3">
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-4">
                      <Input 
                        placeholder="Item name"
                        value={newItem.itemName}
                        onChange={e => setNewItem({...newItem, itemName: e.target.value})}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input 
                        type="number"
                        placeholder="Qty"
                        value={newItem.quantity || ''}
                        onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input 
                        type="number"
                        placeholder="Unit Price"
                        value={newItem.unitPrice || ''}
                        onChange={e => setNewItem({...newItem, unitPrice: Number(e.target.value)})}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input 
                        disabled
                        value={newItem.quantity * newItem.unitPrice || 0}
                        className="bg-muted"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button 
                        type="button"
                        size="sm"
                        onClick={addItemToPO}
                        className="w-full"
                      >
                        <Plus size={14} />
                      </Button>
                    </div>
                  </div>
                </div>

                {newPO.items.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {newPO.items.map((item, idx) => (
                      <div key={item.itemId} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                        <div className="flex-1">
                          <span className="font-bold text-sm">{item.itemName}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {item.quantity} x NPR {item.unitPrice.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm">
                            NPR {(item.quantity * item.unitPrice).toLocaleString()}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => removeItemFromPO(item.itemId)}
                            className="h-6 w-6 text-rose-600"
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreatePO} className="font-black">Create Purchase Order</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Total POs</p>
                <p className="text-2xl font-black">{purchaseOrders.length}</p>
              </div>
              <FileText className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Draft</p>
                <p className="text-2xl font-black text-slate-600">
                  {purchaseOrders.filter(po => po.status === 'Draft').length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-slate-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Issued</p>
                <p className="text-2xl font-black text-blue-600">
                  {purchaseOrders.filter(po => po.status === 'Issued').length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Total Value</p>
                <p className="text-2xl font-black text-emerald-600">
                  NPR {getTotalPOAmount().toLocaleString()}
                </p>
              </div>
              <Package className="h-8 w-8 text-emerald-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-none shadow-xl glass">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-black uppercase tracking-widest opacity-70">
            Purchase Order Registry
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] h-9 rounded-xl">
                <Filter size={14} className="mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="issued">Issued</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>PO Number</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPOs.length > 0 ? (
                filteredPOs.map((po) => (
                  <TableRow key={po.id} className="hover:bg-muted/20">
                    <TableCell className="font-bold font-mono">{po.poNumber}</TableCell>
                    <TableCell>{po.vendor}</TableCell>
                    <TableCell>{po.date}</TableCell>
                    <TableCell>{po.deliveryDate || '-'}</TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      NPR {po.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(po.status)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => openViewDialog(po)}
                          className="h-8 w-8"
                        >
                          <FileText size={14} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => openEditDialog(po)}
                          className="h-8 w-8 text-amber-600"
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Select 
                          value={po.status} 
                          onValueChange={(value) => handleStatusChange(po, value)}
                        >
                          <SelectTrigger className="h-8 w-[100px] text-[10px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Draft">Draft</SelectItem>
                            <SelectItem value="Issued">Issued</SelectItem>
                            <SelectItem value="Received">Received</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeletePO(po.id)}
                          className="h-8 w-8 text-rose-600"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <ShoppingCart className="mx-auto mb-2 opacity-50" size={32} />
                    No purchase orders found. Create one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View PO Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="rounded-3xl max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase">Purchase Order Details</DialogTitle>
            <DialogDescription>View complete purchase order information</DialogDescription>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">PO Number</p>
                  <p className="font-mono font-bold">{selectedPO.poNumber}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Status</p>
                  {getStatusBadge(selectedPO.status)}
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Vendor</p>
                  <p className="font-bold">{selectedPO.vendor}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Order Date</p>
                  <p>{selectedPO.date}</p>
                </div>
                {selectedPO.deliveryDate && (
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase">Delivery Date</p>
                    <p>{selectedPO.deliveryDate}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Total Amount</p>
                  <p className="text-xl font-black text-emerald-600">
                    NPR {selectedPO.totalAmount.toLocaleString()}
                  </p>
                </div>
              </div>
              
              {selectedPO.description && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Description</p>
                  <p className="text-sm">{selectedPO.description}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-3">Items</p>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPO.items.map((item) => (
                      <TableRow key={item.itemId}>
                        <TableCell className="font-bold">{item.itemName}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right font-mono">
                          NPR {item.unitPrice.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          NPR {(item.quantity * item.unitPrice).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit PO Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="rounded-3xl max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase">Edit Purchase Order</DialogTitle>
            <DialogDescription>Update purchase order details and items</DialogDescription>
          </DialogHeader>
          {selectedPO && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>PO Number</Label>
                  <Input 
                    value={newPO.poNumber} 
                    onChange={e => setNewPO({...newPO, poNumber: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Vendor</Label>
                  <Input 
                    value={newPO.vendor} 
                    onChange={e => setNewPO({...newPO, vendor: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Order Date</Label>
                  <Input 
                    type="date"
                    value={newPO.date} 
                    onChange={e => setNewPO({...newPO, date: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Delivery Date</Label>
                  <Input 
                    type="date"
                    value={newPO.deliveryDate} 
                    onChange={e => setNewPO({...newPO, deliveryDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea 
                  value={newPO.description}
                  onChange={e => setNewPO({...newPO, description: e.target.value})}
                  rows={2}
                />
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-base font-bold">PO Items</Label>
                  <span className="text-sm font-bold">
                    Total: NPR {newPO.totalAmount.toLocaleString()}
                  </span>
                </div>
                
                <div className="border rounded-xl p-4 bg-muted/20 space-y-3">
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-4">
                      <Input 
                        placeholder="Item name"
                        value={newItem.itemName}
                        onChange={e => setNewItem({...newItem, itemName: e.target.value})}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input 
                        type="number"
                        placeholder="Qty"
                        value={newItem.quantity || ''}
                        onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input 
                        type="number"
                        placeholder="Unit Price"
                        value={newItem.unitPrice || ''}
                        onChange={e => setNewItem({...newItem, unitPrice: Number(e.target.value)})}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input 
                        disabled
                        value={newItem.quantity * newItem.unitPrice || 0}
                        className="bg-muted"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button 
                        type="button"
                        size="sm"
                        onClick={addItemToPO}
                        className="w-full"
                      >
                        <Plus size={14} />
                      </Button>
                    </div>
                  </div>
                </div>

                {newPO.items.length > 0 && (
                  <div className="mt-3 space-y-2 max-h-[200px] overflow-y-auto">
                    {newPO.items.map((item) => (
                      <div key={item.itemId} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                        <div className="flex-1">
                          <span className="font-bold text-sm">{item.itemName}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {item.quantity} x NPR {item.unitPrice.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm">
                            NPR {(item.quantity * item.unitPrice).toLocaleString()}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => removeItemFromPO(item.itemId)}
                            className="h-6 w-6 text-rose-600"
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdatePO} className="font-black">Update Purchase Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseOrdersModule;
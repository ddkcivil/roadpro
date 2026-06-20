import React, { useState, useMemo } from 'react';
import { Project, Material, PurchaseOrder } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Badge } from '~/components/ui/badge';
import { Package, FileText, ShoppingCart, BarChart3, Plus, AlertTriangle, History, Download, Loader2, Check } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Button } from '~/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';

const CATEGORIES = [
  'Cement',
  'Aggregate',
  'Steel',
  'Sand',
  'Bricks',
  'Concrete',
  'Timber',
  'Bitumen',
  'Electrical',
  'Plumbing',
  'Finishing',
  'Other'
];
import { Label } from '~/components/ui/label';
import { generateUniqueId } from '../../utils/uuidUtils';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, Legend
} from 'recharts';

interface MaterialManagementModuleProps {
  project: Project;
  userRole: any;
  onProjectUpdate: (project: Project) => void;
}

import { isDuplicate } from '~/lib/utils';

const MaterialManagementModule: React.FC<MaterialManagementModuleProps> = ({ project, userRole, onProjectUpdate }) => {
  const materials = project.materials || [];
  const purchaseOrders = project.purchaseOrders || [];

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isPOOpen, setIsPOOpen] = useState(false);
  const [isStockTransactionOpen, setIsStockTransactionOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [newMaterial, setNewMaterial] = useState({ name: '', category: '', unit: '', quantity: 0 });
  const [newPO, setNewPO] = useState({ poNumber: '', vendor: '', date: new Date().toISOString().split('T')[0], totalAmount: 0 });
  const [transaction, setTransaction] = useState<{materialId: string, quantity: number, type: 'In' | 'Out'}>({ materialId: '', quantity: 0, type: 'In' });
  const [stockHistory, setStockHistory] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [syncMaterials, setSyncMaterials] = useState<any[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<Set<number>>(new Set());
  const [importPage, setImportPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Fetch materials from inventory sync (summary view with actual stock quantities)
  const fetchSyncMaterials = async () => {
    setIsImporting(true);
    try {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('roadmaster-token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch('/api/inventorySync?summary=true', {
        method: 'GET',
        headers,
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch sync materials');
      }
      const data = await response.json();
      // The summary endpoint returns { materials: [...], summary: {...} }
      const materials = data.materials || data.data || (Array.isArray(data) ? data : []);
      setSyncMaterials(materials.map((mat: any) => ({
        id: mat.id,
        name: mat.name || mat.material_detail,
        category: mat.category || '',
        unit: mat.unit || '',
        total_quantity: mat.total_quantity || 0,
        transaction_count: mat.transaction_count || 1,
        latest_location: mat.latest_location || '',
      })));
    } catch (err: any) {
      console.error('Error fetching sync materials:', err);
      toast.error('Failed to fetch sync materials');
    } finally {
      setIsImporting(false);
    }
  };

  // Build dynamic category list from sync materials merged with predefined CATEGORIES
  const syncCategories = useMemo(() => {
    const syncCatSet = new Set<string>();
    syncMaterials.forEach((m: any) => {
      if (m.category) syncCatSet.add(m.category);
    });
    const merged = new Set([...CATEGORIES, ...Array.from(syncCatSet)]);
    return Array.from(merged).sort();
  }, [syncMaterials]);

  // Import selected materials to project
  const handleImportMaterials = () => {
    const newMaterials = [...materials];
    let imported = 0;
    selectedMaterials.forEach((id) => {
      const syncMat = syncMaterials.find((m: any) => m.id === id);
      if (syncMat && !isDuplicate(newMaterials, 'name', syncMat.name)) {
        const importedQty = syncMat.total_quantity || 0;
        newMaterials.push({
          id: generateUniqueId(),
          name: syncMat.name,
          category: syncMat.category,
          unit: syncMat.unit,
          quantity: importedQty,
          location: syncMat.latest_location || 'Main Store',
          lastUpdated: new Date().toISOString(),
          availableQuantity: importedQty,
          reorderLevel: 10,
          status: importedQty === 0 ? 'Out of Stock' : (importedQty < 10 ? 'Low Stock' : 'Available'),
        });
        imported++;
      }
    });
    onProjectUpdate({ ...project, materials: newMaterials });
    setIsImportOpen(false);
    setSelectedMaterials(new Set());
    toast.success(`Imported ${imported} materials with stock quantities`);
  };

  const toggleMaterialSelection = (id: number) => {
    const newSelected = new Set(selectedMaterials);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedMaterials(newSelected);
  };

  const handleRegisterMaterial = () => {
    if (!newMaterial.name || !newMaterial.unit) {
      toast.error("Name and Unit are required");
      return;
    }

    // Check for duplicates
    if (isDuplicate(materials, 'name', newMaterial.name)) {
      toast.error("Material with this name already exists");
      return;
    }

    const material: Material = {
      id: generateUniqueId(),
      ...newMaterial,
      location: 'Main Store',
      lastUpdated: new Date().toISOString(),
      quantity: newMaterial.quantity,
      availableQuantity: newMaterial.quantity,
      reorderLevel: 10,
      status: 'Available'
    };

    onProjectUpdate({
      ...project,
      materials: [...materials, material]
    });

    setNewMaterial({ name: '', category: '', unit: '', quantity: 0 });
    setIsRegisterOpen(false);
    toast.success("Material Registered Successfully");
  };

  const handleCreatePO = () => {
    if (!newPO.poNumber || !newPO.vendor) {
      toast.error("PO Number and Vendor are required");
      return;
    }

    const po: PurchaseOrder = {
      id: generateUniqueId(),
      ...newPO,
      items: [],
      status: 'Draft'
    };

    onProjectUpdate({
      ...project,
      purchaseOrders: [...purchaseOrders, po]
    });

    setNewPO({ poNumber: '', vendor: '', date: new Date().toISOString().split('T')[0], totalAmount: 0 });
    setIsPOOpen(false);
    toast.success("Purchase Order Created");
  };

  const handleStockTransaction = () => {
    if (!transaction.materialId || transaction.quantity <= 0) {
      toast.error("Invalid transaction details");
      return;
    }

    const updatedMaterials = materials.map(m => {
      if (m.id === transaction.materialId) {
        const newQty = transaction.type === 'In' ? m.quantity + transaction.quantity : m.quantity - transaction.quantity;
        if (newQty < 0) {
          toast.error("Insufficient inventory");
          return m;
        }
        return { ...m, quantity: newQty, status: (newQty === 0 ? 'Out of Stock' : (newQty < 10 ? 'Low Stock' : 'Available')) as 'Available' | 'Low Stock' | 'Out of Stock' | 'Discontinued' };
      }
      return m;
    });

    const historyEntry = {
      id: generateUniqueId(),
      materialName: materials.find(m => m.id === transaction.materialId)?.name || '',
      type: transaction.type,
      quantity: transaction.quantity,
      date: new Date().toISOString(),
      balance: updatedMaterials.find(m => m.id === transaction.materialId)?.quantity || 0
    };

    onProjectUpdate({ ...project, materials: updatedMaterials });
    setStockHistory(prev => [historyEntry, ...prev]);
    setIsStockTransactionOpen(false);
    toast.success(`Stock ${transaction.type} processed`);
  };

  const handleNameChange = (name: string) => {
    setNewMaterial(prev => ({ ...prev, name }));
    // Auto-fill category and unit if material exists
    const existingMaterial = materials.find(m => m.name.toLowerCase() === name.toLowerCase());
    if (existingMaterial) {
      setNewMaterial(prev => ({ 
        ...prev, 
        name, 
        category: existingMaterial.category || '', 
        unit: existingMaterial.unit || '' 
      }));
    }
  };

// Prepare analytics data
  const lowStockAlerts = useMemo(() => {
    return materials.filter(m => m.quantity <= (m.reorderLevel || 10));
  }, [materials]);

  // Pagination for import dialog
  const totalImportPages = Math.ceil(syncMaterials.length / ITEMS_PER_PAGE);
  const paginatedMaterials = useMemo(() => {
    const start = (importPage - 1) * ITEMS_PER_PAGE;
    return syncMaterials.slice(start, start + ITEMS_PER_PAGE);
  }, [syncMaterials, importPage]);

  const chartData = useMemo(() => {
    return materials.map(m => ({
      name: m.name,
      supply: m.quantity + (m.reservedQuantity || 0), // Simplistic supply calculation
      consumption: m.reservedQuantity || 0 // Simplistic consumption calculation
    }));
  }, [materials]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Available':
        return <Badge variant="default" className="bg-emerald-500">Available</Badge>;
      case 'Low Stock':
        return <Badge variant="outline" className="text-amber-500 border-amber-500">Low Stock</Badge>;
      case 'Out of Stock':
        return <Badge variant="destructive">Out of Stock</Badge>;
      case 'Completed':
        return <Badge variant="default" className="bg-emerald-500">Completed</Badge>;
      case 'Issued':
        return <Badge variant="secondary">Issued</Badge>;
      case 'Draft':
        return <Badge variant="outline">Draft</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">Material Management</h1>
          <p className="text-muted-foreground">Project: {project?.name}</p>
        </div>
      </div>

      <Tabs defaultValue="inventory">
        <TabsList className="mb-8 h-12 bg-muted/50 p-1 rounded-2xl w-fit flex-wrap">
          <TabsTrigger value="inventory" className="rounded-xl font-black uppercase tracking-widest text-[10px] px-6">
            <Package className="mr-2 h-4 w-4" /> Inventory
          </TabsTrigger>
          <TabsTrigger value="procurement" className="rounded-xl font-black uppercase tracking-widest text-[10px] px-6">
            <ShoppingCart className="mr-2 h-4 w-4" /> Procurement
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-xl font-black uppercase tracking-widest text-[10px] px-6">
            <BarChart3 className="mr-2 h-4 w-4" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="alerts" className="rounded-xl font-black uppercase tracking-widest text-[10px] px-6">
            <AlertTriangle className="mr-2 h-4 w-4" /> Alerts
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl font-black uppercase tracking-widest text-[10px] px-6">
            <History className="mr-2 h-4 w-4" /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <Card className="rounded-3xl border-none shadow-xl glass">
<CardHeader className="flex flex-row justify-between items-center">
              <CardTitle className="text-sm font-black uppercase tracking-widest opacity-70">Current Stock Levels</CardTitle>
              <div className="flex gap-2">
                <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="rounded-xl font-black uppercase tracking-widest text-[10px]" onClick={fetchSyncMaterials}>
                      {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                      Import from Sync
                    </Button>
                  </DialogTrigger>
                    <DialogContent className="rounded-3xl max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Import Materials from Sync</DialogTitle>
                      <DialogDescription>Select materials to import from the synchronized inventory. Stock quantity will be carried over.</DialogDescription>
                    </DialogHeader>
<div className="grid gap-4 py-4 max-h-[400px] overflow-y-auto">
                      {syncMaterials.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No synchronized materials found. Run inventory sync first.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30">
                              <TableHead>Select</TableHead>
                              <TableHead>Material</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Unit</TableHead>
                              <TableHead className="text-right">Stock Qty</TableHead>
                              <TableHead>Txn Count</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedMaterials.map((mat: any) => (
                              <TableRow key={mat.id} className="hover:bg-muted/20">
<TableCell>
                                  <label className="flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={selectedMaterials.has(mat.id)}
                                      onChange={() => toggleMaterialSelection(mat.id)}
                                      className="h-4 w-4"
                                      title={`Select ${mat.name}`}
                                    />
                                  </label>
                                </TableCell>
                                <TableCell className="font-bold">{mat.name}</TableCell>
                                <TableCell>{mat.category || 'N/A'}</TableCell>
                                <TableCell>{mat.unit || 'N/A'}</TableCell>
                                <TableCell className="text-right font-mono font-bold">{mat.total_quantity || 0}</TableCell>
                                <TableCell className="text-center text-xs text-muted-foreground">{mat.transaction_count || 0}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                    {totalImportPages > 1 && (
                      <div className="flex items-center justify-between py-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setImportPage(p => Math.max(1, p - 1))}
                          disabled={importPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {importPage} of {totalImportPages} ({syncMaterials.length} materials)
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setImportPage(p => Math.min(totalImportPages, p + 1))}
                          disabled={importPage === totalImportPages}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                    <DialogFooter>
                      <Button onClick={handleImportMaterials} disabled={selectedMaterials.size === 0} className="rounded-xl">
                        <Check className="mr-2 h-4 w-4" /> Import Selected ({selectedMaterials.size})
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="rounded-xl font-black uppercase tracking-widest text-[10px]">
                      <Plus className="mr-2 h-4 w-4" /> Register Material
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-3xl">
                    <DialogHeader>
                      <DialogTitle>Register New Material</DialogTitle>
                      <DialogDescription>Add a new material to the project inventory.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label>Material Name</Label>
                        <Input value={newMaterial.name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Cement, Steel Bar" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Category</Label>
                        <Select value={newMaterial.category} onValueChange={value => setNewMaterial({...newMaterial, category: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {(syncCategories.length > CATEGORIES.length ? syncCategories : CATEGORIES).map(category => (
                              <SelectItem key={category} value={category}>{category}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Quantity</Label>
                          <Input type="number" value={newMaterial.quantity} onChange={e => setNewMaterial({...newMaterial, quantity: Number(e.target.value)})} placeholder="0" />
                        </div>
                        <div className="grid gap-2">
                          <Label>Unit</Label>
                          <Input value={newMaterial.unit} onChange={e => setNewMaterial({...newMaterial, unit: e.target.value})} placeholder="e.g. m3" />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleRegisterMaterial} className="rounded-xl">Save Material</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog open={isStockTransactionOpen} onOpenChange={setIsStockTransactionOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="rounded-xl font-black uppercase tracking-widest text-[10px]">
                      <Plus className="mr-2 h-4 w-4" /> Stock In/Out
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-3xl">
                    <DialogHeader>
                      <DialogTitle>Stock Transaction</DialogTitle>
                      <DialogDescription>Record a stock movement (IN or OUT).</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label>Material</Label>
                        <Select value={transaction.materialId} onValueChange={value => setTransaction({...transaction, materialId: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a material" />
                          </SelectTrigger>
                          <SelectContent>
                            {materials.map(m => (
                              <SelectItem key={m.id} value={m.id}>{m.name} (Current: {m.quantity} {m.unit})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Type</Label>
                          <Select value={transaction.type} onValueChange={value => setTransaction({...transaction, type: value as 'In' | 'Out'})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="In">Stock IN</SelectItem>
                              <SelectItem value="Out">Stock OUT</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>Quantity</Label>
                          <Input type="number" value={transaction.quantity} onChange={e => setTransaction({...transaction, quantity: Number(e.target.value)})} placeholder="0" />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleStockTransaction} className="rounded-xl">Process Transaction</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Material</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.length > 0 ? (
                    materials.map((material) => (
                      <TableRow key={material.id} className="hover:bg-muted/20">
                        <TableCell className="font-bold">{material.name}</TableCell>
                        <TableCell>{material.category || 'N/A'}</TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {material.quantity} <span className="text-muted-foreground">{material.unit}</span>
                        </TableCell>
                        <TableCell>{getStatusBadge(material.status)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                        <Package className="mx-auto mb-2 opacity-50" size={32} />
                        No materials registered in the inventory.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card className="rounded-3xl border-none shadow-xl glass">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest opacity-70">Low Stock Alerts</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Material</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Current Qty</TableHead>
                    <TableHead className="text-right">Reorder Level</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockAlerts.length > 0 ? (
                    lowStockAlerts.map((material) => (
                      <TableRow key={material.id} className="hover:bg-muted/20">
                        <TableCell className="font-bold">{material.name}</TableCell>
                        <TableCell>{material.category || 'N/A'}</TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {material.quantity} <span className="text-muted-foreground">{material.unit}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono">{material.reorderLevel || 10}</TableCell>
                        <TableCell>{getStatusBadge(material.status)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        <AlertTriangle className="mx-auto mb-2 opacity-50" size={32} />
                        No low stock alerts. All materials are above reorder levels.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="rounded-3xl border-none shadow-xl glass">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest opacity-70">Stock Transaction History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Date</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockHistory.length > 0 ? (
                    stockHistory.map((entry) => (
                      <TableRow key={entry.id} className="hover:bg-muted/20">
                        <TableCell className="font-mono text-xs">{new Date(entry.date).toLocaleString()}</TableCell>
                        <TableCell className="font-bold">{entry.materialName}</TableCell>
                        <TableCell>
                          <Badge variant={entry.type === 'In' ? 'default' : 'destructive'} className={entry.type === 'In' ? 'bg-emerald-500' : ''}>
                            {entry.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">{entry.quantity}</TableCell>
                        <TableCell className="text-right font-mono font-bold">{entry.balance}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        <History className="mx-auto mb-2 opacity-50" size={32} />
                        No stock transactions recorded yet. Use Stock In/Out to begin tracking.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="procurement">
          <Card className="rounded-3xl border-none shadow-xl glass">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest opacity-70">Purchase Orders</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>PO Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.length > 0 ? (
                    purchaseOrders.map((po) => (
                      <TableRow key={po.id} className="hover:bg-muted/20">
                        <TableCell className="font-bold font-mono">{po.poNumber}</TableCell>
                        <TableCell>{po.vendor}</TableCell>
                        <TableCell>{po.date}</TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {po.totalAmount.toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(po.status)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        <FileText className="mx-auto mb-2 opacity-50" size={32} />
                        No purchase orders found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card className="rounded-3xl border-none shadow-xl glass p-6">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest opacity-70">Supply vs Consumption</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="supply" fill="#00C49F" name="Total Supply" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="consumption" fill="#FF8042" name="Consumed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MaterialManagementModule;

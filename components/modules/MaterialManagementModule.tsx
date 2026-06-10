import React, { useState, useMemo } from 'react';
import { Project, Material, PurchaseOrder } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Badge } from '~/components/ui/badge';
import { Package, FileText, ShoppingCart, BarChart3, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Button } from '~/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
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

const MaterialManagementModule: React.FC<MaterialManagementModuleProps> = ({ project, userRole, onProjectUpdate }) => {
  const materials = project.materials || [];
  const purchaseOrders = project.purchaseOrders || [];

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isPOOpen, setIsPOOpen] = useState(false);
  const [isTransactionOpen, setIsTransactionOpen] = useState(false);
  const [newMaterial, setNewMaterial] = useState({ name: '', category: '', unit: '', quantity: 0 });
  const [newPO, setNewPO] = useState({ poNumber: '', vendor: '', date: new Date().toISOString().split('T')[0], totalAmount: 0 });
  const [transaction, setTransaction] = useState<{materialId: string, quantity: number, type: 'In' | 'Out'}>({ materialId: '', quantity: 0, type: 'In' });

  const handleRegisterMaterial = () => {
    if (!newMaterial.name || !newMaterial.unit) {
      toast.error("Name and Unit are required");
      return;
    }

    // Check for duplicates
    const isDuplicate = materials.some(m => m.name.toLowerCase() === newMaterial.name.toLowerCase());
    if (isDuplicate) {
      toast.error("Material with this name already exists");
      return;
    }

    const material: Material = {
      id: generateUniqueId(),
      ...newMaterial,
      location: 'Main Store',
      lastUpdated: new Date().toISOString(),
      quantity: newMaterial.quantity,
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
        return { ...m, quantity: newQty, status: newQty === 0 ? 'Out of Stock' : (newQty < 10 ? 'Low Stock' : 'Available') };
      }
      return m;
    });

    onProjectUpdate({ ...project, materials: updatedMaterials });
    setIsTransactionOpen(false);
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
        <TabsList className="mb-8 h-12 bg-muted/50 p-1 rounded-2xl w-fit">
          <TabsTrigger value="inventory" className="rounded-xl font-black uppercase tracking-widest text-[10px] px-6">
            <Package className="mr-2 h-4 w-4" /> Inventory
          </TabsTrigger>
          <TabsTrigger value="procurement" className="rounded-xl font-black uppercase tracking-widest text-[10px] px-6">
            <ShoppingCart className="mr-2 h-4 w-4" /> Procurement
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-xl font-black uppercase tracking-widest text-[10px] px-6">
            <BarChart3 className="mr-2 h-4 w-4" /> Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <Card className="rounded-3xl border-none shadow-xl glass">
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle className="text-sm font-black uppercase tracking-widest opacity-70">Current Stock Levels</CardTitle>
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
                      <Input value={newMaterial.name} onChange={e => handleNameChange(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Category</Label>
                      <Input value={newMaterial.category} onChange={e => setNewMaterial({...newMaterial, category: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Quantity</Label>
                        <Input type="number" value={newMaterial.quantity} onChange={e => setNewMaterial({...newMaterial, quantity: Number(e.target.value)})} />
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

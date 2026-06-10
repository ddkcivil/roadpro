import React, { useState, useMemo } from 'react';
import { Project, Material, PurchaseOrder } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Badge } from '~/components/ui/badge';
import { Package, FileText, ShoppingCart, BarChart3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
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
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest opacity-70">Current Stock Levels</CardTitle>
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

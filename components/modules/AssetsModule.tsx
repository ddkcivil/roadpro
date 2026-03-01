import React, { useState, useMemo } from 'react';
import { Project, UserRole, Vehicle } from '../../types';
import QRCodeGenerator from './QRCodeGenerator';
import { generateUniqueId } from '../../utils/uuidUtils';
import { Button } from "~/components/ui/button"
import { Card, CardContent } from "~/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableRow, TableHeader } from "~/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip"
import { Badge } from "~/components/ui/badge"
import { Separator } from "~/components/ui/separator"
import { cn } from '~/lib/utils';
import {
    Package, AlertTriangle, CheckCircle2, TrendingDown, Plus,
    ArrowUpRight, ShoppingCart, History, PackageSearch, Filter,
    FileText, Truck, CreditCard, ChevronRight, Calculator,
    PlusCircle, Trash2, Save, X, Printer, Edit, Car, Fuel, Gauge, Wrench, QrCode
} from 'lucide-react';

interface Props {
  project: Project;
  userRole: UserRole;
  onProjectUpdate: (project: Project) => void;
}

const AssetsModule: React.FC<Props> = ({ project, onProjectUpdate, userRole }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Vehicle | null>(null);
  const [assetForm, setAssetForm] = useState<Partial<Vehicle>>({
    plateNumber: '',
    type: '',
    status: 'Active',
    driver: '',
    agencyId: '',
    chainage: '',
    gpsLocation: undefined
  });
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  
  const assets = project.vehicles || [];

  const stats = useMemo(() => {
    const active = assets.filter(a => a.status === 'Active');
    const maintenance = assets.filter(a => a.status === 'Maintenance');
    const idle = assets.filter(a => a.status === 'Idle');
    return { active, maintenance, idle };
  }, [assets]);

  const handleAddAsset = () => {
    setAssetForm({
      plateNumber: '',
      type: '',
      status: 'Active',
      driver: '',
      chainage: ''
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
      chainage: asset.chainage,
      gpsLocation: asset.gpsLocation
    });
    setEditingAssetId(asset.id);
    setIsAssetModalOpen(true);
  };

  const canDelete = userRole === UserRole.ADMIN || userRole === UserRole.PROJECT_MANAGER;
  
  const handleDeleteAsset = (assetId: string) => {
    if (!canDelete) {
      alert('Only Admin and Project Manager can delete assets');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this asset?')) return;
    
    const updatedAssets = assets.filter(asset => asset.id !== assetId);
    onProjectUpdate({
      ...project,
      vehicles: updatedAssets
    });
  };

  const handleShowQRCode = (asset: Vehicle) => {
    setSelectedAsset(asset);
    setIsQRModalOpen(true);
  };

  const handleSaveAsset = () => {
    // Validation
    if (!assetForm.plateNumber?.trim()) {
      alert('Plate number is required');
      return;
    }
    
    if (!assetForm.type?.trim()) {
      alert('Asset type is required');
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
              chainage: assetForm.chainage,
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
        id: generateUniqueId(),
        name: assetForm.plateNumber || 'Unnamed Asset',
        description: assetForm.type || '',
        category: assetForm.type || 'Equipment',
        unit: 'unit',
        quantity: 1,
        location: assetForm.chainage || 'Site',
        lastUpdated: new Date().toISOString(),
        plateNumber: assetForm.plateNumber,
        type: assetForm.type,
        status: assetForm.status || 'Active',
        driver: assetForm.driver || '',
        agencyId: assetForm.agencyId || undefined,
        chainage: assetForm.chainage,
        gpsLocation: assetForm.gpsLocation
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
      chainage: ''
    });
    setEditingAssetId(null);
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between mb-4 items-center">
        <div>
          <h5 className="text-xl font-black">Asset & Equipment Registry</h5>
          <p className="text-sm text-muted-foreground">Manage project vehicles, machinery, and equipment inventory</p>
        </div>
        <Button onClick={handleAddAsset}>
          <Plus className="mr-2 h-4 w-4" />
          Add Asset
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <h3 className="ml-2 text-sm font-semibold text-muted-foreground">Active Assets</h3>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-bold text-green-600">{stats.active.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Wrench className="h-4 w-4 text-yellow-600" />
              <h3 className="ml-2 text-sm font-semibold text-muted-foreground">Under Maintenance</h3>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-bold text-yellow-600">{stats.maintenance.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Gauge className="h-4 w-4 text-blue-600" />
              <h3 className="ml-2 text-sm font-semibold text-muted-foreground">Idle Assets</h3>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-bold text-blue-600">{stats.idle.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Car className="h-4 w-4 text-purple-600" />
              <h3 className="ml-2 text-sm font-semibold text-muted-foreground">Total Assets</h3>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-bold text-purple-600">{assets.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assets Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plate Number</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Chainage</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.length > 0 ? assets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell className="font-medium">{asset.plateNumber}</TableCell>
                <TableCell>
                  <Badge variant="outline">{asset.type}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      asset.status === 'Active' ? 'default' :
                      asset.status === 'Maintenance' ? 'secondary' : 'outline'
                    }
                    className={
                      asset.status === 'Active' ? 'bg-green-100 text-green-700' :
                      asset.status === 'Maintenance' ? 'bg-yellow-100 text-yellow-700' : ''
                    }
                  >
                    {asset.status}
                  </Badge>
                </TableCell>
                <TableCell>{asset.driver || 'Unassigned'}</TableCell>
                <TableCell>{asset.chainage || 'N/A'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleShowQRCode(asset)}
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Show QR Code</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditAsset(asset)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit Asset</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteAsset(asset.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete Asset</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                  No assets registered yet. Click "Add Asset" to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Add/Edit Asset Modal */}
      <Dialog open={isAssetModalOpen} onOpenChange={setIsAssetModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingAssetId ? 'Edit Asset' : 'Add New Asset'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="plateNumber" className="text-right">
                Plate Number
              </Label>
              <Input
                id="plateNumber"
                value={assetForm.plateNumber || ''}
                onChange={(e) => setAssetForm({ ...assetForm, plateNumber: e.target.value })}
                className="col-span-3"
                placeholder="e.g., ABC-123"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Type
              </Label>
              <Select
                value={assetForm.type || ''}
                onValueChange={(value) => setAssetForm({ ...assetForm, type: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select asset type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Truck">Truck</SelectItem>
                  <SelectItem value="Excavator">Excavator</SelectItem>
                  <SelectItem value="Bulldozer">Bulldozer</SelectItem>
                  <SelectItem value="Crane">Crane</SelectItem>
                  <SelectItem value="Generator">Generator</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select
                value={assetForm.status || 'Active'}
                onValueChange={(value) => setAssetForm({ ...assetForm, status: value as 'Active' | 'Maintenance' | 'Idle' })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Idle">Idle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="driver" className="text-right">
                Driver
              </Label>
              <Input
                id="driver"
                value={assetForm.driver || ''}
                onChange={(e) => setAssetForm({ ...assetForm, driver: e.target.value })}
                className="col-span-3"
                placeholder="Driver name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="chainage" className="text-right">
                Chainage
              </Label>
              <Input
                id="chainage"
                value={assetForm.chainage || ''}
                onChange={(e) => setAssetForm({ ...assetForm, chainage: e.target.value })}
                className="col-span-3"
                placeholder="e.g., 12+400"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssetModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAsset}>
              <Save className="mr-2 h-4 w-4" />
              {editingAssetId ? 'Update' : 'Add'} Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog open={isQRModalOpen} onOpenChange={setIsQRModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Asset QR Code</DialogTitle>
          </DialogHeader>
          {selectedAsset && (
            <div className="flex flex-col items-center py-4">
              <QRCodeGenerator
                data={JSON.stringify({
                  id: selectedAsset.id,
                  plateNumber: selectedAsset.plateNumber,
                  type: selectedAsset.type,
                  status: selectedAsset.status
                })}
                size={200}
              />
              <p className="mt-4 text-sm text-muted-foreground text-center">
                Scan this QR code to quickly access asset information
              </p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsQRModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssetsModule;

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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip"
import { Badge } from "~/components/ui/badge"
import {
    CheckCircle2, Plus,
    Trash2, Save, Edit, Car, Gauge, Wrench, QrCode,
    History, AlertCircle, Calendar, ShieldCheck, ClipboardList
} from 'lucide-react';
import { MaintenanceLog } from '../../types';

interface Props {
  project: Project;
  userRole: UserRole;
  onProjectUpdate: (project: Project) => void;
}

const AssetsModule: React.FC<Props> = ({ project, onProjectUpdate, userRole }) => {
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isAddLogModalOpen, setIsAddLogModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Vehicle | null>(null);
  const [assetForm, setAssetForm] = useState<Partial<Vehicle>>({
    plateNumber: '',
    type: '',
    status: 'Active',
    driver: '',
    agencyId: '',
    chainage: '',
    gpsLocation: undefined,
    insuranceExpiry: '',
    taxExpiry: '',
    safetyExpiryDate: '',
    lastRestockDate: ''
  });
  const [logForm, setLogForm] = useState<Partial<MaintenanceLog>>({
    type: 'Routine Service',
    description: '',
    cost: 0,
    status: 'Completed',
    date: new Date().toISOString().split('T')[0]
  });
  const [coords, setCoords] = useState({ lat: '', lng: '' });
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  
  const assets = project.vehicles || [];

  const canAdd = true; // All users can add assets
  const canEdit = userRole === UserRole.ADMIN || userRole === UserRole.PROJECT_MANAGER || userRole === UserRole.SITE_ENGINEER;
  const canDelete = userRole === UserRole.ADMIN || userRole === UserRole.PROJECT_MANAGER;

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
    setCoords({ lat: '', lng: '' });
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
      gpsLocation: asset.gpsLocation,
      insuranceExpiry: asset.insuranceExpiry || '',
      taxExpiry: asset.taxExpiry || '',
      safetyExpiryDate: asset.safetyExpiryDate || '',
      lastRestockDate: asset.lastRestockDate || ''
    });
    setCoords({
      lat: asset.gpsLocation?.latitude?.toString() || '',
      lng: asset.gpsLocation?.longitude?.toString() || ''
    });
    setEditingAssetId(asset.id);
    setIsAssetModalOpen(true);
  };

  const handleShowMaintenance = (asset: Vehicle) => {
    setSelectedAsset(asset);
    setIsMaintenanceModalOpen(true);
  };

  const handleAddLog = () => {
    setLogForm({
      type: 'Routine Service',
      description: '',
      cost: 0,
      status: 'Completed',
      date: new Date().toISOString().split('T')[0]
    });
    setIsAddLogModalOpen(true);
  };

  const handleSaveLog = () => {
    if (!selectedAsset || !logForm.description) return;

    const newLog: MaintenanceLog = {
      id: generateUniqueId(),
      vehicleId: selectedAsset.id,
      date: logForm.date || new Date().toISOString().split('T')[0],
      type: logForm.type as any,
      description: logForm.description,
      cost: logForm.cost || 0,
      status: logForm.status as any,
    };

    const updatedMaintenanceLogs = [...(selectedAsset.maintenanceLogs || []), newLog];
    
    // Auto-update status if log is "In Progress"
    const newStatus = logForm.status === 'In Progress' ? 'Maintenance' : selectedAsset.status;

    const updatedAssets = assets.map(asset => 
      asset.id === selectedAsset.id 
        ? { ...asset, maintenanceLogs: updatedMaintenanceLogs, status: newStatus as any } 
        : asset
    );

    onProjectUpdate({
      ...project,
      vehicles: updatedAssets
    });

    setIsAddLogModalOpen(false);
    // Refresh selected asset in view
    const refreshedAsset = updatedAssets.find(a => a.id === selectedAsset.id);
    if (refreshedAsset) setSelectedAsset(refreshedAsset);
  };

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
    if (!canAdd && !editingAssetId) return;
    if (!canEdit && editingAssetId) return;

    if (!assetForm.plateNumber?.trim()) {
      alert('Plate number is required');
      return;
    }
    
    if (!assetForm.type?.trim()) {
      alert('Asset type is required');
      return;
    }

    const lat = parseFloat(coords.lat);
    const lng = parseFloat(coords.lng);
    const gpsLocation = (!isNaN(lat) && !isNaN(lng)) ? {
      latitude: lat,
      longitude: lng,
      timestamp: new Date().toISOString()
    } : undefined;

    if (editingAssetId) {
      // Update existing asset
      const updatedAssets = assets.map(asset => 
        asset.id === editingAssetId 
          ? { 
              ...asset, 
              ...assetForm,
              agencyId: assetForm.agencyId || undefined,
              chainage: assetForm.chainage,
              gpsLocation: gpsLocation || assetForm.gpsLocation
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
        gpsLocation: gpsLocation,
        maintenanceLogs: [],
        insuranceExpiry: assetForm.insuranceExpiry,
        taxExpiry: assetForm.taxExpiry,
        safetyExpiryDate: assetForm.safetyExpiryDate,
        lastRestockDate: assetForm.lastRestockDate
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
      chainage: '',
      insuranceExpiry: '',
      taxExpiry: '',
      safetyExpiryDate: '',
      lastRestockDate: ''
    });
    setCoords({ lat: '', lng: '' });
    setEditingAssetId(null);
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between mb-4 items-center">
        <div>
          <h5 className="text-xl font-black">Asset & Equipment Registry</h5>
          <p className="text-sm text-muted-foreground">Manage project vehicles, machinery, and equipment inventory</p>
        </div>
        {canAdd && (
          <Button onClick={handleAddAsset}>
            <Plus className="mr-2 h-4 w-4" />
            Add Asset
          </Button>
        )}
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
                  <div className="flex flex-col gap-1">
                    <Badge variant="outline">{asset.type}</Badge>
                    {asset.insuranceExpiry && new Date(asset.insuranceExpiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                      <Badge variant="destructive" className="text-[10px] py-0 h-4">Insurance Expiring</Badge>
                    )}
                    {asset.safetyExpiryDate && new Date(asset.safetyExpiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                      <Badge variant="destructive" className="text-[10px] py-0 h-4">Refill Needed</Badge>
                    )}
                  </div>
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
                            onClick={() => handleShowMaintenance(asset)}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Maintenance History</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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
                    {canEdit && (
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
                    )}
                    {canDelete && (
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
                    )}
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
                  <SelectItem value="Fire Extinguisher">Fire Extinguisher</SelectItem>
                  <SelectItem value="First Aid Kit">First Aid Kit</SelectItem>
                  <SelectItem value="Safety Signage">Safety Signage</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Conditional Fields based on Asset Type */}
            {['Truck', 'Excavator', 'Bulldozer', 'Crane'].includes(assetForm.type || '') && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="insuranceExpiry" className="text-right">Insurance Exp</Label>
                  <Input
                    id="insuranceExpiry"
                    type="date"
                    value={assetForm.insuranceExpiry || ''}
                    onChange={(e) => setAssetForm({ ...assetForm, insuranceExpiry: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="taxExpiry" className="text-right">Tax Expiry</Label>
                  <Input
                    id="taxExpiry"
                    type="date"
                    value={assetForm.taxExpiry || ''}
                    onChange={(e) => setAssetForm({ ...assetForm, taxExpiry: e.target.value })}
                    className="col-span-3"
                  />
                </div>
              </>
            )}

            {assetForm.type === 'Fire Extinguisher' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="safetyExpiryDate" className="text-right">Refill Date</Label>
                <Input
                  id="safetyExpiryDate"
                  type="date"
                  value={assetForm.safetyExpiryDate || ''}
                  onChange={(e) => setAssetForm({ ...assetForm, safetyExpiryDate: e.target.value })}
                  className="col-span-3"
                />
              </div>
            )}

            {assetForm.type === 'First Aid Kit' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="lastRestockDate" className="text-right">Restock Date</Label>
                <Input
                  id="lastRestockDate"
                  type="date"
                  value={assetForm.lastRestockDate || ''}
                  onChange={(e) => setAssetForm({ ...assetForm, lastRestockDate: e.target.value })}
                  className="col-span-3"
                />
              </div>
            )}

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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lat" className="text-right">
                Latitude
              </Label>
              <Input
                id="lat"
                value={coords.lat}
                onChange={(e) => setCoords({ ...coords, lat: e.target.value })}
                className="col-span-3"
                placeholder="e.g., 27.7006"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lng" className="text-right">
                Longitude
              </Label>
              <Input
                id="lng"
                value={coords.lng}
                onChange={(e) => setCoords({ ...coords, lng: e.target.value })}
                className="col-span-3"
                placeholder="e.g., 83.4484"
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
                value={JSON.stringify({
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
      {/* Maintenance History Modal */}
      <Dialog open={isMaintenanceModalOpen} onOpenChange={setIsMaintenanceModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Maintenance History: {selectedAsset?.plateNumber}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Recent Logs</h4>
              <Button size="sm" onClick={handleAddLog}>
                <Plus className="h-4 w-4 mr-1" /> Add Log
              </Button>
            </div>

            {selectedAsset?.maintenanceLogs && selectedAsset.maintenanceLogs.length > 0 ? (
              <div className="space-y-3">
                {selectedAsset.maintenanceLogs.slice().reverse().map((log) => (
                  <Card key={log.id} className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <Badge variant="outline" className="mb-1">{log.type}</Badge>
                          <p className="text-sm font-medium">{log.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{log.date}</p>
                          <p className="text-sm font-bold text-primary">${log.cost}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={log.status === 'Completed' ? 'default' : 'secondary'}>
                          {log.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground opacity-20 mb-2" />
                <p className="text-sm text-muted-foreground">No maintenance logs found for this asset.</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button onClick={() => setIsMaintenanceModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Maintenance Log Modal */}
      <Dialog open={isAddLogModalOpen} onOpenChange={setIsAddLogModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Maintenance Log</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="logType" className="text-right">Type</Label>
              <Select
                value={logForm.type || 'Routine Service'}
                onValueChange={(value) => setLogForm({ ...logForm, type: value as any })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Routine Service">Routine Service</SelectItem>
                  <SelectItem value="Repair">Repair</SelectItem>
                  <SelectItem value="Inspection">Inspection</SelectItem>
                  <SelectItem value="Breakdown">Breakdown</SelectItem>
                  <SelectItem value="Tyre Change">Tyre Change</SelectItem>
                  <SelectItem value="Oil Change">Oil Change</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="logDate" className="text-right">Date</Label>
              <Input
                id="logDate"
                type="date"
                value={logForm.date}
                onChange={(e) => setLogForm({ ...logForm, date: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="logDesc" className="text-right">Description</Label>
              <Input
                id="logDesc"
                value={logForm.description || ''}
                onChange={(e) => setLogForm({ ...logForm, description: e.target.value })}
                className="col-span-3"
                placeholder="Work done details"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="logCost" className="text-right">Cost</Label>
              <Input
                id="logCost"
                type="number"
                value={logForm.cost}
                onChange={(e) => setLogForm({ ...logForm, cost: parseFloat(e.target.value) })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="logStatus" className="text-right">Status</Label>
              <Select
                value={logForm.status || 'Completed'}
                onValueChange={(value) => setLogForm({ ...logForm, status: value as any })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddLogModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveLog}>Save Log Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssetsModule;

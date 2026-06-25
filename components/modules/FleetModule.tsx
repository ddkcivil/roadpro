import React, { useState, useMemo } from 'react';
import { Project, Vehicle, VehicleLog, MaintenanceLog, BOQItem, AppSettings } from '../../types';
import { formatCurrency, getCurrencySymbol } from '../../utils/formatting/currencyUtils';

import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Badge } from '~/components/ui/badge';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '~/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Alert } from '~/components/ui/alert';
import { Separator } from '~/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';

import { 
    Truck, Gauge, Droplets, Clock, Signal, Plus, 
    ShieldCheck, MapPin, History, Save, X, Navigation,
    Fuel, Calendar, HardHat, CheckCircle2, Trash2, Edit,
    Wrench, AlertTriangle, Link, BarChart3
} from 'lucide-react';

interface Props {
  project: Project;
  onProjectUpdate: (project: Project) => void;
}

const FleetModule: React.FC<Props> = ({ project, onProjectUpdate }) => {
  const vehicles = project.vehicles || [];
  const vehicleLogs = project.vehicleLogs || [];
  const [selectedId, setSelectedId] = useState<string | null>(vehicles[0]?.id || null);
  const [activeDetailTab, setActiveDetailTab] = useState<string>('0');
  
const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [isLogTripModalOpen, setIsLogTripModalOpen] = useState(false);
  const [isEditVehicleModalOpen, setIsEditVehicleModalOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  
  const activeVehicle = vehicles.find(v => v.id === selectedId);
  const activeVehicleLogs = useMemo(() => 
    vehicleLogs.filter(log => log.vehicleId === selectedId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [vehicleLogs, selectedId]
  );
  
  // Maintenance form state
  const [maintenanceForm, setMaintenanceForm] = useState<Partial<MaintenanceLog>>({
    date: new Date().toISOString().split('T')[0],
    type: 'Routine Service',
    description: '',
    cost: 0,
    status: 'Completed'
  });

  const [newVehicle, setNewVehicle] = useState<Partial<Vehicle>>({
      plateNumber: '',
      type: 'Tipper Truck',
      driver: '',
      status: 'Active'
  });

  const [editingVehicle, setEditingVehicle] = useState<Partial<Vehicle> | null>(null);

  const [tripForm, setTripForm] = useState<Partial<VehicleLog>>({
      date: new Date().toISOString().split('T')[0],
      startKm: 0,
      endKm: 0,
      fuelConsumed: 0,
      workingHours: 0,
      activityDescription: ''
  });

  const handleAddVehicle = () => {
    setNewVehicle({
      plateNumber: '',
      type: 'Tipper Truck',
      driver: '',
      status: 'Active'
    });
    setIsRegModalOpen(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle({
      id: vehicle.id,
      plateNumber: vehicle.plateNumber,
      type: vehicle.type,
      driver: vehicle.driver,
      status: vehicle.status,
      geofenceStatus: vehicle.geofenceStatus,
      agencyId: vehicle.agencyId
    });
    setIsEditVehicleModalOpen(true);
  };

  const handleSaveVehicle = () => {
    // Validation
    if (!newVehicle.plateNumber?.trim()) {
      alert('Plate number is required');
      return;
    }
    
    if (!newVehicle.driver?.trim()) {
      alert('Driver name is required');
      return;
    }
    
    // Check for duplicate plate number
    const duplicateVehicle = vehicles.find(v => v.plateNumber?.toLowerCase() === newVehicle.plateNumber?.toLowerCase());
    if (duplicateVehicle) {
      if (!confirm(`A vehicle with plate number '${newVehicle.plateNumber}' already exists. Do you want to add it anyway?`)) {
        return;
      }
    }

    const vehicle: Vehicle = { 
      ...newVehicle, 
      id: `v-${Date.now()}`, 
      plateNumber: newVehicle.plateNumber!,
      type: newVehicle.type || 'Tipper Truck',
      driver: newVehicle.driver!,
      status: newVehicle.status || 'Active',
      geofenceStatus: newVehicle.geofenceStatus || 'Inside',
      agencyId: newVehicle.agencyId || undefined
    } as Vehicle;
    
    onProjectUpdate({ ...project, vehicles: [...vehicles, vehicle] });
    setIsRegModalOpen(false);
    setNewVehicle({ plateNumber: '', type: 'Tipper Truck', driver: '', status: 'Active' });
  };

  const handleUpdateVehicle = () => {
    if (!editingVehicle?.id) return;
    
    // Validation
    if (!editingVehicle.plateNumber?.trim()) {
      alert('Plate number is required');
      return;
    }
    
    if (!editingVehicle.driver?.trim()) {
      alert('Driver name is required');
      return;
    }
    
    const updatedVehicles = vehicles.map(vehicle => 
      vehicle.id === editingVehicle.id 
        ? { 
            ...vehicle, 
            plateNumber: editingVehicle.plateNumber!,
            type: editingVehicle.type || vehicle.type,
            driver: editingVehicle.driver!,
            status: editingVehicle.status || vehicle.status,
            geofenceStatus: editingVehicle.geofenceStatus || vehicle.geofenceStatus,
            agencyId: editingVehicle.agencyId || vehicle.agencyId
          } as Vehicle
        : vehicle
    );
    
    onProjectUpdate({ ...project, vehicles: updatedVehicles });
    setIsEditVehicleModalOpen(false);
    setEditingVehicle(null);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    if (window.confirm('Are you sure you want to delete this vehicle? This will also delete all associated trip logs.')) {
      // Remove the vehicle
      const updatedVehicles = vehicles.filter(v => v.id !== vehicleId);
      // Remove all logs associated with this vehicle
      const updatedLogs = vehicleLogs.filter(log => log.vehicleId !== vehicleId);
      
      onProjectUpdate({ 
        ...project, 
        vehicles: updatedVehicles,
        vehicleLogs: updatedLogs
      });
      
      // If the deleted vehicle was selected, clear selection
      if (selectedId === vehicleId) {
        setSelectedId(updatedVehicles[0]?.id || null);
      }
    }
  };

  const handleSaveTrip = () => {
      if (!activeVehicle || !tripForm.endKm || tripForm.endKm < (tripForm.startKm || 0)) {
          alert("Please check odometer readings. End KM must be greater than Start KM.");
          return;
      }

      const totalKm = Number(tripForm.endKm) - Number(tripForm.startKm || 0);
      const log: VehicleLog = {
          ...tripForm,
          id: `vl-${Date.now()}`,
          vehicleId: activeVehicle.id,
          plateNumber: activeVehicle.plateNumber,
          totalKm,
          date: tripForm.date!,
          startKm: Number(tripForm.startKm),
          endKm: Number(tripForm.endKm),
          fuelConsumed: Number(tripForm.fuelConsumed),
          workingHours: Number(tripForm.workingHours),
          activityDescription: tripForm.activityDescription || 'Daily work'
      } as VehicleLog;

      onProjectUpdate({ ...project, vehicleLogs: [...vehicleLogs, log] });
      setIsLogTripModalOpen(false);
      setTripForm({ date: new Date().toISOString().split('T')[0], startKm: 0, endKm: 0, fuelConsumed: 0, workingHours: 0, activityDescription: '' });
  };

  const handleDeleteTripLog = (logId: string) => {
      if (window.confirm('Are you sure you want to delete this trip log?')) {
          const updatedLogs = vehicleLogs.filter(log => log.id !== logId);
          onProjectUpdate({ ...project, vehicleLogs: updatedLogs });
      }
  };

const handleOpenTripLog = () => {
    const lastLog = activeVehicleLogs[0];
    setTripForm({
        ...tripForm,
        startKm: lastLog ? lastLog.endKm : 0,
        endKm: lastLog ? lastLog.endKm : 0
    });
    setIsLogTripModalOpen(true);
  };

  // Get maintenance logs for active vehicle
  const activeMaintenanceLogs = useMemo(() => 
    activeVehicle?.maintenanceLogs || [],
    [activeVehicle]
  );

  const handleOpenMaintenance = () => {
    setMaintenanceForm({
      date: new Date().toISOString().split('T')[0],
      type: 'Routine Service',
      description: '',
      cost: 0,
      status: 'Completed'
    });
    setIsMaintenanceModalOpen(true);
  };

  const handleSaveMaintenance = () => {
    if (!activeVehicle || !maintenanceForm.description?.trim()) {
      alert('Description is required');
      return;
    }

    const newLog: MaintenanceLog = {
      id: `ml-${Date.now()}`,
      vehicleId: activeVehicle.id,
      date: maintenanceForm.date!,
      type: maintenanceForm.type as any,
      description: maintenanceForm.description!,
      cost: Number(maintenanceForm.cost) || 0,
      status: maintenanceForm.status as any,
      technicianName: maintenanceForm.technicianName,
      odometerReading: maintenanceForm.odometerReading,
      partsReplaced: maintenanceForm.partsReplaced
    };

    // Update vehicle with new maintenance log
    const updatedVehicles = vehicles.map(v => 
      v.id === activeVehicle.id 
        ? { 
            ...v, 
            maintenanceLogs: [...(v.maintenanceLogs || []), newLog],
            status: maintenanceForm.status === 'In Progress' ? 'Maintenance' : v.status
          } as Vehicle
        : v
    );
    
    onProjectUpdate({ ...project, vehicles: updatedVehicles });
    setIsMaintenanceModalOpen(false);
  };

  const handleDeleteMaintenanceLog = (logId: string) => {
    if (!activeVehicle || !window.confirm('Are you sure you want to delete this maintenance record?')) return;

    const updatedVehicles = vehicles.map(v => 
      v.id === activeVehicle.id 
        ? { 
            ...v, 
            maintenanceLogs: (v.maintenanceLogs || []).filter((l: MaintenanceLog) => l.id !== logId)
          } as Vehicle
        : v
    );
    
    onProjectUpdate({ ...project, vehicles: updatedVehicles });
  };

  return (
    <div className="animate-in fade-in duration-500">
        <div className="flex items-center justify-between mb-4">
            <div>
                <h5 className="text-xl font-extrabold">Fleet & Equipment</h5>
                <p className="text-sm text-gray-500">Real-time telematics & utilization</p>
            </div>
            <Button onClick={handleAddVehicle} className="px-3 py-1.5">
                <Plus size={16} className="mr-2"/> Register Plant
            </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-4">
                <div className="flex flex-col space-y-3">
                    {vehicles.map(v => (
                        <Card 
                            key={v.id} 
                            onClick={() => { setSelectedId(v.id); setActiveDetailTab('0'); }}
                            className={`cursor-pointer rounded-xl transition-all duration-200 border-l-[6px] 
                                ${v.status === 'Active' ? 'border-green-500' : 'border-amber-500'}
                                ${selectedId === v.id ? 'bg-indigo-50/20 border-primary' : 'bg-white border-border'}`}
                        >
                            <div className="p-3 flex items-center gap-3">
                                <Avatar className="bg-muted text-muted-foreground">
                                    <AvatarFallback><Truck size={20}/></AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="text-sm font-bold">{v.plateNumber}</p>
                                    <p className="text-xs text-gray-500">{v.type}</p>
                                    <p className="text-xs text-primary">
                                      {v.agencyId ? (
                                        project.agencies?.find(a => a.id === v.agencyId)?.name || 'Unknown Agency'
                                      ) : 'Unassigned'}
                                    </p>
                                </div>
                                <Badge variant="outline" className="text-[8px] h-4 px-1">{v.status}</Badge>
                                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEditVehicle(v); }}>
                                  <Edit size={14} />
                                </Button>
                                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={(e) => { e.stopPropagation(); handleDeleteVehicle(v.id); }}>
                                  <Trash2 size={14} />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            <div className="col-span-12 md:col-span-8">
                {activeVehicle ? (
                    <div className="flex flex-col space-y-6">
                        <Card className="p-6 rounded-3xl">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <Avatar className="w-14 h-14 bg-primary">
                                      <AvatarFallback><Truck size={28}/></AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h6 className="text-lg font-extrabold">{activeVehicle.plateNumber}</h6>
                                        <p className="text-sm text-gray-500">Operator: <b>{activeVehicle.driver}</b></p>
                                        <p className="text-sm text-primary">Agency: <b>{activeVehicle.agencyId ? (
                                          project.agencies?.find(a => a.id === activeVehicle.agencyId)?.name || 'Unknown Agency'
                                        ) : 'Unassigned'}</b></p>
                                    </div>
                                </div>
                                <Button variant="secondary" onClick={handleOpenTripLog}>
                                  <Navigation size={16} className="mr-2"/> Log Trip / Work
                                </Button>
                            </div>
                            
<Tabs value={activeDetailTab} onValueChange={setActiveDetailTab} className="mb-6 border-b">
                                <TabsList>
                                    <TabsTrigger value="0" className="flex items-center gap-2">
                                      <Gauge size={18}/> Summary
                                    </TabsTrigger>
                                    <TabsTrigger value="1" className="flex items-center gap-2">
                                      <History size={18}/> Trip History
                                    </TabsTrigger>
                                    <TabsTrigger value="2" className="flex items-center gap-2">
                                      <Wrench size={18}/> Maintenance
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>

                            {activeDetailTab === '0' && (
                                <>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <Card className="text-center p-4">
                                          <Gauge size={16} className="mx-auto mb-1"/><p className="text-base font-bold">{(activeVehicleLogs.reduce((acc, l) => acc + l.totalKm, 0)).toLocaleString()}</p><p className="text-xs text-gray-500">Total Km</p>
                                        </Card>
                                        <Card className="text-center p-4">
                                          <Droplets size={16} className="text-emerald-500 mx-auto mb-1"/><p className="text-base font-bold">{activeVehicleLogs.length > 0 ? (activeVehicleLogs[0].fuelConsumed) : '0'}L</p><p className="text-xs text-gray-500">Last Fuel</p>
                                        </Card>
                                        <Card className="text-center p-4">
                                          <Clock size={16} className="text-amber-500 mx-auto mb-1"/><p className="text-base font-bold">{(activeVehicleLogs.reduce((acc, l) => acc + l.workingHours, 0)).toFixed(1)}h</p><p className="text-xs text-gray-500">Total Use</p>
                                        </Card>
                                        <Card className="text-center p-4">
                                          <MapPin size={16} className="text-rose-500 mx-auto mb-1"/><p className="text-base font-bold">{activeVehicle.geofenceStatus || 'Inside'}</p><p className="text-xs text-gray-500">Geofence</p>
                                        </Card>
                                    </div>

                                    <div className="mt-8">
                                        <p className="text-sm font-bold mb-4 flex items-center gap-1"><ShieldCheck size={18} className="text-primary"/> HEALTH STATUS</p>
                                        <Separator className="my-4" />
                                        <div className="mb-4">
                                          <div className="flex items-center justify-between mb-1">
                                            <p className="text-xs font-bold">Engine Performance</p>
                                            <p className="text-xs font-bold">95%</p>
                                          </div>
                                          <div className="relative w-full h-1.5 bg-gray-200 rounded-full">
                                            <div className="absolute h-full bg-green-500 rounded-full w-[95%]"></div>
                                          </div>
                                        </div>
                                        <div>
                                          <div className="flex items-center justify-between mb-1">
                                            <p className="text-xs font-bold">Service Due</p>
                                            <p className="text-xs font-bold">32 Days</p>
                                          </div>
                                          <div className="relative w-full h-1.5 bg-gray-200 rounded-full">
                                            <div className="absolute h-full bg-amber-500 rounded-full w-[30%]"></div>
                                          </div>
                                        </div>
                                    </div>
                                </>
                            )}

{activeDetailTab === '1' && (
                                <div>
                                    <Table>
                                        <TableHeader className="bg-muted">
                                            <TableRow>
                                                <TableHead className="font-bold">Date</TableHead>
                                                <TableHead className="font-bold">Activity / Task</TableHead>
                                                <TableHead className="font-bold">Range (Km)</TableHead>
                                                <TableHead className="font-bold">Total</TableHead>
                                                <TableHead className="text-right font-bold">Fuel (L)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {activeVehicleLogs.map(log => (
                                                <TableRow key={log.id}>
                                                    <TableCell className="whitespace-nowrap text-xs">{log.date}</TableCell>
                                                    <TableCell>
                                                        <p className="text-sm font-medium">{log.activityDescription}</p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="font-mono text-xs">{log.startKm} - {log.endKm}</p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="text-sm font-bold text-primary">{log.totalKm} Km</p>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <div className="flex items-center justify-end space-x-1">
                                                            <p className="text-sm">{log.fuelConsumed}</p>
                                                            <Fuel size={12} className="text-slate-400" />
                                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteTripLog(log.id)}>
                                                                <Trash2 size={14} />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {activeVehicleLogs.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="py-10 text-center">
                                                        <p className="text-gray-400">No logs found for this asset.</p>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}

                            {activeDetailTab === '2' && (
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <p className="text-sm font-bold">Maintenance History</p>
                                        <Button variant="outline" size="sm" onClick={handleOpenMaintenance}>
                                            <Plus size={14} className="mr-1" /> Add Maintenance
                                        </Button>
                                    </div>
                                    <Table>
                                        <TableHeader className="bg-muted">
                                            <TableRow>
                                                <TableHead className="font-bold">Date</TableHead>
                                                <TableHead className="font-bold">Type</TableHead>
                                                <TableHead className="font-bold">Description</TableHead>
                                                <TableHead className="font-bold">Cost</TableHead>
                                                <TableHead className="font-bold">Status</TableHead>
                                                <TableHead className="text-right font-bold">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {activeMaintenanceLogs.map(log => (
                                                <TableRow key={log.id}>
                                                    <TableCell className="whitespace-nowrap text-xs">{log.date}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="text-[10px]">{log.type}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="text-sm font-medium">{log.description}</p>
                                                        {log.technicianName && <p className="text-[10px] text-gray-500">Tech: {log.technicianName}</p>}
                                                    </TableCell>
<TableCell>
                                                        <p className="text-sm font-bold">{formatCurrency(log.cost || 0)}</p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={log.status === 'Completed' ? 'bg-green-100 text-green-700' : log.status === 'In Progress' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100'}>
                                                            {log.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteMaintenanceLog(log.id)}>
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {activeMaintenanceLogs.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="py-10 text-center">
                                                        <p className="text-gray-400">No maintenance records found.</p>
                                                        <Button variant="outline" size="sm" className="mt-2" onClick={handleOpenMaintenance}>
                                                            <Plus size={14} className="mr-1" /> Add First Maintenance
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </Card>
                    </div>
                ) : (
                    <div className="py-20 text-center text-gray-400">
                      <Signal size={60} className="opacity-10 mb-4 mx-auto"/>
                      <h6 className="text-lg">Select an asset to view telemetry</h6>
                    </div>
                )}
            </div>
        </div>

        {/* Register Asset Dialog */}
        <Dialog open={isRegModalOpen} onOpenChange={setIsRegModalOpen}>
            <DialogContent className="sm:max-w-[425px] p-0 rounded-xl">
                <DialogHeader className="bg-primary text-white p-4 rounded-t-xl">
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Truck size={20} /> Register Asset
                    </DialogTitle>
                </DialogHeader>
                <div className="p-4 space-y-4">
                                    <Label htmlFor="new-plate-number">Plate Number</Label>
                    <Input
                        id="new-plate-number"
                        value={newVehicle.plateNumber || ''}
                        onChange={(e) => setNewVehicle({...newVehicle, plateNumber: e.target.value})}
                        placeholder="e.g. Ba 2 Kha 1234"
                    />
                    <Label htmlFor="new-driver">Driver Name</Label>
<Input
                        id="new-driver"
                        value={newVehicle.driver || ''}
                        onChange={(e) => setNewVehicle({...newVehicle, driver: e.target.value})}
                        placeholder="e.g. Ram Bahadur"
                    />
                    <Label htmlFor="new-type">Type</Label>
                    <Select value={newVehicle.type} onValueChange={(value) => setNewVehicle({...newVehicle, type: value as any})}>
                        <SelectTrigger id="new-type">
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Tipper Truck">Tipper Truck</SelectItem>
                            <SelectItem value="Excavator">Excavator</SelectItem>
                            <SelectItem value="Motor Grader">Motor Grader</SelectItem>
                            <SelectItem value="Water Tanker">Water Tanker</SelectItem>
                            <SelectItem value="Roller">Static Roller</SelectItem>
                        </SelectContent>
                    </Select>
                    <Label htmlFor="new-status">Status</Label>
                    <Select value={newVehicle.status} onValueChange={(value) => setNewVehicle({...newVehicle, status: value as any})}>
                        <SelectTrigger id="new-status">
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Maintenance">Maintenance</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                    <Label htmlFor="new-agency">Assigned Agency/Contractor</Label>
                    <Select
                      value={newVehicle.agencyId || 'none'}
                      onValueChange={(value) => setNewVehicle({...newVehicle, agencyId: value === "none" ? undefined : value})}
                    >
                      <SelectTrigger id="new-agency">
                        <SelectValue placeholder="Select an agency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {project.agencies?.filter(a => a.type === 'agency' || a.type === 'subcontractor').map(agency => (
                          <SelectItem key={agency.id} value={agency.id}>{agency.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
                <DialogFooter className="bg-gray-50 px-4 py-3 sm:px-6 rounded-b-xl flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsRegModalOpen(false)}>
                        <X size={16} className="mr-2" /> Cancel
                    </Button>
                    <Button onClick={handleSaveVehicle}>
                        <Save size={16} className="mr-2" /> Save Asset
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Edit Vehicle Dialog */}
        <Dialog open={isEditVehicleModalOpen} onOpenChange={setIsEditVehicleModalOpen}>
            <DialogContent className="sm:max-w-[425px] p-0 rounded-xl">
                <DialogHeader className="bg-primary text-white p-4 rounded-t-xl">
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Edit size={20} /> Edit Asset
                    </DialogTitle>
                </DialogHeader>
                <div className="p-4 space-y-4">
                                    <Label htmlFor="edit-plate-number">Plate Number</Label>
                    <Input
                        id="edit-plate-number"
                        value={editingVehicle?.plateNumber || ''}
                        onChange={(e) => setEditingVehicle({...editingVehicle, plateNumber: e.target.value})}
                        placeholder="e.g. Ba 2 Kha 1234"
                    />
                    <Label htmlFor="edit-driver">Driver Name</Label>
<Input
                        id="edit-driver"
                        value={editingVehicle?.driver || ''}
                        onChange={(e) => setEditingVehicle({...editingVehicle, driver: e.target.value})}
                        placeholder="e.g. Ram Bahadur"
                    />
                    <Label htmlFor="edit-type">Type</Label>
                    <Select value={editingVehicle?.type || 'Tipper Truck'} onValueChange={(value) => setEditingVehicle({...editingVehicle, type: value as any})}>
                        <SelectTrigger id="edit-type">
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Tipper Truck">Tipper Truck</SelectItem>
                            <SelectItem value="Excavator">Excavator</SelectItem>
                            <SelectItem value="Motor Grader">Motor Grader</SelectItem>
                            <SelectItem value="Water Tanker">Water Tanker</SelectItem>
                            <SelectItem value="Roller">Static Roller</SelectItem>
                        </SelectContent>
                    </Select>
                    <Label htmlFor="edit-status">Status</Label>
                    <Select value={editingVehicle?.status || 'Active'} onValueChange={(value) => setEditingVehicle({...editingVehicle, status: value as any})}>
                        <SelectTrigger id="edit-status">
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Maintenance">Maintenance</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                    <Label htmlFor="edit-geofence-status">Geofence Status</Label>
                    <Select value={editingVehicle?.geofenceStatus || 'Inside'} onValueChange={(value) => setEditingVehicle({...editingVehicle, geofenceStatus: value as any})}>
                        <SelectTrigger id="edit-geofence-status">
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Inside">Inside</SelectItem>
                            <SelectItem value="Outside">Outside</SelectItem>
                        </SelectContent>
                    </Select>
                    <Label htmlFor="edit-agency">Assigned Agency/Contractor</Label>
                    <Select
                      value={editingVehicle?.agencyId || 'none'}
                      onValueChange={(value) => setEditingVehicle({...editingVehicle, agencyId: value === "none" ? undefined : value})}
                    >
                      <SelectTrigger id="edit-agency">
                        <SelectValue placeholder="Select an agency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {project.agencies?.filter(a => a.type === 'agency' || a.type === 'subcontractor').map(agency => (
                          <SelectItem key={agency.id} value={agency.id}>{agency.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
                <DialogFooter className="bg-gray-50 px-4 py-3 sm:px-6 rounded-b-xl flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsEditVehicleModalOpen(false)}>
                        <X size={16} className="mr-2" /> Cancel
                    </Button>
                    <Button onClick={handleUpdateVehicle}>
                        <Save size={16} className="mr-2" /> Update Asset
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

{/* Log Trip Dialog */}
        <Dialog open={isLogTripModalOpen} onOpenChange={setIsLogTripModalOpen}>
            <DialogContent className="sm:max-w-xl p-0 rounded-xl">
                <DialogHeader className="bg-primary text-white p-4 rounded-t-xl">
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Navigation size={20} /> Log Trip: {activeVehicle?.plateNumber}
                    </DialogTitle>
                </DialogHeader>
                <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div className="space-y-4">
                            <Label htmlFor="trip-date">Date</Label>
                            <div className="relative">
                                <Input 
                                    id="trip-date"
                                    type="date"
                                    value={tripForm.date} 
                                    onChange={e => setTripForm({...tripForm, date: e.target.value})} 
                                    className="pl-8"
                                />
                                <Calendar size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                            <Label htmlFor="start-odometer">Start Odometer</Label>
                            <div className="relative">
                                <Input 
                                    id="start-odometer"
                                    type="number"
                                    value={tripForm.startKm} 
                                    onChange={e => setTripForm({...tripForm, startKm: Number(e.target.value)})} 
                                    className="pr-8"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-400">Km</span>
                            </div>
                            <Label htmlFor="end-odometer">End Odometer</Label>
                            <div className="relative">
                                <Input 
                                    id="end-odometer"
                                    type="number"
                                    value={tripForm.endKm} 
                                    onChange={e => setTripForm({...tripForm, endKm: Number(e.target.value)})} 
                                    className="pr-8"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-400">Km</span>
                                <p className="text-xs text-gray-500 mt-1">Calculated: {Number(tripForm.endKm || 0) - Number(tripForm.startKm || 0)} Km</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <Label htmlFor="fuel-consumed">Fuel Consumed</Label>
                            <div className="relative">
                                <Input 
                                    id="fuel-consumed"
                                    type="number"
                                    value={tripForm.fuelConsumed} 
                                    onChange={e => setTripForm({...tripForm, fuelConsumed: Number(e.target.value)})} 
                                    className="pr-8"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-400">Liters</span>
                            </div>
                            <Label htmlFor="working-hours">Working Hours</Label>
                            <div className="relative">
                                <Input 
                                    id="working-hours"
                                    type="number"
                                    value={tripForm.workingHours} 
                                    onChange={e => setTripForm({...tripForm, workingHours: Number(e.target.value)})} 
                                    className="pr-8"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-slate-400">Hrs</span>
                            </div>
                            <Label htmlFor="activity-description">Activity / Task / Location</Label>
                            <textarea 
                                id="activity-description"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={tripForm.activityDescription} 
                                onChange={e => setTripForm({...tripForm, activityDescription: e.target.value})} 
                                placeholder="e.g. Shifting GSB KM 12-14"
                                rows={1}
                            ></textarea>
                        </div>
                    </div>
                    <div className="col-span-12 mt-6">
                        <Alert className="flex items-center gap-2 text-blue-800 bg-blue-50 border-blue-200">
                            <HardHat size={18}/>
                            This log will be appended to the asset's utilization history for operational reporting.
                        </Alert>
                    </div>
                </div>
                <DialogFooter className="bg-gray-50 px-4 py-3 sm:px-6 rounded-b-xl flex justify-end gap-2">
                    <Button variant="outline" onClick={() => {setIsLogTripModalOpen(false); setTripForm({ date: new Date().toISOString().split('T')[0], startKm: 0, endKm: 0, fuelConsumed: 0, workingHours: 0, activityDescription: '' });}}>
                        <X size={16} className="mr-2" /> Back
                    </Button>
                    <Button onClick={handleSaveTrip}>
                        <CheckCircle2 size={16} className="mr-2"/> Commit Trip Record
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Maintenance Dialog */}
        <Dialog open={isMaintenanceModalOpen} onOpenChange={setIsMaintenanceModalOpen}>
            <DialogContent className="sm:max-w-lg p-0 rounded-xl">
                <DialogHeader className="bg-amber-600 text-white p-4 rounded-t-xl">
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Wrench size={20} /> Schedule Maintenance
                    </DialogTitle>
                </DialogHeader>
                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="maint-date">Date</Label>
                            <Input 
                                id="maint-date"
                                type="date"
                                value={maintenanceForm.date} 
                                onChange={e => setMaintenanceForm({...maintenanceForm, date: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="maint-type">Maintenance Type</Label>
                            <Select 
                                value={maintenanceForm.type} 
                                onValueChange={value => setMaintenanceForm({...maintenanceForm, type: value as any})}
                            >
                                <SelectTrigger id="maint-type">
                                    <SelectValue placeholder="Select type" />
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
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="maint-description">Description <span className="text-red-500">*</span></Label>
                        <textarea 
                            id="maint-description"
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={maintenanceForm.description} 
                            onChange={e => setMaintenanceForm({...maintenanceForm, description: e.target.value})}
                            placeholder="Describe the maintenance work required..."
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="maint-cost">Estimated Cost</Label>
                            <Input 
                                id="maint-cost"
                                type="number"
                                value={maintenanceForm.cost} 
                                onChange={e => setMaintenanceForm({...maintenanceForm, cost: Number(e.target.value)})}
                                placeholder="0"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="maint-status">Status</Label>
                            <Select 
                                value={maintenanceForm.status} 
                                onValueChange={value => setMaintenanceForm({...maintenanceForm, status: value as any})}
                            >
                                <SelectTrigger id="maint-status">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                    <SelectItem value="Completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="maint-technician">Technician Name</Label>
                        <Input 
                            id="maint-technician"
                            value={maintenanceForm.technicianName || ''}
                            onChange={e => setMaintenanceForm({...maintenanceForm, technicianName: e.target.value})}
                            placeholder="e.g. John Doe"
                        />
                    </div>
                    <Alert className="flex items-center gap-2 text-amber-800 bg-amber-50 border-amber-200">
                        <AlertTriangle size={18}/>
                        Recording maintenance helps track vehicle health and service history.
                    </Alert>
                </div>
                <DialogFooter className="bg-gray-50 px-4 py-3 sm:px-6 rounded-b-xl flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsMaintenanceModalOpen(false)}>
                        <X size={16} className="mr-2" /> Cancel
                    </Button>
                    <Button onClick={handleSaveMaintenance}>
                        <Save size={16} className="mr-2" /> Save Record
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
};

export default FleetModule;

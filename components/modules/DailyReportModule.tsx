import React, { useState, useMemo, useEffect } from 'react';
import { Project, UserRole, DailyWorkItem, StructureAsset, StructureComponent, SitePhoto, InventoryItem, DailyReport } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { Users, Activity, FileText, Trash2, Plus, Printer, CheckCircle, X, Hammer, Layers, AlertCircle, MapPin, Hash, Info, CloudSun, RefreshCw, Wifi, WifiOff, Calendar, Thermometer, CloudRain, Sun, Cloud, Wind, Eye, User, Truck, Package, HelpCircle } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Badge } from '~/components/ui/badge';
import { Textarea } from '~/components/ui/textarea';

interface Props {
  project: Project;
  userRole: UserRole;
  onProjectUpdate: (project: Project) => void;
}

const DailyReportModule: React.FC<Props> = ({ project, userRole, onProjectUpdate }) => {
  const { userName } = useAuth();
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [weather, setWeather] = useState('Sunny');
  const [activeTab, setActiveTab] = useState(0);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);

  // Validation states
  const [errors, setErrors] = useState({
    reportDate: '',
    submittedBy: '',
    receivedBy: '',
    workItems: []
  });

  const [workItemsToday, setWorkItemsToday] = useState<DailyWorkItem[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Additional fields for Daily Site Report
  const [rainfall, setRainfall] = useState('');
  const [temperatureMin, setTemperatureMin] = useState('');
  const [temperatureMax, setTemperatureMax] = useState('');
  const [visitors, setVisitors] = useState([{ id: Date.now().toString(), name: '', organization: '' }]);
  const [materials, setMaterials] = useState([{ id: Date.now().toString(), material: '', stockQty: '', deliverQty: '', consumeQty: '' }]);
  const [remarks, setRemarks] = useState(['']);
  const [submittedBy, setSubmittedBy] = useState(userName || '');
  const [receivedBy, setReceivedBy] = useState('');

  // Update submittedBy when userName is available
  useEffect(() => {
    if (userName && !submittedBy) {
      setSubmittedBy(userName);
    }
  }, [userName, submittedBy]);

  // Update submittedBy when userName is available
  useEffect(() => {
    if (userName && !submittedBy) {
      setSubmittedBy(userName);
    }
  }, [userName, submittedBy]);

  // Update online status when it changes
  useEffect(() => {
    const handleOnlineStatusChange = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);

    return () => {
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
    };
  }, []);

  const handleAddWorkToday = () => {
      const newWorkItem = { id: Date.now().toString(), location: '', quantity: 0, description: '' };
      setWorkItemsToday([...workItemsToday, newWorkItem]);
  };

  const handleFetchWeather = async () => {
      setIsFetchingWeather(true);
      try {
          const lat = project.staffLocations?.[0]?.latitude || 27.6600;
          const lng = project.staffLocations?.[0]?.longitude || 83.4650;
          // Mock weather fetch for now
          setWeather('Sunny');
      } finally {
          setIsFetchingWeather(false);
      }
  };

  const updateWorkToday = (index: number, field: string, value: any) => {
      const updated = [...workItemsToday];
      updated[index] = { ...updated[index], [field]: value };
      setWorkItemsToday(updated);
  };

  const canDelete = userRole === UserRole.ADMIN || userRole === UserRole.PROJECT_MANAGER;

  const removeWorkToday = (index: number) => {
      if (!canDelete) {
          alert('Only Admin and Project Manager can delete daily work entries');
          return;
      }

      setWorkItemsToday(workItemsToday.filter((_, i) => i !== index));
  };

  const handleFinalizeReport = (e?: React.FormEvent) => {
      e?.preventDefault();
      // Validate required fields
      let isValid = true;
      const newErrors = {
        reportDate: reportDate ? '' : 'Report date is required',
        submittedBy: submittedBy ? '' : 'Submitted by is required',
        receivedBy: receivedBy ? '' : 'Received by is required',
        workItems: Array(workItemsToday.length).fill({})
      };

      // Validate work items
      workItemsToday.forEach((item, i) => {
        const itemErrors: any = {};
        if (!item.description?.trim()) {
          itemErrors.description = 'Description is required';
          isValid = false;
        }
        if (!item.assetId) {
          itemErrors.assetId = 'Structure is required';
          isValid = false;
        }
        if (!item.componentId) {
          itemErrors.componentId = 'Component is required';
          isValid = false;
        }
        if (item.quantity <= 0) {
          itemErrors.quantity = 'Quantity must be greater than 0';
          isValid = false;
        }
        newErrors.workItems[i] = itemErrors;
      });

      if (workItemsToday.length === 0) {
        alert("Please add at least one work entry.");
        return;
      }

      setErrors(newErrors);

      if (isValid) {
        const newReport: DailyReport = {
          id: `report-${Date.now()}`,
          date: reportDate,
          reportNumber: `DPR-${reportDate.replace(/-/g, '')}`,
          status: 'Submitted',
          submittedBy: submittedBy,
          weather: weather,
          remarks: remarks.filter(r => r.trim()).join('\n'),
          workToday: workItemsToday,
          workItems: workItemsToday // Keep both for compatibility
        };

        // Update project with the new report
        const updatedReports = [...(project.dailyReports || []), newReport];
        
        // Also update the physical progress of the components
        let updatedStructures = [...(project.structures || [])];
        
        workItemsToday.forEach(item => {
          updatedStructures = updatedStructures.map(s => {
            if (s.id === item.assetId) {
              const updatedComponents = s.components.map(c => {
                if (c.id === item.componentId) {
                  return {
                    ...c,
                    completedQuantity: (c.completedQuantity || 0) + item.quantity,
                    updatedAt: new Date().toISOString()
                  };
                }
                return c;
              });
              return { ...s, components: updatedComponents, updatedAt: new Date().toISOString() };
            }
            return s;
          });
        });

        onProjectUpdate({
          ...project,
          dailyReports: updatedReports,
          structures: updatedStructures
        });

        alert("Report submitted successfully! Physical progress has been updated in linked assets.");
        
        // Reset form
        setWorkItemsToday([]);
        setRemarks(['']);
        setVisitors([{ id: Date.now().toString(), name: '', organization: '' }]);
      } else {
        alert("Please fix the validation errors before submitting.");
      }
  };

  return (
    <div className="animate-in fade-in duration-300">
      <form onSubmit={handleFinalizeReport}>
        <div className="flex justify-between mb-4 items-center">
            <div>
                <h1 className="text-2xl font-black text-foreground">Daily Site Operations (DPR)</h1>
                <p className="text-sm text-muted-foreground">Execution logging and resource allocation oversight</p>
            </div>
            <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setPrintModalOpen(true)} className="rounded-lg">
                    <Printer className="w-4 h-4 mr-2" />
                    Print Official Form
                </Button>

                <Dialog open={printModalOpen} onOpenChange={setPrintModalOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Daily Site Report - Print Preview</DialogTitle>
                        </DialogHeader>
                        <div className="p-6 print-container">
                            {/* Print Header */}
                            <div className="flex justify-between mb-6 pb-4 border-b-2 border-black">
                                <div>
                                    <h1 className="text-3xl font-bold">DAILY SITE REPORT</h1>
                                    <h2 className="text-xl text-muted-foreground">Project: {project.name}</h2>
                                    <p className="text-sm">Report Date: {reportDate}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm">Report No: DPR-{reportDate.replace(/-/g, '')}</p>
                                    <p className="text-sm">Location: {project.location}</p>
                                </div>
                            </div>

                            {/* Weather Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <h3 className="text-lg font-bold mb-2">Weather Conditions</h3>
                                    <p className="text-base">Condition: {weather}</p>
                                    {rainfall && <p className="text-base">Rainfall: {rainfall} mm</p>}
                                    {(temperatureMin || temperatureMax) && (
                                        <p className="text-base">
                                            Temperature: Min {temperatureMin || 'N/A'}°C / Max {temperatureMax || 'N/A'}°C
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold mb-2">Project Team Present</h3>
                                    <p className="text-base">Site Engineer: N/A</p>
                                    <p className="text-base">Project Manager: {project.projectManager || 'N/A'}</p>
                                </div>
                            </div>

                            {/* Work Items Section */}
                            <div className="mb-6">
                                <h3 className="text-lg font-bold mb-2">Execution Logging</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Structure</TableHead>
                                            <TableHead>Component</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Quantity</TableHead>
                                            <TableHead>Location (Chainage)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {workItemsToday.map((item, i) => {
                                            const asset = project.structures?.find(s => s.id === item.assetId);
                                            const component = asset?.components.find(c => c.id === item.componentId);
                                            return (
                                                <TableRow key={item.id}>
                                                    <TableCell>{asset?.name || ''}</TableCell>
                                                    <TableCell>{component?.name || ''}</TableCell>
                                                    <TableCell>{item.description}</TableCell>
                                                    <TableCell>{item.quantity}</TableCell>
                                                    <TableCell>{item.location}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Signatures */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                                <div className="text-center pt-16">
                                    <div className="h-16 border border-gray-400 w-4/5 mx-auto mb-2"></div>
                                    <p className="text-base">Submitted By (Contractor)</p>
                                    <p className="text-xs">{submittedBy || '_________________________'}</p>
                                </div>
                                <div className="text-center pt-16">
                                    <div className="h-16 border border-gray-400 w-4/5 mx-auto mb-2"></div>
                                    <p className="text-base">Received By (Engineer)</p>
                                    <p className="text-xs">{receivedBy || '_________________________'}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button type="button" onClick={() => setPrintModalOpen(false)}>Close</Button>
                            <Button type="button" onClick={() => window.print()}>
                                <Printer className="w-4 h-4 mr-2" />
                                Print Report
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                <Button type="submit" variant="default" className="rounded-lg">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Submit & Sync Data
                </Button>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-800">
                    <Wifi className="w-4 h-4" />
                    <span className="text-sm font-semibold">Online</span>
                </div>
            </div>
        </div>

        <Card className="p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div>
                    <Label htmlFor="report-date" className={errors.reportDate ? "text-destructive" : ""}>Site Date</Label>
                    <Input
                        id="report-date"
                        type="date"
                        value={reportDate}
                        onChange={e => setReportDate(e.target.value)}
                        className={errors.reportDate ? "border-destructive" : ""}
                    />
                    {errors.reportDate && <p className="text-xs text-destructive mt-1">{errors.reportDate}</p>}
                </div>
                <div className="flex gap-2">
                    <Select value={weather} onValueChange={setWeather}>
                        <SelectTrigger>
                            <SelectValue placeholder="Weather Context" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Sunny">Clear / Sunny</SelectItem>
                            <SelectItem value="Cloudy">Partly Cloudy</SelectItem>
                            <SelectItem value="Rainy">Inclement Weather (Rainy)</SelectItem>
                            <SelectItem value="Foggy">Low Visibility (Foggy)</SelectItem>
                            <SelectItem value="Windy">Windy</SelectItem>
                            <SelectItem value="Dusty">Dusty</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleFetchWeather}
                        disabled={isFetchingWeather}
                    >
                        <CloudSun className="w-5 h-5" />
                    </Button>
                </div>
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Info</AlertTitle>
                    <AlertDescription>
                        Linked DPR entries update structural asset progress and BOQ completion.
                    </AlertDescription>
                </Alert>
            </div>
        </Card>

        <Card className="p-6 mb-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Visitors on Site
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {visitors.map((visitor, index) => (
                        <React.Fragment key={visitor.id}>
                            <div className="md:col-span-5">
                                <Label>Name</Label>
                                <Input
                                    value={visitor.name}
                                    onChange={e => {
                                        const updated = [...visitors];
                                        updated[index] = { ...updated[index], name: e.target.value };
                                        setVisitors(updated);
                                    }}
                                />
                            </div>
                            <div className="md:col-span-5">
                                <Label>Organization</Label>
                                <Input
                                    value={visitor.organization}
                                    onChange={e => {
                                        const updated = [...visitors];
                                        updated[index] = { ...updated[index], organization: e.target.value };
                                        setVisitors(updated);
                                    }}
                                />
                            </div>
                            <div className="md:col-span-2 flex items-end gap-2">
                                {index > 0 && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        onClick={() => setVisitors(visitors.filter((_, i) => i !== index))}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                                {index === visitors.length - 1 && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setVisitors([...visitors, { id: Date.now().toString(), name: '', organization: '' }])}
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </React.Fragment>
                    ))}
                </div>
            </CardContent>
        </Card>

        <Card className="overflow-hidden">
            <Tabs value={activeTab.toString()} onValueChange={(value) => setActiveTab(parseInt(value))} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="0" className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Execution Logging
                    </TabsTrigger>
                    <TabsTrigger value="1" className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Manpower & Fleet
                    </TabsTrigger>
                    <TabsTrigger value="2" className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Description & Remarks
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="0" className="p-6">
                    <div className="space-y-4">
                        {workItemsToday.map((item, i) => {
                            const asset = project.structures?.find(s => s.id === item.assetId);
                            const availableComponents = asset?.components || [];
                            return (
                                <Card key={item.id} className="p-4">
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                        <div className="md:col-span-4 space-y-4">
                                            <div>
                                                <Label className={errors.workItems[i]?.assetId ? "text-destructive" : ""}>Target Structure</Label>
                                                <Select
                                                    value={item.assetId || ''}
                                                    onValueChange={(value) => updateWorkToday(i, 'assetId', value)}
                                                >
                                                    <SelectTrigger className={errors.workItems[i]?.assetId ? "border-destructive" : ""}>
                                                        <SelectValue placeholder="Select structure" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {(project.structures || []).map(s =>
                                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                {errors.workItems[i]?.assetId && <p className="text-xs text-destructive mt-1">{errors.workItems[i].assetId}</p>}
                                            </div>
                                            <div>
                                                <Label className={errors.workItems[i]?.componentId ? "text-destructive" : ""}>Component</Label>
                                                <Select
                                                    value={item.componentId || ''}
                                                    onValueChange={(value) => updateWorkToday(i, 'componentId', value)}
                                                    disabled={!item.assetId}
                                                >
                                                    <SelectTrigger className={errors.workItems[i]?.componentId ? "border-destructive" : ""}>
                                                        <SelectValue placeholder="Select component" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {availableComponents.map(c =>
                                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                {errors.workItems[i]?.componentId && <p className="text-xs text-destructive mt-1">{errors.workItems[i].componentId}</p>}
                                            </div>
                                        </div>
                                        <div className="md:col-span-6 space-y-4">
                                            <div>
                                                <Label className={errors.workItems[i]?.description ? "text-destructive" : ""}>Detailed Work Description</Label>
                                                <Textarea
                                                    value={item.description}
                                                    onChange={e => updateWorkToday(i, 'description', e.target.value)}
                                                    className={errors.workItems[i]?.description ? "border-destructive" : ""}
                                                />
                                                {errors.workItems[i]?.description && <p className="text-xs text-destructive mt-1">{errors.workItems[i].description}</p>}
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label className={errors.workItems[i]?.quantity ? "text-destructive" : ""}>Qty</Label>
                                                    <Input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={e => updateWorkToday(i, 'quantity', Number(e.target.value))}
                                                        className={errors.workItems[i]?.quantity ? "border-destructive" : ""}
                                                    />
                                                    {errors.workItems[i]?.quantity && <p className="text-xs text-destructive mt-1">{errors.workItems[i].quantity}</p>}
                                                </div>
                                                <div>
                                                    <Label>Chainage</Label>
                                                    <Input
                                                        value={item.location}
                                                        onChange={e => updateWorkToday(i, 'location', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 flex justify-end items-center">
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="icon"
                                                onClick={() => removeWorkToday(i)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                        <Button type="button" variant="outline" onClick={handleAddWorkToday} className="w-full border-dashed">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Another Entry
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="1" className="p-6">
                    <h3 className="text-lg font-bold mb-4">Manpower & Fleet Tracking</h3>
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Coming Soon</AlertTitle>
                        <AlertDescription>
                            Manpower and fleet tracking functionality coming soon.
                        </AlertDescription>
                    </Alert>
                </TabsContent>

                <TabsContent value="2" className="p-6">
                    <h3 className="text-lg font-bold mb-4">Description of Works Done & Remarks</h3>

                    <Card className="p-4 mb-4">
                        <h4 className="font-semibold mb-2">Description of Works Done</h4>
                        <Textarea
                            placeholder="Sample collection for Test performance, etc."
                            value={workItemsToday.map(item => item.description).join('\n')}
                            onChange={e => {
                                const descriptions = e.target.value.split('\n');
                                const updated = [...workItemsToday];
                                for (let i = 0; i < updated.length; i++) {
                                    if (descriptions[i]) {
                                        updated[i] = { ...updated[i], description: descriptions[i] };
                                    }
                                }
                                setWorkItemsToday(updated);
                            }}
                            rows={4}
                        />
                    </Card>

                    <Card className="p-4 mb-4">
                        <h4 className="font-semibold mb-2">Remarks</h4>
                        {remarks.map((remark, index) => (
                            <div key={index} className="mb-4">
                                <Textarea
                                    placeholder={`Remark ${index + 1}...`}
                                    value={remark}
                                    onChange={e => {
                                        const updated = [...remarks];
                                        updated[index] = e.target.value;
                                        setRemarks(updated);
                                    }}
                                    rows={2}
                                />
                            </div>
                        ))}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setRemarks([...remarks, ''])}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Remark
                        </Button>
                    </Card>

                    <Card className="p-4">
                        <h4 className="font-semibold mb-4">Submission</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label className={errors.submittedBy ? "text-destructive" : ""}>Submitted By (Contractor)</Label>
                                <Input
                                    value={submittedBy}
                                    onChange={e => setSubmittedBy(e.target.value)}
                                    className={errors.submittedBy ? "border-destructive" : ""}
                                />
                                {errors.submittedBy && <p className="text-xs text-destructive mt-1">{errors.submittedBy}</p>}
                            </div>
                            <div>
                                <Label className={errors.receivedBy ? "text-destructive" : ""}>Received By (Engineer)</Label>
                                <Input
                                    value={receivedBy}
                                    onChange={e => setReceivedBy(e.target.value)}
                                    className={errors.receivedBy ? "border-destructive" : ""}
                                />
                                {errors.receivedBy && <p className="text-xs text-destructive mt-1">{errors.receivedBy}</p>}
                            </div>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>
        </Card>
      </form>
    </div>
  );
};

export default DailyReportModule;

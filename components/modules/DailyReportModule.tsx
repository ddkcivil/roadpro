import React, { useState, useEffect, useRef } from 'react';
import { Project, UserRole, DailyWorkItem, DailyReport, PlantEquipment, MaterialEntry, PersonnelEntry, RoadWorkEntry } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useArrayUpdater } from '../../hooks/useArrayUpdater';
import { useFormElements } from '../../hooks/useFormElements';
import { DeleteButton } from '../common/DeleteButton';
import { AddButton } from '../common/AddButton';
import { 
    Activity, FileText, Trash2, Plus, Printer, CheckCircle, Info, 
    CloudSun, Wifi, User, Users, AlertCircle, Eye, ArrowLeft, 
    Sun, Cloud, CloudRain, BookOpen, Search, Truck, Package, MapPin, Clock, AlertTriangle,
    Thermometer, Droplets, Pen, Download, Calendar
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Textarea } from '~/components/ui/textarea';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';

interface Props {
    project: Project;
    userRole: UserRole;
    onProjectUpdate: (project: Project) => void;
    initialView?: 'list' | 'create';
    hideHeader?: boolean;
}

interface ValidationError {
    reportDate: string;
    submittedBy: string;
    receivedBy: string;
    workItems: Array<{
        assetId?: string;
        componentId?: string;
        description?: string;
        quantity?: string;
    }>;
}

const DailyReportModule: React.FC<Props> = ({ 
    project, 
    userRole, 
    onProjectUpdate, 
    initialView = 'create',
    hideHeader = false 
}) => {
    const { userName } = useAuth();
    const [view, setView] = useState<'list' | 'create' | 'view'>(initialView);
    const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
    
// Enhanced DPR Features from PHP daily_log
    const [temperature, setTemperature] = useState('');
    const [humidity, setHumidity] = useState('');
    const [delayedReport, setDelayedReport] = useState('');
    const [othersIfAny, setOthersIfAny] = useState('');
    const [workCompleted, setWorkCompleted] = useState('');
    
    // Road Works (Multi-road with chainage)
    const [roadWorks, setRoadWorks] = useState<RoadWorkEntry[]>([
        { id: Date.now().toString(), roadName: '', description: '', chainage: '', estQty: '', manpower: '' }
    ]);
    
// Plant & Equipment - refactored with useArrayUpdater hook
    const { array: plantEquipment, setArray: setPlantEquipment, updateAt: updatePlantAt, removeAt: removePlantAt, addNew: addPlant } = useArrayUpdater<PlantEquipment>(
        [{ id: Date.now().toString(), description: '', working: 0, standby: 0, breakdown: 0, total: 0 }],
        () => ({ id: Date.now().toString(), description: '', working: 0, standby: 0, breakdown: 0, total: 0 })
    );

    // Helper to update plant equipment with auto-total calculation
    const updatePlantEquipment = (index: number, field: keyof PlantEquipment, value: any) => {
        const updated = [...plantEquipment];
        updated[index] = { ...updated[index], [field]: value };
        // Auto-calculate total
        if (['working', 'standby', 'breakdown'].includes(field)) {
            updated[index].total = updated[index].working + updated[index].standby + updated[index].breakdown;
        }
        setPlantEquipment(updated);
    };
    
// Materials - refactored with useArrayUpdater hook
    const { array: materialsUsed, setArray: setMaterialsUsed, updateAt: updateMaterialAt, removeAt: removeMaterialAt, addNew: addMaterial } = useArrayUpdater<MaterialEntry>(
        [{ id: Date.now().toString(), name: '', unit: '', quantity: 0 }],
        () => ({ id: Date.now().toString(), name: '', unit: '', quantity: 0 })
    );
    
// Personnel - refactored with useArrayUpdater hook
    const { array: personnelUsed, setArray: setPersonnelUsed, updateAt: updatePersonnelAt, removeAt: removePersonnelAt, addNew: addPersonnel } = useArrayUpdater<PersonnelEntry>(
        [{ id: Date.now().toString(), designation: '', nos: 0, status: 'Present' }],
        () => ({ id: Date.now().toString(), designation: '', nos: 0, status: 'Present' })
    );

    // Create form states
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [weather, setWeather] = useState('Sunny');
    const [activeTab, setActiveTab] = useState(0);
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [isFetchingWeather, setIsFetchingWeather] = useState(false);
// Work Items - refactored with useArrayUpdater hook
    const { array: workItemsToday, setArray: setWorkItemsToday, updateAt: updateWorkToday, removeAt: removeWorkToday, addNew: addWorkItem } = useArrayUpdater<DailyWorkItem>(
        [],
        () => ({ id: Date.now().toString(), location: '', quantity: 0, description: '' })
    );
    
// Visitors section - refactored with useFormElements hook
    const { items: visitors, setItems: setVisitors, updateField: updateVisitorField, removeItem: removeVisitor, addItem: addVisitor } = useFormElements<{ id: string; name: string; organization: string }>(
        () => ({ id: Date.now().toString(), name: '', organization: '' })
    );
    
// Remarks section - refactored with simple state (useFormElements needs object type)
    const [remarks, setRemarks] = useState<string[]>(['']);
const [submittedBy, setSubmittedBy] = useState(userName || '');
    const [receivedBy, setReceivedBy] = useState('');

    // Date filter for list view
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Validation states
    const [errors, setErrors] = useState<ValidationError>({
        reportDate: '',
        submittedBy: '',
        receivedBy: '',
        workItems: []
    });

    useEffect(() => {
        if (userName && !submittedBy) {
            setSubmittedBy(userName);
        }
    }, [userName, submittedBy]);

// Use addWorkItem from hook instead of inline handler

// Fetch weather from Open-Meteo API (Butwal, Nepal coordinates)
    const handleFetchWeather = async () => {
        setIsFetchingWeather(true);
        try {
            // Butwal coordinates: lat 27.7000, lng 83.4500
            const latitude = project.lat || 27.7000;
            const longitude = project.lng || 83.4500;
            
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code`
            );
            
            if (response.ok) {
                const data = await response.json();
                if (data.current) {
                    const temp = data.current.temperature_2m;
                    const humidity = data.current.relative_humidity_2m;
                    const code = data.current.weather_code;
                    
                    setTemperature(`${temp.toFixed(1)}°C`);
                    setHumidity(`${humidity}%`);
                    
                    // Map weather code to weather condition
                    if ([0, 1].includes(code)) {
                        setWeather('Sunny');
                    } else if ([2, 3, 45, 48].includes(code)) {
                        setWeather('Cloudy');
                    } else {
                        setWeather('Rainy');
                    }
                }
            }
        } catch (error) {
            console.error('Weather fetch error:', error);
            setWeather('Sunny'); // fallback
        } finally {
            setIsFetchingWeather(false);
        }
    };

const canDelete = userRole === UserRole.ADMIN || userRole === UserRole.PROJECT_MANAGER;

    // Wrapper for removeWorkToday with permission check
    const handleRemoveWorkToday = (index: number) => {
        if (!canDelete) {
            alert('Only Admin and Project Manager can delete daily work entries');
            return;
        }
        removeWorkToday(index);
    };

    const handleFinalizeReport = (e?: React.FormEvent) => {
        e?.preventDefault();
        let isValid = true;
        const newErrors: ValidationError = {
            reportDate: reportDate ? '' : 'Report date is required',
            submittedBy: submittedBy ? '' : 'Submitted by is required',
            receivedBy: receivedBy ? '' : 'Received by is required',
            workItems: Array(workItemsToday.length).fill({})
        };

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
                workToday: workItemsToday
            };

            const updatedReports = [...(project.dailyReports || []), newReport];
            let updatedStructures = [...(project.structures || [])];

            workItemsToday.forEach(item => {
                updatedStructures = updatedStructures.map(s => {
                    if (s.id === item.assetId) {
                        const updatedComponents = s.components.map(c => {
                            if (c.id === item.componentId) {
                                return {
                                    ...c,
                                    completedQuantity: (c.completedQuantity || 0) + (item.quantity || 0),
                                    lastUpdated: new Date().toISOString()
                                };
                            }
                            return c;
                        });
                        return { ...s, components: updatedComponents, lastUpdated: new Date().toISOString() };
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
            
            // Reset and go to list
            setWorkItemsToday([]);
            setRemarks(['']);
            setVisitors([{ id: Date.now().toString(), name: '', organization: '' }]);
            setView('list');
        } else {
            alert("Please fix the validation errors before submitting.");
        }
    };

    const renderListView = () => {
        const dailyReports = project.dailyReports || [];
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search reports by ID or date..." className="pl-8" />
                    </div>
                    <Button onClick={() => setView('create')}>
                        <Plus className="mr-2 h-4 w-4" /> New Report
                    </Button>
                </div>
                
                <Card className="p-0 overflow-hidden">
                    <ScrollArea className="h-[500px] w-full border-none">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>Date / ID</TableHead>
                                    <TableHead>Weather</TableHead>
                                    <TableHead>Work Summary</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dailyReports.length > 0 ? [...dailyReports].reverse().map((report: DailyReport) => (
                                    <TableRow key={report.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell>
                                            <p className="font-bold">{report.date}</p>
                                            <p className="text-[10px] text-muted-foreground font-mono">{report.reportNumber || report.id}</p>
                                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                                <User className="h-3 w-3" /> {report.submittedBy}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {report.weather === 'Sunny' && <Sun className="h-4 w-4 text-orange-500" />}
                                                {report.weather === 'Cloudy' && <Cloud className="h-4 w-4 text-slate-400" />}
                                                {report.weather === 'Rainy' && <CloudRain className="h-4 w-4 text-blue-500" />}
                                                <span className="text-xs font-medium">{report.weather}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="max-w-xs">
                                                <p className="text-sm font-medium line-clamp-1">
                                                    {(report.workToday || []).length} work items logged
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {(report.workToday || []).map(w => w.description).join(', ')}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={report.status === 'Submitted' ? 'success' : 'outline' as any}>
                                                {report.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => { setSelectedReport(report); setView('view'); }}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => { setSelectedReport(report); setPrintModalOpen(true); }}>
                                                    <Printer className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                            <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                            <p className="font-bold">No daily reports found.</p>
                                            <p className="text-sm">Start by creating your first site report.</p>
                                            <Button variant="outline" className="mt-4" onClick={() => setView('create')}>
                                                <Plus className="mr-2 h-4 w-4" /> Create First Report
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </Card>
            </div>
        );
    };

    const renderViewMode = () => {
        if (!selectedReport) return null;
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={() => setView('list')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to History
                    </Button>
                    <Button onClick={() => setPrintModalOpen(true)}>
                        <Printer className="mr-2 h-4 w-4" /> Print Report
                    </Button>
                </div>

                <Card className="border-2">
                    <CardHeader className="bg-muted/30 border-b">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-2xl font-black">Report: {selectedReport.reportNumber || selectedReport.id}</CardTitle>
                                <p className="text-muted-foreground font-bold">Project: {project.name}</p>
                            </div>
                            <div className="text-right">
                                <Badge className="mb-2">{selectedReport.status}</Badge>
                                <p className="text-sm font-bold">{selectedReport.date}</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <div className="space-y-4">
                                <h3 className="font-black text-sm uppercase tracking-widest text-slate-400">Environment</h3>
                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                                    <div className="h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                                        {selectedReport.weather === 'Sunny' ? <Sun className="text-orange-500" /> : <Cloud className="text-slate-400" />}
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900">{selectedReport.weather}</p>
                                        <p className="text-xs font-bold text-slate-500 uppercase">Site Condition</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h3 className="font-black text-sm uppercase tracking-widest text-slate-400">Personnel</h3>
                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                                    <div className="h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                                        <User className="text-indigo-500" />
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900">{selectedReport.submittedBy}</p>
                                        <p className="text-xs font-bold text-slate-500 uppercase">Field Engineer</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator className="my-8" />

                        <div className="space-y-4">
                            <h3 className="font-black text-sm uppercase tracking-widest text-slate-400">Execution Log</h3>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead className="font-black uppercase text-[10px]">Structure / Asset</TableHead>
                                        <TableHead className="font-black uppercase text-[10px]">Work Item</TableHead>
                                        <TableHead className="font-black uppercase text-[10px]">Quantity</TableHead>
                                        <TableHead className="font-black uppercase text-[10px]">Location</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(selectedReport.workToday || []).map((work, idx) => {
                                        const asset = project.structures?.find(s => s.id === work.assetId);
                                        const comp = asset?.components?.find(c => c.id === work.componentId);
                                        return (
                                            <TableRow key={idx}>
                                                <TableCell className="font-bold">{asset?.name || 'General'}</TableCell>
                                                <TableCell>
                                                    <p className="font-bold">{comp?.name || 'N/A'}</p>
                                                    <p className="text-xs text-muted-foreground">{work.description}</p>
                                                </TableCell>
                                                <TableCell className="font-mono font-bold">{work.quantity}</TableCell>
                                                <TableCell className="text-xs font-medium">{work.location || 'Site Wide'}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {selectedReport.remarks && (
                            <div className="mt-8 p-6 bg-indigo-50/50 rounded-2xl border-2 border-indigo-100">
                                <h3 className="font-black text-sm uppercase tracking-widest text-indigo-400 mb-2">Remarks & Observations</h3>
                                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedReport.remarks}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    };

    const renderCreateForm = () => {
        return (
            <form onSubmit={handleFinalizeReport}>
                <div className="flex justify-between mb-4 items-center">
                    {initialView === 'list' && (
                        <Button type="button" variant="ghost" onClick={() => setView('list')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
                        </Button>
                    )}
                    <div className="ml-auto flex gap-2">
                        <Button type="button" variant="outline" onClick={() => setPrintModalOpen(true)} className="rounded-lg">
                            <Printer className="w-4 h-4 mr-2" />
                            Preview Form
                        </Button>
                        <Button type="submit" variant="default" className="bg-indigo-600 hover:bg-indigo-700 font-bold rounded-lg shadow-lg shadow-indigo-600/20">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Submit & Sync
                        </Button>
                    </div>
                </div>

                <Card className="p-6 mb-6 border-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <div>
                            <Label htmlFor="report-date" className={`font-black text-[10px] uppercase tracking-widest ${errors.reportDate ? "text-destructive" : "text-slate-500"}`}>Site Date</Label>
                            <Input
                                id="report-date"
                                type="date"
                                value={reportDate}
                                onChange={e => setReportDate(e.target.value)}
                                className={`rounded-xl border-2 font-bold ${errors.reportDate ? "border-destructive" : ""}`}
                            />
                            {errors.reportDate && <p className="text-xs text-destructive mt-1 font-bold">{errors.reportDate}</p>}
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Label className="font-black text-[10px] uppercase tracking-widest text-slate-500">Weather Context</Label>
                                <Select value={weather} onValueChange={setWeather}>
                                    <SelectTrigger className="rounded-xl border-2 font-bold">
                                        <SelectValue placeholder="Weather" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Sunny" className="font-bold">Clear / Sunny</SelectItem>
                                        <SelectItem value="Cloudy" className="font-bold">Partly Cloudy</SelectItem>
                                        <SelectItem value="Rainy" className="font-bold">Inclement (Rainy)</SelectItem>
                                        <SelectItem value="Foggy" className="font-bold">Low Visibility (Foggy)</SelectItem>
                                        <SelectItem value="Windy" className="font-bold">Windy</SelectItem>
                                        <SelectItem value="Dusty" className="font-bold">Dusty</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-end pb-0.5">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={handleFetchWeather}
                                    disabled={isFetchingWeather}
                                    className="rounded-xl border-2 h-10 w-10"
                                >
                                    <CloudSun className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                        <Alert className="bg-indigo-50 border-indigo-100">
                            <Info className="h-4 w-4 text-indigo-500" />
                            <AlertTitle className="text-indigo-700 font-bold">Linked Reporting</AlertTitle>
                            <AlertDescription className="text-indigo-600 text-xs">
                                entries update structural asset progress and BOQ completion automatically.
                            </AlertDescription>
                        </Alert>
                    </div>
                </Card>

<Card className="p-6 mb-6 border-2">
                    <CardHeader className="px-0 pt-0">
                        <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest font-black text-slate-400">
                            <User className="w-4 h-4" />
                            Visitors on Site
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-0 pb-0">
                        <div className="space-y-4">
                            {visitors.map((visitor, index) => (
                                <div key={visitor.id} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                    <div className="md:col-span-5">
                                        <Label className="font-black text-[10px] uppercase text-slate-500">Name</Label>
                                        <Input
                                            value={visitor.name}
                                            placeholder="e.g. John Doe"
                                            className="rounded-xl border-2 font-bold"
                                            onChange={e => updateVisitorField(index, 'name', e.target.value)}
                                        />
                                    </div>
                                    <div className="md:col-span-5">
                                        <Label className="font-black text-[10px] uppercase text-slate-500">Organization</Label>
                                        <Input
                                            value={visitor.organization}
                                            placeholder="e.g. DoR, ADB"
                                            className="rounded-xl border-2 font-bold"
                                            onChange={e => updateVisitorField(index, 'organization', e.target.value)}
                                        />
                                    </div>
                                    <div className="md:col-span-2 flex items-end gap-2">
                                        {index > 0 && (
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="icon"
                                                className="rounded-xl h-10 w-10"
                                                onClick={() => removeVisitor(index)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                        {index === visitors.length - 1 && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="rounded-xl border-2 h-10 w-10"
                                                onClick={() => addVisitor()}
                                            >
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-2 rounded-2xl">
                    <Tabs value={activeTab.toString()} onValueChange={(value) => setActiveTab(parseInt(value))} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 h-12 rounded-none bg-slate-100 p-1">
                            <TabsTrigger value="0" className="flex items-center gap-2 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <Activity className="w-4 h-4" />
                                Execution Log
                            </TabsTrigger>
                            <TabsTrigger value="1" className="flex items-center gap-2 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <Users className="w-4 h-4" />
                                Manpower
                            </TabsTrigger>
                            <TabsTrigger value="2" className="flex items-center gap-2 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <FileText className="w-4 h-4" />
                                Remarks
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="0" className="p-6">
                            <div className="space-y-4">
                                {workItemsToday.map((item, i) => {
                                    const asset = project.structures?.find(s => s.id === item.assetId);
                                    const availableComponents = asset?.components || [];
                                    return (
                                        <Card key={item.id} className="p-4 border-2 bg-slate-50/50">
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                                <div className="md:col-span-4 space-y-4">
                                                    <div>
                                                        <Label className={`font-black text-[10px] uppercase text-slate-500 ${errors.workItems[i]?.assetId ? "text-destructive" : ""}`}>Structure</Label>
                                                        <Select
                                                            value={item.assetId || ''}
                                                            onValueChange={(value) => updateWorkToday(i, 'assetId', value)}
                                                        >
                                                            <SelectTrigger className={`rounded-xl border-2 font-bold bg-white ${errors.workItems[i]?.assetId ? "border-destructive" : ""}`}>
                                                                <SelectValue placeholder="Structure" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {(project.structures || []).map(s =>
                                                                    <SelectItem key={s.id} value={s.id} className="font-bold">{s.name}</SelectItem>
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div>
                                                        <Label className={`font-black text-[10px] uppercase text-slate-500 ${errors.workItems[i]?.componentId ? "text-destructive" : ""}`}>Component</Label>
                                                        <Select
                                                            value={item.componentId || ''}
                                                            onValueChange={(value) => updateWorkToday(i, 'componentId', value)}
                                                            disabled={!item.assetId}
                                                        >
                                                            <SelectTrigger className={`rounded-xl border-2 font-bold bg-white ${errors.workItems[i]?.componentId ? "border-destructive" : ""}`}>
                                                                <SelectValue placeholder="Component" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {availableComponents.map(c =>
                                                                    <SelectItem key={c.id} value={c.id} className="font-bold">{c.name}</SelectItem>
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <div className="md:col-span-6 space-y-4">
                                                    <div>
                                                        <Label className={`font-black text-[10px] uppercase text-slate-500 ${errors.workItems[i]?.description ? "text-destructive" : ""}`}>Work Description</Label>
                                                        <Textarea
                                                            value={item.description}
                                                            placeholder="e.g. Completed excavation of foundation"
                                                            className={`rounded-xl border-2 font-medium bg-white ${errors.workItems[i]?.description ? "border-destructive" : ""}`}
                                                            onChange={e => updateWorkToday(i, 'description', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <Label className={`font-black text-[10px] uppercase text-slate-500 ${errors.workItems[i]?.quantity ? "text-destructive" : ""}`}>Qty</Label>
                                                            <Input
                                                                type="number"
                                                                value={item.quantity}
                                                                placeholder="0"
                                                                className={`rounded-xl border-2 font-bold bg-white ${errors.workItems[i]?.quantity ? "border-destructive" : ""}`}
                                                                onChange={e => updateWorkToday(i, 'quantity', Number(e.target.value))}
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label className="font-black text-[10px] uppercase text-slate-500">Chainage</Label>
                                                            <Input
                                                                value={item.location}
                                                                placeholder="e.g. 12+500"
                                                                className="rounded-xl border-2 font-bold bg-white"
                                                                onChange={e => updateWorkToday(i, 'location', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="md:col-span-2 flex justify-end items-center">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:bg-red-50"
onClick={() => handleRemoveWorkToday(i)}
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
<Button type="button" variant="outline" onClick={() => addWorkItem()} className="w-full border-dashed border-2 py-8 rounded-2xl hover:bg-slate-50 font-bold text-slate-500">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Another Log Entry
                                </Button>
                            </div>
                        </TabsContent>

<TabsContent value="1" className="p-6">
                            {/* PLANT & EQUIPMENT TAB - NEW FEATURE FROM PHP */}
                            <div className="mb-8">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                        <Truck className="w-4 h-4" /> Plant & Equipment
                                    </h3>
                                    <Button type="button" variant="outline" size="sm" onClick={() => setPlantEquipment([...plantEquipment, { id: Date.now().toString(), description: '', working: 0, standby: 0, breakdown: 0, total: 0 }])} className="rounded-lg">
                                        <Plus className="w-4 h-4 mr-1" /> Add Equipment
                                    </Button>
                                </div>
                                <div className="border-2 rounded-xl overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-slate-100">
                                            <TableRow>
                                                <TableHead className="font-bold">Description</TableHead>
                                                <TableHead className="font-bold w-20">Working</TableHead>
                                                <TableHead className="font-bold w-20">Standby</TableHead>
                                                <TableHead className="font-bold w-20">Breakdown</TableHead>
                                                <TableHead className="font-bold w-20">Total</TableHead>
                                                <TableHead className="w-12"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {plantEquipment.map((equip, idx) => (
                                                <TableRow key={equip.id}>
                                                    <TableCell>
                                                        <Input 
                                                            value={equip.description}
                                                            placeholder="e.g. Excavator, Tipper, Water Tanker"
                                                            className="font-medium"
                                                            onChange={(e) => {
                                                                const updated = [...plantEquipment];
                                                                updated[idx].description = e.target.value;
                                                                setPlantEquipment(updated);
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input 
                                                            type="number"
                                                            value={equip.working}
                                                            className="text-center"
                                                            onChange={(e) => {
                                                                const updated = [...plantEquipment];
                                                                updated[idx].working = parseInt(e.target.value) || 0;
                                                                updated[idx].total = updated[idx].working + updated[idx].standby + updated[idx].breakdown;
                                                                setPlantEquipment(updated);
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input 
                                                            type="number"
                                                            value={equip.standby}
                                                            className="text-center"
                                                            onChange={(e) => {
                                                                const updated = [...plantEquipment];
                                                                updated[idx].standby = parseInt(e.target.value) || 0;
                                                                updated[idx].total = updated[idx].working + updated[idx].standby + updated[idx].breakdown;
                                                                setPlantEquipment(updated);
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input 
                                                            type="number"
                                                            value={equip.breakdown}
                                                            className="text-center"
                                                            onChange={(e) => {
                                                                const updated = [...plantEquipment];
                                                                updated[idx].breakdown = parseInt(e.target.value) || 0;
                                                                updated[idx].total = updated[idx].working + updated[idx].standby + updated[idx].breakdown;
                                                                setPlantEquipment(updated);
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
<Input 
                                                            type="number"
                                                            value={equip.total}
                                                            readOnly
                                                            className="text-center font-bold bg-slate-50"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setPlantEquipment(plantEquipment.filter((_, i) => i !== idx))}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

{/* MATERIAL SCHEDULE TAB */}
                            <div className="mb-8">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                        <Package className="w-4 h-4" /> Material Schedule
                                    </h3>
                                    <Button type="button" variant="outline" size="sm" onClick={() => addMaterial()} className="rounded-lg">
                                        <Plus className="w-4 h-4 mr-1" /> Add Material
                                    </Button>
                                </div>
                                <div className="border-2 rounded-xl overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-slate-100">
                                            <TableRow>
                                                <TableHead className="font-bold">Material</TableHead>
                                                <TableHead className="font-bold w-24">Unit</TableHead>
                                                <TableHead className="font-bold w-32">Quantity</TableHead>
                                                <TableHead className="w-12"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {materialsUsed.map((mat, idx) => (
                                                <TableRow key={mat.id}>
                                                    <TableCell>
                                                        <Input 
                                                            value={mat.name}
                                                            placeholder="e.g. Cement, Sand, Aggregate, Brick"
                                                            className="font-medium"
                                                            onChange={(e) => updateMaterialAt(idx, 'name', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input 
                                                            value={mat.unit}
                                                            placeholder="e.g. bags, cum, nos"
                                                            className="font-medium"
                                                            onChange={(e) => updateMaterialAt(idx, 'unit', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input 
                                                            type="number"
                                                            value={mat.quantity}
                                                            className="text-center font-medium"
                                                            onChange={(e) => updateMaterialAt(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeMaterialAt(idx)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

{/* PERSONNEL MOBILIZATION TAB */}
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                        <Users className="w-4 h-4" /> Personnel Mobilization
                                    </h3>
                                    <Button type="button" variant="outline" size="sm" onClick={() => addPersonnel()} className="rounded-lg">
                                        <Plus className="w-4 h-4 mr-1" /> Add Personnel
                                    </Button>
                                </div>
                                <div className="border-2 rounded-xl overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-slate-100">
                                            <TableRow>
                                                <TableHead className="font-bold">Designation</TableHead>
                                                <TableHead className="font-bold w-24">Nos.</TableHead>
                                                <TableHead className="font-bold w-32">Status</TableHead>
                                                <TableHead className="w-12"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {personnelUsed.map((person, idx) => (
                                                <TableRow key={person.id}>
                                                    <TableCell>
                                                        <Input 
                                                            value={person.designation}
                                                            placeholder="e.g. Site Engineer, Supervisor, Labor"
                                                            className="font-medium"
                                                            onChange={(e) => updatePersonnelAt(idx, 'designation', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input 
                                                            type="number"
                                                            value={person.nos}
                                                            className="text-center font-medium"
                                                            onChange={(e) => updatePersonnelAt(idx, 'nos', parseInt(e.target.value) || 0)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Select 
                                                            value={person.status}
                                                            onValueChange={(val) => updatePersonnelAt(idx, 'status', val as 'Present' | 'Absent')}
                                                        >
                                                            <SelectTrigger className="font-medium">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Present" className="font-bold">Present</SelectItem>
                                                                <SelectItem value="Absent" className="font-bold">Absent</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removePersonnelAt(idx)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="2" className="p-6">
                            <div className="space-y-6">
                                <div>
                                    <Label className="font-black text-[10px] uppercase tracking-widest text-slate-500 mb-2 block">General Remarks</Label>
                                    {remarks.map((remark, index) => (
                                        <div key={index} className="flex gap-2 mb-4">
                                            <Textarea
                                                placeholder={`Site observation ${index + 1}...`}
                                                value={remark}
                                                className="rounded-xl border-2 font-medium"
                                                onChange={e => {
                                                    const updated = [...remarks];
                                                    updated[index] = e.target.value;
                                                    setRemarks(updated);
                                                }}
                                                rows={2}
                                            />
                                            {index > 0 && (
                                                <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setRemarks(remarks.filter((_, i) => i !== index))}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="rounded-xl border-2 font-bold"
                                        onClick={() => setRemarks([...remarks, ''])}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Observation
                                    </Button>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <Label className={`font-black text-[10px] uppercase tracking-widest text-slate-500 ${errors.submittedBy ? "text-destructive" : ""}`}>Submitted By (Contractor)</Label>
                                        <Input
                                            value={submittedBy}
                                            placeholder="e.g. John Smith"
                                            className={`rounded-xl border-2 font-bold ${errors.submittedBy ? "border-destructive" : ""}`}
                                            onChange={e => setSubmittedBy(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label className={`font-black text-[10px] uppercase tracking-widest text-slate-500 ${errors.receivedBy ? "text-destructive" : ""}`}>Received By (Engineer)</Label>
                                        <Input
                                            value={receivedBy}
                                            placeholder="e.g. Jane Doe"
                                            className={`rounded-xl border-2 font-bold ${errors.receivedBy ? "border-destructive" : ""}`}
                                            onChange={e => setReceivedBy(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </Card>
            </form>
        );
    };

    const reportToPreview = selectedReport || {
        date: reportDate,
        weather,
        submittedBy,
        remarks: remarks.join('\n'),
        workToday: workItemsToday,
        id: 'PREVIEW'
    };

    return (
        <div className="animate-in fade-in duration-300 h-full flex flex-col">
            {!hideHeader && (
                <div className="flex justify-between mb-6 items-center shrink-0">
                    <div>
                        <h1 className="text-2xl font-black">Field Operations (DPR)</h1>
                        <p className="text-sm text-muted-foreground uppercase font-bold tracking-wider">Site execution & progress monitoring</p>
                    </div>
                    <div className="flex gap-2">
                        <Badge variant="success" className="flex items-center gap-1.5 h-10 px-4 rounded-xl">
                            <Wifi size={14} />
                            SYSTEM ONLINE
                        </Badge>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto">
                {view === 'list' && renderListView()}
                {view === 'create' && renderCreateForm()}
                {view === 'view' && renderViewMode()}
            </div>

            <Dialog open={printModalOpen} onOpenChange={setPrintModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl rounded-3xl">
                    <DialogHeader className="p-8 bg-slate-900 text-white">
                        <DialogTitle className="text-2xl font-black">Official Daily Site Report</DialogTitle>
                        <DialogDescription className="text-slate-400 font-medium">Print-ready document for project archives.</DialogDescription>
                    </DialogHeader>
                    <div className="p-10 bg-white" id="printable-dpr">
                        <div className="flex justify-between mb-10 pb-6 border-b-4 border-slate-900">
                            <div>
                                <h1 className="text-4xl font-black tracking-tighter mb-2">DAILY SITE REPORT</h1>
                                <p className="text-lg font-bold text-slate-500">Project: {project.name}</p>
                                <p className="font-bold text-slate-400">Date: {reportToPreview.date}</p>
                            </div>
                            <div className="text-right flex flex-col justify-end">
                                <p className="text-xs font-black uppercase text-slate-400">REPORT NO</p>
                                <p className="text-xl font-mono font-bold">DPR-{(reportToPreview as any).reportNumber || reportToPreview.id}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-10 mb-10">
                            <div className="p-6 bg-slate-50 rounded-2xl border-2">
                                <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-4">Site Conditions</h3>
                                <div className="space-y-2">
                                    <p className="font-bold text-slate-700">Weather: <span className="text-slate-900">{reportToPreview.weather}</span></p>
                                    <p className="font-bold text-slate-700">Location: <span className="text-slate-900">{project.location}</span></p>
                                </div>
                            </div>
                            <div className="p-6 bg-slate-50 rounded-2xl border-2">
                                <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-4">Site Personnel</h3>
                                <div className="space-y-2">
                                    <p className="font-bold text-slate-700">Site Engineer: <span className="text-slate-900">{reportToPreview.submittedBy}</span></p>
                                    <p className="font-bold text-slate-700">Project Manager: <span className="text-slate-900">{project.projectManager || 'N/A'}</span></p>
                                </div>
                            </div>
                        </div>

                        <div className="mb-10">
                            <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-4">Execution Summary</h3>
                            <Table className="border-2 rounded-xl overflow-hidden">
                                <TableHeader className="bg-slate-900">
                                    <TableRow>
                                        <TableHead className="text-white font-black text-[10px] uppercase">Structure</TableHead>
                                        <TableHead className="text-white font-black text-[10px] uppercase">Work Component</TableHead>
                                        <TableHead className="text-white font-black text-[10px] uppercase">Qty</TableHead>
                                        <TableHead className="text-white font-black text-[10px] uppercase">Chainage</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(reportToPreview.workToday || []).map((item, idx) => {
                                        const asset = project.structures?.find(s => s.id === item.assetId);
                                        const component = asset?.components.find(c => c.id === item.componentId);
                                        return (
                                            <TableRow key={idx} className="border-b">
                                                <TableCell className="font-bold">{asset?.name || ''}</TableCell>
                                                <TableCell className="font-bold">{component?.name || item.description}</TableCell>
                                                <TableCell className="font-mono font-black">{item.quantity}</TableCell>
                                                <TableCell className="font-bold">{item.location}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="grid grid-cols-2 gap-20 mt-20">
                            <div className="text-center">
                                <div className="h-px bg-slate-400 mb-4"></div>
                                <p className="font-black text-[10px] uppercase text-slate-400 mb-1">CONTRACTOR REPRESENTATIVE</p>
                                <p className="font-bold text-slate-900">{reportToPreview.submittedBy}</p>
                            </div>
                            <div className="text-center">
                                <div className="h-px bg-slate-400 mb-4"></div>
                                <p className="font-black text-[10px] uppercase text-slate-400 mb-1">ENGINEER REPRESENTATIVE</p>
                                <p className="font-bold text-slate-900">{receivedBy || '_________________________'}</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-8 bg-slate-50 flex justify-end gap-3 border-t">
                        <Button variant="outline" onClick={() => setPrintModalOpen(false)} className="rounded-xl font-bold">Close Preview</Button>
                        <Button onClick={() => window.print()} className="bg-slate-900 hover:bg-black text-white rounded-xl font-bold px-8">
                            <Printer className="w-4 h-4 mr-2" />
                            Print Document
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DailyReportModule;

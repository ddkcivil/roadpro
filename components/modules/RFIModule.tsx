import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Checkbox } from '~/components/ui/checkbox';
import { Switch } from '~/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { Progress } from '~/components/ui/progress';
import { toast } from 'sonner';
import { z } from 'zod';
import { ErrorSummary } from '~/components/ui/error-summary';

import { Project, RFI, UserRole, RFIStatus, ScheduleTask, Checklist, ChecklistItem } from '../../types';
import { 
    Plus, Eye, Edit2, History, X, ShieldCheck, FileText, Printer, 
    Clock, Lock, CheckCircle2, XCircle, FileSearch, CalendarPlus, 
    Link as LinkIcon, ExternalLink, Calendar, MapPin, BarChart2,
    MessageSquare, User as UserIcon, Circle, Filter, CheckCircle, Trash2,
    ClipboardList, AlertTriangle
} from 'lucide-react';
import StatCard from '../core/StatCard';
import { cn } from '~/lib/utils';
import { Textarea } from '~/components/ui/textarea';

const rfiSchema = z.object({
  location: z.string().regex(/^\d+\+\d{3}\s+(LHS|RHS|Both|Both Sides|L|R)$/i, "Required format: 'Chainage + Side' (e.g., 12+400 RHS)"),
  description: z.string().min(5, "Work description must be at least 5 characters"),
  date: z.string().min(1, "Request date is required"),
  inspectionType: z.string().min(2, "Inspection type is required"),
  submittedBy: z.string().min(2, "Submitted by name is required"),
});

interface Props {
  project: Project;
  userRole: UserRole;
  onProjectUpdate: (project: Project) => void;
}

const RFIModule: React.FC<Props> = ({ project, userRole, onProjectUpdate }) => {
    const [viewMode, setViewMode] = useState<'LIST' | 'UPDATE' | 'CHECKLIST_LIST' | 'CHECKLIST_UPDATE'>('LIST');
    const [formData, setFormData] = useState<Partial<RFI>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [selectedRfiForDetail, setSelectedRfiForDetail] = useState<RFI | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [taskFilter, setTaskFilter] = useState<string>('all');
    const [tabIndex, setTabIndex] = useState("0");

    useEffect(() => {
        setErrors({});
    }, [viewMode]);

    if (!project) {
        return (
            <div className="p-8 text-center">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>Project data not available. Please select a project first.</AlertDescription>
                </Alert>
            </div>
        );
    }
    
    // Form fields based on the RFI document
    const [inspectionTime, setInspectionTime] = useState('');
    const [inspectionPurpose, setInspectionPurpose] = useState<'First' | 'Second' | 'Third' | 'Routine' | 'Special' | 'Other'>('First');
    const [inspectionReport, setInspectionReport] = useState('');
    const [engineerComments, setEngineerComments] = useState('');
    const [areSignature, setAreSignature] = useState('');
    const [iowSignature, setIowSignature] = useState('');
    const [meSltSignature, setMeSltSignature] = useState('');
    const [reSignature, setReSignature] = useState('');
    const [requestNumber, setRequestNumber] = useState('');
    const [workingDrawings, setWorkingDrawings] = useState<string[]>([]);
    const [inspectionType, setInspectionType] = useState('');
    const [specificWorkDetails, setSpecificWorkDetails] = useState('');
    const [inspectionDate, setInspectionDate] = useState('');
    const [engineerRepresentativeComments, setEngineerRepresentativeComments] = useState('');
    const [worksStatus, setWorksStatus] = useState<'Approved' | 'Approved as Noted' | 'Approved for Subsequent Work' | ''>('');
    const [submittedBy, setSubmittedBy] = useState('');
    const [receivedBy, setReceivedBy] = useState('');

    // Checklist related state
    const [checklistFormData, setChecklistFormData] = useState<Partial<Checklist>>({});
    const [projectChecklists] = useState<Checklist[]>(project.checklists || []);

    const statusCounts = {
        [RFIStatus.OPEN]: (project?.rfis || []).filter(r => r.status === RFIStatus.OPEN).length,
        [RFIStatus.APPROVED]: (project?.rfis || []).filter(r => r.status === RFIStatus.APPROVED).length,
        [RFIStatus.REJECTED]: (project?.rfis || []).filter(r => r.status === RFIStatus.REJECTED).length,
        [RFIStatus.CLOSED]: (project?.rfis || []).filter(r => r.status === RFIStatus.CLOSED).length,
    };

    const filteredRFIs = useMemo(() => {
        return [...(project?.rfis || [])]
            .filter(r => taskFilter === 'all' || r.linkedTaskId === taskFilter)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [project?.rfis, taskFilter]);

    // RFI handlers
    const handleCreate = () => {
        setFormData({
            rfiNumber: `RFI-${Date.now().toString().slice(-6)}`,
            status: RFIStatus.OPEN,
            date: new Date().toISOString().split('T')[0],
            inspectionPurpose: 'First',
            workflowLog: [{
                stage: 'Created',
                user: userRole,
                timestamp: new Date().toISOString(),
                comments: 'Initial request generated by field team.'
            }]
        });
        setViewMode('UPDATE');
        
        // Reset additional fields
        setInspectionTime('');
        setInspectionPurpose('First');
        setInspectionReport('');
        setEngineerComments('');
        setAreSignature('');
        setIowSignature('');
        setMeSltSignature('');
        setReSignature('');
        setRequestNumber('');
        setWorkingDrawings([]);
        setInspectionType('');
        setSpecificWorkDetails('');
        setInspectionDate('');
        setEngineerRepresentativeComments('');
        setWorksStatus('');
        setSubmittedBy('');
        setReceivedBy('');
    };

    const handleEdit = (rfi: RFI) => {
        setFormData(rfi);
        setViewMode('UPDATE');
        
        // Set additional fields
        setInspectionTime(rfi.inspectionTime || '');
        setInspectionPurpose(rfi.inspectionPurpose || 'First');
        setInspectionReport(rfi.inspectionReport || '');
        setEngineerComments(rfi.engineerComments || '');
        setAreSignature(rfi.areSignature || '');
        setIowSignature(rfi.iowSignature || '');
        setMeSltSignature(rfi.meSltSignature || '');
        setReSignature(rfi.reSignature || '');
        setRequestNumber(rfi.rfiNumber || '');
        setWorkingDrawings(rfi.workingDrawings || []);
        setInspectionType(rfi.inspectionType || '');
        setSpecificWorkDetails(rfi.specificWorkDetails || '');
        setInspectionDate(rfi.inspectionDate || '');
        setEngineerRepresentativeComments(rfi.engineerRepresentativeComments || '');
        setWorksStatus(rfi.worksStatus || '');
        setSubmittedBy(rfi.submittedBy || '');
        setReceivedBy(rfi.receivedBy || '');
    };

    const handleSave = () => {
        try {
            rfiSchema.parse({
                location: formData.location,
                description: formData.description,
                date: formData.date,
                inspectionType: inspectionType,
                submittedBy: submittedBy || formData.submittedBy
            });
        } catch (err) {
            if (err instanceof z.ZodError) {
                const newErrors: Record<string, string> = {};
                err.errors.forEach((e) => {
                    if (e.path[0]) newErrors[e.path[0].toString()] = e.message;
                });
                setErrors(newErrors);
                toast.error("Validation Error", { description: "Please check the form for errors." });
                return;
            }
        }

        const now = new Date().toISOString();
        const existingRfi = project.rfis.find(r => r.id === formData.id);
        let updatedLog = [...(formData.workflowLog || [])];

        if (existingRfi && existingRfi.status !== formData.status) {
            updatedLog.push({
                stage: formData.status,
                user: userRole,
                timestamp: now,
                comments: `Status transitioned from ${existingRfi.status} to ${formData.status}.`
            });
        }

        const newRFI: RFI = {
            id: formData.id || `rfi-${Date.now()}`,
            rfiNumber: formData.rfiNumber || `RFI-${Date.now()}`,
            date: formData.date!,
            location: formData.location!,
            description: formData.description!,
            status: (formData.status as any) || RFIStatus.OPEN,
            requestedBy: formData.requestedBy || userRole,
            inspectionDate: formData.inspectionDate || inspectionDate,
            inspectionTime: inspectionTime,
            inspectionPurpose: inspectionPurpose,
            // @ts-ignore
            inspectionReport: inspectionReport,
            engineerComments: engineerComments,
            areSignature: areSignature,
            iowSignature: iowSignature,
            meSltSignature: meSltSignature,
            reSignature: reSignature,
            // @ts-ignore
            requestNumber: requestNumber,
            workingDrawings: workingDrawings,
            submittedBy: submittedBy || formData.submittedBy || '',
            receivedBy: receivedBy || formData.receivedBy || '',
            submittedDate: formData.submittedDate,
            receivedDate: formData.receivedDate,
            workflowLog: updatedLog,
            linkedTaskId: formData.linkedTaskId,
            linkedChecklistIds: formData.linkedChecklistIds || [],
            inspectionType: inspectionType,
            specificWorkDetails: specificWorkDetails,
            // @ts-ignore
            engineerRepresentativeComments: engineerRepresentativeComments,
            worksStatus: worksStatus as any
        };

        const updatedRFIs = formData.id
            ? project.rfis.map(r => r.id === formData.id ? newRFI : r)
            : [...project.rfis, newRFI];

        onProjectUpdate({ ...project, rfis: updatedRFIs });
        setViewMode('LIST');
        setFormData({});
    };

    const handleDelete = (rfiId: string) => {
        if (window.confirm('Are you sure you want to delete this RFI?')) {
            const updatedRFIs = project.rfis.filter(r => r.id !== rfiId);
            onProjectUpdate({ ...project, rfis: updatedRFIs });
        }
    };

    const getStageIcon = (stage: string) => {
        switch (stage.toLowerCase()) {
            case 'created': return <Plus size={14} className="text-blue-500" />;
            case 'approved': return <CheckCircle2 size={14} className="text-emerald-500" />;
            case 'rejected': return <XCircle size={14} className="text-rose-500" />;
            case 'inspected': return <FileSearch size={14} className="text-amber-500" />;
            case 'open': return <Clock size={14} className="text-primary" />;
            default: return <Circle size={14} className="text-slate-400" />;
        }
    };

    if (viewMode === 'UPDATE') return (
        <div className="p-6 rounded-2xl animate-in slide-in-from-right duration-300 border bg-card shadow-sm">
            <div className="flex justify-between mb-6 items-center">
                <div>
                    <h3 className="text-xl font-black tracking-tight text-foreground">Technical Inspection Request</h3>
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider opacity-70">Project Quality Verification Form</p>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" onClick={() => setViewMode('LIST')}><X /></Button>
            </div>

            <ErrorSummary errors={errors} className="mb-6" onClear={() => setErrors({})} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="rfi-location" className={cn(errors.location && "text-destructive")}>Location (Chainage + Side)</Label>
                    <div className="relative">
                        <MapPin size={18} className={cn("absolute left-3 top-1/2 -translate-y-1/2", errors.location ? "text-rose-500" : "text-primary")} />
                        <Input
                            id="rfi-location"
                            placeholder="e.g. 12+400 RHS"
                            value={formData.location || ''} 
                            onChange={e => {
                                setFormData({...formData, location: e.target.value});
                                if (errors.location) setErrors(prev => {
                                    const next = {...prev};
                                    delete next.location;
                                    return next;
                                });
                            }}
                            className={cn("pl-10 h-11 shadow-sm", errors.location && "border-destructive")}
                        />
                    </div>
                    {!errors.location && <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight ml-1">Format: [Km]+[Mtrs] [Side] e.g. 12+400 RHS</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="inspection-type" className={cn(errors.inspectionType && "text-destructive")}>Inspection Type</Label>
                    <div className="relative">
                        <FileText size={18} className="text-primary absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            id="inspection-type"
                            placeholder="e.g. Box Culvert, Earthwork, etc."
                            value={inspectionType || ''} 
                            onChange={e => setInspectionType(e.target.value)}
                            className={cn("pl-10 h-11 shadow-sm", errors.inspectionType && "border-destructive")}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="request-date" className={cn(errors.date && "text-destructive")}>Request Date</Label>
                    <Input
                        id="request-date" 
                        type="date" 
                        value={formData.date || ''} 
                        onChange={e => setFormData({...formData, date: e.target.value})} 
                        className={cn("h-11 shadow-sm", errors.date && "border-destructive")}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="submitted-by" className={cn(errors.submittedBy && "text-destructive")}>Submitted By</Label>
                    <div className="relative">
                        <UserIcon size={18} className="text-primary absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            id="submitted-by"
                            placeholder="Name of person submitting the RFI"
                            value={submittedBy || ''} 
                            onChange={e => setSubmittedBy(e.target.value)}
                            className={cn("pl-10 h-11 shadow-sm", errors.submittedBy && "border-destructive")}
                        />
                    </div>
                </div>
                
                <div className="col-span-full space-y-2">
                    <Label htmlFor="work-description" className={cn(errors.description && "text-destructive")}>Work Description for Inspection</Label>
                    <Textarea
                        id="work-description"
                        className={cn("min-h-[100px] shadow-sm", errors.description && "border-destructive")}
                        placeholder="Define scope for verification (e.g. Reinforcement, GSB Layer, BC Mix)..."
                        value={formData.description || ''} 
                        onChange={e => setFormData({...formData, description: e.target.value})} 
                    />
                </div>

                <div className="col-span-full border-t border-border/50 my-2" />

                <div className="space-y-2">
                    <Label htmlFor="inspection-purpose">Inspection Purpose</Label>
                    <Select 
                        value={inspectionPurpose} 
                        onValueChange={value => setInspectionPurpose(value as any)}
                    >
                        <SelectTrigger id="inspection-purpose" className="h-11 shadow-sm">
                            <SelectValue placeholder="Select purpose" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="First">First Inspection</SelectItem>
                            <SelectItem value="Second">Second Inspection</SelectItem>
                            <SelectItem value="Routine">Routine Inspection</SelectItem>
                            <SelectItem value="Special">Special Inspection</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="update-status">Current Status</Label>
                    <Select 
                        value={formData.status || RFIStatus.OPEN} 
                        onValueChange={value => setFormData({...formData, status: value as RFIStatus})}
                    >
                        <SelectTrigger id="update-status" className="h-11 shadow-sm font-bold">
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={RFIStatus.OPEN}>OPEN / PENDING</SelectItem>
                            <SelectItem value={RFIStatus.APPROVED}>APPROVED / VERIFIED</SelectItem>
                            <SelectItem value={RFIStatus.REJECTED}>REJECTED / RECTIFY</SelectItem>
                            <SelectItem value={RFIStatus.CLOSED}>CLOSED</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
                <Button variant="outline" className="h-11 px-6 font-bold" onClick={() => setViewMode('LIST')}>Cancel</Button>
                <Button onClick={handleSave} className="h-11 px-8 font-black shadow-lg shadow-primary/20">
                    <CheckCircle2 size={18} className="mr-2"/> COMMIT AUDIT LOG
                </Button>
            </div>
        </div>
    );

    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h5 className="text-2xl font-black tracking-tight">Quality Control Hub</h5>
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-70">Verification of works against contract specifications</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Select value={taskFilter} onValueChange={setTaskFilter}>
                        <SelectTrigger id="activity-filter" className="w-full sm:w-[220px] h-10 border-border/50">
                            <Filter size={14} className="mr-2" />
                            <SelectValue placeholder="Filter by Activity" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Activities</SelectItem>
                            <Separator />
                            {project.schedule.map(task => (
                                <SelectItem key={task.id} value={task.id}>{task.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleCreate} className="h-10 shadow-md">
                        <Plus size={16} className="mr-2" /> New RFI
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Open Requests" value={statusCounts[RFIStatus.OPEN]} icon={Clock} color="primary" trend="Active" />
                <StatCard title="Approved" value={statusCounts[RFIStatus.APPROVED]} icon={CheckCircle} color="success" />
                <StatCard title="Rejected" value={statusCounts[RFIStatus.REJECTED]} icon={XCircle} color="danger" />
                <StatCard title="Closed" value={statusCounts[RFIStatus.CLOSED]} icon={Lock} color="slate" />
            </div>

            <Tabs value={tabIndex} onValueChange={setTabIndex} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-muted/50 rounded-xl mb-6">
                    <TabsTrigger value="0" className="rounded-lg font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                      <ClipboardList size={16} className="mr-2" /> Checklists
                    </TabsTrigger>
                    <TabsTrigger value="1" className="rounded-lg font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                      <FileText size={16} className="mr-2" /> RFI Registry
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="0" className="space-y-4">
                    <Card className="border-border/50">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest">Name</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest">Category</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest">Items</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest">Status</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {projectChecklists.map((checklist) => (
                                        <TableRow key={checklist.id} className="group transition-colors hover:bg-muted/20">
                                            <TableCell className="font-bold text-sm">{checklist.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider">{checklist.category}</Badge>
                                            </TableCell>
                                            <TableCell className="text-xs font-medium text-muted-foreground">{checklist.items.length} items</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn("text-[10px] font-black uppercase tracking-widest", checklist.isActive ? "text-emerald-600 border-emerald-500/20 bg-emerald-500/5" : "text-muted-foreground opacity-50")}>
                                                    {checklist.isActive ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={14}/></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="1">
                    <Card className="border-border/50">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest">Ref #</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest">Location</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest">Type</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest">Activity</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest">Status</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRFIs.map((rfi) => {
                                        const linkedTask = project.schedule.find(t => t.id === rfi.linkedTaskId);
                                        return (
                                            <TableRow key={rfi.id} className="group transition-colors hover:bg-muted/20">
                                                <TableCell className="font-black text-xs text-primary font-mono">{rfi.rfiNumber}</TableCell>
                                                <TableCell className="font-bold text-sm">{rfi.location}</TableCell>
                                                <TableCell className="text-xs font-medium">{rfi.inspectionType || 'N/A'}</TableCell>
                                                <TableCell>
                                                    {linkedTask ? (
                                                        <div className="min-w-[120px]">
                                                            <p className="font-bold text-[11px] truncate mb-1">{linkedTask.name}</p>
                                                            <Progress value={linkedTask.progress} className="h-1" />
                                                        </div>
                                                    ) : <span className="text-muted-foreground opacity-40">—</span>}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={cn(
                                                        "font-black text-[9px] h-5 uppercase tracking-widest px-2",
                                                        rfi.status === RFIStatus.APPROVED && 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
                                                        rfi.status === RFIStatus.REJECTED && 'bg-rose-500/10 text-rose-600 border-rose-500/20',
                                                        rfi.status === RFIStatus.OPEN && 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                                    )} variant="outline">
                                                        {rfi.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(rfi)}><Edit2 size={14}/></Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/5" onClick={() => handleDelete(rfi.id)}><Trash2 size={14}/></Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default RFIModule;

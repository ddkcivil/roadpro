import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Progress } from '~/components/ui/progress';
import { ScrollArea } from '~/components/ui/scroll-area';
import { toast } from 'sonner';
import { z } from 'zod';
import { ErrorSummary } from '~/components/ui/error-summary';
import { usePagination } from '../../hooks/usePagination';
import { PaginationComponent } from '~/components/ui/pagination-component';

import { Project, RFI, UserRole, RFIStatus, UserWithPermissions } from '../../types';
import { 
    Plus, Eye, Edit2, X, FileText, 
    Clock, CheckCircle2, XCircle, FileSearch, 
    MapPin, CheckCircle, Trash2,
    ClipboardList, AlertTriangle, ChevronDown, Filter, User as UserIcon, Lock
} from 'lucide-react';
import StatCard from '../core/StatCard';
import { cn } from '~/lib/utils';
import { generateSingleRFIPDF } from '../../utils/formatting/pdfUtils';
import { Textarea } from '~/components/ui/textarea';
import { AuditService } from '~/services/analytics/auditService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';

import { VisualEmptyState } from '../common/VisualEmptyState';

const rfiSchema = z.object({
  description: z.string().min(5, "Work description must be at least 5 characters"),
  inspectionType: z.string().min(2, "Inspection type is required"),
});

interface Props {
  project: Project;
  userRole: UserRole;
  currentUser?: UserWithPermissions;
  onProjectUpdate: (project: Project) => void;
}

const RFIModule: React.FC<Props> = ({ project, userRole, currentUser, onProjectUpdate }) => {
    const [viewMode, setViewMode] = useState<'LIST' | 'UPDATE' | 'CHECKLIST_LIST' | 'CHECKLIST_UPDATE'>('LIST');
    const [formData, setFormData] = useState<Partial<RFI>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [taskFilter, setTaskFilter] = useState<string>('all');
    const [tabIndex, setTabIndex] = useState("0");
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [pendingRFI, setPendingRFI] = useState<RFI | null>(null);

    useEffect(() => {
        setErrors({});
    }, [viewMode]);

    // Form fields based on the RFI document
    const [inspectionTime, setInspectionTime] = useState('');
    const [inspectionPurpose, setInspectionPurpose] = useState<'First' | 'Second' | 'Third' | 'Routine' | 'Special' | 'Other'>('First');
    const [inspectionType, setInspectionType] = useState('');

    // PDF Form fields
    const [chainageFrom, setChainageFrom] = useState('');
    const [chainageTo, setChainageTo] = useState('');
    const [approxQuantity, setApproxQuantity] = useState('');
    const [workTypes, setWorkTypes] = useState<string[]>([]);
    const [othersSpecify, setOthersSpecify] = useState('');

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
    
    // Checklist related state
    const projectChecklists = project.checklists || [];

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

    const checklistPagination = usePagination(projectChecklists, 10);
    const rfiPagination = usePagination(filteredRFIs, 10);

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
        
        // Reset all form fields
        setInspectionTime('');
        setInspectionPurpose('First');
        setInspectionType('');
        setChainageFrom('');
        setChainageTo('');
        setApproxQuantity('');
        setWorkTypes([]);
        setOthersSpecify('');
    };

    const handleEdit = (rfi: RFI) => {
        setFormData(rfi);
        setViewMode('UPDATE');
        
        // Set form fields
        setInspectionTime(rfi.inspectionTime || '');
        setInspectionPurpose(rfi.inspectionPurpose || 'First');
        setInspectionType(rfi.inspectionType || '');
        setChainageFrom((rfi as any).chainageFrom || '');
        setChainageTo((rfi as any).chainageTo || '');
        setApproxQuantity((rfi as any).approxQuantity || '');
        setWorkTypes((rfi as any).workTypes || []);
        setOthersSpecify((rfi as any).othersSpecify || '');
    };

    const handleSave = () => {
        try {
            rfiSchema.parse({
                description: formData.description,
                inspectionType: inspectionType
            });
        } catch (err) {
            if (err instanceof z.ZodError) {
                const newErrors: Record<string, string> = {};
                err.issues.forEach((e: z.ZodIssue) => {
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
            date: formData.date || new Date().toISOString().split('T')[0],
            location: `${chainageFrom}${chainageTo ? ' to ' + chainageTo : ''}`.trim(),
            description: formData.description!,
            status: (formData.status as any) || RFIStatus.OPEN,
            requestedBy: formData.requestedBy || userRole,
            inspectionTime: inspectionTime,
            inspectionType: inspectionType,
            chainageFrom,
            chainageTo,
            approxQuantity,
            workTypes,
            othersSpecify,
            workflowLog: updatedLog,
            linkedTaskId: formData.linkedTaskId,
            linkedChecklistIds: formData.linkedChecklistIds || []
        } as any;

        setPendingRFI(newRFI);
        setIsPreviewOpen(true);
    };

    const finalizeSave = () => {
        if (!pendingRFI) return;
        
        const existingRfi = project.rfis.find(r => r.id === pendingRFI.id);
        const updatedRFIs = pendingRFI.id && project.rfis.some(r => r.id === pendingRFI.id)
            ? project.rfis.map(r => r.id === pendingRFI.id ? pendingRFI : r)
            : [...project.rfis, pendingRFI];

        onProjectUpdate({ ...project, rfis: updatedRFIs });
        
        if (currentUser) {
            AuditService.logDataModification(
                currentUser.id,
                currentUser.name,
                pendingRFI.id && existingRfi ? 'UPDATE' : 'CREATE',
                'rfi',
                pendingRFI.id,
                pendingRFI.rfiNumber,
                existingRfi,
                pendingRFI,
                project.id,
                project.name
            );
            toast.success("Audit Log Committed", { 
                description: `Successfully finalized ${pendingRFI.rfiNumber}.`
            });
        }

        setIsPreviewOpen(false);
        setPendingRFI(null);
        setViewMode('LIST');
        setFormData({});
    };

    const handleDelete = (rfiId: string) => {
        const rfiToDelete = project.rfis.find(r => r.id === rfiId);
        if (window.confirm('Are you sure you want to delete this RFI?')) {
            const updatedRFIs = project.rfis.filter(r => r.id !== rfiId);
            onProjectUpdate({ ...project, rfis: updatedRFIs });

            // Log deletion to audit trail
            if (currentUser && rfiToDelete) {
                AuditService.logDataModification(
                    currentUser.id,
                    currentUser.name,
                    'DELETE',
                    'rfi',
                    rfiToDelete.id,
                    rfiToDelete.rfiNumber,
                    rfiToDelete,
                    null,
                    project.id,
                    project.name
                );
                toast.error("Audit Log Committed", { 
                    description: `Successfully deleted ${rfiToDelete.rfiNumber} from system registry.`
                });
            }
        }
    };

    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            {/* RFI Preview Dialog */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col border-border/50">
                    <DialogHeader className="p-6 border-b bg-muted/30">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                <FileSearch size={20} />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black uppercase tracking-tight">RFI Production Preview</DialogTitle>
                                <DialogDescription>Review form details before committing to the permanent project record.</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <ScrollArea className="flex-1 p-8">
                        <div className="border-2 border-slate-200 p-8 rounded-sm bg-white shadow-sm space-y-6 max-w-2xl mx-auto font-serif">
                            <div className="text-center border-b-2 border-black pb-4">
                                <h2 className="text-xl font-bold uppercase">{project.name}</h2>
                                <h3 className="text-lg font-bold">REQUEST FOR INSPECTION (RFI)</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                    <p><span className="font-bold">RFI NO:</span> {pendingRFI?.rfiNumber}</p>
                                    <p><span className="font-bold">DATE:</span> {pendingRFI?.date}</p>
                                    {pendingRFI?.boqItemNo && <p><span className="font-bold">BOQ Item No:</span> {pendingRFI.boqItemNo}</p>}
                                    {pendingRFI?.contractNo && <p><span className="font-bold">Contract No:</span> {pendingRFI.contractNo}</p>}
                                </div>
                                <div className="space-y-1 text-right">
                                    <p><span className="font-bold">LOCATION:</span> {pendingRFI?.location}</p>
                                    <p><span className="font-bold">TYPE:</span> {pendingRFI?.inspectionType}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-bold border-b border-black text-sm uppercase">Description of Work</h4>
                                <p className="text-sm min-h-[60px] italic">{pendingRFI?.description}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-8 pt-12">
                                <div className="border-t border-black pt-2">
                                    <p className="text-[10px] uppercase font-bold">Submitted By (Contractor)</p>
                                    <p className="text-sm font-bold mt-1">{pendingRFI?.submittedBy}</p>
                                </div>
                                <div className="border-t border-black pt-2">
                                    <p className="text-[10px] uppercase font-bold">Signature</p>
                                    <p className="text-sm mt-1">________________________</p>
                                    <p className="text-[10px] text-muted-foreground">Date: {pendingRFI?.date}</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 border border-dashed border-slate-300 rounded mt-8">
                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest text-center">System Metadata</p>
                                <div className="flex justify-between text-[10px] mt-2">
                                    <span>PROVIDER: {currentUser?.name}</span>
                                    <span>TIMESTAMP: {new Date().toLocaleString()}</span>
                                    <span>HASH: {pendingRFI?.id?.slice(-8).toUpperCase()}</span>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="p-6 border-t bg-muted/10">
                        <Button variant="outline" onClick={() => setIsPreviewOpen(false)} className="h-11 px-6">
                            Back to Form
                        </Button>
                        <Button onClick={finalizeSave} className="h-11 px-8 font-black shadow-lg shadow-primary/20">
                            Continue to Final Production <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h5 className="text-2xl font-black tracking-tight">Quality Control Hub</h5>
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-70">Verification of works against contract specifications</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Select value={taskFilter} onValueChange={setTaskFilter}>
                        <SelectTrigger id="activity-filter" className="w-full sm:w-[220px] h-10 border-border/50" aria-label="Filter by Activity">
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

            {viewMode === 'UPDATE' ? (
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
                        <div className="col-span-full space-y-3">
                            <Label>Type of Works/Activities</Label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {['Footpath', 'Kerbs', 'Asphalt', 'Reinforcement', 'Stone Masonary', 'Soiling', 'PCC', 'RCC', 'Excavation', 'Setting out', 'Embankement', 'Formwork', 'Roads', 'Railing', 'Street Light', 'Sub-grade', 'Painting'].map(workType => (
                                    <div key={workType} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id={`work-${workType}`}
                                            checked={workTypes.includes(workType)}
                                            onChange={e => {
                                                if (e.target.checked) {
                                                    setWorkTypes([...workTypes, workType]);
                                                } else {
                                                    setWorkTypes(workTypes.filter(w => w !== workType));
                                                }
                                            }}
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            aria-label={workType}
                                        />
                                        <Label htmlFor={`work-${workType}`} className="text-sm font-medium cursor-pointer">{workType}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="approx-quantity">Approx Quantity</Label>
                            <Input
                                id="approx-quantity"
                                placeholder="e.g. 47.5 Sq.m"
                                value={approxQuantity}
                                onChange={e => setApproxQuantity(e.target.value)}
                                className="h-11 shadow-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="inspection-time">Inspection Time</Label>
                            <Input
                                id="inspection-time"
                                placeholder="e.g. 9 A.M"
                                value={inspectionTime}
                                onChange={e => setInspectionTime(e.target.value)}
                                className="h-11 shadow-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="chainage-from" className={cn(errors.location && "text-destructive")}>Chainage From</Label>
                            <div className="relative">
                                <MapPin size={18} className={cn("absolute left-3 top-1/2 -translate-y-1/2", errors.location ? "text-rose-500" : "text-primary")} />
                                <Input
                                    id="chainage-from"
                                    placeholder="e.g. 3+800 R.H.S"
                                    value={chainageFrom} 
                                    onChange={e => {
                                        setChainageFrom(e.target.value);
                                        if (errors.location) setErrors(prev => {
                                            const next = {...prev};
                                            delete next.location;
                                            return next;
                                        });
                                    }}
                                    className={cn("pl-10 h-11 shadow-sm", errors.location && "border-destructive")}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="chainage-to" className={cn(errors.location && "text-destructive")}>Chainage To</Label>
                            <div className="relative">
                                <MapPin size={18} className={cn("absolute left-3 top-1/2 -translate-y-1/2", errors.location ? "text-rose-500" : "text-primary")} />
                                <Input
                                    id="chainage-to"
                                    placeholder="e.g. 3+850 R.H.S"
                                    value={chainageTo} 
                                    onChange={e => setChainageTo(e.target.value)}
                                    className={cn("pl-10 h-11 shadow-sm", errors.location && "border-destructive")}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="inspection-type">Inspection Type</Label>
                            <div className="relative">
                                <FileText size={18} className="text-primary absolute left-3 top-1/2 -translate-y-1/2" />
                                <Input
                                    id="inspection-type"
                                    placeholder="e.g. P.C.C Work, Box Culvert, Earthwork"
                                    value={inspectionType || ''} 
                                    onChange={e => setInspectionType(e.target.value)}
                                    className="pl-10 h-11 shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="col-span-full space-y-2">
                            <Label htmlFor="work-description" className={cn(errors.description && "text-destructive")}>Work Description for Inspection</Label>
                            <Textarea
                                id="work-description"
                                className={cn("min-h-[100px] shadow-sm", errors.description && "border-destructive")}
                                placeholder="Describe the work being inspected..."
                                value={formData.description || ''} 
                                onChange={e => setFormData({...formData, description: e.target.value})} 
                            />
                        </div>

                        <div className="col-span-full space-y-2">
                            <Label htmlFor="others-specify">Others (specify)</Label>
                            <Input
                                id="others-specify"
                                placeholder="Specify other work types..."
                                value={othersSpecify}
                                onChange={e => setOthersSpecify(e.target.value)}
                                className="h-11 shadow-sm"
                            />
                        </div>

                        <div className="col-span-full border-t border-border/50 my-2" />
                    </div>

                    <div className="mt-8 flex justify-end gap-3">
                        <Button variant="outline" className="h-11 px-6 font-bold" onClick={() => setViewMode('LIST')}>Cancel</Button>
                        <Button onClick={handleSave} className="h-11 px-8 font-black shadow-lg shadow-primary/20">
                            <CheckCircle2 size={18} className="mr-2"/> COMMIT AUDIT LOG
                        </Button>
                    </div>
                </div>
            ) : (
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
                                        {checklistPagination.paginatedData.map((checklist) => (
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
                                {projectChecklists.length === 0 && (
                                    <VisualEmptyState 
                                        icon={ClipboardList}
                                        title="No Checklists Found"
                                        description="Quality checklists are essential for RFI verification. Create a master checklist to begin."
                                        action={<Button variant="outline" size="sm">Create Checklist Master</Button>}
                                    />
                                )}
                                {projectChecklists.length > 0 && (
                                    <div className="p-4 border-t">
                                        <PaginationComponent
                                            currentPage={checklistPagination.currentPage}
                                            totalPages={checklistPagination.totalPages}
                                            pageSize={checklistPagination.pageSize}
                                            totalItems={checklistPagination.totalItems}
                                            onPageChange={checklistPagination.setCurrentPage}
                                            onPageSizeChange={checklistPagination.setPageSize}
                                            pageSizeOptions={[10, 20, 50]}
                                        />
                                    </div>
                                )}
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
                                            <TableHead className="font-black text-[10px] uppercase tracking-widest">Download</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rfiPagination.paginatedData.map((rfi) => {
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
                                                    <TableCell className="text-center">
                                                      <TooltipProvider>
                                                        <Tooltip>
                                                          <TooltipTrigger asChild>
                                                            <Button
                                                              variant="ghost"
                                                              size="icon"
                                                              className="h-8 w-8 hover:text-primary"
                                                              onClick={() => generateSingleRFIPDF(rfi, project)}
                                                              title="Download RFI PDF"
                                                            >
                                                              <FileText className="h-4 w-4" />
                                                            </Button>
                                                          </TooltipTrigger>
                                                          <TooltipContent>Download Official RFI PDF</TooltipContent>
                                                        </Tooltip>
                                                      </TooltipProvider>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-amber-600" onClick={() => handleEdit(rfi)}><Edit2 size={14} className="text-amber-600" /></Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10" onClick={() => handleDelete(rfi.id)}><Trash2 size={14} /></Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                                {filteredRFIs.length === 0 && (
                                    <VisualEmptyState 
                                        icon={FileText}
                                        title="RFI Registry Empty"
                                        description="No inspection requests have been filed yet. Submit an RFI to begin the quality verification process."
                                        action={<Button onClick={handleCreate} size="sm"><Plus size={14} className="mr-2"/> Create First RFI</Button>}
                                    />
                                )}
                                {filteredRFIs.length > 0 && (
                                    <div className="p-4 border-t">
                                        <PaginationComponent
                                            currentPage={rfiPagination.currentPage}
                                            totalPages={rfiPagination.totalPages}
                                            pageSize={rfiPagination.pageSize}
                                            totalItems={rfiPagination.totalItems}
                                            onPageChange={rfiPagination.setCurrentPage}
                                            onPageSizeChange={rfiPagination.setPageSize}
                                            pageSizeOptions={[10, 20, 50]}
                                        />
                                    </div>
                                )}
                            </div>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
};

export default RFIModule;
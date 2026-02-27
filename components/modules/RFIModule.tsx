import React, { useState, useMemo } from 'react';
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
import { toast } from 'sonner'; // Using sonner for toasts

import { Project, RFI, UserRole, RFIStatus, ScheduleTask, Checklist, ChecklistItem } from '../../types';
import { 
    Plus, Eye, Edit2, History, X, ShieldCheck, FileText, Printer, 
    Clock, Lock, CheckCircle2, XCircle, FileSearch, CalendarPlus, 
    Link as LinkIcon, ExternalLink, Calendar, MapPin, BarChart2,
    MessageSquare, User as UserIcon, Circle, Filter, CheckCircle, Trash2,
    ClipboardList, AlertTriangle
} from 'lucide-react';
import StatCard from '../core/StatCard';
import { cn } from '~/lib/utils'; // Assuming cn utility is available for conditional classes
import { Textarea } from '~/components/ui/textarea';

interface Props {
  project: Project;
  userRole: UserRole;
  onProjectUpdate: (project: Project) => void;
}

const RFIModule: React.FC<Props> = ({ project, userRole, onProjectUpdate }) => {
    const [viewMode, setViewMode] = useState<'LIST' | 'UPDATE' | 'CHECKLIST_LIST' | 'CHECKLIST_UPDATE'>('LIST');
    const [formData, setFormData] = useState<Partial<RFI>>({});
    const [locationError, setLocationError] = useState<string | null>(null);
    const [selectedRfiForDetail, setSelectedRfiForDetail] = useState<RFI | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [taskFilter, setTaskFilter] = useState<string>('all');
    const [tabIndex, setTabIndex] = useState("0"); // Use string for Shadcn Tabs value

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
    
    // Additional fields for RFI form
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
    
    // Additional fields based on the RFI document
    const [inspectionType, setInspectionType] = useState('');
    const [specificWorkDetails, setSpecificWorkDetails] = useState('');
    const [inspectionDate, setInspectionDate] = useState('');
    const [engineerRepresentativeComments, setEngineerRepresentativeComments] = useState('');
    const [worksStatus, setWorksStatus] = useState<'Approved' | 'Approved as Noted' | 'Approved for Subsequent Work' | ''>('');
    const [submittedBy, setSubmittedBy] = useState('');
    const [receivedBy, setReceivedBy] = useState('');

    // Checklist related state
    const [checklistFormData, setChecklistFormData] = useState<Partial<Checklist>>({});
    const [checklistInstanceData, setChecklistInstanceData] = useState<any>({});
    const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);
    const [isChecklistDetailModalOpen, setIsChecklistDetailModalOpen] = useState(false);

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

    // Checklist templates based on the requirements from the RFI document
    const checklistTemplates = [
        {
            id: 'setting-out',
            name: 'Setting out/Survey check (Parapet wall)',
            category: 'Quality',
            description: 'Checklist for setting out and survey verification of parapet walls'
        },
        {
            id: 'material-testing',
            name: 'Material testing and Sampling',
            category: 'Quality',
            description: 'Checklist for material testing and sampling procedures'
        },
        {
            id: 'excavation-structures',
            name: 'Excavation for Structures',
            category: 'Quality',
            description: 'Checklist for excavation work for structures'
        },
        {
            id: 'roadway-excavation',
            name: 'Roadway Excavation',
            category: 'Quality',
            description: 'Checklist for roadway excavation work'
        },
        {
            id: 'embankment-filling',
            name: 'Embankment filling',
            category: 'Quality',
            description: 'Checklist for embankment filling work'
        },
        {
            id: 'borrow-material',
            name: 'Embankment filling with Borrow material',
            category: 'Quality',
            description: 'Checklist for embankment filling with borrowed materials'
        },
        {
            id: 'dry-stone-soling',
            name: 'Dry Stone Soling',
            category: 'Quality',
            description: 'Checklist for dry stone soling work'
        },
        {
            id: 'pcc-rrm',
            name: 'PCC M15 RRM work',
            category: 'Quality',
            description: 'Checklist for PCC M15 RRM work'
        },
        {
            id: 'box-culvert-formwork',
            name: 'Formwork (Box culvert raft & wall upto 0.25m)',
            category: 'Quality',
            description: 'Checklist for formwork work on box culvert raft and walls'
        },
        {
            id: 'box-culvert-reinforcement',
            name: 'Reinforcement Work (Box culvert raft & wall upto 0.25m)',
            category: 'Quality',
            description: 'Checklist for reinforcement work on box culvert raft and walls'
        },
        {
            id: 'box-culvert-concreting',
            name: 'Concreting (Box culvert raft & wall upto 0.25m)',
            category: 'Quality',
            description: 'Checklist for concreting work on box culvert raft and walls'
        },
        {
            id: 'slope-protection',
            name: 'Slope Protection Work',
            category: 'Quality',
            description: 'Checklist for slope protection work'
        },
        {
            id: 'bio-engineering',
            name: 'Bio-Engineering Work',
            category: 'Environmental',
            description: 'Checklist for bio-engineering work'
        },
        {
            id: 'electrical-work',
            name: 'Electrical work',
            category: 'Electrical',
            description: 'Checklist for electrical work'
        },
        {
            id: 'sub-grade',
            name: 'Sub Grade Work',
            category: 'Pavement',
            description: 'Checklist for sub grade work'
        },
        {
            id: 'sub-base',
            name: 'Sub Base work',
            category: 'Pavement',
            description: 'Checklist for sub base work'
        },
        {
            id: 'base-work',
            name: 'Base Work',
            category: 'Pavement',
            description: 'Checklist for base work'
        },
        {
            id: 'prime-coat',
            name: 'Prime Coat',
            category: 'Pavement',
            description: 'Checklist for prime coat application'
        },
        {
            id: 'tack-coat',
            name: 'Tack Coat/DBM',
            category: 'Pavement',
            description: 'Checklist for tack coat or DBM application'
        },
        {
            id: 'asphalt-tack-coat',
            name: 'Tack Coat/Asphalt',
            category: 'Pavement',
            description: 'Checklist for asphalt tack coat application'
        }
    ];

    const projectChecklists = project.checklists || [];

    const validateLocation = (loc: string): boolean => {
        // Standard Road Chainage format: [Numbers]+[3 digits] [Side]
        // Matches patterns like: 12+400 RHS, 0+005 LHS, 102+900 Both
        const regex = /^\d+\+\d{3}\s+(LHS|RHS|Both|Both Sides|L|R)$/i;
        if (!loc) return false;
        return regex.test(loc.trim());
    };

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
        setLocationError(null);
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
        
        // Reset new fields based on RFI document
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
        setLocationError(null);
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
        setRequestNumber(rfi.requestNumber || '');
        setWorkingDrawings(rfi.workingDrawings || []);
        
        // Set new fields based on RFI document
        setInspectionType(rfi.inspectionType || '');
        setSpecificWorkDetails(rfi.specificWorkDetails || '');
        setInspectionDate(rfi.inspectionDate || '');
        setEngineerRepresentativeComments(rfi.engineerRepresentativeComments || '');
        setWorksStatus(rfi.worksStatus || '');
        setSubmittedBy(rfi.submittedBy || '');
        setReceivedBy(rfi.receivedBy || '');
    };

    const handleSave = () => {
        if (!formData.description || !formData.location) return;

        if (!validateLocation(formData.location)) {
            setLocationError("Required format: 'Chainage + Side' (e.g., 12+400 RHS)");
            return;
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
            status: formData.status || RFIStatus.OPEN,
            requestedBy: formData.requestedBy || userRole,
            inspectionDate: formData.inspectionDate || inspectionDate,
            inspectionTime: inspectionTime,
            inspectionPurpose: inspectionPurpose,
            inspectionReport: inspectionReport,
            engineerComments: engineerComments,
            areSignature: areSignature,
            iowSignature: iowSignature,
            meSltSignature: meSltSignature,
            reSignature: reSignature,
            requestNumber: requestNumber,
            workingDrawings: workingDrawings,
            submittedBy: formData.submittedBy || submittedBy,
            receivedBy: formData.receivedBy || receivedBy,
            submittedDate: formData.submittedDate,
            receivedDate: formData.receivedDate,
            workflowLog: updatedLog,
            linkedTaskId: formData.linkedTaskId,
            linkedChecklistIds: formData.linkedChecklistIds || [],
            inspectionType: inspectionType,
            specificWorkDetails: specificWorkDetails,
            engineerRepresentativeComments: engineerRepresentativeComments,
            worksStatus: worksStatus
        };

        const updatedRFIs = formData.id
            ? project.rfis.map(r => r.id === formData.id ? newRFI : r)
            : [...project.rfis, newRFI];

        onProjectUpdate({ ...project, rfis: updatedRFIs });
        setViewMode('LIST');
        setFormData({}); // Reset form
    };

    const handleDelete = (rfiId: string) => {
        if (window.confirm('Are you sure you want to delete this RFI? This action cannot be undone and will unlink it from any associated schedule tasks.')) {
            // Remove the RFI from any related entities if needed
            // For example, if any structure work logs reference this RFI
            const updatedStructureAssets = project.structures?.map(structure => {
                const updatedComponents = structure.components?.map(component => {
                    const updatedWorkLogs = component.workLogs.filter(log => log.rfiId !== rfiId);
                    return { ...component, workLogs: updatedWorkLogs };
                });
                return { ...structure, components: updatedComponents };
            }) || project.structures;
            
            const updatedRFIs = project.rfis.filter(r => r.id !== rfiId);
            onProjectUpdate({
                ...project,
                rfis: updatedRFIs,
                structures: updatedStructureAssets
            });
        }
    };

    // Checklist handlers
    const handleCreateChecklist = () => {
        setChecklistFormData({
            name: '',
            category: 'Quality',
            description: '',
            items: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true,
            applicableTo: ['structure', 'task', 'site']
        });
        setViewMode('CHECKLIST_UPDATE');
    };

    const handleEditChecklist = (checklist: Checklist) => {
        setChecklistFormData(checklist);
        setViewMode('CHECKLIST_UPDATE');
    };

    const handleSaveChecklist = () => {
        if (!checklistFormData.name) return;

        const checklistToSave: Checklist = {
            id: checklistFormData.id || `cl-${Date.now()}`,
            name: checklistFormData.name,
            category: checklistFormData.category || 'Quality',
            description: checklistFormData.description || '',
            items: checklistFormData.items || [],
            createdAt: checklistFormData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: checklistFormData.isActive !== undefined ? checklistFormData.isActive : true,
            assignedTo: checklistFormData.assignedTo,
            applicableTo: checklistFormData.applicableTo
        };

        const updatedChecklists = project.checklists
            ? [...project.checklists.filter(c => c.id !== checklistToSave.id), checklistToSave]
            : [checklistToSave];

        onProjectUpdate({ ...project, checklists: updatedChecklists });
        setViewMode('CHECKLIST_LIST');
        setChecklistFormData({});
    };

    const handleDeleteChecklist = (checklistId: string) => {
        if (window.confirm('Are you sure you want to delete this checklist? This action cannot be undone and will unlink it from any associated RFIs.')) {
            // Remove the checklist from any RFIs that reference it
            const updatedRFIs = project.rfis.map(rfi => {
                if (rfi.linkedChecklistIds && rfi.linkedChecklistIds.includes(checklistId)) {
                    return {
                        ...rfi,
                        linkedChecklistIds: rfi.linkedChecklistIds.filter(id => id !== checklistId)
                    };
                }
                return rfi;
            });
            
            const updatedChecklists = project.checklists?.filter(c => c.id !== checklistId) || [];
            onProjectUpdate({
                ...project,
                rfis: updatedRFIs,
                checklists: updatedChecklists
            });
        }
    };

    const addChecklistItem = () => {
        const newItem: ChecklistItem = {
            id: `item-${Date.now()}`,
            title: '',
            description: '',
            required: true,
            valueType: 'boolean',
            order: (checklistFormData.items?.length || 0) + 1
        };
        
        setChecklistFormData({
            ...checklistFormData,
            items: [...(checklistFormData.items || []), newItem]
        });
    };

    const updateChecklistItem = (index: number, field: keyof ChecklistItem, value: any) => {
        const updatedItems = [...(checklistFormData.items || [])];
        updatedItems[index] = { ...updatedItems[index], [field]: value };
        setChecklistFormData({ ...checklistFormData, items: updatedItems });
    };

    const removeChecklistItem = (index: number) => {
        const updatedItems = [...(checklistFormData.items || [])];
        updatedItems.splice(index, 1);
        setChecklistFormData({ ...checklistFormData, items: updatedItems });
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

    // Render checklist editor
    const renderChecklistEditor = () => (
        <Card className="p-6 rounded-xl animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold">Checklist Template Editor</h3>
                    <p className="text-sm text-muted-foreground">Create or edit checklist templates</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setViewMode('CHECKLIST_LIST')}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Label htmlFor="template-name">Template Name</Label>
                    <Input 
                        id="template-name"
                        value={checklistFormData.name || ''} 
                        onChange={e => setChecklistFormData({...checklistFormData, name: e.target.value})} 
                        required
                    />
                </div>
                <div>
                    <Label htmlFor="category">Category</Label>
                    <Select 
                        value={checklistFormData.category || 'Quality'} 
                        onValueChange={value => setChecklistFormData({...checklistFormData, category: value})}
                    >
                        <SelectTrigger id="category">
                            <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Quality">Quality</SelectItem>
                            <SelectItem value="Safety">Safety</SelectItem>
                            <SelectItem value="Environmental">Environmental</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                
                <div className="col-span-1 md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea // Replaced textarea with Shadcn Textarea
                        id="description"
                        className="flex h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={checklistFormData.description || ''} 
                        onChange={e => setChecklistFormData({...checklistFormData, description: e.target.value})} 
                    />
                </div>
                
                <div className="col-span-1 md:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h6 className="text-lg font-bold">Checklist Items</h6>
                        <Button variant="outline" onClick={addChecklistItem}>
                            <Plus size={16} className="mr-2" /> Add Item
                        </Button>
                    </div>
                    
                    {(checklistFormData.items || []).map((item, index) => (
                        <Card key={index} className="p-4 mb-4 border rounded-xl">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor={`item-title-${index}`}>Item Title</Label>
                                    <Input 
                                        id={`item-title-${index}`}
                                        value={item.title || ''} 
                                        onChange={e => updateChecklistItem(index, 'title', e.target.value)} 
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor={`response-type-${index}`}>Response Type</Label>
                                    <Select 
                                        value={item.valueType || 'boolean'} 
                                        onValueChange={value => updateChecklistItem(index, 'valueType', value)}
                                    >
                                        <SelectTrigger id={`response-type-${index}`}>
                                            <SelectValue placeholder="Select response type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="boolean">Yes/No</SelectItem>
                                            <SelectItem value="number">Numeric</SelectItem>
                                            <SelectItem value="text">Text</SelectItem>
                                            <SelectItem value="select">Dropdown</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="col-span-1 md:col-span-2">
                                    <Label htmlFor={`item-description-${index}`}>Description</Label>
                                    <Input 
                                        id={`item-description-${index}`}
                                        value={item.description || ''} 
                                        onChange={e => updateChecklistItem(index, 'description', e.target.value)} 
                                    />
                                </div>
                                
                                <div className="flex items-center space-x-2 col-span-1">
                                    <Checkbox
                                        id={`item-required-${index}`}
                                        checked={item.required || false}
                                        onCheckedChange={checked => updateChecklistItem(index, 'required', checked)}
                                    />
                                    <Label htmlFor={`item-required-${index}`}>Required</Label>
                                </div>
                                
                                <div className="col-span-1 flex justify-end">
                                    <Button 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={() => removeChecklistItem(index)}
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </div>
                            
                            {item.valueType === 'select' && (
                                <div className="col-span-1 md:col-span-2 mt-4">
                                    <Label htmlFor={`options-${index}`}>Options (comma separated)</Label>
                                    <div className="space-y-1">
                                        <Input 
                                            id={`options-${index}`}
                                            value={item.options?.join(', ') || ''} 
                                            onChange={e => updateChecklistItem(index, 'options', e.target.value.split(',').map(opt => opt.trim()))} 
                                        />
                                        <p className="text-xs text-muted-foreground">Enter options separated by commas</p>
                                    </div>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            </div>
            
            <div className="mt-8 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setViewMode('CHECKLIST_LIST')}>Cancel</Button>
                <Button onClick={handleSaveChecklist}>
                    <CheckCircle2 size={18} className="mr-2"/> Save Template
                </Button>
            </div>
        </Card>
    );

    if (viewMode === 'CHECKLIST_UPDATE') return renderChecklistEditor();

    if (viewMode === 'UPDATE') return (
        <div className="p-4 rounded-xl animate-in slide-in-from-right duration-300 border bg-background"> {/* Replaced Paper */}
            <div className="flex justify-between mb-4 items-center"> {/* Replaced Box */}
                <div> {/* Replaced Box */}
                    <h3 className="text-lg font-bold">Technical Inspection Request</h3> {/* Replaced Typography */}
                    <p className="text-sm text-muted-foreground">Project Quality Verification Form</p> {/* Replaced Typography */}
                </div>
                <Button variant="ghost" size="icon" onClick={() => setViewMode('LIST')}><X /></Button> {/* Replaced IconButton */}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {/* Replaced Grid container */}
                <div className="col-span-1 md:col-span-1"> {/* Replaced Grid item */}
                    <Label htmlFor="rfi-location">Location (Chainage + Side)</Label>
                    <div className="relative">
                        <MapPin size={18} className={cn("absolute left-3 top-1/2 -translate-y-1/2", locationError ? "text-rose-500" : "text-primary")} />
                        <Input
                            id="rfi-location"
                            placeholder="e.g. 12+400 RHS"
                            value={formData.location || ''} 
                            onChange={e => {
                                setFormData({...formData, location: e.target.value});
                                if (locationError) setLocationError(null);
                            }}
                            required
                            className={cn("pl-9", locationError && "border-rose-500")}
                        />
                    </div>
                    {locationError && <p className="text-sm text-rose-500 mt-1">{locationError}</p>}
                    {!locationError && <p className="text-sm text-muted-foreground mt-1">Format: [Km]+[Mtrs] [Side] e.g. 12+400 RHS</p>}
                </div>
                <div className="col-span-1 md:col-span-1"> {/* Replaced Grid item */}
                    <Label htmlFor="request-number">Request Number</Label>
                    <div className="relative">
                        <FileText size={18} className="text-primary absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            id="request-number"
                            placeholder="e.g. RFI-001"
                            value={requestNumber || ''} 
                            onChange={e => setRequestNumber(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>
                
                <div className="col-span-1 md:col-span-1"> {/* Replaced Grid item */}
                    <Label htmlFor="inspection-type">Inspection Type</Label>
                    <div className="relative">
                        <FileText size={18} className="text-primary absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            id="inspection-type"
                            placeholder="e.g. Box Culvert, Earthwork, etc."
                            value={inspectionType || ''} 
                            onChange={e => setInspectionType(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>
                <div className="col-span-1 md:col-span-1"> {/* Replaced Grid item */}
                    <Label htmlFor="inspection-date">Inspection Date</Label>
                    <Input
                        id="inspection-date" 
                        type="date" 
                        value={inspectionDate || ''} 
                        onChange={e => setInspectionDate(e.target.value)} 
                    />
                </div>
                
                <div className="col-span-1 md:col-span-1"> {/* Replaced Grid item */}
                    <Label htmlFor="request-date">Request Date</Label>
                    <Input
                        id="request-date" 
                        type="date" 
                        value={formData.date || ''} 
                        onChange={e => setFormData({...formData, date: e.target.value})} 
                    />
                </div>
                <div className="col-span-1 md:col-span-1"> {/* Replaced Grid item */}
                    <Label htmlFor="inspection-time">Inspection Time</Label>
                    <Input
                        id="inspection-time" 
                        type="time" 
                        value={inspectionTime || ''} 
                        onChange={e => setInspectionTime(e.target.value)} 
                    />
                </div>
                
                <div className="col-span-1 md:col-span-1"> {/* Replaced Grid item */}
                    <Label htmlFor="inspection-purpose">Inspection Purpose</Label>
                    <Select 
                        value={inspectionPurpose} 
                        onValueChange={value => setInspectionPurpose(value as 'First' | 'Second' | 'Third' | 'Routine' | 'Special' | 'Other')}
                    >
                        <SelectTrigger id="inspection-purpose">
                            <SelectValue placeholder="Select purpose" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="First">First Inspection</SelectItem>
                            <SelectItem value="Second">Second Inspection</SelectItem>
                            <SelectItem value="Third">Third Inspection</SelectItem>
                            <SelectItem value="Routine">Routine Inspection</SelectItem>
                            <SelectItem value="Special">Special Inspection</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="col-span-1 md:col-span-1"> {/* Replaced Grid item */}
                    <Label htmlFor="update-status">Update Status</Label>
                    <Select 
                        value={formData.status || RFIStatus.OPEN} 
                        onValueChange={value => setFormData({...formData, status: value as RFIStatus})}
                    >
                        <SelectTrigger id="update-status">
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={RFIStatus.OPEN}>Open / Pending Inspection</SelectItem>
                            <SelectItem value={RFIStatus.APPROVED}>Approved / Verified</SelectItem>
                            <SelectItem value={RFIStatus.REJECTED}>Rejected / Rectification Needed</SelectItem>
                            <SelectItem value={RFIStatus.CLOSED}>Closed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                
                <div className="col-span-2"> {/* Replaced Grid item */}
                    <Label htmlFor="work-description">Work Description for Inspection</Label>
                    <Textarea
                        id="work-description"
                        className="flex h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Define scope for verification (e.g. Reinforcement, GSB Layer, BC Mix)..."
                        value={formData.description || ''} 
                        onChange={e => setFormData({...formData, description: e.target.value})} 
                    ></Textarea>
                </div>
                
                <div className="col-span-2"> {/* Replaced Grid item */}
                    <Label htmlFor="specific-work-details">Specific Work Details</Label>
                    <Textarea 
                        id="specific-work-details"
                        className="flex h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Provide detailed information about particular work items..."
                        value={specificWorkDetails || ''} 
                        onChange={e => setSpecificWorkDetails(e.target.value)} 
                    ></Textarea>
                </div>
                
                <div className="col-span-2"> {/* Replaced Grid item */}
                    <Label htmlFor="inspection-report">Inspection Report</Label>
                    <Textarea 
                        id="inspection-report"
                        className="flex h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Record findings and observations from the inspection..."
                        value={inspectionReport || ''} 
                        onChange={e => setInspectionReport(e.target.value)} 
                    ></Textarea>
                </div>
                
                <div className="col-span-2"> {/* Replaced Grid item */}
                    <Label htmlFor="engineer-comments">Engineer's Representative Comments</Label>
                    <Textarea 
                        id="engineer-comments"
                        className="flex h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Add any comments or observations from the engineer..."
                        value={engineerComments || ''} 
                        onChange={e => setEngineerComments(e.target.value)} 
                    ></Textarea>
                </div>
                
                <div className="col-span-2"> {/* Replaced Grid item */}
                    <Label htmlFor="engineer-representative-comments">Engineer Representative's Comments</Label>
                    <Textarea 
                        id="engineer-representative-comments"
                        className="flex h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Comments from the engineer representative..."
                        value={engineerRepresentativeComments || ''} 
                        onChange={e => setEngineerRepresentativeComments(e.target.value)} 
                    ></Textarea>
                </div>
                
                <div className="col-span-1 md:col-span-1"> {/* Replaced Grid item */}
                    <Label htmlFor="works-status">Works Status</Label>
                    <Select 
                        value={worksStatus} 
                        onValueChange={value => setWorksStatus(value as 'Approved' | 'Approved as Noted' | 'Approved for Subsequent Work' | '')}
                    >
                        <SelectTrigger id="works-status">
                            <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">Select Status</SelectItem>
                            <SelectItem value="Approved">Approved</SelectItem>
                            <SelectItem value="Approved as Noted">Approved as Noted</SelectItem>
                            <SelectItem value="Approved for Subsequent Work">Approved for Subsequent Work</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                
                <div className="col-span-1 md:col-span-1"> {/* Replaced Grid item */}
                    <Label htmlFor="are-iow-signature">ARE/IOW Signature</Label>
                    <div className="relative">
                        <UserIcon size={18} className="text-primary absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            id="are-iow-signature"
                            placeholder="Enter signature details"
                            value={areSignature || ''} 
                            onChange={e => setAreSignature(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>
                <div className="col-span-1 md:col-span-1"> {/* Replaced Grid item */}
                    <Label htmlFor="me-slt-signature">ME/SLT Signature</Label>
                    <div className="relative">
                        <UserIcon size={18} className="text-primary absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            id="me-slt-signature"
                            placeholder="Enter signature details"
                            value={meSltSignature || ''} 
                            onChange={e => setMeSltSignature(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>
                
                <div className="col-span-1 md:col-span-1"> {/* Replaced Grid item */}
                    <Label htmlFor="iow-signature">IOW Signature</Label>
                    <div className="relative">
                        <UserIcon size={18} className="text-primary absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            id="iow-signature"
                            placeholder="Enter signature details"
                            value={iowSignature || ''} 
                            onChange={e => setIowSignature(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>
                <div className="col-span-1 md:col-span-1"> {/* Replaced Grid item */}
                    <Label htmlFor="re-signature">RE Signature</Label>
                    <div className="relative">
                        <UserIcon size={18} className="text-primary absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            id="re-signature"
                            placeholder="Enter signature details"
                            value={reSignature || ''} 
                            onChange={e => setReSignature(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>
                
                <div className="col-span-1 md:col-span-1"> {/* Replaced Grid item */}
                    <Label htmlFor="submitted-by">Submitted By</Label>
                    <div className="relative">
                        <UserIcon size={18} className="text-primary absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            id="submitted-by"
                            placeholder="Name of person submitting the RFI"
                            value={submittedBy || ''} 
                            onChange={e => setSubmittedBy(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>
                <div className="col-span-1 md:col-span-1"> {/* Replaced Grid item */}
                    <Label htmlFor="received-by">Received By</Label>
                    <div className="relative">
                        <UserIcon size={18} className="text-primary absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            id="received-by"
                            placeholder="Name of person receiving the RFI"
                            value={receivedBy || ''} 
                            onChange={e => setReceivedBy(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>
                
                {/* Linked Task Selector */}
                <div className="col-span-1 md:col-span-1"> {/* Replaced Grid item */}
                    <Label htmlFor="linked-task">Link to Schedule Task</Label>
                    <Select
                        value={formData.linkedTaskId || ''}
                        onValueChange={value => setFormData({...formData, linkedTaskId: value})}
                    >
                        <SelectTrigger id="linked-task" className="pl-9">
                            <LinkIcon size={18} className="text-primary absolute left-3 top-1/2 -translate-y-1/2" />
                            <SelectValue placeholder="Bind this inspection to an activity..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {project.schedule.map(task => (
                                <SelectItem key={task.id} value={task.id}>
                                    <div className="flex justify-between items-center w-full">
                                        <h4 className="font-bold">{task.name}</h4>
                                        <Badge variant="outline">{task.progress}%</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{task.startDate} to {task.endDate}</p>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                
                {/* Linked Checklists Selector */}
                <div className="col-span-1 md:col-span-1"> {/* Replaced Grid item */}
                    <Label htmlFor="linked-checklists">Linked Checklists</Label>
                    {/* Shadcn Select does not support multiple selection directly. Will need a custom solution or alternative here if multi-select is critical. */}
                    <Select
                        value={formData.linkedChecklistIds?.[0] || ''} // Only show first selected for now
                        onValueChange={value => setFormData({...formData, linkedChecklistIds: value ? [value] : []})}
                    >
                        <SelectTrigger id="linked-checklists" className="pl-9">
                            <ClipboardList size={18} className="text-primary absolute left-3 top-1/2 -translate-y-1/2" />
                            <SelectValue placeholder="Select associated checklists..." />
                        </SelectTrigger>
                        <SelectContent>
                            {project.checklists?.map(checklist => (
                                <SelectItem key={checklist.id} value={checklist.id}>
                                    {checklist.name} ({checklist.category})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {/* If multiple checklists are needed, a custom multi-select component or a different approach would be required. */}
                    {formData.linkedChecklistIds && formData.linkedChecklistIds.length > 1 && (
                        <p className="text-sm text-yellow-600 mt-1">
                            Only the first linked checklist is shown. Multi-select requires custom component.
                        </p>
                    )}
                </div>
                
                <div className="col-span-1 md:col-span-1"> {/* Replaced Grid item */}
                    <Label htmlFor="working-drawings">Working Drawings Attachment</Label>
                    <div className="relative">
                        <FileSearch size={18} className="text-primary absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            id="working-drawings"
                            placeholder="Upload or reference working drawings"
                            value={workingDrawings.join(', ') || ''} 
                            onChange={e => setWorkingDrawings(e.target.value.split(',').map(item => item.trim()))}
                            className="pl-9"
                        />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Separate multiple drawing references with commas</p>
                </div>
            </div>

            <div className="mt-4 flex justify-end gap-2"> {/* Replaced Box */}
                <Button variant="outline" onClick={() => {setViewMode('LIST'); setFormData({});}}>Back</Button>
                <Button onClick={handleSave} className="shadow-md"> {/* Replaced variant="contained" color="primary" sx={{ boxShadow: 2 }} */}
                    <CheckCircle2 size={18} className="mr-2"/> Commit Audit Log
                </Button>
            </div>
        </div>
    );

    // Render checklist list view
    if (viewMode === 'CHECKLIST_LIST') {
        return (
            <div className="animate-in fade-in duration-500"> {/* Replaced Box */}
                <div className="flex justify-between mb-4 items-center"> {/* Replaced Box */}
                    <div> {/* Replaced Box */}
                        <h3 className="text-2xl font-extrabold">Quality Checklists</h3> {/* Replaced Typography */}
                        <p className="text-sm text-muted-foreground">Verification of works against quality standards</p> {/* Replaced Typography */}
                    </div>
                    <div className="flex space-x-2 items-center"> {/* Replaced Stack */}
                        <Button onClick={handleCreateChecklist} className="rounded-md shadow-md"> {/* Replaced variant="contained" color="primary" sx={{ borderRadius: 2, boxShadow: 2 }} */}
                            <Plus className="mr-2" />New Checklist
                        </Button>
                        <Button variant="outline" onClick={() => setViewMode('LIST')} className="rounded-md"> {/* Replaced variant="outlined" color="secondary" sx={{ borderRadius: 2 }} */}
                            RFI Requests
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-4"> {/* Replaced Grid container */}
                    <div className="col-span-1"> {/* Replaced Grid item */}
                        <StatCard title="Total" value={projectChecklists.length} icon={FileText} color="#4f46e5" />
                    </div>
                    <div className="col-span-1"> {/* Replaced Grid item */}
                        <StatCard title="Active" value={projectChecklists.filter(c => c.isActive).length} icon={CheckCircle} color="#10b981" />
                    </div>
                    <div className="col-span-1"> {/* Replaced Grid item */}
                        <StatCard title="Quality" value={projectChecklists.filter(c => c.category === 'Quality').length} icon={ShieldCheck} color="#8b5cf6" />
                    </div>
                    <div className="col-span-1"> {/* Replaced Grid item */}
                        <StatCard title="Safety" value={projectChecklists.filter(c => c.isActive).length} icon={Lock} color="#ef4444" />
                    </div>
                </div>

                <div className="border rounded-xl overflow-hidden bg-background"> {/* Replaced Paper */}
                    <Table>
                        <TableHead className="bg-muted"> {/* Replaced sx={{ bgcolor: 'action.hover' }} */}
                            <TableRow>
                                <TableCell className="font-bold">Name</TableCell>
                                <TableCell className="font-bold">Category</TableCell>
                                <TableCell className="font-bold">Items Count</TableCell>
                                <TableCell className="font-bold">Status</TableCell>
                                <TableCell className="font-bold">Created</TableCell>
                                <TableCell align="right" className="font-bold">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {projectChecklists.map((checklist, index) => (
                                <TableRow key={checklist.id} className="group hover:bg-muted"> {/* Replaced hover sx */}
                                    <TableCell className="font-bold">{checklist.name}</TableCell> {/* Replaced Typography */}
                                    <TableCell>
                                        <Badge 
                                            variant="outline"
                                            className={cn(
                                                checklist.category === 'Quality' && 'border-primary text-primary',
                                                checklist.category === 'Safety' && 'border-orange-500 text-orange-500', // Assuming warning
                                                checklist.category === 'Environmental' && 'border-gray-500 text-gray-500' // Assuming default
                                            )}
                                        >
                                            {checklist.category}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{checklist.items.length}</TableCell>
                                    <TableCell>
                                        <Badge 
                                            variant="outline"
                                            className={cn(
                                                checklist.isActive ? 'border-green-500 text-green-500' : 'border-gray-500 text-gray-500'
                                            )}
                                        >
                                            {checklist.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{new Date(checklist.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell align="right">
                                        <div className="flex space-x-0 justify-end opacity-0 group-hover:opacity-100 transition-opacity"> {/* Replaced Stack */}
                                            <Button variant="ghost" size="icon" onClick={() => handleEditChecklist(checklist)}><Edit2 size={16}/></Button> {/* Replaced IconButton */}
                                            <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteChecklist(checklist.id)}><Trash2 size={16}/></Button> {/* Replaced IconButton */}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            
                            {checklistTemplates.map((template, index) => (
                                <TableRow key={`template-${template.id}`} className="group hover:bg-muted"> {/* Replaced hover sx */}
                                    <TableCell className="font-bold">{template.name}</TableCell> {/* Replaced Typography */}
                                    <TableCell>
                                        <Badge 
                                            variant="outline"
                                            className={cn(
                                                template.category === 'Quality' && 'border-primary text-primary',
                                                template.category === 'Safety' && 'border-orange-500 text-orange-500',
                                                template.category === 'Environmental' && 'border-gray-500 text-gray-500'
                                            )}
                                        >
                                            {template.category}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>N/A (Template)</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="border-blue-500 text-blue-500"> {/* Replaced color="info" */}
                                            Template
                                        </Badge>
                                    </TableCell>
                                    <TableCell>-</TableCell>
                                    <TableCell align="right">
                                        <div className="flex space-x-0 justify-end opacity-0 group-hover:opacity-100 transition-opacity"> {/* Replaced Stack */}
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => {
                                                    const newChecklist: Checklist = {
                                                        id: `cl-${Date.now()}`,
                                                        name: template.name,
                                                        category: template.category,
                                                        description: template.description,
                                                        items: [], 
                                                        createdAt: new Date().toISOString(),
                                                        updatedAt: new Date().toISOString(),
                                                        isActive: true,
                                                        applicableTo: ['structure', 'task', 'site']
                                                    };
                                                    setChecklistFormData(newChecklist);
                                                    setViewMode('CHECKLIST_UPDATE');
                                                }}
                                            >
                                                <Plus size={16}/>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            
                            {projectChecklists.length === 0 && checklistTemplates.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10"> {/* Replaced align, colSpan, sx, Typography */}
                                        <p className="text-sm text-muted-foreground">No checklists found.</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                
                <div className="mt-3 flex justify-end"> {/* Replaced Box */}
                    <Button 
                        onClick={handleCreateChecklist}
                        className="rounded-md shadow-md"
                    >
                        <Plus className="mr-2" />Create New Checklist
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h5 className="text-xl font-extrabold">Technical Inspection & Quality Registry</h5>
                    <p className="text-sm text-gray-500">Verification of works against contract specifications</p>
                </div>
                <div className="flex items-center space-x-4">
                    <Label htmlFor="activity-filter" className="sr-only">Filter by Activity</Label>
                    <Select
                        value={taskFilter}
                        onValueChange={setTaskFilter}
                    >
                        <SelectTrigger id="activity-filter" className="w-[220px]">
                            <Filter size={14} className="mr-2" />
                            <SelectValue placeholder="Filter by Activity" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Project Activities</SelectItem>
                            <Separator />
                            {project.schedule.map(task => (
                                <SelectItem key={task.id} value={task.id}>{task.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleCreate}>
                        <Plus size={16} className="mr-2" /> New RFI
                    </Button>
                </div>
            </div>

            <Tabs value={tabIndex} onValueChange={(value) => setTabIndex(value)}>
                <TabsList className="grid w-full grid-cols-2 h-auto rounded-none p-0 mb-6">
                    <TabsTrigger value="0" className="flex items-center gap-2 py-3 border-b-2 border-transparent data-[state=active]:border-primary rounded-none">
                      <ClipboardList size={16} /> Checklists
                    </TabsTrigger>
                    <TabsTrigger value="1" className="flex items-center gap-2 py-3 border-b-2 border-transparent data-[state=active]:border-primary rounded-none">
                      <FileText size={16} /> RFI Requests
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="0">
                    <div className="space-y-4"> {/* Replaced Box */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-4"> {/* Replaced Grid container */}
                            <div className="col-span-1"> {/* Replaced Grid item */}
                                <StatCard title="Total" value={projectChecklists.length} icon={FileText} color="#4f46e5" />
                            </div>
                            <div className="col-span-1"> {/* Replaced Grid item */}
                                <StatCard title="Active" value={projectChecklists.filter(c => c.isActive).length} icon={CheckCircle} color="#10b981" />
                            </div>
                            <div className="col-span-1"> {/* Replaced Grid item */}
                                <StatCard title="Quality" value={projectChecklists.filter(c => c.category === 'Quality').length} icon={ShieldCheck} color="#8b5cf6" />
                            </div>
                            <div className="col-span-1"> {/* Replaced Grid item */}
                                <StatCard title="Safety" value={projectChecklists.filter(c => c.isActive).length} icon={Lock} color="#ef4444" />
                            </div>
                        </div>

                        <div className="border rounded-xl overflow-hidden bg-background"> {/* Replaced Paper */}
                            <Table>
                                <TableHead className="bg-muted"> {/* Replaced sx={{ bgcolor: 'action.hover' }} */}
                                    <TableRow>
                                        <TableCell className="font-bold">Name</TableCell>
                                        <TableCell className="font-bold">Category</TableCell>
                                        <TableCell className="font-bold">Items Count</TableCell>
                                        <TableCell className="font-bold">Status</TableCell>
                                        <TableCell className="font-bold">Created</TableCell>
                                        <TableCell align="right" className="font-bold">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {projectChecklists.map((checklist, index) => (
                                        <TableRow key={checklist.id} className="group hover:bg-muted"> {/* Replaced hover sx */}
                                            <TableCell className="font-bold">{checklist.name}</TableCell> {/* Replaced Typography */}
                                            <TableCell>
                                                <Badge 
                                                    variant="outline"
                                                    className={cn(
                                                        checklist.category === 'Quality' && 'border-primary text-primary',
                                                        checklist.category === 'Safety' && 'border-orange-500 text-orange-500', // Assuming warning
                                                        checklist.category === 'Environmental' && 'border-gray-500 text-gray-500' // Assuming default
                                                    )}
                                                >
                                                    {checklist.category}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{checklist.items.length}</TableCell>
                                            <TableCell>
                                                <Badge 
                                                    variant="outline"
                                                    className={cn(
                                                        checklist.isActive ? 'border-green-500 text-green-500' : 'border-gray-500 text-gray-500'
                                                    )}
                                                >
                                                    {checklist.isActive ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{new Date(checklist.createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell align="right">
                                                <div className="flex space-x-0 justify-end opacity-0 group-hover:opacity-100 transition-opacity"> {/* Replaced Stack */}
                                                    <Button variant="ghost" size="icon" onClick={() => handleEditChecklist(checklist)} aria-label="Edit Checklist"><Edit2 size={16}/></Button> {/* Replaced IconButton */}
                                                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteChecklist(checklist.id)} aria-label="Delete Checklist"><Trash2 size={16}/></Button> {/* Replaced IconButton */}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    
                                    {checklistTemplates.map((template, index) => (
                                        <TableRow key={`template-${template.id}`} className="group hover:bg-muted"> {/* Replaced hover sx */}
                                            <TableCell className="font-bold">{template.name}</TableCell> {/* Replaced Typography */}
                                            <TableCell>
                                                <Badge 
                                                    variant="outline"
                                                    className={cn(
                                                        template.category === 'Quality' && 'border-primary text-primary',
                                                        template.category === 'Safety' && 'border-orange-500 text-orange-500',
                                                        template.category === 'Environmental' && 'border-gray-500 text-gray-500'
                                                    )}
                                                >
                                                    {template.category}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>N/A (Template)</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="border-blue-500 text-blue-500"> {/* Replaced color="info" */}
                                                    Template
                                                </Badge>
                                            </TableCell>
                                            <TableCell>-</TableCell>
                                            <TableCell align="right">
                                                <div className="flex space-x-0 justify-end opacity-0 group-hover:opacity-100 transition-opacity"> {/* Replaced Stack */}
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        aria-label="Create from Template"
                                                        onClick={() => {
                                                            const newChecklist: Checklist = {
                                                                id: `cl-${Date.now()}`,
                                                                name: template.name,
                                                                category: template.category,
                                                                description: template.description,
                                                                items: [], 
                                                                createdAt: new Date().toISOString(),
                                                                updatedAt: new Date().toISOString(),
                                                                isActive: true,
                                                                applicableTo: ['structure', 'task', 'site']
                                                            };
                                                            setChecklistFormData(newChecklist);
                                                            setViewMode('CHECKLIST_UPDATE');
                                                        }}
                                                    >
                                                        <Plus size={16}/>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    
                                    {projectChecklists.length === 0 && checklistTemplates.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-10"> {/* Replaced align, colSpan, sx, Typography */}
                                                <p className="text-sm text-muted-foreground">No checklists found.</p>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        
                        <div className="mt-3 flex justify-end"> {/* Replaced Box */}
                            <Button 
                                onClick={handleCreateChecklist}
                                className="rounded-md shadow-md"
                            >
                                <Plus className="mr-2" />Create New Checklist
                            </Button>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-4"> {/* Replaced Grid container */}
                        <div className="col-span-1"> {/* Replaced Grid item */}
                            <StatCard title="Open" value={statusCounts[RFIStatus.OPEN]} icon={Clock} color="#4f46e5" />
                        </div>
                        <div className="col-span-1"> {/* Replaced Grid item */}
                            <StatCard title="Approved" value={statusCounts[RFIStatus.APPROVED]} icon={CheckCircle} color="#10b981" />
                        </div>
                        <div className="col-span-1"> {/* Replaced Grid item */}
                            <StatCard title="Rejected" value={statusCounts[RFIStatus.REJECTED]} icon={XCircle} color="#f43f5e" />
                        </div>
                        <div className="col-span-1"> {/* Replaced Grid item */}
                            <StatCard title="Closed" value={statusCounts[RFIStatus.CLOSED]} icon={Lock} color="#64748b" />
                        </div>
                    </div>

                    <div className="border rounded-xl overflow-hidden bg-background"> {/* Replaced Paper */}
                        <Table>
                            <TableHead className="bg-muted"> {/* Replaced sx={{ bgcolor: 'action.hover' }} */}
                                <TableRow>
                                    <TableCell className="font-bold">Ref #</TableCell>
                                    <TableCell className="font-bold">Location</TableCell>
                                    <TableCell className="font-bold">Type</TableCell>
                                    <TableCell className="font-bold">Linked Activity</TableCell>
                                    <TableCell className="font-bold">Work Scope</TableCell>
                                    <TableCell className="font-bold">Status</TableCell>
                                    <TableCell align="right" className="font-bold">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredRFIs.map((rfi, index) => {
                                    const linkedTask = project.schedule.find(t => t.id === rfi.linkedTaskId);
                                    return (
                                        <TableRow key={rfi.id} className="group hover:bg-muted"> {/* Replaced hover sx */}
                                            <TableCell className="font-bold text-primary font-mono">{rfi.rfiNumber}</TableCell> {/* Replaced sx, Typography */}
                                            <TableCell className="font-bold">{rfi.location}</TableCell> {/* Replaced Typography */}
                                            <TableCell>{rfi.inspectionType || 'N/A'}</TableCell> {/* Replaced Typography */}
                                            <TableCell>
                                                {linkedTask ? (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="min-w-[140px]"> {/* Replaced Box sx */}
                                                                    <p className="font-bold block leading-tight mb-0.5">{linkedTask.name}</p> {/* Replaced Typography */}
                                                                    <Progress value={linkedTask.progress} className="h-1.5 mt-0.5 rounded-full" /> {/* Replaced LinearProgress sx */}
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                Task Progress: {linkedTask.progress}%
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground italic">—</p>
                                                )}
                                            </TableCell>
                                            <TableCell className="max-w-[200px] overflow-hidden whitespace-nowrap text-ellipsis">{rfi.description}</TableCell> {/* Replaced sx, Typography */}
                                            <TableCell>
                                                <Badge 
                                                    className={cn(
                                                        "font-extrabold text-[9px] h-4", // Replaced fontWeight, fontSize, height
                                                        rfi.status === RFIStatus.APPROVED && 'bg-green-100 text-green-800', // Replaced color="success"
                                                        rfi.status === RFIStatus.REJECTED && 'bg-red-100 text-red-800', // Replaced color="error"
                                                        rfi.status === RFIStatus.OPEN && 'bg-blue-100 text-blue-800' // Replaced color="primary"
                                                    )} 
                                                >
                                                    {rfi.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell align="right">
                                                <div className="flex space-x-0 justify-end"> {/* Replaced Stack */}
                                                    <Button variant="ghost" size="icon" onClick={() => { setSelectedRfiForDetail(rfi); setIsDetailModalOpen(true); }} aria-label="View RFI"><Eye size={16}/></Button> {/* Replaced IconButton */}
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(rfi)} aria-label="Edit RFI"><Edit2 size={16}/></Button> {/* Replaced IconButton */}
                                                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(rfi.id)} aria-label="Delete RFI"><Trash2 size={16}/></Button> {/* Replaced IconButton */}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {filteredRFIs.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10"> {/* Replaced align, colSpan, sx, Typography */}
                                            <p className="text-sm text-muted-foreground">No inspection requests found for this filter.</p>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>

            <Dialog open={isDetailModalOpen} onOpenChange={() => setIsDetailModalOpen(false)}> {/* Replaced onClose, maxWidth, fullWidth, PaperProps */}
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0"> {/* Replaced sx */}
                    <DialogHeader className="border-b border-muted p-4 flex-row justify-between items-center"> {/* Replaced sx */}
                        <div className="flex items-center gap-1.5"> {/* Replaced Box */}
                            <FileText size={24} className="text-primary"/> {/* Replaced color="primary.main" */}
                            <div> {/* Replaced Box */}
                                <h3 className="text-lg font-bold">Technical Inspection Report</h3> {/* Replaced Typography */}
                                <p className="text-sm text-muted-foreground">{selectedRfiForDetail?.rfiNumber}</p> {/* Replaced Typography */}
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setIsDetailModalOpen(false)}><X/></Button> {/* Replaced IconButton */}
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-0 bg-background"> {/* Replaced DialogContent sx */}
                        {selectedRfiForDetail && (
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-0 h-full"> {/* Replaced Grid container, spacing */}
                                <div className="col-span-12 md:col-span-7 p-4 border-r border-muted"> {/* Replaced Grid item sx */}
                                    <div className="flex flex-col gap-4"> {/* Replaced Stack */}
                                        <div> {/* Replaced Box */}
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">INSPECTION DESCRIPTION</p> {/* Replaced Typography */}
                                            <div className="border p-2 mt-1.5 bg-background rounded-md"> {/* Replaced Paper sx */}
                                                <p className="text-sm leading-relaxed">{selectedRfiForDetail.description}</p> {/* Replaced Typography */}
                                            </div>
                                        </div>
                                        
                                        {selectedRfiForDetail.specificWorkDetails && (
                                            <div> {/* Replaced Box */}
                                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">SPECIFIC WORK DETAILS</p> {/* Replaced Typography */}
                                                <div className="border p-2 mt-1.5 bg-background rounded-md"> {/* Replaced Paper sx */}
                                                    <p className="text-sm leading-relaxed">{selectedRfiForDetail.specificWorkDetails}</p> {/* Replaced Typography */}
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div> {/* Replaced Box */}
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">WORKFLOW AUDIT TRAIL</p> {/* Replaced Typography */}
                                            <div className="mt-2.5"> {/* Replaced Box */}
                                                {selectedRfiForDetail.workflowLog && selectedRfiForDetail.workflowLog.length > 0 ? (
                                                    <div className="flex flex-col"> {/* Replaced Stack */}
                                                        {selectedRfiForDetail.workflowLog.map((log, idx) => (
                                                            <div key={idx} className={cn(
                                                                "flex gap-2 relative",
                                                                idx === selectedRfiForDetail.workflowLog!.length - 1 ? 'pb-0' : 'pb-3'
                                                            )}> {/* Replaced Box sx */}
                                                                {idx !== selectedRfiForDetail.workflowLog!.length - 1 && (
                                                                    <div className="absolute left-[15px] top-[32px] bottom-0 w-0.5 bg-border" />
                                                                )}
                                                                
                                                                <Avatar className="w-8 h-8 bg-background border-2 border-border z-10 flex items-center justify-center"> {/* Replaced Avatar sx */}
                                                                    {getStageIcon(log.stage)}
                                                                </Avatar>
                                                                
                                                                <div className="flex-1"> {/* Replaced Box */}
                                                                    <div className="flex justify-between items-center"> {/* Replaced Box */}
                                                                        <p className="text-sm font-bold text-primary uppercase">{log.stage}</p> {/* Replaced Typography */}
                                                                        <p className="text-xs text-muted-foreground font-mono"> {/* Replaced Typography sx */}
                                                                            {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                                        </p>
                                                                    </div>
                                                                    <p className="text-xs block text-primary font-bold"> {/* Replaced Typography */}
                                                                        Action by: {log.user}
                                                                    </p>
                                                                    {log.comments && (
                                                                        <div className="bg-background p-1 rounded-sm border border-border mt-0.5"> {/* Replaced Typography sx */}
                                                                            <p className="text-sm text-muted-foreground">{log.comments}</p> {/* Replaced Typography */}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground italic">No history recorded.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-span-12 md:col-span-5 p-4 bg-muted"> {/* Replaced Grid item sx */}
                                    <div className="flex flex-col gap-3"> {/* Replaced Stack */}
                                        <div> {/* Replaced Box */}
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">LOCATION / CHAINAGE</p> {/* Replaced Typography */}
                                            <p className="text-lg font-bold flex items-center gap-1 mt-1"> {/* Replaced Typography sx */}
                                                <MapPin size={18} className="text-primary"/> {selectedRfiForDetail.location} {/* Replaced color="primary.main" */}
                                            </p>
                                        </div>

                                        <Separator /> {/* Replaced Divider */}

                                        <div> {/* Replaced Box */}
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">CURRENT STATUS</p> {/* Replaced Typography sx */}
                                            <Badge 
                                                className={cn(
                                                    "font-bold h-10 rounded-md w-full justify-center", // Replaced sx
                                                    selectedRfiForDetail.status === RFIStatus.APPROVED && 'bg-green-100 text-green-800',
                                                    selectedRfiForDetail.status === RFIStatus.REJECTED && 'bg-red-100 text-red-800',
                                                    selectedRfiForDetail.status === RFIStatus.OPEN && 'bg-blue-100 text-blue-800' // Assuming primary is blue
                                                )}
                                            >
                                                {selectedRfiForDetail.status.toUpperCase()}
                                            </Badge>
                                        </div>
                                        
                                        {selectedRfiForDetail.worksStatus && (
                                            <div> {/* Replaced Box */}
                                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">WORKS STATUS</p> {/* Replaced Typography sx */}
                                                <Badge 
                                                    className={cn(
                                                        "font-bold h-10 rounded-md w-full justify-center", // Replaced sx
                                                        selectedRfiForDetail.worksStatus === 'Approved' && 'bg-green-100 text-green-800',
                                                        selectedRfiForDetail.worksStatus === 'Approved as Noted' && 'bg-orange-100 text-orange-800', // Assuming warning
                                                        selectedRfiForDetail.worksStatus === 'Approved for Subsequent Work' && 'bg-blue-100 text-blue-800' // Assuming primary
                                                    )}
                                                >
                                                    {selectedRfiForDetail.worksStatus}
                                                </Badge>
                                            </div>
                                        )}

                                        <div className="border p-2.5 rounded-xl bg-background"> {/* Replaced Paper sx */}
                                            <p className="text-xs font-bold text-muted-foreground flex items-center gap-1 mb-1.5 uppercase"> {/* Replaced Typography sx */}
                                                <BarChart2 size={14}/> SCHEDULE CONTEXT
                                            </p>
                                            {project.schedule.find(t => t.id === selectedRfiForDetail.linkedTaskId) ? (
                                                <div> {/* Replaced Box */}
                                                    <p className="text-sm font-bold">{project.schedule.find(t => t.id === selectedRfiForDetail.linkedTaskId)?.name}</p> {/* Replaced Typography */}
                                                    <div className="flex justify-between mt-1"> {/* Replaced Box */}
                                                        <p className="text-xs text-muted-foreground">Task Progress</p> {/* Replaced Typography */}
                                                        <p className="text-xs font-bold">{project.schedule.find(t => t.id === selectedRfiForDetail.linkedTaskId)?.progress}%</p> {/* Replaced Typography */}
                                                    </div>
                                                    <Progress 
                                                        value={project.schedule.find(t => t.id === selectedRfiForDetail.linkedTaskId)?.progress || 0} 
                                                        className="h-1.5 mt-0.5 rounded-full" /> {/* Replaced LinearProgress sx */}
                                                </div>
                                            ) : (
                                                                                                      <p className="text-sm text-muted-foreground italic">Not linked to a schedule task.</p>                                            )}
                                        </div>
                                        
                                        <div className="border p-2.5 rounded-xl bg-background"> {/* Replaced Paper sx */}
                                            <p className="text-xs font-bold text-muted-foreground flex items-center gap-1 mb-1.5 uppercase"> {/* Replaced Typography sx */}
                                                <UserIcon size={14}/> SIGNATURES
                                            </p>
                                            <div> {/* Replaced Box */}
                                                <div className="flex justify-between"> {/* Replaced Box */}
                                                    <p className="text-xs text-muted-foreground">ARE/IOW:</p> {/* Replaced Typography */}
                                                    <p className="text-sm font-bold">{selectedRfiForDetail.areSignature || 'N/A'}</p> {/* Replaced Typography */}
                                                </div>
                                                <div className="flex justify-between mt-1"> {/* Replaced Box */}
                                                    <p className="text-xs text-muted-foreground">ME/SLT:</p> {/* Replaced Typography */}
                                                    <p className="text-sm font-bold">{selectedRfiForDetail.meSltSignature || 'N/A'}</p> {/* Replaced Typography */}
                                                </div>
                                                <div className="flex justify-between mt-1"> {/* Replaced Box */}
                                                    <p className="text-xs text-muted-foreground">IOW:</p> {/* Replaced Typography */}
                                                    <p className="text-sm font-bold">{selectedRfiForDetail.iowSignature || 'N/A'}</p> {/* Replaced Typography */}
                                                </div>
                                                <div className="flex justify-between mt-1"> {/* Replaced Box */}
                                                    <p className="text-xs text-muted-foreground">RE:</p> {/* Replaced Typography */}
                                                    <p className="text-sm font-bold">{selectedRfiForDetail.reSignature || 'N/A'}</p> {/* Replaced Typography */}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="border p-2.5 rounded-xl bg-background"> {/* Replaced Paper sx */}
                                            <p className="text-xs font-bold text-muted-foreground flex items-center gap-1 mb-1.5 uppercase"> {/* Replaced Typography sx */}
                                                <UserIcon size={14}/> PERSONNEL
                                            </p>
                                            <div> {/* Replaced Box */}
                                                <div className="flex justify-between"> {/* Replaced Box */}
                                                    <p className="text-xs text-muted-foreground">Submitted By:</p> {/* Replaced Typography */}
                                                    <p className="text-sm font-bold">{selectedRfiForDetail.submittedBy || 'N/A'}</p> {/* Replaced Typography */}
                                                </div>
                                                <div className="flex justify-between mt-1"> {/* Replaced Box */}
                                                    <p className="text-xs text-muted-foreground">Received By:</p> {/* Replaced Typography */}
                                                    <p className="text-sm font-bold">{selectedRfiForDetail.receivedBy || 'N/A'}</p> {/* Replaced Typography */}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Linked Checklists Section */}
                                        <div className="border p-2.5 rounded-xl bg-background"> {/* Replaced Paper sx */}
                                            <p className="text-xs font-bold text-muted-foreground flex items-center gap-1 mb-1.5 uppercase"> {/* Replaced Typography sx */}
                                                <ClipboardList size={14}/> LINKED CHECKLISTS
                                            </p>
                                            {selectedRfiForDetail.linkedChecklistIds && selectedRfiForDetail.linkedChecklistIds.length > 0 ? (
                                                <div> {/* Replaced Box */}
                                                    {selectedRfiForDetail.linkedChecklistIds.map(checklistId => {
                                                        const checklist = project.checklists?.find(cl => cl.id === checklistId);
                                                        return checklist ? (
                                                            <div key={checklistId} className="mb-1"> {/* Replaced Box sx */}
                                                                <p className="text-sm font-bold">{checklist.name}</p> {/* Replaced Typography */}
                                                                <p className="text-xs text-muted-foreground">{checklist.category}</p> {/* Replaced Typography */}
                                                            </div>
                                                        ) : null;
                                                    })}
                                                </div>
                                            ) : (
                                                                                                      <p className="text-sm text-muted-foreground italic">No checklists linked to this RFI.</p>                                            )}
                                        </div>
                                        
                                        <Button className="w-full rounded-md shadow-md h-12 mt-2"> {/* Replaced Button fullWidth variant="contained" color="primary" startIcon sx */}
                                            <Printer className="mr-2" /> Print Certificate
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default RFIModule;

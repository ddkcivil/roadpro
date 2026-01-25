import React, { useState, useMemo } from 'react';
import { 
    Paper, Box, Typography, IconButton, Grid, TextField, FormControl, InputLabel, 
    Select, MenuItem, Button, Table, TableHead, TableBody, TableRow, 
    Chip, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip,
    List, ListItem, ListItemText, Stack, Divider,
    Autocomplete, InputAdornment, LinearProgress, Avatar, TableCell,
    Tabs, Tab, FormControlLabel, Checkbox
} from '@mui/material';
import { Project, RFI, UserRole, RFIStatus, ScheduleTask, Checklist, ChecklistItem } from '../types';
import { 
    Plus, Eye, Edit2, History, X, ShieldCheck, FileText, Printer, 
    Clock, Lock, CheckCircle2, XCircle, FileSearch, CalendarPlus, 
    Link as LinkIcon, ExternalLink, Calendar, MapPin, BarChart2,
    MessageSquare, User as UserIcon, Circle, Filter, CheckCircle, Trash2,
    ClipboardList
} from 'lucide-react';
import StatCard from './StatCard';

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
    const [tabIndex, setTabIndex] = useState(0); // 0 for RFI, 1 for Checklists
    
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
        [RFIStatus.OPEN]: project.rfis.filter(r => r.status === RFIStatus.OPEN).length,
        [RFIStatus.APPROVED]: project.rfis.filter(r => r.status === RFIStatus.APPROVED).length,
        [RFIStatus.REJECTED]: project.rfis.filter(r => r.status === RFIStatus.REJECTED).length,
        [RFIStatus.CLOSED]: project.rfis.filter(r => r.status === RFIStatus.CLOSED).length,
    };

    const filteredRFIs = useMemo(() => {
        return [...project.rfis]
            .filter(r => taskFilter === 'all' || r.linkedTaskId === taskFilter)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [project.rfis, taskFilter]);

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
            case 'open': return <Clock size={14} className="text-indigo-500" />;
            default: return <Circle size={14} className="text-slate-400" />;
        }
    };

    // Render checklist editor
    const renderChecklistEditor = () => (
        <Paper sx={{ p: 4, borderRadius: 3 }} className="animate-in slide-in-from-right duration-300">
            <Box display="flex" justifyContent="space-between" mb={4} alignItems="center">
                <Box>
                    <Typography variant="h6" fontWeight="bold">Checklist Template Editor</Typography>
                    <Typography variant="caption" color="text.secondary">Create or edit checklist templates</Typography>
                </Box>
                <IconButton onClick={() => setViewMode('CHECKLIST_LIST')}><X /></IconButton>
            </Box>
            
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <TextField 
                        fullWidth label="Template Name" 
                        value={checklistFormData.name || ''} 
                        onChange={e => setChecklistFormData({...checklistFormData, name: e.target.value})} 
                        required
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                        <InputLabel>Category</InputLabel>
                        <Select 
                            value={checklistFormData.category || 'Quality'} 
                            label="Category" 
                            onChange={e => setChecklistFormData({...checklistFormData, category: e.target.value})}
                        >
                            <MenuItem value="Quality">Quality</MenuItem>
                            <MenuItem value="Safety">Safety</MenuItem>
                            <MenuItem value="Environmental">Environmental</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                    <TextField 
                        fullWidth multiline rows={3} label="Description" 
                        value={checklistFormData.description || ''} 
                        onChange={e => setChecklistFormData({...checklistFormData, description: e.target.value})} 
                    />
                </Grid>
                
                <Grid item xs={12}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">Checklist Items</Typography>
                        <Button variant="outlined" startIcon={<Plus size={16} />} onClick={addChecklistItem}>
                            Add Item
                        </Button>
                    </Box>
                    
                    {(checklistFormData.items || []).map((item, index) => (
                        <Paper key={index} sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'divider' }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <TextField 
                                        fullWidth label="Item Title" 
                                        value={item.title || ''} 
                                        onChange={e => updateChecklistItem(index, 'title', e.target.value)} 
                                        required
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>Response Type</InputLabel>
                                        <Select 
                                            value={item.valueType || 'boolean'} 
                                            label="Response Type" 
                                            onChange={e => updateChecklistItem(index, 'valueType', e.target.value)}
                                        >
                                            <MenuItem value="boolean">Yes/No</MenuItem>
                                            <MenuItem value="number">Numeric</MenuItem>
                                            <MenuItem value="text">Text</MenuItem>
                                            <MenuItem value="select">Dropdown</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                
                                <Grid item xs={12}>
                                    <TextField 
                                        fullWidth label="Description" 
                                        value={item.description || ''} 
                                        onChange={e => updateChecklistItem(index, 'description', e.target.value)} 
                                    />
                                </Grid>
                                
                                <Grid item xs={6}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={item.required || false}
                                                onChange={e => updateChecklistItem(index, 'required', e.target.checked)}
                                            />
                                        }
                                        label="Required"
                                    />
                                </Grid>
                                
                                <Grid item xs={6} textAlign="right">
                                    <IconButton 
                                        color="error" 
                                        onClick={() => removeChecklistItem(index)}
                                        size="small"
                                    >
                                        <Trash2 size={16} />
                                    </IconButton>
                                </Grid>
                            </Grid>
                            
                            {item.valueType === 'select' && (
                                <Grid item xs={12}>
                                    <TextField 
                                        fullWidth label="Options (comma separated)" 
                                        value={item.options?.join(', ') || ''} 
                                        onChange={e => updateChecklistItem(index, 'options', e.target.value.split(',').map(opt => opt.trim()))} 
                                        helperText="Enter options separated by commas"
                                    />
                                </Grid>
                            )}
                        </Paper>
                    ))}
                </Grid>
            </Grid>
            
            <Box mt={4} display="flex" justifyContent="flex-end" gap={2}>
                <Button onClick={() => setViewMode('CHECKLIST_LIST')} color="secondary">Cancel</Button>
                <Button variant="contained" color="primary" onClick={handleSaveChecklist} startIcon={<CheckCircle2 size={18}/>} sx={{ boxShadow: 2 }}>Save Template</Button>
            </Box>
        </Paper>
    );

    if (viewMode === 'CHECKLIST_UPDATE') return renderChecklistEditor();

    if (viewMode === 'UPDATE') return (
        <Paper sx={{ p: 4, borderRadius: 3 }} className="animate-in slide-in-from-right duration-300">
            <Box display="flex" justifyContent="space-between" mb={4} alignItems="center">
                <Box>
                    <Typography variant="h6" fontWeight="bold">Technical Inspection Request</Typography>
                    <Typography variant="caption" color="text.secondary">Project Quality Verification Form</Typography>
                </Box>
                <IconButton onClick={() => setViewMode('LIST')}><X /></IconButton>
            </Box>
            
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <TextField 
                        fullWidth label="Location (Chainage + Side)" 
                        placeholder="e.g. 12+400 RHS"
                        value={formData.location || ''} 
                        onChange={e => {
                            setFormData({...formData, location: e.target.value});
                            if (locationError) setLocationError(null);
                        }}
                        required
                        error={!!locationError}
                        helperText={locationError || "Format: [Km]+[Mtrs] [Side] e.g. 12+400 RHS"}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><MapPin size={18} className={locationError ? "text-rose-500" : "text-indigo-500"} /></InputAdornment>,
                        }}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField 
                        fullWidth label="Request Number" 
                        placeholder="e.g. RFI-001"
                        value={requestNumber || ''} 
                        onChange={e => setRequestNumber(e.target.value)}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><FileText size={18} className="text-indigo-500" /></InputAdornment>,
                        }}
                    />
                </Grid>
                
                <Grid item xs={12} md={6}>
                    <TextField 
                        fullWidth label="Inspection Type" 
                        placeholder="e.g. Box Culvert, Earthwork, etc."
                        value={inspectionType || ''} 
                        onChange={e => setInspectionType(e.target.value)}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><FileText size={18} className="text-indigo-500" /></InputAdornment>,
                        }}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField 
                        fullWidth label="Inspection Date" type="date" 
                        InputLabelProps={{ shrink: true }}
                        value={inspectionDate || ''} 
                        onChange={e => setInspectionDate(e.target.value)} 
                    />
                </Grid>
                
                <Grid item xs={12} md={6}>
                    <TextField 
                        fullWidth label="Request Date" type="date" 
                        InputLabelProps={{ shrink: true }}
                        value={formData.date || ''} 
                        onChange={e => setFormData({...formData, date: e.target.value})} 
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField 
                        fullWidth label="Inspection Time" type="time" 
                        InputLabelProps={{ shrink: true }}
                        value={inspectionTime || ''} 
                        onChange={e => setInspectionTime(e.target.value)} 
                    />
                </Grid>
                
                <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                        <InputLabel>Inspection Purpose</InputLabel>
                        <Select 
                            value={inspectionPurpose} 
                            label="Inspection Purpose" 
                            onChange={e => setInspectionPurpose(e.target.value as 'First' | 'Second' | 'Third' | 'Routine' | 'Special')}
                        >
                            <MenuItem value="First">First Inspection</MenuItem>
                            <MenuItem value="Second">Second Inspection</MenuItem>
                            <MenuItem value="Third">Third Inspection</MenuItem>
                            <MenuItem value="Routine">Routine Inspection</MenuItem>
                            <MenuItem value="Special">Special Inspection</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                        <InputLabel>Update Status</InputLabel>
                        <Select 
                            value={formData.status || RFIStatus.OPEN} 
                            label="Update Status" 
                            onChange={e => setFormData({...formData, status: e.target.value as RFIStatus})}
                        >
                            <MenuItem value={RFIStatus.OPEN}>Open / Pending Inspection</MenuItem>
                            <MenuItem value={RFIStatus.APPROVED}>Approved / Verified</MenuItem>
                            <MenuItem value={RFIStatus.REJECTED}>Rejected / Rectification Needed</MenuItem>
                            <MenuItem value={RFIStatus.CLOSED}>Closed</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                    <TextField 
                        fullWidth multiline rows={4} label="Work Description for Inspection" 
                        placeholder="Define scope for verification (e.g. Reinforcement, GSB Layer, BC Mix)..."
                        value={formData.description || ''} 
                        onChange={e => setFormData({...formData, description: e.target.value})} 
                    />
                </Grid>
                
                <Grid item xs={12}>
                    <TextField 
                        fullWidth multiline rows={4} label="Specific Work Details" 
                        placeholder="Provide detailed information about particular work items..."
                        value={specificWorkDetails || ''} 
                        onChange={e => setSpecificWorkDetails(e.target.value)} 
                    />
                </Grid>
                
                <Grid item xs={12}>
                    <TextField 
                        fullWidth multiline rows={4} label="Inspection Report" 
                        placeholder="Record findings and observations from the inspection..."
                        value={inspectionReport || ''} 
                        onChange={e => setInspectionReport(e.target.value)} 
                    />
                </Grid>
                
                <Grid item xs={12}>
                    <TextField 
                        fullWidth multiline rows={3} label="Engineer's Representative Comments" 
                        placeholder="Add any comments or observations from the engineer..."
                        value={engineerComments || ''} 
                        onChange={e => setEngineerComments(e.target.value)} 
                    />
                </Grid>
                
                <Grid item xs={12}>
                    <TextField 
                        fullWidth multiline rows={3} label="Engineer Representative's Comments" 
                        placeholder="Comments from the engineer representative..."
                        value={engineerRepresentativeComments || ''} 
                        onChange={e => setEngineerRepresentativeComments(e.target.value)} 
                    />
                </Grid>
                
                <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                        <InputLabel>Works Status</InputLabel>
                        <Select 
                            value={worksStatus} 
                            label="Works Status" 
                            onChange={e => setWorksStatus(e.target.value as 'Approved' | 'Approved as Noted' | 'Approved for Subsequent Work' | '')}
                        >
                            <MenuItem value="">Select Status</MenuItem>
                            <MenuItem value="Approved">Approved</MenuItem>
                            <MenuItem value="Approved as Noted">Approved as Noted</MenuItem>
                            <MenuItem value="Approved for Subsequent Work">Approved for Subsequent Work</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                    <TextField 
                        fullWidth label="ARE/IOW Signature" 
                        placeholder="Enter signature details"
                        value={areSignature || ''} 
                        onChange={e => setAreSignature(e.target.value)}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><UserIcon size={18} className="text-indigo-500" /></InputAdornment>,
                        }}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField 
                        fullWidth label="ME/SLT Signature" 
                        placeholder="Enter signature details"
                        value={meSltSignature || ''} 
                        onChange={e => setMeSltSignature(e.target.value)}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><UserIcon size={18} className="text-indigo-500" /></InputAdornment>,
                        }}
                    />
                </Grid>
                
                <Grid item xs={12} md={6}>
                    <TextField 
                        fullWidth label="IOW Signature" 
                        placeholder="Enter signature details"
                        value={iowSignature || ''} 
                        onChange={e => setIowSignature(e.target.value)}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><UserIcon size={18} className="text-indigo-500" /></InputAdornment>,
                        }}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField 
                        fullWidth label="RE Signature" 
                        placeholder="Enter signature details"
                        value={reSignature || ''} 
                        onChange={e => setReSignature(e.target.value)}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><UserIcon size={18} className="text-indigo-500" /></InputAdornment>,
                        }}
                    />
                </Grid>
                
                <Grid item xs={12} md={6}>
                    <TextField 
                        fullWidth label="Submitted By" 
                        placeholder="Name of person submitting the RFI"
                        value={submittedBy || ''} 
                        onChange={e => setSubmittedBy(e.target.value)}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><UserIcon size={18} className="text-indigo-500" /></InputAdornment>,
                        }}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField 
                        fullWidth label="Received By" 
                        placeholder="Name of person receiving the RFI"
                        value={receivedBy || ''} 
                        onChange={e => setReceivedBy(e.target.value)}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><UserIcon size={18} className="text-indigo-500" /></InputAdornment>,
                        }}
                    />
                </Grid>
                
                <Grid item xs={12} md={6}>
                    <TextField 
                        fullWidth label="IOW Signature" 
                        placeholder="Enter signature details"
                        value={iowSignature || ''} 
                        onChange={e => setIowSignature(e.target.value)}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><UserIcon size={18} className="text-indigo-500" /></InputAdornment>,
                        }}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField 
                        fullWidth label="RE Signature" 
                        placeholder="Enter signature details"
                        value={reSignature || ''} 
                        onChange={e => setReSignature(e.target.value)}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><UserIcon size={18} className="text-indigo-500" /></InputAdornment>,
                        }}
                    />
                </Grid>
                
                <Grid item xs={12} md={6}>
                    <Autocomplete
                        fullWidth
                        options={project.schedule}
                        getOptionLabel={(option) => option.name}
                        value={project.schedule.find(t => t.id === formData.linkedTaskId) || null}
                        onChange={(_, newValue) => setFormData({...formData, linkedTaskId: newValue?.id})}
                        renderOption={(props, option) => (
                            <li {...props}>
                                <Box width="100%">
                                    <Box display="flex" justifyContent="space-between">
                                        <Typography variant="body2" fontWeight="bold">{option.name}</Typography>
                                        <Chip label={`${option.progress}%`} size="small" sx={{ fontSize: 9, height: 16 }} />
                                    </Box>
                                    <Typography variant="caption" color="text.secondary">{option.startDate} to {option.endDate}</Typography>
                                </Box>
                            </li>
                        )}
                        renderInput={(params) => {
                            const { InputProps, ...rest } = params;
                            return (
                                <TextField 
                                    {...rest}
                                    label="Link to Schedule Task" 
                                    placeholder="Bind this inspection to an activity..."
                                    InputProps={{
                                        ...(InputProps as any),
                                        startAdornment: (
                                            <React.Fragment>
                                                <InputAdornment position="start"><LinkIcon size={18} className="text-indigo-600" /></InputAdornment>
                                                {InputProps.startAdornment}
                                            </React.Fragment>
                                        ),
                                    }}
                                />
                            );
                        }}
                    />
                </Grid>
                
                <Grid item xs={12} md={6}>
                    <Autocomplete
                        multiple
                        options={project.checklists || []}
                        getOptionLabel={(option) => option.name}
                        value={project.checklists?.filter(cl => formData.linkedChecklistIds?.includes(cl.id)) || []}
                        onChange={(_, newValue) => {
                            const checklistIds = newValue.map(cl => cl.id);
                            setFormData({
                                ...formData,
                                linkedChecklistIds: checklistIds
                            });
                        }}
                        renderInput={(params) => (
                            <TextField 
                                {...params}
                                label="Linked Checklists" 
                                placeholder="Select associated checklists..."
                                InputProps={{
                                    ...(params.InputProps as any),
                                    startAdornment: (
                                        <React.Fragment>
                                            <InputAdornment position="start"><ClipboardList size={18} className="text-indigo-600" /></InputAdornment>
                                            {(params.InputProps as any).startAdornment}
                                        </React.Fragment>
                                    ),
                                }}
                            />
                        )}
                    />
                </Grid>
                
                <Grid item xs={12} md={6}>
                    <TextField 
                        fullWidth label="Working Drawings Attachment" 
                        placeholder="Upload or reference working drawings"
                        value={workingDrawings.join(', ') || ''} 
                        onChange={e => setWorkingDrawings(e.target.value.split(',').map(item => item.trim()))}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><FileSearch size={18} className="text-indigo-500" /></InputAdornment>,
                        }}
                        helperText="Separate multiple drawing references with commas"
                    />
                </Grid>
            </Grid>

            <Box mt={4} display="flex" justifyContent="flex-end" gap={2}>
                <Button onClick={() => {setViewMode('LIST'); setFormData({});}} color="secondary">Back</Button>
                <Button variant="contained" color="primary" onClick={handleSave} startIcon={<CheckCircle2 size={18}/>} sx={{ boxShadow: 2 }}>Commit Audit Log</Button>
            </Box>
        </Paper>
    );

    // Render checklist list view
    if (viewMode === 'CHECKLIST_LIST') {
        return (
            <Box className="animate-in fade-in duration-500">
                <Box display="flex" justifyContent="space-between" mb={4} alignItems="center">
                    <Box>
                        <Typography variant="h5" fontWeight="900">Quality Checklists</Typography>
                        <Typography variant="body2" color="text.secondary">Verification of works against quality standards</Typography>
                    </Box>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Button variant="contained" color="primary" startIcon={<Plus />} onClick={handleCreateChecklist} sx={{ borderRadius: 2, boxShadow: 2 }}>New Checklist</Button>
                        <Button variant="outlined" color="secondary" onClick={() => setViewMode('LIST')} sx={{ borderRadius: 2 }}>RFI Requests</Button>
                    </Stack>
                </Box>

                <Grid container spacing={2} mb={4}>
                    <Grid item xs={6} sm={3}>
                        <StatCard title="Total" value={projectChecklists.length} icon={FileText} color="#4f46e5" />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <StatCard title="Active" value={projectChecklists.filter(c => c.isActive).length} icon={CheckCircle} color="#10b981" />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <StatCard title="Quality" value={projectChecklists.filter(c => c.category === 'Quality').length} icon={ShieldCheck} color="#8b5cf6" />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <StatCard title="Safety" value={projectChecklists.filter(c => c.category === 'Safety').length} icon={Lock} color="#ef4444" />
                    </Grid>
                </Grid>

                <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden', bgcolor: 'background.paper' }}>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Items Count</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Created</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {projectChecklists.map((checklist, index) => (
                                <TableRow key={checklist.id} hover sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                                    <TableCell><Typography variant="body2" fontWeight="bold">{checklist.name}</Typography></TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={checklist.category} 
                                            size="small" 
                                            variant="outlined" 
                                            color={checklist.category === 'Quality' ? 'primary' : checklist.category === 'Safety' ? 'warning' : 'default'}
                                        />
                                    </TableCell>
                                    <TableCell>{checklist.items.length}</TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={checklist.isActive ? 'Active' : 'Inactive'} 
                                            size="small" 
                                            variant="outlined" 
                                            color={checklist.isActive ? 'success' : 'default'}
                                        />
                                    </TableCell>
                                    <TableCell>{new Date(checklist.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell align="right">
                                        <Stack direction="row" spacing={0} justifyContent="flex-end">
                                            <IconButton size="small" onClick={() => handleEditChecklist(checklist)}><Edit2 size={16}/></IconButton>
                                            <IconButton size="small" color="error" onClick={() => handleDeleteChecklist(checklist.id)}><Trash2 size={16}/></IconButton>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                            
                            {checklistTemplates.map((template, index) => (
                                <TableRow key={`template-${template.id}`} hover sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                                    <TableCell><Typography variant="body2" fontWeight="bold">{template.name}</Typography></TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={template.category} 
                                            size="small" 
                                            variant="outlined" 
                                            color={template.category === 'Quality' ? 'primary' : template.category === 'Safety' ? 'warning' : 'default'}
                                        />
                                    </TableCell>
                                    <TableCell>N/A (Template)</TableCell>
                                    <TableCell>
                                        <Chip 
                                            label="Template" 
                                            size="small" 
                                            variant="outlined" 
                                            color="info"
                                        />
                                    </TableCell>
                                    <TableCell>-</TableCell>
                                    <TableCell align="right">
                                        <Stack direction="row" spacing={0} justifyContent="flex-end">
                                            <IconButton 
                                                size="small" 
                                                onClick={() => {
                                                    // Create a new checklist from template
                                                    const newChecklist: Checklist = {
                                                        id: `cl-${Date.now()}`,
                                                        name: template.name,
                                                        category: template.category,
                                                        description: template.description,
                                                        items: [], // Templates have no predefined items
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
                                            </IconButton>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                            
                            {projectChecklists.length === 0 && checklistTemplates.length === 0 && (
                                <TableRow>
                                    <TableCell align="center" {...{ colSpan: 6 }} sx={{ py: 10 }}>
                                        <Typography variant="body2" color="text.disabled">No checklists found.</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Paper>
            </Box>
        );
    }

    return (
        <Box className="animate-in fade-in duration-500">
            <Box display="flex" justifyContent="space-between" mb={4} alignItems="center">
                <Box>
                    <Typography variant="h5" fontWeight="900">Technical Inspection & Quality Registry</Typography>
                    <Typography variant="body2" color="text.secondary">Verification of works against contract specifications</Typography>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                        <InputLabel>Filter by Activity</InputLabel>
                        <Select 
                            value={taskFilter} 
                            label="Filter by Activity" 
                            onChange={(e) => setTaskFilter(e.target.value)}
                            startAdornment={<InputAdornment position="start"><Filter size={14}/></InputAdornment>}
                            sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
                        >
                            <MenuItem value="all">All Project Activities</MenuItem>
                            <Divider />
                            {project.schedule.map(task => (
                                <MenuItem key={task.id} value={task.id}>{task.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Button variant="contained" color="primary" startIcon={<Plus />} onClick={handleCreate} sx={{ borderRadius: 2, boxShadow: 2 }}>New RFI</Button>
                </Stack>
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
                <Tabs value={tabIndex} onChange={(e, newValue) => setTabIndex(newValue)}>
                    <Tab icon={<ClipboardList size={16} />} label="Checklists" />
                    <Tab icon={<FileText size={16} />} label="RFI Requests" />
                </Tabs>
            </Box>

            {tabIndex === 0 && (
                <Box>
                    <Grid container spacing={2} mb={4}>
                        <Grid item xs={6} sm={3}>
                            <StatCard title="Total" value={projectChecklists.length} icon={FileText} color="#4f46e5" />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <StatCard title="Active" value={projectChecklists.filter(c => c.isActive).length} icon={CheckCircle} color="#10b981" />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <StatCard title="Quality" value={projectChecklists.filter(c => c.category === 'Quality').length} icon={ShieldCheck} color="#8b5cf6" />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <StatCard title="Safety" value={projectChecklists.filter(c => c.category === 'Safety').length} icon={Lock} color="#ef4444" />
                        </Grid>
                    </Grid>

                    <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden', bgcolor: 'background.paper' }}>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: 'action.hover' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Items Count</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Created</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {projectChecklists.map((checklist, index) => (
                                    <TableRow key={checklist.id} hover sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                                        <TableCell><Typography variant="body2" fontWeight="bold">{checklist.name}</Typography></TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={checklist.category} 
                                                size="small" 
                                                variant="outlined" 
                                                color={checklist.category === 'Quality' ? 'primary' : checklist.category === 'Safety' ? 'warning' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>{checklist.items.length}</TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={checklist.isActive ? 'Active' : 'Inactive'} 
                                                size="small" 
                                                variant="outlined" 
                                                color={checklist.isActive ? 'success' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>{new Date(checklist.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" spacing={0} justifyContent="flex-end" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <IconButton size="small" onClick={() => handleEditChecklist(checklist)}><Edit2 size={16}/></IconButton>
                                                <IconButton size="small" color="error" onClick={() => handleDeleteChecklist(checklist.id)}><Trash2 size={16}/></IconButton>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                
                                {checklistTemplates.map((template, index) => (
                                    <TableRow key={`template-${template.id}`} hover sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                                        <TableCell><Typography variant="body2" fontWeight="bold">{template.name}</Typography></TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={template.category} 
                                                size="small" 
                                                variant="outlined" 
                                                color={template.category === 'Quality' ? 'primary' : template.category === 'Safety' ? 'warning' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>N/A (Template)</TableCell>
                                        <TableCell>
                                            <Chip 
                                                label="Template" 
                                                size="small" 
                                                variant="outlined" 
                                                color="info"
                                            />
                                        </TableCell>
                                        <TableCell>-</TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" spacing={0} justifyContent="flex-end" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => {
                                                        // Create a new checklist from template
                                                        const newChecklist: Checklist = {
                                                            id: `cl-${Date.now()}`,
                                                            name: template.name,
                                                            category: template.category,
                                                            description: template.description,
                                                            items: [], // Templates have no predefined items
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
                                                </IconButton>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                
                                {projectChecklists.length === 0 && checklistTemplates.length === 0 && (
                                    <TableRow>
                                        <TableCell align="center" {...{ colSpan: 6 }} sx={{ py: 10 }}>
                                            <Typography variant="body2" color="text.disabled">No checklists found.</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Paper>
                    
                    <Box mt={3} display="flex" justifyContent="flex-end">
                        <Button 
                            variant="contained" 
                            color="primary"
                            startIcon={<Plus />} 
                            onClick={handleCreateChecklist}
                            sx={{ borderRadius: 2, boxShadow: 2 }}
                        >
                            Create New Checklist
                        </Button>
                    </Box>
                </Box>
            )}

            {tabIndex === 1 && (
                <>
                    <Grid container spacing={2} mb={4}>
                        <Grid item xs={6} sm={3}>
                            <StatCard title="Open" value={statusCounts[RFIStatus.OPEN]} icon={Clock} color="#4f46e5" />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <StatCard title="Approved" value={statusCounts[RFIStatus.APPROVED]} icon={CheckCircle} color="#10b981" />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <StatCard title="Rejected" value={statusCounts[RFIStatus.REJECTED]} icon={XCircle} color="#f43f5e" />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <StatCard title="Closed" value={statusCounts[RFIStatus.CLOSED]} icon={Lock} color="#64748b" />
                        </Grid>
                    </Grid>

                    <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden', bgcolor: 'background.paper' }}>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: 'action.hover' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Ref #</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Linked Activity</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Work Scope</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredRFIs.map((rfi, index) => {
                                    const linkedTask = project.schedule.find(t => t.id === rfi.linkedTaskId);
                                    return (
                                        <TableRow key={rfi.id} hover sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                                            <TableCell sx={{ fontWeight: 'bold', color: 'primary.main', fontFamily: 'monospace' }}>{rfi.rfiNumber}</TableCell>
                                            <TableCell><Typography variant="body2" fontWeight="bold">{rfi.location}</Typography></TableCell>
                                            <TableCell><Typography variant="body2">{rfi.inspectionType || 'N/A'}</Typography></TableCell>
                                            <TableCell>
                                                {linkedTask ? (
                                                    <Tooltip title={`Task Progress: ${linkedTask.progress}%`}>
                                                        <Box sx={{ minWidth: 140 }}>
                                                            <Typography variant="caption" fontWeight="bold" color="text.primary" display="block" sx={{ lineHeight: 1, mb: 0.5 }}>
                                                                {linkedTask.name}
                                                            </Typography>
                                                            <LinearProgress variant="determinate" value={linkedTask.progress} sx={{ height: 4, borderRadius: 2 }} />
                                                        </Box>
                                                    </Tooltip>
                                                ) : (
                                                    <Typography variant="caption" color="text.disabled">—</Typography>
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ maxWidth: 200 }}><Typography variant="caption" noWrap display="block">{rfi.description}</Typography></TableCell>
                                            <TableCell>
                                                <Chip label={rfi.status} size="small" variant="outlined" color={rfi.status === RFIStatus.APPROVED ? 'success' : rfi.status === RFIStatus.REJECTED ? 'error' : 'primary'} sx={{ fontWeight: '900', fontSize: 9 }} />
                                            </TableCell>
                                            <TableCell align="right">
                                                <Stack direction="row" spacing={0} justifyContent="flex-end">
                                                    <IconButton size="small" onClick={() => { setSelectedRfiForDetail(rfi); setIsDetailModalOpen(true); }}><Eye size={16}/></IconButton>
                                                    <IconButton size="small" onClick={() => handleEdit(rfi)}><Edit2 size={16}/></IconButton>
                                                    <IconButton size="small" color="error" onClick={() => handleDelete(rfi.id)}><Trash2 size={16}/></IconButton>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {filteredRFIs.length === 0 && (
                                    <TableRow>
                                        <TableCell align="center" {...{ colSpan: 7 }} sx={{ py: 10 }}>
                                            <Typography variant="body2" color="text.disabled">No inspection requests found for this filter.</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Paper>
                </>
            )}

            <Dialog open={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
                <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                        <FileText size={24} color="primary.main"/>
                        <Box>
                            <Typography variant="h6" fontWeight="bold">Technical Inspection Report</Typography>
                            <Typography variant="caption" color="text.secondary">{selectedRfiForDetail?.rfiNumber}</Typography>
                        </Box>
                    </Box>
                    <IconButton onClick={() => setIsDetailModalOpen(false)}><X/></IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 0, bgcolor: 'background.default' }}>
                    {selectedRfiForDetail && (
                        <Grid container spacing={0}>
                            <Grid item xs={12} md={7} sx={{ p: 4, borderRight: '1px solid', borderColor: 'divider' }}>
                                <Stack spacing={4}>
                                    <Box>
                                        <Typography variant="caption" fontWeight="900" color="text.secondary" sx={{ letterSpacing: 1 }}>INSPECTION DESCRIPTION</Typography>
                                        <Paper variant="outlined" sx={{ p: 2, mt: 1.5, bgcolor: 'background.paper', borderRadius: 2 }}>
                                            <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{selectedRfiForDetail.description}</Typography>
                                        </Paper>
                                    </Box>
                                    
                                    {selectedRfiForDetail.specificWorkDetails && (
                                        <Box>
                                            <Typography variant="caption" fontWeight="900" color="text.secondary" sx={{ letterSpacing: 1 }}>SPECIFIC WORK DETAILS</Typography>
                                            <Paper variant="outlined" sx={{ p: 2, mt: 1.5, bgcolor: 'background.paper', borderRadius: 2 }}>
                                                <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{selectedRfiForDetail.specificWorkDetails}</Typography>
                                            </Paper>
                                        </Box>
                                    )}
                                    
                                    <Box>
                                        <Typography variant="caption" fontWeight="900" color="text.secondary" sx={{ letterSpacing: 1 }}>WORKFLOW AUDIT TRAIL</Typography>
                                        <Box mt={2.5}>
                                            {selectedRfiForDetail.workflowLog && selectedRfiForDetail.workflowLog.length > 0 ? (
                                                <Stack spacing={0}>
                                                    {selectedRfiForDetail.workflowLog.map((log, idx) => (
                                                        <Box key={idx} sx={{ display: 'flex', gap: 2, position: 'relative', pb: idx === selectedRfiForDetail.workflowLog!.length - 1 ? 0 : 3 }}>
                                                            {idx !== selectedRfiForDetail.workflowLog!.length - 1 && (
                                                                <Box sx={{ position: 'absolute', left: 15, top: 32, bottom: 0, width: '2px', bgcolor: 'divider' }} />
                                                            )}
                                                            
                                                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'background.paper', border: '2px solid', borderColor: 'divider', zIndex: 1 }}>
                                                                {getStageIcon(log.stage)}
                                                            </Avatar>
                                                            
                                                            <Box flex={1}>
                                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                                    <Typography variant="subtitle2" fontWeight="900" color="text.primary">{log.stage.toUpperCase()}</Typography>
                                                                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                                                        {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                                    </Typography>
                                                                </Box>
                                                                <Typography variant="caption" display="block" color="primary.main" fontWeight="bold">
                                                                    Action by: {log.user}
                                                                </Typography>
                                                                {log.comments && (
                                                                    <Typography variant="body2" color="text.secondary" sx={{ bgcolor: 'background.paper', p: 1, borderRadius: 1, border: '1px solid', borderColor: 'divider', mt: 0.5 }}>
                                                                        {log.comments}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        </Box>
                                                    ))}
                                                </Stack>
                                            ) : (
                                                <Typography variant="caption" color="text.disabled" fontStyle="italic">No history recorded.</Typography>
                                            )}
                                        </Box>
                                    </Box>
                                </Stack>
                            </Grid>

                            <Grid item xs={12} md={5} sx={{ p: 4, bgcolor: 'action.hover' }}>
                                <Stack spacing={3}>
                                    <Box>
                                        <Typography variant="caption" fontWeight="900" color="text.secondary" sx={{ letterSpacing: 1 }}>LOCATION / CHAINAGE</Typography>
                                        <Typography variant="h6" fontWeight="bold" display="flex" alignItems="center" gap={1} sx={{ mt: 1 }}>
                                            <MapPin size={18} color="primary.main"/> {selectedRfiForDetail.location}
                                        </Typography>
                                    </Box>

                                    <Divider />

                                    <Box>
                                        <Typography variant="caption" fontWeight="900" color="text.secondary" display="block" mb={1.5} sx={{ letterSpacing: 1 }}>CURRENT STATUS</Typography>
                                        <Chip 
                                            label={selectedRfiForDetail.status.toUpperCase()} 
                                            color={selectedRfiForDetail.status === RFIStatus.APPROVED ? 'success' : selectedRfiForDetail.status === RFIStatus.REJECTED ? 'error' : 'primary'} 
                                            sx={{ fontWeight: 'bold', height: 40, borderRadius: 2, width: '100%' }} 
                                        />
                                    </Box>
                                    
                                    {selectedRfiForDetail.worksStatus && (
                                        <Box>
                                            <Typography variant="caption" fontWeight="900" color="text.secondary" display="block" mb={1.5} sx={{ letterSpacing: 1 }}>WORKS STATUS</Typography>
                                            <Chip 
                                                label={selectedRfiForDetail.worksStatus} 
                                                color={selectedRfiForDetail.worksStatus === 'Approved' ? 'success' : selectedRfiForDetail.worksStatus === 'Approved as Noted' ? 'warning' : 'primary'} 
                                                sx={{ fontWeight: 'bold', height: 40, borderRadius: 2, width: '100%' }} 
                                            />
                                        </Box>
                                    )}

                                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: 'background.paper' }}>
                                        <Typography variant="caption" fontWeight="900" color="text.secondary" display="flex" alignItems="center" gap={1} mb={1.5}>
                                            <BarChart2 size={14}/> SCHEDULE CONTEXT
                                        </Typography>
                                        {project.schedule.find(t => t.id === selectedRfiForDetail.linkedTaskId) ? (
                                            <Box>
                                                <Typography variant="body2" fontWeight="bold">{project.schedule.find(t => t.id === selectedRfiForDetail.linkedTaskId)?.name}</Typography>
                                                <Box display="flex" justifyContent="space-between" mt={1}>
                                                    <Typography variant="caption" color="text.secondary">Task Progress</Typography>
                                                    <Typography variant="caption" fontWeight="bold">{project.schedule.find(t => t.id === selectedRfiForDetail.linkedTaskId)?.progress}%</Typography>
                                                </Box>
                                                <LinearProgress 
                                                    variant="determinate" 
                                                    value={project.schedule.find(t => t.id === selectedRfiForDetail.linkedTaskId)?.progress || 0} 
                                                    sx={{ height: 6, mt: 0.5, borderRadius: 3 }} 
                                                />
                                            </Box>
                                        ) : (
                                            <Typography variant="caption" color="text.disabled" fontStyle="italic">Not linked to a schedule task.</Typography>
                                        )}
                                    </Paper>
                                    
                                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: 'background.paper' }}>
                                        <Typography variant="caption" fontWeight="900" color="text.secondary" display="flex" alignItems="center" gap={1} mb={1.5}>
                                            <UserIcon size={14}/> SIGNATURES
                                        </Typography>
                                        <Box>
                                            <Box display="flex" justifyContent="space-between">
                                                <Typography variant="caption" color="text.secondary">ARE/IOW:</Typography>
                                                <Typography variant="body2" fontWeight="bold">{selectedRfiForDetail.areSignature || 'N/A'}</Typography>
                                            </Box>
                                            <Box display="flex" justifyContent="space-between" mt={1}>
                                                <Typography variant="caption" color="text.secondary">ME/SLT:</Typography>
                                                <Typography variant="body2" fontWeight="bold">{selectedRfiForDetail.meSltSignature || 'N/A'}</Typography>
                                            </Box>
                                            <Box display="flex" justifyContent="space-between" mt={1}>
                                                <Typography variant="caption" color="text.secondary">IOW:</Typography>
                                                <Typography variant="body2" fontWeight="bold">{selectedRfiForDetail.iowSignature || 'N/A'}</Typography>
                                            </Box>
                                            <Box display="flex" justifyContent="space-between" mt={1}>
                                                <Typography variant="caption" color="text.secondary">RE:</Typography>
                                                <Typography variant="body2" fontWeight="bold">{selectedRfiForDetail.reSignature || 'N/A'}</Typography>
                                            </Box>
                                        </Box>
                                    </Paper>
                                    
                                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: 'background.paper' }}>
                                        <Typography variant="caption" fontWeight="900" color="text.secondary" display="flex" alignItems="center" gap={1} mb={1.5}>
                                            <UserIcon size={14}/> PERSONNEL
                                        </Typography>
                                        <Box>
                                            <Box display="flex" justifyContent="space-between">
                                                <Typography variant="caption" color="text.secondary">Submitted By:</Typography>
                                                <Typography variant="body2" fontWeight="bold">{selectedRfiForDetail.submittedBy || 'N/A'}</Typography>
                                            </Box>
                                            <Box display="flex" justifyContent="space-between" mt={1}>
                                                <Typography variant="caption" color="text.secondary">Received By:</Typography>
                                                <Typography variant="body2" fontWeight="bold">{selectedRfiForDetail.receivedBy || 'N/A'}</Typography>
                                            </Box>
                                        </Box>
                                    </Paper>
                                    
                                    {/* Linked Checklists Section */}
                                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: 'background.paper' }}>
                                        <Typography variant="caption" fontWeight="900" color="text.secondary" display="flex" alignItems="center" gap={1} mb={1.5}>
                                            <ClipboardList size={14}/> LINKED CHECKLISTS
                                        </Typography>
                                        {selectedRfiForDetail.linkedChecklistIds && selectedRfiForDetail.linkedChecklistIds.length > 0 ? (
                                            <Box>
                                                {selectedRfiForDetail.linkedChecklistIds.map(checklistId => {
                                                    const checklist = project.checklists?.find(cl => cl.id === checklistId);
                                                    return checklist ? (
                                                        <Box key={checklistId} sx={{ mb: 1 }}>
                                                            <Typography variant="body2" fontWeight="bold">{checklist.name}</Typography>
                                                            <Typography variant="caption" color="text.secondary">{checklist.category}</Typography>
                                                        </Box>
                                                    ) : null;
                                                })}
                                            </Box>
                                        ) : (
                                            <Typography variant="caption" color="text.disabled" fontStyle="italic">No checklists linked to this RFI.</Typography>
                                        )}
                                    </Paper>
                                    
                                    <Button fullWidth variant="contained" color="primary" startIcon={<Printer/>} onClick={() => window.print()} sx={{ mt: 2, height: 48, borderRadius: 2, boxShadow: 2 }}>Print Certificate</Button>
                                </Stack>
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default RFIModule;
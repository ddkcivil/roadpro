import React, { useState, useMemo } from 'react';
import { 
    Plus, ArrowLeft, HardHat, History, CheckCircle2,
    FlaskConical, FileText, Microscope, MapPin, Save, Trash2, X, Edit,
    Link as LinkIcon
} from 'lucide-react';
import { getAutofillSuggestions, checkForDuplicates } from '../utils/autofillUtils';
import { 
    Project, StructureAsset, StructureType, UserRole, 
    StructureComponent, StructureWorkLog, LabTest, BOQItem, Subcontractor 
} from '../types';
import { 
    Box, Typography, Button, Card, Grid, TextField, FormControl, InputLabel, 
    Select, MenuItem, IconButton, Stack, Chip, LinearProgress, Paper, 
    Divider, Dialog, DialogTitle, 
    DialogContent, DialogActions, Table,
    TableHead, TableRow, TableCell, TableBody,
    Tabs, Tab, Alert, InputAdornment, Tooltip, Autocomplete as MuiAutocomplete
} from '@mui/material';

interface Props {
  project: Project;
  userRole: UserRole;
  onProjectUpdate: (project: Project) => void;
}

interface StructureTemplate {
  id: string;
  name: string;
  type: StructureType;
  description: string;
  components: StructureComponent[];
  estimatedDuration?: number; // in days
  standardRate?: number;
  createdDate: string;
  updatedDate: string;
}

const STRUCTURE_TYPES: StructureType[] = [
    'Pipe Culvert', 'Box Culvert', 'Slab Culvert', 'Minor Bridge', 'Major Bridge', 
    'Drainage (Lined)', 'Drainage (Unlined)', 'Retaining Wall', 'Breast Wall',
    'Pavement (Flexible)', 'Pavement (Rigid)', 'Footpath',
    'Utility Duct', 'Street Light Base', 'Road Signal', 'Junction Box', 
    'Median Barrier', 'Pedestrian Guardrail', 'Bus Shelter'
];

const ConstructionModule: React.FC<Props> = ({ project, onProjectUpdate, userRole }) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'CREATE' | 'DETAIL' | 'EDIT'>('LIST');
  const [detailStructureId, setDetailStructureId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState(0);
  const [editingStructure, setEditingStructure] = useState<StructureAsset | null>(null);
  
  // Create Mode State
  const [newStructure, setNewStructure] = useState<Partial<StructureAsset>>({
      name: '',
      type: 'Box Culvert',
      location: '',
      status: 'Not Started',
      components: [],
      subcontractorId: '',
      chainage: ''
  });

  const [isLogWorkOpen, setIsLogWorkOpen] = useState(false);
  const [currentLogComponent, setCurrentLogComponent] = useState<StructureComponent | null>(null);
  const [logForm, setLogForm] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    quantity: 0, 
    rate: 0,
    remarks: '', 
    boqItemId: '', 
    subcontractorId: '',
    rfiId: '',
    labTestId: ''
  });
  const [isMbRecordsOpen, setIsMbRecordsOpen] = useState(false);
  
  // Template State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isTemplateListOpen, setIsTemplateListOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<StructureTemplate | null>(null);
  
  const selectedStructure = project.structures?.find(s => s.id === detailStructureId);
  
  const linkedTests = useMemo(() => {
      if (!selectedStructure) return [];
      return (project.labTests || []).filter(t => t.assetId === selectedStructure.id);
  }, [project.labTests, selectedStructure]);

  const calculateOverallProgress = (structure: StructureAsset) => {
    if (!structure.components || !structure.components.length) return 0;
    const totalDone = structure.components.reduce((acc, c) => acc + c.completedQuantity, 0);
    const totalTarget = structure.components.reduce((acc, c) => acc + c.totalQuantity, 0);
    return totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0;
  };
  
  const structureTemplates = project.structureTemplates || [];
  
  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }
    
    if (!newStructure.type) {
      alert('Please select a structure type');
      return;
    }
    
    if (!(newStructure.components && newStructure.components.length > 0)) {
      alert('Please add at least one component to save as template');
      return;
    }
    
    const template: StructureTemplate = {
      id: `tmpl-${Date.now()}`,
      name: templateName,
      type: newStructure.type as StructureType,
      description: templateDescription,
      components: newStructure.components,
      createdDate: new Date().toISOString().split('T')[0],
      updatedDate: new Date().toISOString().split('T')[0]
    };
    
    onProjectUpdate({
      ...project,
      structureTemplates: [...(project.structureTemplates || []), template]
    });
    
    setIsTemplateModalOpen(false);
    setTemplateName('');
    setTemplateDescription('');
  };
  
  const handleLoadTemplate = (template: StructureTemplate) => {
    // Populate the newStructure state with template data
    setNewStructure({
      name: template.name,
      type: template.type,
      location: '',
      status: 'Not Started',
      components: template.components,
      subcontractorId: '',
      chainage: ''
    });
    
    setIsTemplateListOpen(false);
    setViewMode('CREATE');
  };
  
  const handleCreateFromTemplate = (template: StructureTemplate) => {
    setSelectedTemplate(template);
    setNewStructure({
      name: template.name,
      type: template.type,
      location: '',
      status: 'Not Started',
      components: template.components,
      subcontractorId: '',
      chainage: ''
    });
    setViewMode('CREATE');
    setIsTemplateListOpen(false);
  };
  
  const canDelete = userRole === UserRole.ADMIN || userRole === UserRole.PROJECT_MANAGER;
  
  const handleDeleteTemplate = (templateId: string) => {
    if (!canDelete) {
      alert('Only Admin and Project Manager can delete templates');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this template?')) {
      const updatedProject = {
        ...project,
        structureTemplates: project.structureTemplates?.filter(t => t.id !== templateId) || []
      };
      onProjectUpdate(updatedProject);
    }
  };

  const handleOpenLogWork = (comp: StructureComponent) => {
    setCurrentLogComponent(comp);
    setLogForm({
        date: new Date().toISOString().split('T')[0],
        quantity: 0,
        rate: 0,
        remarks: '',
        boqItemId: comp.boqItemId || '',
        subcontractorId: comp.subcontractorId || '',
        rfiId: '',
        labTestId: ''
    });
    setIsLogWorkOpen(true);
  };

  const handleAddComponent = () => {
      const comp: StructureComponent = {
          id: `comp-${Date.now()}`,
          name: '',
          unit: 'cum',
          totalQuantity: 0,
          completedQuantity: 0,
          verifiedQuantity: 0,
          workLogs: []
      };
      setNewStructure(prev => ({
          ...prev,
          components: [...(prev.components || []), comp]
      }));
  };

  const handleUpdateComponent = (index: number, field: keyof StructureComponent, value: any) => {
      const updated = [...(newStructure.components || [])];
      updated[index] = { ...updated[index], [field]: value };
      setNewStructure(prev => ({ ...prev, components: updated }));
  };

  const handleRemoveComponent = (index: number) => {
      const updated = [...(newStructure.components || [])];
      updated.splice(index, 1);
      setNewStructure(prev => ({ ...prev, components: updated }));
  };

  const handleCreateStructure = () => {
      if (!newStructure.name || !newStructure.location || !newStructure.components?.length) {
          alert("Please provide asset name, location, and at least one component.");
          return;
      }

      const finalAsset: StructureAsset = {
          ...newStructure,
          id: `str-${Date.now()}`,
          status: newStructure.status || 'Not Started',
          components: newStructure.components.map(c => ({
              ...c,
              totalQuantity: Number(c.totalQuantity),
              completedQuantity: Number(c.completedQuantity),
              verifiedQuantity: Number(c.verifiedQuantity)
          }))
      } as StructureAsset;

      onProjectUpdate({
          ...project,
          structures: [...(project.structures || []), finalAsset]
      });
      setViewMode('LIST');
      setNewStructure({ name: '', type: 'Box Culvert', location: '', status: 'Not Started', components: [] });
  };

  const handleSaveWorkLog = () => {
    if (!currentLogComponent || !logForm.quantity || !detailStructureId) return;
    
    const qty = Number(logForm.quantity);
    const newLog: StructureWorkLog = {
        id: `wl-${Date.now()}`,
        date: logForm.date,
        quantity: qty,
        rate: logForm.rate,
        subcontractorId: logForm.subcontractorId,
        remarks: logForm.remarks,
        rfiId: logForm.rfiId,
        boqItemId: logForm.boqItemId,
        labTestId: logForm.labTestId
    };

    const updatedProject = { ...project };
    
    // 1. Update Structure Work Logs and Progress
    updatedProject.structures = project.structures?.map(s => {
        if (s.id === detailStructureId) {
            return {
                ...s,
                status: 'In Progress' as any,
                components: s.components.map(c => {
                    if (c.id === currentLogComponent.id) {
                        return {
                            ...c,
                            completedQuantity: c.completedQuantity + qty,
                            workLogs: [...(c.workLogs || []), newLog]
                        };
                    }
                    return c;
                })
            };
        }
        return s;
    });

    // 2. Update Master BOQ Ledger Progress
    if (logForm.boqItemId) {
        updatedProject.boq = project.boq.map(item => {
            if (item.id === logForm.boqItemId) {
                return {
                    ...item,
                    completedQuantity: (item.completedQuantity || 0) + qty
                };
            }
            return item;
        });
    }

    onProjectUpdate(updatedProject);
    setIsLogWorkOpen(false);
    setLogForm({ date: new Date().toISOString().split('T')[0], quantity: 0, rate: 0, remarks: '', boqItemId: '', subcontractorId: '', rfiId: '', labTestId: '' }); // Reset form
  };

  const handleDeleteWorkLog = (structureId: string, componentId: string, logId: string) => {
    if (!canDelete) {
      alert('Only Admin and Project Manager can delete work logs');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this work log?')) {
      const updatedProject = { ...project };
      
      // Find the work log to be deleted to subtract its quantity
      const structure = project.structures?.find(s => s.id === structureId);
      const component = structure?.components.find(c => c.id === componentId);
      const workLog = component?.workLogs?.find(wl => wl.id === logId);
      
      // Update Structure Work Logs and Progress
      updatedProject.structures = project.structures?.map(s => {
        if (s.id === structureId) {
          return {
            ...s,
            components: s.components.map(c => {
              if (c.id === componentId) {
                return {
                  ...c,
                  completedQuantity: Math.max(0, c.completedQuantity - (workLog?.quantity || 0)),
                  workLogs: c.workLogs?.filter(wl => wl.id !== logId) || []
                };
              }
              return c;
            })
          };
        }
        return s;
      }) || [];

      // 2. Update Master BOQ Ledger Progress if the log was linked to a BOQ item
      if (workLog?.boqItemId) {
        updatedProject.boq = project.boq.map(item => {
          if (item.id === workLog.boqItemId) {
            return {
              ...item,
              completedQuantity: Math.max(0, (item.completedQuantity || 0) - (workLog.quantity || 0))
            };
          }
          return item;
        });
      }

      onProjectUpdate(updatedProject);
    }
  };

  const handleEditStructure = (structure: StructureAsset) => {
      setEditingStructure(structure);
      setNewStructure({
          ...structure,
          chainage: structure.chainage || structure.location || '',
          components: [...structure.components] // Copy components to avoid reference issues
      });
      setViewMode('EDIT');
  };

  const handleUpdateStructure = () => {
      if (!editingStructure || !newStructure.name || !newStructure.location || !newStructure.components?.length) {
          alert("Please provide asset name, location, and at least one component.");
          return;
      }

      const updatedStructure: StructureAsset = {
          ...newStructure,
          id: editingStructure.id, // Keep the original ID
          status: newStructure.status || 'Not Started',
          components: newStructure.components.map(c => ({
              ...c,
              totalQuantity: Number(c.totalQuantity),
              completedQuantity: Number(c.completedQuantity),
              verifiedQuantity: Number(c.verifiedQuantity)
          }))
      } as StructureAsset;

      const updatedProject = { ...project };
      updatedProject.structures = project.structures?.map(s => 
          s.id === editingStructure.id ? updatedStructure : s
      ) || [];
      
      onProjectUpdate(updatedProject);
      setViewMode('LIST');
      setEditingStructure(null);
      setNewStructure({ name: '', type: 'Box Culvert', location: '', status: 'Not Started', components: [], subcontractorId: '', chainage: '' });
  };

  const handleDeleteStructure = (structureId: string) => {
      if (!canDelete) {
          alert('Only Admin and Project Manager can delete structural assets');
          return;
      }
      
      if (window.confirm('Are you sure you want to delete this structural asset? This will remove all components and work logs associated with it.')) {
          const updatedProject = { ...project };
          updatedProject.structures = project.structures?.filter(s => s.id !== structureId) || [];
          onProjectUpdate(updatedProject);
      }
  };

  if (viewMode === 'CREATE' || viewMode === 'EDIT') {
      return (
          <Box className="animate-in fade-in duration-500">
              <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                  <Stack direction="row" spacing={2} alignItems="center">
                    <IconButton onClick={() => setViewMode('LIST')} size="small" sx={{ border: 1, borderColor: 'divider', bgcolor: 'white' }}><ArrowLeft size={18} /></IconButton>
                    <Box>
                        <Typography variant="h6" fontWeight="900">{viewMode === 'EDIT' ? 'Edit Structural Asset' : 'Define New Structural Asset'}</Typography>
                        <Typography variant="caption" color="text.secondary">Master alignment inventory management</Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<Save size={18}/>} onClick={() => setIsTemplateModalOpen(true)} sx={{ borderRadius: 2 }}>Save as Template</Button>
                    <Button variant="contained" startIcon={<Save size={18}/>} onClick={viewMode === 'EDIT' ? handleUpdateStructure : handleCreateStructure} sx={{ borderRadius: 2 }}>{viewMode === 'EDIT' ? 'Update Asset' : 'Commit to Registry'}</Button>
                  </Stack>
              </Box>

              <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                      <Card variant="outlined" sx={{ p: 3, borderRadius: 4, bgcolor: 'white' }}>
                          <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="primary">GENERAL DEFINITION</Typography>
                          <Stack spacing={3} mt={2}>
                              <MuiAutocomplete
                                freeSolo
                                options={getAutofillSuggestions.structureAssets(project, 'name', newStructure.name || '')}
                                value={newStructure.name || ''}
                                onInputChange={(event, newValue) => setNewStructure({...newStructure, name: newValue})}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    label="Asset Name" fullWidth size="small" placeholder="e.g. 2x2 Box Culvert"
                                    InputProps={{
                                      ...params.InputProps,
                                      type: 'search'
                                    }}
                                  />
                                )}
                              />
                              <FormControl fullWidth size="small">
                                  <InputLabel>Structure Classification</InputLabel>
                                  <Select 
                                    label="Structure Classification" 
                                    value={newStructure.type} 
                                    onChange={e => setNewStructure({...newStructure, type: e.target.value as any})}
                                  >
                                      {STRUCTURE_TYPES.map(type => <MenuItem key={type} value={type}>{type}</MenuItem>)}
                                  </Select>
                              </FormControl>
                              <MuiAutocomplete
                                freeSolo
                                options={getAutofillSuggestions.structureAssets(project, 'location', newStructure.location || '')}
                                value={newStructure.location || ''}
                                onInputChange={(event, newValue) => setNewStructure({...newStructure, location: newValue, chainage: newValue})}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    label="Location (Chainage)" fullWidth size="small" placeholder="e.g. 12+500"
                                    InputProps={{
                                      ...params.InputProps,
                                      startAdornment: <InputAdornment position="start"><MapPin size={16}/></InputAdornment>,
                                      type: 'search'
                                    }}
                                  />
                                )}
                              />
                              <FormControl fullWidth size="small">
                                  <InputLabel>Assigned Agency (Subcontractor)</InputLabel>
                                  <Select 
                                    label="Assigned Agency (Subcontractor)" 
                                    value={newStructure.subcontractorId || ''} 
                                    onChange={e => setNewStructure({...newStructure, subcontractorId: e.target.value})}
                                  >
                                      <MenuItem value=""><em>Internal Execution</em></MenuItem>
                                      {project.agencies?.filter(a => a.type === 'subcontractor' || a.type === 'agency').map(agency => (
                                          <MenuItem key={agency.id} value={agency.id}>{agency.name} ({agency.trade})</MenuItem>
                                      ))}
                                  </Select>
                              </FormControl>
                          </Stack>
                      </Card>
                  </Grid>

                  <Grid item xs={12} md={8}>
                      <Stack spacing={2}>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="subtitle2" fontWeight="bold" color="text.secondary">SCHEDULE OF COMPONENTS</Typography>
                              <Button size="small" variant="outlined" startIcon={<Plus size={14}/>} onClick={handleAddComponent}>Add Row</Button>
                          </Box>
                          
                          {newStructure.components?.map((comp, idx) => (
                              <Paper key={comp.id} variant="outlined" sx={{ p: 3, borderRadius: 3, position: 'relative' }}>
                                  <IconButton 
                                    size="small" color="error" 
                                    sx={{ position: 'absolute', top: 8, right: 8 }}
                                    onClick={() => handleRemoveComponent(idx)}
                                  >
                                      <Trash2 size={16}/>
                                  </IconButton>
                                  
                                  <Grid container spacing={2}>
                                      <Grid item xs={12} md={6}>
                                          <MuiAutocomplete
                                            freeSolo
                                            options={project.structures?.flatMap(s => s.components).map(c => c.name).filter((name, index, arr) => arr.indexOf(name) === index) || []}
                                            value={comp.name || ''}
                                            onInputChange={(event, newValue) => handleUpdateComponent(idx, 'name', newValue)}
                                            renderInput={(params) => (
                                              <TextField
                                                {...params}
                                                label="Component Name" fullWidth size="small" placeholder="e.g. Reinforcement"
                                                InputProps={{
                                                  ...params.InputProps,
                                                  type: 'search'
                                                }}
                                              />
                                            )}
                                          />
                                      </Grid>
                                      <Grid item xs={6} md={3}>
                                          <TextField 
                                            label="Unit" fullWidth size="small" 
                                            value={comp.unit} onChange={e => handleUpdateComponent(idx, 'unit', e.target.value)}
                                          />
                                      </Grid>
                                      <Grid item xs={6} md={3}>
                                          <TextField 
                                            label="Total Qty" fullWidth size="small" type="number"
                                            value={comp.totalQuantity} onChange={e => handleUpdateComponent(idx, 'totalQuantity', e.target.value)}
                                          />
                                      </Grid>
                                      
                                      <Grid item xs={4}>
                                          <TextField 
                                            label="Executed Qty" fullWidth size="small" type="number"
                                            value={comp.completedQuantity} onChange={e => handleUpdateComponent(idx, 'completedQuantity', e.target.value)}
                                            helperText="Initial progress"
                                          />
                                      </Grid>
                                      <Grid item xs={4}>
                                          <TextField 
                                            label="Verified Qty" fullWidth size="small" type="number"
                                            value={comp.verifiedQuantity} onChange={e => handleUpdateComponent(idx, 'verifiedQuantity', e.target.value)}
                                            helperText="Approved amount"
                                          />
                                      </Grid>
                                      <Grid item xs={4}>
                                          <FormControl fullWidth size="small">
                                              <InputLabel>Mapping (BOQ Item)</InputLabel>
                                              <Select 
                                                label="Mapping (BOQ Item)" 
                                                value={comp.boqItemId || ''} 
                                                onChange={e => handleUpdateComponent(idx, 'boqItemId', e.target.value)}
                                              >
                                                  <MenuItem value=""><em>Unlinked</em></MenuItem>
                                                  {project.boq.map(item => (
                                                      <MenuItem key={item.id} value={item.id}>[{item.itemNo}] {item.description.slice(0, 30)}...</MenuItem>
                                                  ))}
                                              </Select>
                                          </FormControl>
                                      </Grid>

                                      <Grid item xs={12}>
                                          <FormControl fullWidth size="small">
                                              <InputLabel>Assigned Agency (Subcontractor)</InputLabel>
                                              <Select 
                                                label="Assigned Agency (Subcontractor)" 
                                                value={comp.subcontractorId || ''} 
                                                onChange={e => handleUpdateComponent(idx, 'subcontractorId', e.target.value)}
                                              >
                                                  <MenuItem value=""><em>Internal Execution</em></MenuItem>
                                                  {project.agencies?.filter(a => a.type === 'subcontractor' || a.type === 'agency').map(agency => (
                                                      <MenuItem key={agency.id} value={agency.id}>{agency.name} ({agency.trade})</MenuItem>
                                                  ))}
                                              </Select>
                                          </FormControl>
                                      </Grid>
                                  </Grid>
                              </Paper>
                          ))}
                          
                          {!newStructure.components?.length && (
                              <Box py={6} textAlign="center" border="1px dashed #cbd5e1" borderRadius={3} color="text.disabled">
                                  <Typography variant="body2">No components defined. Add a component to track physical metrics.</Typography>
                              </Box>
                          )}
                      </Stack>
                  </Grid>
              </Grid>
          </Box>
      );
  }

  if (viewMode === 'DETAIL' && selectedStructure) {
      const progress = calculateOverallProgress(selectedStructure);
      return (
          <Box className="animate-in fade-in duration-500">
              <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                  <Stack direction="row" spacing={2} alignItems="center">
                    <IconButton onClick={() => setViewMode('LIST')} size="small" sx={{ border: 1, borderColor: 'divider', bgcolor: 'white' }}><ArrowLeft size={18} /></IconButton>
                    <Box>
                        <Typography variant="h6" fontWeight="900">{selectedStructure.name}</Typography>
                        <Typography variant="caption" color="text.secondary">Ch: {selectedStructure.location}</Typography>
                                            {selectedStructure.completionDate && (
                                              <Typography variant="caption" color="success.main">Completed on: {selectedStructure.completionDate}</Typography>
                                            )}
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                      <Button variant="outlined" startIcon={<History size={16}/>} size="small" onClick={() => setIsMbRecordsOpen(true)}>MB Records</Button>
                      <Button variant="contained" startIcon={<CheckCircle2 size={16}/>} size="small" onClick={() => {
                        // Certify completion functionality
                        if (window.confirm(`Are you sure you want to certify completion for ${selectedStructure.name}? This will mark the structure as completed and generate certificates.`)) {
                          // Update the structure status to completed
                          const updatedProject = { ...project };
                          updatedProject.structures = project.structures?.map(structure => {
                            if (structure.id === selectedStructure.id) {
                              return {
                                ...structure,
                                status: 'Completed',
                                completionDate: new Date().toISOString().split('T')[0]
                              };
                            }
                            return structure;
                          });
                          
                          onProjectUpdate(updatedProject);
                          alert(`${selectedStructure.name} has been certified as completed!`);
                        }
                      }}>Certify Completion</Button>
                  </Stack>
              </Box>

              <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
                  <Tab label="Execution Progress" icon={<HardHat size={18}/>} iconPosition="start" />
                  <Tab label="Quality & Tests" icon={<Microscope size={18}/>} iconPosition="start" />
              </Tabs>

              {detailTab === 0 && (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <Card variant="outlined" sx={{ p: 3, borderRadius: 4, borderLeft: '6px solid', borderColor: '#4f46e5', bgcolor: 'white' }}>
                            <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ letterSpacing: 1 }}>PHYSICAL COMPLETION</Typography>
                            <Box display="flex" alignItems="baseline" gap={1} mt={1}>
                                <Typography variant="h3" fontWeight="900" color="primary">{progress}%</Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={progress} sx={{ mt: 3, height: 10, borderRadius: 5 }} />
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={8}>
                        <Stack spacing={2}>
                            {selectedStructure.components.map(comp => (
                                <Paper key={comp.id} variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: 'white' }}>
                                    <Box display="flex" justifyContent="space-between" mb={1} alignItems="center">
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight="bold">{comp.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">{comp.completedQuantity} / {comp.totalQuantity} {comp.unit}</Typography>
                                        </Box>
                                        <Chip label={`${Math.round((comp.completedQuantity/comp.totalQuantity)*100)}%`} size="small" color="primary" sx={{ fontWeight: 'bold' }} />
                                    </Box>
                                    <LinearProgress variant="determinate" value={Math.min(100, (comp.completedQuantity/comp.totalQuantity)*100)} sx={{ height: 6, borderRadius: 3 }} />
                                    <Box display="flex" justifyContent="flex-end" mt={2}>
                                        <Button size="small" variant="outlined" onClick={() => handleOpenLogWork(comp)} disabled={comp.completedQuantity >= comp.totalQuantity} startIcon={<Plus size={14}/>}>Log Work</Button>
                                    </Box>
                                    {comp.workLogs && comp.workLogs.length > 0 && (
                                        <Box mt={2}>
                                            <Typography variant="caption" fontWeight="bold" color="text.secondary" gutterBottom>WORK LOGS</Typography>
                                            <Stack spacing={1}>
                                                {comp.workLogs.map(log => (
                                                    <Paper key={log.id} variant="outlined" sx={{ p: 1, bgcolor: 'grey.50', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Box>
                                                            <Typography variant="body2" fontWeight="500">{log.quantity} {comp.unit} on {log.date}</Typography>
                                                            {log.remarks && <Typography variant="caption" color="text.secondary">{log.remarks}</Typography>}
                                                        </Box>
                                                        <IconButton size="small" color="error" onClick={() => handleDeleteWorkLog(selectedStructure.id, comp.id, log.id)}>
                                                            <Trash2 size={14} />
                                                        </IconButton>
                                                    </Paper>
                                                ))}
                                            </Stack>
                                        </Box>
                                    )}
                                </Paper>
                            ))}
                        </Stack>
                    </Grid>
                  </Grid>
              )}

              {detailTab === 1 && (
                  <Box>
                      <Grid container spacing={3}>
                          <Grid item xs={12} md={4}>
                              <Paper variant="outlined" sx={{ p: 3, borderRadius: 4, bgcolor: '#f8fafc' }}>
                                  <Typography variant="subtitle2" fontWeight="bold" mb={2}>Quality Summary</Typography>
                                  <Stack spacing={2}>
                                      <Box display="flex" justifyContent="space-between">
                                          <Typography variant="body2">Tests Logged:</Typography>
                                          <Typography variant="body2" fontWeight="bold">{linkedTests.length}</Typography>
                                      </Box>
                                      <Box display="flex" justifyContent="space-between">
                                          <Typography variant="body2">Pass Rate:</Typography>
                                          <Typography variant="body2" fontWeight="bold" color="success.main">
                                              {linkedTests.length > 0 ? Math.round((linkedTests.filter(t => t.result === 'Pass').length / linkedTests.length) * 100) : 100}%
                                          </Typography>
                                      </Box>
                                  </Stack>
                              </Paper>
                          </Grid>
                          <Grid item xs={12} md={8}>
                            <Table size="small">
                                <TableHead><TableRow><TableCell>Date</TableCell><TableCell>Test Type</TableCell><TableCell>Result</TableCell></TableRow></TableHead>
                                <TableBody>
                                    {linkedTests.map(t => (
                                        <TableRow key={t.id}><TableCell>{t.date}</TableCell><TableCell>{t.testName}</TableCell><TableCell><Chip label={t.result} size="small" color={t.result === 'Pass' ? 'success' : 'error'} /></TableCell></TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                          </Grid>
                      </Grid>
                  </Box>
              )}

              <Dialog open={isLogWorkOpen} onClose={() => setIsLogWorkOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
                  <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <HardHat className="text-indigo-600" /> Log Work: {currentLogComponent?.name}
                  </DialogTitle>
                  <DialogContent>
                      <Stack spacing={3} mt={1}>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <TextField label="Quantity Done" type="number" fullWidth value={logForm.quantity} onChange={e => setLogForm({...logForm, quantity: Number(e.target.value)})} InputProps={{ endAdornment: <InputAdornment position="end">{currentLogComponent?.unit}</InputAdornment> }} />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField label="Rate" type="number" fullWidth value={logForm.rate} onChange={e => setLogForm({...logForm, rate: Number(e.target.value)})} InputProps={{ startAdornment: <InputAdornment position="start">{project.settings?.currency || 'Rs'}</InputAdornment> }} />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField label="Date" type="date" fullWidth value={logForm.date} onChange={e => setLogForm({...logForm, date: e.target.value})} InputLabelProps={{ shrink: true }} />
                            </Grid>
                          </Grid>
                          
                          <FormControl fullWidth>
                                <InputLabel id="boq-select-label">Linked BOQ Item</InputLabel>
                                <Select
                                    labelId="boq-select-label"
                                    value={logForm.boqItemId}
                                    label="Linked BOQ Item"
                                    onChange={(e) => setLogForm({ ...logForm, boqItemId: e.target.value })}
                                    startAdornment={<InputAdornment position="start"><LinkIcon size={18} /></InputAdornment>}
                                >
                                    <MenuItem value=""><em>None</em></MenuItem>
                                    {project.boq.map(item => (
                                        <MenuItem key={item.id} value={item.id}>[{item.itemNo}] {item.description.slice(0, 50)}...</MenuItem>
                                    ))}
                                </Select>
                          </FormControl>

                          <FormControl fullWidth>
                                <InputLabel id="lab-test-select-label">Linked Lab Test Record</InputLabel>
                                <Select
                                    labelId="lab-test-select-label"
                                    value={logForm.labTestId}
                                    label="Linked Lab Test Record"
                                    onChange={(e) => setLogForm({ ...logForm, labTestId: e.target.value })}
                                    startAdornment={<InputAdornment position="start"><FlaskConical size={18} /></InputAdornment>}
                                >
                                    <MenuItem value=""><em>No Test Linked</em></MenuItem>
                                    {project.labTests.map(test => (
                                        <MenuItem key={test.id} value={test.id}>
                                            <Box>
                                                <Typography variant="body2" fontWeight="bold">[{test.sampleId}] {test.testName}</Typography>
                                                <Typography variant="caption" color="text.secondary">Result: {test.result} • {test.date}</Typography>
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                          </FormControl>

                          <FormControl fullWidth>
                                <InputLabel>Agency / Subcontractor</InputLabel>
                                <Select
                                    value={logForm.subcontractorId}
                                    label="Agency / Subcontractor"
                                    onChange={(e) => setLogForm({ ...logForm, subcontractorId: e.target.value })}
                                >
                                    <MenuItem value=""><em>Internal / Not Assigned</em></MenuItem>
                                    {project.agencies?.map(sub => (
                                        <MenuItem key={sub.id} value={sub.id}>{sub.name} ({sub.trade})</MenuItem>
                                    ))}
                                </Select>
                          </FormControl>

                          <TextField label="Remarks" fullWidth multiline rows={2} value={logForm.remarks} onChange={e => setLogForm({...logForm, remarks: e.target.value})} placeholder="Technical notes or site constraints..." />
                          
                          {logForm.boqItemId && (
                              <Alert severity="info" sx={{ borderRadius: 2 }}>
                                  Saving this entry will automatically increment the physical progress of BOQ Item <b>{project.boq.find(b => b.id === logForm.boqItemId)?.itemNo}</b> by <b>{logForm.quantity} {currentLogComponent?.unit}</b>.
                              </Alert>
                          )}
                      </Stack>
                  </DialogContent>
                  <DialogActions sx={{ p: 3 }}>
                      <Button onClick={() => {setIsLogWorkOpen(false); setLogForm({ date: new Date().toISOString().split('T')[0], quantity: 0, rate: 0, remarks: '', boqItemId: '', subcontractorId: '', rfiId: '', labTestId: '' });}}>Back</Button>
                      <Button variant="contained" onClick={handleSaveWorkLog} disabled={!logForm.quantity}>Commit Work Record</Button>
                  </DialogActions>
              </Dialog>
              
              {/* MB Records Dialog */}
              <Dialog open={isMbRecordsOpen} onClose={() => setIsMbRecordsOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
                  <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <History className="text-indigo-600" /> Measurement Book Records: {selectedStructure?.name}
                  </DialogTitle>
                  <DialogContent>
                      <Box mt={2}>
                          <Table size="small">
                              <TableHead sx={{ bgcolor: 'slate.50' }}>
                                  <TableRow>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Component</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Qty Executed</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Rate</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Unit</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Contractor</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>BOQ Item</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Remarks</TableCell>
                                  </TableRow>
                              </TableHead>
                              <TableBody>
                                  {selectedStructure?.components.flatMap(comp => 
                                      comp.workLogs.map(log => {
                                          const boqItem = project.boq.find(b => b.id === log.boqItemId);
                                          const subcontractor = project.agencies?.find(s => s.id === log.subcontractorId);
                                          return (
                                              <TableRow key={log.id}>
                                                  <TableCell>{log.date}</TableCell>
                                                  <TableCell>{comp.name}</TableCell>
                                                  <TableCell>{log.quantity}</TableCell>
                                                  <TableCell>{log.rate ? `${project.settings?.currency || 'Rs'}${log.rate.toFixed(2)}` : 'N/A'}</TableCell>
                                                  <TableCell>{comp.unit}</TableCell>
                                                  <TableCell>{subcontractor?.name || 'Internal'}</TableCell>
                                                  <TableCell>{boqItem ? `[${boqItem.itemNo}] ${boqItem.description.substring(0, 30)}...` : 'N/A'}</TableCell>
                                                  <TableCell>{log.remarks}</TableCell>
                                              </TableRow>
                                          );
                                      })
                                  )}
                              </TableBody>
                          </Table>
                          
                          {(!selectedStructure?.components || selectedStructure.components.every(comp => !comp.workLogs || comp.workLogs.length === 0)) && (
                              <Box py={4} textAlign="center" color="text.disabled">
                                  <History size={48} className="mx-auto mb-2 opacity-30" />
                                  <Typography variant="h6">No Measurement Records</Typography>
                                  <Typography variant="body2">Work logs will appear here once recorded</Typography>
                              </Box>
                          )}
                      </Box>
                  </DialogContent>
                  <DialogActions sx={{ p: 3, bgcolor: '#f8fafc' }}>
                      <Button onClick={() => setIsMbRecordsOpen(false)}>Close</Button>
                  </DialogActions>
              </Dialog>
          </Box>
      );
  }

  return (
    <Box className="animate-in fade-in duration-500">
        <Box display="flex" justifyContent="space-between" mb={4} alignItems="center">
            <Box>
                <Typography variant="h5" fontWeight="900">Structural Assets</Typography>
                <Typography variant="body2" color="text.secondary">Inventory of culverts, bridges and retaining walls</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" startIcon={<Plus size={18}/>} sx={{ borderRadius: 2 }} onClick={() => setViewMode('CREATE')}>Define New Asset</Button>
              <Button variant="outlined" startIcon={<FileText size={18}/>} sx={{ borderRadius: 2 }} onClick={() => setIsTemplateListOpen(true)}>Use Template</Button>
            </Stack>
        </Box>

        <Grid container spacing={3}>
            {(project.structures || []).map(str => {
                const progress = calculateOverallProgress(str);
                const assignedAgency = project.agencies?.find(a => a.id === str.subcontractorId);
                return (
                    <Grid item xs={12} md={6} lg={4} key={str.id}>
                        <Card 
                            variant="outlined" 
                            onClick={() => { setDetailStructureId(str.id); setViewMode('DETAIL'); }}
                            sx={{ cursor: 'pointer', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 24px rgba(0,0,0,0.05)', borderColor: 'primary.main' }, borderRadius: 4, position: 'relative' }}
                        >
                            <Box p={3}>
                                <Box display="flex" justifyContent="space-between" mb={2}>
                                    <Chip label={str.type} size="small" variant="outlined" sx={{ fontWeight: 'bold', fontSize: 10 }} />
                                    <Box display="flex" alignItems="center" gap={0.5} color="text.secondary"><MapPin size={14}/> <Typography variant="caption" fontWeight="bold">Ch: {str.location}</Typography></Box>
                                </Box>
                                <Typography variant="subtitle1" fontWeight="900" gutterBottom>{str.name}</Typography>
                                
                                {assignedAgency && (
                                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                                        <HardHat size={14} color="#4f46e5" />
                                        <Typography variant="caption" color="primary.main">{assignedAgency.name}</Typography>
                                    </Box>
                                )}
                                
                                <Box mt={3}>
                                    <Box display="flex" justifyContent="space-between" mb={0.5}><Typography variant="caption" fontWeight="bold">Physical Progress</Typography><Typography variant="caption" fontWeight="900" color="primary">{progress}%</Typography></Box>
                                    <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
                                </Box>
                                <Box display="flex" gap={1} mt={3}>
                                    <Chip label={`${str.components.length} Components`} size="small" variant="outlined" sx={{ fontSize: 10 }} />
                                    {progress === 100 && <Chip label="COMPLETED" color="success" size="small" sx={{ fontWeight: 'bold', fontSize: 9 }} />}
                                </Box>
                                {str.completionDate && (
                                  <Typography variant="caption" color="success.main" mt={1} display="block">Completed: {str.completionDate}</Typography>
                                )}
                            </Box>
                            
                            {/* Action buttons */}
                            <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }}>
                                <IconButton 
                                    size="small" 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        handleEditStructure(str); 
                                    }}
                                    sx={{ 
                                        bgcolor: 'white', 
                                        border: '1px solid', 
                                        borderColor: 'divider',
                                        '&:hover': { bgcolor: 'primary.light' }
                                    }}
                                >
                                    <Edit size={14} />
                                </IconButton>
                                <IconButton 
                                    size="small" 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        handleDeleteStructure(str.id); 
                                    }}
                                    sx={{ 
                                        bgcolor: 'white', 
                                        border: '1px solid', 
                                        borderColor: 'divider',
                                        '&:hover': { bgcolor: 'error.light' }
                                    }}
                                >
                                    <Trash2 size={14} />
                                </IconButton>
                            </Box>
                        </Card>
                    </Grid>
                );
            })}
        </Grid>
    </Box>
  );
};

export default ConstructionModule;
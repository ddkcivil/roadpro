import React, { useState, useMemo, useTransition } from 'react';
import { 
    Plus, ArrowLeft, HardHat, History, CheckCircle2,
    MapPin, X, Save, Microscope, Edit2, Trash2, Package,
    Clock, CheckCircle, AlertTriangle, Search, FileText,
    UploadCloud, ExternalLink
} from 'lucide-react';
import { 
    Project, StructureAsset, StructureType, 
    StructureComponent, StructureTemplate, StructureWorkLog,
    StructureDrawing
} from '../../types';
import { generateUniqueId } from '../../utils/uuidUtils';
import { toast } from 'sonner';

import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Textarea } from '~/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Badge } from '~/components/ui/badge';
import { Progress } from '~/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { Separator } from '~/components/ui/separator';

import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const STRUCTURE_TYPES: StructureType[] = [
    'Pipe Culvert', 'Box Culvert', 'Slab Culvert', 'Minor Bridge', 'Major Bridge', 
    'Drainage (Lined)', 'Drainage (Unlined)', 'Retaining Wall', 'Breast Wall',
    'Pavement (Flexible)', 'Pavement (Rigid)', 'Footpath',
    'Utility Duct', 'Street Light Base', 'Road Signal', 'Junction Box', 
    'Median Barrier', 'Pedestrian Guardrail', 'Bus Shelter'
];

interface Props {
  project: Project;
  onProjectUpdate: (project: Project) => void;
}

const WorkLogTimeline: React.FC<{ structure: StructureAsset }> = ({ structure }) => {
  const allLogs = useMemo(() => {
    return structure.components.flatMap(comp => 
      (comp.workLogs || []).map(log => ({
        ...log,
        componentName: comp.name,
        unit: comp.unit
      }))
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [structure]);

  if (allLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-50">
        <History size={48} className="mb-4" />
        <p className="font-bold tracking-tighter uppercase">No activity recorded yet</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
      {allLogs.map((log) => (
        <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 group-[.is-active]:bg-primary text-slate-500 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
            <CheckCircle2 size={16} />
          </div>
          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between space-x-2 mb-1">
              <div className="font-bold text-slate-900 dark:text-slate-100">{log.componentName}</div>
              <time className="font-mono text-[10px] text-primary font-black uppercase">{new Date(log.date).toLocaleDateString()}</time>
            </div>
            <div className="text-slate-500 dark:text-slate-400 text-sm mb-2 flex items-center gap-2">
              <span className="font-black text-slate-900 dark:text-slate-100">{log.quantity} {log.unit}</span>
              {log.subcontractorId && (
                <Badge variant="outline" className="text-[8px] h-4 font-bold bg-primary/5 border-primary/20">Agency Assigned</Badge>
              )}
            </div>
            
            {log.materials && log.materials.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {log.materials.map((m, i) => (
                  <span key={i} className="text-[9px] bg-muted px-1.5 py-0.5 rounded-md flex items-center gap-1 font-medium">
                    <Package size={8} /> {m.quantity} {m.unit}
                  </span>
                ))}
              </div>
            )}

            {log.remarks && (
              <div className="p-2 rounded bg-muted/50 text-[10px] italic border-l-2 border-primary/30">
                "{log.remarks}"
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const StructuralAnalytics: React.FC<{ structures: StructureAsset[] }> = ({ structures }) => {
  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    structures.forEach(s => {
      counts[s.type] = (counts[s.type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [structures]);

  const progressData = useMemo(() => {
    return structures.map(s => {
      if (!s.components || !s.components.length) return { name: s.name, progress: 0 };
      const totalDone = s.components.reduce((acc, c) => acc + (c.completedQuantity || 0), 0);
      const totalTarget = s.components.reduce((acc, c) => acc + (c.totalQuantity || 0), 0);
      return {
        name: s.name.length > 15 ? s.name.substring(0, 12) + '...' : s.name,
        progress: totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0
      };
    }).sort((a, b) => b.progress - a.progress).slice(0, 10);
  }, [structures]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const stats = useMemo(() => {
    const total = structures.length;
    const completed = structures.filter(s => s.status === 'Completed').length;
    const inProgress = structures.filter(s => s.status === 'In Progress').length;
    return { total, completed, inProgress };
  }, [structures]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-black text-muted-foreground uppercase tracking-widest">Overall Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
             <div className="flex justify-between items-end">
                <span className="text-3xl font-black">{stats.total}</span>
                <span className="text-xs font-bold text-muted-foreground">Total Assets</span>
             </div>
             <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase">
                  <span>Completed</span>
                  <span className="text-emerald-500">{stats.completed}</span>
                </div>
                <Progress value={(stats.completed / (stats.total || 1)) * 100} className="h-1 bg-emerald-100" />
                <div className="flex justify-between text-xs font-bold uppercase">
                  <span>In Progress</span>
                  <span className="text-amber-500">{stats.inProgress}</span>
                </div>
                <Progress value={(stats.inProgress / (stats.total || 1)) * 100} className="h-1 bg-amber-100" />
             </div>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-black text-muted-foreground uppercase tracking-widest">Type Distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={typeDistribution}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
                paddingAngle={5}
                dataKey="value"
              >
                {typeDistribution.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-black text-muted-foreground uppercase tracking-widest">Top Asset Progress (%)</CardTitle>
        </CardHeader>
        <CardContent className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={progressData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
              <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 100]} />
              <RechartsTooltip />
              <Bar dataKey="progress" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

const ConstructionModule: React.FC<Props> = ({ project, onProjectUpdate }) => {
  const [, startTransition] = useTransition();
  const [viewMode, setViewMode] = useState<'LIST' | 'CREATE' | 'DETAIL' | 'EDIT'>('LIST');
  const [detailStructureId, setDetailStructureId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState("progress");
  const [editingStructure, setEditingStructure] = useState<StructureAsset | null>(null);
  
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
    remarks: '', 
    boqItemId: '', 
    subcontractorId: '',
    materials: [] as { materialId: string; quantity: number; unit: string }[]
  });
  const [isMbRecordsOpen, setIsMbRecordsOpen] = useState(false);
  
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isTemplateListOpen, setIsTemplateListOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  
  const [uploadingDrawing, setUploadingDrawing] = useState(false);
  
  const structures: StructureAsset[] = project.structures || [];
  const selectedStructure = structures.find(s => s.id === detailStructureId);

  const handleUploadDrawing = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !selectedStructure) return;
    
    const file = e.target.files[0];
    setUploadingDrawing(true);
    
    try {
        // In a real app, we would upload to a server here.
        // For this prototype, we'll create a local URL and mock the process.
        const mockUrl = URL.createObjectURL(file);
        
        const newDrawing: StructureDrawing = {
            id: generateUniqueId(),
            name: file.name,
            url: mockUrl,
            uploadedDate: new Date().toISOString().split('T')[0],
            uploadedBy: 'Current User'
        };
        
        const updatedStructures = structures.map(s => 
            s.id === selectedStructure.id ? {
                ...s,
                approvedDrawings: [...(s.approvedDrawings || []), newDrawing],
                lastUpdated: new Date().toISOString()
            } : s
        ) as StructureAsset[];
        
        onProjectUpdate({ ...project, structures: updatedStructures });
        toast.success("Drawing Attached Successfully");
    } catch (error) {
        toast.error("Failed to upload drawing");
    } finally {
        setUploadingDrawing(false);
        e.target.value = ''; // Reset input
    }
  };

  const handleDeleteDrawing = (drawingId: string) => {
    if (!selectedStructure || !window.confirm("Permanently remove this drawing?")) return;
    
    const updatedStructures = structures.map(s => 
        s.id === selectedStructure.id ? {
            ...s,
            approvedDrawings: (s.approvedDrawings || []).filter(d => d.id !== drawingId),
            lastUpdated: new Date().toISOString()
        } : s
    ) as StructureAsset[];
    
    onProjectUpdate({ ...project, structures: updatedStructures });
    toast.success("Drawing Removed");
  };
  const structureTemplates: StructureTemplate[] = project.structureTemplates || [];

  const linkedTests = useMemo(() => {
    return selectedStructure ? project.labTests?.filter(t => t.assetId === selectedStructure.id) || [] : [];
  }, [project.labTests, selectedStructure]);

  const calculateOverallProgress = (structure: StructureAsset) => {
    if (!structure.components || !structure.components.length) return 0;
    const totalDone = structure.components.reduce((acc, c) => acc + (c.completedQuantity || 0), 0);
    const totalTarget = structure.components.reduce((acc, c) => acc + (c.totalQuantity || 0), 0);
    return totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0;
  };
  
  const handleSaveTemplate = () => {
    if (!templateName) return;
    const template: StructureTemplate = {
      id: generateUniqueId(),
      name: templateName,
      description: '',
      type: (newStructure.type as StructureType) || 'Box Culvert',
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      components: (newStructure.components || []).map(c => ({
        ...c,
        completedQuantity: 0,
        verifiedQuantity: 0,
        workLogs: []
      }))
    };
    onProjectUpdate({
      ...project,
      structureTemplates: [...(project.structureTemplates || []), template]
    });
    setIsTemplateModalOpen(false);
    setTemplateName('');
    toast.success("Template Saved");
  };

  const handleCreateFromTemplate = (template: StructureTemplate) => {
    setNewStructure({
      name: `New ${template.name}`,
      type: template.type,
      location: '',
      status: 'Not Started',
      components: template.components.map(c => ({ ...c, id: generateUniqueId(), workLogs: [] })),
      subcontractorId: '',
      chainage: ''
    });
    setViewMode('CREATE');
    setIsTemplateListOpen(false);
  };

  const handleOpenLogWork = (comp: StructureComponent) => {
    setCurrentLogComponent(comp);
    setLogForm({
      date: new Date().toISOString().split('T')[0],
      quantity: 0,
      remarks: '',
      boqItemId: comp.boqItemId || '',
      subcontractorId: comp.subcontractorId || selectedStructure?.subcontractorId || '',
      materials: []
    });
    setIsLogWorkOpen(true);
  };

  const handleAddComponent = () => {
    const component: StructureComponent = {
      id: generateUniqueId(),
      name: '',
      unit: '',
      totalQuantity: 0,
      completedQuantity: 0,
      verifiedQuantity: 0,
      workLogs: []
    };
    setNewStructure(prev => ({
      ...prev,
      components: [...(prev.components || []), component]
    }));
  };

  const handleUpdateComponent = (index: number, field: keyof StructureComponent, value: any) => {
    const updatedComponents = [...(newStructure.components || [])];
    updatedComponents[index] = { ...updatedComponents[index], [field]: value };
    setNewStructure(prev => ({ ...prev, components: updatedComponents }));
  };

  const handleRemoveComponent = (index: number) => {
    const updatedComponents = (newStructure.components || []).filter((_, i) => i !== index);
    setNewStructure(prev => ({ ...prev, components: updatedComponents }));
  };

  const handleCreateStructure = () => {
    if (!newStructure.name || !newStructure.type) {
      toast.error("Required Fields Missing");
      return;
    }
    const structure: StructureAsset = {
      ...(newStructure as StructureAsset),
      id: generateUniqueId(),
      components: newStructure.components || [],
      lastUpdated: new Date().toISOString(),
      status: 'Not Started'
    };
    onProjectUpdate({
      ...project,
      structures: [...(project.structures || []), structure]
    });
    setViewMode('LIST');
    setNewStructure({ name: '', type: 'Box Culvert', components: [], status: 'Not Started' });
    toast.success("Asset Registered");
  };

  const handleUpdateStructure = () => {
    if (!editingStructure) return;
    const updatedStructures = (project.structures || []).map(s => 
      s.id === editingStructure.id ? { ...s, ...newStructure, lastUpdated: new Date().toISOString() } : s
    ) as StructureAsset[];
    onProjectUpdate({ ...project, structures: updatedStructures });
    setViewMode('LIST');
    setEditingStructure(null);
    toast.success("Asset Updated");
  };

  const handleEditStructure = (structure: StructureAsset) => {
    setEditingStructure(structure);
    setNewStructure({ ...structure });
    setViewMode('EDIT');
  };

  const handleDeleteStructure = (structureId: string) => {
    onProjectUpdate({
      ...project,
      structures: (project.structures || []).filter(s => s.id !== structureId)
    });
    toast.success("Asset Removed");
  };

  const handleSaveWorkLog = () => {
    if (!currentLogComponent || !selectedStructure) return;
    
    if (logForm.quantity <= 0) {
      toast.error("Invalid Quantity");
      return;
    }

    const newLog: StructureWorkLog = {
      ...logForm,
      id: generateUniqueId()
    };

    const updatedComponents = selectedStructure.components.map(comp => {
      if (comp.id === currentLogComponent.id) {
        return {
          ...comp,
          completedQuantity: (comp.completedQuantity || 0) + logForm.quantity,
          workLogs: [...(comp.workLogs || []), newLog]
        };
      }
      return comp;
    });

    const updatedStructures = structures.map(s => 
      s.id === selectedStructure.id ? { 
        ...s, 
        components: updatedComponents, 
        status: s.status === 'Not Started' ? 'In Progress' : s.status,
        lastUpdated: new Date().toISOString()
      } : s
    ) as StructureAsset[];

    startTransition(() => {
      onProjectUpdate({ ...project, structures: updatedStructures });
    });
    setIsLogWorkOpen(false);
    toast.success("Work Logged with Components & Materials");
  };

  const handleCertifyStructure = () => {
    if (!selectedStructure) return;

    if (window.confirm(`Certify 100% completion for ${selectedStructure.name}?`)) {
      const updatedComponents = selectedStructure.components.map(comp => ({
        ...comp,
        completedQuantity: comp.totalQuantity,
        verifiedQuantity: comp.totalQuantity
      }));

      const updatedStructures = structures.map(s => 
        s.id === selectedStructure.id ? { 
          ...s, 
          components: updatedComponents, 
          status: 'Completed' as const,
          completionDate: new Date().toISOString().split('T')[0],
          lastUpdated: new Date().toISOString() 
        } : s
      ) as StructureAsset[];

      startTransition(() => {
        onProjectUpdate({ ...project, structures: updatedStructures });
      });
      toast.success("Structure Certified");
    }
  };

  if (viewMode === 'CREATE' || viewMode === 'EDIT') {
      return (
          <div className="animate-in fade-in duration-500 p-4">
              <div className="flex justify-between mb-6 items-center">
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => setViewMode('LIST')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-xl font-bold font-black tracking-tight">{viewMode === 'EDIT' ? 'Edit Structural Asset' : 'Define New Structural Asset'}</h2>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Inventory Management System</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsTemplateModalOpen(true)} className="rounded-xl">
                        <Save className="mr-2 h-4 w-4" /> Save Template
                    </Button>
                    <Button onClick={viewMode === 'EDIT' ? handleUpdateStructure : handleCreateStructure} className="rounded-xl font-black uppercase tracking-tighter">
                        <CheckCircle2 className="mr-2 h-4 w-4" /> {viewMode === 'EDIT' ? 'Update Asset' : 'Commit Registry'}
                    </Button>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-1 h-fit rounded-2xl border-none shadow-xl glass">
                      <CardHeader>
                          <CardTitle className="text-sm font-black uppercase tracking-widest opacity-70">General Information</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-4">
                          <div className="grid gap-2">
                              <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest">Asset Name</Label>
                              <Input id="name" value={newStructure.name || ''} onChange={e => setNewStructure({...newStructure, name: e.target.value})} placeholder="e.g. 2x2 Box Culvert" className="rounded-xl" />
                          </div>
                          <div className="grid gap-2">
                              <Label htmlFor="type" className="text-[10px] font-black uppercase tracking-widest">Classification</Label>
                              <Select value={newStructure.type} onValueChange={(value: StructureType) => setNewStructure({...newStructure, type: value})}>
                                  <SelectTrigger className="rounded-xl">
                                      <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                      {STRUCTURE_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                  </SelectContent>
                              </Select>
                          </div>
                          <div className="grid gap-2">
                              <Label htmlFor="location" className="text-[10px] font-black uppercase tracking-widest">Chainage / Location</Label>
                              <Input id="location" value={newStructure.location || ''} onChange={e => setNewStructure({...newStructure, location: e.target.value, chainage: e.target.value})} placeholder="e.g. 12+500" className="rounded-xl" />
                          </div>
                          <div className="grid gap-2">
                              <Label htmlFor="subcontractor" className="text-[10px] font-black uppercase tracking-widest">Primary Agency</Label>
                              <Select value={newStructure.subcontractorId || 'none'} onValueChange={(value: string) => setNewStructure({...newStructure, subcontractorId: value === 'none' ? '' : value})}>
                                  <SelectTrigger className="rounded-xl">
                                      <SelectValue placeholder="Select subcontractor" />
                                  </SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="none">Internal Execution</SelectItem>
                                      {project.agencies?.filter(a => a.type === 'subcontractor' || a.type === 'agency').map(agency => (
                                          <SelectItem key={agency.id} value={agency.id}>{agency.name}</SelectItem>
                                      ))}
                                  </SelectContent>
                              </Select>
                          </div>
                      </CardContent>
                  </Card>

                  <Card className="lg:col-span-2 rounded-2xl border-none shadow-xl glass">
                      <CardHeader className="flex flex-row justify-between items-center">
                          <CardTitle className="text-sm font-black uppercase tracking-widest opacity-70">Structural Components</CardTitle>
                          <Button size="sm" variant="secondary" onClick={handleAddComponent} className="rounded-xl text-[10px] font-black uppercase">
                              <Plus className="mr-2 h-3 w-3" /> Add component
                          </Button>
                      </CardHeader>
                      <CardContent>
                          <div className="grid gap-4">
                              {newStructure.components?.map((comp, idx) => (
                                  <div key={comp.id || idx} className="border border-dashed rounded-2xl p-4 relative bg-muted/20">
                                      <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive h-6 w-6" onClick={() => handleRemoveComponent(idx)}>
                                          <X className="h-4 w-4" />
                                      </Button>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                                          <div className="grid gap-1.5">
                                              <Label className="text-[9px] font-black uppercase tracking-widest opacity-60">Component Name</Label>
                                              <Input value={comp.name || ''} onChange={e => handleUpdateComponent(idx, 'name', e.target.value)} className="h-8 text-xs rounded-lg" />
                                          </div>
                                          <div className="grid gap-1.5">
                                              <Label className="text-[9px] font-black uppercase tracking-widest opacity-60">Unit</Label>
                                              <Input value={comp.unit || ''} onChange={e => handleUpdateComponent(idx, 'unit', e.target.value)} className="h-8 text-xs rounded-lg" />
                                          </div>
                                          <div className="grid gap-1.5">
                                              <Label className="text-[9px] font-black uppercase tracking-widest opacity-60">Planned Qty</Label>
                                              <Input type="number" value={comp.totalQuantity || 0} onChange={e => handleUpdateComponent(idx, 'totalQuantity', Number(e.target.value))} className="h-8 text-xs rounded-lg" />
                                          </div>
                                          <div className="grid gap-1.5">
                                              <Label className="text-[9px] font-black uppercase tracking-widest opacity-60">Subcontractor</Label>
                                              <Select value={comp.subcontractorId || 'none'} onValueChange={(value: string) => handleUpdateComponent(idx, 'subcontractorId', value === 'none' ? '' : value)}>
                                                  <SelectTrigger className="h-8 text-[10px] rounded-lg">
                                                      <SelectValue placeholder="Assigned..." />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                      <SelectItem value="none">Default</SelectItem>
                                                      {project.agencies?.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                                                  </SelectContent>
                                              </Select>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </CardContent>
                  </Card>
              </div>
          </div>
      );
  }

  if (viewMode === 'DETAIL' && selectedStructure) {
      const overallProgress = calculateOverallProgress(selectedStructure);
      return (
          <div className="animate-in fade-in duration-500 p-4">
              <div className="flex justify-between mb-6 items-center">
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => setViewMode('LIST')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-xl font-black tracking-tight">{selectedStructure.name}</h2>
                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                          <MapPin size={10} className="text-primary" />
                          Ch: {selectedStructure.location}
                        </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setIsMbRecordsOpen(true)} className="rounded-xl">
                          <History className="mr-2 h-4 w-4" /> Audit Logs
                      </Button>
                      {selectedStructure.status !== 'Completed' && (
                        <Button onClick={handleCertifyStructure} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-tighter shadow-lg shadow-emerald-500/20">
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Certify Completion
                        </Button>
                      )}
                  </div>
              </div>

              <Tabs value={detailTab} onValueChange={setDetailTab} className="mb-6">
                  <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1 rounded-2xl h-12">
                      <TabsTrigger value="progress" className="rounded-xl font-black uppercase tracking-widest text-[10px]"><HardHat className="mr-2 h-4 w-4" /> Execution</TabsTrigger>
                      <TabsTrigger value="drawings" className="rounded-xl font-black uppercase tracking-widest text-[10px]"><FileText className="mr-2 h-4 w-4" /> Drawings</TabsTrigger>
                      <TabsTrigger value="quality" className="rounded-xl font-black uppercase tracking-widest text-[10px]"><Microscope className="mr-2 h-4 w-4" /> QC & Tests</TabsTrigger>
                      <TabsTrigger value="analytics" className="rounded-xl font-black uppercase tracking-widest text-[10px]"><Clock className="mr-2 h-4 w-4" /> Timeline</TabsTrigger>
                  </TabsList>

                  <TabsContent value="drawings" className="py-4 space-y-6">
                    <Card className="rounded-3xl border-none shadow-xl glass overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between bg-muted/30 pb-4">
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <FileText size={16} className="text-primary" />
                                Approved Structural Drawings
                            </CardTitle>
                            <div className="relative">
                                <Button size="sm" className="rounded-xl text-[10px] font-black uppercase" disabled={uploadingDrawing}>
                                    {uploadingDrawing ? 'Uploading...' : <><Plus size={12} className="mr-1" /> Attach Drawing</>}
                                </Button>
                                <input 
                                    type="file" 
                                    className="absolute inset-0 opacity-0 cursor-pointer" 
                                    onChange={handleUploadDrawing}
                                    accept=".pdf,.dwg,.jpg,.jpeg,.png"
                                    disabled={uploadingDrawing}
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {selectedStructure.approvedDrawings && selectedStructure.approvedDrawings.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/10">
                                            <TableHead className="text-[9px] font-black uppercase">Drawing Name</TableHead>
                                            <TableHead className="text-[9px] font-black uppercase">Uploaded Date</TableHead>
                                            <TableHead className="text-[9px] font-black uppercase text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedStructure.approvedDrawings.map(drawing => (
                                            <TableRow key={drawing.id} className="hover:bg-muted/5 group">
                                                <TableCell className="py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-primary/10 p-2 rounded-lg">
                                                            <FileText size={16} className="text-primary" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm">{drawing.name}</p>
                                                            <p className="text-[9px] text-muted-foreground uppercase font-black">Ref: {drawing.id.slice(-6).toUpperCase()}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs font-medium text-muted-foreground">
                                                    {drawing.uploadedDate}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-primary"
                                                            onClick={() => window.open(drawing.url, '_blank')}
                                                        >
                                                            <ExternalLink size={14} />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={() => handleDeleteDrawing(drawing.id)}
                                                        >
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-20 opacity-40">
                                    <UploadCloud size={48} className="mx-auto mb-4" />
                                    <p className="text-xs font-black uppercase tracking-widest">No drawings attached to this asset</p>
                                    <p className="text-[10px] mt-1">Upload approved GFC drawings for field reference</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="progress" className="py-4 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="rounded-3xl border-none shadow-xl glass bg-primary/5">
                            <CardContent className="p-6">
                                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">Total Realized</h3>
                                <div className="flex items-baseline gap-2">
                                  <h4 className="text-5xl font-black italic text-primary">{overallProgress}%</h4>
                                  <span className="text-xs font-bold text-primary/60 uppercase">Physical</span>
                                </div>
                                <Progress value={overallProgress} className="h-1.5 mt-6 bg-primary/10" />
                            </CardContent>
                        </Card>
                        <Card className="md:col-span-2 rounded-3xl border-none shadow-xl glass overflow-hidden">
                            <CardHeader className="bg-muted/30 pb-4"><CardTitle className="text-sm font-black uppercase tracking-widest">Component Execution Matrix</CardTitle></CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-border/50">
                                    {selectedStructure.components.map(comp => {
                                        const p = Math.round(((comp.completedQuantity || 0) / (comp.totalQuantity || 1)) * 100);
                                        return (
                                          <div key={comp.id} className="p-4 hover:bg-muted/20 transition-colors">
                                              <div className="flex justify-between items-center mb-3">
                                                  <div>
                                                    <p className="font-black text-sm">{comp.name}</p>
                                                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                                                      {comp.completedQuantity} / {comp.totalQuantity} {comp.unit}
                                                    </p>
                                                  </div>
                                                  <div className="flex items-center gap-3">
                                                    <Badge variant={p === 100 ? 'default' : 'outline'} className={p === 100 ? 'bg-emerald-500' : ''}>
                                                      {p}%
                                                    </Badge>
                                                    <Button size="sm" variant="ghost" className="h-8 text-[10px] font-black uppercase" onClick={() => handleOpenLogWork(comp)}>
                                                      <Plus size={12} className="mr-1" /> Log Work
                                                    </Button>
                                                  </div>
                                              </div>
                                              <Progress value={p} className="h-1" />
                                          </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="quality" className="py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="rounded-3xl border-none shadow-xl glass">
                            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
                              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <CheckCircle size={16} className="text-emerald-500" />
                                Lab Tests
                              </CardTitle>
                              <Badge variant="outline">{linkedTests.length} Records</Badge>
                            </CardHeader>
                            <CardContent className="p-0">
                                {linkedTests.length > 0 ? (
                                    <Table>
                                        <TableHeader><TableRow className="bg-muted/30"><TableHead className="text-[9px] font-black">Test</TableHead><TableHead className="text-[9px] font-black">Sample</TableHead><TableHead className="text-[9px] font-black">Result</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {linkedTests.map(test => (
                                                <TableRow key={test.id} className="hover:bg-muted/10">
                                                  <TableCell className="py-3 font-bold text-xs">{test.testName}</TableCell>
                                                  <TableCell className="py-3 font-mono text-[10px]">{test.sampleId}</TableCell>
                                                  <TableCell className="py-3">
                                                    <Badge variant={test.result === 'Pass' ? 'default' : 'destructive'} className="text-[9px] uppercase font-black tracking-widest">
                                                      {test.result}
                                                    </Badge>
                                                  </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                  <div className="text-center py-12 opacity-40">
                                    <Clock size={32} className="mx-auto mb-2" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">No quality records detected</p>
                                  </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="rounded-3xl border-none shadow-xl glass bg-destructive/5">
                            <CardHeader className="border-b border-destructive/10 pb-4">
                              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-destructive">
                                <AlertTriangle size={16} />
                                Pending NCRs
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center justify-center py-12 text-destructive/40">
                                <Search size={32} className="mb-2" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Scanning structural integrity...</p>
                            </CardContent>
                        </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="analytics" className="py-4">
                    <Card className="rounded-3xl border-none shadow-xl glass p-8">
                      <WorkLogTimeline structure={selectedStructure} />
                    </Card>
                  </TabsContent>
              </Tabs>
          </div>
      );
  }

  return (
    <div className="animate-in fade-in duration-500 p-4">
      <div className="flex justify-between mb-8 items-center px-2">
          <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic">
                Structural <span className="text-primary">Registry</span>
              </h1>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Engineering Asset Management</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsTemplateListOpen(true)} className="rounded-xl border-2">
                <FileText className="mr-2 h-4 w-4" /> Templates
            </Button>
            <Button onClick={() => setViewMode('CREATE')} className="rounded-xl font-black uppercase tracking-tighter shadow-lg shadow-primary/20">
                <Plus className="mr-2 h-4 w-4" /> Register Asset
            </Button>
          </div>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="mb-8 h-12 bg-muted/50 p-1 rounded-2xl w-fit">
          <TabsTrigger value="list" className="rounded-xl font-black uppercase tracking-widest text-[10px] px-6">Asset Inventory</TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-xl font-black uppercase tracking-widest text-[10px] px-6">Advanced Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {structures.map(str => {
                  const prog = calculateOverallProgress(str);
                  return (
                      <Card key={str.id} className="group hover:shadow-2xl transition-all duration-500 relative overflow-hidden border-none rounded-[2.5rem] glass-card">
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                          <CardContent className="p-6">
                              <div className="flex justify-between items-start mb-6">
                                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[9px] uppercase font-black tracking-widest px-3 py-1 rounded-full">
                                    {str.type}
                                  </Badge>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0 duration-500">
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                                        onClick={(e) => { e.stopPropagation(); handleEditStructure(str); }}
                                      >
                                          <Edit2 size={14} />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
                                        onClick={(e) => { e.stopPropagation(); if(confirm('Permanently remove this structural asset?')) handleDeleteStructure(str.id); }}
                                      >
                                          <Trash2 size={14} />
                                      </Button>
                                  </div>
                              </div>
                              
                              <div className="cursor-pointer" onClick={() => { setDetailStructureId(str.id); setViewMode('DETAIL'); }}>
                                <h3 className="text-xl font-black tracking-tight mb-1 group-hover:text-primary transition-colors leading-none">{str.name}</h3>
                                <div className="flex items-center gap-1.5 text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-6 mt-2">
                                  <MapPin size={10} className="text-primary animate-pulse" /> 
                                  Ch: {str.location || 'N/A'}
                                </div>
                                
                                <div className="space-y-2">
                                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                    <span className="text-muted-foreground opacity-60">Physical Realization</span>
                                    <span className="text-primary italic">{prog}%</span>
                                  </div>
                                  <Progress value={prog} className="h-1.5 bg-slate-100 dark:bg-slate-800" />
                                </div>
                              </div>
                          </CardContent>
                      </Card>
                  );
              })}
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <StructuralAnalytics structures={structures} />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <Dialog open={isLogWorkOpen} onOpenChange={setIsLogWorkOpen}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] border-none shadow-2xl">
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="flex items-center gap-3 text-2xl font-black tracking-tighter italic uppercase">
                  <div className="bg-primary/10 p-2 rounded-2xl"><HardHat className="text-primary" /></div>
                  Log Execution
                </DialogTitle>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-2">{currentLogComponent?.name}</p>
              </DialogHeader>
              
              <div className="grid gap-6 p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Quantity ({currentLogComponent?.unit})</Label>
                      <Input type="number" value={logForm.quantity} onChange={e => setLogForm({...logForm, quantity: Number(e.target.value)})} className="rounded-xl h-12 text-lg font-black italic border-2" />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Reporting Date</Label>
                      <Input type="date" value={logForm.date} onChange={e => setLogForm({...logForm, date: e.target.value})} className="rounded-xl h-12" />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Responsible Agency</Label>
                    <Select value={logForm.subcontractorId || 'none'} onValueChange={v => setLogForm({...logForm, subcontractorId: v === 'none' ? '' : v})}>
                      <SelectTrigger className="rounded-xl h-12"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Internal / General</SelectItem>
                        {project.agencies?.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Package size={14} className="text-primary" />
                        Material Consumption
                      </Label>
                      <Button variant="secondary" size="sm" className="h-7 text-[9px] uppercase font-black rounded-full" onClick={() => setLogForm({...logForm, materials: [...logForm.materials, { materialId: '', quantity: 0, unit: '' }]})}>
                        <Plus size={10} className="mr-1" /> Add Entry
                      </Button>
                    </div>
                    
                    {logForm.materials.length > 0 ? logForm.materials.map((m, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-muted/30 p-3 rounded-2xl border border-dashed border-primary/20">
                        <div className="col-span-6">
                          <Select value={m.materialId} onValueChange={v => {
                            const mat = project.inventory?.find(i => i.id === v);
                            const updated = [...logForm.materials];
                            updated[idx] = { ...updated[idx], materialId: v, unit: mat?.unit || '' };
                            setLogForm({...logForm, materials: updated});
                          }}>
                            <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue placeholder="Material..." /></SelectTrigger>
                            <SelectContent>
                              {project.inventory?.map(i => <SelectItem key={i.id} value={i.id}>{i.itemName}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-4">
                          <Input className="h-9 text-xs rounded-xl" type="number" placeholder="Qty" value={m.quantity || ''} onChange={e => {
                            const updated = [...logForm.materials];
                            updated[idx].quantity = Number(e.target.value);
                            setLogForm({...logForm, materials: updated});
                          }} />
                        </div>
                        <div className="col-span-2 text-center">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setLogForm({...logForm, materials: logForm.materials.filter((_, i) => i !== idx)})}>
                            <X size={14} />
                          </Button>
                        </div>
                      </div>
                    )) : (
                      <p className="text-[10px] text-muted-foreground italic text-center py-2">No materials linked to this work log.</p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Site Remarks</Label>
                    <Textarea className="text-xs rounded-2xl min-h-[80px]" value={logForm.remarks} onChange={e => setLogForm({...logForm, remarks: e.target.value})} placeholder="Field observations..." />
                  </div>
              </div>
              <DialogFooter className="p-6 pt-0">
                <Button variant="ghost" onClick={() => setIsLogWorkOpen(false)} className="rounded-xl">Discard</Button>
                <Button onClick={handleSaveWorkLog} className="rounded-xl h-12 px-8 font-black uppercase italic tracking-tighter shadow-lg shadow-primary/20">Commit Execution</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={isMbRecordsOpen} onOpenChange={setIsMbRecordsOpen}>
          <DialogContent className="max-w-2xl rounded-3xl border-none shadow-2xl">
              <DialogHeader className="p-6 border-b border-border/50">
                <DialogTitle className="text-xl font-black tracking-tight italic uppercase">Audit Log: {selectedStructure?.name}</DialogTitle>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-auto">
                <Table>
                    <TableHeader><TableRow className="bg-muted/30"><TableHead className="text-[9px] font-black uppercase">Date</TableHead><TableHead className="text-[9px] font-black uppercase">Component</TableHead><TableHead className="text-[9px] font-black uppercase text-right">Quantity</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {selectedStructure?.components.flatMap(comp => comp.workLogs?.map(log => (
                            <TableRow key={log.id} className="hover:bg-muted/10">
                              <TableCell className="text-xs font-mono">{log.date}</TableCell>
                              <TableCell className="text-xs font-bold">{comp.name}</TableCell>
                              <TableCell className="text-right font-black italic text-xs text-primary">{log.quantity} {comp.unit}</TableCell>
                            </TableRow>
                        )) || [])}
                    </TableBody>
                </Table>
              </div>
              <DialogFooter className="p-6 border-t border-border/50">
                <Button onClick={() => setIsMbRecordsOpen(false)} className="rounded-xl">Close Log</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={isTemplateListOpen} onOpenChange={setIsTemplateListOpen}>
          <DialogContent className="max-w-xl rounded-3xl border-none shadow-2xl">
              <DialogHeader className="p-6 border-b">
                <DialogTitle className="text-xl font-black tracking-tight italic uppercase">Structure Templates</DialogTitle>
              </DialogHeader>
              <div className="max-h-[50vh] overflow-auto">
                <Table>
                    <TableBody>
                        {structureTemplates.length > 0 ? structureTemplates.map(t => (
                            <TableRow key={t.id} className="hover:bg-muted/10 group">
                                <TableCell className="font-bold py-4">
                                  <p>{t.name}</p>
                                  <p className="text-[9px] text-muted-foreground uppercase font-black mt-0.5">{t.type}</p>
                                </TableCell>
                                <TableCell className="text-right"><Button size="sm" variant="secondary" onClick={() => handleCreateFromTemplate(t)} className="rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">Deploy Template</Button></TableCell>
                            </TableRow>
                        )) : <TableRow><TableCell colSpan={2} className="text-center py-12 opacity-40 font-bold uppercase text-xs">No saved templates</TableCell></TableRow>}
                    </TableBody>
                </Table>
              </div>
          </DialogContent>
      </Dialog>

      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader><DialogTitle className="font-black italic uppercase">Save Template</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <Label className="text-[10px] font-black uppercase">Template Name</Label>
            <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="e.g. Standard 2-Lane Culvert" className="rounded-xl h-12" />
          </div>
          <DialogFooter><Button onClick={handleSaveTemplate} className="rounded-xl h-12 font-black uppercase tracking-widest">Commit Template</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConstructionModule;

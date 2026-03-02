import React, { useState, useMemo, useEffect } from 'react';
import { 
    Plus, ArrowLeft, HardHat, History, CheckCircle2,
    FlaskConical, FileText, Microscope, MapPin, Save, Trash2, Edit,
    Link as LinkIcon, Download, Minimize2, Maximize2, X, AlertTriangle, Printer
} from 'lucide-react';
import { getAutofillSuggestions, checkForDuplicates } from '../../utils/data/autofillUtils';
import { 
    Project, StructureAsset, StructureType, UserRole, 
    StructureComponent, StructureWorkLog, LabTest, BOQItem, Subcontractor,
    StructureTemplate
} from '../../types';
import { generateUniqueId } from '../../utils/uuidUtils';
import { toast } from 'sonner';

import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Badge } from '~/components/ui/badge';
import { Progress } from '~/components/ui/progress';
import { Separator } from '~/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { cn } from '~/lib/utils';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';


// NOTE: This is a refactored version of the ConstructionModule component.
// The original logic has been temporarily removed to facilitate the UI migration.
// It will be re-implemented in subsequent steps.

const STRUCTURE_TYPES: StructureType[] = [
    'Pipe Culvert', 'Box Culvert', 'Slab Culvert', 'Minor Bridge', 'Major Bridge', 
    'Drainage (Lined)', 'Drainage (Unlined)', 'Retaining Wall', 'Breast Wall',
    'Pavement (Flexible)', 'Pavement (Rigid)', 'Footpath',
    'Utility Duct', 'Street Light Base', 'Road Signal', 'Junction Box', 
    'Median Barrier', 'Pedestrian Guardrail', 'Bus Shelter'
];

interface Props {
  project: Project;
  userRole: UserRole;
  onProjectUpdate: (project: Project) => void;
}

const ConstructionModule: React.FC<Props> = ({ project, onProjectUpdate, userRole }) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'CREATE' | 'DETAIL' | 'EDIT'>('LIST');
  const [detailStructureId, setDetailStructureId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState("progress"); // Default to progress tab
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
  
  // Placeholder data
  const structures: StructureAsset[] = project.structures || [];
  const selectedStructure = structures.find(s => s.id === detailStructureId);

  const linkedTests = useMemo(() => {
    return selectedStructure ? project.labTests?.filter(t => t.assetId === selectedStructure.id) || [] : [];
  }, [project.labTests, selectedStructure]);

  const calculateOverallProgress = (structure: StructureAsset) => {
    if (!structure.components || !structure.components.length) return 0;
    const totalDone = structure.components.reduce((acc, c) => acc + c.completedQuantity, 0);
    const totalTarget = structure.components.reduce((acc, c) => acc + c.totalQuantity, 0);
    return totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0;
  };
  
  const structureTemplates: StructureTemplate[] = project.structureTemplates || [];
  
  const handleSaveTemplate = () => {
    if (!templateName) return;
    const template: StructureTemplate = {
      id: generateUniqueId(),
      name: templateName,
      description: templateDescription,
      type: newStructure.type as StructureType,
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
    setTemplateDescription('');
    toast.success("Template Saved", { description: "Structure configuration has been saved as a template." });
  };

  const handleCreateFromTemplate = (template: StructureTemplate) => {
    setNewStructure({
      name: `New ${template.name}`,
      type: template.type,
      location: '',
      status: 'Not Started',
      components: template.components.map(c => ({ ...c, id: generateUniqueId() })),
      subcontractorId: '',
      chainage: ''
    });
    setViewMode('CREATE');
    setIsTemplateListOpen(false);
  };

  const handleDeleteTemplate = (templateId: string) => {
    onProjectUpdate({
      ...project,
      structureTemplates: (project.structureTemplates || []).filter(t => t.id !== templateId)
    });
    toast.success("Template Deleted");
  };

  const handleOpenLogWork = (comp: StructureComponent) => {
    setCurrentLogComponent(comp);
    setLogForm({
      date: new Date().toISOString().split('T')[0],
      quantity: 0,
      rate: 0,
      remarks: '',
      boqItemId: comp.boqItemId || '',
      subcontractorId: selectedStructure?.subcontractorId || '',
      rfiId: '',
      labTestId: ''
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
      toast.error("Required Fields Missing", { description: "Please provide a name and classification." });
      return;
    }
    const structure: StructureAsset = {
      ...(newStructure as StructureAsset),
      id: generateUniqueId(),
      components: newStructure.components || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    onProjectUpdate({
      ...project,
      structures: [...(project.structures || []), structure]
    });
    setViewMode('LIST');
    setNewStructure({ name: '', type: 'Box Culvert', components: [], status: 'Not Started' });
    toast.success("Asset Registered", { description: "New structural asset has been added to the registry." });
  };

  const handleUpdateStructure = () => {
    if (!editingStructure) return;
    const updatedStructures = (project.structures || []).map(s => 
      s.id === editingStructure.id ? { ...s, ...newStructure, updatedAt: new Date().toISOString() } : s
    );
    onProjectUpdate({ ...project, structures: updatedStructures as StructureAsset[] });
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
      toast.error("Invalid Quantity", { description: "Please enter a positive quantity." });
      return;
    }

    const newLog = {
      ...logForm,
      id: generateUniqueId(),
      timestamp: Date.now()
    };

    const updatedComponents = selectedStructure.components.map(comp => {
      if (comp.id === currentLogComponent.id) {
        const newCompletedQty = comp.completedQuantity + logForm.quantity;
        return {
          ...comp,
          completedQuantity: newCompletedQty,
          workLogs: [...(comp.workLogs || []), newLog]
        };
      }
      return comp;
    });

    const updatedStructures = project.structures?.map(s => 
      s.id === selectedStructure.id ? { 
        ...s, 
        components: updatedComponents, 
        status: s.status === 'Not Started' ? 'In Progress' : s.status,
        updatedAt: new Date().toISOString() 
      } : s
    );

    onProjectUpdate({ ...project, structures: updatedStructures });
    setIsLogWorkOpen(false);
    toast.success("Work Logged", { description: "Physical progress has been updated." });
  };

  const handleCertifyStructure = () => {
    if (!selectedStructure) return;

    if (window.confirm(`Are you sure you want to certify 100% completion for ${selectedStructure.name}?`)) {
      const updatedComponents = selectedStructure.components.map(comp => ({
        ...comp,
        completedQuantity: comp.totalQuantity,
        verifiedQuantity: comp.totalQuantity
      }));

      const updatedStructures = project.structures?.map(s => 
        s.id === selectedStructure.id ? { 
          ...s, 
          components: updatedComponents, 
          status: 'Completed' as const,
          completionDate: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString() 
        } : s
      );

      onProjectUpdate({ ...project, structures: updatedStructures });
      toast.success("Structure Certified", { description: "Marked as 100% complete." });
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
                        <h2 className="text-xl font-bold">{viewMode === 'EDIT' ? 'Edit Structural Asset' : 'Define New Structural Asset'}</h2>
                        <p className="text-sm text-muted-foreground">Master alignment inventory management</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsTemplateModalOpen(true)}>
                        <Save className="mr-2 h-4 w-4" /> Save as Template
                    </Button>
                    <Button onClick={viewMode === 'EDIT' ? handleUpdateStructure : handleCreateStructure}>
                        <CheckCircle2 className="mr-2 h-4 w-4" /> {viewMode === 'EDIT' ? 'Update Asset' : 'Commit to Registry'}
                    </Button>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-1 h-fit">
                      <CardHeader>
                          <CardTitle>General Definition</CardTitle>
                          <CardDescription>Basic information about the structure.</CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-4">
                          <div className="grid gap-2">
                              <Label htmlFor="name">Asset Name</Label>
                              <Input id="name" value={newStructure.name || ''} onChange={e => setNewStructure({...newStructure, name: e.target.value})} placeholder="e.g. 2x2 Box Culvert" required />
                          </div>
                          <div className="grid gap-2">
                              <Label htmlFor="type">Structure Classification</Label>
                              <Select value={newStructure.type} onValueChange={(value: StructureType) => setNewStructure({...newStructure, type: value})}>
                                  <SelectTrigger>
                                      <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                      {STRUCTURE_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                  </SelectContent>
                              </Select>
                          </div>
                          <div className="grid gap-2">
                              <Label htmlFor="location">Location (Chainage)</Label>
                              <Input id="location" value={newStructure.location || ''} onChange={e => setNewStructure({...newStructure, location: e.target.value, chainage: e.target.value})} placeholder="e.g. 12+500" />
                          </div>
                          <div className="grid gap-2">
                              <Label htmlFor="subcontractor">Assigned Agency (Subcontractor)</Label>
                              <Select value={newStructure.subcontractorId || 'none'} onValueChange={(value: string) => setNewStructure({...newStructure, subcontractorId: value === 'none' ? '' : value})}>
                                  <SelectTrigger>
                                      <SelectValue placeholder="Select subcontractor" />
                                  </SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="none">Internal Execution</SelectItem>
                                      {project.agencies?.filter(a => a.type === 'subcontractor' || a.type === 'agency').map(agency => (
                                          <SelectItem key={agency.id} value={agency.id}>{agency.name} ({agency.trade})</SelectItem>
                                      ))}
                                  </SelectContent>
                              </Select>
                          </div>
                      </CardContent>
                  </Card>

                  <Card className="lg:col-span-2">
                      <CardHeader className="flex flex-row justify-between items-center">
                          <CardTitle>Schedule of Components</CardTitle>
                          <Button size="sm" onClick={handleAddComponent}>
                              <Plus className="mr-2 h-4 w-4" /> Add Component
                          </Button>
                      </CardHeader>
                      <CardContent>
                          <div className="grid gap-4">
                              {newStructure.components?.map((comp, idx) => (
                                  <div key={comp.id || idx} className="border rounded-lg p-4 relative">
                                      <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => handleRemoveComponent(idx)}>
                                          <X className="h-4 w-4" />
                                      </Button>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                          <div className="grid gap-2">
                                              <Label>Component Name</Label>
                                              <Input value={comp.name || ''} onChange={e => handleUpdateComponent(idx, 'name', e.target.value)} placeholder="e.g. Reinforcement" />
                                          </div>
                                          <div className="grid gap-2">
                                              <Label>Unit</Label>
                                              <Input value={comp.unit || ''} onChange={e => handleUpdateComponent(idx, 'unit', e.target.value)} />
                                          </div>
                                          <div className="grid gap-2">
                                              <Label>Total Quantity</Label>
                                              <Input type="number" value={comp.totalQuantity || 0} onChange={e => handleUpdateComponent(idx, 'totalQuantity', Number(e.target.value))} />
                                          </div>
                                          <div className="grid gap-2">
                                              <Label>Executed Quantity</Label>
                                              <Input type="number" value={comp.completedQuantity || 0} onChange={e => handleUpdateComponent(idx, 'completedQuantity', Number(e.target.value))} />
                                          </div>
                                          <div className="grid gap-2">
                                              <Label>Verified Quantity</Label>
                                              <Input type="number" value={comp.verifiedQuantity || 0} onChange={e => handleUpdateComponent(idx, 'verifiedQuantity', Number(e.target.value))} />
                                          </div>
                                          <div className="grid gap-2">
                                              <Label>BOQ Item Mapping</Label>
                                              <Select value={comp.boqItemId || 'none'} onValueChange={(value: string) => handleUpdateComponent(idx, 'boqItemId', value === 'none' ? '' : value)}>
                                                  <SelectTrigger>
                                                      <SelectValue placeholder="Select BOQ Item" />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                      <SelectItem value="none">Unlinked</SelectItem>
                                                      {project.boq.map(item => (
                                                          <SelectItem key={item.id} value={item.id}>[{item.itemNo}] {item.description.substring(0, 30)}...</SelectItem>
                                                      ))}
                                                  </SelectContent>
                                              </Select>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                              {newStructure.components?.length === 0 && (
                                  <Alert className="text-center">
                                      <AlertTitle>No Components</AlertTitle>
                                      <AlertDescription>Add components to track physical progress for this structure.</AlertDescription>
                                  </Alert>
                              )}
                          </div>
                      </CardContent>
                  </Card>
              </div>
          </div>
      );
  }

  if (viewMode === 'DETAIL' && selectedStructure) {
      const progress = calculateOverallProgress(selectedStructure);
      return (
          <div className="animate-in fade-in duration-500 p-4">
              <div className="flex justify-between mb-6 items-center">
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => setViewMode('LIST')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-xl font-bold">{selectedStructure.name}</h2>
                        <p className="text-sm text-muted-foreground">Ch: {selectedStructure.location}</p>
                        {selectedStructure.completionDate && (
                            <p className="text-sm text-emerald-500">Completed on: {selectedStructure.completionDate}</p>
                        )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setIsMbRecordsOpen(true)}>
                          <History className="mr-2 h-4 w-4" /> MB Records
                      </Button>
                      {selectedStructure.status !== 'Completed' && (
                        <Button onClick={handleCertifyStructure} className="bg-emerald-600 hover:bg-emerald-700">
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Certify Completion
                        </Button>
                      )}
                  </div>
              </div>

              <Tabs value={detailTab} onValueChange={setDetailTab} className="mb-6">
                  <TabsList className="grid w-full grid-cols-2 h-10">
                      <TabsTrigger value="progress">
                          <HardHat className="mr-2 h-4 w-4" /> Execution Progress
                      </TabsTrigger>
                      <TabsTrigger value="quality">
                          <Microscope className="mr-2 h-4 w-4" /> Quality & Tests
                      </TabsTrigger>
                  </TabsList>

                  <TabsContent value="progress" className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                            <CardContent className="p-4">
                                <h3 className="text-sm font-bold text-muted-foreground uppercase mb-2">Physical Completion</h3>
                                <div className="flex items-baseline gap-2">
                                    <h4 className="text-3xl font-bold text-primary">{progress}%</h4>
                                </div>
                                <Progress value={progress} className="h-2 [&::-webkit-progress-bar]:bg-slate-200 [&::-webkit-progress-value]:bg-primary" />
                            </CardContent>
                        </Card>
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle>Component Progress</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {selectedStructure.components.map(comp => (
                                        <div key={comp.id}>
                                            <div className="flex justify-between items-center mb-1">
                                                <p className="font-semibold">{comp.name}</p>
                                                <Badge>{Math.round((comp.completedQuantity / comp.totalQuantity) * 100)}%</Badge>
                                            </div>
                                            <Progress value={Math.round((comp.completedQuantity / comp.totalQuantity) * 100)} className="h-2" />
                                            <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                                                <span>{comp.completedQuantity} / {comp.totalQuantity} {comp.unit}</span>
                                                <Button size="sm" variant="outline" onClick={() => handleOpenLogWork(comp)}>
                                                    <Plus className="mr-1 h-3 w-3" /> Log Work
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                  </TabsContent>
                  <TabsContent value="quality" className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Linked Lab Tests</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {linkedTests.length > 0 ? (
                                    <ScrollArea className="h-48">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Sample ID</TableHead>
                                                    <TableHead>Test Name</TableHead>
                                                    <TableHead>Result</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {linkedTests.map(test => (
                                                    <TableRow key={test.id}>
                                                        <TableCell>{test.sampleId}</TableCell>
                                                        <TableCell>{test.testName}</TableCell>
                                                        <TableCell><Badge variant={test.result === 'Pass' ? 'default' : 'destructive'}>{test.result}</Badge></TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                ) : (
                                    <div className="text-muted-foreground text-center py-4">No linked lab tests.</div>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Linked RFIs</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-muted-foreground text-center py-4">No linked RFIs.</div>
                            </CardContent>
                        </Card>
                    </div>
                  </TabsContent>
              </Tabs>
          </div>
      );
  }

  return (
    <div className="animate-in fade-in duration-500 p-4">
      <div className="flex justify-between mb-6 items-center">
          <div>
              <h1 className="text-2xl font-bold text-foreground">Structural Assets Registry</h1>
              <p className="text-sm text-muted-foreground">Inventory of culverts, bridges, and retaining walls</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsTemplateListOpen(true)}>
                <FileText className="mr-2 h-4 w-4" /> Use Template
            </Button>
            <Button onClick={() => setViewMode('CREATE')}>
                <Plus className="mr-2 h-4 w-4" /> Define New Asset
            </Button>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {structures.map(str => {
              const progress = calculateOverallProgress(str);
              const assignedAgency = project.agencies?.find(a => a.id === str.subcontractorId);
              return (
                  <Card key={str.id} className="relative cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-lg" onClick={() => { setDetailStructureId(str.id); setViewMode('DETAIL'); }}>
                      <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                              <Badge variant="secondary">{str.type}</Badge>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                  <MapPin className="h-3 w-3" /> {str.location}
                              </div>
                          </div>
                          <h3 className="text-lg font-bold mb-1">{str.name}</h3>
                          {assignedAgency && (
                              <p className="text-sm text-primary flex items-center gap-1">
                                  <HardHat className="h-3 w-3" /> {assignedAgency.name}
                              </p>
                          )}
                          <Separator className="my-3" />
                          <div>
                              <div className="flex justify-between mb-1">
                                  <p className="text-sm font-semibold">Physical Progress</p>
                                  <p className="text-sm font-semibold text-primary">{progress}%</p>
                              </div>
                              <Progress value={progress} className="h-2" />
                          </div>
                      </CardContent>
                      {(userRole === UserRole.ADMIN || userRole === UserRole.PROJECT_MANAGER) && (
                        <div className="absolute top-2 right-2 flex gap-1">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditStructure(str); }}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit Structure</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteStructure(str.id); }}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete Structure</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                      )}
                  </Card>
              );
          })}
          {structures.length === 0 && (
            <div className="lg:col-span-3 text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground">
                <HardHat className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No structural assets registered yet. Click "Define New Asset" to get started.</p>
            </div>
          )}
      </div>

      {/* Log Work Modal */}
      <Dialog open={isLogWorkOpen} onOpenChange={setIsLogWorkOpen}>
          <DialogContent className="sm:max-w-md">
              <DialogHeader>
                  <DialogTitle>Log Work for {currentLogComponent?.name}</DialogTitle>
                  <DialogDescription>Record quantities of work executed.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                      <Label htmlFor="quantity">Quantity Done</Label>
                      <Input id="quantity" type="number" value={logForm.quantity} onChange={e => setLogForm({...logForm, quantity: Number(e.target.value)})} placeholder="e.g. 10" />
                  </div>
                  <div className="grid gap-2">
                      <Label htmlFor="date">Date</Label>
                      <Input id="date" type="date" value={logForm.date} onChange={e => setLogForm({...logForm, date: e.target.value})} />
                  </div>
                  <div className="grid gap-2">
                      <Label htmlFor="remarks">Remarks</Label>
                      <Textarea id="remarks" value={logForm.remarks} onChange={e => setLogForm({...logForm, remarks: e.target.value})} placeholder="Any specific notes or issues?" />
                  </div>
                  <div className="grid gap-2">
                      <Label htmlFor="boqItemId">Linked BOQ Item</Label>
                      <Select value={logForm.boqItemId || 'none'} onValueChange={(value: string) => setLogForm({...logForm, boqItemId: value === 'none' ? '' : value})}>
                          <SelectTrigger>
                              <SelectValue placeholder="Select BOQ Item (Optional)" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {project.boq.map(item => (
                                  <SelectItem key={item.id} value={item.id}>[{item.itemNo}] {item.description.substring(0, 30)}...</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="grid gap-2">
                      <Label htmlFor="subcontractorId">Assigned Subcontractor</Label>
                      <Select value={logForm.subcontractorId || 'none'} onValueChange={(value: string) => setLogForm({...logForm, subcontractorId: value === 'none' ? '' : value})}>
                          <SelectTrigger>
                              <SelectValue placeholder="Select Subcontractor (Optional)" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="none">Internal / Not Assigned</SelectItem>
                              {project.agencies?.filter(a => a.type === 'subcontractor' || a.type === 'agency').map(agency => (
                                  <SelectItem key={agency.id} value={agency.id}>{agency.name} ({agency.trade})</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsLogWorkOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveWorkLog} disabled={!logForm.quantity}>Commit Log</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* MB Records Dialog */}
      <Dialog open={isMbRecordsOpen} onOpenChange={setIsMbRecordsOpen}>
          <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                  <DialogTitle>Measurement Book Records: {selectedStructure?.name}</DialogTitle>
                  <DialogDescription>View all work logs for this structural asset.</DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-[400px]">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Component</TableHead>
                              <TableHead>Qty Executed</TableHead>
                              <TableHead>Unit</TableHead>
                              <TableHead>Contractor</TableHead>
                              <TableHead>BOQ Item</TableHead>
                              <TableHead>Remarks</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {selectedStructure?.components.flatMap(comp =>
                              comp.workLogs?.map(log => {
                                  const boqItem = project.boq.find(b => b.id === log.boqItemId);
                                  const subcontractor = project.agencies?.find(s => s.id === log.subcontractorId);
                                  return (
                                      <TableRow key={log.id}>
                                          <TableCell>{log.date}</TableCell>
                                          <TableCell>{comp.name}</TableCell>
                                          <TableCell>{log.quantity}</TableCell>
                                          <TableCell>{comp.unit}</TableCell>
                                          <TableCell>{subcontractor?.name || 'Internal'}</TableCell>
                                          <TableCell>{boqItem ? `[${boqItem.itemNo}] ${boqItem.description.substring(0, 20)}...` : 'N/A'}</TableCell>
                                          <TableCell>{log.remarks}</TableCell>
                                      </TableRow>
                                  );
                              }) || []
                          )}
                          {(!selectedStructure?.components || selectedStructure.components.every(comp => !comp.workLogs || comp.workLogs.length === 0)) && (
                              <TableRow>
                                  <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                                      <History className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                      No Measurement Records
                                  </TableCell>
                              </TableRow>
                          )}
                      </TableBody>
                  </Table>
              </ScrollArea>
              <DialogFooter>
                  <Button onClick={() => setIsMbRecordsOpen(false)}>Close</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Template List Modal */}
      <Dialog open={isTemplateListOpen} onOpenChange={setIsTemplateListOpen}>
          <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                  <DialogTitle>Structural Asset Templates</DialogTitle>
                  <DialogDescription>Browse and select existing templates to quickly create new structures.</DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-[400px]">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Template Name</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Components</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {structureTemplates.length > 0 ? structureTemplates.map(template => (
                              <TableRow key={template.id}>
                                  <TableCell className="font-semibold">{template.name}</TableCell>
                                  <TableCell>{template.type}</TableCell>
                                  <TableCell>{template.components.length} components</TableCell>
                                  <TableCell className="text-right">
                                      <Button variant="outline" size="sm" onClick={() => handleCreateFromTemplate(template)}>
                                          Use
                                      </Button>
                                      {(userRole === UserRole.ADMIN || userRole === UserRole.PROJECT_MANAGER) && (
                                        <Button variant="ghost" size="sm" onClick={() => handleDeleteTemplate(template.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      )}
                                  </TableCell>
                              </TableRow>
                          )) : (
                              <TableRow>
                                  <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                                      <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                      No templates saved yet.
                                  </TableCell>
                              </TableRow>
                          )}
                      </TableBody>
                  </Table>
              </ScrollArea>
              <DialogFooter>
                  <Button onClick={() => setIsTemplateListOpen(false)}>Close</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      
      {/* Save Template Modal */}
      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Structure as Template</DialogTitle>
            <DialogDescription>Give your template a name and description.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="templateName">Template Name</Label>
              <Input id="templateName" value={templateName} onChange={e => setTemplateName(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="templateDescription">Description (Optional)</Label>
              <Textarea id="templateDescription" value={templateDescription} onChange={e => setTemplateDescription(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTemplate} disabled={!templateName}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConstructionModule;

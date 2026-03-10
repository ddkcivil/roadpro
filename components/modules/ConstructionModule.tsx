import React, { useState, useMemo, useTransition } from 'react';
import { 
    Plus, ArrowLeft, HardHat, History, CheckCircle2,
    MapPin, X, Save, Microscope, FileText
} from 'lucide-react';
import { 
    Project, StructureAsset, StructureType, 
    StructureComponent, StructureTemplate
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
    subcontractorId: ''
  });
  const [isMbRecordsOpen, setIsMbRecordsOpen] = useState(false);
  
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isTemplateListOpen, setIsTemplateListOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  
  const structures: StructureAsset[] = project.structures || [];
  const selectedStructure = structures.find(s => s.id === detailStructureId);
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
      subcontractorId: selectedStructure?.subcontractorId || ''
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
      lastUpdated: new Date().toISOString()
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

    const newLog = {
      ...logForm,
      id: generateUniqueId(),
      timestamp: Date.now()
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
    toast.success("Work Logged");
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
                        <h2 className="text-xl font-bold">{viewMode === 'EDIT' ? 'Edit Structural Asset' : 'Define New Structural Asset'}</h2>
                        <p className="text-sm text-muted-foreground">Inventory management</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsTemplateModalOpen(true)}>
                        <Save className="mr-2 h-4 w-4" /> Save as Template
                    </Button>
                    <Button onClick={viewMode === 'EDIT' ? handleUpdateStructure : handleCreateStructure}>
                        <CheckCircle2 className="mr-2 h-4 w-4" /> {viewMode === 'EDIT' ? 'Update Asset' : 'Commit Registry'}
                    </Button>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-1 h-fit">
                      <CardHeader>
                          <CardTitle>General Info</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-4">
                          <div className="grid gap-2">
                              <Label htmlFor="name">Asset Name</Label>
                              <Input id="name" value={newStructure.name || ''} onChange={e => setNewStructure({...newStructure, name: e.target.value})} placeholder="e.g. 2x2 Box Culvert" />
                          </div>
                          <div className="grid gap-2">
                              <Label htmlFor="type">Classification</Label>
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
                              <Label htmlFor="location">Chainage</Label>
                              <Input id="location" value={newStructure.location || ''} onChange={e => setNewStructure({...newStructure, location: e.target.value, chainage: e.target.value})} placeholder="e.g. 12+500" />
                          </div>
                          <div className="grid gap-2">
                              <Label htmlFor="subcontractor">Agency</Label>
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
                          <CardTitle>Components</CardTitle>
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
                                              <Label>Name</Label>
                                              <Input value={comp.name || ''} onChange={e => handleUpdateComponent(idx, 'name', e.target.value)} />
                                          </div>
                                          <div className="grid gap-2">
                                              <Label>Unit</Label>
                                              <Input value={comp.unit || ''} onChange={e => handleUpdateComponent(idx, 'unit', e.target.value)} />
                                          </div>
                                          <div className="grid gap-2">
                                              <Label>Total Qty</Label>
                                              <Input type="number" value={comp.totalQuantity || 0} onChange={e => handleUpdateComponent(idx, 'totalQuantity', Number(e.target.value))} />
                                          </div>
                                          <div className="grid gap-2">
                                              <Label>BOQ Mapping</Label>
                                              <Select value={comp.boqItemId || 'none'} onValueChange={(value: string) => handleUpdateComponent(idx, 'boqItemId', value === 'none' ? '' : value)}>
                                                  <SelectTrigger>
                                                      <SelectValue placeholder="Select..." />
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
                        <h2 className="text-xl font-bold">{selectedStructure.name}</h2>
                        <p className="text-sm text-muted-foreground">Ch: {selectedStructure.location}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setIsMbRecordsOpen(true)}>
                          <History className="mr-2 h-4 w-4" /> MB Records
                      </Button>
                      {selectedStructure.status !== 'Completed' && (
                        <Button onClick={handleCertifyStructure} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Certify Completion
                        </Button>
                      )}
                  </div>
              </div>

              <Tabs value={detailTab} onValueChange={setDetailTab} className="mb-6">
                  <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="progress"><HardHat className="mr-2 h-4 w-4" /> Progress</TabsTrigger>
                      <TabsTrigger value="quality"><Microscope className="mr-2 h-4 w-4" /> Quality</TabsTrigger>
                  </TabsList>

                  <TabsContent value="progress" className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                            <CardContent className="p-4">
                                <h3 className="text-sm font-bold text-muted-foreground uppercase mb-2">Completion</h3>
                                <h4 className="text-3xl font-bold text-primary mb-2">{overallProgress}%</h4>
                                <Progress value={overallProgress} className="h-2" />
                            </CardContent>
                        </Card>
                        <Card className="md:col-span-2">
                            <CardHeader><CardTitle>Components</CardTitle></CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {selectedStructure.components.map(comp => (
                                        <div key={comp.id}>
                                            <div className="flex justify-between items-center mb-1 text-sm font-semibold">
                                                <p>{comp.name}</p>
                                                <p>{Math.round(((comp.completedQuantity || 0) / (comp.totalQuantity || 1)) * 100)}%</p>
                                            </div>
                                            <Progress value={Math.round(((comp.completedQuantity || 0) / (comp.totalQuantity || 1)) * 100)} className="h-2 mb-1" />
                                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                                                <span>{comp.completedQuantity} / {comp.totalQuantity} {comp.unit}</span>
                                                <Button size="sm" variant="outline" onClick={() => handleOpenLogWork(comp)}>Log Work</Button>
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
                            <CardHeader><CardTitle>Lab Tests</CardTitle></CardHeader>
                            <CardContent>
                                {linkedTests.length > 0 ? (
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Test</TableHead><TableHead>Result</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {linkedTests.map(test => (
                                                <TableRow key={test.id}><TableCell>{test.testName}</TableCell><TableCell><Badge>{test.result}</Badge></TableCell></TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : <p className="text-center text-muted-foreground py-4">No records.</p>}
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
              <h1 className="text-2xl font-bold">Structural Assets</h1>
              <p className="text-sm text-muted-foreground">Culverts, bridges, and walls</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsTemplateListOpen(true)}>
                <FileText className="mr-2 h-4 w-4" /> Templates
            </Button>
            <Button onClick={() => setViewMode('CREATE')}>
                <Plus className="mr-2 h-4 w-4" /> New Asset
            </Button>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {structures.map(str => {
              const prog = calculateOverallProgress(str);
              return (
                  <Card key={str.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => { setDetailStructureId(str.id); setViewMode('DETAIL'); }}>
                      <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                              <Badge variant="secondary">{str.type}</Badge>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={12}/> {str.location}</div>
                          </div>
                          <h3 className="text-lg font-bold mb-3">{str.name}</h3>
                          <Progress value={prog} className="h-2 mb-1" />
                          <p className="text-xs text-right font-bold text-primary">{prog}%</p>
                      </CardContent>
                  </Card>
              );
          })}
      </div>

      {/* Modals */}
      <Dialog open={isLogWorkOpen} onOpenChange={setIsLogWorkOpen}>
          <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Log Work: {currentLogComponent?.name}</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="grid gap-2"><Label>Qty Done</Label><Input type="number" value={logForm.quantity} onChange={e => setLogForm({...logForm, quantity: Number(e.target.value)})} /></div>
                  <div className="grid gap-2"><Label>Date</Label><Input type="date" value={logForm.date} onChange={e => setLogForm({...logForm, date: e.target.value})} /></div>
                  <div className="grid gap-2"><Label>Remarks</Label><Textarea value={logForm.remarks} onChange={e => setLogForm({...logForm, remarks: e.target.value})} /></div>
              </div>
              <DialogFooter><Button onClick={handleSaveWorkLog}>Commit</Button></DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={isMbRecordsOpen} onOpenChange={setIsMbRecordsOpen}>
          <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>MB Records: {selectedStructure?.name}</DialogTitle></DialogHeader>
              <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Component</TableHead><TableHead>Qty</TableHead></TableRow></TableHeader>
                  <TableBody>
                      {selectedStructure?.components.flatMap(comp => comp.workLogs?.map(log => (
                          <TableRow key={log.id}><TableCell>{log.date}</TableCell><TableCell>{comp.name}</TableCell><TableCell>{log.quantity} {comp.unit}</TableCell></TableRow>
                      )) || [])}
                  </TableBody>
              </Table>
              <DialogFooter><Button onClick={() => setIsMbRecordsOpen(false)}>Close</Button></DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={isTemplateListOpen} onOpenChange={setIsTemplateListOpen}>
          <DialogContent className="max-w-xl">
              <DialogHeader><DialogTitle>Templates</DialogTitle></DialogHeader>
              <Table>
                  <TableBody>
                      {structureTemplates.map(t => (
                          <TableRow key={t.id}>
                              <TableCell className="font-bold">{t.name}</TableCell>
                              <TableCell>{t.type}</TableCell>
                              <TableCell className="text-right"><Button size="sm" onClick={() => handleCreateFromTemplate(t)}>Use</Button></TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
          </DialogContent>
      </Dialog>

      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Save as Template</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <Label>Template Name</Label>
            <Input value={templateName} onChange={e => setTemplateName(e.target.value)} />
          </div>
          <DialogFooter><Button onClick={handleSaveTemplate}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConstructionModule;

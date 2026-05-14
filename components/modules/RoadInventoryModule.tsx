import React, { useState } from 'react';
import { Project, Road, Alignment, Structure } from '../../types';
import { 
    Plus, Trash2, Map as MapIcon, Layers, 
    Upload, FileJson, Info, Ruler, 
    ChevronRight, ChevronDown, CheckCircle2,
    Database, Activity, Search, Filter,
    Eye, MoreVertical, LayoutList,
    Box, Construction, Waypoints, Milestone, Edit
} from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Badge } from '~/components/ui/badge';
import { ScrollArea } from '~/components/ui/scroll-area';
import { 
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { apiService } from '../../services/api/apiService';
import MapModule from './MapModule'; // Import MapModule

interface Props {
  project: Project;
  onProjectUpdate: (project: Project) => void;
}

// Linear Progress View for Road Layers
const LinearProgressView: React.FC<{ road: Road }> = ({ road }) => {
  const layers = road.alignments.filter(a => 
    ['pavement', 'subgrade', 'sub-base', 'base', 'asphalt'].includes(a.type.toLowerCase())
  );
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">Cross-Layer Progress Heatmap</h3>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
             <div className="h-2 w-2 rounded-full bg-emerald-500" />
             <span className="text-[8px] font-bold uppercase opacity-60 tracking-tighter">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
             <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
             <span className="text-[8px] font-bold uppercase opacity-60 tracking-tighter">In Progress</span>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        {layers.length > 0 ? layers.map(layer => (
          <div key={layer.id} className="relative group">
            <div className="flex justify-between items-center mb-1 px-1">
               <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-primary transition-colors">{layer.name}</span>
               <span className="text-[9px] font-black text-slate-400">{layer.progress || 0}%</span>
            </div>
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 relative">
               <div 
                 className={`h-full transition-all duration-1000 ${
                   layer.status === 'Completed' ? 'bg-emerald-500' : 'bg-amber-500'
                 }`}
                 style={{ width: `${layer.progress || 0}%` }}
               />
               <div className="absolute inset-0 flex justify-between items-center px-4 pointer-events-none opacity-20">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-full w-px bg-slate-300" />
                  ))}
               </div>
            </div>
          </div>
        )) : (
          <div className="p-12 text-center border-2 border-dashed rounded-[2rem] opacity-30">
            <Layers className="mx-auto mb-2" />
            <p className="text-[10px] font-black uppercase">No pavement layers identified in telemetry</p>
          </div>
        )}
      </div>
    </div>
  );
};

const RoadInventoryModule: React.FC<Props> = ({ project, onProjectUpdate }) => {
  const [activeTab, setActiveTab] = useState('roads');
  const [selectedRoadId, setSelectedRoadId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [kmlContent, setKmlContent] = useState('');
  const [newRoadName, setNewRoadName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMapModalOpen, setIsMapModalOpen] = useState(false); // State for map modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editRoadData, setEditRoadData] = useState<Partial<Road>>({});

  const [selectedKmlId, setSelectedKmlId] = useState<string>('manual');

  const roads = project.roads || [];
  const projectKmls = project.kmlData || [];
  const selectedRoad = roads.find(r => r.id === selectedRoadId);

  const openEditModal = (road: Road) => {
    setEditRoadData({
      name: road.name,
      category: road.category || 'National Highway',
      surfaceType: road.surfaceType || 'Asphalt',
      lanes: road.lanes || 2,
      chainageOffset: road.chainageOffset || 0,
      description: road.description || ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateRoadDetails = () => {
    if (!selectedRoadId || !editRoadData.name) return;
    
    const updatedRoads = roads.map(r => 
      r.id === selectedRoadId 
        ? { ...r, ...editRoadData } 
        : r
    );
    
    onProjectUpdate({
      ...project,
      roads: updatedRoads
    });
    
    setIsEditModalOpen(false);
    toast.success("Road details updated successfully");
  };

  const handleImportKml = async () => {
    let contentToProcess = kmlContent;
    let nameToUse = newRoadName;

    if (selectedKmlId !== 'manual') {
      const existingKml = projectKmls.find(k => k.id === selectedKmlId);
      if (existingKml) {
        contentToProcess = existingKml.kmlContent;
        if (!nameToUse) nameToUse = existingKml.name.replace('.kml', '');
      }
    }

    if (!contentToProcess || !nameToUse) {
      toast.error("Please provide KML content and a road name.");
      return;
    }

    setIsProcessing(true);
    
    try {
      const result = await apiService.ingestRoadKml(project.id, nameToUse, contentToProcess);
      
if (result.success && result.road) {
         // Create KML data entry for map display
         const newKmlData = {
           id: `kml-${result.road.id}`,
           name: `${nameToUse}.kml`,
           kmlContent: contentToProcess,
           timestamp: Date.now(),
           visible: true,
           color: '#4f46e5'
         };
         
         onProjectUpdate({
           ...project,
           roads: [...roads, result.road],
           kmlData: [...(projectKmls || []), newKmlData]
         });
         toast.success(`Successfully ingested telemetry for: ${nameToUse}`);
         setIsImportModalOpen(false);
         setKmlContent('');
         setNewRoadName('');
         setSelectedKmlId('manual');
      } else {
        toast.error("Telemetry extraction failed. Check KML format.");
      }
    } catch (error: any) {
      console.error("Ingestion error:", error);
      toast.error(error.message || "An error occurred during backend ingestion.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteRoad = (id: string) => {
    if (confirm("Are you sure you want to delete this road and all its associated alignments and structures?")) {
       onProjectUpdate({
         ...project,
         roads: roads.filter(r => r.id !== id)
       });
       if (selectedRoadId === id) setSelectedRoadId(null);
       toast.info("Road removed from inventory.");
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic">Road Inventory</h1>
          <p className="text-muted-foreground font-medium">Manage project road alignments, structures, and chainage data</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl font-bold" onClick={() => setIsImportModalOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Import KML
          </Button>
          <Button className="rounded-xl font-bold">
            <Plus className="mr-2 h-4 w-4" /> Manual Entry
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar: Roads List */}
        <Card className="lg:col-span-4 rounded-[2rem] glass border-none shadow-xl overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center mb-2">
              <CardTitle className="text-sm font-black uppercase tracking-widest opacity-70">Project Roads</CardTitle>
              <Badge variant="outline" className="rounded-md font-mono">{roads.length}</Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 opacity-40" />
              <Input 
                placeholder="Search roads..." 
                className="pl-9 bg-muted/40 border-none rounded-xl h-9 text-xs"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-2">
            <ScrollArea className="h-[500px] px-2">
              <div className="space-y-1">
                {roads.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase())).map(road => (
                  <button
                    key={road.id}
                    onClick={() => setSelectedRoadId(road.id)}
                    className={`w-full text-left p-3 rounded-2xl transition-all duration-300 flex items-center justify-between group ${
                      selectedRoadId === road.id 
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]' 
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${selectedRoadId === road.id ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                        <MapIcon size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-sm leading-tight">{road.name}</p>
                        <p className={`text-[10px] uppercase tracking-wider font-black opacity-60`}>
                          {road.alignments.length} Alignments • {road.structures.length} Structures
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={16} className={`opacity-40 group-hover:opacity-100 transition-opacity ${selectedRoadId === road.id ? 'opacity-100' : ''}`} />
                  </button>
                ))}
                {roads.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-40">
                    <Database size={40} className="mb-4" />
                    <p className="text-xs font-black uppercase tracking-tighter">No roads found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Main Content: Road Details */}
        <div className="lg:col-span-8">
          {selectedRoad ? (
            <div className="space-y-6">
              <Card className="rounded-[2rem] glass border-none shadow-xl overflow-hidden animate-in slide-in-from-right-4 duration-500">
                <CardHeader className="pb-4 border-b border-border/40 bg-muted/20">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-primary/20 text-primary border-none rounded-md text-[9px] font-black uppercase tracking-tighter">ROAD_ENTITY</Badge>
                        <span className="text-[10px] font-mono opacity-50">{selectedRoad.id}</span>
                      </div>
                      <CardTitle className="text-3xl font-black tracking-tighter uppercase italic">{selectedRoad.name}</CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1.5 font-bold text-xs"><Ruler size={14} className="text-primary" /> Start: 0+000</span>
                        <span className="flex items-center gap-1.5 font-bold text-xs"><Activity size={14} className="text-primary" /> Offset: {selectedRoad.chainageOffset}m</span>
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10 transition-colors"><MoreVertical size={20} /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-2xl border-none glass shadow-2xl p-2 w-48">
                        <DropdownMenuItem className="rounded-xl font-bold text-xs py-2.5 cursor-pointer" onClick={() => openEditModal(selectedRoad)}>
                          <Edit className="mr-2 h-4 w-4 text-primary" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-xl font-bold text-xs py-2.5 cursor-pointer text-destructive hover:bg-destructive/10" onClick={() => handleDeleteRoad(selectedRoad.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Road
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-4 bg-muted/10 border-b border-border/40">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</p>
                      <p className="text-xs font-black text-slate-700 italic">{selectedRoad.category || 'National Highway'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Surface</p>
                      <p className="text-xs font-black text-slate-700 italic">{selectedRoad.surfaceType || 'Asphalt'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Lanes</p>
                      <p className="text-xs font-black text-slate-700 italic">{selectedRoad.lanes || 2} Lanes</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Chainage Offset</p>
                      <p className="text-xs font-black text-slate-700 italic">{selectedRoad.chainageOffset}m</p>
                    </div>
                  </div>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <div className="px-6 pt-4">
                      <TabsList className="bg-muted/40 p-1 rounded-2xl border border-border/20">
                        <TabsTrigger value="roads" className="rounded-xl font-bold text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                          <LayoutList className="mr-2 h-3.5 w-3.5" /> Overview
                        </TabsTrigger>
                        <TabsTrigger value="alignments" className="rounded-xl font-bold text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                          <Layers className="mr-2 h-3.5 w-3.5" /> Alignments ({selectedRoad.alignments.length})
                        </TabsTrigger>
                        <TabsTrigger value="structures" className="rounded-xl font-bold text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                          <Box className="mr-2 h-3.5 w-3.5" /> Structures ({selectedRoad.structures.length})
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="roads" className="p-6 focus-visible:outline-none animate-in fade-in duration-300">
                      <div className="space-y-6">
                        {/* Heatmap Section */}
                        <LinearProgressView road={selectedRoad} />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-primary/5 p-6 rounded-[1.5rem] border border-primary/10 space-y-4 shadow-sm">
                            <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                              <Waypoints size={14} /> Spatial Intelligence
                            </h3>
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                                <MapIcon size={24} />
                              </div>
                              <div>
                                <p className="text-2xl font-black tracking-tighter">{selectedRoad.geometry.length}</p>
                                <p className="text-[10px] font-bold uppercase opacity-60">Geometry Vertices</p>
                              </div>
                            </div>
                            <div className="pt-4 border-t border-primary/10">
                               <Button size="sm" className="w-full rounded-xl font-bold bg-primary hover:bg-primary/90" onClick={() => setIsMapModalOpen(true)}>
                                 View GIS Live Feed
                               </Button>
                            </div>
                          </div>

                          <div className="bg-emerald-500/5 p-6 rounded-[1.5rem] border border-emerald-500/10 space-y-4 shadow-sm">
                            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                              <CheckCircle2 size={14} /> Global Status
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xl font-black tracking-tighter text-emerald-700">{selectedRoad.alignments.length}</p>
                                <p className="text-[10px] font-bold uppercase opacity-60">Linear layers</p>
                              </div>
                              <div>
                                <p className="text-xl font-black tracking-tighter text-emerald-700">{selectedRoad.structures.length}</p>
                                <p className="text-[10px] font-bold uppercase opacity-60">Asset markers</p>
                              </div>
                            </div>
                            <div className="pt-4 border-t border-emerald-500/10">
                               <Button size="sm" variant="outline" className="w-full rounded-xl font-bold border-emerald-500/20 text-emerald-700 hover:bg-emerald-500/10">Inventory Report</Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="alignments" className="p-0 focus-visible:outline-none animate-in fade-in duration-300">
                      <div className="border-t border-border/40">
                        {selectedRoad.alignments.length > 0 ? (
                          <div className="divide-y divide-border/40">
                            {selectedRoad.alignments.map(alignment => (
                              <div key={alignment.id} className="p-6 hover:bg-muted/30 transition-colors flex justify-between items-center group">
                                <div className="flex items-center gap-4 flex-1">
                                  <div className="h-10 w-10 rounded-xl bg-muted border flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-sm">
                                    <Layers size={20} />
                                  </div>
                                  <div className="flex-1 min-w-0 pr-8">
                                    <div className="flex items-center gap-3 mb-1">
                                      <h4 className="font-black text-sm uppercase tracking-tight truncate">{alignment.name}</h4>
                                      <Badge variant={alignment.status === 'Completed' ? 'default' : 'outline'} className={`text-[8px] px-1.5 py-0 rounded-md font-black uppercase ${alignment.status === 'Completed' ? 'bg-emerald-500' : ''}`}>
                                        {alignment.status || 'Planned'}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-[10px] font-medium opacity-60 flex items-center gap-1">
                                        <Ruler size={10} /> {alignment.totalLength.toFixed(1)}m
                                      </span>
                                      <div className="flex-1 max-w-[150px] h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                        <div 
                                          className={`h-full transition-all duration-500 ${alignment.status === 'Completed' ? 'bg-emerald-500' : 'bg-primary'}`}
                                          style={{ width: `${alignment.progress || 0}%` }}
                                        />
                                      </div>
                                      <span className="text-[10px] font-black opacity-40">{alignment.progress || 0}%</span>
                                    </div>
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm" className="rounded-lg opacity-0 group-hover:opacity-100">
                                   <Eye size={16} className="mr-2" /> Details
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-20 text-center opacity-40">
                            <Layers size={40} className="mx-auto mb-4" />
                            <p className="text-xs font-black uppercase tracking-tighter">No telemetry lines parsed</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="structures" className="p-0 focus-visible:outline-none animate-in fade-in duration-300">
                      <div className="border-t border-border/40">
                        {selectedRoad.structures.length > 0 ? (
                          <div className="divide-y divide-border/40">
                            {selectedRoad.structures.map(structure => (
                              <div key={structure.id} className="p-6 hover:bg-muted/30 transition-colors flex justify-between items-center group">
                                <div className="flex items-center gap-4">
                                  <div className="h-10 w-10 rounded-xl bg-muted border flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-sm">
                                    {structure.type.toLowerCase().includes('bridge') ? <Waypoints size={20} /> : <Milestone size={20} />}
                                  </div>
                                  <div>
                                    <h4 className="font-black text-sm uppercase tracking-tight">{structure.name}</h4>
                                    <div className="flex items-center gap-3 mt-1">
                                      <Badge className="bg-indigo-500/10 text-indigo-700 border-none text-[9px] px-1.5 py-0 rounded-md font-black uppercase">{structure.type}</Badge>
                                      <span className="text-[10px] font-black text-primary px-1.5 py-0.5 rounded bg-primary/10 tracking-widest">KM {structure.chainage}</span>
                                      <Badge variant="outline" className={`text-[8px] font-black px-1 ${structure.status === 'Completed' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : ''}`}>
                                        {structure.status || 'Pending'}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm" className="rounded-lg opacity-0 group-hover:opacity-100">
                                   <CheckCircle2 size={16} className="mr-2" /> Audit
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-20 text-center opacity-40">
                            <Box size={40} className="mx-auto mb-4" />
                            <p className="text-xs font-black uppercase tracking-tighter">No fixed assets identified</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-bottom-4 duration-700 delay-200">
                <Card className="rounded-3xl glass border-none shadow-lg hover:shadow-primary/5 transition-shadow cursor-pointer p-4 flex flex-col items-center justify-center gap-2 group">
                  <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    <Ruler size={24} />
                  </div>
                  <p className="font-black text-[10px] uppercase tracking-widest opacity-60">Chainage Validation</p>
                </Card>
                <Card className="rounded-3xl glass border-none shadow-lg hover:shadow-primary/5 transition-shadow cursor-pointer p-4 flex flex-col items-center justify-center gap-2 group">
                  <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 group-hover:scale-110 transition-transform">
                    <FileJson size={24} />
                  </div>
                  <p className="font-black text-[10px] uppercase tracking-widest opacity-60">Export GeoJSON</p>
                </Card>
                <Card className="rounded-3xl glass border-none shadow-lg hover:shadow-primary/5 transition-shadow cursor-pointer p-4 flex flex-col items-center justify-center gap-2 group">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 group-hover:scale-110 transition-transform">
                    <Database size={24} />
                  </div>
                  <p className="font-black text-[10px] uppercase tracking-widest opacity-60">Sync to Cloud</p>
                </Card>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30 animate-in fade-in duration-1000">
              <div className="w-32 h-32 bg-primary/5 rounded-[3rem] flex items-center justify-center mb-8 border-4 border-dashed border-primary/10">
                <MapIcon size={64} />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">SELECT A ROAD</h2>
              <p className="font-bold text-sm">Pick a road from the list to manage its telemetry</p>
            </div>
          )}
        </div>
      </div>

      {/* Import Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] glass border-none shadow-2xl overflow-hidden p-0">
          <div className="bg-primary p-8 text-primary-foreground relative">
             <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12 scale-150">
                <Upload size={120} />
             </div>
             <DialogHeader>
               <DialogTitle className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-3">
                  <Upload className="h-8 w-8" /> KML Ingestion
               </DialogTitle>
               <DialogDescription className="text-primary-foreground/70 font-bold uppercase tracking-widest text-[10px]">
                  Convert spatial KML files into structured road telemetry
               </DialogDescription>
             </DialogHeader>
          </div>
          
          <div className="p-8 space-y-6">
            {projectKmls.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest ml-1 text-primary">Source: Existing Project KMLs</Label>
                <div className="grid grid-cols-1 gap-2">
                  {projectKmls.map(kml => (
                    <button
                      key={kml.id}
                      onClick={() => setSelectedKmlId(kml.id)}
                      className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${
                        selectedKmlId === kml.id 
                          ? 'border-primary bg-primary/5 shadow-md' 
                          : 'border-transparent bg-muted/30 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`p-2 rounded-xl ${selectedKmlId === kml.id ? 'bg-primary text-white' : 'bg-background text-muted-foreground'}`}>
                          <FileJson size={16} />
                        </div>
                        <div className="text-left overflow-hidden">
                          <p className="text-xs font-bold truncate">{kml.name}</p>
                          <p className="text-[9px] uppercase font-black opacity-40">Ready for Telemetry Extraction</p>
                        </div>
                      </div>
                      {selectedKmlId === kml.id && <CheckCircle2 size={16} className="text-primary" />}
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedKmlId('manual')}
                    className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${
                      selectedKmlId === 'manual' 
                        ? 'border-primary bg-primary/5 shadow-md' 
                        : 'border-transparent bg-muted/30 hover:bg-muted/50'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${selectedKmlId === 'manual' ? 'bg-primary text-white' : 'bg-background text-muted-foreground'}`}>
                      <Plus size={16} />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-tighter">New Manual Entry</p>
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="roadName" className="text-xs font-black uppercase tracking-widest ml-1 text-primary">Entity Name</Label>
              <Input 
                id="roadName" 
                placeholder={selectedKmlId !== 'manual' ? "Auto-derived from KML name" : "e.g. Butwal - Bhairahawa Main Highway"} 
                className="rounded-2xl border-none bg-muted/50 h-12 font-bold px-6 focus-visible:ring-primary/20"
                value={newRoadName}
                onChange={e => setNewRoadName(e.target.value)}
              />
            </div>
            
            {selectedKmlId === 'manual' && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                <Label htmlFor="kmlContent" className="text-xs font-black uppercase tracking-widest ml-1">KML XML Content</Label>
                <textarea 
                  id="kmlContent"
                  placeholder="Paste your <kml>...</kml> XML here"
                  className="w-full h-48 rounded-3xl border-none bg-muted/50 p-6 font-mono text-xs custom-scrollbar focus:ring-2 focus:ring-primary/20 outline-none"
                  value={kmlContent}
                  onChange={e => setKmlContent(e.target.value)}
                />
              </div>
            )}

            <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700">
               <Info size={18} className="shrink-0" />
               <p className="text-[10px] font-bold leading-relaxed uppercase">
                 The parser will automatically identify the primary road line, child alignments (pavement, drainage), and structure assets (culverts, bridges) based on KML naming.
               </p>
            </div>
          </div>

          <DialogFooter className="p-8 bg-muted/20 border-t border-border/40 gap-3">
            <Button variant="ghost" className="rounded-2xl font-bold px-8" onClick={() => setIsImportModalOpen(false)}>Abort</Button>
            <Button className="rounded-2xl font-black uppercase tracking-widest px-8 shadow-lg shadow-primary/20" onClick={handleImportKml} disabled={isProcessing}>
               {isProcessing ? (
                 <> <Activity className="mr-2 h-4 w-4 animate-spin" /> Processing Neural Grid... </>
               ) : (
                 <> <CheckCircle2 className="mr-2 h-4 w-4" /> Initialize Ingestion </>
               )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

{/* Map Modal */}
      <Dialog open={isMapModalOpen} onOpenChange={setIsMapModalOpen}>
        <DialogContent className="max-w-6xl w-full h-[80vh] rounded-[2.5rem] glass border-none shadow-2xl overflow-hidden p-0">
          <DialogHeader className="p-8 pb-4">
            <DialogTitle className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-3">
               <MapIcon className="h-8 w-8" /> GIS Map View
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">
              Interactive map displaying road data for {selectedRoad?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="h-[calc(80vh-120px)] p-0 border-none overflow-hidden">
            {selectedRoad && (
               <MapModule 
                 project={project} 
                 onProjectUpdate={onProjectUpdate}
                 settings={{}}
                 users={[]}
               />
             )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Road Details Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-[2.5rem] glass border-none shadow-2xl overflow-hidden p-0">
          <div className="bg-slate-900 p-8 text-white relative">
             <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 scale-150">
                <Edit size={80} />
             </div>
             <DialogHeader>
               <DialogTitle className="text-2xl font-black tracking-tighter uppercase italic flex items-center gap-3">
                  <Edit className="h-6 w-6 text-primary" /> Edit Road Details
               </DialogTitle>
               <DialogDescription className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">
                  Update spatial metadata and administrative details
               </DialogDescription>
             </DialogHeader>
          </div>
          
          <div className="p-8 grid grid-cols-2 gap-6">
            <div className="col-span-2 space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-primary">Road Name</Label>
              <Input 
                className="rounded-2xl border-none bg-muted/50 h-11 font-bold focus-visible:ring-primary/20"
                value={editRoadData.name || ''}
                onChange={e => setEditRoadData({...editRoadData, name: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-primary">Category</Label>
              <select 
                className="w-full rounded-2xl border-none bg-muted/50 h-11 font-bold px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
                value={editRoadData.category || ''}
                onChange={e => setEditRoadData({...editRoadData, category: e.target.value})}
              >
                <option value="National Highway">National Highway</option>
                <option value="Provincial Road">Provincial Road</option>
                <option value="Urban Road">Urban Road</option>
                <option value="Feeder Road">Feeder Road</option>
                <option value="Rural Road">Rural Road</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-primary">Surface Type</Label>
              <select 
                className="w-full rounded-2xl border-none bg-muted/50 h-11 font-bold px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
                value={editRoadData.surfaceType || ''}
                onChange={e => setEditRoadData({...editRoadData, surfaceType: e.target.value})}
              >
                <option value="Asphalt">Asphalt (Flexible)</option>
                <option value="Concrete">Concrete (Rigid)</option>
                <option value="Gravel">Gravel/WBM</option>
                <option value="Earthen">Earthen</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-primary">Lane Count</Label>
              <Input 
                type="number"
                className="rounded-2xl border-none bg-muted/50 h-11 font-bold focus-visible:ring-primary/20"
                value={editRoadData.lanes || 2}
                onChange={e => setEditRoadData({...editRoadData, lanes: parseInt(e.target.value)})}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-primary">Chainage Offset (m)</Label>
              <Input 
                type="number"
                className="rounded-2xl border-none bg-muted/50 h-11 font-bold focus-visible:ring-primary/20"
                value={editRoadData.chainageOffset || 0}
                onChange={e => setEditRoadData({...editRoadData, chainageOffset: parseInt(e.target.value)})}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-primary">Description</Label>
              <textarea 
                className="w-full h-24 rounded-2xl border-none bg-muted/50 p-4 font-bold text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                placeholder="Brief description of this road entity..."
                value={editRoadData.description || ''}
                onChange={e => setEditRoadData({...editRoadData, description: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter className="p-8 bg-muted/20 border-t border-border/40 gap-3">
            <Button variant="ghost" className="rounded-2xl font-bold px-8" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button className="rounded-2xl font-black uppercase tracking-widest px-8 shadow-lg shadow-primary/20" onClick={handleUpdateRoadDetails}>
               Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoadInventoryModule;

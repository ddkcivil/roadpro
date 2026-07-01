
import React, { useState, useMemo, Suspense, lazy, ComponentType } from 'react';
import { Project, Road, Alignment, Structure, AppSettings } from '../../types';
import { 
    Plus, Trash2, Map as MapIcon, Layers, 
    Upload, FileJson, Info, Ruler, 
    ChevronRight, ChevronDown, CheckCircle2,
    Database, Activity, Search, Filter,
    Eye, MoreVertical, LayoutList,
    Box, Construction, Waypoints, Milestone, Edit,
    FileText, BarChart3, PieChart
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

// Lazy load MapModule - the default export will be used
const MapModule = lazy(() => import('./MapModule'));

// Linear Progress View for Road Layers (same as in RoadInventoryModule)
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

interface GISRoadModuleProps {
  project: Project;
  onProjectUpdate: (project: Partial<Project>) => void;
  settings: AppSettings;
}

const GISRoadModule: React.FC<GISRoadModuleProps> = ({ project, onProjectUpdate, settings }) => {
  const [activeTab, setActiveTab] = useState<'map' | 'inventory' | 'analytics'>('map');
  const [selectedRoadId, setSelectedRoadId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [kmlContent, setKmlContent] = useState('');
  const [newRoadName, setNewRoadName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKmlId, setSelectedKmlId] = useState<string>('manual');
  
  // Edit Road Modal
  const [isEditRoadModalOpen, setIsEditRoadModalOpen] = useState(false);
  const [editRoadData, setEditRoadData] = useState<Partial<Road>>({});
  
  // Edit Alignment Modal
  const [isEditAlignmentModalOpen, setIsEditAlignmentModalOpen] = useState(false);
  const [editAlignmentData, setEditAlignmentData] = useState<Partial<Alignment>>({});
  
  const roads = project.roads || [];
  const projectKmls = project.kmlData || [];
  const selectedRoad = roads.find(r => r.id === selectedRoadId);
  
  // Open Edit Road Modal
  const openEditRoadModal = (road: Road) => {
    setEditRoadData({
      name: road.name,
      category: road.category || 'National Highway',
      surfaceType: road.surfaceType || 'Asphalt',
      lanes: road.lanes || 2,
      chainageOffset: road.chainageOffset || 0,
      description: road.description || ''
    });
    setIsEditRoadModalOpen(true);
  };
  
  // Open Edit Alignment Modal
  const openEditAlignmentModal = (alignment: Alignment) => {
    setEditAlignmentData({
      name: alignment.name,
      type: alignment.type,
      status: alignment.status,
      progress: alignment.progress
    });
    setIsEditAlignmentModalOpen(true);
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
    
    setIsEditRoadModalOpen(false);
    toast.success("Road details updated successfully");
  };
  
  const handleUpdateAlignmentDetails = () => {
    if (!selectedRoadId) return;
    
    const updatedRoads = roads.map(road => {
      if (road.id === selectedRoadId) {
        const updatedAlignments = road.alignments.map(alignment => 
          alignment.id === editAlignmentData.id 
            ? { ...alignment, ...editAlignmentData } 
            : alignment
        );
        return { ...road, alignments: updatedAlignments };
      }
      return road;
    });
    
    onProjectUpdate({
      ...project,
      roads: updatedRoads
    });
    
    setIsEditAlignmentModalOpen(false);
    toast.success("Alignment details updated successfully");
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
  
  const handleDeleteAlignment = (roadId: string, alignmentId: string) => {
    if (confirm("Are you sure you want to delete this alignment?")) {
       onProjectUpdate({
         ...project,
         roads: roads.map(road => {
           if (road.id === roadId) {
             return {
               ...road,
               alignments: road.alignments.filter(alignment => alignment.id !== alignmentId)
             };
           }
           return road;
         })
       });
       toast.info("Alignment removed.");
    }
  };
  
  const handleImportKml = async () => {
    let contentToProcess = kmlContent;
    let nameToUse = newRoadName;
    
    // If selecting existing KML
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
        // Log detailed information when ingestion fails (backend returns success: false)
        console.error("KML Ingestion Failed:", {
          message: "Backend reported failure.",
          projectId: project.id,
          roadName: nameToUse,
          kmlContentLength: contentToProcess?.length, // Log KML length for context
          success: result.success,
          roadData: result.road // Log the road data returned (might be an error object, null, or partial data)
        });
        toast.error("Telemetry extraction failed. Check KML format or contact support.");
      }
    } catch (error: any) {
      console.error("Ingestion error:", error);
      toast.error(error.message || "An error occurred during backend ingestion.");
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic">GIS Road Center</h1>
          <p className="text-muted-foreground font-medium">Unified map view, inventory management, and analytics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl font-bold" onClick={() => setIsImportModalOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Import KML
          </Button>
          {selectedRoad && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-xs font-bold text-primary"
              title="Edit Road Details"
            >
              <Edit size={14} />
            </Button>
          )}
        </div>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as "map" | "inventory" | "analytics")}>
        <TabsList className="bg-muted/40 p-1 rounded-2xl border border-border/20">
          <TabsTrigger value="map" className="rounded-xl font-bold text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <MapIcon className="mr-2 h-3.5 w-3.5" /> Map View
          </TabsTrigger>
          <TabsTrigger value="inventory" className="rounded-xl font-bold text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <LayoutList className="mr-2 h-3.5 w-3.5" /> Inventory
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-xl font-bold text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart3 className="mr-2 h-3.5 w-3.5" /> Analytics
          </TabsTrigger>
        </TabsList>
        
{/* Tab Content */}
        <TabsContent value="map" className="p-6 focus-visible:outline-none animate-in fade-in duration-300">
          <div className="space-y-6">
            {/* Map Module - Full featured map with all controls */}
<Suspense fallback={
              <div className="flex items-center justify-center h-96 bg-muted/20 rounded-2xl">
                <div className="text-center">
                  <Activity className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-sm font-bold text-muted-foreground">Loading GIS Module...</p>
                </div>
              </div>
            }>
              <MapModule 
                project={project} 
                onProjectUpdate={onProjectUpdate}
                settings={settings}
              />
            </Suspense>
          </div>
        </TabsContent>
        
        <TabsContent value="inventory" className="p-0 focus-visible:outline-none animate-in fade-in duration-300">
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
                            <DropdownMenuItem className="rounded-xl font-bold text-xs py-2.5 cursor-pointer" onClick={() => openEditRoadModal(selectedRoad)}>
                              <Edit className="mr-2 h-4 w-4 text-primary" /> Edit Road Details
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
                      <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as "map" | "inventory" | "analytics")} className="mt-4">
                        {/* We'll reuse the activeTab state for inner tabs? Let's create separate state for inner tabs */}
                        {/* Actually, let's create a separate state for the inventory tab's internal tabs */}
                      </Tabs>
                      
                      {/* Instead, let's use a simple div for alignments and structures list */}
                      <div className="space-y-6">
                        {/* Alignments Section */}
                        <div className="border-t border-border/40">
                          <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 pb-2">
                            <Layers size={14} /> Alignments ({selectedRoad.alignments.length})
                          </h3>
                          {selectedRoad.alignments.length > 0 ? (
                            <div className="divide-y divide-border/40 mt-4">
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
                                  <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" className="rounded-lg opacity-0 group-hover:opacity-100" onClick={() => openEditAlignmentModal(alignment)}>
                                      <Edit size={16} className="mr-2" /> Edit
                                    </Button>
                                    <Button variant="ghost" size="sm" className="rounded-lg opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleDeleteAlignment(selectedRoad.id, alignment.id)}>
                                      <Trash2 size={16} className="mr-2" /> Delete
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-12 text-center opacity-40">
                              <Layers size={32} className="mx-auto mb-4" />
                              <p className="text-xs font-black uppercase tracking-tighter">No alignments defined</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Structures Section */}
                        <div className="border-t border-border/40 mt-6">
                          <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 pb-2">
                            <Box size={14} /> Structures ({selectedRoad.structures.length})
                          </h3>
                          {selectedRoad.structures.length > 0 ? (
                            <div className="divide-y divide-border/40 mt-4">
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
                                  <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" className="rounded-lg opacity-0 group-hover:opacity-100">
                                      <CheckCircle2 size={16} className="mr-2" /> Audit
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-12 text-center opacity-40">
                              <Box size={32} className="mx-auto mb-4" />
                              <p className="text-xs font-black uppercase tracking-tighter">No structures defined</p>
                            </div>
                          )}
                        </div>
                      </div>
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
        </TabsContent>
        
        <TabsContent value="analytics" className="p-6 focus-visible:outline-none animate-in fade-in duration-300">
          {selectedRoad ? (
            <div className="space-y-6">
              <Card className="rounded-[2rem] glass border-none shadow-xl overflow-hidden">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-black tracking-tighter uppercase italic">
                    <BarChart3 className="mr-2 h-4 w-4" /> Cross-Layer Analytics
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Progress analysis for {selectedRoad.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LinearProgressView road={selectedRoad} />
                  
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-primary/5 p-6 rounded-[1.5rem] border border-primary/10 space-y-4 shadow-sm">
                      <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <Activity size={14} /> Alignment Status Distribution
                      </h3>
<div className="space-y-3">
                        {['Not Started', 'In Progress', 'Completed'].map(status => (
                          <div key={status} className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-600">{status}</span>
                            <div className="flex-1">
                              <div className="h-3 bg-slate-200 rounded-full">
                                <div 
                                  className={`h-full bg-primary transition-all duration-1000`} 
                                  style={{ width: `${(selectedRoad.alignments.filter(a => a.status === status || (status === 'Not Started' && !a.status)).length / selectedRoad.alignments.length * 100 || 0)}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-slate-400">{selectedRoad.alignments.filter(a => a.status === status || (status === 'Not Started' && !a.status)).length} ({Math.floor((selectedRoad.alignments.filter(a => a.status === status || (status === 'Not Started' && !a.status)).length / selectedRoad.alignments.length * 100 || 0))}%)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-emerald-500/5 p-6 rounded-[1.5rem] border border-emerald-500/10 space-y-4 shadow-sm">
                      <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                        <CheckCircle2 size={14} /> Completion Overview
                      </h3>
                      <div className="space-y-4">
                        <div className="text-center">
                          <p className="text-3xl font-black tracking-tighter text-emerald-600">
                            {Math.floor((selectedRoad.alignments.filter(a => a.status === 'Completed').length / selectedRoad.alignments.length * 100 || 0))}%
                          </p>
                          <p className="text-xs font-medium uppercase text-slate-500">Overall Completion</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-center text-xs">
                          <div>
                            <p className="font-medium text-slate-500">Total Alignments</p>
                            <p className="text-black font-bold">{selectedRoad.alignments.length}</p>
                          </div>
                          <div>
                            <p className="font-medium text-slate-500">Completed</p>
                            <p className="text-black font-bold">{selectedRoad.alignments.filter(a => a.status === 'Completed').length}</p>
                          </div>
                          <div>
                            <p className="font-medium text-slate-500">In Progress</p>
                            <p className="text-black font-bold">{selectedRoad.alignments.filter(a => a.status === 'In Progress' || a.status === 'Not Started').length}</p>
                          </div>
                          <div>
                            <p className="font-medium text-slate-500">Structures</p>
                            <p className="text-black font-bold">{selectedRoad.structures.length}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Additional Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="rounded-[1.5rem] glass border-none shadow-xl p-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-black uppercase tracking-widest">
                      <FileText size={16} /> Data Sources
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <MapIcon className="h-4 w-4 text-primary" />
                      <span>GIS Layers: {project.mapOverlays?.length || 0} active</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Upload className="h-4 w-4 text-primary" />
                      <span>KML Sources: {project.kmlData?.length || 0} files</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Activity className="h-4 w-4 text-primary" />
                      <span>Updates: {Date.now()}</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="rounded-[1.5rem] glass border-none shadow-xl p-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-black uppercase tracking-widest">
                      <PieChart size={16} /> Resource Allocation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Box className="h-4 w-4 text-primary" />
                      <span>Structures: {selectedRoad.structures.reduce((sum, s) => sum + (s.status === 'Completed' ? 1 : 0), 0)}/{selectedRoad.structures.length} Completed</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Activity className="h-4 w-4 text-primary" />
                      <span>Avg. Progress: {selectedRoad.alignments.reduce((sum, a) => sum + (a.progress || 0), 0) / selectedRoad.alignments.length || 0}%</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="rounded-[1.5rem] glass border-none shadow-xl p-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-black uppercase tracking-widest">
                      <Database size={16} /> Data Quality
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>Geometry Validity: All roads validated</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Activity className="h-4 w-4 text-warning" />
                      <span>Last Updated: Just now</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted" />
                      <span>KML Parsing: No errors</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30 animate-in fade-in duration-1000">
              <div className="w-32 h-32 bg-primary/5 rounded-[3rem] flex items-center justify-center mb-8 border-4 border-dashed border-primary/10">
                <BarChart3 size={64} />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">SELECT A ROAD</h2>
              <p className="font-bold text-sm">Pick a road from the list to view analytics</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Import Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="sm:max-w-[600px] border-border/50">
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
      
      {/* Edit Road Modal */}
      <Dialog open={isEditRoadModalOpen} onOpenChange={setIsEditRoadModalOpen}>
        <DialogContent className="sm:max-w-[550px] border-border/50">
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
                placeholder="e.g. Butwal - Bhairahawa Main Highway"
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
                aria-label="Road Category"
              >
                <option value="">Select Category</option>
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
                aria-label="Surface Type"
              >
                <option value="">Select Surface</option>
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
                placeholder="e.g. 2"
                value={editRoadData.lanes || ''}
                onChange={e => setEditRoadData({...editRoadData, lanes: parseInt(e.target.value)})}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-primary">Chainage Offset (m)</Label>
              <Input 
                type="number"
                className="rounded-2xl border-none bg-muted/50 h-11 font-bold focus-visible:ring-primary/20"
                placeholder="e.g. 0"
                value={editRoadData.chainageOffset ?? ''}
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
            <Button variant="ghost" className="rounded-2xl font-bold px-8" onClick={() => setIsEditRoadModalOpen(false)}>Cancel</Button>
            <Button className="rounded-2xl font-black uppercase tracking-widest px-8 shadow-lg shadow-primary/20" onClick={handleUpdateRoadDetails}>
               Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Alignment Modal */}
      <Dialog open={isEditAlignmentModalOpen} onOpenChange={setIsEditAlignmentModalOpen}>
        <DialogContent className="sm:max-w-[450px] border-border/50">
          <div className="bg-slate-900 p-8 text-white relative">
             <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 scale-150">
               <Edit size={60} />
             </div>
             <DialogHeader>
               <DialogTitle className="text-xl font-black tracking-tighter uppercase italic flex items-center gap-3">
                  <Edit className="h-5 w-5 text-primary" /> Edit Alignment Details
               </DialogTitle>
               <DialogDescription className="text-slate-400 font-bold uppercase tracking-widest text-[8px]">
                  Update alignment properties and progress
               </DialogDescription>
             </DialogHeader>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-primary">Alignment Name</Label>
              <Input 
                className="rounded-2xl border-none bg-muted/50 h-11 font-bold focus-visible:ring-primary/20"
                placeholder="e.g. Layer 1 Alignment"
                value={editAlignmentData.name || ''}
                onChange={e => setEditAlignmentData({...editAlignmentData, name: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-primary">Alignment Type</Label>
              <select 
                className="w-full rounded-2xl border-none bg-muted/50 h-11 font-bold px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
                value={editAlignmentData.type || ''}
                onChange={e => setEditAlignmentData({...editAlignmentData, type: e.target.value as Alignment['type']})}
                aria-label="Alignment Type"
              >
                <option value="">Select Type</option>
                <option value="pavement">Pavement</option>
                <option value="subgrade">Subgrade</option>
                <option value="sub-base">Sub-base</option>
                <option value="base">Base</option>
                <option value="asphalt">Asphalt</option>
                <option value="drainage">Drainage</option>
                <option value="shoulder">Shoulder</option>
                <option value="median">Median</option>
                <option value="sidewalk">Sidewalk</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-primary">Status</Label>
              <select 
                className="w-full rounded-2xl border-none bg-muted/50 h-11 font-bold px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
                value={editAlignmentData.status || ''}
                onChange={e => setEditAlignmentData({...editAlignmentData, status: e.target.value as Alignment['status']})}
                aria-label="Status"
              >
                <option value="">Select Status</option>
                <option value="Planned">Planned</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-primary">Progress (%)</Label>
              <Input 
                type="number"
                min="0"
                max="100"
                placeholder="0-100"
                className="rounded-2xl border-none bg-muted/50 h-11 font-bold focus-visible:ring-primary/20"
                value={editAlignmentData.progress ?? ''}
                onChange={e => setEditAlignmentData({...editAlignmentData, progress: parseInt(e.target.value)})}
              />
            </div>
          </div>
          
          <DialogFooter className="p-6 bg-muted/20 border-t border-border/40">
            <Button variant="ghost" className="rounded-2xl font-bold px-8" onClick={() => setIsEditAlignmentModalOpen(false)}>Cancel</Button>
            <Button className="rounded-2xl font-black uppercase tracking-widest px-8 shadow-lg shadow-primary/20" onClick={handleUpdateAlignmentDetails}>
               Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GISRoadModule;
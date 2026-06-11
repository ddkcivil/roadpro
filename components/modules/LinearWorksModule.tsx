import React, { useState, useMemo } from 'react';
import { Project, LinearWorkLog } from '../../types';
import { 
    Plus, Trash2, Layers, History, Filter, 
    Ruler, ShieldCheck, Edit, Info,
    Waves, Footprints, Grid2X2, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Progress } from '~/components/ui/progress';
import { 
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "~/components/ui/tooltip";
import { toast } from 'sonner';

interface Props {
  project: Project;
  onProjectUpdate: (project: Project) => void;
}

const LINEAR_CATEGORIES = [
    { id: 'Pavement', icon: <Layers size={18} />, label: 'Pavement' },
    { id: 'Drainage', icon: <Waves size={18} />, label: 'Drainage' },
    { id: 'Footpath', icon: <Footprints size={18} />, label: 'Footpath' },
    { id: 'Median', icon: <Grid2X2 size={18} />, label: 'Median & Kerbs' }
];

const WORK_LAYERS: Record<string, string[]> = {
    'Pavement': ['Embankment', 'Subgrade', 'GSB', 'WMM', 'Prime Coat', 'Tack Coat', 'DBM', 'BC', 'Concrete Pavement'],
    'Drainage': ['Trench Evaluation', 'PCC Bedding', 'Wall Construction', 'Cover Slab', 'Finishing / Plastering'],
    'Footpath': ['Subgrade Prep', 'Granular Base', 'Kerb Stone Fixing', 'Tactile Pavers', 'Interlocking Blocks'],
    'Median': ['Curb Casting', 'Soil Filling', 'Landscape Preparation', 'W-Beam Barrier']
};

const LinearWorksModule: React.FC<Props> = ({ project, onProjectUpdate }) => {
  const [activeCategory, setActiveCategory] = useState('Pavement');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);
  
  // BOQ options mapping
  const boqOptions = useMemo(() => project.boq || [], [project.boq]);
  
  const [newLog, setNewLog] = useState<Partial<LinearWorkLog>>({ 
      category: 'Pavement', 
      date: new Date().toISOString().split('T')[0],
      side: 'Both',
      layer: '',
      quantity: 0,
      plannedQuantity: 0,
      quantityUnit: '' 
  });

  const logs = project.linearWorks || [];
  const filteredLogs = logs.filter(l => l.category === activeCategory);

  const stats = useMemo(() => {
      const uniqueLayers = WORK_LAYERS[activeCategory] || [];
      return uniqueLayers.map(layer => {
          const layerLogs = filteredLogs.filter(l => l.layer === layer);
          const totalKm = layerLogs.reduce((acc, l) => acc + (l.endChainage - l.startChainage), 0);
          return { layer, totalKm };
      });
  }, [filteredLogs, activeCategory]);

  const handleEditLog = (log: LinearWorkLog) => {
      setNewLog(log);
      setEditingLogId(log.id);
      setIsLogModalOpen(true);
  };

  const handleSaveLog = () => {
      if (!newLog.layer || newLog.startChainage === undefined || newLog.endChainage === undefined) {
          toast.error("Please fill in Layer, Start Km, and End Km.");
          return;
      }
      
      const quantity = Number(newLog.quantity) || 0;
      const plannedQuantity = Number(newLog.plannedQuantity) || 0;
      const timestamp = new Date().toISOString();
      
      if (editingLogId) {
          const oldLog = logs.find(l => l.id === editingLogId);
          if (!oldLog) return;

          const changes: any[] = [];
          const fieldsToTrack: (keyof LinearWorkLog)[] = ['layer', 'startChainage', 'endChainage', 'quantity', 'plannedQuantity', 'side'];
          
          fieldsToTrack.forEach(field => {
              if (oldLog[field] !== newLog[field]) {
                  changes.push({
                      date: timestamp,
                      userId: 'current-user', // In a real app, get from auth context
                      userName: 'Current User',
                      field,
                      oldValue: oldLog[field],
                      newValue: newLog[field]
                  });
              }
          });

          const updatedLog: LinearWorkLog = {
              ...oldLog,
              ...newLog as LinearWorkLog,
              changeLog: [...(oldLog.changeLog || []), ...changes]
          };

          onProjectUpdate({
              ...project,
              linearWorks: logs.map(l => l.id === editingLogId ? updatedLog : l)
          });
          toast.success("Work log updated with change history.");
      } else {
          const log: LinearWorkLog = {
              id: `lin-${Date.now()}`,
              category: activeCategory,
              layer: newLog.layer!,
              startChainage: Number(newLog.startChainage),
              endChainage: Number(newLog.endChainage),
              date: newLog.date!,
              side: newLog.side as any || 'Both',
              quantity,
              plannedQuantity,
              quantityUnit: newLog.quantityUnit || '',
              status: 'Completed',
              changeLog: [{
                  date: timestamp,
                  userId: 'current-user',
                  userName: 'Current User',
                  field: 'initial_creation',
                  oldValue: null,
                  newValue: 'Created log'
              }]
          };

          onProjectUpdate({ ...project, linearWorks: [...logs, log] });
          toast.success("New linear work log certified.");
      }

      setIsLogModalOpen(false);
      setEditingLogId(null);
      setNewLog({ 
          category: activeCategory, 
          date: new Date().toISOString().split('T')[0], 
          side: 'Both', 
          layer: '',
          quantity: 0,
          plannedQuantity: 0,
          quantityUnit: '' 
      });
  };

  const handleDeleteLog = (id: string) => {
      if (confirm("Are you sure you want to delete this work log? This action cannot be undone.")) {
          onProjectUpdate({ ...project, linearWorks: logs.filter(l => l.id !== id) });
          toast.info("Log removed from project record.");
      }
  };

  const selectedLogForHistory = logs.find(l => l.id === viewingHistoryId);

  return (
    <div className="animate-in fade-in duration-500">
        <div className="flex justify-between mb-4 items-center">
            <div>
                <h1 className="text-2xl font-bold">Linear Operations</h1>
                <p className="text-muted-foreground">Kilometer-wise progress and planned quantity tracking</p>
            </div>
            <div className="flex space-x-2">
                <Button variant="outline" onClick={() => toast("Exporting project history...")}><History className="mr-2 h-4 w-4" />Export History</Button>
                <Button onClick={() => { setEditingLogId(null); setIsLogModalOpen(true); }}><Plus className="mr-2 h-4 w-4" />Log Progress</Button>
            </div>
        </div>

        <Card>
            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                <TabsList className="ml-4 mt-2">
                    {LINEAR_CATEGORIES.map(cat => (
                        <TabsTrigger key={cat.id} value={cat.id}>
                            {cat.icon}
                            <span className="ml-2">{cat.label}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>
            
                <TabsContent value={activeCategory} className="p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-1">
                            <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">CATEGORY COVERAGE</h2>
                            <div className="space-y-6">
                                {stats.map(s => (
                                    <div key={s.layer} className="bg-card p-4 rounded-lg border shadow-sm">
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm font-bold">{s.layer}</span>
                                            <span className="text-sm font-black text-primary">{s.totalKm.toFixed(3)} Km</span>
                                        </div>
                                        <Progress value={Math.min(100, (s.totalKm / 15) * 100)} className="h-2" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="lg:col-span-3">
                            <Card className="border shadow-sm bg-card">
                                <CardHeader className="pb-2 border-b">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-lg">Work Log: {activeCategory}</CardTitle>
                                        <Button variant="ghost" size="sm" className="h-8"><Filter className="h-4 w-4 mr-2" /> Filter</Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="w-[120px] px-4">Date</TableHead>
                                                <TableHead>Layer</TableHead>
                                                <TableHead>BOQ Item</TableHead>
                                                <TableHead>Chainage (Km)</TableHead>
                                                <TableHead>Progress (Qty)</TableHead>
                                                <TableHead>Side</TableHead>
                                                <TableHead className="text-right px-4">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredLogs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => {
                                                const progress = log.plannedQuantity && log.plannedQuantity > 0 
                                                    ? Math.min(100, ((log.quantity || 0) / log.plannedQuantity) * 100)
                                                    : 0;
                                                const linkedBoq = boqOptions.find(b => b.id === log.boqItemId);
                                                
                                                return (
                                                    <TableRow key={log.id} className="group hover:bg-muted/20">
                                                        <TableCell className="font-medium text-xs px-4">{log.date}</TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-sm">{log.layer}</span>
                                                                {log.changeLog && log.changeLog.length > 1 && (
                                                                    <button 
                                                                        onClick={() => setViewingHistoryId(log.id)}
                                                                        className="text-[10px] text-primary flex items-center hover:underline mt-1"
                                                                    >
                                                                        <History size={10} className="mr-1" /> View Changes ({log.changeLog.length - 1})
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-xs">
                                                            {linkedBoq ? `${linkedBoq.itemNo} - ${linkedBoq.description.substring(0, 30)}...` : <span className="text-muted-foreground italic">No Link</span>}
                                                        </TableCell>
                                                        <TableCell>
                                                            <code className="text-[11px] bg-muted/80 px-1.5 py-0.5 rounded font-mono border">
                                                                {log.startChainage.toFixed(3)} - {log.endChainage.toFixed(3)}
                                                            </code>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col gap-1 w-full max-w-[150px]">
                                                                <div className="flex justify-between text-[10px] font-bold">
                                                                    <span>{log.quantity?.toLocaleString()} / {log.plannedQuantity?.toLocaleString()} {log.quantityUnit}</span>
                                                                    <span className={progress >= 100 ? "text-green-600" : ""}>{progress.toFixed(0)}%</span>
                                                                </div>
                                                                <Progress value={progress} className={`h-1.5 ${progress >= 100 ? "[&>div]:bg-green-500" : ""}`} />
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="text-[10px] font-black border px-1.5 py-0.5 rounded bg-muted shadow-sm">
                                                                {log.side}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right px-4">
                                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Button variant="outline" size="icon" className="h-8 w-8 bg-background shadow-sm" onClick={() => handleEditLog(log)}>
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                                <Button variant="outline" size="icon" className="h-8 w-8 text-destructive bg-background shadow-sm hover:bg-destructive/10" onClick={() => handleDeleteLog(log.id)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                            {filteredLogs.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic bg-muted/5">
                                                        No work logs recorded for this category.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </Card>

        {/* LOG MODAL */}
        <Dialog open={isLogModalOpen} onOpenChange={(open) => { setIsLogModalOpen(open); if(!open) setEditingLogId(null); }}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center">
                        {editingLogId ? <Edit className="mr-2 text-primary" /> : <Ruler className="mr-2 text-primary" />}
                        {editingLogId ? 'Update Work Log' : 'Record New Progress'}
                    </DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="layer">Layer</Label>
                            <Select value={newLog.layer} onValueChange={value => setNewLog({...newLog, layer: value})}>
                                <SelectTrigger id="layer">
                                    <SelectValue placeholder="Select layer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(WORK_LAYERS[activeCategory] || []).map(l => (<SelectItem key={l} value={l}>{l}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="boqLink">Link to BOQ Item</Label>
                            <Select value={newLog.boqItemId} onValueChange={value => setNewLog({...newLog, boqItemId: value})}>
                                <SelectTrigger id="boqLink">
                                    <SelectValue placeholder="Select BOQ item" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">-- No Link --</SelectItem>
                                    {boqOptions.map(b => (<SelectItem key={b.id} value={b.id}>{b.itemNo} - {b.description}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startKm">Start Chainage (Km)</Label>
                            <Input id="startKm" type="number" step="0.001" placeholder="e.g. 0.000" value={newLog.startChainage} onChange={e => setNewLog({...newLog, startChainage: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endKm">End Chainage (Km)</Label>
                            <Input id="endKm" type="number" step="0.001" placeholder="e.g. 1.000" value={newLog.endChainage} onChange={e => setNewLog({...newLog, endChainage: Number(e.target.value)})} />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 bg-muted/30 p-4 rounded-lg border">
                        <div className="space-y-2">
                            <Label htmlFor="plannedQty" className="text-[10px] font-black uppercase">Planned Qty</Label>
                            <Input id="plannedQty" type="number" placeholder="0" value={newLog.plannedQuantity} onChange={e => setNewLog({...newLog, plannedQuantity: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="actualQty" className="text-[10px] font-black uppercase">Actual Qty</Label>
                            <Input id="actualQty" type="number" placeholder="0" value={newLog.quantity} onChange={e => setNewLog({...newLog, quantity: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="unit" className="text-[10px] font-black uppercase">Unit</Label>
                            <Input id="unit" placeholder="e.g. m3, t, sqm" value={newLog.quantityUnit} onChange={e => setNewLog({...newLog, quantityUnit: e.target.value})} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="date">Certification Date</Label>
                        <Input id="date" type="date" value={newLog.date} onChange={e => setNewLog({...newLog, date: e.target.value})} />
                    </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setIsLogModalOpen(false)}>Cancel Action</Button>
                    <Button onClick={handleSaveLog} className="bg-primary font-bold">
                        <ShieldCheck className="mr-2 h-4 w-4" /> {editingLogId ? 'Confirm Updates' : 'Certify Record'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* HISTORY MODAL */}
        <Dialog open={!!viewingHistoryId} onOpenChange={(open) => { if(!open) setViewingHistoryId(null); }}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center"><History className="mr-2 text-primary" /> Audit Trail: {selectedLogForHistory?.layer}</DialogTitle>
                </DialogHeader>
                <div className="max-h-[400px] overflow-y-auto pr-2">
                    <div className="relative border-l-2 border-primary/20 ml-3 py-2 space-y-6">
                        {selectedLogForHistory?.changeLog?.slice().reverse().map((entry, i) => (
                            <div key={i} className="relative pl-6">
                                <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-black text-primary uppercase">{entry.field.replace(/([A-Z])/g, ' $1')}</span>
                                        <span className="text-[10px] text-muted-foreground">{new Date(entry.date).toLocaleString()}</span>
                                    </div>
                                    <div className="bg-muted/50 p-2 rounded text-xs border border-border/50">
                                        {entry.field === 'initial_creation' ? (
                                            <span className="font-medium italic">{entry.newValue}</span>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="line-through opacity-50">{String(entry.oldValue)}</span>
                                                <span className="text-primary font-bold">→</span>
                                                <span className="font-bold">{String(entry.newValue)}</span>
                                            </div>
                                        )}
                                        <div className="mt-1.5 pt-1.5 border-t border-border/50 text-[9px] flex items-center">
                                            <Info size={10} className="mr-1 opacity-50" /> Recorded by <span className="font-bold ml-1">{entry.userName}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setViewingHistoryId(null)}>Close Audit Log</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
};

export default LinearWorksModule;

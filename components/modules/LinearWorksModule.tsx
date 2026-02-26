import React, { useState, useMemo } from 'react';
import { Project, UserRole, LinearWorkLog } from '../../types';
import { 
    Plus, Trash2, Layers, MapPin, History, Filter, 
    TrendingUp, Ruler, Navigation, ShieldCheck, 
    Construction, Waves, Footprints, Grid2X2
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Progress } from '~/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { toast } from 'sonner';

const ArrowRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300">
        <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
    </svg>
);

interface Props {
  project: Project;
  userRole: UserRole;
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
    'Drainage': ['Trench Excavation', 'PCC Bedding', 'Wall Construction', 'Cover Slab', 'Finishing / Plastering'],
    'Footpath': ['Subgrade Prep', 'Granular Base', 'Kerb Stone Fixing', 'Tactile Pavers', 'Interlocking Blocks'],
    'Median': ['Curb Casting', 'Soil Filling', 'Landscape Preparation', 'W-Beam Barrier']
};

const LinearWorksModule: React.FC<Props> = ({ project, onProjectUpdate, userRole }) => {
  const [activeCategory, setActiveCategory] = useState('Pavement');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [newLog, setNewLog] = useState<Partial<LinearWorkLog>>({ 
      category: 'Pavement', 
      date: new Date().toISOString().split('T')[0],
      side: 'Both',
      layer: ''
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

  const handleSaveLog = () => {
      if (!newLog.layer || newLog.startChainage === undefined || newLog.endChainage === undefined) return;
      
      const log: LinearWorkLog = {
          id: `lin-${Date.now()}`,
          category: activeCategory,
          layer: newLog.layer!,
          startChainage: Number(newLog.startChainage),
          endChainage: Number(newLog.endChainage),
          date: newLog.date!,
          side: newLog.side as any || 'Both',
          status: 'Completed'
      };

      onProjectUpdate({ ...project, linearWorks: [...logs, log] });
      setIsLogModalOpen(false);
      setNewLog({ category: activeCategory, date: new Date().toISOString().split('T')[0], side: 'Both', layer: '' });
  };

  const handleDeleteLog = (id: string) => {
      if (confirm("Delete this work log?")) {
          onProjectUpdate({ ...project, linearWorks: logs.filter(l => l.id !== id) });
      }
  };

  const handleExport = () => {
      toast("Preparing high-fidelity PDF export of linear works history...");
  };

  return (
    <div className="animate-in fade-in duration-500">
        <div className="flex justify-between mb-4 items-center">
            <div>
                <h1 className="text-2xl font-bold">Linear Operations</h1>
                <p className="text-muted-foreground">Kilometer-wise progress of pavement and utilities</p>
            </div>
            <div className="flex space-x-2">
                <Button variant="outline" onClick={handleExport}><History className="mr-2 h-4 w-4" />Export History</Button>
                <Button onClick={() => setIsLogModalOpen(true)}><Plus className="mr-2 h-4 w-4" />Log Progress</Button>
            </div>
        </div>

        <Card>
            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                <TabsList>
                    {LINEAR_CATEGORIES.map(cat => (
                        <TabsTrigger key={cat.id} value={cat.id}>
                            {cat.icon}
                            <span className="ml-2">{cat.label}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>
            
                <TabsContent value={activeCategory} className="p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-1">
                            <h2 className="text-sm font-semibold mb-2">CATEGORY COVERAGE</h2>
                            <div className="space-y-4">
                                {stats.map(s => (
                                    <div key={s.layer}>
                                        <div className="flex justify-between mb-1">
                                            <span className="text-sm font-medium">{s.layer}</span>
                                            <span className="text-sm font-bold text-primary">{s.totalKm.toFixed(3)} Km</span>
                                        </div>
                                        <Progress value={Math.min(100, (s.totalKm / 15) * 100)} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle>History: {activeCategory}</CardTitle>
                                        <Button variant="ghost" size="icon"><Filter className="h-4 w-4" /></Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Layer</TableHead>
                                                <TableHead>Range</TableHead>
                                                <TableHead>Side</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredLogs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => (
                                                <TableRow key={log.id}>
                                                    <TableCell>{log.date}</TableCell>
                                                    <TableCell>{log.layer}</TableCell>
                                                    <TableCell>{`${log.startChainage.toFixed(3)} - ${log.endChainage.toFixed(3)}`}</TableCell>
                                                    <TableCell>{log.side}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteLog(log.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </Card>

        <Dialog open={isLogModalOpen} onOpenChange={setIsLogModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center"><Ruler className="mr-2 text-primary" /> Log Progress</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="layer" className="text-right">Layer</Label>
                        <Select value={newLog.layer} onValueChange={value => setNewLog({...newLog, layer: value})}>
                            <SelectTrigger id="layer" className="col-span-3">
                                <SelectValue placeholder="Select a layer" />
                            </SelectTrigger>
                            <SelectContent>
                                {(WORK_LAYERS[activeCategory] || []).map(l => (<SelectItem key={l} value={l}>{l}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="startKm" className="text-right">Start Km</Label>
                        <Input id="startKm" type="number" value={newLog.startChainage} onChange={e => setNewLog({...newLog, startChainage: Number(e.target.value)})} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="endKm" className="text-right">End Km</Label>
                        <Input id="endKm" type="number" value={newLog.endChainage} onChange={e => setNewLog({...newLog, endChainage: Number(e.target.value)})} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Side</Label>
                        <div className="col-span-3">
                            <Select value={newLog.side} onValueChange={value => setNewLog({...newLog, side: value as any})}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LHS">LHS</SelectItem>
                                    <SelectItem value="RHS">RHS</SelectItem>
                                    <SelectItem value="Both">BOTH</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">Date</Label>
                        <Input id="date" type="date" value={newLog.date} onChange={e => setNewLog({...newLog, date: e.target.value})} className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsLogModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveLog} disabled={!newLog.layer}><ShieldCheck className="mr-2 h-4 w-4" />Certify Log</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
};

export default LinearWorksModule;

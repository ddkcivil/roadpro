import React, { useState } from 'react';
import { Project, UserRole, LinearWorkLog } from '../types';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';

interface Props {
  project: Project;
  userRole: UserRole;
  onProjectUpdate: (project: Project) => void;
}

const PavementModule: React.FC<Props> = ({ project, onProjectUpdate }) => {
  const [activeCategory, setActiveCategory] = useState('Pavement');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [newLog, setNewLog] = useState<Partial<LinearWorkLog>>({ 
      category: 'Pavement', 
      date: new Date().toISOString().split('T')[0],
      startChainage: 0,
      endChainage: 0
  });

  const handleSaveLog = () => {
      if (!newLog.layer) return;
      const log: LinearWorkLog = {
          id: `lin-${Date.now()}`,
          category: activeCategory as any,
          layer: newLog.layer!,
          startChainage: Number(newLog.startChainage),
          endChainage: Number(newLog.endChainage),
          date: newLog.date!,
          side: 'Both',
          status: 'In Progress'
      };
      onProjectUpdate({ ...project, linearWorks: [...(project.linearWorks || []), log] });
      setIsLogModalOpen(false);
  };

  return (
    <div>
        <div className="flex justify-between mb-4">
            <h1 className="text-2xl font-bold">Linear Works Registry</h1>
            <Button onClick={() => setIsLogModalOpen(true)}><Plus className="mr-2 h-4 w-4" />Record Progress</Button>
        </div>
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList>
                <TabsTrigger value="Pavement">Pavement</TabsTrigger>
            </TabsList>
        </Tabs>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            <div className="lg:col-span-2">
                <Card>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Layer</TableHead>
                                    <TableHead>Chainage (Km)</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(project.linearWorks || []).map(log => (
                                    <TableRow key={log.id}>
                                        <TableCell>{log.date}</TableCell>
                                        <TableCell>{log.layer}</TableCell>
                                        <TableCell>{`${log.startChainage} - ${log.endChainage}`}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(project.linearWorks || []).length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center">No linear work recorded.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
        <Dialog open={isLogModalOpen} onOpenChange={setIsLogModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Log Daily Progress</DialogTitle>
                    <DialogDescription>Record the linear work execution for today.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="work-layer" className="text-right">Work Layer</Label>
                        <Input id="work-layer" value={newLog.layer || ''} onChange={e => setNewLog({...newLog, layer: e.target.value})} placeholder="e.g. GSB, WMM..." className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="start-km" className="text-right">Start Km</Label>
                        <Input id="start-km" type="number" value={newLog.startChainage} onChange={e => setNewLog({...newLog, startChainage: Number(e.target.value)})} placeholder="e.g. 0.000" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="end-km" className="text-right">End Km</Label>
                        <Input id="end-km" type="number" value={newLog.endChainage} onChange={e => setNewLog({...newLog, endChainage: Number(e.target.value)})} placeholder="e.g. 1.000" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">Date</Label>
                        <Input id="date" type="date" value={newLog.date} onChange={e => setNewLog({...newLog, date: e.target.value})} className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsLogModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveLog} disabled={!newLog.layer}>Commit Entry</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
};

export default PavementModule;

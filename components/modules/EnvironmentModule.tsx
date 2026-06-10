import React, { useState } from 'react';
import { 
    Trees, Droplets, Plus, X, Save, Wind
} from 'lucide-react';
import { Project, TreeLog, SprinklingLog } from '../../types';

import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from '~/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Progress } from '~/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

interface Props {
  project: Project;
  onProjectUpdate: (project: Project) => void;
}

const EnvironmentModule: React.FC<Props> = ({ project, onProjectUpdate }) => {
    const [activeTab, setActiveTab] = useState<'TREES' | 'SPRINKLING'>('TREES');
    const [isTreeModalOpen, setIsTreeModalOpen] = useState(false);
    const [isSprinkleModalOpen, setIsSprinkleModalOpen] = useState(false);

    const registry = project.environmentRegistry || { treesRemoved: 0, treesPlanted: 0, treeLogs: [], sprinklingLogs: [], airQualityLogs: [] };
    
    const treeStats = { removed: 0, planted: 0, target: 0 };
    for (const log of registry.treeLogs) {
        treeStats.removed += (log.removedCount || 0);
        treeStats.planted += (log.plantedCount || 0);
        treeStats.target += (log.targetPlant || 0);
    }
const handleSaveTree = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const removed = Number(data.get('removed'));
    const newLog: TreeLog = {
        id: `tree-${Date.now()}`,
        chainage: data.get('chainage') as string,
        species: data.get('species') as string,
        location: data.get('location') as string || 'Unknown',
        action: 'Removed',
        count: removed,
        removedCount: removed,
        plantedCount: 0,
        targetPlant: removed * 10,
        date: new Date().toISOString().split('T')[0]
    };

        onProjectUpdate({
            ...project,
            environmentRegistry: { ...registry, treeLogs: [...registry.treeLogs, newLog] }
        });
        setIsTreeModalOpen(false);
    };

    const handleSaveSprinkle = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const newLog: SprinklingLog = {
            id: `sprinkle-${Date.now()}`,
            date: data.get('date') as string,
            area: data.get('location') as string,
            volume: Number(data.get('volume')),
            unit: 'liters',
            operator: data.get('operator') as string,
        };
        onProjectUpdate({
            ...project,
            environmentRegistry: { ...registry, sprinklingLogs: [...registry.sprinklingLogs, newLog] }
        });
        setIsSprinkleModalOpen(false);
    };
    
    return (
        <div className="p-4 animate-in fade-in duration-500">
            <div className="flex justify-between mb-6 items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Environmental Compliance</h1>
                    <p className="text-sm text-gray-500">Safeguard monitoring per project EMP guidelines</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={activeTab === 'TREES' ? 'default' : 'outline'}
                        onClick={() => setActiveTab('TREES')}
                    >
                        <Trees className="mr-2 h-4 w-4" /> Tree Replacement
                    </Button>
                    <Button
                        variant={activeTab === 'SPRINKLING' ? 'default' : 'outline'}
                        onClick={() => setActiveTab('SPRINKLING')}
                    >
                        <Droplets className="mr-2 h-4 w-4" /> Dust Suppression
                    </Button>
                </div>
            </div>

            {activeTab === 'TREES' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="col-span-1 bg-green-50">
                        <CardHeader>
                            <CardTitle className="text-sm font-black text-green-700 uppercase tracking-wide">Compensatory Plantation (1:10)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between items-baseline mb-2">
                                <span className="text-4xl font-bold text-green-800">{treeStats.planted}</span>
                                <span className="text-lg text-gray-500">/ {treeStats.target}</span>
                            </div>
                            <Progress value={treeStats.target > 0 ? (treeStats.planted / treeStats.target) * 100 : 0} className="h-2" />
                            <p className="text-xs text-gray-500 mt-2">Based on {treeStats.removed} trees cleared along the alignment.</p>
                        </CardContent>
                    </Card>
                    <Card className="col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg font-semibold">Removal & Plantation Ledger</CardTitle>
                            <Button size="sm" onClick={() => setIsTreeModalOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" /> Log Clearing
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Location (Ch)</TableHead>
                                        <TableHead>Species</TableHead>
                                        <TableHead className="text-right">Cleared</TableHead>
                                        <TableHead className="text-right">Target</TableHead>
                                        <TableHead className="text-right">Planted</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {registry.treeLogs.length > 0 ? registry.treeLogs.map(log => (
                                        <TableRow key={log.id}>
                                            <TableCell>{log.date}</TableCell>
                                            <TableCell className="font-bold">{log.chainage}</TableCell>
                                            <TableCell>{log.species}</TableCell>
                                            <TableCell className="text-right text-red-600">-{log.removedCount}</TableCell>
                                            <TableCell className="text-right">{log.targetPlant}</TableCell>
                                            <TableCell className="text-right text-green-600 font-bold">{log.plantedCount}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                                                No tree clearing logs recorded.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}

            {activeTab === 'SPRINKLING' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="col-span-1">
                        <CardHeader>
                            <CardTitle className="text-sm font-black text-primary uppercase tracking-wide">Daily Target Monitor</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between items-center mb-3">
                                <p className="text-sm">Today's Logs</p>
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">2/3</Badge>
                            </div>
                            <Alert variant="default" className="bg-yellow-50 border-yellow-200 text-yellow-800">
                                <Wind className="h-4 w-4" />
                                <AlertTitle>Dry conditions reported</AlertTitle>
                                <AlertDescription>Ensure 3rd sprinkling cycle is completed at high-traffic zones.</AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                    <Card className="col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg font-semibold">Water Sprinkling History</CardTitle>
                            <Button size="sm" onClick={() => setIsSprinkleModalOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" /> Record Cycle
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Cycle</TableHead>
                                        <TableHead>Section Covered</TableHead>
                                        <TableHead>Bowser Ref</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {registry.sprinklingLogs.length > 0 ? registry.sprinklingLogs.map(log => (
                                        <TableRow key={log.id}>
                                            <TableCell>{log.date}</TableCell>
                                            <TableCell><Badge variant="outline">{log.time || 'N/A'}</Badge></TableCell>
                                            <TableCell className="font-bold">{log.location || 'N/A'}</TableCell>
                                            <TableCell>{log.bowserId || 'N/A'}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-gray-400">
                                                No sprinkling cycles logged today.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tree Modal */}
            <Dialog open={isTreeModalOpen} onOpenChange={setIsTreeModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Log Tree Clearing</DialogTitle>
                        <DialogDescription>
                            Record details of tree removal for compensatory plantation tracking.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveTree} className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="chainage" className="text-right">Location (Ch)</Label>
                            <Input id="chainage" name="chainage" placeholder="e.g. 10+500" className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="species" className="text-right">Tree Species</Label>
                            <Input id="species" name="species" placeholder="e.g. Sal, Pine" className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="removed" className="text-right">Trees Removed</Label>
                            <Input id="removed" name="removed" type="number" min="0" placeholder="0" className="col-span-3" required />
                            <p className="col-span-4 text-sm text-muted-foreground text-right">System will auto-calculate 1:10 target.</p>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsTreeModalOpen(false)}>
                                <X className="mr-2 h-4 w-4" /> Cancel
                            </Button>
                            <Button type="submit">
                                <Save className="mr-2 h-4 w-4" /> Commit Registry
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            
            {/* Sprinkling Modal */}
            <Dialog open={isSprinkleModalOpen} onOpenChange={setIsSprinkleModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Record Sprinkling Cycle</DialogTitle>
                        <DialogDescription>
                            Log water sprinkling activities for dust suppression.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveSprinkle} className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="date" className="text-right">Date</Label>
                            <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="location" className="text-right">Section Covered</Label>
                            <Input id="location" name="location" placeholder="e.g. Ch. 0+000 - 5+000" className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="volume" className="text-right">Volume (Liters)</Label>
                            <Input id="volume" name="volume" type="number" min="0" placeholder="e.g. 5000" className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="operator" className="text-right">Operator</Label>
                            <Input id="operator" name="operator" placeholder="e.g. Ram Bahadur" className="col-span-3" required />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsSprinkleModalOpen(false)}>
                                <X className="mr-2 h-4 w-4" /> Cancel
                            </Button>
                            <Button type="submit">
                                <Save className="mr-2 h-4 w-4" /> Save Cycle
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default EnvironmentModule;

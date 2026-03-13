import React, { useState, useMemo, useTransition } from 'react';
import { 
    Plus, Search, Receipt, FileDiff, X, BarChart4, FileSpreadsheet, Upload,
    Maximize2, Minimize2, AlertTriangle, CheckCircle2, Trash2
} from 'lucide-react';
import { Project, UserRole, AppSettings, BOQItem, VariationOrder, MeasurementSheet, MeasurementSheetEntry } from '../../types';
import * as XLSX from 'xlsx';
import StatCard from '../core/StatCard';
import BOQRegistry from './BOQRegistry';
import { getCurrencySymbol } from '../../utils/formatting/currencyUtils';
import { toast } from 'sonner';

import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Checkbox } from '~/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { Separator } from '~/components/ui/separator';
import { Badge } from '~/components/ui/badge';
import { cn } from '~/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Textarea } from '~/components/ui/textarea';

interface Props {
  project: Project;
  userRole: UserRole;
  settings: AppSettings;
  onProjectUpdate: (project: Project) => void;
}

const BOQModule: React.FC<Props> = ({ project, settings, userRole, onProjectUpdate }) => {
    const [isPending, startTransition] = useTransition();
    const [activeTab, setActiveTab] = useState("registry");
    const [isVOModalOpen, setIsVOModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    
    // State for compact/full view toggle
    const [compactView, setCompactView] = useState(false);
    
    // Auto-MB State
    const [isAutoMBOpen, setIsAutoMBOpen] = useState(false);
    const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
    
    // MB State
    const [isMBModalOpen, setIsMBModalOpen] = useState(false);
    
    // Auto-MB Logic
    const uncertifiedLogs = useMemo(() => {
        const logs: any[] = [];
        (project.structures || []).forEach(structure => {
            structure.components.forEach(comp => {
                if (comp.boqItemId) {
                    (comp.workLogs || []).forEach(log => {
                        // Check if this log is already in an approved/certified MB
                        const alreadyMBed = (project.measurementSheets || []).some(sheet => 
                            sheet.entries.some(entry => (entry as any).workLogId === log.id)
                        );
                        
                        if (!alreadyMBed) {
                            logs.push({
                                ...log,
                                structureName: structure.name,
                                componentName: comp.name,
                                boqItemId: comp.boqItemId
                            });
                        }
                    });
                }
            });
        });
        return logs;
    }, [project.structures, project.measurementSheets]);

    const handleCreateAutoMB = () => {
        if (selectedLogs.length === 0) return;

        const logsToProcess = uncertifiedLogs.filter(l => selectedLogs.includes(l.id));
        
        // Group logs by BOQ Item ID to create combined entries
        const groupedEntries: Record<string, number> = {};
        logsToProcess.forEach(log => {
            groupedEntries[log.boqItemId] = (groupedEntries[log.boqItemId] || 0) + log.quantity;
        });

        const newEntries: MeasurementSheetEntry[] = Object.entries(groupedEntries).map(([boqId, qty]) => {
            const boqItem = project.boq.find(b => b.id === boqId);
            return {
                id: `mbe-${Date.now()}-${boqId}`,
                boqItemId: boqId,
                quantity: qty,
                rate: boqItem?.rate || 0,
                amount: qty * (boqItem?.rate || 0),
                workLogId: logsToProcess.find(l => l.boqItemId === boqId)?.id // Keep track for uncertified check
            } as any;
        });

        const autoSheet: MeasurementSheet = {
            id: `mb-${Date.now()}`,
            sheetNumber: `MB-AUTO-${(project.measurementSheets?.length || 0) + 1}`,
            title: `Auto-Generated from Site Logs (${new Date().toLocaleDateString()})`,
            date: new Date().toISOString().split('T')[0],
            entries: newEntries,
            totalAmount: newEntries.reduce((acc, e) => acc + e.amount, 0),
            status: 'Draft'
        } as any;

        onProjectUpdate({
            ...project,
            measurementSheets: [...(project.measurementSheets || []), autoSheet]
        });

        setIsAutoMBOpen(false);
        setSelectedLogs([]);
        setActiveTab("mb");
        toast.success("Auto-MB Created", { description: "Review and certify the draft in the MB Registry." });
    };

    const [newMB, setNewMB] = useState<Partial<MeasurementSheet>>({
        sheetNumber: `MB-${((project?.measurementSheets || [])?.length || 0) + 1}`,
        title: '',
        date: new Date().toISOString().split('T')[0],
        entries: [],
        status: 'Draft'
    });

    const [tempMBEntry, setTempMBEntry] = useState<Partial<MeasurementSheetEntry>>({
        boqItemId: '',
        quantity: 0,
        rate: 0
    });
    
    const [newVO, setNewVO] = useState<Partial<VariationOrder>>({
        voNumber: `VO-${((project?.variationOrders || [])?.length || 0) + 1}`,
        title: '',
        date: new Date().toISOString().split('T')[0],
        items: [],
        reason: ''
    });

    if (!project) {
        return (
            <div className="p-8 text-center">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>Project data not available. Please select a project first.</AlertDescription>
                </Alert>
            </div>
        );
    }

    const currencySymbol = getCurrencySymbol(settings.currency);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImportFile(file);
        }
    };
    
    const handleImportSubmit = () => {
        if (!importFile) return;
    
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[worksheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
            const importedBoqItems: BOQItem[] = jsonData.map((row: any, index) => {
                const itemNo = row['Item No'] || row['ItemNo'] || row['item_no'] || row['itemNo'] || `ITEM-${index + 1}`;
                const description = row['Description'] || row['description'] || row['Work Description'] || `Item ${index + 1}`;
                const unit = row['Unit'] || row['unit'] || row['Units'] || 'unit';
                const quantity = parseFloat(row['Contract Qty'] || row['Quantity'] || row['quantity'] || row['Qty'] || 0);
                const rate = parseFloat(row['Rate'] || row['rate'] || row['Unit Rate'] || 0);
                const amount = quantity * rate;
                const location = row['Location'] || row['location'] || 'N/A';
                const category = row['Category'] || row['category'] || row['Work Category'] || 'General';
                    
                return {
                    id: `boq-${Date.now()}-${index}`,
                    itemNo: String(itemNo),
                    description: String(description),
                    unit: String(unit),
                    quantity: isNaN(quantity) ? 0 : quantity,
                    rate: isNaN(rate) ? 0 : rate,
                    amount: isNaN(amount) ? 0 : amount,
                    location: String(location),
                    category: String(category),
                    completedQuantity: 0,
                    variationQuantity: 0
                };
            });
    
            onProjectUpdate({ ...project, boq: importedBoqItems });
                
            setImportFile(null);
            setIsImportModalOpen(false);
            toast.success("Import Successful", { description: `Imported ${importedBoqItems.length} items.` });
        };
        reader.readAsArrayBuffer(importFile);
    };

    const handleSaveVO = () => {
        if (!newVO.title || !newVO.items?.length) return;
        const totalImpact = newVO.items.reduce((acc, i) => acc + (i.quantityDelta * i.rate), 0);
        const finalVO: VariationOrder = {
            ...newVO,
            id: `vo-${Date.now()}`,
            status: 'Draft',
            totalImpact
        } as VariationOrder;

        onProjectUpdate({ ...project, variationOrders: [...(project.variationOrders || []), finalVO] });
        setIsVOModalOpen(false);
        setNewVO({
            voNumber: `VO-${(project.variationOrders?.length || 0) + 2}`,
            title: '',
            date: new Date().toISOString().split('T')[0],
            items: [],
            reason: ''
        });
        toast.success("Variation Initialized");
    };

    const handleAddMBEntry = () => {
        if (!tempMBEntry.boqItemId || !tempMBEntry.quantity) return;
        const boqItem = project.boq.find(b => b.id === tempMBEntry.boqItemId);
        if (!boqItem) return;

        const entry: MeasurementSheetEntry = {
            id: `mbe-${Date.now()}`,
            boqItemId: tempMBEntry.boqItemId,
            quantity: Number(tempMBEntry.quantity),
            rate: boqItem.rate,
            amount: Number(tempMBEntry.quantity) * boqItem.rate
        };

        setNewMB(prev => ({ ...prev, entries: [...(prev.entries || []), entry] }));
        setTempMBEntry({ boqItemId: '', quantity: 0, rate: 0 });
    };

    const handleSaveMB = () => {
        if (!newMB.title || !newMB.entries?.length) return;
        const totalAmount = newMB.entries.reduce((acc, e) => acc + e.amount, 0);
        const finalMB: MeasurementSheet = {
            ...newMB,
            id: `mb-${Date.now()}`,
            totalAmount,
            status: 'Approved'
        } as MeasurementSheet;

        onProjectUpdate({ ...project, measurementSheets: [...(project.measurementSheets || []), finalMB] });
        setIsMBModalOpen(false);
        setNewMB({
            sheetNumber: `MB-${(project.measurementSheets?.length || 0) + 2}`,
            title: '',
            date: new Date().toISOString().split('T')[0],
            entries: [],
            status: 'Draft'
        });
        toast.success("MB Entry Saved & Approved");
    };

    const handleCertifyMB = (sheet: MeasurementSheet) => {
        if ((sheet.status as string) === 'Certified') {
            toast.info("This MB record is already certified.");
            return;
        }

        if (window.confirm(`Are you sure you want to certify MB record ${sheet.sheetNumber}? This will update BOQ completed quantities.`)) {
            // 1. Update the MB sheet status
            const updatedSheets = project.measurementSheets.map(s => 
                s.id === sheet.id ? { ...s, status: 'Approved' as any } : s // Changed logic here to fix type error vs status
            );

            // 2. Update BOQ items based on entries in this sheet
            const updatedBoq = [...project.boq];
            sheet.entries.forEach(entry => {
                const boqIdx = updatedBoq.findIndex(b => b.id === entry.boqItemId);
                if (boqIdx !== -1) {
                    updatedBoq[boqIdx] = {
                        ...updatedBoq[boqIdx],
                        completedQuantity: (updatedBoq[boqIdx].completedQuantity || 0) + entry.quantity,
                        status: 'Executing'
                    };
                }
            });

            startTransition(() => {
                onProjectUpdate({ 
                    ...project, 
                    measurementSheets: updatedSheets,
                    boq: updatedBoq
                });
            });
            
            toast.success(`MB Record ${sheet.sheetNumber} certified and BOQ updated.`);
        }
    };

    const financialSummary = useMemo(() => {
        const boqItems = project.boq || [];
        const vatRate = settings?.vatRate || 13;
        
        // --- Original Contract Calculation (a + b + c) ---
        const originalPS = boqItems
            .filter(item => item.unit?.toUpperCase() === 'PS')
            .reduce((acc, item) => acc + (item.quantity * item.rate), 0);
            
        const originalNonPS = boqItems
            .filter(item => item.unit?.toUpperCase() !== 'PS')
            .reduce((acc, item) => acc + (item.quantity * item.rate), 0);
            
        const originalVAT = originalNonPS * (vatRate / 100);
        const originalTotal = originalPS + originalNonPS + originalVAT;

        // --- Revised Contract Calculation (a_rev + b_rev + c_rev) ---
        const revisedPS = boqItems
            .filter(item => item.unit?.toUpperCase() === 'PS')
            .reduce((acc, item) => acc + ((item.quantity + (item.variationQuantity || 0)) * item.rate), 0);
            
        const revisedNonPS = boqItems
            .filter(item => item.unit?.toUpperCase() !== 'PS')
            .reduce((acc, item) => acc + ((item.quantity + (item.variationQuantity || 0)) * item.rate), 0);
            
        const revisedVAT = revisedNonPS * (vatRate / 100);
        const revisedTotal = revisedPS + revisedNonPS + revisedVAT;

        const currentCompletedValue = boqItems.reduce((acc, item) => acc + (item.completedQuantity * item.rate), 0);
        
        return { 
            original: originalTotal, 
            revised: revisedTotal,
            variation: revisedTotal - originalTotal,
            completed: currentCompletedValue, 
            percent: revisedTotal > 0 ? (currentCompletedValue / revisedTotal) * 100 : 0,
            amountWithPS: revisedTotal,
            amountWithoutPS: revisedNonPS,
            provisionalSum: revisedPS,
            vatAmount: revisedVAT,
            totalContractValue: revisedTotal
        };
    }, [project.boq, settings]);

    return (
        <div className="animate-in fade-in duration-500 p-4">
            <div className="flex justify-between mb-4 items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">BOQ & Measurements</h1>
                    <p className="text-sm text-muted-foreground">Contractual rates and actual work progress</p>
                </div>
                <div className="flex gap-2 items-center">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={() => setIsImportModalOpen(true)}>
                                    <Upload className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Import Excel</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={() => setCompactView(!compactView)}>
                                    {compactView ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Toggle View</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="registry"><Receipt className="mr-2 h-4 w-4" /> Registry</TabsTrigger>
                            <TabsTrigger value="mb"><FileSpreadsheet className="mr-2 h-4 w-4" /> MB Registry</TabsTrigger>
                            <TabsTrigger value="variations"><FileDiff className="mr-2 h-4 w-4" /> Variations</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            <div className={cn("grid gap-4 mb-4", compactView ? "grid-cols-2" : "grid-cols-1 md:grid-cols-3")}>
                <StatCard title="Contract Value" value={`${currencySymbol}${(financialSummary.original || 0).toLocaleString()}`} icon={Receipt} color="#4f46e5" />
                <StatCard title="Work Done" value={`${currencySymbol}${(financialSummary.completed || 0).toLocaleString()}`} icon={FileSpreadsheet} color="#10b981" />
                {!compactView && (
                    <StatCard title="Overall Progress" value={`${(financialSummary.percent || 0).toFixed(2)}%`} icon={BarChart4} color="#8b5cf6" />
                )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsContent value="registry">
                    <BOQRegistry project={project} settings={settings} userRole={userRole} onProjectUpdate={onProjectUpdate} compactView={compactView} />
                </TabsContent>
                
                <TabsContent value="mb">
                    <div className="flex justify-between mb-4 items-center">
                        <h2 className="text-xl font-bold">Measurement Book</h2>
                        <div className="flex gap-2">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="secondary" 
                                            onClick={() => setIsAutoMBOpen(true)}
                                            disabled={uncertifiedLogs.length === 0}
                                            className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
                                        >
                                            <TrendingUp className="mr-2 h-4 w-4" /> 
                                            Smart Auto-MB 
                                            <Badge className="ml-2 h-5 min-w-5 bg-primary text-white p-0 flex items-center justify-center rounded-full">
                                                {uncertifiedLogs.length}
                                            </Badge>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Generate MB from Structural logs</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <Button onClick={() => setIsMBModalOpen(true)}><Plus className="mr-2 h-4 w-4" /> New Entry</Button>
                        </div>
                    </div>
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted">
                                        <TableHead>Sheet #</TableHead>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">Value</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(project.measurementSheets || []).length > 0 ? project.measurementSheets.map(sheet => (
                                        <TableRow key={sheet.id}>
                                            <TableCell className="font-bold">{sheet.sheetNumber}</TableCell>
                                            <TableCell>{sheet.title}</TableCell>
                                            <TableCell>{sheet.date}</TableCell>
                                            <TableCell className="text-right font-bold">{sheet.totalAmount.toLocaleString()}</TableCell>
                                            <TableCell className="text-center"><Badge variant={(sheet.status as string) === 'Certified' ? 'success' : 'default' as any}>{sheet.status}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    {(sheet.status as string) !== 'Certified' && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="icon" onClick={() => handleCertifyMB(sheet)}>
                                                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Certify & Update BOQ</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                    <Button variant="ghost" size="icon" onClick={() => {
                                                        const updated = (project.measurementSheets || []).filter(s => s.id !== sheet.id);
                                                        onProjectUpdate({ ...project, measurementSheets: updated });
                                                    }}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={6} className="text-center py-10">No records found.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="variations">
                    <div className="flex justify-between mb-4 items-center">
                        <h2 className="text-xl font-bold">Variations</h2>
                        <Button onClick={() => setIsVOModalOpen(true)}><Plus className="mr-2 h-4 w-4" /> New VO</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(project.variationOrders || []).map(vo => (
                            <Card key={vo.id}>
                                <CardContent className="p-4">
                                    <div className="flex justify-between mb-2">
                                        <p className="font-bold">{vo.title}</p>
                                        <Badge>{vo.status}</Badge>
                                    </div>
                                    <p className="text-lg font-black text-primary">{currencySymbol}{vo.totalImpact.toLocaleString()}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Modals */}
            <Dialog open={isMBModalOpen} onOpenChange={setIsMBModalOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="text-primary" /> New Measurement Record</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input value={newMB.title || ''} onChange={e => setNewMB({...newMB, title: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Input type="date" value={newMB.date} onChange={e => setNewMB({...newMB, date: e.target.value})} />
                            </div>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-12 gap-2 items-end">
                            <div className="col-span-7 space-y-2">
                                <Label>BOQ Item</Label>
                                <Select value={tempMBEntry.boqItemId} onValueChange={v => setTempMBEntry({...tempMBEntry, boqItemId: v})}>
                                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                    <SelectContent>
                                        {project.boq.map(item => <SelectItem key={item.id} value={item.id}>{item.itemNo}: {item.description.substring(0, 40)}...</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-3 space-y-2">
                                <Label>Qty</Label>
                                <Input type="number" value={tempMBEntry.quantity || ''} onChange={e => setTempMBEntry({...tempMBEntry, quantity: Number(e.target.value)})} />
                            </div>
                            <Button className="col-span-2" variant="secondary" onClick={handleAddMBEntry}>Add</Button>
                        </div>
                        <div className="border rounded-md max-h-[200px] overflow-auto">
                            <Table>
                                <TableBody>
                                    {newMB.entries?.map((e, i) => (
                                        <TableRow key={e.id}>
                                            <TableCell className="text-xs">{project.boq.find(b => b.id === e.boqItemId)?.itemNo}</TableCell>
                                            <TableCell className="text-right font-bold">{e.quantity}</TableCell>
                                            <TableCell className="text-right"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setNewMB({...newMB, entries: newMB.entries?.filter((_, idx) => idx !== i)})}><X size={12} /></Button></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSaveMB} disabled={!newMB.entries?.length}>Save & Approve</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isVOModalOpen} onOpenChange={setIsVOModalOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader><DialogTitle>Initialize Variation</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="vo-title">VO Title</Label>
                            <Input id="vo-title" placeholder="VO Title" value={newVO.title || ''} onChange={e => setNewVO({...newVO, title: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="vo-reason">Reason</Label>
                            <Textarea id="vo-reason" placeholder="Reason" value={newVO.reason || ''} onChange={e => setNewVO({...newVO, reason: e.target.value})} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSaveVO}>Save Variation</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Import BOQ</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="import-boq-file">Select Excel/CSV File</Label>
                            <Input id="import-boq-file" type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleImportSubmit} disabled={!importFile}>Import</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Auto-MB Generator Dialog */}
            <Dialog open={isAutoMBOpen} onOpenChange={setIsAutoMBOpen}>
                <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col p-0">
                    <DialogHeader className="p-6 border-b">
                        <DialogTitle className="flex items-center gap-2">
                            <TrendingUp className="text-primary" /> 
                            Smart Auto-MB Generator
                        </DialogTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                            The following work logs have been recorded in structural assets but haven't been added to a Measurement Sheet yet.
                        </p>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-auto p-6">
                        {uncertifiedLogs.length === 0 ? (
                            <div className="text-center py-12 opacity-50">
                                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
                                <p className="font-bold">All structural work logs are already accounted for.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="w-[50px]">
                                            <div className="flex items-center">
                                                <Checkbox 
                                                    id="select-all-logs"
                                                    checked={selectedLogs.length === uncertifiedLogs.length}
                                                    onCheckedChange={(checked) => setSelectedLogs(checked ? uncertifiedLogs.map(l => l.id) : [])}
                                                    aria-label="Select all logs"
                                                    title="Select all logs"
                                                />
                                                <Label htmlFor="select-all-logs" className="sr-only">Select all logs</Label>
                                            </div>
                                        </TableHead>
                                        <TableHead>Asset / Component</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>BOQ Item</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {uncertifiedLogs.map((log) => {
                                        const boqItem = project.boq.find(b => b.id === log.boqItemId);
                                        return (
                                            <TableRow key={log.id} className="group">
                                                <TableCell>
                                                    <div className="flex items-center">
                                                        <Checkbox 
                                                            id={`select-log-${log.id}`}
                                                            checked={selectedLogs.includes(log.id)}
                                                            onCheckedChange={(checked) => setSelectedLogs(prev => 
                                                                checked ? [...prev, log.id] : prev.filter(id => id !== log.id)
                                                            )}
                                                            aria-label={`Select log for ${log.structureName} ${log.componentName}`}
                                                            title={`Select log for ${log.structureName} ${log.componentName}`}
                                                        />
                                                        <Label htmlFor={`select-log-${log.id}`} className="sr-only">
                                                            Select log for {log.structureName} {log.componentName}
                                                        </Label>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-xs font-bold">{log.structureName}</div>
                                                    <div className="text-[10px] text-muted-foreground">{log.componentName}</div>
                                                </TableCell>
                                                <TableCell className="text-xs">{log.date}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-[9px] font-mono">
                                                        {boqItem?.itemNo}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-black text-xs">
                                                    {log.quantity}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    <DialogFooter className="p-6 border-t bg-muted/10">
                        <Button variant="ghost" onClick={() => setIsAutoMBOpen(false)}>Cancel</Button>
                        <Button 
                            onClick={handleCreateAutoMB} 
                            disabled={selectedLogs.length === 0}
                            className="bg-primary text-white font-black"
                        >
                            Generate Measurement Sheet ({selectedLogs.length} Logs)
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BOQModule;

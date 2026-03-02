import React, { useState, useMemo, ChangeEvent } from 'react';
import { 
    Plus, Search, Receipt, FileDiff, Save, X, BarChart4, FileSpreadsheet, Upload,
    Maximize2, Minimize2, Users, CreditCard, DollarSign, TrendingUp, AlertTriangle, CheckCircle, Trash2
} from 'lucide-react';
import { Project, UserRole, AppSettings, BOQItem, VariationOrder, VariationItem, MeasurementSheet, MeasurementSheetEntry } from '../../types';
import * as XLSX from 'xlsx';
import StatCard from '../core/StatCard';
import BOQManager from './BOQManager';
import { getCurrencySymbol } from '../../utils/formatting/currencyUtils';
import { toast } from 'sonner';

import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
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
    const [activeTab, setActiveTab] = useState("registry");
    const [isVOModalOpen, setIsVOModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importMethod, setImportMethod] = useState<'replace' | 'append'>('replace');
    
    // State for compact/full view toggle
    const [compactView, setCompactView] = useState(false);
    
    // MB State
    const [isMBModalOpen, setIsMBModalOpen] = useState(false);
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

    const [tempVOItem, setTempVOItem] = useState<Partial<VariationItem>>({
        description: '', unit: '', quantityDelta: 0, rate: 0, isNewItem: false
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

    const handleExportCSV = () => {
        const headers = ["Item No", "Description", "Unit", "Contract Qty", "Rate", "Completed Qty", "Total Value"];
        const rows = (project?.boq || []).map(item => [
            item.itemNo,
            `"${item.description.replace(/"/g, '"')}"`,
            item.unit,
            item.quantity,
            item.rate,
            item.completedQuantity,
            item.quantity * item.rate
        ]);
            
        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n" 
            + rows.map(e => e.join(",")).join("\n");
                
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `BOQ_Ledger_${project.code}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
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
    
            if (importMethod === 'replace') {
                onProjectUpdate({ ...project, boq: importedBoqItems });
            } else {
                onProjectUpdate({ ...project, boq: [...project.boq, ...importedBoqItems] });
            }
                
            setImportFile(null);
            setIsImportModalOpen(false);
            toast.success("Import Successful", { description: `Imported ${importedBoqItems.length} items.` });
        };
        reader.readAsArrayBuffer(importFile);
    };

    const handleAddVOItem = () => {
        if (!tempVOItem.description || !tempVOItem.quantityDelta) return;
        const item: VariationItem = {
            id: `voi-${Date.now()}`,
            description: tempVOItem.description,
            unit: tempVOItem.unit || 'unit',
            quantityDelta: Number(tempVOItem.quantityDelta),
            rate: Number(tempVOItem.rate),
            isNewItem: !!tempVOItem.isNewItem,
            boqItemId: tempVOItem.boqItemId
        };
        setNewVO(prev => ({ ...prev, items: [...(prev.items || []), item] }));
        setTempVOItem({ description: '', unit: '', quantityDelta: 0, rate: 0, isNewItem: false });
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

    const financialSummary = useMemo(() => {
        const boqItems = project.boq || [];
        
        // a = Sum of Ps(units)
        const provisionalSum = boqItems
            .filter(item => item.unit?.toUpperCase() === 'PS')
            .reduce((acc, item) => acc + (item.quantity * item.rate), 0);
            
        // b = Sum other than ps(unit)
        const amountWithoutPS = boqItems
            .filter(item => item.unit?.toUpperCase() !== 'PS')
            .reduce((acc, item) => acc + (item.quantity * item.rate), 0);
            
        // c = vat * sum other than ps
        const vatRate = settings?.vatRate || 13;
        const vatAmount = amountWithoutPS * (vatRate / 100);
        
        // contract value = a + b + c
        const totalContractValue = provisionalSum + amountWithoutPS + vatAmount;
        const currentCompletedValue = boqItems.reduce((acc, item) => acc + (item.completedQuantity * item.rate), 0);
        
        return { 
            original: totalContractValue, 
            completed: currentCompletedValue, 
            percent: totalContractValue > 0 ? (currentCompletedValue / totalContractValue) * 100 : 0,
            amountWithPS: totalContractValue,
            amountWithoutPS: amountWithoutPS,
            provisionalSum: provisionalSum,
            vatAmount: vatAmount,
            totalContractValue: totalContractValue
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
                    <StatCard title="Overall Progress" value={`${(financialSummary.percent || 0).toFixed(1)}%`} icon={BarChart4} color="#8b5cf6" />
                )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsContent value="registry">
                    <BOQManager project={project} settings={settings} userRole={userRole} onProjectUpdate={onProjectUpdate} compactView={compactView} />
                </TabsContent>
                
                <TabsContent value="mb">
                    <div className="flex justify-between mb-4 items-center">
                        <h2 className="text-xl font-bold">Measurement Book</h2>
                        <Button onClick={() => setIsMBModalOpen(true)}><Plus className="mr-2 h-4 w-4" /> New Entry</Button>
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
                                            <TableCell className="text-center"><Badge variant="default">{sheet.status}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => {
                                                    const updated = (project.measurementSheets || []).filter(s => s.id !== sheet.id);
                                                    onProjectUpdate({ ...project, measurementSheets: updated });
                                                }}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
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
                        <Input placeholder="VO Title" value={newVO.title || ''} onChange={e => setNewVO({...newVO, title: e.target.value})} />
                        <Textarea placeholder="Reason" value={newVO.reason || ''} onChange={e => setNewVO({...newVO, reason: e.target.value})} />
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
                        <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
                    </div>
                    <DialogFooter>
                        <Button onClick={handleImportSubmit} disabled={!importFile}>Import</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BOQModule;

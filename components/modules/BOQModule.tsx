import React, { useState, useMemo, ChangeEvent } from 'react';
import { 
    Plus, Search, Receipt, FileDiff, Save, X, BarChart4, FileSpreadsheet, Upload,
    Maximize2, Minimize2, Users, CreditCard, DollarSign, TrendingUp, AlertTriangle, CheckCircle
} from 'lucide-react';
import { Project, UserRole, AppSettings, BOQItem, VariationOrder, VariationItem } from '../../types';
import * as XLSX from 'xlsx';
import StatCard from '../core/StatCard';
import BOQManager from './BOQManager';
import { formatCurrency } from '../../utils/formatting/exportUtils';
import { getCurrencySymbol } from '../../utils/formatting/currencyUtils';

import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
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
import { cn } from '~/lib/utils';
import { Textarea } from '~/components/ui/textarea';

// NOTE: This is a refactored version of the BOQModule component.
// The original logic has been temporarily removed to facilitate the UI migration.
// It will be re-implemented in subsequent steps.

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
    
    const [tempVOItem, setTempVOItem] = useState<Partial<VariationItem>>({
        description: '', unit: '', quantityDelta: 0, rate: 0, isNewItem: false
    });

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
                
            // Get the first worksheet
            const worksheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[worksheetName];
                
            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
            // Process the data to match BOQItem structure
            const importedBoqItems: BOQItem[] = jsonData.map((row: any, index) => {
                // Handle various possible column names
                const itemNo = row['Item No'] || row['ItemNo'] || row['item_no'] || row['itemNo'] || `ITEM-${index + 1}`;
                const description = row['Description'] || row['description'] || row['Work Description'] || `Item ${index + 1}`;
                const unit = row['Unit'] || row['unit'] || row['Units'] || 'unit';
                const quantity = parseFloat(row['Contract Qty'] || row['Quantity'] || row['quantity'] || row['Qty'] || 0);
                const rate = parseFloat(row['Rate'] || row['rate'] || row['Unit Rate'] || 0);
                const amount = quantity * rate; // Calculate amount
                const location = row['Location'] || row['location'] || 'N/A'; // Default location
                const category = row['Category'] || row['category'] || row['Work Category'] || 'General';
                    
                return {
                    id: `boq-${Date.now()}-${index}`,
                    itemNo: typeof itemNo === 'string' ? itemNo : String(itemNo),
                    description: typeof description === 'string' ? description : String(description),
                    unit: typeof unit === 'string' ? unit : String(unit),
                    quantity: isNaN(quantity) ? 0 : quantity,
                    rate: isNaN(rate) ? 0 : rate,
                    amount: isNaN(amount) ? 0 : amount,
                    location: typeof location === 'string' ? location : String(location),
                    category: typeof category === 'string' ? category : String(category),
                    completedQuantity: 0,
                    variationQuantity: 0
                };
            });
    
            if (importMethod === 'replace') {
                // Replace the entire BOQ
                onProjectUpdate({
                    ...project,
                    boq: importedBoqItems
                });
            } else {
                // Append to existing BOQ
                onProjectUpdate({
                    ...project,
                    boq: [...project.boq, ...importedBoqItems]
                });
            }
                
            // Reset and close modal
            setImportFile(null);
            setIsImportModalOpen(false);
            alert(`Successfully imported ${importedBoqItems.length} items from Excel file.`);
        };
            
        reader.onerror = () => {
            alert('Error reading Excel file. Please try again.');
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

        onProjectUpdate({
            ...project,
            variationOrders: [...(project.variationOrders || []), finalVO]
        });
        
        setIsVOModalOpen(false);
        setNewVO({
            voNumber: `VO-${(project.variationOrders?.length || 0) + 2}`,
            title: '',
            date: new Date().toISOString().split('T')[0],
            items: [],
            reason: ''
        });
    };

    const financialSummary = useMemo(() => {
        const boqItems = project.boq || [];
        const originalValue = boqItems.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
        const currentCompletedValue = boqItems.reduce((acc, item) => acc + (item.completedQuantity * item.rate), 0);
        
        // Calculate breakdown of Original Contract Value
        // Assuming 0 for provisional sum and CPA initially, these could come from project settings
        const provisionalSum = 0; // This would typically come from project settings
        const cpaAmount = 0; // This would typically come from project settings
        
        const amountWithoutPS = originalValue - provisionalSum;
        const vatRate = settings?.vatRate || 13; // Default to 13% if not specified
        const vatAmount = amountWithoutPS * (vatRate / 100);
        const totalContractValue = amountWithoutPS + vatAmount + provisionalSum;
        
        return { 
            original: originalValue, 
            completed: currentCompletedValue, 
            percent: originalValue > 0 ? (currentCompletedValue / originalValue) * 100 : 0,
            amountWithPS: originalValue,
            amountWithoutPS: amountWithoutPS,
            vatAmount: vatAmount,
            totalContractValue: totalContractValue,
            provisionalSum: provisionalSum,
            cpaAmount: cpaAmount
        };
    }, [project.boq, settings]);

    return (
        <div className="animate-in fade-in duration-500 p-4">
            <div className="flex justify-between mb-4 items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Bill of Quantities (Master)</h1>
                    <p className="text-sm text-muted-foreground">Contractual schedule of rates and quantities</p>
                </div>
                <div className="flex gap-2 items-center">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={() => setIsImportModalOpen(true)}>
                                    <Upload className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Import from Excel</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={handleExportCSV}>
                                    <FileSpreadsheet className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Export to Sheets/Excel</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={() => setCompactView(!compactView)}>
                                    {compactView ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{compactView ? "Expand View" : "Compact View"}</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="registry">
                                <Receipt className="mr-2 h-4 w-4" /> Registry
                            </TabsTrigger>
                            <TabsTrigger value="variations">
                                <FileDiff className="mr-2 h-4 w-4" /> Variations
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            {/* Contract Value Breakdown Section */}
            <div className={cn("grid gap-4 mb-4", compactView ? "grid-cols-2" : "grid-cols-1 md:grid-cols-3")}>
                <StatCard title="Original Contract Value" value={`${currencySymbol}${financialSummary.original.toLocaleString()}`} icon={Receipt} color="#4f46e5" />
                <StatCard title="Value of Work Done" value={`${currencySymbol}${financialSummary.completed.toLocaleString()}`} icon={FileSpreadsheet} color="#10b981" />
                {!compactView && (
                    <StatCard title="Overall Financial Progress" value={`${financialSummary.percent.toFixed(1)}%`} icon={BarChart4} color="#8b5cf6" />
                )}
            </div>
            
            {/* Detailed Contract Value Breakdown */}
            <Card className="mb-4 bg-muted border-slate-200">
                <CardHeader className="flex flex-row justify-between items-center pb-2">
                    <CardTitle className={cn("text-lg font-bold text-primary", compactView && "text-base")}>Contract Value Breakdown</CardTitle>
                    <Badge variant={compactView ? "secondary" : "default"}>{compactView ? "COMPACT" : "FULL"}</Badge>
                </CardHeader>
                <CardContent>
                    <div className={cn("grid gap-4", compactView ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-4")}>
                        <div className="text-center p-2 rounded-lg bg-white border border-slate-200">
                            <p className="text-sm text-muted-foreground">Amount With PS</p>
                            <p className={cn("font-bold text-primary", compactView ? "text-base" : "text-lg")}>
                                {currencySymbol}{financialSummary.amountWithPS.toLocaleString()}
                            </p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-white border border-slate-200">
                            <p className="text-sm text-muted-foreground">Amount Without PS</p>
                            <p className={cn("font-bold text-blue-600", compactView ? "text-base" : "text-lg")}>
                                {currencySymbol}{financialSummary.amountWithoutPS.toLocaleString()}
                            </p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-white border border-slate-200">
                            <p className="text-sm text-muted-foreground">VAT (@{settings?.vatRate || 13}%)</p>
                            <p className={cn("font-bold text-red-600", compactView ? "text-base" : "text-lg")}>
                                {currencySymbol}{financialSummary.vatAmount.toLocaleString()}
                            </p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-primary text-white">
                            <p className="text-sm opacity-80">Total Contract Value</p>
                            <p className={cn("font-bold", compactView ? "text-base" : "text-lg")}>
                                {currencySymbol}{financialSummary.totalContractValue.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsContent value="registry">
                    <BOQManager project={project} settings={settings} userRole={userRole} onProjectUpdate={onProjectUpdate} compactView={compactView} />
                </TabsContent>
                <TabsContent value="variations">
                    <div className="flex justify-between mb-4 items-center">
                        <h2 className="text-xl font-bold">Variation History</h2>
                        <Button onClick={() => setIsVOModalOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" /> Initialize VO
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Placeholder variation orders */}
                        {project.variationOrders?.length > 0 ? project.variationOrders.map(vo => (
                            <Card key={vo.id} className="relative transition-transform hover:-translate-y-1">
                                <CardContent className="p-4">
                                    <div className="flex justify-between mb-2">
                                        <div>
                                            <p className="text-xs font-bold text-primary">{vo.voNumber}</p>
                                            <p className="text-lg font-bold">{vo.title}</p>
                                        </div>
                                        <Badge variant={vo.status === 'Approved' ? 'default' : 'secondary'}>{vo.status}</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{vo.reason}</p>
                                    <Separator className="my-2" />
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs font-bold text-muted-foreground">{vo.items.length} Affected Items</p>
                                        <p className="text-lg font-black text-primary">
                                            {currencySymbol}{vo.totalImpact.toLocaleString()}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )) : (
                            <div className="col-span-full py-10 text-center border-2 border-dashed border-slate-200 rounded-lg text-muted-foreground">
                                <FileDiff className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p className="text-muted-foreground">No variation orders recorded for this project.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* BILL MODAL (repurposed for VO in simplified view) */}
            <Dialog open={isVOModalOpen} onOpenChange={setIsVOModalOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Receipt className="text-primary" /> Initialize Variation Order
                        </DialogTitle>
                        <DialogDescription>
                            Define the details for a new variation order.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="voTitle" className="text-right">VO Title</Label>
                            <Input id="voTitle" value={newVO.title || ''} onChange={e => setNewVO({...newVO, title: e.target.value})} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="voRef" className="text-right">VO Ref #</Label>
                            <Input id="voRef" value={newVO.voNumber || ''} disabled className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="voReason" className="text-right">Reason</Label>
                            <Textarea id="voReason" value={newVO.reason || ''} onChange={e => setNewVO({...newVO, reason: e.target.value})} className="col-span-3" rows={3} />
                        </div>

                        <Separator />
                        <h3 className="text-lg font-semibold col-span-full">Staging Work Items</h3>
                        
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="boqItem" className="text-right">Existing BOQ Item</Label>
                            {/* Autocomplete placeholder */}
                            <Input id="boqItem" placeholder="Search BOQ items..." className="col-span-3" />
                        </div>
                        <div className="col-span-full text-center text-muted-foreground">OR</div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="newVOItemDesc" className="text-right">New Item Description</Label>
                            <Input id="newVOItemDesc" value={tempVOItem.description || ''} onChange={e => setTempVOItem({...tempVOItem, description: e.target.value})} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="qtyDelta" className="text-right">Delta Qty</Label>
                            <Input id="qtyDelta" type="number" value={tempVOItem.quantityDelta || 0} onChange={e => setTempVOItem({...tempVOItem, quantityDelta: Number(e.target.value)})} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="unit" className="text-right">Unit</Label>
                            <Input id="unit" value={tempVOItem.unit || ''} onChange={e => setTempVOItem({...tempVOItem, unit: e.target.value})} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="rate" className="text-right">Rate</Label>
                            <Input id="rate" type="number" value={tempVOItem.rate || 0} onChange={e => setTempVOItem({...tempVOItem, rate: Number(e.target.value)})} className="col-span-3" />
                        </div>
                        <div className="col-span-full">
                            <Button className="w-full" onClick={handleAddVOItem}>
                                <Plus className="mr-2 h-4 w-4" /> Stage Item
                            </Button>
                        </div>

                        <h3 className="text-lg font-semibold col-span-full mt-4">Staged Items</h3>
                        {newVO.items?.length === 0 ? (
                            <p className="col-span-full text-muted-foreground text-center">No items staged yet.</p>
                        ) : (
                            <div className="grid gap-2 col-span-full">
                                {newVO.items?.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 border rounded-md">
                                        <div>
                                            <p className="font-semibold">{item.description}</p>
                                            <p className="text-sm text-muted-foreground">{item.quantityDelta} {item.unit} @ {currencySymbol}{item.rate}</p>
                                        </div>
                                        <p className="font-bold text-primary">
                                            {currencySymbol}{(item.quantityDelta * item.rate).toLocaleString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsVOModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveVO}>
                            <Save className="mr-2 h-4 w-4" /> Commit Draft VO
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Import BOQ Modal */}
            <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Import BOQ from Excel</DialogTitle>
                        <DialogDescription>
                            Upload an Excel file containing BOQ items.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            The file should have columns with headers like: <br />
                            <code>Item No, Description, Unit, Contract Qty, Rate, Category</code>
                        </p>
                        <div className="grid gap-2">
                            <Label htmlFor="import-method">Import Method</Label>
                            <Select value={importMethod} onValueChange={(value: 'replace' | 'append') => setImportMethod(value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select import method" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="replace">Replace Existing BOQ</SelectItem>
                                    <SelectItem value="append">Append to Existing BOQ</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="import-file">Select File</Label>
                            <Input id="import-file" type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
                        </div>
                        {importFile && (
                            <div className="p-2 border border-dashed rounded-md bg-muted text-muted-foreground">
                                <p className="font-semibold">Selected File:</p>
                                <p className="text-sm">{importFile.name}</p>
                                <p className="text-xs">Size: {(importFile.size / 1024).toFixed(2)} KB</p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleImportSubmit} disabled={!importFile}>
                            <Upload className="mr-2 h-4 w-4" /> Import Excel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BOQModule;

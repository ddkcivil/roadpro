import React, { useState, useMemo, startTransition } from 'react';
import { 
    Plus, TrendingUp, Receipt, FileDiff, X, BarChart4, FileSpreadsheet, Upload,
    Maximize2, Minimize2, AlertTriangle, CheckCircle2, Trash2, Pencil
} from 'lucide-react';
import { Project, UserRole, AppSettings, BOQItem, VariationOrder, MeasurementSheet, MeasurementSheetEntry, BOQ_CATEGORIES, normalizeBOQCategory } from '../../types';
import * as XLSX from 'xlsx';
import StatCard from '../core/StatCard';
import BOQRegistry from './BOQRegistry';
import { getCurrencySymbol, formatCurrency } from '../../utils/formatting/currencyUtils';
import { toast } from 'sonner';

import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
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
    const [activeTab, setActiveTab] = useState("registry");
    const [isVOModalOpen, setIsVOModalOpen] = useState(false);
    const [isContractValueModalOpen, setIsContractValueModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);

    const canEdit = [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER].includes(userRole);
    const canDelete = [UserRole.ADMIN, UserRole.PROJECT_MANAGER].includes(userRole);
    
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
        if (!project) return logs;
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
    }, [project?.structures, project?.measurementSheets]);

    const handleCreateAutoMB = () => {
        if (selectedLogs.length === 0) return;

        const logsToProcess = uncertifiedLogs.filter(log => selectedLogs.includes(log.id));

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

    // Financial summary hook moved ABOVE the early return to follow Rules of Hooks
    const financialSummary = useMemo(() => {
        const boq = project?.boq || [];
        const totalPS = boq.filter(item => item.unit?.trim().toUpperCase() === 'PS').reduce((acc, item) => acc + item.amount, 0);
        const totalWithoutPS = boq.filter(item => item.unit?.trim().toUpperCase() !== 'PS').reduce((acc, item) => acc + item.amount, 0);
        
        const vatRate = settings.vatRate || 13;
        const vatAmount = (vatRate / 100) * totalWithoutPS;
        
        const original = totalPS + totalWithoutPS;
        const contractValueWithVAT = totalPS + totalWithoutPS + vatAmount;
        
        const completed = boq.reduce((acc, item) => acc + ((item.completedQuantity || 0) * item.rate), 0);
        const percent = original > 0 ? (completed / original) * 100 : 0;
        
        return { 
            original, 
            totalPS, 
            totalWithoutPS, 
            vatAmount, 
            vatRate,
            contractValueWithVAT,
            completed, 
            percent 
        };
    }, [project?.boq, settings.vatRate]);

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
    
// Helper function to find value from row with multiple column name variations
    const getRowValue = (row: any, ...columnNames: string[]): any => {
        const rowKeys = Object.keys(row);
        const normalizedTargets = columnNames.map(n => n.toLowerCase().trim());

        for (const key of rowKeys) {
            const normalizedKey = key.toLowerCase().trim();
            if (normalizedTargets.includes(normalizedKey)) {
                const val = row[key];
                if (val !== undefined && val !== null && val !== '') {
                    return val;
                }
            }
        }
        return undefined;
    };

    // Helper to safely parse quantity/rate from various formats
    const parseNumericValue = (value: any): number => {
        if (value === undefined || value === null || value === '') return 0;
        if (typeof value === 'number') return isNaN(value) ? 0 : value;
        if (typeof value === 'string') {
            let cleaned = value.trim();
            // Handle accounting negative format: (100.00) -> -100.00
            if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
                cleaned = '-' + cleaned.substring(1, cleaned.length - 1);
            }
            // Remove any currency symbols, thousands separators (commas), and spaces
            // We keep digits, decimal points, and minus signs
            cleaned = cleaned.replace(/[^\d.-]/g, '');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    };

    const handleImportSubmit = () => {
        if (!importFile) return;

        if (!canEdit) {
            toast.error("Unauthorized", { description: "You don't have permission to import BOQ data." });
            return;
        }
    
        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[worksheetName];
            
            // 1. Detect the actual header row by searching for keywords in the first few rows
            const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
            let headerRowIndex = 0;
            const headerKeywords = ['description', 'item', 'qty', 'quantity', 'rate', 'unit', 'particulars'];
            
            // Scan the first 20 rows to find a row that looks like a header
            for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
                const row = rawRows[i];
                if (!row || !Array.isArray(row)) continue;
                
                const matchCount = row.filter(cell => 
                    cell && typeof cell === 'string' && 
                    headerKeywords.some(keyword => cell.toLowerCase().trim().includes(keyword))
                ).length;
                
                // If we find a row where at least 3 cells match our keywords, use it as the header
                if (matchCount >= 3) {
                    headerRowIndex = i;
                    break;
                }
            }

            // 2. Re-parse the sheet starting from the detected header row
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex });
            
            if (!jsonData || jsonData.length === 0) {
                toast.error("Import Failed", { description: "No data found in the file." });
                return;
            }
                
            const importedBoqItems: BOQItem[] = [];
            const failedRows: number[] = [];
            
            // Get all column headers from first row to help debug
            const firstRow = jsonData[0] as any;
            const availableColumns = Object.keys(firstRow);
            console.log('Available columns in import file:', availableColumns);
            
            jsonData.forEach((row: any, index) => {
                // Try multiple column name variations for each field
                const itemNo = getRowValue(row, 'Item No', 'ItemNo', 'item_no', 'ITEM NO', 'Item Number', 'No.');
                const description = getRowValue(row, 'Description', 'description', 'Work Description', 'Item Description', 'DESC', 'Particulars');
                const unit = getRowValue(row, 'Unit', 'unit', 'Units', 'UNIT', 'UOM');
                
                // Extended quantity column variations
                const quantityRaw = getRowValue(row, 'Contract Qty', 'Contract Quantity', 'Quantity', 'quantity', 'Qty', 'QTY', 'Ordered Qty', 'Bill Qty', 'BOQ Qty', 'Original Qty');
                const quantity = parseNumericValue(quantityRaw);
                
                // Extended rate column variations
                const rateRaw = getRowValue(row, 'Rate', 'rate', 'Unit Rate', 'UNIT RATE', 'Basic Rate', 'Unit Price', 'Price', 'Contract Rate', 'Rate per Unit', 'uRate');
                const rate = parseNumericValue(rateRaw);
                
                const location = getRowValue(row, 'Location', 'location', 'Chainage', 'CHA');
                const category = getRowValue(row, 'Category', 'category', 'Work Category', 'Section', 'Type');
                
                // Validate that we got meaningful data
                if (!description || (quantity === 0 && rate === 0)) {
                    failedRows.push(index + 1);
                    console.warn(`Row ${index + 1} skipped:`, { description, quantity, rate, unit });
                    return; // Skip this row
                }
                
const amount = quantity * rate;
                // Normalize category to predefined list
                const normalizedCategory = normalizeBOQCategory(category);
                    
                importedBoqItems.push({
                    id: `boq-${Date.now()}-${index}`,
                    itemNo: String(itemNo || `ITEM-${index + 1}`),
                    description: String(description || `Item ${index + 1}`),
                    unit: String(unit || 'unit'),
                    quantity,
                    rate,
                    amount,
                    location: String(location || 'N/A'),
                    category: normalizedCategory,
                    completedQuantity: 0,
                    variationQuantity: 0
                });
            });
    
            // Check results and update
            if (importedBoqItems.length === 0) {
                toast.error("Import Failed", { 
                    description: `No valid BOQ items found. Available columns: ${availableColumns.join(', ')}. Please check your file format.`
                });
                return;
            }
    
            console.log('[BOQ IMPORT] About to call onProjectUpdate with:', {
                projectId: project.id,
                boqItemsCount: importedBoqItems.length,
                boqItems: importedBoqItems,
                timestamp: new Date().toISOString()
            });

            // CRITICAL: Await the save to complete before closing modal
            // Otherwise the browser might close before the async save finishes!
            try {
                console.log('[BOQ IMPORT] Awaiting onProjectUpdate to complete...');
                await onProjectUpdate({ ...project, boq: importedBoqItems });
                console.log('[BOQ IMPORT] onProjectUpdate completed successfully!');
            } catch (error) {
                console.error('[BOQ IMPORT] onProjectUpdate failed:', error);
                toast.error("Save Failed", { 
                    description: `Failed to save imported BOQ items. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
                });
                setImportFile(null);
                return;
            }
            
            setImportFile(null);
            setIsImportModalOpen(false);
            
            // Show appropriate toast based on results
            if (failedRows.length > 0) {
                toast.success("Import Completed", { 
                    description: `Imported ${importedBoqItems.length} items. ${failedRows.length} rows skipped (missing quantity/rate or description).`
                });
            } else {
                toast.success("Import Successful", { description: `Imported ${importedBoqItems.length} items.` });
            }
        };
        
        reader.onerror = () => {
            toast.error("Import Failed", { description: "Error reading file. Please try again." });
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

        // Duplicate Check
        if (newMB.entries?.some(e => e.boqItemId === tempMBEntry.boqItemId)) {
            toast.error("Duplicate Item", { description: "This item is already added to the measurement sheet. Please edit the existing entry instead." });
            return;
        }

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
            id: newMB.id || `mb-${Date.now()}`,
            totalAmount,
            status: newMB.status === 'Draft' ? 'Draft' : 'Approved'
        } as MeasurementSheet;

        let updatedSheets;
        if (newMB.id) {
            updatedSheets = (project.measurementSheets || []).map(s => s.id === newMB.id ? finalMB : s);
        } else {
            updatedSheets = [...(project.measurementSheets || []), finalMB];
        }

        onProjectUpdate({ ...project, measurementSheets: updatedSheets });
        setIsMBModalOpen(false);
        setNewMB({
            sheetNumber: `MB-${(project.measurementSheets?.length || 0) + 1}`,
            title: '',
            date: new Date().toISOString().split('T')[0],
            entries: [],
            status: 'Draft'
        });
        toast.success(newMB.id ? "MB Record Updated" : "MB Entry Saved & Approved");
    };

    const handleEditMB = (sheet: MeasurementSheet) => {
        setNewMB(sheet);
        setIsMBModalOpen(true);
    };

    const handleCertifyMB = (sheet: MeasurementSheet) => {
        if (!canEdit) {
            toast.error("Unauthorized", { description: "You don't have permission to certify MB records." });
            return;
        }

        if ((sheet.status as string) === 'Certified') {
            toast.info("This MB record is already certified.");
            return;
        }

        if (window.confirm(`Are you sure you want to certify MB record ${sheet.sheetNumber}? This will update BOQ completed quantities.`)) {
            // 1. Update the MB sheet status
             const updatedSheets = project.measurementSheets.map(s => 
                 s.id === sheet.id ? { ...s, status: 'Certified' as any } : s
             );

            // 2. Update BOQ items based on entries in this sheet
            const updatedBoq = [...project.boq];
            (sheet.entries || []).forEach(entry => {
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
                <StatCard 
                    title="Contract Value" 
                    value={`${currencySymbol}${(financialSummary.contractValueWithVAT || 0).toLocaleString()}`} 
                    icon={Receipt} 
                    color="primary" 
                    onClick={() => setIsContractValueModalOpen(true)}
                />
                <StatCard title="Work Done" value={`${currencySymbol}${(financialSummary.completed || 0).toLocaleString()}`} icon={FileSpreadsheet} color="success" />
                {!compactView && (
                    <StatCard title="Overall Progress" value={`${(financialSummary.percent || 0).toFixed(2)}%`} icon={BarChart4} color="violet" />
                )}
            </div>

            {/* Category Progress Summary */}
            {!compactView && (
                <div className="mb-4">
                    <h3 className="text-lg font-bold mb-2">Progress by Category</h3>
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(
                            project.boq.reduce((acc, item) => {
                                const cat = item.category || 'General Items';
                                if (!acc[cat]) {
                                    acc[cat] = { contractValue: 0, completedValue: 0 };
                                }
                                acc[cat].contractValue += item.amount || 0;
                                acc[cat].completedValue += (item.completedQuantity || 0) * item.rate;
                                return acc;
                            }, {} as Record<string, { contractValue: number; completedValue: number }>)
                        ).map(([category, values]) => {
                            const progress = values.contractValue > 0 ? (values.completedValue / values.contractValue) * 100 : 0;
                            return (
                                <Card key={category} className="p-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-medium text-sm">{category}</span>
                                        <span className="text-xs text-muted-foreground">{progress.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                                        <div 
                                            className="bg-primary h-2 rounded-full transition-all" 
                                            style={{ width: `${Math.min(progress, 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                        <span>Contract: {currencySymbol}{values.contractValue.toLocaleString()}</span>
                                        <span>Done: {currencySymbol}{values.completedValue.toLocaleString()}</span>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

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
                            <Button onClick={() => {
                                setNewMB({
                                    sheetNumber: `MB-${((project?.measurementSheets || [])?.length || 0) + 1}`,
                                    title: '',
                                    date: new Date().toISOString().split('T')[0],
                                    entries: [],
                                    status: 'Draft'
                                });
                                setIsMBModalOpen(true);
                            }}><Plus className="mr-2 h-4 w-4" /> New Entry</Button>
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
                                    {(project.measurementSheets || []).length > 0 ? (project.measurementSheets || []).map(sheet => (
                                        <TableRow key={sheet.id}>
                                            <TableCell className="font-bold">{sheet.sheetNumber}</TableCell>
                                            <TableCell>{sheet.title}</TableCell>
                                            <TableCell>{sheet.date}</TableCell>
                                            <TableCell className="text-right font-bold">{sheet.totalAmount.toLocaleString()}</TableCell>
                                            <TableCell className="text-center"><Badge variant={(sheet.status as string) === 'Certified' ? 'success' : 'default' as any}>{sheet.status}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    {(sheet.status as string) !== 'Certified' && canEdit && (
                                                        <>
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="ghost" size="icon" onClick={() => handleEditMB(sheet)}>
                                                                            <Pencil className="h-4 w-4 text-amber-600" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Edit MB Record</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="ghost" size="icon" onClick={() => handleCertifyMB(sheet)}>
                                                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Certify & Update BOQ</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </>
                                                    )}
                                                    {canDelete && (
                                                        <Button variant="ghost" size="icon" onClick={() => {
                                                            const updated = (project.measurementSheets || []).filter(s => s.id !== sheet.id);
                                                            onProjectUpdate({ ...project, measurementSheets: updated });
                                                        }}>
                                                            <Trash2 className="h-4 w-4 text-rose-600" />
                                                        </Button>
                                                    )}
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
            <Dialog open={isContractValueModalOpen} onOpenChange={setIsContractValueModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Receipt className="text-primary" />
                            Contract Value Breakdown
                        </DialogTitle>
                        <DialogDescription>
                            Detailed calculation of the total contract value including Provisional Sums and VAT.
                        </DialogDescription>
                    </DialogHeader>
<div className="space-y-4 py-4">
                        <div className="flex justify-between items-center p-3 bg-muted/30 rounded-xl">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium">Total PS (refer unit)</span>
                                <span className="text-[10px] text-muted-foreground">Items with unit 'PS'</span>
                            </div>
                            <span className="text-sm font-bold">{currencySymbol}{financialSummary.totalPS.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted/30 rounded-xl">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium">Total without PS (refer unit)</span>
                                <span className="text-[10px] text-muted-foreground">Items without unit 'PS'</span>
                            </div>
                            <span className="text-sm font-bold">{currencySymbol}{financialSummary.totalWithoutPS.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-primary/5 rounded-xl border border-primary/10">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium">VAT ({financialSummary.vatRate}%) × Total without PS</span>
                                <span className="text-[10px] text-muted-foreground">VAT on items excluding PS</span>
                            </div>
                            <span className="text-sm font-bold text-primary">{currencySymbol}{financialSummary.vatAmount.toLocaleString()}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center p-4 bg-primary text-primary-foreground rounded-2xl shadow-lg">
                            <div className="flex flex-col">
                                <span className="text-lg font-black uppercase tracking-wider">Total Contract Value</span>
                                <span className="text-[10px] text-primary-foreground/70">= Total PS + Total without PS + VAT</span>
                            </div>
                            <span className="text-2xl font-black">{currencySymbol}{financialSummary.contractValueWithVAT.toLocaleString()}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground italic text-center">
                            Note: VAT is calculated only on items excluding Provisional Sums (PS).
                        </p>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsContractValueModalOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isMBModalOpen} onOpenChange={setIsMBModalOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Initialize Variation</DialogTitle>
                        <DialogDescription>Create a new variation order to track contract amendments.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="vo-title">VO Title</Label>
                            <Input id="vo-title" placeholder="e.g. Design Change - Foundation" value={newVO.title || ''} onChange={e => setNewVO({...newVO, title: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="vo-reason">Reason</Label>
                            <Textarea id="vo-reason" placeholder="e.g. Due to unsuitable soil condition" value={newVO.reason || ''} onChange={e => setNewVO({...newVO, reason: e.target.value})} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSaveVO}>Save Variation</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Import BOQ</DialogTitle>
                        <DialogDescription>Select an Excel or CSV file to import Bill of Quantity items.</DialogDescription>
                    </DialogHeader>
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

import React, { useState, useMemo } from 'react';
import { Project, UserRole, AppSettings, ContractBill, BillItem, SubcontractorBill, StructureWorkLog } from '../../types';
import { formatCurrency } from '../../utils/formatting/exportUtils';
import {
    Receipt, Printer, Plus, Calculator,
    History, ArrowRight, ArrowLeft,
    Receipt as ReceiptIcon, FileCheck, TrendingUp,
    AlertTriangle, CheckCircle2, FileSpreadsheet
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { toast } from 'sonner';
import { Badge } from '~/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Checkbox } from '~/components/ui/checkbox';
import { Separator } from '~/components/ui/separator';

interface Props {
  project: Project;
  userRole: UserRole;
  settings: AppSettings;
  onProjectUpdate: (project: Project) => void;
}

const BillingModule: React.FC<Props> = ({ project, settings, onProjectUpdate }) => {
    const [selectedIpcId, setSelectedIpcId] = useState<string | null>(null);
    const [selectedSubcontractorBillId, setSelectedSubcontractorBillId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSubcontractorBillModalOpen, setIsSubcontractorBillModalOpen] = useState(false);
    const [createStep, setCreateStep] = useState(0);
    const [subcontractorBillCreateStep, setSubcontractorBillCreateStep] = useState(0);
    const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
    const [selectedSheetIds, setSelectedSheetIds] = useState(new Set<string>());
    const [selectedSubcontractorWorkIds, setSelectedSubcontractorWorkIds] = useState(new Set<string>());

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
    
    const [ipcForm, setIpcForm] = useState<Partial<ContractBill>>({
        billNumber: '',
        date: new Date().toISOString().split('T')[0],
        dateOfMeasurement: new Date().toISOString().split('T')[0],
        orderOfBill: ((project?.contractBills || [])?.length || 0) + 1,
        items: [],
        provisionalSum: 0,
        cpaAmount: 0,
        liquidatedDamages: 0
    });
    
    const [subcontractorBillForm, setSubcontractorBillForm] = useState<Partial<SubcontractorBill>>({
        billNumber: '',
        date: new Date().toISOString().split('T')[0],
        periodFrom: new Date().toISOString().split('T')[0],
        periodTo: new Date().toISOString().split('T')[0],
        subcontractorId: '',
        items: [],
        grossAmount: 0,
        retentionPercent: 5
    });

    const currency = formatCurrency(0, settings).substring(0, formatCurrency(0, settings).indexOf('0'));
    const bills = project?.contractBills || [];
    const subcontractorBills = project?.subcontractorBills || [];
    const approvedSheets = (project?.measurementSheets || [])?.filter(s => s.status === 'Approved');

    const calculateIPCDetails = (form: Partial<ContractBill>) => {
        const gross = (form.items || []).reduce((acc, item) => acc + (item.currentAmount || 0), 0);
        const cpa = Number(form.cpaAmount) || 0;
        const ps = Number(form.provisionalSum) || 0;
        
        // Following Standard IPC Logic: Gross of current work + Price Adjustments
        const billWithCPA = gross + cpa;
        const billWithoutPS = billWithCPA - ps;
        const vat = billWithoutPS * 0.13;
        const totalWithVat = billWithoutPS + vat + ps;
        
        // Deductions
        const retention = billWithCPA * 0.05;
        const tds = billWithCPA * 0.015;
        const ncrDevFund = billWithCPA * 0.001;
        const deductibleVat = vat * 0.30;
        
        const deductions = retention + tds + ncrDevFund + deductibleVat + (Number(form.advancePaymentDeduction) || 0) + (Number(form.liquidatedDamages) || 0);
        const payable = totalWithVat - deductions;

        return {
            billAmountGross: gross,
            cpaAmount: cpa,
            billAmountWithCPA: billWithCPA,
            billAmountWithoutPS: billWithoutPS,
            vatAmount: vat,
            totalBillWithVat: totalWithVat,
            retentionAmount: retention,
            advanceIncomeTax: tds,
            contractorDevFund: ncrDevFund,
            deductableVat: deductibleVat,
            totalAmountPayable: payable
        };
    };

    const currentIpcSummary = useMemo(() => calculateIPCDetails(ipcForm), [ipcForm]);
    const viewingIpc = useMemo(() => bills.find(b => b.id === selectedIpcId), [selectedIpcId, bills]);
    
    const calculateSubcontractorBillDetails = (form: Partial<SubcontractorBill>) => {
        const gross = (form.items || []).reduce((acc, item) => acc + (item.currentAmount || 0), 0);
        const retention = gross * (Number(form.retentionPercent) / 100);
        const net = gross - retention;
        
        return {
            grossAmount: gross,
            retentionAmount: retention,
            netAmount: net
        };
    };
    
    const currentSubcontractorBillSummary = useMemo(() => calculateSubcontractorBillDetails(subcontractorBillForm), [subcontractorBillForm]);
    
    const viewingSubcontractorBill = useMemo(() => subcontractorBills.find(b => b.id === selectedSubcontractorBillId), [selectedSubcontractorBillId, subcontractorBills]);
    
    const handleInitNewSubcontractorBill = () => {
        setSubcontractorBillForm({
            billNumber: `SCB-${(subcontractorBills.length || 0) + 1}`,
            date: new Date().toISOString().split('T')[0],
            periodFrom: new Date().toISOString().split('T')[0],
            periodTo: new Date().toISOString().split('T')[0],
            subcontractorId: '',
            items: [],
            grossAmount: 0,
            retentionPercent: 5
        });
        setSelectedSubcontractorWorkIds(new Set());
        setSubcontractorBillCreateStep(0);
        setIsSubcontractorBillModalOpen(true);
    };
    
    const generateSubcontractorBillItemsFromWorkLogs = () => {
        const selectedWorkLogs = getSubcontractorWorkLogs(subcontractorBillForm.subcontractorId || '').filter(log => selectedSubcontractorWorkIds.has(log.id));
        
        // Group work logs by BOQ item ID to calculate quantities
        const workLogGroups: Record<string, StructureWorkLog[]> = {};
        selectedWorkLogs.forEach(log => {
            if (log.boqItemId) {
                if (!workLogGroups[log.boqItemId]) {
                    workLogGroups[log.boqItemId] = [];
                }
                workLogGroups[log.boqItemId].push(log);
            }
        });
        
        // Create bill items based on BOQ items and work logs
        const items: BillItem[] = Object.keys(workLogGroups).map(boqId => {
            const boqItem = project.boq.find(b => b.id === boqId);
            if (!boqItem) return null;
            
            const workLogs = workLogGroups[boqId];
            const currentQuantity = workLogs.reduce((sum, log) => sum + log.quantity, 0);
            
            // Get the rate from the subcontractor's specific rate entry
            const subcontractor = project.agencies?.find(a => a.id === subcontractorBillForm.subcontractorId);
            const subcontractorRate = subcontractor?.rates?.find(r => r.boqItemId === boqId);
            const rate = subcontractorRate ? subcontractorRate.rate : boqItem.rate;
            
            return {
                id: `sb-${Date.now()}-${boqId}`,
                boqItemId: boqId,
                itemNo: boqItem.itemNo,
                description: boqItem.description,
                unit: boqItem.unit,
                contractQuantity: boqItem.quantity,
                rate: rate,
                previousQuantity: 0, // For subcontractor bills, we start fresh
                currentQuantity: currentQuantity,
                uptoDateQuantity: currentQuantity,
                previousAmount: 0,
                currentAmount: currentQuantity * rate,
                uptoDateAmount: currentQuantity * rate
            };
        }).filter(Boolean) as BillItem[];
        
        setSubcontractorBillForm(prev => ({ ...prev, items }));
        setSubcontractorBillCreateStep(1);
    };
    
    const getSubcontractorWorkLogs = (subcontractorId: string) => {
        if (!project.structures) return [];
        
        return project.structures.flatMap(structure => 
            structure.components.flatMap(component => 
                component.workLogs || []
            )
        ).filter(log => log.subcontractorId === subcontractorId);
    };
    
    const handleSubcontractorBillItemQtyChange = (boqId: string, newCurrentQty: number) => {
        const updatedItems = (subcontractorBillForm.items || []).map(item => {
            if (item.boqItemId === boqId) {
                return {
                    ...item,
                    currentQuantity: newCurrentQty,
                    uptoDateQuantity: newCurrentQty, // For subcontractor bills, we start fresh
                    currentAmount: newCurrentQty * item.rate,
                    uptoDateAmount: newCurrentQty * item.rate
                };
            }
            return item;
        });
        setSubcontractorBillForm({ ...subcontractorBillForm, items: updatedItems });
    };
    
    const handleSaveSubcontractorBill = () => {
        const summary = calculateSubcontractorBillDetails(subcontractorBillForm);
        
        const finalSubcontractorBill: SubcontractorBill = {
            ...subcontractorBillForm,
            id: `scb-${Date.now()}`,
            status: 'Draft',
            grossAmount: summary.grossAmount,
            retentionPercent: subcontractorBillForm.retentionPercent || 5,
            netAmount: summary.netAmount,
            items: subcontractorBillForm.items || []
        } as SubcontractorBill;
        
        onProjectUpdate({ 
            ...project, 
            subcontractorBills: [...(project.subcontractorBills || []), finalSubcontractorBill] 
        });
        
        setIsSubcontractorBillModalOpen(false);
        setSelectedSubcontractorBillId(finalSubcontractorBill.id);
    };

    const handleInitNewIPC = () => {
        setIpcForm({
            billNumber: `IPC-${(project.contractBills?.length || 0) + 1}`,
            date: new Date().toISOString().split('T')[0],
            dateOfMeasurement: new Date().toISOString().split('T')[0],
            orderOfBill: (project.contractBills?.length || 0) + 1,
            items: [],
            provisionalSum: 0,
            cpaAmount: 0,
            advancePaymentDeduction: 0,
            liquidatedDamages: 0
        });
        setSelectedSheetIds(new Set());
        setCreateStep(0);
        setIsCreateModalOpen(true);
    };

    const generateBillItemsFromSheets = () => {
        const latestIpc = bills[bills.length - 1];
        const selectedSheets = approvedSheets.filter(s => selectedSheetIds.has(s.id));
        const currentWorkMap: Record<string, number> = {};
        
        selectedSheets.forEach(sheet => {
            (sheet.entries || []).forEach(entry => {
                if (entry.boqItemId) {
                    currentWorkMap[entry.boqItemId] = (currentWorkMap[entry.boqItemId] || 0) + entry.quantity;
                }
            });
        });

        const items: BillItem[] = project.boq.map(boq => {
            const previous = latestIpc?.items.find(pi => pi.boqItemId === boq.id);
            const prevQty = previous?.uptoDateQuantity || 0;
            const currentQty = currentWorkMap[boq.id] || 0;
            const uptoDateQty = prevQty + currentQty;
            
            return {
                id: `bi-${Date.now()}-${boq.id}`,
                boqItemId: boq.id,
                itemNo: boq.itemNo,
                description: boq.description,
                unit: boq.unit,
                contractQuantity: boq.quantity,
                rate: boq.rate,
                previousQuantity: prevQty,
                currentQuantity: currentQty,
                uptoDateQuantity: uptoDateQty,
                previousAmount: prevQty * boq.rate,
                currentAmount: currentQty * boq.rate,
                uptoDateAmount: uptoDateQty * boq.rate
            };
        });

        setIpcForm(prev => ({ ...prev, items }));
        setCreateStep(1);
    };

    const handleItemQtyChange = (boqId: string, newCurrentQty: number) => {
        const updatedItems = (ipcForm.items || []).map(item => {
            if (item.boqItemId === boqId) {
                const uptoDateQty = item.previousQuantity + newCurrentQty;
                return {
                    ...item,
                    currentQuantity: newCurrentQty,
                    uptoDateQuantity: uptoDateQty,
                    currentAmount: newCurrentQty * item.rate,
                    uptoDateAmount: uptoDateQty * item.rate
                };
            }
            return item;
        });
        setIpcForm({ ...ipcForm, items: updatedItems });
    };

    const handleSaveIPC = () => {
        const finalIPC: ContractBill = {
            ...ipcForm,
            ...currentIpcSummary,
            id: `ipc-${Date.now()}`,
            status: 'Draft',
            type: 'IPC', // Added missing type property
            location: project.location,
            dateOfWorkOrder: project.startDate,
            extendedCompletionDate: project.endDate,
        } as ContractBill;

        onProjectUpdate({ ...project, contractBills: [...bills, finalIPC] });
        setIsCreateModalOpen(false);
        setSelectedIpcId(finalIPC.id);
    };

    const toggleSheetSelection = (id: string) => {
        const next = new Set(selectedSheetIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedSheetIds(next);
    };

    const getRowLabel = (sn: string, label: string) => (
        <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-primary w-8">{sn}</span>
            <span>{label}</span>
        </div>
    );

    return (
        <div className="h-[calc(100vh-140px)] flex gap-3">
            <Card className="w-80 flex flex-col">
                <CardHeader className="border-b px-4 py-3">
                    <CardTitle className="text-lg font-bold">Interim Payments</CardTitle>
                    <Button className="mt-3 w-full" onClick={handleInitNewIPC}><Plus className="mr-2 h-4 w-4" />New IPC Request</Button>
                    <Button variant="outline" className="mt-2 w-full" onClick={handleInitNewSubcontractorBill}><FileCheck className="mr-2 h-4 w-4" />New Subcontractor Bill</Button>
                </CardHeader>
                <div className="flex-1 overflow-y-auto">
                    <Tabs defaultValue="main" className="mb-2">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="main">Main Contracts ({bills.length})</TabsTrigger>
                            <TabsTrigger value="sub">Subcontractor Bills ({subcontractorBills.length})</TabsTrigger>
                        </TabsList>
                        
                        <div className="px-2">
                            <TabsContent value="main">
                                {[...bills].reverse().map(b => (
                                    <Button 
                                        variant="ghost" 
                                        className={`w-full justify-start py-6 mb-2 ${selectedIpcId === b.id ? 'bg-accent text-accent-foreground' : ''}`}
                                        onClick={() => setSelectedIpcId(b.id)} 
                                        key={b.id}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-full bg-secondary text-primary flex items-center justify-center">
                                                <Receipt className="h-5 w-5"/>
                                            </div>
                                            <div>
                                                <p className="font-semibold">{b.billNumber}</p>
                                                <p className="text-sm text-green-600 font-bold">{currency}{(b.totalAmountPayable || 0).toLocaleString() || '0'}</p>
                                            </div>
                                        </div>
                                    </Button>
                                ))}
                                {bills.length === 0 && (
                                    <div className="p-4 text-center text-muted-foreground">
                                        <History className="mx-auto h-8 w-8 opacity-40 mb-2"/>
                                        <p className="text-sm">No main contracts billed yet.</p>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="sub">
                                {[...subcontractorBills].reverse().map(b => {
                                    const subcontractor = project.agencies?.find(a => a.id === b.subcontractorId);
                                    return (
                                        <Button 
                                            variant="ghost" 
                                            className={`w-full justify-start py-6 mb-2 ${selectedSubcontractorBillId === b.id ? 'bg-accent text-accent-foreground' : ''}`}
                                            onClick={() => setSelectedSubcontractorBillId(b.id)} 
                                            key={b.id}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                                                    <FileCheck className="h-5 w-5"/>
                                                </div>
                                                <div>
                                                    <p className="font-semibold">{b.billNumber}</p>
                                                    <p className="text-xs text-primary">{subcontractor?.name || 'Unknown'}</p>
                                                    <p className="text-sm text-green-600 font-bold">{currency}{b.netAmount.toLocaleString() || '0'}</p>
                                                </div>
                                            </div>
                                        </Button>
                                    );
                                })}
                                {subcontractorBills.length === 0 && (
                                    <div className="p-4 text-center text-muted-foreground">
                                        <FileCheck className="mx-auto h-8 w-8 opacity-40 mb-2"/>
                                        <p className="text-sm">No subcontractor bills created yet.</p>
                                    </div>
                                )}
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </Card>

            <div className="flex-1 overflow-y-auto">
                {viewingIpc || viewingSubcontractorBill ? (
                    <div className="space-y-4">
                        <Card>
                            <CardContent className="flex justify-between items-center p-4">
                                <div className="flex items-center space-x-4">
                                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center 
                                                    ${viewingSubcontractorBill ? 'bg-amber-100 text-amber-600' : 'bg-secondary text-primary'}`}>
                                        {viewingSubcontractorBill ? <FileCheck className="h-7 w-7" /> : <ReceiptIcon className="h-7 w-7" />}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">{viewingSubcontractorBill ? viewingSubcontractorBill.billNumber : viewingIpc?.billNumber}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {viewingSubcontractorBill ? (
                                                <>
                                                    Subcontractor Bill • Date: {viewingSubcontractorBill.date}<br />
                                                    {project.agencies?.find(a => a.id === viewingSubcontractorBill.subcontractorId)?.name || 'Unknown Subcontractor'}
                                                </>
                                            ) : (
                                                <>Order: {viewingIpc?.orderOfBill} • Date: {viewingIpc?.date}</>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <Button variant="outline" onClick={() => setPrintPreviewOpen(true)}><Printer className="mr-2 h-4 w-4" />Print DoR Format</Button>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Card className="lg:col-span-2">
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>SN / Financial Description</TableHead>
                                                <TableHead className="text-right">Amount ({currency})</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {viewingSubcontractorBill ? (
                                                <>
                                                    <TableRow><TableCell>{getRowLabel('1', 'Gross Bill Amount')}</TableCell><TableCell className="text-right">{formatCurrency(viewingSubcontractorBill.grossAmount, settings)}</TableCell></TableRow>
                                                    <TableRow><TableCell>{getRowLabel('2', `Less: Retention (${viewingSubcontractorBill.retentionPercent || 0}%)`)}</TableCell><TableCell className="text-right">{formatCurrency(viewingSubcontractorBill.grossAmount * ((viewingSubcontractorBill.retentionPercent || 0)/100), settings)}</TableCell></TableRow>
                                                    <TableRow className="bg-amber-50/20"><TableCell>{getRowLabel('3', 'Net Payable Amount')}</TableCell><TableCell className="text-right font-bold">{formatCurrency(viewingSubcontractorBill.netAmount, settings)}</TableCell></TableRow>
                                                </>
                                            ) : (
                                                <>
                                                    <TableRow><TableCell>{getRowLabel('1', 'Gross Bill Amount (Current)')}</TableCell><TableCell className="text-right">{formatCurrency(viewingIpc?.billAmountGross || 0, settings)}</TableCell></TableRow>
                                                    <TableRow><TableCell>{getRowLabel('2', 'Add Price Adjustment (CPA)')}</TableCell><TableCell className="text-right">{formatCurrency(viewingIpc?.cpaAmount || 0, settings)}</TableCell></TableRow>
                                                    <TableRow className="bg-indigo-50/20"><TableCell>{getRowLabel('3', 'Total Bill with CPA')}</TableCell><TableCell className="text-right font-bold">{formatCurrency(viewingIpc?.billAmountWithCPA || 0, settings)}</TableCell></TableRow>
                                                    <TableRow><TableCell>{getRowLabel('4', 'VAT @ 13%')}</TableCell><TableCell className="text-right">{formatCurrency(viewingIpc?.vatAmount || 0, settings)}</TableCell></TableRow>
                                                    <TableRow className="bg-card text-card-foreground"><TableCell className="text-white bg-gray-900">{getRowLabel('A13', 'NET PAYABLE TO CONTRACTOR')}</TableCell><TableCell className="text-right text-white bg-gray-900 text-lg font-bold">{formatCurrency(viewingIpc?.totalAmountPayable || 0, settings)}</TableCell></TableRow>
                                                </>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                            <div className="space-y-4">
                                <Card>
                                    <CardContent>
                                        <CardTitle className="text-base font-semibold mb-2 flex items-center"><TrendingUp className="mr-2 h-4 w-4"/> Financial Progress</CardTitle>
                                        <div className="flex justify-between text-sm mb-1">
                                            <p className="text-muted-foreground">Vs. Total Contract</p>
                                            <p className="font-bold">42%</p>
                                        </div>
                                        <Progress value={42} />
                                    </CardContent>
                                </Card>
                                <Alert className="rounded-lg">
                                    {viewingSubcontractorBill ? (
                                        <FileCheck className="h-4 w-4" />
                                    ) : (
                                        <CheckCircle2 className="h-4 w-4" />
                                    )}
                                    <AlertTitle>
                                        {viewingSubcontractorBill ? 'Subcontractor Bill' : 'IPC Verified'}
                                    </AlertTitle>
                                    <AlertDescription>
                                        {viewingSubcontractorBill ? (
                                            `Subcontractor bill for ${project.agencies?.find(a => a.id === viewingSubcontractorBill.subcontractorId)?.name || 'Unknown Subcontractor'}`
                                        ) : (
                                            `This IPC has been verified against measurement book MB-${viewingIpc?.id?.slice(-4)}.`
                                        )}
                                    </AlertDescription>
                                </Alert>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20">
                        <Calculator className="h-20 w-20 opacity-20 mb-4"/>
                        <p className="text-lg">Select a Bill record</p>
                    </div>
                )}
            </div>

            {/* Create IPC Dialog */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                    <DialogHeader className="border-b pb-4">
                        <DialogTitle className="flex items-center text-xl font-bold">
                            <FileSpreadsheet className="mr-2 h-6 w-6 text-primary" />
                            Prepare New IPC (Certificate No. {ipcForm.orderOfBill})
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-6">
                        {createStep === 0 && (
                            <div className="space-y-4">
                                <Alert>
                                    <AlertTitle>Information</AlertTitle>
                                    <AlertDescription>
                                        Select approved measurement sheets to auto-map work quantities to BOQ items.
                                    </AlertDescription>
                                </Alert>
                                <h3 className="text-lg font-bold">Available Measurement Sheets (Approved)</h3>
                                <Card>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[50px]"></TableHead>
                                                <TableHead>MB Ref #</TableHead>
                                                <TableHead>Title</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Entries</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {approvedSheets.map(sheet => (
                                                <TableRow key={sheet.id} onClick={() => toggleSheetSelection(sheet.id)} className="cursor-pointer">
                                                    <TableCell>
                                                        <Checkbox checked={selectedSheetIds.has(sheet.id)} />
                                                    </TableCell>
                                                    <TableCell className="font-bold text-primary">{sheet.sheetNumber}</TableCell>
                                                    <TableCell>{sheet.title || 'N/A'}</TableCell>
                                                    <TableCell>{sheet.date}</TableCell>
                                                    <TableCell>{(sheet.entries || []).length} items</TableCell>
                                                </TableRow>
                                            ))}
                                            {approvedSheets.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                                                        No approved measurement sheets found.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </Card>
                                <div className="text-right">
                                    <Button disabled={selectedSheetIds.size === 0} onClick={generateBillItemsFromSheets}>
                                        Generate Quantity Matrix <ArrowRight className="ml-2 h-4 w-4"/>
                                    </Button>
                                </div>
                            </div>
                        )}
                        {createStep === 1 && (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-primary">Review & Adjust Work Quantities</h3>
                                    <div className="flex items-center space-x-2">
                                        <p className="text-sm font-bold">IPC TOTAL:</p>
                                        <p className="text-xl font-bold text-primary">{currency}{currentIpcSummary.billAmountGross.toLocaleString() || '0'}</p>
                                    </div>
                                </div>

                                <Card>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[80px]">Item</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Unit</TableHead>
                                                <TableHead className="text-right">Rate</TableHead>
                                                <TableHead className="text-right bg-muted">Previous</TableHead>
                                                <TableHead className="text-right bg-indigo-50/20">Current Qty</TableHead>
                                                <TableHead className="text-right">Upto-Date</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(ipcForm.items || []).filter(item => item.uptoDateQuantity > 0 || item.currentQuantity > 0).map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="font-bold text-xs">{item.itemNo}</TableCell>
                                                    <TableCell className="text-xs">{item.description.slice(0, 60)}...</TableCell>
                                                    <TableCell>{item.unit}</TableCell>
                                                    <TableCell className="text-right">{item.rate.toLocaleString() || '0'}</TableCell>
                                                    <TableCell className="text-right bg-muted/30">{item.previousQuantity.toLocaleString() || '0'}</TableCell>
                                                    <TableCell className="text-right bg-indigo-50/30">
                                                        <Input 
                                                            type="number"
                                                            value={item.currentQuantity}
                                                            onChange={(e) => handleItemQtyChange(item.boqItemId, Number(e.target.value))}
                                                            className="w-[90px] text-right text-primary font-bold"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <p className={`font-bold ${item.uptoDateQuantity > item.contractQuantity ? 'text-red-500' : ''}`}>
                                                            {item.uptoDateQuantity.toLocaleString() || '0'}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold">{item.currentAmount.toLocaleString() || '0'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Card>

                                <div className="grid grid-cols-2 gap-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-sm font-bold text-muted-foreground">IPC HEADER INFO</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            <div>
                                                <Label htmlFor="ipc-ref">IPC Reference #</Label>
                                                <Input id="ipc-ref" value={ipcForm.billNumber} onChange={e => setIpcForm({...ipcForm, billNumber: e.target.value})} />
                                            </div>
                                            <div>
                                                <Label htmlFor="billing-date">Billing Date</Label>
                                                <Input id="billing-date" type="date" value={ipcForm.date} onChange={e => setIpcForm({...ipcForm, date: e.target.value})} />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-indigo-900 text-white">
                                        <CardContent className="space-y-3 p-4">
                                            <div className="flex justify-between">
                                                <p className="opacity-80">Current Gross Work:</p>
                                                <p className="font-bold">{currency}{currentIpcSummary.billAmountGross.toLocaleString() || '0'}</p>
                                            </div>
                                            <div className="flex justify-between">
                                                <p className="opacity-80">VAT (13%):</p>
                                                <p className="font-bold">{currency}{currentIpcSummary.vatAmount.toLocaleString() || '0'}</p>
                                            </div>
                                            <div className="flex justify-between">
                                                <p className="opacity-80">Retention (5%):</p>
                                                <p className="font-bold">-{currency}{currentIpcSummary.retentionAmount.toLocaleString() || '0'}</p>
                                            </div>
                                            <Separator className="bg-primary" />
                                            <div className="flex justify-between pt-1">
                                                <p className="text-lg font-bold">NET PAYABLE:</p>
                                                <p className="text-lg font-bold text-green-300">{currency}{currentIpcSummary.totalAmountPayable.toLocaleString() || '0'}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setCreateStep(0)}><ArrowLeft className="mr-2 h-4 w-4"/>Back to Selection</Button>
                                    <Button onClick={handleSaveIPC}><CheckCircle2 className="mr-2 h-4 w-4"/>Issue Certificate Draft</Button>
                                </DialogFooter>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Create Subcontractor Bill Dialog */}
            <Dialog open={isSubcontractorBillModalOpen} onOpenChange={setIsSubcontractorBillModalOpen}>
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                    <DialogHeader className="border-b pb-4">
                        <DialogTitle className="flex items-center text-xl font-bold">
                            <FileCheck className="mr-2 h-6 w-6 text-amber-600" />
                            Prepare New Subcontractor Bill (Bill No. {subcontractorBillForm.billNumber})
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-6">
                        {subcontractorBillCreateStep === 0 && (
                            <div className="space-y-4">
                                <Alert>
                                    <AlertTitle>Information</AlertTitle>
                                    <AlertDescription>
                                        Select subcontractor and time period, then choose work logs to include in the bill.
                                    </AlertDescription>
                                </Alert>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="bill-number">Bill Number</Label>
                                        <Input id="bill-number" value={subcontractorBillForm.billNumber} onChange={e => setSubcontractorBillForm({...subcontractorBillForm, billNumber: e.target.value})} />
                                    </div>
                                    <div>
                                        <Label htmlFor="bill-date">Bill Date</Label>
                                        <Input id="bill-date" type="date" value={subcontractorBillForm.date} onChange={e => setSubcontractorBillForm({...subcontractorBillForm, date: e.target.value})} />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="period-from">Period From</Label>
                                        <Input id="period-from" type="date" value={subcontractorBillForm.periodFrom} onChange={e => setSubcontractorBillForm({...subcontractorBillForm, periodFrom: e.target.value})} />
                                    </div>
                                    <div>
                                        <Label htmlFor="period-to">Period To</Label>
                                        <Input id="period-to" type="date" value={subcontractorBillForm.periodTo} onChange={e => setSubcontractorBillForm({...subcontractorBillForm, periodTo: e.target.value})} />
                                    </div>
                                </div>
                                
                                <div>
                                    <Label htmlFor="subcontractor">Subcontractor</Label>
                                    <Select
                                        value={subcontractorBillForm.subcontractorId || ''}
                                        onValueChange={(value) => {
                                            setSubcontractorBillForm({...subcontractorBillForm, subcontractorId: value});
                                            setSelectedSubcontractorWorkIds(new Set());
                                        }}
                                    >
                                        <SelectTrigger id="subcontractor">
                                            <SelectValue placeholder="Select a subcontractor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {project.agencies?.filter(a => a.type === 'subcontractor').map(sub => (
                                                <SelectItem key={sub.id} value={sub.id}>{sub.name} ({sub.trade})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <h3 className="text-lg font-bold">Available Work Logs</h3>
                                <Card>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[50px]"></TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>BOQ Item</TableHead>
                                                <TableHead>Component</TableHead>
                                                <TableHead>Quantity</TableHead>
                                                <TableHead>Unit</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {getSubcontractorWorkLogs(subcontractorBillForm.subcontractorId || '').map(log => {
                                                // Find the structure and component for this log
                                                let structureName = 'Unknown';
                                                let componentName = 'Unknown';
                                                
                                                if (project.structures) {
                                                    for (const structure of project.structures) {
                                                        for (const component of structure.components) {
                                                            if (component.workLogs?.some(wl => wl.id === log.id)) {
                                                                structureName = structure.name;
                                                                componentName = component.name;
                                                                break;
                                                            }
                                                        }
                                                    }
                                                }
                                                
                                                const boqItem = project.boq.find(b => b.id === log.boqItemId);
                                                return (
                                                    <TableRow key={log.id} onClick={() => {
                                                        const next = new Set(selectedSubcontractorWorkIds);
                                                        if (next.has(log.id)) next.delete(log.id);
                                                        else next.add(log.id);
                                                        setSelectedSubcontractorWorkIds(next);
                                                    }} className="cursor-pointer">
                                                        <TableCell>
                                                            <Checkbox checked={selectedSubcontractorWorkIds.has(log.id)} />
                                                        </TableCell>
                                                        <TableCell>{log.date}</TableCell>
                                                        <TableCell>{boqItem ? `[${boqItem.itemNo}] ${boqItem.description.substring(0, 30)}...` : 'N/A'}</TableCell>
                                                        <TableCell>{componentName}</TableCell>
                                                        <TableCell>{log.quantity}</TableCell>
                                                        <TableCell>{boqItem?.unit || 'N/A'}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                            {getSubcontractorWorkLogs(subcontractorBillForm.subcontractorId || '').length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                                                        No work logs found for this subcontractor in the project.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </Card>
                                <div className="text-right">
                                    <Button disabled={selectedSubcontractorWorkIds.size === 0} onClick={generateSubcontractorBillItemsFromWorkLogs}>
                                        Generate Bill Items <ArrowRight className="ml-2 h-4 w-4"/>
                                    </Button>
                                </div>
                            </div>
                        )}
                        {subcontractorBillCreateStep === 1 && (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-primary">Review & Adjust Bill Quantities</h3>
                                    <div className="flex items-center space-x-2">
                                        <p className="text-sm font-bold">BILL TOTAL:</p>
                                        <p className="text-xl font-bold text-amber-700">{currency}{currentSubcontractorBillSummary.grossAmount.toLocaleString() || '0'}</p>
                                    </div>
                                </div>

                                <Card>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[80px]">Item</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Unit</TableHead>
                                                <TableHead className="text-right">Rate</TableHead>
                                                <TableHead className="text-right bg-amber-50/20">Current Qty</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(subcontractorBillForm.items || []).map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="font-bold text-xs">{item.itemNo}</TableCell>
                                                    <TableCell className="text-xs">{item.description.slice(0, 60)}...</TableCell>
                                                    <TableCell>{item.unit}</TableCell>
                                                    <TableCell className="text-right">{item.rate.toLocaleString() || '0'}</TableCell>
                                                    <TableCell className="text-right bg-amber-50/20">
                                                        <Input 
                                                            type="number" 
                                                            value={item.currentQuantity}
                                                            onChange={(e) => handleSubcontractorBillItemQtyChange(item.boqItemId, Number(e.target.value))}
                                                            className="w-[90px] text-right text-amber-700 font-bold"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold">{item.currentAmount.toLocaleString() || '0'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Card>

                                <div className="grid grid-cols-2 gap-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-sm font-bold text-muted-foreground">BILL SETTINGS</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div>
                                                <Label htmlFor="retention-percent">Retention %</Label>
                                                <Input id="retention-percent" type="number" value={subcontractorBillForm.retentionPercent} onChange={e => setSubcontractorBillForm({...subcontractorBillForm, retentionPercent: Number(e.target.value)})} />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-amber-900 text-white">
                                        <CardContent className="space-y-3 p-4">
                                            <div className="flex justify-between">
                                                <p className="opacity-80">Gross Amount:</p>
                                                <p className="font-bold">{currency}{currentSubcontractorBillSummary.grossAmount.toLocaleString() || '0'}</p>
                                            </div>
                                            <div className="flex justify-between">
                                                <p className="opacity-80">Retention ({subcontractorBillForm.retentionPercent}%):</p>
                                                <p className="font-bold">-{currency}{currentSubcontractorBillSummary.retentionAmount.toLocaleString() || '0'}</p>
                                            </div>
                                            <Separator className="bg-amber-700" />
                                            <div className="flex justify-between pt-1">
                                                <p className="text-lg font-bold">NET PAYABLE:</p>
                                                <p className="text-lg font-bold text-green-300">{currency}{currentSubcontractorBillSummary.netAmount.toLocaleString() || '0'}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setSubcontractorBillCreateStep(0)}><ArrowLeft className="mr-2 h-4 w-4"/>Back to Selection</Button>
                                    <Button onClick={handleSaveSubcontractorBill}><CheckCircle2 className="mr-2 h-4 w-4"/>Issue Bill Draft</Button>
                                </DialogFooter>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Print Preview Dialog */}
            <Dialog open={printPreviewOpen} onOpenChange={setPrintPreviewOpen}>
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                    <DialogHeader className="border-b pb-4">
                        <DialogTitle className="flex items-center text-xl font-bold">
                            <Printer className="mr-2 h-6 w-6 text-muted-foreground" />
                            Interim Payment Certificate - Print Layout
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-6 bg-muted">
                        <div className="bg-white p-8 mx-auto min-h-[297mm] shadow-lg">
                            <p className="text-center text-2xl font-bold mb-4">DEPARTMENT OF ROADS</p>
                            <p className="text-center text-lg uppercase mb-6">Interim Payment Certificate (IPC)</p>
                            <Separator className="my-6" />
                            <p className="text-sm text-muted-foreground">Simulation of DoR Format... Content derived from ID: {selectedIpcId}</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPrintPreviewOpen(false)}>Close</Button>
                        <Button><Printer className="mr-2 h-4 w-4"/>Print PDF</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BillingModule;

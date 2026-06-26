import React, { useState, useMemo } from 'react';
import { Project, AppSettings, ContractBill, BillItem, SubcontractorBill, StructureWorkLog, UserRole } from '../../types';
import { formatCurrency } from '../../utils/formatting/exportUtils';
import {
    Receipt, Printer, Plus, Calculator,
    History, ArrowRight, ArrowLeft,
    Receipt as ReceiptIcon, FileCheck, TrendingUp,
    CheckCircle2, FileSpreadsheet,
    Edit, Trash2, AlertTriangle
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
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Checkbox } from '~/components/ui/checkbox';
import { Separator } from '~/components/ui/separator';
import { usePagination } from '../../hooks/usePagination';
import { PaginationComponent } from '~/components/ui/pagination-component';

interface Props {
  project: Project;
  settings: AppSettings;
  userRole: UserRole;
  onProjectUpdate: (project: Project) => void;
}

const BillingModule: React.FC<Props> = ({ project, settings, userRole, onProjectUpdate }) => {
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

    const canEdit = [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER].includes(userRole);
    const canDelete = [UserRole.ADMIN, UserRole.PROJECT_MANAGER].includes(userRole);

    const reversedBills = useMemo(() => [...bills].reverse(), [bills]);
    const reversedSubBills = useMemo(() => [...subcontractorBills].reverse(), [subcontractorBills]);
    const mainPagination = usePagination(reversedBills, 5);
    const subPagination = usePagination(reversedSubBills, 5);

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

    const handleEditSubcontractorBill = () => {
        if (!viewingSubcontractorBill) return;
        setSubcontractorBillForm({ ...viewingSubcontractorBill });
        setSubcontractorBillCreateStep(1); // Go straight to items review
        setIsSubcontractorBillModalOpen(true);
    };

    const handleDeleteSubcontractorBill = (id: string) => {
        if (!canDelete) {
            toast.error('Only Admin and Project Manager can delete bills');
            return;
        }
        if (!confirm('Are you sure you want to delete this subcontractor bill?')) return;
        const updatedBills = subcontractorBills.filter(b => b.id !== id);
        onProjectUpdate({ ...project, subcontractorBills: updatedBills });
        if (selectedSubcontractorBillId === id) setSelectedSubcontractorBillId(null);
        toast.success('Subcontractor bill deleted');
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
                quantity: currentQuantity,
                rate: rate,
                amount: currentQuantity * rate,
                contractQuantity: boqItem.quantity,
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
        if (!canEdit) {
            toast.error('Unauthorized: Insufficient permissions to save subcontractor bill');
            return;
        }

        // Duplicate Check
        if (!subcontractorBillForm.id && subcontractorBills.some(b => b.billNumber?.toLowerCase() === subcontractorBillForm.billNumber?.toLowerCase())) {
            toast.error("Duplicate Bill", { description: "A subcontractor bill with this number already exists." });
            return;
        }

        const summary = calculateSubcontractorBillDetails(subcontractorBillForm);
        const isEdit = !!subcontractorBillForm.id;
        
        const finalSubcontractorBill: SubcontractorBill = {
            ...subcontractorBillForm,
            id: subcontractorBillForm.id || `scb-${Date.now()}`,
            status: subcontractorBillForm.status || 'Draft',
            grossAmount: summary.grossAmount,
            retentionPercent: subcontractorBillForm.retentionPercent || 5,
            netAmount: summary.netAmount,
            items: subcontractorBillForm.items || []
        } as SubcontractorBill;
        
        let updatedBills;
        if (isEdit) {
            updatedBills = subcontractorBills.map(b => b.id === finalSubcontractorBill.id ? finalSubcontractorBill : b);
            toast.success("Subcontractor bill updated successfully");
        } else {
            updatedBills = [...(project.subcontractorBills || []), finalSubcontractorBill];
            toast.success("Subcontractor bill created successfully");
        }
        
        onProjectUpdate({ 
            ...project, 
            subcontractorBills: updatedBills 
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

    const handleEditIPC = () => {
        if (!viewingIpc) return;
        setIpcForm({ ...viewingIpc });
        setCreateStep(1); // Go straight to review
        setIsCreateModalOpen(true);
    };

    const handleDeleteIPC = (id: string) => {
        if (!canDelete) {
            toast.error('Only Admin and Project Manager can delete IPCs');
            return;
        }
        if (!confirm('Are you sure you want to delete this IPC?')) return;
        const updatedBills = bills.filter(b => b.id !== id);
        onProjectUpdate({ ...project, contractBills: updatedBills });
        if (selectedIpcId === id) setSelectedIpcId(null);
        toast.success('IPC deleted');
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
                quantity: currentQty,
                rate: boq.rate,
                amount: currentQty * boq.rate,
                contractQuantity: boq.quantity,
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
                const safePrevQty = item.previousQuantity ?? 0;
                const safeRate = item.rate ?? 0;
                const uptoDateQty = safePrevQty + newCurrentQty;
                return {
                    ...item,
                    currentQuantity: newCurrentQty,
                    uptoDateQuantity: uptoDateQty,
                    currentAmount: newCurrentQty * safeRate,
                    uptoDateAmount: uptoDateQty * safeRate
                };
            }
            return item;
        });
        setIpcForm({ ...ipcForm, items: updatedItems });
    };

    const handleSaveIPC = () => {
        if (!canEdit) {
            toast.error('Unauthorized: Insufficient permissions to save IPC');
            return;
        }

        // Duplicate Check
        if (!ipcForm.id && bills.some(b => b.billNumber?.toLowerCase() === ipcForm.billNumber?.toLowerCase())) {
            toast.error("Duplicate IPC", { description: "An IPC with this number already exists." });
            return;
        }

        const isEdit = !!ipcForm.id;
        const finalIPC: ContractBill = {
            ...ipcForm,
            ...currentIpcSummary,
            id: ipcForm.id || `ipc-${Date.now()}`,
            status: ipcForm.status || 'Draft',
            type: 'IPC', // Added missing type property
            location: project.location,
            dateOfWorkOrder: project.startDate,
            extendedCompletionDate: project.endDate,
        } as ContractBill;

        let updatedBills;
        if (isEdit) {
            updatedBills = bills.map(b => b.id === finalIPC.id ? finalIPC : b);
            toast.success("IPC updated successfully");
        } else {
            updatedBills = [...bills, finalIPC];
            toast.success("IPC created successfully");
        }

        onProjectUpdate({ ...project, contractBills: updatedBills });
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
                            <TabsContent value="main" className="flex flex-col h-full">
                                {mainPagination.paginatedData.map(b => (
                                    <Button 
                                        variant="ghost" 
                                        className={`w-full justify-start py-6 mb-2 ${selectedIpcId === b.id ? 'bg-accent text-accent-foreground' : ''}`}
                                        onClick={() => {
                                            setSelectedIpcId(b.id);
                                            setSelectedSubcontractorBillId(null);
                                        }} 
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
                                <div className="mt-auto">
                                    <PaginationComponent
                                        currentPage={mainPagination.currentPage}
                                        totalPages={mainPagination.totalPages}
                                        pageSize={mainPagination.pageSize}
                                        totalItems={mainPagination.totalItems}
                                        onPageChange={mainPagination.setCurrentPage}
                                        onPageSizeChange={mainPagination.setPageSize}
                                        pageSizeOptions={[5, 10, 20]}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="sub" className="flex flex-col h-full">
                                {subPagination.paginatedData.map(b => {
                                    const subcontractor = project.agencies?.find(a => a.id === b.subcontractorId);
                                    return (
                                        <Button 
                                            variant="ghost" 
                                            className={`w-full justify-start py-6 mb-2 ${selectedSubcontractorBillId === b.id ? 'bg-accent text-accent-foreground' : ''}`}
                                            onClick={() => {
                                                setSelectedSubcontractorBillId(b.id);
                                                setSelectedIpcId(null);
                                            }} 
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
                                <div className="mt-auto">
                                    <PaginationComponent
                                        currentPage={subPagination.currentPage}
                                        totalPages={subPagination.totalPages}
                                        pageSize={subPagination.pageSize}
                                        totalItems={subPagination.totalItems}
                                        onPageChange={subPagination.setCurrentPage}
                                        onPageSizeChange={subPagination.setPageSize}
                                        pageSizeOptions={[5, 10, 20]}
                                    />
                                </div>
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
                                <div className="flex items-center space-x-2">
                                    {canEdit && (
                                        <Button variant="outline" size="sm" onClick={viewingSubcontractorBill ? handleEditSubcontractorBill : handleEditIPC}>
                                            <Edit className="mr-2 h-4 w-4" />Edit
                                        </Button>
                                    )}
                                    {canDelete && (
                                        <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => {
                                            if (viewingSubcontractorBill) handleDeleteSubcontractorBill(viewingSubcontractorBill.id);
                                            else if (viewingIpc) handleDeleteIPC(viewingIpc.id);
                                        }}>
                                            <Trash2 className="mr-2 h-4 w-4" />Delete
                                        </Button>
                                    )}
                                    <Button variant="outline" size="sm" onClick={() => setPrintPreviewOpen(true)}>
                                        <Printer className="mr-2 h-4 w-4" />Preview / Print
                                    </Button>
                                </div>
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
                            {ipcForm.id ? 'Edit IPC' : 'Prepare New IPC'} (Certificate No. {ipcForm.orderOfBill})
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
                                            {(ipcForm.items || []).filter(item => (item.uptoDateQuantity || 0) > 0 || (item.currentQuantity || 0) > 0).map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="font-bold text-xs">{item.itemNo}</TableCell>
                                                    <TableCell className="text-xs">{item.description.slice(0, 60)}...</TableCell>
                                                    <TableCell>{item.unit}</TableCell>
                                                    <TableCell className="text-right">{item.rate.toLocaleString() || '0'}</TableCell>
                                                    <TableCell className="text-right bg-muted/30">{(item.previousQuantity || 0).toLocaleString() || '0'}</TableCell>
                                                    <TableCell className="text-right bg-indigo-50/30">
                                                        <Input 
                                                            type="number"
                                                            value={item.currentQuantity}
                                                            onChange={(e) => handleItemQtyChange(item.boqItemId, Number(e.target.value))}
                                                            className="w-[90px] text-right text-primary font-bold"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <p className={`font-bold ${(item.uptoDateQuantity || 0) > (item.contractQuantity || 0) ? 'text-red-500' : ''}`}>
                                                            {(item.uptoDateQuantity || 0).toLocaleString() || '0'}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold">{(item.currentAmount || 0).toLocaleString() || '0'}</TableCell>
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
                                    <Button onClick={handleSaveIPC}><CheckCircle2 className="mr-2 h-4 w-4"/>{ipcForm.id ? 'Save Changes' : 'Issue Certificate Draft'}</Button>
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
                            {subcontractorBillForm.id ? 'Edit Subcontractor Bill' : 'Prepare New Subcontractor Bill'} (Bill No. {subcontractorBillForm.billNumber})
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
                                        <Input id="bill-number" value={subcontractorBillForm.billNumber} onChange={e => setSubcontractorBillForm({...subcontractorBillForm, billNumber: e.target.value})} placeholder="e.g. SCB-2024-001" />
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
                                        disabled={!!subcontractorBillForm.id}
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
                                                // Find the component for this log
                                                let componentName = 'Unknown';
                                                
                                                if (project.structures) {
                                                    for (const structure of project.structures) {
                                                        for (const component of structure.components) {
                                                            if (component.workLogs?.some(wl => wl.id === log.id)) {
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
                                                    <TableCell className="text-right font-bold">{(item.currentAmount || 0).toLocaleString() || '0'}</TableCell>
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
                                    <Button variant="outline" onClick={() => subcontractorBillForm.id ? setIsSubcontractorBillModalOpen(false) : setSubcontractorBillCreateStep(0)}>
                                        {subcontractorBillForm.id ? 'Cancel' : <><ArrowLeft className="mr-2 h-4 w-4"/>Back to Selection</>}
                                    </Button>
                                    <Button onClick={handleSaveSubcontractorBill}><CheckCircle2 className="mr-2 h-4 w-4"/>{subcontractorBillForm.id ? 'Save Changes' : 'Issue Bill Draft'}</Button>
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
                            {viewingSubcontractorBill ? 'Subcontractor Bill' : 'Interim Payment Certificate'} - Print Layout
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-6 bg-muted">
                        <div className="bg-white p-8 mx-auto min-h-[297mm] shadow-lg text-black">
                            <div className="text-center mb-8">
                                <h1 className="text-2xl font-bold uppercase">{project.clientName || 'Department of Roads'}</h1>
                                <h2 className="text-xl font-semibold uppercase">{project.name}</h2>
                                <p className="text-sm mt-2">Location: {project.location}</p>
                            </div>
                            
                            <div className="flex justify-between mb-8 border-b pb-4">
                                <div>
                                    <p className="font-bold">Bill No: {viewingSubcontractorBill ? viewingSubcontractorBill.billNumber : viewingIpc?.billNumber}</p>
                                    <p>Date: {viewingSubcontractorBill ? viewingSubcontractorBill.date : viewingIpc?.date}</p>
                                    {viewingSubcontractorBill && (
                                        <p>Subcontractor: {project.agencies?.find(a => a.id === viewingSubcontractorBill.subcontractorId)?.name}</p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p>Contract No: {project.contractNo || 'N/A'}</p>
                                    <p>Contractor: {project.contractor}</p>
                                </div>
                            </div>

                            <table className="w-full border-collapse border border-black mb-8">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-black p-2 text-left">Item No</th>
                                        <th className="border border-black p-2 text-left">Description</th>
                                        <th className="border border-black p-2 text-right">Qty</th>
                                        <th className="border border-black p-2 text-right">Rate</th>
                                        <th className="border border-black p-2 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(viewingSubcontractorBill ? viewingSubcontractorBill.items : viewingIpc?.items)?.map(item => (
                                        <tr key={item.id}>
                                            <td className="border border-black p-2">{item.itemNo}</td>
                                            <td className="border border-black p-2 text-xs">{item.description}</td>
                                            <td className="border border-black p-2 text-right">{item.currentQuantity}</td>
                                            <td className="border border-black p-2 text-right">{item.rate.toLocaleString()}</td>
                                            <td className="border border-black p-2 text-right">{(item.currentAmount || 0).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="font-bold">
                                        <td colSpan={4} className="border border-black p-2 text-right">Gross Amount</td>
                                        <td className="border border-black p-2 text-right">
                                            {viewingSubcontractorBill 
                                                ? viewingSubcontractorBill.grossAmount.toLocaleString() 
                                                : viewingIpc?.billAmountGross?.toLocaleString()}
                                        </td>
                                    </tr>
                                    {viewingSubcontractorBill ? (
                                        <tr className="font-bold">
                                            <td colSpan={4} className="border border-black p-2 text-right">Retention ({viewingSubcontractorBill.retentionPercent}%)</td>
                                            <td className="border border-black p-2 text-right">
                                                {(viewingSubcontractorBill.grossAmount * viewingSubcontractorBill.retentionPercent / 100).toLocaleString()}
                                            </td>
                                        </tr>
                                    ) : (
                                        <>
                                            <tr className="font-bold">
                                                <td colSpan={4} className="border border-black p-2 text-right">VAT (13%)</td>
                                                <td className="border border-black p-2 text-right">{viewingIpc?.vatAmount?.toLocaleString()}</td>
                                            </tr>
                                            <tr className="font-bold">
                                                <td colSpan={4} className="border border-black p-2 text-right">Retention (5%)</td>
                                                <td className="border border-black p-2 text-right">{viewingIpc?.retentionAmount?.toLocaleString()}</td>
                                            </tr>
                                        </>
                                    )}
                                    <tr className="font-bold bg-gray-200">
                                        <td colSpan={4} className="border border-black p-2 text-right">Net Payable</td>
                                        <td className="border border-black p-2 text-right text-lg">
                                            {currency} {viewingSubcontractorBill 
                                                ? viewingSubcontractorBill.netAmount.toLocaleString() 
                                                : viewingIpc?.totalAmountPayable?.toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>

                            <div className="grid grid-cols-3 gap-8 mt-16">
                                <div className="text-center border-t border-black pt-2">
                                    <p>Prepared By</p>
                                    <p className="text-xs text-gray-500 mt-8">(Signature & Date)</p>
                                </div>
                                <div className="text-center border-t border-black pt-2">
                                    <p>Verified By</p>
                                    <p className="text-xs text-gray-500 mt-8">(Signature & Date)</p>
                                </div>
                                <div className="text-center border-t border-black pt-2">
                                    <p>Approved By</p>
                                    <p className="text-xs text-gray-500 mt-8">(Signature & Date)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPrintPreviewOpen(false)}>Close</Button>
                        <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4"/>Print / Save PDF</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BillingModule;

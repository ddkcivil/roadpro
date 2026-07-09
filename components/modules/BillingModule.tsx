import React, { useState, useMemo } from 'react';
import { Project, AppSettings, ContractBill, BillItem, SubcontractorBill, StructureWorkLog, UserRole } from '../../types';
import { formatCurrency } from '../../utils/formatting/exportUtils';
import {
    Receipt, Printer, Plus, Calculator,
    History, ArrowRight, ArrowLeft,
    Receipt as ReceiptIcon, FileCheck, TrendingUp,
    CheckCircle2, FileSpreadsheet,
    Edit, Trash2, AlertTriangle,
    FileText, ClipboardList, DollarSign,
    BarChart3, Beaker, Building2, ScrollText,
    Layers, FileBarChart, FileDigit
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
    const [ipcViewTab, setIpcViewTab] = useState('cover');

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
        const retention = billWithoutPS * 0.05;
        const tds = billWithoutPS * 0.015;
        const ncrDevFund = billWithoutPS * 0.001;
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
        setSubcontractorBillCreateStep(1);
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
        
        const workLogGroups: Record<string, StructureWorkLog[]> = {};
        selectedWorkLogs.forEach(log => {
            if (log.boqItemId) {
                if (!workLogGroups[log.boqItemId]) {
                    workLogGroups[log.boqItemId] = [];
                }
                workLogGroups[log.boqItemId].push(log);
            }
        });
        
        const items: BillItem[] = Object.keys(workLogGroups).map(boqId => {
            const boqItem = project.boq.find(b => b.id === boqId);
            if (!boqItem) return null;
            
            const workLogs = workLogGroups[boqId];
            const currentQuantity = workLogs.reduce((sum, log) => sum + log.quantity, 0);
            
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
                previousQuantity: 0,
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
                    uptoDateQuantity: newCurrentQty,
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
        setCreateStep(1);
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
            type: 'IPC',
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

    // ===== IPC MULTI-PAGE VIEW COMPONENTS =====

    const IpcCoverPage = ({ ipc }: { ipc: ContractBill }) => (
        <div className="space-y-6">
            <div className="text-center border-b pb-6 mb-6">
                <h1 className="text-2xl font-bold uppercase">Government of Nepal</h1>
                <h2 className="text-xl font-semibold">Ministry of Infrastructure Development</h2>
                <h3 className="text-lg font-bold text-blue-700">URBAN RESILIENCE AND LIVABILITY IMPROVEMENT PROJECT (URLIP)</h3>
                <h4 className="text-md font-semibold">PROJECT IMPLEMENTATION UNIT (PIU)</h4>
                <h4 className="text-md font-bold">TILOTTAMA MUNICIPALITY</h4>
                <p className="text-sm">OFFICE OF MUNICIPAL EXECUTIVE</p>
                <p className="text-sm">MANIGRAM, RUPANDEHI</p>
                <p className="text-sm font-semibold">LUMBINI PROVINCE, NEPAL</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="font-bold">Name of the Project:</p>
                    <p className="text-sm">{project.name}</p>
                </div>
                <div>
                    <p className="font-bold">Location:</p>
                    <p className="text-sm">{project.location}</p>
                </div>
                <div>
                    <p className="font-bold">Contractor:</p>
                    <p className="text-sm">{project.contractor}</p>
                </div>
                <div>
                    <p className="font-bold">Engineer:</p>
                    <p className="text-sm">{project.engineer || 'Supervision and Design Consultant'}</p>
                </div>
                <div>
                    <p className="font-bold">Contract No:</p>
                    <p className="text-sm">{project.contractNo || 'URLIP/TT/CW-01'}</p>
                </div>
                <div>
                    <p className="font-bold">IPC No:</p>
                    <p className="text-sm font-bold text-blue-700">{ipc.billNumber}</p>
                </div>
                <div>
                    <p className="font-bold">Date of Agreement:</p>
                    <p className="text-sm">{project.startDate || '2025-10-10'}</p>
                </div>
                <div>
                    <p className="font-bold">Date of Commencement:</p>
                    <p className="text-sm">{project.startDate || '2025-12-17'}</p>
                </div>
                <div>
                    <p className="font-bold">Intended Completion:</p>
                    <p className="text-sm">{project.endDate || '2027-12-16'}</p>
                </div>
                <div>
                    <p className="font-bold">Date of Measurement:</p>
                    <p className="text-sm">{ipc.dateOfMeasurement || ipc.date}</p>
                </div>
                <div>
                    <p className="font-bold">Physical Progress:</p>
                    <p className="text-sm font-bold text-green-600">{((ipc.billAmountGross || 0) / (project.boq.reduce((a, b) => a + b.amount, 0) || 1) * 100).toFixed(2)}%</p>
                </div>
                <div>
                    <p className="font-bold">Financial Progress:</p>
                    <p className="text-sm font-bold text-blue-600">{((ipc.totalAmountPayable || 0) / (project.boq.reduce((a, b) => a + b.amount, 0) || 1) * 100).toFixed(2)}%</p>
                </div>
            </div>

            <div className="border-t pt-4 mt-4 grid grid-cols-2 gap-8">
                <div className="text-center">
                    <p className="font-bold">Submitted By</p>
                    <p className="text-sm">{project.contractor}</p>
                    <div className="mt-8 border-t border-black pt-2">
                        <p className="text-xs text-gray-500">Contractor's Representative</p>
                        <p className="text-xs text-gray-500">Date:</p>
                    </div>
                </div>
                <div className="text-center">
                    <p className="font-bold">The Engineer</p>
                    <p className="text-sm">Supervision and Design Consultant</p>
                    <p className="text-sm">BDA-BN-UDAYA JV, Rupandehi, Nepal</p>
                    <div className="mt-8 border-t border-black pt-2">
                        <p className="text-xs text-gray-500">Team Leader</p>
                        <p className="text-xs text-gray-500">Date:</p>
                    </div>
                </div>
            </div>
        </div>
    );

    const IpcSummarySheet = ({ ipc }: { ipc: ContractBill }) => {
        const gross = ipc.billAmountGross || 0;
        const cpa = ipc.cpaAmount || 0;
        const ps = ipc.provisionalSum || 0;
        const withCPA = ipc.billAmountWithCPA || (gross + cpa);
        const withoutPS = ipc.billAmountWithoutPS || (withCPA - ps);
        const vat = ipc.vatAmount || (withoutPS * 0.13);
        const totalWithVat = ipc.totalBillWithVat || (withoutPS + vat + ps);
        const retention = ipc.retentionAmount || (withoutPS * 0.05);
        const tds = ipc.advanceIncomeTax || (withoutPS * 0.015);
        const devFund = ipc.contractorDevFund || (withoutPS * 0.001);
        const dedVat = ipc.deductableVat || (vat * 0.30);
        const totalDed = retention + tds + devFund + dedVat + (ipc.liquidatedDamages || 0) + (ipc.advancePaymentDeduction || 0);
        const netPayable = ipc.totalAmountPayable || (totalWithVat - totalDed);

        return (
            <div className="space-y-4">
                <div className="text-center border-b pb-3">
                    <h2 className="text-lg font-bold uppercase">Interim Payment Certificate (IPC) - {ipc.billNumber}</h2>
                    <p className="text-sm">AMOUNT SUMMARY</p>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted">
                            <TableHead className="w-12">S.N</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right w-40">Contract Amount</TableHead>
                            <TableHead className="text-right w-40">Amount in This IPC</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-bold">A</TableCell>
                            <TableCell>Provisional Sum with VAT</TableCell>
                            <TableCell className="text-right">{formatCurrency(project.boq.filter(i => i.unit === 'PS').reduce((a, b) => a + b.amount, 0), settings)}</TableCell>
                            <TableCell className="text-right font-bold text-blue-700">{formatCurrency(ps, settings)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-bold">B</TableCell>
                            <TableCell>General Items</TableCell>
                            <TableCell className="text-right">{formatCurrency(project.boq.filter(i => i.category === 'General Items').reduce((a, b) => a + b.amount, 0), settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(0, settings)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-bold">C</TableCell>
                            <TableCell>Site Clearance</TableCell>
                            <TableCell className="text-right">{formatCurrency(project.boq.filter(i => i.category === 'Site Clearance').reduce((a, b) => a + b.amount, 0), settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(0, settings)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-bold">D</TableCell>
                            <TableCell>Earthwork</TableCell>
                            <TableCell className="text-right">{formatCurrency(project.boq.filter(i => i.category === 'Earthwork').reduce((a, b) => a + b.amount, 0), settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(0, settings)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-bold">E</TableCell>
                            <TableCell>Structure Work</TableCell>
                            <TableCell className="text-right">{formatCurrency(project.boq.filter(i => i.category === 'Structure Work').reduce((a, b) => a + b.amount, 0), settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(0, settings)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-bold">F</TableCell>
                            <TableCell>Cross and Side Drainage Works</TableCell>
                            <TableCell className="text-right">{formatCurrency(project.boq.filter(i => i.category === 'Cross and Side Drainage Works').reduce((a, b) => a + b.amount, 0), settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(0, settings)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-bold">G</TableCell>
                            <TableCell>Road Work</TableCell>
                            <TableCell className="text-right">{formatCurrency(project.boq.filter(i => i.category === 'Road Works').reduce((a, b) => a + b.amount, 0), settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(0, settings)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-bold">H</TableCell>
                            <TableCell>Road Furniture</TableCell>
                            <TableCell className="text-right">{formatCurrency(project.boq.filter(i => i.category === 'Road Furnitures').reduce((a, b) => a + b.amount, 0), settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(0, settings)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-bold">I</TableCell>
                            <TableCell>Junction Improvement</TableCell>
                            <TableCell className="text-right">{formatCurrency(project.boq.filter(i => i.category === 'Junction Improvement').reduce((a, b) => a + b.amount, 0), settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(0, settings)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-bold">J</TableCell>
                            <TableCell>Day Work</TableCell>
                            <TableCell className="text-right">{formatCurrency(project.boq.filter(i => i.category === 'Day Works').reduce((a, b) => a + b.amount, 0), settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(0, settings)}</TableCell>
                        </TableRow>
                        <TableRow className="bg-muted/50 font-bold">
                            <TableCell className="font-bold">K</TableCell>
                            <TableCell>Sub Total (B+...+J)</TableCell>
                            <TableCell className="text-right">{formatCurrency(project.boq.filter(i => i.unit !== 'PS').reduce((a, b) => a + b.amount, 0), settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(gross, settings)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-bold">M</TableCell>
                            <TableCell>Price Adjustment</TableCell>
                            <TableCell className="text-right">0</TableCell>
                            <TableCell className="text-right">{formatCurrency(cpa, settings)}</TableCell>
                        </TableRow>
                        <TableRow className="bg-blue-50 font-bold">
                            <TableCell className="font-bold">O</TableCell>
                            <TableCell>Total including PS</TableCell>
                            <TableCell className="text-right">{formatCurrency(project.boq.reduce((a, b) => a + b.amount, 0), settings)}</TableCell>
                            <TableCell className="text-right text-lg">{formatCurrency(withCPA, settings)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-bold">P</TableCell>
                            <TableCell>Add VAT @ 13%</TableCell>
                            <TableCell className="text-right">{formatCurrency(project.boq.filter(i => i.unit !== 'PS').reduce((a, b) => a + b.amount, 0) * 0.13, settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(vat, settings)}</TableCell>
                        </TableRow>
                        <TableRow className="bg-green-50 font-bold">
                            <TableCell className="font-bold">Q</TableCell>
                            <TableCell>Grand Total</TableCell>
                            <TableCell className="text-right">{formatCurrency(project.boq.reduce((a, b) => a + b.amount, 0) * 1.13, settings)}</TableCell>
                            <TableCell className="text-right text-lg text-green-700">{formatCurrency(totalWithVat, settings)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>

                <div className="border-t pt-4 mt-4">
                    <h3 className="font-bold text-lg mb-3">Deductions</h3>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-red-50">
                                <TableHead className="w-12">S.N</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right w-40">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-bold">i</TableCell>
                                <TableCell>Repayment of Advance Payment (10% of O)</TableCell>
                                <TableCell className="text-right">{formatCurrency(ipc.advancePaymentDeduction || 0, settings)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-bold">ii</TableCell>
                                <TableCell>Tax Deduction at Source (TDS) @ 1.5%</TableCell>
                                <TableCell className="text-right">{formatCurrency(tds, settings)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-bold">iii</TableCell>
                                <TableCell>Retention Money @ 5%</TableCell>
                                <TableCell className="text-right">{formatCurrency(retention, settings)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-bold">iv</TableCell>
                                <TableCell>Contractor's Association Fund @ 0.1%</TableCell>
                                <TableCell className="text-right">{formatCurrency(devFund, settings)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-bold">v</TableCell>
                                <TableCell>Deductible VAT (30% of VAT)</TableCell>
                                <TableCell className="text-right">{formatCurrency(dedVat, settings)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-bold">vi</TableCell>
                                <TableCell>Liquidated Damages</TableCell>
                                <TableCell className="text-right">{formatCurrency(ipc.liquidatedDamages || 0, settings)}</TableCell>
                            </TableRow>
                            <TableRow className="bg-red-100 font-bold">
                                <TableCell className="font-bold">X</TableCell>
                                <TableCell>Total Deductions</TableCell>
                                <TableCell className="text-right text-lg text-red-700">{formatCurrency(totalDed, settings)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>

                <div className="bg-green-100 p-4 rounded-lg border border-green-300 mt-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold">Y. Net Payable Amount in this IPC</h3>
                        <p className="text-2xl font-black text-green-800">{formatCurrency(netPayable, settings)}</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6 border-t pt-4">
                    <div className="text-center">
                        <p className="font-bold">Submitted By</p>
                        <p className="text-sm">The Contractor</p>
                        <div className="mt-6 border-t border-black pt-2">
                            <p className="text-xs">Contractor's Representative</p>
                            <p className="text-xs">Date:</p>
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="font-bold">Checked, Verified & Recommended By</p>
                        <p className="text-sm">The Engineer</p>
                        <div className="mt-6 border-t border-black pt-2">
                            <p className="text-xs">CSSE / DTL / Team Leader</p>
                            <p className="text-xs">Date:</p>
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="font-bold">Verified/Approved By</p>
                        <p className="text-sm">The Employer</p>
                        <div className="mt-6 border-t border-black pt-2">
                            <p className="text-xs">Technical Officer / Project Manager</p>
                            <p className="text-xs">Date:</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const IpcPaymentSummary = ({ ipc }: { ipc: ContractBill }) => {
        const gross = ipc.billAmountGross || 0;
        const cpa = ipc.cpaAmount || 0;
        const ps = ipc.provisionalSum || 0;
        const withCPA = ipc.billAmountWithCPA || (gross + cpa);
        const withoutPS = ipc.billAmountWithoutPS || (withCPA - ps);
        const vat = ipc.vatAmount || (withoutPS * 0.13);
        const totalWithVat = ipc.totalBillWithVat || (withoutPS + vat + ps);
        const retention = ipc.retentionAmount || (withoutPS * 0.05);
        const tds = ipc.advanceIncomeTax || (withoutPS * 0.015);
        const devFund = ipc.contractorDevFund || (withoutPS * 0.001);
        const totalDed = retention + tds + devFund + (ipc.liquidatedDamages || 0) + (ipc.advancePaymentDeduction || 0);
        const netPayable = ipc.totalAmountPayable || (totalWithVat - totalDed);

        return (
            <div className="space-y-4">
                <div className="text-center border-b pb-3">
                    <h2 className="text-lg font-bold uppercase">Payment Summary Sheet</h2>
                    <p className="text-sm">Interim Payment Certificate - {ipc.billNumber}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p><span className="font-semibold">Original Contract Amount (incl. VAT):</span> {formatCurrency(project.boq.reduce((a, b) => a + b.amount, 0) * 1.13, settings)}</p>
                        <p><span className="font-semibold">Original Contract Amount (excl. VAT):</span> {formatCurrency(project.boq.reduce((a, b) => a + b.amount, 0), settings)}</p>
                        <p><span className="font-semibold">Contract Period:</span> 730 Days (24 Months)</p>
                    </div>
                    <div>
                        <p><span className="font-semibold">Contract Commencement:</span> {project.startDate || '17/12/2025'}</p>
                        <p><span className="font-semibold">Original Completion:</span> {project.endDate || '16/12/2027'}</p>
                        <p><span className="font-semibold">Defect Liability Period:</span> 365 Days</p>
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted">
                            <TableHead className="w-8">SN</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right w-36">Previous IPC</TableHead>
                            <TableHead className="text-right w-36">Current IPC</TableHead>
                            <TableHead className="text-right w-36">Total to Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell className="font-bold">A</TableCell>
                            <TableCell>Bill Amount without PS</TableCell>
                            <TableCell className="text-right">0</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(gross, settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(gross, settings)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-bold">B</TableCell>
                            <TableCell>Provisional Sum (PS)</TableCell>
                            <TableCell className="text-right">0</TableCell>
                            <TableCell className="text-right font-bold text-blue-700">{formatCurrency(ps, settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(ps, settings)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-bold">C</TableCell>
                            <TableCell>Price Adjustment</TableCell>
                            <TableCell className="text-right">0</TableCell>
                            <TableCell className="text-right">{formatCurrency(cpa, settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(cpa, settings)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-bold">D</TableCell>
                            <TableCell>Bill Amount + Price Adjustment + PS</TableCell>
                            <TableCell className="text-right">0</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(withCPA, settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(withCPA, settings)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-bold">E</TableCell>
                            <TableCell>VAT @ 13%</TableCell>
                            <TableCell className="text-right">0</TableCell>
                            <TableCell className="text-right">{formatCurrency(vat, settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(vat, settings)}</TableCell>
                        </TableRow>
                        <TableRow className="bg-green-50 font-bold">
                            <TableCell className="font-bold">F</TableCell>
                            <TableCell>Total Bill Amount</TableCell>
                            <TableCell className="text-right">0</TableCell>
                            <TableCell className="text-right text-lg text-green-700">{formatCurrency(totalWithVat, settings)}</TableCell>
                            <TableCell className="text-right text-lg">{formatCurrency(totalWithVat, settings)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>

                <div className="border-t pt-4">
                    <h3 className="font-bold mb-2">Deductions</h3>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-red-50">
                                <TableHead className="w-8">SN</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right w-36">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell>1</TableCell>
                                <TableCell>Retention Money @ 5% of D</TableCell>
                                <TableCell className="text-right">{formatCurrency(retention, settings)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>2</TableCell>
                                <TableCell>Advance Payment Deduction</TableCell>
                                <TableCell className="text-right">{formatCurrency(ipc.advancePaymentDeduction || 0, settings)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>3</TableCell>
                                <TableCell>Advance Income Tax @ 1.5% of D</TableCell>
                                <TableCell className="text-right">{formatCurrency(tds, settings)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>4</TableCell>
                                <TableCell>Liquidated Damages</TableCell>
                                <TableCell className="text-right">{formatCurrency(ipc.liquidatedDamages || 0, settings)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>5</TableCell>
                                <TableCell>Contractor's Development Fund @ 0.1% of D</TableCell>
                                <TableCell className="text-right">{formatCurrency(devFund, settings)}</TableCell>
                            </TableRow>
                            <TableRow className="bg-red-100 font-bold">
                                <TableCell>H</TableCell>
                                <TableCell>Total Deductions</TableCell>
                                <TableCell className="text-right text-lg text-red-700">{formatCurrency(totalDed, settings)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>

                <div className="bg-green-100 p-4 rounded-lg border border-green-300">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold">I. Total Amount Payable to the Contractor (Including VAT)</h3>
                        <p className="text-2xl font-black text-green-800">{formatCurrency(netPayable, settings)}</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4 border-t pt-4">
                    <div className="text-center">
                        <p className="font-bold text-sm">Submitted By</p>
                        <div className="mt-4 border-t border-black pt-1">
                            <p className="text-xs">Er. Dharma Dhoj Kunwar</p>
                            <p className="text-xs">CR/PM</p>
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-sm">Checked, Verified & Recommended By</p>
                        <div className="mt-4 border-t border-black pt-1">
                            <p className="text-xs">Er. Krishna Pd. Panthi / Er. Tribhuvan Parshad Shrestha</p>
                            <p className="text-xs">CSSE / DTL, SDC</p>
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-sm">Verified/Approved By</p>
                        <div className="mt-4 border-t border-black pt-1">
                            <p className="text-xs">Hari Acharya / Yub Raj Panthi / Pradip Ban</p>
                            <p className="text-xs">Technical Officer / Deputy PM / Project Manager</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const IpcBillMeasurement = ({ ipc }: { ipc: ContractBill }) => (
        <div className="space-y-4">
            <div className="text-center border-b pb-3">
                <h2 className="text-lg font-bold uppercase">Bill Measurement - {ipc.billNumber}</h2>
                <p className="text-sm">Work execution Period: {ipc.dateOfMeasurement || ipc.date}</p>
            </div>

            <Table>
                <TableHeader>
                    <TableRow className="bg-muted">
                        <TableHead className="w-8">S.N</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right w-28">Contract Amount</TableHead>
                        <TableHead className="text-right w-28">Upto Previous IPC</TableHead>
                        <TableHead className="text-right w-28 bg-blue-50">In Current IPC</TableHead>
                        <TableHead className="text-right w-28">Amount upto this IPC</TableHead>
                        <TableHead>Remarks</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow className="bg-yellow-50">
                        <TableCell className="font-bold">1</TableCell>
                        <TableCell className="font-semibold">PROVISIONAL SUM (VAT INCLUDED)</TableCell>
                        <TableCell className="text-right">{formatCurrency(project.boq.filter(i => i.unit === 'PS').reduce((a, b) => a + b.amount, 0), settings)}</TableCell>
                        <TableCell className="text-right">0</TableCell>
                        <TableCell className="text-right font-bold text-blue-700">{formatCurrency(ipc.provisionalSum || 0, settings)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(ipc.provisionalSum || 0, settings)}</TableCell>
                        <TableCell className="text-xs"></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="font-bold">2</TableCell>
                        <TableCell>GENERAL ITEMS</TableCell>
                        <TableCell className="text-right">{formatCurrency(project.boq.filter(i => i.category === 'General Items').reduce((a, b) => a + b.amount, 0), settings)}</TableCell>
                        <TableCell className="text-right">0</TableCell>
                        <TableCell className="text-right">{formatCurrency(0, settings)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(0, settings)}</TableCell>
                        <TableCell className="text-xs"></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="font-bold">3</TableCell>
                        <TableCell>SITE CLEARANCE</TableCell>
                        <TableCell className="text-right">{formatCurrency(project.boq.filter(i => i.category === 'Site Clearance').reduce((a, b) => a + b.amount, 0), settings)}</TableCell>
                        <TableCell className="text-right">0</TableCell>
                        <TableCell className="text-right">{formatCurrency(0, settings)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(0, settings)}</TableCell>
                        <TableCell className="text-xs"></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="font-bold">4</TableCell>
                        <TableCell>EARTHWORK</TableCell>
                        <TableCell className="text-right">{formatCurrency(project.boq.filter(i => i.category === 'Earthwork').reduce((a, b) => a + b.amount, 0), settings)}</TableCell>
                        <TableCell className="text-right">0</TableCell>
                        <TableCell className="text-right">{formatCurrency(0, settings)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(0, settings)}</TableCell>
                        <TableCell className="text-xs"></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="font-bold">5</TableCell>
                        <TableCell>STRUCTURE WORK</TableCell>
                        <TableCell className="text-right">{formatCurrency(project.boq.filter(i => i.category === 'Structure Work').reduce((a, b) => a + b.amount, 0), settings)}</TableCell>
                        <TableCell className="text-right">0</TableCell>
                        <TableCell className="text-right">{formatCurrency(0, settings)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(0, settings)}</TableCell>
                        <TableCell className="text-xs"></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="font-bold">6</TableCell>
                        <TableCell>CROSS AND SIDE DRAINAGE WORKS</TableCell>
                        <TableCell className="text-right">{formatCurrency(project.boq.filter(i => i.category === 'Cross and Side Drainage Works').reduce((a, b) => a + b.amount, 0), settings)}</TableCell>
                        <TableCell className="text-right">0</TableCell>
                        <TableCell className="text-right">{formatCurrency(0, settings)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(0, settings)}</TableCell>
                        <TableCell className="text-xs"></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="font-bold">7</TableCell>
                        <TableCell>ROAD WORKS</TableCell>
                        <TableCell className="text-right">{formatCurrency(project.boq.filter(i => i.category === 'Road Works').reduce((a, b) => a + b.amount, 0), settings)}</TableCell>
                        <TableCell className="text-right">0</TableCell>
                        <TableCell className="text-right">{formatCurrency(0, settings)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(0, settings)}</TableCell>
                        <TableCell className="text-xs"></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="font-bold">8</TableCell>
                        <TableCell>ROAD FURNITURES</TableCell>
                        <TableCell className="text-right">{formatCurrency(project.boq.filter(i => i.category === 'Road Furnitures').reduce((a, b) => a + b.amount, 0), settings)}</TableCell>
                        <TableCell className="text-right">0</TableCell>
                        <TableCell className="text-right">{formatCurrency(0, settings)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(0, settings)}</TableCell>
                        <TableCell className="text-xs"></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="font-bold">9</TableCell>
                        <TableCell>JUNCTION IMPROVEMENT</TableCell>
                        <TableCell className="text-right">{formatCurrency(project.boq.filter(i => i.category === 'Junction Improvement').reduce((a, b) => a + b.amount, 0), settings)}</TableCell>
                        <TableCell className="text-right">0</TableCell>
                        <TableCell className="text-right">{formatCurrency(0, settings)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(0, settings)}</TableCell>
                        <TableCell className="text-xs"></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="font-bold">10</TableCell>
                        <TableCell>DAY WORKS</TableCell>
                        <TableCell className="text-right">{formatCurrency(project.boq.filter(i => i.category === 'Day Works').reduce((a, b) => a + b.amount, 0), settings)}</TableCell>
                        <TableCell className="text-right">0</TableCell>
                        <TableCell className="text-right">{formatCurrency(0, settings)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(0, settings)}</TableCell>
                        <TableCell className="text-xs"></TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/50 font-bold">
                        <TableCell className="font-bold">11</TableCell>
                        <TableCell>Total Excluding PS (K)</TableCell>
                        <TableCell className="text-right">{formatCurrency(project.boq.filter(i => i.unit !== 'PS').reduce((a, b) => a + b.amount, 0), settings)}</TableCell>
                        <TableCell className="text-right">0</TableCell>
                        <TableCell className="text-right">{formatCurrency(ipc.billAmountGross || 0, settings)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(ipc.billAmountGross || 0, settings)}</TableCell>
                        <TableCell className="text-xs"></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="font-bold">13</TableCell>
                        <TableCell>Price Adjustment (M)</TableCell>
                        <TableCell className="text-right">0</TableCell>
                        <TableCell className="text-right">0</TableCell>
                        <TableCell className="text-right">{formatCurrency(ipc.cpaAmount || 0, settings)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(ipc.cpaAmount || 0, settings)}</TableCell>
                        <TableCell className="text-xs"></TableCell>
                    </TableRow>
                    <TableRow className="bg-blue-50 font-bold">
                        <TableCell className="font-bold">14</TableCell>
                        <TableCell>Total Amounts Including PS (N)</TableCell>
                        <TableCell className="text-right">{formatCurrency(project.boq.reduce((a, b) => a + b.amount, 0), settings)}</TableCell>
                        <TableCell className="text-right">0</TableCell>
                        <TableCell className="text-right text-lg">{formatCurrency((ipc.billAmountWithCPA || 0), settings)}</TableCell>
                        <TableCell className="text-right text-lg">{formatCurrency((ipc.billAmountWithCPA || 0), settings)}</TableCell>
                        <TableCell className="text-xs"></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="font-bold">15</TableCell>
                        <TableCell>VAT @ 13% (O)</TableCell>
                        <TableCell className="text-right">{formatCurrency(project.boq.filter(i => i.unit !== 'PS').reduce((a, b) => a + b.amount, 0) * 0.13, settings)}</TableCell>
                        <TableCell className="text-right">0</TableCell>
                        <TableCell className="text-right">{formatCurrency(ipc.vatAmount || 0, settings)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(ipc.vatAmount || 0, settings)}</TableCell>
                        <TableCell className="text-xs"></TableCell>
                    </TableRow>
                    <TableRow className="bg-green-50 font-bold">
                        <TableCell className="font-bold">16</TableCell>
                        <TableCell>Total amount of work done (P)</TableCell>
                        <TableCell className="text-right">{formatCurrency(project.boq.reduce((a, b) => a + b.amount, 0) * 1.13, settings)}</TableCell>
                        <TableCell className="text-right">0</TableCell>
                        <TableCell className="text-right text-lg text-green-700">{formatCurrency(ipc.totalBillWithVat || 0, settings)}</TableCell>
                        <TableCell className="text-right text-lg">{formatCurrency(ipc.totalBillWithVat || 0, settings)}</TableCell>
                        <TableCell className="text-xs"></TableCell>
                    </TableRow>
                </TableBody>
            </Table>

            <div className="bg-green-100 p-4 rounded-lg border border-green-300">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">Net Payable Amount in this IPC</h3>
                    <p className="text-2xl font-black text-green-800">{formatCurrency(ipc.totalAmountPayable || 0, settings)}</p>
                </div>
            </div>
        </div>
    );

    const IpcFundingSplit = ({ ipc }: { ipc: ContractBill }) => {
        const gross = ipc.billAmountGross || 0;
        const ps = ipc.provisionalSum || 0;
        const total = gross + ps;
        
        // Standard funding split: Central Gov 15.1%, ADB Loan 59.9%, TDF Loan 18%, Municipal 7%
        const centralGov = total * 0.151;
        const adbLoan = total * 0.599;
        const tdfLoan = total * 0.18;
        const municipal = total * 0.07;
        
        const vat = ipc.vatAmount || 0;
        const vatCentral = vat * 0.151;
        const vatAdb = vat * 0.599;
        const vatTdf = vat * 0.18;
        const vatMunicipal = vat * 0.07;
        
        const retention = ipc.retentionAmount || 0;
        const tds = ipc.advanceIncomeTax || 0;
        const devFund = ipc.contractorDevFund || 0;

        return (
            <div className="space-y-4">
                <div className="text-center border-b pb-3">
                    <h2 className="text-lg font-bold uppercase">Funding Distribution</h2>
                    <p className="text-sm">IPC-01 - Funding Source Allocation</p>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted">
                            <TableHead className="w-8">S.No</TableHead>
                            <TableHead>Component</TableHead>
                            <TableHead className="text-right">Amount (NPR)</TableHead>
                            <TableHead className="text-right">Central Gov (15.1%)</TableHead>
                            <TableHead className="text-right">ADB Loan (59.9%)</TableHead>
                            <TableHead className="text-right">TDF Loan (18%)</TableHead>
                            <TableHead className="text-right">Municipal (7%)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow className="bg-blue-50 font-bold">
                            <TableCell>A</TableCell>
                            <TableCell>Payment in this IPC (without VAT, retention, TDS)</TableCell>
                            <TableCell className="text-right">{formatCurrency(total, settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(centralGov, settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(adbLoan, settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(tdfLoan, settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(municipal, settings)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>C</TableCell>
                            <TableCell>Sub-Total</TableCell>
                            <TableCell className="text-right">{formatCurrency(total, settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(centralGov, settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(adbLoan, settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(tdfLoan, settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(municipal, settings)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>D</TableCell>
                            <TableCell>VAT 13%</TableCell>
                            <TableCell className="text-right">{formatCurrency(vat, settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(vatCentral, settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(vatAdb, settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(vatTdf, settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(vatMunicipal, settings)}</TableCell>
                        </TableRow>
                        <TableRow className="bg-green-50 font-bold">
                            <TableCell>E</TableCell>
                            <TableCell>Grand Total with VAT</TableCell>
                            <TableCell className="text-right text-lg">{formatCurrency(total + vat, settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(centralGov + vatCentral, settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(adbLoan + vatAdb, settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(tdfLoan + vatTdf, settings)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(municipal + vatMunicipal, settings)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>

                <div className="border-t pt-4">
                    <h3 className="font-bold mb-2">Deductions Distribution</h3>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-red-50">
                                <TableHead className="w-8">S.No</TableHead>
                                <TableHead>Deduction</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-right">Central Gov</TableHead>
                                <TableHead className="text-right">ADB Loan</TableHead>
                                <TableHead className="text-right">TDF Loan</TableHead>
                                <TableHead className="text-right">Municipal</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell>G</TableCell>
                                <TableCell>Retention @ 5%</TableCell>
                                <TableCell className="text-right">{formatCurrency(retention, settings)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(retention * 0.151, settings)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(retention * 0.599, settings)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(retention * 0.18, settings)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(retention * 0.07, settings)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>H</TableCell>
                                <TableCell>TDS @ 1.5%</TableCell>
                                <TableCell className="text-right">{formatCurrency(tds, settings)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(tds * 0.151, settings)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(tds * 0.599, settings)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(tds * 0.18, settings)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(tds * 0.07, settings)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>I</TableCell>
                                <TableCell>Contractor's Fund @ 0.1%</TableCell>
                                <TableCell className="text-right">{formatCurrency(devFund, settings)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(devFund * 0.151, settings)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(devFund * 0.599, settings)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(devFund * 0.18, settings)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(devFund * 0.07, settings)}</TableCell>
                            </TableRow>
                            <TableRow className="bg-red-100 font-bold">
                                <TableCell>J</TableCell>
                                <TableCell>Total Deduction</TableCell>
                                <TableCell className="text-right">{formatCurrency(retention + tds + devFund, settings)}</TableCell>
                                <TableCell className="text-right">{formatCurrency((retention + tds + devFund) * 0.151, settings)}</TableCell>
                                <TableCell className="text-right">{formatCurrency((retention + tds + devFund) * 0.599, settings)}</TableCell>
                                <TableCell className="text-right">{formatCurrency((retention + tds + devFund) * 0.18, settings)}</TableCell>
                                <TableCell className="text-right">{formatCurrency((retention + tds + devFund) * 0.07, settings)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>

                <div className="bg-green-100 p-4 rounded-lg border border-green-300">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold">Net Payable in this IPC (with VAT)</h3>
                        <p className="text-2xl font-black text-green-800">{formatCurrency(ipc.totalAmountPayable || 0, settings)}</p>
                    </div>
                </div>
            </div>
        );
    };

    const IpcBOQItems = ({ ipc }: { ipc: ContractBill }) => (
        <div className="space-y-4">
            <div className="text-center border-b pb-3">
                <h2 className="text-lg font-bold uppercase">BOQ Item Details</h2>
                <p className="text-sm">Work Items in Current IPC</p>
            </div>

            <Table>
                <TableHeader>
                    <TableRow className="bg-muted">
                        <TableHead className="w-16">Item No</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-12">Unit</TableHead>
                        <TableHead className="text-right w-24">Contract Qty</TableHead>
                        <TableHead className="text-right w-24">Rate</TableHead>
                        <TableHead className="text-right w-24 bg-muted">Previous</TableHead>
                        <TableHead className="text-right w-24 bg-blue-50">Current</TableHead>
                        <TableHead className="text-right w-24">Upto-Date</TableHead>
                        <TableHead className="text-right w-28">Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(ipc.items || []).filter(item => (item.uptoDateQuantity || 0) > 0 || (item.currentQuantity || 0) > 0).map((item) => (
                        <TableRow key={item.id}>
                            <TableCell className="font-bold text-xs">{item.itemNo}</TableCell>
                            <TableCell className="text-xs max-w-[300px] truncate" title={item.description}>{item.description}</TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell className="text-right">{(item.contractQuantity || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right">{item.rate.toLocaleString()}</TableCell>
                            <TableCell className="text-right bg-muted/30">{(item.previousQuantity || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right bg-blue-50 font-bold">{(item.currentQuantity || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right">{(item.uptoDateQuantity || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right font-bold">{(item.currentAmount || 0).toLocaleString()}</TableCell>
                        </TableRow>
                    ))}
                    {(ipc.items || []).filter(item => (item.uptoDateQuantity || 0) > 0 || (item.currentQuantity || 0) > 0).length === 0 && (
                        <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                No BOQ items with quantities in this IPC.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
                <tfoot>
                    <TableRow className="bg-blue-100 font-bold">
                        <TableCell colSpan={8} className="text-right text-lg">Total Current Amount</TableCell>
                        <TableCell className="text-right text-lg">{formatCurrency(ipc.billAmountGross || 0, settings)}</TableCell>
                    </TableRow>
                </tfoot>
            </Table>
        </div>
    );

    const IpcTestingSummary = () => (
        <div className="space-y-4">
            <div className="text-center border-b pb-3">
                <h2 className="text-lg font-bold uppercase">Testing Frequency Summary</h2>
                <p className="text-sm">Quantity vs Frequency of Tests (IPC-01)</p>
            </div>

            <Table>
                <TableHeader>
                    <TableRow className="bg-muted">
                        <TableHead className="w-8">S.N</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead>Test</TableHead>
                        <TableHead className="text-right w-24">Current Qty</TableHead>
                        <TableHead className="text-right w-24">Required Tests</TableHead>
                        <TableHead className="text-right w-24 bg-green-50">Tests Done</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell>1</TableCell>
                        <TableCell>Subgrade</TableCell>
                        <TableCell>Field Density</TableCell>
                        <TableCell className="text-right">0</TableCell>
                        <TableCell className="text-right">0</TableCell>
                        <TableCell className="text-right bg-green-50">0</TableCell>
                        <TableCell><span className="text-green-600 text-xs font-bold">● Compliant</span></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>2</TableCell>
                        <TableCell>GSB</TableCell>
                        <TableCell>Gradation, PI, MDD, CBR</TableCell>
                        <TableCell className="text-right">0</TableCell>
                        <TableCell className="text-right">0</TableCell>
                        <TableCell className="text-right bg-green-50">0</TableCell>
                        <TableCell><span className="text-green-600 text-xs font-bold">● Compliant</span></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>3</TableCell>
                        <TableCell>Base Course (WMM)</TableCell>
                        <TableCell>Gradation, PI, MDD, CBR, LAA, AIV</TableCell>
                        <TableCell className="text-right">0</TableCell>
                        <TableCell className="text-right">0</TableCell>
                        <TableCell className="text-right bg-green-50">0</TableCell>
                        <TableCell><span className="text-green-600 text-xs font-bold">● Compliant</span></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>4</TableCell>
                        <TableCell>Bitumen (VG 10)</TableCell>
                        <TableCell>Penetration, Flash Point, Ductility</TableCell>
                        <TableCell className="text-right">0</TableCell>
                        <TableCell className="text-right">0</TableCell>
                        <TableCell className="text-right bg-green-50">0</TableCell>
                        <TableCell><span className="text-green-600 text-xs font-bold">● Compliant</span></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>5</TableCell>
                        <TableCell>Cement</TableCell>
                        <TableCell>Consistency, Setting Time, Strength</TableCell>
                        <TableCell className="text-right">148</TableCell>
                        <TableCell className="text-right">1</TableCell>
                        <TableCell className="text-right bg-green-50">1</TableCell>
                        <TableCell><span className="text-green-600 text-xs font-bold">● Compliant</span></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>6</TableCell>
                        <TableCell>Concrete (M15)</TableCell>
                        <TableCell>Compressive Strength (Cube)</TableCell>
                        <TableCell className="text-right">19.97</TableCell>
                        <TableCell className="text-right">4</TableCell>
                        <TableCell className="text-right bg-green-50">4</TableCell>
                        <TableCell><span className="text-green-600 text-xs font-bold">● Compliant</span></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>7</TableCell>
                        <TableCell>Concrete (M20)</TableCell>
                        <TableCell>Compressive Strength (Cube)</TableCell>
                        <TableCell className="text-right">65.31</TableCell>
                        <TableCell className="text-right">14</TableCell>
                        <TableCell className="text-right bg-green-50">15</TableCell>
                        <TableCell><span className="text-green-600 text-xs font-bold">● Compliant</span></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>8</TableCell>
                        <TableCell>Reinforcement Steel</TableCell>
                        <TableCell>Tensile, Yield, Elongation</TableCell>
                        <TableCell className="text-right">4.69</TableCell>
                        <TableCell className="text-right">1</TableCell>
                        <TableCell className="text-right bg-green-50">4</TableCell>
                        <TableCell><span className="text-green-600 text-xs font-bold">● Compliant</span></TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>9</TableCell>
                        <TableCell>Bricks</TableCell>
                        <TableCell>Compressive Strength</TableCell>
                        <TableCell className="text-right">267</TableCell>
                        <TableCell className="text-right">1</TableCell>
                        <TableCell className="text-right bg-green-50">1</TableCell>
                        <TableCell><span className="text-green-600 text-xs font-bold">● Compliant</span></TableCell>
                    </TableRow>
                </TableBody>
            </Table>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-green-800">
                    <span className="font-bold">Note:</span> All required tests have been conducted as per the specification frequency requirements. 
                    Test results are within acceptable limits.
                </p>
            </div>
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
                                            setIpcViewTab('cover');
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
                {viewingIpc ? (
                    <div className="space-y-4">
                        <Card>
                            <CardContent className="flex justify-between items-center p-4">
                                <div className="flex items-center space-x-4">
                                    <div className="w-14 h-14 rounded-xl bg-secondary text-primary flex items-center justify-center">
                                        <ReceiptIcon className="h-7 w-7" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">{viewingIpc.billNumber}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Order: {viewingIpc.orderOfBill} • Date: {viewingIpc.date} • Net Payable: <span className="font-bold text-green-600">{formatCurrency(viewingIpc.totalAmountPayable || 0, settings)}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {canEdit && (
                                        <Button variant="outline" size="sm" onClick={handleEditIPC}>
                                            <Edit className="mr-2 h-4 w-4" />Edit
                                        </Button>
                                    )}
                                    {canDelete && (
                                        <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleDeleteIPC(viewingIpc.id)}>
                                            <Trash2 className="mr-2 h-4 w-4" />Delete
                                        </Button>
                                    )}
                                    <Button variant="outline" size="sm" onClick={() => setPrintPreviewOpen(true)}>
                                        <Printer className="mr-2 h-4 w-4" />Preview / Print
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Multi-Page IPC Viewer Tabs */}
                        <Card>
                            <Tabs value={ipcViewTab} onValueChange={setIpcViewTab}>
                                <TabsList className="grid grid-cols-6 h-auto p-1">
                                    <TabsTrigger value="cover" className="text-xs py-2">
                                        <FileText className="h-3.5 w-3.5 mr-1" /> Cover
                                    </TabsTrigger>
                                    <TabsTrigger value="summary" className="text-xs py-2">
                                        <ClipboardList className="h-3.5 w-3.5 mr-1" /> IPC Summary
                                    </TabsTrigger>
                                    <TabsTrigger value="payment" className="text-xs py-2">
                                        <DollarSign className="h-3.5 w-3.5 mr-1" /> Payment
                                    </TabsTrigger>
                                    <TabsTrigger value="measurement" className="text-xs py-2">
                                        <BarChart3 className="h-3.5 w-3.5 mr-1" /> Measurement
                                    </TabsTrigger>
                                    <TabsTrigger value="boq" className="text-xs py-2">
                                        <ScrollText className="h-3.5 w-3.5 mr-1" /> BOQ Items
                                    </TabsTrigger>
                                    <TabsTrigger value="funding" className="text-xs py-2">
                                        <Building2 className="h-3.5 w-3.5 mr-1" /> Funding
                                    </TabsTrigger>
                                </TabsList>

                                <CardContent className="p-4">
                                    <TabsContent value="cover">
                                        <IpcCoverPage ipc={viewingIpc} />
                                    </TabsContent>
                                    <TabsContent value="summary">
                                        <IpcSummarySheet ipc={viewingIpc} />
                                    </TabsContent>
                                    <TabsContent value="payment">
                                        <IpcPaymentSummary ipc={viewingIpc} />
                                    </TabsContent>
                                    <TabsContent value="measurement">
                                        <IpcBillMeasurement ipc={viewingIpc} />
                                    </TabsContent>
                                    <TabsContent value="boq">
                                        <IpcBOQItems ipc={viewingIpc} />
                                    </TabsContent>
                                    <TabsContent value="funding">
                                        <IpcFundingSplit ipc={viewingIpc} />
                                    </TabsContent>
                                </CardContent>
                            </Tabs>
                        </Card>

                        {/* Quick Summary Card */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Card>
                                <CardContent className="pt-4">
                                    <p className="text-xs text-muted-foreground uppercase">Gross Work</p>
                                    <p className="text-xl font-bold">{formatCurrency(viewingIpc.billAmountGross || 0, settings)}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-4">
                                    <p className="text-xs text-muted-foreground uppercase">VAT (13%)</p>
                                    <p className="text-xl font-bold">{formatCurrency(viewingIpc.vatAmount || 0, settings)}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-4">
                                    <p className="text-xs text-muted-foreground uppercase">Total Deductions</p>
                                    <p className="text-xl font-bold text-red-600">{formatCurrency((viewingIpc.retentionAmount || 0) + (viewingIpc.advanceIncomeTax || 0) + (viewingIpc.contractorDevFund || 0) + (viewingIpc.liquidatedDamages || 0) + (viewingIpc.advancePaymentDeduction || 0), settings)}</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-green-50 border-green-200">
                                <CardContent className="pt-4">
                                    <p className="text-xs text-green-700 uppercase font-bold">Net Payable</p>
                                    <p className="text-xl font-bold text-green-800">{formatCurrency(viewingIpc.totalAmountPayable || 0, settings)}</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                ) : viewingSubcontractorBill ? (
                    <div className="space-y-4">
                        <Card>
                            <CardContent className="flex justify-between items-center p-4">
                                <div className="flex items-center space-x-4">
                                    <div className="w-14 h-14 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                                        <FileCheck className="h-7 w-7" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">{viewingSubcontractorBill.billNumber}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Subcontractor Bill • Date: {viewingSubcontractorBill.date}<br />
                                            {project.agencies?.find(a => a.id === viewingSubcontractorBill.subcontractorId)?.name || 'Unknown Subcontractor'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {canEdit && (
                                        <Button variant="outline" size="sm" onClick={handleEditSubcontractorBill}>
                                            <Edit className="mr-2 h-4 w-4" />Edit
                                        </Button>
                                    )}
                                    {canDelete && (
                                        <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleDeleteSubcontractorBill(viewingSubcontractorBill.id)}>
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
                                            <TableRow><TableCell>{getRowLabel('1', 'Gross Bill Amount')}</TableCell><TableCell className="text-right">{formatCurrency(viewingSubcontractorBill.grossAmount, settings)}</TableCell></TableRow>
                                            <TableRow><TableCell>{getRowLabel('2', `Less: Retention (${viewingSubcontractorBill.retentionPercent || 0}%)`)}</TableCell><TableCell className="text-right">{formatCurrency(viewingSubcontractorBill.grossAmount * ((viewingSubcontractorBill.retentionPercent || 0)/100), settings)}</TableCell></TableRow>
                                            <TableRow className="bg-amber-50/20"><TableCell>{getRowLabel('3', 'Net Payable Amount')}</TableCell><TableCell className="text-right font-bold">{formatCurrency(viewingSubcontractorBill.netAmount, settings)}</TableCell></TableRow>
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
                                    <FileCheck className="h-4 w-4" />
                                    <AlertTitle>Subcontractor Bill</AlertTitle>
                                    <AlertDescription>
                                        Subcontractor bill for {project.agencies?.find(a => a.id === viewingSubcontractorBill.subcontractorId)?.name || 'Unknown Subcontractor'}
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
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col border-border/50">
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
                                            <div>
                                                <Label htmlFor="cpa-amount">Price Adjustment (CPA)</Label>
                                                <Input id="cpa-amount" type="number" value={ipcForm.cpaAmount || 0} onChange={e => setIpcForm({...ipcForm, cpaAmount: Number(e.target.value)})} />
                                            </div>
                                            <div>
                                                <Label htmlFor="provisional-sum">Provisional Sum</Label>
                                                <Input id="provisional-sum" type="number" value={ipcForm.provisionalSum || 0} onChange={e => setIpcForm({...ipcForm, provisionalSum: Number(e.target.value)})} />
                                            </div>
                                            <div>
                                                <Label htmlFor="advance-deduction">Advance Payment Deduction</Label>
                                                <Input id="advance-deduction" type="number" value={ipcForm.advancePaymentDeduction || 0} onChange={e => setIpcForm({...ipcForm, advancePaymentDeduction: Number(e.target.value)})} />
                                            </div>
                                            <div>
                                                <Label htmlFor="liquidated-damages">Liquidated Damages</Label>
                                                <Input id="liquidated-damages" type="number" value={ipcForm.liquidatedDamages || 0} onChange={e => setIpcForm({...ipcForm, liquidatedDamages: Number(e.target.value)})} />
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
                                                <p className="opacity-80">Price Adjustment (CPA):</p>
                                                <p className="font-bold">{currency}{currentIpcSummary.cpaAmount.toLocaleString() || '0'}</p>
                                            </div>
                                            <div className="flex justify-between">
                                                <p className="opacity-80">Provisional Sum:</p>
                                                <p className="font-bold">{currency}{(ipcForm.provisionalSum || 0).toLocaleString() || '0'}</p>
                                            </div>
                                            <div className="flex justify-between">
                                                <p className="opacity-80">VAT (13%):</p>
                                                <p className="font-bold">{currency}{currentIpcSummary.vatAmount.toLocaleString() || '0'}</p>
                                            </div>
                                            <div className="flex justify-between">
                                                <p className="opacity-80">Retention (5%):</p>
                                                <p className="font-bold">-{currency}{currentIpcSummary.retentionAmount.toLocaleString() || '0'}</p>
                                            </div>
                                            <div className="flex justify-between">
                                                <p className="opacity-80">TDS (1.5%):</p>
                                                <p className="font-bold">-{currency}{currentIpcSummary.advanceIncomeTax.toLocaleString() || '0'}</p>
                                            </div>
                                            <div className="flex justify-between">
                                                <p className="opacity-80">Contractor's Fund (0.1%):</p>
                                                <p className="font-bold">-{currency}{currentIpcSummary.contractorDevFund.toLocaleString() || '0'}</p>
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
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col border-border/50">
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
                                <h1 className="text-2xl font-bold uppercase">{project.clientName || 'Government of Nepal'}</h1>
                                <h2 className="text-xl font-semibold uppercase">{project.name}</h2>
                                <p className="text-sm mt-2">Location: {project.location}</p>
                                <p className="text-sm">Contract No: {project.contractNo || 'URLIP/TT/CW-01'}</p>
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
                                    <p>Contractor: {project.contractor}</p>
                                    <p>Engineer: {project.engineer || 'BDA-BN-UDAYA JV'}</p>
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
                                            <tr className="font-bold">
                                                <td colSpan={4} className="border border-black p-2 text-right">TDS (1.5%)</td>
                                                <td className="border border-black p-2 text-right">{viewingIpc?.advanceIncomeTax?.toLocaleString()}</td>
                                            </tr>
                                            <tr className="font-bold">
                                                <td colSpan={4} className="border border-black p-2 text-right">Contractor's Fund (0.1%)</td>
                                                <td className="border border-black p-2 text-right">{viewingIpc?.contractorDevFund?.toLocaleString()}</td>
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
import React, { useState, useMemo } from 'react';
import { 
    Receipt, FileText, DollarSign, TrendingUp, AlertTriangle, CheckCircle, 
    Plus, Edit, Trash2, Filter, Search, X, Save, Calendar, 
    Users, CreditCard, FileSpreadsheet, PieChart
} from 'lucide-react';
import { Project, UserRole, ContractBill, SubcontractorBill, AgencyPayment, AgencyBill } from '../../types';
import { formatCurrency } from '../../utils/formatting/exportUtils';
import { cn } from '~/lib/utils';

import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '~/components/ui/alert';
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
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';

// NOTE: This is a refactored version of the FinancialsCommercialHub component.
// The original logic has been temporarily removed to facilitate the UI migration.
// It will be re-implemented in subsequent steps.

interface Props {
    project: Project;
    userRole: UserRole;
    onProjectUpdate: (project: Project) => void;
}

const FinancialsCommercialHub: React.FC<Props> = ({ project, onProjectUpdate, userRole }) => {
    const [activeTab, setActiveTab] = useState("contract-bills");
    const [searchTerm, setSearchTerm] = useState('');
    const [isBillModalOpen, setIsBillModalOpen] = useState(false);
    const [editingBill, setEditingBill] = useState<Partial<ContractBill | SubcontractorBill> | null>(null);
    const [editingBillType, setEditingBillType] = useState<'contract' | 'subcontractor' | null>(null);

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

    // Placeholder data - will be replaced with actual project data and calculations
    const contractBills: ContractBill[] = project?.contractBills || [];
    const subcontractorBills: SubcontractorBill[] = project?.subcontractorBills || [];
    const agencyPayments: AgencyPayment[] = project?.agencyPayments || [];

    const financialStats = useMemo(() => {
        return {
            totalContractBills: contractBills.reduce((sum, b) => sum + (b.netAmount || 0), 0),
            totalSubcontractorBills: subcontractorBills.reduce((sum, b) => sum + (b.netAmount || 0), 0),
            totalAgencyPayments: agencyPayments.reduce((sum, b) => sum + (b.amount || 0), 0),
            pendingBills: [...contractBills, ...subcontractorBills].filter(b => b.status === 'Submitted').length,
            approvedBills: [...contractBills, ...subcontractorBills].filter(b => b.status === 'Approved').length,
            paidBills: [...contractBills, ...subcontractorBills].filter(b => b.status === 'Paid').length
        };
    }, [contractBills, subcontractorBills, agencyPayments]);

    const filteredContractBills = contractBills.filter(bill => bill.billNumber.includes(searchTerm));
    const filteredSubcontractorBills = subcontractorBills.filter(bill => bill.billNumber.includes(searchTerm));
    const filteredAgencyPayments = agencyPayments.filter(payment => payment.reference.includes(searchTerm));

    const handleAddBill = (type: 'contract' | 'subcontractor') => {
        setEditingBill(null);
        setEditingBillType(type);
        setIsBillModalOpen(true);
    };
    const handleEditBill = (bill: ContractBill | SubcontractorBill, type: 'contract' | 'subcontractor') => {
        setEditingBill(bill);
        setEditingBillType(type);
        setIsBillModalOpen(true);
    };
    const handleDeleteBill = (billId: string, type: 'contract' | 'subcontractor') => { console.log('Delete Bill', billId, type); };
    const handleSaveBill = () => { console.log('Save Bill', editingBill); setIsBillModalOpen(false); };
    
    const getBillStatusBadge = (status: string) => {
        switch (status) {
            case 'Paid': return <Badge variant="default" className="bg-green-100 text-green-700">Paid</Badge>;
            case 'Approved': return <Badge variant="default" className="bg-blue-100 text-blue-700">Approved</Badge>;
            case 'Submitted': return <Badge variant="secondary">Submitted</Badge>;
            case 'Draft': return <Badge variant="outline">Draft</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <div className="animate-in fade-in duration-500 p-4">
            <div className="flex justify-between mb-4 items-center">
                <div>
                    <p className="text-xs font-bold text-primary tracking-widest uppercase">FINANCIALS & COMMERCIAL</p>
                    <h1 className="text-2xl font-black text-foreground">Financials & Commercial Hub</h1>
                    <p className="text-sm text-muted-foreground">Centralized management for bills, payments, and commercial transactions</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Financial Reports
                    </Button>
                    <Button onClick={() => handleAddBill(activeTab === "contract-bills" ? 'contract' : 'subcontractor')}>
                        <Plus className="mr-2 h-4 w-4" /> Add {activeTab === "contract-bills" ? 'Contract' : activeTab === "subcontractor-bills" ? 'Subcontractor' : 'Agency'} Bill
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="contract-bills" onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-4 h-12">
                    <TabsTrigger value="contract-bills">
                        <Receipt className="mr-2 h-4 w-4" /> Contract Bills
                    </TabsTrigger>
                    <TabsTrigger value="subcontractor-bills">
                        <Users className="mr-2 h-4 w-4" /> Subcontractor Bills
                    </TabsTrigger>
                    <TabsTrigger value="agency-payments">
                        <CreditCard className="mr-2 h-4 w-4" /> Agency Payments
                    </TabsTrigger>
                    <TabsTrigger value="financial-overview">
                        <PieChart className="mr-2 h-4 w-4" /> Financial Overview
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="contract-bills">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex justify-between mb-4 items-center">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search contract bills..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-[400px] pl-10"
                                    />
                                </div>
                                <Button variant="outline">
                                    <Filter className="mr-2 h-4 w-4" /> Filter Bills
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                {/* Stat Cards */}
                                <Card className="border-l-4 border-emerald-500">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between mb-1">
                                            <p className="text-xs font-bold text-muted-foreground">TOTAL BILLED</p>
                                            <DollarSign className="h-4 w-4 text-emerald-600" />
                                        </div>
                                        <p className="text-xl font-black text-emerald-600">{formatCurrency(financialStats.totalContractBills)}</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-l-4 border-amber-500">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between mb-1">
                                            <p className="text-xs font-bold text-muted-foreground">PENDING</p>
                                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                                        </div>
                                        <p className="text-xl font-black text-amber-600">{financialStats.pendingBills}</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-l-4 border-primary">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between mb-1">
                                            <p className="text-xs font-bold text-muted-foreground">APPROVED</p>
                                            <CheckCircle className="h-4 w-4 text-primary" />
                                        </div>
                                        <p className="text-xl font-black text-primary">{financialStats.approvedBills}</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-l-4 border-purple-600">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between mb-1">
                                            <p className="text-xs font-bold text-muted-foreground">PAID</p>
                                            <TrendingUp className="h-4 w-4 text-purple-600" />
                                        </div>
                                        <p className="text-xl font-black text-purple-600">{financialStats.paidBills}</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="rounded-md border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted">
                                            <TableHead className="font-bold">Bill Number</TableHead>
                                            <TableHead className="font-bold">Period</TableHead>
                                            <TableHead className="text-right font-bold">Gross Amount</TableHead>
                                            <TableHead className="text-right font-bold">Net Amount</TableHead>
                                            <TableHead className="text-right font-bold">Status</TableHead>
                                            <TableHead className="text-right font-bold">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredContractBills.map(bill => (
                                            <TableRow key={bill.id}>
                                                <TableCell>
                                                    <p className="font-semibold">{bill.billNumber}</p>
                                                    <p className="text-xs text-muted-foreground">{bill.date}</p>
                                                </TableCell>
                                                <TableCell>{bill.periodFrom} to {bill.periodTo}</TableCell>
                                                <TableCell className="text-right font-bold">{formatCurrency(bill.grossAmount)}</TableCell>
                                                <TableCell className="text-right font-bold">{formatCurrency(bill.netAmount)}</TableCell>
                                                <TableCell className="text-right">{getBillStatusBadge(bill.status)}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="icon" onClick={() => handleEditBill(bill, 'contract')}>
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Edit</TooltipContent>
                                                            </Tooltip>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteBill(bill.id, 'contract')}>
                                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Delete</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {filteredContractBills.length === 0 && (
                                    <div className="py-12 text-center">
                                        <Receipt className="h-12 w-12 text-muted-foreground opacity-20 mx-auto mb-2" />
                                        <p className="text-muted-foreground">No contract bills registered.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="subcontractor-bills">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex justify-between mb-4 items-center">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search subcontractor bills..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-[400px] pl-10"
                                    />
                                </div>
                                <Button variant="outline">
                                    <Filter className="mr-2 h-4 w-4" /> Filter Bills
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                {/* Stat Cards */}
                                <Card className="border-l-4 border-emerald-500">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between mb-1">
                                            <p className="text-xs font-bold text-muted-foreground">TOTAL BILLED</p>
                                            <DollarSign className="h-4 w-4 text-emerald-600" />
                                        </div>
                                        <p className="text-xl font-black text-emerald-600">{formatCurrency(financialStats.totalSubcontractorBills)}</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-l-4 border-amber-500">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between mb-1">
                                            <p className="text-xs font-bold text-muted-foreground">PENDING</p>
                                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                                        </div>
                                        <p className="text-xl font-black text-amber-600">{financialStats.pendingBills}</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-l-4 border-primary">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between mb-1">
                                            <p className="text-xs font-bold text-muted-foreground">APPROVED</p>
                                            <CheckCircle className="h-4 w-4 text-primary" />
                                        </div>
                                        <p className="text-xl font-black text-primary">{financialStats.approvedBills}</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-l-4 border-purple-600">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between mb-1">
                                            <p className="text-xs font-bold text-muted-foreground">PAID</p>
                                            <TrendingUp className="h-4 w-4 text-purple-600" />
                                        </div>
                                        <p className="text-xl font-black text-purple-600">{financialStats.paidBills}</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="rounded-md border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted">
                                            <TableHead className="font-bold">Bill Number</TableHead>
                                            <TableHead className="font-bold">Subcontractor</TableHead>
                                            <TableHead className="font-bold">Period</TableHead>
                                            <TableHead className="text-right font-bold">Net Amount</TableHead>
                                            <TableHead className="text-right font-bold">Status</TableHead>
                                            <TableHead className="text-right font-bold">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredSubcontractorBills.map(bill => (
                                            <TableRow key={bill.id}>
                                                <TableCell>
                                                    <p className="font-semibold">{bill.billNumber}</p>
                                                    <p className="text-xs text-muted-foreground">{bill.date}</p>
                                                </TableCell>
                                                <TableCell>
                                                    <p>{project?.agencies?.find(a => a.id === bill.subcontractorId)?.name || 'Unknown'}</p>
                                                </TableCell>
                                                <TableCell>{bill.periodFrom} to {bill.periodTo}</TableCell>
                                                <TableCell className="text-right font-bold">{formatCurrency(bill.netAmount)}</TableCell>
                                                <TableCell className="text-right">{getBillStatusBadge(bill.status)}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="icon" onClick={() => handleEditBill(bill, 'subcontractor')}>
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Edit</TooltipContent>
                                                            </Tooltip>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteBill(bill.id, 'subcontractor')}>
                                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Delete</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {filteredSubcontractorBills.length === 0 && (
                                    <div className="py-12 text-center">
                                        <Users className="h-12 w-12 text-muted-foreground opacity-20 mx-auto mb-2" />
                                        <p className="text-muted-foreground">No subcontractor bills registered.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="agency-payments">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex justify-between mb-4 items-center">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search agency payments..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-[400px] pl-10"
                                    />
                                </div>
                                <Button variant="outline">
                                    <Filter className="mr-2 h-4 w-4" /> Filter Payments
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                {/* Stat Cards */}
                                <Card className="border-l-4 border-emerald-500">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between mb-1">
                                            <p className="text-xs font-bold text-muted-foreground">TOTAL PAID</p>
                                            <DollarSign className="h-4 w-4 text-emerald-600" />
                                        </div>
                                        <p className="text-xl font-black text-emerald-600">{formatCurrency(financialStats.totalAgencyPayments)}</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-l-4 border-amber-500">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between mb-1">
                                            <p className="text-xs font-bold text-muted-foreground">AGENCIES</p>
                                            <Users className="h-4 w-4 text-amber-600" />
                                        </div>
                                        <p className="text-xl font-black text-amber-600">{project?.agencies?.length || 0}</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-l-4 border-primary">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between mb-1">
                                            <p className="text-xs font-bold text-muted-foreground">PAYMENT TYPES</p>
                                            <CreditCard className="h-4 w-4 text-primary" />
                                        </div>
                                        <p className="text-xl font-black text-primary">{[...new Set(agencyPayments.map(p => p.type))].length}</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-l-4 border-purple-600">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between mb-1">
                                            <p className="text-xs font-bold text-muted-foreground">AVG. PAYMENT</p>
                                            <TrendingUp className="h-4 w-4 text-purple-600" />
                                        </div>
                                        <p className="text-xl font-black text-purple-600">
                                            {agencyPayments.length > 0 
                                                ? formatCurrency(agencyPayments.reduce((sum, p) => sum + p.amount, 0) / agencyPayments.length) 
                                                : formatCurrency(0)}
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="rounded-md border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted">
                                            <TableHead className="font-bold">Reference</TableHead>
                                            <TableHead className="font-bold">Agency</TableHead>
                                            <TableHead className="font-bold">Type</TableHead>
                                            <TableHead className="font-bold">Date</TableHead>
                                            <TableHead className="text-right font-bold">Amount</TableHead>
                                            <TableHead className="text-right font-bold">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredAgencyPayments.map(payment => (
                                            <TableRow key={payment.id}>
                                                <TableCell>
                                                    <p className="font-semibold">{payment.reference}</p>
                                                    <p className="text-xs text-muted-foreground">{payment.description}</p>
                                                </TableCell>
                                                <TableCell>
                                                    <p>{project?.agencies?.find(a => a.id === payment.agencyId)?.name || 'Unknown'}</p>
                                                </TableCell>
                                                <TableCell>{payment.type}</TableCell>
                                                <TableCell>{payment.date}</TableCell>
                                                <TableCell className="text-right font-bold">{formatCurrency(payment.amount)}</TableCell>
                                                <TableCell className="text-right"><Badge variant="default">{payment.status || 'Confirmed'}</Badge></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {filteredAgencyPayments.length === 0 && (
                                    <div className="py-12 text-center">
                                        <CreditCard className="h-12 w-12 text-muted-foreground opacity-20 mx-auto mb-2" />
                                        <p className="text-muted-foreground">No agency payments registered.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="financial-overview">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Revenue & Expenditure</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between mb-2">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                                        <p className="text-2xl font-black text-emerald-600">{formatCurrency(financialStats.totalContractBills)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Expenses</p>
                                        <p className="text-2xl font-black text-destructive">{formatCurrency(financialStats.totalSubcontractorBills + financialStats.totalAgencyPayments)}</p>
                                    </div>
                                </div>
                                <Separator className="my-4" />
                                <div className="flex justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Net Position</p>
                                        <p className={cn("text-2xl font-black", financialStats.totalContractBills >= (financialStats.totalSubcontractorBills + financialStats.totalAgencyPayments) ? 'text-emerald-600' : 'text-destructive')}>
                                            {formatCurrency(financialStats.totalContractBills - (financialStats.totalSubcontractorBills + financialStats.totalAgencyPayments))}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Margin</p>
                                        <p className={cn("text-2xl font-black", financialStats.totalContractBills >= (financialStats.totalSubcontractorBills + financialStats.totalAgencyPayments) ? 'text-emerald-600' : 'text-destructive')}>
                                            {financialStats.totalContractBills > 0 
                                                ? `${(((financialStats.totalContractBills - (financialStats.totalSubcontractorBills + financialStats.totalAgencyPayments)) / financialStats.totalContractBills) * 100).toFixed(1)}%` 
                                                : '0%'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Cash Flow Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-2">
                                    <div className="flex items-center gap-2">
                                        <Receipt className="h-4 w-4 text-emerald-600" />
                                        <p>Outstanding Receivables: <span className="font-semibold">{formatCurrency(contractBills.filter(b => b.status !== 'Paid').reduce((sum, b) => sum + b.netAmount, 0))}</span></p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-amber-600" />
                                        <p>Outstanding Payables: <span className="font-semibold">{formatCurrency(subcontractorBills.filter(b => b.status !== 'Paid').reduce((sum, b) => sum + b.netAmount, 0))}</span></p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="h-4 w-4 text-primary" />
                                        <p>Pending Agency Payments: <span className="font-semibold">{agencyPayments.length}</span></p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-purple-600" />
                                        <p>Available Budget: <span className="font-semibold">{formatCurrency(1000000 - financialStats.totalContractBills)}</span></p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <Card>
                        <CardContent className="p-4">
                            <Alert>
                                <FileText className="h-4 w-4" />
                                <AlertDescription>
                                    This financial hub consolidates all commercial transactions for the project. Track contract bills, subcontractor payments, and agency expenses in one place.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* BILL MODAL */}
            <Dialog open={isBillModalOpen} onOpenChange={setIsBillModalOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Receipt className="text-primary" /> {editingBill ? 'Edit Bill' : 'Add New Bill'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingBill ? 'Edit the details of the bill.' : 'Fill in the details for the new bill.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="billNumber" className="text-right">Bill Number</Label>
                            <Input id="billNumber" value={editingBill?.billNumber || ''} onChange={e => setEditingBill(prev => ({ ...prev, billNumber: e.target.value }))} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="date" className="text-right">Date</Label>
                            <Input id="date" type="date" value={editingBill?.date || ''} onChange={e => setEditingBill(prev => ({ ...prev, date: e.target.value }))} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="periodFrom" className="text-right">Period From</Label>
                            <Input id="periodFrom" type="date" value={editingBill?.periodFrom || ''} onChange={e => setEditingBill(prev => ({ ...prev, periodFrom: e.target.value }))} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="periodTo" className="text-right">Period To</Label>
                            <Input id="periodTo" type="date" value={editingBill?.periodTo || ''} onChange={e => setEditingBill(prev => ({ ...prev, periodTo: e.target.value }))} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="description" className="text-right">Description</Label>
                            <Input id="description" value={editingBill?.description || ''} onChange={e => setEditingBill(prev => ({ ...prev, description: e.target.value }))} className="col-span-3" />
                        </div>
                        {editingBillType === 'subcontractor' && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="subcontractor" className="text-right">Subcontractor</Label>
                                <Select value={editingBill?.subcontractorId as string || ''} onValueChange={(value) => setEditingBill(prev => ({ ...prev, subcontractorId: value }))}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select subcontractor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {project?.agencies?.filter(a => a.type === 'subcontractor').map(agency => (
                                            <SelectItem key={agency.id} value={agency.id}>{agency.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="grossAmount" className="text-right">Gross Amount</Label>
                            <Input id="grossAmount" type="number" value={editingBill?.grossAmount || 0} onChange={e => setEditingBill(prev => ({ ...prev, grossAmount: Number(e.target.value) }))} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="retentionPercent" className="text-right">Retention %</Label>
                            <Input id="retentionPercent" type="number" value={editingBill?.retentionPercent || 0} onChange={e => setEditingBill(prev => ({ ...prev, retentionPercent: Number(e.target.value) }))} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="netAmount" className="text-right">Net Amount</Label>
                            <Input id="netAmount" type="number" value={editingBill?.netAmount || 0} onChange={e => setEditingBill(prev => ({ ...prev, netAmount: Number(e.target.value) }))} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="status" className="text-right">Status</Label>
                            <Select value={editingBill?.status || 'Draft'} onValueChange={(value) => setEditingBill(prev => ({ ...prev, status: value }))}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Draft">Draft</SelectItem>
                                    <SelectItem value="Submitted">Submitted</SelectItem>
                                    <SelectItem value="Approved">Approved</SelectItem>
                                    <SelectItem value="Paid">Paid</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBillModalOpen(false)}>
                            <X className="mr-2 h-4 w-4" /> Cancel
                        </Button>
                        <Button onClick={handleSaveBill}>
                            <Save className="mr-2 h-4 w-4" /> {editingBill ? 'Update Bill' : 'Add Bill'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default FinancialsCommercialHub;

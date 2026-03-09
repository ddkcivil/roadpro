import React, { useState, useMemo } from 'react';
import { Project, UserRole, AppSettings, ContractBill } from '../../types';
import { formatCurrency } from '../../utils/formatting/exportUtils';

import {
    Receipt, Printer, X, Save, 
    TrendingUp, FileDiff, Search,
    Eye, Edit2
} from 'lucide-react';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
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
  userRole: UserRole;
  settings: AppSettings;
  onProjectUpdate: (project: Project) => void;
}

const FinancialManagementHub: React.FC<Props> = ({ project, settings, onProjectUpdate }) => {
  const [activeTab, setActiveTab] = useState("overview");
  
  if (!project) {
    return (
      <div className="p-8 text-center">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Project data not available. Please select a project first.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // === CONTRACT BILLING STATE ===
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [ipcForm, setIpcForm] = useState<Partial<ContractBill>>({
    billNumber: '',
    date: new Date().toISOString().split('T')[0],
    orderOfBill: ((project?.contractBills || [])?.length || 0) + 1,
    items: [],
    provisionalSum: 0,
    cpaAmount: 0,
    liquidatedDamages: 0
  });
  


  // === VARIATION ORDERS STATE ===
  const [voSearchTerm, setVoSearchTerm] = useState('');
  
  // === DATA SOURCES ===
  const contractBills = project?.contractBills || [];
  const subcontractorBills = project?.subcontractorBills || [];
  const variationOrders = project?.variationOrders || [];
  
  // === FINANCIAL CALCULATIONS ===
  const financialStats = useMemo(() => {
    const boqItems = project.boq || [];
    const vatRate = settings?.vatRate || 13;
    
    const originalPS = boqItems
        .filter(item => item.unit?.toUpperCase() === 'PS')
        .reduce((acc, item) => acc + (item.quantity * item.rate), 0);
        
    const originalNonPS = boqItems
        .filter(item => item.unit?.toUpperCase() !== 'PS')
        .reduce((acc, item) => acc + (item.quantity * item.rate), 0);
        
    const originalVAT = originalNonPS * (vatRate / 100);
    const originalContractValue = originalPS + originalNonPS + originalVAT;

    const revisedPS = boqItems
        .filter(item => item.unit?.toUpperCase() === 'PS')
        .reduce((acc, item) => acc + ((item.quantity + (item.variationQuantity || 0)) * item.rate), 0);
        
    const revisedNonPS = boqItems
        .filter(item => item.unit?.toUpperCase() !== 'PS')
        .reduce((acc, item) => acc + ((item.quantity + (item.variationQuantity || 0)) * item.rate), 0);
        
    const revisedVAT = revisedNonPS * (vatRate / 100);
    const revisedContractValue = revisedPS + revisedNonPS + revisedVAT;

    const variationsValue = revisedContractValue - originalContractValue;
    
    const totalBilled = contractBills.reduce((acc, bill) => acc + (bill.netAmount || 0), 0);
    const totalSubBilled = subcontractorBills.reduce((acc, bill) => acc + (bill.netAmount || 0), 0);
    
    return {
      originalContract: originalContractValue,
      variations: variationsValue,
      revisedContract: revisedContractValue,
      totalBilled,
      totalSubBilled,
      balanceToBill: revisedContractValue - totalBilled,
      paymentPercentage: revisedContractValue > 0 ? (totalBilled / revisedContractValue) * 100 : 0
    };
  }, [project.boq, settings, contractBills, subcontractorBills]);
  
  const voStats = useMemo(() => ({
    total: variationOrders.length,
    approved: variationOrders.filter(vo => vo.status === 'Approved').length,
    pending: variationOrders.filter(vo => vo.status === 'Submitted' || vo.status === 'Draft').length,
    totalValue: variationOrders.reduce((acc, vo) => acc + (vo.totalImpact || 0), 0)
  }), [variationOrders]);

  // === FILTERED DATA ===
  const filteredVos = useMemo(() => {
    return variationOrders.filter(vo => 
      vo.title.toLowerCase().includes(voSearchTerm.toLowerCase()) ||
      vo.reason.toLowerCase().includes(voSearchTerm.toLowerCase())
    );
  }, [variationOrders, voSearchTerm]);

  // === HANDLERS ===
  const handleCreateContractBill = () => {
    setIsCreateModalOpen(true);
  };

  return (
    <div className="p-4 h-[calc(100vh-140px)] overflow-y-auto">
      <div className="flex justify-between mb-6 items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Financial Management Hub</h1>
          <p className="text-sm text-gray-500">Unified billing and variation order management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCreateContractBill}>
            <Receipt className="mr-2 h-4 w-4" /> New Contract Bill
          </Button>
        </div>
      </div>

      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 h-12">
            <TabsTrigger value="overview">
              <TrendingUp className="mr-2 h-4 w-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="contract-bills">
              <Receipt className="mr-2 h-4 w-4" /> Contract Bills ({contractBills.length})
            </TabsTrigger>
            <TabsTrigger value="variations">
              <FileDiff className="mr-2 h-4 w-4" /> Variations ({variationOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Original Contract</h3>
                  <p className="text-2xl font-black text-primary">
                    {formatCurrency(financialStats.originalContract, settings)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Variations</h3>
                  <p className="text-2xl font-black text-amber-500">
                    {formatCurrency(financialStats.variations, settings)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Revised Contract</h3>
                  <p className="text-2xl font-black text-green-600">
                    {formatCurrency(financialStats.revisedContract, settings)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Payment Progress</h3>
                  <p className="text-2xl font-black text-blue-600">
                    {financialStats.paymentPercentage.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Contract Billing</CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={financialStats.paymentPercentage} className="mb-4" />
                  <div className="space-y-1">
                    <p className="text-sm flex justify-between"><span>Billed:</span> <span className="font-bold">{formatCurrency(financialStats.totalBilled, settings)}</span></p>
                    <p className="text-sm flex justify-between"><span>Balance:</span> <span className="font-bold">{formatCurrency(financialStats.balanceToBill, settings)}</span></p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Subcontractor Payments</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-black text-primary">
                    {formatCurrency(financialStats.totalSubBilled, settings)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Subcontractor Net Certified</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="contract-bills" className="p-4">
            <h2 className="text-lg font-bold mb-2 uppercase tracking-tight">Contract Bills</h2>
            <p className="text-sm text-muted-foreground mb-4">Interim Payment Certificates and contract billing records</p>
            
            <Card className="overflow-hidden">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>Bill Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contractBills.length > 0 ? contractBills.map(bill => (
                    <TableRow key={bill.id}>
                      <TableCell className="font-bold">{bill.billNumber}</TableCell>
                      <TableCell>{new Date(bill.date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-black text-primary">{formatCurrency(bill.netAmount || 0, settings)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{bill.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" title="Print PDF"><Printer className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" title="View Details"><Eye className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                        No contract bills found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="variations" className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Variations</h3>
                  <p className="text-2xl font-black text-primary">{voStats.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Approved</h3>
                  <p className="text-2xl font-black text-green-600">{voStats.approved}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pending</h3>
                  <p className="text-2xl font-black text-amber-500">{voStats.pending}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Impact</h3>
                  <p className="text-2xl font-black text-blue-600">
                    {formatCurrency(voStats.totalValue, settings)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search variations by title or reason..." 
                    value={voSearchTerm}
                    onChange={(e) => setVoSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                    aria-label="Search variations"
                  />
                </div>
            </div>

            <Card className="overflow-hidden">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>VO Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Impact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVos.length > 0 ? filteredVos.map(vo => (
                    <TableRow key={vo.id}>
                      <TableCell className="font-bold">{vo.voNumber}</TableCell>
                      <TableCell>{vo.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{vo.reason}</TableCell>
                      <TableCell className="font-black text-primary">{formatCurrency(vo.totalImpact || 0, settings)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={vo.status === 'Approved' ? 'default' : 'secondary'}
                          className={vo.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}
                        >
                          {vo.status || 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" title="View"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" title="Edit"><Edit2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                        No variation orders found matching your search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Contract Bill Creation Dialog */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Create Contract Bill
            </DialogTitle>
            <DialogDescription>
              Create a new interim payment certificate for this project.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bill-number">Bill Number</Label>
                <Input
                  id="bill-number"
                  value={ipcForm.billNumber}
                  onChange={(e) => setIpcForm({...ipcForm, billNumber: e.target.value})}
                  placeholder="IPC-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bill-date">Bill Date</Label>
                <Input
                  id="bill-date"
                  type="date"
                  value={ipcForm.date}
                  onChange={(e) => setIpcForm({...ipcForm, date: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="measurement-date">Measurement Date</Label>
                <Input
                  id="measurement-date"
                  type="date"
                  value={ipcForm.dateOfMeasurement}
                  onChange={(e) => setIpcForm({...ipcForm, dateOfMeasurement: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="order-of-bill">Order of Bill</Label>
                <Input
                  id="order-of-bill"
                  type="number"
                  value={ipcForm.orderOfBill}
                  onChange={(e) => setIpcForm({...ipcForm, orderOfBill: Number(e.target.value)})}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cpa-amount">CPA Amount</Label>
                <Input
                  id="cpa-amount"
                  type="number"
                  value={ipcForm.cpaAmount}
                  onChange={(e) => setIpcForm({...ipcForm, cpaAmount: Number(e.target.value)})}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provisional-sum">Provisional Sum</Label>
                <Input
                  id="provisional-sum"
                  type="number"
                  value={ipcForm.provisionalSum}
                  onChange={(e) => setIpcForm({...ipcForm, provisionalSum: Number(e.target.value)})}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="liquidated-damages">Liquidated Damages</Label>
                <Input
                  id="liquidated-damages"
                  type="number"
                  value={ipcForm.liquidatedDamages}
                  onChange={(e) => setIpcForm({...ipcForm, liquidatedDamages: Number(e.target.value)})}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={() => {
              const newBill: ContractBill = {
                id: `ipc-${Date.now()}`,
                ...ipcForm,
                status: 'Draft',
                netAmount: 0,
                grossAmount: 0,
                retentionPercent: (settings as any).retentionPercentage || 5,
                items: [],
                location: project.location,
                description: `IPC No. ${ipcForm.billNumber}`,
                periodFrom: '',
                periodTo: '',
                dateOfWorkOrder: project.startDate,
                extendedCompletionDate: project.endDate,
              } as ContractBill;

              onProjectUpdate({
                ...project,
                contractBills: [...contractBills, newBill]
              });

              setIsCreateModalOpen(false);
              setIpcForm({
                billNumber: '',
                date: new Date().toISOString().split('T')[0],
                dateOfMeasurement: new Date().toISOString().split('T')[0],
                orderOfBill: ((project?.contractBills || [])?.length || 0) + 1,
                items: [],
                provisionalSum: 0,
                cpaAmount: 0,
                liquidatedDamages: 0
              });
            }}>
              <Save className="mr-2 h-4 w-4" />
              Create Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default FinancialManagementHub;

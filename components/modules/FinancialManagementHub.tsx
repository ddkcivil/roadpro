import React, { useState, useMemo } from 'react';
import { Project, UserRole, AppSettings, ContractBill, SubcontractorBill, RFI, VariationOrder } from '../../types';
import { formatCurrency } from '../../utils/formatting/exportUtils';
import { getCurrencySymbol } from '../../utils/formatting/currencyUtils';

import {
    Receipt, Printer, Plus, Calculator, History, X, Save, 
    ArrowRight, ArrowLeft, Landmark, FileCheck, TrendingUp, Edit3,
    AlertTriangle, CheckCircle2, FileSpreadsheet, FileDiff, Search,
    Clock, User, DollarSign, FileText, CheckCircle, Send, Calendar,
    Eye, Edit2, ShieldCheck, MessageSquare
} from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { Separator } from '~/components/ui/separator';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";


interface Props {
  project: Project;
  userRole: UserRole;
  settings: AppSettings;
  onProjectUpdate: (project: Project) => void;
}

const FinancialManagementHub: React.FC<Props> = ({ project, settings, onProjectUpdate, userRole }) => {
  const [activeTab, setActiveTab] = useState("overview");
  
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

  // === CONTRACT BILLING STATE ===
  const [selectedIpcId, setSelectedIpcId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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
  
  // === SUBCONTRACTOR BILLING STATE ===
  const [isSubBillModalOpen, setIsSubBillModalOpen] = useState(false);
  const [subBillForm, setSubBillForm] = useState<Partial<SubcontractorBill>>({
    billNumber: '',
    subcontractorId: '',
    description: '',
    netAmount: 0,
    grossAmount: 0,
    date: new Date().toISOString().split('T')[0],
    periodFrom: '',
    periodTo: '',
    status: 'Draft',
    retentionPercent: 0,
    items: []
  });
  
  // === RFI MANAGEMENT STATE ===
  const [rfiSearchTerm, setRfiSearchTerm] = useState('');
  const [selectedRfi, setSelectedRfi] = useState<RFI | null>(null);
  const [rfiTaskFilter, setRfiTaskFilter] = useState<string>('all');
  
  // === VARIATION ORDERS STATE ===
  const [voSearchTerm, setVoSearchTerm] = useState('');
  const [isVoModalOpen, setIsVoModalOpen] = useState(false);
  const [voForm, setVoForm] = useState<Partial<VariationOrder>>({
    voNumber: `VO-${((project?.variationOrders || [])?.length || 0) + 1}`,
    title: '',
    date: new Date().toISOString().split('T')[0],
    reason: '',
    items: []
  });
  
  // === DATA SOURCES ===
  const contractBills = project?.contractBills || [];
  const subcontractorBills = project?.subcontractorBills || [];
  const rfis = project?.rfis || [];
  const variationOrders = project?.variationOrders || [];
  const subcontractors = (project?.agencies || [])?.filter(a => a.type === 'subcontractor') || [];
  
  // === FINANCIAL CALCULATIONS ===
  const financialStats = useMemo(() => {
    const boqItems = project.boq || [];
    const originalContract = boqItems.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
    const variations = boqItems.reduce((acc, item) => acc + ((item.variationQuantity || 0) * item.rate), 0);
    const revisedContract = originalContract + variations;
    
    const totalBilled = contractBills.reduce((acc, bill) => acc + (bill.totalAmount || 0), 0);
    const totalSubBilled = subcontractorBills.reduce((acc, bill) => acc + (bill.netAmount || 0), 0);
    
    return {
      originalContract,
      variations,
      revisedContract,
      totalBilled,
      totalSubBilled,
      balanceToBill: revisedContract - totalBilled,
      paymentPercentage: revisedContract > 0 ? (totalBilled / revisedContract) * 100 : 0
    };
  }, [project.boq, contractBills, subcontractorBills]);
  
  const rfiStats = useMemo(() => ({
    total: rfis.length,
    pending: rfis.filter(r => r.status === 'Pending').length,
    approved: rfis.filter(r => r.status === 'Approved').length,
    rejected: rfis.filter(r => r.status === 'Rejected').length
  }), [rfis]);
  
  const voStats = useMemo(() => ({
    total: variationOrders.length,
    approved: variationOrders.filter(vo => vo.status === 'Approved').length,
    pending: variationOrders.filter(vo => vo.status === 'Pending').length,
    totalValue: variationOrders.reduce((acc, vo) => acc + (vo.totalAmount || 0), 0)
  }), [variationOrders]);

  // === FILTERED DATA ===
  const filteredRfis = useMemo(() => {
    return rfis.filter(rfi => {
      const matchesSearch = rfi.title.toLowerCase().includes(rfiSearchTerm.toLowerCase()) ||
                           rfi.description?.toLowerCase().includes(rfiSearchTerm.toLowerCase());
      // Placeholder for actual task filtering
      const matchesTask = rfiTaskFilter === 'all' || rfi.taskId === rfiTaskFilter; 
      return matchesSearch && matchesTask;
    });
  }, [rfis, rfiSearchTerm, rfiTaskFilter]);
  
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
  
  const handleCreateSubBill = () => {
    setIsSubBillModalOpen(true);
  };
  
  const handleCreateVo = () => {
    setIsVoModalOpen(true);
  };

  return (
    <div className="p-4 h-[calc(100vh-140px)] overflow-y-auto">
      <div className="flex justify-between mb-6 items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Financial Management Hub</h1>
          <p className="text-sm text-gray-500">Unified billing, RFI, and variation order management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCreateContractBill}>
            <Receipt className="mr-2 h-4 w-4" /> New Contract Bill
          </Button>
          <Button variant="outline" onClick={handleCreateSubBill}>
            <DollarSign className="mr-2 h-4 w-4" /> New Sub Bill
          </Button>
          <Button onClick={handleCreateVo}>
            <FileDiff className="mr-2 h-4 w-4" /> New Variation
          </Button>
        </div>
      </div>

      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 h-12">
            <TabsTrigger value="overview">
              <TrendingUp className="mr-2 h-4 w-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="contract-bills">
              <Receipt className="mr-2 h-4 w-4" /> Contract Bills ({contractBills.length})
            </TabsTrigger>
            <TabsTrigger value="sub-bills">
              <Landmark className="mr-2 h-4 w-4" /> Sub Bills ({subcontractorBills.length})
            </TabsTrigger>
            <TabsTrigger value="rfis">
              <MessageSquare className="mr-2 h-4 w-4" /> RFIs ({rfis.length})
            </TabsTrigger>
            <TabsTrigger value="variations">
              <FileDiff className="mr-2 h-4 w-4" /> Variations ({variationOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent>
                  <h3 className="text-sm font-semibold text-muted-foreground">Original Contract</h3>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(financialStats.originalContract, settings)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <h3 className="text-sm font-semibold text-muted-foreground">Variations</h3>
                  <p className="text-2xl font-bold text-amber-500">
                    {formatCurrency(financialStats.variations, settings)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <h3 className="text-sm font-semibold text-muted-foreground">Revised Contract</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(financialStats.revisedContract, settings)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <h3 className="text-sm font-semibold text-muted-foreground">Payment Progress</h3>
                  <p className="text-2xl font-bold text-blue-600">
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
                  <p className="text-sm">Billed: {formatCurrency(financialStats.totalBilled, settings)}</p>
                  <p className="text-sm">Balance: {formatCurrency(financialStats.balanceToBill, settings)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Subcontractor Payments</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">
                    {formatCurrency(financialStats.totalSubBilled, settings)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Subcontractor Payments</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="contract-bills" className="p-4">
            <h2 className="text-lg font-semibold mb-2">Contract Bills</h2>
            <p className="text-sm text-muted-foreground mb-4">Interim Payment Certificates and contract billing records</p>
            
            <Card>
              <Table>
                <TableHeader>
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
                      <TableCell className="font-medium">{bill.billNumber}</TableCell>
                      <TableCell>{new Date(bill.date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-bold">{formatCurrency(bill.totalAmount || 0, settings)}</TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-green-100 text-green-700">Generated</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon"><Printer className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
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

          <TabsContent value="sub-bills" className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent>
                  <h3 className="text-sm font-semibold text-muted-foreground">Total Bills</h3>
                  <p className="text-2xl font-bold text-primary">{subcontractorBills.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <h3 className="text-sm font-semibold text-muted-foreground">Paid</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {subcontractorBills.filter(b => b.status === 'Paid').length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <h3 className="text-sm font-semibold text-muted-foreground">Pending</h3>
                  <p className="text-2xl font-bold text-amber-500">
                    {subcontractorBills.filter(b => b.status === 'Pending').length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <h3 className="text-sm font-semibold text-muted-foreground">Total Value</h3>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(
                      subcontractorBills.reduce((sum, b) => sum + (b.netAmount || 0), 0), 
                      settings
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subcontractor</TableHead>
                    <TableHead>Bill Number</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subcontractorBills.length > 0 ? subcontractorBills.map(bill => {
                    const subcontractor = subcontractors.find(s => s.id === bill.subcontractorId);
                    return (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">{subcontractor?.name || 'Unknown'}</TableCell>
                        <TableCell>{bill.billNumber}</TableCell>
                        <TableCell className="font-bold">{formatCurrency(bill.netAmount || 0, settings)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              bill.status === 'Paid' ? 'default' : 
                              bill.status === 'Pending' ? 'secondary' : 'outline'
                            }
                            className={
                                bill.status === 'Paid' ? 'bg-green-100 text-green-700' : 
                                bill.status === 'Pending' ? 'bg-amber-100 text-amber-700' : ''
                            }
                          >
                            {bill.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(bill.periodFrom).toLocaleDateString()} - {new Date(bill.periodTo).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon"><Printer className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                        No subcontractor bills found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="rfis" className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent>
                  <h3 className="text-sm font-semibold text-muted-foreground">Total RFIs</h3>
                  <p className="text-2xl font-bold text-primary">{rfiStats.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <h3 className="text-sm font-semibold text-muted-foreground">Pending</h3>
                  <p className="text-2xl font-bold text-amber-500">{rfiStats.pending}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <h3 className="text-sm font-semibold text-muted-foreground">Approved</h3>
                  <p className="text-2xl font-bold text-green-600">{rfiStats.approved}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <h3 className="text-sm font-semibold text-muted-foreground">Rejected</h3>
                  <p className="text-2xl font-bold text-red-600">{rfiStats.rejected}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-6">
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="relative w-full sm:w-auto flex-grow">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search RFIs..." 
                    value={rfiSearchTerm}
                    onChange={(e) => setRfiSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
                <div className="w-full sm:w-auto">
                  <Select value={rfiTaskFilter} onValueChange={setRfiTaskFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Tasks" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tasks</SelectItem>
                      {/* Add actual tasks here */}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RFI Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRfis.length > 0 ? filteredRfis.map(rfi => (
                    <TableRow key={rfi.id}>
                      <TableCell className="font-medium">RFI-{rfi.id?.slice(0, 6)}</TableCell>
                      <TableCell>{rfi.title}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            rfi.status === 'Approved' ? 'default' : 
                            rfi.status === 'Pending' ? 'secondary' : 'destructive'
                          }
                          className={
                            rfi.status === 'Approved' ? 'bg-green-100 text-green-700' : 
                            rfi.status === 'Pending' ? 'bg-amber-100 text-amber-700' : ''
                          }
                        >
                          {rfi.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(rfi.date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon"><Edit2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                        No RFIs found.
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
                <CardContent>
                  <h3 className="text-sm font-semibold text-muted-foreground">Total Variations</h3>
                  <p className="text-2xl font-bold text-primary">{voStats.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <h3 className="text-sm font-semibold text-muted-foreground">Approved</h3>
                  <p className="text-2xl font-bold text-green-600">{voStats.approved}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <h3 className="text-sm font-semibold text-muted-foreground">Pending</h3>
                  <p className="text-2xl font-bold text-amber-500">{voStats.pending}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <h3 className="text-sm font-semibold text-muted-foreground">Total Value</h3>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(voStats.totalValue, settings)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search variations..." 
                    value={voSearchTerm}
                    onChange={(e) => setVoSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>VO Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVos.length > 0 ? filteredVos.map(vo => (
                    <TableRow key={vo.id}>
                      <TableCell className="font-medium">{vo.voNumber}</TableCell>
                      <TableCell>{vo.title}</TableCell>
                      <TableCell>{vo.reason}</TableCell>
                      <TableCell className="font-bold">{formatCurrency(vo.totalAmount || 0, settings)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={vo.status === 'Approved' ? 'default' : 'secondary'}
                          className={vo.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}
                        >
                          {vo.status || 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon"><Edit2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                        No variation orders found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default FinancialManagementHub;

import React, { useState, useMemo } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Badge } from '~/components/ui/badge';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Separator } from '~/components/ui/separator';
import { Checkbox } from '~/components/ui/checkbox';
import {
  Plus, Edit, Trash2, Save, X, Calendar, DollarSign,
  FileText, CheckCircle, AlertTriangle, User, Search,
  ArrowRight, ArrowLeft, Printer, FileCheck, Calculator
} from 'lucide-react';
import { Project, UserRole, AppSettings, Subcontractor, SubcontractorBill, BillItem, StructureWorkLog } from '../../types';
import { formatCurrency } from '../../utils/formatting/exportUtils';
import { getCurrencySymbol } from '../../utils/formatting/currencyUtils';
import { toast } from 'sonner';

interface Props {
  project: Project;
  userRole: UserRole;
  settings: AppSettings;
  onProjectUpdate: (project: Project) => void;
}

const SubcontractorBillingModule: React.FC<Props> = ({ project, settings, onProjectUpdate, userRole }) => {
  const [activeTab, setActiveTab] = useState("0");
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [isManualItemModalOpen, setIsManualItemModalOpen] = useState(false);
  const [selectedBoqId, setSelectedBoqId] = useState<string>('');
  const [createStep, setCreateStep] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubBillId, setSelectedSubBillId] = useState<string | null>(null);
  const [selectedWorkIds, setSelectedWorkIds] = useState(new Set<string>());
  
  const [billForm, setBillForm] = useState<Partial<SubcontractorBill>>({
    billNumber: '',
    date: new Date().toISOString().split('T')[0],
    periodFrom: new Date().toISOString().split('T')[0],
    periodTo: new Date().toISOString().split('T')[0],
    subcontractorId: '',
    items: [],
    grossAmount: 0,
    retentionPercent: 5,
    description: '',
    status: 'Draft'
  });

  const subcontractors = project.agencies?.filter(a => a.type === 'subcontractor') || [];
  const bills = project.subcontractorBills || [];
  const currency = getCurrencySymbol(settings?.currency);

  // Filtered bills for the list
  const filteredBills = bills.filter(bill => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const subcontractor = subcontractors.find(s => s.id === bill.subcontractorId);
    return (
      (bill.description || '').toLowerCase().includes(searchLower) ||
      (subcontractor?.name || '').toLowerCase().includes(searchLower) ||
      (bill.billNumber || '').toLowerCase().includes(searchLower)
    );
  });

  // Financial calculations for the current form
  const billDetails = useMemo(() => {
    const gross = (billForm.items || []).reduce((acc, item) => acc + (item.currentAmount || 0), 0);
    const retention = gross * (Number(billForm.retentionPercent || 0) / 100);
    const net = gross - retention;
    
    return {
      grossAmount: gross,
      retentionAmount: retention,
      netAmount: net
    };
  }, [billForm.items, billForm.retentionPercent]);

  const handleCreateNew = () => {
    setBillForm({
      billNumber: `SCB-${(bills.length || 0) + 1}`,
      date: new Date().toISOString().split('T')[0],
      periodFrom: new Date().toISOString().split('T')[0],
      periodTo: new Date().toISOString().split('T')[0],
      subcontractorId: '',
      items: [],
      grossAmount: 0,
      retentionPercent: 5,
      description: '',
      status: 'Draft'
    });
    setSelectedWorkIds(new Set());
    setCreateStep(0);
    setIsBillModalOpen(true);
  };

  const getSubWorkLogs = (subId: string) => {
    if (!project.structures) return [];
    return project.structures.flatMap(s => 
      s.components.flatMap(c => 
        (c.workLogs || []).filter(log => log.subcontractorId === subId)
      )
    );
  };

  const generateItemsFromLogs = () => {
    const selectedLogs = getSubWorkLogs(billForm.subcontractorId || '').filter(l => selectedWorkIds.has(l.id));
    
    // Group logs by BOQ Item
    const logGroups: Record<string, number> = {};
    selectedLogs.forEach(log => {
      if (log.boqItemId) {
        logGroups[log.boqItemId] = (logGroups[log.boqItemId] || 0) + log.quantity;
      }
    });

    const items: BillItem[] = Object.keys(logGroups).map(boqId => {
      const boqItem = project.boq.find(b => b.id === boqId);
      if (!boqItem) return null;

      // Check for specific sub rate
      const sub = subcontractors.find(s => s.id === billForm.subcontractorId);
      const subRate = sub?.rates?.find(r => (r as any).boqItemId === boqId)?.rate || boqItem.rate;
      const qty = logGroups[boqId];

      return {
        id: `sbi-${Date.now()}-${boqId}`,
        boqItemId: boqId,
        itemNo: boqItem.itemNo,
        description: boqItem.description,
        unit: boqItem.unit,
        contractQuantity: boqItem.quantity,
        rate: subRate,
        previousQuantity: 0,
        currentQuantity: qty,
        uptoDateQuantity: qty,
        previousAmount: 0,
        currentAmount: qty * subRate,
        uptoDateAmount: qty * subRate
      };
    }).filter(Boolean) as BillItem[];

    setBillForm(prev => ({ ...prev, items }));
    setCreateStep(1);
  };

  const handleQtyChange = (boqId: string, newQty: number) => {
    const updatedItems = (billForm.items || []).map(item => {
      if (item.boqItemId === boqId) {
        return {
          ...item,
          currentQuantity: newQty,
          uptoDateQuantity: newQty,
          currentAmount: newQty * item.rate,
          uptoDateAmount: newQty * item.rate
        };
      }
      return item;
    });
    setBillForm({ ...billForm, items: updatedItems });
  };

  const handleAddManualItem = () => {
    if (!selectedBoqId) return;
    
    const boqItem = project.boq.find(b => b.id === selectedBoqId);
    if (!boqItem) return;

    // Check if item already exists in bill
    if (billForm.items?.some(i => i.boqItemId === selectedBoqId)) {
      toast.error("Item already added to this bill.");
      return;
    }

    // Check for specific sub rate
    const sub = subcontractors.find(s => s.id === billForm.subcontractorId);
    const subRate = sub?.rates?.find(r => (r as any).boqItemId === selectedBoqId)?.rate || boqItem.rate;

    const newItem: BillItem = {
      id: `sbi-${Date.now()}-${selectedBoqId}`,
      boqItemId: selectedBoqId,
      itemNo: boqItem.itemNo,
      description: boqItem.description,
      unit: boqItem.unit,
      contractQuantity: boqItem.quantity,
      rate: subRate,
      previousQuantity: 0,
      currentQuantity: 0,
      uptoDateQuantity: 0,
      previousAmount: 0,
      currentAmount: 0,
      uptoDateAmount: 0
    };

    setBillForm(prev => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));
    
    setIsManualItemModalOpen(false);
    setSelectedBoqId('');
    toast.success(`Item ${boqItem.itemNo} added to bill.`);
  };

  const handleSaveBill = () => {
    if (!billForm.subcontractorId || billForm.items?.length === 0) {
      toast.error('Please select a subcontractor and add items.');
      return;
    }

    const finalBill: SubcontractorBill = {
      ...billForm,
      id: `scb-${Date.now()}`,
      grossAmount: billDetails.grossAmount,
      netAmount: billDetails.netAmount,
      status: billForm.status || 'Draft'
    } as SubcontractorBill;

    onProjectUpdate({
      ...project,
      subcontractorBills: [...(project.subcontractorBills || []), finalBill]
    });

    setIsBillModalOpen(false);
    setSelectedSubBillId(finalBill.id);
    toast.success('Subcontractor bill created successfully.');
  };

  const handleDeleteBill = (id: string) => {
    if (window.confirm('Delete this bill permanently?')) {
      onProjectUpdate({
        ...project,
        subcontractorBills: bills.filter(b => b.id !== id)
      });
      if (selectedSubBillId === id) setSelectedSubBillId(null);
      toast.success('Bill deleted.');
    }
  };

  const billingSummary = {
    total: bills.reduce((sum, b) => sum + b.netAmount, 0),
    paid: bills.filter(b => b.status === 'Paid').reduce((sum, b) => sum + b.netAmount, 0),
    pending: bills.filter(b => b.status === 'Submitted' || b.status === 'Approved').reduce((sum, b) => sum + b.netAmount, 0)
  };

  const viewingBill = bills.find(b => b.id === selectedSubBillId);

  return (
    <div className="h-[calc(100vh-140px)] flex gap-3">
      {/* Sidebar: Summary and Filters */}
      <Card className="w-80 flex flex-col border shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-slate-50 border-b p-4">
          <CardTitle className="text-lg font-black flex items-center gap-2">
            <FileCheck className="text-amber-600" /> Sub-Billing
          </CardTitle>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input 
              placeholder="Find bills..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          <Button className="w-full mt-3 bg-amber-600 hover:bg-amber-700 font-bold" onClick={handleCreateNew}>
            <Plus size={18} className="mr-2" /> New Bill
          </Button>
        </CardHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Financial Snapshot</p>
            <div className="grid grid-cols-1 gap-2">
              <Card className="p-3 bg-indigo-50/30 border-indigo-100">
                <p className="text-xs text-indigo-600 font-bold uppercase">Total Payable</p>
                <p className="text-lg font-black text-indigo-900">{formatCurrency(billingSummary.total, settings)}</p>
              </Card>
              <Card className="p-3 bg-emerald-50/30 border-emerald-100">
                <p className="text-xs text-emerald-600 font-bold uppercase">Paid to Date</p>
                <p className="text-lg font-black text-emerald-900">{formatCurrency(billingSummary.paid, settings)}</p>
              </Card>
              <Card className="p-3 bg-amber-50/30 border-amber-100">
                <p className="text-xs text-amber-600 font-bold uppercase">Pending Approval</p>
                <p className="text-lg font-black text-amber-900">{formatCurrency(billingSummary.pending, settings)}</p>
              </Card>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Recent Transactions</p>
            <div className="space-y-2">
              {bills.slice(-5).reverse().map(b => (
                <div 
                  key={b.id} 
                  onClick={() => setSelectedSubBillId(b.id)}
                  className={`p-2 rounded-lg border cursor-pointer transition-all ${selectedSubBillId === b.id ? 'bg-amber-50 border-amber-200' : 'bg-white hover:border-slate-300'}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold">{b.billNumber}</span>
                    <Badge variant="outline" className="text-[10px] h-4">{b.status}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{subcontractors.find(s => s.id === b.subcontractorId)?.name || 'Unknown'}</p>
                  <p className="text-xs font-bold text-amber-700 mt-1">{formatCurrency(b.netAmount, settings)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        {viewingBill ? (
          <>
            <Card className="border shadow-sm rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <FileCheck size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">{viewingBill.billNumber}</h2>
                    <p className="text-sm text-muted-foreground">
                      {subcontractors.find(s => s.id === viewingBill.subcontractorId)?.name} • {viewingBill.date}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.print()}><Printer size={16} className="mr-2"/> Print</Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => handleDeleteBill(viewingBill.id)}><Trash2 size={16}/></Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div className="p-3 border rounded-xl bg-slate-50">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gross Amount</p>
                    <p className="text-lg font-black">{formatCurrency(viewingBill.grossAmount, settings)}</p>
                  </div>
                  <div className="p-3 border rounded-xl bg-slate-50">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Retention ({viewingBill.retentionPercent}%)</p>
                    <p className="text-lg font-black text-red-600">-{formatCurrency(viewingBill.grossAmount * (viewingBill.retentionPercent/100), settings)}</p>
                  </div>
                  <div className="p-3 border rounded-xl bg-amber-900 text-white col-span-2">
                    <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Net Payable</p>
                    <p className="text-2xl font-black">{formatCurrency(viewingBill.netAmount, settings)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="flex-1 border shadow-sm rounded-xl overflow-hidden">
              <Tabs defaultValue="items" className="h-full flex flex-col">
                <TabsList className="bg-slate-50 border-b rounded-none px-4 h-12">
                  <TabsTrigger value="items" className="data-[state=active]:bg-white">Line Items</TabsTrigger>
                  <TabsTrigger value="details" className="data-[state=active]:bg-white">Bill Details</TabsTrigger>
                </TabsList>
                <div className="flex-1 overflow-auto">
                  <TabsContent value="items" className="m-0 p-0">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="w-20">Item #</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Unit</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right font-bold">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingBill.items.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-bold">{item.itemNo}</TableCell>
                            <TableCell className="max-w-md truncate">{item.description}</TableCell>
                            <TableCell className="text-right">{item.unit}</TableCell>
                            <TableCell className="text-right font-medium">{item.currentQuantity.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.rate, settings)}</TableCell>
                            <TableCell className="text-right font-black text-amber-700">{formatCurrency(item.currentAmount, settings)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>
                  <TabsContent value="details" className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest border-b pb-2">Header Information</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <p className="text-muted-foreground">Bill Number:</p>
                          <p className="font-bold">{viewingBill.billNumber}</p>
                          <p className="text-muted-foreground">Date Issued:</p>
                          <p className="font-bold">{viewingBill.date}</p>
                          <p className="text-muted-foreground">Period:</p>
                          <p className="font-bold">{viewingBill.periodFrom} to {viewingBill.periodTo}</p>
                          <p className="text-muted-foreground">Current Status:</p>
                          <p><Badge>{viewingBill.status}</Badge></p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest border-b pb-2">Notes & Remarks</h4>
                        <p className="text-sm italic text-slate-600 bg-slate-50 p-4 rounded-xl min-h-[100px]">
                          {viewingBill.description || "No additional notes provided for this bill."}
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </Card>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 border-2 border-dashed rounded-2xl">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Calculator size={40} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-400">Select a bill to view details</h3>
            <p className="text-sm text-slate-400 mt-1">Or create a new bill to track subcontractor payments</p>
            <Button className="mt-6 bg-amber-600 hover:bg-amber-700" onClick={handleCreateNew}><Plus size={18} className="mr-2"/> Create First Bill</Button>
          </div>
        )}
      </div>

      {/* Multi-Step Creation Modal */}
      <Dialog open={isBillModalOpen} onOpenChange={setIsBillModalOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b bg-slate-50">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center">
                  <Calculator size={20} />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black">Prepare Subcontractor Bill</DialogTitle>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Step {createStep + 1} of 2: {createStep === 0 ? 'Header & Work Selection' : 'Financial Review'}</p>
                </div>
              </div>
              <div className="flex gap-1">
                {[0, 1].map(s => (
                  <div key={s} className={`h-1.5 w-8 rounded-full ${s <= createStep ? 'bg-amber-600' : 'bg-slate-200'}`} />
                ))}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
            {createStep === 0 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Bill Number</Label>
                    <Input value={billForm.billNumber} onChange={e => setBillForm({...billForm, billNumber: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Billing Date</Label>
                    <Input type="date" value={billForm.date} onChange={e => setBillForm({...billForm, date: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold">Select Subcontractor</Label>
                  <Select
                    value={billForm.subcontractorId || ''}
                    onValueChange={(val) => {
                      setBillForm({...billForm, subcontractorId: val});
                      setSelectedWorkIds(new Set());
                    }}
                  >
                    <SelectTrigger className="h-12 text-base font-medium">
                      <SelectValue placeholder="Choose partner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {subcontractors.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.trade})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {billForm.subcontractorId && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex justify-between items-center">
                      <h3 className="font-black text-slate-900">Select Approved Work Logs</h3>
                      <Badge variant="outline">{selectedWorkIds.size} logs selected</Badge>
                    </div>
                    <Card className="border overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>BOQ Item</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getSubWorkLogs(billForm.subcontractorId).map(log => {
                            const boq = project.boq.find(b => b.id === log.boqItemId);
                            return (
                              <TableRow key={log.id} className="cursor-pointer" onClick={() => {
                                const next = new Set(selectedWorkIds);
                                if (next.has(log.id)) next.delete(log.id);
                                else next.add(log.id);
                                setSelectedWorkIds(next);
                              }}>
                                <TableCell><Checkbox checked={selectedWorkIds.has(log.id)} /></TableCell>
                                <TableCell className="text-xs">{log.date}</TableCell>
                                <TableCell className="text-xs font-bold">{boq?.itemNo}: {boq?.description.slice(0, 40)}...</TableCell>
                                <TableCell className="text-right font-medium">{log.quantity} {boq?.unit}</TableCell>
                              </TableRow>
                            );
                          })}
                          {getSubWorkLogs(billForm.subcontractorId).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">
                                No specific work logs found for this subcontractor. You can still manually add BOQ items in the next step.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </Card>
                  </div>
                )}
              </div>
            )}

            {createStep === 1 && (
              <div className="space-y-6">
                <div className="flex justify-between items-end border-b pb-4">
                  <h3 className="text-lg font-black text-slate-900">Line Item Matrix</h3>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Current Gross Total</p>
                    <p className="text-2xl font-black text-amber-700">{formatCurrency(billDetails.grossAmount, settings)}</p>
                  </div>
                </div>

                <Card className="border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-20">Item #</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right w-32 bg-amber-50/50">Current Qty</TableHead>
                        <TableHead className="text-right font-bold">Sub-Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {billForm.items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-bold text-xs">{item.itemNo}</TableCell>
                          <TableCell className="text-xs max-w-xs truncate">{item.description}</TableCell>
                          <TableCell className="text-right text-xs">{formatCurrency(item.rate, settings)}</TableCell>
                          <TableCell className="text-right bg-amber-50/30">
                            <Input 
                              type="number" 
                              value={item.currentQuantity} 
                              onChange={e => handleQtyChange(item.boqItemId, Number(e.target.value))}
                              className="h-8 text-right font-bold text-amber-700 border-amber-200"
                            />
                          </TableCell>
                          <TableCell className="text-right font-black text-slate-900">{formatCurrency(item.currentAmount, settings)}</TableCell>
                        </TableRow>
                      ))}
                      {(!billForm.items || billForm.items.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10">
                            <Button variant="outline" onClick={() => setIsManualItemModalOpen(true)}>
                              <Plus size={16} className="mr-2"/> Add Manual Line Item
                            </Button>
                          </TableCell>
                        </TableRow>
                      )}
                      {billForm.items && billForm.items.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4 bg-slate-50/50">
                            <Button variant="ghost" size="sm" onClick={() => setIsManualItemModalOpen(true)} className="text-amber-700 font-bold">
                              <Plus size={14} className="mr-1"/> Add Another BOQ Item
                            </Button>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Card>

                <div className="grid grid-cols-2 gap-6 pt-4">
                  <div className="space-y-4">
                    <div className="p-4 border rounded-xl bg-slate-50 space-y-3">
                      <Label className="font-black text-xs uppercase tracking-widest text-slate-500">Deduction Rules</Label>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Retention Percentage</span>
                        <div className="flex items-center gap-2 w-24">
                          <Input 
                            type="number" 
                            value={billForm.retentionPercent} 
                            onChange={e => setBillForm({...billForm, retentionPercent: Number(e.target.value)})}
                            className="h-8 text-right font-bold"
                          />
                          <span className="text-sm font-bold">%</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-xs uppercase text-slate-500">Remarks / Description</Label>
                      <textarea 
                        className="w-full min-h-[80px] p-3 rounded-xl border bg-white text-sm"
                        placeholder="Additional context for this payment..."
                        value={billForm.description}
                        onChange={e => setBillForm({...billForm, description: e.target.value})}
                      />
                    </div>
                  </div>

                  <Card className="bg-amber-900 text-white p-6 rounded-2xl shadow-xl shadow-amber-900/20">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center opacity-70">
                        <span className="text-sm font-medium">Gross Certified Work</span>
                        <span className="font-bold">{formatCurrency(billDetails.grossAmount, settings)}</span>
                      </div>
                      <div className="flex justify-between items-center text-red-300">
                        <span className="text-sm font-medium">Retention Deduction ({billForm.retentionPercent}%)</span>
                        <span className="font-bold">-{formatCurrency(billDetails.retentionAmount, settings)}</span>
                      </div>
                      <Separator className="bg-amber-800" />
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-lg font-black uppercase tracking-wider text-amber-200">Total Net Payable</span>
                        <span className="text-3xl font-black text-green-400">{formatCurrency(billDetails.netAmount, settings)}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 border-t bg-slate-50 gap-3">
            {createStep === 0 ? (
              <>
                <Button variant="outline" onClick={() => setIsBillModalOpen(false)} className="rounded-xl px-6 h-12 font-bold">Cancel</Button>
                <Button 
                  disabled={!billForm.subcontractorId} 
                  onClick={generateItemsFromLogs}
                  className="bg-amber-600 hover:bg-amber-700 rounded-xl px-8 h-12 font-bold shadow-lg shadow-amber-600/20"
                >
                  Configure Line Items <ArrowRight size={18} className="ml-2" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setCreateStep(0)} className="rounded-xl px-6 h-12 font-bold"><ArrowLeft size={18} className="mr-2"/> Back</Button>
                <Button 
                  onClick={handleSaveBill}
                  className="bg-green-600 hover:bg-green-700 rounded-xl px-10 h-12 font-bold shadow-lg shadow-green-600/20"
                >
                  <Save size={18} className="mr-2" /> Issue Bill Draft
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Item Selection Modal */}
      <Dialog open={isManualItemModalOpen} onOpenChange={setIsManualItemModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add BOQ Item to Bill</DialogTitle>
            <DialogDescription>Select an item from the project BOQ to include in this bill.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Select BOQ Item</Label>
              <Select value={selectedBoqId} onValueChange={setSelectedBoqId}>
                <SelectTrigger>
                  <SelectValue placeholder="Search item..." />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[200px]">
                    {project.boq.map(item => (
                      <SelectItem key={item.id} value={item.id}>[{item.itemNo}] {item.description.substring(0, 50)}...</SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManualItemModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddManualItem} disabled={!selectedBoqId} className="bg-amber-600 hover:bg-amber-700">Add to Bill</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubcontractorBillingModule;

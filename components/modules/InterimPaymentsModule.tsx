import React, { useState, useMemo } from 'react';
import { Project, AppSettings, InterimPayment, MeasurementSheet, UserRole } from '../../types';
import { formatCurrency } from '../../utils/formatting/exportUtils';
import {
    ClipboardList, Plus, CheckCircle2,
    FileText, Send, BarChart3,
    Trash2, Edit, AlertTriangle,
    ChevronDown, ChevronUp, Save
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Textarea } from '~/components/ui/textarea';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Progress } from '~/components/ui/progress';
import { Badge } from '~/components/ui/badge';

interface Props {
  project: Project;
  settings: AppSettings;
  userRole: UserRole;
  onProjectUpdate: (project: Project) => void;
}

const InterimPaymentsModule: React.FC<Props> = ({ project, settings, userRole, onProjectUpdate }) => {
  const [payments, setPayments] = useState<InterimPayment[]>(project.interimPayments || []);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<InterimPayment | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const [form, setForm] = useState({
    ipcNumber: '',
    periodFrom: '',
    periodTo: '',
    submissionDate: new Date().toISOString().split('T')[0],
    grossAmount: 0,
    vatAmount: 0,
    retentionAmount: 0,
    advancePaymentDeduction: 0,
    incomeTaxDeduction: 0,
    contractorDevelopmentFund: 0,
    netAmount: 0,
    remarks: ''
  });

  const canEdit = [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER].includes(userRole);
  const canApprove = [UserRole.ADMIN, UserRole.PROJECT_MANAGER].includes(userRole);

  const filteredPayments = useMemo(() => {
    switch (activeTab) {
      case 'draft': return payments.filter(p => p.status === 'Draft');
      case 'submitted': return payments.filter(p => p.status === 'Submitted');
      case 'approved': return payments.filter(p => p.status === 'Approved');
      case 'paid': return payments.filter(p => p.status === 'Paid');
      default: return payments;
    }
  }, [activeTab, payments]);

  const calculateTotals = (payment: InterimPayment) => {
    const totalDeductions = (payment.retentionAmount || 0) +
      (payment.advancePaymentDeduction || 0) +
      (payment.incomeTaxDeduction || 0) +
      (payment.contractorDevelopmentFund || 0);
    const net = payment.grossAmount + payment.vatAmount - totalDeductions;
    return { totalDeductions, net };
  };

  const handleCreate = () => {
    if (!form.ipcNumber || !form.periodFrom || !form.periodTo) {
      toast.error('Please fill in required fields');
      return;
    }

    const newPayment: InterimPayment = {
      id: `ipc-${Date.now()}`,
      ipcNumber: form.ipcNumber,
      periodFrom: form.periodFrom,
      periodTo: form.periodTo,
      submissionDate: form.submissionDate,
      status: 'Draft',
      grossAmount: form.grossAmount,
      vatAmount: form.vatAmount,
      retentionAmount: form.retentionAmount,
      advancePaymentDeduction: form.advancePaymentDeduction,
      incomeTaxDeduction: form.incomeTaxDeduction,
      contractorDevelopmentFund: form.contractorDevelopmentFund,
      totalDeductions: 0,
      netAmount: 0,
      measurementSheets: [],
      billItems: [],
      remarks: form.remarks
    };

    const { totalDeductions, net } = calculateTotals(newPayment);
    newPayment.totalDeductions = totalDeductions;
    newPayment.netAmount = net;

    const updatedPayments = [...payments, newPayment];
    setPayments(updatedPayments);
    onProjectUpdate({ ...project, interimPayments: updatedPayments });
    setIsCreateDialogOpen(false);
    setForm({
      ipcNumber: '',
      periodFrom: '',
      periodTo: '',
      submissionDate: new Date().toISOString().split('T')[0],
      grossAmount: 0,
      vatAmount: 0,
      retentionAmount: 0,
      advancePaymentDeduction: 0,
      incomeTaxDeduction: 0,
      contractorDevelopmentFund: 0,
      netAmount: 0,
      remarks: ''
    });
    toast.success('Interim Payment created');
  };

  const handleStatusChange = (paymentId: string, status: InterimPayment['status']) => {
    const updatedPayments = payments.map(p =>
      p.id === paymentId ? { ...p, status } : p
    );
    setPayments(updatedPayments);
    onProjectUpdate({ ...project, interimPayments: updatedPayments });
    toast.success(`Payment ${status}`);
  };

  const handleDelete = (paymentId: string) => {
    if (!confirm('Delete this interim payment?')) return;
    const updatedPayments = payments.filter(p => p.id !== paymentId);
    setPayments(updatedPayments);
    onProjectUpdate({ ...project, interimPayments: updatedPayments });
    toast.success('Payment deleted');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Draft': return <Badge variant="secondary" className="text-[10px] font-black">DRAFT</Badge>;
      case 'Submitted': return <Badge variant="outline" className="text-[10px] font-black">SUBMITTED</Badge>;
      case 'Approved': return <Badge variant="default" className="text-[10px] font-black">APPROVED</Badge>;
      case 'Paid': return <span className="text-[10px] font-black bg-green-600 text-white px-2 py-1 rounded">PAID</span>;
      default: return <Badge variant="secondary" className="text-[10px] font-black">{status.toUpperCase()}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black uppercase tracking-wider">Interim Payments</h2>
        {canEdit && (
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus size={16} /> New IPC
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" className="text-[10px] font-black uppercase">All ({payments.length})</TabsTrigger>
          <TabsTrigger value="draft" className="text-[10px] font-black uppercase">Draft ({payments.filter(p => p.status === 'Draft').length})</TabsTrigger>
          <TabsTrigger value="submitted" className="text-[10px] font-black uppercase">Submitted ({payments.filter(p => p.status === 'Submitted').length})</TabsTrigger>
          <TabsTrigger value="approved" className="text-[10px] font-black uppercase">Approved ({payments.filter(p => p.status === 'Approved').length})</TabsTrigger>
          <TabsTrigger value="paid" className="text-[10px] font-black uppercase">Paid ({payments.filter(p => p.status === 'Paid').length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredPayments.length === 0 ? (
            <Card className="rounded-3xl">
              <CardContent className="p-8 text-center">
                <ClipboardList className="mx-auto mb-4 text-muted-foreground" size={48} />
                <p className="text-sm text-muted-foreground italic">No interim payments found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredPayments.map(payment => {
                const { totalDeductions, net } = calculateTotals(payment);
                return (
                  <Card key={payment.id} className="rounded-3xl">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg font-black flex items-center gap-2">
                            <FileText size={18} className="text-primary" />
                            IPC - {payment.ipcNumber}
                          </CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {payment.periodFrom} to {payment.periodTo}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(payment.status)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
<div className="p-3 bg-muted rounded-xl">
                          <p className="text-[10px] font-black text-muted-foreground uppercase">Gross Amount</p>
                          <p className="text-lg font-black">{formatCurrency(payment.grossAmount, settings.currency)}</p>
                        </div>
                        <div className="p-3 bg-muted rounded-xl">
                          <p className="text-[10px] font-black text-muted-foreground uppercase">VAT</p>
                          <p className="text-lg font-black">{formatCurrency(payment.vatAmount, settings.currency)}</p>
                        </div>
                        <div className="p-3 bg-muted rounded-xl">
                          <p className="text-[10px] font-black text-muted-foreground uppercase">Total Deductions</p>
                          <p className="text-lg font-black text-red-600">{formatCurrency(totalDeductions, settings.currency)}</p>
                        </div>
                        <div className="p-3 bg-muted rounded-xl">
                          <p className="text-[10px] font-black text-muted-foreground uppercase">Net Payable</p>
                          <p className="text-lg font-black text-green-600">{formatCurrency(net, settings.currency)}</p>
                        </div>
                      </div>

                      {payment.remarks && (
                        <Alert>
                          <AlertDescription className="text-xs">{payment.remarks}</AlertDescription>
                        </Alert>
                      )}

                      <div className="flex gap-2 pt-2">
                        {canApprove && payment.status === 'Draft' && (
                          <Button size="sm" variant="outline" onClick={() => handleStatusChange(payment.id, 'Submitted')}>
                            <Send size={14} className="mr-1" /> Submit
                          </Button>
                        )}
                        {canApprove && payment.status === 'Submitted' && (
                          <>
                            <Button size="sm" onClick={() => handleStatusChange(payment.id, 'Approved')}>
                              <CheckCircle2 size={14} className="mr-1" /> Approve
                            </Button>
                          </>
                        )}
                        {canApprove && payment.status === 'Approved' && (
                          <Button size="sm" onClick={() => handleStatusChange(payment.id, 'Paid')}>
                            <CheckCircle2 size={14} className="mr-1" /> Mark as Paid
                          </Button>
                        )}
                        {canEdit && (
                          <Button size="sm" variant="ghost" onClick={() => setSelectedPayment(payment)}>
                            <Edit size={14} className="mr-1" /> Edit
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(payment.id)}>
                          <Trash2 size={14} className="mr-1" /> Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Interim Payment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>IPC Number</Label>
              <Input value={form.ipcNumber} onChange={e => setForm({ ...form, ipcNumber: e.target.value })} placeholder="IPC-01" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Period From</Label>
                <Input type="date" value={form.periodFrom} onChange={e => setForm({ ...form, periodFrom: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Period To</Label>
                <Input type="date" value={form.periodTo} onChange={e => setForm({ ...form, periodTo: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Gross Amount</Label>
                <Input type="number" value={form.grossAmount} onChange={e => setForm({ ...form, grossAmount: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="grid gap-2">
                <Label>VAT Amount</Label>
                <Input type="number" value={form.vatAmount} onChange={e => setForm({ ...form, vatAmount: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Retention Amount</Label>
                <Input type="number" value={form.retentionAmount} onChange={e => setForm({ ...form, retentionAmount: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="grid gap-2">
                <Label>Advance Payment Deduction</Label>
                <Input type="number" value={form.advancePaymentDeduction} onChange={e => setForm({ ...form, advancePaymentDeduction: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Income Tax Deduction</Label>
                <Input type="number" value={form.incomeTaxDeduction} onChange={e => setForm({ ...form, incomeTaxDeduction: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="grid gap-2">
                <Label>Contractor Development Fund</Label>
                <Input type="number" value={form.contractorDevelopmentFund} onChange={e => setForm({ ...form, contractorDevelopmentFund: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Remarks</Label>
              <Textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create IPC</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InterimPaymentsModule;
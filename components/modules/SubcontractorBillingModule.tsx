import React, { useState, useEffect } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Badge } from '~/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Textarea } from '~/components/ui/textarea';
import {
  Plus, Edit, Trash2, Save, X, Calendar, DollarSign,
  FileText, CheckCircle, AlertTriangle, User, Clock, Search
} from 'lucide-react';
import { Project, UserRole, AppSettings, Subcontractor, SubcontractorBill } from '../../types';
import { formatCurrency } from '../../utils/formatting/exportUtils';
import { getCurrencySymbol } from '../../utils/formatting/currencyUtils';

interface Props {
  project: Project;
  userRole: UserRole;
  settings: AppSettings;
  onProjectUpdate: (project: Project) => void;
}

const SubcontractorBillingModule: React.FC<Props> = ({ project, settings, onProjectUpdate, userRole }) => {
  const [activeTab, setActiveTab] = useState("0");
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [currentBill, setCurrentBill] = useState<Partial<SubcontractorBill> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [billForm, setBillForm] = useState<Partial<SubcontractorBill>>({
    id: '',
    subcontractorId: '',
    billNumber: '',
    description: '',
    netAmount: 0,
    grossAmount: 0,
    date: new Date().toISOString().split('T')[0],
    periodFrom: '',
    periodTo: '',
    status: 'Draft',
    retentionPercent: 0,
    items: [],
  });
  const [isEditing, setIsEditing] = useState(false);

  // Get all subcontractors and bills
  const subcontractors = project.agencies?.filter(a => a.type === 'subcontractor') || [];
  const bills = project.subcontractorBills || [];

  // Filter bills based on search term
  const filteredBills = bills.filter(bill => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const subcontractor = subcontractors.find(s => s.id === bill.subcontractorId);
    return (
      bill.description.toLowerCase().includes(searchLower) ||
      (subcontractor?.name.toLowerCase().includes(searchLower) || false) ||
      bill.billNumber?.toLowerCase().includes(searchLower) ||
      bill.subcontractorId?.toLowerCase().includes(searchLower)
    );
  });

  // Handle form changes
  const handleFormChange = (field: string, value: any) => {
    setBillForm(prev => ({ ...prev, [field]: value }));
  };

  // Open modal to create new bill
  const handleCreateBill = () => {
    setBillForm({
      id: `bill-${Date.now()}`,
      subcontractorId: '',
      billNumber: `SB-${(project.subcontractorBills?.length || 0) + 1}`,
      description: '',
      netAmount: 0,
      grossAmount: 0,
      date: new Date().toISOString().split('T')[0],
      periodFrom: '',
      periodTo: '',
      status: 'Draft',
      retentionPercent: 0,
      items: [],
    });
    setIsEditing(true);
    setIsBillModalOpen(true);
  };

  // Open modal to edit existing bill
  const handleEditBill = (bill: SubcontractorBill) => {
    setBillForm({ ...bill });
    setCurrentBill(bill);
    setIsEditing(true);
    setIsBillModalOpen(true);
  };

  // Delete a bill
  const handleDeleteBill = (billId: string) => {
    if (window.confirm('Are you sure you want to delete this bill?')) {
      const updatedProject = {
        ...project,
        subcontractorBills: project.subcontractorBills?.filter(b => b.id !== billId) || []
      };
      onProjectUpdate(updatedProject);
    }
  };

  // Save or update a bill
  const handleSaveBill = () => {
    const updatedProject = { ...project };

    if (isEditing && currentBill?.id) {
      // Update existing bill
      updatedProject.subcontractorBills = updatedProject.subcontractorBills?.map(bill =>
        bill.id === currentBill.id ? { ...billForm } as SubcontractorBill : bill
      ) || [];
    } else {
      // Add new bill
      updatedProject.subcontractorBills = [...(project.subcontractorBills || []), billForm as SubcontractorBill];
    }

    onProjectUpdate(updatedProject);
    setIsBillModalOpen(false);
    setBillForm({
      id: '',
      subcontractorId: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      status: 'Draft'
    });
    setCurrentBill(null);
    setIsEditing(false);
  };

  // Cancel form
  const handleCancel = () => {
    setIsBillModalOpen(false);
    setBillForm({
      id: '',
      subcontractorId: '',
      billNumber: '',
      description: '',
      netAmount: 0,
      grossAmount: 0,
      date: new Date().toISOString().split('T')[0],
      periodFrom: '',
      periodTo: '',
      status: 'Draft',
      retentionPercent: 0,
      items: [],
    });
    setCurrentBill(null);
    setIsEditing(false);
  };

  // Calculate billing summary
  const billingSummary = {
    totalBills: bills.length,
    totalAmount: bills.reduce((sum, bill) => sum + bill.netAmount, 0),
    pendingAmount: bills.filter(b => b.status === 'Submitted').reduce((sum, bill) => sum + bill.netAmount, 0),
    approvedAmount: bills.filter(b => b.status === 'Approved').reduce((sum, bill) => sum + bill.netAmount, 0),
    paidAmount: bills.filter(b => b.status === 'Paid').reduce((sum, bill) => sum + bill.netAmount, 0)
  };

  return (
    <div className="h-[calc(100vh-140px)] flex gap-3">
      <Card className="w-80 rounded-xl flex flex-col overflow-hidden border">
        <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50">
          <CardTitle className="text-lg font-extrabold">Subcontractor Billing</CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage subcontractor bills and payments
          </p>

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search bills..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Button
            className="w-full mt-4 rounded-xl"
            onClick={handleCreateBill}
          >
            <Plus size={18} className="mr-2" />
            New Bill
          </Button>
        </CardHeader>

        <div className="flex-1 p-4 overflow-auto">
          <h3 className="text-sm font-bold mb-4">BILLING SUMMARY</h3>

          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 text-center bg-slate-50">
              <p className="text-xs text-slate-500">Total Bills</p>
              <p className="text-lg font-bold">{billingSummary.totalBills}</p>
            </Card>
            <Card className="p-4 text-center bg-slate-50">
              <p className="text-xs text-slate-500">Total Amount</p>
              <p className="text-lg font-bold">{formatCurrency(billingSummary.totalAmount, settings)}</p>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <Card className="p-4 text-center bg-slate-50">
              <p className="text-xs text-slate-500">Pending</p>
              <p className="text-lg font-bold text-yellow-600">{formatCurrency(billingSummary.pendingAmount, settings)}</p>
            </Card>
            <Card className="p-4 text-center bg-slate-50">
              <p className="text-xs text-slate-500">Paid</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(billingSummary.paidAmount, settings)}</p>
            </Card>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-bold mb-3">STATUS FILTERS</h3>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="cursor-pointer" onClick={() => setActiveTab("0")}>All</Badge>
              <Badge variant="outline" className="cursor-pointer" onClick={() => setActiveTab("1")}>Draft</Badge>
              <Badge variant="outline" className="cursor-pointer" onClick={() => setActiveTab("2")}>Submitted</Badge>
              <Badge variant="outline" className="cursor-pointer" onClick={() => setActiveTab("3")}>Approved</Badge>
              <Badge variant="outline" className="cursor-pointer" onClick={() => setActiveTab("4")}>Paid</Badge>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex-1 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="border-b">
          <TabsList>
            <TabsTrigger value="0">All Bills</TabsTrigger>
            <TabsTrigger value="1">Drafts</TabsTrigger>
            <TabsTrigger value="2">Pending</TabsTrigger>
            <TabsTrigger value="3">Approved</TabsTrigger>
            <TabsTrigger value="4">Paid</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill #</TableHead>
                <TableHead>Subcontractor</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Net Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Period To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBills.map((bill) => {
                const subcontractor = subcontractors.find(s => s.id === bill.subcontractorId);
                return (
                  <TableRow key={bill.id}>
                    <TableCell>
                      <div className="font-medium">{bill.billNumber || 'N/A'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback>
                            <User size={14} />
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{subcontractor?.name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm max-w-xs truncate" title={bill.description}>
                        {bill.description.substring(0, 30)}{bill.description.length > 30 ? '...' : ''}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-medium">
                        {formatCurrency(bill.netAmount, settings)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{bill.date}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{bill.periodTo || 'N/A'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        bill.status === 'Draft' ? 'secondary' :
                        bill.status === 'Submitted' ? 'default' :
                        bill.status === 'Approved' ? 'default' :
                        bill.status === 'Paid' ? 'default' : 'secondary'
                      }>
                        {bill.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditBill(bill)}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteBill(bill.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredBills.length === 0 && (
            <div className="text-center py-16">
              <FileText size={60} className="mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-bold">No bills found</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm ? 'No bills match your search' : 'Create your first subcontractor bill to get started'}
              </p>
              <Button
                className="mt-4 rounded-xl"
                onClick={handleCreateBill}
              >
                <Plus size={16} className="mr-2" />
                Create New Bill
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bill Modal */}
      <Dialog open={isBillModalOpen} onOpenChange={handleCancel}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="text-primary" size={20} />
            {isEditing ? 'Edit Bill' : 'Create New Bill'}
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subcontractor-select">Subcontractor</Label>
              <Select
                value={billForm.subcontractorId || ''}
                onValueChange={(value) => handleFormChange('subcontractorId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subcontractor" />
                </SelectTrigger>
                <SelectContent>
                  {subcontractors.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bill-number">Bill Number</Label>
              <Input
                id="bill-number"
                value={billForm.billNumber || ''}
                onChange={(e) => handleFormChange('billNumber', e.target.value)}
                placeholder="Enter bill number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gross-amount">Gross Amount</Label>
              <Input
                id="gross-amount"
                type="number"
                value={billForm.grossAmount || 0}
                onChange={(e) => handleFormChange('grossAmount', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="net-amount">Net Amount</Label>
              <Input
                id="net-amount"
                type="number"
                value={billForm.netAmount || 0}
                onChange={(e) => handleFormChange('netAmount', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="retention-percent">Retention (%)</Label>
              <Input
                id="retention-percent"
                type="number"
                value={billForm.retentionPercent || 0}
                onChange={(e) => handleFormChange('retentionPercent', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bill-date">Bill Date</Label>
              <Input
                id="bill-date"
                type="date"
                value={billForm.date || ''}
                onChange={(e) => handleFormChange('date', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="period-from">Period From</Label>
              <Input
                id="period-from"
                type="date"
                value={billForm.periodFrom || ''}
                onChange={(e) => handleFormChange('periodFrom', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="period-to">Period To</Label>
              <Input
                id="period-to"
                type="date"
                value={billForm.periodTo || ''}
                onChange={(e) => handleFormChange('periodTo', e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bill-description">Description</Label>
              <Textarea
                id="bill-description"
                value={billForm.description || ''}
                onChange={(e) => handleFormChange('description', e.target.value)}
                placeholder="Enter bill description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bill-status">Status</Label>
              <Select
                value={billForm.status || 'Draft'}
                onValueChange={(value) => handleFormChange('status', value)}
              >
                <SelectTrigger>
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
        </DialogContent>
        <DialogFooter className="bg-muted/50">
          <Button variant="outline" onClick={handleCancel}>
            <X size={16} className="mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSaveBill}
            disabled={!billForm.subcontractorId || !billForm.description || billForm.netAmount === 0}
          >
            <Save size={16} className="mr-2" />
            {isEditing ? 'Update Bill' : 'Create Bill'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
};

export default SubcontractorBillingModule;


import React, { useState } from 'react';
import { Project, UserRole, Agency, AgencyPayment, AppSettings } from '../../types';
import { 
  Briefcase, Plus, Edit, Trash2, 
  Eye, CreditCard
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatting/exportUtils';

import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import { useToast } from '~/components/ui/use-toast';

interface Props {
  project: Project;
  userRole: UserRole;
  settings: AppSettings;
  onProjectUpdate: (project: Project) => void;
}

import { hasDuplicate } from '~/utils/validation/dedupUtils';

const AgencyModule: React.FC<Props> = ({ project, onProjectUpdate, userRole, settings }) => {
  const [activeTab, setActiveTab] = useState("vendors");
  const [isAgencyModalOpen, setIsAgencyModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const canAdd = true;
  const canEdit = userRole === UserRole.ADMIN || userRole === UserRole.PROJECT_MANAGER || userRole === UserRole.SITE_ENGINEER;
  const canDelete = userRole === UserRole.ADMIN || userRole === UserRole.PROJECT_MANAGER;

  const agencies = project.agencies?.filter(a => a.type === 'agency') || [];
  const subcontractors = project.agencies?.filter(a => a.type === 'subcontractor') || []; // Also considered agencies
  const agencyPayments = (project.agencyPayments || []).filter(p => p.agencyId && agencies.concat(subcontractors).some(a => a.id === p.agencyId));
  
  const [agencyForm, setAgencyForm] = useState<Partial<Agency>>({
    name: '',
    trade: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    status: 'Active',
    type: 'agency',
    contractValue: 0,
    startDate: '',
    endDate: '',
    materialCategories: [],
    deliveryAreas: [],
    preferredDeliveryMethods: [],
    licenseNumber: '',
    taxId: '',
    paymentTerms: '',
    deliveryLeadTime: 7,
    avatar: ''
  });

  const [paymentForm, setPaymentForm] = useState<Partial<AgencyPayment>>({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    reference: '',
    type: 'Bill Payment',
    description: ''
  });

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    toast({
        title: severity === 'error' ? 'Error' : severity === 'warning' ? 'Warning' : 'Info',
        description: message,
        variant: severity === 'error' ? 'destructive' : 'default',
    });
  };

  const handleAddAgency = () => {
    setAgencyForm({
      name: '',
      trade: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      status: 'Active',
      type: 'agency',
      contractValue: 0,
      startDate: '',
      endDate: '',
      materialCategories: [],
      deliveryAreas: [],
      preferredDeliveryMethods: [],
      licenseNumber: '',
      taxId: '',
      paymentTerms: '',
      deliveryLeadTime: 7,
      avatar: ''
    });
    setPreviewUrl(null);
    setIsAgencyModalOpen(true);
  };

  const handleEditAgency = (agency: Agency) => {
    setAgencyForm({
      id: agency.id,
      name: agency.name,
      trade: agency.trade,
      contactPerson: agency.contactPerson,
      phone: agency.phone,
      email: agency.email,
      address: agency.address,
      status: agency.status,
      type: agency.type || 'agency',
      contractValue: agency.contractValue,
      startDate: agency.startDate,
      endDate: agency.endDate,
      avatar: agency.avatar
    });
    setPreviewUrl(agency.avatar || null);
    setIsEditModalOpen(true);
  };

  const handleDeleteAgency = (agencyId: string) => {
    if (!canDelete) {
      showSnackbar('Only Admin and Project Manager can delete agencies', 'error');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this agency? This will also delete all associated payments.')) {
      const updatedAgencies = project.agencies?.filter(a => a.id !== agencyId) || [];
      const updatedPayments = project.agencyPayments?.filter(p => p.agencyId !== agencyId) || [];
      
      onProjectUpdate({
        ...project,
        agencies: updatedAgencies,
        agencyPayments: updatedPayments
      });
      
      if (selectedAgencyId === agencyId) {
        setSelectedAgencyId(null);
      }
    }
  };

  const handleSaveAgency = () => {
    // Validation
    if (!canEdit && (isEditModalOpen || agencyForm.id)) {
      showSnackbar('Unauthorized: Insufficient permissions to edit agency', 'error');
      return;
    }

    if (!agencyForm.name?.trim()) {
      showSnackbar('Agency name is required', 'error');
      return;
    }
    
    // Duplicate Check
    const isDuplicate = hasDuplicate(project.agencies || [], 'name', agencyForm.name!, agencyForm.id);
    
    if (isDuplicate) {
        showSnackbar('An agency with this name already exists', 'error');
        return;
    }

    if (!agencyForm.trade?.trim()) {
      showSnackbar('Trade is required', 'error');
      return;
    }
    
    if (agencyForm.contractValue && agencyForm.contractValue < 0) {
      showSnackbar('Contract value must be a positive number', 'error');
      return;
    }
    
    if (agencyForm.phone && !/^\+?[1-9][\d\-\s]{8,}$/.test(agencyForm.phone)) {
      showSnackbar('Please enter a valid phone number', 'error');
      return;
    }
    
    if (agencyForm.email && !/^[\w\.-]+@[\w\.-]+\.[a-zA-Z]{2,}$/.test(agencyForm.email)) {
      showSnackbar('Please enter a valid email address', 'error');
      return;
    }
    
    if (agencyForm.startDate && agencyForm.endDate && new Date(agencyForm.startDate) > new Date(agencyForm.endDate)) {
      showSnackbar('Start date cannot be later than end date', 'error');
      return;
    }

    // Handle avatar - either uploaded file or generated from name
    let avatarUrl = '';
    if (previewUrl) {
      avatarUrl = previewUrl; // In a real app, this would be the uploaded image URL
    } else {
      avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(agencyForm.name || 'Agency')}&background=random`;
    }

    if (isEditModalOpen && agencyForm.id) {
      // Update existing agency
      const updatedAgencies = project.agencies?.map(agency => 
        agency.id === agencyForm.id 
          ? { 
              ...agency,
              ...agencyForm,
              avatar: avatarUrl,
              materialCategories: agencyForm.materialCategories,
              deliveryAreas: agencyForm.deliveryAreas,
              preferredDeliveryMethods: agencyForm.preferredDeliveryMethods,
              licenseNumber: agencyForm.licenseNumber,
              taxId: agencyForm.taxId,
              paymentTerms: agencyForm.paymentTerms,
              deliveryLeadTime: agencyForm.deliveryLeadTime
            } 
          : agency
      ) || [];
      
      onProjectUpdate({
        ...project,
        agencies: updatedAgencies
      });
    } else {
      // Add new agency
      const newAgency: Agency = {
        id: `agency-${Date.now()}`,
        name: agencyForm.name!,
        trade: agencyForm.trade!,
        contactPerson: agencyForm.contactPerson || '',
        phone: agencyForm.phone || '',
        email: agencyForm.email || '',
        address: agencyForm.address || '',
        status: agencyForm.status || 'Active',
        type: agencyForm.type || 'agency',
        contractValue: agencyForm.contractValue || 0,
        startDate: agencyForm.startDate || '',
        endDate: agencyForm.endDate || '',
        avatar: avatarUrl,
        materialCategories: agencyForm.materialCategories,
        deliveryAreas: agencyForm.deliveryAreas,
        preferredDeliveryMethods: agencyForm.preferredDeliveryMethods,
        licenseNumber: agencyForm.licenseNumber,
        taxId: agencyForm.taxId,
        paymentTerms: agencyForm.paymentTerms,
        deliveryLeadTime: agencyForm.deliveryLeadTime
      };
      
      onProjectUpdate({
        ...project,
        agencies: [...(project.agencies || []), newAgency]
      });
    }
    
    setIsAgencyModalOpen(false);
    setIsEditModalOpen(false);
    setAgencyForm({
      name: '',
      trade: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      status: 'Active',
      type: 'agency',
      contractValue: 0,
      startDate: '',
      endDate: '',
      materialCategories: [],
      deliveryAreas: [],
      preferredDeliveryMethods: [],
      licenseNumber: '',
      taxId: '',
      paymentTerms: '',
      deliveryLeadTime: 7,
      avatar: ''
    });
    setPreviewUrl(null);
  };

  const handleSavePayment = () => {
    // Validation
    if (!paymentForm.agencyId) {
      showSnackbar('Please select a vendor / agency', 'error');
      return;
    }
    
    if (!paymentForm.amount || isNaN(Number(paymentForm.amount)) || Number(paymentForm.amount) <= 0) {
      showSnackbar('Please enter a valid positive amount', 'error');
      return;
    }
    
    if (!paymentForm.reference?.trim()) {
      showSnackbar('Please enter a reference number', 'error');
      return;
    }
    
    if (!paymentForm.date) {
      showSnackbar('Please select a payment date', 'error');
      return;
    }

    const newPayment: AgencyPayment = {
      id: `pay-${Date.now()}`,
      agencyId: paymentForm.agencyId,
      date: paymentForm.date,
      amount: Number(paymentForm.amount),
      reference: paymentForm.reference,
      type: paymentForm.type || 'Bill Payment',
      description: paymentForm.description || '',
      status: 'Confirmed'
    };

    onProjectUpdate({
      ...project,
      agencyPayments: [...(project.agencyPayments || []), newPayment]
    });
    
    setIsPaymentModalOpen(false);
    setPaymentForm({
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      reference: '',
      type: 'Bill Payment',
      description: '',
      agencyId: selectedAgencyId || ''
    });
  };

  const handleOpenPaymentModal = () => {
    setPaymentForm({
      ...paymentForm,
      agencyId: selectedAgencyId || '',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      reference: '',
      type: 'Bill Payment',
      description: ''
    });
    setIsPaymentModalOpen(true);
  };

  return (
    <div className="animate-in fade-in duration-500 p-4">
      <div className="flex justify-between mb-4 items-center">
        <div>
          <p className="text-xs font-bold text-primary tracking-widest uppercase">AGENCY MANAGEMENT</p>
          <h1 className="text-2xl font-black text-foreground">Agency & Vendor Hub</h1>
          <p className="text-sm text-muted-foreground">Manage agencies, subcontractors, and vendor relationships</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddAgency}>
            <Plus className="mr-2 h-4 w-4" /> Add Agency
          </Button>
        </div>
      </div>

      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="vendors">
              <Briefcase className="mr-2 h-4 w-4" /> Vendors
            </TabsTrigger>
            <TabsTrigger value="payments">
              <CreditCard className="mr-2 h-4 w-4" /> Payments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vendors" className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agencies.concat(subcontractors).map(agency => (
                <Card key={agency.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar>
                        <AvatarImage src={agency.avatar} />
                        <AvatarFallback>{agency.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{agency.name}</h3>
                        <p className="text-sm text-muted-foreground">{agency.trade}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Status:</span>
                        <Badge variant={agency.status === 'Active' ? 'default' : 'secondary'}>{agency.status}</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Type:</span>
                        <span>{agency.type}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Contact:</span>
                        <span>{agency.contactPerson}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      {canEdit && (
                        <Button variant="outline" size="sm" onClick={() => handleEditAgency(agency)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => setSelectedAgencyId(agency.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canDelete && (
                        <Button variant="outline" size="sm" onClick={() => handleDeleteAgency(agency.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="payments" className="p-4">
            <div className="flex justify-between mb-4 items-center">
              <h2 className="text-xl font-bold">Agency Payments</h2>
              <Button onClick={handleOpenPaymentModal}>
                <Plus className="mr-2 h-4 w-4" /> Add Payment
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agency</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agencyPayments.map(payment => (
                  <TableRow key={payment.id}>
                    <TableCell>{agencies.concat(subcontractors).find(a => a.id === payment.agencyId)?.name || 'Unknown'}</TableCell>
                    <TableCell>{payment.date}</TableCell>
                    <TableCell>{payment.reference}</TableCell>
                    <TableCell>{payment.type}</TableCell>
                    <TableCell className="text-right">{formatCurrency(payment.amount, settings)}</TableCell>
                    <TableCell>
                      <Badge variant={payment.status === 'Confirmed' ? 'default' : 'secondary'}>{payment.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Agency Modal */}
      <Dialog open={isAgencyModalOpen} onOpenChange={setIsAgencyModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Agency</DialogTitle>
            <DialogDescription>Enter the details for the new agency.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" value={agencyForm.name} onChange={e => setAgencyForm({...agencyForm, name: e.target.value})} placeholder="e.g. Acme Corp" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="trade" className="text-right">Trade</Label>
              <Input id="trade" value={agencyForm.trade} onChange={e => setAgencyForm({...agencyForm, trade: e.target.value})} placeholder="e.g. Supplier, Subcontractor" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contact" className="text-right">Contact</Label>
              <Input id="contact" value={agencyForm.contactPerson} onChange={e => setAgencyForm({...agencyForm, contactPerson: e.target.value})} placeholder="e.g. John Doe" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">Phone</Label>
              <Input id="phone" value={agencyForm.phone} onChange={e => setAgencyForm({...agencyForm, phone: e.target.value})} placeholder="e.g. +977 9800000000" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <Input id="email" value={agencyForm.email} onChange={e => setAgencyForm({...agencyForm, email: e.target.value})} placeholder="e.g. info@acme.com" className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAgencyModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAgency}>Save Agency</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Agency Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Agency</DialogTitle>
            <DialogDescription>Update the agency details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">Name</Label>
              <Input id="edit-name" value={agencyForm.name} onChange={e => setAgencyForm({...agencyForm, name: e.target.value})} placeholder="e.g. Acme Corp" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-trade" className="text-right">Trade</Label>
              <Input id="edit-trade" value={agencyForm.trade} onChange={e => setAgencyForm({...agencyForm, trade: e.target.value})} placeholder="e.g. Supplier, Subcontractor" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-contact" className="text-right">Contact</Label>
              <Input id="edit-contact" value={agencyForm.contactPerson} onChange={e => setAgencyForm({...agencyForm, contactPerson: e.target.value})} placeholder="e.g. John Doe" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-phone" className="text-right">Phone</Label>
              <Input id="edit-phone" value={agencyForm.phone} onChange={e => setAgencyForm({...agencyForm, phone: e.target.value})} placeholder="e.g. +977 9800000000" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-email" className="text-right">Email</Label>
              <Input id="edit-email" value={agencyForm.email} onChange={e => setAgencyForm({...agencyForm, email: e.target.value})} placeholder="e.g. info@acme.com" className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAgency}>Update Agency</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
            <DialogDescription>Record a payment to a vendor or agency.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment-agency" className="text-right">Vendor/Agency</Label>
              <Select value={paymentForm.agencyId} onValueChange={(value) => setPaymentForm({...paymentForm, agencyId: value})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select Vendor/Agency" />
                </SelectTrigger>
                <SelectContent>
                  {agencies.concat(subcontractors).map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name} ({a.trade})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment-date" className="text-right">Date</Label>
              <Input id="payment-date" type="date" value={paymentForm.date} onChange={e => setPaymentForm({...paymentForm, date: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment-amount" className="text-right">Amount</Label>
              <Input id="payment-amount" type="number" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: Number(e.target.value)})} placeholder="0.00" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment-reference" className="text-right">Reference</Label>
              <Input id="payment-reference" value={paymentForm.reference} onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})} placeholder="e.g. V-2024-001" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment-type" className="text-right">Type</Label>
              <Select value={paymentForm.type} onValueChange={(value) => setPaymentForm({...paymentForm, type: value as any})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Advance">Advance</SelectItem>
                  <SelectItem value="Bill Payment">Bill Payment</SelectItem>
                  <SelectItem value="Retention">Retention</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePayment}>Save Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgencyModule;

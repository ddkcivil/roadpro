
import React, { useState, useEffect, useMemo } from 'react';
import { Project, UserRole, Agency, AgencyPayment, AgencyRateEntry, BOQItem, AgencyMaterial, AgencyBill, AgencyBillItem, AppSettings } from '../../types';
import { 
  Briefcase, FileText, Calendar, MapPin, TrendingUp, Clock, Activity, 
  Plus, Save, X, Edit, Trash2, CheckCircle2, Calculator, Package,
  DollarSign, Navigation, Eye, Upload, Search, Users, CreditCard
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatting/exportUtils';
import { getCurrencySymbol } from '../../utils/formatting/currencyUtils';

import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Textarea } from '~/components/ui/textarea';
import { cn } from '~/lib/utils';
import { useToast } from '~/components/ui/use-toast';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';


// NOTE: This is a refactored version of the AgencyModule component.
// The original logic has been temporarily removed to facilitate the UI migration.
// It will be re-implemented in subsequent steps.

interface Props {
  project: Project;
  userRole: UserRole;
  settings: AppSettings;
  onProjectUpdate: (project: Project) => void;
}

const AgencyModule: React.FC<Props> = ({ project, onProjectUpdate, userRole, settings }) => {
  const [activeTab, setActiveTab] = useState("vendors");
  const [isAgencyModalOpen, setIsAgencyModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

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

  const [rateForm, setRateForm] = useState<Partial<AgencyRateEntry>>({
    materialId: '',
    rate: 0,
    effectiveDate: new Date().toISOString().split('T')[0],
    status: 'Active',
    description: ''
  });

  const [materialForm, setMaterialForm] = useState<Partial<AgencyMaterial>>({
    materialName: '',
    quantity: 1,
    unit: '',
    rate: 0,
    receivedDate: new Date().toISOString().split('T')[0],
    status: 'Ordered',
    remarks: '',
    orderedDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    deliveryLocation: '',
    transportMode: '',
    deliveryCharges: 0,
    taxAmount: 0
  });

  const [billForm, setBillForm] = useState<Partial<AgencyBill>>({
    billNumber: '',
    date: new Date().toISOString().split('T')[0],
    periodFrom: new Date().toISOString().split('T')[0],
    periodTo: new Date().toISOString().split('T')[0],
    items: [],
    grossAmount: 0,
    netAmount: 0,
    status: 'Draft',
    description: ''
  });

  const selectedAgency = agencies.concat(subcontractors).find(a => a.id === selectedAgencyId);
  const selectedAgencyRates = selectedAgency?.rates || [];
  const selectedAgencyMaterials = project.agencyMaterials?.filter(m => m.agencyId === selectedAgencyId) || [];
  const selectedAgencyBills = project.agencyBills?.filter(b => b.agencyId === selectedAgencyId) || [];

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
    setAvatarFile(null);
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

  const canDelete = userRole === UserRole.ADMIN || userRole === UserRole.PROJECT_MANAGER;
  
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
    if (!agencyForm.name?.trim()) {
      showSnackbar('Agency name is required', 'error');
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
    setAvatarFile(null);
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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveRate = () => {
    if (!selectedAgencyId) {
      showSnackbar('Please select a vendor first', 'error');
      return;
    }
    
    if (!rateForm.materialId) {
      showSnackbar('Please select a material', 'error');
      return;
    }
    
    if (rateForm.rate === undefined || rateForm.rate < 0) {
      showSnackbar('Please enter a valid rate', 'error');
      return;
    }
    
    if (!rateForm.effectiveDate) {
      showSnackbar('Please select an effective date', 'error');
      return;
    }
    
    const newRate: AgencyRateEntry = {
      id: `rate-${Date.now()}`,
      agencyId: selectedAgencyId,
      materialId: rateForm.materialId!,
      rate: rateForm.rate,
      effectiveDate: rateForm.effectiveDate,
      expiryDate: rateForm.expiryDate,
      description: rateForm.description,
      status: rateForm.status || 'Active'
    };
    
    const updatedAgencies = project.agencies?.map(agency => {
      if (agency.id === selectedAgencyId) {
        const updatedRates = [...(agency.rates || []), newRate];
        return { ...agency, rates: updatedRates };
      }
      return agency;
    }) || [];
    
    onProjectUpdate({
      ...project,
      agencies: updatedAgencies
    });
    
    setIsRatesModalOpen(false);
    setRateForm({
      materialId: '',
      rate: 0,
      effectiveDate: new Date().toISOString().split('T')[0],
      status: 'Active',
      description: ''
    });
    showSnackbar('Rate saved successfully', 'success');
  };

  const handleSaveMaterial = () => {
    if (!selectedAgencyId) {
      showSnackbar('Please select a vendor first', 'error');
      return;
    }
    
    if (!materialForm.materialName?.trim()) {
      showSnackbar('Please enter material name', 'error');
      return;
    }
    
    if (materialForm.quantity === undefined || materialForm.quantity <= 0) {
      showSnackbar('Please enter a valid quantity', 'error');
      return;
    }
    
    if (materialForm.rate === undefined || materialForm.rate < 0) {
      showSnackbar('Please enter a valid rate', 'error');
      return;
    }
    
    if (!materialForm.unit?.trim()) {
      showSnackbar('Please enter unit', 'error');
      return;
    }
    
    const subtotal = materialForm.quantity * materialForm.rate;
    const taxAmount = materialForm.taxAmount || 0;
    const deliveryCharges = materialForm.deliveryCharges || 0;
    const totalAmount = subtotal + taxAmount + deliveryCharges;
    
    const newMaterial: AgencyMaterial = {
      id: `mat-${Date.now()}`,
      name: materialForm.materialName || '', // Required by BaseResource
      description: materialForm.remarks || '', // Map remarks to description
      category: '', // Could be enhanced to use material categories
      unit: materialForm.unit || 'unit', // Required by BaseResource
      quantity: materialForm.quantity || 0, // Required by BaseResource
      location: materialForm.deliveryLocation || 'Vendor', // Required by BaseResource
      status: materialForm.status || 'Ordered', // Required by BaseResource
      lastUpdated: new Date().toISOString().split('T')[0], // Required by BaseResource
      agencyId: selectedAgencyId,
      materialName: materialForm.materialName,
      rate: materialForm.rate,
      totalAmount: totalAmount,
      receivedDate: materialForm.receivedDate || new Date().toISOString().split('T')[0],
      invoiceNumber: materialForm.invoiceNumber,
      remarks: materialForm.remarks,
      orderedDate: materialForm.orderedDate,
      expectedDeliveryDate: materialForm.expectedDeliveryDate,
      deliveryLocation: materialForm.deliveryLocation,
      transportMode: materialForm.transportMode,
      deliveryCharges: deliveryCharges,
      taxAmount: taxAmount,
      batchNumber: materialForm.batchNumber,
      expiryDate: materialForm.expiryDate,
      qualityCertification: materialForm.qualityCertification,
      supplierInvoiceRef: materialForm.supplierInvoiceRef
    };
    
    onProjectUpdate({
      ...project,
      agencyMaterials: [...(project.agencyMaterials || []), newMaterial]
    });
    
    setIsMaterialModalOpen(false);
    setMaterialForm({
      materialName: '',
      quantity: 1,
      unit: '',
      rate: 0,
      receivedDate: new Date().toISOString().split('T')[0],
      status: 'Ordered',
      remarks: '',
      orderedDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      deliveryLocation: '',
      transportMode: '',
      deliveryCharges: 0,
      taxAmount: 0
    });
    showSnackbar('Material saved successfully', 'success');
  };

  const handleSaveBill = () => {
    if (!selectedAgencyId) {
      showSnackbar('Please select a vendor first', 'error');
      return;
    }
    
    if (!billForm.billNumber?.trim()) {
      showSnackbar('Please enter bill number', 'error');
      return;
    }
    
    if (!billForm.date) {
      showSnackbar('Please select bill date', 'error');
      return;
    }
    
    if (billForm.grossAmount === undefined || billForm.grossAmount < 0) {
      showSnackbar('Gross amount cannot be negative', 'error');
      return;
    }
    
    if (billForm.netAmount === undefined || billForm.netAmount < 0) {
      showSnackbar('Net amount cannot be negative', 'error');
      return;
    }
    
    const newBill: AgencyBill = {
      id: `bill-${Date.now()}`,
      agencyId: selectedAgencyId,
      billNumber: billForm.billNumber,
      date: billForm.date,
      periodFrom: billForm.periodFrom || billForm.date,
      periodTo: billForm.periodTo || billForm.date,
      items: billForm.items || [],
      grossAmount: billForm.grossAmount,
      taxAmount: billForm.taxAmount,
      netAmount: billForm.netAmount,
      status: billForm.status || 'Draft',
      description: billForm.description
    };
    
    onProjectUpdate({
      ...project,
      agencyBills: [...(project.agencyBills || []), newBill]
    });
    
    setIsBillModalOpen(false);
    setBillForm({
      billNumber: '',
      date: new Date().toISOString().split('T')[0],
      periodFrom: new Date().toISOString().split('T')[0],
      periodTo: new Date().toISOString().split('T')[0],
      items: [],
      grossAmount: 0,
      netAmount: 0,
      status: 'Draft',
      description: ''
    });
    showSnackbar('Bill saved successfully', 'success');
  };

  const calculateAgencySummary = (agencyId: string) => {
    const agencyPaymentsForAgency = agencyPayments.filter(p => p.agencyId === agencyId);
    const totalPaid = agencyPaymentsForAgency.reduce((sum, p) => sum + p.amount, 0);
    const pendingPayments = agencyPaymentsForAgency.filter(p => p.status === 'Draft').reduce((sum, p) => sum + p.amount, 0);

    // Calculate amounts based on rates for this agency
    const agency = agencies.concat(subcontractors).find(a => a.id === agencyId);
    const agencyRates = agency?.rates || [];

    // Calculate total contract value based on rates
    const totalContractValue = agencyRates.reduce((sum, rate) => {
      const boqItem = project.boq.find(b => b.id === rate.materialId);
      if (boqItem) {
        // Using the rate from the agency's specific rate entry
        return sum + (boqItem.quantity * rate.rate);
      }
      return sum;
    }, 0);

    return {
      totalPaid,
      pendingPayments,
      netAmount: totalPaid - pendingPayments,
      totalContractValueBasedOnRates: totalContractValue
    };
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
                      <Button variant="outline" size="sm" onClick={() => handleEditAgency(agency)}>
                        <Edit className="h-4 w-4" />
                      </Button>
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
              <Input id="name" value={agencyForm.name} onChange={e => setAgencyForm({...agencyForm, name: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="trade" className="text-right">Trade</Label>
              <Input id="trade" value={agencyForm.trade} onChange={e => setAgencyForm({...agencyForm, trade: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contact" className="text-right">Contact</Label>
              <Input id="contact" value={agencyForm.contactPerson} onChange={e => setAgencyForm({...agencyForm, contactPerson: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">Phone</Label>
              <Input id="phone" value={agencyForm.phone} onChange={e => setAgencyForm({...agencyForm, phone: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <Input id="email" value={agencyForm.email} onChange={e => setAgencyForm({...agencyForm, email: e.target.value})} className="col-span-3" />
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
              <Input id="edit-name" value={agencyForm.name} onChange={e => setAgencyForm({...agencyForm, name: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-trade" className="text-right">Trade</Label>
              <Input id="edit-trade" value={agencyForm.trade} onChange={e => setAgencyForm({...agencyForm, trade: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-contact" className="text-right">Contact</Label>
              <Input id="edit-contact" value={agencyForm.contactPerson} onChange={e => setAgencyForm({...agencyForm, contactPerson: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-phone" className="text-right">Phone</Label>
              <Input id="edit-phone" value={agencyForm.phone} onChange={e => setAgencyForm({...agencyForm, phone: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-email" className="text-right">Email</Label>
              <Input id="edit-email" value={agencyForm.email} onChange={e => setAgencyForm({...agencyForm, email: e.target.value})} className="col-span-3" />
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
              <Input id="payment-amount" type="number" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: Number(e.target.value)})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment-reference" className="text-right">Reference</Label>
              <Input id="payment-reference" value={paymentForm.reference} onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})} className="col-span-3" />
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

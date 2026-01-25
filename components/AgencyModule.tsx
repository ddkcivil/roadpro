import React, { useState, useEffect } from 'react';
import { Project, UserRole, Agency, AgencyPayment, AgencyRateEntry, BOQItem, AgencyMaterial, AgencyBill, AgencyBillItem, AppSettings } from '../types';
import { 
  Box, Typography, Button, Card, Grid, 
  Avatar, Chip, Stack, Paper, 
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Divider,
  LinearProgress, Table, TableHead, TableRow, TableCell, TableBody,
  InputAdornment, Tabs, Tab, Alert, IconButton, List, ListItem, ListItemText,
  Snackbar, Tooltip
} from '@mui/material';
import { 
  Briefcase, FileText, Calendar, MapPin, TrendingUp, Clock, Activity, 
  Plus, Save, X, Edit, Trash2, CheckCircle2, Calculator, Package,
  DollarSign, Navigation, Eye, Upload
} from 'lucide-react';
import { formatCurrency } from '../utils/exportUtils';
import { getCurrencySymbol } from '../utils/currencyUtils';

interface Props {
  project: Project;
  userRole: UserRole;
  settings: AppSettings;
  onProjectUpdate: (project: Project) => void;
}

const AgencyModule: React.FC<Props> = ({ project, onProjectUpdate, userRole }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [isAgencyModalOpen, setIsAgencyModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const agencies = project.agencies?.filter(a => a.type === 'agency') || [];
  const agencyPayments = (project.agencyPayments || []).filter(p => p.agencyId && agencies.some(a => a.id === p.agencyId));
  
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
    deliveryLeadTime: 7
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

  const selectedAgency = agencies.find(a => a.id === selectedAgencyId);
  const selectedAgencyRates = selectedAgency?.rates || [];
  const selectedAgencyMaterials = project.agencyMaterials?.filter(m => m.agencyId === selectedAgencyId) || [];
  const selectedAgencyBills = project.agencyBills?.filter(b => b.agencyId === selectedAgencyId) || [];

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
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
      endDate: ''
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
      deliveryLeadTime: 7
    });
    setAvatarFile(null);
    setPreviewUrl(null);
  };

  const handleSavePayment = () => {
    // Validation
    if (!selectedAgencyId) {
      showSnackbar('Please select an agency first', 'error');
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
      agencyId: selectedAgencyId,
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
      description: ''
    });
  };

  const handleOpenPaymentModal = () => {
    if (!selectedAgencyId) {
      showSnackbar('Please select an agency first', 'error');
      return;
    }
    setPaymentForm({
      ...paymentForm,
      agencyId: selectedAgencyId
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
    const agency = agencies.find(a => a.id === agencyId);
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
    <Box className="animate-in fade-in duration-500">
      <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
        <Box>
          <Typography variant="h4" fontWeight="800" gutterBottom color="primary">Vendor Management</Typography>
          <Typography variant="body1" color="text.secondary">Manage vendors, track materials, and handle payments</Typography>
        </Box>
        <Button variant="contained" startIcon={<Plus size={18}/>} onClick={handleAddAgency} sx={{ paddingX: 2, paddingY: 1, fontSize: 16, fontWeight: 600, boxShadow: 2, '&:hover': { boxShadow: 3 } }}>Add Vendor</Button>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden', mb: 3, boxShadow: 1, '&:hover': { boxShadow: 2 } }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ bgcolor: 'primary.light/20', borderBottom: 1, borderColor: 'divider', minHeight: 50 }}>
          <Tab label="Vendors" icon={<Briefcase size={20}/>} iconPosition="start" sx={{ minHeight: 50, textTransform: 'none', fontWeight: 600, fontSize: 14 }} />
          <Tab label="Rates" icon={<Calculator size={20}/>} iconPosition="start" sx={{ minHeight: 50, textTransform: 'none', fontWeight: 600, fontSize: 14 }} />

          <Tab label="Logistics" icon={<Navigation size={20}/>} iconPosition="start" sx={{ minHeight: 50, textTransform: 'none', fontWeight: 600, fontSize: 14 }} />
          <Tab label="Bills" icon={<FileText size={20}/>} iconPosition="start" sx={{ minHeight: 50, textTransform: 'none', fontWeight: 600, fontSize: 14 }} />
          <Tab label="Payments" icon={<DollarSign size={20}/>} iconPosition="start" sx={{ minHeight: 50, textTransform: 'none', fontWeight: 600, fontSize: 14 }} />
        </Tabs>

        <Box p={2}>
          {activeTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Stack spacing={2}>
                  {agencies.map(agency => (
                    <Card 
                      key={agency.id} 
                      variant="outlined"
                      onClick={() => setSelectedAgencyId(agency.id)} 
                      sx={{ 
                        cursor: 'pointer', borderRadius: 3, transition: 'all 0.2s',
                        bgcolor: selectedAgencyId === agency.id ? 'primary.light/20' : 'white',
                        borderColor: selectedAgencyId === agency.id ? 'primary.main' : 'divider',
                        boxShadow: selectedAgencyId === agency.id ? 3 : 1,
                        '&:hover': { boxShadow: 3 }
                      }}
                    >
                      <Box p={2.5} display="flex" alignItems="center" gap={2}>
                        <Avatar 
                          src={agency.avatar} 
                          sx={{ width: 48, height: 48, bgcolor: 'primary.main', color: 'white', fontWeight: 'bold' }}
                        >
                          {agency.name.charAt(0)}
                        </Avatar>
                        <Box flex={1}>
                          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>{agency.name}</Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>{agency.trade}</Typography>
                          <Box mt={0.5}>
                            <Chip 
                              label={agency.status} 
                              size="small" 
                              sx={{ 
                                fontSize: 11, 
                                height: 22,
                                borderRadius: 2,
                                bgcolor: agency.status === 'Active' ? 'success.light' : 
                                         agency.status === 'Suspended' ? 'error.light' : 'warning.light',
                                color: agency.status === 'Active' ? 'success.dark' : 
                                       agency.status === 'Suspended' ? 'error.dark' : 'warning.dark'
                              }} 
                            />
                          </Box>
                        </Box>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleEditAgency(agency); }} sx={{ bgcolor: 'grey.100', '&:hover': { bgcolor: 'primary.light' } }}>
                            <Edit size={16} />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDeleteAgency(agency.id); }} sx={{ bgcolor: 'grey.100', '&:hover': { bgcolor: 'error.light' } }}>
                            <Trash2 size={16} />
                          </IconButton>
                        </Stack>
                      </Box>
                    </Card>
                  ))}
                  
                  {agencies.length === 0 && (
                    <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 4, borderStyle: 'dashed', borderColor: 'primary.light' }}>
                      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" gap={2}>
                        <Briefcase size={64} className="text-primary/30" />
                        <Typography variant="h6" fontWeight="bold" color="text.primary">No Vendors Registered</Typography>
                        <Typography variant="body1" color="text.secondary" mb={2}>Get started by adding your first vendor</Typography>
                        <Button variant="contained" startIcon={<Plus size={16}/>} onClick={handleAddAgency} sx={{ mt: 1 }}>Add Your First Vendor</Button>
                      </Box>
                    </Paper>
                  )}
                </Stack>
              </Grid>

              <Grid item xs={12} md={8}>
                {selectedAgency ? (
                  <Stack spacing={3}>
                    <Paper variant="outlined" sx={{ p: 4, borderRadius: 4, bgcolor: 'grey.50', border: '1px solid', borderColor: 'primary.light/30' }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                        <Box display="flex" alignItems="center" gap={3}>
                          <Avatar 
                            src={selectedAgency.avatar} 
                            sx={{ width: 72, height: 72, bgcolor: 'primary.main', color: 'white', fontWeight: 'bold', fontSize: '1.2rem' }}
                          >
                            {selectedAgency.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="h5" fontWeight="800" color="text.primary">{selectedAgency.name}</Typography>
                            <Typography variant="h6" color="primary" gutterBottom>{selectedAgency.trade}</Typography>
                            <Chip 
                              label={selectedAgency.status} 
                              size="small" 
                              sx={{ 
                                fontSize: 12, 
                                height: 24,
                                borderRadius: 4,
                                bgcolor: selectedAgency.status === 'Active' ? 'success.light' : 
                                         selectedAgency.status === 'Suspended' ? 'error.light' : 'warning.light',
                                color: selectedAgency.status === 'Active' ? 'success.dark' : 
                                       selectedAgency.status === 'Suspended' ? 'error.dark' : 'warning.dark'
                              }} 
                            />
                          </Box>
                        </Box>
                        <Button variant="contained" startIcon={<DollarSign size={18}/>} size="large" onClick={handleOpenPaymentModal} sx={{ py: 1, px: 3, fontSize: 14, fontWeight: 600 }}>Record Payment</Button>
                      </Box>
                      
                      <Grid container spacing={3} mb={4}>
                        <Grid item xs={6} md={3}>
                          <Paper variant="outlined" sx={{ textAlign: 'center', py: 3, px: 2, borderRadius: 3, bgcolor: 'white', border: '1px solid', borderColor: 'primary.light/40' }}>
                            <FileText size={24} className="mb-2 text-primary" />
                            <Typography variant="h6" fontWeight="bold" gutterBottom>
                              {formatCurrency(calculateAgencySummary(selectedAgency.id).totalContractValueBasedOnRates, project.settings)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Contract Value</Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Paper variant="outlined" sx={{ textAlign: 'center', py: 3, px: 2, borderRadius: 3, bgcolor: 'white', border: '1px solid', borderColor: 'primary.light/40' }}>
                            <TrendingUp size={24} className="mb-2 text-success" />
                            <Typography variant="h6" fontWeight="bold" gutterBottom>
                              {formatCurrency(calculateAgencySummary(selectedAgency.id).totalPaid, project.settings)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Total Paid</Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Paper variant="outlined" sx={{ textAlign: 'center', py: 3, px: 2, borderRadius: 3, bgcolor: 'white', border: '1px solid', borderColor: 'primary.light/40' }}>
                            <DollarSign size={24} className="mb-2 text-warning" />
                            <Typography variant="h6" fontWeight="bold" gutterBottom>
                              {formatCurrency(calculateAgencySummary(selectedAgency.id).pendingPayments, project.settings)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Pending</Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Paper variant="outlined" sx={{ textAlign: 'center', py: 3, px: 2, borderRadius: 3, bgcolor: 'white', border: '1px solid', borderColor: 'primary.light/40' }}>
                            <Activity size={24} className="mb-2 text-info" />
                            <Typography variant="h6" fontWeight="bold" gutterBottom>
                              {selectedAgency.status}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Status</Typography>
                          </Paper>
                        </Grid>
                      </Grid>

                      <Typography variant="subtitle2" fontWeight="bold" mb={2}>Contact Information</Typography>
                      <Grid container spacing={2} mb={3}>
                        <Grid item xs={12} md={6}>
                          <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={0.5}>Contact Person</Typography>
                            <Typography variant="body2">{selectedAgency.contactPerson || 'N/A'}</Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={0.5}>Phone</Typography>
                            <Typography variant="body2">{selectedAgency.phone || 'N/A'}</Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={0.5}>Email</Typography>
                            <Typography variant="body2">{selectedAgency.email || 'N/A'}</Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={0.5}>Address</Typography>
                            <Typography variant="body2">{selectedAgency.address || 'N/A'}</Typography>
                          </Paper>
                        </Grid>
                      </Grid>

                      <Typography variant="subtitle2" fontWeight="bold" mb={2}>Contract Details</Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={0.5}>Start Date</Typography>
                            <Typography variant="body2">{selectedAgency.startDate || 'N/A'}</Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={0.5}>End Date</Typography>
                            <Typography variant="body2">{selectedAgency.endDate || 'N/A'}</Typography>
                          </Paper>
                        </Grid>
                      </Grid>

                      {selectedAgency.type === 'subcontractor' ? (
                        // Show structural assets information for subcontractors
                        (selectedAgency.assignedWorks || selectedAgency.assetCategories || selectedAgency.certification) && (
                          <>
                            <Typography variant="subtitle2" fontWeight="bold" mb={2} color="primary">Structural Assets & Works</Typography>
                            <Grid container spacing={2} mb={3}>
                              {selectedAgency.assignedWorks && selectedAgency.assignedWorks.length > 0 && (
                                <Grid item xs={12} md={6}>
                                  <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={0.5}>Assigned Works</Typography>
                                    <Typography variant="body2">{selectedAgency.assignedWorks.join(', ')}</Typography>
                                  </Paper>
                                </Grid>
                              )}
                              {selectedAgency.assetCategories && selectedAgency.assetCategories.length > 0 && (
                                <Grid item xs={12} md={6}>
                                  <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={0.5}>Asset Categories</Typography>
                                    <Typography variant="body2">{selectedAgency.assetCategories.join(', ')}</Typography>
                                  </Paper>
                                </Grid>
                              )}
                              {selectedAgency.certification && selectedAgency.certification.length > 0 && (
                                <Grid item xs={12}>
                                  <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={0.5}>Certifications</Typography>
                                    <Typography variant="body2">{selectedAgency.certification.join(', ')}</Typography>
                                  </Paper>
                                </Grid>
                              )}
                            </Grid>
                          </>
                        )
                      ) : (
                        // Show logistics information for agencies/vendors
                        (selectedAgency.materialCategories || selectedAgency.deliveryAreas || selectedAgency.preferredDeliveryMethods || selectedAgency.licenseNumber || selectedAgency.taxId || selectedAgency.paymentTerms || selectedAgency.deliveryLeadTime) && (
                          <>
                            <Typography variant="subtitle2" fontWeight="bold" mb={2} color="primary">Logistics & Material Supply</Typography>
                            <Grid container spacing={2} mb={3}>
                              {selectedAgency.materialCategories && selectedAgency.materialCategories.length > 0 && (
                                <Grid item xs={12} md={6}>
                                  <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={0.5}>Material Categories</Typography>
                                    <Typography variant="body2">{selectedAgency.materialCategories.join(', ')}</Typography>
                                  </Paper>
                                </Grid>
                              )}
                              {selectedAgency.deliveryAreas && selectedAgency.deliveryAreas.length > 0 && (
                                <Grid item xs={12} md={6}>
                                  <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={0.5}>Delivery Areas</Typography>
                                    <Typography variant="body2">{selectedAgency.deliveryAreas.join(', ')}</Typography>
                                  </Paper>
                                </Grid>
                              )}
                              {selectedAgency.preferredDeliveryMethods && selectedAgency.preferredDeliveryMethods.length > 0 && (
                                <Grid item xs={12} md={6}>
                                  <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={0.5}>Preferred Delivery Methods</Typography>
                                    <Typography variant="body2">{selectedAgency.preferredDeliveryMethods.join(', ')}</Typography>
                                  </Paper>
                                </Grid>
                              )}
                              {selectedAgency.deliveryLeadTime !== undefined && (
                                <Grid item xs={12} md={6}>
                                  <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={0.5}>Delivery Lead Time</Typography>
                                    <Typography variant="body2">{selectedAgency.deliveryLeadTime} days</Typography>
                                  </Paper>
                                </Grid>
                              )}
                              {selectedAgency.licenseNumber && (
                                <Grid item xs={12} md={6}>
                                  <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={0.5}>License Number</Typography>
                                    <Typography variant="body2">{selectedAgency.licenseNumber}</Typography>
                                  </Paper>
                                </Grid>
                              )}
                              {selectedAgency.taxId && (
                                <Grid item xs={12} md={6}>
                                  <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={0.5}>Tax ID</Typography>
                                    <Typography variant="body2">{selectedAgency.taxId}</Typography>
                                  </Paper>
                                </Grid>
                              )}
                              {selectedAgency.paymentTerms && (
                                <Grid item xs={12}>
                                  <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={0.5}>Payment Terms</Typography>
                                    <Typography variant="body2">{selectedAgency.paymentTerms}</Typography>
                                  </Paper>
                                </Grid>
                              )}
                            </Grid>
                          </>
                        )
                      )}

                    </Paper>
                  </Stack>
                ) : (
                  <Box py={10} textAlign="center" color="text.disabled">
                    <Briefcase size={60} className="opacity-10 mx-auto mb-4"/>
                    <Typography variant="h6">Select an agency to view details</Typography>
                    <Typography variant="body2">Choose from the list to see agency information</Typography>
                  </Box>
                )}
              </Grid>
            </Grid>
          )}

          {activeTab === 1 && (
            <Box>
              <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                <Typography variant="subtitle1" fontWeight="bold">Vendor Rates</Typography>
                <Button 
                  variant="contained" 
                  startIcon={<Plus size={16}/>} 
                  onClick={() => {
                    if (!selectedAgencyId) {
                      showSnackbar('Please select a vendor first', 'error');
                      return;
                    }
                    setRateForm({
                      materialId: '',
                      rate: 0,
                      effectiveDate: new Date().toISOString().split('T')[0],
                      status: 'Active',
                      description: ''
                    });
                    setIsRatesModalOpen(true);
                  }}
                >
                  Add Rate
                </Button>
              </Box>
              
              <Table size="small" sx={{ bgcolor: 'white', borderRadius: 2, overflow: 'hidden' }}>
                <TableHead sx={{ bgcolor: 'primary.main', color: 'white' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Material</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Description</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: 'white' }}>Rate</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Effective Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedAgencyRates.map(rate => {
                    const material = project.agencyMaterials?.find(m => m.id === rate.materialId);
                    return (
                      <TableRow key={rate.id} sx={{ '&:nth-of-type(odd)': { bgcolor: 'grey.50' }, '&:hover': { bgcolor: 'primary.light/20' } }}>
                        <TableCell>{material?.materialName || 'N/A'}</TableCell>
                        <TableCell>{rate.description || 'N/A'}</TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold" color="primary">
                            {formatCurrency(rate.rate, project.settings)}
                          </Typography>
                        </TableCell>
                        <TableCell>{rate.effectiveDate}</TableCell>
                        <TableCell>
                          <Chip 
                            label={rate.status} 
                            size="small" 
                            sx={{ 
                              fontSize: 11, 
                              height: 24,
                              borderRadius: 4,
                              bgcolor: rate.status === 'Active' ? 'success.light' : 
                                       rate.status === 'Expired' ? 'error.light' : 'warning.light',
                              color: rate.status === 'Active' ? 'success.dark' : 
                                     rate.status === 'Expired' ? 'error.dark' : 'warning.dark'
                            }} 
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {selectedAgencyRates.length === 0 && (
                    <TableRow>
                      <TableCell align="center" {...{ colSpan: 5 }} sx={{ py: 6 }}>
                        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" gap={1}>
                          <Calculator size={40} className="text-primary/30" />
                          <Typography variant="body1" color="text.secondary">No rate records found for this vendor</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          )}

          {activeTab === 2 && (
            <Box>
              <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                <Typography variant="subtitle1" fontWeight="bold">Material Tracking</Typography>
                <Button 
                  variant="contained" 
                  startIcon={<Plus size={16}/>} 
                  onClick={() => {
                    if (!selectedAgencyId) {
                      showSnackbar('Please select a vendor first', 'error');
                      return;
                    }
                    setMaterialForm({
                      materialName: '',
                      quantity: 1,
                      unit: '',
                      rate: 0,
                      receivedDate: new Date().toISOString().split('T')[0],
                      status: 'Received',
                      remarks: ''
                    });
                    setIsMaterialModalOpen(true);
                  }}
                >
                  Add Material
                </Button>
              </Box>
              
              <Table size="small" sx={{ bgcolor: 'white', borderRadius: 2, overflow: 'hidden' }}>
                <TableHead sx={{ bgcolor: 'primary.main', color: 'white' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Material</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Quantity</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Unit</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: 'white' }}>Rate</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: 'white' }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Expected Delivery</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Location</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Transport</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedAgencyMaterials.map(material => {
                    return (
                      <TableRow key={material.id} sx={{ '&:nth-of-type(odd)': { bgcolor: 'grey.50' }, '&:hover': { bgcolor: 'primary.light/20' } }}>
                        <TableCell>{material.materialName}</TableCell>
                        <TableCell>{material.quantity}</TableCell>
                        <TableCell>{material.unit}</TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="primary">
                            {formatCurrency(material.rate, project.settings)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold" color="secondary">
                            {formatCurrency(material.totalAmount, project.settings)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={material.status} 
                            size="small" 
                            sx={{ 
                              fontSize: 11, 
                              height: 24,
                              borderRadius: 4,
                              bgcolor: material.status === 'Received' ? 'success.light' : 
                                       material.status === 'Pending' ? 'warning.light' : 
                                       material.status === 'Ordered' ? 'info.light' : 
                                       material.status === 'In Transit' ? 'warning.light' : 'primary.light',
                              color: material.status === 'Received' ? 'success.dark' : 
                                     material.status === 'Pending' ? 'warning.dark' : 
                                     material.status === 'Ordered' ? 'info.dark' : 
                                     material.status === 'In Transit' ? 'warning.dark' : 'primary.dark'
                            }} 
                          />
                        </TableCell>
                        <TableCell>{material.expectedDeliveryDate || 'N/A'}</TableCell>
                        <TableCell>{material.deliveryLocation || 'N/A'}</TableCell>
                        <TableCell>{material.transportMode || 'N/A'}</TableCell>
                      </TableRow>
                    );
                  })}
                  {selectedAgencyMaterials.length === 0 && (
                    <TableRow>
                      <TableCell align="center" {...{ colSpan: 9 }} sx={{ py: 6 }}>
                        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" gap={1}>
                          <Package size={40} className="text-primary/30" />
                          <Typography variant="body1" color="text.secondary">No material records found for this vendor</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          )}

          {activeTab === 3 && (
            <Box>
              <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                <Typography variant="subtitle1" fontWeight="bold">Logistics Tracking</Typography>
                <Button 
                  variant="contained" 
                  startIcon={<Navigation size={16}/>} 
                  onClick={() => {
                    showSnackbar('Logistics dashboard provides comprehensive tracking and reporting', 'info');
                  }}
                  sx={{ py: 0.8, px: 3, fontWeight: 600 }}
                >
                  View Dashboard
                </Button>
              </Box>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 3, bgcolor: 'primary.light/10', borderRadius: 3 }}>
                    <Typography variant="h6" fontWeight="bold" mb={2} color="primary">Delivery Status Overview</Typography>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="body2" color="text.secondary">On Time Deliveries</Typography>
                      <Typography variant="h6" fontWeight="bold" color="success.main">
                        {selectedAgencyMaterials.filter(m => m.status === 'Received' && new Date(m.expectedDeliveryDate || '') >= new Date(m.receivedDate)).length}/
                        {selectedAgencyMaterials.filter(m => m.status === 'Received').length || 1} 
                        ({Math.round((selectedAgencyMaterials.filter(m => m.status === 'Received' && new Date(m.expectedDeliveryDate || '') >= new Date(m.receivedDate)).length / (selectedAgencyMaterials.filter(m => m.status === 'Received').length || 1)) * 100)}%)
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.round((selectedAgencyMaterials.filter(m => m.status === 'Received' && new Date(m.expectedDeliveryDate || '') >= new Date(m.receivedDate)).length / (selectedAgencyMaterials.filter(m => m.status === 'Received').length || 1)) * 100)} 
                      sx={{ height: 8, borderRadius: 4, bgcolor: 'grey.300', mb: 2 }} 
                    />
                    
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">Delayed Deliveries</Typography>
                      <Typography variant="h6" fontWeight="bold" color="error.main">
                        {selectedAgencyMaterials.filter(m => m.status === 'Received' && new Date(m.expectedDeliveryDate || '') < new Date(m.receivedDate)).length}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 3, bgcolor: 'info.light/10', borderRadius: 3 }}>
                    <Typography variant="h6" fontWeight="bold" mb={2} color="primary">Transportation Summary</Typography>
                    <List dense>
                      {Array.from(new Set(selectedAgencyMaterials.map(m => m.transportMode).filter(Boolean))).map(mode => (
                        <ListItem key={mode}>
                          <ListItemText 
                            primary={`${mode}`} 
                            secondary={`${selectedAgencyMaterials.filter(m => m.transportMode === mode).length} shipments`} 
                          />
                          <Typography variant="body2" color="text.secondary">
                            {Math.round((selectedAgencyMaterials.filter(m => m.transportMode === mode).length / selectedAgencyMaterials.length) * 100)}%
                          </Typography>
                        </ListItem>
                      ))}
                      {selectedAgencyMaterials.length === 0 && (
                        <ListItem>
                          <ListItemText primary="No transport data available" />
                        </ListItem>
                      )}
                    </List>
                  </Paper>
                </Grid>
                
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                    <Typography variant="h6" fontWeight="bold" mb={2} color="primary">Delivery Timeline</Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Material</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Ordered</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Expected</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Received</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Transport</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedAgencyMaterials.slice(0, 10).map(material => {
                          const isDelayed = material.status === 'Received' && 
                                          new Date(material.expectedDeliveryDate || '') < new Date(material.receivedDate);
                          return (
                            <TableRow key={material.id}>
                              <TableCell>{material.materialName}</TableCell>
                              <TableCell>{material.orderedDate || 'N/A'}</TableCell>
                              <TableCell>{material.expectedDeliveryDate || 'N/A'}</TableCell>
                              <TableCell>{material.receivedDate}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={material.status} 
                                  size="small" 
                                  sx={{ 
                                    fontSize: 10, 
                                    height: 20,
                                    bgcolor: isDelayed ? 'error.light' : 
                                          material.status === 'Received' ? 'success.light' : 
                                          material.status === 'Pending' ? 'warning.light' : 
                                          material.status === 'Ordered' ? 'info.light' : 'primary.light',
                                    color: isDelayed ? 'error.dark' : 
                                          material.status === 'Received' ? 'success.dark' : 
                                          material.status === 'Pending' ? 'warning.dark' : 
                                          material.status === 'Ordered' ? 'info.dark' : 'primary.dark'
                                  }} 
                                />
                              </TableCell>
                              <TableCell>{material.transportMode || 'N/A'}</TableCell>
                            </TableRow>
                          );
                        })}
                        {selectedAgencyMaterials.length === 0 && (
                          <TableRow>
                            <TableCell align="center" {...{ colSpan: 6 }} sx={{ py: 4 }}>
                              <Typography variant="body1" color="text.secondary">No delivery records to show</Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}

          {activeTab === 4 && (
            <Box>
              <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                <Typography variant="h6" fontWeight="bold" color="primary">Bills</Typography>
                <Button 
                  variant="contained" 
                  startIcon={<Plus size={18}/>} 
                  onClick={() => {
                    if (!selectedAgencyId) {
                      showSnackbar('Please select a vendor first', 'error');
                      return;
                    }
                    setBillForm({
                      billNumber: `AB-${selectedAgencyBills.length + 1}`,
                      date: new Date().toISOString().split('T')[0],
                      periodFrom: new Date().toISOString().split('T')[0],
                      periodTo: new Date().toISOString().split('T')[0],
                      items: [],
                      grossAmount: 0,
                      netAmount: 0,
                      status: 'Draft',
                      description: ''
                    });
                    setIsBillModalOpen(true);
                  }}
                  sx={{ py: 0.8, px: 3, fontWeight: 600 }}
                >
                  Create Bill
                </Button>
              </Box>
              
              <Table size="small" sx={{ bgcolor: 'white', borderRadius: 2, overflow: 'hidden' }}>
                <TableHead sx={{ bgcolor: 'primary.main', color: 'white' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Bill Number</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Date</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: 'white' }}>Gross Amount</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: 'white' }}>Net Amount</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedAgencyBills.map(bill => (
                    <TableRow key={bill.id} sx={{ '&:nth-of-type(odd)': { bgcolor: 'grey.50' }, '&:hover': { bgcolor: 'primary.light/20' } }}>
                      <TableCell>{bill.billNumber}</TableCell>
                      <TableCell>{bill.date}</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold" color="secondary">
                          {formatCurrency(bill.grossAmount, project.settings)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold" color="secondary">
                          {formatCurrency(bill.netAmount, project.settings)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={bill.status} 
                          size="small" 
                          sx={{ 
                            fontSize: 11, 
                            height: 24,
                            borderRadius: 4,
                            bgcolor: bill.status === 'Draft' ? 'info.light' : 
                                     bill.status === 'Submitted' ? 'warning.light' : 
                                     bill.status === 'Approved' ? 'success.light' : 'primary.light',
                            color: bill.status === 'Draft' ? 'info.dark' : 
                                   bill.status === 'Submitted' ? 'warning.dark' : 
                                   bill.status === 'Approved' ? 'success.dark' : 'primary.dark'
                          }} 
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {selectedAgencyBills.length === 0 && (
                    <TableRow>
                      <TableCell align="center" {...{ colSpan: 5 }} sx={{ py: 6 }}>
                        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" gap={1}>
                          <FileText size={40} className="text-primary/30" />
                          <Typography variant="body1" color="text.secondary">No bills found for this vendor</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          )}

          {activeTab === 4 && (
            <Box>
              <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                <Typography variant="subtitle1" fontWeight="bold">Payment Transactions</Typography>
              </Box>
              
              <Table size="small">
                <TableHead sx={{ bgcolor: 'slate.50' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Agency</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Reference</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {agencyPayments.map(payment => {
                    const agency = agencies.find(a => a.id === payment.agencyId);
                    return (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.date}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">{agency?.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{agency?.trade}</Typography>
                        </TableCell>
                        <TableCell>{payment.reference}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">{formatCurrency(payment.amount, project.settings)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={payment.status} 
                            size="small" 
                            sx={{ 
                              fontSize: 10, 
                              height: 18,
                              bgcolor: payment.status === 'Confirmed' ? 'success.light' : 
                                       payment.status === 'Draft' ? 'info.light' : 'warning.light',
                              color: payment.status === 'Confirmed' ? 'success.dark' : 
                                     payment.status === 'Draft' ? 'info.dark' : 'warning.dark'
                            }} 
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {agencyPayments.length === 0 && (
                    <TableRow>
                      <TableCell align="center" {...{ colSpan: 5 }} sx={{ py: 6 }}>
                        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" gap={1}>
                          <DollarSign size={40} className="text-primary/30" />
                          <Typography variant="body1" color="text.secondary">No payment records found</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Add/Edit Agency Modal */}
      <Dialog open={isAgencyModalOpen || isEditModalOpen} onClose={() => { setIsAgencyModalOpen(false); setIsEditModalOpen(false); }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Briefcase className="text-indigo-600" /> {isEditModalOpen ? 'Edit Agency' : 'Add New Agency'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} mt={1}>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Avatar 
                src={previewUrl || undefined} 
                sx={{ width: 64, height: 64, bgcolor: 'primary.light', color: 'primary.contrastText' }}
              >
                {agencyForm.name?.charAt(0) || 'A'}
              </Avatar>
              <Button 
                variant="outlined" 
                startIcon={<Upload size={16}/>} 
                size="small"
                component="label"
              >
                Upload Logo
                <input 
                  type="file" 
                  hidden 
                  accept="image/*" 
                  onChange={handleAvatarChange} 
                />
              </Button>
            </Box>
            
            <TextField 
              label="Agency Name" 
              fullWidth 
              value={agencyForm.name} 
              onChange={e => setAgencyForm({...agencyForm, name: e.target.value})} 
              size="small" 
              required 
            />
            <TextField 
              label="Trade/Service" 
              fullWidth 
              value={agencyForm.trade} 
              onChange={e => setAgencyForm({...agencyForm, trade: e.target.value})} 
              size="small" 
              required 
            />
            <TextField 
              label="Contact Person" 
              fullWidth 
              value={agencyForm.contactPerson} 
              onChange={e => setAgencyForm({...agencyForm, contactPerson: e.target.value})} 
              size="small" 
            />
            <TextField 
              label="Phone" 
              fullWidth 
              value={agencyForm.phone} 
              onChange={e => setAgencyForm({...agencyForm, phone: e.target.value})} 
              size="small" 
            />
            <TextField 
              label="Email" 
              fullWidth 
              value={agencyForm.email} 
              onChange={e => setAgencyForm({...agencyForm, email: e.target.value})} 
              size="small" 
            />
            <TextField 
              label="Address" 
              fullWidth 
              value={agencyForm.address} 
              onChange={e => setAgencyForm({...agencyForm, address: e.target.value})} 
              size="small" 
              multiline 
              rows={2}
            />
            <TextField 
              label="Contract Value" 
              type="number" 
              fullWidth 
              value={agencyForm.contractValue} 
              onChange={e => setAgencyForm({...agencyForm, contractValue: Number(e.target.value)})} 
              size="small" 
              InputProps={{ 
                startAdornment: <InputAdornment position="start">{getCurrencySymbol(project.settings?.currency)}</InputAdornment>,
                inputProps: { min: 0, step: 0.01 }
              }} 
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField 
                  label="Start Date" 
                  type="date" 
                  fullWidth 
                  size="small" 
                  InputLabelProps={{ shrink: true }} 
                  value={agencyForm.startDate} 
                  onChange={e => setAgencyForm({...agencyForm, startDate: e.target.value})} 
                  InputProps={{ startAdornment: <Calendar size={16} className="text-slate-400 mr-2"/> }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField 
                  label="End Date" 
                  type="date" 
                  fullWidth 
                  size="small" 
                  InputLabelProps={{ shrink: true }} 
                  value={agencyForm.endDate} 
                  onChange={e => setAgencyForm({...agencyForm, endDate: e.target.value})} 
                  InputProps={{ startAdornment: <Calendar size={16} className="text-slate-400 mr-2"/> }}
                />
              </Grid>
            </Grid>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select 
                value={agencyForm.status} 
                label="Status" 
                onChange={e => setAgencyForm({...agencyForm, status: e.target.value as any})}
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Suspended">Suspended</MenuItem>
                <MenuItem value="Completed">Completed</MenuItem>
              </Select>
            </FormControl>
            
            <Typography variant="subtitle2" fontWeight="bold" mt={3} color="primary">Logistics & Material Supply</Typography>
            <TextField 
              label="Material Categories" 
              fullWidth 
              size="small" 
              value={agencyForm.materialCategories?.join(', ') || ''} 
              onChange={e => setAgencyForm({...agencyForm, materialCategories: e.target.value.split(',').map(cat => cat.trim()).filter(cat => cat)})} 
              helperText="Enter categories separated by commas"
            />
            <TextField 
              label="Delivery Areas" 
              fullWidth 
              size="small" 
              value={agencyForm.deliveryAreas?.join(', ') || ''} 
              onChange={e => setAgencyForm({...agencyForm, deliveryAreas: e.target.value.split(',').map(area => area.trim()).filter(area => area)})} 
              helperText="Enter delivery areas separated by commas"
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField 
                  label="Preferred Delivery Methods" 
                  fullWidth 
                  size="small" 
                  value={agencyForm.preferredDeliveryMethods?.join(', ') || ''} 
                  onChange={e => setAgencyForm({...agencyForm, preferredDeliveryMethods: e.target.value.split(',').map(method => method.trim()).filter(method => method)})} 
                  helperText="e.g., Road, Rail, Air"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField 
                  label="Delivery Lead Time (days)" 
                  type="number" 
                  fullWidth 
                  size="small" 
                  value={agencyForm.deliveryLeadTime || 7} 
                  onChange={e => setAgencyForm({...agencyForm, deliveryLeadTime: Number(e.target.value)})} 
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField 
                  label="License Number" 
                  fullWidth 
                  size="small" 
                  value={agencyForm.licenseNumber || ''} 
                  onChange={e => setAgencyForm({...agencyForm, licenseNumber: e.target.value})} 
                />
              </Grid>
              <Grid item xs={6}>
                <TextField 
                  label="Tax ID" 
                  fullWidth 
                  size="small" 
                  value={agencyForm.taxId || ''} 
                  onChange={e => setAgencyForm({...agencyForm, taxId: e.target.value})} 
                />
              </Grid>
            </Grid>
            <TextField 
              label="Payment Terms" 
              fullWidth 
              size="small" 
              value={agencyForm.paymentTerms || ''} 
              onChange={e => setAgencyForm({...agencyForm, paymentTerms: e.target.value})} 
              multiline 
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: '#f8fafc' }}>
          <Button onClick={() => { setIsAgencyModalOpen(false); setIsEditModalOpen(false); }} startIcon={<X />}>Cancel</Button>
          <Button variant="contained" startIcon={<Save/>} onClick={handleSaveAgency}>
            {isEditModalOpen ? 'Update' : 'Save'} Agency
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <DollarSign className="text-indigo-600" /> Record Payment
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} mt={1}>
            <TextField 
              label="Payment Date" 
              type="date" 
              fullWidth 
              size="small" 
              InputLabelProps={{ shrink: true }} 
              value={paymentForm.date} 
              onChange={e => setPaymentForm({...paymentForm, date: e.target.value})} 
              InputProps={{ startAdornment: <Calendar size={16} className="text-slate-400 mr-2"/> }}
            />
            <TextField 
              label="Amount" 
              type="number" 
              fullWidth 
              size="small" 
              value={paymentForm.amount} 
              onChange={e => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value) || 0})}
              InputProps={{ 
                startAdornment: <InputAdornment position="start">{getCurrencySymbol(project.settings?.currency)}</InputAdornment>,
                inputProps: { min: 0, step: 0.01 }
              }} 
              required 
            />
            <TextField 
              label="Reference Number" 
              fullWidth 
              size="small" 
              value={paymentForm.reference} 
              onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})} 
              required 
            />
            <FormControl fullWidth size="small">
              <InputLabel>Payment Type</InputLabel>
              <Select 
                value={paymentForm.type} 
                label="Payment Type" 
                onChange={e => setPaymentForm({...paymentForm, type: e.target.value as any})}
              >
                <MenuItem value="Bill Payment">Bill Payment</MenuItem>
                <MenuItem value="Advance">Advance</MenuItem>
                <MenuItem value="Retention">Retention</MenuItem>
                <MenuItem value="Final Payment">Final Payment</MenuItem>
              </Select>
            </FormControl>
            <TextField 
              label="Description" 
              fullWidth 
              size="small" 
              value={paymentForm.description} 
              onChange={e => setPaymentForm({...paymentForm, description: e.target.value})} 
              multiline 
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setIsPaymentModalOpen(false)} startIcon={<X />}>Cancel</Button>
          <Button variant="contained" startIcon={<Save/>} onClick={handleSavePayment}>Save Payment</Button>
        </DialogActions>
      </Dialog>

      {/* Rates Modal */}
      <Dialog open={isRatesModalOpen} onClose={() => setIsRatesModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, boxShadow: 24, p: 1 } }}>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', p: 2, borderTopLeftRadius: 3, borderTopRightRadius: 3, fontWeight: 700 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Calculator size={20} className="text-white" /> Add Rate
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={3} mt={1}>
            <TextField 
              label="Material" 
              select
              fullWidth 
              size="small" 
              value={rateForm.materialId || ''} 
              onChange={e => setRateForm({...rateForm, materialId: e.target.value})} 
              required
              SelectProps={{
                displayEmpty: true,
                renderValue: (selected) => {
                  if (!selected) {
                    return <em>Select Material (saved)</em>;
                  }
                  const material = project.agencyMaterials?.find(m => m.id === selected);
                  return material ? `${material.materialName} - ${material.quantity} ${material.unit}` : '';
                },
                MenuProps: {
                  PaperProps: {
                    sx: {
                      borderRadius: 2,
                      mt: 0.5,
                      boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
                    }
                  }
                }
              }}
            >
              <MenuItem value="" disabled>
                <em>Select Material (saved)</em>
              </MenuItem>
              {project.agencyMaterials?.filter(mat => mat.agencyId === selectedAgencyId).map(material => (
                <MenuItem key={material.id} value={material.id}>{material.materialName} - {material.quantity} {material.unit}</MenuItem>
              ))}
            </TextField>
            <TextField 
              label="Rate" 
              type="number" 
              fullWidth 
              size="small" 
              value={rateForm.rate} 
              onChange={e => setRateForm({...rateForm, rate: Number(e.target.value)})} 
              InputProps={{ 
                startAdornment: <InputAdornment position="start">{getCurrencySymbol(project.settings?.currency)}</InputAdornment>,
                inputProps: { min: 0, step: 0.01 }
              }} 
              required
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField 
                  label="Effective Date" 
                  type="date" 
                  fullWidth 
                  size="small" 
                  InputLabelProps={{ shrink: true }} 
                  value={rateForm.effectiveDate} 
                  onChange={e => setRateForm({...rateForm, effectiveDate: e.target.value})} 
                  InputProps={{ startAdornment: <Calendar size={16} className="text-slate-400 mr-2"/> }}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField 
                  label="Expiry Date" 
                  type="date" 
                  fullWidth 
                  size="small" 
                  InputLabelProps={{ shrink: true }} 
                  value={rateForm.expiryDate || ''} 
                  onChange={e => setRateForm({...rateForm, expiryDate: e.target.value})} 
                  InputProps={{ startAdornment: <Calendar size={16} className="text-slate-400 mr-2"/> }}
                />
              </Grid>
            </Grid>
            <TextField 
              label="Description" 
              fullWidth 
              size="small" 
              value={rateForm.description || ''} 
              onChange={e => setRateForm({...rateForm, description: e.target.value})} 
              multiline 
              rows={2}
            />
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select 
                value={rateForm.status || 'Active'} 
                label="Status" 
                onChange={e => setRateForm({...rateForm, status: e.target.value as any})}
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Expired">Expired</MenuItem>
                <MenuItem value="Suspended">Suspended</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: 'grey.50', borderBottomLeftRadius: 3, borderBottomRightRadius: 3 }}>
          <Button onClick={() => setIsRatesModalOpen(false)} startIcon={<X size={16} />} sx={{ px: 3, py: 1, fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" startIcon={<Save size={16} />} onClick={handleSaveRate} sx={{ px: 3, py: 1, fontWeight: 600, boxShadow: 2, '&:hover': { boxShadow: 3 } }}>Save Rate</Button>
        </DialogActions>
      </Dialog>

      {/* Material Modal */}
      <Dialog open={isMaterialModalOpen} onClose={() => setIsMaterialModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, boxShadow: 24, p: 1 } }}>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', p: 2, borderTopLeftRadius: 3, borderTopRightRadius: 3, fontWeight: 700 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Package size={20} className="text-white" /> Add Material
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={3} mt={1}>
            <TextField 
              label="Material Name" 
              fullWidth 
              size="small" 
              value={materialForm.materialName || ''} 
              onChange={e => setMaterialForm({...materialForm, materialName: e.target.value})} 
              required
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField 
                  label="Quantity" 
                  type="number" 
                  fullWidth 
                  size="small" 
                  value={materialForm.quantity || 1} 
                  onChange={e => setMaterialForm({...materialForm, quantity: Number(e.target.value)})} 
                  InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField 
                  label="Unit" 
                  fullWidth 
                  size="small" 
                  value={materialForm.unit || ''} 
                  onChange={e => setMaterialForm({...materialForm, unit: e.target.value})} 
                  required
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <TextField 
                  label="Rate" 
                  type="number" 
                  fullWidth 
                  size="small" 
                  value={materialForm.rate || 0} 
                  onChange={e => setMaterialForm({...materialForm, rate: Number(e.target.value)})} 
                  InputProps={{ 
                    startAdornment: <InputAdornment position="start">{getCurrencySymbol(project.settings?.currency)}</InputAdornment>,
                    inputProps: { min: 0, step: 0.01 }
                  }} 
                  required
                />
              </Grid>
              <Grid item xs={4}>
                <TextField 
                  label="Tax Amount" 
                  type="number" 
                  fullWidth 
                  size="small" 
                  value={materialForm.taxAmount || 0} 
                  onChange={e => setMaterialForm({...materialForm, taxAmount: Number(e.target.value)})} 
                  InputProps={{ 
                    startAdornment: <InputAdornment position="start">{getCurrencySymbol(project.settings?.currency)}</InputAdornment>,
                    inputProps: { min: 0, step: 0.01 }
                  }} 
                />
              </Grid>
              <Grid item xs={4}>
                <TextField 
                  label="Delivery Charges" 
                  type="number" 
                  fullWidth 
                  size="small" 
                  value={materialForm.deliveryCharges || 0} 
                  onChange={e => setMaterialForm({...materialForm, deliveryCharges: Number(e.target.value)})} 
                  InputProps={{ 
                    startAdornment: <InputAdornment position="start">{getCurrencySymbol(project.settings?.currency)}</InputAdornment>,
                    inputProps: { min: 0, step: 0.01 }
                  }} 
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField 
                  label="Subtotal" 
                  type="number" 
                  fullWidth 
                  size="small" 
                  value={(materialForm.quantity || 0) * (materialForm.rate || 0)} 
                  disabled
                  InputProps={{ 
                    startAdornment: <InputAdornment position="start">{getCurrencySymbol(project.settings?.currency)}</InputAdornment>
                  }} 
                />
              </Grid>
              <Grid item xs={6}>
                <TextField 
                  label="Total Amount" 
                  type="number" 
                  fullWidth 
                  size="small" 
                  value={(materialForm.quantity || 0) * (materialForm.rate || 0) + (materialForm.taxAmount || 0) + (materialForm.deliveryCharges || 0)} 
                  disabled
                  InputProps={{ 
                    startAdornment: <InputAdornment position="start">{getCurrencySymbol(project.settings?.currency)}</InputAdornment>
                  }} 
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField 
                  label="Received Date" 
                  type="date" 
                  fullWidth 
                  size="small" 
                  InputLabelProps={{ shrink: true }} 
                  value={materialForm.receivedDate || new Date().toISOString().split('T')[0]} 
                  onChange={e => setMaterialForm({...materialForm, receivedDate: e.target.value})} 
                  InputProps={{ startAdornment: <Calendar size={16} className="text-slate-400 mr-2"/> }}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField 
                  label="Invoice Number" 
                  fullWidth 
                  size="small" 
                  value={materialForm.invoiceNumber || ''} 
                  onChange={e => setMaterialForm({...materialForm, invoiceNumber: e.target.value})} 
                />
              </Grid>
            </Grid>
            <TextField 
              label="Remarks" 
              fullWidth 
              size="small" 
              value={materialForm.remarks || ''} 
              onChange={e => setMaterialForm({...materialForm, remarks: e.target.value})} 
              multiline 
              rows={2}
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select 
                    value={materialForm.status || 'Ordered'} 
                    label="Status" 
                    onChange={e => setMaterialForm({...materialForm, status: e.target.value as any})}
                  >
                    <MenuItem value="Ordered">Ordered</MenuItem>
                    <MenuItem value="In Transit">In Transit</MenuItem>
                    <MenuItem value="Delivered">Delivered</MenuItem>
                    <MenuItem value="Received">Received</MenuItem>
                    <MenuItem value="Pending">Pending</MenuItem>
                    <MenuItem value="Verified">Verified</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField 
                  label="Expected Delivery Date" 
                  type="date" 
                  fullWidth 
                  size="small" 
                  InputLabelProps={{ shrink: true }} 
                  value={materialForm.expectedDeliveryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} 
                  onChange={e => setMaterialForm({...materialForm, expectedDeliveryDate: e.target.value})} 
                  InputProps={{ startAdornment: <Calendar size={16} className="text-slate-400 mr-2"/> }}
                />
              </Grid>
            </Grid>
            <TextField 
              label="Delivery Location" 
              fullWidth 
              size="small" 
              value={materialForm.deliveryLocation || ''} 
              onChange={e => setMaterialForm({...materialForm, deliveryLocation: e.target.value})} 
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField 
                  label="Transport Mode" 
                  fullWidth 
                  size="small" 
                  value={materialForm.transportMode || ''} 
                  onChange={e => setMaterialForm({...materialForm, transportMode: e.target.value})} 
                />
              </Grid>
              <Grid item xs={6}>
                <TextField 
                  label="Tax Amount" 
                  type="number" 
                  fullWidth 
                  size="small" 
                  value={materialForm.taxAmount || 0} 
                  onChange={e => setMaterialForm({...materialForm, taxAmount: Number(e.target.value)})} 
                  InputProps={{ 
                    startAdornment: <InputAdornment position="start">{getCurrencySymbol(project.settings?.currency)}</InputAdornment>,
                    inputProps: { min: 0, step: 0.01 }
                  }} 
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField 
                  label="Delivery Charges" 
                  type="number" 
                  fullWidth 
                  size="small" 
                  value={materialForm.deliveryCharges || 0} 
                  onChange={e => setMaterialForm({...materialForm, deliveryCharges: Number(e.target.value)})} 
                  InputProps={{ 
                    startAdornment: <InputAdornment position="start">{getCurrencySymbol(project.settings?.currency)}</InputAdornment>,
                    inputProps: { min: 0, step: 0.01 }
                  }} 
                />
              </Grid>
              <Grid item xs={6}>
                <TextField 
                  label="Batch Number" 
                  fullWidth 
                  size="small" 
                  value={materialForm.batchNumber || ''} 
                  onChange={e => setMaterialForm({...materialForm, batchNumber: e.target.value})} 
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField 
                  label="Expiry Date" 
                  type="date" 
                  fullWidth 
                  size="small" 
                  InputLabelProps={{ shrink: true }} 
                  value={materialForm.expiryDate || ''} 
                  onChange={e => setMaterialForm({...materialForm, expiryDate: e.target.value})} 
                  InputProps={{ startAdornment: <Calendar size={16} className="text-slate-400 mr-2"/> }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField 
                  label="Quality Certification" 
                  fullWidth 
                  size="small" 
                  value={materialForm.qualityCertification || ''} 
                  onChange={e => setMaterialForm({...materialForm, qualityCertification: e.target.value})} 
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: 'grey.50', borderBottomLeftRadius: 3, borderBottomRightRadius: 3 }}>
          <Button onClick={() => setIsMaterialModalOpen(false)} startIcon={<X size={16} />} sx={{ px: 3, py: 1, fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" startIcon={<Save size={16} />} onClick={handleSaveMaterial} sx={{ px: 3, py: 1, fontWeight: 600, boxShadow: 2, '&:hover': { boxShadow: 3 } }}>Save Material</Button>
        </DialogActions>
      </Dialog>

      {/* Bill Modal */}
      <Dialog open={isBillModalOpen} onClose={() => setIsBillModalOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, boxShadow: 24, p: 1 } }}>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', p: 2, borderTopLeftRadius: 3, borderTopRightRadius: 3, fontWeight: 700 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <FileText size={20} className="text-white" /> Create Bill
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={3} mt={1}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField 
                  label="Bill Number" 
                  fullWidth 
                  size="small" 
                  value={billForm.billNumber || ''} 
                  onChange={e => setBillForm({...billForm, billNumber: e.target.value})} 
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField 
                  label="Date" 
                  type="date" 
                  fullWidth 
                  size="small" 
                  InputLabelProps={{ shrink: true }} 
                  value={billForm.date || new Date().toISOString().split('T')[0]} 
                  onChange={e => setBillForm({...billForm, date: e.target.value})} 
                  InputProps={{ startAdornment: <Calendar size={16} className="text-slate-400 mr-2"/> }}
                  required
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField 
                  label="Period From" 
                  type="date" 
                  fullWidth 
                  size="small" 
                  InputLabelProps={{ shrink: true }} 
                  value={billForm.periodFrom || new Date().toISOString().split('T')[0]} 
                  onChange={e => setBillForm({...billForm, periodFrom: e.target.value})} 
                  InputProps={{ startAdornment: <Calendar size={16} className="text-slate-400 mr-2"/> }}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField 
                  label="Period To" 
                  type="date" 
                  fullWidth 
                  size="small" 
                  InputLabelProps={{ shrink: true }} 
                  value={billForm.periodTo || new Date().toISOString().split('T')[0]} 
                  onChange={e => setBillForm({...billForm, periodTo: e.target.value})} 
                  InputProps={{ startAdornment: <Calendar size={16} className="text-slate-400 mr-2"/> }}
                  required
                />
              </Grid>
            </Grid>
            <TextField 
              label="Description" 
              fullWidth 
              size="small" 
              value={billForm.description || ''} 
              onChange={e => setBillForm({...billForm, description: e.target.value})} 
              multiline 
              rows={2}
            />
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select 
                value={billForm.status || 'Draft'} 
                label="Status" 
                onChange={e => setBillForm({...billForm, status: e.target.value as any})}
              >
                <MenuItem value="Draft">Draft</MenuItem>
                <MenuItem value="Submitted">Submitted</MenuItem>
                <MenuItem value="Approved">Approved</MenuItem>
                <MenuItem value="Paid">Paid</MenuItem>
              </Select>
            </FormControl>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField 
                  label="Gross Amount" 
                  type="number" 
                  fullWidth 
                  size="small" 
                  value={billForm.grossAmount || 0} 
                  onChange={e => setBillForm({...billForm, grossAmount: Number(e.target.value)})} 
                  InputProps={{ 
                    startAdornment: <InputAdornment position="start">{getCurrencySymbol(project.settings?.currency)}</InputAdornment>,
                    inputProps: { min: 0, step: 0.01 }
                  }} 
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField 
                  label="Net Amount" 
                  type="number" 
                  fullWidth 
                  size="small" 
                  value={billForm.netAmount || 0} 
                  onChange={e => setBillForm({...billForm, netAmount: Number(e.target.value)})} 
                  InputProps={{ 
                    startAdornment: <InputAdornment position="start">{getCurrencySymbol(project.settings?.currency)}</InputAdornment>,
                    inputProps: { min: 0, step: 0.01 }
                  }} 
                  required
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: 'grey.50', borderBottomLeftRadius: 3, borderBottomRightRadius: 3 }}>
          <Button onClick={() => setIsBillModalOpen(false)} startIcon={<X size={16} />} sx={{ px: 3, py: 1, fontWeight: 600 }}>Cancel</Button>
          <Button variant="contained" startIcon={<Save size={16} />} onClick={handleSaveBill} sx={{ px: 3, py: 1, fontWeight: 600, boxShadow: 2, '&:hover': { boxShadow: 3 } }}>Save Bill</Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={3000} 
        onClose={() => setSnackbarOpen(false)} 
        message={snackbarMessage}
      />
    </Box>
  );
};

export default AgencyModule;
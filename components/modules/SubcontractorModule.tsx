import React, { useState, useMemo } from 'react';
import { Project, UserRole, Agency, Subcontractor, SubcontractorPayment, BOQItem, AgencyRateEntry, SubcontractorRateEntry, AppSettings } from '../../types';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Progress } from '~/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { toast } from 'sonner'; // Using sonner for toasts

import {
  Briefcase, FileText, Calendar, MapPin, TrendingUp, Clock, Activity,
  Plus, Save, X, Edit, Trash2, CheckCircle2, Calculator, Package,
  DollarSign, HelpCircle
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatting/exportUtils';
import { getCurrencySymbol } from '../../utils/formatting/currencyUtils';
import { cn } from '~/lib/utils'; // Assuming cn utility is available for conditional classes

interface Props {
  project: Project;
  userRole: UserRole;
  settings?: AppSettings;
  onProjectUpdate: (project: Project) => void;
}

const SubcontractorModule: React.FC<Props> = ({ project, onProjectUpdate, userRole, settings }) => {
  const [activeTab, setActiveTab] = useState("0"); // Use string for Shadcn Tabs value
  const [isSubcontractorModalOpen, setIsSubcontractorModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  
  // Replaced snackbar with sonner toast
  // const [snackbarOpen, setSnackbarOpen] = useState(false);
  // const [snackbarMessage, setSnackbarMessage] = useState('');

  const subcontractors = project.agencies?.filter(a => a.type === 'subcontractor') || [];
  const subPayments = (project.agencyPayments || []).filter(p => p.agencyId && subcontractors.some(s => s.id === p.agencyId));
  
  const [newSubcontractor, setNewSubcontractor] = useState<Partial<Subcontractor>>({
    name: '',
    trade: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    status: 'Active',
    type: 'subcontractor',
    contractValue: 0,
    startDate: '',
    endDate: '',
    assignedWorks: [],
    assetCategories: [],
    certification: []
  });

  const [paymentForm, setPaymentForm] = useState<Partial<SubcontractorPayment>>({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    reference: '',
    type: 'Bill Payment',
    description: ''
  });

  const [rateForm, setRateForm] = useState<Partial<SubcontractorRateEntry>>({
    boqItemId: '',
    rate: 0,
    effectiveDate: new Date().toISOString().split('T')[0],
    status: 'Active',
    description: ''
  });

  const selectedSubcontractor = subcontractors.find(s => s.id === selectedSubId);
  const selectedSubcontractorRates = selectedSubcontractor?.rates || [];

  // Replaced showSnackbar with toast from sonner
  const showToast = (message: string) => {
    toast(message);
  };

  const handleAddSubcontractor = () => {
    setNewSubcontractor({
      name: '',
      trade: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      status: 'Active',
      type: 'subcontractor'
    });
    setIsSubcontractorModalOpen(true);
  };

  const handleEditSubcontractor = (sub: Agency) => {
    setNewSubcontractor({
      id: sub.id,
      name: sub.name,
      trade: sub.trade,
      contactPerson: sub.contactPerson,
      phone: sub.phone,
      email: sub.email,
      address: sub.address,
      status: sub.status,
      type: 'subcontractor'
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteSubcontractor = (subId: string) => {
    if (window.confirm('Are you sure you want to delete this subcontractor? This will also delete all associated payments.')) {
      const updatedAgencies = project.agencies?.filter(a => a.id !== subId) || [];
      const updatedPayments = project.agencyPayments?.filter(p => p.agencyId !== subId) || [];
      
      onProjectUpdate({
        ...project,
        agencies: updatedAgencies,
        agencyPayments: updatedPayments
      });
      
      if (selectedSubId === subId) {
        setSelectedSubId(null);
      }
    }
  };

  const handleSaveSubcontractor = () => {
    // Validation
    if (!newSubcontractor.name?.trim()) {
      showToast('Contractor name is required');
      return;
    }
    
    if (!newSubcontractor.trade?.trim()) {
      showToast('Trade is required');
      return;
    }
    
    if (newSubcontractor.contractValue && newSubcontractor.contractValue < 0) {
      showToast('Contract value must be a positive number');
      return;
    }
    
    if (newSubcontractor.phone && !/^[+]?[0-9\s\-]{8,}$/.test(newSubcontractor.phone)) {
      showToast('Please enter a valid phone number');
      return;
    }
    
    if (newSubcontractor.email && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(.\w{2,3})+$/.test(newSubcontractor.email)) {
      showToast('Please enter a valid email address');
      return;
    }
    
    if (newSubcontractor.startDate && newSubcontractor.endDate && new Date(newSubcontractor.startDate) > new Date(newSubcontractor.endDate)) {
      showToast('Start date cannot be later than end date');
      return;
    }

    if (selectedSubId) {
      // Update existing subcontractor
      const updatedAgencies = project.agencies?.map(a => 
        a.id === selectedSubId 
          ? { 
              ...a, 
              name: newSubcontractor.name || a.name,
              trade: newSubcontractor.trade || a.trade,
              contactPerson: newSubcontractor.contactPerson || a.contactPerson,
              phone: newSubcontractor.phone || a.phone,
              email: newSubcontractor.email || a.email,
              address: newSubcontractor.address || a.address,
              status: newSubcontractor.status || a.status,
              contractValue: newSubcontractor.contractValue ?? a.contractValue,
              startDate: newSubcontractor.startDate || a.startDate,
              endDate: newSubcontractor.endDate || a.endDate,
              type: 'subcontractor' as const,
              assignedWorks: newSubcontractor.assignedWorks,
              assetCategories: newSubcontractor.assetCategories,
              certification: newSubcontractor.certification
            } 
          : a
      ) || [];
      
      // If assigned works are specified, update the BOQ items to link them to the subcontractor
      let updatedProject = { ...project, agencies: updatedAgencies };
      if (newSubcontractor.assignedWorks && newSubcontractor.assignedWorks.length > 0) {
        // First, clear any existing subcontractor assignments for this subcontractor
        const clearedBoq = project.boq.map(item => 
          item.subcontractorId === selectedSubId ? { ...item, subcontractorId: undefined } : item
        );
        
        // Then assign the new works
        updatedProject = {
          ...project,
          agencies: updatedAgencies,
          boq: clearedBoq.map(item => 
            newSubcontractor.assignedWorks?.includes(item.id) 
              ? { ...item, subcontractorId: selectedSubId }
              : item
          )
        };
      }
      
      onProjectUpdate(updatedProject);
    } else {
      // Add new subcontractor
      const newSub: Agency = {
        id: `sub-${Date.now()}`,
        name: newSubcontractor.name!,
        trade: newSubcontractor.trade!,
        contactPerson: newSubcontractor.contactPerson || '',
        phone: newSubcontractor.phone || '',
        email: newSubcontractor.email || '',
        address: newSubcontractor.address || '',
        status: newSubcontractor.status || 'Active',
        type: 'subcontractor',
        contractValue: newSubcontractor.contractValue || 0,
        startDate: newSubcontractor.startDate || '',
        endDate: newSubcontractor.endDate || '',
        assignedWorks: newSubcontractor.assignedWorks,
        assetCategories: newSubcontractor.assetCategories,
        certification: newSubcontractor.certification
      };
      
      // If assigned works are specified, update the BOQ items to link them to the subcontractor
      let updatedProject = { ...project };
      if (newSubcontractor.assignedWorks && newSubcontractor.assignedWorks.length > 0) {
        updatedProject = {
          ...project,
          boq: project.boq.map(item => 
            newSubcontractor.assignedWorks?.includes(item.id) 
              ? { ...item, subcontractorId: newSub.id }
              : item
          )
        };
      }
      
      onProjectUpdate({
        ...updatedProject,
        agencies: [...(project.agencies || []), newSub]
      });
    }
    
    setIsSubcontractorModalOpen(false);
    setIsEditModalOpen(false);
    setNewSubcontractor({
      name: '',
      trade: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      status: 'Active',
      type: 'subcontractor',
      contractValue: 0,
      startDate: '',
      endDate: '',
      assignedWorks: [],
      assetCategories: [],
      certification: []
    });
  };

  const handleSavePayment = () => {
    // Validation
    if (!selectedSubId) {
      showToast('Please select a subcontractor first');
      return;
    }
    
    if (!paymentForm.amount || isNaN(Number(paymentForm.amount)) || Number(paymentForm.amount) <= 0) {
      showToast('Please enter a valid positive amount');
      return;
    }
    
    if (!paymentForm.reference?.trim()) {
      showToast('Please enter a reference number');
      return;
    }
    
    if (!paymentForm.date) {
      showToast('Please select a payment date');
      return;
    }

    const newPayment: SubcontractorPayment = {
      id: `pay-${Date.now()}`,
      subcontractorId: selectedSubId,
      date: paymentForm.date,
      amount: Number(paymentForm.amount),
      reference: paymentForm.reference,
      type: paymentForm.type || 'Bill Payment',
      description: paymentForm.description || '',
      status: 'Confirmed'
    };

    onProjectUpdate({
      ...project,
      subcontractorPayments: [...(project.subcontractorPayments || []), newPayment]
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
    if (!selectedSubId) {
      showToast('Please select a subcontractor first');
      return;
    }
    setPaymentForm({
      ...paymentForm,
      subcontractorId: selectedSubId
    });
    setIsPaymentModalOpen(true);
  };

  const calculateSubcontractorProgress = (subId: string) => {
    const subBoqItems = project.boq.filter(item => item.subcontractorId === subId);
    const totalValue = subBoqItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const completedValue = subBoqItems.reduce((sum, item) => sum + (item.completedQuantity * item.rate), 0);
    return totalValue > 0 ? Math.round((completedValue / totalValue) * 100) : 0;
  };

  const calculateSubcontractorValue = (subId: string) => {
    const sub = subcontractors.find(s => s.id === subId);
    const subRates = sub?.rates || [];
    
    // Calculate total contract value based on rates
    const totalValue = subRates.reduce((sum, rate) => {
      const boqItem = project.boq.find(b => b.id === (rate as any).boqItemId);
      if (boqItem) {
        // Using the rate from the subcontractor's specific rate entry
        return sum + (boqItem.quantity * rate.rate);
      }
      return sum;
    }, 0);
    
    return totalValue;
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between mb-2 items-center">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Works Execution</h2>
          <p className="text-sm text-muted-foreground">Subcontractor management and progress tracking</p>
        </div>
        <Button onClick={handleAddSubcontractor} className="px-3 py-1.5">
          <Plus size={16} className="mr-2"/>
          Add Contractor
        </Button>
      </div>

      <div className="border rounded-xl overflow-hidden mb-2">
        <Tabs value={activeTab.toString()} onValueChange={(v) => setActiveTab(v)}>
          <TabsList className="bg-slate-50 border-b border-b-gray-200">
            <TabsTrigger value="0" className="flex items-center gap-2">
              <Briefcase size={18}/> Subcontractors
            </TabsTrigger>
            <TabsTrigger value="1" className="flex items-center gap-2">
              <Calculator size={18}/> Rates
            </TabsTrigger>
            <TabsTrigger value="2" className="flex items-center gap-2">
              <DollarSign size={18}/> Payment Ledger
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="p-2">
          {activeTab === "0" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="col-span-12 md:col-span-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1">
                    <h3 className="text-lg font-bold">Subcontractors</h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-gray-500 cursor-help">
                            <HelpCircle size={16} />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Manage your subcontractor partners and their assignments
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  {subcontractors.map(sub => (
                    <div
                      key={sub.id}
                      onClick={() => setSelectedSubId(sub.id)}
                      className={cn(
                        "cursor-pointer rounded-xl transition-all duration-200 border",
                        selectedSubId === sub.id ? 'bg-indigo-50/20 border-primary' : 'bg-white border-border'
                      )}
                    >
                      <div className="p-2 flex items-center gap-2">
                        <Avatar className="bg-blue-100 text-blue-600"> {/* Changed to general blue as primary.light was MUI specific */}
                          <Briefcase size={20}/>
                        </Avatar>
                        <div className="flex-1">
                          <h4 className="font-bold text-sm">{sub.name}</h4>
                          <p className="text-xs text-muted-foreground">{sub.trade}</p>
                          <div className="mt-1">
                            <Badge
                              className={cn(
                                "text-xs h-[18px]",
                                sub.status === 'Active' && "bg-green-100 text-green-800",
                                sub.status === 'Suspended' && "bg-red-100 text-red-800",
                                (sub.status === 'Suspended' || sub.status === 'Completed') && "bg-yellow-100 text-yellow-800"
                              )}
                            >
                              {sub.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditSubcontractor(sub); }}>
                            <Edit size={14} />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500" onClick={(e) => { e.stopPropagation(); handleDeleteSubcontractor(sub.id); }}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {subcontractors.length === 0 && (
                    <div className="py-6 text-center text-gray-500">
                      <Briefcase size={48} className="opacity-20 mx-auto mb-3"/>
                      <h3 className="text-lg">No subcontractors registered</h3>
                      <p className="text-sm">Add your first subcontractor to get started</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="col-span-12 md:col-span-8">
                {selectedSubcontractor ? (
                  <div className="flex flex-col gap-3">
                    <div className="border p-3 rounded-2xl">
                      <div className="flex justify-between mb-3">
                        <div>
                          <h2 className="text-2xl font-extrabold">{selectedSubcontractor.name}</h2>
                          <p className="text-sm text-muted-foreground">{selectedSubcontractor.trade}</p>
                        </div>
                        <Button size="sm" onClick={handleOpenPaymentModal}>
                          <DollarSign size={16} className="mr-2"/>
                          Record Payment
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
                        <div className="col-span-6 md:col-span-3">
                          <div className="border text-center py-2">
                            <FileText size={16}/>
                            <p className="font-bold text-base">
                              {project.boq.filter(item => item.subcontractorId === selectedSubcontractor.id).length}
                            </p>
                            <p className="text-xs">BOQ Items</p>
                          </div>
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <div className="border text-center py-2">
                            <TrendingUp size={16}/>
                            <p className="font-bold text-base">
                              {calculateSubcontractorProgress(selectedSubcontractor.id)}%
                            </p>
                            <p className="text-xs">Progress</p>
                          </div>
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <div className="border text-center py-2">
                            <DollarSign size={16}/>
                            <p className="font-bold text-base">
                              {formatCurrency(calculateSubcontractorValue(selectedSubcontractor.id), settings || project.settings)}
                            </p>
                            <p className="text-xs">Contract Value</p>
                          </div>
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <div className="border text-center py-2">
                            <Activity size={16}/>
                            <p className="font-bold text-base">
                              {subPayments
                                .filter(p => p.agencyId === selectedSubcontractor.id)
                                .reduce((sum, p) => sum + p.amount, 0)
                                .toLocaleString('en-US', { maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-xs">Total Paid</p>
                          </div>
                        </div>
                      </div>

                      <h4 className="font-bold mb-2">Assigned BOQ Items</h4>
                      <Table>
                        <TableHead className="bg-slate-50">
                          <TableRow>
                            <TableCell className="font-bold">Item</TableCell>
                            <TableCell className="font-bold">Description</TableCell>
                            <TableCell align="right" className="font-bold">Quantity</TableCell>
                            <TableCell align="right" className="font-bold">Rate</TableCell>
                            <TableCell align="right" className="font-bold">Amount</TableCell>
                            <TableCell align="right" className="font-bold">Progress</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {project.boq
                            .filter(item => item.subcontractorId === selectedSubcontractor.id)
                            .map(item => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <p className="text-sm font-medium">{item.description}</p>
                                </TableCell>
                                <TableCell align="right">
                                  <p className="text-sm">{item.quantity} {item.unit}</p>
                                </TableCell>
                                <TableCell align="right">
                                  <p className="text-sm">{formatCurrency(item.rate, settings || project.settings)}</p>
                                </TableCell>
                                <TableCell align="right">
                                  <p className="text-sm font-bold">{formatCurrency(item.quantity * item.rate, settings || project.settings)}</p>
                                </TableCell>
                                <TableCell align="right">
                                  <p className="text-sm text-primary">
                                    {item.completedQuantity}/{item.quantity} ({Math.round((item.completedQuantity / item.quantity) * 100)}%)
                                  </p>
                                </TableCell>
                              </TableRow>
                            ))}
                          {project.boq.filter(item => item.subcontractorId === selectedSubcontractor.id).length === 0 && (
                            <TableRow>
                              <td colSpan={6} className="text-center p-8 px-4"> {/* Increased colSpan */}
                                <p className="text-sm text-muted-foreground">No BOQ items assigned to this subcontractor</p>
                              </td>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="py-10 text-center text-gray-500">
                    <Briefcase size={60} className="opacity-10 mx-auto mb-4"/>
                    <h3 className="text-lg">Select a subcontractor to view details</h3>
                    <p className="text-sm">Choose from the list to see subcontractor information</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "1" && (
            <div className="p-2">
              <div className="flex justify-between mb-3 items-center">
                <h4 className="text-lg font-bold">Subcontractor Rates</h4>
                <Button 
                  onClick={() => {
                    if (!selectedSubId) {
                      showToast('Please select a subcontractor first');
                      return;
                    }
                    setRateForm({
                      boqItemId: '',
                      rate: 0,
                      effectiveDate: new Date().toISOString().split('T')[0],
                      status: 'Active',
                      description: ''
                    });
                    setIsRatesModalOpen(true);
                  }}
                  className="px-3 py-1.5"
                >
                  <Plus size={16} className="mr-2"/>
                  Add Rate
                </Button>
              </div>
              
              <Table>
                <TableHead className="bg-slate-50">
                  <TableRow>
                    <TableCell className="font-bold">BOQ Item</TableCell>
                    <TableCell className="font-bold">Description</TableCell>
                    <TableCell align="right" className="font-bold">Rate</TableCell>
                    <TableCell className="font-bold">Effective Date</TableCell>
                    <TableCell className="font-bold">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedSubcontractorRates.map(rate => {
                    const boqItem = project.boq.find(b => b.id === (rate as any).boqItemId);
                    return (
                      <TableRow key={rate.id}>
                        <TableCell>{boqItem?.itemNo || 'N/A'}</TableCell>
                        <TableCell>{boqItem?.description || rate.description || 'N/A'}</TableCell>
                        <TableCell align="right">
                          <p className="text-sm font-bold">{formatCurrency(rate.rate, settings || project.settings)}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{rate.effectiveDate}</p>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={cn(
                              "text-xs h-[18px]",
                              rate.status === 'Active' && "bg-green-100 text-green-800",
                              rate.status === 'Expired' && "bg-red-100 text-red-800",
                              (rate.status === 'Suspended') && "bg-yellow-100 text-yellow-800"
                            )} 
                          >
                            {rate.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {selectedSubcontractorRates.length === 0 && (
                    <TableRow>
                      <td colSpan={5} className="text-center p-8 px-4">
                        <p className="text-sm text-muted-foreground">No rate records found for this subcontractor</p>
                      </td>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {activeTab === "2" && (
            <div className="p-2">
              <div className="flex justify-between mb-3 items-center">
                <h4 className="text-lg font-bold">Payment Transactions</h4>
              </div>
              
              <Table>
                <TableHead className="bg-slate-50">
                  <TableRow>
                    <TableCell className="font-bold">Date</TableCell>
                    <TableCell className="font-bold">Subcontractor</TableCell>
                    <TableCell className="font-bold">Reference</TableCell>
                    <TableCell className="font-bold">Amount</TableCell>
                    <TableCell className="font-bold">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {subPayments.map(payment => {
                    const sub = subcontractors.find(s => s.id === payment.agencyId);
                    return (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <p className="text-sm">{payment.date}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{sub?.name}</p>
                          <p className="text-xs text-muted-foreground">{sub?.trade}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{payment.reference}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-bold">{formatCurrency(payment.amount, settings || project.settings)}</p>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={cn(
                              "text-xs h-[18px]",
                              payment.status === 'Confirmed' && "bg-green-100 text-green-800",
                              payment.status === 'Draft' && "bg-blue-100 text-blue-800", // Assuming info.light is blue
                              // No warning status for payments
                            )} 
                          >
                            {payment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {subPayments.length === 0 && (
                    <TableRow>
                      <td colSpan={5} className="text-center p-8 px-4">
                        <p className="text-sm text-muted-foreground">No payment records found</p>
                      </td>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Subcontractor Modal */}
      <Dialog open={isSubcontractorModalOpen || isEditModalOpen} onOpenChange={() => { setIsSubcontractorModalOpen(false); setIsEditModalOpen(false); }} >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-bold flex items-center gap-1.5">
              <Briefcase className="text-primary" /> {isEditModalOpen ? 'Edit Contractor' : 'Add New Contractor'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-3 mt-1">
              <Label htmlFor="subcontractor-name">Subcontractor Name</Label>
              <Input
                id="subcontractor-name" 
                value={newSubcontractor.name} 
                onChange={e => setNewSubcontractor({...newSubcontractor, name: e.target.value})} 
                required 
                placeholder="Enter the full name of the subcontractor company"
              />
              <p className="text-sm text-muted-foreground">Enter the full name of the subcontractor company</p>

              <Label htmlFor="trade-service">Trade/Service</Label>
              <Input
                id="trade-service" 
                value={newSubcontractor.trade} 
                onChange={e => setNewSubcontractor({...newSubcontractor, trade: e.target.value})} 
                required 
              />
              
              <Label htmlFor="contact-person">Contact Person</Label>
              <Input
                id="contact-person" 
                value={newSubcontractor.contactPerson} 
                onChange={e => setNewSubcontractor({...newSubcontractor, contactPerson: e.target.value})} 
              />
              
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone" 
                value={newSubcontractor.phone} 
                onChange={e => setNewSubcontractor({...newSubcontractor, phone: e.target.value})} 
              />
              
              <Label htmlFor="email">Email</Label>
              <Input
                id="email" 
                value={newSubcontractor.email} 
                onChange={e => setNewSubcontractor({...newSubcontractor, email: e.target.value})} 
              />
              
              <Label htmlFor="address">Address</Label>
              <textarea 
                id="address" 
                title="Address"
                placeholder="Enter subcontractor's full address"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newSubcontractor.address} 
                onChange={e => setNewSubcontractor({...newSubcontractor, address: e.target.value})} 
              />
              
              <Label htmlFor="contract-value">Contract Value</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{getCurrencySymbol(settings?.currency || project.settings?.currency)}</span>
                <Input
                  id="contract-value" 
                  type="number" 
                  value={newSubcontractor.contractValue} 
                  onChange={e => setNewSubcontractor({...newSubcontractor, contractValue: Number(e.target.value)})} 
                  min={0} 
                  step={0.01}
                  className="pl-7" // Adjust padding to make space for the currency symbol
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <div className="relative">
                    <Calendar size={16} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"/>
                    <Input 
                      id="start-date" 
                      type="date" 
                      value={newSubcontractor.startDate} 
                      onChange={e => setNewSubcontractor({...newSubcontractor, startDate: e.target.value})} 
                      className="pl-9" // Adjust padding for icon
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <div className="relative">
                    <Calendar size={16} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"/>
                    <Input 
                      id="end-date" 
                      type="date" 
                      value={newSubcontractor.endDate} 
                      onChange={e => setNewSubcontractor({...newSubcontractor, endDate: e.target.value})} 
                      className="pl-9" // Adjust padding for icon
                    />
                  </div>
                </div>
              </div>
              
              <Label htmlFor="status">Status</Label>
              <Select 
                value={newSubcontractor.status} 
                onValueChange={value => setNewSubcontractor({...newSubcontractor, status: value as any})}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            
              <h4 className="text-lg font-bold mt-3 text-primary">Structural Assets & Works</h4>
              <Label htmlFor="assigned-works">Assigned Works</Label>
              <Input
                id="assigned-works" 
                value={newSubcontractor.assignedWorks?.join(', ') || ''} 
                onChange={e => setNewSubcontractor({...newSubcontractor, assignedWorks: e.target.value.split(',').map(work => work.trim()).filter(work => work)})} 
                placeholder="Enter BOQ item IDs or work descriptions separated by commas"
              />
              <p className="text-sm text-muted-foreground">Enter BOQ item IDs or work descriptions separated by commas</p>

              <Label htmlFor="asset-categories">Asset Categories</Label>
              <Input
                id="asset-categories" 
                value={newSubcontractor.assetCategories?.join(', ') || ''} 
                onChange={e => setNewSubcontractor({...newSubcontractor, assetCategories: e.target.value.split(',').map(cat => cat.trim()).filter(cat => cat)})}
                placeholder="e.g., Bridges, Culverts, Retaining Walls"
              />
              <p className="text-sm text-muted-foreground">e.g., Bridges, Culverts, Retaining Walls</p>

              <Label htmlFor="certifications">Certifications</Label>
              <Input
                id="certifications" 
                value={newSubcontractor.certification?.join(', ') || ''} 
                onChange={e => setNewSubcontractor({...newSubcontractor, certification: e.target.value.split(',').map(cert => cert.trim()).filter(cert => cert)})}
                placeholder="e.g., Structural Engineer License, Safety Certification"
              />
              <p className="text-sm text-muted-foreground">e.g., Structural Engineer License, Safety Certification</p>
            </div>
          </div>
          <DialogFooter className="bg-slate-50 p-3 flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setIsSubcontractorModalOpen(false); setIsEditModalOpen(false); }} >
              <X className="mr-2 h-4 w-4" />Cancel
            </Button>
            <Button onClick={handleSaveSubcontractor} className="shadow-md hover:shadow-lg">
              <Save className="mr-2 h-4 w-4"/>
              {isEditModalOpen ? 'Update' : 'Save'} Contractor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={() => setIsPaymentModalOpen(false)} >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader className="font-bold flex items-center gap-1 bg-primary text-white p-2 rounded-t-lg">
            <DollarSign size={20} className="text-white" /> Record Payment
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-3 mt-1">
              <Label htmlFor="payment-date">Payment Date</Label>
              <div className="relative">
                <Calendar size={16} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"/>
                <Input 
                  id="payment-date" 
                  type="date" 
                  value={paymentForm.date} 
                  onChange={e => setPaymentForm({...paymentForm, date: e.target.value})} 
                  className="pl-9" // Adjust padding for icon
                />
              </div>

              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{getCurrencySymbol(settings?.currency || project.settings?.currency)}</span>
                <Input
                  id="amount" 
                  type="number" 
                  value={paymentForm.amount} 
                  onChange={e => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value) || 0})}
                  min={0} 
                  step={0.01}
                  required 
                  className="pl-7" // Adjust padding for currency symbol
                />
              </div>
              
              <Label htmlFor="reference-number">Reference Number</Label>
              <Input 
                id="reference-number" 
                value={paymentForm.reference} 
                onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})} 
                required 
              />
              
              <Label htmlFor="payment-type">Payment Type</Label>
              <Select 
                value={paymentForm.type} 
                onValueChange={value => setPaymentForm({...paymentForm, type: value as any})}
              >
                <SelectTrigger id="payment-type">
                  <SelectValue placeholder="Select payment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bill Payment">Bill Payment</SelectItem>
                  <SelectItem value="Advance">Advance</SelectItem>
                  <SelectItem value="Retention">Retention</SelectItem>
                  <SelectItem value="Final Payment">Final Payment</SelectItem>
                </SelectContent>
              </Select>
              
              <Label htmlFor="description">Description</Label>
              <textarea 
                id="description" 
                title="Description"
                placeholder="Enter payment description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={paymentForm.description} 
                onChange={e => setPaymentForm({...paymentForm, description: e.target.value})} 
              />
            </div>
          </div>
          <DialogFooter className="bg-gray-50 p-2 flex justify-end gap-2 rounded-b-lg">
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)} >
              <X className="mr-2 h-4 w-4" />Cancel
            </Button>
            <Button onClick={handleSavePayment} className="shadow-md hover:shadow-lg">
              <Save className="mr-2 h-4 w-4" />Save Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Snackbar replacement with sonner toast */}
    </div>
  );
};

export default SubcontractorModule;

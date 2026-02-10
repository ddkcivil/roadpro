import React, { useState, useMemo } from 'react';
import { Project, UserRole, AppSettings, ContractBill, SubcontractorBill, RFI, VariationOrder } from '../../types';
import { formatCurrency } from '../../utils/formatting/exportUtils';
import { getCurrencySymbol } from '../../utils/formatting/currencyUtils';
import { 
    Box, Typography, Button, Paper, Grid, Table, TableBody, TableCell,
    TableHead, TableRow, Chip, IconButton, Stack, Divider, Card,
    CardContent, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, InputAdornment, Tabs, Tab, FormControl, InputLabel, 
    Select, MenuItem, Autocomplete, LinearProgress, Tooltip, Alert
} from '@mui/material';
import { 
    Receipt, Printer, Plus, Calculator, History, X, Save, 
    ArrowRight, ArrowLeft, Landmark, FileCheck, TrendingUp, Edit3,
    AlertTriangle, CheckCircle2, FileSpreadsheet, FileDiff, Search,
    Clock, User, DollarSign, FileText, CheckCircle, Send, Calendar,
    Eye, Edit2, ShieldCheck, MessageSquare
} from 'lucide-react';

interface Props {
  project: Project;
  userRole: UserRole;
  settings: AppSettings;
  onProjectUpdate: (project: Project) => void;
}

const FinancialManagementHub: React.FC<Props> = ({ project, settings, onProjectUpdate, userRole }) => {
  const [activeTab, setActiveTab] = useState(0);
  
  // === CONTRACT BILLING STATE ===
  const [selectedIpcId, setSelectedIpcId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [ipcForm, setIpcForm] = useState<Partial<ContractBill>>({
    billNumber: '',
    date: new Date().toISOString().split('T')[0],
    dateOfMeasurement: new Date().toISOString().split('T')[0],
    orderOfBill: (project.contractBills?.length || 0) + 1,
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
    voNumber: `VO-${(project.variationOrders?.length || 0) + 1}`,
    title: '',
    date: new Date().toISOString().split('T')[0],
    reason: '',
    items: []
  });
  
  // === DATA SOURCES ===
  const contractBills = project.contractBills || [];
  const subcontractorBills = project.subcontractorBills || [];
  const rfis = project.rfis || [];
  const variationOrders = project.variationOrders || [];
  const subcontractors = project.agencies?.filter(a => a.type === 'subcontractor') || [];
  
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
      paymentPercentage: totalBilled > 0 ? (totalBilled / revisedContract) * 100 : 0
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
    <Box sx={{ height: 'calc(100vh - 140px)', overflowY: 'auto', p: 2 }}>
      <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
        <Box>
          <Typography variant="h5" fontWeight="900">Financial Management Hub</Typography>
          <Typography variant="body2" color="text.secondary">
            Unified billing, RFI, and variation order management
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button 
            variant="outlined" 
            startIcon={<Receipt size={16}/>} 
            onClick={handleCreateContractBill}
          >
            New Contract Bill
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<DollarSign size={16}/>} 
            onClick={handleCreateSubBill}
          >
            New Sub Bill
          </Button>
          <Button 
            variant="contained" 
            startIcon={<FileDiff size={16}/>} 
            onClick={handleCreateVo}
          >
            New Variation
          </Button>
        </Box>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Financial Overview" icon={<TrendingUp size={16} />} iconPosition="start" />
          <Tab label={`Contract Bills (${contractBills.length})`} icon={<Receipt size={16} />} iconPosition="start" />
          <Tab label={`Subcontractor Bills (${subcontractorBills.length})`} icon={<Landmark size={16} />} iconPosition="start" />
          <Tab label={`RFIs (${rfis.length})`} icon={<MessageSquare size={16} />} iconPosition="start" />
          <Tab label={`Variations (${variationOrders.length})`} icon={<FileDiff size={16} />} iconPosition="start" />
        </Tabs>

        <Box p={3}>
          {/* Financial Overview Tab */}
          {activeTab === 0 && (
            <Box>
              <Grid container spacing={3} mb={4}>
                <Grid item xs={12} md={6} lg={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="primary.main" fontWeight="bold">
                        {formatCurrency(financialStats.originalContract, settings)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Original Contract
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="warning.main" fontWeight="bold">
                        {formatCurrency(financialStats.variations, settings)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Variations
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="success.main" fontWeight="bold">
                        {formatCurrency(financialStats.revisedContract, settings)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Revised Contract
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="info.main" fontWeight="bold">
                        {financialStats.paymentPercentage.toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Payment Progress
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Contract Billing</Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={financialStats.paymentPercentage} 
                        sx={{ mb: 2 }}
                      />
                      <Typography variant="body2">
                        Billed: {formatCurrency(financialStats.totalBilled, settings)}
                      </Typography>
                      <Typography variant="body2">
                        Balance: {formatCurrency(financialStats.balanceToBill, settings)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Subcontractor Payments</Typography>
                      <Typography variant="h4" color="secondary.main" fontWeight="bold">
                        {formatCurrency(financialStats.totalSubBilled, settings)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Subcontractor Payments
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Contract Bills Tab */}
          {activeTab === 1 && (
            <Box>
              <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, mb: 3 }}>
                <Typography variant="h6">Contract Bills</Typography>
                <Typography variant="body2" color="text.secondary">
                  Interim Payment Certificates and contract billing records
                </Typography>
              </Paper>
              
              <Paper variant="outlined" sx={{ borderRadius: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'slate.50' }}>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Bill Number</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Amount</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {contractBills.map(bill => (
                      <TableRow key={bill.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {bill.billNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(bill.date).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {formatCurrency(bill.totalAmount || 0, settings)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label="Generated" 
                            size="small" 
                            color="success"
                            variant="filled"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small">
                            <Printer size={16} />
                          </IconButton>
                          <IconButton size="small">
                            <Eye size={16} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {contractBills.length === 0 && (
                  <Typography textAlign="center" color="text.secondary" py={4}>
                    No contract bills found
                  </Typography>
                )}
              </Paper>
            </Box>
          )}

          {/* Subcontractor Bills Tab */}
          {activeTab === 2 && (
            <Box>
              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="primary.main" fontWeight="bold">
                        {subcontractorBills.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Bills
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="success.main" fontWeight="bold">
                        {subcontractorBills.filter(b => b.status === 'Paid').length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Paid
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="warning.main" fontWeight="bold">
                        {subcontractorBills.filter(b => b.status === 'Pending').length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pending
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="info.main" fontWeight="bold">
                        {formatCurrency(
                          subcontractorBills.reduce((sum, b) => sum + (b.netAmount || 0), 0), 
                          settings
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Value
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Paper variant="outlined" sx={{ borderRadius: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'slate.50' }}>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Subcontractor</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Bill Number</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Amount</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Period</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {subcontractorBills.map(bill => {
                      const subcontractor = subcontractors.find(s => s.id === bill.subcontractorId);
                      return (
                        <TableRow key={bill.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {subcontractor?.name || 'Unknown'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{bill.billNumber}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {formatCurrency(bill.netAmount || 0, settings)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={bill.status} 
                              size="small" 
                              color={
                                bill.status === 'Paid' ? 'success' : 
                                bill.status === 'Pending' ? 'warning' : 'default'
                              }
                              variant="filled"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(bill.periodFrom).toLocaleDateString()} - {new Date(bill.periodTo).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <IconButton size="small">
                              <Printer size={16} />
                            </IconButton>
                            <IconButton size="small">
                              <Eye size={16} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Paper>
            </Box>
          )}

          {/* RFIs Tab */}
          {activeTab === 3 && (
            <Box>
              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="primary.main" fontWeight="bold">
                        {rfiStats.total}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total RFIs
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="warning.main" fontWeight="bold">
                        {rfiStats.pending}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pending
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="success.main" fontWeight="bold">
                        {rfiStats.approved}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Approved
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="error.main" fontWeight="bold">
                        {rfiStats.rejected}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Rejected
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      placeholder="Search RFIs..."
                      value={rfiSearchTerm}
                      onChange={(e) => setRfiSearchTerm(e.target.value)}
                      InputProps={{
                        startAdornment: <Search size={18} style={{ marginRight: 8 }} />
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Task Filter</InputLabel>
                      <Select
                        value={rfiTaskFilter}
                        label="Task Filter"
                        onChange={(e) => setRfiTaskFilter(e.target.value)}
                      >
                        <MenuItem value="all">All Tasks</MenuItem>
                        {/* Add actual tasks here */}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Paper>

              <Paper variant="outlined" sx={{ borderRadius: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'slate.50' }}>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>RFI Number</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Title</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Date</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRfis.map(rfi => (
                      <TableRow key={rfi.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            RFI-{rfi.id?.slice(0, 6)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{rfi.title}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={rfi.status} 
                            size="small" 
                            color={
                              rfi.status === 'Approved' ? 'success' : 
                              rfi.status === 'Pending' ? 'warning' : 'error'
                            }
                            variant="filled"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(rfi.date).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small">
                            <Eye size={16} />
                          </IconButton>
                          <IconButton size="small">
                            <Edit2 size={16} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </Box>
          )}

          {/* Variations Tab */}
          {activeTab === 4 && (
            <Box>
              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="primary.main" fontWeight="bold">
                        {voStats.total}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Variations
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="success.main" fontWeight="bold">
                        {voStats.approved}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Approved
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="warning.main" fontWeight="bold">
                        {voStats.pending}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pending
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="info.main" fontWeight="bold">
                        {formatCurrency(voStats.totalValue, settings)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Value
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, mb: 3 }}>
                <TextField
                  fullWidth
                  placeholder="Search variations..."
                  value={voSearchTerm}
                  onChange={(e) => setVoSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <Search size={18} style={{ marginRight: 8 }} />
                  }}
                />
              </Paper>

              <Paper variant="outlined" sx={{ borderRadius: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'slate.50' }}>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>VO Number</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Title</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Reason</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Amount</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredVos.map(vo => (
                      <TableRow key={vo.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {vo.voNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{vo.title}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{vo.reason}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {formatCurrency(vo.totalAmount || 0, settings)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={vo.status || 'Pending'} 
                            size="small" 
                            color={vo.status === 'Approved' ? 'success' : 'warning'}
                            variant="filled"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small">
                            <Eye size={16} />
                          </IconButton>
                          <IconButton size="small">
                            <Edit2 size={16} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default FinancialManagementHub;
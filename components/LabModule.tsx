import React, { useState, useMemo } from 'react';
import { 
    Button, TextField, Grid, Select, MenuItem, FormControl, InputLabel, 
    Typography, Box, Chip, Card, Paper, Stack, IconButton,
    Table, TableBody, TableCell, TableHead, TableRow, Divider, 
    InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions,
    Alert, LinearProgress, Avatar, Tabs, Tab, CardContent, Snackbar,
    Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import { 
    FlaskConical, Plus, Search, CheckCircle2, XCircle, 
    Trash2, Eye, Printer, AlertTriangle, Microscope,
    ShieldCheck, History, AlertOctagon, TrendingUp, Filter,
    Activity, Beaker, MapPin, ChevronDown
} from 'lucide-react';
import { Project, UserRole, LabTest, NCR, User } from '../types';

interface Props {
  project: Project;
  userRole: UserRole;
  onProjectUpdate: (project: Project) => void;
}

const TEST_PROTOCOLS = {
    'Soil': [
        { name: 'Field Dry Density (FDD)', code: 'FDD', parameters: ['Degree of Compaction (%)', 'Moisture Content (%)'], limit: 95, unit: '%' },
        { name: 'CBR Test', code: 'CBR', parameters: ['CBR Value (%)'], limit: 8, unit: '%' }
    ],
    'Aggregate': [
        { name: 'Aggregate Impact Value', code: 'AIV', parameters: ['AIV (%)'], limit: 30, unit: '%', inverse: true },
        { name: 'Los Angeles Abrasion', code: 'LAA', parameters: ['Loss (%)'], limit: 40, unit: '%', inverse: true }
    ],
    'Concrete': [
        { name: 'Compressive Strength (7d)', code: 'CUB7', parameters: ['Strength (MPa)'], limit: 17, unit: 'MPa' },
        { name: 'Compressive Strength (28d)', code: 'CUB28', parameters: ['Strength (MPa)'], limit: 25, unit: 'MPa' },
        { name: 'Slump Test', code: 'SLMP', parameters: ['Slump Value (mm)'], limit: 75, unit: 'mm' }
    ],
    'Bitumen': [
        { name: 'Binder Content', code: 'BEXT', parameters: ['Bitumen (%)'], limit: 5, unit: '%' },
        { name: 'Penetration Test', code: 'PENE', parameters: ['Pen (mm/10)'], limit: 60, unit: 'mm/10' }
    ]
};

const LabModule: React.FC<Props> = ({ project, userRole, onProjectUpdate }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNcrModalOpen, setIsNcrModalOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  
  const [newTestCategory, setNewTestCategory] = useState<keyof typeof TEST_PROTOCOLS>('Soil');
  const [selectedType, setSelectedType] = useState<any>(null);
  const [testForm, setTestForm] = useState({
      sampleId: '',
      location: '',
      date: new Date().toISOString().split('T')[0],
      assetId: '',
      technicianId: '', // Will be populated dynamically
      testData: {} as Record<string, number>,
  });

  const [ncrForm, setNcrForm] = useState<Partial<NCR>>({
      description: '',
      location: '',
      severity: 'Medium',
      linkedTestId: ''
  });

  const labTests = project.labTests || [];

  const stats = useMemo(() => {
      const total = labTests.length;
      const passed = labTests.filter(t => t.result === 'Pass').length;
      const failed = labTests.filter(t => t.result === 'Fail').length;
      const passRate = total > 0 ? Math.round((passed / total) * 100) : 100;
      return { total, passed, failed, passRate };
  }, [labTests]);

  const filteredTests = useMemo(() => {
      return labTests.filter(t => 
          t.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.sampleId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.location.toLowerCase().includes(searchTerm.toLowerCase())
      ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [labTests, searchTerm]);

  const handleSaveTest = () => {
      if (!testForm.sampleId || !selectedType) return;
      
      const mainVal = Object.values(testForm.testData)[0] || 0;
      const isPass = selectedType.inverse ? mainVal <= selectedType.limit : mainVal >= selectedType.limit;
      
      // Get technician name from project users or use role as fallback
      const savedUsers = localStorage.getItem('roadmaster-users');
      const users: User[] = savedUsers ? JSON.parse(savedUsers) : [];
      const technician = users.find(u => u.id === testForm.technicianId)?.name || userRole;

      const newEntry: LabTest = {
          id: `LAB-${Date.now()}`,
          testName: selectedType.name,
          category: newTestCategory as any,
          sampleId: testForm.sampleId,
          date: testForm.date,
          location: testForm.location,
          result: isPass ? 'Pass' : 'Fail',
          assetId: testForm.assetId,
          testData: testForm.testData,
          calculatedValue: `${mainVal} ${selectedType.unit}`,
          standardLimit: `${selectedType.limit} ${selectedType.unit}`,
          technician: technician
      };

      onProjectUpdate({ ...project, labTests: [...labTests, newEntry] });
      setActiveTab(1);
      setSnackbarOpen(true);
      setTestForm({ ...testForm, sampleId: '', location: '', testData: {} });
  };

  const handleInitiateNcr = (test: LabTest) => {
      setNcrForm({
          description: `Quality Failure: ${test.testName} at ${test.location}. Value recorded was ${test.calculatedValue} against requirement of ${test.standardLimit}.`,
          location: test.location,
          severity: 'High',
          linkedTestId: test.id
      });
      setIsNcrModalOpen(true);
  };

  return (
    <Box className="animate-in fade-in duration-500">
      <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
          <Box>
              <Typography variant="caption" fontWeight="900" color="primary.main" sx={{ letterSpacing: '0.2em', textTransform: 'uppercase', mb: 0.5, display: 'block' }}>MATERIAL ASSURANCE</Typography>
              <Typography variant="h4" fontWeight="900" sx={{ letterSpacing: '-0.05em' }}>Lab Registry & Quality Control</Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
              <Button variant="outlined" startIcon={<History size={16}/>} sx={{ borderRadius: 2, paddingX: 2, paddingY: 1, textTransform: 'none', fontWeight: 600 }}>Monthly Register</Button>
              <Button variant="contained" color="secondary" startIcon={<Printer size={16}/>} sx={{ borderRadius: 2, paddingX: 2, paddingY: 1, textTransform: 'none', fontWeight: 600 }}>Export Certificate</Button>
          </Stack>
      </Box>

      <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined" sx={{ borderRadius: 3, height: '100%', borderLeft: '4px solid #4f46e5' }}>
                  <CardContent sx={{ p: 3 }}>
                      <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 48, height: 48 }}><Activity size={20}/></Avatar>
                          <Box>
                              <Typography variant="caption" fontWeight="bold" color="text.secondary" textTransform="uppercase" fontSize="0.75rem">Total Tests</Typography>
                              <Typography variant="h4" fontWeight="800" color="text.primary">{stats.total}</Typography>
                          </Box>
                      </Stack>
                  </CardContent>
              </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined" sx={{ borderRadius: 3, height: '100%', borderLeft: '4px solid #10b981' }}>
                  <CardContent sx={{ p: 3 }}>
                      <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar sx={{ bgcolor: 'success.light', color: 'success.main', width: 48, height: 48 }}><ShieldCheck size={20}/></Avatar>
                          <Box>
                              <Typography variant="caption" fontWeight="bold" color="text.secondary" textTransform="uppercase" fontSize="0.75rem">Pass Rate</Typography>
                              <Typography variant="h4" fontWeight="800" color="success.main">{stats.passRate}%</Typography>
                          </Box>
                      </Stack>
                      <LinearProgress variant="determinate" value={stats.passRate} color="success" sx={{ mt: 2, height: 8, borderRadius: 4 }} />
                  </CardContent>
              </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined" sx={{ borderRadius: 3, height: '100%', borderLeft: '4px solid #ef4444' }}>
                  <CardContent sx={{ p: 3 }}>
                      <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar sx={{ bgcolor: 'error.light', color: 'error.main', width: 48, height: 48 }}><AlertOctagon size={20}/></Avatar>
                          <Box>
                              <Typography variant="caption" fontWeight="bold" color="text.secondary" textTransform="uppercase" fontSize="0.75rem">Critical Fails</Typography>
                              <Typography variant="h4" fontWeight="800" color="error.main">{stats.failed}</Typography>
                          </Box>
                      </Stack>
                  </CardContent>
              </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined" sx={{ borderRadius: 3, height: '100%', borderLeft: '4px solid #3b82f6' }}>
                  <CardContent sx={{ p: 3 }}>
                      <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar sx={{ bgcolor: 'info.light', color: 'info.main', width: 48, height: 48 }}><Beaker size={20}/></Avatar>
                          <Box>
                              <Typography variant="caption" fontWeight="bold" color="text.secondary" textTransform="uppercase" fontSize="0.75rem">QA Status</Typography>
                              <Typography variant="h4" fontWeight="800" color="text.primary">Healthy</Typography>
                          </Box>
                      </Stack>
                  </CardContent>
              </Card>
          </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', bgcolor: 'white' }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="Test Entry" icon={<FlaskConical size={18}/>} iconPosition="start" sx={{ fontWeight: '600', minHeight: 56, textTransform: 'none', fontSize: '0.875rem' }} />
              <Tab label="Historical Logs" icon={<History size={18}/>} iconPosition="start" sx={{ fontWeight: '600', minHeight: 56, textTransform: 'none', fontSize: '0.875rem' }} />
              <Tab label="Material Trends" icon={<TrendingUp size={18}/>} iconPosition="start" sx={{ fontWeight: '600', minHeight: 56, textTransform: 'none', fontSize: '0.875rem' }} />
          </Tabs>

          <Box p={3}>
              {activeTab === 0 && (
                  <Grid container spacing={4}>
                    <Grid item xs={12} md={4}>
                        <Accordion defaultExpanded sx={{ borderRadius: 3 }}>
                            <AccordionSummary expandIcon={<ChevronDown />} sx={{ bgcolor: '#f8fafc', borderBottom: 1, borderColor: 'divider' }}>
                                <Typography variant="subtitle2" fontWeight="900" color="text.secondary" sx={{ letterSpacing: 1 }}>SAMPLE CONTEXT</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Stack spacing={3} mt={1}>
                                    <TextField label="Batch / Sample ID" fullWidth size="small" placeholder="e.g. CONC/322/2024" value={testForm.sampleId} onChange={e => setTestForm({...testForm, sampleId: e.target.value})} />
                                    <TextField label="Chainage / GPS Location" fullWidth size="small" value={testForm.location} onChange={e => setTestForm({...testForm, location: e.target.value})} />
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Target Asset</InputLabel>
                                        <Select value={testForm.assetId} label="Target Asset" onChange={e => setTestForm({...testForm, assetId: e.target.value})}>
                                            <MenuItem value=""><em>General / Alignment</em></MenuItem>
                                            {(project.structures || []).map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem> )}
                                        </Select>
                                    </FormControl>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Assigned Technician</InputLabel>
                                        <Select value={testForm.technicianId} label="Assigned Technician" onChange={e => setTestForm({...testForm, technicianId: e.target.value})}>
                                            {(() => {
                                              const savedUsers = localStorage.getItem('roadmaster-users');
                                              const users: User[] = savedUsers ? JSON.parse(savedUsers) : [];
                                              return users.map(u => <MenuItem key={u.id} value={u.id}>{u.name} ({u.role})</MenuItem> );
                                            })()}
                                        </Select>
                                    </FormControl>
                                    <TextField label="Testing Date" type="date" InputLabelProps={{ shrink: true }} fullWidth size="small" value={testForm.date} onChange={e => setTestForm({...testForm, date: e.target.value})} />
                                </Stack>
                            </AccordionDetails>
                        </Accordion>
                    </Grid>
                  
                    <Grid item xs={12} md={8}>
                        <Accordion defaultExpanded sx={{ borderRadius: 3, height: '100%' }}>
                            <AccordionSummary expandIcon={<ChevronDown />} sx={{ bgcolor: '#f8fafc', borderBottom: 1, borderColor: 'divider' }}>
                                <Typography variant="subtitle2" fontWeight="900" color="text.secondary" sx={{ letterSpacing: 1 }}>ENGINEERING PROTOCOL</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Grid container spacing={2} mb={3} mt={1}>
                                    <Grid item xs={6}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Material Class</InputLabel>
                                            <Select value={newTestCategory} label="Material Class" onChange={e => { setNewTestCategory(e.target.value as any); setSelectedType(null); }}>
                                                {Object.keys(TEST_PROTOCOLS).map(cat => <MenuItem key={cat} value={cat}>{cat}</MenuItem> )}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Test Standard</InputLabel>
                                            <Select value={selectedType?.name || ''} label="Test Standard" onChange={e => setSelectedType(TEST_PROTOCOLS[newTestCategory].find((t:any) => t.name === e.target.value))}>
                                                {(TEST_PROTOCOLS[newTestCategory] as any[]).map(t => <MenuItem key={t.name} value={t.name}>{t.name}</MenuItem> )}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                </Grid>
                        
                                {selectedType ? (
                                    <Stack spacing={3}>
                                        <Alert severity="info" icon={<ShieldCheck size={20}/>} sx={{ borderRadius: 2 }}>
                                            Verification limit for <strong>{selectedType.name}</strong> is <strong>{selectedType.inverse ? 'Maximum' : 'Minimum'} {selectedType.limit}{selectedType.unit}</strong>.
                                        </Alert>
                                        <Grid container spacing={3}>
                                            {selectedType.parameters.map((param: string) => (
                                                <Grid item xs={6} key={param}>
                                                    <TextField 
                                                        fullWidth label={param} type="number" size="small" 
                                                        value={testForm.testData[param] || ''} 
                                                        onChange={e => setTestForm({...testForm, testData: {...testForm.testData, [param]: Number(e.target.value)}})} 
                                                        InputProps={{ 
                                                            endAdornment: <InputAdornment position="end"><Typography variant="caption" fontWeight="bold">{selectedType.unit}</Typography></InputAdornment>,
                                                            sx: { bgcolor: 'white' }
                                                        }} 
                                                    />
                                                </Grid>
                                            ))}
                                        </Grid>
                                        <Box mt={2} sx={{ p: 2, bgcolor: 'white', borderRadius: 2, border: '1px dashed #cbd5e1', textAlign: 'right' }}>
                                            <Button 
                                                variant="contained" 
                                                size="large" 
                                                onClick={handleSaveTest} 
                                                startIcon={<CheckCircle2/>}
                                                disabled={!testForm.sampleId || Object.keys(testForm.testData).length === 0}
                                                sx={{ px: 4, borderRadius: 2 }}
                                            >
                                                Certify & Record Result
                                            </Button>
                                        </Box>
                                    </Stack>
                                ) : (
                                    <Box py={8} textAlign="center" color="text.disabled">
                                        <Microscope size={64} strokeWidth={1} className="mx-auto opacity-20 mb-3" />
                                        <Typography variant="body2" fontWeight="500">Select a material and test standard to input field observations.</Typography>
                                    </Box>
                                )}
                            </AccordionDetails>
                        </Accordion>
                    </Grid>
                  </Grid>
              )}

              {activeTab === 1 && (
                  <Box>
                      <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                          <TextField 
                            size="small" placeholder="Search by ID, location or test type..." 
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            sx={{ width: 400, bgcolor: 'white', borderRadius: 2 }}
                            InputProps={{ startAdornment: <Search size={16} className="text-slate-400 mr-2"/> }}
                          />
                          <Button variant="outlined" startIcon={<Filter size={16}/>}>Filter Results</Button>
                      </Box>
                      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', bgcolor: '#f8fafc' }} >
                        <Table size="small">
                            <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Sample / Technical Ref</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Test Classification</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Value</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredTests.map(test => (
                                    <TableRow key={test.id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="900" sx={{ fontFamily: 'monospace', color: '#4f46e5' }}>{test.sampleId}</Typography>
                                            <Typography variant="caption" color="text.secondary">{test.date}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="bold">{test.testName}</Typography>
                                            <Chip label={test.category} size="small" variant="outlined" sx={{ height: 16, fontSize: 8, fontWeight: 'black', textTransform: 'uppercase', mt: 0.5 }} />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <MapPin size={10} /> {test.location}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="900" className="text-mono">{test.calculatedValue}</Typography>
                                            <Typography variant="caption" color="text.disabled">Req: {test.standardLimit}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={test.result.toUpperCase()} 
                                                size="small" 
                                                color={test.result === 'Pass' ? 'success' : 'error'} 
                                                sx={{ fontWeight: '900', fontSize: 10, width: 70 }} 
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                {test.result === 'Fail' && (
                                                    <IconButton size="small" color="error" onClick={() => handleInitiateNcr(test)} sx={{ bgcolor: '#fef2f2' }}>
                                                        <AlertTriangle size={16}/>
                                                    </IconButton>
                                                )}
                                                <IconButton size="small"><Eye size={16}/></IconButton>
                                                <IconButton size="small"><Printer size={16}/></IconButton>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredTests.length === 0 && (
                                    <TableRow>
                                        <td colSpan={6} align="center" style={{ padding: '40px', textAlign: 'center' }}>
                                            <Beaker size={48} strokeWidth={1} className="text-slate-200 mb-2 mx-auto"/>
                                            <Typography color="text.disabled">No test records matching your query.</Typography>
                                        </td>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                      </Paper>
                  </Box>
              )}

              {activeTab === 2 && (
                  <Box>
                      <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                          <TextField 
                              size="small" 
                              placeholder="Search trends..." 
                              value={searchTerm} 
                              onChange={e => setSearchTerm(e.target.value)}
                              sx={{ width: 400, bgcolor: 'white', borderRadius: 2 }}
                              InputProps={{ startAdornment: <Search size={16} className="text-slate-400 mr-2"/> }}
                          />
                          <Button variant="outlined" startIcon={<Filter size={16}/>}>Filter Trends</Button>
                      </Box>
                      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', bgcolor: '#f8fafc' }}>
                          <Box py={10} textAlign="center">
                              <TrendingUp size={64} strokeWidth={1} className="text-slate-200 mx-auto mb-4" />
                              <Typography variant="h6" color="text.secondary" fontWeight="bold">Material Performance Analytics</Typography>
                              <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 450, mx: 'auto', mt: 1 }}>
                                  Aggregated trends for concrete strength and soil compaction will appear here as more data points are logged.
                              </Typography>
                          </Box>
                      </Paper>
                  </Box>
              )}
          </Box>
      </Paper>

      {/* NCR Dialog */}
      <Dialog open={isNcrModalOpen} onClose={() => setIsNcrModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ bgcolor: 'error.main', color: 'white', display: 'flex', alignItems: 'center', gap: 1.5, p: 2 }}>
              <AlertOctagon size={24} />
              <Typography variant="h6" fontWeight="bold">Initiate Non-Conformance Report</Typography>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
              <Stack spacing={3} mt={1}>
                  <Alert severity="error" sx={{ borderRadius: 2 }}>
                      This NCR is linked to failed sample <b>{filteredTests.find(t => t.id === ncrForm.linkedTestId)?.sampleId}</b>.
                  </Alert>
                  <TextField label="Deviation Description" fullWidth multiline rows={3} value={ncrForm.description} onChange={e => setNcrForm({...ncrForm, description: e.target.value})} />
                  <FormControl fullWidth size="small">
                      <InputLabel>Risk Severity</InputLabel>
                      <Select value={ncrForm.severity} label="Risk Severity" onChange={e => setNcrForm({...ncrForm, severity: e.target.value as any})}>
                          <MenuItem value="Low">Low - Rectifiable</MenuItem>
                          <MenuItem value="Medium">Medium - Correction Required</MenuItem>
                          <MenuItem value="High">High - Structural Concern</MenuItem>
                          <MenuItem value="Critical">Critical - Immediate Rejection</MenuItem>
                      </Select>
                  </FormControl>
              </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
              <Button onClick={() => setIsNcrModalOpen(false)}>Discard</Button>
              <Button variant="contained" color="error" startIcon={<CheckCircle2/>} onClick={() => { setIsNcrModalOpen(false); setSnackbarOpen(true); }}>Issue NCR Draft</Button>
          </DialogActions>
      </Dialog>

      <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={() => setSnackbarOpen(false)}>
          <Alert severity="success" sx={{ borderRadius: 2, bgcolor: '#0f172a', color: 'white' }}>Test result archived and quality ledger updated.</Alert>
      </Snackbar>
    </Box>
  );
};

export default LabModule;
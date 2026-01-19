import React, { useState, useMemo } from 'react';
import { 
    Button, TextField, Grid, Select, MenuItem, FormControl, InputLabel, 
    Typography, Box, Chip, Card, Paper, Stack, IconButton, Tooltip,
    Table, TableBody, TableCell, TableHead, TableRow, Divider, 
    InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions,
    Alert, LinearProgress, Avatar, Tabs, Tab, CardContent, Snackbar,
    Accordion, AccordionSummary, AccordionDetails,
    List, ListItem, ListItemIcon, ListItemText
} from '@mui/material';
import { 
    Shield, ShieldCheck, AlertTriangle, FileText, Activity, TrendingUp, 
    Eye, Printer, Filter, Search, Plus, X, CheckCircle2, Flame,
    ChevronDown, Wrench, Package, Scale, Ruler, Thermometer,
    Droplets, Wind, Sun, Zap, Layers, Users, Calendar,
    Clock, MapPin, Info, History
} from 'lucide-react';
import { Project, UserRole, LabTest, NCR, RFI, User } from '../types';

interface Props {
  project: Project;
  userRole: UserRole;
  onProjectUpdate: (project: Project) => void;
}

const QualityHub: React.FC<Props> = ({ project, userRole, onProjectUpdate }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | false>('lab-tests');

  const labTests = project.labTests || [];
  const ncRs = project.ncrs || [];
  const rfis = project.rfis || [];

  const stats = useMemo(() => {
    const totalTests = labTests.length;
    const passedTests = labTests.filter(t => t.result === 'Pass').length;
    const failedTests = labTests.filter(t => t.result === 'Fail').length;
    const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 100;
    
    const totalNCRs = ncRs.length;
    const openNCRs = ncRs.filter(n => n.status === 'Open' || n.status === 'Correction Pending').length;
    const closedNCRs = ncRs.filter(n => n.status === 'Closed').length;
    
    const totalRFIs = rfis.length;
    const openRFIs = rfis.filter(r => r.status === 'Open').length;
    const answeredRFIs = rfis.filter(r => r.status === 'Approved' || r.status === 'Closed').length;

    return { 
      totalTests, passedTests, failedTests, passRate,
      totalNCRs, openNCRs, closedNCRs,
      totalRFIs, openRFIs, answeredRFIs
    };
  }, [labTests, ncRs, rfis]);

  const filteredLabTests = useMemo(() => {
    return labTests.filter(t => 
        t.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.sampleId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.location.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5);
  }, [labTests, searchTerm]);

  const filteredNCRs = useMemo(() => {
    return ncRs.filter(n => 
        n.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.ncrNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.location.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5);
  }, [ncRs, searchTerm]);

  const filteredRFIs = useMemo(() => {
    return rfis.filter(r => 
        r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.rfiNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.location.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5);
  }, [rfis, searchTerm]);

  const handleExpandChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedSection(isExpanded ? panel : false);
  };

  return (
    <Box className="animate-in fade-in duration-500">
      <Box display="flex" justifyContent="space-between" mb={2} alignItems="center">
        <Box>
          <Typography variant="caption" fontWeight="900" color="primary" sx={{ letterSpacing: '0.2em', textTransform: 'uppercase' }}>QUALITY ASSURANCE</Typography>
          <Typography variant="h4" fontWeight="900">Quality Hub & Compliance Center</Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<History size={16}/>} sx={{ borderRadius: 2, paddingX: 1.5, paddingY: 0.75 }}>Monthly Register</Button>
          <Button variant="contained" color="secondary" startIcon={<Printer size={16}/>} sx={{ borderRadius: 2, paddingX: 1.5, paddingY: 0.75 }}>Export Certificate</Button>
        </Stack>
      </Box>

      {/* Quality Overview Stats */}
      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: 'white' }}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: '#eef2ff', color: '#4f46e5' }}><Scale size={18}/></Avatar>
                <Box>
                  <Typography variant="caption" fontWeight="bold" color="text.secondary">LAB TESTS</Typography>
                  <Typography variant="h5" fontWeight="900">{stats.totalTests}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 4, bgcolor: 'white' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: '#ecfdf5', color: '#10b981' }}><ShieldCheck size={20}/></Avatar>
                <Box>
                  <Typography variant="caption" fontWeight="bold" color="text.secondary">PASS RATE</Typography>
                  <Typography variant="h5" fontWeight="900" color="success.main">{stats.passRate}%</Typography>
                </Box>
              </Stack>
              <LinearProgress variant="determinate" value={stats.passRate} color="success" sx={{ mt: 1.5, height: 4, borderRadius: 2 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 4, borderLeft: '6px solid #ef4444', bgcolor: 'white' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: '#fef2f2', color: '#ef4444' }}><AlertTriangle size={20}/></Avatar>
                <Box>
                  <Typography variant="caption" fontWeight="bold" color="text.secondary">OPEN NCrs</Typography>
                  <Typography variant="h5" fontWeight="900" color="error.main">{stats.openNCRs}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 4, bgcolor: 'white' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: '#fffbeb', color: '#f59e0b' }}><FileText size={20}/></Avatar>
                <Box>
                  <Typography variant="caption" fontWeight="bold" color="text.secondary">OPEN RFIs</Typography>
                  <Typography variant="h5" fontWeight="900" color="warning.main">{stats.openRFIs}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quality Status Overview */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Activity size={20} className="text-blue-600 mr-2" />
                <Typography variant="h6" fontWeight="bold">Overall Quality Status</Typography>
              </Box>
              <LinearProgress variant="determinate" value={stats.passRate} color="success" sx={{ height: 8, borderRadius: 4, mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {stats.passedTests} of {stats.totalTests} tests passed
              </Typography>
              <Box mt={2} display="flex" justifyContent="space-around">
                <Box textAlign="center">
                  <Typography variant="h6" color="success.main" fontWeight="bold">{stats.passedTests}</Typography>
                  <Typography variant="caption" color="text.secondary">Passed</Typography>
                </Box>
                <Box textAlign="center">
                  <Typography variant="h6" color="error.main" fontWeight="bold">{stats.failedTests}</Typography>
                  <Typography variant="caption" color="text.secondary">Failed</Typography>
                </Box>
                <Box textAlign="center">
                  <Typography variant="h6" color="warning.main" fontWeight="bold">{stats.openNCRs}</Typography>
                  <Typography variant="caption" color="text.secondary">NCRs</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Flame size={20} className="text-orange-600 mr-2" />
                <Typography variant="h6" fontWeight="bold">Critical Areas</Typography>
              </Box>
              <List>
                <ListItem>
                  <ListItemIcon><AlertTriangle size={16} className="text-red-500" /></ListItemIcon>
                  <ListItemText primary="Soil Compaction" secondary="2 failing tests" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><AlertTriangle size={16} className="text-red-500" /></ListItemIcon>
                  <ListItemText primary="Concrete Strength" secondary="1 failing test" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><AlertTriangle size={16} className="text-yellow-500" /></ListItemIcon>
                  <ListItemText primary="Asphalt Density" secondary="Monitoring" />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <TrendingUp size={20} className="text-green-600 mr-2" />
                <Typography variant="h6" fontWeight="bold">Quality Trends</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Quality metrics over the last 30 days:
              </Typography>
              <Box display="flex" alignItems="center">
                <TrendingUp size={20} className="text-green-500 mr-1" />
                <Typography variant="body2" color="success.main">+12% improvement</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                from previous period
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quality Hub Tabs */}
      <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden', bgcolor: 'white' }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ bgcolor: 'slate.50', borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Quality Dashboard" icon={<Shield size={18}/>} iconPosition="start" sx={{ fontWeight: '700', minHeight: 60 }} />
          <Tab label="Lab Tests" icon={<Scale size={18}/>} iconPosition="start" sx={{ fontWeight: '700', minHeight: 60 }} />
          <Tab label="NCRs" icon={<AlertTriangle size={18}/>} iconPosition="start" sx={{ fontWeight: '700', minHeight: 60 }} />
          <Tab label="RFIs" icon={<FileText size={18}/>} iconPosition="start" sx={{ fontWeight: '700', minHeight: 60 }} />
        </Tabs>

        <Box p={2}>
          {activeTab === 0 && (
            <Box>
              {/* Quality Summary Cards */}
              <Grid container spacing={3} mb={4}>
                <Grid item xs={12} md={6}>
                  <Accordion expanded={expandedSection === 'lab-tests'} onChange={handleExpandChange('lab-tests')} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                    <AccordionSummary expandIcon={<ChevronDown />} sx={{ bgcolor: '#f8fafc', borderBottom: 1, borderColor: 'divider' }}>
                      <Box display="flex" alignItems="center">
                        <Scale size={20} className="mr-2 text-blue-600" />
                        <Typography variant="h6" fontWeight="bold">Recent Lab Tests</Typography>
                        <Chip label={`${labTests.length} tests`} size="small" color="primary" sx={{ ml: 2 }} />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Sample ID</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Location</TableCell>
                            <TableCell>Result</TableCell>
                            <TableCell>Date</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredLabTests.map(test => (
                            <TableRow key={test.id}>
                              <TableCell>{test.sampleId}</TableCell>
                              <TableCell>{test.testName}</TableCell>
                              <TableCell>{test.location}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={test.result} 
                                  size="small" 
                                  color={test.result === 'Pass' ? 'success' : 'error'} 
                                  sx={{ fontWeight: 'bold' }}
                                />
                              </TableCell>
                              <TableCell>{test.date}</TableCell>
                            </TableRow>
                          ))}
                          {filteredLabTests.length === 0 && (
                            <TableRow>
                              <td colSpan={5} style={{ textAlign: 'center', padding: '16px 16px' }}>
                                <Typography color="text.disabled">No recent lab tests</Typography>
                              </td>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </AccordionDetails>
                  </Accordion>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Accordion expanded={expandedSection === 'ncrs'} onChange={handleExpandChange('ncrs')} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                    <AccordionSummary expandIcon={<ChevronDown />} sx={{ bgcolor: '#f8fafc', borderBottom: 1, borderColor: 'divider' }}>
                      <Box display="flex" alignItems="center">
                        <AlertTriangle size={20} className="mr-2 text-red-600" />
                        <Typography variant="h6" fontWeight="bold">Non-Conformance Reports</Typography>
                        <Chip label={`${ncRs.length} NCRs`} size="small" color="error" sx={{ ml: 2 }} />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>NCR #</TableCell>
                            <TableCell>Location</TableCell>
                            <TableCell>Severity</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Date</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredNCRs.map(ncr => (
                            <TableRow key={ncr.id}>
                              <TableCell>{ncr.ncrNumber}</TableCell>
                              <TableCell>{ncr.location}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={ncr.severity} 
                                  size="small" 
                                  color={
                                    ncr.severity === 'Critical' ? 'error' : 
                                    ncr.severity === 'High' ? 'warning' : 
                                    'info'
                                  } 
                                />
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={ncr.status} 
                                  size="small" 
                                  color={
                                    ncr.status === 'Open' ? 'warning' : 
                                    ncr.status === 'Closed' ? 'success' : 
                                    'info'
                                  } 
                                />
                              </TableCell>
                              <TableCell>{ncr.dateRaised}</TableCell>
                            </TableRow>
                          ))}
                          {filteredNCRs.length === 0 && (
                            <TableRow>
                              <td colSpan={5} style={{ textAlign: 'center', padding: '16px 16px' }}>
                                <Typography color="text.disabled">No active NCRs</Typography>
                              </td>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </AccordionDetails>
                  </Accordion>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Accordion expanded={expandedSection === 'rfis'} onChange={handleExpandChange('rfis')} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                    <AccordionSummary expandIcon={<ChevronDown />} sx={{ bgcolor: '#f8fafc', borderBottom: 1, borderColor: 'divider' }} >
                      <Box display="flex" alignItems="center">
                        <FileText size={20} className="mr-2 text-purple-600" />
                        <Typography variant="h6" fontWeight="bold">Requests for Information</Typography>
                        <Chip label={`${rfis.length} RFIs`} size="small" color="secondary" sx={{ ml: 2 }} />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>RFI #</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Priority</TableCell>
                            <TableCell>Date</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredRFIs.map(rfi => (
                            <TableRow key={rfi.id}>
                              <TableCell>{rfi.rfiNumber}</TableCell>
                              <TableCell>{rfi.description.substring(0, 30)}...</TableCell>
                              <TableCell>
                                <Chip 
                                  label={rfi.status} 
                                  size="small" 
                                  color={
                                    rfi.status === 'Open' ? 'warning' : 
                                    rfi.status === 'Approved' ? 'success' : 
                                    'info'
                                  } 
                                />
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={rfi.priority} 
                                  size="small" 
                                  color={
                                    rfi.priority === 'High' ? 'error' : 
                                    rfi.priority === 'Medium' ? 'warning' : 
                                    'info'
                                  } 
                                />
                              </TableCell>
                              <TableCell>{rfi.date}</TableCell>
                            </TableRow>
                          ))}
                          {filteredRFIs.length === 0 && (
                            <TableRow>
                              <td colSpan={5} style={{ textAlign: 'center', padding: '16px 16px' }}>
                                <Typography color="text.disabled">No active RFIs</Typography>
                              </td>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </AccordionDetails>
                  </Accordion>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Info size={20} className="text-blue-600 mr-2" />
                        <Typography variant="h6" fontWeight="bold">Quality Insights</Typography>
                      </Box>
                      <List>
                        <ListItem>
                          <ListItemIcon><ShieldCheck size={16} className="text-green-500" /></ListItemIcon>
                          <ListItemText 
                            primary="Concrete strength trending upward" 
                            secondary="Average strength increased by 15% over last week" 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><AlertTriangle size={16} className="text-yellow-500" /></ListItemIcon>
                          <ListItemText 
                            primary="Soil compaction monitoring" 
                            secondary="2 locations showing below threshold values" 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><TrendingUp size={16} className="text-blue-500" /></ListItemIcon>
                          <ListItemText 
                            primary="NCR closure rate improving" 
                            secondary="75% of NCRs resolved within target timeframe" 
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {activeTab === 1 && (
            <Box>
              <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                <TextField 
                  size="small" 
                  placeholder="Search lab tests..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)}
                  sx={{ width: 400, bgcolor: 'white' }}
                  InputProps={{ startAdornment: <Search size={16} className="text-slate-400 mr-2"/> }}
                />
                <Button variant="outlined" startIcon={<Filter size={16}/>}>Filter Results</Button>
              </Box>
              <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', bgcolor: '#f8fafc' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Sample ID</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Test Type</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Result</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Value</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredLabTests.map(test => (
                      <TableRow key={test.id} hover>
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
                        <TableCell>
                          <Tooltip title="Test Technician">
                            <Chip 
                              label={test.technician || 'Unknown'} 
                              size="small" 
                              variant="outlined"
                              sx={{ fontSize: 10 }} 
                            />
                          </Tooltip>
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <IconButton size="small"><Eye size={16}/></IconButton>
                            <IconButton size="small"><Printer size={16}/></IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredLabTests.length === 0 && (
                      <TableRow>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '40px 16px' }}>
                          <Scale size={48} strokeWidth={1} className="text-slate-200 mb-2 mx-auto"/>
                          <Typography color="text.disabled">No lab test records matching your query.</Typography>
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
                  placeholder="Search NCRs..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)}
                  sx={{ width: 400, bgcolor: 'white' }}
                  InputProps={{ startAdornment: <Search size={16} className="text-slate-400 mr-2"/> }}
                />
                <Button variant="contained" startIcon={<Plus size={16}/>}>New NCR</Button>
              </Box>
              <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', bgcolor: '#f8fafc' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', py: 2 }}>NCR #</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Severity</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Raised By</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredNCRs.map(ncr => (
                      <TableRow key={ncr.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="900" sx={{ fontFamily: 'monospace', color: '#ef4444' }}>{ncr.ncrNumber}</Typography>
                          <Typography variant="caption" color="text.secondary">{ncr.dateRaised}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{ncr.description.substring(0, 50)}...</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <MapPin size={10} /> {ncr.location}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={ncr.severity} 
                            size="small" 
                            color={
                              ncr.severity === 'Critical' ? 'error' : 
                              ncr.severity === 'High' ? 'warning' : 
                              ncr.severity === 'Medium' ? 'info' : 
                              'default'
                            } 
                            sx={{ fontWeight: 'bold' }} 
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={ncr.status} 
                            size="small" 
                            color={
                              ncr.status === 'Open' ? 'warning' : 
                              ncr.status === 'Closed' ? 'success' : 
                              'info'
                            } 
                            sx={{ fontWeight: 'bold' }} 
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={ncr.raisedBy} 
                            size="small" 
                            variant="outlined"
                            sx={{ fontSize: 10 }} 
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <IconButton size="small"><Eye size={16}/></IconButton>
                            <IconButton size="small"><Printer size={16}/></IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredNCRs.length === 0 && (
                      <TableRow>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '40px 16px' }}>
                          <AlertTriangle size={48} strokeWidth={1} className="text-slate-200 mb-2 mx-auto"/>
                          <Typography color="text.disabled">No NCR records matching your query.</Typography>
                        </td>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Paper>
            </Box>
          )}

          {activeTab === 3 && (
            <Box>
              <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                <TextField 
                  size="small" 
                  placeholder="Search RFIs..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)}
                  sx={{ width: 400, bgcolor: 'white' }}
                  InputProps={{ startAdornment: <Search size={16} className="text-slate-400 mr-2"/> }}
                />
                <Button variant="contained" startIcon={<Plus size={16}/>}>New RFI</Button>
              </Box>
              <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', bgcolor: '#f8fafc' }} >
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', py: 2 }}>RFI #</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Priority</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Requested By</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRFIs.map(rfi => (
                      <TableRow key={rfi.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="900" sx={{ fontFamily: 'monospace', color: '#8b5cf6' }}>{rfi.rfiNumber}</Typography>
                          <Typography variant="caption" color="text.secondary">{rfi.date}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{rfi.description.substring(0, 50)}...</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <MapPin size={10} /> {rfi.location}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={rfi.priority} 
                            size="small" 
                            color={
                              rfi.priority === 'High' ? 'error' : 
                              rfi.priority === 'Medium' ? 'warning' : 
                              'info'
                            } 
                            sx={{ fontWeight: 'bold' }} 
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={rfi.status} 
                            size="small" 
                            color={
                              rfi.status === 'Open' ? 'warning' : 
                              rfi.status === 'Approved' ? 'success' : 
                              'info'
                            } 
                            sx={{ fontWeight: 'bold' }} 
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={rfi.requestedBy} 
                            size="small" 
                            variant="outlined"
                            sx={{ fontSize: 10 }} 
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <IconButton size="small"><Eye size={16}/></IconButton>
                            <IconButton size="small"><Printer size={16}/></IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredRFIs.length === 0 && (
                      <TableRow>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '40px 16px' }}>
                          <FileText size={48} strokeWidth={1} className="text-slate-200 mb-2 mx-auto"/>
                          <Typography color="text.disabled">No RFI records matching your query.</Typography>
                        </td>
                      </TableRow>
                    )}
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

export default QualityHub;
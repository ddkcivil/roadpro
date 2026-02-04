import React, { useState, useMemo } from 'react';
import { 
    Box, Typography, Button, Grid, Card, CardContent, Stack,
    Paper, Tabs, Tab, Divider, List, ListItem, ListItemText, 
    ListItemIcon, Chip, Avatar, Tooltip, Alert, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField,
    Select, MenuItem, FormControl, InputLabel, LinearProgress,
    IconButton, Table, TableBody, TableCell, TableHead, TableRow,
    Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import { 
    FileText, BarChart3, PieChart, TrendingUp, AlertTriangle, CheckCircle, 
    Plus, Edit, Trash2, Filter, Search, X, Save, Calendar, 
    Download, Eye, Printer, FileSpreadsheet, Users, HardHat, MapPin,
    ChevronDown, Clock, DollarSign, Package, FileSignature, Info
} from 'lucide-react';
import { Project, UserRole, BOQItem, LabTest, RFI, RFIStatus, ScheduleTask, StructureAsset, NCR, DailyReport, AppSettings } from '../../types'; // Added AppSettings to import
import { formatCurrency, exportBOQToCSV, exportStructuresToCSV, exportRFIToCSV, exportLabTestsToCSV, exportSubcontractorPaymentsToCSV, exportScheduleToCSV } from '../../utils/formatting/exportUtils'; // Added export functions

interface Props {
    project: Project;
    userRole: UserRole;
    settings: AppSettings; // Added settings
    onProjectUpdate: (project: Project) => void;
}

const ReportsAnalyticsHub: React.FC<Props> = ({ project, onProjectUpdate, userRole, settings }) => { // Added settings to destructuring
    const [activeTab, setActiveTab] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedReport, setExpandedReport] = useState<string | null>(null);
    const [exportStatus, setExportStatus] = useState<Record<string, 'idle' | 'processing' | 'success' | 'error'>>({});

    const boq = project.boq || [];
    const labTests = project.labTests || [];
    rfis = project.rfis || [];
    const schedule = project.schedule || [];
    const structures = project.structures || [];
    const ncrs = project.ncrs || [];
    const dailyReports = project.dailyReports || [];

    // Stats calculations
    const reportStats = useMemo(() => {
        const totalBoqItems = boq.length;
        const completedBoq = boq.filter(item => item.status === 'Completed').length;
        const totalTests = labTests.length;
        const passedTests = labTests.filter(test => test.result === 'Pass').length;
        const totalRfis = rfis.length;
        const resolvedRfis = rfis.filter(rfi => rfi.status === 'Closed').length;
        const totalScheduleTasks = schedule.length;
        const completedTasks = schedule.filter(task => task.status === 'Completed').length;
        const totalStructures = structures.length;
        const completedStructures = structures.filter(structure => structure.status === 'Completed').length;
        
        return { 
            totalBoqItems, 
            completedBoq,
            totalTests,
            passedTests,
            totalRfis,
            resolvedRfis,
            totalScheduleTasks,
            completedTasks,
            totalStructures,
            completedStructures
        };
    }, [boq, labTests, rfis, schedule, structures]);

    // Filter functions
    const filteredBoq = useMemo(() => {
        return boq.filter(item => 
            (item.itemNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.category || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [boq, searchTerm]);

    const filteredTests = useMemo(() => {
        return labTests.filter(test => 
            (test.sampleId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (test.testName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (test.category || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [labTests, searchTerm]);

    const filteredRfis = useMemo(() => {
        return rfis.filter(rfi => 
            (rfi.rfiNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (rfi.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (rfi.status || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [rfis, searchTerm]);

    const filteredSchedule = useMemo(() => {
        return schedule.filter(task => 
            (task.taskName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (task.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (task.status || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [schedule, searchTerm]);

    const startExportProcess = (id: string) => {
      setExportStatus(prev => ({ ...prev, [id]: 'processing' }));
    };

    const finishExportProcess = (id: string, status: 'success' | 'error') => {
      setExportStatus(prev => ({ ...prev, [id]: status }));
      setTimeout(() => setExportStatus(prev => ({ ...prev, [id]: 'idle' })), 2000); // Reset status after 2 seconds
    };

    // Export functions
    const handleExportBOQ = (id: string) => {
        startExportProcess(id);
        try {
            exportBOQToCSV(project);
            finishExportProcess(id, 'success');
        } catch (error) {
            console.error('BOQ export failed:', error);
            finishExportProcess(id, 'error');
        }
    };

    const handleExportSchedule = (id: string) => {
        startExportProcess(id);
        try {
            exportScheduleToCSV(project);
            finishExportProcess(id, 'success');
        } catch (error) {
            console.error('Schedule export failed:', error);
            finishExportProcess(id, 'error');
        }
    };

    const handleExportTests = (id: string) => {
        startExportProcess(id);
        try {
            exportLabTestsToCSV(project);
            finishExportProcess(id, 'success');
        } catch (error) {
            console.error('Lab Tests export failed:', error);
            finishExportProcess(id, 'error');
        }
    };

    const handleExportRfis = (id: string) => {
        startExportProcess(id);
        try {
            exportRFIToCSV(project);
            finishExportProcess(id, 'success');
        } catch (error) {
            console.error('RFI export failed:', error);
            finishExportProcess(id, 'error');
        }
    };

    const handleExportStructures = (id: string) => {
        startExportProcess(id);
        try {
            exportStructuresToCSV(project);
            finishExportProcess(id, 'success');
        } catch (error) {
            console.error('Structure export failed:', error);
            finishExportProcess(id, 'error');
        }
    };

    const handleExportNCRs = (id: string) => {
        startExportProcess(id);
        // Functionality to export NCRs is not yet implemented in exportUtils.ts
        alert('Functionality to export NCR Reports is not yet implemented.');
        finishExportProcess(id, 'error'); // Mark as error since not implemented
    };

    return (
        <Box className="animate-in fade-in duration-500">
            <Box display="flex" justifyContent="space-between" mb={2} alignItems="center">
                <Box>
                    <Typography variant="caption" fontWeight="900" color="primary" sx={{ letterSpacing: '0.2em', textTransform: 'uppercase' }}>REPORTS & ANALYTICS</Typography>
                    <Typography variant="h4" fontWeight="900">Reports & Analytics Hub</Typography>
                    <Typography variant="body2" color="text.secondary">Centralized reporting, analytics, and export functionality</Typography>
                </Box>
                <Stack direction="row" spacing={1.5}>
                    <Button variant="outlined" startIcon={<FileSpreadsheet size={16}/>} sx={{ borderRadius: 2, paddingX: 1.5, paddingY: 0.75 }}>Dashboard</Button>
                    <Button variant="contained" startIcon={<Download size={16}/>} sx={{ borderRadius: 2, paddingX: 1.5, paddingY: 0.75 }} onClick={() => setActiveTab(5)}>
                        Export All Reports
                    </Button>
                </Stack>
            </Box>

            <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden', mb: 2 }}>
                <Tabs 
                    value={activeTab} 
                    onChange={(_, v) => setActiveTab(v)} 
                    sx={{ bgcolor: 'slate.50', borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="BOQ Analytics" icon={<FileText size={18}/>} iconPosition="start" />
                    <Tab label="Schedule Reports" icon={<BarChart3 size={18}/>} iconPosition="start" />
                    <Tab label="Quality Reports" icon={<CheckCircle size={18}/>} iconPosition="start" />
                    <Tab label="Inspection Reports" icon={<Eye size={18}/>} iconPosition="start" />
                    <Tab label="Progress Reports" icon={<TrendingUp size={18}/>} iconPosition="start" />
                    <Tab label="Export Center" icon={<Download size={18}/>} iconPosition="start" />
                </Tabs>

                <Box p={2}>
                    {/* BOQ ANALYTICS TAB */}
                    {activeTab === 0 && (
                        <Box>
                            <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                                <TextField 
                                    size="small" 
                                    placeholder="Search BOQ items..." 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)}
                                    sx={{ width: 400, bgcolor: 'white' }}
                                    InputProps={{ startAdornment: <Search size={16} className="text-slate-400 mr-2"/> }}
                                />
                                <Button variant="outlined" startIcon={<Filter size={14}/>}>Filter Items</Button>
                            </Box>

                            <Grid container spacing={2} mb={3}>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #10b981', bgcolor: 'emerald.50/10' }}>
                                        <CardContent sx={{ p: 2 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">TOTAL ITEMS</Typography>
                                                <FileText size={16} className="text-emerald-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="success.main">{reportStats.totalBoqItems}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #f59e0b' }}>
                                        <CardContent sx={{ p: 2 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">COMPLETED</Typography>
                                                <CheckCircle size={16} className="text-amber-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="warning.main">{reportStats.completedBoq}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #6366f1' }}>
                                        <CardContent sx={{ p: 2 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">COMPLETION %</Typography>
                                                <TrendingUp size={16} className="text-indigo-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="primary.main">
                                                {reportStats.totalBoqItems > 0 ? Math.round((reportStats.completedBoq / reportStats.totalBoqItems) * 100) : 0}%
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #8b5cf6' }}>
                                        <CardContent sx={{ p: 2 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">TOTAL VALUE</Typography>
                                                <DollarSign size={16} className="text-violet-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="secondary.main">
                                                {formatCurrency(boq.reduce((sum, item) => sum + item.amount, 0))}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                                <Table>
                                    <TableHead sx={{ bgcolor: 'slate.50' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Item No</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Quantity</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Rate</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Amount</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredBoq.map(item => (
                                            <TableRow key={item.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="bold">{item.itemNo}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{item.description}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{item.category}</Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2">{item.quantity} {item.unit}</Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2">{formatCurrency(item.rate)}</Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2" fontWeight="900">{formatCurrency(item.amount)}</Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Chip 
                                                        label={item.status || 'Planned'} 
                                                        size="small" 
                                                        color={
                                                            item.status === 'Completed' ? 'success' :
                                                            item.status === 'Executing' ? 'primary' : 'default'
                                                        }
                                                        sx={{ fontWeight: 'bold', fontSize: 10 }} 
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {filteredBoq.length === 0 && (
                                    <Box py={8} textAlign="center" border="1px dashed #e2e8f0" borderRadius={4}>
                                        <FileText size={48} className="text-slate-200 mx-auto mb-2"/>
                                        <Typography color="text.secondary">No BOQ items found.</Typography>
                                    </Box>
                                )}
                            </Paper>
                        </Box>
                    )}

                    {/* SCHEDULE REPORTS TAB */}
                    {activeTab === 1 && (
                        <Box>
                            <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                                <TextField 
                                    size="small" 
                                    placeholder="Search schedule tasks..." 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)}
                                    sx={{ width: 400, bgcolor: 'white' }}
                                    InputProps={{ startAdornment: <Search size={16} className="text-slate-400 mr-2"/> }}
                                />
                                <Button variant="outlined" startIcon={<Filter size={14}/>}>Filter Tasks</Button>
                            </Box>

                            <Grid container spacing={2} mb={3}>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #10b981', bgcolor: 'emerald.50/10' }}>
                                        <CardContent sx={{ p: 2 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">TOTAL TASKS</Typography>
                                                <BarChart3 size={16} className="text-emerald-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="success.main">{reportStats.totalScheduleTasks}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #f59e0b' }}>
                                        <CardContent sx={{ p: 2 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">COMPLETED</Typography>
                                                <CheckCircle size={16} className="text-amber-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="warning.main">{reportStats.completedTasks}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #6366f1' }}>
                                        <CardContent sx={{ p: 2 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">PROGRESS %</Typography>
                                                <TrendingUp size={16} className="text-indigo-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="primary.main">
                                                {reportStats.totalScheduleTasks > 0 ? Math.round((reportStats.completedTasks / reportStats.totalScheduleTasks) * 100) : 0}%
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #8b5cf6' }}>
                                        <CardContent sx={{ p: 2 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">ON TIME</Typography>
                                                <Clock size={16} className="text-violet-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="secondary.main">
                                                {reportStats.totalScheduleTasks > 0 ? Math.round(((reportStats.totalScheduleTasks - (reportStats.totalScheduleTasks - reportStats.completedTasks)) / reportStats.totalScheduleTasks) * 100) : 0}%
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                                <Table>
                                    <TableHead sx={{ bgcolor: 'slate.50' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Task Name</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Start Date</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>End Date</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Duration</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredSchedule.map(task => (
                                            <TableRow key={task.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="bold">{task.taskName}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{task.description}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{task.startDate}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{task.endDate}</Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2">{task.duration} days</Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Chip 
                                                        label={task.status} 
                                                        size="small" 
                                                        color={
                                                            task.status === 'Completed' ? 'success' :
                                                            task.status === 'On Track' ? 'primary' :
                                                            task.status === 'Delayed' ? 'error' : 'default'
                                                        }
                                                        sx={{ fontWeight: 'bold', fontSize: 10 }} 
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {filteredSchedule.length === 0 && (
                                    <Box py={8} textAlign="center" border="1px dashed #e2e8f0" borderRadius={4}>
                                        <BarChart3 size={48} className="text-slate-200 mx-auto mb-2"/>
                                        <Typography color="text.secondary">No schedule tasks found.</Typography>
                                    </Box>
                                )}
                            </Paper>
                        </Box>
                    )}

                    {/* QUALITY REPORTS TAB */}
                    {activeTab === 2 && (
                        <Box>
                            <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                                <TextField 
                                    size="small" 
                                    placeholder="Search quality tests..." 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)}
                                    sx={{ width: 400, bgcolor: 'white' }}
                                    InputProps={{ startAdornment: <Search size={16} className="text-slate-400 mr-2"/> }}
                                />
                                <Button variant="outlined" startIcon={<Filter size={14}/>}>Filter Tests</Button>
                            </Box>

                            <Grid container spacing={2} mb={3}>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #10b981', bgcolor: 'emerald.50/10' }}>
                                        <CardContent sx={{ p: 2 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">TOTAL TESTS</Typography>
                                                <CheckCircle size={16} className="text-emerald-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="success.main">{reportStats.totalTests}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #f59e0b' }}>
                                        <CardContent sx={{ p: 2 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">PASSED</Typography>
                                                <CheckCircle size={16} className="text-amber-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="warning.main">{reportStats.passedTests}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #6366f1' }}>
                                        <CardContent sx={{ p: 2 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">PASS RATE</Typography>
                                                <TrendingUp size={16} className="text-indigo-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="primary.main">
                                                {reportStats.totalTests > 0 ? Math.round((reportStats.passedTests / reportStats.totalTests) * 100) : 0}%
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #8b5cf6' }}>
                                        <CardContent sx={{ p: 2 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">FAILED</Typography>
                                                <AlertTriangle size={16} className="text-violet-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="error.main">
                                                {reportStats.totalTests - reportStats.passedTests}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                                <Table>
                                    <TableHead sx={{ bgcolor: 'slate.50' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Sample ID</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Test Name</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Result</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredTests.map(test => (
                                            <TableRow key={test.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="bold">{test.sampleId}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{test.testName}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{test.category}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{test.date}</Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Chip 
                                                        label={test.result} 
                                                        size="small" 
                                                        color={test.result === 'Pass' ? 'success' : 'error'} 
                                                        sx={{ fontWeight: 'bold', fontSize: 10 }} 
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {filteredTests.length === 0 && (
                                    <Box py={8} textAlign="center" border="1px dashed #e2e8f0" borderRadius={4}>
                                        <CheckCircle size={48} className="text-slate-200 mx-auto mb-2"/>
                                        <Typography color="text.secondary">No quality tests found.</Typography>
                                    </Box>
                                )}
                            </Paper>
                        </Box>
                    )}

                    {/* INSPECTION REPORTS TAB */}
                    {activeTab === 3 && (
                        <Box>
                            <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                                <TextField 
                                    size="small" 
                                    placeholder="Search inspection reports..." 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)}
                                    sx={{ width: 400, bgcolor: 'white' }}
                                    InputProps={{ startAdornment: <Search size={16} className="text-slate-400 mr-2"/> }}
                                />
                                <Button variant="outlined" startIcon={<Filter size={14}/>}>Filter Reports</Button>
                            </Box>

                            <Grid container spacing={2} mb={3}>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #10b981', bgcolor: 'emerald.50/10' }}>
                                        <CardContent sx={{ p: 2 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">TOTAL RFIs</Typography>
                                                <Eye size={16} className="text-emerald-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="success.main">{reportStats.totalRfis}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #f59e0b' }}>
                                        <CardContent sx={{ p: 2 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">RESOLVED</Typography>
                                                <CheckCircle size={16} className="text-amber-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="warning.main">{reportStats.resolvedRfis}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #6366f1' }}>
                                        <CardContent sx={{ p: 2 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">RESOLUTION %</Typography>
                                                <TrendingUp size={16} className="text-indigo-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="primary.main">
                                                {reportStats.totalRfis > 0 ? Math.round((reportStats.resolvedRfis / reportStats.totalRfis) * 100) : 0}%
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #8b5cf6' }}>
                                        <CardContent sx={{ p: 2 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">PENDING</Typography>
                                                <AlertTriangle size={16} className="text-violet-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="error.main">
                                                {reportStats.totalRfis - reportStats.resolvedRfis}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                                <Table>
                                    <TableHead sx={{ bgcolor: 'slate.50' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>RFI No</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Title</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredRfis.map(rfi => (
                                            <TableRow key={rfi.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="bold">{rfi.rfiNo}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{rfi.title}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{rfi.description}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{rfi.category}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{rfi.date}</Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Chip 
                                                        label={rfi.status} 
                                                        size="small" 
                                                        color={
                                                            rfi.status === RFIStatus.CLOSED ? 'success' :
                                                            rfi.status === RFIStatus.OPEN || rfi.status === RFIStatus.PENDING_INSPECTION ? 'primary' : 'default'
                                                        }
                                                        sx={{ fontWeight: 'bold', fontSize: 10 }} 
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {filteredRfis.length === 0 && (
                                    <Box py={8} textAlign="center" border="1px dashed #e2e8f0" borderRadius={4}>
                                        <Eye size={48} className="text-slate-200 mx-auto mb-2"/>
                                        <Typography color="text.secondary">No inspection reports found.</Typography>
                                    </Box>
                                )}
                            </Paper>
                        </Box>
                    )}

                    {/* PROGRESS REPORTS TAB */}
                    {activeTab === 4 && (
                        <Box>
                            <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                                <TextField 
                                    size="small" 
                                    placeholder="Search progress reports..." 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)}
                                    sx={{ width: 400, bgcolor: 'white' }}
                                    InputProps={{ startAdornment: <Search size={16} className="text-slate-400 mr-2"/> }}
                                />
                                <Button variant="outlined" startIcon={<Filter size={14}/>}>Filter Reports</Button>
                            </Box>

                            <Grid container spacing={2} mb={3}>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #10b981', bgcolor: 'emerald.50/10' }}>
                                        <CardContent sx={{ p: 2 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">TOTAL STRUCTURES</Typography>
                                                <HardHat size={16} className="text-emerald-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="success.main">{reportStats.totalStructures}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #f59e0b' }}>
                                        <CardContent sx={{ p: 2 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">COMPLETED</Typography>
                                                <CheckCircle size={16} className="text-amber-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="warning.main">{reportStats.completedStructures}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #6366f1' }}>
                                        <CardContent sx={{ p: 2 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">PROGRESS %</Typography>
                                                <TrendingUp size={16} className="text-indigo-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="primary.main">
                                                {reportStats.totalStructures > 0 ? Math.round((reportStats.completedStructures / reportStats.totalStructures) * 100) : 0}%
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: '6px solid #8b5cf6' }}>
                                        <CardContent sx={{ p: 2 }}>
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary">ACTIVE TODAY</Typography>
                                                <MapPin size={16} className="text-violet-600"/>
                                            </Box>
                                            <Typography variant="h5" fontWeight="900" color="secondary.main">
                                                {dailyReports.filter(dr => dr.date === new Date().toISOString().split('T')[0]).length}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                                <Table>
                                    <TableHead sx={{ bgcolor: 'slate.50' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Structure ID</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Progress</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {structures.map(structure => (
                                            <TableRow key={structure.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="bold">{structure.id}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{structure.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{structure.type}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{structure.location}</Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2">{structure.progress || 0}%</Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Chip 
                                                        label={structure.status} 
                                                        size="small" 
                                                        color={
                                                            structure.status === 'Completed' ? 'success' :
                                                            structure.status === 'In Progress' ? 'primary' : 'default'
                                                        }
                                                        sx={{ fontWeight: 'bold', fontSize: 10 }} 
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {structures.length === 0 && (
                                    <Box py={8} textAlign="center" border="1px dashed #e2e8f0" borderRadius={4}>
                                        <TrendingUp size={48} className="text-slate-200 mx-auto mb-2"/>
                                        <Typography color="text.secondary">No progress reports found.</Typography>
                                    </Box>
                                )}
                            </Paper>
                        </Box>
                    )}

                                        {/* EXPORT CENTER TAB */}

                                        {activeTab === 5 && (

                                            <Box>

                                                <Alert severity="info" icon={<Download />}>

                                                    Export all project reports in various formats (PDF, Excel, CSV) from this centralized hub.

                                                </Alert>

                    

                                                <Grid container spacing={3} mt={2}>

                                                    <Grid item xs={12} md={6}>

                                                        <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>

                                                            <CardContent>

                                                                <Box display="flex" alignItems="center" mb={2}>

                                                                    <FileText className="text-indigo-600 mr-2" size={24} />

                                                                    <Typography variant="h6" fontWeight="bold">BOQ & Financial Reports</Typography>

                                                                </Box>

                                                                <List>

                                                                    <ListItem>

                                                                        <ListItemIcon><FileText size={16} /></ListItemIcon>

                                                                        <ListItemText primary="BOQ Summary Report" secondary="Complete BOQ with rates and quantities" />

                                                                        <Stack direction="row" spacing={1} alignItems="center">

                                                                            {getStatusIcon(exportStatus['boq-summary'] || 'idle')}

                                                                            <Button variant="outlined" size="small" startIcon={<Download size={14}/>} onClick={() => handleExportBOQ('boq-summary')} disabled={exportStatus['boq-summary'] === 'processing'}>

                                                                                {exportStatus['boq-summary'] === 'processing' ? 'Exporting...' : 'Export'}

                                                                            </Button>

                                                                        </Stack>

                                                                    </ListItem>

                                                                    <ListItem>

                                                                        <ListItemIcon><DollarSign size={16} /></ListItemIcon>

                                                                        <ListItemText primary="Financial Summary" secondary="Revenue, expenses, and profit margins" />

                                                                        <Stack direction="row" spacing={1} alignItems="center">

                                                                            {getStatusIcon(exportStatus['financial-summary'] || 'idle')}

                                                                            <Button variant="outlined" size="small" startIcon={<Download size={14}/>} onClick={() => alert('Financial Summary export functionality is not yet implemented.')} disabled={exportStatus['financial-summary'] === 'processing'}>

                                                                                {exportStatus['financial-summary'] === 'processing' ? 'Exporting...' : 'Export'}

                                                                            </Button>

                                                                        </Stack>

                                                                    </ListItem>

                                                                    <ListItem>

                                                                        <ListItemIcon><FileSignature size={16} /></ListItemIcon>

                                                                        <ListItemText primary="Contract Bills" secondary="All contract billing certificates" />

                                                                        <Stack direction="row" spacing={1} alignItems="center">

                                                                            {getStatusIcon(exportStatus['contract-bills'] || 'idle')}

                                                                            <Button variant="outlined" size="small" startIcon={<Download size={14}/>} onClick={() => alert('Contract Bills export functionality is not yet implemented.')} disabled={exportStatus['contract-bills'] === 'processing'}>

                                                                                {exportStatus['contract-bills'] === 'processing' ? 'Exporting...' : 'Export'}

                                                                            </Button>

                                                                        </Stack>

                                                                    </ListItem>

                                                                </List>

                                                            </CardContent>

                                                        </Card>

                                                    </Grid>

                                                    <Grid item xs={12} md={6}>

                                                        <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>

                                                            <CardContent>

                                                                <Box display="flex" alignItems="center" mb={2}>

                                                                    <BarChart3 className="text-emerald-600 mr-2" size={24} />

                                                                    <Typography variant="h6" fontWeight="bold">Schedule & Progress Reports</Typography>

                                                                </Box>

                                                                <List>

                                                                    <ListItem>

                                                                        <ListItemIcon><BarChart3 size={16} /></ListItemIcon>

                                                                        <ListItemText primary="Schedule Progress" secondary="Task completion and timeline analysis" />

                                                                        <Stack direction="row" spacing={1} alignItems="center">

                                                                            {getStatusIcon(exportStatus['schedule-progress'] || 'idle')}

                                                                            <Button variant="outlined" size="small" startIcon={<Download size={14}/>} onClick={() => handleExportSchedule('schedule-progress')} disabled={exportStatus['schedule-progress'] === 'processing'}>

                                                                                {exportStatus['schedule-progress'] === 'processing' ? 'Exporting...' : 'Export'}

                                                                            </Button>

                                                                        </Stack>

                                                                    </ListItem>

                                                                    <ListItem>

                                                                        <ListItemIcon><TrendingUp size={16} /></ListItemIcon>

                                                                        <ListItemText primary="Progress Report" secondary="Daily/weekly progress summary" />

                                                                        <Stack direction="row" spacing={1} alignItems="center">

                                                                            {getStatusIcon(exportStatus['progress-report'] || 'idle')}

                                                                            <Button variant="outlined" size="small" startIcon={<Download size={14}/>} onClick={() => alert('Progress Report export functionality is not yet implemented.')} disabled={exportStatus['progress-report'] === 'processing'}>

                                                                                {exportStatus['progress-report'] === 'processing' ? 'Exporting...' : 'Export'}

                                                                            </Button>

                                                                        </Stack>

                                                                    </ListItem>

                                                                    <ListItem>

                                                                        <ListItemIcon><MapPin size={16} /></ListItemIcon>

                                                                        <ListItemText primary="Structure Status" secondary="All structures and their completion status" />

                                                                        <Stack direction="row" spacing={1} alignItems="center">

                                                                            {getStatusIcon(exportStatus['structure-status'] || 'idle')}

                                                                            <Button variant="outlined" size="small" startIcon={<Download size={14}/>} onClick={() => handleExportStructures('structure-status')} disabled={exportStatus['structure-status'] === 'processing'}>

                                                                                {exportStatus['structure-status'] === 'processing' ? 'Exporting...' : 'Export'}

                                                                            </Button>

                                                                        </Stack>

                                                                    </ListItem>

                                                                </List>

                                                            </CardContent>

                                                        </Card>

                                                    </Grid>

                                                    <Grid item xs={12} md={6}>

                                                        <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>

                                                            <CardContent>

                                                                <Box display="flex" alignItems="center" mb={2}>

                                                                    <CheckCircle className="text-amber-600 mr-2" size={24} />

                                                                    <Typography variant="h6" fontWeight="bold">Quality & Inspection Reports</Typography>

                                                                </Box>

                                                                <List>

                                                                    <ListItem>

                                                                        <ListItemIcon><CheckCircle size={16} /></ListItemIcon>

                                                                        <ListItemText primary="Lab Test Results" secondary="All material testing results" />

                                                                        <Stack direction="row" spacing={1} alignItems="center">

                                                                            {getStatusIcon(exportStatus['lab-test-results'] || 'idle')}

                                                                            <Button variant="outlined" size="small" startIcon={<Download size={14}/>} onClick={() => handleExportTests('lab-test-results')} disabled={exportStatus['lab-test-results'] === 'processing'}>

                                                                                {exportStatus['lab-test-results'] === 'processing' ? 'Exporting...' : 'Export'}

                                                                            </Button>

                                                                        </Stack>

                                                                    </ListItem>

                                                                    <ListItem>

                                                                        <ListItemIcon><Eye size={16} /></ListItemIcon>

                                                                        <ListItemText primary="RFI Log" secondary="All Requests for Information" />

                                                                        <Stack direction="row" spacing={1} alignItems="center">

                                                                            {getStatusIcon(exportStatus['rfi-log'] || 'idle')}

                                                                            <Button variant="outlined" size="small" startIcon={<Download size={14}/>} onClick={() => handleExportRfis('rfi-log')} disabled={exportStatus['rfi-log'] === 'processing'}>

                                                                                {exportStatus['rfi-log'] === 'processing' ? 'Exporting...' : 'Export'}

                                                                            </Button>

                                                                        </Stack>

                                                                    </ListItem>

                                                                    <ListItem>

                                                                        <ListItemIcon><AlertTriangle size={16} /></ListItemIcon>

                                                                        <ListItemText primary="NCR Report" secondary="Non-Conformance Reports" />

                                                                        <Stack direction="row" spacing={1} alignItems="center">

                                                                            {getStatusIcon(exportStatus['ncr-report'] || 'idle')}

                                                                            <Button variant="outlined" size="small" startIcon={<Download size={14}/>} onClick={() => handleExportNCRs('ncr-report')} disabled={exportStatus['ncr-report'] === 'processing'}>

                                                                                {exportStatus['ncr-report'] === 'processing' ? 'Exporting...' : 'Export'}

                                                                            </Button>

                                                                        </Stack>

                                                                    </ListItem>

                                                                </List>

                                                            </CardContent>

                                                        </Card>

                                                    </Grid>

                                                    <Grid item xs={12} md={6}>

                                                        <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>

                                                            <CardContent>

                                                                <Box display="flex" alignItems="center" mb={2}>

                                                                    <Download className="text-violet-600 mr-2" size={24} />

                                                                    <Typography variant="h6" fontWeight="bold">Master Reports</Typography>

                                                                </Box>

                                                                <List>

                                                                    <ListItem>

                                                                        <ListItemIcon><FileSpreadsheet size={16} /></ListItemIcon>

                                                                        <ListItemText primary="Project Dashboard" secondary="Complete project overview" />

                                                                        <Stack direction="row" spacing={1} alignItems="center">

                                                                            {getStatusIcon(exportStatus['project-dashboard'] || 'idle')}

                                                                            <Button variant="outlined" size="small" startIcon={<Download size={14}/>} onClick={() => alert('Project Dashboard export functionality is not yet implemented.')} disabled={exportStatus['project-dashboard'] === 'processing'}>

                                                                                {exportStatus['project-dashboard'] === 'processing' ? 'Exporting...' : 'Export'}

                                                                            </Button>

                                                                        </Stack>

                                                                    </ListItem>

                                                                    <ListItem>

                                                                        <ListItemIcon><Users size={16} /></ListItemIcon>

                                                                        <ListItemText primary="Resource Utilization" secondary="Assets, inventory, and workforce" />

                                                                        <Stack direction="row" spacing={1} alignItems="center">

                                                                            {getStatusIcon(exportStatus['resource-utilization'] || 'idle')}

                                                                            <Button variant="outlined" size="small" startIcon={<Download size={14}/>} onClick={() => alert('Resource Utilization export functionality is not yet implemented.')} disabled={exportStatus['resource-utilization'] === 'processing'}>

                                                                                {exportStatus['resource-utilization'] === 'processing' ? 'Exporting...' : 'Export'}

                                                                            </Button>

                                                                        </Stack>

                                                                    </ListItem>

                                                                    <ListItem>

                                                                        <ListItemIcon><Package size={16} /></ListItemIcon>

                                                                        <ListItemText primary="Comprehensive Export" secondary="All data in single package" />

                                                                        <Stack direction="row" spacing={1} alignItems="center">

                                                                            {getStatusIcon(exportStatus['comprehensive-export'] || 'idle')}

                                                                            <Button variant="contained" size="small" startIcon={<Download size={14}/>} onClick={() => alert('Comprehensive Export functionality is not yet implemented.')} disabled={exportStatus['comprehensive-export'] === 'processing'}>

                                                                                {exportStatus['comprehensive-export'] === 'processing' ? 'Exporting...' : 'Export All'}

                                                                            </Button>

                                                                        </Stack>

                                                                    </ListItem>

                                                                </List>

                                                            </CardContent>

                                                        </Card>

                                                    </Grid>

                                                </Grid>

                                            </Box>

                                        )}

                                    </Box>

                                </Paper>

                            </Box>

                        );

                    };

                    

                    export default ReportsAnalyticsHub;

                    

                    const getStatusIcon = (status: 'idle' | 'processing' | 'success' | 'error') => {

                        switch (status) {

                            case 'processing': return <FileText size={16} className="animate-pulse text-blue-600" />;

                            case 'success': return <CheckCircle size={16} className="text-green-600" />;

                            case 'error': return <AlertTriangle size={16} className="text-red-600" />;

                            default: return <Download size={16} className="text-gray-600" />;

                        }

                    };

                    
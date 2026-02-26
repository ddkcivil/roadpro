import React, { useState, useMemo } from 'react';
import { 
    FileText, BarChart3, PieChart, TrendingUp, AlertTriangle, CheckCircle, 
    Plus, Edit, Trash2, Filter, Search, X, Save, Calendar, 
    Download, Eye, Printer, FileSpreadsheet, Users, HardHat, MapPin,
    ChevronDown, Clock, DollarSign, Package, FileSignature, Info, Loader2
} from 'lucide-react';
import { Project, UserRole, BOQItem, LabTest, RFI, RFIStatus, ScheduleTask, StructureAsset, NCR, DailyReport, AppSettings } from '../../types';
import { formatCurrency, exportBOQToCSV, exportStructuresToCSV, exportRFIToCSV, exportLabTestsToCSV, exportSubcontractorPaymentsToCSV, exportScheduleToCSV } from '../../utils/formatting/exportUtils';

import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { Separator } from '~/components/ui/separator';
import { Badge } from '~/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { Progress } from '~/components/ui/progress';
import { cn } from '~/lib/utils';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';


// NOTE: This is a refactored version of the ReportsAnalyticsHub component.
// The original logic has been temporarily removed to facilitate the UI migration.
// It will be re-implemented in subsequent steps.

interface Props {
    project: Project;
    userRole: UserRole;
    settings: AppSettings;
    onProjectUpdate: (project: Project) => void;
}

const ReportsAnalyticsHub: React.FC<Props> = ({ project, onProjectUpdate, userRole, settings }) => {
    const [activeTab, setActiveTab] = useState("boq-analytics");
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedReport, setExpandedReport] = useState<string | null>(null);
    const [exportStatus, setExportStatus] = useState<Record<string, 'idle' | 'processing' | 'success' | 'error'>>({});

    // Placeholder data
    const boq: BOQItem[] = project.boq || [];
    const labTests: LabTest[] = project.labTests || [];
    const rfis: RFI[] = project.rfis || [];
    const schedule: ScheduleTask[] = project.schedule || [];
    const structures: StructureAsset[] = project.structures || [];
    const ncrs: NCR[] = project.ncrs || [];
    const dailyReports: DailyReport[] = project.dailyReports || [];

    // Placeholder stats
    const reportStats = useMemo(() => {
        return { 
            totalBoqItems: boq.length, 
            completedBoq: 0,
            totalTests: labTests.length,
            passedTests: 0,
            totalRfis: rfis.length,
            resolvedRfis: 0,
            totalScheduleTasks: schedule.length,
            completedTasks: 0,
            totalStructures: structures.length,
            completedStructures: 0
        };
    }, [boq, labTests, rfis, schedule, structures]);

    // Placeholder filter functions
    const filteredBoq = useMemo(() => boq.filter(item => item.description.toLowerCase().includes(searchTerm.toLowerCase())), [boq, searchTerm]);
    const filteredTests = useMemo(() => labTests.filter(test => test.testName.toLowerCase().includes(searchTerm.toLowerCase())), [labTests, searchTerm]);
    const filteredRfis = useMemo(() => rfis.filter(rfi => rfi.description.toLowerCase().includes(searchTerm.toLowerCase())), [rfis, searchTerm]);
    const filteredSchedule = useMemo(() => schedule.filter(task => task.taskName.toLowerCase().includes(searchTerm.toLowerCase())), [schedule, searchTerm]);


    // Placeholder export functions
    const startExportProcess = (id: string) => { setExportStatus(prev => ({ ...prev, [id]: 'processing' })); };
    const finishExportProcess = (id: string, status: 'success' | 'error') => { setExportStatus(prev => ({ ...prev, [id]: status })); setTimeout(() => setExportStatus(prev => ({ ...prev, [id]: 'idle' })), 2000); };
    const handleExportBOQ = (id: string) => { startExportProcess(id); console.log('Export BOQ'); finishExportProcess(id, 'success'); };
    const handleExportSchedule = (id: string) => { startExportProcess(id); console.log('Export Schedule'); finishExportProcess(id, 'success'); };
    const handleExportTests = (id: string) => { startExportProcess(id); console.log('Export Tests'); finishExportProcess(id, 'success'); };
    const handleExportRfis = (id: string) => { startExportProcess(id); console.log('Export RFIs'); finishExportProcess(id, 'success'); };
    const handleExportStructures = (id: string) => { startExportProcess(id); console.log('Export Structures'); finishExportProcess(id, 'success'); };
    const handleExportNCRs = (id: string) => { startExportProcess(id); console.log('Export NCRs'); finishExportProcess(id, 'error'); };

    const getStatusIcon = (status: 'idle' | 'processing' | 'success' | 'error') => {
        switch (status) {
            case 'processing': return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
            case 'success': return <CheckCircle className="h-4 w-4 text-emerald-600" />;
            case 'error': return <AlertTriangle className="h-4 w-4 text-destructive" />;
            default: return <Download className="h-4 w-4 text-muted-foreground" />;
        }
    };


    return (
        <div className="animate-in fade-in duration-500 p-4">
            <div className="flex justify-between mb-4 items-center">
                <div>
                    <p className="text-xs font-bold text-primary tracking-widest uppercase">REPORTS & ANALYTICS</p>
                    <h1 className="text-2xl font-black text-foreground">Reports & Analytics Hub</h1>
                    <p className="text-sm text-muted-foreground">Centralized reporting, analytics, and export functionality</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Dashboard
                    </Button>
                    <Button onClick={() => setActiveTab("export-center")}>
                        <Download className="mr-2 h-4 w-4" /> Export All Reports
                    </Button>
                </div>
            </div>

            <Card className="mb-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-6 h-12">
                        <TabsTrigger value="boq-analytics">
                            <FileText className="mr-2 h-4 w-4" /> BOQ Analytics
                        </TabsTrigger>
                        <TabsTrigger value="schedule-reports">
                            <BarChart3 className="mr-2 h-4 w-4" /> Schedule Reports
                        </TabsTrigger>
                        <TabsTrigger value="quality-reports">
                            <CheckCircle className="mr-2 h-4 w-4" /> Quality Reports
                        </TabsTrigger>
                        <TabsTrigger value="inspection-reports">
                            <Eye className="mr-2 h-4 w-4" /> Inspection Reports
                        </TabsTrigger>
                        <TabsTrigger value="progress-reports">
                            <TrendingUp className="mr-2 h-4 w-4" /> Progress Reports
                        </TabsTrigger>
                        <TabsTrigger value="export-center">
                            <Download className="mr-2 h-4 w-4" /> Export Center
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="boq-analytics" className="p-4">
                        <div className="flex justify-between mb-4 items-center">
                            <Input
                                placeholder="Search BOQ items..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-64"
                            />
                            <Button variant="outline">
                                <Filter className="mr-2 h-4 w-4" /> Filter Items
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs font-bold text-muted-foreground">TOTAL ITEMS</p>
                                        <FileText className="h-4 w-4 text-emerald-600" />
                                    </div>
                                    <p className="text-2xl font-bold text-emerald-600">{reportStats.totalBoqItems}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs font-bold text-muted-foreground">COMPLETED</p>
                                        <CheckCircle className="h-4 w-4 text-amber-600" />
                                    </div>
                                    <p className="text-2xl font-bold text-amber-600">{reportStats.completedBoq}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs font-bold text-muted-foreground">COMPLETION %</p>
                                        <TrendingUp className="h-4 w-4 text-primary" />
                                    </div>
                                    <p className="text-2xl font-bold text-primary">
                                        {reportStats.totalBoqItems > 0 ? Math.round((reportStats.completedBoq / reportStats.totalBoqItems) * 100) : 0}%
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs font-bold text-muted-foreground">TOTAL VALUE</p>
                                        <DollarSign className="h-4 w-4 text-violet-600" />
                                    </div>
                                    <p className="text-2xl font-bold text-muted-foreground">
                                        {formatCurrency(boq.reduce((sum, item) => sum + (item.quantity * item.rate), 0), settings)}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                        <Card>
                            <CardContent className="p-0">
                                <ScrollArea className="h-[400px] w-full">
                                    <Table>
                                        <TableHeader className="bg-muted">
                                            <TableRow>
                                                <TableHead>Item No</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead className="text-right">Quantity</TableHead>
                                                <TableHead className="text-right">Rate</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                                <TableHead className="text-right">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredBoq.length > 0 ? filteredBoq.map(item => (
                                                <TableRow key={item.id}>
                                                    <TableCell>{item.itemNo}</TableCell>
                                                    <TableCell>
                                                        <p className="font-semibold">{item.description}</p>
                                                        <p className="text-xs text-muted-foreground">{item.category}</p>
                                                    </TableCell>
                                                    <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(item.rate, settings)}</TableCell>
                                                    <TableCell className="text-right font-bold">{formatCurrency(item.amount, settings)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={item.status === 'Completed' ? 'default' : item.status === 'Executing' ? 'secondary' : 'outline'}>
                                                            {item.status || 'Planned'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-8">
                                                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                                                        <p className="text-muted-foreground">No BOQ items found.</p>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="schedule-reports" className="p-4">
                        <div className="flex justify-between mb-4 items-center">
                            <Input
                                placeholder="Search schedule tasks..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-64"
                            />
                            <Button variant="outline">
                                <Filter className="mr-2 h-4 w-4" /> Filter Tasks
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs font-bold text-muted-foreground">TOTAL TASKS</p>
                                        <BarChart3 className="h-4 w-4 text-emerald-600" />
                                    </div>
                                    <p className="text-2xl font-bold text-emerald-600">{reportStats.totalScheduleTasks}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs font-bold text-muted-foreground">COMPLETED</p>
                                        <CheckCircle className="h-4 w-4 text-amber-600" />
                                    </div>
                                    <p className="text-2xl font-bold text-amber-600">{reportStats.completedTasks}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs font-bold text-muted-foreground">PROGRESS %</p>
                                        <TrendingUp className="h-4 w-4 text-primary" />
                                    </div>
                                    <p className="text-2xl font-bold text-primary">
                                        {reportStats.totalScheduleTasks > 0 ? Math.round((reportStats.completedTasks / reportStats.totalScheduleTasks) * 100) : 0}%
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs font-bold text-muted-foreground">ON TIME</p>
                                        <Clock className="h-4 w-4 text-violet-600" />
                                    </div>
                                    <p className="text-2xl font-bold text-muted-foreground">
                                        {reportStats.totalScheduleTasks > 0 ? Math.round(((reportStats.totalScheduleTasks - (reportStats.totalScheduleTasks - reportStats.completedTasks)) / reportStats.totalScheduleTasks) * 100) : 0}%
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                        <Card>
                            <CardContent className="p-0">
                                <ScrollArea className="h-[400px] w-full">
                                    <Table>
                                        <TableHeader className="bg-muted">
                                            <TableRow>
                                                <TableHead>Task Name</TableHead>
                                                <TableHead>Start Date</TableHead>
                                                <TableHead>End Date</TableHead>
                                                <TableHead className="text-right">Duration</TableHead>
                                                <TableHead className="text-right">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredSchedule.length > 0 ? filteredSchedule.map(task => (
                                                <TableRow key={task.id}>
                                                    <TableCell>
                                                        <p className="font-semibold">{task.taskName}</p>
                                                        <p className="text-xs text-muted-foreground">{task.description}</p>
                                                    </TableCell>
                                                    <TableCell>{task.startDate}</TableCell>
                                                    <TableCell>{task.endDate}</TableCell>
                                                    <TableCell className="text-right">{task.duration} days</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={task.status === 'Completed' ? 'default' : task.status === 'On Track' ? 'secondary' : 'destructive'}>
                                                            {task.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-8">
                                                        <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                                                        <p className="text-muted-foreground">No schedule tasks found.</p>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="quality-reports" className="p-4">
                        <div className="flex justify-between mb-4 items-center">
                            <Input
                                placeholder="Search quality tests..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-64"
                            />
                            <Button variant="outline">
                                <Filter className="mr-2 h-4 w-4" /> Filter Tests
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs font-bold text-muted-foreground">TOTAL TESTS</p>
                                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                                    </div>
                                    <p className="text-2xl font-bold text-emerald-600">{reportStats.totalTests}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs font-bold text-muted-foreground">PASSED</p>
                                        <CheckCircle className="h-4 w-4 text-amber-600" />
                                    </div>
                                    <p className="text-2xl font-bold text-amber-600">{reportStats.passedTests}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs font-bold text-muted-foreground">PASS RATE</p>
                                        <TrendingUp className="h-4 w-4 text-primary" />
                                    </div>
                                    <p className="text-2xl font-bold text-primary">
                                        {reportStats.totalTests > 0 ? Math.round((reportStats.passedTests / reportStats.totalTests) * 100) : 0}%
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs font-bold text-muted-foreground">FAILED</p>
                                        <AlertTriangle className="h-4 w-4 text-violet-600" />
                                    </div>
                                    <p className="text-2xl font-bold text-destructive">
                                        {reportStats.totalTests - reportStats.passedTests}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                        <Card>
                            <CardContent className="p-0">
                                <ScrollArea className="h-[400px] w-full">
                                    <Table>
                                        <TableHeader className="bg-muted">
                                            <TableRow>
                                                <TableHead>Sample ID</TableHead>
                                                <TableHead>Test Name</TableHead>
                                                <TableHead>Category</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead className="text-right">Result</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredTests.length > 0 ? filteredTests.map(test => (
                                                <TableRow key={test.id}>
                                                    <TableCell>
                                                        <p className="font-semibold">{test.sampleId}</p>
                                                        <p className="text-xs text-muted-foreground">{test.date}</p>
                                                    </TableCell>
                                                    <TableCell>{test.testName}</TableCell>
                                                    <TableCell>{test.category}</TableCell>
                                                    <TableCell>{test.date}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={test.result === 'Pass' ? 'default' : 'destructive'}>
                                                            {test.result}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-8">
                                                        <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                                                        <p className="text-muted-foreground">No quality tests found.</p>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="inspection-reports" className="p-4">
                        <div className="flex justify-between mb-4 items-center">
                            <Input
                                placeholder="Search inspection reports..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-64"
                            />
                            <Button variant="outline">
                                <Filter className="mr-2 h-4 w-4" /> Filter Reports
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs font-bold text-muted-foreground">TOTAL RFIs</p>
                                        <Eye className="h-4 w-4 text-emerald-600" />
                                    </div>
                                    <p className="text-2xl font-bold text-emerald-600">{reportStats.totalRfis}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs font-bold text-muted-foreground">RESOLVED</p>
                                        <CheckCircle className="h-4 w-4 text-amber-600" />
                                    </div>
                                    <p className="text-2xl font-bold text-amber-600">{reportStats.resolvedRfis}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs font-bold text-muted-foreground">RESOLUTION %</p>
                                        <TrendingUp className="h-4 w-4 text-primary" />
                                    </div>
                                    <p className="text-2xl font-bold text-primary">
                                        {reportStats.totalRfis > 0 ? Math.round((reportStats.resolvedRfis / reportStats.totalRfis) * 100) : 0}%
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs font-bold text-muted-foreground">PENDING</p>
                                        <AlertTriangle className="h-4 w-4 text-violet-600" />
                                    </div>
                                    <p className="text-2xl font-bold text-destructive">
                                        {reportStats.totalRfis - reportStats.resolvedRfis}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                        <Card>
                            <CardContent className="p-0">
                                <ScrollArea className="h-[400px] w-full">
                                    <Table>
                                        <TableHeader className="bg-muted">
                                            <TableRow>
                                                <TableHead>RFI No</TableHead>
                                                <TableHead>Title</TableHead>
                                                <TableHead>Category</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead className="text-right">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredRfis.length > 0 ? filteredRfis.map(rfi => (
                                                <TableRow key={rfi.id}>
                                                    <TableCell>
                                                        <p className="font-semibold">{rfi.rfiNo}</p>
                                                        <p className="text-xs text-muted-foreground">{rfi.date}</p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="font-semibold">{rfi.title}</p>
                                                        <p className="text-xs text-muted-foreground">{rfi.description}</p>
                                                    </TableCell>
                                                    <TableCell>{rfi.category}</TableCell>
                                                    <TableCell>{rfi.date}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={rfi.status === RFIStatus.CLOSED ? 'default' : rfi.status === RFIStatus.OPEN || rfi.status === RFIStatus.PENDING_INSPECTION ? 'secondary' : 'outline'}>
                                                            {rfi.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-8">
                                                        <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                                                        <p className="text-muted-foreground">No inspection reports found.</p>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="progress-reports" className="p-4">
                        <div className="flex justify-between mb-4 items-center">
                            <Input
                                placeholder="Search progress reports..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-64"
                            />
                            <Button variant="outline">
                                <Filter className="mr-2 h-4 w-4" /> Filter Reports
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs font-bold text-muted-foreground">TOTAL STRUCTURES</p>
                                        <HardHat className="h-4 w-4 text-emerald-600" />
                                    </div>
                                    <p className="text-2xl font-bold text-emerald-600">{reportStats.totalStructures}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs font-bold text-muted-foreground">COMPLETED</p>
                                        <CheckCircle className="h-4 w-4 text-amber-600" />
                                    </div>
                                    <p className="text-2xl font-bold text-amber-600">{reportStats.completedStructures}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs font-bold text-muted-foreground">PROGRESS %</p>
                                        <TrendingUp className="h-4 w-4 text-primary" />
                                    </div>
                                    <p className="text-2xl font-bold text-primary">
                                        {reportStats.totalStructures > 0 ? Math.round((reportStats.completedStructures / reportStats.totalStructures) * 100) : 0}%
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs font-bold text-muted-foreground">ACTIVE TODAY</p>
                                        <MapPin className="h-4 w-4 text-violet-600" />
                                    </div>
                                    <p className="text-2xl font-bold text-muted-foreground">
                                        {dailyReports.filter(dr => dr.date === new Date().toISOString().split('T')[0]).length}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                        <Card>
                            <CardContent className="p-0">
                                <ScrollArea className="h-[400px] w-full">
                                    <Table>
                                        <TableHeader className="bg-muted">
                                            <TableRow>
                                                <TableHead>Structure ID</TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Location</TableHead>
                                                <TableHead className="text-right">Progress</TableHead>
                                                <TableHead className="text-right">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {structures.length > 0 ? structures.map(structure => (
                                                <TableRow key={structure.id}>
                                                    <TableCell>{structure.id}</TableCell>
                                                    <TableCell>
                                                        <p className="font-semibold">{structure.name}</p>
                                                        <p className="text-xs text-muted-foreground">{structure.type}</p>
                                                    </TableCell>
                                                    <TableCell>{structure.location}</TableCell>
                                                    <TableCell className="text-right">{structure.progress || 0}%</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={structure.status === 'Completed' ? 'default' : structure.status === 'In Progress' ? 'secondary' : 'outline'}>
                                                            {structure.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-8">
                                                        <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                                                        <p className="text-muted-foreground">No progress reports found.</p>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="export-center" className="p-4">
                        <Alert className="mb-4">
                            <Download className="h-4 w-4" />
                            <AlertDescription>
                                Export all project reports in various formats (Excel, CSV) from this centralized hub.
                            </AlertDescription>
                        </Alert>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center space-x-2 pb-2">
                                    <FileText className="text-primary h-6 w-6" />
                                    <CardTitle>BOQ & Financial Reports</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold">BOQ Summary Report</p>
                                                <p className="text-sm text-muted-foreground">Complete BOQ with rates and quantities</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(exportStatus['boq-summary'] || 'idle')}
                                                <Button variant="outline" size="sm" onClick={() => handleExportBOQ('boq-summary')} disabled={exportStatus['boq-summary'] === 'processing'}>
                                                    {exportStatus['boq-summary'] === 'processing' ? 'Exporting...' : 'Export'}
                                                </Button>
                                            </div>
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold">Financial Summary</p>
                                                <p className="text-sm text-muted-foreground">Revenue, expenses, and profit margins</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(exportStatus['financial-summary'] || 'idle')}
                                                <Button variant="outline" size="sm" onClick={() => alert('Financial Summary export functionality is not yet implemented.')} disabled={exportStatus['financial-summary'] === 'processing'}>
                                                    {exportStatus['financial-summary'] === 'processing' ? 'Exporting...' : 'Export'}
                                                </Button>
                                            </div>
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold">Contract Bills</p>
                                                <p className="text-sm text-muted-foreground">All contract billing certificates</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(exportStatus['contract-bills'] || 'idle')}
                                                <Button variant="outline" size="sm" onClick={() => alert('Contract Bills export functionality is not yet implemented.')} disabled={exportStatus['contract-bills'] === 'processing'}>
                                                    {exportStatus['contract-bills'] === 'processing' ? 'Exporting...' : 'Export'}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center space-x-2 pb-2">
                                    <BarChart3 className="text-emerald-600 h-6 w-6" />
                                    <CardTitle>Schedule & Progress Reports</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold">Schedule Progress</p>
                                                <p className="text-sm text-muted-foreground">Task completion and timeline analysis</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(exportStatus['schedule-progress'] || 'idle')}
                                                <Button variant="outline" size="sm" onClick={() => handleExportSchedule('schedule-progress')} disabled={exportStatus['schedule-progress'] === 'processing'}>
                                                    {exportStatus['schedule-progress'] === 'processing' ? 'Exporting...' : 'Export'}
                                                </Button>
                                            </div>
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold">Progress Report</p>
                                                <p className="text-sm text-muted-foreground">Daily/weekly progress summary</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(exportStatus['progress-report'] || 'idle')}
                                                <Button variant="outline" size="sm" onClick={() => alert('Progress Report export functionality is not yet implemented.')} disabled={exportStatus['progress-report'] === 'processing'}>
                                                    {exportStatus['progress-report'] === 'processing' ? 'Exporting...' : 'Export'}
                                                </Button>
                                            </div>
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold">Structure Status</p>
                                                <p className="text-sm text-muted-foreground">All structures and their completion status</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(exportStatus['structure-status'] || 'idle')}
                                                <Button variant="outline" size="sm" onClick={() => handleExportStructures('structure-status')} disabled={exportStatus['structure-status'] === 'processing'}>
                                                    {exportStatus['structure-status'] === 'processing' ? 'Exporting...' : 'Export'}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center space-x-2 pb-2">
                                    <CheckCircle className="text-amber-600 h-6 w-6" />
                                    <CardTitle>Quality & Inspection Reports</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold">Lab Test Results</p>
                                                <p className="text-sm text-muted-foreground">All material testing results</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(exportStatus['lab-test-results'] || 'idle')}
                                                <Button variant="outline" size="sm" onClick={() => handleExportTests('lab-test-results')} disabled={exportStatus['lab-test-results'] === 'processing'}>
                                                    {exportStatus['lab-test-results'] === 'processing' ? 'Exporting...' : 'Export'}
                                                </Button>
                                            </div>
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold">RFI Log</p>
                                                <p className="text-sm text-muted-foreground">All Requests for Information</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(exportStatus['rfi-log'] || 'idle')}
                                                <Button variant="outline" size="sm" onClick={() => handleExportRfis('rfi-log')} disabled={exportStatus['rfi-log'] === 'processing'}>
                                                    {exportStatus['rfi-log'] === 'processing' ? 'Exporting...' : 'Export'}
                                                </Button>
                                            </div>
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold">NCR Report</p>
                                                <p className="text-sm text-muted-foreground">Non-Conformance Reports</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(exportStatus['ncr-report'] || 'idle')}
                                                <Button variant="outline" size="sm" onClick={() => handleExportNCRs('ncr-report')} disabled={exportStatus['ncr-report'] === 'processing'}>
                                                    {exportStatus['ncr-report'] === 'processing' ? 'Exporting...' : 'Export'}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center space-x-2 pb-2">
                                    <Download className="text-violet-600 h-6 w-6" />
                                    <CardTitle>Master Reports</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold">Project Dashboard</p>
                                                <p className="text-sm text-muted-foreground">Complete project overview</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(exportStatus['project-dashboard'] || 'idle')}
                                                <Button variant="outline" size="sm" onClick={() => alert('Project Dashboard export functionality is not yet implemented.')} disabled={exportStatus['project-dashboard'] === 'processing'}>
                                                    {exportStatus['project-dashboard'] === 'processing' ? 'Exporting...' : 'Export'}
                                                </Button>
                                            </div>
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold">Resource Utilization</p>
                                                <p className="text-sm text-muted-foreground">Assets, inventory, and workforce</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(exportStatus['resource-utilization'] || 'idle')}
                                                <Button variant="outline" size="sm" onClick={() => alert('Resource Utilization export functionality is not yet implemented.')} disabled={exportStatus['resource-utilization'] === 'processing'}>
                                                    {exportStatus['resource-utilization'] === 'processing' ? 'Exporting...' : 'Export'}
                                                </Button>
                                            </div>
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold">Comprehensive Export</p>
                                                <p className="text-sm text-muted-foreground">All data in single package</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(exportStatus['comprehensive-export'] || 'idle')}
                                                <Button onClick={() => alert('Comprehensive Export functionality is not yet implemented.')} disabled={exportStatus['comprehensive-export'] === 'processing'}>
                                                    {exportStatus['comprehensive-export'] === 'processing' ? 'Exporting...' : 'Export All'}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </Card>
        </div>
    );
};

export default ReportsAnalyticsHub;

const getStatusIcon = (status: 'idle' | 'processing' | 'success' | 'error') => {
    switch (status) {
        case 'processing': return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
        case 'success': return <CheckCircle className="h-4 w-4 text-emerald-600" />;
        case 'error': return <AlertTriangle className="h-4 w-4 text-destructive" />;
        default: return <Download className="h-4 w-4 text-muted-foreground" />;
    }
};

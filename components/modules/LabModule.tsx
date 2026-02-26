import React, { useState, useMemo } from 'react';
import { 
    FlaskConical, Plus, Search, CheckCircle2, XCircle, 
    Trash2, Eye, Printer, AlertTriangle, Microscope,
    ShieldCheck, History, AlertOctagon, TrendingUp, Filter,
    Activity, Beaker, MapPin, ChevronDown
} from 'lucide-react';
import { Project, UserRole, LabTest, NCR, User } from '../../types';

import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';
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
import { Progress } from '~/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion';

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
  const [activeTab, setActiveTab] = useState("test-entry");
  const [searchTerm, setSearchTerm] = useState('');
  const [isNcrModalOpen, setIsNcrModalOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  if (!project) {
    return (
      <div className="p-8 text-center">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Project data not available. Please select a project first.</AlertDescription>
        </Alert>
      </div>
    );
  }
  
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
      setActiveTab("historical-logs");
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
    <div className="p-4 animate-in fade-in duration-500">
      <div className="flex justify-between mb-6 items-center">
        <div>
          <p className="text-xs font-black text-primary uppercase tracking-wider mb-1">Material Assurance</p>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">Lab Registry & Quality Control</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <History className="mr-2 h-4 w-4" /> Monthly Register
          </Button>
          <Button>
            <Printer className="mr-2 h-4 w-4" /> Export Certificate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="flex items-center space-x-4 p-4">
            <Avatar className="h-12 w-12 bg-secondary text-primary">
              <Activity className="h-6 w-6" />
            </Avatar>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">Total Tests</p>
              <p className="text-3xl font-extrabold text-foreground">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-600">
          <CardContent className="flex items-center space-x-4 p-4">
            <Avatar className="h-12 w-12 bg-green-100 text-green-600">
              <ShieldCheck className="h-6 w-6" />
            </Avatar>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">Pass Rate</p>
              <p className="text-3xl font-extrabold text-green-600">{stats.passRate}%</p>
              <Progress value={stats.passRate} className="h-2 mt-2" indicatorColor="bg-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-600">
          <CardContent className="flex items-center space-x-4 p-4">
            <Avatar className="h-12 w-12 bg-red-100 text-red-600">
              <AlertOctagon className="h-6 w-6" />
            </Avatar>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">Critical Fails</p>
              <p className="text-3xl font-extrabold text-red-600">{stats.failed}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-600">
          <CardContent className="flex items-center space-x-4 p-4">
            <Avatar className="h-12 w-12 bg-blue-100 text-blue-600">
              <Beaker className="h-6 w-6" />
            </Avatar>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">QA Status</p>
              <p className="text-3xl font-extrabold text-foreground">Healthy</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger value="test-entry">
            <FlaskConical className="mr-2 h-4 w-4" /> Test Entry
          </TabsTrigger>
          <TabsTrigger value="historical-logs">
            <History className="mr-2 h-4 w-4" /> Historical Logs
          </TabsTrigger>
          <TabsTrigger value="material-trends">
            <TrendingUp className="mr-2 h-4 w-4" /> Material Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="test-entry" className="pt-4">
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Accordion type="single" collapsible defaultValue="item-1" className="col-span-1">
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="bg-muted/50 px-4 py-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Sample Context</AccordionTrigger>
                    <AccordionContent className="p-4 grid gap-4">
                      <Input label="Batch / Sample ID" placeholder="e.g. CONC/322/2024" value={testForm.sampleId} onChange={e => setTestForm({...testForm, sampleId: e.target.value})} />
                      <Input label="Chainage / GPS Location" value={testForm.location} onChange={e => setTestForm({...testForm, location: e.target.value})} />
                      <Select value={testForm.assetId} onValueChange={value => setTestForm({...testForm, assetId: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Target Asset" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">General / Alignment</SelectItem>
                          {(project.structures || []).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem> )}
                        </SelectContent>
                      </Select>
                      <Select value={testForm.technicianId} onValueChange={value => setTestForm({...testForm, technicianId: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Assigned Technician" />
                        </SelectTrigger>
                        <SelectContent>
                          {(() => {
                              const savedUsers = localStorage.getItem('roadmaster-users');
                              const users: User[] = savedUsers ? JSON.parse(savedUsers) : [];
                              return users.map(u => <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem> );
                          })()}
                        </SelectContent>
                      </Select>
                      <Input label="Testing Date" type="date" value={testForm.date} onChange={e => setTestForm({...testForm, date: e.target.value})} />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              
                <Accordion type="single" collapsible defaultValue="item-1" className="col-span-2">
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="bg-muted/50 px-4 py-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Engineering Protocol</AccordionTrigger>
                    <AccordionContent className="p-4 grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Select value={newTestCategory} onValueChange={value => { setNewTestCategory(value as keyof typeof TEST_PROTOCOLS); setSelectedType(null); }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Material Class" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(TEST_PROTOCOLS).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem> )}
                          </SelectContent>
                        </Select>
                        <Select value={selectedType?.name || ''} onValueChange={value => setSelectedType(TEST_PROTOCOLS[newTestCategory].find((t:any) => t.name === value))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Test Standard" />
                          </SelectTrigger>
                          <SelectContent>
                            {(TEST_PROTOCOLS[newTestCategory] as any[]).map(t => <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem> )}
                          </SelectContent>
                        </Select>
                      </div>
                  
                      {selectedType ? (
                        <div className="grid gap-4">
                          <Alert>
                            <ShieldCheck className="h-4 w-4" />
                            <AlertTitle>Verification Limit</AlertTitle>
                            <AlertDescription>
                              For <strong>{selectedType.name}</strong>, the limit is <strong>{selectedType.inverse ? 'Maximum' : 'Minimum'} {selectedType.limit}{selectedType.unit}</strong>.
                            </AlertDescription>
                          </Alert>
                          <div className="grid grid-cols-2 gap-4">
                            {selectedType.parameters.map((param: string) => (
                              <Input 
                                key={param}
                                label={param}
                                type="number"
                                value={testForm.testData[param] || ''}
                                onChange={e => setTestForm({...testForm, testData: {...testForm.testData, [param]: Number(e.target.value)}})}
                                suffix={selectedType.unit}
                              />
                            ))}
                          </div>
                          <Button 
                            size="lg" 
                            onClick={handleSaveTest} 
                            disabled={!testForm.sampleId || Object.keys(testForm.testData).length === 0}
                            className="w-full"
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Certify & Record Result
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Microscope className="mx-auto h-16 w-16 opacity-20 mb-3" />
                          <p className="font-medium">Select a material and test standard to input field observations.</p>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historical-logs" className="pt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between mb-4 items-center">
                <div className="relative w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by ID, location or test type..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" /> Filter Results
                </Button>
              </div>
              
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sample / Technical Ref</TableHead>
                      <TableHead>Test Classification</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTests.length > 0 ? filteredTests.map(test => (
                      <TableRow key={test.id}>
                        <TableCell>
                          <p className="font-extrabold text-primary font-mono">{test.sampleId}</p>
                          <p className="text-xs text-muted-foreground">{test.date}</p>
                        </TableCell>
                        <TableCell>
                          <p className="font-bold">{test.testName}</p>
                          <Badge variant="outline" className="h-4 text-xs font-black uppercase mt-1">{test.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" /> {test.location}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-extrabold font-mono">{test.calculatedValue}</p>
                          <p className="text-xs text-muted-foreground">Req: {test.standardLimit}</p>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={test.result === 'Pass' ? 'default' : 'destructive'} 
                            className="font-extrabold text-xs w-20 justify-center"
                          >
                            {test.result.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {test.result === 'Fail' && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" onClick={() => handleInitiateNcr(test)}>
                                      <AlertTriangle className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Initiate NCR</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon"><Printer className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                          <Beaker className="mx-auto h-12 w-12 text-slate-200 mb-2" />
                          No test records matching your query.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="material-trends" className="pt-4">
          <Card className="min-h-[400px] flex items-center justify-center">
            <CardContent>
              <div className="text-center text-muted-foreground">
                <TrendingUp className="mx-auto h-16 w-16 text-slate-200 mb-4" />
                <h3 className="text-lg font-bold">Material Performance Analytics</h3>
                <p className="text-sm max-w-sm mx-auto mt-2">
                  Aggregated trends for concrete strength and soil compaction will appear here as more data points are logged.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* NCR Dialog */}
      <Dialog open={isNcrModalOpen} onOpenChange={setIsNcrModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="bg-red-600 text-white p-4 rounded-t-lg">
            <div className="flex items-center gap-2">
              <AlertOctagon className="h-6 w-6" />
              <DialogTitle className="text-xl font-bold">Initiate Non-Conformance Report</DialogTitle>
            </div>
          </DialogHeader>
          <div className="p-4 grid gap-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Linked to Failed Sample</AlertTitle>
              <AlertDescription>
                This NCR is linked to failed sample <b>{filteredTests.find(t => t.id === ncrForm.linkedTestId)?.sampleId}</b>.
              </AlertDescription>
            </Alert>
            <Input label="Deviation Description" multiline rows={3} value={ncrForm.description} onChange={e => setNcrForm({...ncrForm, description: e.target.value})} />
            <Select value={ncrForm.severity} onValueChange={value => setNcrForm({...ncrForm, severity: value as any})}>
              <SelectTrigger>
                <SelectValue placeholder="Risk Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low - Rectifiable</SelectItem>
                <SelectItem value="Medium">Medium - Correction Required</SelectItem>
                <SelectItem value="High">High - Structural Concern</SelectItem>
                <SelectItem value="Critical">Critical - Immediate Rejection</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNcrModalOpen(false)}>Discard</Button>
            <Button variant="destructive" onClick={() => { setIsNcrModalOpen(false); setSnackbarOpen(true); }}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Issue NCR Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LabModule;

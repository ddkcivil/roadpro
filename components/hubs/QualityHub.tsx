import React, { useState, useMemo } from 'react';
import { 
    Shield, ShieldCheck, AlertTriangle, FileText, Activity, TrendingUp,
    Eye, Printer, Filter, Plus, Flame, Info,
    ChevronDown, Scale, MapPin, History
    } from 'lucide-react';import { Project, UserRole } from '../../types';

import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Badge } from '~/components/ui/badge';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Avatar } from '~/components/ui/avatar';
import { Progress } from '~/components/ui/progress';
import { cn } from '~/lib/utils';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';


// NOTE: This is a refactored version of the QualityHub component.
// The original logic has been temporarily removed to facilitate the UI migration.
// It will be re-implemented in subsequent steps.

interface Props {
  project: Project;
  userRole: UserRole;
  onProjectUpdate: (project: Project) => void;
}

const QualityHub: React.FC<Props> = ({ project, userRole }) => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

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
    );
  }, [labTests, searchTerm]);

  const filteredNCRs = useMemo(() => {
    return ncRs.filter(n => 
        n.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.ncrNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [ncRs, searchTerm]);

  const filteredRFIs = useMemo(() => {
    return rfis.filter(r => 
        r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.rfiNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rfis, searchTerm]);

  return (
    <div className="animate-in fade-in duration-500 p-4">
      <div className="flex justify-between mb-4 items-center">
        <div>
          <p className="text-xs font-bold text-primary tracking-widest uppercase">QUALITY ASSURANCE</p>
          <h1 className="text-2xl font-black text-foreground">Quality Hub & Compliance Center</h1>
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

      {/* Quality Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <Avatar className="h-12 w-12 bg-secondary text-primary">
              <Scale className="h-6 w-6" />
            </Avatar>
            <div>
              <p className="text-xs font-bold text-muted-foreground">LAB TESTS</p>
              <h2 className="text-2xl font-bold">{stats.totalTests}</h2>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <Avatar className="h-12 w-12 bg-emerald-100 text-emerald-700">
              <ShieldCheck className="h-6 w-6" />
            </Avatar>
            <div>
              <p className="text-xs font-bold text-muted-foreground">PASS RATE</p>
              <h2 className="text-2xl font-bold text-emerald-700">{stats.passRate}%</h2>
            </div>
          </CardContent>
          <Progress value={stats.passRate} className="h-1.5 [&::-webkit-progress-bar]:bg-slate-200 [&::-webkit-progress-value]:bg-emerald-600 rounded-none" />
        </Card>
        <Card className="border-l-4 border-destructive">
          <CardContent className="p-4 flex items-center gap-4">
            <Avatar className="h-12 w-12 bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </Avatar>
            <div>
              <p className="text-xs font-bold text-muted-foreground">OPEN NCRs</p>
              <h2 className="text-2xl font-bold text-destructive">{stats.openNCRs}</h2>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <Avatar className="h-12 w-12 bg-amber-100 text-amber-700">
              <FileText className="h-6 w-6" />
            </Avatar>
            <div>
              <p className="text-xs font-bold text-muted-foreground">OPEN RFIs</p>
              <h2 className="text-2xl font-bold text-amber-700">{stats.openRFIs}</h2>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="h-full">
          <CardContent className="p-4">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" /> Overall Quality Status
            </h2>
            <Progress value={stats.passRate} className="h-2 [&::-webkit-progress-bar]:bg-slate-200 [&::-webkit-progress-value]:bg-emerald-600 mb-2" />
            <p className="text-sm text-muted-foreground">
              {stats.passedTests} of {stats.totalTests} tests passed
            </p>
            <div className="flex justify-around mt-4">
              <div className="text-center">
                <p className="text-xl font-bold text-emerald-600">{stats.passedTests}</p>
                <p className="text-sm text-muted-foreground">Passed</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-destructive">{stats.totalTests - stats.passedTests}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-amber-600">{stats.openNCRs}</p>
                <p className="text-sm text-muted-foreground">NCRs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="h-full">
          <CardContent className="p-4">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-600" /> Critical Areas
            </h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Soil Compaction: 2 failing tests
              </li>
              <li className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Concrete Strength: 1 failing test
              </li>
              <li className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Asphalt Density: Monitoring
              </li>
            </ul>
          </CardContent>
        </Card>
        
        <Card className="h-full">
          <CardContent className="p-4">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" /> Quality Trends
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Quality metrics over the last 30 days:
            </p>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <p className="text-sm text-emerald-600">+12% improvement</p>
            </div>
            <p className="text-xs text-muted-foreground">
              from previous period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quality Hub Tabs */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 h-16">
            <TabsTrigger value="dashboard">
              <Shield className="mr-2 h-4 w-4" /> Quality Dashboard
            </TabsTrigger>
            <TabsTrigger value="lab-tests">
              <Scale className="mr-2 h-4 w-4" /> Lab Tests
            </TabsTrigger>
            <TabsTrigger value="ncrs">
              <AlertTriangle className="mr-2 h-4 w-4" /> NCRs
            </TabsTrigger>
            <TabsTrigger value="rfis">
              <FileText className="mr-2 h-4 w-4" /> RFIs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Recent Lab Tests */}
              <Collapsible open={expandedSection === 'lab-tests'} onOpenChange={() => setExpandedSection(prev => prev === 'lab-tests' ? null : 'lab-tests')}>
                <CollapsibleTrigger asChild>
                  <Card className="relative hover:bg-muted">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="flex items-center gap-2">
                        <Scale className="text-blue-600 h-5 w-5" />
                        <CardTitle>Recent Lab Tests</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>{labTests.length} tests</Badge>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", expandedSection === 'lab-tests' && "rotate-180")} />
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Sample ID</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Result</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredLabTests.length > 0 ? filteredLabTests.map(test => (
                            <TableRow key={test.id}>
                              <TableCell>{test.sampleId}</TableCell>
                              <TableCell>{test.testName}</TableCell>
                              <TableCell>{test.location}</TableCell>
                              <TableCell>
                                <Badge variant={test.result === 'Pass' ? 'default' : 'destructive'}>{test.result}</Badge>
                              </TableCell>
                              <TableCell>{test.date}</TableCell>
                            </TableRow>
                          )) : (
                            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No recent lab tests.</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </CollapsibleTrigger>
              </Collapsible>

              {/* Non-Conformance Reports */}
              <Collapsible open={expandedSection === 'ncrs'} onOpenChange={() => setExpandedSection(prev => prev === 'ncrs' ? null : 'ncrs')}>
                <CollapsibleTrigger asChild>
                  <Card className="relative hover:bg-muted">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="text-destructive h-5 w-5" />
                        <CardTitle>Non-Conformance Reports</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">{ncRs.length} NCRs</Badge>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", expandedSection === 'ncrs' && "rotate-180")} />
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>NCR #</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredNCRs.length > 0 ? filteredNCRs.map(ncr => (
                            <TableRow key={ncr.id}>
                              <TableCell>{ncr.ncrNumber}</TableCell>
                              <TableCell>{ncr.location}</TableCell>
                              <TableCell>
                                <Badge variant={ncr.severity === 'Critical' ? 'destructive' : ncr.severity === 'High' ? 'warning' : 'default'}>
                                  {ncr.severity}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={ncr.status === 'Open' ? 'warning' : ncr.status === 'Closed' ? 'default' : 'secondary'}>
                                  {ncr.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{ncr.dateRaised}</TableCell>
                            </TableRow>
                          )) : (
                            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No recent NCRs.</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </CollapsibleTrigger>
              </Collapsible>

              {/* Requests for Information */}
              <Collapsible open={expandedSection === 'rfis'} onOpenChange={() => setExpandedSection(prev => prev === 'rfis' ? null : 'rfis')}>
                <CollapsibleTrigger asChild>
                  <Card className="relative hover:bg-muted">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="text-purple-600 h-5 w-5" />
                        <CardTitle>Requests for Information</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{rfis.length} RFIs</Badge>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", expandedSection === 'rfis' && "rotate-180")} />
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>RFI #</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredRFIs.length > 0 ? filteredRFIs.map(rfi => (
                            <TableRow key={rfi.id}>
                              <TableCell>{rfi.rfiNumber}</TableCell>
                              <TableCell>{rfi.description.substring(0, 30)}...</TableCell>
                              <TableCell>
                                <Badge variant={rfi.status === 'Open' ? 'warning' : rfi.status === 'Approved' ? 'default' : 'secondary'}>
                                  {rfi.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={rfi.priority === 'High' ? 'destructive' : rfi.priority === 'Medium' ? 'warning' : 'default'}>
                                  {rfi.priority}
                                </Badge>
                              </TableCell>
                              <TableCell>{rfi.date}</TableCell>
                            </TableRow>
                          )) : (
                            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No recent RFIs.</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </CollapsibleTrigger>
              </Collapsible>

              {/* Quality Insights */}
              <Card>
                <CardContent className="p-4">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-600" /> Quality Insights
                  </h2>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      Concrete strength trending upward: Average strength increased by 15% over last week
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Soil compaction monitoring: 2 locations showing below threshold values
                    </li>
                    <li className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      NCR closure rate improving: 75% of NCRs resolved within target timeframe
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="lab-tests" className="p-4">
            <div className="flex justify-between mb-4 items-center">
              <Input
                placeholder="Search lab tests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" /> Filter Results
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-400px)] w-full rounded-md border">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead>Sample ID</TableHead>
                        <TableHead>Test Type</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLabTests.length > 0 ? filteredLabTests.map(test => (
                        <TableRow key={test.id}>
                          <TableCell>
                            <p className="font-bold font-mono text-primary">{test.sampleId}</p>
                            <p className="text-xs text-muted-foreground">{test.date}</p>
                          </TableCell>
                          <TableCell>
                            <p className="font-semibold">{test.testName}</p>
                            <Badge variant="secondary" className="text-xs font-mono">{test.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="h-3 w-3" /> {test.location}
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-bold font-mono">{test.calculatedValue}</p>
                            <p className="text-xs text-muted-foreground">Req: {test.standardLimit}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant={test.result === 'Pass' ? 'default' : 'destructive'} className="font-bold">
                              {test.result}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{test.technician || 'Unknown'}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon"><Printer className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                            <p>No lab test records matching your query.</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ncrs" className="p-4">
            <div className="flex justify-between mb-4 items-center">
              <Input
                placeholder="Search NCRs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New NCR
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-400px)] w-full rounded-md border">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead>NCR #</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Raised By</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredNCRs.length > 0 ? filteredNCRs.map(ncr => (
                        <TableRow key={ncr.id}>
                          <TableCell>
                            <p className="font-bold font-mono text-destructive">{ncr.ncrNumber}</p>
                            <p className="text-xs text-muted-foreground">{ncr.dateRaised}</p>
                          </TableCell>
                          <TableCell>{ncr.description.substring(0, 50)}...</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="h-3 w-3" /> {ncr.location}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={ncr.severity === 'Critical' ? 'destructive' : ncr.severity === 'High' ? 'warning' : 'default'}>
                              {ncr.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={ncr.status === 'Open' ? 'warning' : ncr.status === 'Closed' ? 'default' : 'secondary'}>
                              {ncr.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{ncr.raisedBy}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon"><Printer className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                            <p>No NCR records matching your query.</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rfis" className="p-4">
            <div className="flex justify-between mb-4 items-center">
              <Input
                placeholder="Search RFIs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New RFI
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-400px)] w-full rounded-md border">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead>RFI #</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Requested By</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRFIs.length > 0 ? filteredRFIs.map(rfi => (
                        <TableRow key={rfi.id}>
                          <TableCell>
                            <p className="font-bold font-mono text-purple-700">{rfi.rfiNumber}</p>
                            <p className="text-xs text-muted-foreground">{rfi.date}</p>
                          </TableCell>
                          <TableCell>{rfi.description.substring(0, 50)}...</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="h-3 w-3" /> {rfi.location}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={rfi.priority === 'High' ? 'destructive' : rfi.priority === 'Medium' ? 'warning' : 'default'}>
                              {rfi.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={rfi.status === 'Open' ? 'warning' : rfi.status === 'Approved' ? 'default' : 'secondary'}>
                              {rfi.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{rfi.requestedBy}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon"><Printer className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                            <p>No RFI records matching your query.</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default QualityHub;

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select as ShadcnSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table as ShadcnTable, TableBody as ShadcnTableBody, TableCell as ShadcnTableCell, TableHead as ShadcnTableHead, TableHeader as ShadcnTableHeader, TableRow as ShadcnTableRow } from '../ui/table';
import { Tabs as ShadcnTabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert as ShadcnAlert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Separator } from '../ui/separator';

import {
  FileText, Calendar, Users, HardHat, FileSpreadsheet, TrendingUp,
  CheckCircle, AlertTriangle, MapPin, Image as ImageIcon,
  Receipt, Shield, Trees, FileSignature,
  MessageSquare, Camera, BookOpen, ChevronDown
} from 'lucide-react';
import { Project, UserRole, AppSettings, BOQItem, ScheduleTask, LabTest, NCR, RFI, RFIStatus, StructureAsset, Vehicle, InventoryItem, DailyReport, PreConstructionTask, LandParcel, MapOverlay, EnvironmentRegistry, WeatherInfo } from '../../types';
import { formatCurrency } from '../../utils/formatting/exportUtils';

interface Props {
  project: Project;
  userRole: UserRole;
  settings: AppSettings;
  onProjectUpdate: (project: Project) => void;
}

const MPRReportModule: React.FC<Props> = ({ project, settings, onProjectUpdate, userRole }) => {
  const [reportMonth, setReportMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [activeTab, setActiveTab] = useState(0);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  
  // Calculate project statistics
  const financialSummary = {
    original: project.boq.reduce((acc, item) => acc + (item.quantity * item.rate), 0),
    variation: project.boq.reduce((acc, item) => acc + ((item.variationQuantity || 0) * item.rate), 0),
    revised: project.boq.reduce((acc, item) => acc + (item.quantity * item.rate) + ((item.variationQuantity || 0) * item.rate), 0),
    progressValue: project.boq.reduce((acc, item) => acc + (item.completedQuantity * item.rate), 0)
  };

  const physicalProgress = {
    planned: project.schedule.reduce((acc, task) => acc + (task.progress / 100), 0) / project.schedule.length || 0,
    actual: project.boq.reduce((acc, item) => acc + (item.completedQuantity / item.quantity), 0) / project.boq.length || 0
  };

  const handleGenerateReport = () => {
    setIsExportDialogOpen(true);
  };

  const handleExport = () => {
    alert('Monthly Progress Report would be exported in the specified format');
    setIsExportDialogOpen(false);
  };

  const getWeatherData = () => {
    if (!project.weather) return null;
    return project.weather;
  };

  const getEnvironmentalData = () => {
    return project.environmentRegistry || null;
  };

  const getSafetyData = () => {
    const activeNCRs = project.ncrs.filter(ncr => ncr.status !== 'Closed');
    const openRFIs = project.rfis.filter(rfi => rfi.status !== RFIStatus.CLOSED);
    return { activeNCRs, openRFIs };
  };

  return (
    <div className="h-[calc(100vh-140px)] flex gap-3">
      <Card className="w-[300px] rounded-3xl flex flex-col overflow-hidden border">
        <div className="p-6 border-b bg-muted">
          <h2 className="text-lg font-black">MPR Generator</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Monthly Progress Report
          </p>

          <div className="mb-4">
            <Label htmlFor="report-month">Reporting Month</Label>
            <Input
              id="report-month"
              type="month"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleGenerateReport}
          >
            <FileText size={18} className="mr-2" />
            Generate MPR
          </Button>
        </div>

        <div className="flex-1 p-4 overflow-auto">
          <h3 className="text-sm font-bold mb-4">PROJECT STATS</h3>

          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3 text-center bg-muted">
              <p className="text-xs text-muted-foreground">Planned</p>
              <p className="text-lg font-bold">{(physicalProgress.planned * 100).toFixed(1)}%</p>
            </Card>
            <Card className="p-3 text-center bg-muted">
              <p className="text-xs text-muted-foreground">Actual</p>
              <p className="text-lg font-bold text-green-600">{(physicalProgress.actual * 100).toFixed(1)}%</p>
            </Card>
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold">BOQ Items</span>
              <span className="text-sm">{project.boq.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold">Active Tasks</span>
              <span className="text-sm">{project.schedule.filter(t => t.status !== 'Completed').length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold">Structures</span>
              <span className="text-sm">{project.structures?.length || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold">Active NCRs</span>
              <span className="text-sm">{project.ncrs.filter(n => n.status !== 'Closed').length}</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex-1 overflow-auto">
        <ShadcnTabs
          value={activeTab.toString()}
          onValueChange={(value) => setActiveTab(parseInt(value))}
          className="border-b"
        >
          <TabsList>
            <TabsTrigger value="0">Executive Summary</TabsTrigger>
            <TabsTrigger value="1">Physical Progress</TabsTrigger>
            <TabsTrigger value="2">Financial Progress</TabsTrigger>
            <TabsTrigger value="3">Resources</TabsTrigger>
            <TabsTrigger value="4">Quality & Safety</TabsTrigger>
            <TabsTrigger value="5">Environmental</TabsTrigger>
            <TabsTrigger value="6">Endorsement</TabsTrigger>
            <TabsTrigger value="7">Issues</TabsTrigger>
            <TabsTrigger value="8">Photos</TabsTrigger>
          </TabsList>
        </ShadcnTabs>

        <div className="p-6">
          {activeTab === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="rounded-3xl">
                <CardContent className="p-6">
                  <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                    <FileSpreadsheet size={20} className="text-primary" /> Financial Overview
                  </h2>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <Card className="p-4 text-center bg-muted">
                      <p className="text-xs text-muted-foreground">Original</p>
                      <p className="text-lg font-bold">{formatCurrency(financialSummary.original, settings)}</p>
                    </Card>
                    <Card className="p-4 text-center bg-muted">
                      <p className="text-xs text-muted-foreground">Variation</p>
                      <p className="text-lg font-bold">{formatCurrency(financialSummary.variation, settings)}</p>
                    </Card>
                    <Card className="p-4 text-center bg-muted">
                      <p className="text-xs text-muted-foreground">Revised</p>
                      <p className="text-lg font-bold">{formatCurrency(financialSummary.revised, settings)}</p>
                    </Card>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground mb-2">Progress Value</p>
                    <Card className="p-4 bg-muted">
                      <p className="text-2xl font-black text-green-600">
                        {formatCurrency(financialSummary.progressValue, settings)}
                      </p>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl">
                <CardContent className="p-6">
                  <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                    <TrendingUp size={20} className="text-primary" /> Physical Progress
                  </h2>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Planned vs Actual</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary w-[${physicalProgress.planned * 100}%]"
                          />
                        </div>
                        <p className="text-xs">{(physicalProgress.planned * 100).toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground mb-2">Key Metrics</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Card className="p-3 text-center">
                        <p className="text-lg font-bold text-green-600">+12%</p>
                        <p className="text-xs">MoM Growth</p>
                      </Card>
                      <Card className="p-3 text-center">
                        <p className="text-lg font-bold text-red-600">-3%</p>
                        <p className="text-xs">Delay</p>
                      </Card>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl">
                <CardContent className="p-6">
                  <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                    <Calendar size={20} className="text-primary" /> Contract & Timeline
                  </h2>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <Card className="p-4 bg-muted">
                      <p className="text-xs text-muted-foreground">Contract Duration</p>
                      <p className="text-lg font-black">{project.contractPeriod || 'TBD'}</p>
                    </Card>
                    <Card className="p-4 bg-muted">
                      <p className="text-xs text-muted-foreground">Elapsed Time</p>
                      <p className="text-lg font-black">{(project.schedule.length > 0 ? project.schedule.filter(s => s.status === 'Completed').length / project.schedule.length * 100 : 0).toFixed(1)}%</p>
                    </Card>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground mb-2">Milestones</p>
                    <Card className="p-4 bg-muted">
                      <p className="text-sm">{project.milestones?.length || 0} Total, {project.milestones?.filter(m => m.status === 'Completed').length || 0} Completed</p>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl">
                <CardContent className="p-6">
                  <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                    <Users size={20} className="text-primary" /> Key Personnel
                  </h2>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold">Project Manager</span>
                      <span className="text-xs text-muted-foreground">{project.projectManager || 'TBD'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold">Engineer</span>
                      <span className="text-xs text-muted-foreground">{project.engineer || 'TBD'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold">Supervisor</span>
                      <span className="text-xs text-muted-foreground">{project.supervisor || 'TBD'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl col-span-full">
                <CardContent className="p-6">
                  <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                    <BookOpen size={20} className="text-primary" /> Project Summary
                  </h2>

                  <p className="text-sm mb-4">
                    The project is currently executing {project.boq.length} BOQ items across {project.structures?.length || 0} structural assets.
                    As of {new Date().toLocaleDateString()}, the physical progress stands at {(physicalProgress.actual * 100).toFixed(1)}% against
                    the planned {(physicalProgress.planned * 100).toFixed(1)}%. The project value stands at {formatCurrency(financialSummary.revised, settings)}
                    with a progress value of {formatCurrency(financialSummary.progressValue, settings)}.
                  </p>

                  <div className="mt-4 flex gap-2 flex-wrap">
                    <Badge>On Track</Badge>
                    <Badge>Weather Delays</Badge>
                    <Badge>Safety Compliant</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {activeTab === 6 && (
            <div className="space-y-6">
              <Card className="rounded-3xl">
                <CardContent className="p-6">
                  <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                    <FileSignature size={20} className="text-primary" /> Endorsement Sheet
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-4 bg-muted">
                      <p className="text-xs text-muted-foreground">Project Manager</p>
                      <p className="text-sm font-bold">{project.projectManager || 'TBD'}</p>
                      <p className="text-xs text-muted-foreground">Signature: ________________ Date: {new Date().toLocaleDateString()}</p>
                    </Card>
                    <Card className="p-4 bg-muted">
                      <p className="text-xs text-muted-foreground">Supervision Consultant</p>
                      <p className="text-sm font-bold">{project.consultantName || 'BDA-BN-UDAYA JV'}</p>
                      <p className="text-xs text-muted-foreground">Signature: ________________ Date: {new Date().toLocaleDateString()}</p>
                    </Card>
                    <Card className="p-4 bg-muted">
                      <p className="text-xs text-muted-foreground">Project Implementation Unit</p>
                      <p className="text-sm font-bold">{project.clientName || 'PIU'}</p>
                      <p className="text-xs text-muted-foreground">Signature: ________________ Date: {new Date().toLocaleDateString()}</p>
                    </Card>
                    <Card className="p-4 bg-muted">
                      <p className="text-xs text-muted-foreground">Funding Agency Representative</p>
                      <p className="text-sm font-bold">Asian Development Bank</p>
                      <p className="text-xs text-muted-foreground">Signature: ________________ Date: {new Date().toLocaleDateString()}</p>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {activeTab === 7 && (
            <div className="space-y-6">
              <Card className="rounded-3xl">
                <CardContent className="p-6">
                  <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                    <MessageSquare size={20} className="text-primary" /> Issue Register
                  </h2>

                  <ShadcnTable>
                    <ShadcnTableHeader>
                      <ShadcnTableRow>
                        <ShadcnTableCell>Issue ID</ShadcnTableCell>
                        <ShadcnTableCell>Description</ShadcnTableCell>
                        <ShadcnTableCell className="text-right">Priority</ShadcnTableCell>
                        <ShadcnTableCell className="text-right">Status</ShadcnTableCell>
                        <ShadcnTableCell className="text-right">Date Raised</ShadcnTableCell>
                        <ShadcnTableCell className="text-right">Target Resolution</ShadcnTableCell>
                      </ShadcnTableRow>
                    </ShadcnTableHeader>
                    <ShadcnTableBody>
                      {[
                        ...project.ncrs.map((ncr, i) => ({
                          id: `NCR-${i + 1}`,
                          description: ncr.description.substring(0, 50),
                          priority: 'High',
                          status: ncr.status as any,
                          dateRaised: ncr.date || 'TBD',
                          targetResolution: 'TBD'
                        })),
                        ...project.rfis.map((rfi, i) => ({
                          id: `RFI-${i + 1}`,
                          description: rfi.question.substring(0, 50),
                          priority: rfi.priority || 'Medium',
                          status: rfi.status as any,
                          dateRaised: rfi.date || 'TBD',
                          targetResolution: rfi.responseDate || 'TBD'
                        }))
                      ].slice(0, 10).map((issue, index) => (
                        <ShadcnTableRow key={index}>
                          <ShadcnTableCell>{issue.id}</ShadcnTableCell>
                          <ShadcnTableCell>{issue.description}</ShadcnTableCell>
                          <ShadcnTableCell className="text-right">
                            <Badge variant={issue.priority === 'High' ? 'destructive' : issue.priority === 'Medium' ? 'secondary' : 'default'}>
                              {issue.priority}
                            </Badge>
                          </ShadcnTableCell>
                          <ShadcnTableCell className="text-right">
                            <Badge variant={String(issue.status) === String('Closed') || String(issue.status) === String(RFIStatus.CLOSED) ? 'default' : 'secondary'}>
                              {issue.status}
                            </Badge>
                          </ShadcnTableCell>
                          <ShadcnTableCell className="text-right">{issue.dateRaised}</ShadcnTableCell>
                          <ShadcnTableCell className="text-right">{issue.targetResolution}</ShadcnTableCell>
                        </ShadcnTableRow>
                      ))}
                    </ShadcnTableBody>
                  </ShadcnTable>
                </CardContent>
              </Card>
            </div>
          )}
          
          {activeTab === 8 && (
            <div className="space-y-6">
              <Card className="rounded-3xl">
                <CardContent className="p-6">
                  <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                    <Camera size={20} className="text-primary" /> Site Photographs
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {project.dailyReports?.slice(0, 8).flatMap(report =>
                      report.photos?.map((photo, idx) => (
                        <Card
                          key={`${report.id}-${idx}`}
                          className="p-2 text-center cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => alert(`Photo preview would open: ${photo.url}`)}
                        >
                          <img
                            src={photo.url || '/placeholder-image.jpg'}
                            alt={photo.caption || 'Site photo'}
                            className="w-full h-32 object-cover rounded"
                          />
                          <p className="text-xs mt-2 truncate">
                            {photo.caption || `Site photo ${idx + 1}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {report.date || 'Unknown date'}
                          </p>
                        </Card>
                      ))
                    ) || []}
                  </div>

                  <div className="mt-6 text-center">
                    <Button
                      variant="outline"
                      onClick={() => alert('Photo gallery would open in full view')}
                    >
                      <ImageIcon size={16} className="mr-2" />
                      View All Photos ({project.dailyReports?.reduce((count, report) =>
                        count + (report.photos?.length || 0), 0) || 0})
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {activeTab === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="rounded-3xl">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-black mb-4">BOQ Progress Analysis</h2>

                    <ShadcnTable>
                      <ShadcnTableHeader>
                        <ShadcnTableRow>
                          <ShadcnTableCell>Item No</ShadcnTableCell>
                          <ShadcnTableCell>Description</ShadcnTableCell>
                          <ShadcnTableCell className="text-right">Planned Qty</ShadcnTableCell>
                          <ShadcnTableCell className="text-right">Completed Qty</ShadcnTableCell>
                          <ShadcnTableCell className="text-right">Progress %</ShadcnTableCell>
                          <ShadcnTableCell className="text-right">Value</ShadcnTableCell>
                        </ShadcnTableRow>
                      </ShadcnTableHeader>
                      <ShadcnTableBody>
                        {project.boq.slice(0, 10).map((item, index) => (
                          <ShadcnTableRow key={index}>
                            <ShadcnTableCell>{item.itemNo}</ShadcnTableCell>
                            <ShadcnTableCell>{item.description.substring(0, 30)}...</ShadcnTableCell>
                            <ShadcnTableCell className="text-right">{item.quantity}</ShadcnTableCell>
                            <ShadcnTableCell className="text-right">{item.completedQuantity}</ShadcnTableCell>
                            <ShadcnTableCell className="text-right">
                              <Badge variant={item.completedQuantity === item.quantity ? 'default' : 'secondary'}>
                                {((item.completedQuantity / item.quantity) * 100).toFixed(1)}%
                              </Badge>
                            </ShadcnTableCell>
                            <ShadcnTableCell className="text-right">{formatCurrency(item.completedQuantity * item.rate, settings)}</ShadcnTableCell>
                          </ShadcnTableRow>
                        ))}
                      </ShadcnTableBody>
                    </ShadcnTable>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card className="rounded-3xl h-full">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-black mb-4">Progress Visualization</h2>

                    <div className="h-80 flex items-end gap-1">
                      {project.boq.slice(0, 12).map((item, index) => (
                        <div key={index} className="flex-1 flex flex-col items-center">
                          <div
                            className={`w-full rounded ${item.completedQuantity === item.quantity ? 'bg-green-500' : 'bg-primary'}`}
                            style={{ height: `${(item.completedQuantity / item.quantity) * 100}%` }}
                            title={`${item.description}: ${(item.completedQuantity / item.quantity) * 100}%`}
                          />
                          <p className="text-xs mt-2 text-center">{item.itemNo}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-3">
                <Card className="rounded-3xl">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                      <Calendar size={20} className="text-primary" /> Pre-Construction Activities
                    </h2>

                    <ShadcnTable>
                      <ShadcnTableHeader>
                        <ShadcnTableRow>
                          <ShadcnTableCell>Activity</ShadcnTableCell>
                          <ShadcnTableCell>Status</ShadcnTableCell>
                          <ShadcnTableCell className="text-right">Start Date</ShadcnTableCell>
                          <ShadcnTableCell className="text-right">End Date</ShadcnTableCell>
                          <ShadcnTableCell className="text-right">Progress</ShadcnTableCell>
                        </ShadcnTableRow>
                      </ShadcnTableHeader>
                      <ShadcnTableBody>
                        {project.preConstruction?.slice(0, 5).map((task, index) => (
                          <ShadcnTableRow key={index}>
                            <ShadcnTableCell>{task.description.substring(0, 30)}...</ShadcnTableCell>
                            <ShadcnTableCell>
                              <Badge variant={task.status === 'Completed' ? 'default' : task.status === 'In Progress' ? 'secondary' : 'destructive'}>
                                {task.status}
                              </Badge>
                            </ShadcnTableCell>
                            <ShadcnTableCell className="text-right">{task.startDate || 'TBD'}</ShadcnTableCell>
                            <ShadcnTableCell className="text-right">{task.endDate || 'TBD'}</ShadcnTableCell>
                            <ShadcnTableCell className="text-right">{task.progress || 0}%</ShadcnTableCell>
                          </ShadcnTableRow>
                        )) || []}
                      </ShadcnTableBody>
                    </ShadcnTable>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          
          {activeTab === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="rounded-3xl">
                <CardContent className="p-6">
                  <h2 className="text-lg font-black mb-4">Financial Progress</h2>

                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4 text-center bg-muted">
                      <p className="text-xs text-muted-foreground">Budget Allocated</p>
                      <p className="text-xl font-black">{formatCurrency(financialSummary.revised, settings)}</p>
                    </Card>
                    <Card className="p-4 text-center bg-muted">
                      <p className="text-xs text-muted-foreground">Expended</p>
                      <p className="text-xl font-black text-green-600">{formatCurrency(financialSummary.progressValue, settings)}</p>
                    </Card>
                    <Card className="p-4 text-center bg-muted">
                      <p className="text-xs text-muted-foreground">Balance</p>
                      <p className="text-xl font-black text-yellow-600">
                        {formatCurrency(financialSummary.revised - financialSummary.progressValue, settings)}
                      </p>
                    </Card>
                    <Card className="p-4 text-center bg-muted">
                      <p className="text-xs text-muted-foreground">Utilization</p>
                      <p className="text-xl font-black">
                        {((financialSummary.progressValue / financialSummary.revised) * 100).toFixed(1)}%
                      </p>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl">
                <CardContent className="p-6">
                  <h2 className="text-lg font-black mb-4">Financial Trend</h2>

                  <div className="h-48 flex items-end gap-1 mt-4">
                    {[60, 65, 70, 75, 80, 85, 90].map((val, index) => (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-green-500 rounded h-[${val}%]"
                        />
                        <p className="text-xs mt-2">{index + 1}M</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl lg:col-span-2">
                <CardContent className="p-6">
                  <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                    <Receipt size={20} className="text-primary" /> Cost Variance Analysis
                  </h2>

                  <ShadcnTable>
                    <ShadcnTableHeader>
                      <ShadcnTableRow>
                        <ShadcnTableCell>BOQ Item</ShadcnTableCell>
                        <ShadcnTableCell className="text-right">Budgeted</ShadcnTableCell>
                        <ShadcnTableCell className="text-right">Actual</ShadcnTableCell>
                        <ShadcnTableCell className="text-right">Variance</ShadcnTableCell>
                        <ShadcnTableCell className="text-right">Variance %</ShadcnTableCell>
                        <ShadcnTableCell className="text-right">Status</ShadcnTableCell>
                      </ShadcnTableRow>
                    </ShadcnTableHeader>
                    <ShadcnTableBody>
                      {project.boq.slice(0, 5).map((item, index) => {
                        const budgeted = item.quantity * item.rate;
                        const actual = item.completedQuantity * item.rate;
                        const variance = actual - budgeted;
                        const variancePercent = budgeted !== 0 ? (variance / budgeted) * 100 : 0;

                        return (
                          <ShadcnTableRow key={index}>
                            <ShadcnTableCell>{item.description.substring(0, 30)}...</ShadcnTableCell>
                            <ShadcnTableCell className="text-right">{formatCurrency(budgeted, settings)}</ShadcnTableCell>
                            <ShadcnTableCell className="text-right">{formatCurrency(actual, settings)}</ShadcnTableCell>
                            <ShadcnTableCell className={`text-right ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(variance, settings)}
                            </ShadcnTableCell>
                            <ShadcnTableCell className={`text-right ${variancePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {variancePercent.toFixed(2)}%
                            </ShadcnTableCell>
                            <ShadcnTableCell className="text-right">
                              <Badge variant={variance >= 0 ? 'default' : 'destructive'}>
                                {variance >= 0 ? 'Under Budget' : 'Over Budget'}
                              </Badge>
                            </ShadcnTableCell>
                          </ShadcnTableRow>
                        );
                      })}
                    </ShadcnTableBody>
                  </ShadcnTable>
                </CardContent>
              </Card>
            </div>
          )}
          
          {activeTab === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="rounded-3xl">
                <CardContent className="p-6">
                  <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                    <Users size={20} className="text-primary" /> Personnel Deployment
                  </h2>

                  <ShadcnTable>
                    <ShadcnTableHeader>
                      <ShadcnTableRow>
                        <ShadcnTableCell>Category</ShadcnTableCell>
                        <ShadcnTableCell className="text-right">Deployed</ShadcnTableCell>
                        <ShadcnTableCell className="text-right">Available</ShadcnTableCell>
                        <ShadcnTableCell className="text-right">Status</ShadcnTableCell>
                      </ShadcnTableRow>
                    </ShadcnTableHeader>
                    <ShadcnTableBody>
                      <ShadcnTableRow>
                        <ShadcnTableCell>Engineers</ShadcnTableCell>
                        <ShadcnTableCell className="text-right">{project.personnel?.filter(p => p.role === 'Engineer' && p.assigned).length || 0}</ShadcnTableCell>
                        <ShadcnTableCell className="text-right">{project.personnel?.filter(p => p.role === 'Engineer' && !p.assigned).length || 0}</ShadcnTableCell>
                        <ShadcnTableCell className="text-right">
                          <Badge variant="default">Active</Badge>
                        </ShadcnTableCell>
                      </ShadcnTableRow>
                      <ShadcnTableRow>
                        <ShadcnTableCell>Skilled Workers</ShadcnTableCell>
                        <ShadcnTableCell className="text-right">{project.personnel?.filter(p => p.role === 'Skilled Worker' && p.assigned).length || 0}</ShadcnTableCell>
                        <ShadcnTableCell className="text-right">{project.personnel?.filter(p => p.role === 'Skilled Worker' && !p.assigned).length || 0}</ShadcnTableCell>
                        <ShadcnTableCell className="text-right">
                          <Badge variant="default">Active</Badge>
                        </ShadcnTableCell>
                      </ShadcnTableRow>
                      <ShadcnTableRow>
                        <ShadcnTableCell>Unskilled Workers</ShadcnTableCell>
                        <ShadcnTableCell className="text-right">{project.personnel?.filter(p => p.role === 'Unskilled Worker' && p.assigned).length || 0}</ShadcnTableCell>
                        <ShadcnTableCell className="text-right">{project.personnel?.filter(p => p.role === 'Unskilled Worker' && !p.assigned).length || 0}</ShadcnTableCell>
                        <ShadcnTableCell className="text-right">
                          <Badge variant="default">Active</Badge>
                        </ShadcnTableCell>
                      </ShadcnTableRow>
                    </ShadcnTableBody>
                  </ShadcnTable>
                </CardContent>
              </Card>

              <Card className="rounded-3xl">
                <CardContent className="p-6">
                  <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                    <HardHat size={20} className="text-primary" /> Equipment Deployment
                  </h2>

                  <ShadcnTable>
                    <ShadcnTableHeader>
                      <ShadcnTableRow>
                        <ShadcnTableCell>Equipment</ShadcnTableCell>
                        <ShadcnTableCell className="text-right">Active</ShadcnTableCell>
                        <ShadcnTableCell className="text-right">Maintenance</ShadcnTableCell>
                        <ShadcnTableCell className="text-right">Available</ShadcnTableCell>
                      </ShadcnTableRow>
                    </ShadcnTableHeader>
                    <ShadcnTableBody>
                      {project.fleet?.slice(0, 5).map((vehicle, index) => (
                        <ShadcnTableRow key={index}>
                          <ShadcnTableCell>{vehicle.name}</ShadcnTableCell>
                          <ShadcnTableCell className="text-right">{vehicle.status === 'Active' ? 1 : 0}</ShadcnTableCell>
                          <ShadcnTableCell className="text-right">{vehicle.status === 'Maintenance' ? 1 : 0}</ShadcnTableCell>
                          <ShadcnTableCell className="text-right">{vehicle.status === 'Available' ? 1 : 0}</ShadcnTableCell>
                        </ShadcnTableRow>
                      )) || []}
                    </ShadcnTableBody>
                  </ShadcnTable>
                </CardContent>
              </Card>

              <Card className="rounded-3xl lg:col-span-2">
                <CardContent className="p-6">
                  <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                    <ImageIcon size={20} className="text-primary" /> Material Status
                  </h2>

                  <ShadcnTable>
                    <ShadcnTableHeader>
                      <ShadcnTableRow>
                        <ShadcnTableCell>Material</ShadcnTableCell>
                        <ShadcnTableCell className="text-right">Required</ShadcnTableCell>
                        <ShadcnTableCell className="text-right">Received</ShadcnTableCell>
                        <ShadcnTableCell className="text-right">Stock</ShadcnTableCell>
                        <ShadcnTableCell className="text-right">Status</ShadcnTableCell>
                      </ShadcnTableRow>
                    </ShadcnTableHeader>
                    <ShadcnTableBody>
                      {project.inventory?.slice(0, 5).map((item, index) => (
                        <ShadcnTableRow key={index}>
                          <ShadcnTableCell>{item.itemName || item.name}</ShadcnTableCell>
                          <ShadcnTableCell className="text-right">{(item.requiredQuantity ?? item.quantity) || 0}</ShadcnTableCell>
                          <ShadcnTableCell className="text-right">{item.receivedQuantity ?? 0}</ShadcnTableCell>
                          <ShadcnTableCell className="text-right">{(item.currentQuantity ?? item.quantity) || 0}</ShadcnTableCell>
                          <ShadcnTableCell className="text-right">
                            <Badge variant={item.currentQuantity && item.requiredQuantity ?
                              (item.currentQuantity >= item.requiredQuantity ? 'default' : 'destructive') : 'secondary'}>
                              {item.currentQuantity && item.requiredQuantity ?
                                (item.currentQuantity >= item.requiredQuantity ? 'Sufficient' : 'Low Stock') : 'TBD'}
                            </Badge>
                          </ShadcnTableCell>
                        </ShadcnTableRow>
                      )) || []}
                    </ShadcnTableBody>
                  </ShadcnTable>
                </CardContent>
              </Card>
            </div>
          )}
          
          {activeTab === 4 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="rounded-3xl">
                <CardContent className="p-6">
                  <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                    <Shield size={20} className="text-primary" /> Safety Status
                  </h2>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <Card className="p-4 text-center bg-muted">
                      <p className="text-xs text-muted-foreground">Active NCRs</p>
                      <p className="text-3xl font-black text-red-600">
                        {project.ncrs.filter(n => n.status !== 'Closed').length}
                      </p>
                    </Card>
                    <Card className="p-4 text-center bg-muted">
                      <p className="text-xs text-muted-foreground">Open RFIs</p>
                      <p className="text-3xl font-black text-yellow-600">
                        {project.rfis.filter(r => r.status !== RFIStatus.CLOSED).length}
                      </p>
                    </Card>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground mb-2">Recent Safety Incidents</p>
                    {project.ncrs.slice(0, 3).map((ncr, index) => (
                      <ShadcnAlert key={index} className="mb-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          {ncr.description.substring(0, 50)}...
                        </AlertDescription>
                      </ShadcnAlert>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl">
                <CardContent className="p-6">
                  <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                    <Trees size={20} className="text-primary" /> Environmental Status
                  </h2>

                  <div className="space-y-4">
                    <div className="border rounded-lg p-3">
                      <h3 className="text-sm font-medium mb-2">Tree Management</h3>
                      <p className="text-xs">Trees Removed: {getEnvironmentalData()?.treesRemoved || 0}</p>
                      <p className="text-xs">Trees Planted: {getEnvironmentalData()?.treesPlanted || 0}</p>
                    </div>

                    <div className="border rounded-lg p-3">
                      <h3 className="text-sm font-medium mb-2">Water Sprinkling</h3>
                      <p className="text-xs">Last 7 days operations: {getEnvironmentalData()?.sprinklingLogs?.length || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {activeTab === 5 && (
            <div className="space-y-6">
              <Card className="rounded-3xl">
                <CardContent className="p-6">
                  <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                    <MapPin size={20} className="text-primary" /> Weather & Location
                  </h2>

                  {getWeatherData() ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <Card className="p-4 text-center bg-muted">
                        <p className="text-xs text-muted-foreground">Temperature</p>
                        <p className="text-3xl font-black">{getWeatherData()?.temp}°C</p>
                      </Card>
                      <Card className="p-4 text-center bg-muted">
                        <p className="text-xs text-muted-foreground">Condition</p>
                        <p className="text-3xl font-black">{getWeatherData()?.condition}</p>
                      </Card>
                    </div>
                  ) : (
                    <ShadcnAlert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Weather data not available for this project
                      </AlertDescription>
                    </ShadcnAlert>
                  )}

                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground mb-2">Impact on Schedule</p>
                    <p className="text-sm">
                      {getWeatherData()?.impactOnSchedule === 'None'
                        ? 'No impact on construction activities'
                        : `Currently experiencing ${getWeatherData()?.impactOnSchedule} impact`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Export Monthly Progress Report</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-sm text-muted-foreground">
              Your report will be generated in the required MPR format with all project data as of {new Date(reportMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}.
            </p>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Project Information</p>
                  <p className="text-xs text-muted-foreground">Client, Contractor, Contract Details</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Physical Progress</p>
                  <p className="text-xs text-muted-foreground">BOQ Completion, Work Activities</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Financial Progress</p>
                  <p className="text-xs text-muted-foreground">Budget Utilization, Cost Analysis</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Quality & Safety</p>
                  <p className="text-xs text-muted-foreground">NCRs, RFIs, Safety Records</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Environmental Data</p>
                  <p className="text-xs text-muted-foreground">EMP Implementation Status</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Endorsement Sheet</p>
                  <p className="text-xs text-muted-foreground">Signatures from stakeholders</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Issue Register</p>
                  <p className="text-xs text-muted-foreground">Tracking of open issues</p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-bold mb-3">Report Approval Workflow</h3>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-8 h-8 bg-blue-100">
                    <Users size={16} className="text-blue-600" />
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Project Manager Review</p>
                    <p className="text-xs text-muted-foreground">Initial review and validation</p>
                  </div>
                  <Badge variant="secondary">Pending</Badge>
                </div>
                <div className="flex items-center space-x-3">
                  <Avatar className="w-8 h-8 bg-blue-100">
                    <Shield size={16} className="text-blue-600" />
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">SDC Validation</p>
                    <p className="text-xs text-muted-foreground">Technical validation by SDC</p>
                  </div>
                  <Badge variant="outline">Pending</Badge>
                </div>
                <div className="flex items-center space-x-3">
                  <Avatar className="w-8 h-8 bg-green-100">
                    <FileSignature size={16} className="text-green-600" />
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">PIU Approval</p>
                    <p className="text-xs text-muted-foreground">Final approval by PIU</p>
                  </div>
                  <Badge variant="outline">Pending</Badge>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport}>
              Export Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MPRReportModule;

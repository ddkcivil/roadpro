import React, { useState, useEffect } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select as ShadcnSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Table as ShadcnTable, TableBody as ShadcnTableBody, TableCell as ShadcnTableCell, TableHead as ShadcnTableHead, TableHeader as ShadcnTableHeader, TableRow as ShadcnTableRow } from '~/components/ui/table';
import { Tabs as ShadcnTabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Alert as ShadcnAlert, AlertDescription } from '~/components/ui/alert';
import { Badge } from '~/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Separator } from '~/components/ui/separator';
import { ScrollArea } from '~/components/ui/scroll-area';
import { cn } from '~/lib/utils';

import {
  FileText, Calendar, Users, HardHat, FileSpreadsheet, TrendingUp,
  CheckCircle, AlertTriangle, MapPin, Image as ImageIcon,
  Receipt, Shield, Trees, FileSignature,
  MessageSquare, Camera, BookOpen, ChevronDown
} from 'lucide-react';
import { Project, UserRole, AppSettings, BOQItem, ScheduleTask, LabTest, NCR, RFI, RFIStatus, StructureAsset, Vehicle, InventoryItem, DailyReport, PreConstructionTask, LandParcel, MapOverlay, EnvironmentRegistry, WeatherInfo } from '../../types';
import { formatCurrency, generatePDF, exportToCSV } from '../../utils/formatting/exportUtils';
import { toast } from 'sonner';

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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<{url: string, caption: string} | null>(null);

  if (!project) {
    return (
      <div className="p-8 text-center">
        <ShadcnAlert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Project data not available. Please select a project first.</AlertDescription>
        </ShadcnAlert>
      </div>
    );
  }

  // Calculate project statistics
  const financialSummary = {
    original: (project?.boq || []).reduce((acc, item) => acc + (item.quantity * item.rate), 0),
    variation: (project?.boq || []).reduce((acc, item) => acc + ((item.variationQuantity || 0) * item.rate), 0),
    revised: (project?.boq || []).reduce((acc, item) => acc + (item.quantity * item.rate) + ((item.variationQuantity || 0) * item.rate), 0),
    progressValue: (project?.boq || []).reduce((acc, item) => acc + (item.completedQuantity * item.rate), 0)
  };

  const physicalProgress = {
    planned: (project?.schedule || []).reduce((acc, task) => acc + (task.progress / 100), 0) / (project?.schedule || [])?.length || 0,
    actual: (project?.boq || []).reduce((acc, item) => acc + (item.completedQuantity / item.quantity), 0) / (project?.boq || [])?.length || 0
  };

  const handleGenerateReport = () => {
    setIsPreviewOpen(true);
  };

  const handleConfirmGenerate = () => {
    setIsPreviewOpen(false);
    setIsExportDialogOpen(true);
  };

  const handleExport = () => {
    toast.success("MPR Exported", { description: `Report for ${reportMonth} has been generated.` });
    setIsExportDialogOpen(false);
  };

  const getWeatherData = () => {
    if (!project.weather) return null;
    return project.weather as WeatherInfo;
  };

  const getEnvironmentalData = () => {
    return project.environmentRegistry as EnvironmentRegistry || null;
  };

  const calculateTimeProgress = (start?: string, end?: string) => {
    if (!start || !end) return 0;
    const startDate = new Date(start).getTime();
    const endDate = new Date(end).getTime();
    const today = new Date().getTime();
    if (today <= startDate) return 0;
    if (today >= endDate) return 100;
    const total = endDate - startDate;
    const elapsed = today - startDate;
    return total > 0 ? (elapsed / total) * 100 : 0;
  };

  const timeProgress = calculateTimeProgress(project.startDate, project.endDate);

  return (
    <div className="h-[calc(100vh-140px)] flex gap-3">
      {/* MPR Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <FileText size={20} />
              </div>
              <div>
                <DialogTitle className="text-xl font-black">MPR Document Preview</DialogTitle>
                <DialogDescription>Review compiled data for {new Date(reportMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-8 max-w-3xl mx-auto py-4">
              {/* Report Header Mockup */}
              <div className="text-center border-b-2 border-primary/20 pb-6">
                <h1 className="text-2xl font-black uppercase tracking-tighter">{project.clientName || "PROJECT CLIENT"}</h1>
                <h2 className="text-lg font-bold text-muted-foreground">{project.name}</h2>
                <div className="mt-4 inline-block px-4 py-1 bg-primary text-white font-black skew-x-[-12deg]">
                  MONTHLY PROGRESS REPORT - {reportMonth}
                </div>
              </div>

              {/* Data Summary Section */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-black text-xs uppercase tracking-widest text-primary">Financial Status</h3>
                  <div className="bg-muted/50 p-4 rounded-2xl border space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Contract Value:</span>
                      <span className="font-bold">{formatCurrency(financialSummary.revised, settings)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Work Certified:</span>
                      <span className="font-bold text-green-600">{formatCurrency(financialSummary.progressValue, settings)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Utilization:</span>
                      <span className="font-bold">{(financialSummary.progressValue / financialSummary.revised * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-black text-xs uppercase tracking-widest text-primary">Physical Status</h3>
                  <div className="bg-muted/50 p-4 rounded-2xl border space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Planned Progress:</span>
                      <span className="font-bold">{(physicalProgress.planned * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Actual Progress:</span>
                      <span className="font-bold text-indigo-600">{(physicalProgress.actual * 100).toFixed(1)}%</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Variance:</span>
                      <span className={cn("font-bold", (physicalProgress.actual - physicalProgress.planned) < 0 ? "text-red-500" : "text-green-600")}>
                        {(physicalProgress.actual * 100 - physicalProgress.planned * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scope & Issues */}
              <div className="space-y-4">
                <h3 className="font-black text-xs uppercase tracking-widest text-primary">Quality & HSE Dashboard</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 border rounded-xl text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Open RFIs</p>
                    <p className="text-xl font-black">{project.rfis.filter(r => r.status === 'Open').length}</p>
                  </div>
                  <div className="p-3 border rounded-xl text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Active NCRs</p>
                    <p className="text-xl font-black text-red-600">{project.ncrs.filter(n => n.status !== 'Closed').length}</p>
                  </div>
                  <div className="p-3 border rounded-xl text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Accidents</p>
                    <p className="text-xl font-black">0</p>
                  </div>
                </div>
              </div>

              <ShadcnAlert className="bg-amber-50 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-xs text-amber-800 font-medium">
                  This is a data-driven preview. The final PDF will include all detailed BOQ appendices, full site photo gallery, and endorsement pages.
                </AlertDescription>
              </ShadcnAlert>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 border-t bg-muted/10">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)} className="h-11 px-6">
              Back to Editor
            </Button>
            <Button onClick={handleConfirmGenerate} className="h-11 px-8 font-black shadow-lg shadow-primary/20">
              Continue to Production <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          className="flex flex-col h-full"
        >
          <TabsList className="border-b justify-start overflow-x-auto h-auto p-0 rounded-none bg-transparent">
            <TabsTrigger value="0" className="py-3 px-4 border-b-2 border-transparent data-[state=active]:border-primary rounded-none">Executive Summary</TabsTrigger>
            <TabsTrigger value="1" className="py-3 px-4 border-b-2 border-transparent data-[state=active]:border-primary rounded-none">Physical Progress</TabsTrigger>
            <TabsTrigger value="2" className="py-3 px-4 border-b-2 border-transparent data-[state=active]:border-primary rounded-none">Financial Progress</TabsTrigger>
            <TabsTrigger value="3" className="py-3 px-4 border-b-2 border-transparent data-[state=active]:border-primary rounded-none">Resources</TabsTrigger>
            <TabsTrigger value="4" className="py-3 px-4 border-b-2 border-transparent data-[state=active]:border-primary rounded-none">Quality & Safety</TabsTrigger>
            <TabsTrigger value="5" className="py-3 px-4 border-b-2 border-transparent data-[state=active]:border-primary rounded-none">Environmental</TabsTrigger>
            <TabsTrigger value="6" className="py-3 px-4 border-b-2 border-transparent data-[state=active]:border-primary rounded-none">Endorsement</TabsTrigger>
            <TabsTrigger value="7" className="py-3 px-4 border-b-2 border-transparent data-[state=active]:border-primary rounded-none">Issues</TabsTrigger>
            <TabsTrigger value="8" className="py-3 px-4 border-b-2 border-transparent data-[state=active]:border-primary rounded-none">Photos</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="0" className="p-6 m-0 focus-visible:outline-none">
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
                              className={cn("h-full bg-primary")}
                              style={{ width: `${(physicalProgress.planned * 100).toFixed(1)}%` }}
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
                      <Card className="p-4 bg-muted text-center">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Contract Duration</p>
                        <p className="text-xl font-black text-primary">{project.contractPeriod || 'TBD'}</p>
                      </Card>
                      <Card className="p-4 bg-muted text-center">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Elapsed Time</p>
                        <p className="text-xl font-black text-primary">{timeProgress.toFixed(1)}%</p>
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
            </TabsContent>

            <TabsContent value="1" className="p-6 m-0 focus-visible:outline-none">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card className="rounded-3xl">
                    <CardContent className="p-6">
                      <h2 className="text-lg font-black mb-4">BOQ Progress Analysis</h2>

                      <ShadcnTable>
                        <ShadcnTableHeader>
                          <ShadcnTableRow>
                            <ShadcnTableHead>Item No</ShadcnTableHead>
                            <ShadcnTableHead>Description</ShadcnTableHead>
                            <ShadcnTableHead className="text-right">Planned Qty</ShadcnTableHead>
                            <ShadcnTableHead className="text-right">Completed Qty</ShadcnTableHead>
                            <ShadcnTableHead className="text-right">Progress %</ShadcnTableHead>
                            <ShadcnTableHead className="text-right">Value</ShadcnTableHead>
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
                              className={cn(
                                "w-full rounded",
                                item.completedQuantity === item.quantity ? "bg-green-500" : "bg-primary"
                              )}
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
              </div>
            </TabsContent>

            <TabsContent value="2" className="p-6 m-0 focus-visible:outline-none">
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
              </div>
            </TabsContent>

            <TabsContent value="4" className="p-6 m-0 focus-visible:outline-none">
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
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </ScrollArea>
        </ShadcnTabs>
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

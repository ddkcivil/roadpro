import React, { useState, useEffect } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Table as ShadcnTable, TableBody as ShadcnTableBody, TableCell as ShadcnTableCell, TableHead as ShadcnTableHead, TableHeader as ShadcnTableHeader, TableRow as ShadcnTableRow } from '~/components/ui/table';
import { Tabs as ShadcnTabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Alert as ShadcnAlert, AlertDescription } from '~/components/ui/alert';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Progress } from '~/components/ui/progress';
import { cn } from '~/lib/utils';

import {
  FileText, Calendar, Users, FileSpreadsheet, TrendingUp,
  AlertTriangle, Shield, BookOpen, ChevronDown, CloudSun, Wind, Thermometer, List
} from 'lucide-react';
import { Project, AppSettings, RFIStatus } from '../../types';
import { formatCurrency } from '../../utils/formatting/exportUtils';
import { generateMPRPDF } from '../../utils/formatting/mprPDFGenerator';
import { fetchDailyWeatherHistory, fetchMonthlySummary, DailyWeatherRecord, MonthlyWeatherSummary } from '../../services/analytics/weatherService';
import { toast } from 'sonner';

interface Props {
  project: Project;
  settings: AppSettings;
}

const MPRReportModule: React.FC<Props> = ({ project, settings }) => {
  const [reportMonth, setReportMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [activeTab, setActiveTab] = useState(0);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [weatherHistory, setWeatherHistory] = useState<DailyWeatherRecord[]>([]);
  const [weatherSummary, setWeatherSummary] = useState<MonthlyWeatherSummary | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  
  // Report-specific editable state
  const [reportDetails, setReportDetails] = useState({
    reportNumber: '02',
    executiveSummary: 'The project is currently in the initial construction phase. Site mobilization is 90% complete. Joint surveys for the primary road sections have been finalized, and material testing is ongoing.',
    challenges: 'Underground utility shifting (water pipes) at Pathardanda section is causing minor delays. Coordination with the local water authority is in progress.',
    workPlanNextMonth: 'Start site clearance and earthwork for Driver Tole road. Complete site laboratory setup and begin cross-drainage structure work.',
    safetyIncidents: '0',
    environmentalCompliance: 'Satisfactory',
    socialSafeguards: 'Resettlement plan survey ongoing. No major grievances reported.',
  });

  // Fetch weather data when report month changes
  useEffect(() => {
    const loadWeather = async () => {
      setIsLoadingWeather(true);
      try {
        const [year, month] = reportMonth.split('-').map(Number);
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        
        const [history, summary] = await Promise.all([
          fetchDailyWeatherHistory(month, year, project.lat || 27.7172, project.lng || 85.3240),
          fetchMonthlySummary(monthNames[month - 1], project.location || 'Butwal, Nepal')
        ]);
        
        setWeatherHistory(history);
        setWeatherSummary(summary);
      } catch (error) {
        console.error("Failed to load weather for MPR", error);
      } finally {
        setIsLoadingWeather(false);
      }
    };
    
    if (project) loadWeather();
  }, [reportMonth, project]);

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

  // NEW: Calculate Real-World Physical Progress from Structural Assets
  const structuralProgress = (() => {
    const structures = project.structures || [];
    if (structures.length === 0) return 0;
    let totalWeight = 0;
    let weightedProgress = 0;
    structures.forEach(s => {
        const totalTarget = s.components.reduce((acc, c) => acc + (c.totalQuantity || 0), 0);
        const totalDone = s.components.reduce((acc, c) => acc + (c.completedQuantity || 0), 0);
        if (totalTarget > 0) {
            const weight = s.components.length; 
            totalWeight += weight;
            weightedProgress += (totalDone / totalTarget) * weight;
        }
    });
    return totalWeight > 0 ? (weightedProgress / totalWeight) : 0;
  })();

  const divergence = (structuralProgress * 100) - (physicalProgress.actual * 100);

  const handleGenerateReport = () => {
    setIsPreviewOpen(true);
  };

  const handleConfirmGenerate = () => {
    setIsPreviewOpen(false);
    setIsExportDialogOpen(true);
  };

  const handleExport = async () => {
    try {
      // Generate the MPR PDF with dynamic details
      await generateMPRPDF(project, reportMonth, settings, reportDetails as any);
      toast.success("MPR Exported", { description: `Report for ${reportMonth} has been generated and downloaded.` });
      setIsExportDialogOpen(false);
    } catch (error) {
      console.error('Error generating MPR PDF:', error);
      toast.error("Export Failed", { description: "There was an error generating the MPR PDF. Please try again." });
    }
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
    <>
    <div className="h-[calc(100vh-140px)] flex flex-col gap-3">
      {/* Executive Progress Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-1">
          <Card className="bg-primary text-primary-foreground shadow-lg border-none relative overflow-hidden">
              <CardContent className="p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Physical Progress</p>
                  <p className="text-2xl font-black italic">{(structuralProgress * 100).toFixed(2)}%</p>
                  <p className="text-[8px] mt-1 font-bold opacity-50 uppercase">From Structural Assets</p>
              </CardContent>
          </Card>
          <Card className="bg-slate-900 text-white shadow-lg border-none relative overflow-hidden">
              <CardContent className="p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Financial Progress</p>
                  <p className="text-2xl font-black italic">{(physicalProgress.actual * 100).toFixed(2)}%</p>
                  <p className="text-[8px] mt-1 font-bold opacity-50 uppercase">From Certified BOQ</p>
              </CardContent>
          </Card>
          <Card className={cn("shadow-lg border-none relative overflow-hidden text-white", divergence > 2 ? "bg-amber-500" : "bg-emerald-500")}>
              <CardContent className="p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Progress Gap</p>
                  <p className="text-2xl font-black italic">{divergence.toFixed(2)}%</p>
                  <p className="text-[8px] mt-1 font-bold opacity-50 uppercase">
                      {divergence > 0 ? "Work Done Not Yet Billed" : "Billing Ahead of Physical"}
                  </p>
              </CardContent>
          </Card>
          <Card className="bg-indigo-600 text-white shadow-lg border-none relative overflow-hidden">
              <CardContent className="p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Schedule Status</p>
                  <p className="text-2xl font-black italic">{((physicalProgress.actual - physicalProgress.planned) * 100).toFixed(1)}%</p>
                  <p className="text-[8px] mt-1 font-bold opacity-50 uppercase">Variance vs Plan</p>
              </CardContent>
          </Card>
      </div>

      <div className="flex-1 flex gap-3 min-h-0">
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
                      <span className="font-bold">{(financialSummary.progressValue / financialSummary.revised * 100).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-black text-xs uppercase tracking-widest text-primary">Physical Status</h3>
                  <div className="bg-muted/50 p-4 rounded-2xl border space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Planned Progress:</span>
                      <span className="font-bold">{(physicalProgress.planned * 100).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Actual Progress:</span>
                      <span className="font-bold text-indigo-600">{(physicalProgress.actual * 100).toFixed(2)}%</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Variance:</span>
                      <span className={cn("font-bold", (physicalProgress.actual - physicalProgress.planned) < 0 ? "text-red-500" : "text-green-600")}>
                        {(physicalProgress.actual * 100 - physicalProgress.planned * 100).toFixed(2)}%
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

          <div className="space-y-4">
            <div>
              <Label htmlFor="report-month">Reporting Month</Label>
              <Input
                id="report-month"
                type="month"
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="report-num">Report #</Label>
              <Input
                id="report-num"
                value={reportDetails.reportNumber}
                onChange={(e) => setReportDetails({...reportDetails, reportNumber: e.target.value})}
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
        </div>

        <ScrollArea className="flex-1 p-4">
          <h3 className="text-sm font-bold mb-4 uppercase tracking-tighter">Report Details</h3>
          
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="exec-summary" className="text-[10px] font-black uppercase">Executive Summary</Label>
              <textarea 
                id="exec-summary"
                className="w-full text-xs p-2 rounded-lg border bg-background h-24 resize-none"
                placeholder="Enter executive summary..."
                value={reportDetails.executiveSummary}
                onChange={(e) => setReportDetails({...reportDetails, executiveSummary: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="challenges" className="text-[10px] font-black uppercase">Key Challenges</Label>
              <textarea 
                id="challenges"
                className="w-full text-xs p-2 rounded-lg border bg-background h-20 resize-none"
                placeholder="Enter key challenges..."
                value={reportDetails.challenges}
                onChange={(e) => setReportDetails({...reportDetails, challenges: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="work-plan" className="text-[10px] font-black uppercase">Next Month's Plan</Label>
              <textarea 
                id="work-plan"
                className="w-full text-xs p-2 rounded-lg border bg-background h-20 resize-none"
                placeholder="Enter next month's work plan..."
                value={reportDetails.workPlanNextMonth}
                onChange={(e) => setReportDetails({...reportDetails, workPlanNextMonth: e.target.value})}
              />
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold">Planned</span>
              <span className="text-sm">{(physicalProgress.planned * 100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold">Actual</span>
              <span className="text-sm text-green-600">{(physicalProgress.actual * 100).toFixed(2)}%</span>
            </div>
          </div>
        </ScrollArea>
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
            <TabsTrigger value="6" className="py-3 px-4 border-b-2 border-transparent data-[state=active]:border-primary rounded-none">Weather Record</TabsTrigger>
            <TabsTrigger value="7" className="py-3 px-4 border-b-2 border-transparent data-[state=active]:border-primary rounded-none">Endorsement</TabsTrigger>
            <TabsTrigger value="8" className="py-3 px-4 border-b-2 border-transparent data-[state=active]:border-primary rounded-none">Issues</TabsTrigger>
            <TabsTrigger value="9" className="py-3 px-4 border-b-2 border-transparent data-[state=active]:border-primary rounded-none">Photos</TabsTrigger>
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
                          <Progress value={physicalProgress.planned * 100} className="flex-1 h-2" />
                          <p className="text-xs">{(physicalProgress.planned * 100).toFixed(2)}%</p>
                        </div>                      </div>
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
                        <p className="text-xl font-black text-primary">{timeProgress.toFixed(2)}%</p>
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
                      As of {new Date().toLocaleDateString()}, the physical progress stands at {(physicalProgress.actual * 100).toFixed(2)}% against
                      the planned {(physicalProgress.planned * 100).toFixed(2)}%. The project value stands at {formatCurrency(financialSummary.revised, settings)}
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
                                  {((item.completedQuantity / item.quantity) * 100).toFixed(2)}%
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
                          {((financialSummary.progressValue / financialSummary.revised) * 100).toFixed(2)}%
                        </p>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="3" className="p-6 m-0 focus-visible:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="rounded-3xl lg:col-span-1">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                      <Users size={20} className="text-primary" /> Personnel
                    </h2>
                    <div className="space-y-4">
                      {[
                        { role: 'Project Manager', name: project.projectManager || 'Not Assigned' },
                        { role: 'Site Engineer', name: project.engineer || 'Not Assigned' },
                        { role: 'Site Supervisor', name: project.supervisor || 'Not Assigned' },
                      ].map((person, i) => (
                        <div key={i} className="flex justify-between items-center border-b pb-2 last:border-0">
                          <span className="text-xs font-bold text-muted-foreground uppercase">{person.role}</span>
                          <span className="text-sm font-bold">{person.name}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl lg:col-span-1">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                      <Shield size={20} className="text-primary" /> Equipment
                    </h2>
                    <div className="space-y-3">
                      {!project.vehicles || project.vehicles.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No equipment records.</p>
                      ) : (
                        project.vehicles.slice(0, 5).map((vehicle, i) => (
                          <div key={i} className="flex items-center gap-3 p-2 bg-muted/50 rounded-xl">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate">{vehicle.type}</p>
                              <p className="text-[10px] text-muted-foreground">{vehicle.plateNumber}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px]">{vehicle.status}</Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl lg:col-span-1">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                      <FileSpreadsheet size={20} className="text-primary" /> Materials
                    </h2>
                    <div className="space-y-3">
                      {(project.materials || []).slice(0, 5).map((material, i) => (
                        <div key={i} className="flex justify-between items-center text-xs">
                          <span className="font-bold">{material.name}</span>
                          <span className="text-muted-foreground">{material.quantity} {material.unit}</span>
                        </div>
                      ))}
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
                      <Shield size={20} className="text-primary" /> Safety & Quality
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

            <TabsContent value="5" className="p-6 m-0 focus-visible:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="rounded-3xl">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                      <Shield size={20} className="text-primary" /> Environmental Status
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-muted rounded-2xl text-center">
                        <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Trees Removed</p>
                        <p className="text-3xl font-black text-red-600">{project.environmentRegistry?.treesRemoved || 0}</p>
                      </div>
                      <div className="p-4 bg-muted rounded-2xl text-center">
                        <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Trees Planted</p>
                        <p className="text-3xl font-black text-green-600">{project.environmentRegistry?.treesPlanted || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="6" className="p-6 m-0 focus-visible:outline-none">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <Card className="rounded-3xl bg-orange-50 border-orange-100 dark:bg-orange-950/20 dark:border-orange-900/30">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-2">
                           <Thermometer size={16} strokeWidth={3} />
                           <span className="text-[10px] font-black uppercase tracking-widest">Temperature</span>
                        </div>
                        <div className="flex justify-between items-end">
                           <p className="text-2xl font-black italic">{weatherSummary?.avgHigh || '--'}°<span className="text-xs ml-1 text-muted-foreground not-italic">Avg Max</span></p>
                           <p className="text-xs font-bold text-muted-foreground">{weatherSummary?.avgLow || '--'}° Avg Min</p>
                        </div>
                      </CardContent>
                   </Card>
                   <Card className="rounded-3xl bg-blue-50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                           <CloudSun size={16} strokeWidth={3} />
                           <span className="text-[10px] font-black uppercase tracking-widest">Rainfall</span>
                        </div>
                        <div className="flex justify-between items-end">
                           <p className="text-2xl font-black italic">{weatherSummary?.avgRainfall || '--'}mm</p>
                           <p className="text-xs font-bold text-muted-foreground">{weatherSummary?.rainyDays || '--'} Rainy Days</p>
                        </div>
                      </CardContent>
                   </Card>
                   <Card className="rounded-3xl bg-slate-50 border-slate-100 dark:bg-slate-900/40 dark:border-slate-800/50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-2">
                           <Wind size={16} strokeWidth={3} />
                           <span className="text-[10px] font-black uppercase tracking-widest">Wind Speed</span>
                        </div>
                        <div className="flex justify-between items-end">
                           <p className="text-2xl font-black italic">{weatherSummary?.avgWindSpeed || '--'}kph</p>
                           <p className="text-xs font-bold text-muted-foreground">Avg Monthly</p>
                        </div>
                      </CardContent>
                   </Card>
                </div>

                <Card className="rounded-3xl overflow-hidden border">
                  <div className="p-4 bg-muted/50 border-b flex justify-between items-center">
                    <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                      <List size={16} /> Daily Weather Status Table
                    </h3>
                    <Badge variant="outline" className="font-black">{new Date(reportMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}</Badge>
                  </div>
                  <ScrollArea className="h-[400px]">
                    <ShadcnTable>
                      <ShadcnTableHeader>
                        <ShadcnTableRow className="bg-muted/30">
                          <ShadcnTableHead className="w-24 font-black text-[10px] uppercase">Date</ShadcnTableHead>
                          <ShadcnTableHead className="font-black text-[10px] uppercase text-center">Condition</ShadcnTableHead>
                          <ShadcnTableHead className="font-black text-[10px] uppercase text-center">Temp (H/L)</ShadcnTableHead>
                          <ShadcnTableHead className="font-black text-[10px] uppercase text-center">Rain (mm)</ShadcnTableHead>
                          <ShadcnTableHead className="font-black text-[10px] uppercase text-center">Wind (kph)</ShadcnTableHead>
                          <ShadcnTableHead className="font-black text-[10px] uppercase text-right">Workability</ShadcnTableHead>
                        </ShadcnTableRow>
                      </ShadcnTableHeader>
                      <ShadcnTableBody>
                        {isLoadingWeather ? (
                          <ShadcnTableRow>
                            <ShadcnTableCell colSpan={6} className="text-center py-8">
                               <div className="flex items-center justify-center gap-2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                                  <span className="text-xs font-bold text-muted-foreground uppercase">Fetching weather history...</span>
                               </div>
                            </ShadcnTableCell>
                          </ShadcnTableRow>
                        ) : weatherHistory.map((day, idx) => (
                          <ShadcnTableRow key={idx} className="hover:bg-muted/10 transition-colors">
                            <ShadcnTableCell className="font-bold text-xs">{day.date.split('-')[2]} {new Date(day.date).toLocaleString('default', { month: 'short' })}</ShadcnTableCell>
                            <ShadcnTableCell className="text-center">
                               <div className="flex flex-col items-center gap-1">
                                  <span className="text-[10px] font-black uppercase">{day.condition}</span>
                               </div>
                            </ShadcnTableCell>
                            <ShadcnTableCell className="text-center font-bold text-xs">{day.tempMax}° / {day.tempMin}°</ShadcnTableCell>
                            <ShadcnTableCell className="text-center text-xs font-bold text-blue-600">{day.rainfall > 0 ? `${day.rainfall} mm` : '--'}</ShadcnTableCell>
                            <ShadcnTableCell className="text-center text-xs font-bold">{day.windSpeed} kph</ShadcnTableCell>
                            <ShadcnTableCell className="text-right">
                               <Badge variant={day.workable ? "secondary" : "destructive" as any} className="text-[9px] font-black py-0 px-1.5 h-5">
                                  {day.workable ? "WORKABLE" : "INCLEMENT"}
                               </Badge>
                            </ShadcnTableCell>
                          </ShadcnTableRow>
                        ))}
                      </ShadcnTableBody>
                    </ShadcnTable>
                  </ScrollArea>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="7" className="p-6 m-0 focus-visible:outline-none">
              <Card className="rounded-3xl max-w-2xl mx-auto">
                <CardContent className="p-8">
                  <h2 className="text-xl font-black mb-8 text-center uppercase">Endorsement</h2>
                  <div className="grid grid-cols-2 gap-12 mt-12">
                    <div className="border-t pt-4 text-center">
                      <p className="font-bold text-sm">Contractor</p>
                    </div>
                    <div className="border-t pt-4 text-center">
                      <p className="font-bold text-sm">Consultant</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="8" className="p-6 m-0 focus-visible:outline-none">
              <Card className="rounded-3xl">
                <CardContent className="p-6">
                  <h2 className="text-lg font-black mb-4">Project Issues</h2>
                  <p className="text-sm text-muted-foreground italic">No critical issues reported for this period.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="9" className="p-6 m-0 focus-visible:outline-none">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {(!project.sitePhotos || project.sitePhotos.length === 0) ? (
                  <p className="col-span-full text-center py-12 text-muted-foreground italic">No photos available.</p>
                ) : (
                  project.sitePhotos.map((photo, i) => (
                    <div key={i} className="aspect-square rounded-2xl overflow-hidden border">
                      <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover" />
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </ShadcnTabs>
      </div>
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
    </>
  );
};

export default MPRReportModule;

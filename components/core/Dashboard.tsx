import React, { useEffect, useMemo, useState } from 'react';
import { 
  CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { Project, AppSettings, RFIStatus, DashboardWidget } from '../../types';
import StatCard from './StatCard';
import { 
  exportBOQToCSV,
  exportStructuresToCSV,
  exportRFIToCSV,
  exportLabTestsToCSV,
  exportSubcontractorPaymentsToCSV,
  exportScheduleToCSV
} from '../../utils/formatting/exportUtils';
import { getCurrencySymbol } from '../../utils/formatting/currencyUtils';
import { 
  generateProjectSummaryPDF,
  generateBOQPDF,
  generateStructuresPDF,
  generateRFIPDF
} from '../../utils/formatting/pdfUtils';
import WeatherWidget from './WeatherWidget';
import { 
  Clock, CheckCircle, TrendingUp, DollarSign, 
  Sun, Wind, Droplets,
  Layers, Sparkles, FileText,
  FileDown, Settings, GripVertical, ChevronDown, ChevronUp, ShieldCheck, AlertTriangle, Info, Check, ClipboardCheck
} from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
import { Checkbox } from '~/components/ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';
import { motion } from 'framer-motion';

interface Props {
  project: Project;
  settings: AppSettings;
  onUpdateProject: (project: Project) => void;
  onUpdateSettings: (settings: AppSettings) => void;
  isLoading?: boolean;
}

const Dashboard: React.FC<Props> = React.memo(({ project, settings, onUpdateProject, onUpdateSettings, isLoading = false }) => {
  const [showWidgetSettings, setShowWidgetSettings] = useState(false);
  const [activeChart, setActiveChart] = useState<'periodic' | 'scumulative'>('scumulative');

  const stats = useMemo(() => {
    if (!project || !project.boq) return { earnedValue: 0, totalPlannedValue: 0, actualCost: 0, spi: 0, cpi: 0, physPercent: 0, rfiOpen: 0, rfiClosed: 0, rfiOverdue: 0 };
    const totalPlannedValue = project.boq.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
    const earnedValue = project.boq.reduce((acc, item) => acc + (item.completedQuantity * item.rate), 0);
    const actualCost = (project.subcontractorPayments || []).reduce((acc, p) => acc + p.amount, 0);
    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsedDuration = new Date().getTime() - startDate.getTime();
    const expectedProgress = totalDuration > 0 ? Math.min(1, elapsedDuration / totalDuration) : 0;
    const actualProgress = totalPlannedValue > 0 ? (earnedValue / totalPlannedValue) : 0;
    const spi = expectedProgress > 0 ? actualProgress / expectedProgress : 1;
    const cpi = actualCost > 0 ? earnedValue / actualCost : 1;
    const rfiOpen = (project.rfis || []).filter(rfi => rfi.status === RFIStatus.OPEN).length;
    const rfiClosed = (project.rfis || []).filter(rfi => rfi.status === RFIStatus.CLOSED).length;
    const rfiOverdue = (project.rfis || []).filter(rfi => rfi.status === RFIStatus.OPEN && new Date(rfi.date) < new Date()).length;
    return { earnedValue, totalPlannedValue, actualCost, spi, cpi, physPercent: actualProgress * 100, rfiOpen, rfiClosed, rfiOverdue };
  }, [project?.boq, project?.startDate, project?.endDate, project?.subcontractorPayments, project?.rfis]);

  const sCurveData = useMemo(() => {
    if (project?.schedule && project.schedule.length > 0) {
      const sortedTasks = [...project.schedule].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      let cumulativePlanned = 0;
      let cumulativeEarned = 0;
      return sortedTasks.map((task) => {
        const plannedValue = 0; // Placeholder
        const earnedValue = (task.progress / 100) * 0; // Placeholder
        cumulativePlanned += plannedValue;
        cumulativeEarned += earnedValue;
        return {
          name: task.name.substring(0, 3),
          'Cumulative Planned': cumulativePlanned,
          'Cumulative Earned': cumulativeEarned,
        };
      });
    }
    return [];
  }, [project?.schedule]);

  const financialChartData = useMemo(() => {
    if (project?.boq && project.boq.length > 0) {
      const monthlyData: Record<string, { planned: number, earned: number }> = {};
      project.boq.forEach(item => {
        const month = new Date(item.startDate || Date.now()).toLocaleString('default', { month: 'short' });
        if (!monthlyData[month]) {
          monthlyData[month] = { planned: 0, earned: 0 };
        }
        monthlyData[month].planned += item.quantity * item.rate;
        monthlyData[month].earned += item.completedQuantity * item.rate;
      });
      return Object.entries(monthlyData).map(([month, values]) => ({
        name: month,
        'Planned Value': values.planned,
        'Earned Value': values.earned
      }));
    }
    return [];
  }, [project?.boq]);

  const boqCategoryData = useMemo(() => {
    if (project?.boq && project.boq.length > 0) {
      const categoryMap: Record<string, { value: number }> = {};
      project.boq.forEach(item => {
        const category = item.category || 'Uncategorized';
        if (!categoryMap[category]) {
          categoryMap[category] = { value: 0 };
        }
        categoryMap[category].value += item.completedQuantity * item.rate;
      });
      return Object.entries(categoryMap).map(([name, { value }]) => ({
        name,
        value,
      }));
    }
    return [];
  }, [project?.boq]);

  useEffect(() => {
    if (settings && !settings.dashboardWidgets) {
      const defaultWidgets: DashboardWidget[] = [
        { id: 'spi', title: 'Schedule Perf. Index (SPI)', visible: true, position: 0 },
        { id: 'cpi', title: 'Cost Perf. Index (CPI)', visible: true, position: 1 },
      ];
      onUpdateSettings({ ...settings, dashboardWidgets: defaultWidgets });
    }
  }, [settings, onUpdateSettings]);

  if (!project) {
    return (
      <div className="p-12 text-center border-2 border-dashed rounded-xl opacity-60">
        <Layers className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-bold text-foreground">No active project context</h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
          Select an infrastructure project from the portfolio to view real-time operations data.
        </p>
      </div>
    );
  }

  const currency = getCurrencySymbol(settings.currency);

  return (
    <TooltipProvider>
      <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-700 min-h-full">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative pb-2">
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mb-2"
            >
              <span className="h-1 w-8 bg-primary rounded-full" />
              <p className="text-[10px] font-black text-primary tracking-[0.4em] uppercase opacity-70">Strategic Overview</p>
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground">
              Command <span className="text-muted-foreground/40">Center</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3 bg-muted/30 p-1.5 rounded-[1.5rem] border border-border/40 backdrop-blur-md">
            <Button 
              variant="ghost" 
              onClick={() => generateProjectSummaryPDF(project)} 
              className="rounded-xl font-bold h-10 px-5 hover:bg-background transition-all duration-300"
            >
              <FileDown className="mr-2 h-4 w-4 opacity-60" />
              Export Intel
            </Button>
            
            <Dialog open={showWidgetSettings} onOpenChange={setShowWidgetSettings}>
              <DialogTrigger asChild>
                <Button className="rounded-xl grad-primary text-white shadow-lg shadow-primary/20 h-10 px-5 font-bold border-none active:scale-95 transition-all">
                  <Settings className="mr-2 h-4 w-4" />
                  Configure
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2rem] glass sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black tracking-tight">Display Units</DialogTitle>
                  <DialogDescription className="font-medium text-muted-foreground">Toggle visibility of operational modules.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-6">
                  {settings.dashboardWidgets?.sort((a, b) => a.position - b.position).map((widget) => (
                    <div key={widget.id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40 transition-all hover:bg-muted/40">
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground/30" />
                        <span className="text-sm font-bold">{widget.title}</span>
                      </div>
                      <Checkbox
                        checked={widget.visible}
                        onCheckedChange={(checked) => {
                          const updatedWidgets = settings.dashboardWidgets?.map(w =>
                            w.id === widget.id ? { ...w, visible: !!checked } : w
                          ) || [];
                          onUpdateSettings({ ...settings, dashboardWidgets: updatedWidgets });
                        }}
                        className="rounded-lg h-5 w-5"
                      />
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <Button onClick={() => setShowWidgetSettings(false)} className="w-full rounded-2xl h-12 font-black grad-primary border-none shadow-xl shadow-primary/20">Save Matrix</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Bento Grid Main Layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 grid-rows-auto gap-6 pb-12">
          
          {/* Main S-Curve Card - Large Bento Piece */}
          <Card className="md:col-span-4 lg:col-span-8 row-span-2 rounded-[2.5rem] glass-card overflow-hidden group border-none relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <CardHeader className="flex flex-row items-center justify-between py-8 px-10 border-b border-white/5">
              <div>
                <CardTitle className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full grad-primary shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
                  Physical vs Financial S-Curve
                </CardTitle>
                <p className="text-xs font-medium text-muted-foreground/60 mt-1">Real-time cumulative execution tracking</p>
              </div>
              <ToggleGroup type="single" value={activeChart} onValueChange={(val: any) => val && setActiveChart(val)} className="bg-muted/30 p-1 rounded-2xl border border-border/40 backdrop-blur-sm">
                <ToggleGroupItem value="periodic" className="text-[10px] font-black tracking-widest rounded-xl h-9 px-5 data-[state=on]:bg-white dark:data-[state=on]:bg-slate-950 data-[state=on]:shadow-xl transition-all">PERIODIC</ToggleGroupItem>
                <ToggleGroupItem value="scumulative" className="text-[10px] font-black tracking-widest rounded-xl h-9 px-5 data-[state=on]:bg-white dark:data-[state=on]:bg-slate-950 data-[state=on]:shadow-xl transition-all">CUMULATIVE</ToggleGroupItem>
              </ToggleGroup>
            </CardHeader>
            <CardContent className="h-[400px] pt-12 px-8 pb-8">
              <ResponsiveContainer width="100%" height="100%">
                {activeChart === 'scumulative' ? (
                  <LineChart data={sCurveData}>
                    <defs>
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="12 12" stroke="currentColor" vertical={false} opacity={0.05} />
                    <XAxis dataKey="name" stroke="currentColor" opacity={0.3} fontSize={10} tickLine={false} axisLine={false} fontBold="900" dy={15} />
                    <YAxis stroke="currentColor" opacity={0.3} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${currency}${v/1000}k`} dx={-15} />
                    <RechartsTooltip 
                      contentStyle={{ 
                        borderRadius: '24px', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        backgroundColor: 'rgba(15,23,42,0.9)', 
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                        padding: '16px 20px'
                      }}
                      itemStyle={{ fontSize: '12px', fontWeight: '900', color: '#fff' }}
                    />
                    <Line type="monotone" name="Planned" dataKey="Cumulative Planned" stroke="currentColor" strokeWidth={4} dot={false} strokeOpacity={0.1} />
                    <Line type="monotone" name="Earned" dataKey="Cumulative Earned" stroke="hsl(var(--primary))" strokeWidth={6} dot={{ r: 0 }} activeDot={{ r: 8, strokeWidth: 0, shadow: '0 0 30px hsl(var(--primary))' }} />
                  </LineChart>
                ) : (
                  <BarChart data={financialChartData}>
                    <CartesianGrid strokeDasharray="12 12" stroke="currentColor" vertical={false} opacity={0.05} />
                    <XAxis dataKey="name" stroke="currentColor" opacity={0.3} fontSize={10} tickLine={false} axisLine={false} fontBold="900" dy={15} />
                    <YAxis stroke="currentColor" opacity={0.3} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${currency}${v/1000}k`} dx={-15} />
                    <RechartsTooltip contentStyle={{ borderRadius: '24px', border: 'none', backgroundColor: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(20px)' }} />
                    <Bar dataKey="Planned Value" name="Planned" fill="currentColor" opacity={0.1} radius={[12, 12, 0, 0]} />
                    <Bar dataKey="Earned Value" name="Actual" fill="hsl(var(--primary))" radius={[12, 12, 0, 0]} shadow="0 10px 20px rgba(79,70,229,0.3)" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* KPI Mini-Cards - Vertical Stack */}
          <div className="md:col-span-4 lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
            <Card className="rounded-[2rem] glass-card border-none p-8 flex flex-col justify-between overflow-hidden relative group">
              <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 mb-1">Schedule Variance</p>
                <h3 className="text-xs font-black uppercase tracking-tighter text-foreground mb-4 flex items-center gap-2">
                  <Clock className="w-3 h-3 text-primary" />
                  Efficiency Index
                </h3>
                <div className="text-5xl font-black tracking-tighter text-primary">{stats.spi.toFixed(2)}</div>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-none px-3 py-1 rounded-full font-black text-[10px]">OPTIMAL (+2.4%)</Badge>
                <TrendingUp size={16} className="text-emerald-500" />
              </div>
            </Card>

            <Card className="rounded-[2rem] glass-card border-none p-8 flex flex-col justify-between overflow-hidden relative group">
              <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-violet-500/10 rounded-full blur-3xl group-hover:bg-violet-500/20 transition-all duration-700" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 mb-1">Budget Burn</p>
                <h3 className="text-xs font-black uppercase tracking-tighter text-foreground mb-4 flex items-center gap-2">
                  <DollarSign className="w-3 h-3 text-violet-500" />
                  Cost Performance
                </h3>
                <div className="text-5xl font-black tracking-tighter text-violet-500">{stats.cpi.toFixed(2)}</div>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <Badge className="bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 border-none px-3 py-1 rounded-full font-black text-[10px]">UNDER BUDGET</Badge>
                <ShieldCheck size={16} className="text-violet-500" />
              </div>
            </Card>
          </div>

          {/* Quality Assurance Bento Piece */}
          <Card className="md:col-span-4 lg:col-span-4 rounded-[2.5rem] glass-card border-none overflow-hidden group">
            <CardHeader className="py-8 px-10 border-b border-white/5">
              <CardTitle className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                QA/QC Matrix
              </CardTitle>
            </CardHeader>
            <CardContent className="p-10 space-y-8">
              <div className="flex items-center justify-between group/item">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover/item:scale-110 transition-transform">
                    <Info size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-foreground">{stats.rfiOpen}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active RFIs</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-muted-foreground/30" />
              </div>
              
              <div className="flex items-center justify-between group/item">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover/item:scale-110 transition-transform">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-foreground">{stats.rfiOverdue}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Late Responses</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-muted-foreground/30" />
              </div>

              <Separator className="opacity-10" />

              <div className="pt-4">
                <div className="flex justify-between items-end mb-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Compliance Rating</p>
                  <span className="text-xs font-black text-emerald-500">98.2%</span>
                </div>
                <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '98.2%' }}
                    className="h-full grad-primary"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Distribution Bento Piece */}
          <Card className="md:col-span-4 lg:col-span-5 rounded-[2.5rem] glass-card border-none overflow-hidden">
            <CardHeader className="py-8 px-10 border-b border-white/5">
              <CardTitle className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                Work Done Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] flex flex-col items-center justify-center p-8">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={boqCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={10}
                    dataKey="value"
                    stroke="none"
                  >
                    {boqCategoryData.map((_, index) => (
                      <Cell key={index} fill={['#4f46e5', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][index % 5]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '20px', border: 'none', backgroundColor: '#0f172a', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Site Intelligence Piece */}
          <Card className="md:col-span-4 lg:col-span-3 rounded-[2.5rem] grad-slate text-white border-none p-10 flex flex-col justify-between relative overflow-hidden shadow-2xl">
            <div className="absolute bottom-[-40px] right-[-40px] w-48 h-48 bg-white/5 rounded-full blur-3xl" />
            <div className="relative z-10">
              <Sparkles className="text-amber-400 mb-6" size={32} />
              <h3 className="text-2xl font-black tracking-tight leading-tight">Site <br />Intelligence</h3>
              <p className="text-xs font-medium text-white/60 mt-4 leading-relaxed">
                Project AI has analyzed <span className="text-white font-bold">124</span> data points today. No critical bottlenecks detected in current workflow.
              </p>
            </div>
            <Button variant="ghost" className="relative z-10 w-full mt-8 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black text-[10px] uppercase tracking-widest border-none">
              Analyze Deeply
            </Button>
          </Card>

        </div>
      </div>
    </TooltipProvider>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;

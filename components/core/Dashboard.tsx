import React, { useEffect, useMemo, useState } from 'react';
import { 
  CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { Project, AppSettings, RFIStatus, DashboardWidget } from '../../types';
import { getCurrencySymbol } from '../../utils/formatting/currencyUtils';
import { 
  generateProjectSummaryPDF
} from '../../utils/formatting/pdfUtils';
import { 
  Clock, TrendingUp, DollarSign, 
  Layers, Sparkles,
  FileDown, Settings, GripVertical, ShieldCheck, AlertTriangle, Info,
  ChevronRight, CloudLightning
} from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';
import { Checkbox } from '~/components/ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';
import { TooltipProvider } from '~/components/ui/tooltip';
import { Separator } from '~/components/ui/separator';
import { motion } from 'framer-motion';
import { cn } from '~/lib/utils';
import WeatherWidget from './WeatherWidget';

interface Props {
  project: Project;
  settings: AppSettings;
  onUpdateProject?: (project: Project) => void;
  onUpdateSettings: (settings: AppSettings) => void;
  isLoading?: boolean;
}

const Dashboard: React.FC<Props> = React.memo(({ project, settings, onUpdateSettings }) => {
  const [showWidgetSettings, setShowWidgetSettings] = useState(false);
  const [activeChart, setActiveChart] = useState<'periodic' | 'scumulative'>('scumulative');

  const stats = useMemo(() => {
    if (!project || !project.boq) return { 
      earnedValue: 0, totalPlannedValue: 0, actualCost: 0, 
      spi: 0, cpi: 0, physPercent: 0, rfiOpen: 0, rfiClosed: 0, rfiOverdue: 0,
      costVariance: 0, scheduleVariance: 0
    };
    
    // a = Sum of Ps(units)
    const provisionalSum = project.boq
        .filter(item => item.unit?.toUpperCase() === 'PS')
        .reduce((acc, item) => acc + ((item.quantity + (item.variationQuantity || 0)) * item.rate), 0);
        
    // b = Sum other than ps(unit)
    const amountWithoutPS = project.boq
        .filter(item => item.unit?.toUpperCase() !== 'PS')
        .reduce((acc, item) => acc + ((item.quantity + (item.variationQuantity || 0)) * item.rate), 0);
        
    // c = vat * sum other than ps
    const vatRate = settings?.vatRate || 13;
    const vatAmount = amountWithoutPS * (vatRate / 100);
    
    // totalPlannedValue (Contract Value) = a + b + c
    const totalPlannedValue = provisionalSum + amountWithoutPS + vatAmount;

    // Earned Value (EV) = Sum of (Completed Quantity * Rate)
    const earnedValue = project.boq.reduce((acc, item) => acc + (item.completedQuantity * item.rate), 0);
    
    // Actual Cost (AC) = Subcontractor Payments + Agency Payments
    const subPayments = (project.subcontractorPayments || []).reduce((acc, p) => acc + p.amount, 0);
    const agencyPayments = (project.agencyPayments || []).reduce((acc, p) => acc + p.amount, 0);
    const actualCost = subPayments + agencyPayments;
    
    // Planned Value (PV) = Expected Progress * Total Planned Value
    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsedDuration = new Date().getTime() - startDate.getTime();
    
    // Simple linear expected progress for now
    const expectedProgress = totalDuration > 0 ? Math.max(0, Math.min(1, elapsedDuration / totalDuration)) : 0;
    const plannedValue = totalPlannedValue * expectedProgress;
    
    // Performance Indices
    const actualProgress = totalPlannedValue > 0 ? (earnedValue / totalPlannedValue) : 0;
    const spi = plannedValue > 0 ? earnedValue / plannedValue : (expectedProgress > 0 ? 0 : 1);
    const cpi = actualCost > 0 ? earnedValue / actualCost : (earnedValue > 0 ? 1.2 : 1); // 1.2 is a "good" default for no cost yet
    
    // Variances
    const costVariance = earnedValue - actualCost;
    const scheduleVariance = earnedValue - plannedValue;

    const rfiOpen = (project.rfis || []).filter(rfi => rfi.status === RFIStatus.OPEN).length;
    const rfiClosed = (project.rfis || []).filter(rfi => rfi.status === RFIStatus.CLOSED).length;
    const rfiOverdue = (project.rfis || []).filter(rfi => rfi.status === RFIStatus.OPEN && rfi.date && new Date(rfi.date) < new Date()).length;

    return { 
      earnedValue, totalPlannedValue, actualCost, spi, cpi, 
      physPercent: actualProgress * 100, 
      rfiOpen, rfiClosed, rfiOverdue,
      costVariance, scheduleVariance
    };
  }, [project, settings]);

  const sCurveData = useMemo(() => {
    if (!project?.startDate || !project?.endDate) return [];

    const start = new Date(project.startDate);
    const end = new Date(project.endDate);
    const now = new Date();
    
    // Create monthly intervals
    const months: Date[] = [];
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    while (current <= end || (current.getMonth() <= end.getMonth() && current.getFullYear() <= end.getFullYear())) {
      months.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
      if (months.length > 60) break; // Safety break
    }

    let cumulativePlanned = 0;
    let cumulativeEarned = 0;

    // Map tasks and BOQ items to their completion dates
    const schedule = project.schedule || [];
    const boq = project.boq || [];
    
    return months.map(monthDate => {
      const monthLabel = monthDate.toLocaleString('default', { month: 'short', year: '2-digit' });
      
      // Calculate Planned Value for this month
      // In a real S-Curve, PV is distributed over task duration. 
      // For this implementation, we'll use a simplified model: 
      // tasks contribute their BOQ value proportionally over their duration.
      
      let monthPlanned = 0;
      let monthEarned = 0;

      schedule.forEach(task => {
        const taskStart = new Date(task.startDate);
        const taskEnd = new Date(task.endDate);
        const taskBoqItem = boq.find(b => b.id === task.boqItemId);
        const taskValue = taskBoqItem ? (taskBoqItem.quantity * taskBoqItem.rate) : 0;

        // If task overlaps with this month
        const nextMonth = new Date(monthDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        if (taskStart < nextMonth && taskEnd >= monthDate) {
          // Calculate overlap days
          const overlapStart = Math.max(taskStart.getTime(), monthDate.getTime());
          const overlapEnd = Math.min(taskEnd.getTime(), nextMonth.getTime());
          const overlapDays = Math.max(0, (overlapEnd - overlapStart) / (1000 * 60 * 60 * 24));
          const totalDays = Math.max(1, (taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24));
          
          monthPlanned += (overlapDays / totalDays) * taskValue;

          // For Earned Value, we use the progress reported on the task
          // But only if the month is in the past or present
          if (monthDate <= now) {
             // Simplified: distributed earned value based on current progress
             // A better model would use historical progress snapshots
             const actualProgress = task.progress / 100;
             monthEarned += (overlapDays / totalDays) * taskValue * actualProgress;
          }
        }
      });

      cumulativePlanned += monthPlanned;
      cumulativeEarned += monthEarned;

      return {
        name: monthLabel,
        'Cumulative Planned': Math.round(cumulativePlanned),
        'Cumulative Earned': monthDate <= now ? Math.round(cumulativeEarned) : null,
        'Monthly Planned': Math.round(monthPlanned),
        'Monthly Earned': monthDate <= now ? Math.round(monthEarned) : null
      };
    });
  }, [project?.schedule, project?.boq, project?.startDate, project?.endDate]);

  const financialChartData = useMemo(() => {
    if (project?.boq && project.boq.length > 0) {
      const monthlyData: Record<string, { planned: number, earned: number }> = {};
      project.boq.forEach(item => {
        const month = new Date((item as any).startDate || Date.now()).toLocaleString('default', { month: 'short' });
        if (!monthlyData[month]) {
          monthlyData[month] = { planned: 0, earned: 0 };
        }
        monthlyData[month].planned += (item.quantity + (item.variationQuantity || 0)) * item.rate;
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
    if (settings && (!settings.dashboardWidgets || settings.dashboardWidgets.length < 5)) {
      const defaultWidgets: DashboardWidget[] = [
        { id: 'scurve', title: 'Performance S-Curve', visible: true, position: 0 },
        { id: 'spi', title: 'Schedule Performance (SPI)', visible: true, position: 1 },
        { id: 'cpi', title: 'Cost Performance (CPI)', visible: true, position: 2 },
        { id: 'health', title: 'Project Health Summary', visible: true, position: 3 },
        { id: 'qa-matrix', title: 'Quality Assurance Matrix', visible: true, position: 4 },
        { id: 'distribution', title: 'Work Breakdown', visible: true, position: 5 },
        { id: 'project-info', title: 'Project Identity & Stakeholders', visible: true, position: 6 },
        { id: 'weather', title: 'Site Weather', visible: true, position: 7 },
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

  const isWidgetVisible = (id: string) => {
    return settings.dashboardWidgets?.find(w => w.id === id)?.visible !== false;
  };

  const getWidgetPosition = (id: string) => {
    return settings.dashboardWidgets?.find(w => w.id === id)?.position ?? 99;
  };

  return (
    <TooltipProvider>
      <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-700 min-h-full safe-pb">
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
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-foreground">
              Command <span className="text-muted-foreground/40">Center</span>
            </h1>
          </div>
          
          <div className="flex w-full sm:w-auto items-center gap-3 bg-muted/30 p-1.5 rounded-[1.5rem] border border-border/40 backdrop-blur-md">
            <Button 
              variant="ghost" 
              onClick={() => generateProjectSummaryPDF(project)} 
              className="flex-1 sm:flex-none rounded-xl font-bold h-10 px-5 hover:bg-background transition-all duration-300"
            >
              <FileDown className="mr-2 h-4 w-4 opacity-60" />
              Export Intel
            </Button>
            
            <Dialog open={showWidgetSettings} onOpenChange={setShowWidgetSettings}>
              <DialogTrigger asChild>
                <Button className="flex-1 sm:flex-none rounded-xl grad-primary text-white shadow-lg shadow-primary/20 h-10 px-5 font-bold border-none active:scale-95 transition-all">
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
                  {(settings.dashboardWidgets || []).sort((a, b) => a.position - b.position).map((widget) => (
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
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 grid-rows-auto gap-4 sm:gap-6 pb-12">
          
          {/* Main S-Curve Card - Large Bento Piece */}
          {isWidgetVisible('scurve') && (
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
                      <XAxis dataKey="name" stroke="currentColor" opacity={0.3} fontSize={10} tickLine={false} axisLine={false} dy={15} />
                      <YAxis stroke="currentColor" opacity={0.3} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${currency}${Math.round(v/1000)}k`} dx={-15} />
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
                      <Line type="monotone" name="Earned" dataKey="Cumulative Earned" stroke="hsl(var(--primary))" strokeWidth={6} dot={{ r: 0 }} activeDot={{ r: 8, strokeWidth: 0 }} />
                    </LineChart>
                  ) : (
                    <BarChart data={sCurveData}>
                      <CartesianGrid strokeDasharray="12 12" stroke="currentColor" vertical={false} opacity={0.05} />
                      <XAxis dataKey="name" stroke="currentColor" opacity={0.3} fontSize={10} tickLine={false} axisLine={false} dy={15} />
                      <YAxis stroke="currentColor" opacity={0.3} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${currency}${Math.round(v/1000)}k`} dx={-15} />
                      <RechartsTooltip contentStyle={{ borderRadius: '24px', border: 'none', backgroundColor: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(20px)' }} />
                      <Bar dataKey="Monthly Planned" name="Planned" fill="currentColor" opacity={0.1} radius={[12, 12, 0, 0]} />
                      <Bar dataKey="Monthly Earned" name="Actual" fill="hsl(var(--primary))" radius={[12, 12, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* KPI Mini-Cards - Vertical Stack */}
          <div className="md:col-span-4 lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
            {isWidgetVisible('spi') && (
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
                  <Badge className={cn(
                    "border-none px-3 py-1 rounded-full font-black text-[10px]",
                    stats.spi >= 1 ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" : "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                  )}>
                    {stats.spi >= 1 ? 'OPTIMAL' : 'DELAYED'} ({((stats.spi - 1) * 100).toFixed(1)}%)
                  </Badge>
                  {stats.spi >= 1 ? <TrendingUp size={16} className="text-emerald-500" /> : <AlertTriangle size={16} className="text-amber-500" />}
                </div>
              </Card>
            )}

            {isWidgetVisible('cpi') && (
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
                  <Badge className={cn(
                    "border-none px-3 py-1 rounded-full font-black text-[10px]",
                    stats.cpi >= 1 ? "bg-violet-500/10 text-violet-500 hover:bg-violet-500/20" : "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                  )}>
                    {stats.cpi >= 1 ? 'UNDER BUDGET' : 'OVER BUDGET'}
                  </Badge>
                  {stats.cpi >= 1 ? <ShieldCheck size={16} className="text-violet-500" /> : <AlertTriangle size={16} className="text-rose-500" />}
                </div>
              </Card>
            )}
          </div>

          {/* Quality Assurance Bento Piece */}
          {isWidgetVisible('qa-matrix') && (
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
          )}

          {/* Financial Distribution Bento Piece */}
          {isWidgetVisible('distribution') && (
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
          )}

          {/* Project Health / Budget Burn Bento Piece */}
          {isWidgetVisible('health') && (
            <Card className="md:col-span-4 lg:col-span-4 rounded-[2.5rem] glass-card border-none overflow-hidden group">
              <CardHeader className="py-8 px-10 border-b border-white/5">
                <CardTitle className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                  Project Health
                </CardTitle>
              </CardHeader>
              <CardContent className="p-10 space-y-8">
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Physical Progress</p>
                    <span className="text-xs font-black text-primary">{stats.physPercent.toFixed(1)}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-muted/30 rounded-full overflow-hidden p-0.5 border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.physPercent}%` }}
                      className="h-full rounded-full grad-primary shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Budget Burn (Financial)</p>
                    <span className="text-xs font-black text-violet-500">
                      {stats.totalPlannedValue > 0 ? ((stats.actualCost / stats.totalPlannedValue) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-muted/30 rounded-full overflow-hidden p-0.5 border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.totalPlannedValue > 0 ? (stats.actualCost / stats.totalPlannedValue) * 100 : 0}%` }}
                      className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                    />
                  </div>
                </div>

                <div className="pt-4 grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-muted/20 border border-border/40">
                    <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Earned Value</p>
                    <p className="text-sm font-black tracking-tight">{currency}{Math.round(stats.earnedValue / 1000)}k</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-muted/20 border border-border/40">
                    <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Actual Cost</p>
                    <p className="text-sm font-black tracking-tight">{currency}{Math.round(stats.actualCost / 1000)}k</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Site Weather & Intelligence */}
          {isWidgetVisible('weather') && (
            <div className={cn("md:col-span-4", isWidgetVisible('project-info') ? "lg:col-span-3" : "lg:col-span-12")}>
               <WeatherWidget />
            </div>
          )}

          {/* Project Details / Metadata Bento Piece */}
          {isWidgetVisible('project-info') && (
            <Card className="md:col-span-4 lg:col-span-9 rounded-[2.5rem] glass-card border-none overflow-hidden group">
              <CardHeader className="py-8 px-10 border-b border-white/5">
                <CardTitle className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-400 shadow-[0_0_10px_rgba(148,163,184,0.5)]" />
                  Project Identity & Stakeholders
                </CardTitle>
              </CardHeader>
              <CardContent className="p-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Engineer / Consultant</p>
                    <p className="text-sm font-black text-foreground">{project.engineer || 'Not Assigned'}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Main Contractor</p>
                    <p className="text-sm font-black text-foreground">{project.contractor || 'Not Assigned'}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Employer / Client</p>
                    <p className="text-sm font-black text-foreground">{project.client || 'Not Assigned'}</p>
                  </div>
                </div>
                
                <Separator className="my-8 opacity-5" />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Contract Number</p>
                    <p className="text-sm font-mono font-bold text-foreground">{project.contractNo || 'N/A'}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Project Code</p>
                    <Badge variant="secondary" className="font-mono text-[10px] h-5">{project.code}</Badge>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Commencement</p>
                    <p className="text-sm font-bold text-foreground">{project.startDate ? project.startDate.split('T')[0] : 'N/A'}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Planned Completion</p>
                    <p className="text-sm font-bold text-foreground">{project.endDate ? project.endDate.split('T')[0] : 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </TooltipProvider>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;

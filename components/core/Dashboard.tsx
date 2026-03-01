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

interface Props {
  project: Project;
  settings: AppSettings;
  onUpdateProject: (project: Project) => void;
  onUpdateSettings: (settings: AppSettings) => void;
  isLoading?: boolean;
}

const Dashboard: React.FC<Props> = ({ project, settings, onUpdateProject, onUpdateSettings, isLoading = false }) => {
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
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative">
          <div className="absolute -left-4 top-0 w-1 h-12 bg-primary rounded-full opacity-50" />
          <div>
            <p className="text-[10px] font-black text-primary tracking-[0.4em] uppercase mb-1 opacity-70">INTELLIGENCE HUB</p>
            <h1 className="text-4xl font-black tracking-tighter text-foreground drop-shadow-sm">
              Operations Center
            </h1>
          </div>
          <div className="flex shrink-0 flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button variant="outline" onClick={() => generateProjectSummaryPDF(project)} className="w-full sm:w-auto rounded-2xl border-border/40 bg-background/50 backdrop-blur hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all duration-300 font-bold">
              <FileDown className="mr-2 h-4 w-4" />
              Project Report
            </Button>
            <Dialog open={showWidgetSettings} onOpenChange={setShowWidgetSettings}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="w-full sm:w-auto rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 font-bold">
                  <Settings className="mr-2 h-4 w-4" />
                  Customize
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] rounded-3xl border-border/40 glass">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black tracking-tight">Configure Dashboard</DialogTitle>
                  <DialogDescription className="font-medium">Select which operational indicators are visible.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-6">
                  {settings.dashboardWidgets?.sort((a, b) => a.position - b.position).map((widget) => (
                    <div key={widget.id} className="flex items-center space-x-4 p-4 rounded-2xl border border-border/40 hover:bg-muted/50 transition-all duration-300 group">
                      <GripVertical className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary transition-colors cursor-grab" />
                      <Checkbox
                        id={`widget-${widget.id}`}
                        checked={widget.visible}
                        onCheckedChange={(checked) => {
                          const updatedWidgets = settings.dashboardWidgets?.map(w =>
                            w.id === widget.id ? { ...w, visible: !!checked } : w
                          ) || [];
                          onUpdateSettings({ ...settings, dashboardWidgets: updatedWidgets });
                        }}
                        className="rounded-lg h-5 w-5 border-2"
                      />
                      <label htmlFor={`widget-${widget.id}`} className="text-sm font-bold flex-1 cursor-pointer select-none">
                        {widget.title}
                      </label>
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <Button onClick={() => setShowWidgetSettings(false)} className="w-full rounded-2xl h-12 font-black tracking-tight shadow-xl shadow-primary/20">Save Configuration</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Schedule Index" value={stats.spi.toFixed(2)} icon={Clock} color="primary" trend="+2.4%" isLoading={isLoading} />
            <StatCard title="Cost Index" value={stats.cpi.toFixed(2)} icon={DollarSign} color="success" trend="+0.8%" isLoading={isLoading} />
            <StatCard title="Portfolio Value" value={`${currency}${(stats.earnedValue / 1000000).toFixed(1)}M`} icon={TrendingUp} color="warning" isLoading={isLoading} trend="+4.5%" />
            <StatCard title="Execution Progress" value={`${stats.physPercent.toFixed(0)}%`} icon={CheckCircle} color="info" trend="+1.2%" isLoading={isLoading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-8 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border-border/40 shadow-xl rounded-[2rem] overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between py-6 px-8 border-b border-border/40">
                    <CardTitle className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.3em] text-muted-foreground/80">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      Execution Metrics
                    </CardTitle>
                    <ToggleGroup type="single" size="sm" variant="outline" value={activeChart} onValueChange={(value: 'periodic' | 'scumulative') => value && setActiveChart(value)} className="bg-muted/40 p-1 rounded-xl border border-border/40">
                        <ToggleGroupItem value="periodic" className="text-[10px] font-black tracking-widest rounded-lg h-8 px-4 data-[state=on]:bg-background data-[state=on]:shadow-sm border-none transition-all">PERIODIC</ToggleGroupItem>
                        <ToggleGroupItem value="scumulative" className="text-[10px] font-black tracking-widest rounded-lg h-8 px-4 data-[state=on]:bg-background data-[state=on]:shadow-sm border-none transition-all">S-CURVE</ToggleGroupItem>
                    </ToggleGroup>
                </CardHeader>
                <CardContent className="h-80 pt-10 px-6 pb-6">
                    <ResponsiveContainer width="100%" height="100%">
                        {activeChart === 'scumulative' ? (
                            <LineChart data={sCurveData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="8 8" stroke="hsl(var(--border))" vertical={false} opacity={0.3} />
                                <XAxis dataKey="name" stroke="hsl(var(--foreground))" opacity={0.5} fontSize={10} tickLine={false} axisLine={false} fontBold="900" dy={10} />
                                <YAxis stroke="hsl(var(--foreground))" opacity={0.5} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${currency}${value/1000}k`} dx={-10} />
                                <RechartsTooltip 
                                  contentStyle={{ 
                                    borderRadius: '20px', 
                                    border: '1px solid hsl(var(--border))', 
                                    backgroundColor: 'rgba(var(--background), 0.8)', 
                                    backdropFilter: 'blur(12px)',
                                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                                    padding: '12px 16px'
                                  }}
                                  itemStyle={{ fontSize: '12px', fontWeight: '900', color: 'hsl(var(--foreground))' }}
                                />
                                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.7, paddingBottom: '30px' }} />
                                <Line type="monotone" name="Planned" dataKey="Cumulative Planned" stroke="hsl(var(--muted-foreground))" strokeWidth={4} dot={false} strokeOpacity={0.2} />
                                <Line type="monotone" name="Earned" dataKey="Cumulative Earned" stroke="hsl(var(--primary))" strokeWidth={4} dot={{ r: 6, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))', strokeWidth: 3 }} activeDot={{ r: 8, strokeWidth: 0, shadow: '0 0 20px hsl(var(--primary))' }} />
                            </LineChart>
                        ) : (
                            <BarChart data={financialChartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="8 8" stroke="hsl(var(--border))" vertical={false} opacity={0.3} />
                                <XAxis dataKey="name" stroke="hsl(var(--foreground))" opacity={0.5} fontSize={10} tickLine={false} axisLine={false} dy={10} fontBold="900" />
                                <YAxis stroke="hsl(var(--foreground))" opacity={0.5} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${currency}${value/1000}k`} dx={-10} />
                                <RechartsTooltip 
                                  contentStyle={{ 
                                    borderRadius: '20px', 
                                    border: '1px solid hsl(var(--border))', 
                                    backgroundColor: 'rgba(var(--background), 0.8)', 
                                    backdropFilter: 'blur(12px)',
                                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                                    padding: '12px 16px'
                                  }}
                                />
                                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.7, paddingBottom: '30px' }} />
                                <Bar dataKey="Planned Value" name="Planned" fill="hsl(var(--muted))" radius={[8, 8, 0, 0]} fillOpacity={0.4} />
                                <Bar dataKey="Earned Value" name="Actual" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="lg:col-span-4 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border-border/40 shadow-xl rounded-[2rem] overflow-hidden">
                <CardHeader className="py-6 px-8 border-b border-border/40">
                    <CardTitle className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.3em] text-muted-foreground/80">
                      <div className="w-2 h-2 rounded-full bg-violet-500" />
                      Work Breakdown
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-80 flex flex-col items-center justify-center p-6">
                    <div className="relative w-full h-full">
                      <ResponsiveContainer width="100%" height="100%">
                          {boqCategoryData.length > 0 ? (
                              <PieChart>
                                  <Pie
                                      data={boqCategoryData}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={70}
                                      outerRadius={100}
                                      paddingAngle={8}
                                      dataKey="value"
                                      nameKey="name"
                                      stroke="none"
                                  >
                                      {boqCategoryData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={
                                              ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][index % 5]
                                          } className="transition-all duration-500 hover:opacity-80" />
                                      ))}
                                  </Pie>
                                  <RechartsTooltip 
                                    formatter={(value) => [`${currency}${Number(value).toLocaleString()}`, 'Earned']}
                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '12px 16px' }}
                                  />
                              </PieChart>
                          ) : (
                              <div className="flex flex-col items-center justify-center h-full opacity-20">
                                <Layers size={48} className="mb-4" />
                                <p className="text-xs font-black uppercase tracking-[0.2em]">Matrix Void</p>
                              </div>
                          )}
                      </ResponsiveContainer>
                      {boqCategoryData.length > 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total</span>
                          <span className="text-xl font-black text-foreground">{currency}{(stats.earnedValue / 1000000).toFixed(1)}M</span>
                        </div>
                      )}
                    </div>
                </CardContent>
            </Card>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <WeatherWidget />
          </div>
          <div className="lg:col-span-8">
            <Card className="h-full bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border-border/40 shadow-xl rounded-[2rem] overflow-hidden">
              <CardHeader className="py-6 px-8 border-b border-border/40">
                <CardTitle className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.3em] text-muted-foreground/80">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  Quality Assurance (RFI)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-8">
                <div className="group flex flex-col items-center justify-center p-8 rounded-3xl bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/10 hover:border-blue-500/20 transition-all duration-500">
                  <div className="p-4 rounded-2xl bg-blue-500/10 mb-4 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                    <Info className="w-8 h-8 text-blue-500" />
                  </div>
                  <p className="text-4xl font-black text-blue-600 dark:text-blue-400">{stats.rfiOpen}</p>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-500/70 mt-2">Pending</p>
                </div>
                
                <div className="group flex flex-col items-center justify-center p-8 rounded-3xl bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/10 hover:border-amber-500/20 transition-all duration-500">
                  <div className="p-4 rounded-2xl bg-amber-500/10 mb-4 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                    <AlertTriangle className="w-8 h-8 text-amber-500" />
                  </div>
                  <p className="text-4xl font-black text-amber-600 dark:text-amber-400">{stats.rfiOverdue}</p>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-500/70 mt-2">Overdue</p>
                </div>
                
                <div className="group flex flex-col items-center justify-center p-8 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all duration-500">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 mb-4 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                    <Check className="w-8 h-8 text-emerald-500" />
                  </div>
                  <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{stats.rfiClosed}</p>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600/70 mt-2">Resolved</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Dashboard;

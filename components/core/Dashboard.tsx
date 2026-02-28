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
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-xs font-bold text-primary tracking-[0.2em] uppercase mb-1 opacity-80">INTELLIGENCE HUB</p>
            <h1 className="text-3xl font-black tracking-tight text-foreground">
              Operations Center
            </h1>
          </div>
          <div className="flex shrink-0 flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => generateProjectSummaryPDF(project)} className="w-full sm:w-auto text-destructive border-destructive/20 hover:bg-destructive/10">
              <FileDown className="mr-2 h-4 w-4" />
              Project Report
            </Button>
            <Dialog open={showWidgetSettings} onOpenChange={setShowWidgetSettings}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="w-full sm:w-auto">
                  <Settings className="mr-2 h-4 w-4" />
                  Customize
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Configure Dashboard</DialogTitle>
                  <DialogDescription>Select which operational indicators are visible.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {settings.dashboardWidgets?.sort((a, b) => a.position - b.position).map((widget) => (
                    <div key={widget.id} className="flex items-center space-x-3 p-3 rounded-xl border border-border/50 hover:bg-muted transition-colors">
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                      <Checkbox
                        id={`widget-${widget.id}`}
                        checked={widget.visible}
                        onCheckedChange={(checked) => {
                          const updatedWidgets = settings.dashboardWidgets?.map(w =>
                            w.id === widget.id ? { ...w, visible: !!checked } : w
                          ) || [];
                          onUpdateSettings({ ...settings, dashboardWidgets: updatedWidgets });
                        }}
                      />
                      <label htmlFor={`widget-${widget.id}`} className="text-sm font-bold flex-1 cursor-pointer">
                        {widget.title}
                      </label>
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <Button onClick={() => setShowWidgetSettings(false)} className="w-full">Save Configuration</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Schedule Index" value={stats.spi.toFixed(2)} icon={Clock} color="primary" trend="+2.4%" isLoading={isLoading} />
            <StatCard title="Cost Index" value={stats.cpi.toFixed(2)} icon={DollarSign} color="success" trend="+0.8%" isLoading={isLoading} />
            <StatCard title="Portfolio Value" value={`${currency}${(stats.earnedValue / 1000000).toFixed(1)}M`} icon={TrendingUp} color="warning" isLoading={isLoading} />
            <StatCard title="Execution Progress" value={`${stats.physPercent.toFixed(0)}%`} icon={CheckCircle} color="info" trend="+1.2%" isLoading={isLoading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <Card className="lg:col-span-8 shadow-sm border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/40">
                    <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-muted-foreground"><TrendingUp size={16} className="text-primary"/>Execution Metrics</CardTitle>
                    <ToggleGroup type="single" size="sm" variant="outline" value={activeChart} onValueChange={(value: 'periodic' | 'scumulative') => value && setActiveChart(value)}>
                        <ToggleGroupItem value="periodic" className="text-[10px] font-bold">PERIODIC</ToggleGroupItem>
                        <ToggleGroupItem value="scumulative" className="text-[10px] font-bold">S-CURVE</ToggleGroupItem>
                    </ToggleGroup>
                </CardHeader>
                <CardContent className="h-72 pt-6">
                    <ResponsiveContainer width="100%" height="100%">
                        {activeChart === 'scumulative' ? (
                            <LineChart data={sCurveData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} fontBold="bold" />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${currency}${value/1000}k`}/>
                                <RechartsTooltip 
                                  contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} />
                                <Line type="monotone" dataKey="Cumulative Planned" stroke="hsl(var(--muted-foreground))" strokeWidth={3} dot={false} strokeOpacity={0.3} />
                                <Line type="monotone" dataKey="Cumulative Earned" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--primary))' }} />
                            </LineChart>
                        ) : (
                            <BarChart data={financialChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false}/>
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${currency}${value/1000}k`}/>
                                <RechartsTooltip 
                                  contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} />
                                <Bar dataKey="Planned Value" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} fillOpacity={0.5} />
                                <Bar dataKey="Earned Value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="lg:col-span-4 shadow-sm border-border/50">
                <CardHeader className="border-b border-border/40">
                    <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-muted-foreground"><Layers size={16} className="text-primary"/>Work Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="h-72 flex items-center justify-center p-0">
                    <ResponsiveContainer width="100%" height="100%">
                        {boqCategoryData.length > 0 ? (
                            <PieChart>
                                <Pie
                                    data={boqCategoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={85}
                                    paddingAngle={5}
                                    dataKey="value"
                                    nameKey="name"
                                >
                                    {boqCategoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={
                                            ['hsl(var(--primary))', 'hsl(var(--primary)/0.7)', 'hsl(var(--primary)/0.4)', 'hsl(var(--muted))'][index % 4]
                                        } className="stroke-background stroke-2 outline-none" />
                                    ))}
                                </Pie>
                                <RechartsTooltip 
                                  formatter={(value) => [`${currency}${Number(value).toLocaleString()}`, 'Earned']}
                                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                            </PieChart>
                        ) : (
                            <div className="flex flex-col items-center justify-center opacity-40">
                              <Layers size={32} className="mb-2" />
                              <p className="text-[10px] font-bold uppercase">No data available</p>
                            </div>
                        )}
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4">
            <WeatherWidget />
          </div>
          <div className="lg:col-span-8">
            <Card className="h-full shadow-sm border-border/50">
              <CardHeader className="border-b border-border/40">
                <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-muted-foreground">
                  <ClipboardCheck size={16} className="text-primary"/> Quality Assurance (RFI)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 pb-8">
                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                  <div className="p-3 rounded-full bg-blue-500/10 mb-3">
                    <Info className="w-6 h-6 text-blue-500" />
                  </div>
                  <p className="text-3xl font-black text-blue-600">{stats.rfiOpen}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500/70 mt-1">Pending Review</p>
                </div>
                
                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                  <div className="p-3 rounded-full bg-amber-500/10 mb-3">
                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                  </div>
                  <p className="text-3xl font-black text-amber-600">{stats.rfiOverdue}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500/70 mt-1">Overdue Action</p>
                </div>
                
                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                  <div className="p-3 rounded-full bg-emerald-500/10 mb-3">
                    <Check className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-3xl font-black text-emerald-600">{stats.rfiClosed}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/70 mt-1">Completed</p>
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

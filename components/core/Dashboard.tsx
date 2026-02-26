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
  FileDown, Settings, GripVertical, ChevronDown, ChevronUp, ShieldCheck, AlertTriangle, Info, Check
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
}

const DeterminateProgress = ({ value, color, size = 50, thickness = 4 }: { value: number; color: string; size?: number; thickness?: number }) => {
  const r = size / 2 - thickness;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          className="text-slate-200"
          stroke="currentColor"
          strokeWidth={thickness}
          fill="transparent"
          r={r}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          stroke="currentColor"
          strokeWidth={thickness}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          r={r}
          cx={size / 2}
          cy={size / 2}
          style={{ color: color, transition: 'stroke-dashoffset 0.35s' }}
        />
      </svg>
    </div>
  );
};


const Dashboard: React.FC<Props> = ({ project, settings, onUpdateProject, onUpdateSettings }) => {
  if (!project) {
    return (
      <div className="p-4 text-center">
        <h3 className="text-lg font-semibold text-muted-foreground">No project selected</h3>
        <p className="text-sm text-muted-foreground">Please select a project to view the dashboard.</p>
      </div>
    );
  }

  const [showWidgetSettings, setShowWidgetSettings] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({
    quality: false,
    fleet: false,
    logistics: false,
    lab: false,
    rfi: false
  });
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
  }, [project]);

  const sCurveData = useMemo(() => {
    if (project.schedule?.length > 0) {
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
    // Fallback data
    return [];
  }, [project]);

  const financialChartData = useMemo(() => {
    if (project.boq?.length > 0) {
      const monthlyData: Record<string, { planned: number, earned: number }> = {};
      (project.boq || []).forEach(item => {
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
    // Fallback data
    return [];
  }, [project]);

  const boqCategoryData = useMemo(() => {
    if (project.boq?.length > 0) {
      const categoryMap: Record<string, { value: number }> = {};
      (project.boq || []).forEach(item => {
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
  }, [project]);

  useEffect(() => {
    if (settings && !settings.dashboardWidgets) {
      const defaultWidgets: DashboardWidget[] = [
        { id: 'spi', title: 'Schedule Perf. Index (SPI)', visible: true, position: 0 },
        { id: 'cpi', title: 'Cost Perf. Index (CPI)', visible: true, position: 1 },
      ];
      onUpdateSettings({ ...settings, dashboardWidgets: defaultWidgets });
    }
  }, [settings, onUpdateSettings]);

  const currency = getCurrencySymbol(settings.currency);

  const toggleCardExpansion = (cardId: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-xs font-semibold text-primary tracking-widest uppercase mb-1">PROJECT DASHBOARD</p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Operations Center
            </h1>
          </div>
          <div className="flex shrink-0 flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => generateProjectSummaryPDF(project)} className="w-full sm:w-auto text-destructive hover:bg-destructive/10">
              <FileDown className="mr-2 h-4 w-4" />
              Generate PDF
            </Button>
            <Dialog open={showWidgetSettings} onOpenChange={setShowWidgetSettings}>
              <DialogTrigger asChild>
                <Button variant="ghost" className="w-full sm:w-auto">
                  <Settings className="mr-2 h-4 w-4" />
                  Customize
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Customize Dashboard</DialogTitle>
                  <DialogDescription>Select and reorder the widgets on your dashboard.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {settings.dashboardWidgets?.sort((a, b) => a.position - b.position).map((widget) => (
                    <div key={widget.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted transition-colors">
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
                      <label htmlFor={`widget-${widget.id}`} className="text-sm font-medium leading-none">
                        {widget.title}
                      </label>
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <Button onClick={() => setShowWidgetSettings(false)}>Done</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Schedule Perf. Index (SPI)" value={stats.spi.toFixed(2)} icon={Clock} color="hsl(var(--primary))" trend="+2.4%" />
            <StatCard title="Cost Perf. Index (CPI)" value={stats.cpi.toFixed(2)} icon={DollarSign} color="hsl(var(--primary))" trend="+0.8%" />
            <StatCard title="Total Earned Value" value={`${currency}${(stats.earnedValue / 1000000).toFixed(1)}M`} icon={TrendingUp} color="hsl(var(--primary))" />
            <StatCard title="Physical Progress" value={`${stats.physPercent.toFixed(0)}%`} icon={CheckCircle} color="hsl(var(--primary))" trend="+1.2%" />
            
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <Card className="lg:col-span-8">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground"><TrendingUp size={16} className="text-primary"/>Financial Analytics</CardTitle>
                    <ToggleGroup type="single" size="sm" value={activeChart} onValueChange={(value: 'periodic' | 'scumulative') => value && setActiveChart(value)}>
                        <ToggleGroupItem value="periodic" aria-label="Toggle periodic">Periodic</ToggleGroupItem>
                        <ToggleGroupItem value="scumulative" aria-label="Toggle S-Curve">S-Curve</ToggleGroupItem>
                    </ToggleGroup>
                </CardHeader>
                <CardContent className="h-64 pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        {activeChart === 'scumulative' ? (
                            <LineChart data={sCurveData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}/>
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${currency}${value/1000}k`}/>
                                <RechartsTooltip contentStyle={{ borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))' }}/>
                                <Legend />
                                <Line type="monotone" dataKey="Cumulative Planned" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false}/>
                                <Line type="monotone" dataKey="Cumulative Earned" stroke="hsl(var(--primary))" strokeWidth={2} dot={false}/>
                            </LineChart>
                        ) : (
                            <BarChart data={financialChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}/>
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${currency}${value/1000}k`}/>
                                <RechartsTooltip contentStyle={{ borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))' }}/>
                                <Legend />
                                <Bar dataKey="Planned Value" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Earned Value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="lg:col-span-4">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground"><Layers size={16} className="text-primary"/>BOQ Completion</CardTitle>
                </CardHeader>
                <CardContent className="h-64 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        {boqCategoryData.length > 0 ? (
                            <PieChart>
                                <Pie
                                    data={boqCategoryData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={true}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                    nameKey="name"
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                >
                                    {boqCategoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={
                                            ['var(--brand-primary)', 'var(--brand-accent-brown)', 'var(--brand-primary-light)', 'var(--brand-secondary-light)'][index % 4]
                                        } />
                                    ))}
                                </Pie>
                                <RechartsTooltip formatter={(value, name, props) => [`${currency}${Number(value).toLocaleString()}`, name]} />
                                <Legend />
                            </PieChart>
                        ) : (
                            <p className="text-center text-muted-foreground">No BOQ category data available to display chart.</p>
                        )}
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-3">
            <WeatherWidget />
          </div>
          <div className="lg:col-span-9">
            <Card>
              <CardHeader>
                <CardTitle>RFI Summary</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center">
                  <Info className="w-6 h-6 text-blue-500 mr-4" />
                  <div>
                    <p className="text-2xl font-bold">{stats.rfiOpen}</p>
                    <p className="text-xs text-muted-foreground">Open</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <AlertTriangle className="w-6 h-6 text-yellow-500 mr-4" />
                  <div>
                    <p className="text-2xl font-bold">{stats.rfiOverdue}</p>
                    <p className="text-xs text-muted-foreground">Overdue</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Check className="w-6 h-6 text-green-500 mr-4" />
                  <div>
                    <p className="text-2xl font-bold">{stats.rfiClosed}</p>
                    <p className="text-xs text-muted-foreground">Closed</p>
                  </div>
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

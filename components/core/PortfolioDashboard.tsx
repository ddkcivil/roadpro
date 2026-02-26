import { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  MapPin, 
  Activity, 
  Clock, 
  TrendingUp, 
  Users, 
  FileText, 
  DollarSign, 
  Calendar, 
  BarChart3,
  PieChart,
  LineChart,
  Trash2
} from 'lucide-react';
import { UserRole, Project, AppSettings } from '../../types';
import { formatCurrency } from '../../utils/formatting/exportUtils';

import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Progress } from '~/components/ui/progress';
import { Separator } from '~/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { cn } from '~/lib/utils';


// NOTE: This is a refactored version of the PortfolioDashboard component.
// The original logic has been temporarily removed to facilitate the UI migration.
// It will be re-implemented in subsequent steps.

interface Props {
  projects: Project[];
  userRole: UserRole;
  settings: AppSettings;
  onSelectProject: (projectId: string) => void;
  onSaveProject: (project: Partial<Project>) => void;
  onDeleteProject: (id: string) => void;
}

const PortfolioDashboard: React.FC<Props> = ({ projects, userRole, settings, onSelectProject, onSaveProject, onDeleteProject }) => {
  const [searchTerm, setSearchTerm] = useState('');


  // Calculate portfolio metrics
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => {
    const now = new Date();
    const startDate = new Date(p.startDate);
    const endDate = new Date(p.endDate);
    now.setHours(0,0,0,0);
    startDate.setHours(0,0,0,0);
    endDate.setHours(0,0,0,0);
    return startDate <= now && endDate >= now;
  }).length;
  
  const upcomingProjects = projects.filter(p => {
    const now = new Date();
    const startDate = new Date(p.startDate);
    now.setHours(0,0,0,0);
    startDate.setHours(0,0,0,0);
    return startDate > now;
  }).length;
  
  const completedProjects = projects.filter(p => {
    const now = new Date();
    const endDate = new Date(p.endDate);
    now.setHours(0,0,0,0);
    endDate.setHours(0,0,0,0);
    return endDate < now;
  }).length;

  // Calculate portfolio value
  const totalPortfolioValue = projects.reduce((sum, project) => {
    const projectValue = project.agencies?.reduce((agencySum, agency) => 
      agencySum + (agency.contractValue || 0), 0) || 0;
    return sum + projectValue;
  }, 0);

  // Filter projects based on search
  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle deleting a project
  const handleDeleteProject = (id: string) => {
    onDeleteProject(id);
  };

  // Handle selecting a project
  const handleSelectProject = (id: string) => {
    onSelectProject(id);
  };

  // Calculate progress functions (from ProjectsList)
  const calculateProgress = (boq?: any[]) => {
    const boqArray = boq || [];
    const totalValue = boqArray.reduce((sum, item) => sum + (item?.quantity || 0) * (item?.rate || 0), 0);
    if (totalValue === 0) return 0;
    const completedValue = boqArray.reduce((sum, item) => sum + (item?.completedQuantity || 0) * (item?.rate || 0), 0);
    return Math.round((completedValue / totalValue) * 100);
  };

  const calculateTimeProgress = (start: string, end: string) => {
    if (!start || !end) return 0;
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const now = new Date().getTime();
    if (now < s) return 0;
    if (now > e) return 100;
    return Math.round(((now - s) / (e - s)) * 100);
  };

  const getProjectStatus = (start: string, end: string) => {
    const now = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    now.setHours(0,0,0,0);
    startDate.setHours(0,0,0,0);
    endDate.setHours(0,0,0,0);

    if (!start) return { 
      label: 'Draft', 
      color: 'bg-muted text-muted-foreground border-slate-200', 
      dot: 'bg-slate-400',
      icon: <FileText size={12} className="mr-1" />
    };
    
    if (end && endDate < now) {
      return { 
        label: 'Completed', 
        color: 'bg-blue-50 text-blue-700 border-blue-200', 
        dot: 'bg-blue-500',
        icon: <Activity size={12} className="mr-1" />
      };
    }
    
    if (startDate > now) {
      return { 
        label: 'Upcoming', 
        color: 'bg-amber-50 text-amber-700 border-amber-200', 
        dot: 'bg-amber-400',
        icon: <Clock size={12} className="mr-1" />
      };
    }
    
    return { 
      label: 'Active', 
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
      dot: 'bg-emerald-500',
      icon: <Activity size={12} className="mr-1" />
    };
  };

  // Calculate average progress across all projects
  const avgPhysicalProgress = Math.round(
    projects.reduce((sum, p) => sum + calculateProgress(p.boq), 0) / (projects.length || 1)
  );
  
  const avgTimeProgress = Math.round(
    projects.reduce((sum, p) => sum + calculateTimeProgress(p.startDate, p.endDate), 0) / (projects.length || 1)
  );

  return (
    <div className="space-y-6 p-4">
      {/* Portfolio Overview */}
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Portfolio Dashboard</h1>
        <p className="text-sm text-muted-foreground mb-4">Strategic overview of {totalProjects} infrastructure assets</p>
      </div>

      {/* Portfolio Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="h-full">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-12 w-12 bg-primary text-white">
                <BarChart3 className="h-6 w-6" />
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold text-foreground">{totalProjects}</h2>
                <p className="text-sm text-muted-foreground">Total Projects</p>
              </div>
            </div>
            <Progress value={100} className="h-1.5 [&::-webkit-progress-bar]:bg-slate-200 [&::-webkit-progress-value]:bg-primary" />
          </CardContent>
        </Card>
        
        <Card className="h-full">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-12 w-12 bg-emerald-600 text-white">
                <Activity className="h-6 w-6" />
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold text-foreground">{activeProjects}</h2>
                <p className="text-sm text-muted-foreground">Active Projects</p>
              </div>
            </div>
            <Progress value={Math.round((activeProjects / totalProjects) * 100) || 0} className="h-1.5 [&::-webkit-progress-bar]:bg-slate-200 [&::-webkit-progress-value]:bg-emerald-600" />
          </CardContent>
        </Card>
        
        <Card className="h-full">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-12 w-12 bg-amber-600 text-white">
                <Clock className="h-6 w-6" />
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold text-foreground">{upcomingProjects}</h2>
                <p className="text-sm text-muted-foreground">Upcoming Projects</p>
              </div>
            </div>
            <Progress value={Math.round((upcomingProjects / totalProjects) * 100) || 0} className="h-1.5 [&::-webkit-progress-bar]:bg-slate-200 [&::-webkit-progress-value]:bg-amber-600" />
          </CardContent>
        </Card>
        
        <Card className="h-full">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-12 w-12 bg-sky-600 text-white">
                <TrendingUp className="h-6 w-6" />
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold text-foreground">{formatCurrency(totalPortfolioValue, settings)}</h2>
                <p className="text-sm text-muted-foreground">Portfolio Value</p>
              </div>
            </div>
            <Progress value={100} className="h-1.5 [&::-webkit-progress-bar]:bg-slate-200 [&::-webkit-progress-value]:bg-sky-600" />
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="h-full">
          <CardContent className="p-4">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> Average Progress
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <p className="text-sm font-semibold">Physical Progress</p>
                  <p className="text-sm font-semibold text-emerald-600">{avgPhysicalProgress}%</p>
                </div>
                <Progress value={avgPhysicalProgress} className="h-2 [&::-webkit-progress-bar]:bg-slate-200 [&::-webkit-progress-value]:bg-emerald-600" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <p className="text-sm font-semibold">Time Progress</p>
                  <p className="text-sm font-semibold text-primary">{avgTimeProgress}%</p>
                </div>
                <Progress value={avgTimeProgress} className="h-2 [&::-webkit-progress-bar]:bg-slate-200 [&::-webkit-progress-value]:bg-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="h-full">
          <CardContent className="p-4">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <PieChart className="h-5 w-5" /> Project Status Distribution
            </h2>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-emerald-500 rounded-full"></div>
                    <p className="text-sm">Active</p>
                  </div>
                  <p className="text-sm font-semibold">{activeProjects}</p>
                </div>
                <Progress value={Math.round((activeProjects / totalProjects) * 100) || 0} className="h-1.5 [&::-webkit-progress-bar]:bg-slate-200 [&::-webkit-progress-value]:bg-emerald-500" />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-amber-500 rounded-full"></div>
                    <p className="text-sm">Upcoming</p>
                  </div>
                  <p className="text-sm font-semibold">{upcomingProjects}</p>
                </div>
                <Progress value={Math.round((upcomingProjects / totalProjects) * 100) || 0} className="h-1.5 [&::-webkit-progress-bar]:bg-slate-200 [&::-webkit-progress-value]:bg-amber-500" />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-sky-500 rounded-full"></div>
                    <p className="text-sm">Completed</p>
                  </div>
                  <p className="text-sm font-semibold">{completedProjects}</p>
                </div>
                <Progress value={Math.round((completedProjects / totalProjects) * 100) || 0} className="h-1.5 [&::-webkit-progress-bar]:bg-slate-200 [&::-webkit-progress-value]:bg-sky-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Action Bar */}
      <Card className="mb-6">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold">Project Directory</h2>
          <div className="relative w-full sm:w-auto flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by code or client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map(project => {
          const physProgress = calculateProgress(project.boq); // Placeholder
          const timeProgress = calculateTimeProgress(project.startDate, project.endDate); // Placeholder
          const status = getProjectStatus(project.startDate, project.endDate); // Placeholder

          return (
            <Card key={project.id} className="h-full transition-transform hover:-translate-y-1 hover:shadow-lg">
              <CardContent className="p-4">
                <div className="flex justify-between mb-2 items-start">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleSelectProject(project.id)}>
                    <Avatar className="h-14 w-14 rounded-lg bg-secondary text-primary font-bold">
                      <AvatarImage src={project.logo} />
                      <AvatarFallback>{project.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-bold leading-tight">{project.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Badge variant="secondary">{project.code}</Badge>
                        <MapPin className="h-3 w-3" /> {project.location}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <Badge className={cn("mb-1", status.dot)}>{status.icon} {status.label}</Badge>
                    {(userRole === UserRole.ADMIN || userRole === UserRole.PROJECT_MANAGER) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteProject(project.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete Project</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Users className="h-4 w-4" /> {project.agencies?.length || 0} Agencies
                  <FileText className="h-4 w-4 ml-2" /> {project.boq?.length || 0} BOQ Items
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between mb-1">
                      <p className="text-xs font-semibold text-muted-foreground">Physical Progress</p>
                      <p className="text-xs font-semibold text-emerald-600">{physProgress}%</p>
                    </div>
                    <Progress value={physProgress} className="h-2 [&::-webkit-progress-bar]:bg-slate-200 [&::-webkit-progress-value]:bg-emerald-600" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <p className="text-xs font-semibold text-muted-foreground">Timeline</p>
                      <p className="text-xs font-semibold text-primary">{timeProgress}%</p>
                    </div>
                    <Progress 
                      value={timeProgress} 
                      className="h-2 [&::-webkit-progress-bar]:bg-slate-200"
                      indicatorClassName={cn(timeProgress > physProgress ? 'bg-destructive' : 'bg-primary')}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredProjects.length === 0 && (
        <Card className="text-center p-8 border-dashed">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <h2 className="text-xl font-bold text-foreground">No Projects Found</h2>
          <p className="text-sm text-muted-foreground mt-1">No projects match your search criteria.</p>
        </Card>
      )}
    </div>
  );
};

export default PortfolioDashboard;

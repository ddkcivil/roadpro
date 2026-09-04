import React, { useState } from 'react';
import { 
  Search, 
  MapPin, 
  Activity, 
  Clock, 
  TrendingUp, 
  Users, 
  FileText, 
  BarChart3,
  PieChart,
  Trash2,
  Fingerprint,
  Globe,
  Zap,
  ArrowRight
} from 'lucide-react';
import { UserRole, Project, AppSettings } from '../../types';
import { formatCurrency } from '../../utils/formatting/exportUtils';

import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Progress } from '~/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';


// NOTE: This is a refactored version of the PortfolioDashboard component.
// The original logic has been temporarily removed to facilitate the UI migration.
// It will be re-implemented in subsequent steps.

import { 
  calculateProgress, 
  calculateTimeProgress, 
  getProjectStatusType,
  ProjectStatusLabel
} from '../../utils/projectCalculations';

interface Props {
  projects: Project[];
  userRole: UserRole;
  settings: AppSettings;
  onSelectProject: (projectId: string) => void;
  onDeleteProject: (id: string) => void;
}

const PortfolioDashboard: React.FC<Props> = ({ projects, userRole, settings, onSelectProject, onDeleteProject }) => {
  const [searchTerm, setSearchTerm] = useState('');


  // Calculate portfolio metrics
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => getProjectStatusType(p.startDate, p.endDate) === ProjectStatusLabel.ACTIVE).length;
  const upcomingProjects = projects.filter(p => getProjectStatusType(p.startDate, p.endDate) === ProjectStatusLabel.UPCOMING).length;
  const completedProjects = projects.filter(p => getProjectStatusType(p.startDate, p.endDate) === ProjectStatusLabel.COMPLETED).length;
  
  // Calculate portfolio value
  const totalPortfolioValue = (projects || []).reduce((sum, project) => {
    const projectValue = (project.agencies || []).reduce((agencySum, agency) => 
      agencySum + (agency.contractValue || 0), 0) || 0;
    return sum + projectValue;
  }, 0);

  // Filter projects based on search
  const filteredProjects = projects.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle deleting a project
  const handleDeleteProject = (id: string) => {
    onDeleteProject(id);
  };

  // Handle selecting a project
  const handleSelectProject = (id: string) => {
    onSelectProject(id);
  };

  const getProjectStatus = (start: string, end: string) => {
    const statusType = getProjectStatusType(start, end);
    
    switch (statusType) {
      case ProjectStatusLabel.UPCOMING:
        return { 
          label: 'Upcoming', 
          color: 'text-amber-400', 
          dot: 'bg-amber-400',
          bg: 'bg-amber-400/10',
          icon: <Clock size={12} className="mr-1" />
        };
      case ProjectStatusLabel.COMPLETED:
        return { 
          label: 'Completed', 
          color: 'text-blue-400', 
          dot: 'bg-blue-400',
          bg: 'bg-blue-400/10',
          icon: <Activity size={12} className="mr-1" />
        };
      case ProjectStatusLabel.DRAFT:
        return { 
          label: 'Draft', 
          color: 'text-slate-400', 
          dot: 'bg-slate-400',
          bg: 'bg-slate-400/10',
          icon: <FileText size={12} className="mr-1" />
        };
      default:
        return { 
          label: 'Active', 
          color: 'text-emerald-400', 
          dot: 'bg-emerald-400',
          bg: 'bg-emerald-400/10',
          icon: <Activity size={12} className="mr-1" />
        };
    }
  };

  // Calculate average progress across all projects
  const avgPhysicalProgress = Math.round(
    projects.reduce((sum, p) => sum + calculateProgress(p.boq), 0) / (projects.length || 1)
  );
  
  const avgTimeProgress = Math.round(
    projects.reduce((sum, p) => sum + calculateTimeProgress(p.startDate, p.endDate), 0) / (projects.length || 1)
  );

  return (
    <div className="space-y-10 p-6 min-h-full bg-transparent text-white">
      {/* Portfolio Overview Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-3">
            <Fingerprint className="text-primary h-8 w-8" /> Portfolio Intelligence
          </h1>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 mt-2">
            Strategic oversight of {totalProjects} global infrastructure assets
          </p>
        </div>
        <div className="flex items-center gap-4 bg-slate-900/60 border border-white/5 backdrop-blur-xl p-2 rounded-[2.5rem]">
            <div className="px-4 py-1 flex flex-col">
               <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 leading-none mb-1">Global Health</span>
               <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5"><Zap className="h-3 w-3" /> Nominal Operations</span>
            </div>
        </div>
      </div>

      {/* Portfolio Metrics - Modern Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-slate-900/60 border border-white/5 backdrop-blur-xl rounded-[2.5rem] overflow-hidden group transition-all hover:border-primary/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary transition-transform group-hover:scale-110">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tight">{totalProjects}</h2>
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Total Nodes</p>
              </div>
            </div>
            <Progress value={100} className="h-1 bg-slate-800" indicatorClassName="bg-primary rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
          </CardContent>
        </Card>
        
        <Card className="bg-slate-900/60 border border-white/5 backdrop-blur-xl rounded-[2.5rem] overflow-hidden group transition-all hover:border-emerald-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 transition-transform group-hover:scale-110">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tight">{activeProjects}</h2>
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Active Ops</p>
              </div>
            </div>
            <Progress value={Math.round((activeProjects / totalProjects) * 100) || 0} className="h-1 bg-slate-800" indicatorClassName="bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
          </CardContent>
        </Card>
        
        <Card className="bg-slate-900/60 border border-white/5 backdrop-blur-xl rounded-[2.5rem] overflow-hidden group transition-all hover:border-amber-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 transition-transform group-hover:scale-110">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tight">{upcomingProjects}</h2>
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Planned Grid</p>
              </div>
            </div>
            <Progress value={Math.round((upcomingProjects / totalProjects) * 100) || 0} className="h-1 bg-slate-800" indicatorClassName="bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
          </CardContent>
        </Card>
        
        <Card className="bg-slate-900/60 border border-white/5 backdrop-blur-xl rounded-[2.5rem] overflow-hidden group transition-all hover:border-sky-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 transition-transform group-hover:scale-110">
                <Globe className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight truncate">{formatCurrency(totalPortfolioValue, settings.currency)}</h2>
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Grid Value</p>
              </div>
            </div>
            <Progress value={100} className="h-1 bg-slate-800" indicatorClassName="bg-sky-500 rounded-full shadow-[0_0_8px_rgba(14,165,233,0.4)]" />
          </CardContent>
        </Card>
      </div>

      {/* Analytics Visualization Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="bg-slate-900/60 border border-white/5 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8">
            <h2 className="text-lg font-black uppercase italic tracking-widest mb-8 flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-primary" /> Performance Matrix
            </h2>
            <div className="space-y-8">
              <div>
                <div className="flex justify-between mb-2 items-end">
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Physical Deployment</p>
                  <p className="text-sm font-black text-emerald-400 italic">{avgPhysicalProgress}%</p>
                </div>
                <Progress value={avgPhysicalProgress} className="h-2 bg-slate-800 rounded-full" indicatorClassName="bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.3)]" />
              </div>
              <div>
                <div className="flex justify-between mb-2 items-end">
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Chronological Flow</p>
                  <p className="text-sm font-black text-primary italic">{avgTimeProgress}%</p>
                </div>
                <Progress value={avgTimeProgress} className="h-2 bg-slate-800 rounded-full" indicatorClassName="bg-gradient-to-r from-primary to-indigo-600 rounded-full shadow-[0_0_12px_rgba(37,99,235,0.3)]" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-900/60 border border-white/5 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8">
            <h2 className="text-lg font-black uppercase italic tracking-widest mb-8 flex items-center gap-3">
              <PieChart className="h-5 w-5 text-primary" /> Grid Distribution
            </h2>
            <div className="space-y-6">
              {[
                  { label: 'Active Operations', count: activeProjects, color: 'bg-emerald-500', total: totalProjects },
                  { label: 'Planned Deployments', count: upcomingProjects, color: 'bg-amber-500', total: totalProjects },
                  { label: 'Synchronized Assets', count: completedProjects, color: 'bg-sky-500', total: totalProjects }
              ].map((item, i) => (
                <div key={i}>
                    <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                        <div className={cn("h-2.5 w-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]", item.color)}></div>
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-300">{item.label}</p>
                    </div>
                    <p className="text-xs font-black text-white">{item.count}</p>
                    </div>
                    <Progress value={Math.round((item.count / totalProjects) * 100) || 0} className="h-1 bg-slate-800/50 rounded-full" indicatorClassName={cn("rounded-full", item.color)} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Directory Scanner */}
      <div className="space-y-6">
          <div className="flex items-center gap-4">
              <h2 className="text-xl font-black uppercase italic tracking-tighter">Node Directory</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent" />
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Scan for codes, clients or identities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900/60 border border-white/5 text-white rounded-xl h-12 pl-12 focus:border-primary transition-all"
            />
          </div>

          {/* Project Grid - Harmonized with ProjectsList */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProjects.map(project => {
              const physProgress = calculateProgress(project.boq);
              const timeProgress = calculateTimeProgress(project.startDate, project.endDate);
              const status = getProjectStatus(project.startDate, project.endDate);

              return (
                <Card key={project.id} className="bg-slate-900/60 border border-white/5 hover:border-primary/50 rounded-[2.5rem] overflow-hidden group transition-all duration-500 hover:shadow-[0_20px_50px_rgba(37,99,235,0.15)] hover:-translate-y-2 flex flex-col h-full" onClick={() => handleSelectProject(project.id)}>
                  <CardContent className="p-0 flex-1 flex flex-col">
                    <div className="h-2 bg-gradient-to-r from-primary/40 via-indigo-500/40 to-violet-500/40 opacity-50 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="p-8 flex-1">
                      <div className="flex justify-between mb-8 items-start">
                          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50 group-hover:border-primary/30 group-hover:scale-110 transition-all duration-500 shadow-lg">
                            <Avatar className="h-12 w-12 rounded-xl bg-slate-900 text-primary font-black">
                                <AvatarImage src={project.logo} />
                                <AvatarFallback className="bg-gradient-to-br from-primary to-indigo-600 text-white">{project.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                          </div>
                          <Badge className={cn("font-black text-[9px] px-3 py-1 uppercase tracking-[0.15em] rounded-full border-none shadow-sm", status.bg, status.color)}>{status.label}</Badge>
                      </div>
                      
                      <h3 className="text-2xl font-black leading-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors tracking-tighter uppercase italic">{project.name}</h3>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-8 font-black uppercase tracking-[0.3em] opacity-80">
                        <MapPin className="h-3 w-3 text-primary/70" /> {project.location || 'Global Ops'}
                      </div>

                      <div className="space-y-6">
                        <div>
                            <div className="flex justify-between mb-1.5 items-end">
                                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Deployment</p>
                                <p className="text-xs font-black text-emerald-400">{physProgress}%</p>
                            </div>
                            <Progress value={physProgress} className="h-1.5 bg-slate-800/50 rounded-full" indicatorClassName="bg-emerald-500 rounded-full transition-all duration-1000" />
                        </div>
                        <div>
                            <div className="flex justify-between mb-1.5 items-end">
                                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Chronology</p>
                                <p className="text-xs font-black text-primary">{timeProgress}%</p>
                            </div>
                            <Progress value={timeProgress} className="h-1.5 bg-slate-800/50 rounded-full" indicatorClassName="bg-primary rounded-full transition-all duration-1000" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="px-8 py-5 bg-slate-900/60 border-t border-white/5 flex justify-between items-center group-hover:bg-slate-800/60 transition-colors duration-500">
                        <div className="flex gap-2">
                            {(userRole === UserRole.ADMIN || userRole === UserRole.PROJECT_MANAGER) && (
                                <TooltipProvider>
                                    <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }} className="h-10 w-10 rounded-xl bg-rose-500/5 border border-rose-500/10 text-slate-500 hover:text-rose-500 transition-all">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-slate-900 border border-white/5 text-white font-bold text-[10px] uppercase">Decommission Node</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                        <Button variant="ghost" size="sm" className="h-10 px-5 text-[10px] font-black tracking-[0.2em] rounded-xl border border-white/5 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all group/btn uppercase italic">
                            Launch Workspace <ArrowRight className="ml-2 h-3.5 w-3.5 group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredProjects.length === 0 && (
            <div className="bg-slate-900/60 border border-white/5 backdrop-blur-xl rounded-[2.5rem] py-20 text-center border-dashed">
              <FileText className="h-16 w-16 text-slate-700 mx-auto mb-6 opacity-50" />
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Zero Nodes Detected</h2>
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 mt-2">The scanner found no infrastructure matching your current search parameters.</p>
              <Button variant="outline" className="mt-8 border-slate-800 text-slate-400 hover:text-white rounded-xl" onClick={() => setSearchTerm('')}>Reset Scanner</Button>
            </div>
          )}
      </div>
      
      {/* Footer System Info */}
      <div className="mt-12 flex flex-col items-center justify-center p-8 border border-white/5 rounded-[2.5rem] bg-slate-900/60 backdrop-blur-xl border-dashed">
        <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.4em] flex items-center gap-3">
          <Globe size={14} className="opacity-50" /> Global Portfolio Telemetry • Synchronized WGS84 Registry
        </p>
      </div>
    </div>
  );
};

export default PortfolioDashboard;

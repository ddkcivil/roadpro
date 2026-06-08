import React, { useState, useMemo } from 'react';
import { Project, BOQItem, Permission, UserRole } from '../../types';
import {
  Plus, Trash2, Edit, CheckCircle, Activity, Clock, LayoutGrid, List as ListIcon, Timer, ArrowRight, TrendingUp, MapPin, Database, SearchX, Globe, Building2
} from 'lucide-react';
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "~/components/ui/data-table";

import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Progress } from '~/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';
import { cn } from '~/lib/utils';
import { EmptyState } from '~/components/ui/empty-state';
import { SearchInput } from '~/components/ui/search-input';
import { HasPermission } from '~/components/common/HasPermission';
import { CardGrid } from '~/components/ui/card-grid';

import { 
  calculateProgress, 
  calculateTimeProgress, 
  calculateDuration, 
  getProjectStatusType,
  ProjectStatusLabel
} from '../../utils/projectCalculations';

interface Props {
  projects: Project[];
  onSelectProject: (projectId: string) => void;
  onSaveProject: (project: Partial<Project>) => void;
  onDeleteProject: (id: string) => void;
  onOpenModal: (project: Partial<Project> | null) => void;
  userRole: UserRole;
}

const ProjectsList: React.FC<Props> = ({ projects, onSelectProject, onDeleteProject, onOpenModal, userRole }) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'GRID'>('GRID');
  const [gridSearchTerm, setGridSearchTerm] = useState('');

  const handleOpenNew = () => { onOpenModal(null); };
  const handleOpenEdit = (project: Project) => { onOpenModal(project); };
  const handleDeleteProject = (id: string) => { onDeleteProject(id); };

  const getProjectStatus = (start: string, end: string) => {
    const statusType = getProjectStatusType(start, end);
    
    switch (statusType) {
      case ProjectStatusLabel.UPCOMING:
        return { label: 'Planned', color: 'text-amber-400', dot: 'bg-amber-400', bg: 'bg-amber-400/10', icon: <Clock className="h-3 w-3" /> };
      case ProjectStatusLabel.COMPLETED:
        return { label: 'Completed', color: 'text-blue-400', dot: 'bg-blue-400', bg: 'bg-blue-400/10', icon: <CheckCircle className="h-3 w-3" /> };
      case ProjectStatusLabel.DRAFT:
        return { label: 'Draft', color: 'text-slate-400', dot: 'bg-slate-400', bg: 'bg-slate-400/10', icon: <Clock className="h-3 w-3" /> };
      default:
        return { label: 'Active', color: 'text-emerald-400', dot: 'bg-emerald-400', bg: 'bg-emerald-400/10', icon: <Activity className="h-3 w-3" /> };
    }
  };

  const filteredGridProjects = useMemo(() => {
    return projects.filter(p => 
      p.name?.toLowerCase().includes(gridSearchTerm.toLowerCase()) ||
      p.code?.toLowerCase().includes(gridSearchTerm.toLowerCase()) ||
      p.client?.toLowerCase().includes(gridSearchTerm.toLowerCase())
    );
  }, [projects, gridSearchTerm]);

  const columns: ColumnDef<Project>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: "Project Identity",
      cell: ({ row }) => {
        const project = row.original;
        const status = getProjectStatus(project.startDate, project.endDate);
        return (
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onSelectProject(project.id)}>
            <div className="p-1 rounded-xl bg-slate-800/50 group-hover:bg-primary/20 transition-colors">
                <Avatar className="h-10 w-10 rounded-lg border border-slate-700 bg-slate-900 text-primary font-black">
                <AvatarImage src={project.logo} alt={`${project.name} logo`} />
                <AvatarFallback>{project.name.charAt(0)}</AvatarFallback>
                </Avatar>
            </div>
            <div>
              <p className="font-black text-sm text-white group-hover:text-primary transition-colors truncate max-w-[200px] uppercase italic">{project.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest border-0 p-0", status.color)}>
                  {status.icon} <span className="ml-1">{status.label}</span>
                </Badge>
                <span className="text-slate-600">•</span>
                <span className="text-[10px] font-bold text-slate-500 font-mono">{project.code}</span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "client",
      header: "Stakeholders",
      cell: ({ row }) => (
        <div className="max-w-[150px]">
          <p className="font-bold text-[11px] text-slate-300 uppercase truncate flex items-center gap-1.5"><Building2 size={10} className="text-primary" /> {row.original.client}</p>
          <p className="text-[10px] text-slate-500 font-medium truncate ml-4">{row.original.contractor}</p>
        </div>
      ),
    },
    {
      accessorKey: "startDate",
      header: "Chronology",
      cell: ({ row }) => {
        const project = row.original;
        const timeProgress = calculateTimeProgress(project.startDate, project.endDate);
        const physProgress = calculateProgress(project.boq);
        
        return (
          <div className="min-w-[140px]">
            <div className="flex justify-between mb-1.5 text-[9px] font-black uppercase tracking-widest">
              <span className="text-slate-500 italic">{project.startDate ? project.startDate.split('T')[0] : 'TBD'} - {project.endDate ? project.endDate.split('T')[0] : 'TBD'}</span>
              <span className="text-primary">{timeProgress}%</span>
            </div>
            <Progress 
              value={timeProgress} 
              className="h-1.5 bg-slate-800 rounded-full"
              indicatorClassName={cn("rounded-full", timeProgress > physProgress ? 'bg-rose-500' : 'bg-primary')}
            />
          </div>
        );
      },
    },
    {
      id: "progress",
      header: "Deployment",
      cell: ({ row }) => {
        const physProgress = calculateProgress(row.original.boq);
        return (
          <div className="min-w-[140px]">
            <div className="flex justify-between mb-1.5 text-[9px] font-black uppercase tracking-widest">
              <span className="text-slate-500 italic">Physical Ops</span>
              <span className="text-emerald-400">{physProgress}%</span>
            </div>
            <Progress value={physProgress} className="h-1.5 bg-slate-800 rounded-full" indicatorClassName="bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-center font-black uppercase tracking-widest text-[10px] text-slate-500">Command</div>,
      cell: ({ row }) => {
        const project = row.original;
        return (
          <div className="flex justify-center gap-1.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all" onClick={(e) => { e.stopPropagation(); onSelectProject(project.id); }}>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 border-slate-800 text-white font-bold text-[10px] uppercase">Access Terminal</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <HasPermission permission={Permission.PROJECT_UPDATE}>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all" onClick={(e) => { e.stopPropagation(); handleOpenEdit(project); }}>
                <Edit className="h-4 w-4" />
              </Button>
            </HasPermission>

            <HasPermission permission={Permission.PROJECT_DELETE}>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-500 transition-all" onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </HasPermission>
          </div>
        );
      },
    },
  ], [onSelectProject]);

  if (projects.length === 0) {
    return (
      <div className="p-8">
        <EmptyState
          title="Neural Grid Empty"
          description="Initialize your first infrastructure node to begin strategic deployment."
          actionLabel="Bootstrap Project"
          onAction={handleOpenNew}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic">Active Portfolio</h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 mt-1">
             Synchronized Infrastructure Assets <span className="h-1 w-1 rounded-full bg-primary" /> {projects.length} Nodes
          </p>
        </div>
        <div className="flex gap-3 items-center w-full sm:w-auto">
            <ToggleGroup type="single" value={viewMode} onValueChange={(value: 'LIST' | 'GRID') => value && setViewMode(value)} className="rounded-xl border border-slate-800 bg-slate-900/40 p-1 backdrop-blur-md">
                <ToggleGroupItem value="LIST" aria-label="Toggle list view" className="h-9 w-10 p-0 rounded-lg data-[state=on]:bg-primary data-[state=on]:text-white">
                    <ListIcon className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="GRID" aria-label="Toggle grid view" className="h-9 w-10 p-0 rounded-lg data-[state=on]:bg-primary data-[state=on]:text-white">
                    <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
            </ToggleGroup>
            
            <HasPermission permission={Permission.PROJECT_CREATE}>
              <Button onClick={handleOpenNew} className="h-11 px-6 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 flex-1 sm:flex-none">
                 <Plus className="mr-2 h-4 w-4" /> New Deployment
              </Button>
            </HasPermission>
        </div>
      </div>

      <div className="relative">
         {viewMode === 'LIST' && (
            <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-slate-800/50 p-6 shadow-2xl overflow-hidden">
               <DataTable columns={columns} data={projects} searchKey="name" placeholder="Filter operational nodes..." />
            </div>
         )}
         
         {viewMode === 'GRID' && (
            <div className="space-y-8">
               <div className="flex justify-center sm:justify-start">
                    <div className="relative w-full max-w-md">
                        <SearchInput
                            placeholder="Scan by code, client or identity..."
                            value={gridSearchTerm}
                            onChange={setGridSearchTerm}
                            className="bg-slate-900/40 border-slate-800 text-white rounded-xl h-11 pl-10"
                        />
                    </div>
               </div>
               
               {filteredGridProjects.length === 0 ? (
                  <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-slate-800/50 py-20 text-center">
                    <EmptyState 
                      icon={SearchX}
                      title="Node Not Found"
                      description={`No infrastructure matching "${gridSearchTerm}" detected in local storage.`}
                      actionLabel="Reset Scanner"
                      onAction={() => setGridSearchTerm('')}
                    />
                  </div>
                ) : (
                  <CardGrid columns={3}>
                    {filteredGridProjects.map((project, index) => {
                        const physProgress = calculateProgress(project.boq);
                        const timeProgress = calculateTimeProgress(project.startDate, project.endDate);
                        const duration = calculateDuration(project.startDate, project.endDate);
                        const status = getProjectStatus(project.startDate, project.endDate);
                        
                        return (
                            <Card key={project.id} className="bg-slate-900/60 backdrop-blur-xl border-slate-800/50 hover:border-primary/50 rounded-[2rem] overflow-hidden group transition-all duration-500 hover:shadow-[0_20px_50px_rgba(37,99,235,0.15)] hover:-translate-y-2 flex flex-col h-full" onClick={() => onSelectProject(project.id)}>
                                <CardContent className="p-0 flex-1 flex flex-col">
                                    {/* Project Banner / Top Area */}
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
                                      
                                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 mb-8 font-black uppercase tracking-widest opacity-80">
                                          <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-primary/70" /> {project.location || 'Global Ops'}</span>
                                          <span className="h-1 w-1 rounded-full bg-slate-700" />
                                          <span className="flex items-center gap-1.5"><Database className="h-3 w-3 text-primary/70" /> {project.code}</span>
                                      </div>

                                      <div className="space-y-6">
                                          <div>
                                              <div className="flex justify-between mb-2 items-center">
                                                  <p className="text-[10px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-[0.2em] italic"><Timer className="h-3.5 w-3.5 text-primary/60" /> Chronology</p>
                                                  <span className="text-[10px] font-black text-white/40">{duration}</span>
                                              </div>
                                              <div className="relative">
                                                <Progress 
                                                    value={timeProgress} 
                                                    className="h-2 rounded-full bg-slate-800/50"
                                                    indicatorClassName={cn("rounded-full transition-all duration-1000", timeProgress > physProgress ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]' : 'bg-gradient-to-r from-primary to-indigo-600 shadow-[0_0_12px_rgba(37,99,235,0.4)]')}
                                                />
                                              </div>
                                          </div>

                                          <div>
                                              <div className="flex justify-between mb-2 items-center">
                                                  <p className="text-[10px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-[0.2em] italic"><TrendingUp className="h-3.5 w-3.5 text-emerald-500/60" /> Deployment</p>
                                                  <p className="text-[11px] font-black text-emerald-400">{physProgress}%</p>
                                              </div>
                                              <Progress value={physProgress} className="h-2 rounded-full bg-slate-800/50" indicatorClassName="bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.4)] transition-all duration-1000" />
                                          </div>
                                      </div>
                                    </div>
                                    
                                    {/* Action Bar */}
                                    <div className="px-8 py-5 bg-slate-900/40 border-t border-slate-800/50 flex justify-between items-center group-hover:bg-slate-800/40 transition-colors duration-500">
                                        <div className="flex gap-2">
                                          <HasPermission permission={Permission.PROJECT_UPDATE}>
                                              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 hover:border-primary/30 hover:bg-primary/10 hover:text-primary transition-all" onClick={(e) => { e.stopPropagation(); handleOpenEdit(project); }}>
                                                  <Edit className="h-4 w-4" />
                                              </Button>
                                          </HasPermission>

                                          <HasPermission permission={Permission.PROJECT_DELETE}>
                                              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-500 transition-all" onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}>
                                                  <Trash2 className="h-4 w-4" />
                                              </Button>
                                          </HasPermission>
                                        </div>
                                        
                                        <Button variant="ghost" size="sm" className="h-10 px-5 text-[10px] font-black tracking-[0.2em] rounded-xl border border-white/5 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all group/btn uppercase italic" onClick={(e) => { e.stopPropagation(); onSelectProject(project.id); }}>
                                          Launch Workspace <ArrowRight className="ml-2 h-3.5 w-3.5 group-hover/btn:translate-x-1 transition-transform" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                  </CardGrid>
                )}
            </div>
         )}

         {/* Bottom Footer Info */}
         <div className="mt-12 flex flex-col items-center justify-center p-6 border border-slate-800/50 rounded-[1.5rem] bg-slate-900/20 backdrop-blur-sm border-dashed">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] flex items-center gap-3">
              <Globe size={14} className="opacity-50" /> Encrypted Neural Link • Synchronized WGS84 Registry
            </p>
          </div>
      </div>
    </div>
  );
};

export default ProjectsList;

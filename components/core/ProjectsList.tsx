import React, { useState, useMemo, useCallback } from 'react';
import { Project, UserRole, BOQItem, Permission } from '../../types';
import {
  Plus, Trash2, Edit, CheckCircle, Activity, Clock, LayoutGrid, List as ListIcon, Timer, ArrowRight, TrendingUp, MapPin, Database, SearchX
} from 'lucide-react';
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "~/components/ui/data-table";

import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Progress } from '~/components/ui/progress';
import { Separator } from '~/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';
import { cn } from '~/lib/utils';
import { EmptyState } from '~/components/ui/empty-state';
import { SearchInput } from '~/components/ui/search-input';
import { HasPermission } from '~/components/common/HasPermission';
import { CardGrid } from '~/components/ui/card-grid';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

interface Props {
  projects: Project[];
  userRole: UserRole;
  onSelectProject: (projectId: string) => void;
  onSaveProject: (project: Partial<Project>) => void;
  onDeleteProject: (id: string) => void;
  onOpenModal: (project: Partial<Project> | null) => void;
}

const ProjectsList: React.FC<Props> = ({ projects, userRole, onSelectProject, onDeleteProject, onOpenModal }) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'GRID'>('LIST');
  const [gridSearchTerm, setGridSearchTerm] = useState('');

  const handleOpenNew = () => { onOpenModal(null); };
  const handleOpenEdit = (project: Project) => { onOpenModal(project); };
  const handleDeleteProject = (id: string) => { onDeleteProject(id); };

  const calculateProgress = (boq?: BOQItem[]) => {
    if (!boq || boq.length === 0) return 0;
    const total = boq.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
    const earned = boq.reduce((acc, item) => acc + (item.completedQuantity * item.rate), 0);
    return total > 0 ? Math.round((earned / total) * 100) : 0;
  };

  const calculateTimeProgress = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startDate = new Date(start).getTime();
    const endDate = new Date(end).getTime();
    const today = new Date().getTime();
    
    if (today <= startDate) return 0;
    if (today >= endDate) return 100;
    
    const total = endDate - startDate;
    const elapsed = today - startDate;
    return total > 0 ? Math.round((elapsed / total) * 100) : 0;
  };

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return "N/A";
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 365) return `${(diffDays / 365).toFixed(1)} Yrs`;
    if (diffDays > 30) return `${Math.round(diffDays / 30)} Mos`;
    return `${diffDays} Days`;
  };

  const getProjectStatus = (start: string, end: string) => {
    const timeProgress = calculateTimeProgress(start, end);
    if (timeProgress === 0) return { label: 'Planned', color: 'text-amber-600', dot: 'bg-amber-500', icon: <Clock className="h-3 w-3" /> };
    if (timeProgress === 100) return { label: 'Completed', color: 'text-blue-600', dot: 'bg-blue-500', icon: <CheckCircle className="h-3 w-3" /> };
    return { label: 'Active', color: 'text-emerald-600', dot: 'bg-emerald-500', icon: <Activity className="h-3 w-3" /> };
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
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectProject(project.id)}>
            <Avatar className="h-10 w-10 rounded-lg bg-secondary text-primary font-bold">
              <AvatarImage src={project.logo} alt={`${project.name} logo`} />
              <AvatarFallback>{project.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold text-sm text-foreground hover:underline truncate max-w-[200px]">{project.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Badge variant="outline" className={cn("text-[10px] border-0 bg-transparent p-0", status.color)}>
                  {status.icon} <span className="ml-1">{status.label}</span>
                </Badge>
                <span className="text-muted-foreground">•</span>
                <Badge variant="secondary" className="text-[10px] h-4 font-mono px-1">{project.code}</Badge>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "client",
      header: "Employer / Contractor",
      cell: ({ row }) => (
        <div className="max-w-[150px]">
          <p className="font-bold text-xs truncate">{row.original.client}</p>
          <p className="text-[10px] text-muted-foreground truncate">{row.original.contractor}</p>
        </div>
      ),
    },
    {
      accessorKey: "startDate",
      header: "Contractual Timeline",
      cell: ({ row }) => {
        const project = row.original;
        const timeProgress = calculateTimeProgress(project.startDate, project.endDate);
        const physProgress = calculateProgress(project.boq);
        
        return (
          <div className="min-w-[120px]">
            <div className="flex justify-between mb-1 text-[10px] font-bold">
              <span className="text-muted-foreground uppercase">Time Burn</span>
              <span className="text-primary">{timeProgress}%</span>
            </div>
            <Progress 
              value={timeProgress} 
              className="h-1"
              indicatorClassName={cn(timeProgress > physProgress ? 'bg-destructive' : 'bg-primary')}
            />
          </div>
        );
      },
    },
    {
      id: "progress",
      header: "Physical Progress",
      cell: ({ row }) => {
        const physProgress = calculateProgress(row.original.boq);
        return (
          <div className="min-w-[120px]">
            <div className="flex justify-between mb-1 text-[10px] font-bold">
              <span className="text-muted-foreground uppercase">Physical</span>
              <span className="text-emerald-600">{physProgress}%</span>
            </div>
            <Progress value={physProgress} className="h-1 [&::-webkit-progress-value]:bg-emerald-600" />
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => {
        const project = row.original;
        return (
          <div className="flex justify-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onSelectProject(project.id); }}>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <HasPermission permission={Permission.PROJECT_UPDATE}>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleOpenEdit(project); }}>
                <Edit className="h-4 w-4" />
              </Button>
            </HasPermission>

            <HasPermission permission={Permission.PROJECT_DELETE}>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}>
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
          title="Welcome to RoadMaster Pro"
          description="It looks like you don't have any projects yet. Get started by creating your first infrastructure project."
          actionLabel="Create New Project"
          onAction={handleOpenNew}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Project Portfolio</h1>
          <p className="text-sm text-muted-foreground">Strategic oversight of {projects.length} infrastructure assets</p>
        </div>
        <div className="flex gap-2 items-center">
            <ToggleGroup type="single" value={viewMode} onValueChange={(value: 'LIST' | 'GRID') => value && setViewMode(value)} className="rounded-lg border bg-background">
                <ToggleGroupItem value="LIST" aria-label="Toggle list view" className="h-9 w-9 p-0">
                    <ListIcon className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="GRID" aria-label="Toggle grid view" className="h-9 w-9 p-0">
                    <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
            </ToggleGroup>
            <HasPermission permission={Permission.PROJECT_CREATE}>
              <Button onClick={handleOpenNew} className="shadow-lg shadow-primary/20">
                 <Plus className="mr-2 h-4 w-4" /> New Project
              </Button>
            </HasPermission>
        </div>
      </div>

      <Card className="border-none shadow-none bg-transparent">
         {viewMode === 'LIST' && (
            <div className="bg-card rounded-xl border p-4">
               <DataTable columns={columns} data={projects} searchKey="name" placeholder="Filter projects..." />
            </div>
         )}
         
         {viewMode === 'GRID' && (
            <div className="space-y-4">
               <SearchInput
                  placeholder="Search by code, client or name..."
                  value={gridSearchTerm}
                  onChange={setGridSearchTerm}
                  className="max-w-md"
               />
               
               {filteredGridProjects.length === 0 ? (
                  <div className="bg-card rounded-xl border py-12">
                    <EmptyState 
                      icon={SearchX}
                      title="No projects found"
                      description={`No projects match your search for "${gridSearchTerm}".`}
                      actionLabel="Clear Search"
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
                        const topBorderColor = index % 4 === 0 ? 'border-t-blue-500' : index % 4 === 1 ? 'border-t-emerald-500' : index % 4 === 2 ? 'border-t-amber-500' : 'border-t-rose-500';

                        return (
                            <Card key={project.id} className={cn("h-full cursor-pointer transition-all duration-500 hover:shadow-2xl group border-border/50 overflow-hidden rounded-2xl border-t-4", topBorderColor)} onClick={() => onSelectProject(project.id)}>
                                <CardContent className="p-0">
                                    <div className="p-6">
                                      <div className="flex justify-between mb-5 items-start">
                                          <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 group-hover:scale-110 transition-transform duration-500">
                                            <Avatar className="h-12 w-12 rounded-xl bg-white dark:bg-slate-900 text-primary font-black shadow-sm">
                                                <AvatarImage src={project.logo} />
                                                <AvatarFallback className="grad-primary text-white">{project.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                          </div>
                                          <Badge variant="secondary" className={cn("font-black text-[9px] px-2 py-0.5 uppercase tracking-[0.1em] rounded-lg", status.color.replace('text-', 'bg-').replace('600', '100').replace('500', '100') + ' ' + status.color)}>{status.label}</Badge>
                                      </div>
                                      
                                      <h3 className="text-xl font-black leading-tight mb-1 line-clamp-1 group-hover:text-primary transition-colors tracking-tight">{project.name}</h3>
                                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-6 font-bold uppercase tracking-wider opacity-70">
                                          <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-primary" /> {project.location}</span>
                                      </div>

                                      <div className="space-y-5">
                                          <div>
                                              <div className="flex justify-between mb-2 items-center">
                                                  <p className="text-[10px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-[0.15em]"><Timer className="h-3 w-3" /> Timeline</p>
                                                  <Badge variant="outline" className="text-[10px] font-black border-primary/20 text-primary">{duration}</Badge>
                                              </div>
                                              <Progress 
                                                  value={timeProgress} 
                                                  className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"
                                                  indicatorClassName={cn("rounded-full", timeProgress > physProgress ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'grad-primary shadow-[0_0_10px_rgba(37,99,235,0.3)]')}
                                              />
                                          </div>

                                          <div>
                                              <div className="flex justify-between mb-2 items-center">
                                                  <p className="text-[10px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-[0.15em]"><TrendingUp className="h-3 w-3" /> Execution</p>
                                                  <p className="text-[11px] font-black text-emerald-600">{physProgress}%</p>
                                              </div>
                                              <Progress value={physProgress} className="h-2 rounded-full bg-slate-100 dark:bg-slate-800" indicatorClassName="grad-emerald rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                                          </div>
                                      </div>
                                    </div>
                                    
                                    <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-border/40 flex justify-between items-center group-hover:bg-white dark:group-hover:bg-slate-900 transition-colors duration-500">
                                        <div className="flex gap-1.5">
                                          <HasPermission permission={Permission.PROJECT_UPDATE}>
                                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all" onClick={(e) => { e.stopPropagation(); handleOpenEdit(project); }}>
                                                  <Edit className="h-4 w-4" />
                                              </Button>
                                          </HasPermission>

                                          <HasPermission permission={Permission.PROJECT_DELETE}>
                                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-rose-500/10 hover:text-rose-500 transition-all" onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}>
                                                  <Trash2 className="h-4 w-4" />
                                              </Button>
                                          </HasPermission>
                                        </div>
                                        <Button variant="ghost" size="sm" className="h-9 px-4 text-[10px] font-black tracking-widest rounded-xl border border-transparent hover:border-primary/20 hover:bg-primary/5 hover:text-primary transition-all" onClick={(e) => { e.stopPropagation(); onSelectProject(project.id); }}>
                                          ENTER WORKSPACE <ArrowRight className="ml-2 h-3.5 w-3.5" />
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

         <div className="mt-6 flex flex-col items-center justify-center p-4 border rounded-xl bg-card border-dashed">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Database size={12} /> Aggregated Portfolio Data • Synchronized WGS84 Registry
            </p>
          </div>
      </Card>
    </div>
  );
};

export default ProjectsList;

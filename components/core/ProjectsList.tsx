import React, { useState, useMemo, startTransition } from 'react';
import { Project, UserRole, BOQItem } from '../../types';
import {
  Search, Plus, Trash2, Edit, CheckCircle, X, Calendar, MapPin, Activity, Clock, FileEdit, LayoutGrid, List as ListIcon, TrendingUp, Timer, ArrowRight
} from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Progress } from '~/components/ui/progress';
import { Separator } from '~/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { cn } from '~/lib/utils';
import ProjectModal from './ProjectModal';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';


// NOTE: This is a refactored version of the ProjectsList component.
// The original logic has been temporarily removed to facilitate the UI migration.
// It will be re-implemented in subsequent steps.

interface Props {
  projects: Project[];
  userRole: UserRole;
  onSelectProject: (projectId: string) => void;
  onSaveProject: (project: Partial<Project>) => void;
  onDeleteProject: (id: string) => void;
  onOpenModal: (project: Partial<Project> | null) => void;
}

const ProjectsList: React.FC<Props> = ({ projects, userRole, onSelectProject, onSaveProject, onDeleteProject, onOpenModal }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'LIST' | 'GRID'>('LIST');

  const hasEditPrivilege = userRole === UserRole.ADMIN || userRole === UserRole.PROJECT_MANAGER;

  // Placeholder functions and data
  const filteredProjects: Project[] = [
    { id: '1', name: 'Project Alpha', code: 'PA1', client: 'Client A', location: 'City X', startDate: '2023-01-01', endDate: '2023-12-31', boq: [], rfis: [], labTests: [], schedule: [], structures: [], agencies: [], agencyPayments: [], linearWorks: [], inventory: [], inventoryTransactions: [], vehicles: [], vehicleLogs: [], documents: [], sitePhotos: [], dailyReports: [], preConstruction: [], landParcels: [], mapOverlays: [], hindrances: [], ncrs: [], contractBills: [], subcontractorBills: [], measurementSheets: [], staffLocations: [], environmentRegistry: {}, purchaseOrders: [], agencyMaterials: [], agencyBills: [], subcontractorPayments: [], preConstructionTasks: [], kmlData: [], variationOrders: [], resources: [], resourceAllocations: [], milestones: [], comments: [], checklists: [], defects: [], complianceWorkflows: [], auditLogs: [], structureTemplates: [], accountingIntegrations: [], accountingTransactions: [], personnel: [], fleet: [] },
    { id: '2', name: 'Project Beta', code: 'PB2', client: 'Client B', location: 'City Y', startDate: '2024-03-01', endDate: '2024-09-30', boq: [], rfis: [], labTests: [], schedule: [], structures: [], agencies: [], agencyPayments: [], linearWorks: [], inventory: [], inventoryTransactions: [], vehicles: [], vehicleLogs: [], documents: [], sitePhotos: [], dailyReports: [], preConstruction: [], landParcels: [], mapOverlays: [], hindrances: [], ncrs: [], contractBills: [], subcontractorBills: [], measurementSheets: [], staffLocations: [], environmentRegistry: {}, purchaseOrders: [], agencyMaterials: [], agencyBills: [], subcontractorPayments: [], preConstructionTasks: [], kmlData: [], variationOrders: [], resources: [], resourceAllocations: [], milestones: [], comments: [], checklists: [], defects: [], complianceWorkflows: [], auditLogs: [], structureTemplates: [], accountingIntegrations: [], accountingTransactions: [], personnel: [], fleet: [] },
  ].filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  
  const handleOpenNew = () => { console.log('Open new project modal'); onOpenModal(null); };
  const handleOpenEdit = (project: Project) => { console.log('Open edit project modal', project); onOpenModal(project); };
  const handleDeleteProject = (id: string) => { console.log('Delete Project:', id); onDeleteProject(id); };

  const calculateProgress = (boq?: BOQItem[]) => 50; // Placeholder
  const calculateTimeProgress = (start: string, end: string) => 75; // Placeholder
  const calculateDuration = (start: string, end: string) => "6 Mos"; // Placeholder
  const getProjectStatus = (start: string, end: string) => ({ label: 'Active', color: 'text-green-600', dot: 'bg-green-500', icon: <Activity className="h-3 w-3" /> }); // Placeholder

  if (projects.length === 0) {
    return (
      <Card className="text-center p-8 border-dashed">
        <h2 className="text-2xl font-bold text-foreground">Welcome to RoadMaster Pro</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          It looks like you don't have any projects yet. <br/> Get started by creating your first project.
        </p>
        <Button size="lg" onClick={handleOpenNew}>
          <Plus className="mr-2 h-5 w-5" /> Create New Project
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Project Portfolio</h1>
          <p className="text-sm text-muted-foreground">Strategic oversight of {projects.length} infrastructure assets</p>
        </div>
        <div className="flex gap-2 items-center">
            <ToggleGroup type="single" value={viewMode} onValueChange={(value: 'LIST' | 'GRID') => value && setViewMode(value)} className="rounded-lg border">
                <ToggleGroupItem value="LIST" aria-label="Toggle list view" className="p-2">
                    <ListIcon className="h-5 w-5" />
                </ToggleGroupItem>
                <ToggleGroupItem value="GRID" aria-label="Toggle grid view" className="p-2">
                    <LayoutGrid className="h-5 w-5" />
                </ToggleGroupItem>
            </ToggleGroup>
            {hasEditPrivilege && (
              <Button onClick={handleOpenNew}>
                 <Plus className="mr-2 h-4 w-4" /> Create New Project
              </Button>
            )}
        </div>
      </div>

      <Card>
         <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-lg font-bold">Project Directory ({filteredProjects.length})</h2>
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

         {viewMode === 'LIST' && filteredProjects.length === 0 && (
            <div className="text-center p-8">
                <p className="text-muted-foreground">No projects match your search.</p>
            </div>
         )}

         {viewMode === 'LIST' && filteredProjects.length > 0 && (
            <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow className="bg-muted">
                        <TableHead className="font-bold">Project Identity</TableHead>
                        <TableHead className="font-bold">Employer / Contractor</TableHead>
                        <TableHead className="font-bold">Contractual Timeline</TableHead>
                        <TableHead className="font-bold">Progress Matrix</TableHead>
                        <TableHead className="text-center font-bold">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredProjects.map(project => {
                        const physProgress = calculateProgress(project.boq);
                        const timeProgress = calculateTimeProgress(project.startDate, project.endDate);
                        const status = getProjectStatus(project.startDate, project.endDate);
                        
                        return (
                            <TableRow key={project.id} className="hover:bg-muted transition-colors group">
                                <TableCell className="cursor-pointer" onClick={() => onSelectProject(project.id)}>
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-11 w-11 rounded-md bg-secondary text-primary font-bold">
                                            <AvatarImage src={project.logo} />
                                            <AvatarFallback>{project.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-bold text-foreground">{project.name}</p>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <Badge className={cn("text-xs", status.color)}>{status.icon} {status.label}</Badge>
                                                <Badge variant="secondary" className="text-xs font-mono">{project.code}</Badge>
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <p className="font-semibold">{project.client}</p>
                                    <p className="text-sm text-muted-foreground">{project.contractor}</p>
                                </TableCell>
                                <TableCell>
                                    <div className="min-w-36">
                                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                                            <Calendar className="h-4 w-4" />
                                            <p className="text-xs font-medium">{project.startDate} — {project.endDate || 'Ongoing'}</p>
                                        </div>
                                        <div className="flex justify-between mb-0.5">
                                            <p className="text-xs font-bold text-muted-foreground">TIME BURN</p>
                                            <p className="text-xs font-bold text-primary">{timeProgress}%</p>
                                        </div>
                                        <Progress 
                                            value={timeProgress} 
                                            className="h-1.5 [&::-webkit-progress-bar]:bg-slate-200"
                                            indicatorClassName={cn(timeProgress > physProgress ? 'bg-destructive' : 'bg-primary')}
                                        />
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="min-w-36">
                                        <div className="flex justify-between mb-0.5">
                                            <p className="text-xs font-bold text-muted-foreground">PHYSICAL</p>
                                            <p className="text-xs font-bold text-emerald-600">{physProgress}%</p>
                                        </div>
                                        <Progress value={physProgress} className="h-1.5 [&::-webkit-progress-bar]:bg-slate-200 [&::-webkit-progress-value]:bg-emerald-600" />
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" onClick={() => onSelectProject(project.id)}>
                                                        <ArrowRight />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>View Control Panel</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        {hasEditPrivilege && (
                                            <>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(project)}>
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Edit Project</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
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
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
                </Table>
            </div>
         )}

         {viewMode === 'GRID' && filteredProjects.length === 0 && (
            <div className="text-center p-8">
                <p className="text-muted-foreground">No projects match your search.</p>
            </div>
         )}
         
         {viewMode === 'GRID' && filteredProjects.length > 0 && (
            <div className="p-4 bg-muted">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProjects.map(project => {
                        const physProgress = calculateProgress(project.boq);
                        const timeProgress = calculateTimeProgress(project.startDate, project.endDate);
                        const duration = calculateDuration(project.startDate, project.endDate);
                        const status = getProjectStatus(project.startDate, project.endDate);

                        return (
                            <Card key={project.id} className="h-full cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-lg" onClick={() => onSelectProject(project.id)}>
                                <CardContent className="p-4">
                                    <div className="flex justify-between mb-2 items-start">
                                        <Avatar 
                                            src={project.logo} 
                                            variant="rounded" 
                                            className="h-14 w-14 rounded-lg bg-secondary text-primary font-bold"
                                        >
                                            <AvatarImage src={project.logo} />
                                            <AvatarFallback>{project.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <Badge className={cn(status.color)}>{status.icon} {status.label}</Badge>
                                    </div>
                                    
                                    <h3 className="text-lg font-bold leading-tight mb-1">{project.name}</h3>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
                                        <Badge variant="secondary">{project.code}</Badge>
                                        <MapPin className="h-3 w-3" /> {project.location}
                                    </div>

                                    <Separator className="my-3 border-dashed" />

                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex justify-between mb-1 items-center">
                                                <p className="text-xs font-bold text-muted-foreground flex items-center gap-1"><Timer className="h-4 w-4" /> CONTRACTUAL TIMELINE</p>
                                                <p className="text-xs font-bold text-primary">{duration}</p>
                                            </div>
                                            <div className="flex justify-between text-xs mb-0.5">
                                                <p className="font-bold">{project.startDate}</p>
                                                <p className="font-bold">{project.endDate}</p>
                                            </div>
                                            <Progress 
                                                value={timeProgress} 
                                                className="h-1.5 [&::-webkit-progress-bar]:bg-slate-200"
                                                indicatorClassName={cn(timeProgress > physProgress ? 'bg-destructive' : 'bg-primary')}
                                            />
                                            <p className="text-xs text-muted-foreground text-center mt-1">
                                                {timeProgress}% SCHEDULE ELAPSED
                                            </p>
                                        </div>

                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <p className="text-xs font-bold text-muted-foreground flex items-center gap-1"><TrendingUp className="h-4 w-4" /> PHYSICAL EXECUTION</p>
                                                <p className="text-xs font-bold text-emerald-600">{physProgress}%</p>
                                            </div>
                                            <Progress value={physProgress} className="h-2 [&::-webkit-progress-bar]:bg-slate-200 [&::-webkit-progress-value]:bg-emerald-600" />
                                        </div>
                                    </div>
                                    {(userRole === UserRole.ADMIN || userRole === UserRole.PROJECT_MANAGER) && (
                                        <div className="flex justify-end gap-2 mt-4">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleOpenEdit(project); }}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Edit Project</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Delete Project</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
         )}

         <Card className="text-center p-4">
            <p className="text-sm text-muted-foreground">Aggregated Portfolio Data • Synchronized WGS84 Registry</p>
            <p className="text-sm font-bold text-primary mt-1">{filteredProjects.length} Projects Loaded</p>
          </Card>
      </Card>
    </div>
  );
};

export default ProjectsList;

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Project, ScheduleTask, UserRole, TaskDependency, ResourceAllocation, Milestone, RFI, AppSettings } from '../../types';
import {
    Plus, Edit2, Trash2, Search, LayoutList,
    BarChartHorizontal, Save, Calendar,
    AlertCircle, Info, ZoomIn, ZoomOut, Maximize,
    FileCheck, Clock, CheckCircle, Layers, Flag
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableRow } from '~/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '~/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Badge } from '~/components/ui/badge';
import { Slider } from '~/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import StatCard from '../core/StatCard';
import { formatCurrency } from '../../utils/formatting/exportUtils';
import { getCurrencySymbol } from '../../utils/formatting/currencyUtils';
import { cn } from '~/lib/utils';
import { Switch } from '~/components/ui/switch';
import { Progress } from '~/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs'; // Shadcn Tabs

interface Props {
    project: Project;
    settings?: AppSettings;
    userRole: UserRole;
    onProjectUpdate: (project: Partial<Project>) => void;
}


const ROW_HEIGHT = 48;
const HEADER_HEIGHT = 70;
const SIDEBAR_WIDTH = 250;

type ZoomLevel = 'MONTH' | 'WEEK' | 'DAY';
type DragType = 'MOVE' | 'RESIZE_START' | 'RESIZE_END' | 'PROGRESS';

const ScheduleModule: React.FC<Props> = ({ project, settings, userRole, onProjectUpdate }) => {
  // Hardcoding colors or mapping to Tailwind equivalents as Material-UI theme is removed
  const themeColors = {
      primary: {
          main: '#4f46e5', // primary
          dark: '#3730a3', // indigo-800
      },
      error: {
          main: '#ef4444', // red-500
      },
      warning: {
          main: '#f59e0b', // amber-500
      },
      success: {
          main: '#10b981', // emerald-500
      },
      divider: '#e5e7eb', // gray-200
      text: {
        secondary: '#6b7280', // gray-500
        primary: '#1f2937' // gray-800
      }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<ScheduleTask>>({});
  const [dependencyTab, setDependencyTab] = useState("0"); // Use string for Shadcn Tabs value
  const [selectedResource, setSelectedResource] = useState('');
  const [resourceQuantity, setResourceQuantity] = useState<number>(0);
  const [resourceStartDate, setResourceStartDate] = useState('');
  const [resourceEndDate, setResourceEndDate] = useState('');
  const [resourceNotes, setResourceNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'LIST' | 'GANTT' | 'RESOURCES' | 'CAPACITY' | 'MILESTONES'>('GANTT');
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('WEEK');
  const ganttContainerRef = useRef<HTMLDivElement>(null);
  const [draggingTask, setDraggingTask] = useState<{ id: string, type: DragType, initialX: number, initialValue: any } | null>(null);

  const canEdit = [UserRole.PROJECT_MANAGER, UserRole.ADMIN, UserRole.SITE_ENGINEER].includes(userRole);

  const dayWidth = useMemo(() => {
    switch(zoomLevel) {
        case 'MONTH': return 10;
        case 'WEEK': return 40;
        case 'DAY': return 100;
        default: return 40;
    }
  }, [zoomLevel]);

  const taskRFIMap = useMemo(() => {
      const map: Record<string, RFI[]> = {};
      project.rfis.forEach(rfi => {
          if (rfi.linkedTaskId) {
              if (!map[rfi.linkedTaskId]) map[rfi.linkedTaskId] = [];
              map[rfi.linkedTaskId].push(rfi);
          }
      });
      return map;
  }, [project.rfis]);

  const { startDate, daysCount, dateScale } = useMemo(() => {
    if (project.schedule.length === 0) {
        const start = new Date();
        start.setHours(0,0,0,0);
        return { startDate: start, daysCount: 60, dateScale: [] };
    }
    
    const dates = project.schedule.flatMap(t => [new Date(t.startDate), new Date(t.endDate)]);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    minDate.setHours(0,0,0,0);
    minDate.setDate(minDate.getDate() - 10);
    
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    maxDate.setDate(maxDate.getDate() + 30);
    
    const count = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    const scale = [];
    for (let i = 0; i <= count; i++) {
        const date = new Date(minDate);
        date.setDate(minDate.getDate() + i);
        scale.push(date);
    }
    return { startDate: minDate, daysCount: count, dateScale: scale };
  }, [project.schedule]);

  const getXFromDate = (dateStr: string) => {
    const date = new Date(dateStr);
    date.setHours(0,0,0,0);
    const diffTime = date.getTime() - startDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays * dayWidth;
  };

  const resolveDependencies = (tasks: ScheduleTask[]): ScheduleTask[] => {
      let updated = [...tasks];
      let changed = true;
      let iterations = 0;
      
      while (changed && iterations < 10) {
          changed = false;
          iterations++;
          updated = updated.map(task => {
              let newStart = new Date(task.startDate);
              let newEnd = new Date(task.endDate);
              let startModified = false;
              let endModified = false;

              task.dependencies.forEach(dep => {
                  const pred = updated.find(t => t.id === dep.taskId);
                  if (!pred) return;

                  const lag = dep.lag || 0;
                  
                  switch(dep.type) {
                      case 'FS': // Finish to Start
                          const predEnd = new Date(pred.endDate);
                          predEnd.setDate(predEnd.getDate() + lag);
                          if (newStart < predEnd) {
                              newStart = new Date(predEnd);
                              newStart.setDate(newStart.getDate() + 1); // Add one day since it's finish to start
                              startModified = true;
                          }
                          break;
                      case 'SS': // Start to Start
                          const predStart = new Date(pred.startDate);
                          predStart.setDate(predStart.getDate() + lag);
                          if (newStart < predStart) {
                              newStart = new Date(predStart);
                              startModified = true;
                          }
                          break;
                      case 'FF': // Finish to Finish
                          const predEndFF = new Date(pred.endDate);
                          predEndFF.setDate(predEndFF.getDate() + lag);
                          if (newEnd < predEndFF) {
                              newEnd = new Date(predEndFF);
                              endModified = true;
                          }
                          break;
                      case 'SF': // Start to Finish
                          const predStartSF = new Date(pred.startDate);
                          predStartSF.setDate(predStartSF.getDate() + lag);
                          if (newEnd < predStartSF) {
                              newEnd = new Date(predStartSF);
                              endModified = true;
                          }
                          break;
                  }
              });

              if (startModified || endModified) {
                  // If only start was modified, keep the same duration
                  if (startModified && !endModified) {
                      const duration = new Date(task.endDate).getTime() - new Date(task.startDate).getTime();
                      newEnd = new Date(newStart.getTime() + duration);
                  } 
                  // If only end was modified and it's now before start, adjust start
                  else if (endModified && !startModified && newEnd < newStart) {
                      const duration = new Date(task.endDate).getTime() - new Date(task.startDate).getTime();
                      newStart = new Date(newEnd.getTime() - duration);
                  }
                  // If both were modified, ensure end is not before start
                  else if (startModified && endModified && newEnd < newStart) {
                      newEnd = new Date(newStart);
                      newEnd.setDate(newEnd.getDate() + 1);
                  }
                  
                  changed = true;
                  return {
                      ...task,
                      startDate: newStart.toISOString().split('T')[0],
                      endDate: newEnd.toISOString().split('T')[0]
                  };
              }
              return task;
          });
      }
      return updated;
  };

  const handleOpenModal = (task?: ScheduleTask) => {
      if (task) setEditingTask({ ...task });
      else setEditingTask({
          name: '',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
          progress: 0,
          status: 'On Track',
          isCritical: false,
          dependencies: [],
          boqItemId: ''
      });
      setIsModalOpen(true);
  };

  const handleSave = () => {
      if (!editingTask.name || !editingTask.startDate || !editingTask.endDate) return;

      // Duplicate Check
      if (!editingTask.id && project.schedule.some(t => t.name.toLowerCase() === editingTask.name?.toLowerCase())) {
          toast.error("Duplicate Activity", { description: "An activity with this name already exists. Please choose a unique name." });
          return;
      }

      let updatedSchedule: ScheduleTask[];
      if (editingTask.id) {
          updatedSchedule = project.schedule.map(t => t.id === editingTask.id ? { ...t, ...editingTask } as ScheduleTask : t);
      } else {
          const newTask: ScheduleTask = {
              id: `task-${Date.now()}`,
              name: editingTask.name!,
              startDate: editingTask.startDate!,
              endDate: editingTask.endDate!,
              progress: Number(editingTask.progress) || 0,
              status: editingTask.status as any || 'On Track',
              dependencies: [],
              isCritical: editingTask.isCritical || false,
              boqItemId: editingTask.boqItemId
          };
          updatedSchedule = [...project.schedule, newTask];
      }
      onProjectUpdate({ ...project, schedule: resolveDependencies(updatedSchedule) });
      setIsModalOpen(false);
      setEditingTask({}); // Reset form
      setDependencyTab("0"); // Reset tab
  };

  const handleDeleteTask = (taskId: string) => {
      if (window.confirm('Are you sure you want to delete this task?')) {
          const updatedSchedule = project.schedule.filter(t => t.id !== taskId);
          onProjectUpdate({ ...project, schedule: updatedSchedule });
      }
  };

  const onMouseDown = (e: React.MouseEvent, taskId: string, type: DragType) => {
      if (!canEdit) return;
      e.stopPropagation();
      const task = project.schedule.find(t => t.id === taskId);
      if (!task) return;
      
      setDraggingTask({
          id: taskId,
          type,
          initialX: e.clientX,
          initialValue: { start: task.startDate, end: task.endDate, progress: task.progress }
      });
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
        if (!draggingTask) return;
        
        const deltaX = (e.clientX - draggingTask.initialX);
        const deltaDays = Math.round(deltaX / dayWidth);
        
        const updatedSchedule = project.schedule.map(t => {
            if (t.id === draggingTask.id) {
                if (draggingTask.type === 'MOVE') {
                    const newStart = new Date(draggingTask.initialValue.start);
                    newStart.setDate(newStart.getDate() + deltaDays);
                    const newEnd = new Date(draggingTask.initialValue.end);
                    newEnd.setDate(newEnd.getDate() + deltaDays);
                    return { 
                        ...t, 
                        startDate: newStart.toISOString().split('T')[0], 
                        endDate: newEnd.toISOString().split('T')[0] 
                    };
                } else if (draggingTask.type === 'RESIZE_START') {
                    const newStart = new Date(draggingTask.initialValue.start);
                    newStart.setDate(newStart.getDate() + deltaDays);
                    // Prevent zero or negative duration
                    if (newStart >= new Date(t.endDate)) return t;
                    return { ...t, startDate: newStart.toISOString().split('T')[0] };
                } else if (draggingTask.type === 'RESIZE_END') {
                    const newEnd = new Date(draggingTask.initialValue.end);
                    newEnd.setDate(newEnd.getDate() + deltaDays);
                    if (newEnd <= new Date(t.startDate)) return t;
                    return { ...t, endDate: newEnd.toISOString().split('T')[0] };
                } else if (draggingTask.type === 'PROGRESS') {
                    const taskX = getXFromDate(t.startDate);
                    const taskW = getXFromDate(t.endDate) - taskX;
                    const containerRect = ganttContainerRef.current?.getBoundingClientRect();
                    const mouseXInTask = e.clientX - (containerRect?.left || 0) + (ganttContainerRef.current?.scrollLeft || 0) - SIDEBAR_WIDTH - taskX;
                    const newProgress = Math.min(100, Math.max(0, Math.round((mouseXInTask / taskW) * 100)));
                    return { ...t, progress: newProgress };
                }
            }
            return t;
        });
        
        onProjectUpdate({ ...project, schedule: resolveDependencies(updatedSchedule) });
    };

    const onMouseUp = () => setDraggingTask(null);

    if (draggingTask) {
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
    };
  }, [draggingTask, dayWidth, project.schedule]);

  const filteredTasks = useMemo(() => {
      let tasks = project.schedule;
      if (searchQuery) tasks = tasks.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
      return [...tasks].sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [project.schedule, searchQuery]);

  const canvasHeight = useMemo(() => {
      return (filteredTasks.length + (canEdit ? 1 : 0)) * ROW_HEIGHT;
  }, [filteredTasks.length, canEdit]);

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
        <div className="flex justify-between mb-3 items-start">
            <div>
                <h2 className="text-xl font-bold">Project Schedule</h2>
                <p className="text-sm text-muted-foreground">Interactive Gantt timeline with dependency resolution</p>
            </div>
            <div className="flex gap-2 items-center">
                <Button variant="default" className="flex items-center gap-2" onClick={() => handleOpenModal()}>
                    <Plus size={18} />
                    Add Activity
                </Button>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <StatCard title="Total Activities" value={project.schedule.length} icon={LayoutList} color="#1976d2" />
            <StatCard title="Completed" value={project.schedule.filter(t => t.status === 'Completed').length} icon={CheckCircle} color="#4caf50" />
            <StatCard title="Delayed" value={project.schedule.filter(t => t.status === 'Delayed').length} icon={AlertCircle} color="#f44336" />
            <StatCard title="On Track" value={project.schedule.filter(t => t.status === 'On Track').length} icon={Clock} color="#ff9800" />
        </div>
        
        <div className="border rounded-lg p-2 mb-4 flex gap-2 items-center">
            <div className="w-64">
                <Input 
                    placeholder="Filter tasks..." 
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)} 
                    className="w-full"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} />
                </div>
            </div>
            <div className="h-6 w-px bg-gray-300" /> {/* Divider */}
            <div className="flex gap-2 items-center">
                <div className="flex gap-1 bg-gray-100 rounded-md p-1"> {/* ToggleButtonGroup */}
                    <button 
                        className={cn("px-4 py-1 rounded-md", viewMode === 'GANTT' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200')}
                        onClick={() => setViewMode('GANTT')}
                        title="Gantt Chart View"
                        aria-label="Gantt Chart View">
                        <BarChartHorizontal size={18} />
                    </button>
                    <button 
                        className={cn("px-4 py-1 rounded-md", viewMode === 'LIST' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200')}
                        onClick={() => setViewMode('LIST')}
                        title="List View"
                        aria-label="List View">
                        <LayoutList size={18} />
                    </button>
                    <button 
                        className={cn("px-4 py-1 rounded-md", viewMode === 'RESOURCES' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200')}
                        onClick={() => setViewMode('RESOURCES')}
                        title="Resource Allocation View"
                        aria-label="Resource Allocation View">
                        <FileCheck size={18} />
                    </button>
                    <button 
                        className={cn("px-4 py-1 rounded-md", viewMode === 'CAPACITY' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200')}
                        onClick={() => setViewMode('CAPACITY')}
                        title="Capacity Planning View"
                        aria-label="Capacity Planning View">
                        <Layers size={18} />
                    </button>
                    <button 
                        className={cn("px-4 py-1 rounded-md", viewMode === 'MILESTONES' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200')}
                        onClick={() => setViewMode('MILESTONES')}
                        title="Milestones View"
                        aria-label="Milestones View">
                        <Flag size={18} />
                    </button>
                </div>
                <div className="flex gap-1"> {/* Box for Zoom buttons */}
                   <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => setZoomLevel('MONTH')} 
                                className={zoomLevel === 'MONTH' ? 'bg-blue-500 text-white' : ''}
                                title="Month View"
                                aria-label="Month View">
                                <ZoomOut size={16}/>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Month View</TooltipContent>
                   </Tooltip>
                   </TooltipProvider>
                   <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => setZoomLevel('WEEK')} 
                                className={zoomLevel === 'WEEK' ? 'bg-blue-500 text-white' : ''}
                                title="Week View"
                                aria-label="Week View">
                                <Maximize size={16}/>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Week View</TooltipContent>
                    </Tooltip>
                   </TooltipProvider>
                   <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => setZoomLevel('DAY')} 
                                className={zoomLevel === 'DAY' ? 'bg-blue-500 text-white' : ''}
                                title="Day View"
                                aria-label="Day View">
                                <ZoomIn size={16}/>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Day View</TooltipContent>
                    </Tooltip>
                   </TooltipProvider>
                </div>
            </div>
            <div className="flex-grow" />
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold"> {/* Box for Critical Path */}
                <AlertCircle size={14}/>
                Critical Path
            </div>
        </div>

        {viewMode === 'LIST' ? (
            <div className="border rounded-lg overflow-hidden flex-1 bg-background"> {/* Paper */}
                <table className="w-full">
                    <thead className="bg-accent"> {/* TableHead sx={{ bgcolor: 'action.hover' }} */}
                        <tr>
                            <th className="font-bold py-2 px-4 text-left">Activity Name</th> {/* TableCell sx={{ fontWeight: 'bold' }} */}
                            <th className="font-bold py-2 px-4 text-left">Schedule Range</th>
                            <th className="font-bold py-2 px-4 text-left">Inspections</th>
                            <th className="font-bold py-2 px-4 text-left">Progress</th>
                            <th className="font-bold py-2 px-4 text-left">Status</th>
                            <th className="font-bold py-2 px-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTasks.map(task => {
                            const rfis = taskRFIMap[task.id] || [];
                            return (
                                <tr key={task.id} className="hover:bg-accent/50"> {/* TableRow hover sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }} */}
                                    <td className="py-2 px-4"> {/* TableCell */}
                                        <div className="flex items-center gap-1.5"> {/* Box */}
                                            {task.isCritical && <AlertCircle size={14} className="text-red-500"/>}
                                            <span className="text-sm font-bold">{task.name}</span> {/* Typography */}
                                            {task.boqItemId && <Badge variant="outline" className="ml-1 text-xs px-2 py-1">BOQ: {project.boq.find(b => b.id === task.boqItemId)?.itemNo || 'N/A'}</Badge>} {/* Chip */}
                                        </div>
                                    </td>
                                    <td className="py-2 px-4"> {/* TableCell */}
                                        <div className="flex items-center gap-1 text-muted-foreground"> {/* Box */}
                                            <Calendar size={12}/>
                                            <span className="text-xs font-medium">{task.startDate} — {task.endDate}</span> {/* Typography */}
                                        </div>
                                    </td>
                                    <td className="py-2 px-4"> {/* TableCell */}
                                        {rfis.length > 0 ? 
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="cursor-pointer">
                                                            <Badge className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold bg-yellow-100 text-yellow-800">
                                                                <FileCheck size={12}/>
                                                                {rfis.length}
                                                            </Badge>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{rfis.length} Linked Inspection Requests</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            : <span className="text-xs text-muted-foreground">—</span>} {/* Typography */}
                                    </td>
                                    <td className="py-2 px-4 w-40"> {/* TableCell */}
                                        <div className="flex items-center gap-1.5"> {/* Box */}
                                            <Progress 
                                                value={task.progress} 
                                                className="h-1.5 flex-1" 
                                                indicatorClassName={task.progress === 100 ? 'bg-green-500' : ''}
                                            />
                                            <span className="text-xs font-bold">{task.progress}%</span> {/* Typography */}
                                        </div>
                                    </td>
                                    <td className="py-2 px-4"> {/* TableCell */}
                                        <Badge 
                                            className={cn("text-xs font-bold px-2 py-1 border",
                                                task.status === 'Completed' ? 'border-green-500 text-green-700' :
                                                task.status === 'Delayed' ? 'border-red-500 text-red-700' :
                                                'border-blue-500 text-blue-700'
                                            )}
                                        >
                                            {task.status}
                                        </Badge>
                                    </td>
                                    <td className="py-2 px-4 text-right"> {/* TableCell */}
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="p-1 mr-1 hover:text-amber-600" 
                                            onClick={() => handleOpenModal(task)}
                                            title="Edit Task"
                                            aria-label="Edit Task"
                                        > {/* IconButton */}
                                            <Edit2 size={16} className="text-amber-600"/>
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="p-1 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10" 
                                            onClick={() => handleDeleteTask(task.id)}
                                            title="Delete Task"
                                            aria-label="Delete Task"
                                        > {/* IconButton */}
                                            <Trash2 size={16}/>
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        ) : viewMode === 'RESOURCES' ? (
            <div className="border rounded-lg overflow-hidden flex-1 bg-background"> {/* Paper */}
                <div className="p-2 border-b border-border bg-accent"> {/* Box */}
                    <h3 className="text-base font-bold">Resource Allocation Overview</h3> {/* Typography */}
                </div>
                <div className="p-2"> {/* Box */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Grid container */}
                        <div> {/* Grid item */}
                            <h3 className="text-base font-bold mb-2">Resource Allocation by Task</h3> {/* Typography */}
                            <div className="border rounded-lg p-2 max-h-96 overflow-auto"> {/* Paper */}
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Task</TableCell>
                                            <TableCell>Resource</TableCell>
                                            <TableCell>Quantity</TableCell>
                                            <TableCell>Period</TableCell>
                                            <TableCell>Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(project.resourceAllocations || []).map(alloc => {
                                            const task = project.schedule.find(t => t.id === alloc.allocatedTo);
                                            const resource = (project.resources || []).find(r => r.id === alloc.resourceId);
                                            return (
                                                <TableRow key={alloc.id}>
                                                    <TableCell>{task?.name || 'Unknown Task'}</TableCell>
                                                    <TableCell>{resource?.name || 'Unknown Resource'}</TableCell>
                                                    <TableCell>{alloc.allocatedQuantity} {resource?.unit || ''}</TableCell>
                                                    <TableCell>{alloc.startDate} to {alloc.endDate}</TableCell>
                                                    <TableCell><Badge variant="outline" className={cn(
                                                    alloc.status === 'Completed' && 'border-green-500 text-green-700',
                                                    alloc.status === 'In Progress' && 'border-blue-500 text-blue-700',
                                                    alloc.status !== 'Completed' && alloc.status !== 'In Progress' && 'border-gray-500 text-gray-700'
                                                )}>{alloc.status}</Badge></TableCell> {/* Chip */}
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                                {(project.resourceAllocations || []).length === 0 && (
                                    <p className="text-center py-4 text-sm text-muted-foreground"> {/* Typography */}
                                        No resource allocations found
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="col-span-1 md:col-span-1"> {/* Grid item */}
                            <h3 className="text-lg font-bold mb-2">Resource Availability</h3> {/* Typography */}
                            <div className="border rounded-lg p-2 max-h-96 overflow-auto"> {/* Paper */}
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Resource</TableCell>
                                            <TableCell>Available</TableCell>
                                            <TableCell>Allocated</TableCell>
                                            <TableCell>Total</TableCell>
                                            <TableCell>Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(project.resources || []).map(resource => {
                                            const allocated = (project.resourceAllocations || [])
                                                .filter(alloc => alloc.resourceId === resource.id)
                                                .reduce((sum, alloc) => sum + alloc.allocatedQuantity, 0);
                                            const available = resource.totalQuantity - allocated;
                                            return (
                                                <TableRow key={resource.id}>
                                                    <TableCell>{resource.name}</TableCell>
                                                    <TableCell>{available} {resource.unit}</TableCell>
                                                    <TableCell>{allocated} {resource.unit}</TableCell>
                                                    <TableCell>{resource.totalQuantity} {resource.unit}</TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            className={cn(
                                                                resource.status === 'Available' && 'border-green-500 text-green-700',
                                                                resource.status === 'Allocated' && 'border-blue-500 text-blue-700',
                                                                (resource.status === 'In Transit' || resource.status === 'Reserved') && 'border-orange-500 text-orange-700'
                                                            )}
                                                        >
                                                            {resource.status}
                                                        </Badge>
                                                    </TableCell> {/* Chip */}
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                                {(project.resources || []).length === 0 && (
                                    <p className="text-center py-4 text-sm text-muted-foreground"> {/* Typography */}
                                        No resources defined
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ) : viewMode === 'CAPACITY' ? (
            <div className="border rounded-lg overflow-hidden flex-1 bg-background"> {/* Paper */}
                <div className="p-2 border-b border-border bg-accent"> {/* Box */}
                    <h3 className="text-base font-bold">Capacity Management</h3> {/* Typography */}
                </div>
                <div className="p-2"> {/* Box */}
                    <div className="grid grid-cols-1 gap-4"> {/* Grid container */}
                        <div> {/* Grid item */}
                            <h3 className="text-base font-bold mb-2">Resource Capacity Utilization</h3> {/* Typography */}
                            <div className="border rounded-lg p-2"> {/* Paper */}
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Resource</TableCell>
                                            <TableCell>Capacity</TableCell>
                                            <TableCell>Utilized</TableCell>
                                            <TableCell>Available</TableCell>
                                            <TableCell>Utilization %</TableCell>
                                            <TableCell>Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(project.resources || []).map(resource => {
                                            const allocated = (project.resourceAllocations || [])
                                                .filter(alloc => alloc.resourceId === resource.id)
                                                .reduce((sum, alloc) => sum + alloc.allocatedQuantity, 0);
                                            const available = resource.totalQuantity - allocated;
                                            const utilization = resource.totalQuantity > 0 ? Math.round((allocated / resource.totalQuantity) * 100) : 0;
                                            return (
                                                <TableRow key={resource.id}>
                                                    <TableCell>{resource.name}</TableCell>
                                                    <TableCell>{resource.totalQuantity} {resource.unit}</TableCell>
                                                    <TableCell>{allocated} {resource.unit}</TableCell>
                                                    <TableCell>{available} {resource.unit}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1"> {/* Box */}
                                                            <div className="flex-1"> {/* Box */}
                                                                <Progress 
                                                                    value={utilization} 
                                                                    className={cn(
                                                                        "h-2 rounded-md", // Converted sx={{ height: 8, borderRadius: 4 }}
                                                                        utilization > 90 ? 'bg-red-500' : utilization > 75 ? 'bg-orange-500' : 'bg-green-500' // Converted color prop
                                                                    )}
                                                                />
                                                            </div>
                                                            <span className="text-sm font-bold">{utilization}%</span> {/* Typography */}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge 
                                                            className={cn(
                                                                utilization > 90 ? 'border-red-500 text-red-700' :
                                                                utilization > 75 ? 'border-orange-500 text-orange-700' :
                                                                utilization > 50 ? 'border-blue-500 text-blue-700' : 'border-green-500 text-green-700'
                                                            )}
                                                        >
                                                            {utilization > 90 ? 'Over Utilized' : utilization > 75 ? 'High Utilization' : utilization > 50 ? 'Normal' : 'Under Utilized'}
                                                        </Badge>
                                                    </TableCell> {/* Chip */}
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                                {(project.resources || []).length === 0 && (
                                    <p className="text-center py-4 text-sm text-muted-foreground"> {/* Typography */}
                                        No resources defined
                                    </p>
                                )}
                            </div>
                        </div>
                        
                        <div className="col-span-1"> {/* Grid item */}
                            <h3 className="text-lg font-bold mb-2">Capacity Planning by Period</h3> {/* Typography */}
                            <div className="border rounded-lg p-2"> {/* Paper */}
                                <p className="text-sm text-muted-foreground mb-2">Visualize resource capacity over time</p> {/* Typography */}
                                <div className="h-72 flex items-center justify-center border border-dashed border-border rounded-md"> {/* Box */}
                                    <p className="text-base text-muted-foreground">Capacity planning chart will be displayed here</p> {/* Typography */}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ) : viewMode === 'MILESTONES' ? (
            <div className="border rounded-xl overflow-hidden flex-1 bg-background"> {/* Paper */}
                <div className="p-4 border-b border-border bg-accent"> {/* Box */}
                    <h3 className="text-lg font-bold">Milestone Tracking</h3> {/* Typography */}
                </div>
                <div className="p-4"> {/* Box */}
                    <div className="grid grid-cols-1 gap-4"> {/* Grid container */}
                        <div> {/* Grid item */}
                            <div className="flex justify-between items-center mb-2"> {/* Box */}
                                <h3 className="text-lg font-bold">Project Milestones</h3> {/* Typography */}
                                <Button
                                    onClick={() => {
                                        // Add new milestone functionality
                                        const newMilestone: Milestone = {
                                            id: `milestone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                            name: 'New Milestone',
                                            description: 'Milestone description',
                                            date: new Date().toISOString().split('T')[0],
                                            status: 'Planned',
                                            priority: 'Medium',
                                            notes: 'Add details'
                                        };
                                        
                                        const updatedMilestones = [...(project.milestones || []), newMilestone];
                                        onProjectUpdate({
                                            ...project,
                                            milestones: updatedMilestones
                                        });
                                    }}
                                >
                                    <Plus size={16} className="mr-2" /> Add Milestone
                                </Button>
                            </div>
                            <div className="border rounded-lg p-2"> {/* Paper */}
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Name</TableCell>
                                            <TableCell>Description</TableCell>
                                            <TableCell>Scheduled Date</TableCell>
                                            <TableCell>Status</TableCell>
                                            <TableCell>Priority</TableCell>
                                            <TableCell>Progress</TableCell>
                                            <TableCell>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(project.milestones || []).map(milestone => {
                                            const isOverdue = new Date(milestone.date) < new Date() && milestone.status !== 'Completed';
                                            const isUpcoming = new Date(milestone.date) > new Date() && milestone.status === 'Planned';
                                            const isCompleted = milestone.status === 'Completed';
                                            
                                            return (
                                                <TableRow key={milestone.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1"> {/* Box */}
                                                            <Flag size={16} className={cn(isCompleted && 'text-emerald-500', isOverdue && 'text-red-500', !isCompleted && !isOverdue && 'text-amber-500')} /> {/* color */}
                                                            <span className="font-bold">{milestone.name}</span> {/* Typography */}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{milestone.description}</TableCell> {/* TableCell */}
                                                    <TableCell>
                                                        <div className="flex items-center gap-1"> {/* Box */}
                                                            <Calendar size={14} />
                                                            <span>{milestone.date}</span> {/* Typography */}
                                                            {isOverdue && <AlertCircle size={14} className="text-red-500" />} {/* color */}
                                                            {isUpcoming && <Info size={14} className="text-amber-500" />} {/* color */}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            className={cn(
                                                                milestone.status === 'Completed' && 'border-green-500 text-green-700',
                                                                milestone.status === 'Missed' && 'border-red-500 text-red-700',
                                                                milestone.status === 'Planned' && 'border-blue-500 text-blue-700' // Assuming info
                                                            )}
                                                        >
                                                            {milestone.status}
                                                        </Badge>
                                                    </TableCell> {/* Chip */}
                                                    <TableCell>
                                                        <Badge
                                                            className={cn(
                                                                milestone.priority === 'Critical' && 'border-red-500 text-red-700',
                                                                milestone.priority === 'High' && 'border-orange-500 text-orange-700',
                                                                milestone.priority === 'Medium' && 'border-gray-500 text-gray-700' // Assuming default
                                                            )}
                                                        >
                                                            {milestone.priority}
                                                        </Badge>
                                                    </TableCell> {/* Chip */}
                                                    <TableCell>
                                                        <Progress
                                                            value={milestone.status === 'Completed' ? 100 : milestone.status === 'In Progress' ? 50 : 0}
                                                            className={cn(
                                                                "h-1.5 rounded-full w-24", // Converted sx={{ height: 6, borderRadius: 3, width: 100 }}
                                                                milestone.status === 'Completed' ? 'bg-green-500' : 'bg-primary' // Converted color
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            title={milestone.status === 'Completed' ? "Mark as In Progress" : "Mark as Completed"}
                                                            aria-label={milestone.status === 'Completed' ? "Mark as In Progress" : "Mark as Completed"}
                                                            onClick={() => {
                                                            // Edit milestone functionality
                                                            const updatedStatus = milestone.status === 'Completed' ? 'In Progress' : 'Completed';
                                                            const updatedMilestones = (project.milestones || []).map(m =>
                                                                m.id === milestone.id
                                                                    ? { ...m, status: updatedStatus as 'Planned' | 'In Progress' | 'Completed' | 'Missed', completedDate: updatedStatus === 'Completed' ? new Date().toISOString().split('T')[0] : m.completedDate }
                                                                    : m
                                                            );
                                                            onProjectUpdate({
                                                                ...project,
                                                                milestones: updatedMilestones
                                                            });
                                                        }}>
                                                            {milestone.status === 'Completed' ? <CheckCircle size={16} className="text-emerald-500" /> : <Edit2 size={16} />}
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="text-red-500" 
                                                            title="Delete Milestone"
                                                            aria-label="Delete Milestone"
                                                            onClick={() => {
                                                            // Delete milestone functionality
                                                            if (window.confirm('Are you sure you want to delete this milestone?')) {
                                                                const updatedMilestones = (project.milestones || []).filter(m => m.id !== milestone.id);
                                                                onProjectUpdate({
                                                                    ...project,
                                                                    milestones: updatedMilestones
                                                                });
                                                            }
                                                        }}>
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                                {(project.milestones || []).length === 0 && (
                                    <div className="text-center py-4"> {/* Box */}
                                        <Flag size={48} className="text-gray-300" /> {/* color */}
                                        <h3 className="text-lg text-muted-foreground mt-2">No Milestones Defined</h3> {/* Typography */}
                                        <p className="text-sm text-muted-foreground mt-1">Add milestones to track important project events and achievements</p> {/* Typography */}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <div ref={ganttContainerRef} className="flex-1 overflow-auto bg-background rounded-xl border border-border relative user-select-none"> {/* Box */}
                <div className="sticky left-0 w-[250px] z-10 bg-background border-r border-border"> {/* Box */}
                    <div className="h-[70px] flex items-center px-2 border-b border-border bg-accent"> {/* Box */}
                        <span className="text-xs font-bold text-muted-foreground">TASK NAME</span> {/* Typography */}
                    </div>
                    {filteredTasks.map((task, i) => (
                        <div key={task.id} className="h-[48px] flex items-center px-2 border-b border-border hover:bg-accent cursor-pointer" onClick={() => handleOpenModal(task)}> {/* Box */}
                            <div className="flex items-center gap-1 overflow-hidden"> {/* Box */}
                                <span className="text-xs text-muted-foreground font-bold min-w-[20px]">{i + 1}</span> {/* Typography */}
                                <span className={cn("font-bold", task.isCritical ? 'text-red-500' : 'text-primary') + " truncate flex-1"}>{task.name}</span> {/* Typography */}
                                {taskRFIMap[task.id] && <TooltipProvider><Tooltip><TooltipTrigger asChild><div><FileCheck size={12} className="text-amber-500 shrink-0" /></div></TooltipTrigger><TooltipContent>{taskRFIMap[task.id].length} Linked RFIs</TooltipContent></Tooltip></TooltipProvider>} {/* Tooltip */}
                            </div>
                        </div>
                    ))}
                    {canEdit && (
                        <Button
                            className="h-[48px] px-2 border-b border-border cursor-pointer text-primary transition-all duration-200 w-full justify-start hover:bg-primary/10"
                            onClick={() => handleOpenModal()}
                        >
                            <Plus size={16} className="stroke-3" />
                            <span className="font-extrabold tracking-wider ml-1">NEW ACTIVITY</span> {/* Typography */}
                        </Button>
                    )}
                </div>
                <div className="absolute top-0 left-[250px] w-full min-h-full"> {/* Box */}
                    <div className="h-[70px] bg-accent border-b border-border sticky top-0 z-10"> {/* Box */}
                        <svg width={daysCount * dayWidth} height={HEADER_HEIGHT}>
                            {dateScale.map((date, i) => {
                                const isFirstOfMonth = date.getDate() === 1;
                                const x = i * dayWidth;
                                return (
                                    <g key={i}>
                                        <line x1={x} y1={0} x2={x} y2={HEADER_HEIGHT + canvasHeight} stroke={themeColors.divider} strokeWidth={1} />
                                        {dayWidth > 20 && <text x={x + (dayWidth/2)} y={55} textAnchor="middle" fontSize="10" fontWeight="bold" fill={themeColors.text.secondary}>{date.getDate()}</text>}
                                        {(isFirstOfMonth || (i === 0)) && <text x={x + 5} y={25} fontWeight="900" fontSize="11" fill={themeColors.text.secondary}>{date.toLocaleString('default', { month: 'short' }).toUpperCase()} {date.getFullYear()}</text>}
                                    </g>
                                );
                            })}
                        </svg>
                    </div>
                    <div className="relative"> {/* Box */}
                        <svg width={daysCount * dayWidth} height={canvasHeight}>
                            <defs>
                                <pattern id="progress-pattern" patternUnits="userSpaceOnUse" width="8" height="8">
                                    <path d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4" stroke={themeColors.primary.dark} strokeWidth="2"/>
                                </pattern>
                            </defs>
                            <line x1={getXFromDate(new Date().toISOString().split('T')[0])} y1={0} x2={getXFromDate(new Date().toISOString().split('T')[0])} y2={canvasHeight} stroke={themeColors.error.main} strokeWidth={1} strokeDasharray="4 2" />
                            {filteredTasks.map((task, i) => {
                                const x = getXFromDate(task.startDate);
                                const width = Math.max(dayWidth, getXFromDate(task.endDate) - x + dayWidth);
                                const y = i * ROW_HEIGHT + (ROW_HEIGHT / 2.5);
                                const h = ROW_HEIGHT / 2;
                                const barColor = task.isCritical ? themeColors.error.main : themeColors.primary.main;
                                const barLight = task.isCritical ? cn('bg-red-100') : cn('bg-blue-100'); // alpha(theme.palette.error.main, 0.2)
                                const rfiCount = taskRFIMap[task.id]?.length || 0;
                                return (
                                    <g key={task.id} className={cn("gantt-bar-group", canEdit ? 'cursor-grab' : 'cursor-default')} onMouseDown={(e) => onMouseDown(e, task.id, 'MOVE')}>
                                        <line x1={0} y1={(i+1)*ROW_HEIGHT} x2={daysCount*dayWidth} y2={(i+1)*ROW_HEIGHT} stroke={themeColors.divider} strokeWidth={1} />
                                        <rect x={x} y={y} width={width} height={h} rx={6} fill={barLight} />
                                        <rect x={x} y={y} width={(width * task.progress) / 100} height={h} rx={6} fill={barColor} />
                                        
                                        <rect x={x} y={y} width={width} height={h} rx={6} fill={`url(#progress-pattern)`} opacity={0.1} className="pointer-events-none"/ >

                                        <rect x={x} y={y} width={10} height={h} fill="transparent" className="cursor-col-resize" onMouseDown={(e) => onMouseDown(e, task.id, 'RESIZE_START')} />
                                        <rect x={x + width - 10} y={y} width={10} height={h} fill="transparent" className="cursor-col-resize" onMouseDown={(e) => onMouseDown(e, task.id, 'RESIZE_END')} />
                                        
                                        {rfiCount > 0 && zoomLevel !== 'MONTH' && <g transform={`translate(${x + 4}, ${y + (h / 2) - 6})`}><rect width="12" height="12" rx="2" fill={themeColors.warning.main} /><text x="6" y="9" textAnchor="middle" fontSize="8" fontWeight="black" fill="white">{rfiCount}</text></g>}
                                        
                                        {zoomLevel !== 'MONTH' && (
                                            <foreignObject x={x + width + 8} y={y-2} width={100} height={ROW_HEIGHT}>
                                                <div className="flex gap-1 items-center h-full"> {/* Stack */}
                                                  {/* Replaced AvatarGroup and Avatars - consider using Shadcn Avatar with manual grouping if needed */}
                                                  <span className="text-xs font-bold text-muted-foreground">{task.progress}%</span> {/* Typography */}
                                                </div>
                                            </foreignObject>
                                        )}
                                    </g>
                                );
                            })}
                            {canEdit && <line x1={0} y1={canvasHeight} x2={daysCount*dayWidth} y2={canvasHeight} stroke={themeColors.divider} strokeWidth={1} />}
                        </svg>
                    </div>
                </div>
            </div>
        )}

        <Dialog open={isModalOpen} onOpenChange={() => setIsModalOpen(false)}> {/* Replaced maxWidth, fullWidth, PaperProps */}
            <DialogContent className="max-w-md"> {/* Replaced sx */}
                <DialogHeader>
                    <DialogTitle className="font-bold">{editingTask.id ? 'Edit Activity' : 'New Activity'}</DialogTitle>
                </DialogHeader>
                <Tabs value={dependencyTab} onValueChange={(v) => setDependencyTab(v)} className="mb-3"> {/* Converted sx */}
                    <TabsList>
                        <TabsTrigger value="0">Basic</TabsTrigger>
                        <TabsTrigger value="1">Dependencies</TabsTrigger>
                        <TabsTrigger value="2">BOQ Linkage</TabsTrigger>
                        <TabsTrigger value="3">Resources</TabsTrigger>
                    </TabsList>
                </Tabs>
                
                {dependencyTab === "0" && (
                    <div className="flex flex-col gap-3"> {/* Stack */}
                        <Label htmlFor="task-name">Name</Label>
                        <Input id="task-name" value={editingTask.name || ''} onChange={e => setEditingTask({...editingTask, name: e.target.value})} /> {/* TextField */}
                        <div className="grid grid-cols-2 gap-2"> {/* Grid container */}
                            <div> {/* Grid item */}
                                <Label htmlFor="start-date">Start Date</Label>
                                <Input id="start-date" type="date" value={editingTask.startDate || ''} onChange={e => setEditingTask({...editingTask, startDate: e.target.value})} /> {/* TextField */}
                            </div>
                            <div> {/* Grid item */}
                                <Label htmlFor="end-date">End Date</Label>
                                <Input id="end-date" type="date" value={editingTask.endDate || ''} onChange={e => setEditingTask({...editingTask, endDate: e.target.value})} /> {/* TextField */}
                            </div>
                        </div>
                        <div className="flex flex-col"> {/* Box */}
                          <Label>Progress ({editingTask.progress || 0}%)</Label> {/* Typography */}
                          <Slider value={[editingTask.progress || 0]} onValueChange={(v) => setEditingTask({...editingTask, progress: v[0]})} max={100} step={1} /> {/* Slider */}
                        </div>
                        <div className="flex items-center space-x-2"> {/* FormControlLabel */}
                          <Switch id="critical-path" checked={editingTask.isCritical || false} onCheckedChange={checked => setEditingTask({...editingTask, isCritical: checked})} />
                          <Label htmlFor="critical-path">Critical Path</Label>
                        </div>
                        <Label htmlFor="status">Status</Label> {/* InputLabel */}
                        <Select value={editingTask.status || 'On Track'} onValueChange={value => setEditingTask({...editingTask, status: value as any})}> {/* FormControl, Select */}
                            <SelectTrigger id="status">
                                <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Not Started">Not Started</SelectItem>
                                <SelectItem value="On Track">On Track</SelectItem>
                                <SelectItem value="Delayed">Delayed</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
                
                {dependencyTab === "1" && (
                    <div className="flex flex-col gap-3"> {/* Stack */}
                        <h4 className="text-lg font-bold">Task Dependencies</h4> {/* Typography */}
                        <p className="text-sm text-muted-foreground mb-2">Define predecessor relationships with other tasks</p> {/* Typography */}
                        
                        {(editingTask.dependencies || []).map((dep, index) => {
                            const predecessorTask = project.schedule.find(t => t.id === dep.taskId);
                            return (
                                <div key={index} className="border p-2 rounded-lg"> {/* Paper */}
                                    <div className="flex justify-between items-center mb-1"> {/* Box */}
                                        <h5 className="text-base font-bold">Dependency {index + 1}</h5> {/* Typography */}
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="text-red-500" 
                                            title="Delete Dependency"
                                            aria-label="Delete Dependency"
                                            onClick={() => { {/* IconButton */}
                                            const updatedDeps = [...(editingTask.dependencies || [])];
                                            updatedDeps.splice(index, 1);
                                            setEditingTask({...editingTask, dependencies: updatedDeps});
                                        }}>
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2"> {/* Grid container */}
                                        <div className="col-span-2"> {/* Grid item */}
                                            <Label htmlFor={`predecessor-task-${index}`}>Predecessor Task</Label> {/* InputLabel */}
                                            <Select 
                                                value={dep.taskId || ''}
                                                onValueChange={(value) => {
                                                    const updatedDeps = [...(editingTask.dependencies || [])];
                                                    updatedDeps[index] = { ...updatedDeps[index], taskId: value };
                                                    setEditingTask({...editingTask, dependencies: updatedDeps});
                                                }}
                                            > {/* FormControl, Select */}
                                                <SelectTrigger id={`predecessor-task-${index}`}>
                                                    <SelectValue placeholder="Select Predecessor Task" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {project.schedule.filter(t => t.id !== editingTask.id).map(task => (
                                                        <SelectItem key={task.id} value={task.id}>{task.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-1"> {/* Grid item */}
                                            <Label htmlFor={`dependency-type-${index}`}>Type</Label> {/* InputLabel */}
                                            <Select 
                                                value={dep.type || 'FS'}
                                                onValueChange={(value) => {
                                                    const updatedDeps = [...(editingTask.dependencies || [])];
                                                    updatedDeps[index] = { ...updatedDeps[index], type: value as any };
                                                    setEditingTask({...editingTask, dependencies: updatedDeps});
                                                }}
                                            > {/* FormControl, Select */}
                                                <SelectTrigger id={`dependency-type-${index}`}>
                                                    <SelectValue placeholder="Select Type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="FS">Finish to Start (FS)</SelectItem> {/* MenuItem */}
                                                    <SelectItem value="SS">Start to Start (SS)</SelectItem>
                                                    <SelectItem value="FF">Finish to Finish (FF)</SelectItem>
                                                    <SelectItem value="SF">Start to Finish (SF)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-1"> {/* Grid item */}
                                            <Label htmlFor={`lag-days-${index}`}>Lag (days)</Label>
                                            <Input 
                                                id={`lag-days-${index}`}
                                                type="number" 
                                                value={dep.lag || 0}
                                                onChange={(e) => {
                                                    const updatedDeps = [...(editingTask.dependencies || [])];
                                                    updatedDeps[index] = { ...updatedDeps[index], lag: Number(e.target.value) };
                                                    setEditingTask({...editingTask, dependencies: updatedDeps});
                                                }}
                                            /> {/* TextField */}
                                        </div>
                                    </div>
                                    {predecessorTask && (
                                        <p className="text-xs text-muted-foreground mt-1"> {/* Typography */}
                                            Links: {predecessorTask.name} → {editingTask.name}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                        
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                const newDep: TaskDependency = { taskId: '', type: 'FS', lag: 0 };
                                setEditingTask({
                                    ...editingTask, 
                                    dependencies: [...(editingTask.dependencies || []), newDep]
                                });
                            }}
                        >
                            <Plus size={16} className="mr-2" /> Add Dependency
                        </Button>
                        
                        <Alert className="mt-2"> {/* Alert severity="info" sx={{ mt: 2 }} */}
                            <AlertTitle className="font-bold">Dependency Types:</AlertTitle> {/* Typography */}
                            <AlertDescription> {/* List dense sx={{ pl: 2 }} */}
                                <ul className="list-disc list-inside ml-2"> {/* Replaced List, ListItem, ListItemText */}
                                    <li>FS (Finish to Start): Current task starts after predecessor finishes</li>
                                    <li>SS (Start to Start): Current task starts after predecessor starts</li>
                                    <li>FF (Finish to Finish): Current task finishes after predecessor finishes</li>
                                    <li>SF (Start to Finish): Current task finishes after predecessor starts</li>
                                </ul>
                            </AlertDescription>
                        </Alert>
                    </div>
                )}
                
                {dependencyTab === "2" && (
                    <div className="flex flex-col gap-3"> {/* Stack */}
                        <h4 className="text-lg font-bold">BOQ Item Linkage</h4> {/* Typography */}
                        <p className="text-sm text-muted-foreground mb-2">Link this activity to Bill of Quantities items</p> {/* Typography */}
                        
                        <Label htmlFor="linked-boq-item">Linked BOQ Item</Label> {/* FormControl, InputLabel */}
                        <Select 
                            value={editingTask.boqItemId || 'none'}
                            onValueChange={(value) => setEditingTask({...editingTask, boqItemId: value === "none" ? "" : value})}
                        > {/* Select */}
                            <SelectTrigger id="linked-boq-item">
                                <SelectValue placeholder="No BOQ Item" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none"><em>No BOQ Item</em></SelectItem> {/* MenuItem */}
                                {project.boq.map(item => (
                                    <SelectItem key={item.id} value={item.id}>
                                        <div> {/* Box */}
                                            <p className="text-sm font-bold">[{item.itemNo}] {item.description.substring(0, 50)}{item.description.length > 50 ? '...' : ''}</p> {/* Typography */}
                                            <p className="text-xs text-muted-foreground">Rate: {formatCurrency(item.rate || 0, project.settings)} per {item.unit}</p> {/* Typography */}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        
                        {editingTask.boqItemId && (
                            <Alert className="mt-2"> {/* Alert severity="info" sx={{ mt: 2 }} */}
                                <AlertDescription> {/* Typography */}
                                    This activity is linked to BOQ item: 
                                    {project.boq.find(b => b.id === editingTask.boqItemId)?.itemNo} - 
                                    {project.boq.find(b => b.id === editingTask.boqItemId)?.description.substring(0, 60)}...
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                )}
                
                {dependencyTab === "3" && (
                    <div className="flex flex-col gap-3"> {/* Stack */}
                        <h4 className="text-lg font-bold">Resource Allocation</h4> {/* Typography */}
                        <p className="text-sm text-muted-foreground mb-2">Allocate resources to this activity</p> {/* Typography */}
                        
                        <div> {/* Box */}
                            <h5 className="text-base font-bold mb-1">Assigned Resources</h5> {/* Typography */}
                            <div className="border p-2 rounded-lg"> {/* Paper */}
                                <div className="flex flex-col gap-2"> {/* Stack */}
                                    {(project.resourceAllocations || [])
                                        .filter(alloc => alloc.allocatedTo === editingTask.id)
                                        .map(alloc => {
                                            const resource = (project.resources || []).find(r => r.id === alloc.resourceId);
                                            return (
                                                <div key={alloc.id} className="flex justify-between items-center p-1 border border-border rounded-md"> {/* Box */}
                                                    <div> {/* Box */}
                                                        <p className="text-sm font-bold">{resource?.name || 'Unknown Resource'}</p> {/* Typography */}
                                                        <p className="text-xs text-muted-foreground"> {/* Typography */}
                                                            Quantity: {alloc.allocatedQuantity} {resource?.unit} | Period: {alloc.startDate} to {alloc.endDate}
                                                        </p>
                                                    </div>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="text-red-500" 
                                                        title="Remove Resource Allocation"
                                                        aria-label="Remove Resource Allocation"
                                                        onClick={() => { {/* IconButton */}
                                                            const updatedAllocations = (project.resourceAllocations || []).filter(a => a.id !== alloc.id);
                                                            onProjectUpdate({ 
                                                                ...project, 
                                                                resourceAllocations: updatedAllocations 
                                                            });
                                                        }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            );
                                        })
                                    }
                                    
                                    {(project.resourceAllocations || []).filter(alloc => alloc.allocatedTo === editingTask.id).length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center py-2"> {/* Typography */}
                                            No resources allocated to this task
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div> {/* Box */}
                            <h5 className="text-base font-bold mb-1">Add New Resource</h5> {/* Typography */}
                            <div className="border p-2 rounded-lg"> {/* Paper */}
                                <div className="grid grid-cols-1 gap-2"> {/* Grid container */}
                                    <div className="col-span-1"> {/* Grid item */}
                                        <Label htmlFor="resource-select">Resource</Label> {/* FormControl, InputLabel */}
                                        <Select 
                                            value={selectedResource}
                                            onValueChange={(value) => setSelectedResource(value as string)}
                                        > {/* Select */}
                                            <SelectTrigger id="resource-select">
                                                <SelectValue placeholder="Select Resource" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(project.resources || []).filter(r => r.totalQuantity > 0).map(resource => ( // Changed availableQuantity to totalQuantity for selection
                                                    <SelectItem key={resource.id} value={resource.id}>
                                                        <div> {/* Box */}
                                                            <p className="text-sm font-bold">{resource.name}</p> {/* Typography */}
                                                            <p className="text-xs text-muted-foreground"> {/* Typography */}
                                                                Available: {resource.totalQuantity - (project.resourceAllocations?.filter(ra => ra.resourceId === resource.id).reduce((sum, ra) => sum + ra.allocatedQuantity, 0) || 0)} {resource.unit} | Cost: {getCurrencySymbol(project.settings?.currency || 'USD')} {resource.unitCost?.toLocaleString()}/{resource.unit}
                                                            </p>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="col-span-1"> {/* Grid item */}
                                        <Label htmlFor="resource-quantity">Quantity</Label>
                                        <Input 
                                            id="resource-quantity"
                                            type="number" 
                                            value={resourceQuantity}
                                            onChange={(e) => setResourceQuantity(Number(e.target.value))}
                                            min={0}
                                        /> {/* TextField */}
                                    </div>
                                    <div className="col-span-1"> {/* Grid item */}
                                        <Label htmlFor="resource-start-date">Start Date</Label>
                                        <Input 
                                            id="resource-start-date"
                                            type="date" 
                                            value={resourceStartDate}
                                            onChange={(e) => setResourceStartDate(e.target.value)}
                                        /> {/* TextField */}
                                    </div>
                                    <div className="col-span-1"> {/* Grid item */}
                                        <Label htmlFor="resource-end-date">End Date</Label>
                                        <Input 
                                            id="resource-end-date"
                                            type="date" 
                                            value={resourceEndDate}
                                            onChange={(e) => setResourceEndDate(e.target.value)}
                                        /> {/* TextField */}
                                    </div>
                                    <div className="col-span-2"> {/* Grid item */}
                                        <Label htmlFor="resource-notes">Notes</Label>
                                        <Input 
                                            id="resource-notes"
                                            value={resourceNotes}
                                            onChange={(e) => setResourceNotes(e.target.value)}
                                        /> {/* TextField */}
                                    </div>
                                </div>
                                
                                <Button
                                    className="mt-2 w-full"
                                    disabled={!selectedResource || resourceQuantity <= 0 || !resourceStartDate || !resourceEndDate}
                                    onClick={() => {
                                        if (editingTask.id) {
                                            const newAllocation: ResourceAllocation = {
                                                id: `alloc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                                resourceId: selectedResource,
                                                resourceType: (project.resources || []).find(r => r.id === selectedResource)?.type || 'Material',
                                                allocatedTo: editingTask.id!, // Use the task ID
                                                allocatedQuantity: resourceQuantity,
                                                startDate: resourceStartDate,
                                                endDate: resourceEndDate,
                                                status: 'Planned',
                                                notes: resourceNotes
                                            };
                                            
                                            const updatedAllocations = [...(project.resourceAllocations || []), newAllocation];
                                            onProjectUpdate({ 
                                                ...project, 
                                                resourceAllocations: updatedAllocations 
                                            });
                                            
                                            // Reset form
                                            setSelectedResource('');
                                            setResourceQuantity(0);
                                            setResourceStartDate('');
                                            setResourceEndDate('');
                                            setResourceNotes('');
                                        }
                                    }}
                                >
                                    <Plus size={16} className="mr-2" /> Allocate Resource
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
            <DialogFooter className="p-3"> {/* DialogActions sx={{ p: 3 }} */}
                <Button variant="outline" onClick={() => {setIsModalOpen(false); setEditingTask({}); setDependencyTab("0");}}>Cancel</Button> {/* Button */}
                <Button onClick={handleSave}> {/* Button variant="contained" color="primary" */}
                    <Save size={18} className="mr-2"/> Save Activity
                </Button>
            </DialogFooter>
        </Dialog>
    </div>
  );
};

export default ScheduleModule;

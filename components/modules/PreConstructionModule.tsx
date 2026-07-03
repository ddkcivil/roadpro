
import React, { useState, useRef, useMemo } from 'react';
import { 
    Plus, Calendar, Target, Trash2, AlertTriangle, 
    CheckCircle2, X, Search, Filter, Edit2, 
    ChevronDown, ChevronUp, CheckSquare, Square
} from 'lucide-react';
import { Project, PreConstructionTask } from '../../types';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Progress } from '~/components/ui/progress';
import { toast } from 'sonner';
import { Badge } from '~/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Textarea } from '~/components/ui/textarea';

// Import the history hook
import { useHistoryAutoFill } from '~/lib/historyUtils';

// Import dedup utility
import { hasDuplicate } from '~/utils/validation/dedupUtils';

// Filter and sort types
type FilterStatus = 'all' | 'Not Done' | 'Pending' | 'In Progress' | 'Completed';
type SortField = 'category' | 'description' | 'estEndDate' | 'progress' | 'status';
type SortOrder = 'asc' | 'desc';

interface Props {
  project: Project;
  onProjectUpdate: (project: Project) => void;
}

const PreConstructionModule: React.FC<Props> = ({ project, onProjectUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTaskForTrack, setSelectedTaskForTrack] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<PreConstructionTask | null>(null);
  
  // Filter, sort, and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortField, setSortField] = useState<SortField>('estEndDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Forms
  const [newTask, setNewTask] = useState<Partial<PreConstructionTask>>({
    category: 'Survey',
    status: 'Not Done',
    description: '',
    documentation: '',
    remarks: '',
    requirements: '',
    responsibleParty: '',
    estStartDate: '',
    estEndDate: '',
    progress: 0
  });

  const [trackForm, setTrackForm] = useState({
      date: new Date().toISOString().split('T')[0],
      progressAdded: 0,
      description: ''
  });

  const [editForm, setEditForm] = useState<Partial<PreConstructionTask>>({});

  // History auto-fill hooks
  const descriptionHistory = useHistoryAutoFill('preConstructionDescriptions');
  const remarksHistory = useHistoryAutoFill('preConstructionRemarks');

  // --- Filtered and Sorted Tasks ---
  const filteredAndSortedTasks = useMemo(() => {
    let tasks = [...project.preConstruction];
    
    // Filter by status
    if (filterStatus !== 'all') {
      tasks = tasks.filter(t => t.status === filterStatus);
    }
    
    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      tasks = tasks.filter(t => 
        t.description.toLowerCase().includes(term) ||
        t.category.toLowerCase().includes(term) ||
        t.remarks?.toLowerCase().includes(term)
      );
    }
    
    // Sort
    tasks.sort((a, b) => {
      let aVal: any = a[sortField] || '';
      let bVal: any = b[sortField] || '';
      
      // Handle dates
      if (sortField === 'estEndDate') {
        aVal = a.estEndDate ? new Date(a.estEndDate).getTime() : 0;
        bVal = b.estEndDate ? new Date(b.estEndDate).getTime() : 0;
      }
      
      // Handle numbers
      if (sortField === 'progress') {
        aVal = a.progress || 0;
        bVal = b.progress || 0;
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return tasks;
  }, [project.preConstruction, filterStatus, searchTerm, sortField, sortOrder]);

  // --- Handlers for New Task Modal Inputs ---
  const handleNewDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewTask({...newTask, description: value});
    descriptionHistory.updateSuggestions(value);
  };

  const handleNewRemarksChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewTask({...newTask, remarks: value});
  };

  // --- Handlers for Track Progress Modal Inputs ---
  const handleTrackDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTrackForm({...trackForm, description: value});
  };

  // --- Edit Form Handlers ---
  const handleEditTask = (task: PreConstructionTask) => {
    setEditingTask(task);
    setEditForm({ ...task });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    // Check for duplicate description (excluding current task)
    const isDuplicate = editForm.description && hasDuplicate(project.preConstruction, 'description', editForm.description, editingTask.id);
    if (isDuplicate) {
        toast.error("Duplicate: An activity with this description already exists.");
        return;
    }

    const updated = project.preConstruction.map(t => 
      t.id === editingTask.id ? { ...t, ...editForm } : t
    );

    onProjectUpdate({ ...project, preConstruction: updated as any });
    setIsEditModalOpen(false);
    setEditingTask(null);
    toast.success("Activity updated successfully");
  };

  // --- Logic ---
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Date validation - prevent past dates
    const today = new Date().toISOString().split('T')[0];
    if (newTask.estStartDate && newTask.estStartDate < today) {
        toast.error("Start date cannot be in the past");
        return;
    }
    if (newTask.estEndDate && newTask.estEndDate < today) {
        toast.error("End date cannot be in the past");
        return;
    }
    if (newTask.estStartDate && newTask.estEndDate && newTask.estStartDate > newTask.estEndDate) {
        toast.error("Start date must be before end date");
        return;
    }
    
    // Check for duplicate description before saving
    const isDuplicate = newTask.description && hasDuplicate(project.preConstruction, 'description', newTask.description);
    if (isDuplicate) {
        toast.error("Duplicate: An activity with this description already exists.");
        return;
    }

    // Save histories if they were interacted with
    if (newTask.description) descriptionHistory.saveEntry(newTask.description);
    if (newTask.remarks) remarksHistory.saveEntry(newTask.remarks);

    const task: PreConstructionTask = {
        id: `pre-${Date.now()}`,
        category: newTask.category as any,
        description: newTask.description || '',
        documentation: newTask.documentation,
        status: newTask.status as any,
        targetDate: newTask.estEndDate || '',
        estStartDate: newTask.estStartDate,
        estEndDate: newTask.estEndDate,
        progress: 0,
        remarks: newTask.remarks || '',
        requirements: newTask.requirements,
        responsibleParty: newTask.responsibleParty,
        logs: []
    };
    onProjectUpdate({
        ...project,
        preConstruction: [...project.preConstruction, task]
    });
    setIsModalOpen(false);
    setNewTask({ category: 'Survey', status: 'Not Done', description: '', documentation: '', remarks: '', requirements: '', responsibleParty: '', estStartDate: '', estEndDate: '', progress: 0 });
  };

  const handleDeleteTask = (id: string) => {
      if (window.confirm("Are you sure you want to delete this activity? This action cannot be undone.")) {
          onProjectUpdate({
              ...project,
              preConstruction: project.preConstruction.filter(t => t.id !== id)
          });
          setSelectedTasks(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
      }
  };

  const handleBulkDelete = () => {
    if (selectedTasks.size === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedTasks.size} selected activity(s)? This action cannot be undone.`)) {
        onProjectUpdate({
            ...project,
            preConstruction: project.preConstruction.filter(t => !selectedTasks.has(t.id))
        });
        setSelectedTasks(new Set());
        toast.success(`${selectedTasks.size} activities deleted`);
    }
  };

  const handleTrackSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedTaskForTrack) return;
      
      const updated = project.preConstruction.map(t => {
          if (t.id === selectedTaskForTrack) {
              const newProgress = Math.min(100, (t.progress || 0) + Number(trackForm.progressAdded));
              const newLog = {
                  date: trackForm.date,
                  progressAdded: Number(trackForm.progressAdded),
                  description: trackForm.description
              };
              const newStatus = newProgress === 100 ? 'Completed' : newProgress > 0 ? 'In Progress' : t.status;
              return { ...t, progress: newProgress, status: newStatus, logs: [...(t.logs || []), newLog] };
          }
          return t;
      });

      onProjectUpdate({ ...project, preConstruction: updated as any });
      setIsTrackModalOpen(false);
      setTrackForm({ date: new Date().toISOString().split('T')[0], progressAdded: 0, description: '' });
      if (trackForm.description) descriptionHistory.saveEntry(trackForm.description);
  };

  // Toggle task selection for bulk operations
  const toggleTaskSelection = (id: string) => {
    setSelectedTasks(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTasks.size === filteredAndSortedTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredAndSortedTasks.map(t => t.id)));
    }
  };

  const getStatusVariant = (status: string) => {
      switch(status) {
          case 'Completed': return 'success';
          case 'In Progress': return 'default';
          case 'Not Done': return 'destructive';
          default: return 'secondary';
      }
  };

  const today = new Date().toISOString().split('T')[0];
  const dueTasks = project.preConstruction.filter(t => t.status !== 'Completed' && t.estEndDate && t.estEndDate <= today);

  // --- Auto-complete suggestion rendering helper ---
  const renderSuggestions = (
    historyHook: ReturnType<typeof useHistoryAutoFill>, 
    inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>, // Ref to the input/textarea element
    onChange: (value: string) => void, // Handler to update component state
  ) => {
    const handleSuggestionClick = (suggestion: string) => {
      onChange(suggestion); // Update component state
      historyHook.updateSuggestions(''); // Clear suggestions after selection
      inputRef.current?.focus(); // Keep focus on the input
    };

    // Ensure ref is current and accessible
    if (!inputRef.current) return null;

    return (
      <>
        {historyHook.suggestions.length > 0 && historyHook.searchTerm && (
          <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg max-h-60 overflow-auto border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            {historyHook.suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="cursor-pointer px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  // Refs for input/textarea elements
  const newTaskDescriptionRef = useRef<HTMLInputElement>(null);
  const newTaskRemarksRef = useRef<HTMLTextAreaElement>(null);
  const trackTaskDescriptionRef = useRef<HTMLInputElement>(null);

return (
    <div className="space-y-6">
       
       {/* Header with Notification */}
       <div className="flex justify-between mb-4 items-center">
        <div>
          <p className="text-xs font-bold text-primary tracking-widest uppercase">PRE-CONSTRUCTION</p>
          <h1 className="text-3xl font-black text-foreground">Pre-Construction Activities</h1>
          <p className="text-sm text-muted-foreground">Land Acquisition, Clearances, and Surveys</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Activity</Button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Search activities..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
            />
        </div>
        <Button 
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
        >
            <Filter className="mr-2 h-4 w-4" /> Filters
        </Button>
        {selectedTasks.size > 0 && (
            <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete ({selectedTasks.size})
            </Button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="flex flex-wrap gap-4 p-4 bg-muted/30 rounded-lg mb-4">
            <div className="flex gap-2 items-center">
                <Label className="text-sm">Status:</Label>
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="Not Done">Not Done</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex gap-2 items-center">
                <Label className="text-sm">Sort by:</Label>
                <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="category">Category</SelectItem>
                        <SelectItem value="description">Description</SelectItem>
                        <SelectItem value="estEndDate">End Date</SelectItem>
                        <SelectItem value="progress">Progress</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                {sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <div className="text-sm text-muted-foreground flex items-center">
                {filteredAndSortedTasks.length} of {project.preConstruction.length} tasks
            </div>
        </div>
      )}

      {/* Daily Notification Banner */}
      {dueTasks.length > 0 && (
          <Alert variant="default">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Action Required: {dueTasks.length} Tasks Due or Overdue</AlertTitle>
              <AlertDescription>
                  <ul className="list-disc list-inside mt-1">
                      {dueTasks.map(t => (
                          <li key={t.id}>{t.description} (Due: {t.estEndDate})</li>
                      ))}
                  </ul>
              </AlertDescription>
          </Alert>
      )}

      {/* Task Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedTasks.map(task => (
              <Card key={task.id} className={`flex flex-col ${selectedTasks.has(task.id) ? 'ring-2 ring-primary' : ''}`}>
                  <CardContent className="flex-1 p-6">
                      <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5"
                                onClick={() => toggleTaskSelection(task.id)}
                            >
                                {selectedTasks.has(task.id) ? 
                                    <CheckSquare className="h-4 w-4" /> : 
                                    <Square className="h-4 w-4" />
                                }
                            </Button>
                            <Badge variant={getStatusVariant(task.status || 'Pending')}>{task.status}</Badge>
                          </div>
<div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditTask(task)} title="Edit Activity">
                                <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task.id)} title="Delete Activity">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                      </div>
                      
                      <p className="text-xs font-bold text-muted-foreground uppercase mb-1">
                          {task.category}
                      </p>
                      <h3 className="text-lg font-bold mb-3">
                          {task.description}
                      </h3>
                      
                      <div className="mb-4">
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-4 w-4" /> Est: {task.estStartDate || 'N/A'} → {task.estEndDate || 'N/A'}
                          </p>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mb-4">
                          <div className="flex justify-between mb-1">
                              <p className="text-sm text-muted-foreground">Progress</p>
                              <p className="text-sm font-bold">{task.progress || 0}%</p>
                          </div>
                          <Progress value={task.progress || 0} />
                      </div>

                      {task.remarks && (
                        <div className="p-2 bg-muted rounded-md text-sm italic text-muted-foreground">
                            "{task.remarks}"
                        </div>
                      )}
                  </CardContent>
                  
                  <div className="p-4 border-t flex gap-2">
                      <Button 
                         className="flex-1"
                         variant="outline"
                         onClick={() => { setSelectedTaskForTrack(task.id); setIsTrackModalOpen(true); }}
                      >
                          <Target className="mr-2 h-4 w-4" /> Track
                      </Button>
                      <Button 
                         variant="outline"
                         size="sm"
                         onClick={() => { setSelectedTaskForTrack(task.id); setIsTrackModalOpen(true); }}
                      >
                          {task.logs?.length || 0} logs
                      </Button>
                  </div>
              </Card>
          ))}
          {filteredAndSortedTasks.length === 0 && (
              <div className="lg:col-span-3">
                  <Card className="p-12 text-center border-dashed">
                      <p className="text-muted-foreground italic">
                          {project.preConstruction.length === 0 
                            ? "No pre-construction activities logged." 
                            : "No activities match your filters."}
                      </p>
                  </Card>
              </div>
          )}
      </div>

       {/* Add Activity Modal */}
       <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                  <DialogTitle className="flex items-center text-lg font-bold text-primary">
                      <Plus className="mr-2 h-5 w-5" /> Add Pre-Construction Activity
                  </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddTask} className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                     value={newTask.category}
                     onValueChange={value => setNewTask({...newTask, category: value as any})}
                  >
                      <SelectTrigger id="category">
                          <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Survey">Survey</SelectItem>
                          <SelectItem value="Land Acquisition">Land Acquisition</SelectItem>
                          <SelectItem value="Forest Clearance">Forest Clearance</SelectItem>
                          <SelectItem value="Utility Shifting">Utility Shifting</SelectItem>
                          <SelectItem value="Design">Design</SelectItem>
                          <SelectItem value="Environmental Clearance">Environmental Clearance</SelectItem>
                          <SelectItem value="Social Impact Assessment">Social Impact Assessment</SelectItem>
                          <SelectItem value="Financial Closure">Financial Closure</SelectItem>
                      </SelectContent>
                  </Select>
                </div>
                
                {/* Description Input with History */}
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <div className="relative">
                    <Input 
                      id="description" required 
                      placeholder="e.g. Joint Verification"
                      value={newTask.description} 
                      onChange={handleNewDescriptionChange}
                      onBlur={() => newTask.description && descriptionHistory.saveEntry(newTask.description)} // Save on blur
                      ref={newTaskDescriptionRef}
                    />
                    {renderSuggestions(descriptionHistory, newTaskDescriptionRef, (value) => setNewTask({...newTask, description: value}))}
                  </div>
                </div>

                {/* Documentation Field */}
                <div className="grid gap-2">
                  <Label htmlFor="documentation">Documentation</Label>
                  <Textarea 
                    id="documentation" 
                    placeholder="Reference documents, permits, or related files"
                    value={newTask.documentation || ''} 
                    onChange={(e) => setNewTask({...newTask, documentation: e.target.value})}
                    className="min-h-[80px]"
                  />
                </div>

                {/* Requirements Field */}
                <div className="grid gap-2">
                  <Label htmlFor="requirements">Requirements</Label>
                  <Textarea 
                    id="requirements" 
                    placeholder="List specific requirements for this activity"
                    value={newTask.requirements || ''} 
                    onChange={(e) => setNewTask({...newTask, requirements: e.target.value})}
                    className="min-h-[80px]"
                  />
                </div>

                {/* Responsible Party Field */}
                <div className="grid gap-2">
                  <Label htmlFor="responsibleParty">Responsible Party</Label>
                  <Input 
                    id="responsibleParty" 
                    placeholder="e.g. Site Engineer, Consultant"
                    value={newTask.responsibleParty || ''} 
                    onChange={(e) => setNewTask({...newTask, responsibleParty: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="est-start">Est. Start</Label>
                        <Input 
                            id="est-start" required type="date" 
                            value={newTask.estStartDate} onChange={e => setNewTask({...newTask, estStartDate: e.target.value})}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="est-end">Est. End</Label>
                        <Input 
                            id="est-end" required type="date" 
                            value={newTask.estEndDate} onChange={e => setNewTask({...newTask, estEndDate: e.target.value})}
                        />
                    </div>
                </div>

                {/* Status Field */}
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                     value={newTask.status}
                     onValueChange={value => setNewTask({...newTask, status: value as any})}
                  >
                      <SelectTrigger id="status">
                          <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Not Done">Not Done</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                  </Select>
                </div>
                 
                {/* Remarks Textarea with History */}
                <div className="grid gap-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <div className="relative">
                    <Textarea 
                      id="remarks" 
                      value={newTask.remarks} 
                      onChange={handleNewRemarksChange}
                      onBlur={() => newTask.remarks && remarksHistory.saveEntry(newTask.remarks)} // Save on blur
                      ref={newTaskRemarksRef}
                      className="min-h-[100px]"
                    />
                    {renderSuggestions(remarksHistory, newTaskRemarksRef, (value) => setNewTask({...newTask, remarks: value}))}
                  </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsModalOpen(false)}><X className="mr-2 h-4 w-4" />Cancel</Button>
                    <Button type="submit"><CheckCircle2 className="mr-2 h-4 w-4" />Add Activity</Button>
                </DialogFooter>
              </form>
          </DialogContent>
       </Dialog>

      {/* Track Progress Modal */}
      <Dialog open={isTrackModalOpen} onOpenChange={setIsTrackModalOpen}>
         <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle className="flex items-center text-lg font-bold text-primary">
                    <Target className="mr-2 h-5 w-5" /> Track Daily Progress
                </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleTrackSubmit} className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="track-date">Date</Label>
                    <Input 
                        id="track-date" type="date" required 
                        value={trackForm.date} onChange={e => setTrackForm({...trackForm, date: e.target.value})}
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="progress-added">Progress Added (%)</Label>
                    <Input 
                        id="progress-added" type="number" required 
                        value={trackForm.progressAdded} onChange={e => setTrackForm({...trackForm, progressAdded: Number(e.target.value)})} 
                    />
                    <p className="text-sm text-muted-foreground">Enter incremental percentage completed today.</p>
                </div>
                
                {/* Description Input with History */}
                <div className="grid gap-2">
                    <Label htmlFor="track-description">Description / Activity</Label>
                    <div className="relative">
                        <Input 
                            id="track-description" required 
                            placeholder="e.g. Field work done" 
                            value={trackForm.description} 
                            onChange={handleTrackDescriptionChange} 
                            onBlur={() => trackForm.description && descriptionHistory.saveEntry(trackForm.description)} // Save on blur
                            ref={trackTaskDescriptionRef}
                        />
                        {renderSuggestions(descriptionHistory, trackTaskDescriptionRef, (value) => setTrackForm({...trackForm, description: value}))}
                    </div>
                </div>
                
<DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsTrackModalOpen(false)}><X className="mr-2 h-4 w-4" />Cancel</Button>
                    <Button type="submit"><CheckCircle2 className="mr-2 h-4 w-4" />Update Progress</Button>
                </DialogFooter>
            </form>
         </DialogContent>
      </Dialog>

      {/* Edit Activity Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                  <DialogTitle className="flex items-center text-lg font-bold text-primary">
                      <Edit2 className="mr-2 h-5 w-5" /> Edit Pre-Construction Activity
                  </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditSubmit} className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-category">Category</Label>
                  <Select 
                     value={editForm.category as string || 'Survey'}
                     onValueChange={value => setEditForm({...editForm, category: value as any})}
                  >
                      <SelectTrigger id="edit-category">
                          <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Survey">Survey</SelectItem>
                          <SelectItem value="Land Acquisition">Land Acquisition</SelectItem>
                          <SelectItem value="Forest Clearance">Forest Clearance</SelectItem>
                          <SelectItem value="Utility Shifting">Utility Shifting</SelectItem>
                          <SelectItem value="Design">Design</SelectItem>
                          <SelectItem value="Environmental Clearance">Environmental Clearance</SelectItem>
                          <SelectItem value="Social Impact Assessment">Social Impact Assessment</SelectItem>
                          <SelectItem value="Financial Closure">Financial Closure</SelectItem>
                      </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Input 
                    id="edit-description" required 
                    value={editForm.description || ''} 
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select 
                    value={editForm.status as string || 'Pending'}
                    onValueChange={value => setEditForm({...editForm, status: value as any})}
                  >
                      <SelectTrigger id="edit-status">
                          <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Not Done">Not Done</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="edit-est-start">Est. Start</Label>
                        <Input 
                            id="edit-est-start" type="date" 
                            value={editForm.estStartDate || ''} 
                            onChange={e => setEditForm({...editForm, estStartDate: e.target.value})}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="edit-est-end">Est. End</Label>
                        <Input 
                            id="edit-est-end" type="date" 
                            value={editForm.estEndDate || ''} 
                            onChange={e => setEditForm({...editForm, estEndDate: e.target.value})}
                        />
                    </div>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="edit-progress">Progress (%)</Label>
                    <Input 
                        id="edit-progress" type="number" 
                        min="0" max="100"
                        value={editForm.progress || 0} 
                        onChange={e => setEditForm({...editForm, progress: Number(e.target.value)})}
                    />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="edit-remarks">Remarks</Label>
                  <Textarea 
                    id="edit-remarks" 
                    value={editForm.remarks || ''} 
                    onChange={(e) => setEditForm({...editForm, remarks: e.target.value})}
                    className="min-h-[100px]"
                  />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditModalOpen(false)}><X className="mr-2 h-4 w-4" />Cancel</Button>
                    <Button type="submit"><CheckCircle2 className="mr-2 h-4 w-4" />Save Changes</Button>
                </DialogFooter>
              </form>
          </DialogContent>
       </Dialog>

       {/* View Progress History - Shown in Track Modal when task has logs */}
       {selectedTaskForTrack && (() => {
         const taskWithLogs = project.preConstruction.find(t => t.id === selectedTaskForTrack);
         if (taskWithLogs?.logs && taskWithLogs.logs.length > 0) {
           return (
             <div className="mt-4 p-4 bg-muted/30 rounded-lg">
               <h4 className="font-semibold mb-2">Progress History</h4>
               <div className="space-y-2 max-h-40 overflow-y-auto">
                 {taskWithLogs.logs.slice().reverse().map((log: any, idx: number) => (
                   <div key={idx} className="flex justify-between text-sm">
                     <span className="text-muted-foreground">{log.date}</span>
                     <span className="font-medium">+{log.progressAdded}%</span>
                     <span className="text-muted-foreground truncate max-w-[200px]">{log.description}</span>
                   </div>
                 ))}
               </div>
             </div>
           );
         }
         return null;
       })()}
    </div>
  );
};

export default PreConstructionModule;

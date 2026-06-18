
import React, { useState, useRef } from 'react';
import { 
    Plus, Calendar, Target, Trash2, AlertTriangle, 
    CheckCircle2, X
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

interface Props {
  project: Project;
  onProjectUpdate: (project: Project) => void;
}

const PreConstructionModule: React.FC<Props> = ({ project, onProjectUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [selectedTaskForTrack, setSelectedTaskForTrack] = useState<string | null>(null);
  
  // Forms
  const [newTask, setNewTask] = useState<Partial<PreConstructionTask>>({
    category: 'Survey',
    status: 'Pending',
    description: '',
    remarks: '',
    estStartDate: '',
    estEndDate: '',
    progress: 0
  });

  const [trackForm, setTrackForm] = useState({
      date: new Date().toISOString().split('T')[0],
      progressAdded: 0,
      description: ''
  });

  // History auto-fill hooks
  const descriptionHistory = useHistoryAutoFill('preConstructionDescriptions');
  const remarksHistory = useHistoryAutoFill('preConstructionRemarks'); // Optional, but remarks can be repetitive

  // --- Handlers for New Task Modal Inputs ---
  const handleNewDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewTask({...newTask, description: value});
    descriptionHistory.updateSuggestions(value);
  };

  const handleNewRemarksChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewTask({...newTask, remarks: value});
    // Remarks might be longer, saving on blur might be better
    // remarksHistory.updateSuggestions(value);
  };

  // --- Handlers for Track Progress Modal Inputs ---
  const handleTrackDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTrackForm({...trackForm, description: value});
    // For track description, maybe save history on submit
    // descriptionHistory.updateSuggestions(value);
  };

  // --- Logic ---
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    
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
        status: newTask.status as any,
        targetDate: newTask.estEndDate || '', // Default target to end date
        estStartDate: newTask.estStartDate,
        estEndDate: newTask.estEndDate,
        progress: 0,
        remarks: newTask.remarks || '',
        logs: []
    };
    onProjectUpdate({
        ...project,
        preConstruction: [...project.preConstruction, task]
    });
    setIsModalOpen(false);
    setNewTask({ category: 'Survey', status: 'Pending', description: '', remarks: '', estStartDate: '', estEndDate: '', progress: 0 });
  };

  const handleDeleteTask = (id: string) => {
      if (window.confirm("Are you sure you want to delete this activity? This action cannot be undone.")) {
          onProjectUpdate({
              ...project,
              preConstruction: project.preConstruction.filter(t => t.id !== id)
          });
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
      // Save the track progress description to history
      if (trackForm.description) descriptionHistory.saveEntry(trackForm.description);
  };

  const getStatusVariant = (status: string) => {
      switch(status) {
          case 'Completed': return 'success';
          case 'In Progress': return 'default';
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
          {project.preConstruction.map(task => (
              <Card key={task.id} className="flex flex-col">
                  <CardContent className="flex-1 p-6">
                      <div className="flex justify-between items-center mb-2">
                          <Badge variant={getStatusVariant(task.status || 'Pending')}>{task.status}</Badge>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task.id)} title="Delete Activity">
                              <Trash2 className="h-4 w-4" />
                          </Button>
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
                  
                  <div className="p-4 border-t">
                      <Button 
                         className="w-full"
                         variant="outline"
                         onClick={() => { setSelectedTaskForTrack(task.id); setIsTrackModalOpen(true); }}
                      >
                          <Target className="mr-2 h-4 w-4" /> Track Daily Progress
                      </Button>
                  </div>
              </Card>
          ))}
          {project.preConstruction.length === 0 && (
              <div className="lg:col-span-3">
                  <Card className="p-12 text-center border-dashed">
                      <p className="text-muted-foreground italic">No pre-construction activities logged.</p>
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
    </div>
  );
};

export default PreConstructionModule;

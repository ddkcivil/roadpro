import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Project } from '../../types';
import { z } from 'zod';
import { AlertCircle, Loader2, RotateCcw, Trash2, Edit3, List, Plus, Search } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { cn } from '~/lib/utils';
import { ErrorSummary } from '~/components/ui/error-summary';
import { useProjects } from '~/hooks/useProjects';
import { useAuth } from '~/hooks/useAuth';

const projectFormSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  code: z.string().min(2, "Project code must be at least 2 characters"),
  startDate: z.string().nullable().optional().refine(val => !!val, "Commencement date is required"),
  endDate: z.string().nullable().optional().refine(val => !!val, "Completion date is required"),
  client: z.string().min(2, "Client name is required"),
  contractor: z.string().nullable().optional().refine(val => !!val, "Contractor name is required"),
  location: z.string().nullable().optional(),
  contractNo: z.string().nullable().optional(),
});

interface Props {
  open: boolean;
  onClose: () => void;
  onSave?: (project: Partial<Project>) => Promise<void>;
  project?: Partial<Project> | null;
}

const ProjectModal: React.FC<Props> = ({ open, onClose, onSave, project }) => {
  const { projects, isLoadingProjects, saveProject, deleteProject, fetchProjects } = useProjects(true);
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'new' | 'manage'>('new');
  const [editForm, setEditForm] = useState<Partial<Project>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [projectsSearch, setProjectsSearch] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitAttempt, setSubmitAttempt] = useState(0);

  // Filter projects based on search
  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    return projects.filter(p =>
      p.name.toLowerCase().includes(projectsSearch.toLowerCase()) ||
      p.code?.toLowerCase().includes(projectsSearch.toLowerCase()) ||
      p.client.toLowerCase().includes(projectsSearch.toLowerCase())
    );
  }, [projects, projectsSearch]);

  const resetForm = useCallback(() => {
    setEditForm({});
    setErrors({});
    setSubmitError(null);
    setSubmitAttempt(0);
  }, []);

  // Update form when project prop changes
  useEffect(() => {
    if (project) {
      setEditForm(project);
      if (project.id) setActiveTab('manage');
    } else {
      setEditForm({});
      setActiveTab('new');
    }
  }, [project]);

  const handleEdit = (project: Project) => {
    setEditForm(project);
    setActiveTab('new');
    setErrors({});
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      try {
        await deleteProject(id);
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();

    // Validate form first
    try {
      projectFormSchema.parse(editForm);
      setErrors({});
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.issues.forEach((e: any) => {
          if (e.path[0]) {
            newErrors[e.path[0].toString()] = e.message;
          }
        });
        setErrors(newErrors);
      }
      return;
    }

    // Attempt to save
    setIsSubmitting(true);
    setSubmitError(null);
    const newAttempt = submitAttempt + 1;
    setSubmitAttempt(newAttempt);

    try {
      if (onSave) {
        await onSave(editForm);
      } else {
        await saveProject(editForm);
      }
      resetForm();
      if (!editForm.id) {
        // If it was a new project, maybe switch to manage or close
        setActiveTab('manage');
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to save project. Please try again.';
      setSubmitError(errorMsg);
      console.error('[ProjectModal] Save error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [editForm, saveProject, submitAttempt, resetForm]);

  useEffect(() => {
    if (open) {
      fetchProjects();
    }
  }, [open, fetchProjects]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex flex-col h-full">
          <div className="px-6 pt-6 pb-2 border-b">
            <DialogHeader className="mb-4">
              <DialogTitle>Project Portfolio Management</DialogTitle>
              <DialogDescription>
                Define new projects or manage existing project definitions and details.
              </DialogDescription>
            </DialogHeader>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new" className="gap-2">
                {editForm.id ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {editForm.id ? 'Edit Project' : 'New Project'}
              </TabsTrigger>
              <TabsTrigger value="manage" className="gap-2">
                <List className="h-4 w-4" />
                Manage Portfolio
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <TabsContent value="new" className="mt-0 outline-none">
              <form onSubmit={handleSubmit} className="grid gap-4">
                <ErrorSummary
                  errors={errors}
                  title="Project definition errors"
                  onClear={() => setErrors({})}
                />

                {submitError && (
                  <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-destructive">Failed to Save</p>
                      <p className="text-xs text-destructive/80 mt-1">{submitError}</p>
                    </div>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="name" className={cn(errors.name && "text-destructive")}>Full Project Title</Label>
                  <Input
                    id="name"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="e.g. Urban Resilience Project"
                    className={cn(errors.name && "border-destructive")}
                    disabled={isSubmitting}
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="code" className={cn(errors.code && "text-destructive")}>Project Code</Label>
                    <Input
                      id="code"
                      value={editForm.code || ''}
                      onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                      placeholder="URLIP-TT-01"
                      className={cn(errors.code && "border-destructive")}
                      disabled={isSubmitting}
                    />
                    {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="contractNo">Contract No.</Label>
                    <Input
                      id="contractNo"
                      value={editForm.contractNo || ''}
                      onChange={(e) => setEditForm({ ...editForm, contractNo: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="startDate" className={cn(errors.startDate && "text-destructive")}>Commencement Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={editForm.startDate || ''}
                      onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                      className={cn(errors.startDate && "border-destructive")}
                      disabled={isSubmitting}
                    />
                    {errors.startDate && <p className="text-xs text-destructive">{errors.startDate}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="endDate" className={cn(errors.endDate && "text-destructive")}>Completion Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={editForm.endDate || ''}
                      onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                      className={cn(errors.endDate && "border-destructive")}
                      disabled={isSubmitting}
                    />
                    {errors.endDate && <p className="text-xs text-destructive">{errors.endDate}</p>}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="client" className={cn(errors.client && "text-destructive")}>Employer / Client</Label>
                  <Input
                    id="client"
                    value={editForm.client || ''}
                    onChange={(e) => setEditForm({ ...editForm, client: e.target.value })}
                    className={cn(errors.client && "border-destructive")}
                    disabled={isSubmitting}
                  />
                  {errors.client && <p className="text-xs text-destructive">{errors.client}</p>}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="contractor" className={cn(errors.contractor && "text-destructive")}>Main Contractor</Label>
                  <Input
                    id="contractor"
                    value={editForm.contractor || ''}
                    onChange={(e) => setEditForm({ ...editForm, contractor: e.target.value })}
                    className={cn(errors.contractor && "border-destructive")}
                    disabled={isSubmitting}
                  />
                  {errors.contractor && <p className="text-xs text-destructive">{errors.contractor}</p>}
                </div>

                <div className="flex justify-between mt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={resetForm}
                    disabled={isSubmitting}
                  >
                    Reset Form
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="gap-2"
                    >
                      {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      {editForm.id ? 'Update Project' : 'Create Project'}
                    </Button>
                  </div>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="manage" className="mt-0 outline-none">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Search projects by name, code or client..."
                      value={projectsSearch}
                      onChange={(e) => setProjectsSearch(e.target.value)}
                      className="pl-9"
                    />
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                  <Button variant="outline" size="icon" onClick={() => fetchProjects()} disabled={isLoadingProjects}>
                    <RotateCcw className={cn("h-4 w-4", isLoadingProjects && "animate-spin")} />
                  </Button>
                </div>

                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead className="hidden md:table-cell">Duration</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingProjects ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                            <p className="text-xs text-muted-foreground mt-2">Loading portfolio...</p>
                          </TableCell>
                        </TableRow>
                      ) : filteredProjects.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                            No projects found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredProjects.map((project) => (
                          <TableRow key={project.id}>
                            <TableCell>
                              <div className="font-medium">{project.name}</div>
                              <div className="text-xs text-muted-foreground">{project.code}</div>
                            </TableCell>
                            <TableCell>{project.client}</TableCell>
                            <TableCell className="hidden md:table-cell text-xs">
                              {project.startDate} to {project.endDate}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(project)}>
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(project.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectModal;

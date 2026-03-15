import React, { useState, useEffect } from 'react';
import { Project } from '../../types';
import { z } from 'zod';

import { Button } from '~/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { cn } from '~/lib/utils';
import { ErrorSummary } from '~/components/ui/error-summary';

const projectFormSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  code: z.string().min(2, "Project code must be at least 2 characters"),
  startDate: z.string().min(1, "Commencement date is required"),
  endDate: z.string().min(1, "Completion date is required"),
  client: z.string().min(2, "Client name is required"),
  contractor: z.string().min(2, "Contractor name is required"),
  location: z.string().optional(),
  contractNo: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (project: Partial<Project>) => void;
  project: Partial<Project> | null;
}

const ProjectModal: React.FC<Props> = ({ open, onClose, onSave, project }) => {
  const [editForm, setEditForm] = useState<Partial<Project>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setEditForm(project || {
        name: '',
        code: '',
        startDate: '',
        endDate: '',
        client: '',
        contractor: '',
        location: '',
        contractNo: '',
      });
      setErrors({});
    }
  }, [project, open]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      const validatedData = projectFormSchema.parse(editForm);
      onSave({ ...editForm, ...validatedData });
      onClose();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            newErrors[e.path[0].toString()] = e.message;
          }
        });
        setErrors(newErrors);
      }
    }
  };


  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editForm.id ? 'Edit Project Definition' : 'Create New Project'}
            </DialogTitle>
            <DialogDescription>
              {editForm.id ? 'Make changes to the project details.' : 'Define a new project for RoadMaster Pro.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
            <ErrorSummary 
              errors={errors} 
              title="Project definition errors" 
              onClear={() => setErrors({})}
            />

            <div className="grid gap-2">
              <Label htmlFor="name" className={cn(errors.name && "text-destructive")}>Full Project Title</Label>
              <Input
                id="name"
                value={editForm.name || ''}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="e.g. Urban Resilience Project"
                className={cn(errors.name && "border-destructive")}
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
                />
                {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contractNo">Contract No.</Label>
                <Input
                  id="contractNo"
                  value={editForm.contractNo || ''}
                  onChange={(e) => setEditForm({ ...editForm, contractNo: e.target.value })}
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
              />
              {errors.contractor && <p className="text-xs text-destructive">{errors.contractor}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">
              {editForm.id ? 'Update Project' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectModal;

import React, { useState, useEffect } from 'react';
import { Project } from '../../types';

import { Button } from '~/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea'; // For multi-line text fields

// NOTE: This is a refactored version of the ProjectModal component.
// The original logic has been temporarily removed to facilitate the UI migration.
// It will be re-implemented in subsequent steps.

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (project: Partial<Project>) => void;
  project: Partial<Project> | null;
}

const ProjectModal: React.FC<Props> = ({ open, onClose, onSave, project }) => {
  const [editForm, setEditForm] = useState<Partial<Project>>({});

  useEffect(() => {
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
  }, [project]);

  const handleSubmit = () => {
    console.log('ProjectModal handleSubmit called with editForm:', editForm);
    // Basic validation
    if (
      !editForm.name ||
      !editForm.code ||
      !editForm.startDate ||
      !editForm.endDate ||
      !editForm.client ||
      !editForm.contractor
    ) {
      alert(
        'Please fill in all required fields: Name, Code, Dates, Client, and Contractor.'
      );
      return;
    }
    onSave(editForm);
    onClose();
  };


  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            {editForm.id ? 'Edit Project Definition' : 'Create New Project'}
          </DialogTitle>
          <DialogDescription>
            {editForm.id ? 'Make changes to the project details.' : 'Define a new project for RoadMaster Pro.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Full Project Title</Label>
            <Input
              id="name"
              value={editForm.name || ''}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="e.g. Urban Resilience and Livability Improvement Project"
              className="col-span-3"
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="code" className="text-right">Project Identification Code</Label>
            <Input
              id="code"
              value={editForm.code || ''}
              onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
              placeholder="e.g. URLIP-TT-01"
              className="col-span-3"
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="contractNo" className="text-right">Contract Agreement No.</Label>
            <Input
              id="contractNo"
              value={editForm.contractNo || ''}
              onChange={(e) => setEditForm({ ...editForm, contractNo: e.target.value })}
              placeholder="e.g. CWO1/2024"
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4 col-span-full">
            <Label className="text-right font-bold">CONTRACTUAL TIMELINE</Label>
            <div className="col-span-3 grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate">Official Commencement</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={editForm.startDate || ''}
                  onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">Intended Completion</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={editForm.endDate || ''}
                  onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="client" className="text-right">Employer / Client</Label>
            <Input
              id="client"
              value={editForm.client || ''}
              onChange={(e) => setEditForm({ ...editForm, client: e.target.value })}
              placeholder="e.g. Ministry of Transport"
              className="col-span-3"
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="contractor" className="text-right">Main Contractor</Label>
            <Input
              id="contractor"
              value={editForm.contractor || ''}
              onChange={(e) => setEditForm({ ...editForm, contractor: e.target.value })}
              className="col-span-3"
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="location" className="text-right">Site Location</Label>
            <Input
              id="location"
              value={editForm.location || ''}
              onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              placeholder="e.g. Tilottama, Lumbini"
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" onClick={handleSubmit}>
            {editForm.id ? 'Update Project' : 'Create Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectModal;

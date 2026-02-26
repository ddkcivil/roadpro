import React, { useState } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';

// NOTE: This is a refactored version of the TestProjectCreation component.
// The original logic has been temporarily removed to facilitate the UI migration.
// It will be re-implemented in subsequent steps.

interface Project {
  id: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  client: string;
  contractor: string;
  location: string;
}

interface Props {
  onSaveProject: (project: Partial<Project>) => void;
}

const TestProjectCreation: React.FC<Props> = ({ onSaveProject }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    startDate: '',
    endDate: '',
    client: '',
    contractor: '',
    location: ''
  });

  const handleSubmit = () => {
    if (!formData.name || !formData.code || !formData.startDate || !formData.endDate || !formData.client || !formData.contractor) {
      alert('Please fill in all required fields');
      return;
    }

    const newProject: Partial<Project> = {
      id: `proj-${Date.now()}`,
      ...formData
    };

    console.log('Creating project:', newProject);
    onSaveProject(newProject);
    setIsOpen(false);
    setFormData({
      name: '',
      code: '',
      startDate: '',
      endDate: '',
      client: '',
      contractor: '',
      location: ''
    });
  };

  return (
    <>
      <Button
        variant="default"
        onClick={() => setIsOpen(true)}
        className="mb-4"
      >
        <Plus className="mr-2 h-4 w-4" /> Test Create Project
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Test Project Creation</DialogTitle>
            <DialogDescription>Simple test form to verify project creation works</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Project Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="code" className="text-right">Project Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                required
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="client" className="text-right">Client</Label>
              <Input
                id="client"
                value={formData.client}
                onChange={(e) => setFormData({...formData, client: e.target.value})}
                required
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startDate" className="text-right">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                required
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endDate" className="text-right">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                required
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contractor" className="text-right">Contractor</Label>
              <Input
                id="contractor"
                value={formData.contractor}
                onChange={(e) => setFormData({...formData, contractor: e.target.value})}
                required
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="location" className="text-right">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" onClick={handleSubmit}>
              Create Test Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TestProjectCreation;

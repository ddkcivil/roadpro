import React, { useState } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, Box, Grid } from '@mui/material';
import { Plus } from 'lucide-react';

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
        variant="contained"
        startIcon={<Plus size={16} />}
        onClick={() => setIsOpen(true)}
        sx={{ mb: 2 }}
      >
        Test Create Project
      </Button>

      <Dialog open={isOpen} onClose={() => setIsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h5" fontWeight="bold">
            Test Project Creation
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary">
              Simple test form to verify project creation works
            </Typography>
          </Box>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Project Name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Project Code"
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                required
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Client"
                value={formData.client}
                onChange={(e) => setFormData({...formData, client: e.target.value})}
                required
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                InputLabelProps={{ shrink: true }}
                required
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                InputLabelProps={{ shrink: true }}
                required
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contractor"
                value={formData.contractor}
                onChange={(e) => setFormData({...formData, contractor: e.target.value})}
                required
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Location"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                size="small"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            Create Test Project
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TestProjectCreation;
import React, { useState, useEffect } from 'react';
import { Project } from '../../types';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
  Typography,
  Box,
  Paper,
} from '@mui/material';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (project: Partial<Project>) => void;
  project: Partial<Project> | null;
}

const ProjectModal: React.FC<Props> = ({ open, onClose, onSave, project }) => {
  const [editForm, setEditForm] = useState<Partial<Project>>({});

  useEffect(() => {
    setEditForm(project || {});
  }, [project]);

  const handleSubmit = () => {
    console.log('ProjectModal handleSubmit called with editForm:', editForm);
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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle>
        <Typography component="span" variant="h5" fontWeight="bold">
          {editForm.id ? 'Edit Project Definition' : 'Create New Project'}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Box mb={2}>
          <Typography variant="body2" color="text.secondary">
            Configure contractual dates and master registry code
          </Typography>
        </Box>
        <Grid container spacing={3}>
            <Grid item xs={12} md={12}>
              <TextField
                fullWidth
                label="Full Project Title"
                value={editForm.name || ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                placeholder="e.g. Urban Resilience and Livability Improvement Project"
                required
                size="small"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Project Identification Code"
                value={editForm.code || ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, code: e.target.value })
                }
                placeholder="e.g. URLIP-TT-01"
                required
                size="small"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contract Agreement No."
                value={editForm.contractNo || ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, contractNo: e.target.value })
                }
                placeholder="e.g. CWO1/2024"
                size="small"
              />
            </Grid>

            <Grid item xs={12} md={12}>
              <Typography variant="h6" color="primary" gutterBottom>
                CONTRACTUAL TIMELINE
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Official Commencement"
                      type="date"
                      value={editForm.startDate || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, startDate: e.target.value })
                      }
                      InputLabelProps={{ shrink: true }}
                      required
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Intended Completion"
                      type="date"
                      value={editForm.endDate || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, endDate: e.target.value })
                      }
                      InputLabelProps={{ shrink: true }}
                      required
                      size="small"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Employer / Client"
                value={editForm.client || ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, client: e.target.value })
                }
                placeholder="e.g. Ministry of Transport"
                required
                size="small"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Main Contractor"
                value={editForm.contractor || ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, contractor: e.target.value })
                }
                required
                size="small"
              />
            </Grid>

            <Grid item xs={12} md={12}>
              <TextField
                fullWidth
                label="Site Location Coordinates/City"
                value={editForm.location || ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, location: e.target.value })
                }
                placeholder="e.g. Tilottama, Lumbini"
                size="small"
              />
            </Grid>
          </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>
          {editForm.id ? 'Update Project' : 'Create Project'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProjectModal;

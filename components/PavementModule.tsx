
import React, { useState } from 'react';
import { 
    Box, Typography, Button, Card, Grid, TextField, 
    FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle, 
    DialogContent, DialogActions, Chip, Tabs, Tab, Paper,
    Table, TableBody, TableCell, TableHead, TableRow, Stack, LinearProgress, IconButton
} from '@mui/material';
import { Project, UserRole, LinearWorkLog } from '../types';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  project: Project;
  userRole: UserRole;
  onProjectUpdate: (project: Project) => void;
}

const PavementModule: React.FC<Props> = ({ project, onProjectUpdate }) => {
  const [activeCategory, setActiveCategory] = useState('Pavement');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [newLog, setNewLog] = useState<Partial<LinearWorkLog>>({ 
      category: 'Pavement', 
      date: new Date().toISOString().split('T')[0],
      startChainage: 0,
      endChainage: 0
  });

  const handleSaveLog = () => {
      if (!newLog.layer) return;
      const log: LinearWorkLog = {
          id: `lin-${Date.now()}`,
          category: activeCategory as any,
          layer: newLog.layer!,
          startChainage: Number(newLog.startChainage),
          endChainage: Number(newLog.endChainage),
          date: newLog.date!,
          side: 'Both',
          status: 'In Progress'
      };
      onProjectUpdate({ ...project, linearWorks: [...(project.linearWorks || []), log] });
      setIsLogModalOpen(false);
  };

  return (
    <Box>
        <Box display="flex" justifyContent="space-between" mb={3}>
            <Typography variant="h5" fontWeight="900">Linear Works Registry</Typography>
            <Button variant="contained" startIcon={<Plus size={18}/>} onClick={() => setIsLogModalOpen(true)}>Record Progress</Button>
        </Box>
        <Tabs value={activeCategory} onChange={(e, v) => setActiveCategory(v)} sx={{ mb: 3 }}>
            <Tab value="Pavement" label="Pavement" sx={{ fontWeight: 'bold' }} />
        </Tabs>
        {/* Fix: Replaced deprecated Grid props with v6 size prop */}
        <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
                <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Layer</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Chainage (Km)</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(project.linearWorks || []).map(log => (
                                <TableRow key={log.id} hover>
                                    <TableCell sx={{ fontSize: '0.8rem' }}>{log.date}</TableCell>
                                    <TableCell><Typography variant="body2" fontWeight="bold">{log.layer}</Typography></TableCell>
                                    <TableCell><Chip label={`${log.startChainage} - ${log.endChainage}`} size="small" variant="outlined" sx={{ height: 18, fontSize: 9, fontWeight: 'bold' }} /></TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" color="error"><Trash2 size={16}/></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(project.linearWorks || []).length === 0 && (
                                <TableRow>
                                    <TableCell align="center" {...{ colSpan: 4 }} sx={{ py: 6, color: 'text.disabled' }}>No linear work recorded.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Paper>
            </Grid>
        </Grid>
        <Dialog open={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4 } }}>
            <DialogTitle sx={{ fontWeight: 'bold' }}>Log Daily Progress</DialogTitle>
            <DialogContent>
                <Stack spacing={3} pt={2}>
                    <TextField label="Work Layer" fullWidth size="small" value={newLog.layer || ''} onChange={e => setNewLog({...newLog, layer: e.target.value})} placeholder="e.g. GSB, WMM..." />
                    {/* Fix: Replaced deprecated Grid props with v6 size prop */}
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <TextField label="Start Km" type="number" fullWidth size="small" value={newLog.startChainage} onChange={e => setNewLog({...newLog, startChainage: Number(e.target.value)})} />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField label="End Km" type="number" fullWidth size="small" value={newLog.endChainage} onChange={e => setNewLog({...newLog, endChainage: Number(e.target.value)})} />
                        </Grid>
                    </Grid>
                    <TextField label="Date" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} value={newLog.date} onChange={e => setNewLog({...newLog, date: e.target.value})} />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
                <Button onClick={() => setIsLogModalOpen(false)}>Cancel</Button>
                <Button variant="contained" onClick={handleSaveLog} disabled={!newLog.layer}>Commit Entry</Button>
            </DialogActions>
        </Dialog>
    </Box>
  );
};

export default PavementModule;

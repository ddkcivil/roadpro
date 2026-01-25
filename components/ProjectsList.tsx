import React, { useState, useMemo } from 'react';
import { Project, UserRole, BOQItem } from '../types';
import { Search, Plus, Trash2, Edit, CheckCircle, X, Calendar, MapPin, Activity, Clock, FileEdit, LayoutGrid, List as ListIcon, TrendingUp, Timer } from 'lucide-react';
import { Avatar, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, Divider, Grid, IconButton, InputAdornment, LinearProgress, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';

import ProjectModal from './ProjectModal';

const ArrowRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
    </svg>
);

interface Props {
  projects: Project[];
  userRole: UserRole;
  onSelectProject: (projectId: string) => void;
  onSaveProject: (project: Partial<Project>) => void;
  onDeleteProject: (id: string) => void;
  onOpenModal: (project: Partial<Project> | null) => void;
}

const ProjectsList: React.FC<Props> = ({ projects, userRole, onSelectProject, onSaveProject, onDeleteProject, onOpenModal }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'LIST' | 'GRID'>('LIST');

  const hasEditPrivilege = userRole === UserRole.ADMIN || userRole === UserRole.PROJECT_MANAGER;

  const filteredProjects = projects
    .filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleOpenNew = () => {
    onOpenModal(null);
  };

  const handleOpenEdit = (project: Project) => {
    onOpenModal(project);
  };

  const handleSelectProject = (projectId: string) => {
    console.log('ProjectsList: Selecting project', projectId);
    onSelectProject(projectId);
  };
  const calculateProgress = (boq: BOQItem[]) => {
    const totalValue = (boq || []).reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    if (totalValue === 0) return 0;
    const completedValue = (boq || []).reduce((sum, item) => sum + (item.completedQuantity * item.rate), 0);
    return Math.round((completedValue / totalValue) * 100);
  };

  const calculateTimeProgress = (start: string, end: string) => {
      if (!start || !end) return 0;
      const s = new Date(start).getTime();
      const e = new Date(end).getTime();
      const now = new Date().getTime();
      if (now < s) return 0;
      if (now > e) return 100;
      return Math.round(((now - s) / (e - s)) * 100);
  };

  const calculateDuration = (start: string, end: string) => {
      if (!start || !end) return "N/A";
      const s = new Date(start);
      const e = new Date(end);      const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
      return months > 12 ? `${(months / 12).toFixed(1)} Yrs` : `${months} Mos`;
  };

  const getProjectStatus = (start: string, end: string) => {
    const now = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    now.setHours(0,0,0,0);
    startDate.setHours(0,0,0,0);
    endDate.setHours(0,0,0,0);

    if (!start) return { 
        label: 'Draft', 
        color: 'bg-slate-100 text-slate-600 border-slate-200', 
        dot: 'bg-slate-400',
        icon: <FileEdit size={12} className="mr-1" />
    };
    
    if (end && endDate < now) {
        return { 
            label: 'Completed', 
            color: 'bg-blue-50 text-blue-700 border-blue-200', 
            dot: 'bg-blue-500',
            icon: <CheckCircle size={12} className="mr-1" />
        };
    }
    
    if (startDate > now) {
        return { 
            label: 'Upcoming', 
            color: 'bg-amber-50 text-amber-700 border-amber-200', 
            dot: 'bg-amber-400',
            icon: <Clock size={12} className="mr-1" />
        };
    }
    
    return { 
        label: 'Active', 
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
        dot: 'bg-emerald-500',
        icon: <Activity size={12} className="mr-1" />
    };
  };

  if (projects.length === 0) {
    return (
      <Box textAlign="center" p={8} bgcolor="background.paper" borderRadius={4} border="1px dashed" borderColor="divider">
        <Typography variant="h5" fontWeight="800" color="text.primary">Welcome to RoadMaster Pro</Typography>
        <Typography variant="body1" color="text.secondary" mt={1} mb={3}>
          It looks like you don't have any projects yet. <br/> Get started by creating your first project.
        </Typography>
        <Button variant="contained" size="large" onClick={handleOpenNew} startIcon={<Plus />}>
          Create New Project
        </Button>
      </Box>
    );
  }

  return (
    <Box className="space-y-6">
      <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2}>
        <Box>
            <Typography variant="h5" fontWeight="900" color="text.primary">Project Portfolio</Typography>
            <Typography variant="body2" color="text.secondary">Strategic oversight of {projects.length} infrastructure assets</Typography>
        </Box>
        <Stack direction="row" spacing={2}>
            <ToggleButtonGroup size="small" value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 0.5, border: '1px solid', borderColor: 'divider' }}>
                <ToggleButton value="LIST" sx={{ px: 2 }}><ListIcon size={18} /></ToggleButton>
                <ToggleButton value="GRID" sx={{ px: 2 }}><LayoutGrid size={18} /></ToggleButton>
            </ToggleButtonGroup>
            {hasEditPrivilege && (
              <Button onClick={handleOpenNew} variant="contained" startIcon={<Plus size={18} />}>
                 Create New Project
              </Button>
            )}
        </Stack>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden', bgcolor: 'background.paper' }}>
         <Box p={2} borderBottom="1px solid" borderColor="divider" display="flex" flexDirection={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" gap={2} bgcolor="action.hover">
            <Typography variant="subtitle1" fontWeight="bold" color="text.primary">Project Directory ({filteredProjects.length})</Typography>
            <Box sx={{ position: 'relative' }}>
               <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'textSecondary' }} size={16} />
               <TextField 
                 size="small"
                 placeholder="Search by code or client..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 sx={{ 
                    pl: 4, 
                    py: 1, 
                    borderRadius: 2, 
                    border: '1px solid', 
                    borderColor: 'divider', 
                    bgcolor: 'background.default', 
                    '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: 'transparent' },
                        '&:hover fieldset': { borderColor: 'transparent' },
                        '&.Mui-focused fieldset': { borderColor: 'transparent' },
                    }
                 }}
                 InputProps={{
                    startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment>,
                    sx: { height: 36, borderRadius: 2 }
                 }}
               />
            </Box>
         </Box>

         {viewMode === 'LIST' && filteredProjects.length === 0 && (
            <Box textAlign="center" p={8}>
                <Typography color="text.secondary">No projects match your search.</Typography>
            </Box>
         )}

         {viewMode === 'LIST' && filteredProjects.length > 0 && (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                <thead className="bg-action-hover text-text-secondary font-semibold border-b border-divider">
                    <tr>
                        <th className="px-6 py-4 whitespace-nowrap">Project Identity</th>
                        <th className="px-6 py-4 whitespace-nowrap">Employer / Contractor</th>
                        <th className="px-6 py-4 whitespace-nowrap">Contractual Timeline</th>
                        <th className="px-6 py-4 whitespace-nowrap w-48">Progress Matrix</th>
                        <th className="px-6 py-4 whitespace-nowrap text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                    {filteredProjects.map(project => {
                        const physProgress = calculateProgress(project.boq);
                        const timeProgress = calculateTimeProgress(project.startDate, project.endDate);
                        const status = getProjectStatus(project.startDate, project.endDate);
                        
                        return (
                            <tr key={project.id} className="hover:bg-action-hover transition-colors group">
                            <td className="px-6 py-4 cursor-pointer" onClick={() => handleSelectProject(project.id)}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Avatar 
                                        src={project.logo} 
                                        variant="rounded" 
                                        sx={{ width: 44, height: 44, bgcolor: 'primary.light', color: 'primary.contrastText', fontWeight: 'bold' }}
                                    >
                                        {project.name.charAt(0)}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight="bold" color="text.primary" noWrap sx={{ maxWidth: 200 }}>{project.name}</Typography>
                                        <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                                            <Chip 
                                                label={status.label} 
                                                size="small" 
                                                sx={{ bgcolor: 'info.main', color: 'info.contrastText', fontWeight: 800, fontSize: 10, borderRadius: '6px' }} 
                                                icon={status.icon}
                                            />
                                            <Typography variant="caption" fontFamily="monospace" color="text.secondary">{project.code}</Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </td>
                            <td className="px-6 py-4">
                                <Typography variant="body2" fontWeight="600" color="text.primary">{project.client}</Typography>
                                <Typography variant="caption" color="text.secondary">{project.contractor}</Typography>
                            </td>
                            <td className="px-6 py-4">
                                <Box sx={{ minWidth: 150 }}>
                                    <Stack spacing={0.5}>
                                        <Box display="flex" alignItems="center" gap={0.5} color="text.secondary">
                                            <Calendar size={12}/> <Typography variant="caption" fontWeight="medium">{project.startDate} — {project.endDate || 'Ongoing'}</Typography>
                                        </Box>
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography variant="caption" fontWeight="bold" color="text.secondary">TIME BURN</Typography>
                                            <Typography variant="caption" fontWeight="bold" color={timeProgress > physProgress ? 'error.main' : 'primary.main'}>{timeProgress}%</Typography>
                                        </Box>
                                        <LinearProgress 
                                            variant="determinate" 
                                            value={timeProgress} 
                                            sx={{ height: 4, borderRadius: 2, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: timeProgress > physProgress ? 'error.main' : 'primary.main' } }} 
                                        />
                                    </Stack>
                                </Box>
                            </td>
                            <td className="px-6 py-4">
                                <Stack spacing={0.5}>
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Typography variant="caption" fontWeight="bold" color="text.secondary">PHYSICAL</Typography>
                                        <Typography variant="caption" fontWeight="bold" color="text.primary">{physProgress}%</Typography>
                                    </Box>
                                    <LinearProgress variant="determinate" value={physProgress} sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover' }} color="success" />
                                </Stack>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <Stack direction="row" spacing={0} justifyContent="flex-end" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Tooltip title="View Control Panel">
                                        <IconButton size="small" onClick={() => handleSelectProject(project.id)} sx={{ color: 'primary.main', bgcolor: 'primary.lighter' }}><ArrowRightIcon /></IconButton>
                                    </Tooltip>
                                    {hasEditPrivilege && (
                                        <>
                                            <Tooltip title="Edit Project">
                                                <IconButton size="small" onClick={() => handleOpenEdit(project)}><Edit size={16} /></IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete Project">
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => {
                                                        if (window.confirm(`
⚠️ PERMANENT DELETION WARNING ⚠️

You are about to permanently delete the project:

Project: ${project.name}
Code: ${project.code}
Client: ${project.client}

This action will permanently remove all associated data including schedules,
BOQ items, documents, reports, and other records. This cannot be undone.

To confirm deletion, click OK. To cancel, click Cancel.`)) {
                                                            if (window.confirm(`FINAL CONFIRMATION REQUIRED:

You are about to permanently delete:

${project.name} (${project.code})

This is the FINAL step. Click OK to DELETE PERMANENTLY or Cancel to abort.`)) {
                                                                onDeleteProject(project.id);
                                                            }
                                                        }
                                                    }} 
                                                    color="error"
                                                >
                                                    <Trash2 size={16} />
                                                </IconButton>
                                            </Tooltip>
                                        </>
                                    )}
                                </Stack>
                            </td>
                            </tr>
                        );
                    })}
                </tbody>
                </table>
            </div>
         )}

         {viewMode === 'GRID' && filteredProjects.length === 0 && (
            <Box textAlign="center" p={8}>
                <Typography color="text.secondary">No projects match your search.</Typography>
            </Box>
         )}
         
         {viewMode === 'GRID' && filteredProjects.length > 0 && (
            <Box p={3} bgcolor="background.default">
                <Grid container spacing={3}>
                    {filteredProjects.map(project => {
                        const physProgress = calculateProgress(project.boq);
                        const timeProgress = calculateTimeProgress(project.startDate, project.endDate);
                        const duration = calculateDuration(project.startDate, project.endDate);
                        const status = getProjectStatus(project.startDate, project.endDate);

                        return (
                            <Grid item xs={12} md={6} lg={4} key={project.id}>
                                <Card 
                                    onClick={() => handleSelectProject(project.id)}
                                    sx={{ 
                                        height: '100%', 
                                        cursor: 'pointer', 
                                        transition: 'all 0.2s', 
                                        '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 24px rgba(0,0,0,0.1)', borderColor: 'primary.main' },
                                        borderRadius: 4
                                    }} 
                                    variant="outlined"
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        <Box display="flex" justifyContent="space-between" mb={2} alignItems="flex-start">
                                            <Avatar 
                                                src={project.logo} variant="rounded" 
                                                sx={{ width: 56, height: 56, bgcolor: 'primary.lighter', color: 'primary.main', fontWeight: 'bold' }}
                                            >
                                                {project.name.charAt(0)}
                                            </Avatar>
                                            <Chip 
                                                label={status.label} 
                                                size="small" 
                                                sx={{ bgcolor: 'info.main', color: 'info.contrastText', fontWeight: 800, fontSize: 10, borderRadius: '6px' }} 
                                                icon={status.icon}
                                            />
                                        </Box>
                                        
                                        <Typography variant="subtitle1" fontWeight="900" sx={{ mb: 0.5 }} noWrap>{project.name}</Typography>
                                        <Box display="flex" alignItems="center" gap={1} mb={2}>
                                            <Typography variant="caption" sx={{ fontWeight: 'bold', px: 1, bgcolor: 'action.hover', borderRadius: 1, color: 'text.secondary' }}>{project.code}</Typography>
                                            <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}><MapPin size={10}/> {project.location}</Typography>
                                        </Box>

                                        <Divider sx={{ mb: 3, borderStyle: 'dashed' }} />

                                        <Stack spacing={3}>
                                            <Box>
                                                <Box display="flex" justifyContent="space-between" mb={1} alignItems="center">
                                                    <Typography variant="caption" fontWeight="900" color="text.secondary" display="flex" alignItems="center" gap={0.5}><Timer size={14}/> CONTRACTUAL TIMELINE</Typography>
                                                    <Typography variant="caption" fontWeight="900" color="primary.main">{duration}</Typography>
                                                </Box>
                                                <Box display="flex" justifyContent="space-between" mb={0.5}>
                                                    <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 'bold' }}>{project.startDate}</Typography>
                                                    <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 'bold' }}>{project.endDate}</Typography>
                                                </Box>
                                                <LinearProgress 
                                                    variant="determinate" 
                                                    value={timeProgress} 
                                                    sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: timeProgress > physProgress ? 'error.main' : 'primary.main' } }} 
                                                />
                                                <Typography variant="caption" sx={{ mt: 0.5, display: 'block', textAlign: 'center', fontSize: '0.6rem', fontWeight: '900', color: 'text.disabled' }}>
                                                    {timeProgress}% SCHEDULE ELAPSED
                                                </Typography>
                                            </Box>

                                            <Box>
                                                <Box display="flex" justifyContent="space-between" mb={1}>
                                                    <Typography variant="caption" fontWeight="900" color="text.secondary" display="flex" alignItems="center" gap={0.5}><TrendingUp size={14}/> PHYSICAL EXECUTION</Typography>
                                                    <Typography variant="caption" fontWeight="900" color="success.main">{physProgress}%</Typography>
                                                </Box>
                                                <LinearProgress variant="determinate" value={physProgress} sx={{ height: 10, borderRadius: 5, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 5 } }} color="success" />
                                            </Box>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
            </Box>
         )}

         <Box p={2} borderTop="1px solid" borderColor="divider" bgcolor="action.hover" display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.secondary">Aggregated Portfolio Data • Synchronized WGS84 Registry</Typography>
            <Typography variant="caption" fontWeight="bold" color="primary.main">{filteredProjects.length} Projects Loaded</Typography>
          </Box>
      </Paper>
    </Box>
  );
};

export default ProjectsList;
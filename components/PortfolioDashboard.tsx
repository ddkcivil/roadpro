import { useState } from 'react';
import { 
  Search, 
  Plus, 
  MapPin, 
  Activity, 
  Clock, 
  TrendingUp, 
  Users, 
  FileText, 
  DollarSign, 
  Calendar, 
  BarChart3,
  PieChart,
  LineChart,
  Trash2
} from 'lucide-react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Paper, 
  TextField, 
  InputAdornment, 
  Chip, 
  Avatar,
  Button,
  Stack,
  LinearProgress,
  IconButton,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle
} from '@mui/material';
import { UserRole, Project, AppSettings } from '../types';
import { formatCurrency } from '../utils/exportUtils';


interface Props {
  projects: Project[];
  userRole: UserRole;
  settings: AppSettings;
  onSelectProject: (projectId: string) => void;
  onSaveProject: (project: Partial<Project>) => void;
  onDeleteProject: (id: string) => void;
}

const PortfolioDashboard: React.FC<Props> = ({ projects, userRole, settings, onSelectProject, onSaveProject, onDeleteProject }) => {
  const [searchTerm, setSearchTerm] = useState('');


  // Calculate portfolio metrics
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => {
    const now = new Date();
    const startDate = new Date(p.startDate);
    const endDate = new Date(p.endDate);
    now.setHours(0,0,0,0);
    startDate.setHours(0,0,0,0);
    endDate.setHours(0,0,0,0);
    return startDate <= now && endDate >= now;
  }).length;
  
  const upcomingProjects = projects.filter(p => {
    const now = new Date();
    const startDate = new Date(p.startDate);
    now.setHours(0,0,0,0);
    startDate.setHours(0,0,0,0);
    return startDate > now;
  }).length;
  
  const completedProjects = projects.filter(p => {
    const now = new Date();
    const endDate = new Date(p.endDate);
    now.setHours(0,0,0,0);
    endDate.setHours(0,0,0,0);
    return endDate < now;
  }).length;

  // Calculate portfolio value
  const totalPortfolioValue = projects.reduce((sum, project) => {
    const projectValue = project.agencies?.reduce((agencySum, agency) => 
      agencySum + (agency.contractValue || 0), 0) || 0;
    return sum + projectValue;
  }, 0);

  // Filter projects based on search
  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle deleting a project
  const handleDeleteProject = (id: string) => {
    onDeleteProject(id);
  };

  // Handle selecting a project
  const handleSelectProject = (id: string) => {
    onSelectProject(id);
  };

  // Calculate progress functions (from ProjectsList)

  // Calculate progress functions (from ProjectsList)
  const calculateProgress = (boq?: any[]) => {
    const boqArray = boq || [];
    const totalValue = boqArray.reduce((sum, item) => sum + (item?.quantity || 0) * (item?.rate || 0), 0);
    if (totalValue === 0) return 0;
    const completedValue = boqArray.reduce((sum, item) => sum + (item?.completedQuantity || 0) * (item?.rate || 0), 0);
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
      icon: <FileText size={12} className="mr-1" />
    };
    
    if (end && endDate < now) {
      return { 
        label: 'Completed', 
        color: 'bg-blue-50 text-blue-700 border-blue-200', 
        dot: 'bg-blue-500',
        icon: <Activity size={12} className="mr-1" />
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

  // Calculate average progress across all projects
  const avgPhysicalProgress = Math.round(
    projects.reduce((sum, p) => sum + calculateProgress(p.boq), 0) / (projects.length || 1)
  );
  
  const avgTimeProgress = Math.round(
    projects.reduce((sum, p) => sum + calculateTimeProgress(p.startDate, p.endDate), 0) / (projects.length || 1)
  );

  return (
    <Box className="space-y-6">
      {/* Portfolio Overview */}
      <Box>
        <Typography variant="h5" fontWeight="900" color="text.primary" mb={3}>
          Portfolio Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={4}>
          Strategic overview of {totalProjects} infrastructure assets
        </Typography>
      </Box>

      {/* Portfolio Metrics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                  <BarChart3 size={24} />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="900" color="text.primary">
                    {totalProjects}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Projects
                  </Typography>
                </Box>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={100} 
                sx={{ height: 4, borderRadius: 2, bgcolor: 'action.hover' }} 
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Avatar sx={{ bgcolor: 'success.main', width: 48, height: 48 }}>
                  <Activity size={24} />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="900" color="text.primary">
                    {activeProjects}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Active Projects
                  </Typography>
                </Box>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={Math.round((activeProjects / totalProjects) * 100) || 0} 
                sx={{ height: 4, borderRadius: 2, bgcolor: 'action.hover' }} 
                color="success"
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Avatar sx={{ bgcolor: 'warning.main', width: 48, height: 48 }}>
                  <Clock size={24} />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="900" color="text.primary">
                    {upcomingProjects}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Upcoming Projects
                  </Typography>
                </Box>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={Math.round((upcomingProjects / totalProjects) * 100) || 0} 
                sx={{ height: 4, borderRadius: 2, bgcolor: 'action.hover' }} 
                color="warning"
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Avatar sx={{ bgcolor: 'info.main', width: 48, height: 48 }}>
                  <TrendingUp size={24} />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="900" color="text.primary">
                    {formatCurrency(totalPortfolioValue, settings)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Portfolio Value
                  </Typography>
                </Box>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={100} 
                sx={{ height: 4, borderRadius: 2, bgcolor: 'action.hover' }} 
                color="info"
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Progress Overview */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2} display="flex" alignItems="center" gap={1}>
                <TrendingUp size={20} />
                Average Progress
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" fontWeight="bold">Physical Progress</Typography>
                    <Typography variant="body2" fontWeight="bold">{avgPhysicalProgress}%</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={avgPhysicalProgress} 
                    sx={{ height: 8, borderRadius: 4, bgcolor: 'action.hover' }} 
                    color="success"
                  />
                </Box>
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" fontWeight="bold">Time Progress</Typography>
                    <Typography variant="body2" fontWeight="bold">{avgTimeProgress}%</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={avgTimeProgress} 
                    sx={{ height: 8, borderRadius: 4, bgcolor: 'action.hover' }} 
                    color="primary"
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2} display="flex" alignItems="center" gap={1}>
                <PieChart size={20} />
                Project Status Distribution
              </Typography>
              <Stack spacing={1}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box sx={{ width: 12, height: 12, bgcolor: 'success.main', borderRadius: '50%' }}></Box>
                    <Typography variant="body2">Active</Typography>
                  </Box>
                  <Typography variant="body2" fontWeight="bold">{activeProjects}</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.round((activeProjects / totalProjects) * 100) || 0} 
                  sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover' }} 
                  color="success"
                />
                
                <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box sx={{ width: 12, height: 12, bgcolor: 'warning.main', borderRadius: '50%' }}></Box>
                    <Typography variant="body2">Upcoming</Typography>
                  </Box>
                  <Typography variant="body2" fontWeight="bold">{upcomingProjects}</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.round((upcomingProjects / totalProjects) * 100) || 0} 
                  sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover' }} 
                  color="warning"
                />
                
                <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box sx={{ width: 12, height: 12, bgcolor: 'info.main', borderRadius: '50%' }}></Box>
                    <Typography variant="body2">Completed</Typography>
                  </Box>
                  <Typography variant="body2" fontWeight="bold">{completedProjects}</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.round((completedProjects / totalProjects) * 100) || 0} 
                  sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover' }} 
                  color="info"
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Action Bar */}
      <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden', bgcolor: 'background.paper', mb: 4 }}>
        <Box p={2} borderBottom="1px solid" borderColor="divider" display="flex" flexDirection={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" gap={2} bgcolor="action.hover">
          <Typography variant="subtitle1" fontWeight="bold" color="text.primary">Project Directory</Typography>
          <Box display="flex" gap={2} alignItems="center" width={{ xs: '100%', sm: 'auto' }}>
            <Box sx={{ position: 'relative', flex: 1 }}>
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
                  width: '100%',
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
                    </Box>
                  </Paper>


                  
                  {/* Project Grid */}
                  <Grid container spacing={3}>
                    {filteredProjects.map(project => {
                      const physProgress = calculateProgress(project.boq);
                      const timeProgress = calculateTimeProgress(project.startDate, project.endDate);
                      const status = getProjectStatus(project.startDate, project.endDate);
            
                      return (
                        <Grid item xs={12} md={6} lg={4} key={project.id}>
                          <Card 
                            sx={{ 
                              height: '100%', 
                              transition: 'all 0.2s', 
                              '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 24px rgba(0,0,0,0.1)', borderColor: 'primary.main' },
                              borderRadius: 4
                            }} 
                            variant="outlined"
                          >
                            <CardContent sx={{ p: 3 }}>
                              <Box display="flex" justifyContent="space-between" mb={2} alignItems="flex-start">
                                <Box display="flex" alignItems="center" gap={2}>
                                  <Avatar 
                                    src={project.logo} 
                                    variant="rounded" 
                                    sx={{ width: 56, height: 56, bgcolor: 'primary.lighter', color: 'primary.main', fontWeight: 'bold' }}
                                    onClick={() => handleSelectProject(project.id)}
                                  >
                                    {project.name.charAt(0)}
                                  </Avatar>
                                  <Box onClick={() => handleSelectProject(project.id)} style={{ cursor: 'pointer' }}>
                                    <Typography variant="subtitle1" fontWeight="900" sx={{ mb: 0.5 }} noWrap>{project.name}</Typography>
                                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                                      <Typography variant="caption" sx={{ fontWeight: 'bold', px: 1, bgcolor: 'action.hover', borderRadius: 1, color: 'text.secondary' }}>{project.code}</Typography>
                                      <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                                        <MapPin size={10}/> {project.location}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </Box>
                                <Box>
                                  <Chip 
                                    label={status.label} 
                                    size="small" 
                                    sx={{ bgcolor: 'info.main', color: 'info.contrastText', fontWeight: 800, fontSize: 10, borderRadius: '6px', mb: 1 }} 
                                    icon={status.icon}
                                  />
                                  {userRole === UserRole.ADMIN || userRole === UserRole.PROJECT_MANAGER ? (
                                    <IconButton 
                                      size="small" 
                                      onClick={(e) => {
                                        e.stopPropagation();
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
                                              handleDeleteProject(project.id);
                                            }
                                        }
                                      }}
                                      color="error"
                                    >
                                      <Trash2 size={16} />
                                    </IconButton>
                                  ) : null}
                                </Box>
                              </Box>
                              
                              <Typography variant="subtitle1" fontWeight="900" sx={{ mb: 0.5 }} noWrap>{project.name}</Typography>
                              <Box display="flex" alignItems="center" gap={1} mb={2}>
                                <Typography variant="caption" sx={{ fontWeight: 'bold', px: 1, bgcolor: 'action.hover', borderRadius: 1, color: 'text.secondary' }}>{project.code}</Typography>
                                <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                                  <MapPin size={10}/> {project.location}
                                </Typography>
                              </Box>
            
                              <Box display="flex" alignItems="center" gap={1} mb={2}>
                                <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                                  <Users size={10}/> {project.agencies?.length || 0} Agencies
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={0.5} ml={1}>
                                  <FileText size={10}/> {project.boq?.length || 0} BOQ Items
                                </Typography>
                              </Box>
            
                              <Stack spacing={2}>
                                <Box>
                                  <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography variant="caption" fontWeight="900" color="text.secondary">Physical Progress</Typography>
                                    <Typography variant="caption" fontWeight="900" color="success.main">{physProgress}%</Typography>
                                  </Box>
                                  <LinearProgress variant="determinate" value={physProgress} sx={{ height: 8, borderRadius: 4, bgcolor: 'action.hover' }} color="success" />
                                </Box>
            
                                <Box>
                                  <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography variant="caption" fontWeight="900" color="text.secondary">Timeline</Typography>
                                    <Typography variant="caption" fontWeight="900" color="primary.main">{timeProgress}%</Typography>
                                  </Box>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={timeProgress} 
                                    sx={{ height: 8, borderRadius: 4, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: timeProgress > physProgress ? 'error.main' : 'primary.main' } }} 
                                  />
                                </Box>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
            

      {filteredProjects.length === 0 && (
        <Box textAlign="center" p={8} bgcolor="background.paper" borderRadius={4} border="1px dashed" borderColor="divider">
          <Typography variant="h5" fontWeight="800" color="text.primary">No Projects Found</Typography>
          <Typography variant="body1" color="text.secondary" mt={1} mb={3}>
            No projects match your search criteria.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default PortfolioDashboard;
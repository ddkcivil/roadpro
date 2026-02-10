import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Project, UserRole, ProjectDocument, SitePhoto, DailyReport } from '../../types';
import { ocrService } from '../../services/ai/ocrService';
import { analyzeSitePhoto } from '../../services/ai/geminiService';
import { offlineManager } from '../../utils/data/offlineUtils';
import { fetchWeather } from '../../services/analytics/weatherService';
import { formatCurrency } from '../../utils/formatting/exportUtils';
import { 
    Box, Typography, Button, Grid, Card, CardMedia, CardContent, 
    IconButton, Stack, Chip, Dialog, DialogTitle, DialogContent, 
    DialogActions, TextField, MenuItem, Select, FormControl, 
    InputLabel, Paper, LinearProgress, Tooltip, Avatar, Divider, Alert,
    InputAdornment, Table, TableHead, TableRow, TableCell, TableBody,
    Tabs, Tab, Breadcrumbs, Link, List, ListItem, ListItemButton, 
    ListItemIcon, ListItemText, ToggleButtonGroup, ToggleButton
} from '@mui/material';
import { 
    FileText, Upload, Search, Filter, Camera, Trash2, 
    Calendar, MapPin, X, Plus, Folder, MoreVertical, ExternalLink,
    Briefcase, Receipt, ImageIcon, CheckCircle, Tag, Sparkles,
    User, Mail, ArrowDownLeft, ArrowUpRight, UploadCloud, File,
    Loader2, HardHat, History, Wifi, WifiOff, CloudSun, RefreshCw,
    Thermometer, CloudRain, Sun, Cloud, Wind, Eye, Truck, Package,
    HelpCircle, FileSpreadsheet, TrendingUp, AlertTriangle, BookOpen
} from 'lucide-react';

interface Props {
  project: Project;
  userRole: UserRole;
  onProjectUpdate: (project: Project) => void;
}

const DocumentationHub: React.FC<Props> = ({ project, userRole, onProjectUpdate }) => {
  const [activeTab, setActiveTab] = useState(0);
  
  // === DOCUMENT MANAGEMENT STATE ===
  const [documents, setDocuments] = useState<ProjectDocument[]>(project.documents || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [folderFilter, setFolderFilter] = useState('All');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ProjectDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // === SITE PHOTOS STATE ===
  const [photos, setPhotos] = useState<SitePhoto[]>(project.sitePhotos || []);
  const [photoCategoryFilter, setPhotoCategoryFilter] = useState('All');
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<SitePhoto | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  // === DAILY REPORTS STATE ===
  const [dailyReports, setDailyReports] = useState<DailyReport[]>(project.dailyReports || []);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [weather, setWeather] = useState('Sunny');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // === MPR REPORTS STATE ===
  const [mprMonth, setMprMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  
  // === CONSTANTS ===
  const FOLDERS = ['General', 'Contracts', 'Drawings', 'Reports', 'Correspondence', 'Financials', 'Sub-Docs'];
  const PHOTO_CATEGORIES = ['General', 'Earthwork', 'Structures', 'Pavement', 'Safety'];

  // === EFFECTS ===
  useEffect(() => {
    // Update online status
    const handleOnlineStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);
    return () => {
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
    };
  }, []);

  // === COMPUTED VALUES ===
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFolder = folderFilter === 'All' || doc.folder === folderFilter;
      return matchesSearch && matchesFolder;
    });
  }, [documents, searchTerm, folderFilter]);

  const filteredPhotos = useMemo(() => {
    return photos.filter(photo => {
      const matchesCategory = photoCategoryFilter === 'All' || photo.category === photoCategoryFilter;
      return matchesCategory;
    });
  }, [photos, photoCategoryFilter]);

  const documentStats = useMemo(() => ({
    total: documents.length,
    contracts: documents.filter(d => d.folder === 'Contracts').length,
    drawings: documents.filter(d => d.folder === 'Drawings').length,
    reports: documents.filter(d => d.folder === 'Reports').length
  }), [documents]);

  const photoStats = useMemo(() => ({
    total: photos.length,
    today: photos.filter(p => new Date(p.date).toDateString() === new Date().toDateString()).length,
    earthwork: photos.filter(p => p.category === 'Earthwork').length,
    structures: photos.filter(p => p.category === 'Structures').length
  }), [photos]);

  // === HANDLERS ===
  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const newDoc: ProjectDocument = {
          id: `doc-${Date.now()}-${i}`,
          name: file.name,
          type: file.type,
          size: file.size,
          uploadDate: new Date().toISOString(),
          uploadedBy: 'CurrentUser',
          folder: 'General',
          fileUrl: base64,
          description: '',
          versions: [],
          comments: []
        };
        
        const updatedDocs = [...documents, newDoc];
        setDocuments(updatedDocs);
        // Update project
        onProjectUpdate({ ...project, documents: updatedDocs });
      };
      
      reader.readAsDataURL(file);
    }
    
    setIsUploadModalOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const newPhoto: SitePhoto = {
          id: `photo-${Date.now()}-${i}`,
          url: base64,
          caption: file.name,
          date: new Date().toISOString(),
          location: 'Site Location',
          category: 'General',
          uploadedBy: 'CurrentUser',
          tags: []
        };
        
        const updatedPhotos = [...photos, newPhoto];
        setPhotos(updatedPhotos);
        // Update project
        onProjectUpdate({ ...project, sitePhotos: updatedPhotos });
      };
      
      reader.readAsDataURL(file);
    }
    
    setIsPhotoModalOpen(false);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handlePhotoAnalysis = async (photo: SitePhoto) => {
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeSitePhoto(photo.url);
      setPreviewPhoto({ ...photo, caption: `${photo.caption}\n\nAI Analysis: ${analysis}` });
    } catch (error) {
      console.error('Photo analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFetchWeather = async () => {
    try {
      const weatherData = await fetchWeather(project.location?.latitude || 0, project.location?.longitude || 0);
      setWeather(weatherData.condition);
    } catch (error) {
      console.error('Weather fetch failed:', error);
    }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 140px)', overflowY: 'auto', p: 2 }}>
      <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
        <Box>
          <Typography variant="h5" fontWeight="900">Documentation Hub</Typography>
          <Typography variant="body2" color="text.secondary">
            Unified document, photo, and reporting management
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button 
            variant="outlined" 
            startIcon={<Upload size={16}/>} 
            onClick={() => setIsUploadModalOpen(true)}
          >
            Upload Document
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<Camera size={16}/>} 
            onClick={() => setIsPhotoModalOpen(true)}
          >
            Add Photo
          </Button>
          <Button 
            variant="contained" 
            startIcon={<FileText size={16}/>} 
            onClick={() => setActiveTab(2)}
          >
            New Report
          </Button>
        </Box>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`Documents (${documents.length})`} icon={<Folder size={16} />} iconPosition="start" />
          <Tab label={`Site Photos (${photos.length})`} icon={<ImageIcon size={16} />} iconPosition="start" />
          <Tab label="Daily Reports" icon={<FileText size={16} />} iconPosition="start" />
          <Tab label="MPR Reports" icon={<FileSpreadsheet size={16} />} iconPosition="start" />
        </Tabs>

        <Box p={3}>
          {/* Documents Tab */}
          {activeTab === 0 && (
            <Box>
              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="primary.main" fontWeight="bold">
                        {documentStats.total}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Documents
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="success.main" fontWeight="bold">
                        {documentStats.contracts}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Contracts
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="info.main" fontWeight="bold">
                        {documentStats.drawings}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Drawings
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="warning.main" fontWeight="bold">
                        {documentStats.reports}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Reports
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      placeholder="Search documents..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      InputProps={{
                        startAdornment: <Search size={18} style={{ marginRight: 8 }} />
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Folder</InputLabel>
                      <Select
                        value={folderFilter}
                        label="Folder"
                        onChange={(e) => setFolderFilter(e.target.value)}
                      >
                        <MenuItem value="All">All Folders</MenuItem>
                        {FOLDERS.map(folder => (
                          <MenuItem key={folder} value={folder}>{folder}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Upload size={16} />}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload Files
                    </Button>
                  </Grid>
                </Grid>
              </Paper>

              <Paper variant="outlined" sx={{ borderRadius: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'slate.50' }}>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Document</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Folder</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Size</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Uploaded</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredDocuments.map(doc => (
                      <TableRow key={doc.id} hover>
                        <TableCell>
                          <Stack direction="column" spacing={0.5}>
                            <Typography variant="body2" fontWeight="bold">
                              {doc.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {doc.description || 'No description'}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={doc.folder} 
                            size="small" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {(doc.size / 1024 / 1024).toFixed(2)} MB
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(doc.uploadDate).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small">
                            <ExternalLink size={16} />
                          </IconButton>
                          <IconButton size="small" color="error">
                            <Trash2 size={16} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </Box>
          )}

          {/* Site Photos Tab */}
          {activeTab === 1 && (
            <Box>
              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="primary.main" fontWeight="bold">
                        {photoStats.total}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Photos
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="success.main" fontWeight="bold">
                        {photoStats.today}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Today
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="warning.main" fontWeight="bold">
                        {photoStats.earthwork}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Earthwork
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h4" color="info.main" fontWeight="bold">
                        {photoStats.structures}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Structures
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={photoCategoryFilter}
                        label="Category"
                        onChange={(e) => setPhotoCategoryFilter(e.target.value)}
                      >
                        <MenuItem value="All">All Categories</MenuItem>
                        {PHOTO_CATEGORIES.map(cat => (
                          <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<Camera size={16} />}
                      onClick={() => photoInputRef.current?.click()}
                    >
                      Add Photos
                    </Button>
                  </Grid>
                </Grid>
              </Paper>

              <Grid container spacing={2}>
                {filteredPhotos.map(photo => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={photo.id}>
                    <Card variant="outlined">
                      <CardMedia
                        component="img"
                        height="140"
                        image={photo.url}
                        alt={photo.caption}
                      />
                      <CardContent>
                        <Typography variant="body2" fontWeight="bold" gutterBottom>
                          {photo.caption}
                        </Typography>
                        <Stack direction="row" spacing={1} mb={1}>
                          <Chip 
                            label={photo.category} 
                            size="small" 
                            variant="outlined"
                          />
                          <Chip 
                            label={new Date(photo.date).toLocaleDateString()} 
                            size="small" 
                            variant="outlined"
                          />
                        </Stack>
                        <Button
                          fullWidth
                          size="small"
                          variant="outlined"
                          startIcon={<Eye size={16} />}
                          onClick={() => {
                            setPreviewPhoto(photo);
                            setIsPhotoModalOpen(true);
                          }}
                        >
                          View Details
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Daily Reports Tab */}
          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" mb={2}>Daily Site Reports</Typography>
              <Paper variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Report Date"
                      type="date"
                      value={reportDate}
                      onChange={(e) => setReportDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Weather</InputLabel>
                      <Select
                        value={weather}
                        label="Weather"
                        onChange={(e) => setWeather(e.target.value)}
                      >
                        <MenuItem value="Sunny">Sunny</MenuItem>
                        <MenuItem value="Cloudy">Cloudy</MenuItem>
                        <MenuItem value="Rainy">Rainy</MenuItem>
                        <MenuItem value="Partly Cloudy">Partly Cloudy</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      startIcon={<Plus size={16} />}
                    >
                      Add Work Item
                    </Button>
                  </Grid>
                </Grid>
                
                <Box mt={3}>
                  <Typography variant="h6" gutterBottom>Recent Reports</Typography>
                  <Typography color="text.secondary">
                    Daily report functionality would be implemented here with work item tracking,
                    material consumption, visitor logs, and weather integration.
                  </Typography>
                </Box>
              </Paper>
            </Box>
          )}

          {/* MPR Reports Tab */}
          {activeTab === 3 && (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Monthly Progress Reports</Typography>
                <Button
                  variant="contained"
                  startIcon={<FileSpreadsheet size={16} />}
                  onClick={() => setIsExportDialogOpen(true)}
                >
                  Generate MPR
                </Button>
              </Box>
              
              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Report Month"
                    type="month"
                    value={mprMonth}
                    onChange={(e) => setMprMonth(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<RefreshCw size={16} />}
                    onClick={() => {}}
                  >
                    Refresh Data
                  </Button>
                </Grid>
              </Grid>

              <Paper variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
                <Typography variant="h6" gutterBottom>MPR Overview</Typography>
                <Typography color="text.secondary" mb={2}>
                  Comprehensive monthly progress reporting with financial summaries,
                  physical progress tracking, and project analytics.
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" color="primary.main">
                          ₹{formatCurrency(15000000)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Original Contract Value
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" color="success.main">
                          65%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Physical Progress
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" color="info.main">
                          ₹{formatCurrency(9750000)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Progress Value
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" color="warning.main">
                          35%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Remaining Work
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Paper>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleDocumentUpload}
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
      />
      <input
        type="file"
        ref={photoInputRef}
        style={{ display: 'none' }}
        onChange={handlePhotoUpload}
        multiple
        accept="image/*"
      />

      {/* Photo Preview Modal */}
      <Dialog open={!!previewPhoto} onClose={() => setPreviewPhoto(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          Photo Details
          <IconButton
            aria-label="close"
            onClick={() => setPreviewPhoto(null)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {previewPhoto && (
            <Box>
              <img
                src={previewPhoto.url}
                alt={previewPhoto.caption}
                style={{ width: '100%', borderRadius: 8, marginBottom: 16 }}
              />
              <Typography variant="h6" gutterBottom>{previewPhoto.caption}</Typography>
              <Stack direction="row" spacing={1} mb={2}>
                <Chip label={previewPhoto.category} variant="outlined" />
                <Chip label={new Date(previewPhoto.date).toLocaleDateString()} variant="outlined" />
              </Stack>
              <Button
                variant="outlined"
                startIcon={isAnalyzing ? <Loader2 size={16} /> : <Sparkles size={16} />}
                onClick={() => handlePhotoAnalysis(previewPhoto)}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? 'Analyzing...' : 'AI Analysis'}
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default DocumentationHub;
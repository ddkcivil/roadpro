import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Project, UserRole, ProjectDocument, SitePhoto, DailyReport } from '../../types';
import { ocrService } from '../../services/ai/ocrService';
import { analyzeSitePhoto } from '../../services/ai/geminiService';
import { offlineManager } from '../../utils/data/offlineUtils';
import { fetchWeather } from '../../services/analytics/weatherService';
import { formatCurrency } from '../../utils/formatting/exportUtils';
import { 
    FileText, Upload, Search, Filter, Camera, Trash2, 
    Calendar, MapPin, X, Plus, Folder, MoreVertical, ExternalLink,
    Briefcase, Receipt, ImageIcon, CheckCircle, Tag, Sparkles,
    User, Mail, ArrowDownLeft, ArrowUpRight, UploadCloud, File,
    Loader2, HardHat, History, Wifi, WifiOff, CloudSun, RefreshCw,
    Thermometer, CloudRain, Sun, Cloud, Wind, Eye, Truck, Package,
    HelpCircle, FileSpreadsheet, TrendingUp, AlertTriangle, BookOpen,
    Printer
} from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { Separator } from '~/components/ui/separator';
import { Badge } from '~/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { Progress } from '~/components/ui/progress';
import { cn } from '~/lib/utils';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";




interface Props {
  project: Project;
  userRole: UserRole;
  onProjectUpdate: (project: Project) => void;
}

const DocumentationHub: React.FC<Props> = ({ project, userRole, onProjectUpdate }) => {
  const [activeTab, setActiveTab] = useState("documents");

  if (!project) {
    return (
      <div className="p-8 text-center">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Project data not available. Please select a project first.</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // === DOCUMENT MANAGEMENT STATE ===
  const [documents, setDocuments] = useState<ProjectDocument[]>(project?.documents || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [folderFilter, setFolderFilter] = useState('All');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newDocument, setNewDocument] = useState({ name: '', description: '', folder: 'General' });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
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
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
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
    return (project.documents || []).filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFolder = folderFilter === 'All' || doc.folder === folderFilter;
      return matchesSearch && matchesFolder;
    });
  }, [project.documents, searchTerm, folderFilter]);

  const filteredPhotos = useMemo(() => {
    return (project.sitePhotos || []).filter(photo => {
      const matchesCategory = photoCategoryFilter === 'All' || photo.category === photoCategoryFilter;
      return matchesCategory;
    });
  }, [project.sitePhotos, photoCategoryFilter]);

  const documentStats = useMemo(() => ({
    total: project.documents?.length || 0,
    contracts: project.documents?.filter(d => d.folder === 'Contracts').length || 0,
    drawings: project.documents?.filter(d => d.folder === 'Drawings').length || 0,
    reports: project.documents?.filter(d => d.folder === 'Reports').length || 0
  }), [project.documents]);

  const photoStats = useMemo(() => ({
    total: project.sitePhotos?.length || 0,
    today: project.sitePhotos?.filter(p => new Date(p.date).toDateString() === new Date().toDateString()).length || 0,
    earthwork: project.sitePhotos?.filter(p => p.category === 'Earthwork').length || 0,
    structures: project.sitePhotos?.filter(p => p.category === 'Structures').length || 0
  }), [project.sitePhotos]);


  // === HANDLERS ===
  const handleDocumentUpload = async () => {
    if (!uploadFile) return;

    const file = uploadFile;
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const newDoc: ProjectDocument = {
        id: `doc-${Date.now()}`,
        name: newDocument.name || file.name,
        type: file.type,
        date: new Date().toISOString(), // Scanning date
        size: String(file.size),
        folder: newDocument.folder,
        subject: newDocument.name || file.name,
        uploadDate: new Date().toISOString(),
        uploadedBy: userRole, // Assuming userRole can be used as uploadedBy
        tags: [],
        fileUrl: base64,
        description: newDocument.description,
        currentVersion: 1,
        versions: [],
        createdBy: userRole.toString(),
        lastModified: new Date().toISOString(),
        status: 'Active',
        comments: []
      };
      
      const updatedDocs = [...(project.documents || []), newDoc];
      onProjectUpdate({ ...project, documents: updatedDocs });
      setNewDocument({ name: '', description: '', folder: 'General' });
      setUploadFile(null);
      setIsUploadModalOpen(false);
    };
    
    reader.readAsDataURL(file);
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
          location: 'Site Location', // Placeholder or use project.location
          category: 'General',
          uploadedBy: userRole,
          isAnalyzed: false
        };
        
        const updatedPhotos = [...(project.sitePhotos || []), newPhoto];
        onProjectUpdate({ ...project, sitePhotos: updatedPhotos });
      };
      
      reader.readAsDataURL(file);
    }
    
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handlePhotoAnalysis = async (photo: SitePhoto) => {
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeSitePhoto(photo.url, photo.category || 'General');
      setPreviewPhoto({ ...photo, caption: `${photo.caption}\n\nAI Analysis: ${analysis}` });
    } catch (error) {
      console.error('Photo analysis failed:', error);
      alert('AI Photo analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFetchWeather = async () => {
    setIsFetchingWeather(true);
    try {
      const lat = project.staffLocations?.[0]?.latitude || 27.6600; // Placeholder lat
      const lng = project.staffLocations?.[0]?.longitude || 83.4650; // Placeholder lng
      const weatherData = await fetchWeather(lat, lng);
      setWeather(weatherData.condition);
    } catch (error) {
      console.error('Weather fetch failed:', error);
      alert('Failed to fetch weather data. Please try again later.');
    } finally {
      setIsFetchingWeather(false);
    }
  };

  const handleDownloadDocument = (doc: ProjectDocument) => {
    if (doc.fileUrl) {
      const link = document.createElement('a');
      link.href = doc.fileUrl;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDeleteDocument = (id: string) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      const updatedDocuments = project.documents?.filter(doc => doc.id !== id) || [];
      onProjectUpdate({ ...project, documents: updatedDocuments });
    }
  };

  const handleDeletePhoto = (id: string) => {
    if (window.confirm('Are you sure you want to delete this photo?')) {
      const updatedPhotos = project.sitePhotos?.filter(photo => photo.id !== id) || [];
      onProjectUpdate({ ...project, sitePhotos: updatedPhotos });
    }
  };
  
  const handleExportMPR = () => {
    // Placeholder for MPR export logic
    alert('MPR export functionality is not yet implemented.');
  };



  return (
    <div className="p-4 h-[calc(100vh-140px)] overflow-y-auto">
      <div className="flex justify-between mb-4 items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documentation Hub</h1>
          <p className="text-sm text-muted-foreground">Unified document, photo, and reporting management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsUploadModalOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Upload Document
          </Button>
          <Button variant="outline" onClick={() => setIsPhotoModalOpen(true)}>
            <Camera className="mr-2 h-4 w-4" /> Add Photo
          </Button>
          <Button onClick={() => setActiveTab("daily-reports")}>
            <FileText className="mr-2 h-4 w-4" /> New Daily Report
          </Button>
        </div>
      </div>

      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 h-12">
            <TabsTrigger value="documents">
              <Folder className="mr-2 h-4 w-4" /> Documents ({documents.length})
            </TabsTrigger>
            <TabsTrigger value="site-photos">
              <ImageIcon className="mr-2 h-4 w-4" /> Site Photos ({photos.length})
            </TabsTrigger>
            <TabsTrigger value="daily-reports">
              <BookOpen className="mr-2 h-4 w-4" /> Daily Reports ({dailyReports.length})
            </TabsTrigger>
            <TabsTrigger value="mpr-reports">
              <FileSpreadsheet className="mr-2 h-4 w-4" /> MPR Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <Card>
                <CardContent>
                  <h3 className="text-sm font-semibold text-muted-foreground">Total Documents</h3>
                  <p className="text-2xl font-bold">{documentStats.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <h3 className="text-sm font-semibold text-muted-foreground">Contracts</h3>
                  <p className="text-2xl font-bold">{documentStats.contracts}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <h3 className="text-sm font-semibold text-muted-foreground">Drawings</h3>
                  <p className="text-2xl font-bold">{documentStats.drawings}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <h3 className="text-sm font-semibold text-muted-foreground">Reports</h3>
                  <p className="text-2xl font-bold">{documentStats.reports}</p>
                </CardContent>
              </Card>
            </div>
            
            <Card className="mb-4">
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="relative w-full sm:w-auto flex-grow">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search documents..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
                <div className="w-full sm:w-auto">
                  <Select value={folderFilter} onValueChange={setFolderFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Folders" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Folders</SelectItem>
                      {FOLDERS.map(folder => (
                        <SelectItem key={folder} value={folder}>{folder}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px] w-full rounded-md border">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead>Document</TableHead>
                        <TableHead>Folder</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocuments.length > 0 ? filteredDocuments.map(doc => (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <p className="font-semibold">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">{doc.description || 'No description'}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{doc.folder}</Badge>
                          </TableCell>
                          <TableCell>{(parseInt(doc.size) / 1024 / 1024).toFixed(2)} MB</TableCell>
                          <TableCell>{new Date(doc.uploadDate).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Document</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete Document</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <File className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                            <p>No documents found.</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="site-photos" className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <Card>
                <CardContent>
                  <h3 className="text-sm font-semibold text-muted-foreground">Total Photos</h3>
                  <p className="text-2xl font-bold">{photoStats.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <h3 className="text-sm font-semibold text-muted-foreground">Today</h3>
                  <p className="text-2xl font-bold">{photoStats.today}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <h3 className="text-sm font-semibold text-muted-foreground">Earthwork</h3>
                  <p className="text-2xl font-bold">{photoStats.earthwork}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <h3 className="text-sm font-semibold text-muted-foreground">Structures</h3>
                  <p className="text-2xl font-bold">{photoStats.structures}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-4">
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <Select value={photoCategoryFilter} onValueChange={setPhotoCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-auto">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Categories</SelectItem>
                    {PHOTO_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  className="w-full sm:w-auto"
                  onClick={() => photoInputRef.current?.click()}
                >
                  <Camera className="mr-2 h-4 w-4" /> Add Photos
                </Button>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPhotos.length > 0 ? filteredPhotos.map(photo => (
                <Card key={photo.id} className="cursor-pointer" onClick={() => { setPreviewPhoto(photo); setIsPhotoModalOpen(true); }}>
                  <img
                    src={photo.url}
                    alt={photo.caption}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                  <CardContent className="p-4">
                    <p className="font-semibold mb-1">{photo.caption}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" /> {new Date(photo.date).toLocaleDateString()}
                      <MapPin className="h-3 w-3 ml-2" /> {photo.location}
                      <Badge variant="secondary" className="ml-auto">{photo.category}</Badge>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <div className="col-span-full text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No site photos found.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="daily-reports" className="p-4">
            <div className="flex justify-between mb-4 items-center">
              <div>
                <h2 className="text-lg font-bold">Daily Site Reports</h2>
                <p className="text-sm text-muted-foreground">Track daily activities, resources, and progress.</p>
              </div>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New Report
              </Button>
            </div>
            
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px] w-full rounded-md border">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Weather</TableHead>
                        <TableHead>Work Items</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyReports.length > 0 ? dailyReports.map(report => (
                        <TableRow key={report.id}>
                          <TableCell>
                            <p className="font-semibold">{report.date}</p>
                            <p className="text-xs text-muted-foreground">{report.submittedBy}</p>
                          </TableCell>
                          <TableCell>
                            {report.weather === 'Sunny' && <Sun className="h-4 w-4" />}
                            {report.weather === 'Cloudy' && <Cloud className="h-4 w-4" />}
                            {report.weather === 'Rainy' && <CloudRain className="h-4 w-4" />}
                            <p className="text-xs text-muted-foreground">{report.weather}</p>
                          </TableCell>
                          <TableCell>
                            <ul className="list-disc list-inside text-sm">
                              {report.workItems.map((item, idx) => <li key={idx}>{item.description} ({item.quantity})</li>)}
                            </ul>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{report.remarks?.substring(0, 50) || '...'}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon"><Printer className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No daily reports found.</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mpr-reports" className="p-4">
            <div className="flex justify-between mb-4 items-center">
              <div>
                <h2 className="text-lg font-bold">Monthly Progress Reports</h2>
                <p className="text-sm text-muted-foreground">Generate comprehensive monthly reports.</p>
              </div>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Generate MPR
              </Button>
            </div>
            <Alert>
              <AlertTitle>MPR Generation</AlertTitle>
              <AlertDescription>
                Monthly Progress Report generation functionality will be implemented here.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Upload Document Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload New Document</DialogTitle>
            <DialogDescription>Attach files relevant to the project documentation.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="documentName">Document Name</Label>
              <Input id="documentName" value={newDocument.name} onChange={e => setNewDocument({...newDocument, name: e.target.value})} placeholder="e.g. Contract Agreement_Phase1" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="documentDescription">Description (Optional)</Label>
              <Input id="documentDescription" value={newDocument.description} onChange={e => setNewDocument({...newDocument, description: e.target.value})} placeholder="Brief description of the document" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="documentFolder">Folder</Label>
              <Select value={newDocument.folder} onValueChange={value => setNewDocument({...newDocument, folder: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Folder" />
                </SelectTrigger>
                <SelectContent>
                  {FOLDERS.map(folder => <SelectItem key={folder} value={folder}>{folder}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fileInput">Select File</Label>
              <Input id="fileInput" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>Cancel</Button>
            <Button onClick={handleDocumentUpload}>Upload Document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Photo Preview Modal */}
      <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Site Photo Details</DialogTitle>
            <DialogDescription>View photo and AI analysis.</DialogDescription>
          </DialogHeader>
          {previewPhoto && (
            <div className="py-4">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.caption}
                className="w-full h-auto object-cover rounded-lg mb-4"
              />
              <p className="font-semibold mb-2">{previewPhoto.caption}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" /> {new Date(previewPhoto.date).toLocaleDateString()}
                <MapPin className="h-4 w-4" /> {previewPhoto.location}
                <Badge variant="secondary" className="ml-auto">{previewPhoto.category}</Badge>
              </div>
              <Separator className="my-4" />
              <Button onClick={() => handlePhotoAnalysis(previewPhoto)} disabled={isAnalyzing}>
                {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                AI Analyze Photo
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsPhotoModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentationHub;

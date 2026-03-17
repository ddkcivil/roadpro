import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Project, UserRole, ProjectDocument, SitePhoto, DailyReport } from '../../types';
import { analyzeSitePhoto } from '../../services/ai/geminiService';

// Dynamically load PDF components when needed
interface PdfComponents {
  Document: any;
  Page: any;
  pdfjs: any;
}
import { 
    FileText, Upload, Search, Camera, Trash2, 
    Calendar, MapPin, X, Plus, Folder, ExternalLink,
    ImageIcon, Sparkles, File, Loader2, Sun, Cloud,
    FileSpreadsheet, AlertTriangle, BookOpen, Printer,
    Eye, CloudRain
} from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
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
import { ScrollArea } from '~/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  onNavigate?: (tab: string) => void;
}

const DocumentationHub: React.FC<Props> = ({ project, userRole, onProjectUpdate, onNavigate }) => {
  const [pdfComponents, setPdfComponents] = useState<PdfComponents | null>(null);
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
  
  // === LOCAL COPIES FOR UI ===
  const documents = project.documents || [];
  const photos = project.sitePhotos || [];
  const dailyReports = project.dailyReports || [];

  // === DOCUMENT MANAGEMENT STATE ===
  const [searchTerm, setSearchTerm] = useState('');
  const [folderFilter, setFolderFilter] = useState('All');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newDocument, setNewDocument] = useState({ name: '', description: '', folder: 'General' });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  
  // === SITE PHOTOS STATE ===
  const [photoCategoryFilter, setPhotoCategoryFilter] = useState('All');
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<SitePhoto | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  // === DOCUMENT PREVIEW STATE ===
  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState(1.0);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // === CONSTANTS ===
  const FOLDERS = ['General', 'Contracts', 'Drawings', 'Reports', 'Correspondence', 'Financials', 'Sub-Docs'];
  const PHOTO_CATEGORIES = ['General', 'Earthwork', 'Structures', 'Pavement', 'Safety'];

  // === EFFECTS ===
  const [blobUrls, setBlobUrls] = useState<Record<string, string>>({});

  const getFileUrl = useCallback((doc: ProjectDocument): string => {
    if (!doc.fileUrl) return '';
    
    if (blobUrls[doc.id]) return blobUrls[doc.id];
    
    // Direct data URLs can be very large and slow for PDF.js to parse sometimes, 
    // but converting to Blob URL usually helps.
    if (doc.fileUrl.startsWith('data:application/pdf') || doc.fileUrl.startsWith('data:image/')) {
      try {
        const parts = doc.fileUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
        const b64Data = parts[1];
        const byteCharacters = atob(b64Data);
        const byteArrays = [];

        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
          const slice = byteCharacters.slice(offset, offset + 512);
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }

        const blob = new Blob(byteArrays, { type: mime });
        const url = URL.createObjectURL(blob);
        setBlobUrls(prev => ({ ...prev, [doc.id]: url }));
        return url;
      } catch (error) {
        console.error('Error converting base64 to blob URL:', error);
        return doc.fileUrl;
      }
    }
    
    return doc.fileUrl;
  }, [blobUrls]);

  useEffect(() => {
    const loadPdfComponents = async () => {
      try {
        const pdfModule = await import('react-pdf');
        const pdfjs = pdfModule.pdfjs;
        
        if (pdfjs && pdfjs.GlobalWorkerOptions) {
          // Prioritize local worker as it's guaranteed to be available and less prone to CSP issues.
          pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs-worker/pdf.worker.min.mjs';
        }

        setPdfComponents({
          Document: pdfModule.Document,
          Page: pdfModule.Page,
          pdfjs: pdfjs
        });
      } catch (error) {
        console.warn('Failed to load PDF components:', error);
      }
    };
    loadPdfComponents();

    return () => {
      Object.values(blobUrls).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  const Document = pdfComponents?.Document;
  const Page = pdfComponents?.Page;

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
    today: project.sitePhotos?.filter(p => p.date && new Date(p.date).toDateString() === new Date().toDateString()).length || 0,
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
        date: new Date().toISOString(),
        size: String(file.size),
        folder: newDocument.folder,
        subject: newDocument.name || file.name,
        uploadDate: new Date().toISOString(),
        uploadedBy: userRole,
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
          location: 'Site Location',
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

  const handleDownloadDocument = (doc: ProjectDocument) => {
    const url = getFileUrl(doc);
    if (url) {
      if (url.startsWith('blob:')) {
        window.open(url, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
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
          <Button variant="outline" onClick={() => photoInputRef.current?.click()}>
            <Camera className="mr-2 h-4 w-4" /> Add Photo
          </Button>
          <div className="sr-only">
            <Label htmlFor="photo-upload-input">Select site photo files to upload</Label>
            <Input 
              id="photo-upload-input"
              type="file" 
              ref={photoInputRef} 
              accept="image/*" 
              multiple 
              onChange={handlePhotoUpload} 
              title="Select site photo files to upload"
              placeholder="Select photo files"
            />
          </div>

          <Button onClick={() => onNavigate ? onNavigate('daily-reports') : setActiveTab("daily-reports")}>
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
              <Card className="p-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">Total Documents</h3>
                  <p className="text-2xl font-bold">{documentStats.total}</p>
              </Card>
              <Card className="p-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">Contracts</h3>
                  <p className="text-2xl font-bold">{documentStats.contracts}</p>
              </Card>
              <Card className="p-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">Drawings</h3>
                  <p className="text-2xl font-bold">{documentStats.drawings}</p>
              </Card>
              <Card className="p-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">Reports</h3>
                  <p className="text-2xl font-bold">{documentStats.reports}</p>
              </Card>
            </div>
            
            <Card className="mb-4 p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="relative w-full sm:w-auto flex-grow">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search documents..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                    aria-label="Search documents"
                  />
                </div>
                <div className="w-full sm:w-auto">
                  <Select value={folderFilter} onValueChange={setFolderFilter}>
                    <SelectTrigger className="w-full" aria-label="Filter by folder">
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
              </div>
            </Card>

            <Card className="p-0 overflow-hidden">
                <ScrollArea className="h-[400px] w-full border-none">
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
                          <TableCell>{new Date(doc.uploadDate || Date.now()).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => { setPreviewDoc(doc); setCurrentPage(1); setNumPages(null); setScale(1.0); setPdfError(null); }}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Preview Document</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteDocument(doc.id)}>
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
            </Card>
          </TabsContent>

          <TabsContent value="site-photos" className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <Card className="p-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">Total Photos</h3>
                  <p className="text-2xl font-bold">{photoStats.total}</p>
              </Card>
              <Card className="p-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">Today</h3>
                  <p className="text-2xl font-bold">{photoStats.today}</p>
              </Card>
              <Card className="p-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">Earthwork</h3>
                  <p className="text-2xl font-bold">{photoStats.earthwork}</p>
              </Card>
              <Card className="p-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">Structures</h3>
                  <p className="text-2xl font-bold">{photoStats.structures}</p>
              </Card>
            </div>

            <Card className="mb-4 p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <Select value={photoCategoryFilter} onValueChange={setPhotoCategoryFilter}>
                  <SelectTrigger id="photo-category-filter" className="w-full sm:w-auto" aria-label="Filter by category">
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
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPhotos.length > 0 ? filteredPhotos.map(photo => (
                <Card key={photo.id} className="cursor-pointer overflow-hidden" onClick={() => { setPreviewPhoto(photo); setIsPhotoModalOpen(true); }}>
                  <img
                    src={photo.url}
                    alt={photo.caption || 'Site observation photo'}
                    title={photo.caption || 'View site photo'}
                    className="w-full h-48 object-cover"
                  />
                  <CardContent className="p-4">
                    <p className="font-semibold mb-1 truncate">{photo.caption}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" /> {new Date(photo.date || Date.now()).toLocaleDateString()}
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
              <Button onClick={() => onNavigate ? onNavigate('daily-reports') : setActiveTab("daily-reports")}>
                <Plus className="mr-2 h-4 w-4" /> New Report
              </Button>
            </div>
            
            <Card className="p-0 overflow-hidden">
                <ScrollArea className="h-[400px] w-full border-none">
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
                      {dailyReports.length > 0 ? dailyReports.map((report: DailyReport) => (
                        <TableRow key={report.id}>
                          <TableCell>
                            <p className="font-semibold">{report.date}</p>
                            <p className="text-xs text-muted-foreground">{report.submittedBy}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                                {report.weather === 'Sunny' && <Sun className="h-4 w-4 text-orange-500" />}
                                {report.weather === 'Cloudy' && <Cloud className="h-4 w-4 text-slate-400" />}
                                {report.weather === 'Rainy' && <CloudRain className="h-4 w-4 text-blue-500" />}
                                <span className="text-xs text-muted-foreground">{report.weather}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <ul className="list-disc list-inside text-sm">
                              {(report.workToday || []).map((item, idx) => <li key={idx}>{item.description} ({item.quantity})</li>)}
                            </ul>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{report.remarks?.substring(0, 50) || '...'}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => alert('View report functionality not yet implemented.')}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => alert('Print report functionality not yet implemented.')}>
                              <Printer className="h-4 w-4" />
                            </Button>
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
            </Card>
          </TabsContent>

          <TabsContent value="mpr-reports" className="p-4">
            <div className="flex justify-between mb-4 items-center">
              <div>
                <h2 className="text-lg font-bold">Monthly Progress Reports</h2>
                <p className="text-sm text-muted-foreground">Generate comprehensive monthly reports.</p>
              </div>
              <Button onClick={handleExportMPR}>
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
                <SelectTrigger id="documentFolder">
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
                alt={previewPhoto.caption || 'Site observation photo'}
                title={previewPhoto.caption || 'Site observation photo'}
                className="w-full h-auto object-cover rounded-lg mb-4"
              />
              <p className="font-semibold mb-2">{previewPhoto.caption}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" /> {new Date(previewPhoto.date || Date.now()).toLocaleDateString()}
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
            <Button variant="destructive" onClick={() => { if (previewPhoto) handleDeletePhoto(previewPhoto.id); setIsPhotoModalOpen(false); }}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete Photo
            </Button>
            <Button onClick={() => setIsPhotoModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Preview Modal */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => { if (!open) { setPreviewDoc(null); setNumPages(null); setCurrentPage(1); setScale(1.0); setPdfError(null); } }}>
        <DialogContent className="max-w-[calc(100vw-6rem)] h-[calc(100vh-6rem)] flex flex-col p-0">
          <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <DialogTitle className="text-lg font-bold">{previewDoc?.name}</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => { if (previewDoc) handleDownloadDocument(previewDoc); }}>
                <ExternalLink className="mr-2 h-4 w-4" /> Download
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setPreviewDoc(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            {previewDoc?.fileUrl ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                {(previewDoc.type === 'application/pdf' || previewDoc.fileUrl.toLowerCase().endsWith('.pdf')) ? (
                  <div className="flex-1 w-full flex items-center justify-center overflow-auto">
                    {Document ? (
                      <Document
                        file={getFileUrl(previewDoc)}
                        loading={<div className="text-center text-muted-foreground"><Loader2 className="animate-spin mx-auto mb-2" /> Loading PDF...</div>}
                        error={(error) => {
                          console.error('PDF render error:', error);
                          setPdfError(error?.message || 'Unknown PDF error');
                          return (
                            <div className="flex flex-col items-center justify-center p-4 text-destructive">
                              <FileText className="h-12 w-12 mb-2" />
                              <p>Failed to load PDF</p>
                              <p className="text-sm text-muted-foreground mt-1 text-center">
                                {pdfError || 'The file may be invalid, corrupted, or the PDF worker failed to load.'}
                              </p>
                            </div>
                          );
                        }}
                        onLoadError={(error: Error) => {
                          console.error('PDF load error:', error);
                          setPdfError(error?.message || 'Unknown PDF error');
                        }}
                        onLoadSuccess={({ numPages: totalPages }: { numPages: number }) => { setNumPages(totalPages); setPdfError(null); }}
                      >
                        <Page pageNumber={currentPage} scale={scale} renderTextLayer={false} renderAnnotationLayer={false} />
                      </Document>
                    ) : (
                      <div className="text-center p-4 text-muted-foreground">
                        <Loader2 className="animate-spin mx-auto mb-2" />
                        <p>Initializing PDF viewer...</p>
                      </div>
                    )}
                  </div>
                ) : (previewDoc.type?.includes('image') || ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].some(ext => previewDoc.fileUrl?.toLowerCase().endsWith(ext))) ? (
                  <img
                    src={getFileUrl(previewDoc)}
                    alt={previewDoc.name || 'Document image preview'}
                    title={previewDoc.name || 'Document image preview'}
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="text-center p-4 text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 mb-2" />
                    <p>Preview not available for this file type</p>
                    <p className="text-sm">{previewDoc.name}</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => { if (previewDoc) handleDownloadDocument(previewDoc); }}>
                      <ExternalLink className="mr-2 h-4 w-4" /> Download File
                    </Button>
                  </div>
                )}
                {(previewDoc.type === 'application/pdf' || previewDoc.fileUrl.toLowerCase().endsWith('.pdf')) && numPages && numPages > 1 && (
                  <div className="flex items-center justify-center gap-2 p-2 bg-background/50 border-t w-full">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage <= 1}>
                      Prev
                    </Button>
                    <span className="text-sm text-muted-foreground font-mono">Page {currentPage} of {numPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(numPages, prev + 1))} disabled={currentPage >= numPages}>
                      Next
                    </Button>
                    <Separator orientation="vertical" className="h-6 mx-2" />
                    <Button variant="outline" size="sm" onClick={() => setScale(prev => Math.max(0.5, prev - 0.2))}>
                      -
                    </Button>
                    <span className="text-sm text-muted-foreground font-mono">{Math.round(scale * 100)}%</span>
                    <Button variant="outline" size="sm" onClick={() => setScale(prev => Math.min(2, prev + 0.2))}>
                      +
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-4 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-2" />
                <p>No preview available</p>
                <p className="text-sm">{previewDoc?.name}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentationHub;

import React, { useState, useRef, useMemo } from 'react';
import { Project, UserRole, SitePhoto, DailyReport } from '../../types';
import { analyzeSitePhoto } from '../../services/ai/geminiService';

import { 
    FileText, Camera, Trash2, 
    Calendar, MapPin, Plus, Folder,
    ImageIcon, Sparkles, Loader2, Sun, Cloud,
    FileSpreadsheet, AlertTriangle, BookOpen, Printer,
    Eye, CloudRain
} from 'lucide-react';
import DocumentsModule from './DocumentsModule';

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

const PHOTO_CATEGORIES = ['General', 'Earthwork', 'Structures', 'Pavement', 'Safety'];

const DocumentationHub: React.FC<Props> = ({ project, userRole, onProjectUpdate, onNavigate }) => {
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

  // === SITE PHOTOS STATE ===
  const [photoCategoryFilter, setPhotoCategoryFilter] = useState('All');
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<SitePhoto | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // === COMPUTED VALUES ===
  const filteredPhotos = useMemo(() => {
    return (project.sitePhotos || []).filter(photo => {
      const matchesCategory = photoCategoryFilter === 'All' || photo.category === photoCategoryFilter;
      return matchesCategory;
    });
  }, [project.sitePhotos, photoCategoryFilter]);

  const photoStats = useMemo(() => ({
    total: project.sitePhotos?.length || 0,
    today: project.sitePhotos?.filter(p => p.date && new Date(p.date).toDateString() === new Date().toDateString()).length || 0,
    earthwork: project.sitePhotos?.filter(p => p.category === 'Earthwork').length || 0,
    structures: project.sitePhotos?.filter(p => p.category === 'Structures').length || 0
  }), [project.sitePhotos]);

  // === HANDLERS ===
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const { fileToCompressedBase64 } = await import('../../utils/data/imageUtils');
    let currentPhotos = [...(project.sitePhotos || [])];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const base64 = await fileToCompressedBase64(file);
      
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
      
      currentPhotos.push(newPhoto);
    }
    
    onProjectUpdate({ ...project, sitePhotos: currentPhotos });
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
          {activeTab === 'site-photos' && (
            <Button variant="outline" onClick={() => photoInputRef.current?.click()}>
              <Camera className="mr-2 h-4 w-4" /> Add Photo
            </Button>
          )}
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

          <TabsContent value="documents" className="p-0 border-none mt-0">
            <DocumentsModule 
              project={project} 
              userRole={userRole} 
              onProjectUpdate={onProjectUpdate} 
            />
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
    </div>
  );
};

export default DocumentationHub;

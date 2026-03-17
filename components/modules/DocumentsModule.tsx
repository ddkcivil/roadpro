import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Project, UserRole, ProjectDocument, DocumentVersion } from '../../types';
import { 
    Sparkles, FileText, Loader2, 
    UploadCloud, Plus, Search, Folder, MoreVertical, Trash2, 
    ExternalLink, Image as ImageIcon, CheckCircle,
    X, ArrowDownLeft
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardHeader } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { Separator } from '~/components/ui/separator';
import { Badge } from '~/components/ui/badge';
import { cn } from '~/lib/utils';
import { ScrollArea } from '~/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import CommentsPanel from './CommentsPanel';
import { ocrService } from '../../services/ai/ocrService';
import { fileToBase64 } from '../../utils/data/documentUtils';

// Dynamically load PDF components when needed
interface PdfComponents {
  Document: any;
  Page: any;
  pdfjs: any;
}

interface Props {
  project: Project;
  userRole: UserRole;
  onProjectUpdate: (project: Project) => void;
}

const FOLDERS = ['General', 'Contracts', 'Drawings', 'Reports', 'Correspondence', 'Financials', 'Sub-Docs'];

const DocumentsModule: React.FC<Props> = ({ project, userRole, onProjectUpdate }) => {
  const [pdfComponents, setPdfComponents] = useState<PdfComponents | null>(null);
  const [blobUrls, setBlobUrls] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const base64ToBlobUrl = useCallback((base64: string): string => {
    try {
      const parts = base64.split(',');
      if (parts.length < 2) return '';
      
      const byteString = atob(parts[1]);
      const mimeString = parts[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error converting base64 to blob URL:', error);
      return '';
    }
  }, []);

  const getFileUrl = useCallback((doc: ProjectDocument): string => {
    if (!doc.fileUrl) return '';
    if (blobUrls[doc.id]) return blobUrls[doc.id];
    
    if (doc.fileUrl.startsWith('data:')) {
      const url = base64ToBlobUrl(doc.fileUrl);
      setBlobUrls(prev => ({ ...prev, [doc.id]: url }));
      return url;
    }
    
    return doc.fileUrl;
  }, [blobUrls, base64ToBlobUrl]);

  useEffect(() => {
    const loadPdfComponents = async () => {
      try {
        const pdfModule = await import('react-pdf');
        const pdfjs = pdfModule.pdfjs;
        
        if (pdfjs && pdfjs.GlobalWorkerOptions) {
          const workerUrl = new URL(
            'pdfjs-dist/build/pdf.worker.min.mjs',
            import.meta.url,
          ).toString();
          pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
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

  const [activeFolder, setActiveFolder] = useState('General');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'SIMPLE' | 'SCAN'>('SIMPLE');
  const [scanStep, setScanStep] = useState<'IDLE' | 'PROCESSING' | 'REVIEW'>('IDLE');
  const [scannedMetadata, setScannedMetadata] = useState<{ subject: string; refNo: string; date: string; letterDate: string; correspondenceType: 'incoming' | 'outgoing' | undefined; sender: string; recipient: string; subId: string; }>({ subject: '', refNo: '', date: '', letterDate: '', correspondenceType: undefined, sender: '', recipient: '', subId: '' });
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null);

  // Update preview URL when previewDoc changes
  useEffect(() => {
    if (previewDoc) {
      setPreviewUrl(getFileUrl(previewDoc));
    } else {
      setPreviewUrl('');
    }
  }, [previewDoc, getFileUrl]);

  const Document = pdfComponents?.Document;
  const Page = pdfComponents?.Page;
  const [newTagInput, setNewTagInput] = useState('');

  const [currentPageState, setCurrentPageState] = useState(1);
  const [numPagesState, setNumPagesState] = useState<number | null>(null);
  const [scaleState, setScaleState] = useState(1.0);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPagesState(numPages);
    setCurrentPageState(1);
  };

  const goToPrevPage = () => setCurrentPageState(prev => Math.max(1, prev - 1));
  const goToNextPage = () => (numPagesState !== null) && setCurrentPageState(prev => Math.min(numPagesState, prev + 1));
  const zoomIn = () => setScaleState(prev => Math.min(2, prev + 0.2));
  const zoomOut = () => setScaleState(prev => Math.max(0.5, prev - 0.2));

  const subcontractors = project.agencies?.filter(agency => agency.type === 'subcontractor') || [];

  const filteredDocuments = useMemo(() => {
    return (project.documents || []).filter(doc =>
        (doc.folder === activeFolder || activeFolder === 'All') &&
        (doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         doc.subject?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [project.documents, activeFolder, searchTerm]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          setUploadFiles(Array.from(e.target.files));
      }
  };

  const handleScanAnalysis = async () => {
      if (uploadFiles.length === 0) return;
      setScanStep('PROCESSING');
      
      const file = uploadFiles[0];
      const reader = new FileReader();
      reader.onloadend = async () => {
          await ocrService.initialize();
          const result = await ocrService.processDocument(file);
          const extractedData = result.structuredData;
          const subject = extractedData.subjects?.[0] || extractedData.invoices?.[0] || extractedData.codes?.[0] || 'Document Analysis';
          const refNo = extractedData.refs?.[0] || extractedData.codes?.[0] || extractedData.invoices?.[0] || '';
          const letterDate = extractedData.dates?.[0] || '';
          const scanDate = new Date().toISOString().split('T')[0];
          const sender = extractedData.senders?.[0] || extractedData.contractors?.[0] || 'Unknown';
          const recipient = extractedData.recipients?.[0] || 'Project Team';
          const correspondenceType = sender.includes('Project') || sender.includes('Team') ? 'outgoing' : 'incoming';
          
          setScannedMetadata({
              subject: subject, refNo: refNo, date: scanDate, letterDate: letterDate,
              correspondenceType: correspondenceType, sender: sender, recipient: recipient, subId: ''
          });
          setScanStep('REVIEW');
      };
      reader.readAsDataURL(file);
  };

  const handleAddTag = (docId: string, tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;
    
    const updatedDocs = (project.documents || []).map(d => {
        if (d.id === docId) {
            const currentTags = d.tags || [];
            if (currentTags.includes(trimmedTag)) return d;
            return { ...d, tags: [...currentTags, trimmedTag] };
        }
        return d;
    });
    
    onProjectUpdate({ ...project, documents: updatedDocs });
    if (previewDoc && previewDoc.id === docId) {
        setPreviewDoc(prev => prev ? { ...prev, tags: [...(prev.tags || []), trimmedTag] } : null);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (docId: string, tagToRemove: string) => {
    const updatedDocs = (project.documents || []).map(d => {
        if (d.id === docId) {
            return { ...d, tags: (d.tags || []).filter(t => t !== tagToRemove) };
        }
        return d;
    });
    
    onProjectUpdate({ ...project, documents: updatedDocs });
    if (previewDoc && previewDoc.id === docId) {
        setPreviewDoc(prev => prev ? { ...prev, tags: (prev.tags || []).filter(t => t !== tagToRemove) } : null);
    }
  };

  const processUploads = async () => {
      const newDocs: ProjectDocument[] = [];
      const skippedDocs: string[] = [];
      
      for (const f of uploadFiles) {
          const existingDoc = (project.documents || []).find(doc => 
              doc.name === f.name && 
              Math.abs(parseFloat(doc.size) - parseFloat(`${(f.size / 1024 / 1024).toFixed(2)}`)) < 0.1
          );
          
          if (existingDoc) {
              skippedDocs.push(f.name);
              continue;
          }
          
          const versionId = `ver-${Date.now()}-${Math.random()}`;
          const newVersion: DocumentVersion = {
              id: versionId, version: 1, date: new Date().toISOString().split('T')[0],
              size: `${(f.size / 1024 / 1024).toFixed(2)} MB`,
              filePath: `uploads/${Date.now()}_${f.name}`,
              uploadedBy: 'Current User'
          };
          
          const fileUrl = await fileToBase64(f);
          const isImage = f.type.includes('image') || ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].some(ext => f.name.toLowerCase().endsWith(ext));
          const isPdf = f.type.includes('pdf') || f.name.toLowerCase().endsWith('.pdf');
          
          newDocs.push({
              id: `doc-${Date.now()}-${Math.random()}`, name: f.name,
              type: isImage ? 'IMAGE' : isPdf ? 'PDF' : 'OTHER',
              date: scanStep === 'REVIEW' ? scannedMetadata.date : new Date().toISOString().split('T')[0],
              size: `${(f.size / 1024 / 1024).toFixed(2)} MB`, folder: uploadTargetFolder,
              tags: scannedMetadata.subId ? [subcontractors.find(s => s.id === scannedMetadata.subId)?.name || ''] : [],
              subject: (scanStep === 'REVIEW' ? scannedMetadata.subject : '') || '',
              refNo: scanStep === 'REVIEW' ? scannedMetadata.refNo : undefined,
              letterDate: scanStep === 'REVIEW' ? scannedMetadata.letterDate : undefined,
              correspondenceType: scanStep === 'REVIEW' ? scannedMetadata.correspondenceType : undefined,
              fileUrl: fileUrl, currentVersion: 1, versions: [newVersion],
              createdBy: 'Current User', lastModified: new Date().toISOString().split('T')[0], status: 'Active'
          });
      }
      
      if (newDocs.length > 0) {
          onProjectUpdate({ ...project, documents: [...(project.documents || []), ...newDocs] });
      }
      
      if (skippedDocs.length > 0) {
          alert(`Skipped ${skippedDocs.length} duplicate document(s): ${skippedDocs.join(', ')}`);
      }
      if (newDocs.length > 0) {
          alert(`Successfully added ${newDocs.length} document(s).`);
      }
      
      setUploadModalOpen(false);
      setUploadFiles([]);
      setScanStep('IDLE');
  };

  const [uploadTargetFolder, setUploadTargetFolder] = useState('General');

  const canDelete = userRole === UserRole.ADMIN || userRole === UserRole.PROJECT_MANAGER;

  const handleDownloadDocument = (doc: ProjectDocument) => {
    if (!doc.fileUrl) {
      alert('Document file is not available for download.');
      return;
    }

    const link = document.createElement('a');
    link.href = getFileUrl(doc);
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleDeleteDoc = (id: string) => {
      if (!canDelete) {
          alert('Only Admin and Project Manager can delete documents');
          return;
      }
      
      if (confirm("Permanently delete this document?")) {
          onProjectUpdate({ ...project, documents: (project.documents || []).filter(d => d.id !== id) });
          
          if (previewDoc?.id === id) {
              setPreviewDoc(null);
          }
      }
  };
  
  const handleUploadNewVersion = async (docId: string, file: File) => {
    const currentDoc = (project.documents || []).find(doc => doc.id === docId);
    if (!currentDoc) return;

    const currentVersion = currentDoc.versions.find(v => v.version === currentDoc.currentVersion);
    if (currentVersion && 
        currentVersion.filePath.split('_').pop() === file.name &&
        Math.abs(parseFloat(currentVersion.size) - parseFloat(`${(file.size / 1024 / 1024).toFixed(2)} MB`)) < 0.1) {
      alert('This file appears to be the same as the current version. Not adding as new version.');
      return;
    }
    
    const updatedDocs = [];
    for (const doc of project.documents || []) {
      if (doc.id === docId) {
        const newVersionNumber = doc.versions.length + 1;
        const versionId = `ver-${Date.now()}-${Math.random()}`;
        
        const newVersion: DocumentVersion = {
          id: versionId, version: newVersionNumber, date: new Date().toISOString().split('T')[0],
          size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          filePath: `uploads/${Date.now()}_${file.name}`,
          uploadedBy: 'Current User', notes: `Uploaded new version`
        };
        
        const base64Data = await fileToBase64(file);
        const isImage = file.type.includes('image') || ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].some(ext => file.name.toLowerCase().endsWith(ext));
        const isPdf = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
        
        updatedDocs.push({
          ...doc, type: isImage ? 'IMAGE' : isPdf ? 'PDF' : 'OTHER',
          fileUrl: base64Data,
          versions: [...doc.versions, newVersion],
          currentVersion: newVersionNumber,
          lastModified: new Date().toISOString().split('T')[0]
        });
      } else {
        updatedDocs.push(doc);
      }
    }
    
    onProjectUpdate({ ...project, documents: updatedDocs });
    
    if (previewDoc?.id === docId) {
      const base64Data = await fileToBase64(file);
      setPreviewDoc(prev => {
        if (!prev) return null;
        const isImage = file.type.includes('image') || ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].some(ext => file.name.toLowerCase().endsWith(ext));
        const isPdf = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
        return { ...prev, type: isImage ? 'IMAGE' : isPdf ? 'PDF' : 'OTHER', fileUrl: base64Data };
      });
    }
  };
  
  const handleRevertToVersion = (docId: string, versionId: string) => {
    const updatedDocs = (project.documents || []).map(doc => {
      if (doc.id === docId) {
        const targetVersion = doc.versions.find(v => v.id === versionId);
        if (targetVersion) {
          return {
            ...doc, currentVersion: targetVersion.version,
            lastModified: new Date().toISOString().split('T')[0]
          };
        }
      }
      return doc;
    });
    
    onProjectUpdate({ ...project, documents: updatedDocs });
    
    if (previewDoc?.id === docId) {
      setPreviewDoc(prev => {
        if (!prev) return null;
        return { ...prev, fileUrl: undefined };
      });
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-4 p-4">
      <Card className="w-60 flex flex-col">
        <CardHeader className="border-b px-4 py-3">
          <Button onClick={() => setUploadModalOpen(true)} className="w-full">
            <Plus className="mr-2 h-4 w-4" /> New Upload
          </Button>
        </CardHeader>
        <ScrollArea className="flex-1 p-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-2">Folders</h3>
          <Button
            variant={activeFolder === 'All' ? 'secondary' : 'ghost'}
            className="w-full justify-start mb-1"
            onClick={() => setActiveFolder('All')}
          >
            <Folder className="mr-2 h-4 w-4" /> All Documents
          </Button>
          <Separator className="my-2" />
          {FOLDERS.map(folder => (
            <Button
              key={folder}
              variant={activeFolder === folder ? 'secondary' : 'ghost'}
              className="w-full justify-start mb-1"
              onClick={() => setActiveFolder(folder)}
            >
              <Folder className={cn("mr-2 h-4 w-4", activeFolder === folder ? "text-primary" : "text-slate-400")} /> {folder}
            </Button>
          ))}
        </ScrollArea>
      </Card>

      <div className="flex-1 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Folder className="h-4 w-4" /> <span>Project Storage</span> <span className="mx-1">/</span> <span className="font-semibold text-foreground">{activeFolder}</span>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              className="pl-10"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              aria-label="Search files"
            />
          </div>
        </div>

        <Card className="flex-1 overflow-hidden">
          <ScrollArea className="h-full w-full rounded-md border">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Reference / Subject</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.length > 0 ? filteredDocuments.map(doc => (
                  <TableRow key={doc.id} className="cursor-pointer" onClick={() => setPreviewDoc(doc)}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {doc.status === 'Unavailable' ? (
                            <FileText className="h-4 w-4 text-gray-400"/>
                        ) : doc.type === 'IMAGE' ? (
                            <ImageIcon className="h-4 w-4 text-blue-500"/>
                        ) : (
                            <FileText className="h-4 w-4 text-rose-500"/>
                        )}
                        <span className={cn("font-medium", doc.status === 'Unavailable' && "line-through text-muted-foreground")}>
                            {doc.name} {doc.status === 'Unavailable' && ' (Unavailable)'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-sm">{doc.refNo || '-'}</p>
                      <p className="text-xs text-muted-foreground truncate w-[200px]">{doc.subject || 'No subject'}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap max-w-[200px]">
                          {doc.tags?.map((t, idx) => <Badge key={idx} variant="outline" className="h-4 text-xs">{t}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{doc.date}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{doc.size}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownloadDocument(doc); }}>
                            <ArrowDownLeft className="mr-2 h-4 w-4" /> Download
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc.id); }}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-60 text-center text-muted-foreground">
                      <UploadCloud className="mx-auto h-12 w-12 text-slate-300 mb-2" />
                      No files in this folder.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      </div>

      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Add to Project Archive</DialogTitle>
            <DialogDescription>Upload documents or scan them using AI OCR.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg h-80 bg-muted/20">
              {uploadFiles.length > 0 ? (
                <div className="text-center">
                  <FileText className="mx-auto h-12 w-12 text-primary mb-2" />
                  <p className="font-semibold truncate w-48 mx-auto">{uploadFiles[0].name}</p>
                  <Button variant="link" size="sm" onClick={() => { setUploadFiles([]); setScanStep('IDLE'); }}>Clear</Button>
                  {uploadMode === 'SCAN' && (
                    <Button
                      className="w-full mt-4"
                      onClick={handleScanAnalysis}
                      disabled={scanStep === 'PROCESSING'}
                    >
                      {scanStep === 'PROCESSING' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                      {scanStep === 'PROCESSING' ? 'Reading Content...' : 'Analyze Document'}
                    </Button>
                  )}
                </div>
              ) : (
                <Button className="relative">
                  Browse Files
                  <Input type="file" className="absolute inset-0 opacity-0 cursor-pointer" multiple={uploadMode === 'SIMPLE'} onChange={handleFileSelect} aria-label="Select files to upload" />
                </Button>
              )}
            </div>
            <div className="grid gap-4">
              <div className="flex gap-2">
                <Button
                  variant={uploadMode === 'SIMPLE' ? 'secondary' : 'outline'}
                  onClick={() => setUploadMode('SIMPLE')}
                  className="flex-1"
                >
                  Standard Upload
                </Button>
                <Button
                  variant={uploadMode === 'SCAN' ? 'secondary' : 'outline'}
                  onClick={() => setUploadMode('SCAN')}
                  className="flex-1"
                >
                  <Sparkles className="mr-2 h-4 w-4" /> AI OCR Scan
                </Button>
              </div>
              <Select value={uploadTargetFolder} onValueChange={setUploadTargetFolder}>
                <SelectTrigger aria-label="Target Folder">
                  <SelectValue placeholder="Target Folder" />
                </SelectTrigger>
                <SelectContent>
                  {FOLDERS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={scannedMetadata.subId || 'none'} onValueChange={value => setScannedMetadata({...scannedMetadata, subId: value === 'none' ? '' : value})}>
                <SelectTrigger aria-label="Associated Subcontractor">
                  <SelectValue placeholder="Associated Subcontractor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None / General</SelectItem>
                  {subcontractors.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                placeholder="Subject Line"
                value={scannedMetadata.subject} onChange={e => setScannedMetadata({...scannedMetadata, subject: e.target.value})}
                aria-label="Subject Line"
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Reference No"
                  value={scannedMetadata.refNo} onChange={e => setScannedMetadata({...scannedMetadata, refNo: e.target.value})}
                  aria-label="Reference Number"
                />
                <Input
                  type="date"
                  value={scannedMetadata.letterDate} onChange={e => setScannedMetadata({...scannedMetadata, letterDate: e.target.value})}
                  aria-label="Letter Date"
                />
              </div>
              <div className="flex gap-2">
                <Select
                    value={scannedMetadata.correspondenceType || 'none'}
                    onValueChange={value => setScannedMetadata({...scannedMetadata, correspondenceType: value === 'none' ? '' : value as any})}
                >
                    <SelectTrigger aria-label="Correspondence Type">
                        <SelectValue placeholder="Correspondence Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Not Specified</SelectItem>
                        <SelectItem value="incoming">Incoming</SelectItem>
                        <SelectItem value="outgoing">Outgoing</SelectItem>
                    </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={scannedMetadata.date} onChange={e => setScannedMetadata({...scannedMetadata, date: e.target.value})}
                  aria-label="Upload Date"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadModalOpen(false)}>Cancel</Button>
            <Button onClick={processUploads} disabled={uploadFiles.length === 0 || scanStep === 'PROCESSING'}>Save to Database</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        {previewDoc && (
          <DialogContent className="max-w-[calc(100vw-6rem)] h-[calc(100vh-6rem)] flex flex-col p-0">
            <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <DialogTitle className="text-lg font-bold">{previewDoc.name}</DialogTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={getFileUrl(previewDoc)} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" /> Open Full
                  </a>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setPreviewDoc(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </DialogHeader>
            <div className="flex flex-1 overflow-hidden bg-muted/20">
              <div className="flex-1 flex items-center justify-center p-4">
                {previewDoc.fileUrl ? (
                  <div className="w-full h-full flex flex-col">
                    {(previewDoc.type?.toLowerCase().includes('pdf') || previewDoc.fileUrl?.toLowerCase().endsWith('.pdf')) ? (
                      <div className="flex-1 flex items-center justify-center">
                        {Document ? (
                          <Document
                            file={getFileUrl(previewDoc)}
                            loading={<div className="text-center text-muted-foreground">Loading PDF...</div>}
                            error={
                              <div className="flex flex-col items-center justify-center p-4 text-destructive">
                                <FileText className="h-12 w-12 mb-2" />
                                <p>Failed to load PDF</p>
                                <p className="text-sm text-muted-foreground mt-1 text-center">
                                  This document may have an expired link. Please re-upload the file.
                                </p>
                              </div>
                            }
                            onLoadSuccess={onDocumentLoadSuccess}
                            onError={(error: Error) => console.error('PDF Load Error:', error)}
                          >
                            <Page pageNumber={currentPageState} scale={scaleState} renderTextLayer={false} renderAnnotationLayer={false} />
                          </Document>
                        ) : (
                          <div className="text-center p-4 text-muted-foreground">
                            <Loader2 className="animate-spin mx-auto mb-2" />
                            <p>Initializing PDF viewer...</p>
                          </div>
                        )}
                      </div>
                    ) : (previewDoc.type === 'IMAGE' || ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].some(ext => previewDoc.fileUrl && previewDoc.fileUrl.toLowerCase().endsWith(ext))) ? (
                      <img
                        src={getFileUrl(previewDoc)}
                        alt="Document Preview"
                        className="max-w-full max-h-full object-contain rounded-lg"
                      />
                    ) : (
                      <div className="text-center p-4 text-muted-foreground">
                        <FileText className="mx-auto h-12 w-12 mb-2" />
                        <p>Preview not available for this file type</p>
                        <p className="text-sm">{previewDoc.name}</p>
                        <Button variant="outline" size="sm" className="mt-4" asChild>
                          <a href={getFileUrl(previewDoc)} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" /> Download File
                          </a>
                        </Button>
                      </div>
                    )}
                    {(previewDoc.type === 'PDF' || (previewDoc.fileUrl && previewDoc.fileUrl.toLowerCase().endsWith('.pdf'))) && (
                        <div className="flex items-center justify-center gap-2 p-2 bg-background/50 border-t">
                            <Button variant="outline" size="sm" onClick={goToPrevPage} disabled={currentPageState <= 1}>Prev</Button>
                            <span className="text-sm text-muted-foreground">Page {currentPageState} of {numPagesState}</span>
                            <Button variant="outline" size="sm" onClick={goToNextPage} disabled={currentPageState >= (numPagesState || 1)}>Next</Button>
                            <Separator orientation="vertical" className="h-6 mx-2" />
                            <Button variant="outline" size="sm" onClick={zoomOut}>-</Button>
                            <span className="text-sm text-muted-foreground">{Math.round(scaleState * 100)}%</span>
                            <Button variant="outline" size="sm" onClick={zoomIn}>+</Button>
                        </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-4 text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 mb-2" />
                    <p>{previewDoc.status === 'Unavailable' ? 'This document is no longer available. Please re-upload the file.' : 'No preview available'}</p>
                    <p className="text-sm">{previewDoc.name}</p>
                  </div>
                )}
              </div>

              <div className="w-80 border-l bg-background p-4 overflow-y-auto">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Document Metadata</h3>
                <div className="grid gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Subject</p>
                    <p className="font-medium">{previewDoc.subject || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Reference Number</p>
                    <p className="font-medium">{previewDoc.refNo || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Organization Tags</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {previewDoc.tags?.map(t => (
                        <Badge key={t} variant="secondary" className="h-5 text-xs flex items-center">
                          {t}
                          <button 
                            onClick={() => handleRemoveTag(previewDoc.id, t)} 
                            className="ml-1 focus:outline-none"
                            title="Remove tag"
                            aria-label={`Remove tag ${t}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      {(!previewDoc.tags || previewDoc.tags.length === 0) && (
                        <p className="text-xs text-muted-foreground italic">No tags added</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Add custom tag..."
                        value={newTagInput}
                        onChange={e => setNewTagInput(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleAddTag(previewDoc.id, newTagInput)}
                        className="h-9"
                        aria-label="New tag name"
                      />
                      <Button size="icon" onClick={() => handleAddTag(previewDoc.id, newTagInput)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Version History</h4>
                    <Card className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">Current Version: {previewDoc.currentVersion}</p>
                        <Input
                          type="file"
                          id={`version-upload-${previewDoc.id}`}
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleUploadNewVersion(previewDoc.id, e.target.files[0]);
                            }
                          }}
                          aria-label="Upload new version"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById(`version-upload-${previewDoc.id}`)?.click()}
                        >
                          <UploadCloud className="mr-2 h-4 w-4" /> New Version
                        </Button>
                      </div>
                      <ScrollArea className="h-32">
                        {previewDoc.versions.map(version => (
                          <div key={version.id} className="flex items-center justify-between text-sm py-1">
                            <div className="flex items-center gap-2">
                              {version.version === previewDoc.currentVersion ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              )}
                              <div>
                                <p>Version {version.version} - {version.date}</p>
                                <p className="text-xs text-muted-foreground">{version.size} | {version.uploadedBy}</p>
                              </div>
                            </div>
                            {version.version !== previewDoc.currentVersion && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRevertToVersion(previewDoc.id, version.id)}
                              >
                                Restore
                              </Button>
                            )}
                          </div>
                        ))}
                      </ScrollArea>
                    </Card>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Discussion</h4>
                    <CommentsPanel
                      entityId={previewDoc.id}
                      entityType="document"
                      comments={previewDoc.comments || []}
                      currentUser={{ id: 'current-user', name: 'Current User' }}
                      onAddComment={(comment) => {
                        const commentWithId = {
                          ...comment,
                          id: `comment-${Date.now()}-${Math.random()}`,
                          timestamp: new Date().toISOString()
                        };
                        const updatedDocs = (project.documents || []).map(d =>
                          d.id === previewDoc.id ? { ...d, comments: [...(d.comments || []), commentWithId] } : d
                        );
                        onProjectUpdate({ ...project, documents: updatedDocs });
                        setPreviewDoc(prev => prev ? { ...prev, comments: [...(prev.comments || []), commentWithId] } : null);
                      }}
                    />
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground">Audit Trail</p>
                    <p className="text-sm text-muted-foreground mt-1">Created: {previewDoc.date}</p>
                    <p className="text-sm text-muted-foreground">Size: {previewDoc.size}</p>
                  </div>
                  <Button variant="destructive" className="w-full mt-4" onClick={() => { handleDeleteDoc(previewDoc.id); setPreviewDoc(null); }}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Document
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default DocumentsModule;

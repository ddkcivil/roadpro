import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Project, UserRole, ProjectDocument, DocumentVersion } from '../../types';
import { 
    Sparkles, FileText, Loader2, 
    UploadCloud, Plus, Search, Folder, MoreVertical, Trash2, 
    ExternalLink, Image as ImageIcon, CheckCircle,
    X, ArrowDownLeft, Pencil
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardHeader } from '~/components/ui/card';
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
import { toast } from 'sonner';
import { fileToBase64, base64ToBlobUrl } from '../../utils/data/documentUtils';

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
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
}

const FOLDERS = ['General', 'Contracts', 'Drawings', 'Reports', 'Correspondence', 'Financials', 'Sub-Docs'];

const DocumentsModule: React.FC<Props> = ({ project, userRole, onProjectUpdate, isLoading, onRefresh }) => {
  const subcontractors = project.agencies?.filter(a => a.type === 'subcontractor') || [];
  
  const [activeFolder, setActiveFolder] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Debug documents prop
  useEffect(() => {
    console.log(`[DocumentsModule] Project "${project.name}" has ${project.documents?.length || 0} documents.`);
  }, [project.id, project.documents]);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'SIMPLE' | 'SCAN'>('SIMPLE');
  const [scanStep, setScanStep] = useState<'IDLE' | 'PROCESSING' | 'REVIEW'>('IDLE');
  const [scannedMetadata, setScannedMetadata] = useState<{
    subject: string;
    refNo: string;
    date: string;
    letterDate: string;
    correspondenceType: string;
    sender: string;
    recipient: string;
    subId: string;
  }>({
    subject: '',
    refNo: '',
    date: new Date().toISOString().split('T')[0],
    letterDate: '',
    correspondenceType: 'incoming',
    sender: '',
    recipient: '',
    subId: ''
  });
  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  
  const [editingDoc, setEditingDoc] = useState<ProjectDocument | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<ProjectDocument>>({});

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (uploadMode === 'SCAN' && files.length > 1) {
      toast.error('Scan mode supports only one file at a time.');
      return;
    }
    setUploadFiles(files);
    setScanStep('IDLE');
    // Reset metadata for new file
    setScannedMetadata({
      subject: '',
      refNo: '',
      date: new Date().toISOString().split('T')[0],
      letterDate: '',
      correspondenceType: 'incoming',
      sender: '',
      recipient: '',
      subId: ''
    });
  };

  const handleScanAnalysis = async () => {
    if (uploadFiles.length === 0) {
      toast.error('No file selected for analysis.');
      return;
    }

    const file = uploadFiles[0];
    setScanStep('PROCESSING');
    const analysisToast = toast.loading('Analyzing document with AI OCR...');

    try {
      await ocrService.initialize();
      const ocrResult = await ocrService.extractTextFromImage(file);

          // Parse extracted text for metadata (simple heuristic parsing)
    const text = ocrResult.text.toLowerCase();
    const subjectMatch = text.match(/subject[:\-]?\s*(.{1,100})/i);
    const refMatch = text.match(/ref(?:erence)?[:\-]?\s*(.{1,50})/i);
    const dateMatch = text.match(/\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2})\b/);

    // Improved regex for correspondenceType to be more specific
    const finalCorrespondenceType = text.match(/\b(incoming|in|from)\b/i) ? 'incoming' : text.match(/\b(outgoing|out|to)\b/i) ? 'outgoing' : '';

    // Helper to normalize dates to yyyy-MM-dd
    const normalizeDate = (dateStr: string) => {
      if (!dateStr) return '';
      // Try to parse dd-mm-yyyy or dd/mm/yyyy
      const dmyMatch = dateStr.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})$/);
      if (dmyMatch) {
        let [_, d, m, y] = dmyMatch;
        if (y.length === 2) y = `20${y}`;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      // If already yyyy-mm-dd or similar, try native parsing
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          return d.toISOString().split('T')[0];
        }
      } catch (e) {}
      return dateStr;
    };

    setScannedMetadata(prev => ({
      ...prev,
      subject: subjectMatch ? subjectMatch[1].trim() : file.name.split('.')[0],
      refNo: refMatch ? refMatch[1].trim() : '',
      letterDate: dateMatch ? normalizeDate(dateMatch[1]) : '',
      correspondenceType: finalCorrespondenceType,
      sender: '',
      recipient: '',
      date: new Date().toISOString().split('T')[0]
    }));

    setScanStep('REVIEW');
    toast.dismiss(analysisToast);
    toast.success('Document analyzed! Review extracted metadata below.');
  } catch (error) {
    setScanStep('IDLE');
    toast.dismiss(analysisToast);
    toast.error('OCR analysis failed', { description: (error as Error).message });
    console.error('OCR Error:', error);
  }
};

  // PDF Preview State
  const [pdfComponents, setPdfComponents] = useState<PdfComponents | null>(null);
  const [currentPageState, setCurrentPageState] = useState(1);
  const [numPagesState, setNumPagesState] = useState<number | null>(null);
  const [scaleState, setScaleState] = useState(1.0);

  useEffect(() => {
    const loadPdfComponents = async () => {
      try {
        const pdfModule = await import('react-pdf');
        const pdfjs = pdfModule.pdfjs;
        if (pdfjs && pdfjs.GlobalWorkerOptions) {
          const version = pdfjs.version || '4.4.168';
          pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;
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
  }, []);

  const Document = pdfComponents?.Document;
  const Page = pdfComponents?.Page;

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPagesState(numPages);
  };

  const goToPrevPage = () => setCurrentPageState(prev => Math.max(1, prev - 1));
  const goToNextPage = () => setCurrentPageState(prev => Math.min(numPagesState || 1, prev + 1));
  const zoomIn = () => setScaleState(prev => Math.min(2, prev + 0.2));
  const zoomOut = () => setScaleState(prev => Math.max(0.5, prev - 0.2));

  const getFileUrl = (doc: ProjectDocument): string => {
    return doc.fileUrl || '';
  };

  const filteredDocuments = useMemo(() => {
    return (project.documents || []).filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           doc.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           doc.refNo?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFolder = activeFolder === 'All' || doc.folder === activeFolder;
      return matchesSearch && matchesFolder;
    });
  }, [project.documents, searchTerm, activeFolder]);

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
      
      const uploadToast = toast.loading(`Uploading ${uploadFiles.length} document(s) to cloud storage...`);
      const { realApiService } = await import('../../services/api/realApiService');

      try {
          for (const f of uploadFiles) {
              const existingDoc = (project.documents || []).find(doc => 
                  doc.name === f.name && 
                  Math.abs(parseFloat(doc.size) - parseFloat(`${(f.size / 1024 / 1024).toFixed(2)} MB`)) < 0.1
              );
              
              if (existingDoc) {
                  skippedDocs.push(f.name);
                  continue;
              }
              
              // 1. Convert to base64 with compression for images
              const { fileToCompressedBase64 } = await import('../../utils/data/imageUtils');
              const base64Data = await fileToCompressedBase64(f);
              
              // 2. Upload to binary store (Vercel Blob via Postgres)
              const uploadResult = await realApiService.uploadFile({
                  name: f.name,
                  contentType: f.type,
                  base64Data,
                  projectId: project.id,
                  folder: uploadTargetFolder,
                  tags: scannedMetadata.subId ? [subcontractors.find(s => s.id === scannedMetadata.subId)?.name || ''] : [],
                  subject: (scanStep === 'REVIEW' ? scannedMetadata.subject : '') || f.name.split('.')[0],
                  refNo: scanStep === 'REVIEW' ? scannedMetadata.refNo : undefined,
                  metadata: {
                      letterDate: scanStep === 'REVIEW' ? scannedMetadata.letterDate : undefined,
                      correspondenceType: scanStep === 'REVIEW' ? scannedMetadata.correspondenceType : undefined,
                      sender: scanStep === 'REVIEW' ? scannedMetadata.sender : undefined,
                      recipient: scanStep === 'REVIEW' ? scannedMetadata.recipient : undefined,
                  }
              });

              const docId = uploadResult.id;
              const isImage = f.type.includes('image') || ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].some(ext => f.name.toLowerCase().endsWith(ext));
              const isPdf = f.type.includes('pdf') || f.name.toLowerCase().endsWith('.pdf');
              
              const newVersion: DocumentVersion = {
                  id: uploadResult.versionId || `ver-${Date.now()}-${Math.random()}`, 
                  version: 1, 
                  date: new Date().toISOString().split('T')[0],
                  size: `${(f.size / 1024 / 1024).toFixed(2)} MB`,
                  filePath: uploadResult.url, 
                  blobUrl: uploadResult.blobUrl,
                  uploadedBy: 'Current User'
              };
              
              newDocs.push({
                  id: docId, 
                  name: f.name,
                  type: isImage ? 'IMAGE' : isPdf ? 'PDF' : 'OTHER',
                  date: scanStep === 'REVIEW' ? scannedMetadata.date : new Date().toISOString().split('T')[0],
                  size: `${(f.size / 1024 / 1024).toFixed(2)} MB`, 
                  folder: uploadTargetFolder,
                  tags: scannedMetadata.subId ? [subcontractors.find(s => s.id === scannedMetadata.subId)?.name || ''] : [],
                  subject: (scanStep === 'REVIEW' ? scannedMetadata.subject : '') || f.name.split('.')[0],
                  refNo: scanStep === 'REVIEW' ? scannedMetadata.refNo : undefined,
                  letterDate: scanStep === 'REVIEW' ? scannedMetadata.letterDate : undefined,
                  correspondenceType: scanStep === 'REVIEW' ? (scannedMetadata.correspondenceType as 'incoming' | 'outgoing' | undefined) || undefined : undefined,
                  fileUrl: uploadResult.url, 
                  fileId: uploadResult.id,
                  currentVersion: 1, 
                  versions: [newVersion],
                  createdBy: 'Current User', 
                  lastModified: new Date().toISOString().split('T')[0], 
                  status: 'Active'
              });
          }
          
          if (newDocs.length > 0) {
              onProjectUpdate({ ...project, documents: [...(project.documents || []), ...newDocs] });
          }
          
          toast.dismiss(uploadToast);
          
          if (skippedDocs.length > 0) {
              toast.info(`Skipped ${skippedDocs.length} duplicate document(s)`, { description: skippedDocs.join(', ') });
          }
          if (newDocs.length > 0) {
              toast.success(`Successfully uploaded ${newDocs.length} document(s).`);
          }
      } catch (error: any) {
          toast.dismiss(uploadToast);
          if (error.status === 409) {
              toast.error("Duplicate Document", { 
                  description: error.response?.data?.message || "This document already exists in this project." 
              });
          } else {
              toast.error("Upload Failed", { description: error.message || "An unexpected error occurred." });
          }
          console.error(error);
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
  
  const handleDeleteDoc = async (id: string) => {
      if (!canDelete) {
          toast.error('Permission Denied', { description: 'Only Admin and Project Manager can delete documents' });
          return;
      }
      
      if (confirm("Permanently delete this document from the project archive and cloud storage?")) {
          const deleteToast = toast.loading("Deleting document...");
          try {
              const { realApiService } = await import('../../services/api/realApiService');
              await realApiService.deleteFile(id);
              
              onProjectUpdate({ ...project, documents: (project.documents || []).filter(d => d.id !== id) });
              
              if (previewDoc?.id === id) {
                  setPreviewDoc(null);
              }
              toast.dismiss(deleteToast);
              toast.success("Document deleted successfully");
          } catch (error: any) {
              toast.dismiss(deleteToast);
              toast.error("Delete Failed", { description: error.message || "An unexpected error occurred." });
              console.error(error);
          }
      }
  };

  const handleOpenEdit = (doc: ProjectDocument) => {
    setEditingDoc(doc);
    setEditFormData({
      name: doc.name,
      subject: doc.subject,
      refNo: doc.refNo,
      folder: doc.folder,
      letterDate: doc.letterDate,
      correspondenceType: doc.correspondenceType
    });
  };

  const handleUpdateMetadata = async () => {
    if (!editingDoc) return;
    
    const updateToast = toast.loading("Updating document details...");
    try {
      const { realApiService } = await import('../../services/api/realApiService');
      await realApiService.updateFileMetadata(editingDoc.id, {
        name: editFormData.name,
        subject: editFormData.subject,
        refNo: editFormData.refNo,
        folder: editFormData.folder,
        letterDate: editFormData.letterDate,
        correspondenceType: editFormData.correspondenceType
      });
      
      const updatedDocs = (project.documents || []).map(doc => 
        doc.id === editingDoc.id ? { ...doc, ...editFormData } : doc
      );
      
      onProjectUpdate({ ...project, documents: updatedDocs });
      
      if (previewDoc?.id === editingDoc.id) {
        setPreviewDoc(prev => prev ? { ...prev, ...editFormData } : null);
      }
      
      setEditingDoc(null);
      toast.dismiss(updateToast);
      toast.success("Document updated successfully");
    } catch (error: any) {
      toast.dismiss(updateToast);
      toast.error("Update Failed", { description: error.message || "An unexpected error occurred." });
      console.error(error);
    }
  };
  
  const handleUploadNewVersion = async (docId: string, file: File) => {
    const currentDoc = (project.documents || []).find(doc => doc.id === docId);
    if (!currentDoc) return;

    const versions = currentDoc.versions || [];
    const currentVersion = versions.find(v => v.version === currentDoc.currentVersion);
    if (currentVersion && 
        currentVersion.filePath.split('_').pop() === file.name &&
        Math.abs(parseFloat(currentVersion.size) - parseFloat(`${(file.size / 1024 / 1024).toFixed(2)} MB`)) < 0.1) {
      alert('This file appears to be the same as the current version. Not adding as new version.');
      return;
    }
    
    const uploadToast = toast.loading("Uploading new version...");
    const { realApiService } = await import('../../services/api/realApiService');

    try {
      // 1. Convert to base64 with compression for images
      const { fileToCompressedBase64 } = await import('../../utils/data/imageUtils');
      const base64Data = await fileToCompressedBase64(file);
      
      // 2. Upload to binary store
      const uploadResult = await realApiService.uploadFile({
          name: file.name,
          contentType: file.type,
          base64Data,
          docId: docId,
          projectId: project.id,
          metadata: {
              type: 'document-version',
              notes: 'Uploaded new version'
          }
      });

      const updatedDocs = [];
      for (const doc of project.documents || []) {
        if (doc.id === docId) {
          const newVersionNumber = doc.versions.length + 1;
          const versionId = uploadResult.versionId || `ver-${Date.now()}-${Math.random()}`;
          
          const newVersion: DocumentVersion = {
            id: versionId, 
            version: newVersionNumber, 
            date: new Date().toISOString().split('T')[0],
            size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            filePath: uploadResult.url,
            blobUrl: uploadResult.blobUrl,
            uploadedBy: 'Current User', 
            notes: `Uploaded new version`
          };
          
          const isImage = file.type.includes('image') || ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].some(ext => file.name.toLowerCase().endsWith(ext));
          const isPdf = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
          
          updatedDocs.push({
            ...doc, 
            type: isImage ? 'IMAGE' : isPdf ? 'PDF' : 'OTHER',
            fileUrl: uploadResult.url,
            fileId: uploadResult.id,
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
        setPreviewDoc(prev => {
          if (!prev) return null;
          const isImage = file.type.includes('image') || ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].some(ext => file.name.toLowerCase().endsWith(ext));
          const isPdf = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
          return { 
            ...prev, 
            type: isImage ? 'IMAGE' : isPdf ? 'PDF' : 'OTHER', 
            fileUrl: uploadResult.url,
            fileId: uploadResult.id
          };
        });
      }
      
      toast.dismiss(uploadToast);
      toast.success("New Version Uploaded");
    } catch (error) {
      toast.dismiss(uploadToast);
      toast.error("Failed to upload version", { description: (error as Error).message });
      console.error(error);
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
          <div className="flex items-center gap-2">
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
            {onRefresh && (
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => onRefresh()} 
                disabled={isLoading}
                title="Reload documents"
              >
                <Loader2 className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
            )}
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
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-60 text-center">
                      <Loader2 className="mx-auto h-8 w-8 text-primary animate-spin mb-2" />
                      <p className="text-muted-foreground">Synchronizing documents...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredDocuments.length > 0 ? filteredDocuments.map(doc => (
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
                        <span className={cn("font-medium", (doc.status ?? 'Active') === 'Unavailable' && "line-through text-muted-foreground")}>
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
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenEdit(doc); }}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit Details
                          </DropdownMenuItem>
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
                    <TableCell colSpan={6} className="h-60 text-center">
                      <FileText className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                      <p className="text-xl font-semibold mb-1">No documents found</p>
                      <p className="text-muted-foreground mb-4">Upload a document to get started or try reloading.</p>
                      {onRefresh && (
                        <Button variant="outline" onClick={() => onRefresh()} disabled={isLoading}>
                          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                          Try Reloading
                        </Button>
                      )}
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
                    onValueChange={value => setScannedMetadata({...scannedMetadata, correspondenceType: value === 'none' ? '' : value})}
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
            <DialogDescription className="sr-only">Viewing document: {previewDoc.name}</DialogDescription>
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
                        {(previewDoc.versions || []).map(version => (
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
      
      <Dialog open={!!editingDoc} onOpenChange={() => setEditingDoc(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Document Details</DialogTitle>
            <DialogDescription>Update metadata for this document.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Filename</Label>
              <Input
                id="edit-name"
                value={editFormData.name || ''}
                onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-folder">Folder</Label>
              <Select
                value={editFormData.folder || 'General'}
                onValueChange={value => setEditFormData({ ...editFormData, folder: value })}
              >
                <SelectTrigger id="edit-folder">
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
                  {FOLDERS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-subject">Subject</Label>
              <Input
                id="edit-subject"
                value={editFormData.subject || ''}
                onChange={e => setEditFormData({ ...editFormData, subject: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-ref">Reference No</Label>
              <Input
                id="edit-ref"
                value={editFormData.refNo || ''}
                onChange={e => setEditFormData({ ...editFormData, refNo: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-date">Letter Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editFormData.letterDate || ''}
                  onChange={e => setEditFormData({ ...editFormData, letterDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-type">Type</Label>
                <Select
                  value={editFormData.correspondenceType || 'none'}
                  onValueChange={value => setEditFormData({ ...editFormData, correspondenceType: value === 'none' ? undefined : (value as any) })}
                >
                  <SelectTrigger id="edit-type">
                    <SelectValue placeholder="Correspondence Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not Specified</SelectItem>
                    <SelectItem value="incoming">Incoming</SelectItem>
                    <SelectItem value="outgoing">Outgoing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDoc(null)}>Cancel</Button>
            <Button onClick={handleUpdateMetadata}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentsModule;

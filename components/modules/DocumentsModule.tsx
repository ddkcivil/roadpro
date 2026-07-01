import React, { useState, useMemo, useEffect, useCallback, ChangeEvent, useRef } from 'react';
import { Project, UserRole, ProjectDocument, DocumentVersion } from '../../types';
import { 
    Sparkles, FileText, Loader2, 
    UploadCloud, Plus, Search, Folder, MoreVertical, Trash2, 
    ExternalLink, Image as ImageIcon, CheckCircle, AlertTriangle,
    X, ArrowDownLeft, Pencil, Eye, Maximize2, ChevronRight, ChevronLeft
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

// Import the history hook
import { useHistoryAutoFill } from '~/lib/historyUtils';

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

const FOLDERS = ['General', 'Contracts', 'Drawings', 'Reports', 'Correspondence', 'Financials', 'Sub-Docs', 'Leave Request', 'New Employee'];

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
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  
  const [editingDoc, setEditingDoc] = useState<ProjectDocument | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<ProjectDocument>>({});

  // History auto-fill hooks for document fields
  const subjectHistory = useHistoryAutoFill('documentSubjects');
  const refNoHistory = useHistoryAutoFill('documentRefNos');
  const folderHistory = useHistoryAutoFill('documentFolders');
  const subIdHistory = useHistoryAutoFill('documentSubcontractors');

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

      // Parse extracted text for metadata
      const text = ocrResult.text;
      const textLower = text.toLowerCase();
      
      console.log('[handleScanAnalysis] OCR extracted text:', text.substring(0, 500));

      // Look for subject after "Subject:" label
      const subjectMatch = text.match(/subject[:\-]?\s*(.{1,100})/i);
      
      // Look for reference after "Ref:" or "Ref No:" or "Reference:" label
      const refMatch = text.match(/(?:ref(?:\s|no)?[:\-]\s*|reference[:\-]\s*)(.{1,50})/i);

// Look for date after "Date:" label specifically
      // First try to find date that comes after "Date:" label
      const dateAfterLabelMatch = text.match(/date[:\-]?\s*(\d{1,2}[-\/.]\d{1,2}[-\/.]\d{4})/i)
        || text.match(/date[:\-]?\s*(\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})/i)
        || text.match(/date[:\-]?\s*(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})/i)
        || text.match(/date[:\-]?\s*((?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4})/i);

      // Improved date matching regex - covers more formats
      // Formats: dd-mm-yyyy, dd/mm/yyyy, dd.mm.yyyy, yyyy-mm-dd, yyyy/mm/dd
      // Also handles month names: 15 Jan 2024, January 15 2024, etc.
      const datePatterns: RegExp[] = [
        // DD-MM-YYYY or DD.MM.YYYY (with optional time)
        /\b(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})\b/,
        // YYYY-MM-DD
        /\b(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})\b/,
        // DD-MMM-YYYY (e.g., 15-Jan-2024)
        /\b(\d{1,2})[-\s](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-\s](\d{4})\b/i,
        // DD MMMM YYYY (e.g., 15 January 2024)
        /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i,
        // MMMM DD, YYYY (e.g., January 15, 2024)
        /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i,
      ];

      let extractedDate = '';
      
      // First try to extract date after "Date:" label (takes priority)
      if (dateAfterLabelMatch && dateAfterLabelMatch[1]) {
        console.log('[handleScanAnalysis] Date match found after Date: label:', dateAfterLabelMatch[1]);
        extractedDate = normalizeDate(dateAfterLabelMatch[1]);
      }
      
      // If no date found after label, try other patterns
      if (!extractedDate) {
        for (const pattern of datePatterns) {
          const match = text.match(pattern);
          if (match) {
            console.log('[handleScanAnalysis] Date match found:', match[0], 'with pattern', pattern);
            extractedDate = normalizeDate(match[0]);
            if (extractedDate) break;
          }
        }
      }

      // Improved regex for correspondenceType to be more specific
      const finalCorrespondenceType = textLower.match(/\b(incoming|in|from)\b/i) ? 'incoming' : textLower.match(/\b(outgoing|out|to)\b/i) ? 'outgoing' : '';

      setScannedMetadata(prev => ({
        ...prev,
        subject: subjectMatch ? subjectMatch[1].trim() : file.name.split('.')[0],
        refNo: refMatch ? refMatch[1].trim() : '',
        letterDate: extractedDate,
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

  // Improved normalizeDate function that handles multiple formats
  const normalizeDate = (dateStr: string): string => {
    if (!dateStr) return '';
    
    const trimmed = dateStr.trim();
    console.log('[normalizeDate] Input:', trimmed);
    
    // Try to parse DD-MM-YYYY, DD.MM.YYYY, DD/MM/YYYY
    let match = trimmed.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
    if (match) {
      const [, d, m, y] = match;
      const result = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      console.log('[normalizeDate] Parsed as DD-MM-YYYY:', result);
      return result;
    }
    
    // Try to parse YYYY-MM-DD
    match = trimmed.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
    if (match) {
      const [, y, m, d] = match;
      const result = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      console.log('[normalizeDate] Parsed as YYYY-MM-DD:', result);
      return result;
    }
    
    // Try to parse DD-MMM-YYYY (e.g., 15-Jan-2024)
    const monthNames: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    match = trimmed.match(/^(\d{1,2})[-\s]([a-zA-Z]{3})[-\s](\d{4})$/);
    if (match) {
      const [, d, m, y] = match;
      const month = monthNames[m.toLowerCase().substring(0, 3)];
      if (month) {
        const result = `${y}-${month}-${d.padStart(2, '0')}`;
        console.log('[normalizeDate] Parsed as DD-MMM-YYYY:', result);
        return result;
      }
    }
    
    // Try to parse DD MMMM YYYY (e.g., 15 January 2024)
    const fullMonthNames: Record<string, string> = {
      january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
      july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
    };
    match = trimmed.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
    if (match) {
      const [, d, m, y] = match;
      const month = fullMonthNames[m.toLowerCase()];
      if (month) {
        const result = `${y}-${month}-${d.padStart(2, '0')}`;
        console.log('[normalizeDate] Parsed as DD MMMM YYYY:', result);
        return result;
      }
    }
    
    // Try to parse MMMM DD, YYYY (e.g., January 15, 2024)
    match = trimmed.match(/^([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
    if (match) {
      const [, m, d, y] = match;
      const month = fullMonthNames[m.toLowerCase()];
      if (month) {
        const result = `${y}-${month}-${d.padStart(2, '0')}`;
        console.log('[normalizeDate] Parsed as MMMM DD, YYYY:', result);
        return result;
      }
    }
    
    // Try native JavaScript Date parsing as fallback
    try {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        const result = d.toISOString().split('T')[0];
        console.log('[normalizeDate] Parsed with native Date:', result);
        return result;
      }
    } catch (e) {
      console.log('[normalizeDate] Native Date parsing failed');
    }
    
    console.log('[normalizeDate] Could not parse, returning original:', trimmed);
    return trimmed;
  };

  // PDF Preview State
  const [pdfComponents, setPdfComponents] = useState<PdfComponents | null>(null);
  const [currentPageState, setCurrentPageState] = useState(1);
  const [numPagesState, setNumPagesState] = useState<number | null>(null);
  const [scaleState, setScaleState] = useState(0.8); // Adjusted for side preview

  useEffect(() => {
    const loadPdfComponents = async () => {
      try {
        const pdfModule = await import('react-pdf');
        // Configure worker for the imported pdfjs instance
        if (pdfModule.pdfjs) {
          pdfModule.pdfjs.GlobalWorkerOptions.workerSrc = `/pdfjs-worker/pdf.worker.min.mjs`;
        }
        setPdfComponents({
          Document: pdfModule.Document,
          Page: pdfModule.Page,
          pdfjs: pdfModule.pdfjs
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
  const zoomOut = () => setScaleState(prev => Math.max(0.4, prev - 0.2));

  const getFileUrl = (doc: ProjectDocument): string => {
    return doc.fileUrl || '';
  };

// Build httpHeaders for react-pdf Document component to pass auth token
  const pdfHttpHeaders = useMemo(() => {
    const token = localStorage.getItem('roadmaster-token');
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }, [previewDoc?.id, previewDoc?.type]);

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

  // --- Handlers for Upload Modal Inputs ---
  const handleSubjectChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setScannedMetadata({...scannedMetadata, subject: value});
    subjectHistory.updateSuggestions(value);
  };

  const handleRefNoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setScannedMetadata({...scannedMetadata, refNo: value});
    refNoHistory.updateSuggestions(value);
  };

  const handleFolderChange = (value: string) => {
    setUploadTargetFolder(value);
    folderHistory.updateSuggestions(value);
    folderHistory.saveEntry(value); // Save folder history immediately
  };

  const handleSubcontractorChange = (value: string) => {
    setScannedMetadata({...scannedMetadata, subId: value === 'none' ? '' : value});
    subIdHistory.updateSuggestions(value === 'none' ? '' : subcontractors.find(s => s.id === value)?.name || '');
    if (value !== 'none') subIdHistory.saveEntry(subcontractors.find(s => s.id === value)?.name || '');
  };

  // --- Handlers for Edit Modal Inputs ---
  const handleEditSubjectChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEditFormData({...editFormData, subject: value});
    subjectHistory.updateSuggestions(value);
  };

  const handleEditRefNoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEditFormData({...editFormData, refNo: value});
    refNoHistory.updateSuggestions(value);
  };

  const handleEditFolderChange = (value: string) => {
    setEditFormData({...editFormData, folder: value});
    folderHistory.updateSuggestions(value);
  };
  
  const processUploads = async () => {
      // Save histories *after* potential successful upload/review, if they were interacted with.
      // This is a simplified approach; more robust would be to save on blur or on final save.
      if (scannedMetadata.subject) subjectHistory.saveEntry(scannedMetadata.subject);
      if (scannedMetadata.refNo) refNoHistory.saveEntry(scannedMetadata.refNo);
      if (uploadTargetFolder !== 'All') folderHistory.saveEntry(uploadTargetFolder); // Save selected folder
      if (scannedMetadata.subId) subIdHistory.saveEntry(subcontractors.find(s => s.id === scannedMetadata.subId)?.name || '');


      const newDocs: ProjectDocument[] = [];
      const skippedDocs: string[] = [];
      
      const uploadToast = toast.loading(`Uploading ${uploadFiles.length} document(s) to cloud storage...`);
      const { realApiService } = await import('../../services/api/realApiService');

      try {
          for (const f of uploadFiles) {
              const existingDoc = (project.documents || []).find(doc => {
                  if (doc.name !== f.name) return false;
                  
                  // Normalize existing size to bytes for accurate comparison
                  let existingSizeBytes = 0;
                  if (typeof doc.size === 'string' && doc.size.includes('MB')) {
                      existingSizeBytes = Math.round(parseFloat(doc.size) * 1024 * 1024);
                  } else {
                      existingSizeBytes = parseInt(doc.size) || 0;
                  }
                  
                  // 100KB tolerance to handle slight differences in calculation/compression
                  return Math.abs(existingSizeBytes - f.size) < 102400; 
              });
              
              if (existingDoc) {
                  skippedDocs.push(f.name);
                  continue;
              }
              
              // 1. Convert to base64 with compression for images
              const { fileToCompressedBase64 } = await import('../../utils/data/imageUtils');
              const base64Data = await fileToCompressedBase64(f);
              
              // 2. Upload to binary store (Supabase Storage)
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
    // Pre-fill history suggestions when opening edit modal
    subjectHistory.updateSuggestions(doc.subject || '');
    refNoHistory.updateSuggestions(doc.refNo || '');
    folderHistory.updateSuggestions(doc.folder || '');
    const subName = subcontractors.find(s => s.name === doc.tags?.[0])?.id || 'none'; // Assuming first tag is sub name
    subIdHistory.updateSuggestions(doc.tags?.[0] || '');
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

      // Save updated values to history
      if (editFormData.subject) subjectHistory.saveEntry(editFormData.subject);
      if (editFormData.refNo) refNoHistory.saveEntry(editFormData.refNo);
      if (editFormData.folder) folderHistory.saveEntry(editFormData.folder);
      if (editFormData.folder) subIdHistory.saveEntry(subcontractors.find(s => s.id === editFormData.subId)?.name || '');
      
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

  // --- Auto-complete suggestion rendering helper ---
  const renderSuggestions = (
    historyHook: ReturnType<typeof useHistoryAutoFill>, 
    inputRef: React.RefObject<HTMLElement | HTMLInputElement | HTMLSelectElement>, // Ref to the input/select element or trigger element
    onChange: (value: string) => void, // Handler to update component state
    isSelect?: boolean // Flag to indicate if it's a Select component
  ) => {
    const handleSuggestionClick = (suggestion: string) => {
      onChange(suggestion); // Update component state
      historyHook.updateSuggestions(''); // Clear suggestions after selection
      inputRef.current?.focus(); // Keep focus on the input
    };

    // Ensure ref is current and accessible
    if (!inputRef.current) return null;

    return (
      <>
        {historyHook.suggestions.length > 0 && historyHook.searchTerm && (
          <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg max-h-60 overflow-auto border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            {historyHook.suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="cursor-pointer px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  // Refs for input elements to manage focus and suggestions display
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const refNoInputRef = useRef<HTMLInputElement>(null);
  const folderSelectRef = useRef<HTMLButtonElement>(null); // Ref for Select Trigger
  const subcontractorSelectRef = useRef<HTMLButtonElement>(null); // Ref for Select Trigger

  const DocumentPreview = ({ doc, isDialog = false }: { doc: ProjectDocument, isDialog?: boolean }) => {
    const isPdf = (doc.type?.toLowerCase().includes('pdf') || doc.fileUrl?.toLowerCase().endsWith('.pdf'));
    const isImage = (doc.type === 'IMAGE' || ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].some(ext => doc.fileUrl && doc.fileUrl.toLowerCase().endsWith(ext)));

    return (
      <div className="w-full h-full flex flex-col">
        {doc.fileUrl ? (
          <div className="flex-1 flex flex-col items-center justify-center p-0 overflow-hidden">
            {isPdf ? (
              <div className="w-full h-full flex flex-col">
                <div className="flex-1 flex items-center justify-center bg-muted/30 overflow-auto">
                  {Document ? (
                    <Document
                      file={getFileUrl(doc)}
                      httpHeaders={pdfHttpHeaders}
                      loading={<div className="text-center text-muted-foreground"><Loader2 className="animate-spin mx-auto mb-2" /> Loading PDF...</div>}
                      error={
                        <div className="flex flex-col items-center justify-center p-4 text-destructive">
                          <FileText className="h-12 w-12 mb-2" />
                          <p>Failed to load PDF</p>
                          <p className="text-sm text-muted-foreground mt-1 text-center">
                            This document may have an expired link or permission issue.
                          </p>
                        </div>
                      }
                      onLoadSuccess={onDocumentLoadSuccess}
                      onError={(error: Error) => console.error('PDF Load Error:', error)}
                    >
                      <Page pageNumber={currentPageState} scale={isDialog ? scaleState * 1.5 : scaleState} renderTextLayer={false} renderAnnotationLayer={false} />
                    </Document>
                  ) : (
                    <div className="text-center p-4 text-muted-foreground">
                      <Loader2 className="animate-spin mx-auto mb-2" />
                      <p>Initializing PDF viewer...</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-center gap-2 p-2 bg-background border-t">
                  <Button variant="outline" size="sm" className="h-7 px-2" onClick={goToPrevPage} disabled={currentPageState <= 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                    Page {currentPageState} / {numPagesState || '?'}
                  </span>
                  <Button variant="outline" size="sm" className="h-7 px-2" onClick={goToNextPage} disabled={currentPageState >= (numPagesState || 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Separator orientation="vertical" className="h-4 mx-1" />
                  <Button variant="outline" size="sm" className="h-7 px-2" onClick={zoomOut}>-</Button>
                  <span className="text-[10px] font-bold w-10 text-center">{Math.round(scaleState * (isDialog ? 150 : 100))}%</span>
                  <Button variant="outline" size="sm" className="h-7 px-2" onClick={zoomIn}>+</Button>
                </div>
              </div>
            ) : isImage ? (
              <div className="flex-1 w-full h-full flex items-center justify-center p-4 bg-muted/10">
                <img
                  src={getFileUrl(doc)}
                  alt="Document Preview"
                  className="max-w-full max-h-full object-contain rounded shadow-sm"
                />
              </div>
            ) : (
              <div className="text-center p-8 text-muted-foreground">
                <FileText className="mx-auto h-16 w-16 mb-4 opacity-20" />
                <p className="font-bold">Preview not available</p>
                <p className="text-xs mt-1 mb-4">This file type ({doc.type}) cannot be previewed directly.</p>
                <Button variant="outline" size="sm" asChild>
                  <a href={getFileUrl(doc)} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" /> Open in New Tab
                  </a>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground bg-muted/5">
            <AlertTriangle className="h-12 w-12 mb-4 text-amber-500 opacity-50" />
            <p className="font-bold">{doc.status === 'Unavailable' ? 'File Missing' : 'No URL Available'}</p>
            <p className="text-xs text-center mt-2">The document file could not be located in cloud storage.</p>
          </div>
        )}
      </div>
    );
  };

  return (
<div className="flex h-[calc(100vh-160px)] gap-2 p-2 overflow-hidden">
      {/* Folder Sidebar */}
      <Card className="w-60 flex flex-col shrink-0">
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
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

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Document Table */}
          <Card className={cn("flex-1 overflow-hidden flex flex-col transition-all duration-300", previewDoc ? "flex-[0.6]" : "flex-1")}>
            <ScrollArea className="flex-1 w-full rounded-md border">
              <div className="min-w-full">
                <Table>
                  <TableHeader className="bg-muted sticky top-0 z-10">
                    <TableRow className="hover:bg-muted">
                      <TableHead className="w-[25%] font-semibold whitespace-nowrap">Name</TableHead>
                      <TableHead className="w-[15%] font-semibold whitespace-nowrap">Ref No</TableHead>
                      <TableHead className="w-[18%] font-semibold whitespace-nowrap">Subject / Description</TableHead>
                      <TableHead className="w-[8%] font-semibold whitespace-nowrap">Type</TableHead>
                      <TableHead className="w-[8%] font-semibold whitespace-nowrap">Corr. Type</TableHead>
                      <TableHead className="w-[8%] font-semibold whitespace-nowrap">Folder</TableHead>
                      <TableHead className="w-[8%] font-semibold whitespace-nowrap">Letter Date</TableHead>
                      <TableHead className="text-right w-[10%] font-semibold whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-60 text-center">
                        <Loader2 className="mx-auto h-8 w-8 text-primary animate-spin mb-2" />
                        <p className="text-muted-foreground">Synchronizing documents...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredDocuments.length > 0 ? filteredDocuments.map(doc => (
                    <TableRow 
                      key={doc.id} 
                      className={cn(
                        "cursor-pointer group hover:bg-muted/50 transition-colors",
                        previewDoc?.id === doc.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                      )} 
                      onClick={() => {
                        setPreviewDoc(doc);
                        setCurrentPageState(1);
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {doc.status === 'Unavailable' ? (
                              <FileText className="h-4 w-4 text-gray-400"/>
                          ) : doc.type === 'IMAGE' ? (
                              <ImageIcon className="h-4 w-4 text-blue-500"/>
                          ) : (
                              <FileText className="h-4 w-4 text-rose-500"/>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className={cn("font-medium truncate", (doc.status ?? 'Active') === 'Unavailable' && "line-through text-muted-foreground")}>
                                {doc.name}
                            </span>
                            <div className="flex gap-1 flex-wrap mt-0.5">
                              {doc.tags?.slice(0, 2).map((t, idx) => <span key={idx} className="text-[9px] uppercase font-bold text-muted-foreground/70">{t}</span>)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">{doc.refNo || '-'}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs truncate w-full" title={doc.subject}>{doc.subject || 'No subject'}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={doc.type === 'IMAGE' ? 'default' : 'outline'} className="text-[10px] font-bold">
                          {doc.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {doc.correspondenceType ? (
                          <Badge variant={doc.correspondenceType === 'incoming' ? 'default' : 'secondary'} className="text-[10px] font-bold">
                            {doc.correspondenceType}
                          </Badge>
                        ) : <span className="text-[11px] text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded">
                          {doc.folder || 'General'}
                        </span>
                      </TableCell>
                      <TableCell className="text-[11px] font-medium text-muted-foreground">{doc.letterDate || '-'}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setPreviewDoc(doc); setIsPreviewDialogOpen(true); }}>
                            <Maximize2 className="h-3.5 w-3.5" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-7 w-7 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleOpenEdit(doc)}>
                                <Pencil className="mr-2 h-4 w-4 text-amber-600" /> Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadDocument(doc)}>
                                <ArrowDownLeft className="mr-2 h-4 w-4 text-emerald-600" /> Download
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteDoc(doc.id)} className="text-rose-600">
                                <Trash2 className="mr-2 h-4 w-4 text-rose-600" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-60 text-center">
                        <FileText className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                        <p className="text-xl font-semibold mb-1">No documents found</p>
                        <p className="text-muted-foreground mb-4">Upload a document to get started.</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </Card>

          {/* Integrated Side Preview */}
          {previewDoc && (
            <Card className="flex-1 flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300">
              <div className="p-3 border-b flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 bg-primary/10 rounded">
                    {previewDoc.type === 'IMAGE' ? <ImageIcon className="h-3.5 w-3.5 text-primary" /> : <FileText className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  <h3 className="text-xs font-bold truncate">{previewDoc.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsPreviewDialogOpen(true)} title="Full Screen">
                    <Maximize2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewDoc(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              
              <div className="flex-1 min-h-0 bg-muted/5 relative">
                <DocumentPreview doc={previewDoc} />
              </div>

<div className="p-4 border-t bg-background overflow-y-auto max-h-[35%] shrink-0">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Metadata</h4>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] font-bold" onClick={() => handleOpenEdit(previewDoc)}>
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-muted-foreground">Subject</p>
                      <p className="text-xs font-bold truncate" title={previewDoc.subject}>{previewDoc.subject || 'Not specified'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-muted-foreground">Reference</p>
                      <p className="text-xs font-bold truncate">{previewDoc.refNo || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-muted-foreground">Type</p>
                      <Badge variant={previewDoc.type === 'IMAGE' ? 'default' : 'outline'} className="text-[10px] font-bold">
                        {previewDoc.type}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-muted-foreground">Corr. Type</p>
                      {previewDoc.correspondenceType ? (
                        <Badge variant={previewDoc.correspondenceType === 'incoming' ? 'default' : 'secondary'} className="text-[10px] font-bold">
                          {previewDoc.correspondenceType}
                        </Badge>
                      ) : <span className="text-[10px] text-muted-foreground">-</span>}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-muted-foreground">Folder</p>
                      <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded">
                        {previewDoc.folder || 'General'}
                      </span>
                    </div>
                  </div>

<div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-muted-foreground">Letter Date</p>
                      <p className="text-xs font-medium">{previewDoc.letterDate || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-muted-foreground">Date</p>
                      <p className="text-xs font-medium">{previewDoc.date}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-muted-foreground">Uploaded By</p>
                      <p className="text-xs font-medium truncate">{previewDoc.createdBy || 'Unknown'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-muted-foreground">Last Modified</p>
                      <p className="text-xs font-medium">{previewDoc.lastModified}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-muted-foreground">Status</p>
                      <Badge variant={previewDoc.status === 'Active' ? 'default' : 'secondary'} className="text-[10px] font-bold">
                        {previewDoc.status || 'Active'}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-muted-foreground">Version</p>
                      <span className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded">
                        v{previewDoc.currentVersion || 1}
                      </span>
                    </div>
                  </div>
                </div>
                
                <Separator className="my-3" />
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[9px] font-black uppercase text-muted-foreground">Tags</p>
                    <Plus className="h-3 w-3 text-primary cursor-pointer" />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {previewDoc.tags?.map(t => (
                      <Badge key={t} variant="secondary" className="h-5 text-[9px] font-black uppercase tracking-tighter">
                        {t}
                      </Badge>
                    ))}
                    {(!previewDoc.tags || previewDoc.tags.length === 0) && <p className="text-[10px] italic text-muted-foreground">No tags</p>}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="sm:max-w-[800px] border-border/50">
          <DialogHeader>
            <DialogTitle>Add to Project Archive</DialogTitle>
            <DialogDescription>Upload documents or scan them using AI OCR.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* File Upload / Preview Area */}
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg h-80 bg-muted/20 relative">
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

            {/* Metadata and Controls Area */}
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
              
              {/* Folder Select with History */}
              <div className="grid gap-2">
                <Label htmlFor="upload-folder">Target Folder</Label>
                <div className="relative">
                  <Select value={uploadTargetFolder} onValueChange={handleFolderChange}>
                    <SelectTrigger ref={folderSelectRef} id="upload-folder" aria-label="Target Folder">
                      <SelectValue placeholder="Select folder" />
                    </SelectTrigger>
                    <SelectContent>
                      {FOLDERS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {renderSuggestions(folderHistory, folderSelectRef, handleFolderChange, true)}
                </div>
              </div>
              
              {/* Subcontractor Select with History */}
              <div className="grid gap-2">
                <Label htmlFor="upload-subcontractor">Associated Subcontractor</Label>
                <div className="relative">
                  <Select 
                    value={scannedMetadata.subId || 'none'} 
                    onValueChange={(value) => handleSubcontractorChange(value)}
                  >
                    <SelectTrigger ref={subcontractorSelectRef} id="upload-subcontractor" aria-label="Associated Subcontractor">
                      <SelectValue placeholder="Associated Subcontractor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None / General</SelectItem>
                      {subcontractors.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {renderSuggestions(subIdHistory, subcontractorSelectRef, (value) => handleSubcontractorChange(value), true)}
                </div>
              </div>

              {/* Subject Input with History */}
              <div className="grid gap-2">
                <Label htmlFor="upload-subject">Subject Line</Label>
                <div className="relative">
                  <Input 
                    id="upload-subject"
                    placeholder="e.g. Site Inspection Report"
                    value={scannedMetadata.subject} 
                    onChange={handleSubjectChange} 
                    onBlur={() => subjectHistory.saveEntry(scannedMetadata.subject)} // Save on blur
                    ref={subjectInputRef}
                    aria-label="Subject Line"
                  />
                  {renderSuggestions(subjectHistory, subjectInputRef, (value) => setScannedMetadata({...scannedMetadata, subject: value}))}
                </div>
              </div>

              <div className="flex gap-2">
                {/* Reference No Input with History */}
                <div className="grid gap-2 flex-1">
                  <Label htmlFor="upload-refNo">Reference No</Label>
                  <div className="relative">
                    <Input 
                      id="upload-refNo"
                      placeholder="e.g. SIR-2023-001" 
                      value={scannedMetadata.refNo} 
                      onChange={handleRefNoChange} 
                      onBlur={() => refNoHistory.saveEntry(scannedMetadata.refNo)} // Save on blur
                      ref={refNoInputRef}
                      aria-label="Reference Number"
                    />
                    {renderSuggestions(refNoHistory, refNoInputRef, (value) => setScannedMetadata({...scannedMetadata, refNo: value}))}
                  </div>
                </div>
                
                {/* Letter Date - typically not auto-filled */}
                <div className="grid gap-2 flex-1">
                  <Label htmlFor="upload-letterDate">Letter Date</Label>
                  <Input
                    id="upload-letterDate"
                    type="date"
                    value={scannedMetadata.letterDate} 
                    onChange={e => setScannedMetadata({...scannedMetadata, letterDate: e.target.value})}
                    aria-label="Letter Date"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                {/* Correspondence Type Select - might benefit from history if common */}
                <Select 
                    value={scannedMetadata.correspondenceType || 'none'}
                    onValueChange={value => {
                        const actualValue = value === 'none' ? '' : value;
                        setScannedMetadata({...scannedMetadata, correspondenceType: actualValue});
                        // Potentially save history for correspondence type if it's a frequent choice
                    }}
                >
                    <SelectTrigger aria-label="Correspondence Type">
                        <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Not Specified</SelectItem>
                        <SelectItem value="incoming">Incoming</SelectItem>
                        <SelectItem value="outgoing">Outgoing</SelectItem>
                    </SelectContent>
                </Select>
                
                {/* Upload Date - typically not auto-filled */}
                <Input
                  type="date"
                  value={scannedMetadata.date} 
                  onChange={e => setScannedMetadata({...scannedMetadata, date: e.target.value})}
                  aria-label="Upload Date"
                  className="flex-1"
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

      {/* Full Screen Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        {previewDoc && (
          <DialogContent className="max-w-[calc(100vw-4rem)] h-[calc(100vh-4rem)] flex flex-col p-0">
            <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <DialogTitle className="text-lg font-bold">{previewDoc.name}</DialogTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={getFileUrl(previewDoc)} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" /> Open Original
                  </a>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsPreviewDialogOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </DialogHeader>
            <div className="flex-1 min-h-0 bg-muted/20">
              <DocumentPreview doc={previewDoc} isDialog={true} />
            </div>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={!!editingDoc} onOpenChange={() => setEditingDoc(null)}>
        <DialogContent className="sm:max-w-[425px] border-border/50">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>Update document metadata for the project archive.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {editingDoc && (
              <>
                {/* Name */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-name" className="text-right">Name</Label>
                  <Input id="edit-name" value={editFormData.name || ''} onChange={e => setEditFormData({...editFormData, name: e.target.value})} placeholder="e.g. MyDocument.pdf" className="col-span-3" />
                </div>
                {/* Subject */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-subject" className="text-right">Subject</Label>
                  <div className="relative col-span-3">
                    <Input id="edit-subject" value={editFormData.subject || ''} onChange={handleEditSubjectChange} onBlur={() => editFormData.subject && subjectHistory.saveEntry(editFormData.subject)} placeholder="e.g. Site Inspection Report" ref={subjectInputRef} className="col-span-3" />
                    {renderSuggestions(subjectHistory, subjectInputRef, (value) => setEditFormData({...editFormData, subject: value}))}
                  </div>
                </div>
                {/* Reference No */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-ref" className="text-right">Ref No.</Label>
                  <div className="relative col-span-3">
                    <Input id="edit-ref" value={editFormData.refNo || ''} onChange={handleEditRefNoChange} onBlur={() => editFormData.refNo && refNoHistory.saveEntry(editFormData.refNo)} placeholder="e.g. SIR-2023-001" ref={refNoInputRef} className="col-span-3" />
                    {renderSuggestions(refNoHistory, refNoInputRef, (value) => setEditFormData({...editFormData, refNo: value}))}
                  </div>
                </div>
                {/* Folder */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-folder" className="text-right">Folder</Label>
                  <div className="relative col-span-3">
                    <Select value={editFormData.folder || ''} onValueChange={(value) => {handleEditFolderChange(value); setEditFormData({...editFormData, folder: value})}}>
                      <SelectTrigger ref={folderSelectRef} id="edit-folder">
                        <SelectValue placeholder="Select folder" />
                      </SelectTrigger>
                      <SelectContent>
                        {FOLDERS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {renderSuggestions(folderHistory, folderSelectRef, (value) => setEditFormData({...editFormData, folder: value}), true)}
                  </div>
                </div>
                {/* Letter Date */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-letterDate" className="text-right">Letter Date</Label>
                  <Input id="edit-letterDate" type="date" value={editFormData.letterDate?.split('T')[0] || ''} onChange={e => setEditFormData({...editFormData, letterDate: e.target.value})} className="col-span-3" />
                </div>
                {/* Correspondence Type */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-correspondenceType" className="text-right">Correspondence Type</Label>
                  <Select value={editFormData.correspondenceType || ''} onValueChange={value => setEditFormData({...editFormData, correspondenceType: value as any})}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="incoming">Incoming</SelectItem>
                      <SelectItem value="outgoing">Outgoing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
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

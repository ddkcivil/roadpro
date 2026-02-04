import React, { useState, useRef, useMemo, useEffect } from 'react';
// Import missing types from types.ts
import { Project, UserRole, ProjectDocument, ContractBill, DocumentVersion, Comment } from '../../types';
import { 
    Alert, LinearProgress, Grid, Box, Typography, Button, Divider, Paper, 
    Stack, TextField, ToggleButtonGroup, ToggleButton, FormControl, 
    InputLabel, Select, MenuItem, DialogContent, DialogActions, Dialog, 
    DialogTitle, Table, TableHead, TableRow, TableCell, TableBody, 
    IconButton, Chip, InputAdornment, Tooltip, Avatar, Breadcrumbs, Link,
    List, ListItem, ListItemButton, ListItemIcon, ListItemText
} from '@mui/material';
import { 
    Sparkles, FileText, Loader2, User, Mail, ArrowDownLeft, ArrowUpRight, 
    UploadCloud, File, Plus, Search, Folder, MoreVertical, Trash2, 
    ExternalLink, Filter, Briefcase, Receipt, Image as ImageIcon, CheckCircle,
    X, Tag
} from 'lucide-react';
import { ocrService } from '../../services/ai/ocrService';
// PDF imports moved to dynamic imports to avoid Vite optimization issues
// import { Document, Page, pdfjs } from 'react-pdf';
let Document: any;
let Page: any;
let pdfjs: any;


import CommentsPanel from './CommentsPanel';

// NOTE: We'll configure the PDF.js worker when the component mounts to ensure proper initialization
// This avoids conflicts with react-pdf's internal initialization

// Log initialization for debugging
console.log('PDF.js worker initialization deferred to component mount');

interface Props {
  project: Project;
  userRole: UserRole;
  onProjectUpdate: (project: Project) => void;
}

const FOLDERS = ['General', 'Contracts', 'Drawings', 'Reports', 'Correspondence', 'Financials', 'Sub-Docs'];

const DocumentsModule: React.FC<Props> = ({ project, userRole, onProjectUpdate }) => {
  // Utility function to convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Utility function to convert base64 to blob URL
  const base64ToBlobUrl = (base64: string): string => {
    try {
      const byteString = atob(base64.split(',')[1]);
      const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
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
  };

  // Utility function to get file URL - handles both blob URLs and base64 data
  const getFileUrl = (doc: ProjectDocument): string => {
    if (!doc.fileUrl) return '';
    
    // If it's a base64 string, convert it to blob URL
    if (doc.fileUrl.startsWith('data:')) {
      return base64ToBlobUrl(doc.fileUrl);
    }
    
    // For blob URLs and other URLs, return as-is
    // Note: Expired blob URLs will cause errors when accessed
    // This is handled by the PDF component's error handling
    return doc.fileUrl;
  };
  // Dynamically load PDF components when needed
  useEffect(() => {
    const loadPdfComponents = async () => {
      try {
        const pdfModule = await import('react-pdf');
        Document = pdfModule.Document;
        Page = pdfModule.Page;
        pdfjs = pdfModule.pdfjs;
        
        // Log the actual version from the loaded pdfjs
        console.log('PDF.js version detected:', pdfjs?.version);
        
        // Configure the worker after pdfjs is loaded with local file to avoid CORS issues
        if (pdfjs && pdfjs.GlobalWorkerOptions) {
          // Use the local worker file to avoid CORS issues and version mismatches
          pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs-worker/pdf.worker.min.mjs';
        }
        
        console.log('PDF.js components loaded successfully with version:', pdfjs?.version);
      } catch (error) {
        console.warn('Failed to load PDF components:', error);
        // Set fallback values to prevent undefined errors
        Document = () => <div>PDF viewer unavailable</div>;
        Page = () => <div>PDF page unavailable</div>;
      }
    };
    
    loadPdfComponents();
  }, []);
  // Initialize PDF.js worker after component mounts to ensure version match
  useEffect(() => {
    if (pdfjs && pdfjs.version) {
      console.log(`PDF.js worker initialized with version: ${pdfjs.version}`);
    }
  }, []);
  
  const [activeFolder, setActiveFolder] = useState('General');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'SIMPLE' | 'SCAN'>('SIMPLE');
  const [scanStep, setScanStep] = useState<'IDLE' | 'PROCESSING' | 'REVIEW'>('IDLE');
  const [scannedMetadata, setScannedMetadata] = useState({ subject: '', refNo: '', date: '', letterDate: '', correspondenceType: undefined as 'incoming' | 'outgoing' | undefined, sender: '', recipient: '', subId: '' });
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  
  // PDF Viewer State and Functions
  const [currentPageState, setCurrentPageState] = useState(1);
  const [numPagesState, setNumPagesState] = useState<number | null>(null);
  const [scaleState, setScaleState] = useState(1.0);
  
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPagesState(numPages);
    setCurrentPageState(1); // Reset to first page when document loads
  };
  
  const goToPrevPage = () => {
    setCurrentPageState(prev => Math.max(1, prev - 1));
  };
  
  const goToNextPage = () => {
    if (numPagesState !== null) {
      setCurrentPageState(prev => Math.min(numPagesState, prev + 1));
    }
  };
  
  const zoomIn = () => {
    setScaleState(prev => Math.min(2, prev + 0.2));
  };
  
  const zoomOut = () => {
    setScaleState(prev => Math.max(0.5, prev - 0.2));
  };
  
  // Clean up object URLs when component unmounts or when documents change
  useEffect(() => {
    // Clean up any object URLs from the previous project state
    return () => {
      (project.documents || []).forEach(doc => {
        if (doc.fileUrl && doc.fileUrl.startsWith('blob:') && !doc.fileUrl.startsWith('data:')) {
          // Only revoke blob URLs, not base64 data
          URL.revokeObjectURL(doc.fileUrl);
        }
      });
    };
  }, [project.documents]); // Run cleanup when documents change
  
  // Clean up preview doc object URL when it changes
  useEffect(() => {
    return () => {
      // Clean up preview document URL when preview changes
      if (previewDoc && previewDoc.fileUrl && previewDoc.fileUrl.startsWith('blob:') && !previewDoc.fileUrl.startsWith('data:')) {
        // Only revoke blob URLs, not base64 data
        URL.revokeObjectURL(previewDoc.fileUrl);
      }
    };
  }, [previewDoc]);

  // Bill State
  const [addBillModal, setAddBillModal] = useState(false);
  const [isBillAutoFilling, setIsBillAutoFilling] = useState(false);
  const [newBill, setNewBill] = useState<Partial<ContractBill>>({ items: [] });

  

  const subcontractors = project.agencies?.filter(agency => agency.type === 'subcontractor') || [];

  const filteredDocuments = useMemo(() => {
    return (project.documents || []).filter(doc => 
        (doc.folder === activeFolder || activeFolder === 'All') &&
        (doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
         doc.subject?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [project.documents || [], activeFolder, searchTerm]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          setUploadFiles(Array.from(e.target.files));
      }
  };

  const handleScanAnalysis = async () => {
      if (uploadFiles.length === 0) return;
      setScanStep('PROCESSING');
      
      const file = uploadFiles[0];
      
      // Check for duplicates before processing
      const existingDoc = (project.documents || []).find(doc => 
          doc.name === file.name && 
          Math.abs(parseFloat(doc.size) - parseFloat(`${(file.size / 1024 / 1024).toFixed(2)}`)) < 0.1
      );
      
      if (existingDoc) {
          alert(`Document '${file.name}' already exists. Skipping duplicate.`);
          setScanStep('IDLE');
          return;
      }
      
      const reader = new FileReader();
      reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          // Initialize OCR service and process document
          await ocrService.initialize();
          const result = await ocrService.processDocument(file);
          
          // Extract metadata from OCR result
          const extractedData = result.structuredData;
          const subject = extractedData.subjects?.[0] || extractedData.invoices?.[0] || extractedData.codes?.[0] || 'Document Analysis';
          const refNo = extractedData.refs?.[0] || extractedData.codes?.[0] || extractedData.invoices?.[0] || '';
          const letterDate = extractedData.dates?.[0] || ''; // Date from the document
          const scanDate = new Date().toISOString().split('T')[0]; // Today's date as scanning date
          const sender = extractedData.senders?.[0] || extractedData.contractors?.[0] || 'Unknown';
          const recipient = extractedData.recipients?.[0] || 'Project Team'; // Default recipient
          
          // Determine correspondence type based on sender/recipient
          const correspondenceType = sender.includes('Project') || sender.includes('Team') ? 'outgoing' : 'incoming';
          
          setScannedMetadata({
              subject: subject,
              refNo: refNo,
              date: scanDate, // Use scanning date as document date
              letterDate: letterDate, // Use extracted date from document
              correspondenceType: correspondenceType,
              sender: sender,
              recipient: recipient,
              subId: '' // Will try to match sub in future version
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
    {/* Fix: Corrected variable name from previewPhoto to previewDoc */}
    if (previewDoc && previewDoc.id === docId) {
        setPreviewDoc(prev => prev ? { ...prev, tags: (prev.tags || []).filter(t => t !== tagToRemove) } : null);
    }
  };

  const processUploads = async () => {
      const newDocs: ProjectDocument[] = [];
      const skippedDocs: string[] = [];
      
      for (const f of uploadFiles) {
          // Check for duplicates based on name and size
          const existingDoc = (project.documents || []).find(doc => 
              doc.name === f.name && 
              Math.abs(parseFloat(doc.size) - parseFloat(`${(f.size / 1024 / 1024).toFixed(2)}`)) < 0.1
          );
          
          if (existingDoc) {
              // Skip based on name and size only
              skippedDocs.push(f.name);
              continue;
          }
          
          const versionId = `ver-${Date.now()}-${Math.random()}`;
          const newVersion: DocumentVersion = {
              id: versionId,
              version: 1,
              date: new Date().toISOString().split('T')[0],
              size: `${(f.size / 1024 / 1024).toFixed(2)} MB`,
              filePath: `uploads/${Date.now()}_${f.name}`, // In a real app, this would be the actual file path
              uploadedBy: 'Current User' // In a real app, this would be the current user's ID
          };
          
          // Convert file to base64 for persistent storage
          const fileUrl = await fileToBase64(f);
          
          // Determine document type based on file extension and MIME type
          const isImage = f.type.includes('image') || ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].some(ext => f.name.toLowerCase().endsWith(ext));
          const isPdf = f.type.includes('pdf') || f.name.toLowerCase().endsWith('.pdf');
          
          newDocs.push({
              id: `doc-${Date.now()}-${Math.random()}`,
              name: f.name,
              type: isImage ? 'IMAGE' : isPdf ? 'PDF' : 'OTHER',
              date: scanStep === 'REVIEW' ? scannedMetadata.date : new Date().toISOString().split('T')[0], // Use scanning date as document date
              size: `${(f.size / 1024 / 1024).toFixed(2)} MB`,
              folder: uploadTargetFolder,
              tags: scannedMetadata.subId ? [subcontractors.find(s => s.id === scannedMetadata.subId)?.name || ''] : [],
              subject: scanStep === 'REVIEW' ? scannedMetadata.subject : undefined,
              refNo: scanStep === 'REVIEW' ? scannedMetadata.refNo : undefined,
              letterDate: scanStep === 'REVIEW' ? scannedMetadata.letterDate : undefined, // Date from the document
              correspondenceType: scanStep === 'REVIEW' ? scannedMetadata.correspondenceType : undefined, // Incoming/outgoing label
              fileUrl: fileUrl, // URL to access the document file
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
      
      // Show feedback to user
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
  
  const handleDeleteDoc = (id: string) => {
      if (!canDelete) {
          alert('Only Admin and Project Manager can delete documents');
          return;
      }
      
      if (confirm("Permanently delete this document?")) {
          // Find the document to delete and clean up its file URL if it exists
          const docToDelete = (project.documents || []).find(d => d.id === id);
          if (docToDelete && docToDelete.fileUrl && docToDelete.fileUrl.startsWith('blob:') && !docToDelete.fileUrl.startsWith('data:')) {
              // Only revoke blob URLs, not base64 data
              URL.revokeObjectURL(docToDelete.fileUrl);
          }
          
          // Clean up the object URL if this document is currently being previewed
          if (previewDoc && previewDoc.id === id && previewDoc.fileUrl && previewDoc.fileUrl.startsWith('blob:') && !previewDoc.fileUrl.startsWith('data:')) {
              // Only revoke blob URLs, not base64 data
              URL.revokeObjectURL(previewDoc.fileUrl);
          }
          
          onProjectUpdate({ ...project, documents: (project.documents || []).filter(d => d.id !== id) });
          
          // Close preview if this document was being previewed
          if (previewDoc && previewDoc.id === id) {
              setPreviewDoc(null);
          }
      }
  };
  
  const handleUploadNewVersion = async (docId: string, file: File) => {
    // Check if the file is a duplicate of the current version
    const currentDoc = (project.documents || []).find(doc => doc.id === docId);
    if (currentDoc) {
      const currentVersion = currentDoc.versions.find(v => v.version === currentDoc.currentVersion);
      if (currentVersion && 
          currentVersion.filePath.split('_').pop() === file.name &&
          Math.abs(parseFloat(currentVersion.size) - parseFloat(`${(file.size / 1024 / 1024).toFixed(2)} MB`)) < 0.1) {
        alert('This file appears to be the same as the current version. Not adding as new version.');
        return;
      }
    }
    
    const updatedDocs = [];
    for (const doc of project.documents || []) {
      if (doc.id === docId) {
        // Revoke the old file URL if it exists and it's a blob URL (but not base64)
        if (doc.fileUrl && doc.fileUrl.startsWith('blob:') && !doc.fileUrl.startsWith('data:')) {
          // Only revoke blob URLs, not base64 data
          URL.revokeObjectURL(doc.fileUrl);
        }
        
        const newVersionNumber = doc.versions.length + 1;
        const versionId = `ver-${Date.now()}-${Math.random()}`;
        
        const newVersion: DocumentVersion = {
          id: versionId,
          version: newVersionNumber,
          date: new Date().toISOString().split('T')[0],
          size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          filePath: `uploads/${Date.now()}_${file.name}`,
          uploadedBy: 'Current User',
          notes: `Uploaded new version`
        };
        
        // Determine document type based on file extension and MIME type
        const isImage = file.type.includes('image') || ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].some(ext => file.name.toLowerCase().endsWith(ext));
        const isPdf = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
        
        // Convert file to base64 for persistent storage
        const base64Data = await fileToBase64(file);
        
        updatedDocs.push({
          ...doc,
          type: isImage ? 'IMAGE' : isPdf ? 'PDF' : 'OTHER', // Update type based on new file
          fileUrl: base64Data, // Store base64 data instead of blob URL
          versions: [...doc.versions, newVersion],
          currentVersion: newVersionNumber,
          lastModified: new Date().toISOString().split('T')[0]
        });
      } else {
        updatedDocs.push(doc);
      }
    }
    
    onProjectUpdate({ ...project, documents: updatedDocs });
    
    // Update preview doc if this document is currently being previewed
    if (previewDoc && previewDoc.id === docId) {
      // Convert file to base64 for persistent storage
      const base64Data = await fileToBase64(file);
      
      setPreviewDoc(prev => {
        if (!prev) return null;
        // Revoke the old URL in the preview doc if it exists and it's a blob URL (but not base64)
        if (prev.fileUrl && prev.fileUrl.startsWith('blob:') && !prev.fileUrl.startsWith('data:')) {
          // Only revoke blob URLs, not base64 data
          URL.revokeObjectURL(prev.fileUrl);
        }
        
        // Determine document type based on file extension and MIME type
        const isImage = file.type.includes('image') || ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].some(ext => file.name.toLowerCase().endsWith(ext));
        const isPdf = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
        
        return { 
          ...prev, 
          type: isImage ? 'IMAGE' : isPdf ? 'PDF' : 'OTHER',
          fileUrl: base64Data 
        };
      });
    }
  };
  
  const handleRevertToVersion = (docId: string, versionId: string) => {
    const updatedDocs = (project.documents || []).map(doc => {
      if (doc.id === docId) {
        // Store the old file URL to clean it up later
        const oldFileUrl = doc.fileUrl;
        
        // Revoke the old file URL if it exists and it's a blob URL (but not base64)
        if (oldFileUrl && oldFileUrl.startsWith('blob:') && !oldFileUrl.startsWith('data:')) {
          // Only revoke blob URLs, not base64 data
          URL.revokeObjectURL(oldFileUrl);
        }
        
        const targetVersion = doc.versions.find(v => v.id === versionId);
        if (targetVersion) {
          return {
            ...doc,
            currentVersion: targetVersion.version,
            lastModified: new Date().toISOString().split('T')[0]
          };
        }
      }
      return doc;
    });
    
    onProjectUpdate({ ...project, documents: updatedDocs });
    
    // If the reverted document was being previewed, update the preview
    if (previewDoc && previewDoc.id === docId) {
      setPreviewDoc(prev => {
        if (!prev) return null;
        // Revoke the old URL in the preview doc if it exists and it's a blob URL (but not base64)
        if (prev.fileUrl && prev.fileUrl.startsWith('blob:') && !prev.fileUrl.startsWith('data:')) {
          // Only revoke blob URLs, not base64 data
          URL.revokeObjectURL(prev.fileUrl);
        }
        // Since we don't have the actual file for the reverted version, 
        // we'll clear the fileUrl and show "No preview available"
        return { ...prev, fileUrl: undefined };
      });
    }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 140px)', display: 'flex', gap: 3 }}>
      {/* LEFT: Sidebar Folders */}
      <Paper sx={{ width: 240, borderRadius: 4, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} variant="outlined">
          <Box p={2} borderBottom="1px solid #f1f5f9">
              <Button 
                fullWidth variant="contained" 
                startIcon={<Plus size={18}/>} 
                onClick={() => setUploadModalOpen(true)}
                sx={{ py: 1.2, borderRadius: 2 }}
              >
                  New Upload
              </Button>
          </Box>
          <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
              <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ px: 2, py: 1, display: 'block' }}>FOLDERS</Typography>
              <List disablePadding>
                  <ListItemButton selected={activeFolder === 'All'} onClick={() => setActiveFolder('All')} sx={{ borderRadius: 2 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}><Folder size={18}/></ListItemIcon>
                      <ListItemText primary="All Documents" primaryTypographyProps={{ variant: 'body2', fontWeight: activeFolder === 'All' ? 'bold' : 'medium' }} />
                  </ListItemButton>
                  {FOLDERS.map(f => (
                      <ListItemButton key={f} selected={activeFolder === f} onClick={() => setActiveFolder(f)} sx={{ borderRadius: 2 }}>
                          <ListItemIcon sx={{ minWidth: 36 }}><Folder size={18} className={activeFolder === f ? "text-indigo-600" : "text-slate-400"}/></ListItemIcon>
                          <ListItemText primary={f} primaryTypographyProps={{ variant: 'body2', fontWeight: activeFolder === f ? 'bold' : 'medium' }} />
                      </ListItemButton>
                  ))}
              </List>
          </Box>
      </Paper>

      {/* RIGHT: Document Browser */}
      <Box flex={1} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
              <Breadcrumbs>
                  <Link underline="hover" color="inherit" sx={{ display: 'flex', alignItems: 'center' }}>
                      <Folder size={16} className="mr-1"/> Project Storage
                  </Link>
                  <Typography color="text.primary" fontWeight="bold">{activeFolder}</Typography>
              </Breadcrumbs>
              <TextField 
                size="small" placeholder="Search files..." 
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                InputProps={{ startAdornment: <Search size={16} className="text-slate-400 mr-2"/> }}
                sx={{ width: 300, bgcolor: 'white' }}
              />
          </Box>

          <Paper variant="outlined" sx={{ flex: 1, borderRadius: 4, overflow: 'hidden', bgcolor: 'white' }}>
              <Table stickyHeader size="small">
                  <TableHead sx={{ bgcolor: 'slate.50' }}>
                      <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Reference / Subject</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Tags</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Size</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                      </TableRow>
                  </TableHead>
                  <TableBody>
                      {filteredDocuments.map(doc => (
                          <TableRow key={doc.id} hover sx={{ cursor: 'pointer' }} onClick={() => setPreviewDoc(doc)}>
                              <TableCell>
                                  <Box display="flex" alignItems="center" gap={1.5}>
                                      {doc.status === 'Unavailable' ? (
                                          <FileText size={18} className="text-gray-400"/>
                                      ) : doc.type === 'IMAGE' ? (
                                          <ImageIcon size={18} className="text-blue-500"/>
                                      ) : (
                                          <FileText size={18} className="text-rose-500"/>
                                      )}
                                      <Typography 
                                          variant="body2" 
                                          fontWeight="medium"
                                          sx={{ 
                                            textDecoration: doc.status === 'Unavailable' ? 'line-through' : 'none',
                                            color: doc.status === 'Unavailable' ? 'text.disabled' : 'text.primary'
                                          }}
                                      >
                                          {doc.name}
                                          {doc.status === 'Unavailable' && ' (Unavailable)'}
                                      </Typography>
                                  </Box>
                              </TableCell>
                              <TableCell>
                                  <Typography variant="caption" fontWeight="bold" display="block">{doc.refNo || '-'}</Typography>
                                  <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>{doc.subject || 'No subject'}</Typography>
                              </TableCell>
                              <TableCell>
                                  <Box display="flex" gap={0.5} flexWrap="wrap" maxWidth={200}>
                                      {doc.tags?.map((t, idx) => <Chip key={idx} label={t} size="small" sx={{ height: 18, fontSize: '0.6rem' }} color="primary" variant="outlined"/>)}
                                  </Box>
                              </TableCell>
                              <TableCell><Typography variant="caption">{doc.date}</Typography></TableCell>
                              <TableCell><Typography variant="caption">{doc.size}</Typography></TableCell>
                              <TableCell align="right">
                                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc.id); }}><Trash2 size={16} className="text-slate-400 hover:text-red-600"/></IconButton>
                              </TableCell>
                          </TableRow>
                      ))}
                      {filteredDocuments.length === 0 && (
                          <TableRow>
                              <td colSpan={6} align="center" style={{ padding: '40px', textAlign: 'center' }}>
                                  <UploadCloud size={48} strokeWidth={1} className="text-slate-300 mx-auto mb-2"/>
                                  <Typography color="text.secondary">No files in this folder.</Typography>
                              </td>
                          </TableRow>
                      )}
                  </TableBody>
              </Table>
          </Paper>
      </Box>

      {/* Upload Dialog */}
      <Dialog open={uploadModalOpen} onClose={() => setUploadModalOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
          <DialogTitle sx={{ fontWeight: 'bold' }}>Add to Project Archive</DialogTitle>
          <DialogContent>
               <Box mb={3} borderBottom={1} borderColor="divider" display="flex" gap={1}>
                   <Button onClick={() => setUploadMode('SIMPLE')} variant={uploadMode === 'SIMPLE' ? 'contained' : 'text'}>Standard Upload</Button>
                   <Button onClick={() => setUploadMode('SCAN')} variant={uploadMode === 'SCAN' ? 'contained' : 'text'} startIcon={<Sparkles size={16}/>}>AI OCR Scan</Button>
               </Box>

               <Grid container spacing={3}>
                   <Grid item xs={12} md={6}>
                       <Box 
                           border="2px dashed #e2e8f0" borderRadius={3} height={320} display="flex" 
                           flexDirection="column" alignItems="center" justifyContent="center" bgcolor="slate.50"
                       >
                           {uploadFiles.length > 0 ? (
                               <Box textAlign="center" width="100%" px={4}>
                                   <FileText size={48} className="mx-auto text-indigo-500 mb-2"/>
                                   <Typography variant="body2" fontWeight="bold" noWrap>{uploadFiles[0].name}</Typography>
                                   <Button size="small" color="error" onClick={() => { setUploadFiles([]); setScanStep('IDLE'); }}>Clear</Button>
                                   
                                   {uploadMode === 'SCAN' && (
                                       <Box mt={3}>
                                           <Button 
                                               variant="contained" 
                                               fullWidth 
                                               startIcon={scanStep === 'PROCESSING' ? <Loader2 className="animate-spin"/> : <Sparkles size={18}/>}
                                               onClick={handleScanAnalysis}
                                               disabled={scanStep === 'PROCESSING'}
                                           >
                                               {scanStep === 'PROCESSING' ? 'Reading Content...' : 'Analyze Document'}
                                           </Button>
                                       </Box>
                                   )}
                               </Box>
                           ) : (
                               <Button variant="outlined" component="label" sx={{ borderRadius: 2 }}>
                                   Browse Files
                                   <input type="file" hidden multiple={uploadMode === 'SIMPLE'} onChange={handleFileSelect} />
                               </Button>
                           )}
                       </Box>
                   </Grid>
                   <Grid item xs={12} md={6}>
                       <Stack spacing={2}>
                           <FormControl fullWidth size="small">
                               {/* Fix: Explicitly provided text as children for InputLabel */}
                               <InputLabel>Target Folder</InputLabel>
                               <Select value={uploadTargetFolder} label="Target Folder" onChange={e => setUploadTargetFolder(e.target.value)}>
                                   {FOLDERS.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                               </Select>
                           </FormControl>

                           <FormControl fullWidth size="small">
                               {/* Fix: Explicitly provided text as children for InputLabel */}
                               <InputLabel>Associated Subcontractor</InputLabel>
                               <Select 
                                   value={scannedMetadata.subId} label="Associated Subcontractor"
                                   onChange={e => setScannedMetadata({...scannedMetadata, subId: e.target.value})}
                               >
                                   <MenuItem value=""><em>None / General</em></MenuItem>
                                   {subcontractors.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                               </Select>
                           </FormControl>

                           <TextField 
                               label="Subject Line" fullWidth size="small" multiline rows={2}
                               value={scannedMetadata.subject} onChange={e => setScannedMetadata({...scannedMetadata, subject: e.target.value})}
                               InputLabelProps={{ shrink: !!scannedMetadata.subject }}
                           />
                           
                           <Box display="flex" gap={2}>
                               <TextField 
                                   label="Reference No" fullWidth size="small"
                                   value={scannedMetadata.refNo} onChange={e => setScannedMetadata({...scannedMetadata, refNo: e.target.value})}
                                   InputLabelProps={{ shrink: !!scannedMetadata.refNo }}
                               />
                               <TextField 
                                   label="Letter Date" type="date" fullWidth size="small"
                                   value={scannedMetadata.letterDate} onChange={e => setScannedMetadata({...scannedMetadata, letterDate: e.target.value})}
                                   InputLabelProps={{ shrink: !!scannedMetadata.letterDate }}
                               />
                           </Box>
                           <Box display="flex" gap={2}>
                               <FormControl fullWidth size="small">
                                   <InputLabel>Correspondence Type</InputLabel>
                                   <Select
                                       value={scannedMetadata.correspondenceType || ''}
                                       label="Correspondence Type"
                                       onChange={e => setScannedMetadata({...scannedMetadata, correspondenceType: e.target.value as 'incoming' | 'outgoing'})}
                                   >
                                       <MenuItem value="">Not Specified</MenuItem>
                                       <MenuItem value="incoming">Incoming</MenuItem>
                                       <MenuItem value="outgoing">Outgoing</MenuItem>
                                   </Select>
                               </FormControl>
                               <TextField 
                                   label="Scanning Date" type="date" fullWidth size="small"
                                   value={scannedMetadata.date} onChange={e => setScannedMetadata({...scannedMetadata, date: e.target.value})}
                                   InputLabelProps={{ shrink: true }}
                               />
                           </Box>
                       </Stack>
                   </Grid>
               </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3, bgcolor: '#f8fafc' }}>
              <Button onClick={() => setUploadModalOpen(false)}>Cancel</Button>
              <Button variant="contained" onClick={processUploads} disabled={uploadFiles.length === 0 || scanStep === 'PROCESSING'}>Save to Database</Button>
          </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog 
        open={!!previewDoc} onClose={() => setPreviewDoc(null)} maxWidth="lg" fullWidth
        PaperProps={{ sx: { height: '80vh', borderRadius: 4 } }}
      >
          {previewDoc && (
              <>
                <DialogTitle sx={{ borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box display="flex" alignItems="center" gap={2}>
                        <FileText className="text-indigo-600"/>
                        <Typography variant="h6" fontWeight="bold">{previewDoc.name}</Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                        <Button 
                            size="small" 
                            startIcon={<ExternalLink size={14}/>}
                            href={getFileUrl(previewDoc)}
                            target="_blank"
                            onClick={(e) => e.stopPropagation()}
                        >
                            Open Full
                        </Button>
                        <IconButton onClick={() => setPreviewDoc(null)}><X size={20}/></IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent sx={{ p: 0, display: 'flex', bgcolor: 'slate.900' }}>
                    <Box flex={1} display="flex" alignItems="center" justifyContent="center" sx={{ bgcolor: 'white', p: 2 }}>
                        {previewDoc.fileUrl ? (
                            <Box width="100%" height="100%" display="flex" alignItems="center" justifyContent="center">
                                {previewDoc.type === 'PDF' || previewDoc.fileUrl.toLowerCase().endsWith('.pdf') ? (
                                    <Box width="100%" height="100%" display="flex" flexDirection="column">
                                        <Box flex={1} overflow="auto" display="flex" alignItems="center" justifyContent="center" p={2}>
                                            <Document
                                                file={getFileUrl(previewDoc)}
                                                loading={<Typography variant="body2">Loading PDF...</Typography>}
                                                error={
                                                    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={4}>
                                                        <FileText size={48} className="text-red-500 mb-2" />
                                                        <Typography variant="body2" color="error">Failed to load PDF</Typography>
                                                        <Typography variant="caption" color="text.secondary" align="center" mt={1}>
                                                            This document may have an expired link. Please re-upload the file.
                                                        </Typography>
                                                    </Box>
                                                }
                                                onLoadSuccess={onDocumentLoadSuccess}
                                                onError={(error) => {
                                                    console.error('Failed to load PDF:', previewDoc.name, error);
                                                    // Optionally update the document status to unavailable
                                                    if (previewDoc.fileUrl?.startsWith('blob:') && !previewDoc.fileUrl.startsWith('data:')) {
                                                        // This indicates a possibly expired blob URL
                                                        // Update the document to mark it as unavailable
                                                        const updatedDocs = (project.documents || []).map(doc => 
                                                            doc.id === previewDoc.id 
                                                                ? { ...doc, status: 'Unavailable' as const, fileUrl: undefined } 
                                                                : doc
                                                        );
                                                        onProjectUpdate({ ...project, documents: updatedDocs });
                                                        setPreviewDoc(prev => prev ? { ...prev, status: 'Unavailable', fileUrl: undefined } : null);
                                                    }
                                                }}
                                            >
                                                <Page pageNumber={currentPageState} scale={scaleState} renderTextLayer={false} renderAnnotationLayer={false} />
                                            </Document>
                                        </Box>
                                        <Box display="flex" justifyContent="center" alignItems="center" p={1} bgcolor="#f5f5f5" gap={2}>
                                            <Button 
                                                size="small" 
                                                onClick={goToPrevPage}
                                                disabled={currentPageState <= 1}
                                            >
                                                Prev
                                            </Button>
                                            <Typography variant="body2">
                                                Page {currentPageState} of {numPagesState}
                                            </Typography>
                                            <Button 
                                                size="small" 
                                                onClick={goToNextPage}
                                                disabled={currentPageState >= numPagesState}
                                            >
                                                Next
                                            </Button>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Button size="small" onClick={zoomOut}>-</Button>
                                                <Typography variant="caption">{Math.round(scaleState * 100)}%</Typography>
                                                <Button size="small" onClick={zoomIn}>+</Button>
                                            </Box>
                                        </Box>
                                    </Box>
                                ) : previewDoc.type === 'IMAGE' || ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].some(ext => previewDoc.fileUrl.toLowerCase().endsWith(ext)) ? (
                                    <img
                                        src={getFileUrl(previewDoc)}
                                        alt="Document Preview"
                                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                    />
                                ) : (
                                    <Box textAlign="center" p={3}>
                                        <FileText size={48} className="mx-auto text-slate-400 mb-2" />
                                        <Typography variant="body2" color="text.secondary">Preview not available for this file type</Typography>
                                        <Typography variant="caption" color="text.secondary">{previewDoc.name}</Typography>
                                        <Button 
                                            variant="outlined" 
                                            size="small" 
                                            startIcon={<ExternalLink size={14} />}
                                            href={getFileUrl(previewDoc)}
                                            target="_blank"
                                            sx={{ mt: 2 }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            Download File
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                        ) : (
                            <Box textAlign="center" p={3}>
                                <FileText size={48} className="mx-auto text-slate-400 mb-2" />
                                <Typography variant="body2" color="text.secondary">
                                    {previewDoc.status === 'Unavailable' 
                                        ? 'This document is no longer available. Please re-upload the file.' 
                                        : 'No preview available'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">{previewDoc.name}</Typography>
                            </Box>
                        )}
                    </Box>
                    <Box width={320} bgcolor="white" p={3} borderLeft="1px solid #eee" sx={{ overflowY: 'auto' }}>
                        <Typography variant="overline" color="text.secondary" fontWeight="bold">DOCUMENT METADATA</Typography>
                        <Stack spacing={3} mt={2}>
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block">Subject</Typography>
                                <Typography variant="body2" fontWeight="bold">{previewDoc.subject || 'Not specified'}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block">Reference Number</Typography>
                                <Typography variant="body2" fontWeight="bold">{previewDoc.refNo || 'N/A'}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block" mb={1}>Organization Tags</Typography>
                                <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                                    {previewDoc.tags?.map(t => (
                                        <Chip 
                                            key={t} 
                                            label={t} 
                                            size="small" 
                                            onDelete={() => handleRemoveTag(previewDoc.id, t)}
                                            sx={{ borderRadius: 1.5 }}
                                        />
                                    ))}
                                    {(!previewDoc.tags || previewDoc.tags.length === 0) && (
                                        <Typography variant="caption" color="text.disabled" fontStyle="italic">No tags added</Typography>
                                    )}
                                </Box>
                                <TextField 
                                    size="small" 
                                    fullWidth 
                                    placeholder="Add custom tag..." 
                                    value={newTagInput}
                                    onChange={e => setNewTagInput(e.target.value)}
                                    onKeyPress={e => e.key === 'Enter' && handleAddTag(previewDoc.id, newTagInput)}
                                    InputProps={{ 
                                        startAdornment: <Tag size={14} className="text-slate-400 mr-2"/>,
                                        endAdornment: (
                                            <IconButton size="small" onClick={() => handleAddTag(previewDoc.id, newTagInput)}>
                                                <Plus size={16}/>
                                            </IconButton>
                                        )
                                    }}
                                />
                                                            
                                {/* Version History Section */}
                                <Box mt={3}>
                                    <Typography variant="caption" color="text.secondary" display="block" fontWeight="bold" mb={1}>VERSION HISTORY</Typography>
                                    <Box border="1px solid #e2e8f0" borderRadius={2} p={2} bgcolor="#f8fafc">
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                            <Typography variant="body2" fontWeight="bold">Current Version: {previewDoc.currentVersion}</Typography>
                                            <input 
                                                type="file" 
                                                hidden 
                                                id={`version-upload-${previewDoc.id}`}
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        handleUploadNewVersion(previewDoc.id, e.target.files[0]);
                                                    }
                                                }}
                                            />
                                            <Button 
                                                size="small" 
                                                variant="outlined" 
                                                onClick={() => document.getElementById(`version-upload-${previewDoc.id}`)?.click()}
                                                startIcon={<UploadCloud size={14} />}
                                            >
                                                New Version
                                            </Button>
                                        </Box>
                                                                    
                                        <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                                            {[...previewDoc.versions].reverse().map(version => (
                                                <ListItem key={version.id} dense>
                                                    <ListItemIcon>
                                                        {version.version === previewDoc.currentVersion ? <CheckCircle size={14} color="success" /> : <FileText size={14} />}
                                                    </ListItemIcon>
                                                    <ListItemText 
                                                        primary={`Version ${version.version} - ${version.date}`} 
                                                        secondary={`Size: ${version.size} | Uploaded by: ${version.uploadedBy}`}
                                                        primaryTypographyProps={{ variant: 'caption', fontWeight: 'medium' }}
                                                        secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                                                    />
                                                    <Box>
                                                        {version.version !== previewDoc.currentVersion && (
                                                            <Button 
                                                                size="small" 
                                                                variant="text" 
                                                                onClick={() => handleRevertToVersion(previewDoc.id, version.id)}
                                                                color="primary"
                                                            >
                                                                Restore
                                                            </Button>
                                                        )}
                                                    </Box>
                                                </ListItem>
                                            ))}
                                        </List>
                                    </Box>
                                </Box>
                            </Box>
                            <Divider />
                            {/* Comments Panel */}
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block" fontWeight="bold" mb={1}>DISCUSSION</Typography>
                                <CommentsPanel 
                                    entityId={previewDoc.id} 
                                    entityType="document" 
                                    comments={previewDoc.comments || []}
                                    currentUser={{ id: 'current-user', name: 'Current User' }}
                                    onAddComment={(comment) => {
                                        // Add comment to the document
                                        const commentWithId = {
                                            ...comment,
                                            id: `comment-${Date.now()}-${Math.random()}`,
                                            timestamp: new Date().toISOString()
                                        };
                                        
                                        const updatedDocs = (project.documents || []).map(d => {
                                            if (d.id === previewDoc.id) {
                                                return {
                                                    ...d,
                                                    comments: [...(d.comments || []), commentWithId]
                                                };
                                            }
                                            return d;
                                        });
                                        onProjectUpdate({ ...project, documents: updatedDocs });
                                        setPreviewDoc(prev => prev ? { ...prev, comments: [...(prev.comments || []), commentWithId] } : null);
                                    }}

                                />
                            </Box>
                            <Divider />
                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block">Audit Trail</Typography>
                                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>Created: {previewDoc.date}</Typography>
                                <Typography variant="caption" display="block">Size: {previewDoc.size}</Typography>
                            </Box>
                            <Divider />
                            <Button fullWidth variant="outlined" color="error" startIcon={<Trash2 size={16}/>} onClick={() => {handleDeleteDoc(previewDoc.id); setPreviewDoc(null);}}>Delete Document</Button>
                        </Stack>
                    </Box>
                </DialogContent>
              </>
          )}
      </Dialog>
    </Box>
  );
};

export default DocumentsModule;
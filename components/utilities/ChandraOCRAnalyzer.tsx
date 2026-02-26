import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import {
  Upload,
  FileText,
  Eye,
  Download,
  CheckCircle,
  BarChart3,
  Search,
  Zap,
  Shield,
  Settings
} from 'lucide-react';
import { ocrService } from '../../services/ai/ocrService';
import { formatCurrency } from '../../utils/formatting/exportUtils';
import { getCurrencyOptions } from '../../utils/formatting/currencyUtils';

interface DocumentExtractionResult {
  rawText: string;
  structuredData: any;
  confidence: number;
}

interface OCRAnalysisReport {
  summary: {
    totalWords: number;
    confidence: number;
    documentType: string;
    extractionDate: string;
  };
  insights: {
    keyEntities: string[];
    financialSummary: {
      totalAmount: number;
      averageAmount: number;
      currencyTypes: string[];
    };
    timeline: {
      earliestDate: string;
      latestDate: string;
    };
    relationships: {
      contractors: string[];
      projects: string[];
      invoices: string[];
    };
  };
  qualityMetrics: {
    textClarity: number;
    completeness: number;
    accuracy: number;
  };
}

const ChandraOCRAnalyzer: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<DocumentExtractionResult | null>(null);
  const [analysisReport, setAnalysisReport] = useState<OCRAnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<string>('');
  const [extractionMode, setExtractionMode] = useState<'full' | 'boq' | 'finance'>('full');
  const [activeTab, setActiveTab] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up the preview URL when component unmounts or when a new file is uploaded
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/') && !['application/pdf'].includes(file.type)) {
      setError('Please upload an image or PDF file');
      return;
    }

    // Set document type based on file extension
    setDocumentType(file.type);
    
    // Create preview URL for the uploaded file
    setPreviewUrl(URL.createObjectURL(file));
    
    setFileName(file.name);
    setError(null);
    setResult(null);
    setAnalysisReport(null);
    setIsProcessing(true);
    setProgress(10);

    try {
      // Initialize OCR service
      setProgress(20);
      await ocrService.initialize();

      setProgress(40);
      // Process the document
      const extractionResult = await ocrService.processDocument(file);
      
      setProgress(90);
      setResult(extractionResult);
      
      // Generate analysis report
      const report = generateAnalysisReport(extractionResult, file.name);
      setAnalysisReport(report);
      
      setProgress(100);
      
      setTimeout(() => setIsProcessing(false), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during processing');
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const generateAnalysisReport = (result: DocumentExtractionResult, fileName: string): OCRAnalysisReport => {
    // Calculate summary metrics
    const totalWords = result.rawText.split(/\s+/).length;
    const confidence = result.confidence;
    
    // Extract insights
    const keyEntities = [
      ...(result.structuredData.contractors || []),
      ...(result.structuredData.codes || []),
      ...(result.structuredData.invoices || [])
    ].slice(0, 5);
    
    // Financial summary
    const amounts = result.structuredData.amounts || [];
    const totalAmount = amounts.reduce((sum: number, amount: number) => sum + amount, 0);
    const averageAmount = amounts.length > 0 ? totalAmount / amounts.length : 0;
    
    // Timeline analysis
    const dates = result.structuredData.dates || [];
    let earliestDate = '';
    let latestDate = '';
    if (dates.length > 0) {
      dates.sort();
      earliestDate = dates[0];
      latestDate = dates[dates.length - 1];
    }
    
    // Quality metrics (simulated for demo)
    const qualityMetrics = {
      textClarity: Math.min(100, Math.floor(result.confidence * 0.9)),
      completeness: Math.min(100, Math.floor(result.confidence * 0.85)),
      accuracy: result.confidence
    };

    return {
      summary: {
        totalWords,
        confidence,
        documentType,
        extractionDate: new Date().toISOString()
      },
      insights: {
        keyEntities,
        financialSummary: {
          totalAmount,
          averageAmount,
          currencyTypes: getCurrencyOptions().map(opt => opt.value) // Dynamic currency options
        },
        timeline: {
          earliestDate,
          latestDate
        },
        relationships: {
          contractors: result.structuredData.contractors || [],
          projects: result.structuredData.codes || [],
          invoices: result.structuredData.invoices || []
        }
      },
      qualityMetrics
    };
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && fileInputRef.current) {
      // Create a new FileList with the dropped file
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInputRef.current.files = dataTransfer.files;
      
      // Create and dispatch a change event
      const event = new Event('change', { bubbles: true });
      fileInputRef.current.dispatchEvent(event);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box className="space-y-6">
      <Box>
        <Typography variant="h4" fontWeight="bold" color="text.primary" mb={1}>
          Chandra OCR Analyzer
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Advanced document analysis and data extraction using Chandra OCR technology
        </Typography>
      </Box>

      {/* Key Features */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ borderRadius: 4, height: '100%', bgcolor: 'primary.lighter' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Zap size={32} className="text-primary.main" />
                <Typography variant="h6" fontWeight="bold">Smart Extraction</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Extract structured data from documents with advanced pattern recognition and NLP techniques.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ borderRadius: 4, height: '100%', bgcolor: 'success.lighter' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Search size={32} className="text-success.main" />
                <Typography variant="h6" fontWeight="bold">Deep Analysis</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Analyze document content to identify key entities, relationships, and patterns automatically.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ borderRadius: 4, height: '100%', bgcolor: 'info.lighter' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <BarChart3 size={32} className="text-info.main" />
                <Typography variant="h6" fontWeight="bold">Insights</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Generate actionable insights and reports from extracted data for better decision making.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Upload Area */}
      <Card variant="outlined" sx={{ borderRadius: 4 }}>
        <CardContent>
          <input
            type="file"
            id="ocr-file-upload-input" // Added id for accessibility
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*,.pdf"
            className="hidden"
          />
          <label htmlFor="ocr-file-upload-input" className="sr-only">Upload Document for Chandra OCR</label>
          
          {/* Extraction Mode Selector */}
          <Box display="flex" gap={2} mb={3}>
            <Button
              variant={extractionMode === 'full' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setExtractionMode('full')}
              sx={{ borderRadius: 25, textTransform: 'none', fontWeight: 'medium' }}
            >
              Full Analysis
            </Button>
            <Button
              variant={extractionMode === 'boq' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setExtractionMode('boq')}
              sx={{ borderRadius: 25, textTransform: 'none', fontWeight: 'medium' }}
            >
              BOQ Extraction
            </Button>
            <Button
              variant={extractionMode === 'finance' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setExtractionMode('finance')}
              sx={{ borderRadius: 25, textTransform: 'none', fontWeight: 'medium' }}
            >
              Financial Data
            </Button>
          </Box>
          
          <Box
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            sx={{
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 4,
              p: 6,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: 'action.hover',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'primary.lighter'
              }
            }}
          >
            <FileText size={48} className="mx-auto mb-4 text-slate-400" />
            <Typography variant="h6" fontWeight="bold" color="text.primary" mb={1}>
              Upload Document for Chandra OCR
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Drag & drop your image or PDF file here, or click to browse
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Supports JPG, PNG, GIF, BMP, TIFF, PDF formats
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Progress Indicator */}
      {isProcessing && (
        <Card variant="outlined" sx={{ borderRadius: 4 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" mb={2} display="flex" alignItems="center" gap={1}>
              <Eye size={20} />
              Processing Document with Chandra OCR
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{ height: 8, borderRadius: 4, mb: 2 }} 
            />
            <Typography variant="body2" color="text.secondary">
              {progress < 30 ? 'Initializing OCR engine...' : 
               progress < 60 ? 'Analyzing document structure...' : 
               progress < 90 ? 'Extracting text and data...' : 
               'Generating insights and analysis...'}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ borderRadius: 4 }}>
          <Typography variant="body1" fontWeight="bold">Processing Error</Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
      )}

      {/* Results with Side-by-Side Preview */}
      {result && analysisReport && (
        <Grid container spacing={3}>
          {/* Document Preview Column */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ borderRadius: 4, height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" mb={2} display="flex" alignItems="center" gap={1}>
                  <Eye size={20} />
                  Document Preview
                </Typography>
                <Box 
                  sx={{ 
                    border: '1px solid', 
                    borderColor: 'divider', 
                    borderRadius: 2, 
                    p: 1, 
                    bgcolor: 'background.paper',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 400
                  }}
                >
                  {previewUrl && (
                    <Box 
                      component="img" 
                      src={previewUrl} 
                      alt="Document Preview" 
                      sx={{ 
                        maxWidth: '100%', 
                        maxHeight: '500px',
                        objectFit: 'contain',
                        borderRadius: 1
                      }}
                    />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* OCR Results Column */}
          <Grid item xs={12} md={6}>
            <Box className="space-y-4">
              <Card variant="outlined" sx={{ borderRadius: 4 }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" fontWeight="bold" display="flex" alignItems="center" gap={1}>
                      <CheckCircle size={20} color="#10b981" />
                      Extraction Successful
                    </Typography>
                    <Chip 
                      label={`Confidence: ${result.confidence}%`} 
                      size="small" 
                      sx={{ 
                        bgcolor: result.confidence > 85 ? 'success.light' : result.confidence > 70 ? 'warning.light' : 'error.light',
                        color: result.confidence > 85 ? 'success.dark' : result.confidence > 70 ? 'warning.dark' : 'error.dark',
                        fontWeight: 'bold'
                      }} 
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Extracted from: {fileName} • Type: {documentType}
                  </Typography>
                  
                  {/* Document Analysis Summary */}
                  <Box mt={2} p={2} bgcolor="info.lighter" borderRadius={2}>
                    <Typography variant="subtitle2" fontWeight="bold" color="text.primary" mb={1}>
                      Document Analysis Summary
                    </Typography>
                    <Stack spacing={1}>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">BOQ Items:</Typography>
                        <Typography variant="body2" fontWeight="medium">{result.structuredData.boqItems?.length || 0}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">Financial Amounts:</Typography>
                        <Typography variant="body2" fontWeight="medium">{result.structuredData.amounts?.length || 0}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">Dates Found:</Typography>
                        <Typography variant="body2" fontWeight="medium">{result.structuredData.dates?.length || 0}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">Project Codes:</Typography>
                        <Typography variant="body2" fontWeight="medium">{result.structuredData.codes?.length || 0}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">Contractors:</Typography>
                        <Typography variant="body2" fontWeight="medium">{result.structuredData.contractors?.length || 0}</Typography>
                      </Box>
                    </Stack>
                  </Box>
                </CardContent>
              </Card>

              {/* Analysis Tabs */}
              <Card variant="outlined" sx={{ borderRadius: 4 }}>
                <CardContent>
                  <Tabs 
                    value={activeTab} 
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                  >
                    <Tab label="Insights" />
                    <Tab label="Structured Data" />
                    <Tab label="Raw Text" />
                    <Tab label="Export" />
                  </Tabs>
                  
                  <Box mt={2}>
                    {activeTab === 0 && (
                      <Box>
                        <Typography variant="h6" fontWeight="bold" mb={2}>
                          Document Insights
                        </Typography>
                        
                        <Card variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
                          <CardContent>
                            <Typography variant="subtitle2" fontWeight="bold" color="text.primary" mb={1}>
                              Quality Metrics
                            </Typography>
                            <Stack spacing={1}>
                              <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Text Clarity:</Typography>
                                <Typography variant="body2" fontWeight="medium">{analysisReport.qualityMetrics.textClarity}%</Typography>
                              </Box>
                              <LinearProgress 
                                variant="determinate" 
                                value={analysisReport.qualityMetrics.textClarity} 
                                sx={{ height: 6, borderRadius: 3 }} 
                              />
                            </Stack>
                            <Stack spacing={1} mt={1}>
                              <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Completeness:</Typography>
                                <Typography variant="body2" fontWeight="medium">{analysisReport.qualityMetrics.completeness}%</Typography>
                              </Box>
                              <LinearProgress 
                                variant="determinate" 
                                value={analysisReport.qualityMetrics.completeness} 
                                sx={{ height: 6, borderRadius: 3 }} 
                              />
                            </Stack>
                            <Stack spacing={1} mt={1}>
                              <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Accuracy:</Typography>
                                <Typography variant="body2" fontWeight="medium">{analysisReport.qualityMetrics.accuracy}%</Typography>
                              </Box>
                              <LinearProgress 
                                variant="determinate" 
                                value={analysisReport.qualityMetrics.accuracy} 
                                sx={{ height: 6, borderRadius: 3 }} 
                              />
                            </Stack>
                          </CardContent>
                        </Card>
                        
                        <Card variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
                          <CardContent>
                            <Typography variant="subtitle2" fontWeight="bold" color="text.primary" mb={1}>
                              Key Entities
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                              {analysisReport.insights.keyEntities.map((entity, idx) => (
                                <Chip key={idx} label={entity} size="small" variant="outlined" color="primary" />
                              ))}
                              {analysisReport.insights.keyEntities.length === 0 && (
                                <Typography variant="body2" color="text.secondary">No key entities detected</Typography>
                              )}
                            </Stack>
                          </CardContent>
                        </Card>
                        
                        <Card variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
                          <CardContent>
                            <Typography variant="subtitle2" fontWeight="bold" color="text.primary" mb={1}>
                              Financial Summary
                            </Typography>
                            <Stack spacing={1}>
                              <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Total Amount:</Typography>
                                <Typography variant="body2" fontWeight="medium">{formatCurrency(analysisReport.insights.financialSummary.totalAmount)}</Typography>
                              </Box>
                              <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Average Amount:</Typography>
                                <Typography variant="body2" fontWeight="medium">{formatCurrency(analysisReport.insights.financialSummary.averageAmount)}</Typography>
                              </Box>
                              <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Currency Types:</Typography>
                                <Typography variant="body2" fontWeight="medium">{analysisReport.insights.financialSummary.currencyTypes.join(', ')}</Typography>
                              </Box>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Box>
                    )}
                    
                    {activeTab === 1 && (
                      <Box>
                        <Typography variant="h6" fontWeight="bold" mb={2}>
                          Structured Data Extraction
                        </Typography>
                        
                        <Stack spacing={2}>
                          {(extractionMode === 'full' || extractionMode === 'boq') && result.structuredData.boqItems && result.structuredData.boqItems.length > 0 && (
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" mb={1}>
                                Bill of Quantities (BOQ):
                              </Typography>
                              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                                <Stack spacing={1}>
                                  {result.structuredData.boqItems.map((item: any, idx: number) => (
                                    <Box key={idx} display="flex" justifyContent="space-between" alignItems="center">
                                      <Box flex={1}>
                                        <Typography variant="body2" fontWeight="medium">{item.description}</Typography>
                                        <Typography variant="caption" color="text.secondary">{item.unit}</Typography>
                                      </Box>
                                      <Box textAlign="right">
                                        <Typography variant="body2" fontWeight="bold">{item.quantity}</Typography>
                                        <Typography variant="caption" color="text.secondary">Qty</Typography>
                                      </Box>
                                    </Box>
                                  ))}
                                </Stack>
                              </Paper>
                            </Box>
                          )}
                          
                          {(extractionMode === 'full' || extractionMode === 'finance') && result.structuredData.amounts && result.structuredData.amounts.length > 0 && (
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" mb={1}>
                                Financial Amounts:
                              </Typography>
                              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                  {result.structuredData.amounts.map((amount: number, idx: number) => (
                                    <Chip key={idx} label={`${formatCurrency(amount)}`} size="small" />
                                  ))}
                                </Stack>
                              </Paper>
                            </Box>
                          )}
                          
                          {extractionMode === 'full' && result.structuredData.dates && result.structuredData.dates.length > 0 && (
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" mb={1}>
                                Dates Found:
                              </Typography>
                              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                  {result.structuredData.dates.map((date: string, idx: number) => (
                                    <Chip key={idx} label={date} size="small" />
                                  ))}
                                </Stack>
                              </Paper>
                            </Box>
                          )}
                          
                          {extractionMode === 'full' && result.structuredData.codes && result.structuredData.codes.length > 0 && (
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" mb={1}>
                                Project Codes:
                              </Typography>
                              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                  {result.structuredData.codes.map((code: string, idx: number) => (
                                    <Chip key={idx} label={code} size="small" />
                                  ))}
                                </Stack>
                              </Paper>
                            </Box>
                          )}
                          
                          {extractionMode === 'full' && result.structuredData.contractors && result.structuredData.contractors.length > 0 && (
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" mb={1}>
                                Contractors/Suppliers:
                              </Typography>
                              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                  {result.structuredData.contractors.map((contractor: string, idx: number) => (
                                    <Chip key={idx} label={contractor} size="small" variant="outlined" color="primary" />
                                  ))}
                                </Stack>
                              </Paper>
                            </Box>
                          )}
                          
                          {extractionMode === 'full' && result.structuredData.invoices && result.structuredData.invoices.length > 0 && (
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" mb={1}>
                                Invoice Numbers:
                              </Typography>
                              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                  {result.structuredData.invoices.map((invoice: string, idx: number) => (
                                    <Chip key={idx} label={invoice} size="small" variant="outlined" color="secondary" />
                                  ))}
                                </Stack>
                              </Paper>
                            </Box>
                          )}
                          
                          {extractionMode === 'full' && result.structuredData.emails && result.structuredData.emails.length > 0 && (
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" mb={1}>
                                Email Addresses:
                              </Typography>
                              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                  {result.structuredData.emails.map((email: string, idx: number) => (
                                    <Chip key={idx} label={email} size="small" />
                                  ))}
                                </Stack>
                              </Paper>
                            </Box>
                          )}
                          
                          {extractionMode === 'full' && result.structuredData.phones && result.structuredData.phones.length > 0 && (
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" mb={1}>
                                Phone Numbers:
                              </Typography>
                              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                  {result.structuredData.phones.map((phone: string, idx: number) => (
                                    <Chip key={idx} label={phone} size="small" />
                                  ))}
                                </Stack>
                              </Paper>
                            </Box>
                          )}
                        </Stack>
                      </Box>
                    )}
                    
                    {activeTab === 2 && (
                      <Box>
                        <Typography variant="h6" fontWeight="bold" mb={2} display="flex" alignItems="center" gap={1}>
                          <FileText size={20} />
                          Extracted Text
                        </Typography>
                        <Paper 
                          variant="outlined" 
                          sx={{ 
                            p: 2, 
                            maxHeight: 300, 
                            overflow: 'auto', 
                            bgcolor: 'background.default',
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.6
                          }}
                        >
                          {result.rawText || 'No text extracted'}
                        </Paper>
                      </Box>
                    )}
                    
                    {activeTab === 3 && (
                      <Box>
                        <Typography variant="h6" fontWeight="bold" mb={2}>
                          Export Options
                        </Typography>
                        <Stack direction="row" spacing={2} flexWrap="wrap" gap={1}>
                          <Button 
                            variant="contained" 
                            startIcon={<Download size={16} />}
                            onClick={() => {
                              // Export full extraction result as JSON
                              const dataStr = JSON.stringify(result, null, 2);
                              const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                              
                              const exportFileDefaultName = `${fileName?.split('.')[0] || 'extracted-data'}-${extractionMode}.json`;
                              
                              const linkElement = document.createElement('a');
                              linkElement.setAttribute('href', dataUri);
                              linkElement.setAttribute('download', exportFileDefaultName);
                              linkElement.click();
                            }}
                          >
                            Export as JSON
                          </Button>
                          <Button 
                            variant="outlined" 
                            startIcon={<Download size={16} />}
                            onClick={() => {
                              // Export as CSV
                              let csvContent = 'data:text/csv;charset=utf-8,';
                              
                              // Add BOQ items if present
                              if (result?.structuredData?.boqItems && result.structuredData.boqItems.length > 0) {
                                csvContent += 'BOQ Items:,\n';
                                csvContent += 'Description,Quantity,Unit\n';
                                result.structuredData.boqItems.forEach(item => {
                                  csvContent += `${item.description},${item.quantity},${item.unit}\n`;
                                });
                                csvContent += '\n';
                              }
                              
                              // Add financial amounts if present
                              if (result?.structuredData?.amounts && result.structuredData.amounts.length > 0) {
                                csvContent += 'Financial Amounts:,\n';
                                csvContent += 'Amount\n';
                                result.structuredData.amounts.forEach(amount => {
                                  csvContent += `${formatCurrency(amount)}\n`;
                                });
                                csvContent += '\n';
                              }
                              
                              // Add other structured data
                              if (result?.structuredData?.dates && result.structuredData.dates.length > 0) {
                                csvContent += 'Dates:,\n';
                                csvContent += 'Date\n';
                                result.structuredData.dates.forEach(date => {
                                  csvContent += `${date}\n`;
                                });
                                csvContent += '\n';
                              }
                              
                              const encodedUri = encodeURI(csvContent);
                              const linkElement = document.createElement('a');
                              linkElement.setAttribute('href', encodedUri);
                              linkElement.setAttribute('download', `${fileName?.split('.')[0] || 'extracted-data'}-${extractionMode}.csv`);
                              linkElement.click();
                            }}
                          >
                            Export as CSV
                          </Button>
                          <Button 
                            variant="outlined" 
                            startIcon={<Download size={16} />}
                            onClick={() => {
                              // Export BOQ data specifically
                              if (result?.structuredData?.boqItems && result.structuredData.boqItems.length > 0) {
                                const boqData = {
                                  fileName,
                                  extractedDate: new Date().toISOString(),
                                  boqItems: result.structuredData.boqItems
                                };
                                
                                const dataStr = JSON.stringify(boqData, null, 2);
                                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                                
                                const exportFileDefaultName = `${fileName?.split('.')[0] || 'boq-data'}-boq.json`;
                                
                                const linkElement = document.createElement('a');
                                linkElement.setAttribute('href', dataUri);
                                linkElement.setAttribute('download', exportFileDefaultName);
                                linkElement.click();
                              } else {
                                alert('No BOQ data available to export');
                              }
                            }}
                          >
                            Export BOQ Only
                          </Button>
                        </Stack>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default ChandraOCRAnalyzer;

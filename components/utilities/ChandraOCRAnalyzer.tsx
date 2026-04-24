import React, { useState, useRef, useEffect } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Progress } from '~/components/ui/progress';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Badge } from '~/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { cn } from '~/lib/utils';
import {
  FileText,
  Eye,
  Download,
  CheckCircle,
  BarChart3,
  Search,
  Zap
} from 'lucide-react';
import { useFileDragDrop } from '../../hooks/useFileDragDrop';
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

  // Clean up the preview URL when component unmounts or when a new file is uploaded
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/') && !['application/pdf'].includes(file.type)) {
      setError('Please upload an image or PDF file');
      return;
    }

    // Set document type based on file extension
    setDocumentType(file.type);
    
    // Create preview URL for the uploaded file
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
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
      const report = generateAnalysisReport(extractionResult);
      setAnalysisReport(report);
      
      setProgress(100);
      
      setTimeout(() => setIsProcessing(false), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during processing');
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const {
    fileInputRef,
    handleDragOver,
    handleDrop,
    triggerFileInput,
    handleFileChange
  } = useFileDragDrop({
    onFileSelect: handleFileSelect,
    accept: 'image/*,.pdf'
  });

  const generateAnalysisReport = (result: DocumentExtractionResult): OCRAnalysisReport => {
    // Generate a structured report from the raw extraction results
    return {
      summary: {
        totalWords: result.rawText.split(/\s+/).length,
        confidence: result.confidence,
        documentType: documentType || 'Unknown',
        extractionDate: new Date().toISOString()
      },
      insights: {
        keyEntities: result.structuredData?.entities || [],
        financialSummary: {
          totalAmount: result.structuredData?.amounts?.reduce((acc: number, cur: number) => acc + cur, 0) || 0,
          averageAmount: result.structuredData?.amounts?.length ? 
            (result.structuredData.amounts.reduce((acc: number, cur: number) => acc + cur, 0) / result.structuredData.amounts.length) : 0,
          currencyTypes: Array.from(new Set(result.structuredData?.currencies || []) as any) as string[]
        },
        timeline: {
          earliestDate: result.structuredData?.dates?.sort()[0] || '',
          latestDate: result.structuredData?.dates?.sort().reverse()[0] || ''
        },
        relationships: {
          contractors: result.structuredData?.contractors || [],
          projects: result.structuredData?.projects || [],
          invoices: result.structuredData?.invoices || []
        }
      },
      qualityMetrics: {
        textClarity: result.confidence * 100,
        completeness: Object.keys(result.structuredData || {}).length > 0 ? 85 : 40,
        accuracy: result.confidence * 100
      }
    };
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-2xl font-bold text-foreground mb-1">
          Chandra OCR Analyzer
        </h4>
        <p className="text-sm text-muted-foreground">
          Advanced document analysis and data extraction using Chandra OCR technology
        </p>
      </div>

      {/* Key Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="h-full">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={32} className="text-primary" />
              <h6 className="text-lg font-bold">Smart Extraction</h6>
            </div>
            <p className="text-sm text-muted-foreground">
              Extract structured data from documents with advanced pattern recognition and NLP techniques.
            </p>
          </CardContent>
        </Card>
        <Card className="h-full">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Search size={32} className="text-green-600" />
              <h6 className="text-lg font-bold">Deep Analysis</h6>
            </div>
            <p className="text-sm text-muted-foreground">
              Analyze document content to identify key entities, relationships, and patterns automatically.
            </p>
          </CardContent>
        </Card>
        <Card className="h-full">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={32} className="text-blue-600" />
              <h6 className="text-lg font-bold">Insights</h6>
            </div>
            <p className="text-sm text-muted-foreground">
              Generate actionable insights and reports from extracted data for better decision making.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upload Area */}
      <Card>
        <CardContent className="p-6">
          <input
            type="file"
            id="ocr-file-upload-input"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,.pdf"
            className="hidden"
          />
          <label htmlFor="ocr-file-upload-input" className="sr-only">Upload Document for Chandra OCR</label>

          {/* Extraction Mode Selector */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={extractionMode === 'full' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setExtractionMode('full')}
              className="rounded-full font-medium"
            >
              Full Analysis
            </Button>
            <Button
              variant={extractionMode === 'boq' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setExtractionMode('boq')}
              className="rounded-full font-medium"
            >
              BOQ Extraction
            </Button>
            <Button
              variant={extractionMode === 'finance' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setExtractionMode('finance')}
              className="rounded-full font-medium"
            >
              Financial Data
            </Button>
          </div>

          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer bg-muted/50 hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <FileText size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h6 className="text-lg font-bold mb-2">
              Upload Document for Chandra OCR
            </h6>
            <p className="text-sm text-muted-foreground mb-4">
              Drag & drop your image or PDF file here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Supports JPG, PNG, GIF, BMP, TIFF, PDF formats
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Progress Indicator */}
      {isProcessing && (
        <Card className="border-border rounded-xl">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye size={20} />
              <h6 className="text-lg font-bold">Processing Document with Chandra OCR</h6>
            </div>
            <Progress 
              value={progress} 
              className="h-2 mb-2" 
            />
            <p className="text-sm text-muted-foreground">
              {progress < 30 ? 'Initializing OCR engine...' : 
               progress < 60 ? 'Analyzing document structure...' : 
               progress < 90 ? 'Extracting text and data...' : 
               'Generating insights and analysis...'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <div className="flex flex-col gap-1">
            <h6 className="font-bold">Processing Error</h6>
            <AlertDescription>{error}</AlertDescription>
          </div>
        </Alert>
      )}

      {/* Results with Side-by-Side Preview */}
      {result && analysisReport && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Document Preview Column */}
          <div className="h-full">
            <Card className="border-border rounded-xl h-full">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Eye size={20} />
                  <h6 className="text-lg font-bold">Document Preview</h6>
                </div>
                <div 
                  className="border border-border rounded-lg p-1 bg-background h-full flex items-center justify-center min-h-[400px]"
                >
                  {previewUrl && (
                    <img 
                      src={previewUrl} 
                      alt="Document Preview" 
                      className="max-w-full max-h-[500px] object-contain rounded"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* OCR Results Column */}
          <div className="space-y-4">
            <Card className="border-border rounded-xl">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={20} className="text-emerald-500" />
                    <h6 className="text-lg font-bold">Extraction Successful</h6>
                  </div>
                  <Badge 
                    className={cn(
                      "font-bold",
                      result.confidence > 85 ? "bg-emerald-100 text-emerald-700" : 
                      result.confidence > 70 ? "bg-amber-100 text-amber-700" : 
                      "bg-red-100 text-red-700"
                    )}
                  >
                    Confidence: {result.confidence}%
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">
                  Extracted from: {fileName} • Type: {documentType}
                </p>
                
                {/* Document Analysis Summary */}
                <div className="mt-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/20">
                  <h6 className="text-sm font-bold mb-3">Document Analysis Summary</h6>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">BOQ Items:</span>
                      <span className="font-medium">{result.structuredData.boqItems?.length || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Financial Amounts:</span>
                      <span className="font-medium">{result.structuredData.amounts?.length || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Dates Found:</span>
                      <span className="font-medium">{result.structuredData.dates?.length || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Project Codes:</span>
                      <span className="font-medium">{result.structuredData.codes?.length || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Contractors:</span>
                      <span className="font-medium">{result.structuredData.contractors?.length || 0}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Analysis Tabs */}
            <Card className="border-border rounded-xl">
              <CardContent className="pt-6">
                <Tabs value={activeTab.toString()} onValueChange={(v) => setActiveTab(parseInt(v))}>
                  <TabsList className="w-full justify-start overflow-x-auto mb-4">
                    <TabsTrigger value="0">Insights</TabsTrigger>
                    <TabsTrigger value="1">Structured Data</TabsTrigger>
                    <TabsTrigger value="2">Raw Text</TabsTrigger>
                    <TabsTrigger value="3">Export</TabsTrigger>
                  </TabsList>
                  
                  <div className="mt-4">
                    <TabsContent value="0">
                      <div className="space-y-4">
                        <h6 className="text-lg font-bold">Document Insights</h6>
                        
                        <Card className="border-border rounded-lg">
                          <CardContent className="pt-6 space-y-4">
                            <h6 className="text-sm font-bold">Quality Metrics</h6>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Text Clarity:</span>
                                <span className="font-medium">{analysisReport.qualityMetrics.textClarity}%</span>
                              </div>
                              <Progress value={analysisReport.qualityMetrics.textClarity} className="h-1.5" />
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Completeness:</span>
                                <span className="font-medium">{analysisReport.qualityMetrics.completeness}%</span>
                              </div>
                              <Progress value={analysisReport.qualityMetrics.completeness} className="h-1.5" />
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Accuracy:</span>
                                <span className="font-medium">{analysisReport.qualityMetrics.accuracy}%</span>
                              </div>
                              <Progress value={analysisReport.qualityMetrics.accuracy} className="h-1.5" />
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card className="border-border rounded-lg">
                          <CardContent className="pt-6">
                            <h6 className="text-sm font-bold mb-3">Key Entities</h6>
                            <div className="flex flex-wrap gap-2">
                              {analysisReport.insights.keyEntities.map((entity, idx) => (
                                <Badge key={idx} variant="outline" className="text-primary border-primary/20">
                                  {entity}
                                </Badge>
                              ))}
                              {analysisReport.insights.keyEntities.length === 0 && (
                                <p className="text-sm text-muted-foreground">No key entities detected</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card className="border-border rounded-lg">
                          <CardContent className="pt-6">
                            <h6 className="text-sm font-bold mb-3">Financial Summary</h6>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total Amount:</span>
                                <span className="font-medium">{formatCurrency(analysisReport.insights.financialSummary.totalAmount)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Average Amount:</span>
                                <span className="font-medium">{formatCurrency(analysisReport.insights.financialSummary.averageAmount)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Currency Types:</span>
                                <span className="font-medium">{analysisReport.insights.financialSummary.currencyTypes.join(', ')}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="1">
                      <div className="space-y-6">
                        <h6 className="text-lg font-bold">Structured Data Extraction</h6>
                        
                        <div className="space-y-6">
                          {(extractionMode === 'full' || extractionMode === 'boq') && result.structuredData.boqItems && result.structuredData.boqItems.length > 0 && (
                            <div>
                              <h6 className="text-sm font-bold text-muted-foreground mb-2">Bill of Quantities (BOQ):</h6>
                              <div className="border border-border rounded-lg p-4 bg-muted/30">
                                <div className="space-y-3">
                                  {result.structuredData.boqItems.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center border-b border-border/50 pb-2 last:border-0 last:pb-0">
                                      <div className="flex-1">
                                        <p className="text-sm font-medium">{item.description}</p>
                                        <p className="text-xs text-muted-foreground">{item.unit}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm font-bold">{item.quantity}</p>
                                        <p className="text-xs text-muted-foreground">Qty</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {(extractionMode === 'full' || extractionMode === 'finance') && result.structuredData.amounts && result.structuredData.amounts.length > 0 && (
                            <div>
                              <h6 className="text-sm font-bold text-muted-foreground mb-2">Financial Amounts:</h6>
                              <div className="border border-border rounded-lg p-4 bg-muted/30">
                                <div className="flex flex-wrap gap-2">
                                  {result.structuredData.amounts.map((amount: number, idx: number) => (
                                    <Badge key={idx} variant="secondary">{formatCurrency(amount)}</Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {extractionMode === 'full' && result.structuredData.dates && result.structuredData.dates.length > 0 && (
                            <div>
                              <h6 className="text-sm font-bold text-muted-foreground mb-2">Dates Found:</h6>
                              <div className="border border-border rounded-lg p-4 bg-muted/30">
                                <div className="flex flex-wrap gap-2">
                                  {result.structuredData.dates.map((date: string, idx: number) => (
                                    <Badge key={idx} variant="secondary">{date}</Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {extractionMode === 'full' && result.structuredData.codes && result.structuredData.codes.length > 0 && (
                            <div>
                              <h6 className="text-sm font-bold text-muted-foreground mb-2">Project Codes:</h6>
                              <div className="border border-border rounded-lg p-4 bg-muted/30">
                                <div className="flex flex-wrap gap-2">
                                  {result.structuredData.codes.map((code: string, idx: number) => (
                                    <Badge key={idx} variant="secondary">{code}</Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {extractionMode === 'full' && result.structuredData.contractors && result.structuredData.contractors.length > 0 && (
                            <div>
                              <h6 className="text-sm font-bold text-muted-foreground mb-2">Contractors/Suppliers:</h6>
                              <div className="border border-border rounded-lg p-4 bg-muted/30">
                                <div className="flex flex-wrap gap-2">
                                  {result.structuredData.contractors.map((contractor: string, idx: number) => (
                                    <Badge key={idx} variant="outline" className="text-primary border-primary/20">{contractor}</Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {extractionMode === 'full' && result.structuredData.invoices && result.structuredData.invoices.length > 0 && (
                            <div>
                              <h6 className="text-sm font-bold text-muted-foreground mb-2">Invoice Numbers:</h6>
                              <div className="border border-border rounded-lg p-4 bg-muted/30">
                                <div className="flex flex-wrap gap-2">
                                  {result.structuredData.invoices.map((invoice: string, idx: number) => (
                                    <Badge key={idx} variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-900/20">{invoice}</Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {extractionMode === 'full' && result.structuredData.emails && result.structuredData.emails.length > 0 && (
                            <div>
                              <h6 className="text-sm font-bold text-muted-foreground mb-2">Email Addresses:</h6>
                              <div className="border border-border rounded-lg p-4 bg-muted/30">
                                <div className="flex flex-wrap gap-2">
                                  {result.structuredData.emails.map((email: string, idx: number) => (
                                    <Badge key={idx} variant="secondary">{email}</Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {extractionMode === 'full' && result.structuredData.phones && result.structuredData.phones.length > 0 && (
                            <div>
                              <h6 className="text-sm font-bold text-muted-foreground mb-2">Phone Numbers:</h6>
                              <div className="border border-border rounded-lg p-4 bg-muted/30">
                                <div className="flex flex-wrap gap-2">
                                  {result.structuredData.phones.map((phone: string, idx: number) => (
                                    <Badge key={idx} variant="secondary">{phone}</Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="2">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <FileText size={20} />
                          <h6 className="text-lg font-bold">Extracted Text</h6>
                        </div>
                        <div 
                          className="border border-border rounded-lg p-4 max-h-[300px] overflow-auto bg-muted/30 font-mono text-sm whitespace-pre-wrap leading-relaxed"
                        >
                          {result.rawText || 'No text extracted'}
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="3">
                      <div className="space-y-4">
                        <h6 className="text-lg font-bold">Export Options</h6>
                        <div className="flex flex-wrap gap-3">
                          <Button 
                            variant="default" 
                            className="gap-2"
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
                            <Download size={16} />
                            Export as JSON
                          </Button>
                          <Button 
                            variant="outline" 
                            className="gap-2"
                            onClick={() => {
                              // Export as CSV
                              let csvContent = 'data:text/csv;charset=utf-8,';
                              
                              // Add BOQ items if present
                              if (result?.structuredData?.boqItems && result.structuredData.boqItems.length > 0) {
                                csvContent += 'BOQ Items:,\n';
                                csvContent += 'Description,Quantity,Unit\n';
                                result.structuredData.boqItems.forEach((item: any) => {
                                  csvContent += `${item.description},${item.quantity},${item.unit}\n`;
                                });
                                csvContent += '\n';
                              }

                              // Add financial amounts if present
                              if (result?.structuredData?.amounts && result.structuredData.amounts.length > 0) {
                                csvContent += 'Financial Amounts:,\n';
                                csvContent += 'Amount\n';
                                result.structuredData.amounts.forEach((amount: number) => {
                                  csvContent += `${formatCurrency(amount)}\n`;
                                });
                                csvContent += '\n';
                              }

                              // Add other structured data
                              if (result?.structuredData?.dates && result.structuredData.dates.length > 0) {
                                csvContent += 'Dates:,\n';
                                csvContent += 'Date\n';
                                result.structuredData.dates.forEach((date: string) => {
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
                            <Download size={16} />
                            Export as CSV
                          </Button>
                          <Button 
                            variant="outline" 
                            className="gap-2"
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
                            <Download size={16} />
                            Export BOQ Only
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChandraOCRAnalyzer;

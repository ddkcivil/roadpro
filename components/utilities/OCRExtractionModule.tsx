import React, { useState, useEffect } from 'react';
import { useFileDragDrop } from '../../hooks/useFileDragDrop';
import { cn } from "../../lib/utils";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Progress } from "../../components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";

import { FileText, Eye, Download, CheckCircle } from 'lucide-react';
import { ocrService } from '../../services/ai/ocrService';
import { formatCurrency } from '../../utils/formatting/exportUtils';

interface DocumentExtractionResult {
  rawText: string;
  structuredData: any;
  confidence: number;
}

const OCRExtractionModule: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<DocumentExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [documentType, setDocumentType] = useState<string>('');
  const [extractionMode, setExtractionMode] = useState<'full' | 'boq' | 'finance'>('full');

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

  return (
    <div className="space-y-6">
      <div>
        <h5 className="text-xl font-extrabold text-gray-900 mb-4">
          Chandra OCR Extraction
        </h5>
        <p className="text-sm text-gray-500">
          Extract text and structured data from documents using advanced OCR technology
        </p>
      </div>

      {/* Upload Area */}
      <Card className="rounded-2xl">
        <CardContent>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,.pdf"
            className="hidden"
            aria-label="Upload document"
          />
          
          {/* Extraction Mode Selector */}
          <div className="flex gap-x-8 mb-12">
            <Button
              variant={extractionMode === 'full' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setExtractionMode('full')}
              className="rounded-full normal-case font-medium"
            >
              Full Analysis
            </Button>
            <Button
              variant={extractionMode === 'boq' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setExtractionMode('boq')}
              className="rounded-full normal-case font-medium"
            >
              BOQ Extraction
            </Button>
            <Button
              variant={extractionMode === 'finance' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setExtractionMode('finance')}
              className="rounded-full normal-case font-medium"
            >
              Financial Data
            </Button>
          </div>
          
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            className="border-2 border-dashed border-gray-300 rounded-2xl p-24 text-center cursor-pointer bg-gray-100 transition-all duration-200 hover:border-blue-500 hover:bg-blue-50"
          >
            <FileText size={48} className="mx-auto mb-4 text-slate-400" />
            <h6 className="text-lg font-bold text-gray-900 mb-4">
              Upload Document for Chandra OCR
            </h6>
            <p className="text-sm text-gray-500 mb-12">
              Drag & drop your image or PDF file here, or click to browse
            </p>
            <span className="text-xs text-gray-400">
              Supports JPG, PNG, GIF, BMP, TIFF, PDF formats
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Progress Indicator */}
      {isProcessing && (
        <Card className="rounded-2xl">
          <CardContent>
            <h6 className="text-lg font-bold mb-8 flex items-center gap-x-4">
              <Eye size={20} />
              Processing Document
            </h6>
            <Progress 
              value={progress} 
              className="h-2 rounded-2xl mb-8" 
            />
            <p className="text-sm text-gray-500">
              {progress < 30 ? 'Initializing OCR engine...' : 
               progress < 60 ? 'Analyzing document structure...' : 
               progress < 90 ? 'Extracting text and data...' : 
               'Finalizing extraction...'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertTitle>Processing Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results with Side-by-Side Preview */}
      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Document Preview Column */}
          <div>
            <Card className="rounded-2xl h-full">
              <CardContent>
                <h6 className="text-lg font-bold mb-8 flex items-center gap-x-4">
                  <Eye size={20} />
                  Document Preview
                </h6>
                                <div
                                  className="border border-gray-300 rounded-lg p-4 bg-white h-full flex items-center justify-center min-h-[400px]"
                                >                  {previewUrl && (
                                      <img
                                        src={previewUrl}
                                        alt="Document Preview"
                                        className="max-w-full max-h-[500px] object-contain rounded"
                                      />                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* OCR Results Column */}
          <div>
            <div className="space-y-4">
              <Card className="rounded-2xl">
                <CardContent>
                  <div className="flex justify-between items-center mb-8">
                    <h6 className="text-lg font-bold flex items-center gap-x-4">
                      <CheckCircle size={20} color="#10b981" />
                      Extraction Successful
                    </h6>
                    <Badge
                      className={cn(
                        "text-xs px-2 py-1 rounded-full",
                        result.confidence > 85 ? 'bg-green-100 text-green-800' :
                        result.confidence > 70 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800',
                        "font-bold"
                      )}
                    >
                      Confidence: {result.confidence}%
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-gray-500 mb-4">
                    Extracted from: {fileName} • Type: {documentType}
                  </p>
                  
                  {/* Document Analysis Summary */}
                  <div className="mt-8 p-8 bg-blue-100 rounded-lg">
                    <h6 className="text-sm font-bold text-gray-900 mb-4">
                      Document Analysis Summary
                    </h6>
                    <div className="flex flex-col gap-y-4">
                      <div className="flex justify-between">
                        <p className="text-sm text-gray-500">BOQ Items:</p>
                        <p className="text-sm font-medium">{result.structuredData.boqItems?.length || 0}</p>
                      </div>
                      <div className="flex justify-between">
                        <p className="text-sm text-gray-500">Financial Amounts:</p>
                        <p className="text-sm font-medium">{result.structuredData.amounts?.length || 0}</p>
                      </div>
                      <div className="flex justify-between">
                        <p className="text-sm text-gray-500">Dates Found:</p>
                        <p className="text-sm font-medium">{result.structuredData.dates?.length || 0}</p>
                      </div>
                      <div className="flex justify-between">
                        <p className="text-sm text-gray-500">Project Codes:</p>
                        <p className="text-sm font-medium">{result.structuredData.codes?.length || 0}</p>
                      </div>
                      <div className="flex justify-between">
                        <p className="text-sm text-gray-500">Contractors:</p>
                        <p className="text-sm font-medium">{result.structuredData.contractors?.length || 0}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Raw Text Output */}
              <Card className="rounded-2xl">
                <CardContent>
                  <h6 className="text-lg font-bold mb-8 flex items-center gap-x-4">
                    <FileText size={20} />
                    Extracted Text
                  </h6>
                  <div 
                    className="border p-8 max-h-[300px] overflow-auto bg-background font-mono text-sm whitespace-pre-wrap leading-relaxed"
                  >
                    {result.rawText || 'No text extracted'}
                  </div>
                </CardContent>
              </Card>

              {/* Structured Data */}
              <Card className="rounded-2xl">
                <CardContent>
                  <h6 className="text-lg font-bold mb-8">
                    Structured Data Extraction
                  </h6>
                  
                  <div className="flex flex-col gap-y-8">
                    {(extractionMode === 'full' || extractionMode === 'boq') && result.structuredData.boqItems && result.structuredData.boqItems.length > 0 && (
                      <div>
                        <h6 className="text-sm font-bold text-gray-500 mb-4">
                          Bill of Quantities (BOQ):
                        </h6>
                        <div className="border p-8 bg-background">
                          <div className="flex flex-col gap-y-4">
                            {result.structuredData.boqItems.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center">
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{item.description}</p>
                                  <span className="text-xs text-gray-500">{item.unit}</span>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold">{item.quantity}</p>
                                  <span className="text-xs text-gray-500">{item.unit}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {(extractionMode === 'full' || extractionMode === 'finance') && result.structuredData.amounts && result.structuredData.amounts.length > 0 && (
                      <div>
                        <h6 className="text-sm font-bold text-gray-500 mb-4">
                          Financial Amounts:
                        </h6>
                        <div className="border p-8 bg-background">
                          <div className="flex flex-row flex-wrap gap-4">
                            {result.structuredData.amounts.map((amount: number, idx: number) => (
                              <Badge key={idx} className="text-xs px-2 py-1">
                                {`${formatCurrency(amount)}`}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {extractionMode === 'full' && result.structuredData.dates && result.structuredData.dates.length > 0 && (
                      <div>
                        <h6 className="text-sm font-bold text-gray-500 mb-4">
                          Dates Found:
                        </h6>
                        <div className="border p-8 bg-background">
                          <div className="flex flex-row flex-wrap gap-4">
                            {result.structuredData.dates.map((date: string, idx: number) => (
                              <Badge key={idx} className="text-xs px-2 py-1">
                                {date}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {extractionMode === 'full' && result.structuredData.codes && result.structuredData.codes.length > 0 && (
                      <div>
                        <h6 className="text-sm font-bold text-gray-500 mb-4">
                          Project Codes:
                        </h6>
                        <div className="border p-8 bg-background">
                          <div className="flex flex-row flex-wrap gap-4">
                            {result.structuredData.codes.map((code: string, idx: number) => (
                              <Badge key={idx} className="text-xs px-2 py-1">
                                {code}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {extractionMode === 'full' && result.structuredData.contractors && result.structuredData.contractors.length > 0 && (
                      <div>
                        <h6 className="text-sm font-bold text-gray-500 mb-4">
                          Contractors/Suppliers:
                        </h6>
                        <div className="border p-8 bg-background">
                          <div className="flex flex-row flex-wrap gap-4">
                            {result.structuredData.contractors.map((contractor: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs px-2 py-1 border-blue-500 text-blue-800">
                                {contractor}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {extractionMode === 'full' && result.structuredData.invoices && result.structuredData.invoices.length > 0 && (
                      <div>
                        <h6 className="text-sm font-bold text-gray-500 mb-4">
                          Invoice Numbers:
                        </h6>
                        <div className="border p-8 bg-background">
                          <div className="flex flex-row flex-wrap gap-4">
                            {result.structuredData.invoices.map((invoice: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs px-2 py-1 border-purple-500 text-purple-800">
                                {invoice}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {extractionMode === 'full' && result.structuredData.emails && result.structuredData.emails.length > 0 && (
                      <div>
                        <h6 className="text-sm font-bold text-gray-500 mb-4">
                          Email Addresses:
                        </h6>
                        <div className="border p-8 bg-background">
                          <div className="flex flex-row flex-wrap gap-4">
                            {result.structuredData.emails.map((email: string, idx: number) => (
                              <Badge key={idx} className="text-xs px-2 py-1">
                                {email}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {extractionMode === 'full' && result.structuredData.phones && result.structuredData.phones.length > 0 && (
                      <div>
                        <h6 className="text-sm font-bold text-gray-500 mb-4">
                          Phone Numbers:
                        </h6>
                        <div className="border p-8 bg-background">
                          <div className="flex flex-row flex-wrap gap-4">
                            {result.structuredData.phones.map((phone: string, idx: number) => (                              <Badge key={idx} className="text-xs px-2 py-1">
                                {phone}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <Card className="rounded-2xl">
                <CardContent>
                  <h6 className="text-lg font-bold mb-8">
                    Export Options
                  </h6>
                  <div className="flex flex-row flex-wrap gap-x-8 gap-y-4">
                    <Button
                      variant="default"
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
                      <Download size={16} className="mr-2" />
                      Export as JSON
                    </Button>
                    <Button
                      variant="outline"
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
                      <Download size={16} className="mr-2" />
                      Export as CSV
                    </Button>
                    <Button
                      variant="outline"
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
                      <Download size={16} className="mr-2" />
                      Export BOQ Only
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OCRExtractionModule;

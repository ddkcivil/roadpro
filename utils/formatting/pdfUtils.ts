import { Project, RFI, RFIStatus, UserWithPermissions } from '../../types';
import { generateUniqueId } from '../../utils/uuidUtils';
import { AuditService } from '../../services/analytics/auditService';
import { toast } from 'sonner';

// Helper function to add standard header to all PDFs
const addStandardHeader = (doc: any, project: Project, title: string) => {
  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Municipality: ${project.clientName || 'Tilottama Municipality'}`, margin, 15);
  doc.text(`Name of Project: ${project.name}`, margin, 22);
  doc.text(`Contract ID: ${project.contractNo || 'N/A'}`, margin, 29);
  doc.text(`Employer: ${project.clientName || 'N/A'}`, pageWidth - margin, 15, { align: 'right' });
  doc.text(`Engineer: ${project.consultantName || 'N/A'}`, pageWidth - margin, 22, { align: 'right' });
  doc.text(`Contractor: ${project.contractor || 'N/A'}`, pageWidth - margin, 29, { align: 'right' });
  doc.text(`Date: ${new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth - margin, 36, { align: 'right' });
  
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, 40, pageWidth - margin, 40);
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, 50, { align: 'center' });
};

// Helper function to add footer to all PDFs
const addFooter = (doc: any) => {
  const pageCount = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.height;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() / 2, pageHeight - 10, { align: 'center' });
  }
};

// Define a type for the jsPDF library
declare global {
  interface Window {
    jsPDF: any;
  }
}

// Function to generate a basic project summary report in PDF
export const generateProjectSummaryPDF = async (project: Project) => {
  const { jsPDF } = await import('jspdf');
  
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  
  addStandardHeader(doc, project, 'PROJECT SUMMARY REPORT');
  
  let yPos = 60;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Project Code: ${project.code}`, 20, yPos);
  yPos += 7;
  doc.text(`Location: ${project.location}`, 20, yPos);
  yPos += 7;
  doc.text(`Client: ${project.client}`, 20, yPos);
  yPos += 7;
  doc.text(`Contractor: ${project.contractor}`, 20, yPos);
  yPos += 7;
  doc.text(`Start Date: ${project.startDate}`, 20, yPos);
  yPos += 7;
  doc.text(`End Date: ${project.endDate}`, 20, yPos);
  yPos += 15;
  
  // Add BOQ Summary Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('BOQ Summary', 20, yPos);
  yPos += 10;
  
  // Add table headers for BOQ
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Item No.', 20, yPos);
  doc.text('Description', 50, yPos);
  doc.text('Quantity', 120, yPos);
  doc.text('Rate', 140, yPos);
  doc.text('Amount', 160, yPos);
  yPos += 8;
  
  // Add BOQ items (first 10 for brevity)
  doc.setFont('helvetica', 'normal');
  const boqItems = project.boq || [];
  boqItems.slice(0, 10).forEach((item, index) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Item No.', 20, yPos);
      doc.text('Description', 50, yPos);
      doc.text('Quantity', 120, yPos);
      doc.text('Rate', 140, yPos);
      doc.text('Amount', 160, yPos);
      yPos += 8;
      doc.setFont('helvetica', 'normal');
    }
    
    doc.text(item.itemNo || '', 20, yPos);
    doc.text((item.description || '').substring(0, 30) + '...', 50, yPos);
    doc.text((item.quantity || 0).toString(), 120, yPos);
    doc.text((item.rate || 0).toString(), 140, yPos);
    doc.text((item.amount || 0).toString(), 160, yPos);
    yPos += 8;
  });
  
  // Add Structures Summary Section if there are structures
  if (project.structures && project.structures.length > 0) {
    const pageHeight = doc.internal.pageSize.height;
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
    } else {
      yPos += 15;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Structures Summary', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Name', 20, yPos);
    doc.text('Type', 80, yPos);
    doc.text('Location', 120, yPos);
    doc.text('Status', 170, yPos);
    yPos += 8;
    
    const structures = project.structures || [];
    structures.slice(0, 10).forEach(structure => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Name', 20, yPos);
        doc.text('Type', 80, yPos);
        doc.text('Location', 120, yPos);
        doc.text('Status', 170, yPos);
        yPos += 8;
        doc.setFont('helvetica', 'normal');
      }
      
      doc.setFont('helvetica', 'normal');
      doc.text(structure.name || '', 20, yPos);
      doc.text(structure.type || '', 80, yPos);
      doc.text(structure.location || '', 120, yPos);
      doc.text(structure.status || '', 170, yPos);
      yPos += 8;
    });
  }
  
  addFooter(doc);
  doc.save(`${project.code}_Project_Summary.pdf`);
};

// Function to generate a BOQ-specific PDF report
export const generateBOQPDF = async (project: Project) => {
  const { jsPDF } = await import('jspdf');
  
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  
  addStandardHeader(doc, project, 'BILL OF QUANTITIES (BOQ) REPORT');
  
  let yPos = 60;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Project: ${project.name}`, 20, yPos);
  yPos += 7;
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, yPos);
  yPos += 15;
  
  // Add table headers
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Item No.', 20, yPos);
  doc.text('Description', 50, yPos);
  doc.text('Unit', 110, yPos);
  doc.text('Quantity', 130, yPos);
  doc.text('Rate', 150, yPos);
  doc.text('Amount', 170, yPos);
  yPos += 8;
  
  // Add BOQ items
  const boqItems = project.boq || [];
  boqItems.forEach((item, index) => {
    const pageHeight = doc.internal.pageSize.height;
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Item No.', 20, yPos);
      doc.text('Description', 50, yPos);
      doc.text('Unit', 110, yPos);
      doc.text('Quantity', 130, yPos);
      doc.text('Rate', 150, yPos);
      doc.text('Amount', 170, yPos);
      yPos += 8;
    }
    
    doc.setFont('helvetica', 'normal');
    doc.text(item.itemNo || '', 20, yPos);
    doc.text((item.description || '').substring(0, 25) + '...', 50, yPos);
    doc.text(item.unit || '', 110, yPos);
    doc.text((item.quantity || 0).toString(), 130, yPos);
    doc.text((item.rate || 0).toString(), 150, yPos);
    doc.text((item.amount || 0).toString(), 170, yPos);
    yPos += 8;
  });
  
  // Add totals
  const totalAmount = boqItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const pageHeight = doc.internal.pageSize.height;
  if (yPos > pageHeight - 30) {
    doc.addPage();
    yPos = 20;
  }
  
  yPos += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Contract Value: ${totalAmount.toLocaleString()}`, 120, yPos);
  
  addFooter(doc);
  doc.save(`${project.code}_BOQ_Report.pdf`);
};

// Function to generate a Structures report in PDF
export const generateStructuresPDF = async (project: Project) => {
  const { jsPDF } = await import('jspdf');
  
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  
  addStandardHeader(doc, project, 'STRUCTURES REPORT');
  
  let yPos = 60;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Project: ${project.name}`, 20, yPos);
  yPos += 7;
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, yPos);
  yPos += 15;
  
  // Add table headers
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Structure Name', 20, yPos);
  doc.text('Type', 100, yPos);
  doc.text('Location', 130, yPos);
  doc.text('Status', 180, yPos);
  yPos += 8;
  
  // Add structure data
  const structures = project.structures || [];
  structures.forEach((structure, index) => {
    const pageHeight = doc.internal.pageSize.height;
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Structure Name', 20, yPos);
      doc.text('Type', 100, yPos);
      doc.text('Location', 130, yPos);
      doc.text('Status', 180, yPos);
      yPos += 8;
    }
    
    doc.setFont('helvetica', 'normal');
    doc.text(structure.name || '', 20, yPos);
    doc.text(structure.type || '', 100, yPos);
    doc.text(structure.location || '', 130, yPos);
    doc.text(structure.status || '', 180, yPos);
    yPos += 8;
  });
  
  addFooter(doc);
  doc.save(`${project.code}_Structures_Report.pdf`);
};

// Function to generate a Resource Management report in PDF
export const generateResourcePDF = async (project: Project) => {
  const { jsPDF } = await import('jspdf');
  
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  
  addStandardHeader(doc, project, 'RESOURCE MANAGEMENT REPORT');
  
  let yPos = 60;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Project: ${project.name}`, 20, yPos);
  yPos += 7;
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, yPos);
  yPos += 15;
  
  // Add Materials Section
  if (project.materials && project.materials.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Materials', 20, yPos);
    yPos += 10;
    
    // Add table headers
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Name', 20, yPos);
    doc.text('Category', 60, yPos);
    doc.text('Unit', 100, yPos);
    doc.text('Qty', 120, yPos);
    doc.text('Avail', 140, yPos);
    doc.text('Unit Cost', 160, yPos);
    doc.text('Status', 190, yPos);
    yPos += 8;
    
    const materials = project.materials || [];
    materials.forEach((material, index) => {
      const pageHeight = doc.internal.pageSize.height;
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Name', 20, yPos);
        doc.text('Category', 60, yPos);
        doc.text('Unit', 100, yPos);
        doc.text('Qty', 120, yPos);
        doc.text('Avail', 140, yPos);
        doc.text('Unit Cost', 160, yPos);
        doc.text('Status', 190, yPos);
        yPos += 8;
      }
      
      doc.setFont('helvetica', 'normal');
      doc.text(material.name || '', 20, yPos);
      doc.text(material.category || '', 60, yPos);
      doc.text(material.unit || '', 100, yPos);
      doc.text((material.quantity || 0).toString(), 120, yPos);
      doc.text((material.availableQuantity || 0).toString(), 140, yPos);
      doc.text((material.unitCost || 0).toString(), 160, yPos);
      doc.text(material.status || '', 190, yPos);
      yPos += 8;
    });
    
    yPos += 10;
  }
  
  // Add Equipment/Vehicles Section
  if (project.vehicles && project.vehicles.length > 0) {
    const pageHeight = doc.internal.pageSize.height;
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Equipment & Vehicles', 20, yPos);
    yPos += 10;
    
    // Add table headers
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Plate/ID', 20, yPos);
    doc.text('Type', 70, yPos);
    doc.text('Status', 120, yPos);
    doc.text('Driver', 160, yPos);
    yPos += 8;
    
    const vehicles = project.vehicles || [];
    vehicles.forEach((vehicle, index) => {
      const pageHeight = doc.internal.pageSize.height;
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Plate/ID', 20, yPos);
        doc.text('Type', 70, yPos);
        doc.text('Status', 120, yPos);
        doc.text('Driver', 160, yPos);
        yPos += 8;
      }
      
      doc.setFont('helvetica', 'normal');
      doc.text(vehicle.plateNumber || '', 20, yPos);
      doc.text(vehicle.type || '', 70, yPos);
      doc.text(vehicle.status || '', 120, yPos);
      doc.text(vehicle.driver || '', 160, yPos);
      yPos += 8;
    });
    
    yPos += 10;
  }
  
  // Add Lab Tests Section
  if (project.labTests && project.labTests.length > 0) {
    const pageHeight = doc.internal.pageSize.height;
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Lab Tests', 20, yPos);
    yPos += 10;
    
    // Add table headers
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Test Name', 20, yPos);
    doc.text('Sample ID', 70, yPos);
    doc.text('Category', 110, yPos);
    doc.text('Date', 150, yPos);
    doc.text('Result', 180, yPos);
    yPos += 8;
    
    const labTests = project.labTests || [];
    labTests.forEach((test, index) => {
      const pageHeight = doc.internal.pageSize.height;
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Test Name', 20, yPos);
        doc.text('Sample ID', 70, yPos);
        doc.text('Category', 110, yPos);
        doc.text('Date', 150, yPos);
        doc.text('Result', 180, yPos);
        yPos += 8;
      }
      
      doc.setFont('helvetica', 'normal');
      doc.text(test.testName || '', 20, yPos);
      doc.text(test.sampleId || '', 70, yPos);
      doc.text(test.category || '', 110, yPos);
      doc.text(test.date || '', 150, yPos);
      doc.text(test.result || '', 180, yPos);
      yPos += 8;
    });
    
    yPos += 10;
  }
  
  // Add Purchase Orders Section
  if (project.purchaseOrders && project.purchaseOrders.length > 0) {
    const pageHeight = doc.internal.pageSize.height;
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Purchase Orders', 20, yPos);
    yPos += 10;
    
    // Add table headers
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PO Number', 20, yPos);
    doc.text('Vendor', 70, yPos);
    doc.text('Date', 120, yPos);
    doc.text('Items', 150, yPos);
    doc.text('Amount', 170, yPos);
    doc.text('Status', 190, yPos);
    yPos += 8;
    
    const purchaseOrders = project.purchaseOrders || [];
    purchaseOrders.forEach((po, index) => {
      const pageHeight = doc.internal.pageSize.height;
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('PO Number', 20, yPos);
        doc.text('Vendor', 70, yPos);
        doc.text('Date', 120, yPos);
        doc.text('Items', 150, yPos);
        doc.text('Amount', 170, yPos);
        doc.text('Status', 190, yPos);
        yPos += 8;
      }
      
      doc.setFont('helvetica', 'normal');
      doc.text(po.poNumber || '', 20, yPos);
      doc.text(po.vendor || '', 70, yPos);
      doc.text(po.date || '', 120, yPos);
      doc.text(po.items.length.toString(), 150, yPos);
      doc.text(po.totalAmount.toString(), 170, yPos);
      doc.text(po.status || '', 190, yPos);
      yPos += 8;
    });
  }
  
  addFooter(doc);
  doc.save(`${project.code}_Resource_Report.pdf`);
};

// Function to generate a single RFI report in PDF
export const generateSingleRFIPDF = async (rfi: RFI, project: Project) => {
  const { jsPDF } = await import('jspdf');
  
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' }) as any;
  const pageWidth = doc.internal.pageSize.getWidth();
  const docAny = doc as any;
  const margin = 15;
  
  // Standard Header matching official document
  docAny.setFontSize(10);
  docAny.setFont('helvetica', 'normal');
  docAny.text(`Municipality: ${project.clientName || 'Tilottama Municipality'}`, margin, 15);
  docAny.text(`Name of Project: ${project.name}`, margin, 22);
  docAny.text(`Contract ID: ${project.contractNo || 'N/A'}`, margin, 29);
  docAny.text(`Employer: ${project.clientName || 'N/A'}`, pageWidth - margin, 15, { align: 'right' });
  docAny.text(`Engineer: ${project.consultantName || 'N/A'}`, pageWidth - margin, 22, { align: 'right' });
  docAny.text(`Contractor: ${project.contractor || 'N/A'}`, pageWidth - margin, 29, { align: 'right' });
  docAny.text(`Date: ${new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth - margin, 36, { align: 'right' });
  
  // Add separator line
  docAny.setDrawColor(0, 0, 0);
  docAny.setLineWidth(0.5);
  docAny.line(margin, 40, pageWidth - margin, 40);
  
  // Title
  docAny.setFontSize(14);
  docAny.setFont('helvetica', 'bold');
  docAny.text('REQUEST FOR INSPECTION (RFI)', pageWidth / 2, 50, { align: 'center' });
  
  let yPos = 58;
  docAny.setFontSize(10);
  docAny.setFont('helvetica', 'normal');
  
  // RFI Details Section
  docAny.setFont('helvetica', 'bold');
  docAny.text('RFI Number:', 15, yPos);
  docAny.setFont('helvetica', 'normal');
  docAny.text(`${rfi.rfiNumber}`, 55, yPos);
  yPos += 6;
  
  docAny.setFont('helvetica', 'bold');
  docAny.text('Project:', 15, yPos);
  docAny.setFont('helvetica', 'normal');
  docAny.text(project.name, 40, yPos);
  yPos += 6;
  
  docAny.setFont('helvetica', 'bold');
  docAny.text('Date:', 15, yPos);
  docAny.setFont('helvetica', 'normal');
  docAny.text(`${rfi.date}`, 35, yPos);
  yPos += 6;
  
  docAny.setFont('helvetica', 'bold');
  docAny.text('Time:', 15, yPos);
  docAny.setFont('helvetica', 'normal');
  docAny.text(`${rfi.inspectionTime || 'N/A'}`, 30, yPos);
  yPos += 6;
  
  docAny.setFont('helvetica', 'bold');
  docAny.text('Location:', 15, yPos);
  docAny.setFont('helvetica', 'normal');
  docAny.text(`${rfi.location}`, 40, yPos);
  yPos += 6;
  
  docAny.setFont('helvetica', 'bold');
  docAny.text('Inspection Type:', 15, yPos);
  docAny.setFont('helvetica', 'normal');
  docAny.text(`${rfi.inspectionType || 'N/A'}`, 60, yPos);
  yPos += 6;
  
  docAny.setFont('helvetica', 'bold');
  docAny.text('Purpose:', 15, yPos);
  docAny.setFont('helvetica', 'normal');
  docAny.text(`${rfi.inspectionPurpose || 'N/A'}`, 35, yPos);
  yPos += 6;
  
  docAny.setFont('helvetica', 'bold');
  docAny.text('Status:', 80, yPos);
  docAny.setFont('helvetica', 'normal');
  docAny.text(`${rfi.status}`, 100, yPos);
  yPos += 10;
  
  // Description of Work
  docAny.setFont('helvetica', 'bold');
  docAny.text('Description of Work for Inspection', 15, yPos);
  yPos += 8;
  
  docAny.setFont('helvetica', 'normal');
  const description = String(rfi.description || 'No description provided.');
  const descLines = docAny.splitTextToSize(description, pageWidth - 30);
  descLines.forEach((line: string) => {
    if (yPos > 270) { docAny.addPage(); yPos = 20; }
    docAny.text(line, 15, yPos);
    yPos += 5;
  });
  yPos += 8;
  
  // Signatures Section
  if (yPos > 240) { docAny.addPage(); yPos = 20; }
  docAny.setFont('helvetica', 'bold');
  docAny.text('Signatures', 15, yPos);
  yPos += 8;
  
  docAny.setFont('helvetica', 'bold');
  docAny.text('Submitted By:', 15, yPos);
  yPos += 6;
  docAny.setFont('helvetica', 'normal');
  docAny.text(`${rfi.submittedBy || '_ _ _ _ _ _ _ _ _ _ _'}`, 15, yPos);
  yPos += 6;
  docAny.text('Signature: _________________________', 15, yPos);
  yPos += 10;
  
  // Footer with page numbers
  const pageCount = docAny.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    docAny.setPage(i);
    docAny.text(`Page ${i} of ${pageCount}`, pageWidth / 2, docAny.internal.pageSize.height - 10, { align: 'center' });
  }
  
  docAny.save(`${rfi.rfiNumber}_RFI_Report.pdf`);
};
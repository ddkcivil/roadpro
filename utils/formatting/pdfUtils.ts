import { Project, RFI, RFIStatus, UserWithPermissions } from '../../types';
import { generateUniqueId } from '../../utils/uuidUtils'; // Assuming this might be needed for internal IDs, though not directly for PDF generation here.
import { AuditService } from '../../services/analytics/auditService'; // Assuming this is used elsewhere
import { toast } from 'sonner'; // Assuming this is used elsewhere

// Define a type for the jsPDF library
declare global {
  interface Window {
    jsPDF: any;
  }
}

// Function to generate a basic project summary report in PDF
export const generateProjectSummaryPDF = async (project: Project) => {
  // Dynamically import jsPDF
  const { jsPDF } = await import('jspdf');
  
  // Create a new PDF document
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(22);
  doc.text(project.name, 20, 30);
  
  doc.setFontSize(16);
  doc.text(`Project Code: ${project.code}`, 20, 45);
  doc.text(`Location: ${project.location}`, 20, 55);
  doc.text(`Client: ${project.client}`, 20, 65);
  doc.text(`Contractor: ${project.contractor}`, 20, 75);
  doc.text(`Start Date: ${project.startDate}`, 20, 85);
  doc.text(`End Date: ${project.endDate}`, 20, 95);
  
  // Add BOQ Summary Section
  doc.setFontSize(18);
  doc.text('BOQ Summary', 20, 115);
  
  // Add table headers for BOQ
  doc.setFontSize(12);
  doc.text('Item No.', 20, 125);
  doc.text('Description', 50, 125);
  doc.text('Quantity', 120, 125);
  doc.text('Rate', 140, 125);
  doc.text('Amount', 160, 125);
  
  // Add BOQ items (first 10 for brevity)
  let yPos = 135;
  const boqItems = project.boq || [];
  boqItems.slice(0, 10).forEach((item, index) => {
    if (yPos > 270) { // If we're near the bottom of the page, add a new page
      doc.addPage();
      yPos = 20;
      doc.setFontSize(12);
      doc.text('Item No.', 20, yPos);
      doc.text('Description', 50, yPos);
      doc.text('Quantity', 120, yPos);
      doc.text('Rate', 140, yPos);
      doc.text('Amount', 160, yPos);
      yPos += 10;
    }
    
    doc.text(item.itemNo || '', 20, yPos);
    doc.text((item.description || '').substring(0, 30) + '...', 50, yPos); // Truncate for space
    doc.text((item.quantity || 0).toString(), 120, yPos);
    doc.text((item.rate || 0).toString(), 140, yPos);
    doc.text((item.amount || 0).toString(), 160, yPos);
    yPos += 10;
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
    
    doc.setFontSize(18);
    doc.text('Structures Summary', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(12);
    doc.text('Name', 20, yPos);
    doc.text('Type', 80, yPos);
    doc.text('Location', 120, yPos);
    doc.text('Status', 170, yPos);
    
    yPos += 10;
    
    const structures = project.structures || [];
    structures.slice(0, 10).forEach(structure => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
        doc.setFontSize(12);
        doc.text('Name', 20, yPos);
        doc.text('Type', 80, yPos);
        doc.text('Location', 120, yPos);
        doc.text('Status', 170, yPos);
        yPos += 10;
      }
      
      doc.text(structure.name || '', 20, yPos);
      doc.text(structure.type || '', 80, yPos);
      doc.text(structure.location || '', 120, yPos);
      doc.text(structure.status || '', 170, yPos);
      yPos += 10;
    });
  }
  
  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pageCount}`, 200, doc.internal.pageSize.height - 10, { align: 'right' });
  }
  
  doc.save(`${project.code}_Project_Summary.pdf`);
};

// Function to generate a BOQ-specific PDF report
export const generateBOQPDF = async (project: Project) => {
  const { jsPDF } = await import('jspdf');
  
  const doc = new jsPDF();
  
  doc.setFontSize(22);
  doc.text(`${project.name} - BOQ Report`, 20, 30);
  
  doc.setFontSize(16);
  doc.text(`Project: ${project.name}`, 20, 45);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 55);
  
  // Add table headers
  doc.setFontSize(12);
  doc.text('Item No.', 20, 75);
  doc.text('Description', 50, 75);
  doc.text('Unit', 110, 75);
  doc.text('Quantity', 130, 75);
  doc.text('Rate', 150, 75);
  doc.text('Amount', 170, 75);
  
  // Add BOQ items
  let yPos = 85;
  const boqItems = project.boq || [];
  boqItems.forEach((item, index) => {
    const pageHeight = doc.internal.pageSize.height;
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
      doc.setFontSize(12);
      doc.text('Item No.', 20, yPos);
      doc.text('Description', 50, yPos);
      doc.text('Unit', 110, yPos);
      doc.text('Quantity', 130, yPos);
      doc.text('Rate', 150, yPos);
      doc.text('Amount', 170, yPos);
      yPos += 10;
    }
    
    doc.text(item.itemNo || '', 20, yPos);
    doc.text((item.description || '').substring(0, 25) + '...', 50, yPos); // Truncate description
    doc.text(item.unit || '', 110, yPos);
    doc.text((item.quantity || 0).toString(), 130, yPos);
    doc.text((item.rate || 0).toString(), 150, yPos);
    doc.text((item.amount || 0).toString(), 170, yPos);
    yPos += 10;
  });
  
  // Add totals
  const totalAmount = boqItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const pageHeight = doc.internal.pageSize.height;
  if (yPos > pageHeight - 30) {
    doc.addPage();
    yPos = 20;
  }
  
  yPos += 10;
  doc.setFontSize(14);
  doc.text(`Total Contract Value: ${totalAmount.toLocaleString()}`, 120, yPos);
  
  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pageCount}`, 200, doc.internal.pageSize.height - 10, { align: 'right' });
  }
  
  doc.save(`${project.code}_BOQ_Report.pdf`);
};

// Function to generate a Structures report in PDF
export const generateStructuresPDF = async (project: Project) => {
  const { jsPDF } = await import('jspdf');
  
  const doc = new jsPDF();
  
  doc.setFontSize(22);
  doc.text(`${project.name} - Structures Report`, 20, 30);
  
  doc.setFontSize(16);
  doc.text(`Project: ${project.name}`, 20, 45);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 55);
  
  // Add table headers
  doc.setFontSize(12);
  doc.text('Structure Name', 20, 75);
  doc.text('Type', 100, 75);
  doc.text('Location', 130, 75);
  doc.text('Status', 180, 75);
  
  // Add structure data
  let yPos = 85;
  const structures = project.structures || [];
  structures.forEach((structure, index) => {
    const pageHeight = doc.internal.pageSize.height;
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
      doc.setFontSize(12);
      doc.text('Structure Name', 20, yPos);
      doc.text('Type', 100, yPos);
      doc.text('Location', 130, yPos);
      doc.text('Status', 180, yPos);
      yPos += 10;
    }
    
    doc.text(structure.name || '', 20, yPos);
    doc.text(structure.type || '', 100, yPos);
    doc.text(structure.location || '', 130, yPos);
    doc.text(structure.status || '', 180, yPos);
    yPos += 10;
  });
  
  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pageCount}`, 200, doc.internal.pageSize.height - 10, { align: 'right' });
  }
  
  doc.save(`${project.code}_Structures_Report.pdf`);
};

// Function to generate a Resource Management report in PDF
export const generateResourcePDF = async (project: Project) => {
  const { jsPDF } = await import('jspdf');
  
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(22);
  doc.text(`${project.name} - Resource Management Report`, 20, 30);
  
  doc.setFontSize(16);
  doc.text(`Project: ${project.name}`, 20, 45);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 55);
  
  // Initialize y position for content
  let yPos = 75;
  
  // Add Materials Section
  if (project.materials && project.materials.length > 0) {
    doc.setFontSize(18);
    doc.text('Materials', 20, yPos);
    yPos += 10;
    
    // Add table headers
    doc.setFontSize(12);
    doc.text('Name', 20, yPos);
    doc.text('Category', 60, yPos);
    doc.text('Unit', 100, yPos);
    doc.text('Qty', 120, yPos);
    doc.text('Avail', 140, yPos);
    doc.text('Unit Cost', 160, yPos);
    doc.text('Status', 190, yPos);
    
    yPos += 10;
    const materials = project.materials || [];
    materials.forEach((material, index) => {
      const pageHeight = doc.internal.pageSize.height;
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
        doc.setFontSize(12);
        doc.text('Name', 20, yPos);
        doc.text('Category', 60, yPos);
        doc.text('Unit', 100, yPos);
        doc.text('Qty', 120, yPos);
        doc.text('Avail', 140, yPos);
        doc.text('Unit Cost', 160, yPos);
        doc.text('Status', 190, yPos);
        yPos += 10;
      }
      
      doc.text(material.name || '', 20, yPos);
      doc.text(material.category || '', 60, yPos);
      doc.text(material.unit || '', 100, yPos);
      doc.text((material.quantity || 0).toString(), 120, yPos);
      doc.text((material.availableQuantity || 0).toString(), 140, yPos);
      doc.text((material.unitCost || 0).toString(), 160, yPos);
      doc.text(material.status || '', 190, yPos);
      yPos += 10;
    });
    
    yPos += 15; // Add some space before next section
  }
  
  // Add Equipment/Vehicles Section
  if (project.vehicles && project.vehicles.length > 0) {
    const pageHeight = doc.internal.pageSize.height;
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(18);
    doc.text('Equipment & Vehicles', 20, yPos);
    yPos += 10;
    
    // Add table headers
    doc.setFontSize(12);
    doc.text('Plate/ID', 20, yPos);
    doc.text('Type', 70, yPos);
    doc.text('Status', 120, yPos);
    doc.text('Driver', 160, yPos);
    
    yPos += 10;
    
    const vehicles = project.vehicles || [];
    vehicles.forEach((vehicle, index) => {
      const pageHeight = doc.internal.pageSize.height;
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
        doc.setFontSize(12);
        doc.text('Plate/ID', 20, yPos);
        doc.text('Type', 70, yPos);
        doc.text('Status', 120, yPos);
        doc.text('Driver', 160, yPos);
        yPos += 10;
      }
      
      doc.text(vehicle.plateNumber || '', 20, yPos);
      doc.text(vehicle.type || '', 70, yPos);
      doc.text(vehicle.status || '', 120, yPos);
      doc.text(vehicle.driver || '', 160, yPos);
      yPos += 10;
    });
    
    yPos += 15; // Add some space before next section
  }
  
  // Add Lab Tests Section
  if (project.labTests && project.labTests.length > 0) {
    const pageHeight = doc.internal.pageSize.height;
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(18);
    doc.text('Lab Tests', 20, yPos);
    yPos += 10;
    
    // Add table headers
    doc.setFontSize(12);
    doc.text('Test Name', 20, yPos);
    doc.text('Sample ID', 70, yPos);
    doc.text('Category', 110, yPos);
    doc.text('Date', 150, yPos);
    doc.text('Result', 180, yPos);
    
    yPos += 10;
    
    const labTests = project.labTests || [];
    labTests.forEach((test, index) => {
      const pageHeight = doc.internal.pageSize.height;
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
        doc.setFontSize(12);
        doc.text('Test Name', 20, yPos);
        doc.text('Sample ID', 70, yPos);
        doc.text('Category', 110, yPos);
        doc.text('Date', 150, yPos);
        doc.text('Result', 180, yPos);
        yPos += 10;
      }
      
      doc.text(test.testName || '', 20, yPos);
      doc.text(test.sampleId || '', 70, yPos);
      doc.text(test.category || '', 110, yPos);
      doc.text(test.date || '', 150, yPos);
      doc.text(test.result || '', 180, yPos);
      yPos += 10;
    });
    
    yPos += 15; // Add some space before next section
  }
  
  // Add Purchase Orders Section
  if (project.purchaseOrders && project.purchaseOrders.length > 0) {
    const pageHeight = doc.internal.pageSize.height;
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(18);
    doc.text('Purchase Orders', 20, yPos);
    yPos += 10;
    
    // Add table headers
    doc.setFontSize(12);
    doc.text('PO Number', 20, yPos);
    doc.text('Vendor', 70, yPos);
    doc.text('Date', 120, yPos);
    doc.text('Items', 150, yPos);
    doc.text('Amount', 170, yPos);
    doc.text('Status', 190, yPos);
    
    yPos += 10;
    
    const purchaseOrders = project.purchaseOrders || [];
    purchaseOrders.forEach((po, index) => {
      const pageHeight = doc.internal.pageSize.height;
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
        doc.setFontSize(12);
        doc.text('PO Number', 20, yPos);
        doc.text('Vendor', 70, yPos);
        doc.text('Date', 120, yPos);
        doc.text('Items', 150, yPos);
        doc.text('Amount', 170, yPos);
        doc.text('Status', 190, yPos);
        yPos += 10;
      }
      
      doc.text(po.poNumber || '', 20, yPos);
      doc.text(po.vendor || '', 70, yPos);
      doc.text(po.date || '', 120, yPos);
      doc.text(po.items.length.toString(), 150, yPos);
      doc.text(po.totalAmount.toString(), 170, yPos);
      doc.text(po.status || '', 190, yPos);
      yPos += 10;
    });
  }
  
  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pageCount}`, 200, doc.internal.pageSize.height - 10, { align: 'right' });
  }
  
  doc.save(`${project.code}_Resource_Report.pdf`);
};

// Function to generate a single RFI report in PDF matching official format
export const generateSingleRFIPDF = async (rfi: RFI, project: Project) => {
  const { jsPDF } = await import('jspdf');
  
  // Type assertion to bypass strict TypeScript checking for jsPDF
  const doc = new jsPDF() as any;
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Disable strict TypeScript checking for all doc operations
  const docAny = doc as any;
  
  // Title
  docAny.setFontSize(18);
  docAny.text(project.name, 20, 20);
  
  docAny.setFontSize(16);
  docAny.text('REQUEST FOR INSPECTION (RFI)', pageWidth / 2, 30, { align: 'center' });
  
  // Header Information Table
  let yPos = 40;
  docAny.setFontSize(10);
  
  // Row 1: Contractor and Engineer Info
  docAny.setFont(undefined, 'bold');
  docAny.text('Contractor:', 20, yPos);
  docAny.setFont(undefined, 'normal');
  docAny.text(`${rfi.contractorName || project.contractor || ''}`, 60, yPos);
  
  docAny.setFont(undefined, 'bold');
  docAny.text('Engineer:', 120, yPos);
  docAny.setFont(undefined, 'normal');
  docAny.text(`${rfi.engineerName || project.engineer || ''}`, 160, yPos);
  yPos += 6;
  
  // Row 2: Address and Firm
  docAny.setFont(undefined, 'bold');
  docAny.text('Address:', 20, yPos);
  docAny.setFont(undefined, 'normal');
  docAny.text(`${(rfi.contractorAddress || '').substring(0, 50)}`, 60, yPos);
  
  docAny.setFont(undefined, 'bold');
  docAny.text('Firm:', 120, yPos);
  docAny.setFont(undefined, 'normal');
  docAny.text(`${rfi.engineerFirm || ''}`, 160, yPos);
  yPos += 6;
  
  // Row 3: Date
  docAny.setFont(undefined, 'bold');
  docAny.text('Date:', 20, yPos);
  docAny.setFont(undefined, 'normal');
  docAny.text(`${rfi.contractorDate || rfi.date}`, 60, yPos);
  yPos += 6;
  
  // Row 4: Site Office
  docAny.setFont(undefined, 'bold');
  docAny.text('Site Office:', 20, yPos);
  docAny.setFont(undefined, 'normal');
  docAny.text(`${rfi.siteOffice || ''}`, 60, yPos);
  yPos += 6;
  
  // Divider
  docAny.line(20, yPos, pageWidth - 20, yPos);
  yPos += 8;
  
  // Details Section
  docAny.setFontSize(11);
  
  // Row 1: Request No and Contract No
  docAny.setFont(undefined, 'bold');
  docAny.text('Request No:', 20, yPos);
  docAny.setFont(undefined, 'normal');
  docAny.text(`${rfi.requestNo || rfi.rfiNumber}`, 60, yPos);
  
  docAny.setFont(undefined, 'bold');
  docAny.text('Contract No:', 120, yPos);
  docAny.setFont(undefined, 'normal');
  docAny.text(`${rfi.contractNoOfficial || rfi.contractNo || ''}`, 160, yPos);
  yPos += 8;
  
  // Row 2: Date with two fields
  docAny.setFont(undefined, 'bold');
  docAny.text('Date:', 20, yPos);
  docAny.setFont(undefined, 'normal');
  docAny.text(`${rfi.date}`, 60, yPos);
  yPos += 8;
  
  // Row 3: Location chainage range format from PDF
  docAny.setFont(undefined, 'bold');
  docAny.text('Location:', 20, yPos);
  docAny.setFont(undefined, 'normal');
  docAny.text(`${rfi.location}`, 60, yPos);
  yPos += 8;
  
  // Row 4: B.O.Q Item No
  docAny.setFont(undefined, 'bold');
  docAny.text('B.O.Q Item No:', 20, yPos);
  docAny.setFont(undefined, 'normal');
  docAny.text(`${rfi.boqItemNoOfficial || rfi.boqItemNo || ''}`, 60, yPos);
  yPos += 8;
  
  // Row 5: Inspection Time
  docAny.setFont(undefined, 'bold');
  docAny.text('Inspection Time:', 20, yPos);
  docAny.setFont(undefined, 'normal');
  docAny.text(`${rfi.inspectionTime || ''}`, 60, yPos);
  yPos += 8;
  
  // Row 6: Drafted By
  docAny.setFont(undefined, 'bold');
  docAny.text('Drafted By:', 20, yPos);
  docAny.setFont(undefined, 'normal');
  docAny.text(`${rfi.submittedBy || ''}`, 60, yPos);
  yPos += 8;
  
  // Row 7: Inspector/Surveyor
  docAny.setFont(undefined, 'bold');
  docAny.text('Inspector/Surveyor:', 20, yPos);
  docAny.setFont(undefined, 'normal');
  docAny.text(`${rfi.receivedBy || ''}`, 60, yPos);
  yPos += 8;
  
  // Row 8: Contract / Source
  docAny.setFont(undefined, 'bold');
  docAny.text('Contract / Source:', 20, yPos);
  docAny.setFont(undefined, 'normal');
  docAny.text(`${rfi.contractNo || ''}`, 60, yPos);
  yPos += 8;
  
  // Row 9: Purpose of Inspection
  docAny.setFont(undefined, 'bold');
  docAny.text('Purpose of Inspection:', 20, yPos);
  docAny.setFont(undefined, 'normal');
  docAny.text(`${rfi.inspectionPurposeOfficial || rfi.inspectionPurpose || ''}`, 60, yPos);
  yPos += 8;
  
  // Row 10: Works Status checkboxes (text description)
  docAny.setFont(undefined, 'bold');
  docAny.text('Works Status:', 20, yPos);
  docAny.setFont(undefined, 'normal');
  docAny.text(`${rfi.worksStatus || '_ _ _ _ _ _ _ _ _ _ _'}`, 60, yPos);
  yPos += 10;
  
  // Divider
  docAny.line(20, yPos, pageWidth - 20, yPos);
  yPos += 8;
  
  // Particular Details Section
  docAny.setFont(undefined, 'bold');
  docAny.text('Particular Details:', 20, yPos);
  yPos += 6;
  
  const detailsText = String(rfi.description || rfi.specificWorkDetails || 'No details provided.');
  const detailLines = docAny.splitTextToSize(detailsText, pageWidth - 40);
  docAny.setFont(undefined, 'normal');
  detailLines.forEach((line: string) => {
    if (yPos > 270) { docAny.addPage(); yPos = 20; }
    docAny.text(line, 20, yPos);
    yPos += 5;
  });
  
  yPos += 5;
  
  // IoW - Inspection of Works Section
  docAny.setFont(undefined, 'bold');
  docAny.text('IoW (Inspection of Works):', 20, yPos);
  yPos += 6;
  docAny.setFont(undefined, 'normal');
  docAny.text('_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _', 20, yPos);
  yPos += 15;
  
  // Divider
  docAny.line(20, yPos, pageWidth - 20, yPos);
  yPos += 8;
  
  // Signature/Approval Section - Two Column Layout
  const col1X = 20;
  const col2X = pageWidth / 2 + 10;
  
  function drawAuthorityBlock(x: number, title: string, authority: any, y: number) {
    docAny.setFont(undefined, 'bold');
    docAny.text(title, x, y);
    y += 5;
    
    docAny.setFontSize(9);
    docAny.setFont(undefined, 'normal');
    
    // Approval checkboxes
    docAny.text('Not Approved: [ ]', x, y);
    docAny.text('Approved with comments: [ ]', x + 60, y);
    y += 4;
    docAny.text('Approved: [ ]', x + 130, y);
    y += 6;
    
    // Remarks
    docAny.setFont(undefined, 'bold');
    docAny.text('Remarks if any:', x, y);
    y += 4;
    docAny.setFont(undefined, 'normal');
    docAny.text('_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _', x, y);
    y += 4;
    docAny.text('_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _', x, y);
    y += 6;
    
    // Signature line
    docAny.text('Signature: _________________________', x, y);
    y += 4;
    docAny.text(`Name: ${authority?.name || '_ _ _ _ _ _ _ _ _ _ _'}`, x, y);
    y += 4;
    docAny.text(`Date: ${authority?.date || '_ _ _ _ _ _ _ _ _ _ _'}`, x, y);
    y += 8;
    
    return y;
  }
  
  // Engineer's Representative
  yPos = drawAuthorityBlock(col1X, "Engineer's Representative:", rfi.engineersRepresentative, yPos);
  
  // Surveyor
  if (yPos > 250) { docAny.addPage(); yPos = 20; }
  yPos = drawAuthorityBlock(col2X, 'Surveyor:', rfi.surveyor, yPos);
  
  // Geotechnical/Geologist
  if (yPos > 250) { docAny.addPage(); yPos = 20; }
  yPos = drawAuthorityBlock(col1X, 'Geotechnical/Geologist:', rfi.geotechnicalGeologist, yPos);
  
  // Assistant Resident Engineer
  if (yPos > 250) { docAny.addPage(); yPos = 20; }
  yPos = drawAuthorityBlock(col2X, 'Assistant Resident Engineer:', rfi.assistantResidentEngineer, yPos);
  
  // Information
  if (yPos > 250) { docAny.addPage(); yPos = 20; }
  docAny.setFont(undefined, 'bold');
  docAny.text('Information:', col1X, yPos);
  yPos += 5;
  docAny.setFont(undefined, 'normal');
  docAny.text('Signature: _________________________', col1X, yPos);
  yPos += 4;
  docAny.text(`Name: ${rfi.information?.name || '_ _ _ _ _ _ _ _ _ _ _'}`, col1X, yPos);
  yPos += 4;
  docAny.text(`Date: ${rfi.information?.date || '_ _ _ _ _ _ _ _ _ _ _'}`, col1X, yPos);
  yPos += 10;
  
  // Other
  if (yPos > 250) { docAny.addPage(); yPos = 20; }
  docAny.setFont(undefined, 'bold');
  docAny.text('Other (Specify):', col1X, yPos);
  yPos += 5;
  docAny.setFont(undefined, 'normal');
  docAny.text(`Other: ${rfi.other?.specify || '_ _ _ _ _ _ _ _ _ _ _'}`, col1X, yPos);
  yPos += 4;
  docAny.text('Signature: _________________________', col1X, yPos);
  yPos += 4;
  docAny.text(`Name: ${rfi.other?.name || '_ _ _ _ _ _ _ _ _ _ _'}`, col1X, yPos);
  yPos += 4;
  docAny.text(`Date: ${rfi.other?.date || '_ _ _ _ _ _ _ _ _ _ _'}`, col1X, yPos);
  yPos += 15;
  
  // Divider
  docAny.line(20, yPos, pageWidth - 20, yPos);
  yPos += 8;
  
  // Submitted and Received By
  docAny.setFontSize(10);
  docAny.setFont(undefined, 'bold');
  docAny.text('Submitted by:', 20, yPos);
  yPos += 5;
  docAny.setFont(undefined, 'normal');
  docAny.text(String(rfi.submittedBy || '_ _ _ _ _ _ _ _ _ _ _'), 20, yPos);
  yPos += 4;
  docAny.text('Signature: _________________________', 20, yPos);
  yPos += 15;
  
  if (yPos > 260) { docAny.addPage(); yPos = 20; }
  docAny.setFont(undefined, 'bold');
  docAny.text('Received by:', 20, yPos);
  yPos += 5;
  docAny.setFont(undefined, 'normal');
  docAny.text('(Signature)', 20, yPos);
  yPos += 15;
  
  // Footer with page numbers
  const pageCount = docAny.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    docAny.setPage(i);
    docAny.text(`Page ${i} of ${pageCount}`, pageWidth / 2, docAny.internal.pageSize.height - 10, { align: 'center' });
  }
  
  docAny.save(`${rfi.rfiNumber}_RFI_Report.pdf`);
};

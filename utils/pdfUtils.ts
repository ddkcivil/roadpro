import { Project } from '../types';

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
  
  // Save the PDF
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
  (project.structures || []).forEach((structure, index) => {
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
    
    doc.text(structure.name, 20, yPos);
    doc.text(structure.type, 100, yPos);
    doc.text(structure.location, 130, yPos);
    doc.text(structure.status, 180, yPos);
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

// Function to generate an RFI report in PDF
export const generateRFIPDF = async (project: Project) => {
  const { jsPDF } = await import('jspdf');
  
  const doc = new jsPDF();
  
  doc.setFontSize(22);
  doc.text(`${project.name} - RFI Report`, 20, 30);
  
  doc.setFontSize(16);
  doc.text(`Project: ${project.name}`, 20, 45);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 55);
  
  // Add table headers
  doc.setFontSize(12);
  doc.text('RFI Number', 20, 75);
  doc.text('Date', 70, 75);
  doc.text('Location', 100, 75);
  doc.text('Description', 130, 75);
  doc.text('Status', 180, 75);
  
  // Add RFI data
  let yPos = 85;
  const rfis = project.rfis || [];
  rfis.forEach((rfi, index) => {
    const pageHeight = doc.internal.pageSize.height;
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
      doc.setFontSize(12);
      doc.text('RFI Number', 20, yPos);
      doc.text('Date', 70, yPos);
      doc.text('Location', 100, yPos);
      doc.text('Description', 130, yPos);
      doc.text('Status', 180, yPos);
      yPos += 10;
    }
    
    doc.text(rfi.rfiNumber || '', 20, yPos);
    doc.text(rfi.date || '', 70, yPos);
    doc.text(rfi.location || '', 100, yPos);
    doc.text((rfi.description || '').substring(0, 20) + '...', 130, yPos); // Truncate description
    doc.text(rfi.status || '', 180, yPos);
    yPos += 10;
  });
  
  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pageCount}`, 200, doc.internal.pageSize.height - 10, { align: 'right' });
  }
  
  doc.save(`${project.code}_RFI_Report.pdf`);
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
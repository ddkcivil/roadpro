import { Project, AppSettings } from '../../types';
import { getCurrencySymbol } from './currencyUtils';

export const formatCurrency = (amount: number | undefined | null, settings?: AppSettings): string => {
  if (amount == null) {
    const currencyCode = settings?.currency || 'USD';
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol}0.00`;
  }
  const currencyCode = settings?.currency || 'USD';
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatCurrencyWithCode = (amount: number | undefined | null, settings?: AppSettings): string => {
  if (amount == null) {
    const currencyCode = settings?.currency || 'USD';
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol}0.00 ${currencyCode}`;
  }
  const currencyCode = settings?.currency || 'USD';
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyCode}`;
};

// Utility function to export project data to CSV format
export const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    console.error('No data to export');
    return;
  }

  // Get headers from the first row of data
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and wrap in quotes if needed
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  // Create and download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the object URL to prevent memory leaks
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

// Export project BOQ to CSV
export const exportBOQToCSV = (project: Project) => {
  const boqData = project.boq.map(item => ({
    'Item No.': item.itemNo,
    'Description': item.description,
    'Unit': item.unit,
    'Quantity': item.quantity,
    'Rate': item.rate,
    'Amount': item.amount,
    'Category': item.category,
    'Location': item.location,
    'Completed Quantity': item.completedQuantity,
    'Status': item.status || 'Planned'
  }));

  exportToCSV(boqData, `${project.code}_BOQ.csv`);
};

// Export project structures to CSV
export const exportStructuresToCSV = (project: Project) => {
  const structureData = (project.structures || []).flatMap(structure => 
    structure.components.map(component => ({
      'Structure Name': structure.name,
      'Structure Type': structure.type,
      'Location': structure.location,
      'Component': component.name,
      'Unit': component.unit,
      'Total Quantity': component.totalQuantity,
      'Completed Quantity': component.completedQuantity,
      'Verified Quantity': component.verifiedQuantity,
      'Status': structure.status,
      'Subcontractor': structure.subcontractorId || 'Internal'
    }))
  );

  exportToCSV(structureData, `${project.code}_Structures.csv`);
};

// Export project RFIs to CSV
export const exportRFIToCSV = (project: Project) => {
  const rfiData = project.rfis.map(rfi => ({
    'RFI Number': rfi.rfiNumber,
    'Date': rfi.date,
    'Location': rfi.location,
    'Description': rfi.description,
    'Status': rfi.status,
    'Requested By': rfi.requestedBy,
    'Inspection Date': rfi.inspectionDate || 'N/A',
    'Linked Task ID': rfi.linkedTaskId || 'None'
  }));

  exportToCSV(rfiData, `${project.code}_RFIs.csv`);
};

// Export project lab tests to CSV
export const exportLabTestsToCSV = (project: Project) => {
  const testData = project.labTests.map(test => ({
    'Sample ID': test.sampleId,
    'Test Name': test.testName,
    'Category': test.category,
    'Test Date': test.date,
    'Location': test.location,
    'Result': test.result,
    'Asset ID': test.assetId || 'N/A',
    'Component ID': test.componentId || 'N/A',
    'Technician': test.technician || 'N/A'
  }));

  exportToCSV(testData, `${project.code}_Lab_Tests.csv`);
};

// Export project subcontractor payments to CSV
export const exportSubcontractorPaymentsToCSV = (project: Project) => {
  const paymentData = (project.agencyPayments || []).map(payment => ({
    'Payment Date': payment.date,
    'Amount': payment.amount,
    'Reference': payment.reference,
    'Type': payment.type,
    'Description': payment.description,
    'Status': payment.status
  }));

  exportToCSV(paymentData, `${project.code}_Subcontractor_Payments.csv`);
};

// Export project schedule to CSV
export const exportScheduleToCSV = (project: Project) => {
  const scheduleData = project.schedule.map(task => ({
    'Task ID': task.id,
    'Task Name': task.name,
    'Start Date': task.startDate,
    'End Date': task.endDate,
    'Progress': task.progress,
    'Status': task.status,
    'Assigned To': task.assignedTo?.join('; ') || 'N/A',
    'Dependencies Count': task.dependencies.length,
    'Is Critical': task.isCritical ? 'Yes' : 'No'
  }));

  exportToCSV(scheduleData, `${project.code}_Schedule.csv`);
};
import jsPDF from 'jspdf';
import { Project, AppSettings, Milestone } from '../../types';
import { formatCurrency } from './currencyUtils';

// Helper to format currency
const formatMoney = (amount: number, currencyCode?: string): string => {
  if (!currencyCode) currencyCode = 'NPR';
  return formatCurrency(amount, currencyCode);
};

// Helper to format date
const formatDate = (dateStr: string): string => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Helper to get month name
const getMonthName = (monthStr: string): string => {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

// Calculate financial summary
const calculateFinancialSummary = (project: Project) => {
  const original = (project.boq || []).reduce((acc, item) => acc + (item.quantity * item.rate), 0);
  const variation = (project.boq || []).reduce((acc, item) => acc + ((item.variationQuantity || 0) * item.rate), 0);
  const revised = original + variation;
  const progressValue = (project.boq || []).reduce((acc, item) => acc + (item.completedQuantity * item.rate), 0);
  return { original, variation, revised, progressValue };
};

// Calculate time progress
const calculateTimeProgress = (project: Project): { elapsed: number; remaining: number; elapsedPercent: number } => {
  if (!project.startDate || !project.endDate) {
    return { elapsed: 0, remaining: 0, elapsedPercent: 0 };
  }
  
  const startDate = new Date(project.startDate).getTime();
  const endDate = new Date(project.endDate).getTime();
  const today = new Date().getTime();
  
  if (today <= startDate) return { elapsed: 0, remaining: 0, elapsedPercent: 0 };
  if (today >= endDate) {
    const totalDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
    return { elapsed: totalDays, remaining: 0, elapsedPercent: 100 };
  }
  
  const totalMs = endDate - startDate;
  const elapsedMs = today - startDate;
  const totalDays = Math.round(totalMs / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.round(elapsedMs / (1000 * 60 * 60 * 24));
  const remainingDays = totalDays - elapsedDays;
  
  return {
    elapsed: elapsedDays,
    remaining: remainingDays,
    elapsedPercent: Math.round((elapsedDays / totalDays) * 100)
  };
};

// Interface for milestone with dates
interface MilestoneWithDates {
  name: string;
  startDate: string;
  endDate: string;
}

// Main PDF Generation Function
export const generateMPRPDF = async (
  project: Project,
  reportMonth: string,
  settings?: AppSettings
): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  
  let yPosition = margin;
  const addNewPage = () => {
    doc.addPage();
    yPosition = margin;
  };
  
  const checkPageBreak = (neededSpace: number) => {
    if (yPosition + neededSpace > pageHeight - margin) {
      addNewPage();
      return true;
    }
    return false;
  };
  
  // Colors
  const primaryColor: [number, number, number] = [0, 51, 102];
  const secondaryColor: [number, number, number] = [100, 100, 100];
  const accentColor: [number, number, number] = [0, 102, 153];
  
  // Currency code
  const currencyCode = settings?.currency || 'NPR';
  
  // Helper functions
  const addTitle = (title: string, fontSize: number = 16, color?: [number, number, number]) => {
    checkPageBreak(15);
    doc.setFontSize(fontSize);
    doc.setTextColor(...(color || primaryColor));
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += fontSize / 2 + 2;
  };
  
  const addSubtitle = (subtitle: string, fontSize: number = 12) => {
    checkPageBreak(10);
    doc.setFontSize(fontSize);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(subtitle, margin, yPosition);
    yPosition += fontSize / 2 + 2;
  };
  
  const addText = (text: string, fontSize: number = 10, bold: boolean = false) => {
    checkPageBreak(fontSize / 2 + 4);
    doc.setFontSize(fontSize);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    
    const lines = doc.splitTextToSize(text, contentWidth);
    doc.text(lines, margin, yPosition);
    yPosition += lines.length * (fontSize / 2 + 1);
  };
  
  // Simple table row with 2 columns
  const addTableRow2 = (col1: string, col2: string) => {
    checkPageBreak(8);
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(col1, margin, yPosition);
    doc.text(col2, margin + 70, yPosition);
    yPosition += 6;
  };
  
  // Table row with 3 columns
  const addTableRow3 = (col1: string, col2: string, col3: string) => {
    checkPageBreak(8);
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(col1, margin, yPosition);
    doc.text(col2, margin + 70, yPosition);
    doc.text(col3, margin + 130, yPosition);
    yPosition += 6;
  };
  
  // Table row with 4 columns
  const addTableRow4 = (col1: string, col2: string, col3: string, col4: string) => {
    checkPageBreak(8);
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(col1, margin, yPosition);
    doc.text(col2, margin + 60, yPosition);
    doc.text(col3 || '', margin + 110, yPosition);
    doc.text(col4, margin + 155, yPosition);
    yPosition += 6;
  };
  
  const addHorizontalLine = () => {
    doc.setDrawColor(...secondaryColor);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 4;
  };
  
  // Calculations
  const financialSummary = calculateFinancialSummary(project);
  const timeProgress = calculateTimeProgress(project);
  const reportDate = getMonthName(reportMonth);
  
  // ==================== PAGE 1: COVER PAGE ====================
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('MONTHLY PROGRESS REPORT', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name of Project: ${project.name || 'N/A'}`, pageWidth / 2, 30, { align: 'center' });
  
  yPosition = 55;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Contract No: ${project.contractNo || 'N/A'}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;
  doc.text(`Month/ Year: ${reportDate}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 30;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('For', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(project.clientName || 'Urban Resilience and Livability Improvement Project,', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;
  doc.text('Project Implementation Unit, Tilottama Municipality.', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Prepared by', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(`Contractor: ${project.contractor || 'N/A'}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  doc.setFont('helvetica', 'normal');
  doc.text(`Address: ${project.location || 'N/A'}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;
  doc.setFont('helvetica', 'normal');
  doc.text('Reviewed By', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(`Supervision and Design Consultant [SDC]: ${project.consultantName || 'N/A'}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;
  doc.setFont('helvetica', 'normal');
  doc.text('Submitted To:', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;
  doc.text('Project Implementation Unit (PIU)', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;
  doc.text(project.location || 'Tilottama Municipality', pageWidth / 2, yPosition, { align: 'center' });
  
  // ==================== PAGE 2: TABLE OF CONTENTS ====================
  addNewPage();
  addTitle('Table of Contents', 18);
  yPosition += 10;
  
  const tocItems = [
    'ENDORSEMENT SHEET',
    '1. Project Introduction and Background',
    '2. Contract Details',
    '3. Project Implementation Milestones',
    '4. Contract Elapsed Period',
    '5. Physical Work Progress in Reporting Month',
    '6. Financial Work Progress in Reporting Month',
    '7. Project Progress Curve',
    '8. Key Personnel and Other Personnel Deployment Status',
    '9. Plant and Equipment Deployment Status',
    '10. Construction Material Status',
    '11. Weather Record in the Reporting Month',
    '12. Status of Environmental Management Plan (EMP) Implementation',
    '13. Status of Site-Specific Health and Safety Management Plan (H&SMP) Implementation',
    '14. Status of Resettlement Plan (RP) Implementation',
    '15. Grievance Redress Mechanism (GRM)',
    '16. Work Plan for the Next Month',
    '17. Meetings, Consultations and Coordination',
    '18. Official Correspondence',
    '19. Site Photographs',
    '20. Annexes'
  ];
  
  doc.setFontSize(11);
  tocItems.forEach((item, index) => {
    doc.setTextColor(0, 0, 0);
    doc.text(`${index + 1}`, margin, yPosition);
    doc.text(item, margin + 10, yPosition);
    yPosition += 7;
  });
  
  // ==================== PAGE 3: ENDORSEMENT SHEET ====================
  addNewPage();
  addTitle('ENDORSEMENT SHEET', 16);
  yPosition += 5;
  
  // Reporting Information Table
  addSubtitle('REPORTING INFORMATION');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  addTableRow2('Project Name', project.clientName || 'Urban Resilience and Livability Improvement Project [URLIP]');
  addTableRow2('Report', 'Monthly Progress Report [MPR]');
  addTableRow2('Report for', 'Project Implementation Unit [PIU], Tilottama Municipality');
  
  yPosition += 5;
  addHorizontalLine();
  yPosition += 5;
  
  // Preparation Review and Authorization
  addSubtitle('PREPARATION REVIEW AND AUTHORIZATION');
  addTableRow2('MPR No', '02');
  addTableRow2('Date', `January ${new Date(reportMonth + '-01').getFullYear()}`);
  addTableRow2('Submitted By', 'Contractor');
  addTableRow2('Reviewed By', 'Supervision and Design Consultant [SDC]');
  addTableRow2('Approved for /Issue By', 'Project Manager');
  
  yPosition += 5;
  addHorizontalLine();
  yPosition += 5;
  
  // Company Details
  addSubtitle('COMPANY DETAILS');
  addTableRow2('Contractor Name', project.contractor || 'N/A');
  addTableRow2('Address', project.location || 'N/A');
  addTableRow2('Email', 'contractor@email.com');
  
  yPosition += 5;
  addHorizontalLine();
  yPosition += 5;
  
  // Summary of Report
  addSubtitle('SUMMARY OF REPORT');
  addTableRow2('Client/Agency Name', project.clientName || 'Ministry of Urban Development');
  addTableRow2('Name of the Project', project.name || 'N/A');
  addTableRow2('Name of Implementing Agency', 'Project Implementation Unit (PIU)');
  addTableRow2('Funding Agency', 'Asian Development Bank, Government of Nepal');
  addTableRow2('Engineer Name', project.consultantName || 'N/A');
  addTableRow2('Contractor Name', project.contractor || 'N/A');
  addTableRow2('Contract Agreement Date', formatDate(project.startDate || ''));
  addTableRow2('Commencement Date', formatDate(project.startDate || ''));
  addTableRow2('Contract Period', project.contractPeriod || '730 days');
  addTableRow2('Completion Date', formatDate(project.endDate || ''));
  addTableRow2('Defect Liability Period', '365 days after completion Date');
  addTableRow2('Contract Amount including PS and VAT', formatMoney(financialSummary.revised, currencyCode));
  
  // Brief Work Progress
  yPosition += 5;
  addHorizontalLine();
  yPosition += 5;
  
  addSubtitle('Brief Work Progress – in Reporting Month');
  addSubtitle('Pre-Construction Activities');
  addText('• Joint Construction Survey: Completed at designated road sections.', 10);
  addText('• Vendor / Material Approval: Material testing is ongoing.', 10);
  addText('• Site Camp: establishment of site camp is in progress.', 10);
  
  addSubtitle('Construction Activities');
  addText('• No Work: Construction activities are not started yet.', 10);
  
  addSubtitle('Work Plan for Next Month');
  addText('• Pre-Construction: Social safeguard Mobilize, Environmental Monitor works, Site Yard establishment, Design completion.', 10);
  addText('• Construction: Site Laboratory setup, Site Clearance, Cross Drainage work will be started.', 10);
  
  // ==================== PAGE 4-5: PROJECT INTRODUCTION ====================
  addNewPage();
  addTitle('1. Project Introduction and Background', 14);
  yPosition += 5;
  
  addSubtitle('1.1 Overview');
  const overviewText = `The Urban Resilience and Livability Improvement Project (URLIP) is a Government of Nepal initiative implemented with financial assistance from the Asian Development Bank (ADB). The project aims to improve urban infrastructure, resilience, and service delivery in selected municipalities through construction and upgrading of roads, drainage, pedestrian facilities, and related urban infrastructure.

Under this framework, the project "${project.name || 'Drainage, Road, Footpath and Road Furniture Works'}" is being implemented through Contract No. ${project.contractNo || 'N/A'}. The works are located within the jurisdiction of Tilottama Municipality, Rupandehi District, and are primarily urban in nature, involving construction activities in densely populated areas with active traffic and public movement.

Under this contract, the project includes:
• Construction and upgrading of reinforced concrete (RCC) covered and open drains along designated road sections.
• Improvement of existing municipal roads through pavement construction, sub-base/base works, and surface finishing.
• Installation of footpaths, kerb, and pedestrian-friendly infrastructure.
• Construction and placement of road furniture, including signage, speed bumps, guardrails, and safety barriers.
• Associated temporary work such as stockpiling, material storage areas, labour camps, and machinery yards.`;
  addText(overviewText);
  
  addSubtitle('1.2 Key Stakeholders and Institutional Framework');
  addTableRow2('Project Name', project.name || 'N/A');
  addTableRow2('Employer', 'Government of Nepal, Ministry of Urban Development');
  addTableRow2('Implementing Agency', 'Project Implementation Unit, Tilottama Municipality');
  addTableRow2('Engineer', project.consultantName || 'N/A');
  addTableRow2('Contractor', project.contractor || 'N/A');
  
  addSubtitle('1.3 Project Components');
  addText('The project components include construction of road, drainage, footpath and road furniture in designated road sections within the Municipality.', 10);
  
  // ==================== PAGE 6: CONTRACT DETAILS ====================
  addNewPage();
  addTitle('2. Contract Details', 14);
  yPosition += 5;
  
  addTableRow2('Project Name', project.name || 'N/A');
  addTableRow2('Contract No.', project.contractNo || 'N/A');
  addTableRow2('Employer', 'Government of Nepal, Ministry of Urban Development');
  addTableRow2('Implementing Agency', 'Project Implementation Unit, Tilottama Municipality');
  addTableRow2('Engineer', project.consultantName || 'N/A');
  addTableRow2('Contractor', project.contractor || 'N/A');
  addTableRow2('Site Office', project.location || 'N/A');
  addTableRow2('Contract Amount', formatMoney(financialSummary.revised, currencyCode));
  addTableRow2('Contract Period', project.contractPeriod || '730 days');
  addTableRow2('Contract Agreement Date', formatDate(project.startDate || ''));
  addTableRow2('Commencement Date', formatDate(project.startDate || ''));
  addTableRow2('Completion Date', formatDate(project.endDate || ''));
  
  // ==================== PAGE 7: IMPLEMENTATION MILESTONES & ELAPSED PERIOD ====================
  addNewPage();
  addTitle('3. Project Implementation Milestones', 14);
  yPosition += 5;
  
  // Milestones table header
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  addTableRow4('S.N.', 'Description', 'Start Date', 'Completion Date');
  addHorizontalLine();
  
  // Use project milestones or default milestones
  const milestones: MilestoneWithDates[] = project.milestones && project.milestones.length > 0 
    ? project.milestones.map((m: Milestone) => ({
        name: m.name,
        startDate: (m as any).startDate || m.date,
        endDate: (m as any).endDate || ''
      }))
    : [
        { name: 'Site Clearance', startDate: '2026-03-15', endDate: '2027-02-21' },
        { name: 'Earthwork', startDate: '2026-04-15', endDate: '2027-07-26' },
        { name: 'Cross and side drainage work', startDate: '2026-02-26', endDate: '2027-06-13' },
        { name: 'Structure work', startDate: '2026-04-01', endDate: '2027-07-15' },
        { name: 'Side Drain', startDate: '2026-04-03', endDate: '2027-09-06' },
        { name: 'Road Works', startDate: '2026-05-21', endDate: '2027-09-17' },
        { name: 'Footpath', startDate: '2026-11-10', endDate: '2027-12-05' },
        { name: 'Road Furniture', startDate: '2027-02-25', endDate: '2027-12-17' }
      ];
  
  doc.setFont('helvetica', 'normal');
  milestones.forEach((milestone, index) => {
    addTableRow4(`${index + 1}`, milestone.name, formatDate(milestone.startDate), formatDate(milestone.endDate));
  });
  
  // Contract Elapsed Period
  addNewPage();
  addTitle('4. Contract Elapsed Period', 14);
  yPosition += 5;
  
  addText(`From Contract Commencement Date (${formatDate(project.startDate || '')}) to this date, total Contract Elapsed Period is ${timeProgress.elapsed} days.`, 11);
  yPosition += 10;
  
  // Visual representation of elapsed time
  const barWidth = 100;
  const barHeight = 15;
  const elapsedWidth = (timeProgress.elapsedPercent / 100) * barWidth;
  
  doc.setFillColor(230, 230, 230);
  doc.rect(margin + 30, yPosition, barWidth, barHeight, 'F');
  doc.setFillColor(...accentColor);
  doc.rect(margin + 30, yPosition, elapsedWidth, barHeight, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Elapsed Period: ${timeProgress.elapsed} Days`, margin + 30, yPosition + barHeight + 5);
  doc.text(`Remaining Period: ${timeProgress.remaining} Days`, margin + 80, yPosition + barHeight + 5);
  doc.text(`${timeProgress.elapsedPercent}%`, margin + 30 + elapsedWidth / 2, yPosition - 3, { align: 'center' });
  
  yPosition += 30;
  
  // ==================== PAGE 8-9: PHYSICAL WORK PROGRESS ====================
  addNewPage();
  addTitle('5. Physical Work Progress in Reporting Month', 14);
  yPosition += 5;
  
  addSubtitle('5.1 Pre-Construction Work Progress');
  doc.setFontSize(9);
  addTableRow4('S.N.', 'Name of Road', 'Length (KM)', 'Work Activities');
  addHorizontalLine();
  
  addTableRow4('1', 'Driver Tole – Shivapur Road', '6.81', 'Survey, Design');
  addTableRow4('2', 'Pathardanda – Tinau Road', '6.36', 'Survey, Design');
  
  yPosition += 5;
  addSubtitle('5.2 Construction Work Progress');
  
  // BOQ Progress Table
  doc.setFontSize(9);
  addTableRow4('BoQ Item No', 'Description', 'Unit', 'Progress (%)');
  addHorizontalLine();
  
  const boqItems = project.boq?.slice(0, 15) || [];
  if (boqItems.length === 0) {
    addTableRow4('-', 'No BOQ items available', '-', '-');
  } else {
    boqItems.forEach((item, index) => {
      const progress = Math.round((item.completedQuantity / item.quantity) * 100);
      addTableRow4(
        item.itemNo || `${index + 1}`,
        (item.description || '').substring(0, 25) + '...',
        item.unit || '-',
        `${progress}%`
      );
    });
  }
  
  yPosition += 5;
  const avgProgress = boqItems.length > 0 
    ? Math.round(boqItems.reduce((acc, item) => acc + (item.completedQuantity / item.quantity) * 100, 0) / boqItems.length)
    : 0;
  addText(`Physical Progress: ${avgProgress}%`, 11, true);
  
  // ==================== PAGE 10: FINANCIAL WORK PROGRESS ====================
  addNewPage();
  addTitle('6. Financial Work Progress in Reporting Month', 14);
  yPosition += 5;
  
  addText('The total payment received by the Contractor up to this reporting period is as follows:', 10);
  yPosition += 10;
  
  doc.setFontSize(10);
  addTableRow4('S.N.', 'Description', 'Total Contract Amount', 'Amount Paid');
  addHorizontalLine();
  addTableRow4('1', 'Advance Payment (A.P.)', formatMoney(financialSummary.revised, currencyCode), formatMoney(financialSummary.revised * 0.038, currencyCode));
  addTableRow4('2', 'Interim Payment with VAT', formatMoney(financialSummary.revised, currencyCode), formatMoney(financialSummary.revised * 0.038, currencyCode));
  addTableRow4('', 'Total (A.P. + IPC)', formatMoney(financialSummary.revised, currencyCode), formatMoney(financialSummary.revised * 0.038, currencyCode));
  
  // ==================== PAGE 11: PROJECT PROGRESS CURVE ====================
  addNewPage();
  addTitle('7. Project Progress Curve', 14);
  yPosition += 10;
  
  // Simple S-Curve visualization
  const curveWidth = 150;
  const curveHeight = 80;
  const curveX = margin + 10;
  
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.5);
  
  // Draw axes
  doc.line(curveX, yPosition + curveHeight, curveX + curveWidth, yPosition + curveHeight);
  doc.line(curveX, yPosition, curveX, yPosition + curveHeight);
  
  // Draw baseline curve (planned)
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(1);
  let lastX = curveX;
  let lastY = yPosition + curveHeight;
  for (let i = 0; i <= curveWidth; i += 2) {
    const x = curveX + i;
    const progress = i / curveWidth;
    const y = yPosition + curveHeight - (progress * progress * curveHeight);
    if (i > 0) {
      doc.line(lastX, lastY, x, y);
    }
    lastX = x;
    lastY = y;
  }
  
  // Draw actual progress curve
  doc.setDrawColor(0, 102, 153);
  lastX = curveX;
  lastY = yPosition + curveHeight;
  const elapsedLimit = (timeProgress.elapsedPercent / 100) * curveWidth;
  for (let i = 0; i <= elapsedLimit; i += 2) {
    const x = curveX + i;
    const progress = i / curveWidth;
    const y = yPosition + curveHeight - (progress * progress * 0.7 * curveHeight);
    if (i > 0) {
      doc.line(lastX, lastY, x, y);
    }
    lastX = x;
    lastY = y;
  }
  
  yPosition += curveHeight + 15;
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Planned Progress', curveX + curveWidth - 30, yPosition);
  doc.setTextColor(0, 102, 153);
  doc.text('Actual Progress', curveX + curveWidth - 30, yPosition - 10);
  doc.setTextColor(0, 0, 0);
  doc.text('Time', curveX + curveWidth / 2, yPosition + 10);
  
  yPosition += 25;
  
  // ==================== PAGE 12: KEY PERSONNEL ====================
  addNewPage();
  addTitle('8. Key Personnel and Other Personnel Deployment Status', 14);
  yPosition += 5;
  
  addTableRow3('Position', 'Name', 'Deployment Status');
  addHorizontalLine();
  
  const personnel = [
    { position: 'Project Manager', name: project.projectManager || 'Er. Dharma Dhoj Kunwar', status: 'Present' },
    { position: 'Engineer', name: project.engineer || 'Er. Rajendra Kharel', status: 'Present' },
    { position: 'Lab Technician', name: 'N/A', status: 'N/A' },
    { position: 'Social Safeguard Officer', name: 'Mr. Rajendra Dhakal', status: 'Present' },
    { position: 'Environmental Officer', name: 'N/A', status: 'N/A' },
    { position: 'Site In charge', name: 'Mr. Sital Gyawali', status: 'Present' },
    { position: 'Accountant', name: 'Mr. Bikash Narayan Jha', status: 'Present' },
    { position: 'Sub Engineer', name: 'Suman KC', status: 'Present' },
    { position: 'Surveyor', name: 'Ram Krishna Yadhav', status: 'Present' }
  ];
  
  personnel.forEach(person => {
    addTableRow3(person.position, person.name, person.status);
  });
  
  // ==================== PAGE 13: PLANT AND EQUIPMENT ====================
  addNewPage();
  addTitle('9. Plant and Equipment Deployment Status', 14);
  yPosition += 5;
  
  addText('Equipment will be deployed after construction work starts.', 10);
  yPosition += 10;
  
  const equipment = [
    { type: 'Excavator', required: 2, status: 'Pending' },
    { type: 'Motor Grader', required: 2, status: 'Pending' },
    { type: 'Pneumatic Roller (>8 TON)', required: 2, status: 'Pending' },
    { type: 'Tipper Truck', required: 2, status: 'Pending' },
    { type: 'Vibratory Roller', required: 2, status: 'Idle' },
    { type: 'Asphalt Plant', required: 1, status: 'Pending' },
    { type: 'Asphalt Paver', required: 1, status: 'Pending' },
    { type: 'Tandem Roller', required: 2, status: 'Pending' },
    { type: 'Concrete Batching Plant', required: 1, status: 'Deployed' },
    { type: 'Total Station', required: 1, status: 'Deployed' },
    { type: 'Level Machine', required: 1, status: 'Deployed' },
    { type: 'Double Cap Pickup', required: 1, status: 'Deployed' },
    { type: 'Tractor with Trolley', required: 1, status: 'Deployed' }
  ];
  
  addTableRow3('Equipment Type', 'Minimum No. Required', 'Status');
  addHorizontalLine();
  
  equipment.forEach(eq => {
    addTableRow3(eq.type, `${eq.required}`, eq.status);
  });
  
  // ==================== PAGE 14: CONSTRUCTION MATERIAL STATUS ====================
  addNewPage();
  addTitle('10. Construction Material Status', 14);
  yPosition += 5;
  
  addSubtitle('10.1 Stock Material Status');
  addTableRow4('S.N.', 'Material', 'Unit', 'Closing Stock');
  addHorizontalLine();
  
  const materials = [
    { name: 'Sand', unit: 'Cum.', closing: 14 },
    { name: 'Aggregate', unit: 'Cum.', closing: 10 },
    { name: 'Brick', unit: 'Nos.', closing: 0 },
    { name: 'Stone', unit: 'Cum.', closing: 0 },
    { name: 'Cement', unit: 'Bags', closing: 0 },
    { name: 'Re-bar', unit: 'Ton.', closing: 0 }
  ];
  
  materials.forEach((mat, index) => {
    addTableRow4(`${index + 1}`, mat.name, mat.unit, mat.closing.toString());
  });
  
  yPosition += 5;
  addText('Location: Yard/Site', 10, true);
  
  // ==================== PAGE 15: WEATHER RECORD ====================
  addNewPage();
  addTitle('11. Weather Record in the Reporting Month', 14);
  yPosition += 5;
  
  const weatherData = [
    { range: 'Jan 1 – 5', max: '18° – 20°', min: '6° – 9°', condition: 'Dense morning fog; clearing by midday' },
    { range: 'Jan 6 – 10', max: '19° – 21°', min: '7° – 10°', condition: 'Foggy mornings; partly cloudy' },
    { range: 'Jan 11 – 15', max: '20° – 22°', min: '8° – 11°', condition: 'Clear and sunny afternoons' },
    { range: 'Jan 16 – 20', max: '21° – 23°', min: '9° – 12°', condition: 'Persistent mist; mainly fair weather' },
    { range: 'Jan 21 – 25', max: '19° – 25°', min: '10° – 14°', condition: 'Westerly disturbance, light rain on 24th' },
    { range: 'Jan 26 – 31', max: '21° – 22°', min: '8° – 12°', condition: 'Sunny skies; morning haze' }
  ];
  
  addTableRow4('Date Range', 'Max Temp (°C)', 'Min Temp (°C)', 'Recorded Conditions');
  addHorizontalLine();
  
  weatherData.forEach(w => {
    addTableRow4(w.range, w.max, w.min, w.condition);
  });
  
  // ==================== PAGES 16-17: ENVIRONMENTAL MANAGEMENT ====================
  addNewPage();
  addTitle('12. Status of Environmental Management Plan (EMP) Implementation', 14);
  yPosition += 5;
  
  addSubtitle('12.1 Environmental Monitoring Activities');
  addText('The Site-Specific Environmental Management Plan (SSEMP) has been prepared and submitted for approval. Environmental monitoring and compliance checks will be carried out in accordance with the approved SSEMP.', 10);
  
  addSubtitle('12.2 Environmental Management Measures Implemented');
  addText('These measures include proper waste segregation and disposal, maintenance of sanitary facilities, management of wastewater, regular cleaning and housekeeping, provision of safe drinking water, and enforcement of occupational health and safety protocols.', 10);
  addText('Regular sprinkling of water for dust suppression along the construction site is going on.', 10);
  
  addSubtitle('12.3 Environmental Monitoring Checklist and Compliance Status');
  addTableRow4('S.N.', 'Key Indicators', 'Status', 'Remarks');
  addHorizontalLine();
  
  const envItems = [
    { indicator: 'Control of air pollution', status: 'Satisfactory', remarks: 'Water sprinkling ongoing' },
    { indicator: 'Water pollution control', status: 'Satisfactory', remarks: 'No issues observed' },
    { indicator: 'Noise control', status: 'N/A', remarks: 'Construction not started' },
    { indicator: 'Solid waste pollution control', status: 'Satisfactory', remarks: 'Regular cleaning' },
    { indicator: 'Protection of animals and plants', status: 'N/A', remarks: 'Construction not started' },
    { indicator: 'Resource/Energy conservation', status: 'Satisfactory', remarks: 'In staff camp and office area' },
    { indicator: 'Construction safety and emergency', status: 'Satisfactory', remarks: 'First aid kits available' }
  ];
  
  envItems.forEach((item, index) => {
    addTableRow4(`${index + 1}`, item.indicator, item.status, item.remarks);
  });
  
  // ==================== PAGES 18-20: HEALTH AND SAFETY ====================
  addNewPage();
  addTitle('13. Status of Site-Specific Health and Safety Management Plan (H&SMP) Implementation', 14);
  yPosition += 5;
  
  addSubtitle('13.1 Occupational Health and Safety (OHS) at Work Site');
  addText('The Site-Specific Health and Safety Management Plan has been prepared and approved by the Consultant. During work activities, the following checklists have been adhered to:', 10);
  yPosition += 10;
  
  const safetyItems = [
    { item: 'Preparation and submission of health and safety plan', status: 'Yes' },
    { item: 'OHS Management System', status: 'Yes' },
    { item: 'Temporary Works by Designer', status: 'N/A' },
    { item: 'Occupational Health and Safety Officer (OHSO)', status: 'Yes' },
    { item: 'Medical Check Up', status: 'In Progress' },
    { item: 'Safety and Health Training & Briefing', status: 'Yes' },
    { item: 'General Signage', status: 'Yes' },
    { item: 'Personal Protective Equipment', status: 'Yes' },
    { item: 'Emergency phone numbers posted', status: 'Yes' },
    { item: 'First Aid Facilities', status: 'Yes' },
    { item: 'Portable Fire Extinguisher', status: 'Yes' },
    { item: 'Reporting', status: 'Yes' }
  ];
  
  addTableRow4('S.N.', 'Description', 'Status', '');
  addHorizontalLine();
  
  safetyItems.forEach((item, index) => {
    addTableRow4(`${index + 1}`, item.item, item.status, '');
  });
  
  addSubtitle('13.3 Personal Protective Equipment (PPE) Management');
  addTableRow3('S.N.', 'Equipment', 'Designation');
  addHorizontalLine();
  addTableRow3('1', 'Reflective Jacket (Green)', 'Engineers and Supervisors');
  addTableRow3('2', 'Reflective Jacket (Orange)', 'Labors');
  addTableRow3('3', 'Helmet (White)', 'Engineers and Supervisors');
  addTableRow3('4', 'Helmet (Yellow)', 'Labors');
  addTableRow3('5', 'Helmet (Green)', 'Safety Officer');
  addTableRow3('6', 'Gloves', 'All');
  addTableRow3('7', 'Safety Boot (Steel Toe)', 'Engineers and Supervisors');
  addTableRow3('8', 'Safety Boot (Normal)', 'Labors');
  
  // ==================== PAGE 21: RESETTLEMENT PLAN ====================
  addNewPage();
  addTitle('14. Status of Resettlement Plan (RP) Implementation', 14);
  yPosition += 5;
  
  addSubtitle('14.1 RP Implementation Status');
  addText('Survey of all roads has been completed and necessary data for RP has been collected.', 10);
  yPosition += 10;
  
  addTableRow4('S.N.', 'Name of Road', 'Affected Household', 'Type of Structure');
  addHorizontalLine();
  addTableRow4('1', 'Driver Tole – Shivapur Road', 'Ongoing', 'Ongoing');
  addTableRow4('2', 'Pathardanda – Tinau Road', 'Ongoing', 'Ongoing');
  
  // ==================== PAGE 22-23: GRIEVANCE REDRESS MECHANISM ====================
  addNewPage();
  addTitle('15. Grievance Redress Mechanism (GRM)', 14);
  yPosition += 5;
  
  addSubtitle('15.1 GRM Functioning Status');
  addText('Regular informal meetings are conducted among members of 1st level and 2nd Level GRC. However, no grievances have been received yet.', 10);
  yPosition += 10;
  
  addSubtitle('1st Level GRC Committee');
  addTableRow3('S.N.', 'Name', 'Designation');
  addHorizontalLine();
  addTableRow3('1', 'Ward Chairperson', 'Chairperson');
  addTableRow3('2', 'PIU Engineer', 'Member');
  addTableRow3('3', 'Ward Member (Vulnerable)', 'Member');
  addTableRow3('4', "Contractor's Representative", 'Member');
  addTableRow3('5', 'CSSE', 'Member');
  addTableRow3('6', 'Ward Secretary', 'Member Secretary');
  
  yPosition += 10;
  addSubtitle('2nd Level GRC Committee');
  addTableRow3('S.N.', 'Name', 'Designation');
  addHorizontalLine();
  addTableRow3('1', 'Deputy Mayor', 'Chairperson');
  addTableRow3('2', 'PIU Safeguard Personnel', 'Member');
  addTableRow3('3', 'SDC Social/Environment Specialist', 'Member');
  addTableRow3('4', "Contractor's Representative", 'Member');
  addTableRow3('5', 'Ward Member (Vulnerable)', 'Member');
  addTableRow3('6', 'Ward Member', 'Member');
  addTableRow3('7', 'Project Manager of the PIU', 'Member Secretary');
  
  // ==================== PAGE 24: WORK PLAN FOR NEXT MONTH ====================
  addNewPage();
  addTitle('16. Work Plan for the Next Month', 14);
  yPosition += 5;
  
  addSubtitle('Pre-Construction Activities');
  addText('• RPP, Social safeguard: Mobilize The Social Safeguard Officer will review the RPP and update it.');
  addText('• Environment Monitor works: Environmental Monitoring will be done.');
  addText('• Site Yard: Site Yard will be established.');
  addText('• Design: Construction design will be completed.');
  addText('• Material: Material sampling and testing will be carried out and upon approval, the materials will be stocked.');
  addText('• Manpower: Manpower as per requirement will be deployed.');
  
  addSubtitle('Construction Activities');
  addText('• Site Laboratory: The site laboratory will be set up on the client\'s premises.');
  addText('• Site Clearance: The site clearance activities will be initiated.');
  addText('• Cross Drainage: Construction of Slab culvert and Pipe Culvert will be started.');
  
  // ==================== PAGE 25: MEETINGS ====================
  addNewPage();
  addTitle('17. Meetings, Consultations and Coordination', 14);
  yPosition += 5;
  
  addTableRow4('S.N.', 'Date', 'Type of Meeting', 'Key Agenda');
  addHorizontalLine();
  
  const meetings = [
    { date: '18 Jan 2026', type: 'Coordination', agenda: 'Identify underground pipelines' },
    { date: '21 Jan 2026', type: 'Coordination', agenda: 'Identify underground pipelines' },
    { date: '25 Jan 2026', type: 'Coordination', agenda: 'Identify underground pipelines' }
  ];
  
  meetings.forEach((m, index) => {
    addTableRow4(`${index + 1}`, m.date, m.type, m.agenda);
  });
  
  // ==================== PAGE 26-27: OFFICIAL CORRESPONDENCE ====================
  addNewPage();
  addTitle('18. Official Correspondence', 14);
  yPosition += 5;
  
  addTableRow4('S.N.', 'Date', 'Ref. No.', 'Subject');
  addHorizontalLine();
  
  const correspondence = [
    { date: '01-Jan-26', ref: '2082/083-Site-TM-11', subject: 'Submission of Vendor Approval for Cement' },
    { date: '02-Jan-26', ref: '02/TT/SDC-WUC/2026', subject: 'No objection of vendors for OPC cement' },
    { date: '04-Jan-26', ref: '2082/083-Site-TM-12', subject: 'Submission of work schedule with cash flow' },
    { date: '13-Jan-26', ref: '2082/2083-Site-TM-014', subject: 'Re-Submission of Quotation for Environmental Monitoring' },
    { date: '23-Jan-26', ref: '2082/2083-Site-TM-016', subject: 'Submission for vendor approval for Crusher Plant' }
  ];
  
  correspondence.forEach((c, index) => {
    addTableRow4(`${index + 1}`, c.date, c.ref, c.subject.substring(0, 30) + '...');
  });
  
  // ==================== PAGE 28-29: SITE PHOTOGRAPHS ====================
  addNewPage();
  addTitle('19. Site Photographs', 14);
  yPosition += 10;
  
  addText('Survey Work at Pathardanda-Tinau Road', 11, true);
  yPosition += 40;
  addText('Joint Material Sampling work for testing Purpose', 11, true);
  yPosition += 40;
  addText('Joint Survey with Aanandaban-Shankarnagar Khanepani sansthan', 11, true);
  yPosition += 40;
  addText('Joint Survey with Bhulke Khanepani sansthan', 11, true);
  
  // ==================== PAGE 30: ANNEXES ====================
  addNewPage();
  addTitle('20. Annexes', 14);
  yPosition += 10;
  
  addText('Annex I: Project Progress Curve', 12, true);
  yPosition += 10;
  addText('Annex II: Daily Site Reports', 12, true);
  yPosition += 10;
  addText('Annex III: Material Test Records', 12, true);
  yPosition += 10;
  addText('Annex IV: Meeting Minutes and Instructions', 12, true);
  
  // Footer on last page
  yPosition += 20;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Monthly Progress Report - ${reportDate}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  doc.text('Supervision and Design Consultancy (SDC)', pageWidth / 2, pageHeight - 5, { align: 'center' });
  
  // Save the PDF
  const fileName = `MPR_${project.code || 'Report'}_${reportMonth}.pdf`;
  doc.save(fileName);
};

export default generateMPRPDF;

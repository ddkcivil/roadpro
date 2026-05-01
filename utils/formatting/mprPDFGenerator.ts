import jsPDF from 'jspdf';
import { Project, AppSettings, Milestone } from '../../types';
import { formatCurrency } from './currencyUtils';
import { fetchDailyWeatherHistory, fetchMonthlySummary, DailyWeatherRecord, MonthlyWeatherSummary } from '../../services/analytics/weatherService';

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
  const [year, month] = monthStr?.split('-') || [];
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
  settings?: AppSettings,
  reportDetails?: {
    reportNumber: string;
    executiveSummary: string;
    challenges: string;
    workPlanNextMonth: string;
    safetyIncidents: string;
    environmentalCompliance: string;
    socialSafeguards: string;
  }
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
  
  // Table row with 6 columns (for weather)
  const addTableRow6 = (c1: string, c2: string, c3: string, c4: string, c5: string, c6: string) => {
    checkPageBreak(8);
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(c1, margin, yPosition);
    doc.text(c2, margin + 25, yPosition);
    doc.text(c3, margin + 55, yPosition);
    doc.text(c4, margin + 85, yPosition);
    doc.text(c5, margin + 115, yPosition);
    doc.text(c6, margin + 145, yPosition);
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
  
  // Fetch data for the Weather Section
  const [year, month] = (reportMonth?.split('-') || []).map(Number);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const weatherHistory = await fetchDailyWeatherHistory(month, year, project.lat || 27.7172, project.lng || 85.3240);
  const weatherSummary = await fetchMonthlySummary(monthNames[month - 1], project.location || 'Butwal, Nepal');

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
  doc.text(project.clientName || 'Project Implementation Unit,', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;
  doc.text(project.location || 'Tilottama Municipality', pageWidth / 2, yPosition, { align: 'center' });
  
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
  doc.text(`Consultant: ${project.consultantName || 'N/A'}`, pageWidth / 2, yPosition, { align: 'center' });
  
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
    '5. Physical Work Progress',
    '6. Financial Work Progress',
    '7. Project Progress Curve',
    '8. Key Personnel Deployment',
    '9. Equipment Deployment',
    '10. Construction Material Status',
    '11. Weather Record',
    '12. Environmental Management (EMP)',
    '13. Health and Safety (H&SMP)',
    '14. Resettlement Plan (RP)',
    '15. Grievance Redress Mechanism (GRM)',
    '16. Work Plan for Next Month',
    '17. Meetings and Consultations',
    '18. Official Correspondence',
    '19. Site Photographs',
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
  
  addSubtitle('REPORTING INFORMATION');
  addTableRow2('Project Name', project.name || 'N/A');
  addTableRow2('Report Number', reportDetails?.reportNumber || '01');
  addTableRow2('Reporting Month', reportDate);
  
  yPosition += 10;
  addSubtitle('PREPARATION REVIEW AND AUTHORIZATION');
  addTableRow2('Prepared By', project.contractor || 'Contractor');
  addTableRow2('Reviewed By', project.consultantName || 'Consultant');
  addTableRow2('Approved By', project.clientName || 'Employer');
  
  yPosition += 10;
  addSubtitle('EXECUTIVE SUMMARY');
  addText(reportDetails?.executiveSummary || 'The project is progressing according to the schedule. Detailed activities are documented in subsequent sections.', 10);
  
  // ==================== PAGE 4: PROJECT INTRODUCTION ====================
  addNewPage();
  addTitle('1. Project Introduction and Background', 14);
  yPosition += 5;
  
  const overviewText = `This project involves the development of urban infrastructure including road construction, drainage, and pedestrian facilities within ${project.location || 'the project area'}. The project aims to improve resilience and connectivity.

Funding Agency: Asian Development Bank (ADB)
Employer: ${project.clientName || 'N/A'}
Contractor: ${project.contractor || 'N/A'}
Engineer: ${project.consultantName || 'N/A'}`;
  addText(overviewText);
  
  // ==================== PAGE 5: CONTRACT DETAILS ====================
  addNewPage();
  addTitle('2. Contract Details', 14);
  yPosition += 5;
  
  addTableRow2('Contract No.', project.contractNo || 'N/A');
  addTableRow2('Contract Amount', formatMoney(financialSummary.revised, currencyCode));
  addTableRow2('Agreement Date', formatDate(project.startDate || ''));
  addTableRow2('Commencement Date', formatDate(project.startDate || ''));
  addTableRow2('Completion Date', formatDate(project.endDate || ''));
  addTableRow2('Contract Period', project.contractPeriod || '730 days');
  
  // ==================== PAGE 6: MILESTONES & ELAPSED ====================
  addNewPage();
  addTitle('3. Project Milestones', 14);
  yPosition += 5;
  
  doc.setFont('helvetica', 'bold');
  addTableRow4('S.N.', 'Milestone Name', 'Target Date', 'Status');
  addHorizontalLine();
  doc.setFont('helvetica', 'normal');
  
  const milestones = project.milestones && project.milestones.length > 0 ? project.milestones : [];
  if (milestones.length > 0) {
    milestones.forEach((m, i) => {
      addTableRow4(`${i + 1}`, m.name, formatDate(m.date), m.status);
    });
  } else {
    addText('No milestones defined in the system.');
  }
  
  yPosition += 15;
  addTitle('4. Contract Elapsed Period', 14);
  addText(`Total Elapsed Time: ${timeProgress.elapsed} days (${timeProgress.elapsedPercent}%)`, 11, true);
  addText(`Time Remaining: ${timeProgress.remaining} days`, 10);
  
  // ==================== PAGE 7: PROGRESS ====================
  addNewPage();
  addTitle('5. Physical Work Progress', 14);
  yPosition += 5;
  
  doc.setFont('helvetica', 'bold');
  addTableRow4('Item No', 'Description', 'Unit', 'Progress (%)');
  addHorizontalLine();
  doc.setFont('helvetica', 'normal');
  
  project.boq.slice(0, 20).forEach(item => {
    const progress = Math.round((item.completedQuantity / item.quantity) * 100);
    addTableRow4(item.itemNo, item.description.substring(0, 30) + '...', item.unit, `${progress}%`);
  });
  
  addNewPage();
  addTitle('6. Financial Work Progress', 14);
  addTableRow2('Budget Allocated', formatMoney(financialSummary.revised, currencyCode));
  addTableRow2('Certified Value', formatMoney(financialSummary.progressValue, currencyCode));
  addTableRow2('Utilization', `${Math.round((financialSummary.progressValue / financialSummary.revised) * 100)}%`);
  
  // ==================== PAGE 8: RESOURCES ====================
  addNewPage();
  addTitle('8. Key Personnel Deployment', 14);
  addTableRow3('Role', 'Name', 'Status');
  addHorizontalLine();
  
  const staff = [
    { role: 'Project Manager', name: project.projectManager || 'N/A' },
    { role: 'Engineer', name: project.engineer || 'N/A' },
    { role: 'Supervisor', name: project.supervisor || 'N/A' },
    ...(project.personnel || [])
  ];
  
  staff.forEach(s => addTableRow3(s.role, s.name, 'Deployed'));
  
  yPosition += 15;
  addTitle('9. Equipment Deployment', 14);
  addTableRow3('Equipment Type', 'ID/Plate', 'Status');
  addHorizontalLine();
  
  const vehicles = project.vehicles || [];
  if (vehicles.length > 0) {
    vehicles.forEach(v => addTableRow3(v.type, v.plateNumber, v.status));
  } else {
    addText('No active equipment deployment records.');
  }

  // ==================== PAGE 9: WEATHER RECORD ====================
  addNewPage();
  addTitle('11. Weather Record', 14);
  yPosition += 5;
  
  addSubtitle('Monthly Weather Summary');
  addTableRow2('Average High', `${weatherSummary.avgHigh}°C`);
  addTableRow2('Average Low', `${weatherSummary.avgLow}°C`);
  addTableRow2('Total Rainy Days', `${weatherSummary.rainyDays} Days`);
  addTableRow2('Total Rainfall', `${weatherSummary.avgRainfall} mm (Avg)`);
  
  yPosition += 10;
  addSubtitle('Daily Weather Log');
  doc.setFont('helvetica', 'bold');
  addTableRow6('Date', 'Condition', 'Temp (H/L)', 'Rain', 'Wind', 'Workable');
  addHorizontalLine();
  doc.setFont('helvetica', 'normal');
  
  weatherHistory.forEach(day => {
      const datePart = day.date.split('-')[2];
      addTableRow6(
          datePart, 
          day.condition, 
          `${day.tempMax}/${day.tempMin}`, 
          `${day.rainfall}mm`, 
          `${day.windSpeed}kph`,
          day.workable ? 'Yes' : 'No'
      );
  });
  
  // ==================== PAGE 10: SAFEGUARDS & ISSUES ====================
  addNewPage();
  addTitle('12-16. Safeguards, Quality & Challenges', 14);
  
  addSubtitle('Health and Safety');
  addText(`Active NCRs: ${project.ncrs.filter(n => n.status !== 'Closed').length}`, 10);
  addText(`Safety Incidents: ${reportDetails?.safetyIncidents || '0'}`, 10);
  
  addSubtitle('Social Safeguards & GRM');
  addText(reportDetails?.socialSafeguards || 'Grievance redressal committees are active.', 10);
  
  addSubtitle('Major Challenges & Constraints');
  addText(reportDetails?.challenges || 'No major bottlenecks reported.', 10, true);
  
  addSubtitle('Work Plan for Next Month');
  addText(reportDetails?.workPlanNextMonth || 'Continue planned construction activities.', 10);
  
  // ==================== PAGE 11: PHOTOGRAPHS ====================
  if (project.sitePhotos && project.sitePhotos.length > 0) {
    addNewPage();
    addTitle('19. Site Photographs', 14);
    yPosition += 10;
    
    // Note: In a real implementation with jsPDF, adding images from URLs is asynchronous.
    // For this prototype, we'll add text placeholders for the photos.
    project.sitePhotos.slice(0, 6).forEach((photo, i) => {
      addText(`[Photo ${i + 1}] ${photo.caption} (${formatDate(photo.date)})`, 10);
      yPosition += 15;
    });
  }
  
  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount} | Generated for ${project.name}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  // Save the PDF
  const fileName = `MPR_${project.code || 'Report'}_${reportMonth}.pdf`;
  doc.save(fileName);
};

export default generateMPRPDF;

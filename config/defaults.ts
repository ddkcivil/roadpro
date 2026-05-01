import { AppSettings } from '../types';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  companyName: 'RoadMaster Pro',
  currency: 'NPR',
  vatRate: 13,
  fiscalYearStart: '2024-01-01',
  googleSpreadsheetId: '',
  defaultLocation: '27.7006, 83.4484',
  notifications: {
    enableEmail: true,
    enableInApp: true,
    notifyUpcoming: true,
    daysBefore: 7,
    notifyOverdue: true,
    dailyDigest: true,
  },
  theme: 'light',
  compactMode: false,
  minPasswordLength: 8,
  dashboardDefaultView: 'overview',
  dashboardWidgets: [
    { id: 'scurve', title: 'Performance S-Curve', visible: true, position: 0 },
    { id: 'spi', title: 'Schedule Performance (SPI)', visible: true, position: 1 },
    { id: 'cpi', title: 'Cost Performance (CPI)', visible: true, position: 2 },
    { id: 'health', title: 'Project Health Summary', visible: true, position: 3 },
    { id: 'qa-matrix', title: 'Quality Assurance Matrix', visible: true, position: 4 },
    { id: 'distribution', title: 'Work Breakdown', visible: true, position: 5 },
    { id: 'weather', title: 'Site Weather', visible: true, position: 6 },
  ]
};

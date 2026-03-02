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
    { id: 'project-stats', title: 'Project Statistics', visible: true, position: 0 },
    { id: 'recent-activity', title: 'Recent Activity', visible: true, position: 1 },
    { id: 'upcoming-milestones', title: 'Upcoming Milestones', visible: true, position: 2 },
    { id: 'weather-widget', title: 'Weather Forecast', visible: true, position: 3 },
  ]
};

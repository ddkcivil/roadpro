import { useState, startTransition } from 'react';
import { AppSettings } from '../types';
import { toast } from 'sonner';

export const useSettings = () => {
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const savedSettings = localStorage.getItem('roadmaster-settings');
    return savedSettings ? JSON.parse(savedSettings) : {
      companyName: 'RoadMaster Pro',
      currency: 'USD',
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
      }
    };
  });

  const updateSettings = (newSettings: AppSettings) => {
    startTransition(() => {
      setAppSettings(newSettings);
      localStorage.setItem('roadmaster-settings', JSON.stringify(newSettings));
    });
    toast.success("Settings Saved", {
      description: "System-wide configuration has been updated successfully.",
    });
  };

  return {
    appSettings,
    setAppSettings,
    updateSettings
  };
};

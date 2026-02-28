import { useState, startTransition } from 'react';
import { AppSettings } from '../types';
import { toast } from 'sonner';
import { useDebounce } from './useDebounce';

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

  const debouncedSaveSettings = useDebounce((newSettings: AppSettings) => {
    localStorage.setItem('roadmaster-settings', JSON.stringify(newSettings));
  }, 1000);

  const updateSettings = (newSettings: AppSettings) => {
    startTransition(() => {
      setAppSettings(newSettings);
      debouncedSaveSettings(newSettings);
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

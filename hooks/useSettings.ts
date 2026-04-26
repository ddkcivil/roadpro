import { useState, startTransition } from 'react';
import { AppSettings } from '../types';
import { toast } from 'sonner';
import { useDebounce } from './useDebounce';
import { DEFAULT_APP_SETTINGS } from '../config/defaults';

export const useSettings = () => {
  console.log('[useSettings] Hook initialized.');
    const [appSettings, setAppSettings] = useState<AppSettings>(() => {
      const savedSettings = localStorage.getItem('roadmaster-settings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          // Merge with defaults to handle new fields
          return { ...DEFAULT_APP_SETTINGS, ...parsed };
        } catch (e) {
          console.error('Failed to parse settings', e);
        }
      }
      return DEFAULT_APP_SETTINGS;
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

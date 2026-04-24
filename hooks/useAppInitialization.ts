import { useEffect } from 'react';
import { LocalStorageUtils } from '../utils/data/localStorageUtils';
import { sqliteService } from '../services/database/sqliteService';
import { DataSyncService } from '../services/database/dataSyncService';
import { SyncService } from '../services/api/syncService';
import { addSkipLink } from '../utils/accessibility/a11yUtils';

export const useAppInitialization = (setLoadingStatus: (status: string) => void, setSystemReady: (ready: boolean) => void, setIsInitialLoading: (loading: boolean) => void) => {
  useEffect(() => {
    LocalStorageUtils.initializeEmptyData();
    
    const initApp = async () => {
      const loadingTimeout = setTimeout(() => {
        setIsInitialLoading(false);
        console.warn('App initialization timed out, forcing load...');
      }, 8000);

      try {
        setLoadingStatus('Initializing Local Storage...');
        await sqliteService.initialize();
        
        setLoadingStatus('Checking Storage Quota...');
        // Check if we have storage quota available
        try {
          const quotaKey = 'roadmaster-quota-test';
          localStorage.setItem(quotaKey, new Array(1024 * 10).join('0')); // 10KB test
          localStorage.removeItem(quotaKey);
        } catch (quotaErr) {
          console.warn('[AppInit] Storage quota exceeded, skipping heavy sync');
          setLoadingStatus('Storage Optimized - Skipping Heavy Sync');
        }
        
        setLoadingStatus('Ready for Operation');
        setSystemReady(true);
        
        // Background sync - non-blocking
        setTimeout(async () => {
          console.log('[AppInit] Starting background data sync...');
          try {
            await DataSyncService.syncAllToSQLite();
            console.log('[AppInit] Background sync completed successfully');
          } catch (syncErr: any) {
            if (syncErr.name === 'QuotaExceededError' || syncErr.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
              console.warn('[AppInit] Background sync skipped due to quota - using existing data');
            } else {
              console.error('[AppInit] Background sync failed:', syncErr);
            }
          }
        }, 100);
      } catch (err) {
        console.error('Failed to initialize SQLite service:', err);
        setLoadingStatus('Initialization Error - Falling back to Legacy Storage');
        setSystemReady(true);
      } finally {
        clearTimeout(loadingTimeout);
        setTimeout(() => setIsInitialLoading(false), 800);
      }
    };
    
    initApp();
    
    if ('serviceWorker' in navigator) {
      const registerSW = async () => {
        try {
          if (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
            await navigator.serviceWorker.register('/sw.js');
          }
        } catch (error) {
          console.error('SW registration failed: ', error);
        }
      };
      
      if (document.readyState === 'loading') {
        window.addEventListener('load', registerSW);
      } else {
        registerSW();
      }
    }
    
    addSkipLink('#main-content', 'Skip to main content');

    const handleOnline = () => {
      SyncService.processQueue();
    };
    
    window.addEventListener('online', handleOnline);
    if (navigator.onLine) {
      SyncService.processQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);
};

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
        
        setLoadingStatus('Synchronizing Local Core...');
        await DataSyncService.syncAllToSQLite();
        
        setLoadingStatus('Ready for Operation');
        setSystemReady(true);
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

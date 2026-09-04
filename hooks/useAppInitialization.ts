import { useEffect, useRef } from 'react';
import { LocalStorageUtils } from '../utils/data/localStorageUtils';
import { sqliteService } from '../services/database/sqliteService';
import { DataSyncService } from '../services/database/dataSyncService';
import { SyncService } from '../services/api/syncService';
import { addSkipLink } from '../utils/accessibility/a11yUtils';

// Performance: Abort controller for cancelling initialization
let abortController: AbortController | null = null;

export const useAppInitialization = (setLoadingStatus: (status: string) => void, setSystemReady: (ready: boolean) => void, setIsInitialLoading: (loading: boolean) => void) => {
  // Track if already initialized to prevent duplicate work
  const isInitializedRef = useRef(false);
  
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;
    
    LocalStorageUtils.initializeEmptyData();
    
    const initApp = async () => {
      // Performance: Reduced timeout - if initialization takes longer, proceed anyway
      const loadingTimeout = setTimeout(() => {
        console.warn('[AppInit] Initialization timed out, proceeding anyway...');
        setSystemReady(true);
        setIsInitialLoading(false);
      }, 3000); // Reduced from 8s to 3s

      try {
        setLoadingStatus('Initializing Local Storage...');
        
        // Performance: Initialize SQLite with error handling - don't block if it fails
        try {
          await sqliteService.initialize();
        } catch (sqliteErr) {
          console.warn('[AppInit] SQLite init failed, using localStorage fallback:', sqliteErr);
        }
        
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
        
        // Performance: Background sync with proper error handling - don't block UI
        // Use requestIdleCallback if available, otherwise setTimeout
        const scheduleBackgroundSync = () => {
          if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback(() => {
              performBackgroundSync();
            }, { timeout: 5000 });
          } else {
            setTimeout(performBackgroundSync, 1000);
          }
        };
        
        const performBackgroundSync = async () => {
          console.log('[AppInit] Starting background data sync...');
          try {
            await DataSyncService.syncAllToSQLite();
            console.log('[AppInit] Background sync completed successfully');
          } catch (syncErr: any) {
            if (syncErr?.name === 'QuotaExceededError' || syncErr?.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
              console.warn('[AppInit] Background sync skipped due to quota - using existing data');
            } else {
              console.warn('[AppInit] Background sync failed silently:', syncErr);
            }
          }
        };
        
        scheduleBackgroundSync();
      } catch (err) {
        console.error('[AppInit] Critical failure:', err);
        setLoadingStatus('Initialization Error - Falling back to Legacy Storage');
        setSystemReady(true);
      } finally {
        clearTimeout(loadingTimeout);
        // Performance: Faster loading - set false as soon as possible
        setTimeout(() => setIsInitialLoading(false), 300);
      }
    };
    
    initApp();
    
    // Service Worker is only registered in production (built) environments, and any
    // previously-installed SW is actively unregistered during local dev. This prevents a
    // stale SW cache from serving outdated/mixed JS bundles — a known trigger of
    // "Cannot read properties of null (reading 'useState')" invalid-hook errors.
    if ('serviceWorker' in navigator) {
      if (!import.meta.env.DEV) {
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
      } else {
        // Dev only: detach any existing service worker so old cached bundles can't
        // interfere with the live-reloaded app.
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            reg.unregister().then((ok) => {
              if (ok) console.log('[AppInit] Unregistered stale service worker in dev mode.');
            });
          }
        }).catch((e) => console.warn('[AppInit] Failed to unregister service worker in dev:', e));
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

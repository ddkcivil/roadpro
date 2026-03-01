import { useReducer, useCallback, useRef, useEffect, useState, startTransition } from 'react';
import { offlineStorage } from '../services/database/offlineStorage';

/**
 * Enhanced useReducer hook that automatically persists state to a storage engine.
 * Limited to synchronous storage like localStorage.
 */
export function usePersistedReducer<S, A>(
  reducer: (state: S, action: A) => S,
  initialState: S,
  storageKey: string,
  storage: Storage = window.localStorage
): [S, (action: A) => void] {
  
  // Custom initializer to load from storage
  const initializer = (initial: S): S => {
    try {
      const saved = storage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error(`Failed to load state for key "${storageKey}":`, error);
    }
    return initial;
  };

  const [state, dispatch] = useReducer(reducer, initialState, initializer);

  // Sync state to storage whenever it changes
  useEffect(() => {
    try {
      storage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      // Handle QuotaExceededError by failing silently or logging
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn(`Storage quota exceeded for key "${storageKey}". Consider using useAsyncPersistedReducer.`);
      } else {
        console.error(`Failed to persist state for key "${storageKey}":`, error);
      }
    }
  }, [state, storageKey, storage]);

  return [state, dispatch];
}

/**
 * Asynchronous version of usePersistedReducer that uses IndexedDB for large data sets.
 * Prevents QuotaExceededError common with localStorage.
 */
export function useAsyncPersistedReducer<S, A>(
  reducer: (state: S, action: A) => S,
  initialState: S,
  storageKey: string
): [S, (action: A) => void, boolean] {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load state from IndexedDB on mount
  useEffect(() => {
    let isMounted = true;
    async function hydrate() {
      try {
        const saved = await offlineStorage.getItem<S>(storageKey);
        if (saved && isMounted) {
          // We assume the reducer can handle a special 'HYDRATE' action
          // or we just use a local dispatch that the caller provides
          startTransition(() => {
            (dispatch as any)({ type: 'HYDRATE', payload: saved });
          });
        }
      } catch (error) {
        console.error(`Failed to hydrate state for key "${storageKey}":`, error);
      } finally {
        if (isMounted) setIsHydrated(true);
      }
    }
    hydrate();
    return () => { isMounted = false; };
  }, [storageKey]);

  // Save state to IndexedDB whenever it changes, but only after hydration
  useEffect(() => {
    if (isHydrated) {
      offlineStorage.setItem(storageKey, state);
    }
  }, [state, storageKey, isHydrated]);

  return [state, dispatch, isHydrated];
}

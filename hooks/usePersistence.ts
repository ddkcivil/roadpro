import { useReducer, useCallback, useRef, useEffect } from 'react';

/**
 * Enhanced useReducer hook that automatically persists state to a storage engine.
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
      console.error(`Failed to persist state for key "${storageKey}":`, error);
    }
  }, [state, storageKey, storage]);

  return [state, dispatch];
}

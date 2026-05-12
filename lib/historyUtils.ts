
import { useState, useEffect } from 'react';

const MAX_HISTORY_SIZE = 50; // Limit history to prevent localStorage bloat

/**
 * Safely parses JSON from localStorage, returning a default value if parsing fails or key is not found.
 * @param key The localStorage key.
 * @param defaultValue The value to return if parsing fails or key is not found.
 * @returns The parsed JSON value or the defaultValue.
 */
function safeJsonParse(key: string, defaultValue: any[]): any[] {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    const parsed = JSON.parse(item);
    // Ensure it's an array, otherwise return default
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch (e) {
    console.error(`Failed to parse localStorage key "${key}":`, e);
    return defaultValue;
  }
}

/**
 * Saves an entry to localStorage, ensuring uniqueness and maintaining a maximum history size.
 * @param key The localStorage key to store the history under.
 * @param entry The new entry to add.
 */
export function saveHistoryEntry(key: string, entry: string): void {
  const history = safeJsonParse(key, []);
  
  // Prevent adding empty or identical consecutive entries
  if (!entry.trim() || (history.length > 0 && history[0] === entry)) {
    return;
  }

  // Add new entry to the beginning of the array
  const newHistory = [entry, ...history];

  // Trim history to max size
  const trimmedHistory = newHistory.slice(0, MAX_HISTORY_SIZE);

  try {
    localStorage.setItem(key, JSON.stringify(trimmedHistory));
  } catch (e) {
    console.error(`Failed to save to localStorage key "${key}":`, e);
    // Handle potential quota exceeded errors if necessary
  }
}

/**
 * Retrieves history entries from localStorage for a given key.
 * @param key The localStorage key.
 * @returns An array of history entries.
 */
export function getHistoryEntries(key: string): string[] {
  return safeJsonParse(key, []);
}

/**
 * Filters history entries based on a search term, returning suggestions.
 * @param key The localStorage key.
 * @param searchTerm The term to filter history by.
 * @returns An array of matching history entries.
 */
export function getHistorySuggestions(key: string, searchTerm: string): string[] {
  const history = getHistoryEntries(key);
  if (!searchTerm.trim()) {
    return history; // Return all history if search term is empty
  }
  const lowerCaseSearchTerm = searchTerm.toLowerCase();
  return history.filter(entry => entry.toLowerCase().includes(lowerCaseSearchTerm));
}

/**
 * Custom hook to manage history auto-fill for a given input field.
 * @param key A unique key for this history (e.g., 'userEmails', 'documentSubjects').
 * @returns An object containing the current history, suggestions, and a function to save an entry.
 */
export function useHistoryAutoFill(key: string) {
  const [history, setHistory] = useState<string[]>(() => getHistoryEntries(key));
  const [suggestions, setSuggestions] = useState<string[]>(history);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Initialize history from localStorage when component mounts
    setHistory(getHistoryEntries(key));
    setSuggestions(getHistoryEntries(key)); // Initialize suggestions as well
  }, [key]);

  const saveEntry = (entry: string) => {
    saveHistoryEntry(key, entry);
    // Update state to reflect the new entry
    setHistory(getHistoryEntries(key));
    setSuggestions(getHistoryEntries(key)); // Re-apply suggestions filter if needed
  };

  const updateSuggestions = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setSuggestions(getHistoryEntries(key)); // Show all history if input is cleared
    } else {
      setSuggestions(getHistorySuggestions(key, term));
    }
  };

  return {
    history,
    suggestions,
    searchTerm,
    updateSuggestions,
    saveEntry
  };
}

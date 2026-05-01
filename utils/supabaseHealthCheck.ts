/**
 * Supabase connection diagnostic utility
 */

import { supabase } from '../lib/supabase';

export interface SupabaseHealthCheck {
  isConnected: boolean;
  url?: string;
  error?: string;
  details: {
    hasClient: boolean;
    hasUrl: boolean;
    hasKey: boolean;
  };
}

/**
 * Checks if the Supabase connection is working
 */
export async function checkSupabaseHealth(): Promise<SupabaseHealthCheck> {
  try {
    // Check if client exists
    if (!supabase) {
      return {
        isConnected: false,
        error: 'Supabase client not initialized',
        details: { hasClient: false, hasUrl: false, hasKey: false },
      };
    }

    // Attempt a simple query to test connection
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (error) {
      // Network errors
      if (error.message?.includes('Failed to fetch')) {
        return {
          isConnected: false,
          error: 'Network error - Cannot reach Supabase service',
          details: { hasClient: true, hasUrl: true, hasKey: true },
        };
      }

      // Auth errors
      if (error.message?.includes('401') || error.message?.includes('403')) {
        return {
          isConnected: false,
          error: 'Authentication error - Invalid credentials',
          details: { hasClient: true, hasUrl: true, hasKey: true },
        };
      }

      return {
        isConnected: false,
        error: error.message || 'Unknown Supabase error',
        details: { hasClient: true, hasUrl: true, hasKey: true },
      };
    }

    return {
      isConnected: true,
      error: undefined,
      details: { hasClient: true, hasUrl: true, hasKey: true },
    };
  } catch (err: any) {
    return {
      isConnected: false,
      error: err.message || 'Failed to check Supabase health',
      details: { hasClient: true, hasUrl: true, hasKey: true },
    };
  }
}

/**
 * Checks if it's a network-related error
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;

  const msg = error.message?.toLowerCase() || '';
  return (
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('internet') ||
    msg.includes('timeout') ||
    msg.includes('connection refused') ||
    msg.includes('econnrefused') ||
    error.status >= 500 ||
    error.status === 0 // Network error has status 0
  );
}

/**
 * Gets a human-readable error message for Supabase errors
 */
export function getSupabaseErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred';

  const msg = error.message?.toLowerCase() || '';

  if (msg.includes('failed to fetch')) {
    return 'Network connection failed. Please check your internet connection.';
  }
  if (msg.includes('401') || msg.includes('unauthorized')) {
    return 'Authentication failed. Please log in again.';
  }
  if (msg.includes('403') || msg.includes('forbidden')) {
    return 'You do not have permission to perform this action.';
  }
  if (msg.includes('404') || msg.includes('not found')) {
    return 'The requested resource was not found.';
  }
  if (msg.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }
  if (error.status >= 500) {
    return 'Server error. Please try again later.';
  }

  return error.message || 'An error occurred while accessing the database.';
}

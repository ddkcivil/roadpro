/**
 * Authentication Hook
 * Handles user login, logout, and persistent session management using Supabase.
 */
import { useState, useEffect, useMemo, startTransition, useCallback } from 'react';
import { UserRole, User, UserWithPermissions } from '../types';
import { PermissionsService } from '../services/auth/permissionsService';
import { AuditService } from '../services/analytics/auditService';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

const AUTH_TOKEN_KEY = 'roadmaster-token';
const AUTH_REFRESH_KEY = 'roadmaster-refresh-token';
const AUTH_USER_KEY = 'roadmaster-user';
// Backup storage keys for redundancy
const SESSION_TOKEN_KEY = 'roadmaster-token-session';
const COOKIE_TOKEN_KEY = 'roadmaster-access';
// Performance: Auth timeout in ms
const AUTH_TIMEOUT_MS = 3000;

// Helper: write a cookie so the server middleware (withAuth) can read it on every API request
const setTokenCookie = (token: string) => {
  try {
    document.cookie = `${COOKIE_TOKEN_KEY}=${encodeURIComponent(token)}; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`;
  } catch {
    // defensive: ignore if document is not available (e.g. SSR)
  }
};

const clearTokenCookie = () => {
  try {
    document.cookie = `${COOKIE_TOKEN_KEY}=; Path=/; SameSite=Lax; Max-Age=0`;
  } catch {
    // noop
  }
};

// Helper: Store token with redundancy - localStorage + sessionStorage as backup
const storeToken = (token: string, refreshToken?: string) => {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    console.log('[useAuth] ✓ Token stored in localStorage');
  } catch (e) {
    console.warn('[useAuth] ⚠ Failed to store token in localStorage:', e);
  }
  try {
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    console.log('[useAuth] ✓ Token stored in sessionStorage (backup)');
  } catch (e) {
    console.warn('[useAuth] ⚠ Failed to store token in sessionStorage:', e);
  }
  // Store refresh token separately for token refresh flow
  if (refreshToken) {
    try {
      localStorage.setItem(AUTH_REFRESH_KEY, refreshToken);
      console.log('[useAuth] ✓ Refresh token stored in localStorage');
    } catch (e) {
      console.warn('[useAuth] ⚠ Failed to store refresh token:', e);
    }
  }
};

// Helper: Retrieve token with redundancy
const getStoredToken = (): string | null => {
  let token = null;
  
  // 1. Try localStorage
  try {
    token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      console.log('[useAuth] ✓ Token retrieved from localStorage');
      return token;
    }
  } catch (e) {
    console.warn('[useAuth] ⚠ Error reading from localStorage:', e);
  }
  
  // 2. Fall back to sessionStorage
  try {
    token = sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (token) {
      console.log('[useAuth] ✓ Token retrieved from sessionStorage (backup)');
      // Sync back to localStorage
      try {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        console.log('[useAuth] ✓ Token synced from sessionStorage to localStorage');
      } catch (e) {
        console.warn('[useAuth] ⚠ Failed to sync token to localStorage:', e);
      }
      return token;
    }
  } catch (e) {
    console.warn('[useAuth] ⚠ Error reading from sessionStorage:', e);
  }
  
  // 3. Fall back to cookie
  if (typeof document !== 'undefined' && document.cookie) {
    const match = document.cookie.match(/roadmaster-access=([^;]+)/);
    if (match) {
      token = decodeURIComponent(match[1]);
      if (token) {
        console.log('[useAuth] ✓ Token retrieved from cookie');
        // Try to store in localStorage for future use
        storeToken(token);
        return token;
      }
    }
  }
  
  console.log('[useAuth] ⚠ No token found in any storage');
  return null;
};

// Helper: Clear all token storage
const clearAllTokenStorage = () => {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_REFRESH_KEY);
    localStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    console.log('[useAuth] ✓ Token cleared from all storage');
  } catch (e) {
    console.warn('[useAuth] ⚠ Error clearing token storage:', e);
  }
};

export const useAuth = () => {
  console.log('[useAuth] Hook initialized.');
  const [token, setToken] = useState<string | null>(() => {
    // Use the multi-source helper on init
    return getStoredToken();
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      const storedUser = localStorage.getItem(AUTH_USER_KEY);

      console.log('[useAuth] initializeAuth:', {
        hasStoredToken: !!storedToken,
        tokenLength: storedToken?.length || 0,
        hasStoredUser: !!storedUser,
        timestamp: new Date().toISOString()
      });

      // Performance: Optimistic auth restore - immediately set auth state from localStorage
      // This makes the app feel faster by not waiting for network
      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          // Optimistic: Set auth state immediately (don't wait for Supabase)
          setToken(storedToken);
          setUser(parsedUser);
          setIsAuthenticated(true);
          
          console.log('[useAuth] ✓ Auth restored (optimistic):', parsedUser?.full_name);
        } catch (e) {
          console.error('[useAuth] ⚠ Failed to parse stored user:', e);
        }
      } else {
        console.log('[useAuth] No stored credentials found');
      }
      
      // Non-blocking: Try to sync with Supabase in background with timeout
      const syncWithSupabase = async () => {
        try {
          // Performance: Wrap Supabase call in timeout
          const syncPromise = supabase.auth.getSession();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Auth timeout')), AUTH_TIMEOUT_MS)
          );
          
          const { data: { session } } = await Promise.race([syncPromise, timeoutPromise]) as any;
          
          if (!session || session?.access_token !== storedToken) {
            try {
              await supabase.auth.setSession({
                access_token: storedToken,
                refresh_token: ''
              });
              console.log('[useAuth] ✓ Supabase session synchronized');
            } catch (setSessionErr) {
              console.warn('[useAuth] ⚠ Session sync failed:', setSessionErr);
            }
          }
        } catch (syncErr: any) {
          // Non-critical: Don't block UI if Supabase sync fails
          console.warn('[useAuth] ⚠ Supabase sync failed (non-blocking):', syncErr?.message || syncErr);
        } finally {
          setLoading(false);
        }
      };
      
      // Fire and forget - don't await
      syncWithSupabase();
      
      // Performance: Also set loading to false after timeout as fallback
      setTimeout(() => {
        if (loading) {
          console.log('[useAuth] Forcing loading=false after timeout');
          setLoading(false);
        }
      }, AUTH_TIMEOUT_MS + 500);
    };

    initializeAuth();
  }, []);

// clearAuthState must be defined BEFORE logout since logout references it
  const clearAuthState = useCallback(() => {
    startTransition(() => {
      // Clear all token storage (localStorage + sessionStorage)
      clearAllTokenStorage();
      localStorage.removeItem(AUTH_USER_KEY);
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      clearTokenCookie();
      
      // Clear Supabase session
      supabase.auth.signOut();
    });
  }, []);

const login = useCallback(async (role: UserRole, name: string, token?: string, userId?: string, phone?: string, refreshToken?: string) => {
    console.log('[useAuth] login called:', { role, name, hasToken: !!token, userId, hasRefreshToken: !!refreshToken, timestamp: new Date().toISOString() });
    
    if (token) {
      // Store token with redundancy (localStorage + sessionStorage) + refresh token
      storeToken(token, refreshToken);
      setToken(token);
      setTokenCookie(token);
      
      // Try to set Supabase session, but don't block login on failure
      try {
        await supabase.auth.setSession({
          access_token: token,
          refresh_token: refreshToken || ''
        });
        console.log('[useAuth] ✓ Supabase session synchronized');
      } catch (setSessionErr) {
        console.warn('[useAuth] ⚠ Supabase session sync failed (non-blocking):', setSessionErr);
      }
      
      console.log('[useAuth] ✓ Login complete - token stored with redundancy, length:', token.length);
    } else {
      console.warn('[useAuth] ⚠ No token provided to login!');
    }

    const userData = {
      id: userId,
      full_name: name,
      role: role,
      phone: phone,
    };

    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
    setLoading(false);
    
    console.log('[useAuth] ✓ login complete, isAuthenticated:', true);
  }, []);

  const logout = useCallback(async (selectedProjectId?: string | any, projectName?: string) => {
    const actualProjectId = typeof selectedProjectId === 'string' ? selectedProjectId : undefined;
    const actualProjectName = typeof selectedProjectId === 'string' ? projectName : undefined;

    try {
      await AuditService.logLogout(user?.id || 'unknown', user?.full_name || 'unknown', actualProjectId, actualProjectName);
      
      // Call logout API to clear cookies if any
      await fetch('/api/auth?action=logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout API failed:', e);
    }
    
    clearAuthState();
    toast.success("Logged out successfully");
  }, [user, clearAuthState]);

  const currentUser = useMemo(() => {
    const u: User = {
      id: user?.id || 'guest',
      name: user?.full_name || 'Guest',
      email: user?.email || '',
      phone: user?.phone || '',
      role: (user?.role || UserRole.SITE_ENGINEER) as UserRole,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=random`
    };
    
    return PermissionsService.createUserWithPermissions(u);
  }, [user]);

  return {
    isAuthenticated,
    userRole: (user?.role || UserRole.SITE_ENGINEER) as UserRole,
    userName: user?.full_name || '',
    currentUserId: user?.id || '',
    currentUser,
    loading,
    token,
    login,
    logout
  };
};


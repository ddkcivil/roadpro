/**
 * Authentication Hook
 * Handles user login, logout, and persistent session management using custom MongoDB Auth.
 */
import { useState, useEffect, useMemo, startTransition } from 'react';
import { UserRole, User, UserWithPermissions } from '../types';
import { PermissionsService } from '../services/auth/permissionsService';
import { AuditService } from '../services/analytics/auditService';
import { toast } from 'sonner';

const AUTH_TOKEN_KEY = 'roadmaster-token';
const AUTH_USER_KEY = 'roadmaster-user';

export const useAuth = () => {
  console.log('[useAuth] Hook initialized.');
  const [token, setToken] = useState<string | null>(localStorage.getItem(AUTH_TOKEN_KEY));
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      const storedUser = localStorage.getItem(AUTH_USER_KEY);

      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);
          setIsAuthenticated(true);
        } catch (e) {
          console.error('Failed to parse stored user', e);
          clearAuthState();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (role: UserRole, name: string, token?: string, userId?: string, phone?: string) => {
    // This is now called after a successful /api/auth?action=login call
    // Removed startTransition to potentially resolve hook-related crashes during login
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      setToken(token);
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
  };

  const logout = async (selectedProjectId?: string | any, projectName?: string) => {
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
  };

  const clearAuthState = () => {
    startTransition(() => {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
    });
  };

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


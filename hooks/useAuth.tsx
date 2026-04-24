/**
 * Authentication Hook
 * Handles user login, logout, and persistent session management using Supabase.
 */
import { useState, useEffect, useMemo, startTransition } from 'react';
import { UserRole, User, UserWithPermissions } from '../types';
import { PermissionsService } from '../services/auth/permissionsService';
import { AuditService } from '../services/analytics/auditService';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export const useAuth = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.SITE_ENGINEER);
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Sync profile data from Supabase 'profiles' table
  const fetchProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('[Auth] Could not fetch profile:', error.message);
        return null;
      }
      return profile;
    } catch (err) {
      console.error('[Auth] Profile fetch error:', err);
      return null;
    }
  };

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: import('@supabase/supabase-js').Session | null } }) => {
      setSession(session);
      if (session) {
        updateAuthState(session);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: string, session: import('@supabase/supabase-js').Session | null) => {
      console.log(`[Auth] Event: ${_event}`);
      setSession(session);
      if (session) {
        await updateAuthState(session);
      } else {
        clearAuthState();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const updateAuthState = async (session: any) => {
    const user = session.user;
    setIsAuthenticated(true);
    setCurrentUserId(user.id);
    
    // Attempt to get more info from profile table
    const profile = await fetchProfile(user.id);
    
    startTransition(() => {
      const normalizeRole = (role: string | undefined): UserRole => {
        if (!role) return UserRole.SITE_ENGINEER;
        const r = role.toLowerCase();
        if (r === 'admin') return UserRole.ADMIN;
        if (r === 'manager' || r === 'project manager' || r === 'project_manager') return UserRole.PROJECT_MANAGER;
        if (r === 'engineer' || r === 'site engineer' || r === 'site_engineer') return UserRole.SITE_ENGINEER;
        if (r === 'technician' || r === 'lab technician' || r === 'lab_technician') return UserRole.LAB_TECHNICIAN;
        if (r === 'hse' || r === 'hse officer' || r === 'hse_officer') return UserRole.HSE_OFFICER;
        if (r === 'subcontractor') return UserRole.SUBCONTRACTOR;
        if (r === 'supervisor') return UserRole.SUPERVISOR;
        return role as UserRole;
      };

      if (profile) {
        setUserRole(normalizeRole(profile.role));
        setUserName(profile.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User');
        setUserPhone(user.user_metadata?.phone || '');
      } else {
        // Fallback to metadata
        setUserRole(normalizeRole(user.user_metadata?.role));
        setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'User');
        setUserPhone(user.user_metadata?.phone || '');
      }
      setLoading(false);
    });
  };

  const clearAuthState = () => {
    startTransition(() => {
      setIsAuthenticated(false);
      setUserRole(UserRole.SITE_ENGINEER);
      setUserName('');
      setCurrentUserId('');
      setUserPhone('');
      setLoading(false);
    });
  };

  const currentUser = useMemo(() => {
    const user: User = {
      id: currentUserId || 'guest',
      name: userName || 'Guest',
      email: session?.user?.email || '',
      phone: userPhone || '',
      role: userRole,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || 'User')}&background=random`
    };
    
    return PermissionsService.createUserWithPermissions(user);
  }, [currentUserId, userName, userPhone, userRole, session]);

  const login = async (role: UserRole, name: string, _token?: string, userId?: string, phone?: string) => {
    // Legacy support for manual login updates if needed, 
    // but primarily session is managed by onAuthStateChange
    startTransition(() => {
      setUserRole(role);
      setUserName(name);
      if (userId) setCurrentUserId(userId);
      if (phone) setUserPhone(phone);
      setIsAuthenticated(true);
    });
  };

  const logout = async (selectedProjectId?: string | any, projectName?: string) => {
    const actualProjectId = typeof selectedProjectId === 'string' ? selectedProjectId : undefined;
    const actualProjectName = typeof selectedProjectId === 'string' ? projectName : undefined;

    try {
      await AuditService.logLogout(currentUserId || 'unknown', userName || 'unknown', actualProjectId, actualProjectName);
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Logout failed:', e);
    }
    
    clearAuthState();
    toast.success("Logged out successfully");
  };

  return {
    isAuthenticated,
    userRole,
    userName,
    currentUserId,
    currentUser,
    loading,
    session,
    login,
    logout
  };
};

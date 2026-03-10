import { useState, useEffect, useMemo, startTransition } from 'react';
import { UserRole, User, UserWithPermissions } from '../types';
import { PermissionsService } from '../services/auth/permissionsService';
import { AuditService } from '../services/analytics/auditService';
import { encryptionUtils } from '../utils/data/encryptionUtils';
import { LocalStorageUtils } from '../utils/data/localStorageUtils';

export const useAuth = () => {
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem('roadmaster-user-role') as UserRole) || UserRole.SITE_ENGINEER;
  });
  
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('roadmaster-user-name') || '';
  });
  
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return localStorage.getItem('roadmaster-current-user-id') || '';
  });

  const [token, setToken] = useState<string>(() => {
    const encryptedToken = localStorage.getItem('roadmaster-token');
    if (!encryptedToken) return '';
    try {
      const decrypted = encryptionUtils.decrypt<string>(encryptedToken);
      return typeof decrypted === 'string' ? decrypted : '';
    } catch (e) {
      console.error('Initial token decryption failed:', e);
      return '';
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const auth = localStorage.getItem('roadmaster-authenticated') === 'true';
    const encryptedToken = localStorage.getItem('roadmaster-token');
    
    if (!auth || !encryptedToken) return false;
    
    try {
      const decrypted = encryptionUtils.decrypt<string>(encryptedToken);
      return typeof decrypted === 'string' && decrypted.length > 0;
    } catch (e) {
      return false;
    }
  });

  // Debug effect to track authentication state changes
  useEffect(() => {
    const handleAuthFailure = () => {
      console.warn('Persistent auth failure detected via event. Logging out.');
      setIsAuthenticated(false);
    };

    window.addEventListener('roadmaster-auth-failure', handleAuthFailure);

    // Only trigger inconsistent state logout if we are actually supposed to be authenticated
    if (isAuthenticated && localStorage.getItem('roadmaster-authenticated') === 'true' && !token) {
      const encryptedToken = localStorage.getItem('roadmaster-token');
      if (encryptedToken) {
        // Try one last time to decrypt before giving up
        try {
          const decrypted = encryptionUtils.decrypt<string>(encryptedToken);
          if (decrypted) {
            setToken(decrypted);
            return;
          }
        } catch (e) {}
      }
      
      console.warn('Inconsistent auth state detected: Authenticated but no token. Resetting.');
      logout();
    }

    return () => {
      window.removeEventListener('roadmaster-auth-failure', handleAuthFailure);
    };
  }, [isAuthenticated, token]);

  const currentUser = useMemo(() => {
    // Get users from LocalStorageUtils
    const users = LocalStorageUtils.getUsers();
    
    // Find user by ID or use a default user
    let user = users.find((u: User) => u.id === currentUserId);
    if (!user && users.length > 0) {
      user = users[0]; // Use first user as fallback
    }
    
    // If no user found, create a default user
    if (!user) {
      user = {
        id: currentUserId || 'admin-001',
        name: userName || 'User',
        email: 'user@roadmaster.os',
        role: userRole || UserRole.SITE_ENGINEER,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || 'User')}&background=random`
      };
    }
    
    return PermissionsService.createUserWithPermissions(user);
  }, [currentUserId, userName, userRole]);

  const login = (role: UserRole, name: string, userToken?: string, userId?: string) => {
    startTransition(() => {
      setUserRole(role);
      setUserName(name);
      
      try {
        // Save authentication state to localStorage
        localStorage.setItem('roadmaster-authenticated', 'true');
        localStorage.setItem('roadmaster-user-role', role);
        localStorage.setItem('roadmaster-user-name', name);
        
        if (userToken) {
          setToken(userToken);
          const encryptedToken = encryptionUtils.encrypt(userToken);
          localStorage.setItem('roadmaster-token', encryptedToken);
        }

        if (userId) {
          setCurrentUserId(userId);
          localStorage.setItem('roadmaster-current-user-id', userId);
        }

        setIsAuthenticated(true);
      } catch (error) {
        if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
          console.error('LocalStorage quota exceeded during login. Performing emergency cleanup...');
          LocalStorageUtils.emergencyCleanup();
          
          // Try again after cleanup
          try {
            localStorage.setItem('roadmaster-authenticated', 'true');
            localStorage.setItem('roadmaster-user-role', role);
            if (userToken) {
              const encryptedToken = encryptionUtils.encrypt(userToken);
              localStorage.setItem('roadmaster-token', encryptedToken);
            }
            setIsAuthenticated(true);
          } catch (retryError) {
            console.error('Failed to save auth state even after cleanup', retryError);
            toast.error("Storage is full. Please clear your browser cache.");
          }
        }
      }
    });
  };

  const logout = async (selectedProjectId?: string | any, projectName?: string) => {
    // Check if called as an event handler
    const actualProjectId = typeof selectedProjectId === 'string' ? selectedProjectId : undefined;
    const actualProjectName = typeof selectedProjectId === 'string' ? projectName : undefined;

    try {
      await AuditService.logLogout(currentUserId || 'unknown', userName || 'unknown', actualProjectId, actualProjectName);
    } catch (e) {
      console.error('Failed to log logout:', e);
    }

    setIsAuthenticated(false);
    setUserRole(UserRole.SITE_ENGINEER);
    setUserName('');
    setCurrentUserId('');
    setToken('');
    
    const keysToRemove = [
      'roadmaster-authenticated',
      'roadmaster-user-role',
      'roadmaster-user-name',
      'roadmaster-current-user-id',
      'roadmaster-token',
      'roadmaster-csrf-token'
    ];
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {}
    });
  };

  return {
    isAuthenticated,
    userRole,
    userName,
    currentUserId,
    currentUser,
    login,
    logout
  };
};

import { useState, useEffect, useMemo, startTransition } from 'react';
import { UserRole, User, UserWithPermissions } from '../types';
import { PermissionsService } from '../services/auth/permissionsService';
import { AuditService } from '../services/analytics/auditService';
import { encryptionUtils } from '../utils/data/encryptionUtils';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('roadmaster-authenticated') === 'true';
  });
  
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem('roadmaster-user-role') as UserRole) || UserRole.SITE_ENGINEER;
  });
  
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('roadmaster-user-name') || '';
  });
  
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return localStorage.getItem('roadmaster-current-user-id') || '';
  });

  const [token, setToken] = useState(() => {
    const encryptedToken = localStorage.getItem('roadmaster-token');
    if (!encryptedToken) return '';
    return encryptionUtils.decrypt<string>(encryptedToken) || '';
  });

  // Debug effect to track authentication state changes
  useEffect(() => {
    console.log('Authentication state changed:', {
      isAuthenticated,
      userRole,
      userName,
      currentUserId,
      hasToken: !!token
    });
  }, [isAuthenticated, userRole, userName, currentUserId, token]);

  const currentUser = useMemo(() => {
    // Get users from localStorage, fallback to empty array
    const savedUsers = localStorage.getItem('roadmaster-users');
    let users: User[] = savedUsers ? JSON.parse(savedUsers) : [];

    // Initialize with empty array if no data exists
    if (!savedUsers) {
      users = [];
      localStorage.setItem('roadmaster-users', JSON.stringify(users));
    }
    
    // Find user by ID or use a default user
    let user = users.find((u: User) => u.id === currentUserId);
    if (!user && users.length > 0) {
      user = users[0]; // Use first user as fallback
    }
    
    // If no user found, create a default user
    if (!user) {
      user = {
        id: currentUserId || 'admin-001',
        name: 'Dharma Dhoj Kunwar',
        email: 'dharmadkunwar20@gmail.com',
        phone: '9779802877286',
        role: UserRole.ADMIN,
        avatar: 'https://ui-avatars.com/api/?name=Dharma+Kunwar&background=random'
      };
    }
    
    return PermissionsService.createUserWithPermissions(user);
  }, [currentUserId]);

  const login = (role: UserRole, name: string, userToken?: string, userId?: string) => {
    startTransition(() => {
      setIsAuthenticated(true);
      setUserRole(role);
      setUserName(name);
      
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
      } else {
        // Fallback for mock login
        // Get users from localStorage
        const savedUsers = localStorage.getItem('roadmaster-users');
        let users: User[] = savedUsers ? JSON.parse(savedUsers) : [];

        let fallbackUserId = 'u2'; 
        
        if ((role as any) === UserRole.ADMIN) {
          const adminUser = users.find((u: User) => (u.role as any) === UserRole.ADMIN);
          fallbackUserId = adminUser ? adminUser.id : 'admin-001';
        } else {
          fallbackUserId = users.find((u: User) => (u.role as any) === role)?.id || fallbackUserId;
        }
        
        setCurrentUserId(fallbackUserId);
        localStorage.setItem('roadmaster-current-user-id', fallbackUserId);
      }
    });
  };

  const logout = (selectedProjectId?: string | any, projectName?: string) => {
    // Check if called as an event handler
    const actualProjectId = typeof selectedProjectId === 'string' ? selectedProjectId : undefined;
    const actualProjectName = typeof selectedProjectId === 'string' ? projectName : undefined;
    
    AuditService.logLogout(currentUser.id, currentUser.name, actualProjectId, actualProjectName);
    setIsAuthenticated(false);
    setUserRole(UserRole.PROJECT_MANAGER);
    setUserName('');
    setCurrentUserId('u2');
    setToken('');
    localStorage.removeItem('roadmaster-authenticated');
    localStorage.removeItem('roadmaster-user-role');
    localStorage.removeItem('roadmaster-user-name');
    localStorage.removeItem('roadmaster-current-user-id');
    localStorage.removeItem('roadmaster-token');
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

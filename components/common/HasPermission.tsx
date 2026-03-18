import React from 'react';
import { Permission } from '../../types';
import { useAuth } from '../../hooks/useAuth.tsx';
import { PermissionsService } from '../../services/auth/permissionsService';

interface HasPermissionProps {
  permission?: Permission;
  anyPermission?: Permission[];
  allPermissions?: Permission[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component for granular role-based access control (RBAC) in the UI.
 * 
 * Usage:
 * <HasPermission permission={Permission.PROJECT_CREATE}>
 *   <Button>Create Project</Button>
 * </HasPermission>
 */
export const HasPermission: React.FC<HasPermissionProps> = ({ 
  permission, 
  anyPermission, 
  allPermissions, 
  children, 
  fallback = null 
}) => {
  const { currentUser } = useAuth();

  if (!currentUser) return <>{fallback}</>;

  let hasAccess = false;

  if (permission) {
    hasAccess = PermissionsService.hasPermission(currentUser, permission);
  } else if (anyPermission) {
    hasAccess = PermissionsService.hasAnyPermission(currentUser, anyPermission);
  } else if (allPermissions) {
    hasAccess = PermissionsService.hasAllPermissions(currentUser, allPermissions);
  } else {
    // If no permission specified, allow access (or could default to false)
    hasAccess = true;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

import { UserRole, Permission, RolePermissions, UserWithPermissions } from '../types';

/**
 * Service for handling role-based access control (RBAC) permissions
 */
export class PermissionsService {
  /**
   * Default permissions mapping for each role
   */
  private static readonly DEFAULT_ROLE_PERMISSIONS: RolePermissions[] = [
    {
      role: UserRole.ADMIN,
      permissions: [
        Permission.PROJECT_CREATE,
        Permission.PROJECT_READ,
        Permission.PROJECT_UPDATE,
        Permission.PROJECT_DELETE,
        Permission.USER_CREATE,
        Permission.USER_READ,
        Permission.USER_UPDATE,
        Permission.USER_DELETE,
        Permission.SCHEDULE_CREATE,
        Permission.SCHEDULE_READ,
        Permission.SCHEDULE_UPDATE,
        Permission.SCHEDULE_DELETE,
        Permission.BOQ_CREATE,
        Permission.BOQ_READ,
        Permission.BOQ_UPDATE,
        Permission.BOQ_DELETE,
        Permission.RFI_CREATE,
        Permission.RFI_READ,
        Permission.RFI_UPDATE,
        Permission.RFI_DELETE,
        Permission.DOCUMENT_CREATE,
        Permission.DOCUMENT_READ,
        Permission.DOCUMENT_UPDATE,
        Permission.DOCUMENT_DELETE,
        Permission.REPORT_CREATE,
        Permission.REPORT_READ,
        Permission.REPORT_UPDATE,
        Permission.REPORT_DELETE,
        Permission.FINANCE_CREATE,
        Permission.FINANCE_READ,
        Permission.FINANCE_UPDATE,
        Permission.FINANCE_DELETE,
        Permission.SETTINGS_UPDATE,
        Permission.BACKUP_MANAGE,
      ]
    },
    {
      role: UserRole.PROJECT_MANAGER,
      permissions: [
        Permission.PROJECT_CREATE,
        Permission.PROJECT_READ,
        Permission.PROJECT_UPDATE,
        Permission.USER_READ,
        Permission.SCHEDULE_CREATE,
        Permission.SCHEDULE_READ,
        Permission.SCHEDULE_UPDATE,
        Permission.SCHEDULE_DELETE,
        Permission.BOQ_CREATE,
        Permission.BOQ_READ,
        Permission.BOQ_UPDATE,
        Permission.BOQ_DELETE,
        Permission.RFI_CREATE,
        Permission.RFI_READ,
        Permission.RFI_UPDATE,
        Permission.RFI_DELETE,
        Permission.DOCUMENT_CREATE,
        Permission.DOCUMENT_READ,
        Permission.DOCUMENT_UPDATE,
        Permission.DOCUMENT_DELETE,
        Permission.REPORT_CREATE,
        Permission.REPORT_READ,
        Permission.REPORT_UPDATE,
        Permission.REPORT_DELETE,
        Permission.FINANCE_READ,
        Permission.FINANCE_UPDATE,
      ]
    },
    {
      role: UserRole.SITE_ENGINEER,
      permissions: [
        Permission.PROJECT_READ,
        Permission.SCHEDULE_READ,
        Permission.SCHEDULE_UPDATE,
        Permission.BOQ_READ,
        Permission.RFI_CREATE,
        Permission.RFI_READ,
        Permission.DOCUMENT_CREATE,
        Permission.DOCUMENT_READ,
        Permission.REPORT_CREATE,
        Permission.REPORT_READ,
      ]
    },
    {
      role: UserRole.LAB_TECHNICIAN,
      permissions: [
        Permission.PROJECT_READ,
        Permission.DOCUMENT_READ,
        Permission.REPORT_READ,
      ]
    },
    {
      role: UserRole.CONTRACTOR,
      permissions: [
        Permission.PROJECT_READ,
        Permission.SCHEDULE_READ,
        Permission.BOQ_READ,
        Permission.DOCUMENT_READ,
        Permission.REPORT_READ,
      ]
    },
    {
      role: UserRole.SUBCONTRACTOR,
      permissions: [
        Permission.PROJECT_READ,
        Permission.SCHEDULE_READ,
        Permission.DOCUMENT_READ,
        Permission.REPORT_READ,
      ]
    },
    {
      role: UserRole.SUPERVISOR,
      permissions: [
        Permission.PROJECT_READ,
        Permission.SCHEDULE_READ,
        Permission.SCHEDULE_UPDATE,
        Permission.BOQ_READ,
        Permission.RFI_READ,
        Permission.DOCUMENT_READ,
        Permission.REPORT_READ,
      ]
    }
  ];

  /**
   * Check if a user has a specific permission
   */
  static hasPermission(user: UserWithPermissions, permission: Permission): boolean {
    return user.permissions.includes(permission);
  }

  /**
   * Check if a user has any of the specified permissions
   */
  static hasAnyPermission(user: UserWithPermissions, permissions: Permission[]): boolean {
    return permissions.some(perm => user.permissions.includes(perm));
  }

  /**
   * Check if a user has all of the specified permissions
   */
  static hasAllPermissions(user: UserWithPermissions, permissions: Permission[]): boolean {
    return permissions.every(perm => user.permissions.includes(perm));
  }

  /**
   * Get permissions for a specific role
   */
  static getPermissionsForRole(role: UserRole): Permission[] {
    const rolePermissions = this.DEFAULT_ROLE_PERMISSIONS.find(rp => rp.role === role);
    return rolePermissions ? rolePermissions.permissions : [];
  }

  /**
   * Create a user with permissions based on their role
   */
  static createUserWithPermissions(userData: any): UserWithPermissions {
    const permissions = this.getPermissionsForRole(userData.role);
    return {
      ...userData,
      permissions
    };
  }

  /**
   * Update user permissions
   */
  static updateUserPermissions(user: UserWithPermissions, permissions: Permission[]): UserWithPermissions {
    return {
      ...user,
      permissions
    };
  }

  /**
   * Add a permission to a user
   */
  static addUserPermission(user: UserWithPermissions, permission: Permission): UserWithPermissions {
    if (!user.permissions.includes(permission)) {
      return {
        ...user,
        permissions: [...user.permissions, permission]
      };
    }
    return user;
  }

  /**
   * Remove a permission from a user
   */
  static removeUserPermission(user: UserWithPermissions, permission: Permission): UserWithPermissions {
    return {
      ...user,
      permissions: user.permissions.filter(perm => perm !== permission)
    };
  }
}

/**
 * Higher-order function to create permission checker for specific modules
 */
export const createPermissionChecker = (user: UserWithPermissions) => {
  return {
    canCreate: (permission: Permission) => PermissionsService.hasPermission(user, permission),
    canRead: (permission: Permission) => PermissionsService.hasPermission(user, permission),
    canUpdate: (permission: Permission) => PermissionsService.hasPermission(user, permission),
    canDelete: (permission: Permission) => PermissionsService.hasPermission(user, permission),
    hasPermission: (permission: Permission) => PermissionsService.hasPermission(user, permission),
    hasAnyPermission: (permissions: Permission[]) => PermissionsService.hasAnyPermission(user, permissions),
    hasAllPermissions: (permissions: Permission[]) => PermissionsService.hasAllPermissions(user, permissions),
  };
};
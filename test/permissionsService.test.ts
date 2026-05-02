import { describe, it, expect } from 'vitest';
import { PermissionsService } from '../services/auth/permissionsService';
import { UserRole, Permission } from '../types';

describe('PermissionsService', () => {
  describe('getPermissionsForRole', () => {
    it('should return correct permissions for Admin (PascalCase)', () => {
      const permissions = PermissionsService.getPermissionsForRole(UserRole.ADMIN);
      expect(permissions).toContain(Permission.USER_CREATE);
      expect(permissions).toContain(Permission.PROJECT_CREATE);
    });

    it('should return correct permissions for ADMIN (UPPERCASE)', () => {
      const permissions = PermissionsService.getPermissionsForRole('ADMIN');
      expect(permissions).toContain(Permission.USER_CREATE);
      expect(permissions).toContain(Permission.PROJECT_CREATE);
    });

    it('should return correct permissions for admin (lowercase)', () => {
      const permissions = PermissionsService.getPermissionsForRole('admin');
      expect(permissions).toContain(Permission.USER_CREATE);
      expect(permissions).toContain(Permission.PROJECT_CREATE);
    });

    it('should return correct permissions for Site Engineer', () => {
      const permissions = PermissionsService.getPermissionsForRole(UserRole.SITE_ENGINEER);
      expect(permissions).toContain(Permission.PROJECT_READ);
      expect(permissions).not.toContain(Permission.USER_CREATE);
    });

    it('should return empty array for unknown role', () => {
      const permissions = PermissionsService.getPermissionsForRole('UNKNOWN_ROLE');
      expect(permissions).toEqual([]);
    });
  });

  describe('hasPermission', () => {
    it('should return true if user has permission', () => {
      const user = PermissionsService.createUserWithPermissions({ role: UserRole.ADMIN });
      expect(PermissionsService.hasPermission(user, Permission.USER_CREATE)).toBe(true);
    });

    it('should return false if user lacks permission', () => {
      const user = PermissionsService.createUserWithPermissions({ role: UserRole.SITE_ENGINEER });
      expect(PermissionsService.hasPermission(user, Permission.USER_CREATE)).toBe(false);
    });
  });
});

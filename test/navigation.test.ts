import { describe, it, expect } from 'vitest';
import { getNavigationGroups } from '../config/navigation';
import { UserRole, Permission } from '../types';
import { PermissionsService } from '../services/auth/permissionsService';

describe('Navigation Configuration', () => {
  it('should show admin items for Admin user', () => {
    const user = PermissionsService.createUserWithPermissions({ role: UserRole.ADMIN });
    const groups = getNavigationGroups(user);
    const adminGroup = groups.find(g => g.title === 'Administration');
    
    expect(adminGroup).toBeDefined();
    expect(adminGroup?.items.some(i => i.id === 'user-management')).toBe(true);
    expect(adminGroup?.items.some(i => i.id === 'user-registration')).toBe(true);
  });

  it('should only show project read related items for Site Engineer', () => {
    const user = PermissionsService.createUserWithPermissions({ role: UserRole.SITE_ENGINEER });
    const groups = getNavigationGroups(user);
    const adminGroup = groups.find(g => g.title === 'Administration');
    
    expect(adminGroup).toBeUndefined();
  });

  it('should show User Management but NOT Create Account if user only has USER_READ', () => {
    const user = {
      id: 'test-user',
      name: 'Test User',
      email: 'test@example.com',
      role: UserRole.PROJECT_MANAGER,
      permissions: [Permission.USER_READ]
    };
    
    const groups = getNavigationGroups(user as any);
    const adminGroup = groups.find(g => g.title === 'Administration');
    
    expect(adminGroup).toBeDefined();
    expect(adminGroup?.items.some(i => i.id === 'user-management')).toBe(true);
    expect(adminGroup?.items.some(i => i.id === 'user-registration')).toBe(false);
  });
});

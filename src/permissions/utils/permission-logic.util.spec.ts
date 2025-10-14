import { PERMISSIONS } from '../constants/permissions.constants';
import {
  addPermissions,
  bitfieldToPermissions,
  checkPermissions,
  formatPermissions,
  getPermissionDifference,
  getPermissionIntersection,
  getPermissionUnion,
  hasAllPermissions,
  hasAnyPermission,
  hasNonePermissions,
  hasPermission,
  permissionToBit,
  permissionsToBitfield,
  removePermissions,
  togglePermission,
} from './permission-logic.util';

/**
 * Unit tests for permission logic utilities
 * Tests logical operations (AND, OR, NOT) and set operations
 */
describe('PermissionLogicUtil', () => {
  describe('permissionToBit', () => {
    it('should convert permission name to bitfield', () => {
      expect(permissionToBit('ARTICLE_CREATE')).toBe(
        PERMISSIONS.ARTICLE_CREATE,
      );
      expect(permissionToBit('ADMINISTRATOR')).toBe(PERMISSIONS.ADMINISTRATOR);
    });

    it('should return 0n for unknown permission', () => {
      expect(permissionToBit('UNKNOWN_PERMISSION' as any)).toBe(0n);
    });
  });

  describe('permissionsToBitfield', () => {
    it('should combine multiple permissions with OR', () => {
      const result = permissionsToBitfield([
        'ARTICLE_CREATE',
        'ARTICLE_EDIT',
        'COMMENT_CREATE',
      ]);

      const expected =
        PERMISSIONS.ARTICLE_CREATE |
        PERMISSIONS.ARTICLE_EDIT |
        PERMISSIONS.COMMENT_CREATE;

      expect(result).toBe(expected);
    });

    it('should return 0n for empty array', () => {
      expect(permissionsToBitfield([])).toBe(0n);
    });
  });

  describe('hasAllPermissions - AND operation', () => {
    it('should return true when user has ALL required permissions', () => {
      const userPerms =
        PERMISSIONS.ARTICLE_CREATE |
        PERMISSIONS.ARTICLE_EDIT |
        PERMISSIONS.COMMENT_CREATE;

      const result = hasAllPermissions(userPerms, [
        'ARTICLE_CREATE',
        'ARTICLE_EDIT',
      ]);

      expect(result).toBe(true);
    });

    it('should return false when user is missing one permission', () => {
      const userPerms = PERMISSIONS.ARTICLE_CREATE; // Only CREATE

      const result = hasAllPermissions(userPerms, [
        'ARTICLE_CREATE',
        'ARTICLE_EDIT', // Missing this
      ]);

      expect(result).toBe(false);
    });

    it('should return true for empty required permissions', () => {
      const userPerms = PERMISSIONS.ARTICLE_CREATE;
      expect(hasAllPermissions(userPerms, [])).toBe(true);
    });
  });

  describe('hasAnyPermission - OR operation', () => {
    it('should return true when user has at least one permission', () => {
      const userPerms = PERMISSIONS.ARTICLE_CREATE;

      const result = hasAnyPermission(userPerms, [
        'ARTICLE_CREATE',
        'ARTICLE_EDIT', // Don't have this
      ]);

      expect(result).toBe(true);
    });

    it('should return false when user has none of the permissions', () => {
      const userPerms = PERMISSIONS.COMMENT_CREATE;

      const result = hasAnyPermission(userPerms, [
        'ARTICLE_CREATE',
        'ARTICLE_EDIT',
      ]);

      expect(result).toBe(false);
    });

    it('should return false for empty allowed permissions', () => {
      const userPerms = PERMISSIONS.ARTICLE_CREATE;
      expect(hasAnyPermission(userPerms, [])).toBe(false);
    });
  });

  describe('hasNonePermissions - NOT operation', () => {
    it('should return true when user has none of the forbidden permissions', () => {
      const userPerms = PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.COMMENT_CREATE;

      const result = hasNonePermissions(userPerms, [
        'ADMINISTRATOR',
        'BAN_MEMBERS',
      ]);

      expect(result).toBe(true);
    });

    it('should return false when user has at least one forbidden permission', () => {
      const userPerms = PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.ADMINISTRATOR;

      const result = hasNonePermissions(userPerms, [
        'ADMINISTRATOR',
        'BAN_MEMBERS',
      ]);

      expect(result).toBe(false);
    });

    it('should return true for empty forbidden permissions', () => {
      const userPerms = PERMISSIONS.ADMINISTRATOR;
      expect(hasNonePermissions(userPerms, [])).toBe(true);
    });
  });

  describe('checkPermissions - Complex logic', () => {
    it('should check ALL + ANY + NONE conditions', () => {
      const userPerms =
        PERMISSIONS.ARTICLE_CREATE |
        PERMISSIONS.ARTICLE_EDIT |
        PERMISSIONS.COMMENT_CREATE;

      const result = checkPermissions(userPerms, {
        all: ['ARTICLE_CREATE'], // Has this ✓
        any: ['ARTICLE_EDIT', 'ARTICLE_DELETE'], // Has EDIT ✓
        none: ['ADMINISTRATOR', 'BAN_MEMBERS'], // Has neither ✓
      });

      expect(result).toBe(true);
    });

    it('should fail when ALL condition is not met', () => {
      const userPerms = PERMISSIONS.ARTICLE_CREATE;

      const result = checkPermissions(userPerms, {
        all: ['ARTICLE_CREATE', 'ARTICLE_EDIT'], // Missing EDIT ✗
      });

      expect(result).toBe(false);
    });

    it('should fail when ANY condition is not met', () => {
      const userPerms = PERMISSIONS.COMMENT_CREATE;

      const result = checkPermissions(userPerms, {
        any: ['ARTICLE_CREATE', 'ARTICLE_EDIT'], // Has neither ✗
      });

      expect(result).toBe(false);
    });

    it('should fail when NONE condition is not met', () => {
      const userPerms = PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.ADMINISTRATOR;

      const result = checkPermissions(userPerms, {
        none: ['ADMINISTRATOR'], // Has ADMINISTRATOR ✗
      });

      expect(result).toBe(false);
    });

    it('should return true when no conditions are specified', () => {
      const userPerms = PERMISSIONS.ARTICLE_CREATE;
      expect(checkPermissions(userPerms, {})).toBe(true);
    });
  });

  describe('addPermissions', () => {
    it('should add multiple permissions', () => {
      const current = PERMISSIONS.ARTICLE_CREATE;

      const result = addPermissions(current, [
        'ARTICLE_EDIT',
        'COMMENT_CREATE',
      ]);

      const expected =
        PERMISSIONS.ARTICLE_CREATE |
        PERMISSIONS.ARTICLE_EDIT |
        PERMISSIONS.COMMENT_CREATE;

      expect(result).toBe(expected);
    });

    it('should be idempotent - adding same permission twice', () => {
      const current = PERMISSIONS.ARTICLE_CREATE;

      const result = addPermissions(current, ['ARTICLE_CREATE']);

      expect(result).toBe(current);
    });
  });

  describe('removePermissions', () => {
    it('should remove multiple permissions', () => {
      const current =
        PERMISSIONS.ARTICLE_CREATE |
        PERMISSIONS.ARTICLE_EDIT |
        PERMISSIONS.COMMENT_CREATE;

      const result = removePermissions(current, [
        'ARTICLE_EDIT',
        'COMMENT_CREATE',
      ]);

      expect(result).toBe(PERMISSIONS.ARTICLE_CREATE);
    });

    it('should be idempotent - removing non-existent permission', () => {
      const current = PERMISSIONS.ARTICLE_CREATE;

      const result = removePermissions(current, ['ARTICLE_EDIT']);

      expect(result).toBe(current);
    });
  });

  describe('getPermissionDifference', () => {
    it('should return permissions in first but not in second', () => {
      const admin =
        PERMISSIONS.ARTICLE_CREATE |
        PERMISSIONS.ARTICLE_EDIT |
        PERMISSIONS.ARTICLE_DELETE;

      const member = PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.ARTICLE_EDIT;

      const result = getPermissionDifference(admin, member);

      expect(result).toBe(PERMISSIONS.ARTICLE_DELETE); // Only in admin
    });

    it('should return 0n when all permissions are common', () => {
      const perms1 = PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.ARTICLE_EDIT;
      const perms2 = PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.ARTICLE_EDIT;

      expect(getPermissionDifference(perms1, perms2)).toBe(0n);
    });
  });

  describe('getPermissionIntersection', () => {
    it('should return common permissions', () => {
      const admin =
        PERMISSIONS.ARTICLE_CREATE |
        PERMISSIONS.ARTICLE_EDIT |
        PERMISSIONS.ARTICLE_DELETE;

      const member = PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.ARTICLE_EDIT;

      const result = getPermissionIntersection(admin, member);

      const expected = PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.ARTICLE_EDIT;

      expect(result).toBe(expected);
    });

    it('should return 0n when no common permissions', () => {
      const perms1 = PERMISSIONS.ARTICLE_CREATE;
      const perms2 = PERMISSIONS.COMMENT_CREATE;

      expect(getPermissionIntersection(perms1, perms2)).toBe(0n);
    });
  });

  describe('getPermissionUnion', () => {
    it('should combine all permissions from both', () => {
      const role1 = PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.ARTICLE_EDIT;
      const role2 = PERMISSIONS.COMMENT_CREATE | PERMISSIONS.COMMENT_DELETE;

      const result = getPermissionUnion(role1, role2);

      const expected =
        PERMISSIONS.ARTICLE_CREATE |
        PERMISSIONS.ARTICLE_EDIT |
        PERMISSIONS.COMMENT_CREATE |
        PERMISSIONS.COMMENT_DELETE;

      expect(result).toBe(expected);
    });

    it('should be idempotent when combining same permissions', () => {
      const perms = PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.ARTICLE_EDIT;

      expect(getPermissionUnion(perms, perms)).toBe(perms);
    });
  });

  describe('togglePermission', () => {
    it('should add permission when not present', () => {
      const current = PERMISSIONS.ARTICLE_CREATE;

      const result = togglePermission(current, 'ARTICLE_EDIT');

      const expected = PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.ARTICLE_EDIT;

      expect(result).toBe(expected);
    });

    it('should remove permission when present', () => {
      const current = PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.ARTICLE_EDIT;

      const result = togglePermission(current, 'ARTICLE_EDIT');

      expect(result).toBe(PERMISSIONS.ARTICLE_CREATE);
    });

    it('should be reversible - toggle twice returns original', () => {
      const original = PERMISSIONS.ARTICLE_CREATE;

      const toggled = togglePermission(original, 'ARTICLE_EDIT');
      const toggledBack = togglePermission(toggled, 'ARTICLE_EDIT');

      expect(toggledBack).toBe(original);
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has permission', () => {
      const userPerms = PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.ARTICLE_EDIT;

      expect(hasPermission(userPerms, 'ARTICLE_CREATE')).toBe(true);
      expect(hasPermission(userPerms, 'ARTICLE_EDIT')).toBe(true);
    });

    it('should return false when user does not have permission', () => {
      const userPerms = PERMISSIONS.ARTICLE_CREATE;

      expect(hasPermission(userPerms, 'ARTICLE_EDIT')).toBe(false);
    });
  });

  describe('bitfieldToPermissions', () => {
    it('should convert bitfield to array of permission names', () => {
      const bitfield =
        PERMISSIONS.ARTICLE_CREATE |
        PERMISSIONS.ARTICLE_EDIT |
        PERMISSIONS.COMMENT_CREATE;

      const result = bitfieldToPermissions(bitfield);

      expect(result).toContain('ARTICLE_CREATE');
      expect(result).toContain('ARTICLE_EDIT');
      expect(result).toContain('COMMENT_CREATE');
      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('should return empty array for 0n', () => {
      expect(bitfieldToPermissions(0n)).toEqual([]);
    });
  });

  describe('formatPermissions', () => {
    it('should format permissions as comma-separated string', () => {
      const bitfield = PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.ARTICLE_EDIT;

      const result = formatPermissions(bitfield, ', ');

      expect(result).toContain('ARTICLE_CREATE');
      expect(result).toContain('ARTICLE_EDIT');
      expect(result).toContain(', ');
    });

    it('should use default separator when not provided', () => {
      const bitfield = PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.ARTICLE_EDIT;

      const result = formatPermissions(bitfield);

      expect(result).toContain(', '); // Default separator
    });

    it('should return empty string for 0n', () => {
      expect(formatPermissions(0n)).toBe('');
    });
  });

  describe('Real-world scenarios', () => {
    it('Content moderator - can edit OR delete, but NOT publish', () => {
      const moderatorPerms =
        PERMISSIONS.ARTICLE_EDIT_ALL | PERMISSIONS.ARTICLE_DELETE_ALL;

      const isModerator = checkPermissions(moderatorPerms, {
        any: ['ARTICLE_EDIT_ALL', 'ARTICLE_DELETE_ALL'],
        none: ['ARTICLE_PUBLISH'],
      });

      expect(isModerator).toBe(true);
    });

    it('Organization manager - can manage members AND settings, but NOT delete org', () => {
      const managerPerms =
        PERMISSIONS.ORGANIZATION_MANAGE_MEMBERS |
        PERMISSIONS.ORGANIZATION_MANAGE_SETTINGS;

      const isManager = checkPermissions(managerPerms, {
        all: ['ORGANIZATION_MANAGE_MEMBERS', 'ORGANIZATION_MANAGE_SETTINGS'],
        none: ['ORGANIZATION_DELETE'],
      });

      expect(isManager).toBe(true);
    });

    it('Regular user - has basic permissions but not admin permissions', () => {
      const userPerms = PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.COMMENT_CREATE;

      const isRegularUser = checkPermissions(userPerms, {
        all: ['ARTICLE_CREATE', 'COMMENT_CREATE'],
        none: ['ADMINISTRATOR', 'BAN_MEMBERS', 'KICK_MEMBERS'],
      });

      expect(isRegularUser).toBe(true);
    });

    it('Promote user from member to moderator', () => {
      let userPerms = PERMISSIONS.ARTICLE_CREATE | PERMISSIONS.COMMENT_CREATE;

      // Add moderator permissions
      userPerms = addPermissions(userPerms, [
        'ARTICLE_MODERATE',
        'COMMENT_MODERATE',
        'COMMENT_DELETE_ALL',
      ]);

      expect(hasPermission(userPerms, 'ARTICLE_MODERATE')).toBe(true);
      expect(hasPermission(userPerms, 'COMMENT_MODERATE')).toBe(true);
      expect(hasPermission(userPerms, 'COMMENT_DELETE_ALL')).toBe(true);
      expect(hasPermission(userPerms, 'ARTICLE_CREATE')).toBe(true); // Original permission still exists
    });
  });
});

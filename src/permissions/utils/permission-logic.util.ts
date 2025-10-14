import { PermissionName } from 'src/shared/constants';
import { PERMISSIONS } from '../constants/permissions.constants';

/**
 * Permission Logic Utilities for Discord-style permission system
 * Provides logical operations (AND, OR, NOT) for permission checking
 */

/**
 * Convert permission name to bitfield value
 * @param permission - Permission name
 * @returns Permission bitfield
 */
export function permissionToBit(permission: PermissionName): bigint {
  return PERMISSIONS[permission] || 0n;
}

/**
 * Convert array of permission names to combined bitfield
 * @param permissions - Array of permission names
 * @returns Combined permission bitfield using OR operation
 */
export function permissionsToBitfield(permissions: PermissionName[]): bigint {
  return permissions.reduce((acc, perm) => acc | permissionToBit(perm), 0n);
}

/**
 * Check if user has ALL of the specified permissions (AND operation)
 * All specified permissions must be present in the bitfield
 *
 * @param userPermissions - User's permission bitfield
 * @param requiredPermissions - Array of permissions that ALL must be present
 * @returns True if user has ALL specified permissions
 *
 * @example
 * // User must have both ARTICLE_CREATE AND ARTICLE_PUBLISH
 * hasAllPermissions(userPerms, ['ARTICLE_CREATE', 'ARTICLE_PUBLISH'])
 *
 * // Binary logic:
 * // userPerms:     11111111
 * // required:      00001100
 * // AND result:    00001100 === required → TRUE
 */
export function hasAllPermissions(
  userPermissions: bigint,
  requiredPermissions: PermissionName[],
): boolean {
  const requiredBits = permissionsToBitfield(requiredPermissions);

  // Check if ALL required bits are set (AND operation)
  // If (userPerms & required) === required, then user has all permissions
  return (userPermissions & requiredBits) === requiredBits;
}

/**
 * Check if user has ANY of the specified permissions (OR operation)
 * At least one of the specified permissions must be present
 *
 * @param userPermissions - User's permission bitfield
 * @param allowedPermissions - Array of permissions where ANY can be present
 * @returns True if user has AT LEAST ONE specified permission
 *
 * @example
 * // User must have either ARTICLE_EDIT_OWN OR ARTICLE_EDIT_ALL
 * hasAnyPermission(userPerms, ['ARTICLE_EDIT_OWN', 'ARTICLE_EDIT_ALL'])
 *
 * // Binary logic:
 * // userPerms:     11111111
 * // allowed:       00001100
 * // AND result:    00001100 !== 0 → TRUE (at least one bit is set)
 */
export function hasAnyPermission(
  userPermissions: bigint,
  allowedPermissions: PermissionName[],
): boolean {
  const allowedBits = permissionsToBitfield(allowedPermissions);

  // Check if ANY bit is set (OR operation)
  // If (userPerms & allowed) !== 0, then user has at least one permission
  return (userPermissions & allowedBits) !== 0n;
}

/**
 * Check if user has NONE of the specified permissions (NOT operation)
 * None of the specified permissions should be present
 *
 * @param userPermissions - User's permission bitfield
 * @param forbiddenPermissions - Array of permissions that must NOT be present
 * @returns True if user has NONE of the specified permissions
 *
 * @example
 * // User must NOT have ADMINISTRATOR or BAN_MEMBERS
 * hasNonePermissions(userPerms, ['ADMINISTRATOR', 'BAN_MEMBERS'])
 *
 * // Binary logic:
 * // userPerms:     11110011
 * // forbidden:     00001100
 * // AND result:    00000000 === 0 → TRUE (no forbidden bits are set)
 */
export function hasNonePermissions(
  userPermissions: bigint,
  forbiddenPermissions: PermissionName[],
): boolean {
  const forbiddenBits = permissionsToBitfield(forbiddenPermissions);

  // Check if NO forbidden bits are set (NOT operation)
  // If (userPerms & forbidden) === 0, then user has none of the forbidden permissions
  return (userPermissions & forbiddenBits) === 0n;
}

/**
 * Complex permission check with combined AND/OR/NOT logic
 * Allows checking multiple conditions in a single call
 *
 * @param userPermissions - User's permission bitfield
 * @param options - Permission check options
 * @returns True if all conditions are met
 *
 * @example
 * // User must have ARTICLE_CREATE
 * // AND (ARTICLE_EDIT_OWN OR ARTICLE_EDIT_ALL)
 * // AND NOT ADMINISTRATOR
 * checkPermissions(userPerms, {
 *   all: ['ARTICLE_CREATE'],
 *   any: ['ARTICLE_EDIT_OWN', 'ARTICLE_EDIT_ALL'],
 *   none: ['ADMINISTRATOR']
 * })
 *
 * // This is equivalent to:
 * // hasAllPermissions(userPerms, ['ARTICLE_CREATE']) &&
 * // hasAnyPermission(userPerms, ['ARTICLE_EDIT_OWN', 'ARTICLE_EDIT_ALL']) &&
 * // hasNonePermissions(userPerms, ['ADMINISTRATOR'])
 */
export function checkPermissions(
  userPermissions: bigint,
  options: {
    all?: PermissionName[]; // Must have ALL of these (AND)
    any?: PermissionName[]; // Must have ANY of these (OR)
    none?: PermissionName[]; // Must have NONE of these (NOT)
  },
): boolean {
  // Check ALL condition (AND) - all required permissions must be present
  if (options.all && !hasAllPermissions(userPermissions, options.all)) {
    return false;
  }

  // Check ANY condition (OR) - at least one permission must be present
  if (options.any && !hasAnyPermission(userPermissions, options.any)) {
    return false;
  }

  // Check NONE condition (NOT) - no forbidden permissions should be present
  if (options.none && !hasNonePermissions(userPermissions, options.none)) {
    return false;
  }

  return true;
}

/**
 * Add multiple permissions to a bitfield (OR operation)
 * Combines new permissions with existing ones
 *
 * @param currentPermissions - Current permission bitfield
 * @param permissionsToAdd - Array of permissions to add
 * @returns Updated permission bitfield with all permissions added
 *
 * @example
 * addPermissions(userPerms, ['ARTICLE_CREATE', 'ARTICLE_EDIT_OWN', 'COMMENT_CREATE'])
 *
 * // Binary logic:
 * // current:       11110000
 * // toAdd:         00001111
 * // OR result:     11111111 (all bits set)
 */
export function addPermissions(
  currentPermissions: bigint,
  permissionsToAdd: PermissionName[],
): bigint {
  const permissionsToAddBits = permissionsToBitfield(permissionsToAdd);
  return currentPermissions | permissionsToAddBits;
}

/**
 * Remove multiple permissions from a bitfield (AND NOT operation)
 * Removes specified permissions from the bitfield
 *
 * @param currentPermissions - Current permission bitfield
 * @param permissionsToRemove - Array of permissions to remove
 * @returns Updated permission bitfield with permissions removed
 *
 * @example
 * removePermissions(userPerms, ['ARTICLE_DELETE_ALL', 'BAN_MEMBERS'])
 *
 * // Binary logic:
 * // current:       11111111
 * // toRemove:      00001100
 * // NOT toRemove:  11110011
 * // AND result:    11110011 (removed bits unset)
 */
export function removePermissions(
  currentPermissions: bigint,
  permissionsToRemove: PermissionName[],
): bigint {
  const permissionsToRemoveBits = permissionsToBitfield(permissionsToRemove);
  return currentPermissions & ~permissionsToRemoveBits;
}

/**
 * Get the difference between two permission bitfields
 * Returns permissions that exist in first but not in second
 *
 * @param permissions1 - First permission bitfield
 * @param permissions2 - Second permission bitfield
 * @returns Permissions that exist in first but not in second
 *
 * @example
 * // Get permissions that admin has but member doesn't
 * const extraPermissions = getPermissionDifference(adminPerms, memberPerms)
 *
 * // Binary logic:
 * // admin:         11111111
 * // member:        00001111
 * // NOT member:    11110000
 * // AND result:    11110000 (admin-only permissions)
 */
export function getPermissionDifference(
  permissions1: bigint,
  permissions2: bigint,
): bigint {
  // Permissions in first but not in second
  return permissions1 & ~permissions2;
}

/**
 * Get the intersection of two permission bitfields
 * Returns permissions that exist in BOTH bitfields
 *
 * @param permissions1 - First permission bitfield
 * @param permissions2 - Second permission bitfield
 * @returns Permissions that exist in both bitfields
 *
 * @example
 * // Get permissions that both admin and moderator have
 * const commonPermissions = getPermissionIntersection(adminPerms, moderatorPerms)
 *
 * // Binary logic:
 * // admin:         11111111
 * // moderator:     00111111
 * // AND result:    00111111 (common permissions)
 */
export function getPermissionIntersection(
  permissions1: bigint,
  permissions2: bigint,
): bigint {
  // Permissions that exist in both
  return permissions1 & permissions2;
}

/**
 * Get the union of two permission bitfields
 * Returns all permissions from BOTH bitfields combined
 *
 * @param permissions1 - First permission bitfield
 * @param permissions2 - Second permission bitfield
 * @returns All permissions from both bitfields
 *
 * @example
 * // Combine permissions from two roles
 * const combinedPermissions = getPermissionUnion(role1Perms, role2Perms)
 *
 * // Binary logic:
 * // role1:         11110000
 * // role2:         00001111
 * // OR result:     11111111 (all permissions)
 */
export function getPermissionUnion(
  permissions1: bigint,
  permissions2: bigint,
): bigint {
  // All permissions from both
  return permissions1 | permissions2;
}

/**
 * Toggle a permission in a bitfield using XOR
 * If permission exists, remove it. If not, add it.
 *
 * @param currentPermissions - Current permission bitfield
 * @param permission - Permission to toggle
 * @returns Updated permission bitfield with permission toggled
 *
 * @example
 * togglePermission(userPerms, 'ARTICLE_CREATE')
 *
 * // Binary logic (XOR):
 * // current:       11110000
 * // toToggle:      00001000
 * // XOR result:    11111000 (bit toggled ON)
 *
 * // If called again:
 * // current:       11111000
 * // toToggle:      00001000
 * // XOR result:    11110000 (bit toggled OFF)
 */
export function togglePermission(
  currentPermissions: bigint,
  permission: PermissionName,
): bigint {
  const permissionBit = permissionToBit(permission);
  return currentPermissions ^ permissionBit; // XOR to toggle
}

/**
 * Check if a specific permission is set in the bitfield
 * Simple single permission check
 *
 * @param userPermissions - User's permission bitfield
 * @param permission - Permission to check
 * @returns True if permission is set
 *
 * @example
 * hasPermission(userPerms, 'ARTICLE_CREATE')
 *
 * // Binary logic:
 * // userPerms:     11111111
 * // permission:    00001000
 * // AND result:    00001000 !== 0 → TRUE
 */
export function hasPermission(
  userPermissions: bigint,
  permission: PermissionName,
): boolean {
  const permissionBit = permissionToBit(permission);
  return (userPermissions & permissionBit) !== 0n;
}

/**
 * Convert bitfield to array of permission names
 * Useful for displaying user's permissions
 *
 * @param permissions - Permission bitfield
 * @returns Array of permission names that are set
 *
 * @example
 * const permNames = bitfieldToPermissions(userPerms)
 * // Returns: ['ARTICLE_CREATE', 'ARTICLE_EDIT_OWN', 'COMMENT_CREATE']
 */
export function bitfieldToPermissions(permissions: bigint): PermissionName[] {
  const result: PermissionName[] = [];

  for (const [name, bit] of Object.entries(PERMISSIONS)) {
    if ((permissions & bit) !== 0n) {
      result.push(name as PermissionName);
    }
  }

  return result;
}

/**
 * Format permissions as human-readable string
 *
 * @param permissions - Permission bitfield
 * @param separator - Separator between permissions
 * @returns Formatted permission string
 *
 * @example
 * formatPermissions(userPerms, ', ')
 * // Returns: "ARTICLE_CREATE, ARTICLE_EDIT_OWN, COMMENT_CREATE"
 */
export function formatPermissions(
  permissions: bigint,
  separator = ', ',
): string {
  const permNames = bitfieldToPermissions(permissions);
  return permNames.join(separator);
}

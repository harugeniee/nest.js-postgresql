/**
 * Permission utilities export
 * Centralized exports for all permission utility functions
 */

export {
  // Set operations
  addPermissions,
  bitfieldToPermissions,
  checkPermissions,
  formatPermissions,
  getPermissionDifference,
  getPermissionIntersection,
  getPermissionUnion,
  // Logical operators
  hasAllPermissions,
  hasAnyPermission,
  hasNonePermissions,
  hasPermission,
  // Conversion utilities
  permissionToBit,
  permissionsToBitfield,
  removePermissions,
  togglePermission,
} from './permission-logic.util';

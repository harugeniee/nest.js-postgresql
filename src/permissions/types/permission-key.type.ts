/**
 * Re-export all permission key types from the single source of truth.
 * @see ../constants/permission-definitions.ts
 */
export {
  type PermissionAction,
  type PermissionComponent,
  type PermissionKey,
  getAction,
  getComponent,
  isPermissionKey,
} from '../constants/permission-definitions';

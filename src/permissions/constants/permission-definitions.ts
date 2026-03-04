/**
 * SINGLE SOURCE OF TRUTH for permission definitions.
 *
 * To add a new permission component:
 *   1. Append (NEVER reorder) to PERMISSION_COMPONENTS
 *   2. Done — types, constants, and bit positions auto-derive
 *
 * WARNING: Array order is APPEND-ONLY.
 * Bit positions are derived from index: component_index * 4 + action_index.
 * Reordering will silently change every stored bitfield in the database.
 */

export const PERMISSION_COMPONENTS = [
  'article',
  'series',
  'segment',
  'organization',
  'team',
  'project',
  'media',
  'sticker',
  'report',
] as const;

export const PERMISSION_ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
] as const;

export type PermissionComponent = (typeof PERMISSION_COMPONENTS)[number];
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];
export type PermissionKey = `${PermissionComponent}.${PermissionAction}`;

/**
 * All permission keys, auto-derived from components × actions.
 * Order matches bit positions used by PermissionRegistry.
 */
export const ALL_PERMISSION_KEYS = PERMISSION_COMPONENTS.flatMap((c) =>
  PERMISSION_ACTIONS.map((a) => `${c}.${a}` as const),
);

/**
 * Type guard: check if a string is a valid PermissionKey
 */
export function isPermissionKey(value: string): value is PermissionKey {
  return ALL_PERMISSION_KEYS.includes(value as PermissionKey);
}

/**
 * Extract component from a PermissionKey
 */
export function getComponent(key: PermissionKey): PermissionComponent {
  return key.split('.')[0] as PermissionComponent;
}

/**
 * Extract action from a PermissionKey
 */
export function getAction(key: PermissionKey): PermissionAction {
  return key.split('.')[1] as PermissionAction;
}

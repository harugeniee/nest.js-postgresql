/**
 * Re-export all permission key constants from the single source of truth.
 * Individual constants kept for backward compatibility.
 * @see ./permission-definitions.ts
 */
import { PermissionKey } from '../types/permission-key.type';
import { ALL_PERMISSION_KEYS as _ALL_KEYS } from './permission-definitions';

// Re-export the auto-derived array
export const ALL_PERMISSION_KEYS = _ALL_KEYS;

// Article permissions
export const ARTICLE_CREATE: PermissionKey = 'article.create';
export const ARTICLE_READ: PermissionKey = 'article.read';
export const ARTICLE_UPDATE: PermissionKey = 'article.update';
export const ARTICLE_DELETE: PermissionKey = 'article.delete';

// Series permissions
export const SERIES_CREATE: PermissionKey = 'series.create';
export const SERIES_READ: PermissionKey = 'series.read';
export const SERIES_UPDATE: PermissionKey = 'series.update';
export const SERIES_DELETE: PermissionKey = 'series.delete';

// Segment permissions
export const SEGMENT_CREATE: PermissionKey = 'segment.create';
export const SEGMENT_READ: PermissionKey = 'segment.read';
export const SEGMENT_UPDATE: PermissionKey = 'segment.update';
export const SEGMENT_DELETE: PermissionKey = 'segment.delete';

// Organization permissions
export const ORGANIZATION_CREATE: PermissionKey = 'organization.create';
export const ORGANIZATION_READ: PermissionKey = 'organization.read';
export const ORGANIZATION_UPDATE: PermissionKey = 'organization.update';
export const ORGANIZATION_DELETE: PermissionKey = 'organization.delete';

// Team permissions
export const TEAM_CREATE: PermissionKey = 'team.create';
export const TEAM_READ: PermissionKey = 'team.read';
export const TEAM_UPDATE: PermissionKey = 'team.update';
export const TEAM_DELETE: PermissionKey = 'team.delete';

// Project permissions
export const PROJECT_CREATE: PermissionKey = 'project.create';
export const PROJECT_READ: PermissionKey = 'project.read';
export const PROJECT_UPDATE: PermissionKey = 'project.update';
export const PROJECT_DELETE: PermissionKey = 'project.delete';

// Media permissions
export const MEDIA_CREATE: PermissionKey = 'media.create';
export const MEDIA_READ: PermissionKey = 'media.read';
export const MEDIA_UPDATE: PermissionKey = 'media.update';
export const MEDIA_DELETE: PermissionKey = 'media.delete';

// Sticker permissions
export const STICKER_CREATE: PermissionKey = 'sticker.create';
export const STICKER_READ: PermissionKey = 'sticker.read';
export const STICKER_UPDATE: PermissionKey = 'sticker.update';
export const STICKER_DELETE: PermissionKey = 'sticker.delete';

// Report permissions
export const REPORT_CREATE: PermissionKey = 'report.create';
export const REPORT_READ: PermissionKey = 'report.read';
export const REPORT_UPDATE: PermissionKey = 'report.update';
export const REPORT_DELETE: PermissionKey = 'report.delete';

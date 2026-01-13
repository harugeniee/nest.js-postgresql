// Organization Entity Constants
export const ORGANIZATION_CONSTANTS = {
  // Field lengths
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  SLUG_MAX_LENGTH: 100,
  WEBSITE_URL_MAX_LENGTH: 512,

  // Status values
  STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
  },

  // Visibility levels
  VISIBILITY: {
    PUBLIC: 'public',
    PRIVATE: 'private',
  },

  // Member roles
  MEMBER_ROLE: {
    OWNER: 'owner',
    ADMIN: 'admin',
    MEMBER: 'member',
  },
} as const;

// Type definitions for better TypeScript support
export type OrganizationStatus =
  (typeof ORGANIZATION_CONSTANTS.STATUS)[keyof typeof ORGANIZATION_CONSTANTS.STATUS];

export type OrganizationVisibility =
  (typeof ORGANIZATION_CONSTANTS.VISIBILITY)[keyof typeof ORGANIZATION_CONSTANTS.VISIBILITY];

export type OrganizationMemberRole =
  (typeof ORGANIZATION_CONSTANTS.MEMBER_ROLE)[keyof typeof ORGANIZATION_CONSTANTS.MEMBER_ROLE];

// Contribution Entity Constants
export const CONTRIBUTION_CONSTANTS = {
  // Field lengths
  ENTITY_TYPE_MAX_LENGTH: 50,
  ACTION_MAX_LENGTH: 20,
  STATUS_MAX_LENGTH: 20,
  REJECTION_REASON_MAX_LENGTH: 2000,
  ADMIN_NOTES_MAX_LENGTH: 2000,
  CONTRIBUTOR_NOTE_MAX_LENGTH: 500,

  // Entity types that can be contributed
  ENTITY_TYPE: {
    SERIES: 'series',
    SEGMENT: 'segment',
    CHARACTER: 'character',
    STAFF: 'staff',
  },

  // Contribution actions
  ACTION: {
    CREATE: 'create',
    UPDATE: 'update',
  },

  // Contribution status
  STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
  },
} as const;

// Type definitions for better TypeScript support
export type ContributionEntityType =
  (typeof CONTRIBUTION_CONSTANTS.ENTITY_TYPE)[keyof typeof CONTRIBUTION_CONSTANTS.ENTITY_TYPE];

export type ContributionAction =
  (typeof CONTRIBUTION_CONSTANTS.ACTION)[keyof typeof CONTRIBUTION_CONSTANTS.ACTION];

export type ContributionStatus =
  (typeof CONTRIBUTION_CONSTANTS.STATUS)[keyof typeof CONTRIBUTION_CONSTANTS.STATUS];

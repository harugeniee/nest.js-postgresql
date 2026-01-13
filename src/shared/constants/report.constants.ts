// Report Entity Constants
export const REPORT_CONSTANTS = {
  // Field lengths
  REASON_MAX_LENGTH: 50,
  DESCRIPTION_MAX_LENGTH: 1000,
  ACTION_MAX_LENGTH: 50,
  MODERATOR_NOTES_MAX_LENGTH: 2000,
  RESOLUTION_MAX_LENGTH: 1000,

  // Report status values
  STATUS: {
    PENDING: 'pending',
    UNDER_REVIEW: 'under_review',
    RESOLVED: 'resolved',
    DISMISSED: 'dismissed',
    ESCALATED: 'escalated',
  },

  // Report priority levels
  PRIORITY: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent',
  },

  // Reportable content types
  REPORTABLE_TYPES: {
    ARTICLE: 'article',
    COMMENT: 'comment',
    USER: 'user',
    MEDIA: 'media',
    STICKER: 'sticker',
    POST: 'post',
  },

  // Report reasons/categories
  REASONS: {
    // Content-related reasons
    SPAM: 'spam',
    HARASSMENT: 'harassment',
    HATE_SPEECH: 'hate_speech',
    VIOLENCE: 'violence',
    SEXUAL_CONTENT: 'sexual_content',
    NUDITY: 'nudity',
    GRAPHIC_VIOLENCE: 'graphic_violence',
    MISINFORMATION: 'misinformation',
    FAKE_NEWS: 'fake_news',
    COPYRIGHT_VIOLATION: 'copyright_violation',
    INTELLECTUAL_PROPERTY: 'intellectual_property',
    IMPERSONATION: 'impersonation',
    FRAUD: 'fraud',
    SCAM: 'scam',
    PHISHING: 'phishing',
    MALWARE: 'malware',
    INAPPROPRIATE_CONTENT: 'inappropriate_content',
    OFFENSIVE_LANGUAGE: 'offensive_language',
    BULLYING: 'bullying',
    THREATS: 'threats',
    TERRORISM: 'terrorism',
    EXTREMISM: 'extremism',
    CHILD_ABUSE: 'child_abuse',
    SELF_HARM: 'self_harm',
    SUICIDE: 'suicide',
    DRUG_ABUSE: 'drug_abuse',
    WEAPONS: 'weapons',
    ILLEGAL_ACTIVITIES: 'illegal_activities',
    PRIVACY_VIOLATION: 'privacy_violation',
    DOXXING: 'doxxing',
    STALKING: 'stalking',
    // User-related reasons
    FAKE_ACCOUNT: 'fake_account',
    UNDERAGE_USER: 'underage_user',
    SUSPICIOUS_ACTIVITY: 'suspicious_activity',
    ACCOUNT_TAKEOVER: 'account_takeover',
    // Technical reasons
    BUG_REPORT: 'bug_report',
    FEATURE_REQUEST: 'feature_request',
    PERFORMANCE_ISSUE: 'performance_issue',
    ACCESSIBILITY_ISSUE: 'accessibility_issue',
    // Other
    OTHER: 'other',
  },

  // Report actions taken by moderators
  ACTIONS: {
    NO_ACTION: 'no_action',
    WARNING: 'warning',
    CONTENT_REMOVED: 'content_removed',
    CONTENT_HIDDEN: 'content_hidden',
    CONTENT_EDITED: 'content_edited',
    USER_WARNED: 'user_warned',
    USER_SUSPENDED: 'user_suspended',
    USER_BANNED: 'user_banned',
    ACCOUNT_DELETED: 'account_deleted',
    ESCALATED_TO_ADMIN: 'escalated_to_admin',
    ESCALATED_TO_LEGAL: 'escalated_to_legal',
    REPORT_DISMISSED: 'report_dismissed',
    REPORT_MERGED: 'report_merged',
    REPORT_DUPLICATE: 'report_duplicate',
  },

  // Report resolution types
  RESOLUTION: {
    RESOLVED: 'resolved',
    DISMISSED: 'dismissed',
    ESCALATED: 'escalated',
    MERGED: 'merged',
    DUPLICATE: 'duplicate',
  },

  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },

  // Cache settings
  CACHE: {
    TTL_SEC: 300, // 5 minutes
    PREFIX: 'reports',
    STATS_TTL_SEC: 3600, // 1 hour
  },

  // Auto-resolution settings
  AUTO_RESOLUTION: {
    SPAM_THRESHOLD: 5, // Auto-resolve if 5+ reports
    DUPLICATE_THRESHOLD: 3, // Auto-merge if 3+ similar reports
    ESCALATION_THRESHOLD: 10, // Auto-escalate if 10+ reports
  },

  // Report expiration
  EXPIRATION: {
    PENDING_DAYS: 30, // Reports expire after 30 days if not resolved
    RESOLVED_DAYS: 90, // Resolved reports kept for 90 days
  },
} as const;

// Type definitions for better TypeScript support
export type ReportStatus =
  (typeof REPORT_CONSTANTS.STATUS)[keyof typeof REPORT_CONSTANTS.STATUS];

export type ReportPriority =
  (typeof REPORT_CONSTANTS.PRIORITY)[keyof typeof REPORT_CONSTANTS.PRIORITY];

export type ReportableType =
  (typeof REPORT_CONSTANTS.REPORTABLE_TYPES)[keyof typeof REPORT_CONSTANTS.REPORTABLE_TYPES];

export type ReportReason =
  (typeof REPORT_CONSTANTS.REASONS)[keyof typeof REPORT_CONSTANTS.REASONS];

export type ReportAction =
  (typeof REPORT_CONSTANTS.ACTIONS)[keyof typeof REPORT_CONSTANTS.ACTIONS];

export type ReportResolution =
  (typeof REPORT_CONSTANTS.RESOLUTION)[keyof typeof REPORT_CONSTANTS.RESOLUTION];

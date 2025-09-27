// Tag Entity Constants
export const TAG_CONSTANTS = {
  // Field lengths
  NAME_MAX_LENGTH: 64,
  SLUG_MAX_LENGTH: 80,
  DESCRIPTION_MAX_LENGTH: 500,
  COLOR_LENGTH: 7, // Hex color: #RRGGBB
  ICON_MAX_LENGTH: 100,
  META_TITLE_MAX_LENGTH: 200,
  META_DESCRIPTION_MAX_LENGTH: 300,

  // Tag status
  STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
  } as const,

  // Tag categories for organization
  CATEGORIES: {
    TECHNOLOGY: 'technology',
    LIFESTYLE: 'lifestyle',
    BUSINESS: 'business',
    EDUCATION: 'education',
    ENTERTAINMENT: 'entertainment',
    NEWS: 'news',
    TUTORIAL: 'tutorial',
    REVIEW: 'review',
    OPINION: 'opinion',
    OTHER: 'other',
  } as const,

  // Popularity thresholds
  POPULARITY: {
    MIN_USAGE_FOR_POPULAR: 10,
    MIN_USAGE_FOR_TRENDING: 50,
    MIN_USAGE_FOR_FEATURED: 100,
  } as const,

  // Cache settings
  CACHE: {
    TTL_SEC: 300, // 5 minutes
    SWR_SEC: 60, // 1 minute
    PREFIX: 'tags',
    STATS_TTL_SEC: 600, // 10 minutes
    POPULAR_TTL_SEC: 1800, // 30 minutes
  } as const,

  // Rate limiting
  RATE_LIMITS: {
    CREATE_PER_MINUTE: 5,
    UPDATE_PER_MINUTE: 10,
    DELETE_PER_MINUTE: 3,
    SEARCH_PER_MINUTE: 30,
  } as const,

  // Search and filtering
  SEARCH: {
    MIN_QUERY_LENGTH: 1,
    MAX_QUERY_LENGTH: 50,
    DEFAULT_SORT_BY: 'usage',
    SORT_OPTIONS: ['name', 'usage', 'created', 'updated'],
    MAX_SUGGESTIONS: 10,
  } as const,

  // Validation rules
  VALIDATION: {
    NAME_MIN_LENGTH: 1,
    NAME_MAX_LENGTH: 64,
    SLUG_MIN_LENGTH: 1,
    SLUG_MAX_LENGTH: 80,
    DESCRIPTION_MAX_LENGTH: 500,
    COLOR_PATTERN: /^#[0-9A-Fa-f]{6}$/,
    ICON_MAX_LENGTH: 100,
    META_TITLE_MAX_LENGTH: 200,
    META_DESCRIPTION_MAX_LENGTH: 300,
  } as const,

  // Database constraints
  DATABASE: {
    NAME_COLUMN_TYPE: 'varchar',
    SLUG_COLUMN_TYPE: 'varchar',
    DESCRIPTION_COLUMN_TYPE: 'text',
    METADATA_COLUMN_TYPE: 'jsonb',
  } as const,

  // Default colors for auto-assignment
  DEFAULT_COLORS: [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#EC4899', // Pink
    '#6B7280', // Gray
  ] as const,

  // Tag suggestions based on content
  CONTENT_SUGGESTIONS: {
    PROGRAMMING: ['javascript', 'python', 'react', 'nodejs', 'typescript'],
    DESIGN: ['ui', 'ux', 'figma', 'sketch', 'photoshop'],
    BUSINESS: ['startup', 'marketing', 'finance', 'entrepreneur', 'strategy'],
    LIFESTYLE: ['health', 'fitness', 'travel', 'food', 'fashion'],
    EDUCATION: ['tutorial', 'course', 'learning', 'study', 'tips'],
  } as const,

  // SEO settings
  SEO: {
    DEFAULT_META_TITLE_TEMPLATE: '{tagName} - Articles and Stories',
    DEFAULT_META_DESCRIPTION_TEMPLATE:
      'Discover articles and stories about {tagName}. Read the latest posts and insights.',
    MAX_META_TITLE_LENGTH: 200,
    MAX_META_DESCRIPTION_LENGTH: 300,
  } as const,

  // Analytics and metrics
  METRICS: {
    TAG_CREATION: 'tag.creation',
    TAG_USAGE: 'tag.usage',
    TAG_SEARCH: 'tag.search',
    TAG_VIEW: 'tag.view',
  } as const,
} as const;

// Type exports
export type TagStatus =
  (typeof TAG_CONSTANTS.STATUS)[keyof typeof TAG_CONSTANTS.STATUS];
export type TagCategory =
  (typeof TAG_CONSTANTS.CATEGORIES)[keyof typeof TAG_CONSTANTS.CATEGORIES];
export type TagSortOption = (typeof TAG_CONSTANTS.SEARCH.SORT_OPTIONS)[number];

/**
 * Badge system constants and enums
 * Based on Discord's badge system with additional custom badges
 */

// Badge types similar to Discord's system
export enum BadgeType {
  // Common badges (free or subscription-based)
  NITRO_SUBSCRIBER = 'nitro_subscriber',
  SERVER_BOOSTING = 'server_boosting',
  QUEST_BADGE = 'quest_badge',
  ACTIVE_DEVELOPER = 'active_developer',

  // Paid badges
  ORBS_APPRENTICE = 'orbs_apprentice',

  // Rare badges (exclusive or hard to obtain)
  BUG_HUNTER = 'bug_hunter',
  GOLD_BUG_HUNTER = 'gold_bug_hunter',
  DISCORD_STAFF = 'discord_staff',

  // Unobtainable badges (legacy)
  EARLY_SUPPORTER = 'early_supporter',
  EARLY_VERIFIED_BOT_DEVELOPER = 'early_verified_bot_developer',
  PARTNERED_SERVER_OWNER = 'partnered_server_owner',
  HYPESQUAD_BALANCE = 'hypesquad_balance',
  HYPESQUAD_BRAVERY = 'hypesquad_bravery',
  HYPESQUAD_BRILLIANCE = 'hypesquad_brilliance',
  HYPESQUAD_EVENTS = 'hypesquad_events',
  MODERATOR_PROGRAMS_ALUMNI = 'moderator_programs_alumni',
  LEGACY_USERNAME = 'legacy_username',
  CLOWN_BADGE = 'clown_badge',

  // App badges
  SUPPORTS_COMMANDS = 'supports_commands',
  PREMIUM_APP = 'premium_app',
  USES_AUTOMOD = 'uses_automod',

  // Custom badges for the platform
  CONTENT_CREATOR = 'content_creator',
  COMMUNITY_MODERATOR = 'community_moderator',
  EARLY_ADOPTER = 'early_adopter',
  BETA_TESTER = 'beta_tester',
  CONTRIBUTOR = 'contributor',
  VERIFIED_USER = 'verified_user',
  PREMIUM_USER = 'premium_user',
  ORGANIZATION_MEMBER = 'organization_member',
  ORGANIZATION_ADMIN = 'organization_admin',
  ORGANIZATION_OWNER = 'organization_owner',
  ARTICLE_AUTHOR = 'article_author',
  COMMENT_MODERATOR = 'comment_moderator',
  REACTION_LEADER = 'reaction_leader',
  SHARE_CHAMPION = 'share_champion',
  BOOKMARK_COLLECTOR = 'bookmark_collector',
  FOLLOW_INFLUENCER = 'follow_influencer',
  NOTIFICATION_MASTER = 'notification_master',
  QR_CODE_EXPERT = 'qr_code_expert',
  STICKER_CREATOR = 'sticker_creator',
  TAG_MASTER = 'tag_master',
  REPORT_RESPONDER = 'report_responder',
  ANALYTICS_EXPERT = 'analytics_expert',
  WORKER_CONTRIBUTOR = 'worker_contributor',
}

// Badge categories for organization
export enum BadgeCategory {
  COMMON = 'common',
  PAID = 'paid',
  RARE = 'rare',
  UNOBTAINABLE = 'unobtainable',
  APP = 'app',
  CUSTOM = 'custom',
  ACHIEVEMENT = 'achievement',
  STATUS = 'status',
  ROLE = 'role',
}

// Badge rarity levels
export enum BadgeRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
  MYTHIC = 'mythic',
}

// Badge status
export enum BadgeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  HIDDEN = 'hidden',
  DISCONTINUED = 'discontinued',
}

// Entity types that can have badges (polymorphic relationship)
export enum BadgeEntityType {
  USER = 'user',
  ARTICLE = 'article',
  COMMENT = 'comment',
  ORGANIZATION = 'organization',
  MEDIA = 'media',
  NOTIFICATION = 'notification',
  QR_TICKET = 'qr_ticket',
  STICKER = 'sticker',
  TAG = 'tag',
  REPORT = 'report',
  SHARE = 'share',
  BOOKMARK = 'bookmark',
  REACTION = 'reaction',
  FOLLOW = 'follow',
  PERMISSION = 'permission',
  RATE_LIMIT = 'rate_limit',
  ANALYTICS = 'analytics',
  WORKER = 'worker',
}

// Badge assignment status
export enum BadgeAssignmentStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
}

// Badge constants
export const BADGE_CONSTANTS = {
  // Name constraints
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  ICON_URL_MAX_LENGTH: 2048,

  // Display constraints
  DISPLAY_ORDER_MIN: 0,
  DISPLAY_ORDER_MAX: 9999,

  // Badge limits
  MAX_BADGES_PER_ENTITY: 50,
  MAX_BADGES_PER_USER: 100,

  // Cache settings
  CACHE_TTL_SEC: 300, // 5 minutes
  CACHE_SWR_SEC: 60, // 1 minute

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// Badge type to category mapping
export const BADGE_TYPE_CATEGORY_MAP: Record<BadgeType, BadgeCategory> = {
  // Common badges
  [BadgeType.NITRO_SUBSCRIBER]: BadgeCategory.COMMON,
  [BadgeType.SERVER_BOOSTING]: BadgeCategory.COMMON,
  [BadgeType.QUEST_BADGE]: BadgeCategory.COMMON,
  [BadgeType.ACTIVE_DEVELOPER]: BadgeCategory.COMMON,

  // Paid badges
  [BadgeType.ORBS_APPRENTICE]: BadgeCategory.PAID,

  // Rare badges
  [BadgeType.BUG_HUNTER]: BadgeCategory.RARE,
  [BadgeType.GOLD_BUG_HUNTER]: BadgeCategory.RARE,
  [BadgeType.DISCORD_STAFF]: BadgeCategory.RARE,

  // Unobtainable badges
  [BadgeType.EARLY_SUPPORTER]: BadgeCategory.UNOBTAINABLE,
  [BadgeType.EARLY_VERIFIED_BOT_DEVELOPER]: BadgeCategory.UNOBTAINABLE,
  [BadgeType.PARTNERED_SERVER_OWNER]: BadgeCategory.UNOBTAINABLE,
  [BadgeType.HYPESQUAD_BALANCE]: BadgeCategory.UNOBTAINABLE,
  [BadgeType.HYPESQUAD_BRAVERY]: BadgeCategory.UNOBTAINABLE,
  [BadgeType.HYPESQUAD_BRILLIANCE]: BadgeCategory.UNOBTAINABLE,
  [BadgeType.HYPESQUAD_EVENTS]: BadgeCategory.UNOBTAINABLE,
  [BadgeType.MODERATOR_PROGRAMS_ALUMNI]: BadgeCategory.UNOBTAINABLE,
  [BadgeType.LEGACY_USERNAME]: BadgeCategory.UNOBTAINABLE,
  [BadgeType.CLOWN_BADGE]: BadgeCategory.UNOBTAINABLE,

  // App badges
  [BadgeType.SUPPORTS_COMMANDS]: BadgeCategory.APP,
  [BadgeType.PREMIUM_APP]: BadgeCategory.APP,
  [BadgeType.USES_AUTOMOD]: BadgeCategory.APP,

  // Custom badges
  [BadgeType.CONTENT_CREATOR]: BadgeCategory.CUSTOM,
  [BadgeType.COMMUNITY_MODERATOR]: BadgeCategory.CUSTOM,
  [BadgeType.EARLY_ADOPTER]: BadgeCategory.CUSTOM,
  [BadgeType.BETA_TESTER]: BadgeCategory.CUSTOM,
  [BadgeType.CONTRIBUTOR]: BadgeCategory.CUSTOM,
  [BadgeType.VERIFIED_USER]: BadgeCategory.CUSTOM,
  [BadgeType.PREMIUM_USER]: BadgeCategory.CUSTOM,
  [BadgeType.ORGANIZATION_MEMBER]: BadgeCategory.CUSTOM,
  [BadgeType.ORGANIZATION_ADMIN]: BadgeCategory.CUSTOM,
  [BadgeType.ORGANIZATION_OWNER]: BadgeCategory.CUSTOM,
  [BadgeType.ARTICLE_AUTHOR]: BadgeCategory.CUSTOM,
  [BadgeType.COMMENT_MODERATOR]: BadgeCategory.CUSTOM,
  [BadgeType.REACTION_LEADER]: BadgeCategory.CUSTOM,
  [BadgeType.SHARE_CHAMPION]: BadgeCategory.CUSTOM,
  [BadgeType.BOOKMARK_COLLECTOR]: BadgeCategory.CUSTOM,
  [BadgeType.FOLLOW_INFLUENCER]: BadgeCategory.CUSTOM,
  [BadgeType.NOTIFICATION_MASTER]: BadgeCategory.CUSTOM,
  [BadgeType.QR_CODE_EXPERT]: BadgeCategory.CUSTOM,
  [BadgeType.STICKER_CREATOR]: BadgeCategory.CUSTOM,
  [BadgeType.TAG_MASTER]: BadgeCategory.CUSTOM,
  [BadgeType.REPORT_RESPONDER]: BadgeCategory.CUSTOM,
  [BadgeType.ANALYTICS_EXPERT]: BadgeCategory.CUSTOM,
  [BadgeType.WORKER_CONTRIBUTOR]: BadgeCategory.CUSTOM,
};

// Badge type to rarity mapping
export const BADGE_TYPE_RARITY_MAP: Record<BadgeType, BadgeRarity> = {
  // Common badges
  [BadgeType.NITRO_SUBSCRIBER]: BadgeRarity.COMMON,
  [BadgeType.SERVER_BOOSTING]: BadgeRarity.COMMON,
  [BadgeType.QUEST_BADGE]: BadgeRarity.COMMON,
  [BadgeType.ACTIVE_DEVELOPER]: BadgeRarity.COMMON,

  // Paid badges
  [BadgeType.ORBS_APPRENTICE]: BadgeRarity.UNCOMMON,

  // Rare badges
  [BadgeType.BUG_HUNTER]: BadgeRarity.RARE,
  [BadgeType.GOLD_BUG_HUNTER]: BadgeRarity.EPIC,
  [BadgeType.DISCORD_STAFF]: BadgeRarity.LEGENDARY,

  // Unobtainable badges
  [BadgeType.EARLY_SUPPORTER]: BadgeRarity.LEGENDARY,
  [BadgeType.EARLY_VERIFIED_BOT_DEVELOPER]: BadgeRarity.EPIC,
  [BadgeType.PARTNERED_SERVER_OWNER]: BadgeRarity.LEGENDARY,
  [BadgeType.HYPESQUAD_BALANCE]: BadgeRarity.RARE,
  [BadgeType.HYPESQUAD_BRAVERY]: BadgeRarity.RARE,
  [BadgeType.HYPESQUAD_BRILLIANCE]: BadgeRarity.RARE,
  [BadgeType.HYPESQUAD_EVENTS]: BadgeRarity.EPIC,
  [BadgeType.MODERATOR_PROGRAMS_ALUMNI]: BadgeRarity.EPIC,
  [BadgeType.LEGACY_USERNAME]: BadgeRarity.LEGENDARY,
  [BadgeType.CLOWN_BADGE]: BadgeRarity.MYTHIC,

  // App badges
  [BadgeType.SUPPORTS_COMMANDS]: BadgeRarity.COMMON,
  [BadgeType.PREMIUM_APP]: BadgeRarity.UNCOMMON,
  [BadgeType.USES_AUTOMOD]: BadgeRarity.RARE,

  // Custom badges
  [BadgeType.CONTENT_CREATOR]: BadgeRarity.UNCOMMON,
  [BadgeType.COMMUNITY_MODERATOR]: BadgeRarity.RARE,
  [BadgeType.EARLY_ADOPTER]: BadgeRarity.EPIC,
  [BadgeType.BETA_TESTER]: BadgeRarity.RARE,
  [BadgeType.CONTRIBUTOR]: BadgeRarity.UNCOMMON,
  [BadgeType.VERIFIED_USER]: BadgeRarity.UNCOMMON,
  [BadgeType.PREMIUM_USER]: BadgeRarity.UNCOMMON,
  [BadgeType.ORGANIZATION_MEMBER]: BadgeRarity.COMMON,
  [BadgeType.ORGANIZATION_ADMIN]: BadgeRarity.RARE,
  [BadgeType.ORGANIZATION_OWNER]: BadgeRarity.EPIC,
  [BadgeType.ARTICLE_AUTHOR]: BadgeRarity.UNCOMMON,
  [BadgeType.COMMENT_MODERATOR]: BadgeRarity.RARE,
  [BadgeType.REACTION_LEADER]: BadgeRarity.UNCOMMON,
  [BadgeType.SHARE_CHAMPION]: BadgeRarity.UNCOMMON,
  [BadgeType.BOOKMARK_COLLECTOR]: BadgeRarity.UNCOMMON,
  [BadgeType.FOLLOW_INFLUENCER]: BadgeRarity.RARE,
  [BadgeType.NOTIFICATION_MASTER]: BadgeRarity.UNCOMMON,
  [BadgeType.QR_CODE_EXPERT]: BadgeRarity.RARE,
  [BadgeType.STICKER_CREATOR]: BadgeRarity.UNCOMMON,
  [BadgeType.TAG_MASTER]: BadgeRarity.UNCOMMON,
  [BadgeType.REPORT_RESPONDER]: BadgeRarity.RARE,
  [BadgeType.ANALYTICS_EXPERT]: BadgeRarity.RARE,
  [BadgeType.WORKER_CONTRIBUTOR]: BadgeRarity.UNCOMMON,
};

// Badge display order mapping (lower numbers appear first)
export const BADGE_DISPLAY_ORDER: Record<BadgeType, number> = {
  // Staff badges (highest priority)
  [BadgeType.DISCORD_STAFF]: 1,
  [BadgeType.GOLD_BUG_HUNTER]: 2,
  [BadgeType.BUG_HUNTER]: 3,
  [BadgeType.MODERATOR_PROGRAMS_ALUMNI]: 4,

  // Partner badges
  [BadgeType.PARTNERED_SERVER_OWNER]: 10,
  [BadgeType.EARLY_VERIFIED_BOT_DEVELOPER]: 11,

  // HypeSquad badges
  [BadgeType.HYPESQUAD_EVENTS]: 20,
  [BadgeType.HYPESQUAD_BALANCE]: 21,
  [BadgeType.HYPESQUAD_BRAVERY]: 22,
  [BadgeType.HYPESQUAD_BRILLIANCE]: 23,

  // Legacy badges
  [BadgeType.EARLY_SUPPORTER]: 30,
  [BadgeType.LEGACY_USERNAME]: 31,
  [BadgeType.CLOWN_BADGE]: 32,

  // Nitro badges
  [BadgeType.NITRO_SUBSCRIBER]: 40,
  [BadgeType.SERVER_BOOSTING]: 41,

  // App badges
  [BadgeType.PREMIUM_APP]: 50,
  [BadgeType.SUPPORTS_COMMANDS]: 51,
  [BadgeType.USES_AUTOMOD]: 52,

  // Quest badges
  [BadgeType.QUEST_BADGE]: 60,
  [BadgeType.ACTIVE_DEVELOPER]: 61,

  // Paid badges
  [BadgeType.ORBS_APPRENTICE]: 70,

  // Custom badges
  [BadgeType.ORGANIZATION_OWNER]: 100,
  [BadgeType.ORGANIZATION_ADMIN]: 101,
  [BadgeType.COMMUNITY_MODERATOR]: 102,
  [BadgeType.CONTENT_CREATOR]: 103,
  [BadgeType.VERIFIED_USER]: 104,
  [BadgeType.PREMIUM_USER]: 105,
  [BadgeType.EARLY_ADOPTER]: 106,
  [BadgeType.BETA_TESTER]: 107,
  [BadgeType.CONTRIBUTOR]: 108,
  [BadgeType.ARTICLE_AUTHOR]: 109,
  [BadgeType.COMMENT_MODERATOR]: 110,
  [BadgeType.REACTION_LEADER]: 111,
  [BadgeType.SHARE_CHAMPION]: 112,
  [BadgeType.BOOKMARK_COLLECTOR]: 113,
  [BadgeType.FOLLOW_INFLUENCER]: 114,
  [BadgeType.NOTIFICATION_MASTER]: 115,
  [BadgeType.QR_CODE_EXPERT]: 116,
  [BadgeType.STICKER_CREATOR]: 117,
  [BadgeType.TAG_MASTER]: 118,
  [BadgeType.REPORT_RESPONDER]: 119,
  [BadgeType.ANALYTICS_EXPERT]: 120,
  [BadgeType.WORKER_CONTRIBUTOR]: 121,
  [BadgeType.ORGANIZATION_MEMBER]: 200,
};

// Badge metadata for display and management
export const BADGE_METADATA: Record<
  BadgeType,
  {
    name: string;
    description: string;
    iconUrl?: string;
    isObtainable: boolean;
    isVisible: boolean;
    requirements?: string;
  }
> = {
  // Common badges
  [BadgeType.NITRO_SUBSCRIBER]: {
    name: 'Nitro Subscriber',
    description: 'Active Nitro subscription',
    isObtainable: true,
    isVisible: true,
    requirements: 'Active Nitro subscription',
  },
  [BadgeType.SERVER_BOOSTING]: {
    name: 'Server Booster',
    description: 'Actively boosting a server',
    isObtainable: true,
    isVisible: true,
    requirements: 'Server boost subscription',
  },
  [BadgeType.QUEST_BADGE]: {
    name: 'Quest Badge',
    description: 'Completed a Discord quest',
    isObtainable: true,
    isVisible: true,
    requirements: 'Complete sponsored quest',
  },
  [BadgeType.ACTIVE_DEVELOPER]: {
    name: 'Active Developer',
    description: 'Bot with recent slash commands',
    isObtainable: true,
    isVisible: true,
    requirements: 'Bot with commands used in last 30 days',
  },

  // Paid badges
  [BadgeType.ORBS_APPRENTICE]: {
    name: 'Orbs Apprentice',
    description: 'Purchased from the Shop',
    isObtainable: true,
    isVisible: true,
    requirements: 'Purchase for 120 Orbs',
  },

  // Rare badges
  [BadgeType.BUG_HUNTER]: {
    name: 'Bug Hunter',
    description: 'Discord Bug Hunter contributor',
    isObtainable: false,
    isVisible: true,
    requirements: 'Significant bug reports',
  },
  [BadgeType.GOLD_BUG_HUNTER]: {
    name: 'Gold Bug Hunter',
    description: 'Outstanding bug hunting contributions',
    isObtainable: false,
    isVisible: true,
    requirements: 'Exceptional bug hunting contributions',
  },
  [BadgeType.DISCORD_STAFF]: {
    name: 'Discord Staff',
    description: 'Discord employee',
    isObtainable: false,
    isVisible: true,
    requirements: 'Discord employee status',
  },

  // Unobtainable badges
  [BadgeType.EARLY_SUPPORTER]: {
    name: 'Early Supporter',
    description: 'Nitro subscriber before October 10, 2018',
    isObtainable: false,
    isVisible: true,
    requirements: 'Nitro before October 10, 2018',
  },
  [BadgeType.EARLY_VERIFIED_BOT_DEVELOPER]: {
    name: 'Early Verified Bot Developer',
    description: 'Verified bot in 75+ servers before August 19, 2020',
    isObtainable: false,
    isVisible: true,
    requirements: 'Verified bot in 75+ servers before August 19, 2020',
  },
  [BadgeType.PARTNERED_SERVER_OWNER]: {
    name: 'Partnered Server Owner',
    description: 'Owner of a Discord Partnered server',
    isObtainable: false,
    isVisible: true,
    requirements: 'Discord Partner Program member',
  },
  [BadgeType.HYPESQUAD_BALANCE]: {
    name: 'HypeSquad Balance',
    description: 'HypeSquad House member',
    isObtainable: false,
    isVisible: true,
    requirements: 'HypeSquad quiz completion',
  },
  [BadgeType.HYPESQUAD_BRAVERY]: {
    name: 'HypeSquad Bravery',
    description: 'HypeSquad House member',
    isObtainable: false,
    isVisible: true,
    requirements: 'HypeSquad quiz completion',
  },
  [BadgeType.HYPESQUAD_BRILLIANCE]: {
    name: 'HypeSquad Brilliance',
    description: 'HypeSquad House member',
    isObtainable: false,
    isVisible: true,
    requirements: 'HypeSquad quiz completion',
  },
  [BadgeType.HYPESQUAD_EVENTS]: {
    name: 'HypeSquad Events',
    description: 'HypeSquad Event Attendee',
    isObtainable: false,
    isVisible: true,
    requirements: 'Attend HypeSquad events',
  },
  [BadgeType.MODERATOR_PROGRAMS_ALUMNI]: {
    name: 'Moderator Programs Alumni',
    description: 'Former Certified Moderator',
    isObtainable: false,
    isVisible: true,
    requirements: 'Completed Discord Moderator Exam',
  },
  [BadgeType.LEGACY_USERNAME]: {
    name: 'Legacy Username',
    description: 'Had username with discriminator',
    isObtainable: false,
    isVisible: true,
    requirements: 'Username with #0000 format',
  },
  [BadgeType.CLOWN_BADGE]: {
    name: 'Clown Badge',
    description: 'April Fools 2024 temporary badge',
    isObtainable: false,
    isVisible: true,
    requirements: 'Obtained all 9 Loot Box rewards',
  },

  // App badges
  [BadgeType.SUPPORTS_COMMANDS]: {
    name: 'Supports Commands',
    description: 'App supports slash commands',
    isObtainable: false,
    isVisible: true,
    requirements: 'App with slash commands',
  },
  [BadgeType.PREMIUM_APP]: {
    name: 'Premium App',
    description: 'App premium instance',
    isObtainable: false,
    isVisible: true,
    requirements: 'App premium subscription',
  },
  [BadgeType.USES_AUTOMOD]: {
    name: 'Uses AutoMod',
    description: 'App with 100+ AutoMod rules',
    isObtainable: false,
    isVisible: true,
    requirements: '100+ active AutoMod rules',
  },

  // Custom badges
  [BadgeType.CONTENT_CREATOR]: {
    name: 'Content Creator',
    description: 'Creates valuable content',
    isObtainable: true,
    isVisible: true,
    requirements: 'Create popular articles or media',
  },
  [BadgeType.COMMUNITY_MODERATOR]: {
    name: 'Community Moderator',
    description: 'Helps moderate the community',
    isObtainable: true,
    isVisible: true,
    requirements: 'Moderation role assignment',
  },
  [BadgeType.EARLY_ADOPTER]: {
    name: 'Early Adopter',
    description: 'Joined the platform early',
    isObtainable: false,
    isVisible: true,
    requirements: 'Early platform registration',
  },
  [BadgeType.BETA_TESTER]: {
    name: 'Beta Tester',
    description: 'Participates in beta testing',
    isObtainable: true,
    isVisible: true,
    requirements: 'Active beta testing participation',
  },
  [BadgeType.CONTRIBUTOR]: {
    name: 'Contributor',
    description: 'Contributes to platform development',
    isObtainable: true,
    isVisible: true,
    requirements: 'Code or content contributions',
  },
  [BadgeType.VERIFIED_USER]: {
    name: 'Verified User',
    description: 'Identity verified user',
    isObtainable: true,
    isVisible: true,
    requirements: 'Identity verification process',
  },
  [BadgeType.PREMIUM_USER]: {
    name: 'Premium User',
    description: 'Premium subscription holder',
    isObtainable: true,
    isVisible: true,
    requirements: 'Active premium subscription',
  },
  [BadgeType.ORGANIZATION_MEMBER]: {
    name: 'Organization Member',
    description: 'Member of an organization',
    isObtainable: true,
    isVisible: true,
    requirements: 'Organization membership',
  },
  [BadgeType.ORGANIZATION_ADMIN]: {
    name: 'Organization Admin',
    description: 'Administrator of an organization',
    isObtainable: true,
    isVisible: true,
    requirements: 'Organization admin role',
  },
  [BadgeType.ORGANIZATION_OWNER]: {
    name: 'Organization Owner',
    description: 'Owner of an organization',
    isObtainable: true,
    isVisible: true,
    requirements: 'Organization ownership',
  },
  [BadgeType.ARTICLE_AUTHOR]: {
    name: 'Article Author',
    description: 'Publishes articles',
    isObtainable: true,
    isVisible: true,
    requirements: 'Published articles',
  },
  [BadgeType.COMMENT_MODERATOR]: {
    name: 'Comment Moderator',
    description: 'Moderates comments',
    isObtainable: true,
    isVisible: true,
    requirements: 'Comment moderation role',
  },
  [BadgeType.REACTION_LEADER]: {
    name: 'Reaction Leader',
    description: 'High reaction activity',
    isObtainable: true,
    isVisible: true,
    requirements: 'High reaction count',
  },
  [BadgeType.SHARE_CHAMPION]: {
    name: 'Share Champion',
    description: 'High sharing activity',
    isObtainable: true,
    isVisible: true,
    requirements: 'High share count',
  },
  [BadgeType.BOOKMARK_COLLECTOR]: {
    name: 'Bookmark Collector',
    description: 'Collects many bookmarks',
    isObtainable: true,
    isVisible: true,
    requirements: 'High bookmark count',
  },
  [BadgeType.FOLLOW_INFLUENCER]: {
    name: 'Follow Influencer',
    description: 'High follower count',
    isObtainable: true,
    isVisible: true,
    requirements: 'High follower count',
  },
  [BadgeType.NOTIFICATION_MASTER]: {
    name: 'Notification Master',
    description: 'Manages notifications well',
    isObtainable: true,
    isVisible: true,
    requirements: 'Notification management skills',
  },
  [BadgeType.QR_CODE_EXPERT]: {
    name: 'QR Code Expert',
    description: 'Uses QR codes effectively',
    isObtainable: true,
    isVisible: true,
    requirements: 'QR code usage',
  },
  [BadgeType.STICKER_CREATOR]: {
    name: 'Sticker Creator',
    description: 'Creates stickers',
    isObtainable: true,
    isVisible: true,
    requirements: 'Sticker creation',
  },
  [BadgeType.TAG_MASTER]: {
    name: 'Tag Master',
    description: 'Expert at tagging',
    isObtainable: true,
    isVisible: true,
    requirements: 'Tagging expertise',
  },
  [BadgeType.REPORT_RESPONDER]: {
    name: 'Report Responder',
    description: 'Responds to reports',
    isObtainable: true,
    isVisible: true,
    requirements: 'Report response role',
  },
  [BadgeType.ANALYTICS_EXPERT]: {
    name: 'Analytics Expert',
    description: 'Uses analytics effectively',
    isObtainable: true,
    isVisible: true,
    requirements: 'Analytics usage',
  },
  [BadgeType.WORKER_CONTRIBUTOR]: {
    name: 'Worker Contributor',
    description: 'Contributes to background workers',
    isObtainable: true,
    isVisible: true,
    requirements: 'Worker contribution',
  },
};

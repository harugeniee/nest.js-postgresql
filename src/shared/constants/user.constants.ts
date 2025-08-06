// User Entity Constants
export const USER_CONSTANTS = {
  // Field lengths
  NAME_MAX_LENGTH: 255,
  EMAIL_MAX_LENGTH: 255,
  PHONE_MAX_LENGTH: 65,
  PASSWORD_MAX_LENGTH: 255,
  PASSWORD_MIN_LENGTH: 6,
  OAUTH_PROVIDER_MAX_LENGTH: 50,
  OAUTH_ID_MAX_LENGTH: 255,
  OAUTH_TOKEN_MAX_LENGTH: 255,
  AUTH_METHOD_MAX_LENGTH: 20,
  // Status values
  STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending',
    SUSPENDED: 'suspended',
    REMOVED: 'removed',
  },

  // Role values
  ROLES: {
    ADMIN: 'admin',
    USER: 'user',
    MODERATOR: 'moderator',
    SUPER_ADMIN: 'super_admin',
  },

  // Gender values
  GENDER: {
    MALE: 'male',
    FEMALE: 'female',
    OTHER: 'other',
  },

  // OAuth providers
  OAUTH_PROVIDERS: {
    GOOGLE: 'google',
    FACEBOOK: 'facebook',
    GITHUB: 'github',
    TWITTER: 'twitter',
    LINKEDIN: 'linkedin',
    APPLE: 'apple',
  },

  // Authentication methods
  AUTH_METHODS: {
    EMAIL_PASSWORD: 'email_password',
    OAUTH: 'oauth',
    PHONE_OTP: 'phone_otp',
  },

  AUTH_TYPES: {
    QR_CODE: 'qr_code',
    EMAIL_PASSWORD: 'email_password',
    PHONE_OTP: 'phone_otp',
    OAUTH: 'oauth',
  },
  DEVICE_TYPES: {
    IOS: 'ios',
    ANDROID: 'android',
    WEB: 'web',
    DESKTOP: 'desktop',
  },
} as const;

// Type definitions for better TypeScript support
export type UserStatus =
  (typeof USER_CONSTANTS.STATUS)[keyof typeof USER_CONSTANTS.STATUS];
export type UserRole =
  (typeof USER_CONSTANTS.ROLES)[keyof typeof USER_CONSTANTS.ROLES];
export type UserGender =
  (typeof USER_CONSTANTS.GENDER)[keyof typeof USER_CONSTANTS.GENDER];

export type OAuthProvider =
  (typeof USER_CONSTANTS.OAUTH_PROVIDERS)[keyof typeof USER_CONSTANTS.OAUTH_PROVIDERS];

export type AuthMethod =
  (typeof USER_CONSTANTS.AUTH_METHODS)[keyof typeof USER_CONSTANTS.AUTH_METHODS];

export type AuthType =
  (typeof USER_CONSTANTS.AUTH_TYPES)[keyof typeof USER_CONSTANTS.AUTH_TYPES];

export type DeviceType =
  (typeof USER_CONSTANTS.DEVICE_TYPES)[keyof typeof USER_CONSTANTS.DEVICE_TYPES];

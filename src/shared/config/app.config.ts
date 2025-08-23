export const appConfig = () => ({
  port: Number(process.env.APP_PORT) || 3000,
  timezone: process.env.TZ || 'UTC',
  jwt: {
    secret: process.env.JWT_SECRET || 'victory_secret_key',
    accessTokenExpiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '1h',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d',
  },
  i18n: {
    fallbackLanguage: process.env.I18N_FALLBACK_LANGUAGE || 'en',
    supportedLanguages: process.env.I18N_SUPPORTED_LANGUAGES || 'en,vi',
  },
  qr: {
    hmacSecret: process.env.QR_HMAC_SECRET,
    ticketTtlSeconds: Number(process.env.QR_TICKET_TTL_SECONDS) || 180,
    grantTtlSeconds: Number(process.env.QR_GRANT_TTL_SECONDS) || 30,
  },
  cursor: {
    hmacSecret: process.env.CURSOR_HMAC_SECRET,
  },
});

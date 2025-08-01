export const appConfig = () => ({
  port: Number(process.env.APP_PORT) || 3000,
  jwt: {
    secret: process.env.JWT_SECRET || 'victory_secret_key',
    accessTokenExpiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '1h',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d',
  },
  i18n: {
    fallbackLanguage: process.env.I18N_FALLBACK_LANGUAGE || 'en',
    supportedLanguages: process.env.I18N_SUPPORTED_LANGUAGES || 'en,vi',
  },
});

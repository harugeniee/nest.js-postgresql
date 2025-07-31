export const appConfig = () => ({
  port: Number(process.env.APP_PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET,
  i18n: {
    fallbackLanguage: process.env.I18N_FALLBACK_LANGUAGE || 'en',
    supportedLanguages: process.env.I18N_SUPPORTED_LANGUAGES || 'en,vi',
  },
});

export const oauthConfig = () => ({
  kakao: {
    accessLink: process.env.KAKAO_AUTH_ACCESS_LINK,
  },
  naver: {
    accessLink: process.env.NAVER_AUTH_ACCESS_LINK,
  },
  apple: {
    authKeyUrl: process.env.APPLE_AUTH_KEY_URL,
    url: process.env.APPLE_URL,
    clientId: process.env.APPLE_CLIENT_ID,
  },
});

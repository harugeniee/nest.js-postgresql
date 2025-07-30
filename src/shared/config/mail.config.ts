export const mailConfig = () => ({
  host: process.env.MAIL_HOST,
  user: process.env.MAIL_USER,
  pass: process.env.MAIL_PASS,
  from: process.env.MAIL_FROM,
  admin: process.env.MAIL_ADMIN,
});

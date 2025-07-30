import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  APP_PORT: Joi.number().required(),
  JWT_SECRET: Joi.string().min(16).required(),

  DATABASE_TYPE: Joi.string().required(),
  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().required(),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().allow('', null),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_URL: Joi.string().required(),
  DATABASE_SYNCHRONIZE: Joi.boolean().optional().default(true),

  REDIS_URL: Joi.string().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),
  REDIS_PASSWORD: Joi.string().allow('', null),

  // KAKAO_AUTH_ACCESS_LINK: Joi.string().required(),
  // NAVER_AUTH_ACCESS_LINK: Joi.string().required(),

  // MAIL_HOST: Joi.string().required(),
  // MAIL_USER: Joi.string().required(),
  // MAIL_PASS: Joi.string().required(),
  // MAIL_FROM: Joi.string().required(),
  // MAIL_ADMIN: Joi.string().required(),

  // AWS_BUCKET_NAME: Joi.string().required(),
  // AWS_ACCESS_KEY: Joi.string().required(),
  // AWS_SECRET_KEY: Joi.string().required(),
  // AWS_REGION: Joi.string().required(),
  // AWS_ENDPOINT: Joi.string().required(),

  // APPLE_AUTH_KEY_URL: Joi.string().required(),
  // APPLE_URL: Joi.string().required(),
  // APPLE_CLIENT_ID: Joi.string().required(),
});

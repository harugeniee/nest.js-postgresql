import { config } from 'dotenv';
import { DataSource } from 'typeorm';

import { ConfigService } from '@nestjs/config';

// Load environment variables
config();

const configService = new ConfigService();

export default new DataSource({
  type: 'postgres',
  host: configService.get('DATABASE_HOST'),
  port: Number(configService.get('DATABASE_PORT')),
  username: configService.get('DATABASE_USER'),
  password: configService.get('DATABASE_PASSWORD'),
  database: configService.get('DATABASE_NAME'),
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/db/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  extra: {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
});

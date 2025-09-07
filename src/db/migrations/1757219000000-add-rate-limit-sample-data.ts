import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRateLimitSampleData1757219000000 implements MigrationInterface {
  name = 'AddRateLimitSampleData1757219000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create rate limit plans table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "plans" (
        "name" varchar(64) NOT NULL,
        "limit_per_min" integer NOT NULL,
        "ttl_sec" integer NOT NULL DEFAULT 60,
        "extra" jsonb,
        "description" text,
        "active" boolean NOT NULL DEFAULT true,
        "displayOrder" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_plans" PRIMARY KEY ("name")
      )
    `);

    // Create API keys table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "api_keys" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "key" varchar(128) NOT NULL,
        "plan" varchar(64) NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "is_whitelist" boolean NOT NULL DEFAULT false,
        "name" varchar(255),
        "ownerId" varchar(255),
        "lastUsedAt" TIMESTAMP,
        "expiresAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_api_keys" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_api_keys_key" UNIQUE ("key")
      )
    `);

    // Create IP whitelist table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ip_whitelist" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ip" inet NOT NULL,
        "description" varchar(255),
        "active" boolean NOT NULL DEFAULT true,
        "reason" varchar(100),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_ip_whitelist" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_ip_whitelist_ip" UNIQUE ("ip")
      )
    `);

    // Create rate limit policies table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rate_limit_policies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(100) NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "priority" integer NOT NULL DEFAULT 100,
        "scope" varchar(20) NOT NULL DEFAULT 'global',
        "routePattern" varchar(255),
        "strategy" varchar(20) NOT NULL DEFAULT 'tokenBucket',
        "limit" integer,
        "windowSec" integer,
        "burst" integer,
        "refillPerSec" double precision,
        "version" integer NOT NULL DEFAULT 1,
        "extra" jsonb,
        "description" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_rate_limit_policies" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_rate_limit_policies_name" UNIQUE ("name")
      )
    `);

    // Insert sample rate limit plans
    await queryRunner.query(`
      INSERT INTO "plans" ("name", "limit_per_min", "ttl_sec", "description", "active", "displayOrder") VALUES
      ('anonymous', 30, 60, 'Default plan for anonymous users - 30 requests per minute', true, 1),
      ('free', 100, 60, 'Free tier plan - 100 requests per minute', true, 2),
      ('pro', 500, 60, 'Professional plan - 500 requests per minute', true, 3),
      ('enterprise', 2000, 60, 'Enterprise plan - 2000 requests per minute', true, 4)
      ON CONFLICT ("name") DO NOTHING
    `);

    // Insert sample API keys
    await queryRunner.query(`
      INSERT INTO "api_keys" ("key", "plan", "name", "ownerId", "active", "is_whitelist") VALUES
      ('ak_free_1234567890abcdef', 'free', 'Free Tier API Key', 'user_123', true, false),
      ('ak_pro_abcdef1234567890', 'pro', 'Pro Tier API Key', 'user_456', true, false),
      ('ak_enterprise_9876543210fedcba', 'enterprise', 'Enterprise API Key', 'user_789', true, false),
      ('ak_whitelist_bypass_all_limits', 'enterprise', 'Whitelisted API Key', 'admin', true, true)
      ON CONFLICT ("key") DO NOTHING
    `);

    // Insert sample IP whitelist entries
    await queryRunner.query(`
      INSERT INTO "ip_whitelist" ("ip", "description", "reason", "active") VALUES
      ('127.0.0.1', 'Localhost development', 'development', true),
      ('::1', 'Localhost IPv6', 'development', true),
      ('192.168.1.0/24', 'Office network', 'internal', true),
      ('10.0.0.0/8', 'Internal network', 'internal', true)
      ON CONFLICT ("ip") DO NOTHING
    `);

    // Insert sample rate limit policies
    await queryRunner.query(`
      INSERT INTO "rate_limit_policies" ("name", "enabled", "priority", "scope", "strategy", "limit", "windowSec", "description") VALUES
      ('global-default', true, 50, 'global', 'fixedWindow', 100, 60, 'Global default rate limit - 100 requests per minute'),
      ('api-read-heavy', true, 80, 'route', 'tokenBucket', 200, 60, 'Heavy read operations - 200 requests per minute with token bucket'),
      ('api-write-strict', true, 90, 'route', 'fixedWindow', 20, 60, 'Write operations - 20 requests per minute'),
      ('admin-operations', true, 100, 'route', 'tokenBucket', 50, 60, 'Admin operations - 50 requests per minute with burst')
      ON CONFLICT ("name") DO NOTHING
    `);

    // Add route patterns for policies
    await queryRunner.query(`
      UPDATE "rate_limit_policies" 
      SET "routePattern" = '^GET:/api/v1/.*' 
      WHERE "name" = 'api-read-heavy'
    `);

    await queryRunner.query(`
      UPDATE "rate_limit_policies" 
      SET "routePattern" = '^(POST|PUT|DELETE):/api/v1/.*' 
      WHERE "name" = 'api-write-strict'
    `);

    await queryRunner.query(`
      UPDATE "rate_limit_policies" 
      SET "routePattern" = '^.*:/api/v1/admin/.*' 
      WHERE "name" = 'admin-operations'
    `);

    // Create indexes for better performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_plans_active" ON "plans" ("active")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_api_keys_key_active" ON "api_keys" ("key", "active")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_api_keys_plan" ON "api_keys" ("plan")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ip_whitelist_ip_active" ON "ip_whitelist" ("ip", "active")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_rate_limit_policies_enabled_priority" ON "rate_limit_policies" ("enabled", "priority")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "rate_limit_policies"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ip_whitelist"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "api_keys"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "plans"`);
  }
}

# 📘 Database Naming Conventions (v2.0 Full)

## 1. Objectives

Standardize database naming conventions to help:

* Code is easier to read, review, and query.
* Avoid confusion between developers, modules, and services.
* Convenient when scaling the system and auditing data.

---

## 2. General Rules

* **Language:** English.
* **Style:** `snake_case`.
* **Table:** plural.
* **Field:** singular.
* **Boolean:** use prefix `is_`, `has_`, `can_`.
* **Datetime:** always end with `_at`.
* **Date (without time):** always end with `_on`.
* **Don't use SQL keywords** (select, order, group…).

---

## 3. Table Naming Rules

1. **Plural:** `users`, `orders`.
2. **Categorize by prefix:**

   * `ref_` → reference table (lookup): `ref_countries`.
   * `map_` → mapping table (n-n relation): `map_user_roles`.
   * `log_` → logging/audit: `log_api_requests`.
   * `tmp_` → temporary table: `tmp_daily_report`.
3. **Default audit fields:**

   * `created_at`, `updated_at`, `deleted_at`.
   * `created_by`, `updated_by` (if needed).

---

## 4. Field Naming Rules

### 4.1 Prefixes

| Prefix          | Meaning            | Examples                     |
| --------------- | ------------------ | ------------------------- |
| `is_`           | Boolean status | `is_active`, `is_deleted` |
| `has_`          | Existence/ownership     | `has_avatar`, `has_paid`  |
| `can_`          | Permissions          | `can_edit`, `can_delete`  |
| `min_`/`max_`   | Limits           | `min_price`, `max_users`  |
| `start_`/`end_` | Time range   | `start_date`, `end_time`  |
| `src_`/`dst_`   | Source/destination         | `src_ip`, `dst_ip`        |
| `last_`         | Last occurrence            | `lastUsedAt`, `lastLoginAt` |
| `oauth_`        | OAuth related       | `oauthProvider`, `oauthId` |

### 4.2 Suffixes

| Suffix      | Meaning                | Examples                         |
| ----------- | ---------------------- | ----------------------------- |
| `_id`       | Foreign key / identifier | `user_id`, `order_id`         |
| `_at`       | Datetime               | `created_at`, `deleted_at`    |
| `_on`       | Date                   | `expired_on`, `published_on`  |
| `_by`       | User who performed action          | `created_by`, `updated_by`    |
| `_count`    | Quantity               | `view_count`, `comment_count` |
| `_url`      | Link                   | `avatar_url`, `website_url`   |
| `_ip`       | IP address             | `login_ip`, `request_ip`      |
| `_code`     | Code                | `country_code`, `status_code` |
| `_key`      | Secret/token           | `api_key`, `secret_key`       |
| `_type`     | Type                   | `user_type`, `payment_type`   |
| `_status`   | Status             | `file_status`, `order_status` |
| `_name`     | Name                    | `user_name`, `file_name`      |
| `_path`     | Path              | `file_path`, `image_path`     |
| `_size`     | Size             | `file_size`, `image_size`     |
| `_length`   | Length                 | `name_length`, `desc_length`  |
| `_version`  | Version              | `schema_version`, `api_version` |
| `_metadata` | Additional data        | `file_metadata`, `user_metadata` |
| `_extra`    | Extra information         | `plan_extra`, `config_extra`  |

---

## 5. Index Naming Rules

* Format: `idx_<table>_<field1>_<field2>`
* Examples:

  * `idx_users_email`
  * `idx_orders_user_id_created_at`
* Unique index: add `_uniq`.

  * `idx_users_email_uniq`
* Composite index: sort by query priority.

  * `idx_users_status_role` (status first because more filtering)
  * `idx_qr_tickets_status_expires_at`
* Foreign key index: `idx_<table>_<fk_field>`.

  * `idx_api_keys_plan_id`
  * `idx_rate_limit_logs_api_key`

---

## 6. Constraint Naming Rules

* **Primary key:** `pk_<table>` → `pk_users`
* **Foreign key:** `fk_<child_table>_<parent_table>` → `fk_orders_users`
* **Foreign key with specific column:** `fk_<child_table>_<parent_table>_<column>` → `fk_api_keys_plans_plan_id`
* **Unique constraint:** `uq_<table>_<field>` → `uq_users_email`
* **Composite unique constraint:** `uq_<table>_<field1>_<field2>` → `uq_users_oauth_provider_oauth_id`
* **Check constraint:** `ck_<table>_<rule>` → `ck_orders_amount_positive`
* **Enum check constraint:** `ck_<table>_<field>_valid` → `ck_users_status_valid`

---

## 7. Sequence Naming Rules

* Format: `seq_<table>_<field>`
* Example: `seq_orders_order_id`

---

## 8. View & Materialized View Naming Rules

* View: `vw_<business_name>` → `vw_active_users`
* Materialized view: `mvw_<business_name>` → `mvw_monthly_revenue`

---

## 9. Trigger Naming Rules

* Format: `trg_<table>_<action>`
* Examples:

  * `trg_users_before_insert`
  * `trg_orders_after_update`

---

## 10. Function / Stored Procedure Naming Rules

* Format: `<action>_<object>`
* Examples:

  * `get_user_by_email`
  * `calculate_order_total`

---

## 11. Enum Naming Rules (PostgreSQL)

* Enum type: `enum_<table>_<field>`
* Enum value: lowercase, `snake_case`.
* Example:

  ```sql
  CREATE TYPE enum_orders_status AS ENUM ('pending', 'completed', 'canceled');
  ```

---

## 12. ID and UUID Naming Rules

### 12.1 Primary Key Patterns

* **Snowflake ID:** Use `id` (bigint) for primary key
* **UUID:** Use `uuid` for external references and API responses
* **Composite Key:** Avoid, prefer single primary key

### 12.2 Foreign Key Patterns

* **Format:** `<parent_table>_id` or `<parent_table>Id`
* **Examples:**
  * `user_id` → references `users.id`
  * `plan_id` → references `plans.id`
  * `created_by_id` → references `users.id`

---

## 13. JSON/JSONB Field Naming Rules

* **Metadata fields:** `metadata` (JSONB for structured data)
* **Extra/Config fields:** `extra` (JSONB for configuration)
* **Payload fields:** `payload` (JSONB for dynamic data)
* **Settings fields:** `settings` (JSONB for user preferences)

**Examples:**
```sql
-- File metadata
metadata JSONB -- { "width": 1920, "height": 1080, "format": "jpg" }

-- Plan configuration
extra JSONB -- { "burst": 100, "weight": 1.5, "whitelist": true }

-- QR ticket payload
payload JSONB -- { "action": "login", "redirect": "/dashboard" }
```

---

## 14. Soft Delete and Versioning Naming Rules

### 14.1 Soft Delete Fields

* **Deleted timestamp:** `deleted_at` (timestamp, nullable)
* **Deleted by:** `deleted_by` (user_id, nullable)
* **Delete reason:** `delete_reason` (varchar, nullable)

### 14.2 Versioning Fields

* **Version number:** `version` (integer, default 1)
* **Schema version:** `schema_version` (varchar, for migration tracking)
* **API version:** `api_version` (varchar, for API compatibility)

---

## 15. Network and Security Field Naming Rules

### 15.1 IP Address Fields

* **Client IP:** `ip` (inet type for PostgreSQL)
* **Source IP:** `src_ip` (varchar(45) for IPv4/IPv6)
* **Destination IP:** `dst_ip` (varchar(45))
* **Whitelist IP:** `whitelist_ip` (inet type)

### 15.2 Security Fields

* **API Key:** `api_key` (varchar, hashed in production)
* **Secret Key:** `secret_key` (varchar, encrypted)
* **Token:** `token` (varchar, for temporary access)
* **Session ID:** `session_id` (varchar, for web sessions)

---

## 16. Audit and Logging Field Naming Rules

### 16.1 Audit Fields (default in BaseEntity)

* **Created:** `created_at`, `created_by`
* **Updated:** `updated_at`, `updated_by`
* **Deleted:** `deleted_at`, `deleted_by`

### 16.2 Logging Fields

* **Request tracking:** `request_id` (varchar, unique per request)
* **User agent:** `user_agent` (text)
* **Referer:** `referer` (varchar)
* **Route key:** `route_key` (varchar, method:path format)

---

## 17. Enum and Constants Naming Rules

### 17.1 Enum Type Naming

* **Format:** `enum_<table>_<field>`
* **Examples:**
  * `enum_users_status` → ('active', 'inactive', 'suspended')
  * `enum_orders_status` → ('pending', 'completed', 'canceled')
  * `enum_files_type` → ('image', 'document', 'video')

### 17.2 Enum Value Naming

* **Format:** lowercase, snake_case
* **Examples:**
  * `active`, `inactive`, `suspended`
  * `pending`, `completed`, `canceled`
  * `fixed_window`, `sliding_window`, `token_bucket`

---

## 18. Table Relationship Naming Rules

### 18.1 Junction Tables (Many-to-Many)

* **Format:** `map_<table1>_<table2>`
* **Examples:**
  * `map_user_roles` (users ↔ roles)
  * `map_plan_features` (plans ↔ features)

### 18.2 Log Tables

* **Format:** `log_<business_concept>`
* **Examples:**
  * `log_api_requests`
  * `log_rate_limits`
  * `log_user_actions`

### 18.3 Temporary Tables

* **Format:** `tmp_<purpose>`
* **Examples:**
  * `tmp_daily_reports`
  * `tmp_batch_processing`

---

## 19. Performance and Optimization Naming Rules

### 19.1 Partial Indexes

* **Format:** `idx_<table>_<field>_<condition>`
* **Examples:**
  * `idx_users_email_active` (only index users with status = 'active')
  * `idx_orders_amount_paid` (only index paid orders)

### 19.2 Expression Indexes

* **Format:** `idx_<table>_<expression>`
* **Examples:**
  * `idx_users_lower_email` (LOWER(email))
  * `idx_orders_date_trunc` (DATE_TRUNC('month', created_at))

---

## 20. Special Rules for NestJS + TypeORM + PostgreSQL

### 20.1 BaseEntity Pattern

All entities must extend from `BaseEntityCustom` with these fields:

```typescript
export abstract class BaseEntityCustom extends BaseEntity {
  @PrimaryColumn('bigint')
  id!: string;                    // Snowflake ID

  @Index({ unique: true })
  @Column('uuid', { generated: 'uuid' })
  uuid!: string;                  // UUID for external references

  @Index()
  @CreateDateColumn({ precision: 6 })
  createdAt!: Date;               // Creation timestamp

  @Index()
  @UpdateDateColumn({ precision: 6 })
  updatedAt!: Date;               // Update timestamp

  @Index()
  @DeleteDateColumn({ precision: 6 })
  deletedAt!: Date | null;        // Soft delete timestamp

  @VersionColumn({ default: 1 })
  version!: number;               // Optimistic locking
}
```

### 20.2 Entity Decorator Patterns

```typescript
@Entity({ name: 'table_name' })  // Explicit table name
@Index(['field1', 'field2'])     // Composite index
@Index(['field'], { unique: true }) // Unique index
export class EntityName extends BaseEntityCustom {
  // Entity fields...
}
```

### 20.3 Column Patterns

```typescript
// Enum columns
@Column({
  type: 'enum',
  enum: CONSTANTS.STATUS,
  default: CONSTANTS.STATUS.ACTIVE,
})
status: StatusType;

// JSONB columns
@Column('jsonb', { nullable: true })
metadata?: Record<string, unknown>;

// Foreign key columns
@Column({ nullable: true })
userId?: string;

@ManyToOne(() => User, { nullable: true })
@JoinColumn({ name: 'userId', referencedColumnName: 'id' })
user: User;
```

### 20.4 Index Patterns for Performance

```typescript
// Single field index
@Index()
@Column('varchar')
email: string;

// Unique index
@Index({ unique: true })
@Column('varchar')
username: string;

// Composite index
@Index(['status', 'role'])
@Index(['oauthProvider', 'oauthId'], { unique: true })
```

---

## 21. Pre-commit Database Checklist

### 21.1 Naming Conventions
* [ ] Names follow `snake_case`.
* [ ] Tables are plural.
* [ ] Boolean fields use `is_`/`has_`/`can_`.
* [ ] Foreign keys follow `<parent_table>_id` format.
* [ ] Index/constraint/sequence/view names follow correct format.
* [ ] Enum values are clear, not abbreviated.

### 21.2 Required Fields
* [ ] Has `created_at`, `updated_at`, `deleted_at`.
* [ ] Has `id` (bigint) and `uuid` (uuid) for primary key.
* [ ] Has `version` for optimistic locking.
* [ ] JSONB fields have appropriate names (`metadata`, `extra`, `payload`).

### 21.3 Performance & Security
* [ ] Indexes for foreign keys.
* [ ] Indexes for frequently queried fields.
* [ ] Sensitive fields (passwords, keys) are hashed/encrypted.
* [ ] IP addresses use `inet` type for PostgreSQL.

### 21.4 Data Integrity
* [ ] Constraints follow correct naming format.
* [ ] Enum values are consistent with business logic.
* [ ] Foreign key relationships are correct.
* [ ] Soft delete fields are nullable.

### 21.5 Documentation
* [ ] Comments for complex fields.
* [ ] Enum values have descriptions.
* [ ] JSONB fields have example structures.

### 21.6 NestJS + TypeORM Specific
* [ ] Entity extends from `BaseEntityCustom`.
* [ ] Uses decorators correctly (`@Entity`, `@Column`, `@Index`).
* [ ] Foreign key relationships with `@ManyToOne`, `@OneToMany`.
* [ ] Enum columns use constants from shared folder.
* [ ] JSONB columns have proper typing (`Record<string, unknown>`).

---

## 22. Changelog

### v2.0 (2024-12-19)
* ✅ **Added:** UUID and Snowflake ID patterns
* ✅ **Added:** JSONB field naming conventions
* ✅ **Added:** Soft delete and versioning patterns
* ✅ **Added:** Network and security field patterns
* ✅ **Added:** Audit and logging field patterns
* ✅ **Added:** Enhanced enum naming patterns
* ✅ **Added:** Table relationship naming patterns
* ✅ **Added:** Performance optimization patterns
* ✅ **Added:** NestJS + TypeORM specific patterns
* ✅ **Added:** Comprehensive checklist with 6 categories
* ✅ **Enhanced:** Index naming with composite and foreign key patterns
* ✅ **Enhanced:** Constraint naming with detailed patterns
* ✅ **Enhanced:** Field suffix patterns with 15+ new suffixes

### v1.1 (Previous)
* Basic naming conventions
* Table, field, index, constraint patterns
* Enum and function naming

##### Remember: These conventions exist to make our code more readable, maintainable, and less error-prone. When in doubt, prioritize clarity and consistency over brevity. Happy coding!

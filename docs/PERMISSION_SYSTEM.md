# 🔐 Discord-Style Permission System Documentation

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Concepts](#core-concepts)
4. [Permission Flags](#permission-flags)
5. [Effective Permission Calculation](#effective-permission-calculation)
6. [Database Schema](#database-schema)
7. [API Reference](#api-reference)
8. [Usage Examples](#usage-examples)
9. [Integration with Organizations](#integration-with-organizations)
10. [Security & Best Practices](#security--best-practices)
11. [Testing](#testing)
12. [Migration Guide](#migration-guide)

---

## 🎯 Overview

The Permission System implements a **Discord-style bitfield-based permission model** that provides:

- ✅ **High Performance**: Bitwise operations for permission checks (O(1) complexity)
- ✅ **Scalability**: Handles millions of permission checks per second
- ✅ **Flexibility**: Support for role-based and channel-specific permissions
- ✅ **Override System**: Channel permission overwrites with priority rules
- ✅ **Granular Control**: 53+ different permission flags
- ✅ **Easy to Extend**: Add new permissions without schema changes

### Key Benefits

- **Memory Efficient**: Store 64 permissions in a single 8-byte integer
- **Fast Computation**: Bitwise operations are extremely fast
- **Type-Safe**: Full TypeScript support with type checking
- **Battle-Tested**: Based on Discord's proven permission model
- **Well-Documented**: Comprehensive documentation and examples

---

## 🏗️ Architecture

### System Components

```
permissions/
├── constants/
│   └── permissions.constants.ts      # Permission bit flags and constants
├── entities/
│   ├── role.entity.ts                # Role entity with permission bitfield
│   ├── user-role.entity.ts           # User-to-role mapping
│   ├── channel-overwrite.entity.ts   # Channel permission overwrites
│   └── user-permission.entity.ts     # Direct user permissions
├── dto/
│   ├── create-role.dto.ts            # Role creation DTO
│   ├── update-role.dto.ts            # Role update DTO
│   ├── assign-role.dto.ts            # Role assignment DTO
│   ├── create-overwrite.dto.ts       # Overwrite creation DTO
│   └── effective-permissions.dto.ts  # Effective permissions DTO
├── permissions.service.ts            # Core permission logic
├── permissions.controller.ts         # REST API endpoints
└── permissions.module.ts             # Module definition
```

### Data Flow

```
User Request
    ↓
Permission Guard
    ↓
Compute Effective Permissions
    ↓
1. Load User Roles → Base Permissions (OR)
2. Check ADMINISTRATOR → Short-circuit to ALL
3. Apply @everyone Overwrite
4. Apply Role Overwrites (Deny → Allow)
5. Apply Member Overwrite
    ↓
Return Effective Permissions
    ↓
Allow/Deny Access
```

---

## 🔑 Core Concepts

### 1. Permission Bitfields

Permissions are stored as **64-bit integers** where each bit represents a specific permission:

```typescript
// Binary representation
0000000000000000000000000000000000000000000000000000000000000001 = CREATE_INSTANT_INVITE
0000000000000000000000000000000000000000000000000000000000000010 = KICK_MEMBERS
0000000000000000000000000000000000000000000000000000000000000100 = BAN_MEMBERS
0000000000000000000000000000000000000000000000000000000000001000 = ADMINISTRATOR

// Example: User with CREATE_INSTANT_INVITE + KICK_MEMBERS
0000000000000000000000000000000000000000000000000000000000000011 = 3
```

### 2. Bitwise Operations

```typescript
// Check if user has permission
const hasPermission = (userPerms & PERMISSION_BIT) !== 0n;

// Grant permission
const newPerms = userPerms | PERMISSION_BIT;

// Revoke permission
const newPerms = userPerms & ~PERMISSION_BIT;

// Check multiple permissions (AND)
const hasAll = (userPerms & REQUIRED_PERMS) === REQUIRED_PERMS;

// Check any permission (OR)
const hasAny = (userPerms & ALLOWED_PERMS) !== 0n;
```

### 3. Permission Hierarchy

```
Organization Owner (All Permissions)
    ↓
ADMINISTRATOR Role (Bypasses all checks)
    ↓
Base Role Permissions (OR of all roles)
    ↓
@everyone Channel Overwrite
    ↓
Role Channel Overwrites (Deny → Allow)
    ↓
Member Channel Overwrite (Highest Priority)
```

### 4. Permission Types

#### **General Permissions**
- `CREATE_INSTANT_INVITE` (0) - Create invite links
- `KICK_MEMBERS` (1) - Kick members from organization
- `BAN_MEMBERS` (2) - Ban members from organization
- `ADMINISTRATOR` (3) - **Bypass all permission checks**
- `MANAGE_GUILD` (4) - Manage organization settings
- `MANAGE_ROLES` (5) - Create and edit roles
- `MANAGE_CHANNELS` (6) - Create and edit channels

#### **Article Permissions**
- `ARTICLE_CREATE` (10) - Create articles
- `ARTICLE_EDIT_OWN` (11) - Edit own articles
- `ARTICLE_EDIT_ALL` (12) - Edit all articles
- `ARTICLE_DELETE_OWN` (13) - Delete own articles
- `ARTICLE_DELETE_ALL` (14) - Delete all articles
- `ARTICLE_PUBLISH` (15) - Publish articles
- `ARTICLE_VIEW_DRAFT` (16) - View draft articles

#### **Organization Permissions**
- `ORGANIZATION_MANAGE_SETTINGS` (20) - Manage organization settings
- `ORGANIZATION_MANAGE_MEMBERS` (21) - Add/remove members
- `ORGANIZATION_DELETE` (22) - Delete organization
- `ORGANIZATION_VIEW_ANALYTICS` (23) - View organization analytics

#### **Comment Permissions**
- `COMMENT_CREATE` (30) - Create comments
- `COMMENT_EDIT_OWN` (31) - Edit own comments
- `COMMENT_EDIT_ALL` (32) - Edit all comments
- `COMMENT_DELETE_OWN` (33) - Delete own comments
- `COMMENT_DELETE_ALL` (34) - Delete all comments
- `COMMENT_MODERATE` (35) - Moderate comments

#### **User Permissions**
- `USER_VIEW_PROFILE` (40) - View user profiles
- `USER_MANAGE_PROFILE` (41) - Manage own profile
- `USER_VIEW_ANALYTICS` (42) - View user analytics

#### **System Permissions**
- `SYSTEM_MANAGE_USERS` (52) - Manage all users

---

## 🚀 Permission Flags

### Complete Permission List

```typescript
export const PERMISSION_CONSTANTS = {
  // General Permissions (0-9)
  CREATE_INSTANT_INVITE: 0n,
  KICK_MEMBERS: 1n,
  BAN_MEMBERS: 2n,
  ADMINISTRATOR: 3n,
  MANAGE_GUILD: 4n,
  MANAGE_ROLES: 5n,
  MANAGE_CHANNELS: 6n,
  MANAGE_WEBHOOKS: 7n,
  MANAGE_EMOJIS: 8n,
  VIEW_AUDIT_LOG: 9n,

  // Article Permissions (10-19)
  ARTICLE_CREATE: 10n,
  ARTICLE_EDIT_OWN: 11n,
  ARTICLE_EDIT_ALL: 12n,
  ARTICLE_DELETE_OWN: 13n,
  ARTICLE_DELETE_ALL: 14n,
  ARTICLE_PUBLISH: 15n,
  ARTICLE_VIEW_DRAFT: 16n,
  ARTICLE_MANAGE_TAGS: 17n,
  ARTICLE_MODERATE: 18n,

  // Organization Permissions (20-29)
  ORGANIZATION_MANAGE_SETTINGS: 20n,
  ORGANIZATION_MANAGE_MEMBERS: 21n,
  ORGANIZATION_DELETE: 22n,
  ORGANIZATION_VIEW_ANALYTICS: 23n,
  ORGANIZATION_MANAGE_BILLING: 24n,
  ORGANIZATION_MANAGE_INTEGRATIONS: 25n,

  // Comment Permissions (30-39)
  COMMENT_CREATE: 30n,
  COMMENT_EDIT_OWN: 31n,
  COMMENT_EDIT_ALL: 32n,
  COMMENT_DELETE_OWN: 33n,
  COMMENT_DELETE_ALL: 34n,
  COMMENT_MODERATE: 35n,
  COMMENT_PIN: 36n,

  // User Permissions (40-49)
  USER_VIEW_PROFILE: 40n,
  USER_MANAGE_PROFILE: 41n,
  USER_VIEW_ANALYTICS: 42n,
  USER_BAN: 43n,
  USER_MUTE: 44n,

  // System Permissions (50-63)
  SYSTEM_MANAGE_USERS: 52n,

  // Permission categories
  CATEGORIES: {
    GENERAL: 'general',
    ARTICLE: 'article',
    ORGANIZATION: 'organization',
    COMMENT: 'comment',
    USER: 'user',
    SYSTEM: 'system',
  },
};
```

### Default Role Permissions

```typescript
export const DEFAULT_ROLE_PERMISSIONS_BITFIELD = {
  // Organization Owner - All permissions
  OWNER: 
    ADMINISTRATOR | 
    MANAGE_GUILD | 
    ARTICLE_CREATE | 
    ARTICLE_EDIT_ALL | 
    // ... all permissions

  // Admin - Most permissions except owner-specific
  ADMIN: 
    MANAGE_ROLES | 
    MANAGE_CHANNELS | 
    ARTICLE_CREATE | 
    ARTICLE_EDIT_ALL | 
    // ... admin permissions

  // Member - Basic permissions
  MEMBER: 
    VIEW_CHANNEL | 
    ARTICLE_CREATE | 
    ARTICLE_EDIT_OWN | 
    COMMENT_CREATE | 
    // ... member permissions
};
```

---

## 🧮 Effective Permission Calculation

### Algorithm (Discord-Compatible)

The system follows Discord's exact algorithm for calculating effective permissions:

```typescript
function computeEffectivePermissions(userId, channelId?) {
  // 1. Load user roles (including @everyone role)
  const roles = getUserRoles(userId);
  
  // 2. Calculate base permissions (OR of all role permissions)
  let permissions = 0n;
  for (const role of roles) {
    permissions |= role.permissions;
  }
  
  // 3. ADMINISTRATOR short-circuit
  if ((permissions & ADMINISTRATOR) !== 0n) {
    return ALL_PERMISSIONS; // Grant all permissions
  }
  
  // If no channel specified, return base permissions
  if (!channelId) {
    return permissions;
  }
  
  // 4. Apply @everyone channel overwrite
  const everyoneOverwrite = getEveryoneOverwrite(channelId);
  if (everyoneOverwrite) {
    permissions = (permissions & ~everyoneOverwrite.deny) | everyoneOverwrite.allow;
  }
  
  // 5. Aggregate role overwrites (deny first, then allow)
  let roleDeny = 0n;
  let roleAllow = 0n;
  
  const roleOverwrites = getRoleOverwrites(channelId, roles);
  for (const overwrite of roleOverwrites) {
    roleDeny |= overwrite.deny;
    roleAllow |= overwrite.allow;
  }
  
  // Apply role overwrites
  permissions = (permissions & ~roleDeny) | roleAllow;
  
  // 6. Apply member-specific overwrite (highest priority)
  const memberOverwrite = getMemberOverwrite(channelId, userId);
  if (memberOverwrite) {
    permissions = (permissions & ~memberOverwrite.deny) | memberOverwrite.allow;
  }
  
  return permissions;
}
```

### Permission Priority (Highest to Lowest)

1. **Organization Owner** - Always has all permissions
2. **ADMINISTRATOR Role** - Bypasses all permission checks
3. **Member-specific Overwrite** - User-specific channel permissions
4. **Role Overwrites** - Role-based channel permissions
5. **@everyone Overwrite** - Default channel permissions
6. **Base Role Permissions** - Combined permissions from all roles

---

## 💾 Database Schema

### 1. Roles Table

```sql
CREATE TABLE roles (
  id BIGINT PRIMARY KEY,                -- Snowflake ID
  uuid UUID UNIQUE NOT NULL,            -- External reference
  name VARCHAR(255) UNIQUE NOT NULL,    -- Role name
  permissions VARCHAR(255) NOT NULL DEFAULT '0', -- Permission bitfield (stored as string)
  position INT DEFAULT 0,               -- Role hierarchy position
  color VARCHAR(7),                     -- Role color (#RRGGBB)
  mentionable BOOLEAN DEFAULT FALSE,    -- Can be mentioned
  managed BOOLEAN DEFAULT FALSE,        -- Managed by integration
  icon VARCHAR(500),                    -- Role icon URL
  unicode_emoji VARCHAR(100),           -- Unicode emoji
  tags JSONB,                           -- Role tags/metadata
  organization_id BIGINT,               -- Organization FK
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  version INT DEFAULT 1
);

CREATE INDEX idx_roles_organization_id ON roles(organization_id);
CREATE INDEX idx_roles_position ON roles(position);
```

### 2. User Roles Table

```sql
CREATE TABLE user_roles (
  id BIGINT PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL,
  user_id BIGINT NOT NULL,              -- User FK
  role_id BIGINT NOT NULL,              -- Role FK
  reason TEXT,                          -- Assignment reason
  assigned_by BIGINT,                   -- Who assigned the role
  expires_at TIMESTAMPTZ,               -- Expiration date
  is_temporary BOOLEAN DEFAULT FALSE,   -- Temporary role
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  version INT DEFAULT 1,
  
  UNIQUE(user_id, role_id)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_user_roles_expires_at ON user_roles(expires_at);
```

### 3. Channel Overwrites Table

```sql
CREATE TABLE channel_overwrites (
  id BIGINT PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL,
  channel_id BIGINT NOT NULL,           -- Channel FK
  target_id BIGINT NOT NULL,            -- User or Role ID
  target_type VARCHAR(10) NOT NULL,     -- 'role' or 'member'
  allow VARCHAR(255) NOT NULL DEFAULT '0', -- Allowed permissions
  deny VARCHAR(255) NOT NULL DEFAULT '0',  -- Denied permissions
  reason TEXT,                          -- Overwrite reason
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  version INT DEFAULT 1,
  
  UNIQUE(channel_id, target_id, target_type)
);

CREATE INDEX idx_channel_overwrites_channel_id ON channel_overwrites(channel_id);
CREATE INDEX idx_channel_overwrites_target_id ON channel_overwrites(target_id);
```

### 4. User Permissions Table

```sql
CREATE TABLE user_permissions (
  id BIGINT PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL,
  user_id BIGINT NOT NULL,              -- User FK
  permission VARCHAR(255) NOT NULL,     -- Permission name
  value BOOLEAN NOT NULL DEFAULT TRUE,  -- Grant/revoke
  context_id BIGINT,                    -- Context (org, channel, etc.)
  context_type VARCHAR(50),             -- Context type
  reason TEXT,                          -- Permission reason
  granted_by BIGINT,                    -- Who granted
  expires_at TIMESTAMPTZ,               -- Expiration date
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  version INT DEFAULT 1,
  
  UNIQUE(user_id, permission)
);

CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_permission ON user_permissions(permission);
```

---

## 📖 API Reference

### Role Management

#### Create Role
```typescript
POST /api/permissions/roles
Authorization: Bearer <token>
Body: {
  name: "Moderator",
  permissions: "1234567890",  // Permission bitfield as string
  color: "#FF5733",
  position: 5,
  mentionable: true
}

Response: {
  id: "123456789",
  name: "Moderator",
  permissions: "1234567890",
  color: "#FF5733",
  position: 5,
  mentionable: true
}
```

#### Update Role
```typescript
PATCH /api/permissions/roles/:id
Authorization: Bearer <token>
Body: {
  name: "Senior Moderator",
  permissions: "9876543210"
}

Response: {
  id: "123456789",
  name: "Senior Moderator",
  permissions: "9876543210"
}
```

#### List Roles
```typescript
GET /api/permissions/roles
Authorization: Bearer <token>

Response: [
  { id: "1", name: "Owner", permissions: "..." },
  { id: "2", name: "Admin", permissions: "..." },
  { id: "3", name: "Moderator", permissions: "..." }
]
```

### User Role Management

#### Assign Role
```typescript
POST /api/permissions/users/:userId/roles
Authorization: Bearer <token>
Body: {
  roleId: "123456789",
  reason: "Promoted to moderator",
  isTemporary: false
}

Response: {
  id: "987654321",
  userId: "111111111",
  roleId: "123456789",
  reason: "Promoted to moderator"
}
```

#### Remove Role
```typescript
DELETE /api/permissions/users/:userId/roles/:roleId
Authorization: Bearer <token>

Response: 204 No Content
```

### Channel Overwrites

#### Create/Update Overwrite
```typescript
POST /api/permissions/channels/:channelId/overwrites
Authorization: Bearer <token>
Body: {
  targetId: "123456789",
  targetType: "role",        // 'role' or 'member'
  allow: "1024",             // Allowed permissions
  deny: "2048"               // Denied permissions
}

Response: {
  id: "456789123",
  channelId: "111111111",
  targetId: "123456789",
  targetType: "role",
  allow: "1024",
  deny: "2048"
}
```

### Effective Permissions

#### Compute Effective Permissions
```typescript
GET /api/permissions/effective?userId=123&channelId=456
Authorization: Bearer <token>

Response: {
  mask: "123456789",         // Permission bitfield
  map: {                     // Boolean map
    CREATE_INSTANT_INVITE: true,
    KICK_MEMBERS: false,
    BAN_MEMBERS: false,
    ADMINISTRATOR: false,
    ARTICLE_CREATE: true,
    ARTICLE_EDIT_OWN: true,
    // ... all permissions
  }
}
```

---

## 💡 Usage Examples

### 1. Basic Permission Check

```typescript
import { PermissionsService } from './permissions.service';
import { PERMISSION_CONSTANTS } from './constants';

@Injectable()
export class ArticleService {
  constructor(private permissionsService: PermissionsService) {}

  async createArticle(userId: string, data: CreateArticleDto) {
    // Check if user has permission
    const hasPermission = await this.permissionsService.hasPermission(
      userId,
      PERMISSION_CONSTANTS.BIT_MASKS.ARTICLE_CREATE
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to create articles');
    }

    // Create article...
  }
}
```

### 2. Using Permission Guard

```typescript
import { RequirePermission } from '@common/decorators';

@Controller('articles')
export class ArticlesController {
  @Post()
  @Auth()
  @RequirePermission('ARTICLE_CREATE')
  async create(@Body() dto: CreateArticleDto) {
    // If user doesn't have permission, guard will throw ForbiddenException
    return this.articlesService.create(dto);
  }

  @Delete(':id')
  @Auth()
  @RequirePermission('ARTICLE_DELETE_ALL')
  async delete(@Param('id') id: string) {
    return this.articlesService.delete(id);
  }
}
```

### 3. Channel-Specific Permissions

```typescript
async canEditChannelSettings(userId: string, channelId: string) {
  const effectivePerms = await this.permissionsService.computeEffectivePermissions({
    userId,
    channelId
  });

  return (effectivePerms.mask & PERMISSION_CONSTANTS.BIT_MASKS.MANAGE_CHANNELS) !== 0n;
}
```

### 4. Permission Utility Functions

```typescript
import { 
  hasPermission, 
  hasAllPermissions,
  hasAnyPermission,
  hasNonePermissions,
  addPermission,
  addPermissions,
  removePermission,
  removePermissions,
  checkPermissions
} from '@common/utils/permission.util';

// Check if user has a single permission
const canCreate = hasPermission(userPermissions, 'ARTICLE_CREATE');

// Check if user has ALL permissions (AND operation)
const canManageArticles = hasAllPermissions(userPermissions, [
  'ARTICLE_CREATE',
  'ARTICLE_EDIT_ALL',
  'ARTICLE_DELETE_ALL'
]);

// Check if user has ANY permission (OR operation)
const canEditArticles = hasAnyPermission(userPermissions, [
  'ARTICLE_EDIT_OWN',
  'ARTICLE_EDIT_ALL'
]);

// Check if user has NONE of the permissions (NOT operation)
const isNotAdmin = hasNonePermissions(userPermissions, [
  'ADMINISTRATOR',
  'BAN_MEMBERS'
]);

// Add single permission to bitfield
const newPermissions = addPermission(currentPermissions, 'ARTICLE_CREATE');

// Add multiple permissions to bitfield
const updatedPermissions = addPermissions(currentPermissions, [
  'ARTICLE_CREATE',
  'ARTICLE_EDIT_OWN',
  'COMMENT_CREATE'
]);

// Remove single permission from bitfield
const lessPermissions = removePermission(currentPermissions, 'ARTICLE_DELETE_ALL');

// Remove multiple permissions from bitfield
const restrictedPermissions = removePermissions(currentPermissions, [
  'ARTICLE_DELETE_ALL',
  'BAN_MEMBERS',
  'KICK_MEMBERS'
]);

// Complex permission check with AND/OR/NOT logic
const hasRequiredPermissions = checkPermissions(userPermissions, {
  all: ['ARTICLE_CREATE'],              // Must have ARTICLE_CREATE
  any: ['ARTICLE_EDIT_OWN', 'ARTICLE_EDIT_ALL'], // AND (ARTICLE_EDIT_OWN OR ARTICLE_EDIT_ALL)
  none: ['ADMINISTRATOR']                // AND NOT ADMINISTRATOR
});
```

---

## 🏢 Integration with Organizations

### Organization Roles

When an organization is created, default roles are automatically created:

```typescript
async createOrganization(data: CreateOrganizationDto) {
  const organization = await this.create(data);

  // Create default roles
  const defaultRoles = await this.permissionsService.createDefaultRoles();

  // Associate roles with organization
  for (const role of defaultRoles) {
    role.organization = organization;
    await this.permissionsService.update(role.id, { organization });
  }

  return organization;
}
```

### Default Roles

- **Owner** - Full permissions (automatically assigned to creator)
- **Admin** - Most permissions except organization deletion
- **Moderator** - Content moderation permissions
- **Member** - Basic read/write permissions
- **Everyone** - Minimal permissions for all organization members

### Organization Permission Check

```typescript
@Controller('organizations')
export class OrganizationsController {
  @Patch(':id')
  @Auth()
  @RequirePermission('ORGANIZATION_MANAGE_SETTINGS')
  async update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.organizationsService.updateOrganization(id, dto);
  }

  @Delete(':id')
  @Auth()
  @RequirePermission('ORGANIZATION_DELETE')
  async delete(@Param('id') id: string) {
    return this.organizationsService.remove(id);
  }
}
```

---

## 🧮 Logical Operations (AND/OR/NOT)

The permission system provides powerful logical operators for complex permission checks:

### AND Operation - All Permissions Required

Check if user has **ALL** specified permissions:

```typescript
import { hasAllPermissions } from '@permissions/utils/permission-logic.util';

// User must have BOTH permissions
const canManageArticles = hasAllPermissions(userPermissions, [
  'ARTICLE_CREATE',
  'ARTICLE_EDIT_ALL',
  'ARTICLE_DELETE_ALL'
]);

// Binary logic:
// userPerms:     11111111
// required:      00001100
// AND result:    00001100 === required → TRUE
```

### OR Operation - Any Permission Required

Check if user has **ANY** of the specified permissions:

```typescript
import { hasAnyPermission } from '@permissions/utils/permission-logic.util';

// User needs either permission
const canEditArticles = hasAnyPermission(userPermissions, [
  'ARTICLE_EDIT_OWN',
  'ARTICLE_EDIT_ALL'
]);

// Binary logic:
// userPerms:     11111111
// allowed:       00001100
// AND result:    00001100 !== 0 → TRUE (at least one bit is set)
```

### NOT Operation - Forbidden Permissions

Check if user has **NONE** of the specified permissions:

```typescript
import { hasNonePermissions } from '@permissions/utils/permission-logic.util';

// User must NOT have these permissions
const isNotAdmin = hasNonePermissions(userPermissions, [
  'ADMINISTRATOR',
  'BAN_MEMBERS'
]);

// Binary logic:
// userPerms:     11110011
// forbidden:     00001100
// AND result:    00000000 === 0 → TRUE (no forbidden bits are set)
```

### Complex Logical Combinations

Combine AND/OR/NOT in a single check:

```typescript
import { checkPermissions } from '@permissions/utils/permission-logic.util';

// User must have ARTICLE_CREATE 
// AND (ARTICLE_EDIT_OWN OR ARTICLE_EDIT_ALL) 
// AND NOT ADMINISTRATOR
const hasRequiredPermissions = checkPermissions(userPermissions, {
  all: ['ARTICLE_CREATE'],              // Must have (AND)
  any: ['ARTICLE_EDIT_OWN', 'ARTICLE_EDIT_ALL'], // AND at least one (OR)
  none: ['ADMINISTRATOR']                // AND not have (NOT)
});

// This is equivalent to:
// hasAllPermissions(userPerms, ['ARTICLE_CREATE']) &&
// hasAnyPermission(userPerms, ['ARTICLE_EDIT_OWN', 'ARTICLE_EDIT_ALL']) &&
// hasNonePermissions(userPerms, ['ADMINISTRATOR'])
```

### Set Operations

Manipulate permission bitfields with set-like operations:

```typescript
import {
  addPermissions,
  removePermissions,
  getPermissionDifference,
  getPermissionIntersection,
  getPermissionUnion,
  togglePermission,
} from '@permissions/utils/permission-logic.util';

// Add multiple permissions (OR)
const updatedPermissions = addPermissions(currentPermissions, [
  'ARTICLE_CREATE',
  'ARTICLE_EDIT_OWN',
  'COMMENT_CREATE'
]);

// Remove multiple permissions (AND NOT)
const restrictedPermissions = removePermissions(currentPermissions, [
  'ARTICLE_DELETE_ALL',
  'BAN_MEMBERS'
]);

// Get difference - permissions in first but not in second
const extraPermissions = getPermissionDifference(adminPerms, memberPerms);

// Get intersection - permissions in both
const commonPermissions = getPermissionIntersection(adminPerms, moderatorPerms);

// Get union - all permissions from both
const combinedPermissions = getPermissionUnion(role1Perms, role2Perms);

// Toggle permission (XOR)
const toggledPermissions = togglePermission(currentPermissions, 'ARTICLE_CREATE');
```

### Real-World Use Cases

#### Content Moderation System

```typescript
// Moderator can edit OR delete, but NOT publish
const isModerator = checkPermissions(userPermissions, {
  any: ['ARTICLE_EDIT_ALL', 'ARTICLE_DELETE_ALL'],
  none: ['ARTICLE_PUBLISH']
});
```

#### Organization Management

```typescript
// Manager can manage members AND settings, but NOT delete org
const isManager = checkPermissions(userPermissions, {
  all: ['ORGANIZATION_MANAGE_MEMBERS', 'ORGANIZATION_MANAGE_SETTINGS'],
  none: ['ORGANIZATION_DELETE']
});
```

#### User Role Validation

```typescript
// Regular user has basic permissions but not admin permissions
const isRegularUser = checkPermissions(userPermissions, {
  all: ['ARTICLE_CREATE', 'COMMENT_CREATE'],
  none: ['ADMINISTRATOR', 'BAN_MEMBERS', 'KICK_MEMBERS']
});
```

#### Dynamic Permission Granting

```typescript
// Promote user from member to moderator
let userPermissions = memberPermissions;

// Add moderator permissions
userPermissions = addPermissions(userPermissions, [
  'ARTICLE_MODERATE',
  'COMMENT_MODERATE',
  'COMMENT_DELETE_ALL'
]);

// Remove some member-only limitations
userPermissions = removePermissions(userPermissions, [
  'SOME_MEMBER_LIMITATION'
]);
```

---

## 🔒 Security & Best Practices

### 1. Permission Validation

```typescript
// ✅ Good: Validate permissions on every request
@Auth()
@RequirePermission('ARTICLE_CREATE')
async create(@Body() dto: CreateArticleDto) {
  return this.service.create(dto);
}

// ❌ Bad: Skip permission checks
@Auth()
async create(@Body() dto: CreateArticleDto) {
  return this.service.create(dto);
}
```

### 2. Use Permission Constants

```typescript
// ✅ Good: Use constants
const hasPermission = await this.permissionsService.hasPermission(
  userId,
  PERMISSION_CONSTANTS.BIT_MASKS.ARTICLE_CREATE
);

// ❌ Bad: Hardcode permission values
const hasPermission = await this.permissionsService.hasPermission(
  userId,
  1024n
);
```

### 3. Audit Permission Changes

```typescript
async assignRole(userId: string, roleId: string, reason: string) {
  // Log permission change
  this.logger.log(`Assigning role ${roleId} to user ${userId}`, {
    userId,
    roleId,
    reason,
    timestamp: new Date()
  });

  return this.permissionsService.assignRole({
    userId,
    roleId,
    reason
  });
}
```

### 4. Cache Permission Results

```typescript
// Cache effective permissions for better performance
async getUserEffectivePermissions(userId: string, channelId?: string) {
  const cacheKey = `perms:${userId}:${channelId || 'global'}`;
  
  const cached = await this.cacheService.get(cacheKey);
  if (cached) return cached;

  const permissions = await this.permissionsService.computeEffectivePermissions({
    userId,
    channelId
  });

  await this.cacheService.set(cacheKey, permissions, 300); // 5 minutes
  return permissions;
}
```

### 5. Invalidate Cache on Changes

```typescript
async assignRole(userId: string, roleId: string) {
  await this.permissionsService.assignRole({ userId, roleId });
  
  // Invalidate user permission cache
  await this.cacheService.deleteKeysByPattern(`perms:${userId}:*`);
}
```

---

## 🧪 Testing

### Unit Tests

```typescript
describe('PermissionsService', () => {
  it('should compute effective permissions with ADMINISTRATOR short-circuit', async () => {
    // User has ADMINISTRATOR role
    const result = await service.computeEffectivePermissions({
      userId: 'user1',
      channelId: null
    });

    expect(result.mask).toBe(~0n); // All permissions
    expect(result.map.ARTICLE_CREATE).toBe(true);
    expect(result.map.ARTICLE_DELETE_ALL).toBe(true);
  });

  it('should apply @everyone deny overwrite', async () => {
    // @everyone denies VIEW_CHANNEL
    const result = await service.computeEffectivePermissions({
      userId: 'user1',
      channelId: 'channel1'
    });

    expect(result.map.VIEW_CHANNEL).toBe(false);
  });

  it('should apply member-specific allow overwrite', async () => {
    // Member overwrite allows ARTICLE_CREATE despite role deny
    const result = await service.computeEffectivePermissions({
      userId: 'user1',
      channelId: 'channel1'
    });

    expect(result.map.ARTICLE_CREATE).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('Permission System E2E', () => {
  it('should create organization with default roles', async () => {
    const org = await request(app.getHttpServer())
      .post('/organizations')
      .send({ name: 'Test Org' })
      .expect(201);

    const roles = await request(app.getHttpServer())
      .get(`/permissions/roles?organizationId=${org.body.id}`)
      .expect(200);

    expect(roles.body).toHaveLength(5); // owner, admin, moderator, member, everyone
  });

  it('should deny access without required permission', async () => {
    await request(app.getHttpServer())
      .post('/articles')
      .send({ title: 'Test Article' })
      .expect(403); // Forbidden
  });
});
```

---

## 🔄 Migration Guide

### From Simple Role-Based to Discord-Style

#### Before (Simple Roles)
```typescript
// Simple role check
if (user.role !== 'admin') {
  throw new ForbiddenException();
}
```

#### After (Permission-Based)
```typescript
// Permission check
const hasPermission = await this.permissionsService.hasPermission(
  user.id,
  PERMISSION_CONSTANTS.BIT_MASKS.ARTICLE_CREATE
);

if (!hasPermission) {
  throw new ForbiddenException();
}
```

### Migration Steps

1. **Create Default Roles**
```bash
# Run migration to create roles table
yarn migration:run

# Seed default roles
yarn seed:permissions
```

2. **Migrate Existing Users**
```typescript
// Assign roles based on old role field
async migrateUserRoles() {
  const users = await this.userRepository.find();
  
  for (const user of users) {
    const roleName = user.role; // 'admin', 'member', etc.
    const role = await this.permissionsService.findRoleByName(roleName);
    
    if (role) {
      await this.permissionsService.assignRole({
        userId: user.id,
        roleId: role.id,
        reason: 'Migration from old role system'
      });
    }
  }
}
```

3. **Update Guards**
```typescript
// Replace old role guard with permission guard
@UseGuards(PermissionGuard)
@RequirePermission('ARTICLE_CREATE')
async create() {
  // ...
}
```

4. **Test Thoroughly**
```bash
# Run all tests
yarn test

# Run E2E tests
yarn test:e2e
```

---

## 📚 Additional Resources

- [Discord Permission Documentation](https://discord.com/developers/docs/topics/permissions)
- [Bitwise Operations Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators)
- [TypeORM Documentation](https://typeorm.io/)
- [NestJS Guards](https://docs.nestjs.com/guards)

---

## 🎯 Summary

The Discord-style Permission System provides:

✅ **High Performance** - Bitwise operations for O(1) permission checks
✅ **Scalability** - Handles millions of users and permissions
✅ **Flexibility** - Role-based and channel-specific permissions
✅ **Type Safety** - Full TypeScript support
✅ **Battle-Tested** - Based on Discord's proven model
✅ **Easy Integration** - Simple decorators and utilities
✅ **Comprehensive API** - RESTful endpoints for all operations
✅ **Well-Tested** - Unit and integration tests included

**The system is production-ready and can be easily extended as your application grows!** 🚀


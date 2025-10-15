# Badge System

A comprehensive badge system similar to Discord's badge system, designed for the NestJS social media platform. This module provides polymorphic badge assignments to any entity type (users, articles, comments, organizations, etc.) with full CRUD operations, automated assignment, and analytics.

## Features

### Core Features
- **Polymorphic Badge Assignments**: Assign badges to any entity type (user, article, comment, organization, etc.)
- **Discord-like Badge System**: Implements similar badge types and categories as Discord
- **Role-based Access Control**: Admin and moderator permissions for badge management
- **Caching**: Redis-based caching with SWR (Stale-While-Revalidate) pattern
- **Automated Assignment**: Automatic badge assignment based on user activity
- **Statistics & Analytics**: Comprehensive badge and assignment statistics
- **Expiration Support**: Time-limited badge assignments
- **Bulk Operations**: Bulk assign, revoke, suspend, and reactivate badges

### Badge Types

#### Common Badges
- **Nitro Subscriber**: Active subscription badge
- **Server Boosting**: Server boost subscription badge
- **Quest Badge**: Completed quest badge
- **Active Developer**: Bot with recent slash commands

#### Paid Badges
- **Orbs Apprentice**: Purchased from shop

#### Rare Badges
- **Bug Hunter**: Discord Bug Hunter contributor
- **Gold Bug Hunter**: Outstanding bug hunting contributions
- **Discord Staff**: Discord employee badge

#### Unobtainable Badges
- **Early Supporter**: Nitro subscriber before October 10, 2018
- **Early Verified Bot Developer**: Verified bot in 75+ servers before August 19, 2020
- **Partnered Server Owner**: Owner of Discord Partnered server
- **HypeSquad Houses**: Balance, Bravery, Brilliance
- **HypeSquad Events**: Event attendee badge
- **Moderator Programs Alumni**: Former Certified Moderator
- **Legacy Username**: Username with discriminator
- **Clown Badge**: April Fools 2024 temporary badge

#### App Badges
- **Supports Commands**: App with slash commands
- **Premium App**: App premium instance
- **Uses AutoMod**: App with 100+ AutoMod rules

#### Custom Badges
- **Content Creator**: Creates valuable content
- **Community Moderator**: Helps moderate community
- **Early Adopter**: Joined platform early
- **Beta Tester**: Participates in beta testing
- **Contributor**: Contributes to platform development
- **Verified User**: Identity verified user
- **Premium User**: Premium subscription holder
- **Organization Member/Admin/Owner**: Organization role badges
- **Article Author**: Publishes articles
- **Comment Moderator**: Moderates comments
- **Reaction Leader**: High reaction activity
- **Share Champion**: High sharing activity
- **Bookmark Collector**: Collects many bookmarks
- **Follow Influencer**: High follower count
- **Notification Master**: Manages notifications well
- **QR Code Expert**: Uses QR codes effectively
- **Sticker Creator**: Creates stickers
- **Tag Master**: Expert at tagging
- **Report Responder**: Responds to reports
- **Analytics Expert**: Uses analytics effectively
- **Worker Contributor**: Contributes to background workers

## Architecture

### Entities

#### Badge Entity
```typescript
@Entity('badges')
export class Badge extends BaseEntityCustom {
  @Column({ type: 'enum', enum: BadgeType, unique: true })
  type!: BadgeType;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: BadgeCategory })
  category!: BadgeCategory;

  @Column({ type: 'enum', enum: BadgeRarity })
  rarity!: BadgeRarity;

  @Column({ type: 'enum', enum: BadgeStatus, default: BadgeStatus.ACTIVE })
  status!: BadgeStatus;

  @Column({ type: 'boolean', default: true })
  isVisible!: boolean;

  @Column({ type: 'boolean', default: true })
  isObtainable!: boolean;

  @Column({ type: 'int', default: 0 })
  displayOrder!: number;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  iconUrl?: string;

  @Column({ type: 'varchar', length: 7, nullable: true })
  color?: string;

  @Column({ type: 'text', nullable: true })
  requirements?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ type: 'boolean', default: false })
  isAutoAssigned!: boolean;

  @Column({ type: 'boolean', default: true })
  isManuallyAssignable!: boolean;

  @Column({ type: 'boolean', default: true })
  isRevokable!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'int', default: 0 })
  assignmentCount!: number;

  @OneToMany(() => BadgeAssignment, (assignment) => assignment.badge)
  assignments?: BadgeAssignment[];
}
```

#### BadgeAssignment Entity
```typescript
@Entity('badge_assignments')
export class BadgeAssignment extends BaseEntityCustom {
  @Column({ type: 'bigint' })
  badgeId!: string;

  @Column({ type: 'enum', enum: BadgeEntityType })
  entityType!: BadgeEntityType;

  @Column({ type: 'bigint' })
  entityId!: string;

  @Column({ type: 'enum', enum: BadgeAssignmentStatus, default: BadgeAssignmentStatus.ACTIVE })
  status!: BadgeAssignmentStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)' })
  assignedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt?: Date;

  @Column({ type: 'bigint', nullable: true })
  assignedBy?: string;

  @Column({ type: 'bigint', nullable: true })
  revokedBy?: string;

  @Column({ type: 'text', nullable: true })
  assignmentReason?: string;

  @Column({ type: 'text', nullable: true })
  revocationReason?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ type: 'boolean', default: true })
  isVisible!: boolean;

  @Column({ type: 'boolean', default: true })
  isManuallyRevokable!: boolean;

  @ManyToOne(() => Badge, (badge) => badge.assignments)
  @JoinColumn({ name: 'badgeId', referencedColumnName: 'id' })
  badge?: Badge;
}
```

### Services

#### BadgesService
Main service extending `BaseService<Badge>` with:
- CRUD operations for badges
- Badge assignment management
- Statistics and analytics
- Cache management
- Lifecycle hooks

#### BadgeAssignmentService
Specialized service for badge assignment operations:
- Assignment queries and filtering
- Bulk operations (assign, revoke, suspend, reactivate)
- Statistics and trends
- Expiration management

#### BadgeAutomationService
Automated badge assignment based on user activity:
- User activity monitoring
- Content creation tracking
- Organization role changes
- Social engagement metrics

### DTOs

#### CreateBadgeDto
```typescript
export class CreateBadgeDto {
  @IsEnum(BadgeType)
  type!: BadgeType;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(BadgeCategory)
  category!: BadgeCategory;

  @IsEnum(BadgeRarity)
  rarity!: BadgeRarity;

  // ... other fields
}
```

#### AssignBadgeDto
```typescript
export class AssignBadgeDto {
  @IsString()
  badgeId!: string;

  @IsEnum(BadgeEntityType)
  entityType!: BadgeEntityType;

  @IsString()
  entityId!: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  assignmentReason?: string;

  @IsOptional()
  isVisible?: boolean;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
```

## API Endpoints

### Badge Management
- `POST /badges` - Create badge (Admin only)
- `GET /badges` - Get badges with filters
- `GET /badges/:id` - Get badge by ID
- `GET /badges/type/:type` - Get badge by type
- `GET /badges/category/:category` - Get badges by category
- `GET /badges/rarity/:rarity` - Get badges by rarity
- `GET /badges/visible/all` - Get visible badges
- `GET /badges/obtainable/all` - Get obtainable badges
- `PATCH /badges/:id` - Update badge (Admin only)
- `DELETE /badges/:id` - Delete badge (Admin only)

### Badge Assignment
- `POST /badges/assign` - Assign badge to entity (Admin/Moderator)
- `PATCH /badges/assign/:assignmentId/revoke` - Revoke badge assignment (Admin/Moderator)
- `GET /badges/assignments` - Get badge assignments with filters (Admin/Moderator)
- `GET /badges/entity/:entityType/:entityId` - Get entity badges
- `GET /badges/assignments/:assignmentId` - Get badge assignment by ID (Admin/Moderator)
- `GET /badges/entity/:entityType/:entityId/has/:badgeType` - Check if entity has badge

### Statistics & Management
- `GET /badges/stats/overview` - Get badge statistics (Admin only)
- `POST /badges/cleanup/expired` - Clean up expired assignments (Admin only)

## Usage Examples

### Creating a Badge
```typescript
const createBadgeDto: CreateBadgeDto = {
  type: BadgeType.CONTENT_CREATOR,
  name: 'Content Creator',
  description: 'Creates valuable content for the community',
  category: BadgeCategory.CUSTOM,
  rarity: BadgeRarity.UNCOMMON,
  isAutoAssigned: true,
  isManuallyAssignable: true,
  isRevokable: true,
  requirements: 'Create popular articles or media',
};

const badge = await badgesService.createBadge(createBadgeDto);
```

### Assigning a Badge
```typescript
const assignBadgeDto: AssignBadgeDto = {
  badgeId: '1234567890123456789',
  entityType: BadgeEntityType.USER,
  entityId: '9876543210987654321',
  assignmentReason: 'Outstanding contribution to the community',
  isVisible: true,
};

const assignment = await badgesService.assignBadge(assignBadgeDto, adminUserId);
```

### Getting Entity Badges
```typescript
const userBadges = await badgesService.getEntityBadges(
  BadgeEntityType.USER,
  userId
);
```

### Checking if Entity Has Badge
```typescript
const hasBadge = await badgesService.hasBadge(
  BadgeEntityType.USER,
  userId,
  BadgeType.CONTENT_CREATOR
);
```

### Getting Badge Statistics
```typescript
const stats = await badgesService.getBadgeStatistics();
// Returns: { totalBadges, activeBadges, totalAssignments, badgesByCategory, badgesByRarity }
```

## Configuration

### Cache Configuration
```typescript
{
  cache: {
    enabled: true,
    ttlSec: 300,    // 5 minutes cache TTL
    swrSec: 60,     // Refresh in background when < 60s remain
    prefix: 'badges'
  }
}
```

### Relations Whitelist
```typescript
relationsWhitelist: {
  assignments: true,
}
```

### Select Whitelist
```typescript
selectWhitelist: {
  id: true,
  type: true,
  name: true,
  description: true,
  category: true,
  rarity: true,
  status: true,
  isVisible: true,
  isObtainable: true,
  displayOrder: true,
  iconUrl: true,
  color: true,
  requirements: true,
  isAutoAssigned: true,
  isManuallyAssignable: true,
  isRevokable: true,
  assignmentCount: true,
  createdAt: true,
  updatedAt: true,
}
```

## Database Schema

### Badges Table
```sql
CREATE TABLE badges (
  id BIGINT PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL,
  type VARCHAR NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR NOT NULL,
  rarity VARCHAR NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'active',
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_obtainable BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  icon_url VARCHAR(2048),
  color VARCHAR(7),
  requirements TEXT,
  metadata JSONB,
  is_auto_assigned BOOLEAN NOT NULL DEFAULT false,
  is_manually_assignable BOOLEAN NOT NULL DEFAULT true,
  is_revokable BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP,
  assignment_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  deleted_at TIMESTAMP(6),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_badges_type ON badges(type);
CREATE INDEX idx_badges_category_rarity ON badges(category, rarity);
CREATE INDEX idx_badges_status_visible ON badges(status, is_visible);
CREATE INDEX idx_badges_display_order ON badges(display_order);
```

### Badge Assignments Table
```sql
CREATE TABLE badge_assignments (
  id BIGINT PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL,
  badge_id BIGINT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  entity_type VARCHAR NOT NULL,
  entity_id BIGINT NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'active',
  assigned_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  expires_at TIMESTAMP,
  revoked_at TIMESTAMP,
  assigned_by BIGINT,
  revoked_by BIGINT,
  assignment_reason TEXT,
  revocation_reason TEXT,
  metadata JSONB,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_manually_revokable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  deleted_at TIMESTAMP(6),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE(badge_id, entity_type, entity_id)
);

CREATE INDEX idx_badge_assignments_entity ON badge_assignments(entity_type, entity_id);
CREATE INDEX idx_badge_assignments_badge_entity ON badge_assignments(badge_id, entity_type, entity_id);
CREATE INDEX idx_badge_assignments_status_assigned ON badge_assignments(status, assigned_at);
CREATE INDEX idx_badge_assignments_expires ON badge_assignments(expires_at);
```

## Security

### Access Control
- **Admin Only**: Badge creation, update, deletion, statistics
- **Admin/Moderator**: Badge assignment, revocation, assignment management
- **Public**: Badge viewing, entity badge queries

### Data Validation
- All DTOs use `class-validator` decorators
- Input sanitization and validation
- SQL injection prevention through TypeORM
- XSS protection through proper encoding

### Rate Limiting
- Integrated with the platform's rate limiting system
- Different limits for different operations
- Admin operations have higher limits

## Performance

### Caching Strategy
- Redis-based caching with SWR pattern
- Badge metadata cached for 5 minutes
- Assignment queries cached for 1 minute
- Automatic cache invalidation on updates

### Database Optimization
- Proper indexing on frequently queried columns
- Composite indexes for complex queries
- Soft deletes for data retention
- Optimistic locking for concurrency control

### Query Optimization
- Select only needed fields
- Use relations whitelist to prevent over-fetching
- Pagination for large result sets
- Efficient filtering and sorting

## Monitoring & Analytics

### Metrics Tracked
- Total badges and assignments
- Badge distribution by category and rarity
- Assignment trends over time
- Most assigned badges
- Expired assignments cleanup

### Logging
- Structured logging with context
- Badge creation, assignment, and revocation events
- Error tracking and debugging
- Performance monitoring

## Testing

### Unit Tests
- Service method testing
- DTO validation testing
- Entity method testing
- Error handling testing

### Integration Tests
- API endpoint testing
- Database integration testing
- Cache integration testing
- Authentication and authorization testing

### E2E Tests
- Complete badge workflow testing
- Cross-module integration testing
- Performance testing
- Security testing

## Future Enhancements

### Planned Features
- Badge templates and presets
- Badge collections and sets
- Badge trading and marketplace
- Advanced analytics and reporting
- Badge recommendation system
- Custom badge creation tools
- Badge achievement notifications
- Badge leaderboards and rankings

### Integration Opportunities
- Notification system integration
- Analytics system integration
- User profile integration
- Organization system integration
- Content management integration
- Social features integration

## Contributing

When contributing to the badge system:

1. Follow the established patterns and conventions
2. Add proper tests for new features
3. Update documentation for API changes
4. Consider backward compatibility
5. Follow security best practices
6. Use proper error handling and logging
7. Consider performance implications
8. Update seed data if adding new badge types

## License

This module is part of the NestJS social media platform and follows the same licensing terms.

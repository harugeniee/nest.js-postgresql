# Share Module - Comprehensive Documentation

## Overview

The Share Module is a comprehensive link shortening and tracking system that provides advanced analytics, attribution tracking, and conversion monitoring capabilities. It's designed to handle high-volume traffic with anti-fraud measures and detailed reporting.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Features](#core-features)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Services and Controllers](#services-and-controllers)
6. [Analytics and Tracking](#analytics-and-tracking)
7. [Scheduled Tasks](#scheduled-tasks)
8. [Anti-Fraud Measures](#anti-fraud-measures)
9. [Configuration](#configuration)
10. [Usage Examples](#usage-examples)
11. [Performance Considerations](#performance-considerations)

## Architecture Overview

The Share Module follows a microservice architecture with the following components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Controllers   │    │    Services     │    │    Entities     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ ShareLinksCtrl  │    │ ShareService    │    │ ShareLink       │
│ ShareRedirectCtrl│    │ ShareLinksSvc   │    │ ShareSession    │
└─────────────────┘    │ ShareAttribSvc  │    │ ShareClick      │
                       │ ShareAggSvc     │    │ ShareAttribution│
                       └─────────────────┘    │ ShareConversion │
                                              │ ShareAggDaily   │
                                              │ ShareChannel    │
                                              │ Campaign        │
                                              └─────────────────┘
```

## Core Features

### 1. Link Shortening
- **Unique Short Codes**: 8-character alphanumeric codes (e.g., `abc12345`)
- **Polymorphic Content Support**: Articles, users, media, comments, bookmark folders, sticker packs
- **Custom Channels**: Categorize links by platform (Twitter, Facebook, etc.)
- **Campaign Management**: Group links for marketing campaigns

### 2. Advanced Analytics
- **Real-time Click Tracking**: Track every click with detailed metadata
- **Unique Visitor Counting**: Deduplicate visitors using IP+UserAgent hashing
- **Geographic Distribution**: Track clicks by country
- **Referrer Analysis**: Identify traffic sources
- **Daily Aggregations**: Pre-computed metrics for fast reporting

### 3. Attribution System
- **Last-Click Attribution**: 7-day attribution window
- **User Journey Tracking**: Track user interactions across sessions
- **Conversion Tracking**: Monitor various conversion types
- **Attribution Analytics**: Detailed attribution reports

### 4. Anti-Fraud Measures
- **Bot Detection**: Advanced user agent pattern matching
- **Prefetch Filtering**: Exclude prefetch requests from metrics
- **Self-Click Detection**: Filter out clicks from content owners
- **IP Hashing**: Daily-based deduplication system

## Database Schema

### Core Entities

#### ShareLink
```typescript
{
  id: string;           // Primary key
  code: string;         // Unique short code (8 chars)
  contentType: string;  // 'article', 'user', 'media', etc.
  contentId: string;    // ID of the shared content
  userId: string;       // Owner of the share link
  channelId?: string;   // Optional channel categorization
  campaignId?: string;  // Optional campaign grouping
  note?: string;        // Optional description
  isActive: boolean;    // Link status
  content?: any;        // Resolved content object
}
```

#### ShareClick
```typescript
{
  id: string;
  shareId: string;      // Reference to share link
  sessionId?: string;   // Optional session reference
  ts: Date;            // Click timestamp
  event: 'click' | 'prefetch';
  referrer?: string;   // HTTP referrer
  userAgent: string;   // User agent string
  country?: string;    // Country code (ISO 3166-1 alpha-2)
  ipHash: string;      // SHA256 hash for deduplication
  uaHash: string;      // User agent hash
  isBot: boolean;      // Bot detection flag
  isCountable: boolean; // Whether to count in metrics
}
```

#### ShareSession
```typescript
{
  id: string;
  shareId: string;      // Reference to share link
  sessionToken: string; // Unique session identifier
  expiresAt: Date;      // Session expiration (7 days)
}
```

#### ShareAttribution
```typescript
{
  id: string;
  shareId: string;      // Reference to share link
  viewerUserId: string; // User who was attributed
  firstAt: Date;        // First visit timestamp
  lastAt: Date;         // Last visit timestamp
  totalVisits: number;  // Total visit count
}
```

#### ShareConversion
```typescript
{
  id: string;
  shareId: string;      // Reference to share link
  viewerUserId?: string; // Optional user who converted
  convType: string;     // Conversion type
  convValue?: number;   // Optional conversion value
  occurredAt: Date;     // Conversion timestamp
  attributed: boolean;  // Whether attributed to share link
}
```

#### ShareAggDaily
```typescript
{
  id: string;
  shareId: string;      // Reference to share link
  day: Date;           // Aggregation date
  clicks: number;      // Total clicks for the day
  uniques: number;     // Unique visitors for the day
  convs: number;       // Conversions for the day
  convValue: number;   // Total conversion value
}
```

## API Endpoints

### Share Links Management

#### Create Share Link
```http
POST /api/v1/share-links
Content-Type: application/json

{
  "contentType": "article",
  "contentId": "123456789",
  "ownerUserId": "987654321",
  "channelId": "twitter",
  "campaignId": "summer-2024",
  "note": "Promotional link for new article",
  "isActive": true
}
```

#### Get Share Links for Content
```http
GET /api/v1/share-links/content/{contentType}/{contentId}
```

#### Get Share Link Metrics
```http
GET /api/v1/share-links/{code}/metrics?from=2024-01-01&to=2024-01-31
```

### Share Redirect

#### Short Link Redirect
```http
GET /s/{code}
```

#### Record Attribution
```http
POST /s/attribution
Content-Type: application/json

{
  "sessionToken": "abc123...",
  "viewerUserId": "user123"
}
```

#### Record Conversion
```http
POST /s/convert
Content-Type: application/json

{
  "sessionToken": "abc123...",
  "convType": "subscribe",
  "convValue": 10.0,
  "viewerUserId": "user123"
}
```

## Services and Controllers

### ShareService
**Main service for share link operations**

**Key Methods:**
- `createShareLink(dto)` - Create new share link with unique code
- `getShareLinkByCode(code)` - Get share link with resolved content
- `createSession(shareId)` - Create tracking session
- `trackClick(shareId, sessionId, clickData)` - Track click with anti-fraud
- `generateIpHash(ip, userAgent, secret)` - Generate deduplication hash
- `isBot(userAgent)` - Detect bot user agents

**Features:**
- Polymorphic content resolution
- Session management with cookies
- Anti-fraud click tracking
- Bot detection algorithms

### ShareLinksService
**Service for share link management and analytics**

**Key Methods:**
- `createShareLink(dto)` - Create share link via BaseService
- `getShareLinksForContent(contentType, contentId)` - Get links with summary metrics
- `getShareLinkMetrics(code, dto)` - Get detailed analytics
- `getShareLinkSummary(shareId)` - Get summary metrics

**Features:**
- Real-time analytics calculation
- Geographic distribution analysis
- Referrer tracking
- Daily breakdown reports

### ShareAttributionService
**Service for user attribution and conversion tracking**

**Key Methods:**
- `recordAttribution(dto)` - Record user attribution
- `recordConversion(dto)` - Record conversion with attribution
- `getAttributionStats(shareId)` - Get attribution statistics
- `getConversionStats(shareId)` - Get conversion statistics

**Features:**
- Last-click attribution model (7-day window)
- Conversion value tracking
- Attribution analytics
- Data cleanup for expired records

### ShareAggregationService
**Service for daily metrics aggregation and data management**

**Key Methods:**
- `runDailyAggregation()` - Scheduled daily aggregation (2 AM)
- `aggregateDay(startDate, endDate)` - Aggregate metrics for specific day
- `getAggregatedMetrics(shareId, fromDate, toDate)` - Get aggregated metrics
- `cleanupOldAggregations()` - Clean up old data (monthly)
- `cleanupOldClicks()` - Clean up old click data (monthly)

**Features:**
- Automated ETL processing
- Data retention policies
- Performance optimization for reporting
- Error handling and logging

### Controllers

#### ShareLinksController
**REST API for share link management**

**Endpoints:**
- `POST /` - Create share link
- `GET /content/:contentType/:contentId` - Get links for content
- `GET /:code/metrics` - Get link metrics

#### ShareRedirectController
**Short link redirect and tracking**

**Endpoints:**
- `GET /:code` - Handle short link redirect
- `POST /attribution` - Record user attribution
- `POST /convert` - Record conversion

## Analytics and Tracking

### Click Tracking Process

1. **Request Received**: User clicks short link `/s/{code}`
2. **Link Validation**: Check if link exists and is active
3. **Session Management**: Get or create tracking session
4. **Data Collection**: Extract request metadata
   - User Agent
   - Referrer
   - IP Address
   - Country (from CloudFlare headers)
5. **Anti-Fraud Analysis**:
   - Bot detection
   - Prefetch detection
   - Self-click detection
6. **Click Recording**: Store click with metadata
7. **Redirect**: Redirect to target URL with UTM parameters

### Metrics Calculation

#### Real-time Metrics
- **Clicks**: Count of `isCountable = true` clicks
- **Uniques**: Count of unique `ipHash` values
- **Conversions**: Count of `attributed = true` conversions
- **Conversion Value**: Sum of `convValue` for attributed conversions

#### Aggregated Metrics
- **Daily Aggregations**: Pre-computed daily metrics
- **Geographic Distribution**: Clicks grouped by country
- **Top Referrers**: Most common referrer sources
- **Daily Breakdown**: Day-by-day metrics over time range

### Attribution Model

**Last-Click Attribution (7-day window):**
1. User clicks share link
2. Session created with 7-day expiration
3. User actions tracked within attribution window
4. Conversions attributed to last clicked share link
5. Attribution expires after 7 days

## Scheduled Tasks

### Daily Aggregation (2:00 AM)
```typescript
@Cron(CronExpression.EVERY_DAY_AT_2AM)
async runDailyAggregation()
```

**Process:**
1. Calculate yesterday's date range
2. Get all active share links
3. For each share link:
   - Count clicks (isCountable = true)
   - Count unique visitors (unique ipHash)
   - Count conversions (attributed = true)
   - Sum conversion values
4. Create or update daily aggregation record
5. Log completion status

### Data Cleanup (1st of month)
```typescript
@Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
async cleanupOldAggregations() // Remove aggregations > 1 year
async cleanupOldClicks()       // Remove clicks > 90 days
```

## Anti-Fraud Measures

### Bot Detection
**Pattern Matching:**
```typescript
const botPatterns = [
  /bot/i, /crawler/i, /spider/i, /scraper/i,
  /facebookexternalhit/i, /twitterbot/i, /linkedinbot/i,
  /whatsapp/i, /telegrambot/i, /slackbot/i,
  /googlebot/i, /bingbot/i, /yandexbot/i,
  // ... more patterns
];
```

### Prefetch Detection
**Header Analysis:**
- `X-Purpose: prefetch`
- `Purpose: prefetch`
- `X-Moz: prefetch`

### Deduplication System
**IP Hashing:**
```typescript
const ipHash = SHA256(ip + userAgent + secret + YYYY-MM-DD)
```
- Daily-based hashing prevents cross-day deduplication
- Same IP+UA combination = same hash for the day
- Enables accurate unique visitor counting

### Self-Click Detection
```typescript
const isSelfClick = req.user && req.user.uid === shareLink.userId
```

## Configuration

### Environment Variables
```bash
# Required
SHARE_SECRET=your-secret-key-for-hashing

# Optional
APP_URL=http://localhost:3000  # For redirect URLs
NODE_ENV=production            # For secure cookies
```

### Cache Configuration
```typescript
// ShareLink caching
{
  enabled: true,
  ttlSec: 300,        // 5 minutes
  prefix: 'share_links',
  swrSec: 60          // 1 minute stale-while-revalidate
}

// ShareAggDaily caching
{
  enabled: true,
  ttlSec: 600,        // 10 minutes
  prefix: 'share_agg_daily',
  swrSec: 120         // 2 minutes stale-while-revalidate
}
```

## Usage Examples

### Creating a Share Link
```typescript
const shareLink = await shareService.createShareLink({
  contentType: 'article',
  contentId: '123456789',
  ownerUserId: '987654321',
  channelId: 'twitter',
  campaignId: 'summer-2024',
  note: 'Promotional link',
  isActive: true
});
// Result: { code: 'abc12345', ... }
```

### Getting Analytics
```typescript
const metrics = await shareLinksService.getShareLinkMetrics('abc12345', {
  from: '2024-01-01',
  to: '2024-01-31'
});
// Result: { clicks: 1000, uniques: 500, conversions: 50, ... }
```

### Recording Attribution
```typescript
// On the target page (client-side)
await fetch('/s/attribution', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionToken: getCookie('sid'),
    viewerUserId: currentUser.id
  })
});
```

### Recording Conversion
```typescript
// When user completes an action
await fetch('/s/convert', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionToken: getCookie('sid'),
    convType: 'subscribe',
    convValue: 10.0,
    viewerUserId: currentUser.id
  })
});
```

## Performance Considerations

### Database Indexing
**Critical Indexes:**
- `share_links.code` (unique)
- `share_clicks.shareId, ts` (composite)
- `share_clicks.isCountable` (filtering)
- `share_attributions.shareId, viewerUserId` (unique)
- `share_agg_daily.shareId, day` (unique)

### Caching Strategy
- **Share Links**: 5-minute TTL with 1-minute SWR
- **Daily Aggregations**: 10-minute TTL with 2-minute SWR
- **Session Data**: In-memory with 7-day expiration

### Query Optimization
- **Real-time Metrics**: Use repository methods with proper indexing
- **Complex Analytics**: Use QueryBuilder for GROUP BY operations
- **Daily Aggregations**: Pre-computed for fast reporting

### Data Retention
- **Click Data**: 90 days (configurable)
- **Attribution Data**: 30 days (configurable)
- **Aggregation Data**: 1 year (configurable)
- **Session Data**: 7 days (automatic cleanup)

### Scalability Considerations
- **Horizontal Scaling**: Stateless services with shared database
- **Load Balancing**: Session cookies for user tracking
- **Database Sharding**: Consider by shareId for very high volume
- **CDN Integration**: Static assets and redirect optimization

## Error Handling

### Common Error Scenarios
1. **Share Link Not Found**: 404 with message key
2. **Inactive Share Link**: 410 Gone status
3. **Invalid Session Token**: 400 Bad Request
4. **Code Generation Failed**: 500 Internal Server Error

### Logging
- **Structured Logging**: Using NestJS Logger
- **Error Tracking**: Detailed error context
- **Performance Monitoring**: Query execution times
- **Audit Trail**: All share link operations logged

## Security Considerations

### Data Protection
- **IP Hashing**: No raw IP addresses stored
- **Session Security**: HttpOnly cookies with secure flags
- **Input Validation**: DTO validation for all endpoints
- **Rate Limiting**: Integrated with global rate limiting

### Privacy Compliance
- **GDPR Ready**: Data retention policies
- **Data Anonymization**: IP hashing for privacy
- **User Consent**: Attribution tracking opt-in
- **Data Export**: User data export capabilities

## Monitoring and Alerting

### Key Metrics to Monitor
- **Click Volume**: Track daily click counts
- **Error Rates**: Monitor 4xx/5xx responses
- **Response Times**: Track redirect performance
- **Database Performance**: Query execution times
- **Cache Hit Rates**: Monitor cache effectiveness

### Alerting Thresholds
- **High Error Rate**: >5% error rate
- **Slow Queries**: >1 second response time
- **Low Cache Hit Rate**: <80% cache hit rate
- **Aggregation Failures**: Daily aggregation errors

This comprehensive documentation covers all aspects of the Share Module, from basic usage to advanced analytics and performance considerations. The module is designed to handle high-volume traffic while providing detailed insights into link performance and user behavior.

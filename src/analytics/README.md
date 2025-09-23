# Analytics Module - Complete Dashboard System

## 🎯 Overview

The Analytics Module provides a comprehensive analytics and dashboard system for tracking user behavior, content performance, and platform metrics. It includes real-time analytics, data export capabilities, and automated reporting.

## 🏗️ Architecture

### Core Components

1. **AnalyticsService** - Main service for analytics operations
2. **AnalyticsWidgetsService** - Specialized widgets for different analytics views
3. **RealTimeAnalyticsService** - Real-time analytics and live event streaming
4. **AnalyticsExportService** - Data export in multiple formats
5. **AnalyticsSchedulerService** - Automated tasks and maintenance
6. **AnalyticsRealtimeGateway** - WebSocket gateway for real-time updates

### Data Models

- **AnalyticsEvent** - Individual user events and interactions
- **AnalyticsMetric** - Aggregated metrics for performance optimization

## 📊 Dashboard Widgets

### Available Widgets

1. **User Activity Dashboard**
   - Total active users
   - New vs returning users
   - User engagement metrics
   - Top user actions
   - User retention analysis

2. **Content Performance Dashboard**
   - Total content count
   - Top performing content
   - Content metrics and trends
   - Trending content analysis

3. **Engagement Metrics Dashboard**
   - Overall engagement rates
   - Engagement breakdown by type
   - Top engagement sources
   - User engagement segments

4. **Traffic Sources Dashboard**
   - Total traffic analysis
   - Traffic source breakdown
   - Referrer analysis
   - Device and browser analytics

5. **Geographic Data Dashboard**
   - Country and city analysis
   - Geographic distribution
   - Regional trends

6. **Conversion Funnel Dashboard**
   - Funnel step analysis
   - Conversion rates
   - Bottleneck identification

7. **Retention Analysis Dashboard**
   - Cohort analysis
   - Retention rates
   - Churn analysis

8. **Revenue Metrics Dashboard**
   - Revenue tracking
   - Revenue breakdown
   - Conversion metrics

## 🚀 API Endpoints

### Basic Analytics
- `GET /analytics/users/:userId/overview` - User analytics
- `GET /analytics/content/:subjectType/:subjectId/performance` - Content performance
- `GET /analytics/platform/overview` - Platform overview
- `GET /analytics/events` - Paginated analytics events

### Dashboard Analytics
- `GET /analytics/dashboard/overview` - Dashboard overview
- `GET /analytics/dashboard/trends` - Time series trends
- `GET /analytics/dashboard/top-content` - Top content analysis
- `GET /analytics/dashboard/user-engagement` - User engagement metrics
- `GET /analytics/dashboard/comprehensive` - Comprehensive dashboard data

### Widget System
- `GET /analytics/widgets/:widgetType` - Get specific widget data
  - Supported types: `user_activity`, `content_performance`, `engagement_metrics`, `traffic_sources`, `geographic_data`, `conversion_funnel`, `retention_analysis`, `revenue_metrics`

### Real-time Analytics
- `GET /analytics/realtime` - Real-time analytics data
- `GET /analytics/realtime/summary` - Real-time metrics summary
- `GET /analytics/realtime/connections` - Connection statistics

### Data Export
- `GET /analytics/export` - Export analytics data
  - Formats: CSV, JSON, XLSX, PDF
  - Options: Raw data, aggregated data, charts data

### System Health
- `GET /analytics/health` - Analytics system health check

## 🔌 WebSocket Real-time Streaming

### Connection
```javascript
const socket = io('/analytics');

// Subscribe to real-time analytics
socket.emit('analytics.subscribe', {
  query: {
    timeWindow: 60, // minutes
    refreshInterval: 30, // seconds
    eventTypes: ['article_view', 'user_follow'],
    includeLiveUsers: true,
    includeLiveEvents: true
  }
});

// Listen for data updates
socket.on('analytics.data', (data) => {
  console.log('Real-time analytics:', data);
});

// Listen for live events
socket.on('analytics.liveEvent', (event) => {
  console.log('Live event:', event);
});
```

### Events
- `analytics.subscribe` - Subscribe to real-time stream
- `analytics.unsubscribe` - Unsubscribe from stream
- `analytics.request` - Request specific data
- `analytics.stats` - Get connection statistics

## 📈 Query Parameters

### Date Range Filtering
```typescript
{
  fromDate: '2024-01-01', // Start date (ISO string)
  toDate: '2024-01-31',   // End date (ISO string)
  granularity: 'day'      // hour, day, week, month, quarter, year
}
```

### Advanced Filtering
```typescript
{
  eventType: 'article_view,user_follow',     // Comma-separated event types
  eventCategory: 'content,social',           // Comma-separated categories
  subjectType: 'article,comment',            // Comma-separated subject types
  userId: 'user123',                         // Specific user ID
  includeAnonymous: true                     // Include anonymous events
}
```

### Pagination & Sorting
```typescript
{
  page: 1,                    // Page number
  limit: 100,                 // Items per page
  sortBy: 'createdAt',        // Sort field
  order: 'DESC'               // ASC or DESC
}
```

## 🔄 Automated Tasks

### Scheduled Jobs

1. **Hourly Metrics Update** (`@Cron('0 * * * *')`)
   - Updates aggregated metrics
   - Processes recent events

2. **Data Cleanup** (`@Cron('0 2 * * *')`)
   - Removes events older than 90 days
   - Maintains database performance

3. **Real-time Updates** (`@Cron('*/30 * * * * *')`)
   - Broadcasts real-time metrics
   - Updates connected clients

4. **Connection Cleanup** (`@Cron('*/5 * * * *')`)
   - Cleans inactive WebSocket connections
   - Maintains connection health

5. **Daily Reports** (`@Cron('0 6 * * *')`)
   - Generates daily analytics reports
   - Provides automated insights

## 📊 Data Export

### Supported Formats
- **CSV** - Comma-separated values
- **JSON** - Structured JSON data
- **XLSX** - Excel spreadsheet
- **PDF** - Portable document format

### Export Options
```typescript
{
  format: 'csv',                    // Export format
  includeRawData: true,             // Include raw event data
  includeAggregatedData: true,      // Include aggregated metrics
  includeChartsData: true,         // Include chart-ready data
  fromDate: '2024-01-01',          // Start date
  toDate: '2024-01-31'              // End date
}
```

## 🎨 Frontend Integration

### React/Next.js Example
```typescript
// Dashboard component
const AnalyticsDashboard = () => {
  const [data, setData] = useState(null);
  const [realTimeData, setRealTimeData] = useState(null);

  useEffect(() => {
    // Fetch dashboard data
    fetch('/api/analytics/dashboard/comprehensive')
      .then(res => res.json())
      .then(setData);

    // Connect to real-time stream
    const socket = io('/analytics');
    socket.emit('analytics.subscribe', {
      query: { timeWindow: 60, refreshInterval: 30 }
    });
    
    socket.on('analytics.data', setRealTimeData);
    
    return () => socket.disconnect();
  }, []);

  return (
    <div className="dashboard">
      <OverviewWidget data={data?.overview} />
      <UserActivityWidget data={data?.widgets?.userActivity} />
      <RealTimeMetrics data={realTimeData} />
    </div>
  );
};
```

### Chart Integration
```typescript
// Using Chart.js
const TimeSeriesChart = ({ data }) => {
  const chartData = {
    labels: data.timeSeries.map(item => item.date),
    datasets: [{
      label: 'Events',
      data: data.timeSeries.map(item => item.count),
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  };

  return <Line data={chartData} />;
};
```

## 🔧 Configuration

### Environment Variables
```env
# Analytics Configuration
ANALYTICS_CACHE_TTL=300          # Cache TTL in seconds
ANALYTICS_CACHE_SWR=60          # Stale-while-revalidate in seconds
ANALYTICS_EXPORT_DIR=./exports   # Export directory
ANALYTICS_CLEANUP_DAYS=90       # Days to keep events
```

### Module Configuration
```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([AnalyticsEvent, AnalyticsMetric]),
    ScheduleModule.forRoot(), // For scheduled tasks
  ],
  // ... providers and exports
})
export class AnalyticsModule {}
```

## 🧪 Testing

### Running Tests
```bash
# Run all analytics tests
yarn test --testPathPattern="analytics"

# Run specific test files
yarn test src/analytics/analytics.service.spec.ts
yarn test src/analytics/analytics.controller.spec.ts
```

### Test Coverage
- ✅ Service methods
- ✅ Controller endpoints
- ✅ Interceptor functionality
- ✅ Widget services
- ✅ Real-time analytics
- ✅ Export functionality

## 📚 Usage Examples

### Basic Analytics Query
```typescript
const query = {
  fromDate: new Date('2024-01-01'),
  toDate: new Date('2024-01-31'),
  eventType: 'article_view',
  granularity: 'day'
};

const analytics = await analyticsService.getDashboardOverview(query);
```

### Widget Data Retrieval
```typescript
const widgetData = await analyticsService.getAnalyticsWidgets('user_activity', {
  fromDate: new Date('2024-01-01'),
  toDate: new Date('2024-01-31'),
  granularity: 'week',
  dataPoints: 12
});
```

### Real-time Analytics
```typescript
const realTimeData = await analyticsService.getRealTimeAnalytics({
  timeWindow: 60,
  refreshInterval: 30,
  eventTypes: ['article_view', 'user_follow'],
  includeLiveUsers: true
});
```

### Data Export
```typescript
const exportResult = await analyticsService.exportAnalyticsData({
  format: 'csv',
  includeRawData: true,
  includeAggregatedData: true,
  fromDate: new Date('2024-01-01'),
  toDate: new Date('2024-01-31')
});
```

## 🚀 Performance Optimization

### Caching Strategy
- **Event Data**: 5-minute TTL with 1-minute SWR
- **Aggregated Metrics**: 1-hour TTL
- **Dashboard Data**: 15-minute TTL

### Database Optimization
- **Indexes**: userId, eventType, subjectType+subjectId, createdAt
- **Partitioning**: By date for large datasets
- **Cleanup**: Automated removal of old data

### Real-time Optimization
- **Connection Pooling**: Efficient WebSocket management
- **Event Batching**: Grouped event processing
- **Memory Management**: Limited event buffer size

## 🔒 Security Considerations

### Authentication
- All endpoints require authentication (`@Auth()`)
- User-specific data filtering
- Role-based access control

### Data Privacy
- IP address anonymization options
- User data retention policies
- GDPR compliance features

### Rate Limiting
- API rate limiting
- WebSocket connection limits
- Export request throttling

## 📈 Monitoring & Alerting

### Health Checks
- Database connectivity
- Cache service status
- Real-time connection health
- Export service availability

### Metrics Tracking
- API response times
- Database query performance
- Real-time connection count
- Export success rates

### Alerting
- High error rates
- Database performance issues
- Real-time connection failures
- Export service downtime

## 🎯 Future Enhancements

### Planned Features
1. **Machine Learning Integration**
   - Predictive analytics
   - Anomaly detection
   - User behavior prediction

2. **Advanced Visualizations**
   - Interactive charts
   - Custom dashboard builder
   - Mobile-responsive widgets

3. **Enhanced Real-time Features**
   - Live user tracking
   - Real-time notifications
   - Collaborative dashboards

4. **Data Science Tools**
   - Advanced segmentation
   - Cohort analysis
   - A/B testing integration

## 📞 Support

For questions or issues with the Analytics Module:
- Check the test files for usage examples
- Review the API documentation
- Check the health endpoint for system status
- Monitor the application logs for errors

---

**Analytics Module** - Comprehensive analytics and dashboard system for modern web applications 🚀

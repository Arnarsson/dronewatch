# 📰 DroneWatch News Features

## 🎯 Overview

Complete news monitoring and analysis system for DroneWatch, providing real-time news alerts, source analytics, trend analysis, and AI-powered insights.

## ✨ Features

### 📊 News Dashboard
- **Real-time News Feed**: Live updates from multiple sources
- **Source Filtering**: Filter by Reuters, BBC, CNN, Guardian, AP News
- **Time Range Filtering**: Last hour, 24 hours, week, month
- **Breaking News Alerts**: High-priority incident notifications
- **AI Analysis**: Automated incident classification and geolocation

### 🚨 News Alerts
- **Real-time Notifications**: WebSocket-based live alerts
- **Severity-based Filtering**: Configurable alert thresholds
- **Sound Alerts**: Audio notifications for critical incidents
- **Alert Management**: View, share, and manage alerts
- **Keyboard Shortcuts**: Quick access and control

### 📈 News Analytics
- **Source Performance**: Track reliability and accuracy
- **Response Time Monitoring**: Monitor source performance
- **Uptime Tracking**: System availability metrics
- **Trend Analysis**: Performance trends over time
- **Export Data**: Download analytics reports

### 🔮 News Trends
- **Keyword Analysis**: Trending terms and phrases
- **Location Hotspots**: Geographic incident patterns
- **Time Patterns**: Peak incident hours and patterns
- **AI Insights**: Automated pattern detection
- **Predictions**: Forecast future incident trends

## 🚀 Quick Start

### 1. Import the News Features

```javascript
import { initializeNewsFeatures } from './scripts/integrate-news-features.js';

// Initialize with default configuration
const newsService = initializeNewsFeatures();
```

### 2. Custom Configuration

```javascript
const newsService = initializeNewsFeatures({
  enableDashboard: true,
  enableAlerts: true,
  enableAnalytics: true,
  enableTrends: true,
  alertThreshold: 7,
  confidenceThreshold: 80,
  refreshInterval: 300000 // 5 minutes
});
```

### 3. Manual Component Initialization

```javascript
import { NewsDashboard } from './components/news-dashboard.js';
import { NewsAlerts } from './components/news-alerts.js';
import { NewsAnalytics } from './components/news-analytics.js';
import { NewsTrends } from './components/news-trends.js';

// Initialize individual components
const dashboard = new NewsDashboard('news-dashboard', {
  refreshInterval: 300000,
  maxArticles: 50,
  sources: ['reuters', 'bbc', 'cnn', 'guardian']
});

const alerts = new NewsAlerts({
  alertThreshold: 7,
  confidenceThreshold: 80,
  maxAlerts: 10,
  soundEnabled: true
});
```

## 🎮 Usage

### News Dashboard
- **Access**: Click "📰 News" button or press `Ctrl/Cmd + N`
- **Features**: 
  - Real-time news feed
  - Source and time filtering
  - Article analysis
  - Breaking news alerts

### News Alerts
- **Automatic**: Alerts appear automatically for high-severity incidents
- **Management**: 
  - Click to view details
  - Share alerts
  - Mute sources
  - Clear all alerts

### News Analytics
- **Access**: Click "📊 Analytics" button or press `Ctrl/Cmd + A`
- **Features**:
  - Source performance metrics
  - Reliability scoring
  - Trend analysis
  - Export capabilities

### News Trends
- **Access**: Click "📈 Trends" button or press `Ctrl/Cmd + T`
- **Features**:
  - Keyword trending
  - Location hotspots
  - Time pattern analysis
  - AI insights and predictions

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + N` | Toggle News Dashboard |
| `Ctrl/Cmd + A` | Toggle Analytics |
| `Ctrl/Cmd + T` | Toggle Trends |
| `Ctrl/Cmd + R` | Refresh All Features |
| `Ctrl/Cmd + M` | Toggle Sound Alerts |

## 🔧 Configuration

### News Dashboard
```javascript
{
  refreshInterval: 300000,    // 5 minutes
  maxArticles: 50,           // Maximum articles to display
  sources: ['reuters', 'bbc', 'cnn', 'guardian', 'ap-news']
}
```

### News Alerts
```javascript
{
  alertThreshold: 7,          // Severity threshold (1-10)
  confidenceThreshold: 80,    // Confidence threshold (0-100)
  maxAlerts: 10,             // Maximum concurrent alerts
  alertDuration: 10000,       // Alert display duration (ms)
  soundEnabled: true         // Enable sound alerts
}
```

### News Analytics
```javascript
{
  updateInterval: 60000,     // 1 minute
  maxHistory: 1000,          // Maximum history entries
  timeRange: '168'           // Default time range (hours)
}
```

### News Trends
```javascript
{
  updateInterval: 300000,    // 5 minutes
  trendWindow: 7,            // Days to analyze
  minOccurrences: 3          // Minimum occurrences for trends
}
```

## 📡 API Endpoints

### GET /api/news
Get news articles with filtering options.

**Query Parameters:**
- `source`: Filter by news source
- `timeRange`: Time range (1, 24, 168, 720 hours)
- `limit`: Maximum articles to return

**Response:**
```json
{
  "articles": [...],
  "sources": [...],
  "trends": [...],
  "total": 50,
  "timestamp": "2024-01-20T10:30:00Z"
}
```

### POST /api/analyze-article
AI analysis of specific article.

**Request Body:**
```json
{
  "articleId": "article-123",
  "text": "Article content..."
}
```

**Response:**
```json
{
  "articleId": "article-123",
  "analysis": {
    "confidence": 85,
    "severity": 7,
    "keyFacts": [...],
    "locations": [...]
  },
  "timestamp": "2024-01-20T10:30:00Z"
}
```

### GET /api/analytics
Get news source analytics and performance metrics.

**Response:**
```json
{
  "sources": [...],
  "performance": {
    "totalArticles": 184,
    "totalAlerts": 23,
    "avgResponseTime": 152,
    "uptime": 99.3
  },
  "reliability": {
    "accuracy": 92.4,
    "falsePositives": 2.1,
    "falseNegatives": 5.5
  }
}
```

### GET /api/trends
Get trend analysis and predictions.

**Response:**
```json
{
  "keywords": [...],
  "locations": [...],
  "timePatterns": [...],
  "severityTrends": [...],
  "insights": [...],
  "predictions": [...]
}
```

## 🔌 WebSocket Events

### News Updates
```javascript
// Subscribe to news updates
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'news_updates',
  filters: {
    severity: 5,
    confidence: 70
  }
}));

// Receive news alerts
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'news_alert') {
    // Handle news alert
  }
};
```

## 🎨 Styling

The news features use CSS custom properties for theming:

```css
:root {
  --bg: #0a0d14;
  --surface: #1a1f2b;
  --glass: rgba(26, 31, 43, 0.8);
  --border: #374151;
  --text: #f9fafb;
  --text-muted: #9ca3af;
  --accent: #3b82f6;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
}
```

## 🚀 Advanced Usage

### Custom Event Handlers
```javascript
// Listen for news events
window.addEventListener('news-alert-details', (event) => {
  const { alert } = event.detail;
  console.log('Alert details:', alert);
});

window.addEventListener('configure-source', (event) => {
  const { sourceName, source } = event.detail;
  console.log('Configure source:', sourceName);
});
```

### Manual Component Control
```javascript
// Get component instances
const dashboard = newsService.getComponent('dashboard');
const alerts = newsService.getComponent('alerts');
const analytics = newsService.getComponent('analytics');
const trends = newsService.getComponent('trends');

// Refresh specific components
dashboard.loadNews();
analytics.loadAnalytics();
trends.loadTrends();

// Get component data
const alertStats = alerts.getAlertStats();
const sourceRankings = analytics.getSourceRankings();
const topTrends = trends.getTopTrendingKeywords(5);
```

## 🔧 Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check if the server is running
   - Verify WebSocket endpoint is available
   - Check browser console for errors

2. **News Data Not Loading**
   - Verify API endpoints are accessible
   - Check network connectivity
   - Review browser console for errors

3. **Alerts Not Appearing**
   - Check alert thresholds in configuration
   - Verify WebSocket connection
   - Ensure sound permissions are granted

### Debug Mode
```javascript
// Enable debug logging
const newsService = initializeNewsFeatures({
  debug: true,
  logLevel: 'verbose'
});

// Check service status
console.log(newsService.getStatus());
```

## 📚 Examples

### Basic Integration
```html
<!DOCTYPE html>
<html>
<head>
  <title>DroneWatch with News Features</title>
</head>
<body>
  <div id="app">
    <!-- Your existing DroneWatch app -->
  </div>
  
  <script type="module">
    import { initializeNewsFeatures } from './scripts/integrate-news-features.js';
    
    // Initialize news features
    const newsService = initializeNewsFeatures();
  </script>
</body>
</html>
```

### Custom Configuration
```javascript
import { initializeNewsFeatures } from './scripts/integrate-news-features.js';

const newsService = initializeNewsFeatures({
  enableDashboard: true,
  enableAlerts: true,
  enableAnalytics: false,  // Disable analytics
  enableTrends: true,
  alertThreshold: 8,        // Higher threshold
  confidenceThreshold: 90,   // Higher confidence
  refreshInterval: 600000   // 10 minutes
});
```

## 🤝 Contributing

To add new news features:

1. Create component in `components/` directory
2. Add API endpoints in `api/` directory
3. Update integration service
4. Add documentation
5. Test thoroughly

## 📄 License

MIT License - see LICENSE file for details.

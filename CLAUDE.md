# DroneWatch - Professional Drone Incident Monitoring System

## 🎯 Project Overview

**DroneWatch** is a professional operations center application for monitoring drone incidents across European airspace. Built as a single-page application with real-time data visualization, proximity filtering, and AI-powered news integration.

## 🚀 Key Features

### Core Functionality
- **Real-time Incident Mapping**: Interactive Leaflet map with marker clustering
- **Professional Operations UI**: Glassmorphism design with operations center aesthetics
- **Proximity Filtering**: Filter incidents by proximity to airports, harbours, and military bases
- **AI News Integration**: OpenRouter API integration for real-time drone incident news
- **Mobile-First Design**: Responsive layout optimized for both desktop and mobile
- **Data Persistence**: Incident data with evidence tracking and severity scoring

### Technical Highlights
- **Single HTML File**: Zero-build deployment, runs anywhere with a web server
- **Professional Design**: Monospace fonts, glassmorphism effects, operations center styling
- **Advanced Filtering**: Date range, status, evidence strength, proximity, and text search
- **Infrastructure Data**: 14K+ harbours, 3K+ airports for proximity analysis
- **Performance Optimized**: Marker clustering, efficient rendering, caching strategies

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Mapping**: Leaflet.js with marker clustering
- **Data Format**: GeoJSON for geographic features
- **AI Integration**: OpenRouter API with multiple free models
- **Build Process**: None - pure static deployment

### File Structure
```
dronez/
├── index.html              # Main application (single-page app)
├── incidents.json          # Sample incident data
├── data/
│   └── assets/
│       ├── harbours.geojson      # 14,217 European harbours
│       ├── airports_wikidata.geojson  # 3,632 airports
│       ├── military.geojson      # Military installations
│       └── fallback.geojson      # Fallback test data
├── tools/
│   ├── download_manager.py      # Infrastructure data downloader
│   ├── alternative_sources.py   # Backup data sources
│   └── cached_downloads.py      # Smart caching system
└── CLAUDE.md               # This documentation
```

### Data Architecture
```javascript
// Incident Data Structure
{
  "id": "rss-eddf-2025-09-25-vf7h5z",
  "first_seen_utc": "2025-09-25T19:35:00.000Z",
  "asset": {
    "type": "airport",
    "name": "Frankfurt Airport",
    "iata": "FRA", "icao": "EDDF",
    "lat": 50.0264, "lon": 8.5431
  },
  "incident": {
    "category": "sighting|closure|breach",
    "status": "active|resolved|unconfirmed",
    "duration_min": 103,
    "narrative": "Human-readable description"
  },
  "evidence": {
    "strength": 0-3,  // 0=unconfirmed, 3=official
    "sources": [...]
  },
  "scores": {
    "severity": 1-10,
    "risk_radius_m": 4500
  }
}
```

## 🛠️ Development Guide

### Quick Start
```bash
# Clone and serve
git clone <repository-url>
cd dronewatch
python3 -m http.server 8081

# Or use any static server
npx serve -p 8081
```

### Local Development
1. **No Build Process**: Edit `index.html` directly
2. **Live Reload**: Use VS Code Live Server or similar
3. **Testing**: Open browser dev tools for console debugging
4. **Data Updates**: Replace `incidents.json` with new data

### Adding New Features
1. **UI Components**: Add HTML in the appropriate section
2. **Styling**: Use existing CSS custom properties for consistency
3. **JavaScript**: Add functions in logical sections (data, rendering, UI)
4. **State Management**: Use the global `state` object

### Debugging Tips
- Console logging is comprehensive - check browser dev tools
- Use `state.dataLoaded` to track data loading status
- Filter debugging shows which incidents are filtered out and why
- Network tab shows data loading status

## 🎨 UI Design System

### Color Palette
```css
--primary: #1a1a2e        /* Dark navy background */
--secondary: #16213e      /* Darker sections */
--accent: #0f3460         /* Blue accents */
--focus: #e94560          /* Red alerts/focus */
--text: #eee              /* Light text */
--muted: #999             /* Secondary text */
--success: #27ae60        /* Success states */
--warning: #f39c12        /* Warning states */
```

### Typography
- **Primary Font**: `'Fira Code', 'SF Mono', monospace` - Operations center feel
- **Headings**: Military-style all caps with tracking
- **Body**: Clear, readable monospace for data displays

### Components
- **Glassmorphism Cards**: `backdrop-filter: blur(10px)` with transparency
- **Operations Badges**: Status indicators with real-time updates
- **Professional Inputs**: Consistent form styling across all controls
- **Mobile Navigation**: Slide-up panels with smooth animations

## 🔧 Configuration

### API Integration
```javascript
const AI_CONFIG = {
  OPENROUTER_API_URL: 'https://openrouter.ai/api/v1/chat/completions',
  OPENROUTER_API_KEY: 'your-api-key-here',
  FREE_MODELS: [
    'x-ai/grok-4-fast:free',
    'microsoft/phi-3-mini-128k-instruct:free',
    'meta-llama/llama-3.1-8b-instruct:free'
  ]
};
```

### Map Configuration
```javascript
const DEFAULT_CENTER = [54.5, 15.0];  // Central Europe
const DEFAULT_ZOOM = 6;
const CLUSTER_RADIUS = 80;
const MAX_CLUSTER_RADIUS = 120;
```

### Filtering Options
- **Date Range**: 1-365 days (default: 7 days)
- **Status**: active, resolved, unconfirmed
- **Evidence**: 0-3 strength levels
- **Proximity**: 10km radius around infrastructure

## 📊 Data Sources

### Infrastructure Data
- **Harbours**: 14,217 European ports and harbours
- **Airports**: 3,632 airports from Wikidata
- **Military**: Military installations (data source dependent)

### Incident Data
- **Real News**: RSS feeds from major news sources
- **AI Enhanced**: OpenRouter API for real-time incident discovery
- **Manual**: JSON format for custom incident data

### Download Tools
```bash
# Download fresh infrastructure data
python3 tools/download_manager.py

# Use alternative sources
python3 tools/alternative_sources.py

# Check cache status
python3 tools/cached_downloads.py
```

## 🚀 Deployment

### Static Hosting
- **Vercel**: `vercel --prod`
- **Netlify**: Drag & drop deployment
- **GitHub Pages**: Enable in repository settings
- **AWS S3**: Static website hosting

### Requirements
- Any web server capable of serving static files
- HTTPS recommended for geolocation features
- CORS headers for external API calls

### Performance Optimization
- Gzip compression enabled by default
- CDN integration for static assets
- Browser caching for incident data
- Marker clustering for large datasets

## 🔍 Troubleshooting

### Common Issues

**"No data" displayed**
- Check browser console for fetch errors
- Verify `incidents.json` is accessible
- Ensure web server is serving files correctly

**Incidents not appearing**
- Check date range filter (default: 7 days)
- Verify status and evidence filters
- Check console for filter debugging output

**Map not loading**
- Ensure internet connection (Leaflet tiles)
- Check for JavaScript errors in console
- Verify map container has dimensions

**AI integration not working**
- Check OpenRouter API key validity
- Verify CORS headers and HTTPS
- Check rate limits and model availability

### Debug Mode
Set `DEBUG = true` in the JavaScript for verbose logging:
```javascript
const DEBUG = true;  // Enable comprehensive logging
```

## 🛡️ Security Considerations

### API Key Protection
- API keys visible in client-side code
- Use environment variables for server deployments
- Consider proxy server for production use

### Data Privacy
- No user tracking or analytics
- Incident data may contain sensitive information
- Review data sources for compliance requirements

### Content Security Policy
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; connect-src 'self' https://openrouter.ai https://*.tile.openstreetmap.org;">
```

## 📈 Future Enhancements

### Planned Features
- **Real-time WebSocket Updates**: Live incident streaming
- **Historical Analysis**: Trend analysis and reporting
- **Advanced Filtering**: Machine learning-based classification
- **Multi-language Support**: International operations support
- **API Integration**: Additional news sources and official feeds

### Technical Improvements
- **Progressive Web App**: Offline capability and caching
- **Performance Monitoring**: Real user monitoring integration
- **Advanced Security**: Content Security Policy hardening
- **Accessibility**: WCAG 2.1 AA compliance improvements

## 📝 Contributing

### Development Workflow
1. Create feature branch from main
2. Test thoroughly with local data
3. Ensure mobile responsiveness
4. Update documentation if needed
5. Submit pull request with description

### Code Standards
- ES6+ JavaScript features
- Consistent indentation (2 spaces)
- Descriptive variable and function names
- Comments for complex logic
- Performance-conscious implementations

### Testing Checklist
- [ ] Desktop responsive (1920x1080, 1366x768)
- [ ] Mobile responsive (375x667, 414x896)
- [ ] Cross-browser compatibility (Chrome, Firefox, Safari)
- [ ] Console error-free
- [ ] Map interactions working
- [ ] Filters functioning correctly
- [ ] AI integration operational

---

**DroneWatch** - Professional drone incident monitoring for European airspace operations.
# CLAUDE.md - DroneWatch Context Engineering Guide

This file provides comprehensive context engineering for Claude Code (claude.ai/code) when working with the DroneWatch repository.

## Project Awareness

**Before starting any task:**
- Read `INITIAL.md` if working on a new feature
- Check `TASK.md` for current objectives
- Review `examples/` folder for code patterns
- Understand the incident data schema (core to everything)

**Project Philosophy:**
- Single-page application with zero build process
- Real-time monitoring with operational efficiency
- Professional operations center aesthetics
- Mobile-first responsive design

## Code Structure & Conventions

### File Organization
- **Main app**: `index.html` - Single file containing all UI code
- **Live version**: `index-live.html` - WebSocket-enabled version
- **Automation**: `automation/` - Node.js services for data collection
- **Tools**: `tools/` - Python utilities for infrastructure data
- **Data**: `data/assets/` - GeoJSON infrastructure files

### JavaScript Patterns
```javascript
// State management pattern
const state = {
  map: null,           // Leaflet map instance
  markers: null,       // MarkerClusterGroup
  incidents: [],       // Current incidents
  filters: {},         // Active filters
  dataLoaded: {}       // Loading status
};

// Function naming convention
function renderIncidents() { }      // UI rendering
function applyFilters() { }         // Data filtering
function handleFilterChange() { }   // Event handlers
function fetchIncidentData() { }    // Data fetching
```

### CSS Architecture
- Custom properties for theming
- Glassmorphism effects with backdrop-filter
- Mobile-first breakpoints at 768px
- Operations center aesthetic with monospace fonts

## Testing & Validation

### Before Any Change
1. Verify current functionality works
2. Check browser console for existing errors
3. Test on mobile viewport (375px width)
4. Ensure map loads and incidents display

### After Implementation
```bash
# Run test suites
npm test

# Check specific functionality
npm run test:scraper     # RSS scraper
npm run test:enhanced    # Enhanced features
npm run test:final       # Coverage tests

# Manual verification
- Open browser console (no errors)
- Test all filters work
- Verify mobile responsiveness
- Check map clustering at 100+ incidents
```

### Validation Gates
- ✅ No console errors
- ✅ Incidents display within date range
- ✅ All filters functional
- ✅ Mobile responsive
- ✅ Map loads correctly
- ✅ WebSocket connects (if using live version)

## Development Workflow

### Starting Development
```bash
# Install dependencies
npm install

# Start dev server with live updates
npm run dev              # Port 8081

# Or simple static server
python3 -m http.server 8081
```

### Making UI Changes
1. Locate section in `index.html` (search for comments)
2. Use existing CSS custom properties
3. Follow glassmorphism design pattern
4. Test at 375px, 768px, and 1920px widths

### Adding Data Sources
1. Create scraper in `automation/scrapers/`
2. Register in `comprehensive-aggregator.js`
3. Update `incident-generator.js` for new format
4. Add evidence classification rules

### Updating Infrastructure Data
```bash
# Download fresh data
python3 tools/download_manager.py

# Check cache first
python3 tools/cached_downloads.py

# Build optimized bundles
npm run build-assets
```

## Critical Data Structures

### Incident Schema (NEVER CHANGE WITHOUT UPDATING ALL CONSUMERS)
```javascript
{
  "id": "rss-{location}-{date}-{hash}",     // Unique identifier pattern
  "first_seen_utc": "2025-09-25T19:35:00Z", // ISO8601 timestamp
  "asset": {
    "type": "airport|harbour|military|city",
    "name": "Frankfurt Airport",
    "iata": "FRA",                          // For airports
    "icao": "EDDF",                         // For airports
    "lat": 50.0264,                         // WGS84 decimal
    "lon": 8.5431                           // WGS84 decimal
  },
  "incident": {
    "category": "sighting|closure|breach|threat",
    "status": "active|resolved|unconfirmed",
    "duration_min": 103,
    "narrative": "Drone sighting caused temporary closure..."
  },
  "evidence": {
    "strength": 2,                          // 0-3 scale (0=unconfirmed, 3=official)
    "attribution": "confirmed|suspected|alleged",
    "sources": [
      {
        "name": "Reuters",
        "url": "https://...",
        "timestamp": "2025-09-25T19:40:00Z"
      }
    ]
  },
  "scores": {
    "severity": 3,                          // 1-10 scale
    "risk_radius_m": 4500                   // Affected area in meters
  }
}
```

### Filter State Structure
```javascript
{
  dateRange: 7,              // Days to show
  status: ["active"],        // Status filters
  evidence: [0, 1, 2, 3],    // Evidence strength
  proximity: {
    enabled: false,
    types: ["airports", "harbours", "military"],
    radius: 10000            // Meters
  },
  search: ""                 // Text search
}
```

## Performance Considerations

### Critical Thresholds
- **Marker clustering**: Activates at 100+ incidents
- **Debounce delays**: 10 seconds on filter changes
- **Rate limits**: 30-45 second delays between API calls
- **Cache TTL**: 24 hours for incidents, 7 days for infrastructure

### Optimization Patterns
```javascript
// Debounce pattern for filters
let filterTimeout;
function handleFilterChange() {
  clearTimeout(filterTimeout);
  filterTimeout = setTimeout(() => {
    applyFilters();
  }, 1000);
}

// Lazy loading for infrastructure
function loadInfrastructureLayer(type) {
  if (state.dataLoaded[type]) return;
  // Load only when needed
}
```

## Configuration Points

### API Integration (index.html ~line 3000)
```javascript
const AI_CONFIG = {
  OPENROUTER_API_URL: 'https://openrouter.ai/api/v1/chat/completions',
  OPENROUTER_API_KEY: 'sk-or-v1-...',  // User must add
  FREE_MODELS: [
    'x-ai/grok-4-fast:free',
    'microsoft/phi-3-mini-128k-instruct:free',
    'meta-llama/llama-3.1-8b-instruct:free'
  ]
};
```

### Map Configuration (index.html ~line 2800)
```javascript
const DEFAULT_CENTER = [54.5, 15.0];  // Central Europe
const DEFAULT_ZOOM = 6;
const CLUSTER_RADIUS = 80;            // Pixel radius for clustering
const MAX_CLUSTER_RADIUS = 120;       // Maximum cluster size
```

### Automation Settings (automation/config.js)
```javascript
{
  UPDATE_INTERVAL: 5 * 60 * 1000,     // 5 minutes (dev)
  PRODUCTION_INTERVAL: 30 * 60 * 1000, // 30 minutes (prod)
  RATE_LIMIT_DELAY: 30000,            // 30 seconds
  MAX_RETRIES: 3,
  CACHE_TTL: 24 * 60 * 60 * 1000      // 24 hours
}
```

## Common Patterns & Solutions

### Adding a New Filter
```javascript
// 1. Add to filter state
state.filters.newFilter = defaultValue;

// 2. Add UI control
<div class="filter-control">
  <label>New Filter</label>
  <input type="..." id="new-filter" />
</div>

// 3. Add to applyFilters()
filtered = filtered.filter(incident => {
  // Filter logic
});

// 4. Add event listener
document.getElementById('new-filter').addEventListener('change', handleFilterChange);
```

### Adding a New Data Source
```javascript
// 1. Create scraper in automation/scrapers/
export class NewSourceScraper {
  async scrape() {
    // Fetch and parse data
    return incidents;
  }
}

// 2. Register in comprehensive-aggregator.js
import { NewSourceScraper } from './new-source-scraper.js';
this.scrapers.push(new NewSourceScraper());

// 3. Map to incident schema in incident-generator.js
```

## Error Handling

### Common Issues & Fixes

**No incidents displayed:**
```javascript
// Check console for errors
console.log('Incidents loaded:', state.incidents.length);
console.log('Date filter:', state.filters.dateRange);
// Verify incidents.json exists and is valid
```

**Map not loading:**
```javascript
// Ensure container has dimensions
#map { height: 100vh; width: 100%; }
// Check Leaflet tiles loading in Network tab
```

**WebSocket disconnection:**
```javascript
// Exponential backoff reconnection
let reconnectDelay = 1000;
function reconnect() {
  setTimeout(() => {
    connectWebSocket();
    reconnectDelay = Math.min(reconnectDelay * 2, 30000);
  }, reconnectDelay);
}
```

## Deployment Checklist

### Pre-deployment
- [ ] Run all tests: `npm test`
- [ ] Check browser console for errors
- [ ] Test mobile responsiveness
- [ ] Verify date filters work
- [ ] Ensure map loads correctly

### Build & Deploy
```bash
# Build for production
npm run build              # Creates dist/ folder

# Deploy to Vercel
npm run vercel-build
vercel --prod

# Or deploy dist/ to any static host
```

### Post-deployment
- [ ] Verify HTTPS enabled
- [ ] Check CORS headers for API calls
- [ ] Test WebSocket connection
- [ ] Monitor error logs

## AI Interaction Guidelines

### When Working on This Project
1. **Always check existing patterns** before creating new ones
2. **Never modify the incident schema** without updating all consumers
3. **Test mobile first** - most users are on mobile devices
4. **Preserve glassmorphism aesthetic** - it's core to the brand
5. **Keep everything in index.html** for UI changes - no separate files

### Before Making Changes
- Read this entire file
- Check `examples/` for patterns
- Verify current functionality
- Understand the data flow

### After Implementation
- Run tests
- Check browser console
- Test mobile viewport
- Verify filters work
- Ensure map displays correctly

## Project-Specific Gotchas

1. **Single-file constraint**: All UI code must stay in index.html
2. **No build process**: Cannot use modern JS modules in browser
3. **Rate limiting**: External APIs have strict limits - respect delays
4. **Large datasets**: Infrastructure files are 10+ MB each
5. **Mobile performance**: Marker clustering essential for mobile devices
6. **WebSocket reconnection**: Must handle network interruptions gracefully

---

Remember: DroneWatch is a professional operations center application. Every change should maintain or enhance the operational efficiency and professional aesthetic.
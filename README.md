# 🚁 DroneWatch

**Professional Drone Incident Monitoring System for European Airspace**

![DroneWatch Screenshot](https://img.shields.io/badge/Status-Production_Ready-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)
![Technology](https://img.shields.io/badge/Tech-Vanilla_JS-yellow)

## 🎯 Overview

DroneWatch is a professional operations center application designed for real-time monitoring and analysis of drone incidents across European airspace. Built with a focus on operational efficiency, the application provides comprehensive incident tracking, proximity-based filtering, and AI-powered news integration.

## ✨ Key Features

### 🗺️ **Real-time Incident Mapping**
- Interactive Leaflet map with intelligent marker clustering
- European-wide coverage with detailed incident visualization
- Professional operations center design aesthetic

### 🔍 **Advanced Filtering System**
- **Date Range**: 1-365 days historical data
- **Status Filtering**: Active, resolved, unconfirmed incidents
- **Evidence Strength**: 4-tier evidence classification system
- **Proximity Analysis**: 10km radius filtering around critical infrastructure
- **Text Search**: Real-time incident narrative and location search

### 🏢 **Infrastructure Integration**
- **14,217 European harbours** for maritime proximity analysis
- **3,632 airports** from Wikidata for aviation safety
- **Military installations** for security assessment
- **Automated proximity detection** within configurable radius

### 🤖 **AI-Powered News Integration**
- OpenRouter API integration with multiple free models
- Real-time drone incident discovery from news sources
- Automated incident classification and geolocation
- Support for Grok-4 Fast, LLaMA 3.1, Phi-3, and more

### 📱 **Mobile-First Design**
- Responsive glassmorphism UI design
- Touch-optimized controls and navigation
- Progressive Web App capabilities
- Cross-platform compatibility

## 🚀 Quick Start

### Prerequisites
- Modern web browser with JavaScript enabled
- Internet connection for map tiles and API calls
- Optional: OpenRouter API key for AI news integration

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/dronewatch.git
cd dronewatch

# Start a local web server
python3 -m http.server 8081

# Or use any static server
npx serve -p 8081
```

### Access the Application
Open your browser and navigate to: `http://localhost:8081`

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Mapping**: Leaflet.js with marker clustering plugin
- **Data Format**: GeoJSON for geographic features
- **AI Integration**: OpenRouter API with multiple model support
- **Deployment**: Static files - no build process required

### File Structure
```
dronewatch/
├── index.html                     # Single-page application
├── incidents.json                 # Sample incident data
├── data/assets/                   # Infrastructure data
│   ├── harbours.geojson          # European harbours (14K+)
│   ├── airports_wikidata.geojson # Airport data (3K+)
│   └── military.geojson          # Military installations
├── tools/                        # Data management utilities
│   ├── download_manager.py       # Infrastructure downloader
│   ├── alternative_sources.py    # Backup data sources
│   └── cached_downloads.py       # Caching system
├── README.md                     # This file
└── CLAUDE.md                     # Technical documentation
```

## 📊 Data Format

### Incident Data Structure
```json
{
  "id": "rss-eddf-2025-09-25-vf7h5z",
  "first_seen_utc": "2025-09-25T19:35:00.000Z",
  "asset": {
    "type": "airport",
    "name": "Frankfurt Airport",
    "iata": "FRA",
    "icao": "EDDF",
    "lat": 50.0264,
    "lon": 8.5431
  },
  "incident": {
    "category": "sighting",
    "status": "resolved",
    "duration_min": 103,
    "narrative": "Detailed incident description"
  },
  "evidence": {
    "strength": 2,
    "attribution": "suspected",
    "sources": [...]
  },
  "scores": {
    "severity": 3,
    "risk_radius_m": 4500
  }
}
```

## 🔧 Configuration

### AI Integration
To enable AI-powered news integration, add your OpenRouter API key:

```javascript
const AI_CONFIG = {
  OPENROUTER_API_KEY: 'sk-or-v1-your-api-key-here',
  FREE_MODELS: [
    'x-ai/grok-4-fast:free',
    'microsoft/phi-3-mini-128k-instruct:free',
    'meta-llama/llama-3.1-8b-instruct:free'
  ]
};
```

### Map Customization
```javascript
const DEFAULT_CENTER = [54.5, 15.0];  // Central Europe
const DEFAULT_ZOOM = 6;
const CLUSTER_RADIUS = 80;
```

## 🎨 Design System

### Professional Operations UI
- **Glassmorphism Design**: Modern translucent interfaces
- **Monospace Typography**: `Fira Code` for operational clarity
- **Dark Theme**: Optimized for extended operational use
- **Responsive Layout**: CSS Grid with mobile-first approach

### Color Palette
```css
--primary: #1a1a2e      /* Dark navy background */
--accent: #0f3460       /* Blue operational accents */
--focus: #e94560        /* Critical alert red */
--success: #27ae60      /* Operational success */
--text: #eee            /* High contrast text */
```

## 📈 Usage Examples

### Basic Incident Monitoring
1. Open DroneWatch in your browser
2. View current incidents on the European map
3. Use date range slider to adjust time window
4. Filter by incident status and evidence strength

### Proximity Analysis
1. Enable proximity filters for airports, harbours, or military bases
2. View only incidents within 10km of critical infrastructure
3. Analyze patterns and potential security implications

### AI News Integration
1. Click the "🤖 AI News" button in the header
2. System fetches latest drone incidents from news sources
3. New incidents are automatically added to the map
4. AI-generated incidents are marked with special tags

## 🛠️ Development

### Local Development
```bash
# No build process required - edit index.html directly
# Use browser dev tools for debugging
# Hot reload with VS Code Live Server extension
```

### Adding Features
1. **UI Components**: Add HTML in the appropriate section
2. **Styling**: Use CSS custom properties for consistency
3. **JavaScript**: Follow existing patterns and state management
4. **Data Sources**: Update tools/ scripts for new data integration

### Testing
- Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- Mobile responsiveness testing
- Console error monitoring
- Performance validation with large datasets

## 🚀 Deployment

### Static Hosting Options
- **Vercel**: `vercel --prod`
- **Netlify**: Drag & drop deployment
- **GitHub Pages**: Enable in repository settings
- **AWS S3**: Static website hosting with CloudFront

### Requirements
- HTTPS recommended for geolocation features
- CORS headers for external API integration
- Gzip compression for optimal performance

## 🔍 Troubleshooting

### Common Issues

**No incidents displayed**
- Check browser console for errors
- Verify `incidents.json` is accessible
- Adjust date range filter (default: 7 days)

**Map not loading**
- Ensure internet connection for map tiles
- Check for JavaScript errors
- Verify container dimensions

**AI integration failing**
- Validate OpenRouter API key
- Check CORS and HTTPS requirements
- Monitor rate limits

## 📚 Documentation

- **[CLAUDE.md](./CLAUDE.md)**: Comprehensive technical documentation
- **[Tools Documentation](./tools/)**: Data management and infrastructure tools
- **Browser Dev Tools**: Enable console logging for debugging

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Standards
- ES6+ JavaScript features
- Consistent 2-space indentation
- Descriptive naming conventions
- Performance-conscious implementations
- Mobile-first responsive design

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Leaflet.js**: Excellent open-source mapping library
- **OpenStreetMap**: Community-driven map data
- **OpenRouter**: AI API access for news integration
- **Wikidata**: Comprehensive airport database
- **Natural Earth Data**: High-quality geographic datasets

## 📞 Support

For questions, issues, or feature requests:
- Open an issue on GitHub
- Check existing documentation
- Review console logs for debugging information

---

**DroneWatch** - Maintaining situational awareness in European airspace through professional-grade drone incident monitoring.

![European Coverage](https://img.shields.io/badge/Coverage-European_Airspace-blue)
![Real-time](https://img.shields.io/badge/Updates-Real--time-green)
![Mobile Ready](https://img.shields.io/badge/Mobile-Optimized-orange)
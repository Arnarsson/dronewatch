# Custom Commands for DroneWatch

## Quick Commands

### /test-ui
Test the UI on both desktop and mobile viewports
```bash
npm test && open http://localhost:8081
```

### /start-dev
Start development server with all services
```bash
npm run dev
```

### /update-data
Refresh infrastructure data from sources
```bash
python3 tools/download_manager.py && npm run build-assets
```

### /check-incidents
Validate incident data and show stats
```bash
node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync('incidents.json')); console.log('Total incidents:', data.incidents.length); console.log('Active:', data.incidents.filter(i => i.incident.status === 'active').length); console.log('Last 24h:', data.incidents.filter(i => new Date() - new Date(i.first_seen_utc) < 86400000).length);"
```

### /scrape-news
Run news scraping pipeline
```bash
npm run scrape
```

### /validate-schema
Validate all incidents match schema
```bash
node automation/quality-controller.js validate
```

### /deploy-production
Build and deploy to production
```bash
npm run build && npm run vercel-build && vercel --prod
```

### /monitor-websocket
Watch WebSocket connections in real-time
```bash
node -e "const ws = require('ws'); const client = new ws('ws://localhost:8081/ws'); client.on('message', data => console.log('Received:', JSON.parse(data))); client.on('open', () => console.log('Connected'));"
```

### /analyze-performance
Check performance metrics
```bash
node -e "console.log('Checking performance...'); const size = require('fs').statSync('index.html').size / 1024; console.log('HTML size:', size.toFixed(2), 'KB'); const incidents = require('./incidents.json'); console.log('Incidents:', incidents.incidents.length); console.log('Avg incident size:', (JSON.stringify(incidents).length / incidents.incidents.length / 1024).toFixed(2), 'KB');"
```

### /clean-logs
Clean up old log files
```bash
find . -name "*.log" -mtime +7 -exec rm {} \; && echo "Cleaned old logs"
```
#!/usr/bin/env node

/**
 * DroneWatch Live Server
 * Serves the application and runs automatic updates with WebSocket support
 */

import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import fs from 'fs/promises';
import { LiveUpdateService } from './live-update-service.js';
import { WebSocketService } from './websocket-service.js';
import { AlertService } from './alert-service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8081;

// Create HTTP server
const server = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from parent directory
app.use(express.static(path.join(__dirname, '..')));

// Initialize services
let updateService;
let wsService;
let alertService;

// API endpoint for live incidents with query params
app.get('/api/incidents', async (req, res) => {
  try {
    const data = await fs.readFile(path.join(__dirname, '..', 'incidents.json'), 'utf8');
    const incidents = JSON.parse(data);

    // Apply filters from query params
    let filtered = incidents.incidents || [];

    if (req.query.status) {
      filtered = filtered.filter(i => i.incident.status === req.query.status);
    }

    if (req.query.days) {
      const cutoff = Date.now() - (parseInt(req.query.days) * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(i => new Date(i.first_seen_utc).getTime() > cutoff);
    }

    res.json({
      ...incidents,
      incidents: filtered,
      filtered: true,
      query: req.query
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint for update status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    lastUpdate: updateService?.stats?.lastUpdate || null,
    totalUpdates: updateService?.stats?.totalUpdates || 0,
    newIncidentsToday: updateService?.stats?.newIncidentsToday || 0,
    sourcesActive: updateService?.stats?.sourcesActive || 0,
    websocket: {
      clients: wsService?.clients?.size || 0,
      messages: wsService?.stats?.messagesOut || 0
    }
  });
});

// API endpoint for sources status
app.get('/api/sources', (req, res) => {
  res.json({
    rss: {
      enabled: true,
      feeds: 180,
      lastCheck: updateService?.stats?.lastUpdate || null
    },
    twitter: {
      enabled: updateService?.twitterEnabled || false,
      accounts: updateService?.authorityAccounts?.length || 0,
      note: updateService?.twitterEnabled ? 'Active' : 'Simulated for demo'
    },
    apis: {
      enabled: false,
      note: 'Coming soon'
    },
    webhooks: {
      enabled: false,
      note: 'Contact for integration'
    }
  });
});

// API endpoint for active alerts
app.get('/api/alerts', (req, res) => {
  if (alertService) {
    res.json({
      active: alertService.getActiveAlerts(),
      stats: alertService.getAlertStats()
    });
  } else {
    res.status(503).json({ error: 'Alert service not initialized' });
  }
});

// API endpoint to clear an alert
app.post('/api/alerts/:id/clear', (req, res) => {
  if (alertService) {
    const success = alertService.clearAlert(req.params.id);
    if (success) {
      res.json({ status: 'cleared', id: req.params.id });
    } else {
      res.status(404).json({ error: 'Alert not found' });
    }
  } else {
    res.status(503).json({ error: 'Alert service not initialized' });
  }
});

// API endpoint to trigger manual update
app.post('/api/update', async (req, res) => {
  if (updateService) {
    console.log('📡 Manual update triggered via API');
    updateService.performFullUpdate();
    res.json({ status: 'Update triggered', timestamp: new Date().toISOString() });
  } else {
    res.status(503).json({ error: 'Update service not initialized' });
  }
});

// Start server
server.listen(PORT, async () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║       🚁 DroneWatch LIVE Server                      ║
║                                                      ║
║  Application: http://localhost:${PORT}                ║
║  Live Version: http://localhost:${PORT}/index-live.html  ║
║  API Status: http://localhost:${PORT}/api/status      ║
║  WebSocket: ws://localhost:${PORT}                    ║
║                                                      ║
║  Features:                                           ║
║  ✅ Real-time WebSocket updates                     ║
║  ✅ RSS feed monitoring (180+ sources)              ║
║  ✅ Authority Twitter monitoring                    ║
║  ✅ 15-minute auto-refresh                         ║
║  ✅ Breaking news checks (5 min)                   ║
║                                                      ║
║  Press Ctrl+C to stop                              ║
╚══════════════════════════════════════════════════════╝
  `);

  // Initialize WebSocket service
  wsService = new WebSocketService(server);
  console.log('✅ WebSocket service initialized');

  // Initialize alert service
  alertService = new AlertService({
    severityThreshold: 7,
    channels: {
      webhook: process.env.ALERT_WEBHOOK_URL,
      email: process.env.ALERT_EMAIL,
      websocket: true
    }
  });
  await alertService.initialize();
  alertService.setWebSocketService(wsService);
  console.log('✅ Alert service initialized');

  // Initialize update service with WebSocket integration
  updateService = new LiveUpdateService();

  // Connect update service to WebSocket for real-time broadcasts
  updateService.on = (event, callback) => {
    // Override the broadcastUpdate method to use WebSocket
    if (event === 'broadcast') {
      updateService.broadcastUpdate = () => {
        if (wsService) {
          wsService.broadcastUpdate('data_refresh', {
            source: 'automated',
            timestamp: new Date().toISOString()
          });
        }
      };
    }
  };

  await updateService.initialize();
  console.log('✅ Update service initialized');

  // Notify WebSocket clients when new incidents are found
  const originalPerformUpdate = updateService.performFullUpdate.bind(updateService);
  updateService.performFullUpdate = async function() {
    const result = await originalPerformUpdate();

    // If new incidents were found, broadcast to WebSocket clients
    if (updateService.stats.newIncidentsToday > 0 && wsService) {
      wsService.broadcastNewIncidents(updateService.currentIncidents.incidents.slice(0, 5));
      wsService.broadcastStatistics(updateService.stats);

      // Evaluate new incidents for alerts
      if (alertService) {
        const newIncidents = updateService.currentIncidents.incidents
          .filter(i => new Date(i.first_seen_utc) > new Date(Date.now() - 3600000)); // Last hour

        const alerts = await alertService.evaluateBatch(newIncidents);
        if (alerts.length > 0) {
          console.log(`🚨 ${alerts.length} critical incidents triggered alerts`);
        }
      }
    }

    return result;
  };
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');

  if (wsService) {
    wsService.shutdown();
  }

  setTimeout(() => {
    process.exit(0);
  }, 1000);
});
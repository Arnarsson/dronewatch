/**
 * DroneWatch WebSocket Service
 * Real-time incident broadcasting to connected clients
 */

import { WebSocketServer } from 'ws';
import EventEmitter from 'events';

export class WebSocketService extends EventEmitter {
  constructor(server) {
    super();
    this.wss = new WebSocketServer({ server });
    this.clients = new Set();
    this.stats = {
      connections: 0,
      messagesOut: 0,
      messagesIn: 0,
      startTime: new Date()
    };

    this.initializeWebSocket();
  }

  initializeWebSocket() {
    console.log('🔌 Initializing WebSocket service...');

    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      const clientIp = req.socket.remoteAddress;

      console.log(`✅ New WebSocket connection: ${clientId} from ${clientIp}`);

      // Add to clients
      ws.clientId = clientId;
      ws.isAlive = true;
      this.clients.add(ws);
      this.stats.connections++;

      // Send welcome message
      this.sendToClient(ws, {
        type: 'welcome',
        clientId: clientId,
        timestamp: new Date().toISOString(),
        message: 'Connected to DroneWatch Live Updates'
      });

      // Setup client handlers
      this.setupClientHandlers(ws);
    });

    // Start heartbeat
    this.startHeartbeat();
  }

  setupClientHandlers(ws) {
    // Handle pong (heartbeat response)
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Handle client messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleClientMessage(ws, message);
        this.stats.messagesIn++;
      } catch (error) {
        console.error('Invalid message from client:', error);
      }
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error(`WebSocket error for ${ws.clientId}:`, error.message);
    });

    // Handle disconnect
    ws.on('close', (code, reason) => {
      console.log(`🔌 Client disconnected: ${ws.clientId} (${code})`);
      this.clients.delete(ws);
    });
  }

  handleClientMessage(ws, message) {
    console.log(`📨 Message from ${ws.clientId}:`, message.type);

    switch(message.type) {
      case 'subscribe':
        ws.subscriptions = message.topics || ['all'];
        this.sendToClient(ws, {
          type: 'subscribed',
          topics: ws.subscriptions,
          timestamp: new Date().toISOString()
        });
        break;

      case 'filter':
        ws.filters = message.filters || {};
        this.sendToClient(ws, {
          type: 'filters_updated',
          filters: ws.filters,
          timestamp: new Date().toISOString()
        });
        break;

      case 'ping':
        this.sendToClient(ws, {
          type: 'pong',
          timestamp: new Date().toISOString()
        });
        break;

      case 'status':
        this.sendToClient(ws, {
          type: 'status',
          stats: this.stats,
          clients: this.clients.size,
          uptime: Date.now() - this.stats.startTime.getTime(),
          timestamp: new Date().toISOString()
        });
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  // Broadcast methods for different event types

  broadcastNewIncidents(incidents) {
    const message = {
      type: 'new_incidents',
      data: incidents,
      count: incidents.length,
      timestamp: new Date().toISOString()
    };

    this.broadcast(message, 'incidents');
    console.log(`📢 Broadcasting ${incidents.length} new incidents to clients`);
  }

  broadcastUpdate(updateType, data) {
    const message = {
      type: 'update',
      updateType: updateType,
      data: data,
      timestamp: new Date().toISOString()
    };

    this.broadcast(message, 'updates');
  }

  broadcastAlert(alert) {
    const message = {
      type: 'alert',
      severity: alert.severity,
      title: alert.title,
      description: alert.description,
      location: alert.location,
      timestamp: new Date().toISOString()
    };

    this.broadcast(message, 'alerts');
    console.log(`🚨 Broadcasting alert: ${alert.title}`);
  }

  broadcastSourceUpdate(source, status) {
    const message = {
      type: 'source_update',
      source: source,
      status: status,
      timestamp: new Date().toISOString()
    };

    this.broadcast(message, 'sources');
  }

  broadcastStatistics(stats) {
    const message = {
      type: 'statistics',
      stats: stats,
      timestamp: new Date().toISOString()
    };

    this.broadcast(message, 'stats');
  }

  // Core broadcast method
  broadcast(message, topic = 'all') {
    let sentCount = 0;

    this.clients.forEach(ws => {
      if (ws.readyState === ws.OPEN) {
        // Check if client is subscribed to this topic
        if (!ws.subscriptions || ws.subscriptions.includes('all') || ws.subscriptions.includes(topic)) {
          // Apply client filters if any
          if (this.shouldSendToClient(ws, message)) {
            this.sendToClient(ws, message);
            sentCount++;
          }
        }
      }
    });

    this.stats.messagesOut += sentCount;
    return sentCount;
  }

  shouldSendToClient(ws, message) {
    if (!ws.filters) return true;

    // Apply filters based on message type
    if (message.type === 'new_incidents' && message.data) {
      // Filter incidents based on client preferences
      const filtered = message.data.filter(incident => {
        if (ws.filters.severity && incident.scores.severity < ws.filters.severity) {
          return false;
        }
        if (ws.filters.status && incident.incident.status !== ws.filters.status) {
          return false;
        }
        if (ws.filters.country && incident.asset.country !== ws.filters.country) {
          return false;
        }
        return true;
      });

      // Only send if there are incidents after filtering
      return filtered.length > 0;
    }

    return true;
  }

  sendToClient(ws, message) {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Failed to send to client ${ws.clientId}:`, error);
    }
  }

  // Heartbeat to detect disconnected clients
  startHeartbeat() {
    const interval = setInterval(() => {
      this.clients.forEach(ws => {
        if (ws.isAlive === false) {
          console.log(`💔 Terminating dead connection: ${ws.clientId}`);
          ws.terminate();
          this.clients.delete(ws);
          return;
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  generateClientId() {
    return 'client-' + Math.random().toString(36).substr(2, 9);
  }

  // Get current statistics
  getStats() {
    return {
      ...this.stats,
      activeClients: this.clients.size,
      uptime: Date.now() - this.stats.startTime.getTime()
    };
  }

  // Clean shutdown
  shutdown() {
    console.log('🔌 Shutting down WebSocket service...');

    // Notify all clients
    const message = {
      type: 'shutdown',
      message: 'Server is shutting down',
      timestamp: new Date().toISOString()
    };

    this.broadcast(message);

    // Close all connections
    this.clients.forEach(ws => {
      ws.close(1000, 'Server shutdown');
    });

    this.wss.close();
  }
}
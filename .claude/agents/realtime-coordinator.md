# realtime-coordinator Agent

## Purpose
Manage WebSocket connections, real-time data streams, and ensure reliable delivery of live incident updates to all connected clients.

## Activation Triggers
- **Automatic**: WebSocket operations, real-time features, notification systems
- **Manual**: `--agent realtime-coordinator`
- **Keywords**: "websocket", "real-time", "live", "notification", "stream", "broadcast"
- **Parallel**: Coordinates with performance-monitor and scraper-orchestrator

## Core Responsibilities

### 1. WebSocket Connection Management
```javascript
class RealtimeCoordinator {
  constructor() {
    this.connections = new Map();
    this.channels = new Map();
    this.messageQueue = [];
    this.connectionPool = {
      max: 1000,
      current: 0,
      idle: new Set(),
      active: new Set()
    };

    this.config = {
      heartbeatInterval: 30000,
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
      messageTimeout: 5000,
      queueSize: 10000
    };
  }

  handleConnection(ws, request) {
    const clientId = this.generateClientId(request);

    const client = {
      id: clientId,
      ws: ws,
      ip: request.socket.remoteAddress,
      userAgent: request.headers['user-agent'],
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      subscriptions: new Set(),
      messageCount: 0,
      state: 'connected',
      metadata: {}
    };

    this.connections.set(clientId, client);
    this.setupClientHandlers(client);
    this.sendWelcomePacket(client);

    return clientId;
  }

  setupClientHandlers(client) {
    const ws = client.ws;

    ws.on('message', (data) => {
      this.handleMessage(client, data);
    });

    ws.on('close', (code, reason) => {
      this.handleDisconnect(client, code, reason);
    });

    ws.on('error', (error) => {
      this.handleError(client, error);
    });

    ws.on('pong', () => {
      client.lastActivity = Date.now();
    });

    // Start heartbeat
    this.startHeartbeat(client);
  }

  startHeartbeat(client) {
    const interval = setInterval(() => {
      if (client.state !== 'connected') {
        clearInterval(interval);
        return;
      }

      const inactive = Date.now() - client.lastActivity;

      if (inactive > this.config.heartbeatInterval * 2) {
        // Client is unresponsive
        this.handleStaleConnection(client);
        clearInterval(interval);
        return;
      }

      // Send ping
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.ping();
      }
    }, this.config.heartbeatInterval);

    client.heartbeatInterval = interval;
  }
}
```

### 2. Channel Management & Broadcasting
```javascript
class ChannelManager {
  constructor() {
    this.channels = {
      'incidents:all': new Set(),
      'incidents:critical': new Set(),
      'incidents:airport': new Set(),
      'incidents:harbour': new Set(),
      'incidents:military': new Set(),
      'alerts:system': new Set(),
      'alerts:security': new Set(),
      'stats:live': new Set()
    };

    this.channelFilters = new Map();
  }

  subscribe(client, channel, filter = null) {
    if (!this.channels[channel]) {
      this.channels[channel] = new Set();
    }

    this.channels[channel].add(client.id);
    client.subscriptions.add(channel);

    if (filter) {
      this.channelFilters.set(`${client.id}:${channel}`, filter);
    }

    // Send recent history for catch-up
    this.sendChannelHistory(client, channel);
  }

  broadcast(channel, message, options = {}) {
    const clients = this.channels[channel] || new Set();

    const payload = {
      channel,
      type: message.type || 'update',
      timestamp: Date.now(),
      data: message,
      id: this.generateMessageId()
    };

    // Apply filters if any
    const filteredClients = options.filter
      ? this.applyFilters(clients, payload, options.filter)
      : clients;

    // Broadcast strategies
    if (options.priority === 'critical') {
      this.broadcastCritical(filteredClients, payload);
    } else if (filteredClients.size > 100) {
      this.broadcastBatched(filteredClients, payload);
    } else {
      this.broadcastImmediate(filteredClients, payload);
    }

    // Store for history
    this.storeChannelMessage(channel, payload);
  }

  broadcastCritical(clients, payload) {
    // Send immediately with confirmation
    clients.forEach(clientId => {
      const client = this.connections.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        this.sendWithConfirmation(client, payload, {
          retries: 3,
          timeout: 1000
        });
      }
    });
  }

  broadcastBatched(clients, payload) {
    // Batch for efficiency with large numbers
    const batchSize = 50;
    const clientArray = Array.from(clients);

    for (let i = 0; i < clientArray.length; i += batchSize) {
      const batch = clientArray.slice(i, i + batchSize);

      setImmediate(() => {
        batch.forEach(clientId => {
          const client = this.connections.get(clientId);
          if (client && client.ws.readyState === WebSocket.OPEN) {
            this.send(client, payload);
          }
        });
      });
    }
  }
}
```

### 3. Message Queue & Delivery Guarantee
```javascript
class MessageQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.retryQueue = new Map();
    this.acknowledgments = new Map();

    this.limits = {
      maxQueueSize: 10000,
      maxRetries: 3,
      retryDelay: 1000,
      ackTimeout: 5000
    };
  }

  async enqueue(message, options = {}) {
    if (this.queue.length >= this.limits.maxQueueSize) {
      // Drop oldest non-critical messages
      this.pruneQueue();
    }

    const queueItem = {
      id: this.generateId(),
      message,
      priority: options.priority || 'normal',
      requiresAck: options.requiresAck || false,
      timestamp: Date.now(),
      attempts: 0,
      targets: options.targets || [],
      metadata: options.metadata || {}
    };

    // Priority queue insertion
    if (queueItem.priority === 'critical') {
      this.queue.unshift(queueItem);
    } else {
      this.queue.push(queueItem);
    }

    if (!this.processing) {
      this.processQueue();
    }

    return queueItem.id;
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();

      try {
        await this.deliver(item);

        if (item.requiresAck) {
          await this.waitForAcknowledgment(item);
        }
      } catch (error) {
        this.handleDeliveryError(item, error);
      }
    }

    this.processing = false;
  }

  async deliver(item) {
    const targets = item.targets.length > 0
      ? item.targets
      : Array.from(this.connections.keys());

    const promises = targets.map(clientId => {
      const client = this.connections.get(clientId);

      if (!client || client.ws.readyState !== WebSocket.OPEN) {
        return Promise.reject(new Error(`Client ${clientId} not available`));
      }

      return this.sendToClient(client, item.message);
    });

    const results = await Promise.allSettled(promises);

    // Track delivery status
    const delivered = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    if (failed > 0 && item.attempts < this.limits.maxRetries) {
      this.scheduleRetry(item);
    }

    return { delivered, failed };
  }

  scheduleRetry(item) {
    item.attempts++;

    const delay = this.limits.retryDelay * Math.pow(2, item.attempts - 1);

    setTimeout(() => {
      this.queue.unshift(item); // Add back to front of queue
      if (!this.processing) {
        this.processQueue();
      }
    }, delay);
  }
}
```

### 4. Event Stream Processing
```javascript
class EventStreamProcessor {
  constructor() {
    this.streams = new Map();
    this.processors = new Map();
    this.buffers = new Map();
  }

  registerStream(name, config) {
    this.streams.set(name, {
      name,
      config,
      subscribers: new Set(),
      lastEvent: null,
      eventCount: 0,
      created: Date.now()
    });

    // Register processors for different event types
    this.registerProcessors(name, config);
  }

  async processIncidentStream(incident) {
    // Validate incident
    const validated = await this.validateIncident(incident);
    if (!validated) return;

    // Enrich with real-time data
    const enriched = await this.enrichIncident(incident);

    // Determine broadcast channels
    const channels = this.determineChannels(enriched);

    // Check for alerts
    const alerts = this.checkAlertConditions(enriched);

    // Broadcast to appropriate channels
    for (const channel of channels) {
      await this.broadcast(channel, enriched, {
        priority: this.calculatePriority(enriched)
      });
    }

    // Send alerts if any
    if (alerts.length > 0) {
      await this.sendAlerts(alerts);
    }

    // Update statistics
    this.updateStats(enriched);
  }

  determineChannels(incident) {
    const channels = ['incidents:all'];

    // Add type-specific channels
    if (incident.asset.type === 'airport') {
      channels.push('incidents:airport');
    } else if (incident.asset.type === 'harbour') {
      channels.push('incidents:harbour');
    } else if (incident.asset.type === 'military') {
      channels.push('incidents:military');
    }

    // Add severity-based channels
    if (incident.scores.severity >= 7) {
      channels.push('incidents:critical');
    }

    // Add geographic channels
    const region = this.getRegion(incident.asset.lat, incident.asset.lon);
    channels.push(`incidents:region:${region}`);

    return channels;
  }

  checkAlertConditions(incident) {
    const alerts = [];

    // Critical severity
    if (incident.scores.severity >= 9) {
      alerts.push({
        type: 'critical_incident',
        title: 'Critical Drone Incident',
        message: `${incident.incident.category} at ${incident.asset.name}`,
        incident
      });
    }

    // Airport closure
    if (incident.asset.type === 'airport' && incident.incident.category === 'closure') {
      alerts.push({
        type: 'airport_closure',
        title: `Airport Closure: ${incident.asset.name}`,
        message: `${incident.asset.name} closed due to drone activity`,
        incident
      });
    }

    // Military base proximity
    if (incident.asset.type === 'military') {
      alerts.push({
        type: 'military_alert',
        title: 'Military Installation Alert',
        message: `Drone activity near ${incident.asset.name}`,
        incident
      });
    }

    return alerts;
  }
}
```

### 5. Notification System
```javascript
class NotificationManager {
  constructor() {
    this.providers = {
      websocket: new WebSocketNotifier(),
      push: new PushNotifier(),
      email: new EmailNotifier(),
      sms: new SMSNotifier()
    };

    this.subscriptions = new Map();
    this.rateLimits = new Map();
  }

  async sendNotification(notification) {
    const { type, priority, recipients, data } = notification;

    // Get subscriber preferences
    const subscriptions = this.getSubscriptions(type, recipients);

    // Group by notification method
    const grouped = this.groupByMethod(subscriptions);

    // Send through each channel
    const results = await Promise.allSettled([
      this.sendWebSocketNotifications(grouped.websocket, notification),
      this.sendPushNotifications(grouped.push, notification),
      this.sendEmailNotifications(grouped.email, notification),
      this.sendSMSNotifications(grouped.sms, notification)
    ]);

    // Log delivery status
    this.logDelivery(notification, results);

    return results;
  }

  async sendCriticalAlert(alert) {
    // Critical alerts bypass rate limiting
    const notification = {
      type: 'critical_alert',
      priority: 'immediate',
      title: alert.title,
      body: alert.message,
      data: alert.data,
      requiresAcknowledgment: true,
      sound: 'critical.mp3',
      vibrate: [200, 100, 200],
      ttl: 0 // Immediate delivery
    };

    // Send to all active connections immediately
    const activeClients = Array.from(this.connections.values())
      .filter(client => client.state === 'connected');

    const promises = activeClients.map(client =>
      this.sendWithRetry(client, notification)
    );

    await Promise.all(promises);

    // Also send push notifications to mobile devices
    await this.sendPushToAll(notification);
  }

  setupRateLimiting() {
    // Prevent notification spam
    this.rateLimits.set('default', {
      maxPerHour: 60,
      maxPerDay: 500,
      burstLimit: 10,
      burstWindow: 60000 // 1 minute
    });

    this.rateLimits.set('critical', {
      maxPerHour: 100,
      maxPerDay: 1000,
      burstLimit: 20,
      burstWindow: 60000
    });
  }
}
```

## Connection Resilience

### Reconnection Strategy
```javascript
class ReconnectionManager {
  handleReconnection(client) {
    const strategy = {
      attempts: 0,
      maxAttempts: 10,
      baseDelay: 1000,
      maxDelay: 30000,
      multiplier: 1.5
    };

    const attemptReconnect = () => {
      if (strategy.attempts >= strategy.maxAttempts) {
        this.handlePermanentDisconnect(client);
        return;
      }

      strategy.attempts++;

      const delay = Math.min(
        strategy.baseDelay * Math.pow(strategy.multiplier, strategy.attempts - 1),
        strategy.maxDelay
      );

      setTimeout(() => {
        this.reconnect(client)
          .then(() => {
            // Restore subscriptions
            this.restoreClientState(client);
          })
          .catch(() => {
            attemptReconnect();
          });
      }, delay);
    };

    attemptReconnect();
  }
}
```

## Performance Optimization

### Message Compression
```javascript
class MessageCompressor {
  compress(message) {
    const json = JSON.stringify(message);

    if (json.length < 1000) {
      return json; // Don't compress small messages
    }

    // Use pako for gzip compression
    const compressed = pako.gzip(json);
    const base64 = btoa(String.fromCharCode.apply(null, compressed));

    return {
      compressed: true,
      data: base64,
      originalSize: json.length,
      compressedSize: base64.length
    };
  }
}
```

## Monitoring & Metrics

### Real-time Statistics
```javascript
const REALTIME_METRICS = {
  connections: {
    active: 0,
    idle: 0,
    total: 0,
    peak: 0
  },
  messages: {
    sent: 0,
    received: 0,
    queued: 0,
    failed: 0
  },
  bandwidth: {
    incoming: 0,
    outgoing: 0,
    compressed: 0
  },
  latency: {
    average: 0,
    p50: 0,
    p95: 0,
    p99: 0
  },
  errors: {
    connection: 0,
    delivery: 0,
    timeout: 0
  }
};
```

## Testing Requirements

### Integration Tests
```javascript
describe('RealtimeCoordinator', () => {
  test('handles 1000 concurrent connections', async () => {
    const clients = await createClients(1000);
    expect(coordinator.connections.size).toBe(1000);
  });

  test('broadcasts to channels efficiently', async () => {
    const start = Date.now();
    await coordinator.broadcast('test', { data: 'test' });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });

  test('recovers from connection loss', async () => {
    await client.disconnect();
    await wait(1000);
    expect(client.state).toBe('connected');
  });
});
```

## Alert Conditions

- Connection pool > 80% capacity
- Message queue > 5000 items
- Delivery failure rate > 5%
- Average latency > 500ms
- Memory usage > 500MB

## Parallel Coordination

Works in parallel with:
- **performance-monitor**: Optimizes message delivery performance
- **scraper-orchestrator**: Receives new incidents for broadcasting
- **incident-validator**: Validates incidents before broadcasting
- **automation-reliability**: Monitors WebSocket server health
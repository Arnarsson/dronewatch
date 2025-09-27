/**
 * WebSocket Handler Pattern for DroneWatch
 * Real-time incident updates and connection management
 */

class WebSocketHandler {
  constructor() {
    this.ws = null;
    this.url = 'ws://localhost:8081/ws';
    this.reconnectDelay = 1000;  // Start with 1 second
    this.maxReconnectDelay = 30000;  // Max 30 seconds
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.heartbeatInterval = null;
    this.isIntentionallyClosed = false;

    // Event handlers
    this.onIncidentUpdate = null;
    this.onConnectionChange = null;
    this.onAlert = null;

    // State
    this.connectionState = 'disconnected';
    this.lastMessageTime = null;
    this.messageQueue = [];
  }

  /**
   * Initialize WebSocket connection
   */
  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      return;
    }

    console.log('[WebSocket] Attempting connection...');
    this.isIntentionallyClosed = false;

    try {
      this.ws = new WebSocket(this.url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  setupEventHandlers() {
    this.ws.onopen = (event) => {
      console.log('[WebSocket] Connected');
      this.connectionState = 'connected';
      this.reconnectDelay = 1000;  // Reset delay
      this.reconnectAttempts = 0;

      // Start heartbeat
      this.startHeartbeat();

      // Send any queued messages
      this.flushMessageQueue();

      // Notify UI
      if (this.onConnectionChange) {
        this.onConnectionChange('connected');
      }

      // Request initial data
      this.send({ type: 'subscribe', channels: ['incidents', 'alerts'] });
    };

    this.ws.onmessage = (event) => {
      this.lastMessageTime = Date.now();

      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    };

    this.ws.onerror = (event) => {
      console.error('[WebSocket] Error:', event);
      this.connectionState = 'error';

      if (this.onConnectionChange) {
        this.onConnectionChange('error');
      }
    };

    this.ws.onclose = (event) => {
      console.log('[WebSocket] Disconnected', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });

      this.connectionState = 'disconnected';
      this.stopHeartbeat();

      if (this.onConnectionChange) {
        this.onConnectionChange('disconnected');
      }

      // Attempt reconnection if not intentionally closed
      if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(data) {
    console.log('[WebSocket] Message received:', data.type);

    switch (data.type) {
      case 'incident_update':
        this.handleIncidentUpdate(data.payload);
        break;

      case 'incident_batch':
        this.handleIncidentBatch(data.payload);
        break;

      case 'alert':
        this.handleAlert(data.payload);
        break;

      case 'heartbeat':
        // Server heartbeat response
        break;

      case 'stats':
        this.updateStats(data.payload);
        break;

      default:
        console.warn('[WebSocket] Unknown message type:', data.type);
    }
  }

  /**
   * Handle new or updated incident
   */
  handleIncidentUpdate(incident) {
    console.log('[WebSocket] Incident update:', incident.id);

    // Update local state
    const existingIndex = state.incidents.findIndex(i => i.id === incident.id);

    if (existingIndex >= 0) {
      // Update existing incident
      state.incidents[existingIndex] = incident;
    } else {
      // Add new incident
      state.incidents.unshift(incident);

      // Show notification for high-severity incidents
      if (incident.scores.severity >= 7) {
        this.showNotification(incident);
      }
    }

    // Callback to UI
    if (this.onIncidentUpdate) {
      this.onIncidentUpdate(incident, existingIndex >= 0 ? 'update' : 'new');
    }

    // Re-render with animation
    this.animateIncidentUpdate(incident.id);
  }

  /**
   * Handle batch of incidents
   */
  handleIncidentBatch(incidents) {
    console.log(`[WebSocket] Received ${incidents.length} incidents`);

    // Merge with existing incidents
    const incidentMap = new Map(state.incidents.map(i => [i.id, i]));

    incidents.forEach(incident => {
      incidentMap.set(incident.id, incident);
    });

    state.incidents = Array.from(incidentMap.values())
      .sort((a, b) => new Date(b.first_seen_utc) - new Date(a.first_seen_utc));

    // Re-render
    applyFilters();
  }

  /**
   * Handle critical alerts
   */
  handleAlert(alert) {
    console.log('[WebSocket] Alert:', alert);

    if (this.onAlert) {
      this.onAlert(alert);
    }

    // Show prominent notification
    this.showCriticalAlert(alert);
  }

  /**
   * Send message through WebSocket
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      // Queue message for later
      this.messageQueue.push(data);
      console.log('[WebSocket] Message queued (not connected)');
    }
  }

  /**
   * Heartbeat to keep connection alive
   */
  startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'heartbeat', timestamp: Date.now() });

        // Check for stale connection
        if (this.lastMessageTime && Date.now() - this.lastMessageTime > 60000) {
          console.warn('[WebSocket] No messages for 60 seconds, reconnecting...');
          this.reconnect();
        }
      }
    }, 30000);  // Every 30 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Reconnection logic with exponential backoff
   */
  scheduleReconnect() {
    if (this.isIntentionallyClosed) return;

    this.reconnectAttempts++;
    console.log(`[WebSocket] Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2,
      this.maxReconnectDelay
    );
  }

  reconnect() {
    this.disconnect();
    this.connect();
  }

  /**
   * Gracefully disconnect
   */
  disconnect() {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.connectionState = 'disconnected';
  }

  /**
   * Send queued messages after reconnection
   */
  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  /**
   * UI notification for new incidents
   */
  showNotification(incident) {
    // Check if browser supports notifications
    if (!('Notification' in window)) return;

    // Request permission if needed
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    if (Notification.permission === 'granted') {
      const notification = new Notification('DroneWatch Alert', {
        body: `${incident.incident.category.toUpperCase()} at ${incident.asset.name}`,
        icon: '/drone-icon.png',
        tag: incident.id,
        requireInteraction: incident.scores.severity >= 9
      });

      notification.onclick = () => {
        window.focus();
        // Zoom map to incident
        if (state.map) {
          state.map.setView([incident.asset.lat, incident.asset.lon], 12);
        }
      };
    }
  }

  /**
   * Show critical alert banner
   */
  showCriticalAlert(alert) {
    const banner = document.createElement('div');
    banner.className = 'critical-alert-banner';
    banner.innerHTML = `
      <div class="alert-icon">⚠️</div>
      <div class="alert-content">
        <div class="alert-title">${alert.title}</div>
        <div class="alert-message">${alert.message}</div>
      </div>
      <button class="alert-dismiss">&times;</button>
    `;

    document.body.appendChild(banner);

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      banner.classList.add('fade-out');
      setTimeout(() => banner.remove(), 300);
    }, 10000);

    // Manual dismiss
    banner.querySelector('.alert-dismiss').addEventListener('click', () => {
      banner.remove();
    });
  }

  /**
   * Animate updated incident on map
   */
  animateIncidentUpdate(incidentId) {
    const marker = state.markerMap.get(incidentId);
    if (!marker) return;

    // Add pulse animation
    const icon = marker.getElement();
    if (icon) {
      icon.classList.add('pulse-animation');
      setTimeout(() => {
        icon.classList.remove('pulse-animation');
      }, 2000);
    }
  }

  /**
   * Update connection status UI
   */
  updateConnectionStatus() {
    const statusElement = document.getElementById('ws-status');
    if (!statusElement) return;

    statusElement.className = `connection-status ${this.connectionState}`;
    statusElement.textContent = this.connectionState.toUpperCase();

    // Add reconnection info
    if (this.connectionState === 'disconnected' && this.reconnectAttempts > 0) {
      statusElement.textContent += ` (Retry ${this.reconnectAttempts}/${this.maxReconnectAttempts})`;
    }
  }

  /**
   * Update statistics display
   */
  updateStats(stats) {
    document.getElementById('incident-count').textContent = stats.totalIncidents;
    document.getElementById('active-count').textContent = stats.activeIncidents;
    document.getElementById('update-time').textContent = new Date(stats.lastUpdate).toLocaleTimeString();
  }
}

// USAGE EXAMPLE
const wsHandler = new WebSocketHandler();

// Set up event handlers
wsHandler.onIncidentUpdate = (incident, type) => {
  console.log(`Incident ${type}:`, incident.id);
  applyFilters();  // Re-render with new data
};

wsHandler.onConnectionChange = (state) => {
  console.log('Connection state:', state);
  wsHandler.updateConnectionStatus();
};

wsHandler.onAlert = (alert) => {
  console.log('Critical alert:', alert);
  // Handle critical alerts (airport closure, etc.)
};

// Connect on page load
document.addEventListener('DOMContentLoaded', () => {
  wsHandler.connect();
});

// Disconnect on page unload
window.addEventListener('beforeunload', () => {
  wsHandler.disconnect();
});

// MOBILE CONSIDERATIONS
// Handle app suspension/resume on mobile
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Page is hidden, stop heartbeat to save battery
    wsHandler.stopHeartbeat();
  } else {
    // Page is visible, restart heartbeat and check connection
    wsHandler.startHeartbeat();
    if (wsHandler.connectionState !== 'connected') {
      wsHandler.connect();
    }
  }
});

// Handle network changes
window.addEventListener('online', () => {
  console.log('[WebSocket] Network online, attempting connection');
  wsHandler.connect();
});

window.addEventListener('offline', () => {
  console.log('[WebSocket] Network offline');
  wsHandler.disconnect();
});

// CSS FOR ALERT BANNER
const alertStyles = `
<style>
.critical-alert-banner {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(220, 38, 38, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  z-index: 10000;
  animation: slideDown 0.3s ease;
  max-width: 90%;
}

.alert-icon {
  font-size: 24px;
}

.alert-content {
  flex: 1;
}

.alert-title {
  font-weight: 700;
  font-size: 14px;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.alert-message {
  font-size: 13px;
  opacity: 0.9;
}

.alert-dismiss {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.alert-dismiss:hover {
  opacity: 1;
}

.critical-alert-banner.fade-out {
  animation: slideUp 0.3s ease;
  opacity: 0;
}

@keyframes slideDown {
  from {
    transform: translate(-50%, -100%);
    opacity: 0;
  }
  to {
    transform: translate(-50%, 0);
    opacity: 1;
  }
}

@keyframes slideUp {
  to {
    transform: translate(-50%, -100%);
    opacity: 0;
  }
}

.connection-status {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.connection-status.connected {
  background: rgba(22, 163, 74, 0.2);
  color: #4ade80;
}

.connection-status.disconnected {
  background: rgba(220, 38, 38, 0.2);
  color: #f87171;
}

.connection-status.error {
  background: rgba(234, 88, 12, 0.2);
  color: #fb923c;
}

.pulse-animation {
  animation: pulse-marker 2s ease;
}

@keyframes pulse-marker {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.5);
    opacity: 0.5;
  }
}
</style>
`;

// Export for use in other files
export { WebSocketHandler };
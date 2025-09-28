// Real-time WebSocket Updates for DroneWatch
// Provides live AI discoveries and incident updates

class RealtimeUpdates {
  constructor() {
    this.ws = null;
    this.reconnectInterval = 1000;
    this.maxReconnectInterval = 30000;
    this.reconnectAttempts = 0;
    this.isConnected = false;
    this.messageQueue = [];
    this.lastHeartbeat = Date.now();

    // Configuration
    this.config = {
      wsUrl: window.location.protocol === 'https:'
        ? `wss://${window.location.host}/ws`
        : `ws://${window.location.host.replace(':8010', ':8082')}/ws`,
      heartbeatInterval: 30000,
      reconnectDecay: 1.5
    };

    // UI elements
    this.initUI();

    // Start connection
    this.connect();
  }

  initUI() {
    // Add connection status indicator
    const statusHTML = `
      <div id="wsStatus" class="ws-status">
        <div class="ws-status-indicator">
          <span class="ws-status-dot"></span>
          <span class="ws-status-text">Connecting...</span>
        </div>
        <div class="ws-stats hidden">
          <span id="wsMessageCount">0 updates</span>
          <span id="wsUptime">0m</span>
        </div>
      </div>
    `;

    // Add notification toast container
    const toastHTML = `
      <div id="notificationToasts" class="notification-toasts"></div>
    `;

    // Add live update counter to AI panel
    const counterHTML = `
      <div id="liveUpdateCounter" class="live-update-counter">
        <span class="pulse-dot"></span>
        <span id="updateCount">0</span> new updates
      </div>
    `;

    // Add styles
    const styles = `
      <style>
        .ws-status {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--glass-heavy);
          backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-full);
          padding: 0.5rem 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          z-index: 1000;
          transition: all 0.3s;
          box-shadow: var(--shadow-lg);
        }

        .ws-status-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .ws-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--unverified);
          transition: all 0.3s;
        }

        .ws-status-dot.connected {
          background: var(--verified);
          animation: pulse 2s infinite;
        }

        .ws-status-dot.error {
          background: var(--high-impact);
        }

        .ws-status-text {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .ws-stats {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          padding-left: 1rem;
          border-left: 1px solid var(--glass-border);
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 0 0 var(--verified);
          }
          50% {
            opacity: 0.7;
            box-shadow: 0 0 0 4px transparent;
          }
        }

        .notification-toasts {
          position: fixed;
          top: 80px;
          right: 20px;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          z-index: 2500;
          pointer-events: none;
        }

        .notification-toast {
          background: var(--glass-heavy);
          backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-lg);
          padding: 1rem 1.25rem;
          min-width: 320px;
          max-width: 400px;
          box-shadow: var(--shadow-xl);
          animation: slideIn 0.3s ease-out;
          pointer-events: auto;
          cursor: pointer;
          transition: all 0.2s;
        }

        .notification-toast:hover {
          transform: translateX(-4px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .notification-toast.ai-discovery {
          border-left: 3px solid var(--ai-accent);
        }

        .notification-toast.incident-update {
          border-left: 3px solid var(--primary);
        }

        .notification-toast.alert {
          border-left: 3px solid var(--high-impact);
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        .toast-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .toast-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .toast-time {
          font-size: 0.625rem;
          color: var(--text-muted);
        }

        .toast-content {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .toast-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }

        .toast-btn {
          padding: 0.25rem 0.75rem;
          background: var(--glass-light);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          font-size: 0.75rem;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .toast-btn:hover {
          background: var(--primary);
          border-color: var(--primary);
          color: white;
        }

        .live-update-counter {
          position: absolute;
          top: -10px;
          right: 10px;
          background: var(--high-impact);
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: var(--shadow-md);
          animation: bounce 0.5s;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        .pulse-dot {
          width: 6px;
          height: 6px;
          background: white;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }

        .live-feed-item {
          padding: 0.75rem;
          background: var(--glass-light);
          border-radius: var(--radius-md);
          margin-bottom: 0.5rem;
          border: 1px solid var(--glass-border);
          animation: fadeIn 0.3s;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .live-feed-item.new {
          border-color: var(--ai-accent);
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
        }

        .feed-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .feed-item-type {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .feed-item-type.ai {
          color: var(--ai-accent);
        }

        .feed-item-type.verified {
          color: var(--verified);
        }

        .feed-item-time {
          font-size: 0.625rem;
          color: var(--text-muted);
        }

        @media (max-width: 768px) {
          .notification-toasts {
            left: 10px;
            right: 10px;
          }

          .notification-toast {
            min-width: auto;
            max-width: none;
          }

          .ws-status {
            bottom: 70px;
          }
        }
      </style>
    `;

    // Insert elements
    document.head.insertAdjacentHTML('beforeend', styles);
    document.body.insertAdjacentHTML('beforeend', statusHTML);
    document.body.insertAdjacentHTML('beforeend', toastHTML);

    // Add counter to AI panel if it exists
    const aiPanel = document.querySelector('.ai-panel-header');
    if (aiPanel && !document.getElementById('liveUpdateCounter')) {
      aiPanel.insertAdjacentHTML('beforeend', counterHTML);
    }
  }

  connect() {
    try {
      console.log('Connecting to WebSocket:', this.config.wsUrl);
      this.ws = new WebSocket(this.config.wsUrl);

      this.ws.onopen = () => this.onOpen();
      this.ws.onmessage = (event) => this.onMessage(event);
      this.ws.onerror = (error) => this.onError(error);
      this.ws.onclose = () => this.onClose();

    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.scheduleReconnect();
    }
  }

  onOpen() {
    console.log('WebSocket connected');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.reconnectInterval = 1000;

    // Update status indicator
    this.updateStatus('connected', 'Live');

    // Send queued messages
    this.flushMessageQueue();

    // Start heartbeat
    this.startHeartbeat();

    // Request initial state
    this.send({
      type: 'subscribe',
      channels: ['ai-discoveries', 'incidents', 'alerts', 'trends']
    });

    // Show connection toast
    this.showNotification({
      type: 'system',
      title: 'Connected to live updates',
      content: 'You will now receive real-time AI discoveries and incident updates',
      duration: 3000
    });
  }

  onMessage(event) {
    try {
      const data = JSON.parse(event.data);
      console.log('WebSocket message:', data);

      // Handle different message types
      switch (data.type) {
        case 'ai-discovery':
          this.handleAiDiscovery(data);
          break;

        case 'incident-update':
          this.handleIncidentUpdate(data);
          break;

        case 'alert':
          this.handleAlert(data);
          break;

        case 'trend-update':
          this.handleTrendUpdate(data);
          break;

        case 'heartbeat':
          this.lastHeartbeat = Date.now();
          break;

        case 'stats':
          this.updateStats(data.stats);
          break;

        default:
          console.log('Unknown message type:', data.type);
      }

    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  }

  onError(error) {
    console.error('WebSocket error:', error);
    this.updateStatus('error', 'Connection error');
  }

  onClose() {
    console.log('WebSocket disconnected');
    this.isConnected = false;
    this.updateStatus('disconnected', 'Reconnecting...');
    this.stopHeartbeat();
    this.scheduleReconnect();
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= 10) {
      this.updateStatus('error', 'Connection failed');
      return;
    }

    setTimeout(() => {
      this.reconnectAttempts++;
      this.reconnectInterval = Math.min(
        this.reconnectInterval * this.config.reconnectDecay,
        this.maxReconnectInterval
      );
      this.connect();
    }, this.reconnectInterval);
  }

  send(data) {
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      this.messageQueue.push(data);
    }
  }

  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'heartbeat' });

        // Check for stale connection
        if (Date.now() - this.lastHeartbeat > 60000) {
          console.log('Heartbeat timeout, reconnecting...');
          this.ws.close();
        }
      }
    }, this.config.heartbeatInterval);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Message handlers
  handleAiDiscovery(data) {
    const discovery = data.discovery;

    // Show notification
    this.showNotification({
      type: 'ai-discovery',
      title: `🤖 AI Discovery - ${discovery.confidence}% confidence`,
      content: `${discovery.location}: ${discovery.summary}`,
      duration: 8000,
      actions: [
        {
          label: 'View Details',
          action: () => this.viewDiscovery(discovery)
        },
        {
          label: 'View on Map',
          action: () => this.viewOnMap(discovery)
        }
      ]
    });

    // Add to AI panel
    this.addToAiPanel(discovery);

    // Update counter
    this.updateCounter();

    // Add marker to map if location is available
    if (discovery.lat && discovery.lon) {
      this.addAiMarker(discovery);
    }
  }

  handleIncidentUpdate(data) {
    const incident = data.incident;

    // Show notification for significant updates
    if (incident.severity >= 7 || incident.status === 'active') {
      this.showNotification({
        type: 'incident-update',
        title: `📍 ${incident.location}`,
        content: incident.description,
        duration: 6000,
        actions: [
          {
            label: 'View',
            action: () => window.viewDetails?.(incident.id)
          }
        ]
      });
    }

    // Update incidents list
    this.updateIncident(incident);
  }

  handleAlert(data) {
    const alert = data.alert;

    // Show alert notification
    this.showNotification({
      type: 'alert',
      title: `🚨 ${alert.title}`,
      content: alert.message,
      duration: 10000,
      priority: true
    });

    // Play sound for critical alerts
    if (alert.critical) {
      this.playAlertSound();
    }
  }

  handleTrendUpdate(data) {
    const trends = data.trends;

    // Update trending section in AI panel
    const trendContainer = document.getElementById('trendingPatterns');
    if (trendContainer) {
      trendContainer.innerHTML = trends.map(trend => `
        <div class="trend-item">
          <span class="trend-label">${trend.label}</span>
          <span class="trend-value ${trend.direction === 'up' ? 'trend-up' : 'trend-down'}">
            ${trend.direction === 'up' ? '↑' : '↓'} ${trend.value}
          </span>
        </div>
      `).join('');
    }
  }

  // UI update methods
  updateStatus(status, text) {
    const dot = document.querySelector('.ws-status-dot');
    const statusText = document.querySelector('.ws-status-text');

    if (dot) {
      dot.className = 'ws-status-dot';
      if (status === 'connected') {
        dot.classList.add('connected');
      } else if (status === 'error') {
        dot.classList.add('error');
      }
    }

    if (statusText) {
      statusText.textContent = text;
    }

    // Update AI panel status
    const aiStatus = document.querySelector('.ai-status');
    if (aiStatus) {
      const statusDot = aiStatus.querySelector('.ai-status-dot');
      if (statusDot) {
        statusDot.style.background = status === 'connected' ? '#10b981' : '#f59e0b';
      }
    }
  }

  updateStats(stats) {
    const messageCount = document.getElementById('wsMessageCount');
    const uptime = document.getElementById('wsUptime');
    const statsContainer = document.querySelector('.ws-stats');

    if (messageCount) {
      messageCount.textContent = `${stats.messageCount || 0} updates`;
    }

    if (uptime) {
      const minutes = Math.floor((Date.now() - stats.connectedAt) / 60000);
      uptime.textContent = `${minutes}m uptime`;
    }

    if (statsContainer && stats.messageCount > 0) {
      statsContainer.classList.remove('hidden');
    }
  }

  updateCounter() {
    const counter = document.getElementById('liveUpdateCounter');
    const count = document.getElementById('updateCount');

    if (counter) {
      counter.style.display = 'flex';
      const currentCount = parseInt(count.textContent) || 0;
      count.textContent = currentCount + 1;

      // Animate counter
      counter.style.animation = 'none';
      setTimeout(() => {
        counter.style.animation = 'bounce 0.5s';
      }, 10);
    }
  }

  showNotification(options) {
    const container = document.getElementById('notificationToasts');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `notification-toast ${options.type}`;

    const actionsHTML = options.actions ? `
      <div class="toast-actions">
        ${options.actions.map(action =>
          `<button class="toast-btn" data-action="${action.label}">${action.label}</button>`
        ).join('')}
      </div>
    ` : '';

    toast.innerHTML = `
      <div class="toast-header">
        <div class="toast-title">${options.title}</div>
        <div class="toast-time">Just now</div>
      </div>
      <div class="toast-content">${options.content}</div>
      ${actionsHTML}
    `;

    // Add click handlers for actions
    if (options.actions) {
      options.actions.forEach(action => {
        const btn = toast.querySelector(`[data-action="${action.label}"]`);
        if (btn) {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            action.action();
            this.dismissNotification(toast);
          });
        }
      });
    }

    // Click to dismiss
    toast.addEventListener('click', () => {
      this.dismissNotification(toast);
    });

    // Add to container
    if (options.priority) {
      container.prepend(toast);
    } else {
      container.appendChild(toast);
    }

    // Auto dismiss
    if (options.duration) {
      setTimeout(() => {
        this.dismissNotification(toast);
      }, options.duration);
    }

    // Limit number of toasts
    const toasts = container.querySelectorAll('.notification-toast');
    if (toasts.length > 5) {
      this.dismissNotification(toasts[0]);
    }
  }

  dismissNotification(toast) {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }

  addToAiPanel(discovery) {
    const container = document.getElementById('aiDiscoveries');
    if (!container) return;

    // Create discovery card
    const card = document.createElement('div');
    card.className = 'ai-discovery new';

    const confidenceClass = discovery.confidence >= 80 ? 'high' :
                           discovery.confidence >= 60 ? 'medium' : 'low';

    card.innerHTML = `
      <div class="discovery-header">
        <div class="discovery-location">
          <span>📍</span>
          <span>${discovery.location}</span>
        </div>
        <div class="confidence-badge confidence-${confidenceClass}">
          <span>${discovery.confidence}%</span>
        </div>
      </div>
      <div class="discovery-summary">
        ${discovery.summary}
      </div>
      <div class="discovery-footer">
        <a href="${discovery.sourceUrl}" target="_blank" class="source-link">
          <span>📰</span>
          <span>${discovery.source}</span>
          <span>→</span>
        </a>
        <div class="discovery-actions">
          <button class="action-btn" onclick="realtimeUpdates.viewOnMap(${JSON.stringify(discovery).replace(/"/g, '&quot;')})">
            🗺️ Map
          </button>
        </div>
      </div>
    `;

    // Add to top of list
    container.prepend(card);

    // Remove "new" class after animation
    setTimeout(() => {
      card.classList.remove('new');
    }, 3000);

    // Limit number of discoveries shown
    const discoveries = container.querySelectorAll('.ai-discovery');
    if (discoveries.length > 10) {
      discoveries[discoveries.length - 1].remove();
    }
  }

  addAiMarker(discovery) {
    if (!window.map || !window.markers) return;

    const icon = L.divIcon({
      className: 'incident-marker-wrapper',
      html: `<div class="incident-marker high-impact ai-discovered pulse-new"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const marker = L.marker([discovery.lat, discovery.lon], { icon });

    const popupContent = `
      <div class="popup-header">
        <h3 class="popup-title">${discovery.location}</h3>
        <span class="popup-badge">🤖 AI Discovery</span>
      </div>
      <div class="popup-content">
        ${discovery.summary}
      </div>
      <div class="popup-meta">
        <span>Confidence: ${discovery.confidence}%</span>
        <span>Source: ${discovery.source}</span>
      </div>
    `;

    marker.bindPopup(popupContent);
    window.markers.addLayer(marker);

    // Add pulse animation
    setTimeout(() => {
      const element = marker.getElement();
      if (element) {
        element.querySelector('.pulse-new')?.classList.remove('pulse-new');
      }
    }, 5000);
  }

  viewDiscovery(discovery) {
    // Create a temporary incident object for the detail view
    const incident = {
      id: discovery.id || `ai-${Date.now()}`,
      asset: {
        name: discovery.location,
        lat: discovery.lat,
        lon: discovery.lon
      },
      incident: {
        narrative: discovery.summary,
        status: 'active'
      },
      evidence: {
        strength: Math.floor(discovery.confidence / 33),
        sources: [{
          name: discovery.source,
          url: discovery.sourceUrl,
          timestamp: new Date().toISOString()
        }]
      },
      ai_discovered: true,
      ai_analysis: {
        confidence: discovery.confidence,
        summary: discovery.summary,
        processing_time: '0.3s'
      }
    };

    window.viewDetails?.(incident.id);
  }

  viewOnMap(discovery) {
    if (window.map && discovery.lat && discovery.lon) {
      window.map.setView([discovery.lat, discovery.lon], 12);

      // Close any open panels on mobile
      if (window.innerWidth < 768) {
        document.getElementById('aiPanel')?.classList.remove('mobile-expanded');
      }
    }
  }

  updateIncident(incident) {
    // Update existing incident in the incidents array
    if (window.incidents) {
      const index = window.incidents.findIndex(i => i.id === incident.id);
      if (index !== -1) {
        window.incidents[index] = { ...window.incidents[index], ...incident };
      } else {
        window.incidents.unshift(incident);
      }

      // Trigger re-render if function exists
      if (typeof window.renderIncidents === 'function') {
        window.renderIncidents();
      }
    }
  }

  playAlertSound() {
    // Create a simple beep sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  }

  // Public methods
  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
    this.stopHeartbeat();
  }

  resetCounter() {
    const counter = document.getElementById('liveUpdateCounter');
    const count = document.getElementById('updateCount');

    if (counter && count) {
      count.textContent = '0';
      setTimeout(() => {
        counter.style.display = 'none';
      }, 300);
    }
  }
}

// Initialize real-time updates when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.realtimeUpdates = new RealtimeUpdates();
  });
} else {
  window.realtimeUpdates = new RealtimeUpdates();
}

// Add cleanup on page unload
window.addEventListener('beforeunload', () => {
  window.realtimeUpdates?.disconnect();
});
/**
 * Real-time News Alerts System
 * Breaking news notifications for DroneWatch
 */

export class NewsAlerts {
  constructor(config = {}) {
    this.config = {
      alertThreshold: config.alertThreshold || 7, // Severity threshold
      confidenceThreshold: config.confidenceThreshold || 80, // Confidence threshold
      maxAlerts: config.maxAlerts || 10,
      alertDuration: config.alertDuration || 10000, // 10 seconds
      soundEnabled: config.soundEnabled || true,
      ...config
    };
    
    this.alerts = [];
    this.isConnected = false;
    this.ws = null;
    this.audioContext = null;
    this.alertContainer = null;
    
    this.init();
  }

  async init() {
    this.createAlertContainer();
    this.setupAudio();
    this.connectWebSocket();
    this.setupKeyboardShortcuts();
  }

  createAlertContainer() {
    this.alertContainer = document.createElement('div');
    this.alertContainer.id = 'news-alerts-container';
    this.alertContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      max-width: 400px;
      pointer-events: none;
    `;
    document.body.appendChild(this.alertContainer);
  }

  setupAudio() {
    if (this.config.soundEnabled) {
      try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      } catch (error) {
        console.warn('Audio not supported:', error);
      }
    }
  }

  connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${protocol}//${window.location.host}`);
    
    this.ws.onopen = () => {
      this.isConnected = true;
      console.log('News alerts WebSocket connected');
      this.ws.send(JSON.stringify({ 
        type: 'subscribe', 
        channel: 'news_alerts',
        filters: {
          severity: this.config.alertThreshold,
          confidence: this.config.confidenceThreshold
        }
      }));
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'news_alert') {
        this.handleNewsAlert(data.alert);
      }
    };
    
    this.ws.onclose = () => {
      this.isConnected = false;
      console.log('News alerts WebSocket disconnected');
      // Reconnect after 5 seconds
      setTimeout(() => this.connectWebSocket(), 5000);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  handleNewsAlert(alertData) {
    // Check if we should show this alert
    if (!this.shouldShowAlert(alertData)) return;
    
    // Create alert
    const alert = this.createAlert(alertData);
    this.alerts.push(alert);
    
    // Show alert
    this.showAlert(alert);
    
    // Play sound
    this.playAlertSound(alertData.severity);
    
    // Auto-remove after duration
    setTimeout(() => {
      this.removeAlert(alert.id);
    }, this.config.alertDuration);
    
    // Limit number of alerts
    if (this.alerts.length > this.config.maxAlerts) {
      const oldestAlert = this.alerts.shift();
      this.removeAlert(oldestAlert.id);
    }
  }

  shouldShowAlert(alertData) {
    return alertData.severity >= this.config.alertThreshold && 
           alertData.confidence >= this.config.confidenceThreshold;
  }

  createAlert(alertData) {
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: alertId,
      title: alertData.title,
      description: alertData.description,
      severity: alertData.severity,
      confidence: alertData.confidence,
      source: alertData.source,
      location: alertData.location,
      timestamp: new Date(),
      isBreaking: alertData.isBreaking || false,
      category: alertData.category || 'general'
    };
  }

  showAlert(alert) {
    const alertElement = document.createElement('div');
    alertElement.id = alert.id;
    alertElement.className = `news-alert ${this.getSeverityClass(alert.severity)} ${alert.isBreaking ? 'breaking' : ''}`;
    alertElement.style.cssText = `
      background: var(--glass);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 0.5rem;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      pointer-events: auto;
      max-width: 400px;
      position: relative;
    `;
    
    alertElement.innerHTML = this.renderAlertHTML(alert);
    
    // Add event listeners
    this.setupAlertEventListeners(alertElement, alert);
    
    this.alertContainer.appendChild(alertElement);
    
    // Animate in
    setTimeout(() => {
      alertElement.style.transform = 'translateX(0)';
    }, 100);
  }

  renderAlertHTML(alert) {
    const severityIcon = this.getSeverityIcon(alert.severity);
    const confidenceColor = this.getConfidenceColor(alert.confidence);
    const timeAgo = this.getTimeAgo(alert.timestamp);
    
    return `
      <div class="alert-header">
        <div class="alert-title">
          ${severityIcon} ${alert.title}
          ${alert.isBreaking ? '<span class="breaking-badge">BREAKING</span>' : ''}
        </div>
        <button class="close-btn" onclick="this.closeAlert('${alert.id}')">×</button>
      </div>
      
      <div class="alert-content">
        <p class="alert-description">${alert.description}</p>
        
        <div class="alert-meta">
          <div class="alert-location">📍 ${alert.location}</div>
          <div class="alert-source">📰 ${alert.source}</div>
          <div class="alert-time">${timeAgo}</div>
        </div>
        
        <div class="alert-metrics">
          <div class="severity-meter">
            <span class="metric-label">Severity:</span>
            <div class="meter-bar">
              <div class="meter-fill" style="width: ${alert.severity * 10}%; background: ${this.getSeverityColor(alert.severity)}"></div>
            </div>
            <span class="metric-value">${alert.severity}/10</span>
          </div>
          
          <div class="confidence-meter">
            <span class="metric-label">Confidence:</span>
            <div class="meter-bar">
              <div class="meter-fill" style="width: ${alert.confidence}%; background: ${confidenceColor}"></div>
            </div>
            <span class="metric-value">${alert.confidence}%</span>
          </div>
        </div>
      </div>
      
      <div class="alert-actions">
        <button class="action-btn primary" onclick="this.viewDetails('${alert.id}')">View Details</button>
        <button class="action-btn secondary" onclick="this.shareAlert('${alert.id}')">Share</button>
        <button class="action-btn secondary" onclick="this.muteSource('${alert.source}')">Mute Source</button>
      </div>
    `;
  }

  setupAlertEventListeners(alertElement, alert) {
    // Close button
    const closeBtn = alertElement.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => this.removeAlert(alert.id));
    
    // Auto-close on click
    alertElement.addEventListener('click', (e) => {
      if (!e.target.closest('.alert-actions')) {
        this.removeAlert(alert.id);
      }
    });
    
    // Action buttons
    const viewBtn = alertElement.querySelector('[onclick*="viewDetails"]');
    if (viewBtn) {
      viewBtn.addEventListener('click', () => this.viewDetails(alert.id));
    }
    
    const shareBtn = alertElement.querySelector('[onclick*="shareAlert"]');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => this.shareAlert(alert.id));
    }
    
    const muteBtn = alertElement.querySelector('[onclick*="muteSource"]');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => this.muteSource(alert.source));
    }
  }

  removeAlert(alertId) {
    const alertElement = document.getElementById(alertId);
    if (alertElement) {
      alertElement.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (alertElement.parentNode) {
          alertElement.parentNode.removeChild(alertElement);
        }
      }, 300);
    }
    
    this.alerts = this.alerts.filter(alert => alert.id !== alertId);
  }

  playAlertSound(severity) {
    if (!this.audioContext || !this.config.soundEnabled) return;
    
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Different frequencies for different severities
      const frequency = severity >= 8 ? 800 : severity >= 6 ? 600 : 400;
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      oscillator.type = 'sine';
      
      // Volume envelope
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('Could not play alert sound:', error);
    }
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'a':
            e.preventDefault();
            this.showAllAlerts();
            break;
          case 'c':
            e.preventDefault();
            this.clearAllAlerts();
            break;
          case 'm':
            e.preventDefault();
            this.toggleMute();
            break;
        }
      }
    });
  }

  // Action methods
  viewDetails(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return;
    
    // Emit custom event for parent component to handle
    window.dispatchEvent(new CustomEvent('news-alert-details', {
      detail: { alert }
    }));
  }

  shareAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return;
    
    const shareText = `🚁 DroneWatch Alert: ${alert.title}\n${alert.description}\nLocation: ${alert.location}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'DroneWatch Alert',
        text: shareText
      });
    } else {
      navigator.clipboard.writeText(shareText);
      this.showToast('Alert copied to clipboard');
    }
  }

  muteSource(source) {
    // Add to muted sources
    const mutedSources = JSON.parse(localStorage.getItem('muted-sources') || '[]');
    if (!mutedSources.includes(source)) {
      mutedSources.push(source);
      localStorage.setItem('muted-sources', JSON.stringify(mutedSources));
    }
    
    this.showToast(`Muted alerts from ${source}`);
  }

  showAllAlerts() {
    // Show all recent alerts in a modal
    const modal = document.createElement('div');
    modal.className = 'alerts-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Recent Alerts</h3>
        <div class="alerts-list">
          ${this.alerts.map(alert => `
            <div class="alert-item">
              <div class="alert-item-title">${alert.title}</div>
              <div class="alert-item-meta">${alert.location} • ${alert.source} • ${this.getTimeAgo(alert.timestamp)}</div>
            </div>
          `).join('')}
        </div>
        <button onclick="this.close()">Close</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  clearAllAlerts() {
    this.alerts.forEach(alert => this.removeAlert(alert.id));
    this.showToast('All alerts cleared');
  }

  toggleMute() {
    this.config.soundEnabled = !this.config.soundEnabled;
    this.showToast(`Sound ${this.config.soundEnabled ? 'enabled' : 'disabled'}`);
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--surface);
      color: var(--text);
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      z-index: 10001;
      animation: slideUp 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideDown 0.3s ease';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 2000);
  }

  // Utility methods
  getSeverityClass(severity) {
    if (severity >= 8) return 'critical';
    if (severity >= 6) return 'high';
    if (severity >= 4) return 'medium';
    return 'low';
  }

  getSeverityIcon(severity) {
    if (severity >= 8) return '🚨';
    if (severity >= 6) return '⚠️';
    if (severity >= 4) return '⚡';
    return '📢';
  }

  getSeverityColor(severity) {
    if (severity >= 8) return '#ef4444';
    if (severity >= 6) return '#f59e0b';
    if (severity >= 4) return '#3b82f6';
    return '#10b981';
  }

  getConfidenceColor(confidence) {
    if (confidence >= 90) return '#10b981';
    if (confidence >= 70) return '#3b82f6';
    if (confidence >= 50) return '#f59e0b';
    return '#ef4444';
  }

  getTimeAgo(timestamp) {
    const now = new Date();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return timestamp.toLocaleDateString();
  }

  // Public API
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  getAlerts() {
    return [...this.alerts];
  }

  getAlertStats() {
    return {
      total: this.alerts.length,
      bySeverity: this.alerts.reduce((acc, alert) => {
        const level = this.getSeverityClass(alert.severity);
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      }, {}),
      bySource: this.alerts.reduce((acc, alert) => {
        acc[alert.source] = (acc[alert.source] || 0) + 1;
        return acc;
      }, {})
    };
  }
}

// CSS Styles
const newsAlertsStyles = `
  .news-alert {
    border-left: 4px solid var(--border);
  }

  .news-alert.critical {
    border-left-color: #ef4444;
    background: rgba(239, 68, 68, 0.05);
  }

  .news-alert.high {
    border-left-color: #f59e0b;
    background: rgba(245, 158, 11, 0.05);
  }

  .news-alert.medium {
    border-left-color: #3b82f6;
    background: rgba(59, 130, 246, 0.05);
  }

  .news-alert.low {
    border-left-color: #10b981;
    background: rgba(16, 185, 129, 0.05);
  }

  .news-alert.breaking {
    border-left-color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }

  .alert-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
  }

  .alert-title {
    font-weight: 600;
    font-size: 0.875rem;
    line-height: 1.4;
    flex: 1;
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0;
    margin-left: 0.5rem;
  }

  .close-btn:hover {
    color: var(--text);
  }

  .breaking-badge {
    background: #ef4444;
    color: white;
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    margin-left: 0.5rem;
  }

  .alert-content {
    margin-bottom: 0.75rem;
  }

  .alert-description {
    font-size: 0.875rem;
    line-height: 1.4;
    margin-bottom: 0.5rem;
    color: var(--text-muted);
  }

  .alert-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-bottom: 0.75rem;
  }

  .alert-metrics {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .severity-meter,
  .confidence-meter {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .metric-label {
    font-size: 0.75rem;
    color: var(--text-muted);
    min-width: 60px;
  }

  .meter-bar {
    flex: 1;
    height: 4px;
    background: var(--border);
    border-radius: 2px;
    overflow: hidden;
  }

  .meter-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  .metric-value {
    font-size: 0.75rem;
    font-weight: 600;
    min-width: 40px;
    text-align: right;
  }

  .alert-actions {
    display: flex;
    gap: 0.5rem;
  }

  .action-btn {
    padding: 0.25rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--surface);
    color: var(--text);
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .action-btn.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: white;
  }

  .action-btn.primary:hover {
    background: #2563eb;
  }

  .action-btn.secondary:hover {
    background: var(--accent);
    border-color: var(--accent);
    color: white;
  }

  .alerts-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  }

  .modal-content {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1.5rem;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  }

  .alerts-list {
    max-height: 400px;
    overflow-y: auto;
  }

  .alert-item {
    padding: 0.75rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    margin-bottom: 0.5rem;
  }

  .alert-item-title {
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .alert-item-meta {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .toast {
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from { transform: translateX(-50%) translateY(100%); opacity: 0; }
    to { transform: translateX(-50%) translateY(0); opacity: 1; }
  }

  @keyframes slideDown {
    from { transform: translateX(-50%) translateY(0); opacity: 1; }
    to { transform: translateX(-50%) translateY(100%); opacity: 0; }
  }
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = newsAlertsStyles;
document.head.appendChild(styleSheet);

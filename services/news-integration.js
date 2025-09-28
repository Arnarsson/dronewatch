/**
 * News Integration Service
 * Orchestrates all news-related features and components
 */

import { NewsDashboard } from '../components/news-dashboard.js';
import { NewsAlerts } from '../components/news-alerts.js';
import { NewsAnalytics } from '../components/news-analytics.js';
import { NewsTrends } from '../components/news-trends.js';

export class NewsIntegrationService {
  constructor(config = {}) {
    this.config = {
      enableDashboard: config.enableDashboard !== false,
      enableAlerts: config.enableAlerts !== false,
      enableAnalytics: config.enableAnalytics !== false,
      enableTrends: config.enableTrends !== false,
      ...config
    };
    
    this.components = {};
    this.isInitialized = false;
    this.wsConnection = null;
    
    this.init();
  }

  async init() {
    try {
      await this.initializeComponents();
      this.setupWebSocketConnection();
      this.setupEventListeners();
      this.isInitialized = true;
      
      console.log('✅ News Integration Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize News Integration Service:', error);
    }
  }

  async initializeComponents() {
    // Initialize News Dashboard
    if (this.config.enableDashboard) {
      try {
        this.components.dashboard = new NewsDashboard('news-dashboard', {
          refreshInterval: 300000, // 5 minutes
          maxArticles: 50,
          sources: ['reuters', 'bbc', 'cnn', 'guardian', 'ap-news']
        });
        console.log('✅ News Dashboard initialized');
      } catch (error) {
        console.error('❌ Failed to initialize News Dashboard:', error);
      }
    }

    // Initialize News Alerts
    if (this.config.enableAlerts) {
      try {
        this.components.alerts = new NewsAlerts({
          alertThreshold: 7,
          confidenceThreshold: 80,
          maxAlerts: 10,
          alertDuration: 10000,
          soundEnabled: true
        });
        console.log('✅ News Alerts initialized');
      } catch (error) {
        console.error('❌ Failed to initialize News Alerts:', error);
      }
    }

    // Initialize News Analytics
    if (this.config.enableAnalytics) {
      try {
        this.components.analytics = new NewsAnalytics('news-analytics', {
          updateInterval: 60000, // 1 minute
          maxHistory: 1000
        });
        console.log('✅ News Analytics initialized');
      } catch (error) {
        console.error('❌ Failed to initialize News Analytics:', error);
      }
    }

    // Initialize News Trends
    if (this.config.enableTrends) {
      try {
        this.components.trends = new NewsTrends('news-trends', {
          updateInterval: 300000, // 5 minutes
          trendWindow: 7,
          minOccurrences: 3
        });
        console.log('✅ News Trends initialized');
      } catch (error) {
        console.error('❌ Failed to initialize News Trends:', error);
      }
    }
  }

  setupWebSocketConnection() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      this.wsConnection = new WebSocket(`${protocol}//${window.location.host}`);
      
      this.wsConnection.onopen = () => {
        console.log('✅ News WebSocket connected');
        this.wsConnection.send(JSON.stringify({
          type: 'subscribe',
          channel: 'news_updates',
          filters: {
            severity: 5,
            confidence: 70
          }
        }));
      };
      
      this.wsConnection.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleWebSocketMessage(data);
      };
      
      this.wsConnection.onclose = () => {
        console.log('⚠️ News WebSocket disconnected, reconnecting...');
        setTimeout(() => this.setupWebSocketConnection(), 5000);
      };
      
      this.wsConnection.onerror = (error) => {
        console.error('❌ News WebSocket error:', error);
      };
    } catch (error) {
      console.error('❌ Failed to setup WebSocket connection:', error);
    }
  }

  handleWebSocketMessage(data) {
    switch (data.type) {
      case 'news_alert':
        if (this.components.alerts) {
          this.components.alerts.handleNewsAlert(data.alert);
        }
        break;
        
      case 'news_update':
        if (this.components.dashboard) {
          this.components.dashboard.loadNews();
        }
        break;
        
      case 'analytics_update':
        if (this.components.analytics) {
          this.components.analytics.loadAnalytics();
        }
        break;
        
      case 'trends_update':
        if (this.components.trends) {
          this.components.trends.loadTrends();
        }
        break;
        
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  }

  setupEventListeners() {
    // Listen for custom events from components
    window.addEventListener('news-alert-details', (event) => {
      this.handleAlertDetails(event.detail);
    });
    
    window.addEventListener('configure-source', (event) => {
      this.handleSourceConfiguration(event.detail);
    });
    
    window.addEventListener('set-prediction-alert', (event) => {
      this.handlePredictionAlert(event.detail);
    });
    
    window.addEventListener('update-time-range', (event) => {
      this.handleTimeRangeUpdate(event.detail);
    });
  }

  // Event handlers
  handleAlertDetails(detail) {
    const { alert } = detail;
    console.log('Alert details requested:', alert);
    
    // Show detailed alert information
    this.showAlertDetailsModal(alert);
  }

  handleSourceConfiguration(detail) {
    const { sourceName, source } = detail;
    console.log('Source configuration requested:', sourceName);
    
    // Show source configuration modal
    this.showSourceConfigModal(source);
  }

  handlePredictionAlert(detail) {
    const { prediction } = detail;
    console.log('Prediction alert requested:', prediction);
    
    // Set up alert for prediction
    this.setupPredictionAlert(prediction);
  }

  handleTimeRangeUpdate(detail) {
    const { timeRange } = detail;
    console.log('Time range updated:', timeRange);
    
    // Update all components with new time range
    if (this.components.dashboard) {
      this.components.dashboard.config.timeRange = timeRange;
    }
    if (this.components.analytics) {
      this.components.analytics.config.timeRange = timeRange;
    }
    if (this.components.trends) {
      this.components.trends.config.trendWindow = timeRange;
    }
  }

  // Modal handlers
  showAlertDetailsModal(alert) {
    const modal = document.createElement('div');
    modal.className = 'alert-details-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>🚨 Alert Details</h3>
        <div class="alert-details">
          <div class="detail-item">
            <span class="detail-label">Title</span>
            <span class="detail-value">${alert.title}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Location</span>
            <span class="detail-value">${alert.location}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Source</span>
            <span class="detail-value">${alert.source}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Severity</span>
            <span class="detail-value">${alert.severity}/10</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Confidence</span>
            <span class="detail-value">${alert.confidence}%</span>
          </div>
          <div class="detail-description">
            <h4>Description</h4>
            <p>${alert.description}</p>
          </div>
        </div>
        <div class="modal-actions">
          <button class="action-btn primary" onclick="this.close()">Close</button>
          <button class="action-btn secondary" onclick="this.shareAlert('${alert.id}')">Share</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  showSourceConfigModal(source) {
    const modal = document.createElement('div');
    modal.className = 'source-config-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>⚙️ Configure Source: ${source.name}</h3>
        <div class="config-form">
          <div class="form-group">
            <label>Alert Threshold</label>
            <input type="range" min="1" max="10" value="${source.alertThreshold || 7}" id="alert-threshold">
            <span id="threshold-value">${source.alertThreshold || 7}</span>
          </div>
          <div class="form-group">
            <label>Confidence Threshold</label>
            <input type="range" min="0" max="100" value="${source.confidenceThreshold || 80}" id="confidence-threshold">
            <span id="confidence-value">${source.confidenceThreshold || 80}%</span>
          </div>
          <div class="form-group">
            <label>Update Frequency</label>
            <select id="update-frequency">
              <option value="300000">5 minutes</option>
              <option value="600000">10 minutes</option>
              <option value="1800000">30 minutes</option>
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button class="action-btn primary" onclick="this.saveConfig()">Save</button>
          <button class="action-btn secondary" onclick="this.close()">Cancel</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Setup form interactions
    const alertThreshold = modal.querySelector('#alert-threshold');
    const confidenceThreshold = modal.querySelector('#confidence-threshold');
    
    alertThreshold.addEventListener('input', (e) => {
      modal.querySelector('#threshold-value').textContent = e.target.value;
    });
    
    confidenceThreshold.addEventListener('input', (e) => {
      modal.querySelector('#confidence-value').textContent = e.target.value + '%';
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  setupPredictionAlert(prediction) {
    const alertConfig = {
      type: 'prediction',
      title: prediction.title,
      description: prediction.description,
      confidence: prediction.confidence,
      timeframe: prediction.timeframe,
      active: true,
      createdAt: new Date().toISOString()
    };
    
    // Store alert configuration
    const alerts = JSON.parse(localStorage.getItem('prediction-alerts') || '[]');
    alerts.push(alertConfig);
    localStorage.setItem('prediction-alerts', JSON.stringify(alerts));
    
    // Show confirmation
    this.showToast(`Alert set for: ${prediction.title}`);
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
    }, 3000);
  }

  // Public API methods
  getComponent(componentName) {
    return this.components[componentName];
  }

  getAllComponents() {
    return this.components;
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      components: Object.keys(this.components),
      websocket: this.wsConnection ? this.wsConnection.readyState : 'disconnected',
      config: this.config
    };
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Update component configurations
    Object.values(this.components).forEach(component => {
      if (component.updateConfig) {
        component.updateConfig(newConfig);
      }
    });
  }

  refreshAll() {
    Object.values(this.components).forEach(component => {
      if (component.loadNews) component.loadNews();
      if (component.loadAnalytics) component.loadAnalytics();
      if (component.loadTrends) component.loadTrends();
    });
  }

  destroy() {
    // Clean up WebSocket connection
    if (this.wsConnection) {
      this.wsConnection.close();
    }
    
    // Clean up components
    Object.values(this.components).forEach(component => {
      if (component.destroy) {
        component.destroy();
      }
    });
    
    this.components = {};
    this.isInitialized = false;
  }
}

// CSS Styles for modals
const newsIntegrationStyles = `
  .alert-details-modal,
  .source-config-modal {
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
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  }

  .alert-details,
  .config-form {
    margin: 1rem 0;
  }

  .detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    padding: 0.5rem;
    background: var(--glass);
    border-radius: 4px;
  }

  .detail-label {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .detail-value {
    font-weight: 600;
  }

  .detail-description {
    margin-top: 1rem;
  }

  .detail-description h4 {
    margin-bottom: 0.5rem;
    color: var(--accent);
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: var(--text);
  }

  .form-group input,
  .form-group select {
    width: 100%;
    padding: 0.5rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text);
  }

  .form-group input[type="range"] {
    width: calc(100% - 50px);
    margin-right: 0.5rem;
  }

  .modal-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 1rem;
  }

  .action-btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .action-btn.primary {
    background: var(--accent);
    color: white;
  }

  .action-btn.primary:hover {
    background: #2563eb;
  }

  .action-btn.secondary {
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text);
  }

  .action-btn.secondary:hover {
    background: var(--accent);
    color: white;
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
styleSheet.textContent = newsIntegrationStyles;
document.head.appendChild(styleSheet);

// Export the service
export default NewsIntegrationService;

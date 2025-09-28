/**
 * News Trend Analysis Component
 * Identify patterns and trends in drone incidents
 */

export class NewsTrends {
  constructor(containerId, config = {}) {
    this.container = document.getElementById(containerId);
    this.config = {
      updateInterval: config.updateInterval || 300000, // 5 minutes
      trendWindow: config.trendWindow || 7, // days
      minOccurrences: config.minOccurrences || 3,
      ...config
    };
    
    this.trends = {
      keywords: new Map(),
      locations: new Map(),
      timePatterns: new Map(),
      severityTrends: [],
      sourcePatterns: new Map()
    };
    
    this.insights = [];
    this.predictions = [];
    this.isInitialized = false;
    
    this.init();
  }

  async init() {
    await this.loadTrends();
    this.render();
    this.startAutoUpdate();
    this.setupEventListeners();
    this.isInitialized = true;
  }

  async loadTrends() {
    try {
      const response = await fetch('/api/trends');
      const data = await response.json();
      
      this.trends = {
        keywords: new Map(data.keywords || []),
        locations: new Map(data.locations || []),
        timePatterns: new Map(data.timePatterns || []),
        severityTrends: data.severityTrends || [],
        sourcePatterns: new Map(data.sourcePatterns || [])
      };
      
      this.insights = data.insights || [];
      this.predictions = data.predictions || [];
      
    } catch (error) {
      console.error('Error loading trends:', error);
      // Use mock data for development
      this.loadMockData();
    }
  }

  loadMockData() {
    // Mock keyword trends
    const mockKeywords = [
      { keyword: 'airport security', count: 45, trend: 'up', change: 23 },
      { keyword: 'drone sighting', count: 38, trend: 'down', change: -12 },
      { keyword: 'UAV detection', count: 32, trend: 'up', change: 18 },
      { keyword: 'airspace violation', count: 28, trend: 'stable', change: 2 },
      { keyword: 'drone incident', count: 25, trend: 'up', change: 15 }
    ];
    
    mockKeywords.forEach(item => {
      this.trends.keywords.set(item.keyword, item);
    });
    
    // Mock location trends
    const mockLocations = [
      { location: 'Copenhagen Airport', count: 12, trend: 'up', change: 33 },
      { location: 'Amsterdam Schiphol', count: 10, trend: 'down', change: -20 },
      { location: 'Frankfurt Airport', count: 8, trend: 'up', change: 25 },
      { location: 'London Heathrow', count: 7, trend: 'stable', change: 0 },
      { location: 'Paris CDG', count: 6, trend: 'up', change: 50 }
    ];
    
    mockLocations.forEach(item => {
      this.trends.locations.set(item.location, item);
    });
    
    // Mock time patterns
    const mockTimePatterns = [
      { hour: 6, incidents: 2, trend: 'up' },
      { hour: 8, incidents: 5, trend: 'up' },
      { hour: 12, incidents: 8, trend: 'stable' },
      { hour: 16, incidents: 12, trend: 'up' },
      { hour: 20, incidents: 6, trend: 'down' }
    ];
    
    mockTimePatterns.forEach(item => {
      this.trends.timePatterns.set(item.hour, item);
    });
    
    // Mock severity trends
    this.trends.severityTrends = [
      { date: '2024-01-15', avgSeverity: 6.2, incidents: 8 },
      { date: '2024-01-16', avgSeverity: 7.1, incidents: 12 },
      { date: '2024-01-17', avgSeverity: 5.8, incidents: 6 },
      { date: '2024-01-18', avgSeverity: 8.3, incidents: 15 },
      { date: '2024-01-19', avgSeverity: 6.9, incidents: 10 }
    ];
    
    // Mock insights
    this.insights = [
      {
        type: 'pattern',
        title: 'Peak Incident Hours',
        description: 'Most drone incidents occur between 4-6 PM, likely due to increased airport traffic',
        confidence: 85,
        impact: 'high'
      },
      {
        type: 'correlation',
        title: 'Weather Correlation',
        description: 'Clear weather days show 40% more drone incidents than cloudy days',
        confidence: 72,
        impact: 'medium'
      },
      {
        type: 'anomaly',
        title: 'Unusual Activity Spike',
        description: 'Copenhagen Airport showing 3x normal incident rate this week',
        confidence: 90,
        impact: 'critical'
      }
    ];
    
    // Mock predictions
    this.predictions = [
      {
        type: 'incident_forecast',
        title: 'Next 24 Hours',
        description: 'High probability of incidents at major European airports',
        confidence: 78,
        timeframe: '24h'
      },
      {
        type: 'trend_forecast',
        title: 'Weekly Trend',
        description: 'Incident rate expected to increase by 15% this week',
        confidence: 65,
        timeframe: '7d'
      }
    ];
  }

  render() {
    this.container.innerHTML = `
      <div class="trends-dashboard">
        <div class="trends-header">
          <h2>📈 Trend Analysis</h2>
          <div class="trends-controls">
            <select id="trend-window">
              <option value="7" selected>Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
            <button id="refresh-trends">🔄 Refresh</button>
            <button id="export-trends">📥 Export</button>
          </div>
        </div>
        
        <div class="trends-overview">
          <div class="trends-summary">
            <div class="summary-card">
              <div class="card-title">📊 Active Trends</div>
              <div class="card-content">
                <div class="trend-stat">
                  <span class="stat-label">Rising Keywords</span>
                  <span class="stat-value" id="rising-keywords">0</span>
                </div>
                <div class="trend-stat">
                  <span class="stat-label">Hot Locations</span>
                  <span class="stat-value" id="hot-locations">0</span>
                </div>
                <div class="trend-stat">
                  <span class="stat-label">Peak Hours</span>
                  <span class="stat-value" id="peak-hours">0</span>
                </div>
              </div>
            </div>
            
            <div class="summary-card">
              <div class="card-title">🔮 Predictions</div>
              <div class="card-content">
                <div class="prediction-item">
                  <div class="prediction-title">Next 24h Risk</div>
                  <div class="prediction-value" id="next-24h-risk">Medium</div>
                </div>
                <div class="prediction-item">
                  <div class="prediction-title">Weekly Trend</div>
                  <div class="prediction-value" id="weekly-trend">Rising</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="trends-content">
          <div class="trends-section">
            <h3>🔥 Trending Keywords</h3>
            <div class="trends-list" id="keywords-list"></div>
          </div>
          
          <div class="trends-section">
            <h3>📍 Location Hotspots</h3>
            <div class="trends-list" id="locations-list"></div>
          </div>
          
          <div class="trends-section">
            <h3>⏰ Time Patterns</h3>
            <div class="time-patterns" id="time-patterns"></div>
          </div>
        </div>
        
        <div class="insights-section">
          <h3>💡 AI Insights</h3>
          <div class="insights-list" id="insights-list"></div>
        </div>
        
        <div class="predictions-section">
          <h3>🔮 Predictions</h3>
          <div class="predictions-list" id="predictions-list"></div>
        </div>
      </div>
    `;
    
    this.renderKeywords();
    this.renderLocations();
    this.renderTimePatterns();
    this.renderInsights();
    this.renderPredictions();
    this.updateSummary();
  }

  renderKeywords() {
    const keywordsList = document.getElementById('keywords-list');
    const keywords = Array.from(this.trends.keywords.values())
      .sort((a, b) => b.count - a.count);
    
    keywordsList.innerHTML = keywords.map(keyword => `
      <div class="trend-item ${keyword.trend}">
        <div class="trend-header">
          <div class="trend-name">${keyword.keyword}</div>
          <div class="trend-count">${keyword.count} mentions</div>
        </div>
        <div class="trend-metrics">
          <div class="trend-change ${keyword.trend}">
            ${keyword.trend === 'up' ? '📈' : keyword.trend === 'down' ? '📉' : '➡️'}
            ${keyword.change > 0 ? '+' : ''}${keyword.change}%
          </div>
          <div class="trend-bar">
            <div class="bar-fill" style="width: ${(keyword.count / Math.max(...keywords.map(k => k.count))) * 100}%"></div>
          </div>
        </div>
      </div>
    `).join('');
  }

  renderLocations() {
    const locationsList = document.getElementById('locations-list');
    const locations = Array.from(this.trends.locations.values())
      .sort((a, b) => b.count - a.count);
    
    locationsList.innerHTML = locations.map(location => `
      <div class="trend-item ${location.trend}">
        <div class="trend-header">
          <div class="trend-name">${location.location}</div>
          <div class="trend-count">${location.count} incidents</div>
        </div>
        <div class="trend-metrics">
          <div class="trend-change ${location.trend}">
            ${location.trend === 'up' ? '📈' : location.trend === 'down' ? '📉' : '➡️'}
            ${location.change > 0 ? '+' : ''}${location.change}%
          </div>
          <div class="trend-bar">
            <div class="bar-fill" style="width: ${(location.count / Math.max(...locations.map(l => l.count))) * 100}%"></div>
          </div>
        </div>
      </div>
    `).join('');
  }

  renderTimePatterns() {
    const timePatterns = document.getElementById('time-patterns');
    const patterns = Array.from(this.trends.timePatterns.values())
      .sort((a, b) => a.hour - b.hour);
    
    timePatterns.innerHTML = `
      <div class="time-patterns-grid">
        ${patterns.map(pattern => `
          <div class="time-pattern-item">
            <div class="time-hour">${pattern.hour}:00</div>
            <div class="time-incidents">${pattern.incidents} incidents</div>
            <div class="time-trend ${pattern.trend}">
              ${pattern.trend === 'up' ? '📈' : pattern.trend === 'down' ? '📉' : '➡️'}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderInsights() {
    const insightsList = document.getElementById('insights-list');
    
    insightsList.innerHTML = this.insights.map(insight => `
      <div class="insight-item ${insight.impact}">
        <div class="insight-header">
          <div class="insight-type">${this.getInsightIcon(insight.type)} ${insight.type}</div>
          <div class="insight-confidence">${insight.confidence}% confidence</div>
        </div>
        <div class="insight-content">
          <h4 class="insight-title">${insight.title}</h4>
          <p class="insight-description">${insight.description}</p>
        </div>
        <div class="insight-actions">
          <button class="action-btn" onclick="this.viewInsightDetails('${insight.title}')">Details</button>
          <button class="action-btn" onclick="this.shareInsight('${insight.title}')">Share</button>
        </div>
      </div>
    `).join('');
  }

  renderPredictions() {
    const predictionsList = document.getElementById('predictions-list');
    
    predictionsList.innerHTML = this.predictions.map(prediction => `
      <div class="prediction-item ${prediction.type}">
        <div class="prediction-header">
          <div class="prediction-type">${this.getPredictionIcon(prediction.type)} ${prediction.type.replace('_', ' ')}</div>
          <div class="prediction-timeframe">${prediction.timeframe}</div>
        </div>
        <div class="prediction-content">
          <h4 class="prediction-title">${prediction.title}</h4>
          <p class="prediction-description">${prediction.description}</p>
        </div>
        <div class="prediction-metrics">
          <div class="prediction-confidence">
            <span class="metric-label">Confidence</span>
            <span class="metric-value">${prediction.confidence}%</span>
          </div>
          <div class="prediction-actions">
            <button class="action-btn" onclick="this.viewPredictionDetails('${prediction.title}')">Details</button>
            <button class="action-btn" onclick="this.setAlert('${prediction.title}')">Set Alert</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  updateSummary() {
    const risingKeywords = Array.from(this.trends.keywords.values())
      .filter(k => k.trend === 'up').length;
    const hotLocations = Array.from(this.trends.locations.values())
      .filter(l => l.trend === 'up').length;
    const peakHours = Array.from(this.trends.timePatterns.values())
      .filter(t => t.trend === 'up').length;
    
    document.getElementById('rising-keywords').textContent = risingKeywords;
    document.getElementById('hot-locations').textContent = hotLocations;
    document.getElementById('peak-hours').textContent = peakHours;
    
    // Update predictions summary
    const next24hRisk = this.calculateRiskLevel();
    const weeklyTrend = this.calculateWeeklyTrend();
    
    document.getElementById('next-24h-risk').textContent = next24hRisk;
    document.getElementById('weekly-trend').textContent = weeklyTrend;
  }

  calculateRiskLevel() {
    const recentSeverity = this.trends.severityTrends.slice(-3);
    const avgSeverity = recentSeverity.reduce((sum, day) => sum + day.avgSeverity, 0) / recentSeverity.length;
    
    if (avgSeverity >= 8) return 'Critical';
    if (avgSeverity >= 6) return 'High';
    if (avgSeverity >= 4) return 'Medium';
    return 'Low';
  }

  calculateWeeklyTrend() {
    const recentTrends = this.trends.severityTrends.slice(-7);
    if (recentTrends.length < 2) return 'Stable';
    
    const first = recentTrends[0].avgSeverity;
    const last = recentTrends[recentTrends.length - 1].avgSeverity;
    
    if (last > first * 1.1) return 'Rising';
    if (last < first * 0.9) return 'Falling';
    return 'Stable';
  }

  setupEventListeners() {
    document.getElementById('refresh-trends').addEventListener('click', () => this.loadTrends());
    document.getElementById('export-trends').addEventListener('click', () => this.exportTrends());
    document.getElementById('trend-window').addEventListener('change', (e) => this.updateTrendWindow(e.target.value));
  }

  startAutoUpdate() {
    setInterval(() => {
      this.loadTrends();
    }, this.config.updateInterval);
  }

  // Action methods
  viewInsightDetails(insightTitle) {
    const insight = this.insights.find(i => i.title === insightTitle);
    if (!insight) return;
    
    const modal = document.createElement('div');
    modal.className = 'insight-details-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>${insight.title}</h3>
        <div class="insight-details">
          <div class="detail-item">
            <span class="detail-label">Type</span>
            <span class="detail-value">${insight.type}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Confidence</span>
            <span class="detail-value">${insight.confidence}%</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Impact</span>
            <span class="detail-value">${insight.impact}</span>
          </div>
          <div class="detail-description">
            <h4>Description</h4>
            <p>${insight.description}</p>
          </div>
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

  shareInsight(insightTitle) {
    const insight = this.insights.find(i => i.title === insightTitle);
    if (!insight) return;
    
    const shareText = `🔍 DroneWatch Insight: ${insight.title}\n${insight.description}\nConfidence: ${insight.confidence}%`;
    
    if (navigator.share) {
      navigator.share({
        title: 'DroneWatch Insight',
        text: shareText
      });
    } else {
      navigator.clipboard.writeText(shareText);
      this.showToast('Insight copied to clipboard');
    }
  }

  viewPredictionDetails(predictionTitle) {
    const prediction = this.predictions.find(p => p.title === predictionTitle);
    if (!prediction) return;
    
    const modal = document.createElement('div');
    modal.className = 'prediction-details-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>${prediction.title}</h3>
        <div class="prediction-details">
          <div class="detail-item">
            <span class="detail-label">Type</span>
            <span class="detail-value">${prediction.type}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Timeframe</span>
            <span class="detail-value">${prediction.timeframe}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Confidence</span>
            <span class="detail-value">${prediction.confidence}%</span>
          </div>
          <div class="detail-description">
            <h4>Description</h4>
            <p>${prediction.description}</p>
          </div>
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

  setAlert(predictionTitle) {
    const prediction = this.predictions.find(p => p.title === predictionTitle);
    if (!prediction) return;
    
    // Emit custom event for parent component to handle
    window.dispatchEvent(new CustomEvent('set-prediction-alert', {
      detail: { prediction }
    }));
  }

  exportTrends() {
    const data = {
      trends: {
        keywords: Array.from(this.trends.keywords.entries()),
        locations: Array.from(this.trends.locations.entries()),
        timePatterns: Array.from(this.trends.timePatterns.entries()),
        severityTrends: this.trends.severityTrends,
        sourcePatterns: Array.from(this.trends.sourcePatterns.entries())
      },
      insights: this.insights,
      predictions: this.predictions,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `dronewatch-trends-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  updateTrendWindow(window) {
    this.config.trendWindow = parseInt(window);
    this.loadTrends();
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
  getInsightIcon(type) {
    const icons = {
      pattern: '📊',
      correlation: '🔗',
      anomaly: '⚠️',
      prediction: '🔮'
    };
    return icons[type] || '💡';
  }

  getPredictionIcon(type) {
    const icons = {
      incident_forecast: '🚨',
      trend_forecast: '📈',
      risk_assessment: '⚠️'
    };
    return icons[type] || '🔮';
  }

  // Public API
  getTrends() {
    return this.trends;
  }

  getInsights() {
    return this.insights;
  }

  getPredictions() {
    return this.predictions;
  }

  getTopTrendingKeywords(limit = 5) {
    return Array.from(this.trends.keywords.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  getTopHotspots(limit = 5) {
    return Array.from(this.trends.locations.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

// CSS Styles
const newsTrendsStyles = `
  .trends-dashboard {
    background: var(--glass);
    border-radius: 12px;
    padding: 1.5rem;
    backdrop-filter: blur(10px);
  }

  .trends-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .trends-controls {
    display: flex;
    gap: 1rem;
  }

  .trends-controls select,
  .trends-controls button {
    padding: 0.5rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
  }

  .trends-overview {
    margin-bottom: 1.5rem;
  }

  .trends-summary {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .summary-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem;
  }

  .card-title {
    font-weight: 600;
    margin-bottom: 0.75rem;
    color: var(--accent);
  }

  .card-content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .trend-stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .stat-label {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .stat-value {
    font-weight: 600;
    font-size: 1.125rem;
  }

  .prediction-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .prediction-title {
    font-weight: 600;
    font-size: 0.875rem;
  }

  .prediction-value {
    font-weight: 700;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
  }

  .trends-content {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .trends-section {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem;
  }

  .trends-section h3 {
    margin-bottom: 1rem;
    font-size: 1rem;
    color: var(--accent);
  }

  .trends-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .trend-item {
    background: var(--glass);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.75rem;
    transition: all 0.2s;
  }

  .trend-item:hover {
    border-color: var(--accent);
    transform: translateY(-1px);
  }

  .trend-item.up {
    border-left: 4px solid #10b981;
  }

  .trend-item.down {
    border-left: 4px solid #ef4444;
  }

  .trend-item.stable {
    border-left: 4px solid #6b7280;
  }

  .trend-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .trend-name {
    font-weight: 600;
    font-size: 0.875rem;
  }

  .trend-count {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .trend-metrics {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .trend-change {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .trend-change.up {
    color: #10b981;
  }

  .trend-change.down {
    color: #ef4444;
  }

  .trend-change.stable {
    color: #6b7280;
  }

  .trend-bar {
    flex: 1;
    height: 4px;
    background: var(--border);
    border-radius: 2px;
    margin: 0 0.5rem;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  .time-patterns-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.5rem;
  }

  .time-pattern-item {
    background: var(--glass);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.75rem;
    text-align: center;
  }

  .time-hour {
    font-weight: 600;
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
  }

  .time-incidents {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-bottom: 0.25rem;
  }

  .time-trend {
    font-size: 0.75rem;
  }

  .insights-section,
  .predictions-section {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .insights-section h3,
  .predictions-section h3 {
    margin-bottom: 1rem;
    font-size: 1rem;
    color: var(--accent);
  }

  .insights-list,
  .predictions-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .insight-item,
  .prediction-item {
    background: var(--glass);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 1rem;
    transition: all 0.2s;
  }

  .insight-item:hover,
  .prediction-item:hover {
    border-color: var(--accent);
    transform: translateY(-1px);
  }

  .insight-item.high {
    border-left: 4px solid #10b981;
  }

  .insight-item.medium {
    border-left: 4px solid #f59e0b;
  }

  .insight-item.critical {
    border-left: 4px solid #ef4444;
  }

  .insight-header,
  .prediction-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .insight-type,
  .prediction-type {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: uppercase;
  }

  .insight-confidence,
  .prediction-timeframe {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .insight-title,
  .prediction-title {
    font-weight: 600;
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
  }

  .insight-description,
  .prediction-description {
    font-size: 0.875rem;
    color: var(--text-muted);
    line-height: 1.4;
    margin-bottom: 0.75rem;
  }

  .insight-actions,
  .prediction-actions {
    display: flex;
    gap: 0.5rem;
  }

  .action-btn {
    padding: 0.25rem 0.75rem;
    background: var(--accent);
    border: none;
    border-radius: 4px;
    color: white;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .action-btn:hover {
    background: #2563eb;
  }

  .prediction-metrics {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .prediction-confidence {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .metric-label {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .metric-value {
    font-weight: 600;
    font-size: 0.875rem;
  }

  .insight-details-modal,
  .prediction-details-modal {
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
  }

  .insight-details,
  .prediction-details {
    margin: 1rem 0;
  }

  .detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
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

  @media (max-width: 768px) {
    .trends-content {
      grid-template-columns: 1fr;
    }
    
    .trends-summary {
      grid-template-columns: 1fr;
    }
    
    .time-patterns-grid {
      grid-template-columns: repeat(3, 1fr);
    }
    
    .trends-controls {
      flex-direction: column;
      gap: 0.5rem;
    }
  }
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = newsTrendsStyles;
document.head.appendChild(styleSheet);

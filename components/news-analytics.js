/**
 * News Source Analytics Component
 * Track reliability and performance of news sources
 */

export class NewsAnalytics {
  constructor(containerId, config = {}) {
    this.container = document.getElementById(containerId);
    this.config = {
      updateInterval: config.updateInterval || 60000, // 1 minute
      maxHistory: config.maxHistory || 1000,
      ...config
    };
    
    this.analytics = {
      sources: new Map(),
      trends: [],
      performance: {
        totalArticles: 0,
        totalAlerts: 0,
        avgResponseTime: 0,
        uptime: 100
      },
      reliability: {
        accuracy: 0,
        falsePositives: 0,
        falseNegatives: 0
      }
    };
    
    this.charts = {};
    this.isInitialized = false;
    
    this.init();
  }

  async init() {
    await this.loadAnalytics();
    this.render();
    this.startAutoUpdate();
    this.setupEventListeners();
    this.isInitialized = true;
  }

  async loadAnalytics() {
    try {
      const response = await fetch('/api/analytics');
      const data = await response.json();
      
      this.analytics = {
        sources: new Map(data.sources || []),
        trends: data.trends || [],
        performance: data.performance || this.analytics.performance,
        reliability: data.reliability || this.analytics.reliability
      };
      
    } catch (error) {
      console.error('Error loading analytics:', error);
      // Use mock data for development
      this.loadMockData();
    }
  }

  loadMockData() {
    const mockSources = [
      { name: 'Reuters', articles: 45, accuracy: 94, responseTime: 120, uptime: 99.8 },
      { name: 'BBC', articles: 38, accuracy: 92, responseTime: 150, uptime: 99.5 },
      { name: 'CNN', articles: 32, accuracy: 89, responseTime: 180, uptime: 98.9 },
      { name: 'Guardian', articles: 28, accuracy: 91, responseTime: 200, uptime: 99.2 },
      { name: 'AP News', articles: 41, accuracy: 96, responseTime: 110, uptime: 99.9 }
    ];
    
    mockSources.forEach(source => {
      this.analytics.sources.set(source.name, {
        ...source,
        reliability: this.calculateReliability(source),
        trend: this.generateTrend(source.name)
      });
    });
    
    this.analytics.performance = {
      totalArticles: 184,
      totalAlerts: 23,
      avgResponseTime: 152,
      uptime: 99.3
    };
    
    this.analytics.reliability = {
      accuracy: 92.4,
      falsePositives: 2.1,
      falseNegatives: 5.5
    };
  }

  calculateReliability(source) {
    const accuracy = source.accuracy / 100;
    const uptime = source.uptime / 100;
    const speed = Math.max(0, 1 - (source.responseTime - 100) / 200);
    
    return Math.round((accuracy * 0.5 + uptime * 0.3 + speed * 0.2) * 100);
  }

  generateTrend(sourceName) {
    const trends = ['up', 'down', 'stable'];
    const changes = [5, 10, 15, 20];
    
    return {
      direction: trends[Math.floor(Math.random() * trends.length)],
      change: changes[Math.floor(Math.random() * changes.length)]
    };
  }

  render() {
    this.container.innerHTML = `
      <div class="analytics-dashboard">
        <div class="analytics-header">
          <h2>📊 News Source Analytics</h2>
          <div class="analytics-controls">
            <select id="time-range">
              <option value="24">Last 24 Hours</option>
              <option value="168" selected>Last Week</option>
              <option value="720">Last Month</option>
            </select>
            <button id="export-data">📥 Export</button>
            <button id="refresh-analytics">🔄 Refresh</button>
          </div>
        </div>
        
        <div class="analytics-overview">
          <div class="overview-card">
            <div class="card-title">Performance</div>
            <div class="card-content">
              <div class="metric">
                <span class="metric-label">Total Articles</span>
                <span class="metric-value">${this.analytics.performance.totalArticles}</span>
              </div>
              <div class="metric">
                <span class="metric-label">Total Alerts</span>
                <span class="metric-value">${this.analytics.performance.totalAlerts}</span>
              </div>
              <div class="metric">
                <span class="metric-label">Avg Response Time</span>
                <span class="metric-value">${this.analytics.performance.avgResponseTime}ms</span>
              </div>
              <div class="metric">
                <span class="metric-label">System Uptime</span>
                <span class="metric-value">${this.analytics.performance.uptime}%</span>
              </div>
            </div>
          </div>
          
          <div class="overview-card">
            <div class="card-title">Reliability</div>
            <div class="card-content">
              <div class="metric">
                <span class="metric-label">Overall Accuracy</span>
                <span class="metric-value">${this.analytics.reliability.accuracy}%</span>
              </div>
              <div class="metric">
                <span class="metric-label">False Positives</span>
                <span class="metric-value">${this.analytics.reliability.falsePositives}%</span>
              </div>
              <div class="metric">
                <span class="metric-label">False Negatives</span>
                <span class="metric-value">${this.analytics.reliability.falseNegatives}%</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="analytics-content">
          <div class="sources-section">
            <h3>📡 Source Performance</h3>
            <div class="sources-grid" id="sources-grid"></div>
          </div>
          
          <div class="charts-section">
            <div class="chart-container">
              <h3>📈 Trends Over Time</h3>
              <canvas id="trends-chart" width="400" height="200"></canvas>
            </div>
            
            <div class="chart-container">
              <h3>🎯 Accuracy Distribution</h3>
              <canvas id="accuracy-chart" width="400" height="200"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.renderSources();
    this.renderCharts();
  }

  renderSources() {
    const sourcesGrid = document.getElementById('sources-grid');
    const sources = Array.from(this.analytics.sources.values());
    
    sourcesGrid.innerHTML = sources.map(source => `
      <div class="source-card ${this.getSourceClass(source.reliability)}">
        <div class="source-header">
          <div class="source-name">${this.getSourceIcon(source.name)} ${source.name}</div>
          <div class="source-reliability ${this.getReliabilityClass(source.reliability)}">
            ${source.reliability}%
          </div>
        </div>
        
        <div class="source-metrics">
          <div class="metric-row">
            <span class="metric-label">Articles</span>
            <span class="metric-value">${source.articles}</span>
          </div>
          
          <div class="metric-row">
            <span class="metric-label">Accuracy</span>
            <span class="metric-value">${source.accuracy}%</span>
          </div>
          
          <div class="metric-row">
            <span class="metric-label">Response Time</span>
            <span class="metric-value">${source.responseTime}ms</span>
          </div>
          
          <div class="metric-row">
            <span class="metric-label">Uptime</span>
            <span class="metric-value">${source.uptime}%</span>
          </div>
        </div>
        
        <div class="source-trend">
          <div class="trend-indicator ${source.trend.direction}">
            ${source.trend.direction === 'up' ? '📈' : source.trend.direction === 'down' ? '📉' : '➡️'}
            ${source.trend.change}%
          </div>
        </div>
        
        <div class="source-actions">
          <button class="action-btn" onclick="this.viewSourceDetails('${source.name}')">Details</button>
          <button class="action-btn" onclick="this.configureSource('${source.name}')">Configure</button>
        </div>
      </div>
    `).join('');
  }

  renderCharts() {
    this.renderTrendsChart();
    this.renderAccuracyChart();
  }

  renderTrendsChart() {
    const canvas = document.getElementById('trends-chart');
    const ctx = canvas.getContext('2d');
    
    // Simple line chart implementation
    const data = this.generateTrendData();
    this.drawLineChart(ctx, canvas, data);
  }

  renderAccuracyChart() {
    const canvas = document.getElementById('accuracy-chart');
    const ctx = canvas.getContext('2d');
    
    // Simple bar chart implementation
    const data = Array.from(this.analytics.sources.values()).map(source => ({
      name: source.name,
      accuracy: source.accuracy
    }));
    
    this.drawBarChart(ctx, canvas, data);
  }

  generateTrendData() {
    const days = 7;
    const data = [];
    
    for (let i = 0; i < days; i++) {
      data.push({
        date: new Date(Date.now() - (days - i - 1) * 24 * 60 * 60 * 1000),
        articles: Math.floor(Math.random() * 20) + 10,
        alerts: Math.floor(Math.random() * 5) + 1
      });
    }
    
    return data;
  }

  drawLineChart(ctx, canvas, data) {
    const padding = 40;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw axes
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height + padding);
    ctx.lineTo(width + padding, height + padding);
    ctx.stroke();
    
    // Draw data
    const maxArticles = Math.max(...data.map(d => d.articles));
    const maxAlerts = Math.max(...data.map(d => d.alerts));
    
    // Articles line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    data.forEach((point, index) => {
      const x = padding + (index / (data.length - 1)) * width;
      const y = padding + height - (point.articles / maxArticles) * height;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    
    // Alerts line
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    data.forEach((point, index) => {
      const x = padding + (index / (data.length - 1)) * width;
      const y = padding + height - (point.alerts / maxAlerts) * height;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    
    // Draw points
    data.forEach((point, index) => {
      const x = padding + (index / (data.length - 1)) * width;
      const y = padding + height - (point.articles / maxArticles) * height;
      
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  drawBarChart(ctx, canvas, data) {
    const padding = 40;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;
    const barWidth = width / data.length;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw bars
    data.forEach((item, index) => {
      const barHeight = (item.accuracy / 100) * height;
      const x = padding + index * barWidth;
      const y = padding + height - barHeight;
      
      ctx.fillStyle = this.getAccuracyColor(item.accuracy);
      ctx.fillRect(x, y, barWidth - 5, barHeight);
      
      // Draw label
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.name, x + barWidth / 2, height + padding + 15);
    });
  }

  setupEventListeners() {
    document.getElementById('refresh-analytics').addEventListener('click', () => this.loadAnalytics());
    document.getElementById('export-data').addEventListener('click', () => this.exportData());
    document.getElementById('time-range').addEventListener('change', (e) => this.updateTimeRange(e.target.value));
  }

  startAutoUpdate() {
    setInterval(() => {
      this.loadAnalytics();
    }, this.config.updateInterval);
  }

  // Action methods
  viewSourceDetails(sourceName) {
    const source = this.analytics.sources.get(sourceName);
    if (!source) return;
    
    const modal = document.createElement('div');
    modal.className = 'source-details-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>${source.name} - Detailed Analytics</h3>
        <div class="details-content">
          <div class="detail-section">
            <h4>Performance Metrics</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Total Articles</span>
                <span class="detail-value">${source.articles}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Accuracy Rate</span>
                <span class="detail-value">${source.accuracy}%</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Response Time</span>
                <span class="detail-value">${source.responseTime}ms</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Uptime</span>
                <span class="detail-value">${source.uptime}%</span>
              </div>
            </div>
          </div>
          
          <div class="detail-section">
            <h4>Reliability Score</h4>
            <div class="reliability-meter">
              <div class="meter-bar">
                <div class="meter-fill" style="width: ${source.reliability}%; background: ${this.getReliabilityColor(source.reliability)}"></div>
              </div>
              <span class="meter-value">${source.reliability}%</span>
            </div>
          </div>
          
          <div class="detail-section">
            <h4>Trend Analysis</h4>
            <div class="trend-analysis">
              <div class="trend-item">
                <span class="trend-label">Direction</span>
                <span class="trend-value ${source.trend.direction}">
                  ${source.trend.direction === 'up' ? '📈 Improving' : source.trend.direction === 'down' ? '📉 Declining' : '➡️ Stable'}
                </span>
              </div>
              <div class="trend-item">
                <span class="trend-label">Change</span>
                <span class="trend-value">${source.trend.change}%</span>
              </div>
            </div>
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

  configureSource(sourceName) {
    const source = this.analytics.sources.get(sourceName);
    if (!source) return;
    
    // Emit custom event for parent component to handle
    window.dispatchEvent(new CustomEvent('configure-source', {
      detail: { sourceName, source }
    }));
  }

  exportData() {
    const data = {
      sources: Array.from(this.analytics.sources.entries()),
      performance: this.analytics.performance,
      reliability: this.analytics.reliability,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `dronewatch-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  updateTimeRange(timeRange) {
    // Emit custom event for parent component to handle
    window.dispatchEvent(new CustomEvent('update-time-range', {
      detail: { timeRange }
    }));
  }

  // Utility methods
  getSourceIcon(sourceName) {
    const icons = {
      'Reuters': '🌐',
      'BBC': '🇬🇧',
      'CNN': '🇺🇸',
      'Guardian': '📰',
      'AP News': '📡'
    };
    return icons[sourceName] || '📄';
  }

  getSourceClass(reliability) {
    if (reliability >= 90) return 'excellent';
    if (reliability >= 80) return 'good';
    if (reliability >= 70) return 'fair';
    return 'poor';
  }

  getReliabilityClass(reliability) {
    if (reliability >= 90) return 'excellent';
    if (reliability >= 80) return 'good';
    if (reliability >= 70) return 'fair';
    return 'poor';
  }

  getReliabilityColor(reliability) {
    if (reliability >= 90) return '#10b981';
    if (reliability >= 80) return '#3b82f6';
    if (reliability >= 70) return '#f59e0b';
    return '#ef4444';
  }

  getAccuracyColor(accuracy) {
    if (accuracy >= 90) return '#10b981';
    if (accuracy >= 80) return '#3b82f6';
    if (accuracy >= 70) return '#f59e0b';
    return '#ef4444';
  }

  // Public API
  getAnalytics() {
    return this.analytics;
  }

  getSourceRankings() {
    return Array.from(this.analytics.sources.values())
      .sort((a, b) => b.reliability - a.reliability);
  }

  getTopSources(limit = 5) {
    return this.getSourceRankings().slice(0, limit);
  }

  getWorstSources(limit = 5) {
    return this.getSourceRankings().slice(-limit).reverse();
  }
}

// CSS Styles
const newsAnalyticsStyles = `
  .analytics-dashboard {
    background: var(--glass);
    border-radius: 12px;
    padding: 1.5rem;
    backdrop-filter: blur(10px);
  }

  .analytics-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .analytics-controls {
    display: flex;
    gap: 1rem;
  }

  .analytics-controls select,
  .analytics-controls button {
    padding: 0.5rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
  }

  .analytics-overview {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .overview-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem;
  }

  .card-title {
    font-weight: 600;
    margin-bottom: 1rem;
    color: var(--accent);
  }

  .card-content {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .metric {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .metric-label {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .metric-value {
    font-weight: 600;
    color: var(--text);
  }

  .sources-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .source-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem;
    transition: all 0.2s;
  }

  .source-card:hover {
    border-color: var(--accent);
    transform: translateY(-1px);
  }

  .source-card.excellent {
    border-left: 4px solid #10b981;
  }

  .source-card.good {
    border-left: 4px solid #3b82f6;
  }

  .source-card.fair {
    border-left: 4px solid #f59e0b;
  }

  .source-card.poor {
    border-left: 4px solid #ef4444;
  }

  .source-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .source-name {
    font-weight: 600;
    font-size: 1rem;
  }

  .source-reliability {
    font-weight: 700;
    font-size: 1.25rem;
  }

  .source-reliability.excellent { color: #10b981; }
  .source-reliability.good { color: #3b82f6; }
  .source-reliability.fair { color: #f59e0b; }
  .source-reliability.poor { color: #ef4444; }

  .source-metrics {
    margin-bottom: 0.75rem;
  }

  .metric-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .source-trend {
    margin-bottom: 0.75rem;
  }

  .trend-indicator {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 600;
  }

  .trend-indicator.up {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
  }

  .trend-indicator.down {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  .trend-indicator.stable {
    background: rgba(107, 114, 128, 0.1);
    color: #6b7280;
  }

  .source-actions {
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

  .charts-section {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }

  .chart-container {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem;
  }

  .chart-container h3 {
    margin-bottom: 1rem;
    font-size: 1rem;
    color: var(--accent);
  }

  .source-details-modal {
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

  .details-content {
    margin: 1rem 0;
  }

  .detail-section {
    margin-bottom: 1.5rem;
  }

  .detail-section h4 {
    margin-bottom: 0.75rem;
    color: var(--accent);
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
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

  .reliability-meter {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .meter-bar {
    flex: 1;
    height: 8px;
    background: var(--border);
    border-radius: 4px;
    overflow: hidden;
  }

  .meter-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .meter-value {
    font-weight: 600;
    font-size: 1.125rem;
  }

  .trend-analysis {
    display: flex;
    gap: 1rem;
  }

  .trend-item {
    flex: 1;
    padding: 0.75rem;
    background: var(--glass);
    border-radius: 6px;
    text-align: center;
  }

  .trend-label {
    display: block;
    font-size: 0.875rem;
    color: var(--text-muted);
    margin-bottom: 0.25rem;
  }

  .trend-value {
    font-weight: 600;
    font-size: 1.125rem;
  }

  .trend-value.up { color: #10b981; }
  .trend-value.down { color: #ef4444; }
  .trend-value.stable { color: #6b7280; }

  @media (max-width: 768px) {
    .analytics-overview {
      grid-template-columns: 1fr;
    }
    
    .charts-section {
      grid-template-columns: 1fr;
    }
    
    .sources-grid {
      grid-template-columns: 1fr;
    }
    
    .analytics-controls {
      flex-direction: column;
      gap: 0.5rem;
    }
  }
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = newsAnalyticsStyles;
document.head.appendChild(styleSheet);

/**
 * News Dashboard Component
 * Dedicated news monitoring interface for DroneWatch
 */

export class NewsDashboard {
  constructor(containerId, config = {}) {
    this.container = document.getElementById(containerId);
    this.config = {
      refreshInterval: config.refreshInterval || 300000, // 5 minutes
      maxArticles: config.maxArticles || 50,
      sources: config.sources || ['reuters', 'bbc', 'cnn', 'guardian'],
      ...config
    };
    
    this.articles = [];
    this.sources = new Map();
    this.trends = [];
    this.isLoading = false;
    
    this.init();
  }

  async init() {
    this.render();
    await this.loadNews();
    this.startAutoRefresh();
    this.setupEventListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="news-dashboard">
        <div class="news-header">
          <h2>📰 News Monitoring</h2>
          <div class="news-controls">
            <button class="refresh-btn" id="refresh-news">🔄 Refresh</button>
            <select id="source-filter">
              <option value="">All Sources</option>
              <option value="reuters">Reuters</option>
              <option value="bbc">BBC</option>
              <option value="cnn">CNN</option>
              <option value="guardian">Guardian</option>
            </select>
            <select id="time-filter">
              <option value="1">Last Hour</option>
              <option value="24" selected>Last 24 Hours</option>
              <option value="168">Last Week</option>
            </select>
          </div>
        </div>
        
        <div class="news-stats">
          <div class="stat-card">
            <div class="stat-value" id="total-articles">0</div>
            <div class="stat-label">Total Articles</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="breaking-news">0</div>
            <div class="stat-label">Breaking News</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="high-confidence">0</div>
            <div class="stat-label">High Confidence</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="sources-active">0</div>
            <div class="stat-label">Active Sources</div>
          </div>
        </div>
        
        <div class="news-content">
          <div class="news-feed" id="news-feed">
            <div class="loading-state">Loading news...</div>
          </div>
          
          <div class="news-sidebar">
            <div class="trends-section">
              <h3>📈 Trends</h3>
              <div id="trends-list"></div>
            </div>
            
            <div class="sources-section">
              <h3>📡 Sources</h3>
              <div id="sources-list"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async loadNews() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.updateLoadingState(true);
    
    try {
      const response = await fetch('/api/news');
      const data = await response.json();
      
      this.articles = data.articles || [];
      this.sources = new Map(data.sources || []);
      // Handle trends as either array or object format
      if (Array.isArray(data.trends)) {
        this.trends = data.trends;
      } else if (data.trends && data.trends.severityTrends) {
        this.trends = data.trends.severityTrends;
      } else {
        this.trends = [];
      }
      
      this.renderNewsFeed();
      this.renderTrends();
      this.renderSources();
      this.updateStats();
      
    } catch (error) {
      console.error('Error loading news:', error);
      this.showError('Failed to load news data');
    } finally {
      this.isLoading = false;
      this.updateLoadingState(false);
    }
  }

  renderNewsFeed() {
    const feed = document.getElementById('news-feed');
    const sourceFilter = document.getElementById('source-filter').value;
    const timeFilter = parseInt(document.getElementById('time-filter').value);
    
    const filteredArticles = this.articles.filter(article => {
      if (sourceFilter && article.source !== sourceFilter) return false;
      
      const articleTime = new Date(article.publishedAt);
      const cutoffTime = new Date(Date.now() - timeFilter * 60 * 60 * 1000);
      if (articleTime < cutoffTime) return false;
      
      return true;
    });
    
    if (filteredArticles.length === 0) {
      feed.innerHTML = '<div class="no-articles">No articles found for selected filters</div>';
      return;
    }
    
    feed.innerHTML = filteredArticles.map(article => this.renderArticle(article)).join('');
  }

  renderArticle(article) {
    const confidence = article.confidence || 0;
    const isBreaking = article.isBreaking || false;
    const severity = article.severity || 0;
    
    return `
      <div class="news-article ${isBreaking ? 'breaking' : ''}" data-article-id="${article.id}">
        <div class="article-header">
          <div class="article-source">${this.getSourceIcon(article.source)} ${article.source}</div>
          <div class="article-time">${this.formatTime(article.publishedAt)}</div>
        </div>
        
        <div class="article-content">
          <h3 class="article-title">${article.title}</h3>
          <p class="article-description">${article.description}</p>
          
          <div class="article-meta">
            <div class="article-tags">
              ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            
            <div class="article-metrics">
              <span class="confidence ${this.getConfidenceClass(confidence)}">
                Confidence: ${confidence}%
              </span>
              <span class="severity ${this.getSeverityClass(severity)}">
                Severity: ${severity}/10
              </span>
              ${isBreaking ? '<span class="breaking-badge">BREAKING</span>' : ''}
            </div>
          </div>
        </div>
        
        <div class="article-actions">
          <button class="action-btn" onclick="this.openArticle('${article.url}')">Read Full</button>
          <button class="action-btn" onclick="this.analyzeArticle('${article.id}')">AI Analyze</button>
          <button class="action-btn" onclick="this.shareArticle('${article.id}')">Share</button>
        </div>
      </div>
    `;
  }

  renderTrends() {
    const trendsList = document.getElementById('trends-list');
    
    if (this.trends.length === 0) {
      trendsList.innerHTML = '<div class="no-trends">No trends available</div>';
      return;
    }
    
    trendsList.innerHTML = this.trends.map(trend => `
      <div class="trend-item">
        <div class="trend-keyword">${trend.keyword}</div>
        <div class="trend-count">${trend.count} mentions</div>
        <div class="trend-trend ${trend.direction}">
          ${trend.direction === 'up' ? '📈' : '📉'} ${trend.change}%
        </div>
      </div>
    `).join('');
  }

  renderSources() {
    const sourcesList = document.getElementById('sources-list');
    
    if (this.sources.size === 0) {
      sourcesList.innerHTML = '<div class="no-sources">No sources available</div>';
      return;
    }
    
    sourcesList.innerHTML = Array.from(this.sources.entries()).map(([source, data]) => `
      <div class="source-item">
        <div class="source-name">${this.getSourceIcon(source)} ${source}</div>
        <div class="source-stats">
          <span class="source-articles">${data.articles} articles</span>
          <span class="source-reliability ${this.getReliabilityClass(data.reliability)}">
            ${data.reliability}% reliable
          </span>
        </div>
      </div>
    `).join('');
  }

  updateStats() {
    const totalArticles = this.articles.length;
    const breakingNews = this.articles.filter(a => a.isBreaking).length;
    const highConfidence = this.articles.filter(a => (a.confidence || 0) >= 80).length;
    const activeSources = this.sources.size;
    
    document.getElementById('total-articles').textContent = totalArticles;
    document.getElementById('breaking-news').textContent = breakingNews;
    document.getElementById('high-confidence').textContent = highConfidence;
    document.getElementById('sources-active').textContent = activeSources;
  }

  setupEventListeners() {
    document.getElementById('refresh-news').addEventListener('click', () => this.loadNews());
    document.getElementById('source-filter').addEventListener('change', () => this.renderNewsFeed());
    document.getElementById('time-filter').addEventListener('change', () => this.renderNewsFeed());
  }

  startAutoRefresh() {
    setInterval(() => {
      this.loadNews();
    }, this.config.refreshInterval);
  }

  // Utility methods
  getSourceIcon(source) {
    const icons = {
      reuters: '🌐',
      bbc: '🇬🇧',
      cnn: '🇺🇸',
      guardian: '📰',
      default: '📄'
    };
    return icons[source] || icons.default;
  }

  getConfidenceClass(confidence) {
    if (confidence >= 80) return 'high';
    if (confidence >= 60) return 'medium';
    return 'low';
  }

  getSeverityClass(severity) {
    if (severity >= 8) return 'critical';
    if (severity >= 6) return 'high';
    if (severity >= 4) return 'medium';
    return 'low';
  }

  getReliabilityClass(reliability) {
    if (reliability >= 90) return 'excellent';
    if (reliability >= 70) return 'good';
    if (reliability >= 50) return 'fair';
    return 'poor';
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  }

  updateLoadingState(loading) {
    const feed = document.getElementById('news-feed');
    if (loading) {
      feed.classList.add('loading');
    } else {
      feed.classList.remove('loading');
    }
  }

  showError(message) {
    const feed = document.getElementById('news-feed');
    feed.innerHTML = `<div class="error-state">${message}</div>`;
  }

  // Action methods
  openArticle(url) {
    window.open(url, '_blank');
  }

  async analyzeArticle(articleId) {
    const article = this.articles.find(a => a.id === articleId);
    if (!article) return;
    
    try {
      const response = await fetch('/api/analyze-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, text: article.content })
      });
      
      const analysis = await response.json();
      this.showAnalysisModal(analysis);
    } catch (error) {
      console.error('Error analyzing article:', error);
    }
  }

  shareArticle(articleId) {
    const article = this.articles.find(a => a.id === articleId);
    if (!article) return;
    
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.description,
        url: article.url
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(`${article.title}\n${article.url}`);
    }
  }

  showAnalysisModal(analysis) {
    // Create and show analysis modal
    const modal = document.createElement('div');
    modal.className = 'analysis-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>AI Analysis Results</h3>
        <div class="analysis-results">
          <div class="analysis-item">
            <strong>Confidence:</strong> ${analysis.confidence}%
          </div>
          <div class="analysis-item">
            <strong>Severity:</strong> ${analysis.severity}/10
          </div>
          <div class="analysis-item">
            <strong>Key Facts:</strong>
            <ul>${analysis.keyFacts.map(fact => `<li>${fact}</li>`).join('')}</ul>
          </div>
        </div>
        <button onclick="this.close()">Close</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }
}

// CSS Styles
const newsDashboardStyles = `
  .news-dashboard {
    background: var(--glass);
    border-radius: 12px;
    padding: 1.5rem;
    backdrop-filter: blur(10px);
  }

  .news-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .news-controls {
    display: flex;
    gap: 1rem;
  }

  .news-controls select,
  .news-controls button {
    padding: 0.5rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
  }

  .news-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem;
    text-align: center;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
  }

  .stat-label {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: uppercase;
  }

  .news-content {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1.5rem;
  }

  .news-article {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
    transition: all 0.2s;
  }

  .news-article:hover {
    border-color: var(--accent);
    transform: translateY(-1px);
  }

  .news-article.breaking {
    border-color: var(--danger);
    background: rgba(239, 68, 68, 0.05);
  }

  .article-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .article-source {
    font-weight: 600;
    color: var(--accent);
  }

  .article-time {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .article-title {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    line-height: 1.4;
  }

  .article-description {
    font-size: 0.875rem;
    color: var(--text-muted);
    line-height: 1.4;
    margin-bottom: 0.75rem;
  }

  .article-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .article-tags {
    display: flex;
    gap: 0.25rem;
  }

  .tag {
    padding: 0.25rem 0.5rem;
    background: var(--accent);
    color: white;
    border-radius: 4px;
    font-size: 0.75rem;
  }

  .article-metrics {
    display: flex;
    gap: 0.5rem;
    font-size: 0.75rem;
  }

  .confidence.high { color: var(--success); }
  .confidence.medium { color: var(--warning); }
  .confidence.low { color: var(--danger); }

  .severity.critical { color: var(--danger); }
  .severity.high { color: var(--warning); }
  .severity.medium { color: var(--accent); }
  .severity.low { color: var(--text-muted); }

  .breaking-badge {
    background: var(--danger);
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .article-actions {
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

  .trend-item,
  .source-item {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .trend-keyword {
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .trend-count {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .trend-trend.up {
    color: var(--success);
  }

  .trend-trend.down {
    color: var(--danger);
  }

  .source-name {
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .source-stats {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .reliability.excellent { color: var(--success); }
  .reliability.good { color: var(--accent); }
  .reliability.fair { color: var(--warning); }
  .reliability.poor { color: var(--danger); }

  .loading-state,
  .no-articles,
  .no-trends,
  .no-sources {
    text-align: center;
    color: var(--text-muted);
    padding: 2rem;
  }

  .error-state {
    text-align: center;
    color: var(--danger);
    padding: 2rem;
  }

  .analysis-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1.5rem;
    max-width: 500px;
    width: 90%;
  }

  .analysis-results {
    margin: 1rem 0;
  }

  .analysis-item {
    margin-bottom: 0.5rem;
  }

  .analysis-item ul {
    margin: 0.25rem 0 0 1rem;
  }

  @media (max-width: 768px) {
    .news-content {
      grid-template-columns: 1fr;
    }
    
    .news-stats {
      grid-template-columns: repeat(2, 1fr);
    }
    
    .news-controls {
      flex-direction: column;
      gap: 0.5rem;
    }
  }
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = newsDashboardStyles;
document.head.appendChild(styleSheet);

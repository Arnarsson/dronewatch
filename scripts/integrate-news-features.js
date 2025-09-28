/**
 * News Features Integration Script
 * Easy integration of all news features into DroneWatch
 */

import { NewsIntegrationService } from '../services/news-integration.js';

// Initialize News Features
export function initializeNewsFeatures(config = {}) {
  console.log('🚀 Initializing DroneWatch News Features...');
  
  const defaultConfig = {
    enableDashboard: true,
    enableAlerts: true,
    enableAnalytics: true,
    enableTrends: true,
    ...config
  };
  
  // Create news integration service
  const newsService = new NewsIntegrationService(defaultConfig);
  
  // Add news features to the main application
  addNewsFeaturesToApp(newsService);
  
  return newsService;
}

function addNewsFeaturesToApp(newsService) {
  // Add news dashboard to the main interface
  addNewsDashboard();
  
  // Add news alerts to the header
  addNewsAlerts();
  
  // Add news analytics to the sidebar
  addNewsAnalytics();
  
  // Add news trends to the main content
  addNewsTrends();
  
  // Setup keyboard shortcuts
  setupNewsKeyboardShortcuts();
  
  console.log('✅ News features integrated successfully');
}

function addNewsDashboard() {
  // Create news dashboard container
  const dashboardContainer = document.createElement('div');
  dashboardContainer.id = 'news-dashboard';
  dashboardContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    z-index: 10000;
    display: none;
    overflow-y: auto;
  `;
  
  document.body.appendChild(dashboardContainer);
  
  // Add toggle button to header
  const header = document.querySelector('.header') || document.querySelector('header');
  if (header) {
    const newsButton = document.createElement('button');
    newsButton.innerHTML = '📰 News';
    newsButton.className = 'news-toggle-btn';
    newsButton.style.cssText = `
      padding: 0.5rem 1rem;
      background: var(--accent);
      border: none;
      border-radius: 6px;
      color: white;
      cursor: pointer;
      margin-left: 1rem;
    `;
    
    newsButton.addEventListener('click', () => {
      const isVisible = dashboardContainer.style.display !== 'none';
      dashboardContainer.style.display = isVisible ? 'none' : 'block';
    });
    
    header.appendChild(newsButton);
  }
  
  // Add close button to dashboard
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '✕';
  closeButton.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10001;
    background: var(--danger);
    border: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    color: white;
    cursor: pointer;
    font-size: 1.25rem;
  `;
  
  closeButton.addEventListener('click', () => {
    dashboardContainer.style.display = 'none';
  });
  
  dashboardContainer.appendChild(closeButton);
}

function addNewsAlerts() {
  // Create alerts container
  const alertsContainer = document.createElement('div');
  alertsContainer.id = 'news-alerts-container';
  alertsContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    max-width: 400px;
    pointer-events: none;
  `;
  
  document.body.appendChild(alertsContainer);
}

function addNewsAnalytics() {
  // Create analytics container
  const analyticsContainer = document.createElement('div');
  analyticsContainer.id = 'news-analytics';
  analyticsContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    z-index: 10000;
    display: none;
    overflow-y: auto;
  `;
  
  document.body.appendChild(analyticsContainer);
  
  // Add analytics toggle button
  const header = document.querySelector('.header') || document.querySelector('header');
  if (header) {
    const analyticsButton = document.createElement('button');
    analyticsButton.innerHTML = '📊 Analytics';
    analyticsButton.className = 'analytics-toggle-btn';
    analyticsButton.style.cssText = `
      padding: 0.5rem 1rem;
      background: var(--accent);
      border: none;
      border-radius: 6px;
      color: white;
      cursor: pointer;
      margin-left: 1rem;
    `;
    
    analyticsButton.addEventListener('click', () => {
      const isVisible = analyticsContainer.style.display !== 'none';
      analyticsContainer.style.display = isVisible ? 'none' : 'block';
    });
    
    header.appendChild(analyticsButton);
  }
  
  // Add close button to analytics
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '✕';
  closeButton.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10001;
    background: var(--danger);
    border: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    color: white;
    cursor: pointer;
    font-size: 1.25rem;
  `;
  
  closeButton.addEventListener('click', () => {
    analyticsContainer.style.display = 'none';
  });
  
  analyticsContainer.appendChild(closeButton);
}

function addNewsTrends() {
  // Create trends container
  const trendsContainer = document.createElement('div');
  trendsContainer.id = 'news-trends';
  trendsContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    z-index: 10000;
    display: none;
    overflow-y: auto;
  `;
  
  document.body.appendChild(trendsContainer);
  
  // Add trends toggle button
  const header = document.querySelector('.header') || document.querySelector('header');
  if (header) {
    const trendsButton = document.createElement('button');
    trendsButton.innerHTML = '📈 Trends';
    trendsButton.className = 'trends-toggle-btn';
    trendsButton.style.cssText = `
      padding: 0.5rem 1rem;
      background: var(--accent);
      border: none;
      border-radius: 6px;
      color: white;
      cursor: pointer;
      margin-left: 1rem;
    `;
    
    trendsButton.addEventListener('click', () => {
      const isVisible = trendsContainer.style.display !== 'none';
      trendsContainer.style.display = isVisible ? 'none' : 'block';
    });
    
    header.appendChild(trendsButton);
  }
  
  // Add close button to trends
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '✕';
  closeButton.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10001;
    background: var(--danger);
    border: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    color: white;
    cursor: pointer;
    font-size: 1.25rem;
  `;
  
  closeButton.addEventListener('click', () => {
    trendsContainer.style.display = 'none';
  });
  
  trendsContainer.appendChild(closeButton);
}

function setupNewsKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'n':
          e.preventDefault();
          toggleNewsDashboard();
          break;
        case 'a':
          e.preventDefault();
          toggleNewsAnalytics();
          break;
        case 't':
          e.preventDefault();
          toggleNewsTrends();
          break;
        case 'r':
          e.preventDefault();
          refreshNewsFeatures();
          break;
      }
    }
  });
}

function toggleNewsDashboard() {
  const dashboard = document.getElementById('news-dashboard');
  if (dashboard) {
    const isVisible = dashboard.style.display !== 'none';
    dashboard.style.display = isVisible ? 'none' : 'block';
  }
}

function toggleNewsAnalytics() {
  const analytics = document.getElementById('news-analytics');
  if (analytics) {
    const isVisible = analytics.style.display !== 'none';
    analytics.style.display = isVisible ? 'none' : 'block';
  }
}

function toggleNewsTrends() {
  const trends = document.getElementById('news-trends');
  if (trends) {
    const isVisible = trends.style.display !== 'none';
    trends.style.display = isVisible ? 'none' : 'block';
  }
}

function refreshNewsFeatures() {
  // Refresh all news components
  const newsService = window.newsService;
  if (newsService) {
    newsService.refreshAll();
  }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize news features
  const newsService = initializeNewsFeatures({
    enableDashboard: true,
    enableAlerts: true,
    enableAnalytics: true,
    enableTrends: true
  });
  
  // Make news service globally available
  window.newsService = newsService;
  
  console.log('🎉 DroneWatch News Features ready!');
  console.log('📝 Keyboard shortcuts:');
  console.log('   Ctrl/Cmd + N: Toggle News Dashboard');
  console.log('   Ctrl/Cmd + A: Toggle Analytics');
  console.log('   Ctrl/Cmd + T: Toggle Trends');
  console.log('   Ctrl/Cmd + R: Refresh All');
});

// Export for manual initialization
export { initializeNewsFeatures };

# performance-monitor Agent

## Purpose
Ensure optimal application performance across all devices and network conditions, with focus on mobile experience and map rendering.

## Activation Triggers
- **Automatic**: Performance degradation detected, large dataset operations
- **Manual**: `--agent performance-monitor`
- **Keywords**: "performance", "slow", "lag", "optimize", "mobile", "clustering"
- **Parallel**: Works with realtime-coordinator and automation-reliability

## Core Responsibilities

### 1. Performance Metrics Tracking
```javascript
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      // Page Load Metrics
      pageLoad: {
        target: 3000, // 3 seconds on 3G
        current: 0,
        measurements: []
      },

      // Map Performance
      mapInteraction: {
        targetFPS: 60,
        currentFPS: 0,
        renderTime: 0,
        clusteringTime: 0
      },

      // Data Processing
      dataProcessing: {
        filterTime: 0,
        incidentRenderTime: 0,
        websocketLatency: 0
      },

      // Resource Usage
      resources: {
        memoryUsage: 0,
        domNodes: 0,
        eventListeners: 0,
        networkRequests: 0
      },

      // Mobile Specific
      mobile: {
        touchResponseTime: 0,
        scrollPerformance: 0,
        batteryImpact: 0
      }
    };

    this.thresholds = {
      critical: { memory: 500, domNodes: 5000, renderTime: 100 },
      warning: { memory: 300, domNodes: 3000, renderTime: 50 }
    };
  }

  startMonitoring() {
    // Performance Observer API
    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.processEntry(entry);
      }
    });

    this.observer.observe({
      entryTypes: ['navigation', 'resource', 'paint', 'measure', 'largest-contentful-paint']
    });

    // Frame rate monitoring
    this.monitorFrameRate();

    // Memory monitoring
    this.monitorMemory();

    // DOM monitoring
    this.monitorDOM();
  }

  monitorFrameRate() {
    let lastTime = performance.now();
    let frames = 0;

    const checkFPS = () => {
      frames++;
      const currentTime = performance.now();

      if (currentTime >= lastTime + 1000) {
        this.metrics.mapInteraction.currentFPS = Math.round(frames * 1000 / (currentTime - lastTime));
        frames = 0;
        lastTime = currentTime;

        if (this.metrics.mapInteraction.currentFPS < 30) {
          this.handleLowFPS();
        }
      }

      requestAnimationFrame(checkFPS);
    };

    requestAnimationFrame(checkFPS);
  }
}
```

### 2. Map Optimization System
```javascript
class MapPerformanceOptimizer {
  constructor(map) {
    this.map = map;
    this.clusterGroup = null;
    this.visibleMarkers = new Set();
    this.renderQueue = [];
  }

  optimizeMarkerClustering(incidents) {
    const count = incidents.length;

    // Dynamic cluster radius based on incident count
    const clusterRadius = this.calculateOptimalRadius(count);

    // Progressive clustering for large datasets
    if (count > 500) {
      return this.progressiveClustering(incidents);
    }

    // Standard clustering
    return this.standardClustering(incidents, clusterRadius);
  }

  calculateOptimalRadius(incidentCount) {
    // Mobile gets more aggressive clustering
    const isMobile = window.innerWidth < 768;
    const baseRadius = isMobile ? 100 : 80;

    // Scale with incident count
    if (incidentCount < 100) return baseRadius * 0.8;
    if (incidentCount < 500) return baseRadius;
    if (incidentCount < 1000) return baseRadius * 1.2;
    return baseRadius * 1.5;
  }

  progressiveClustering(incidents) {
    // Only render visible incidents initially
    const bounds = this.map.getBounds();
    const visible = incidents.filter(i =>
      bounds.contains([i.asset.lat, i.asset.lon])
    );

    // Queue rest for lazy loading
    const hidden = incidents.filter(i =>
      !bounds.contains([i.asset.lat, i.asset.lon])
    );

    this.renderQueue = this.chunkArray(hidden, 50);

    // Render visible immediately
    this.renderMarkers(visible);

    // Lazy load hidden in chunks
    this.lazyLoadMarkers();

    return visible.length;
  }

  lazyLoadMarkers() {
    if (this.renderQueue.length === 0) return;

    // Use requestIdleCallback for non-blocking rendering
    requestIdleCallback(() => {
      const chunk = this.renderQueue.shift();
      this.renderMarkers(chunk, false); // Don't fit bounds
      this.lazyLoadMarkers();
    }, { timeout: 1000 });
  }

  // Virtual scrolling for incident list
  implementVirtualScrolling(container, incidents) {
    const itemHeight = 120; // Height of incident card
    const viewportHeight = container.clientHeight;
    const totalHeight = incidents.length * itemHeight;

    // Create virtual spacer
    const spacer = document.createElement('div');
    spacer.style.height = `${totalHeight}px`;
    container.appendChild(spacer);

    // Only render visible items
    const renderViewport = () => {
      const scrollTop = container.scrollTop;
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.ceil((scrollTop + viewportHeight) / itemHeight);

      // Clear and render visible range
      this.renderIncidentRange(incidents, startIndex, endIndex);
    };

    // Debounced scroll handler
    container.addEventListener('scroll', debounce(renderViewport, 16));

    // Initial render
    renderViewport();
  }
}
```

### 3. Mobile Performance Optimization
```javascript
class MobileOptimizer {
  constructor() {
    this.isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
    this.isSlowNetwork = navigator.connection?.effectiveType === '2g' ||
                        navigator.connection?.effectiveType === '3g';
  }

  applyOptimizations() {
    if (!this.isMobile) return;

    // Reduce animation complexity
    this.simplifyAnimations();

    // Optimize images and assets
    this.optimizeAssets();

    // Adjust interaction delays
    this.optimizeTouchHandlers();

    // Battery saving mode
    if (navigator.getBattery) {
      navigator.getBattery().then(battery => {
        if (battery.level < 0.2) {
          this.enableBatterySaving();
        }
      });
    }
  }

  simplifyAnimations() {
    // Disable complex animations
    document.documentElement.style.setProperty('--transition-duration', '0.2s');

    // Remove backdrop filters on low-end devices
    if (this.isLowEndDevice()) {
      document.querySelectorAll('.glass-panel').forEach(el => {
        el.style.backdropFilter = 'none';
        el.style.background = 'rgba(19, 22, 31, 0.95)';
      });
    }
  }

  optimizeTouchHandlers() {
    // Add passive listeners for better scrolling
    document.addEventListener('touchstart', handler, { passive: true });
    document.addEventListener('touchmove', handler, { passive: true });

    // Implement touch-action CSS
    const style = document.createElement('style');
    style.textContent = `
      .scrollable { touch-action: pan-y; }
      .map-container { touch-action: pan-x pan-y; }
      .button { touch-action: manipulation; }
    `;
    document.head.appendChild(style);
  }

  enableBatterySaving() {
    // Reduce update frequency
    WebSocketHandler.updateInterval = 60000; // 1 minute instead of 5 seconds

    // Disable non-essential animations
    document.documentElement.classList.add('battery-saving');

    // Reduce GPS accuracy
    if (navigator.geolocation) {
      this.geoOptions.enableHighAccuracy = false;
    }
  }
}
```

### 4. Resource Management
```javascript
class ResourceManager {
  constructor() {
    this.limits = {
      maxDOMNodes: 3000,
      maxEventListeners: 500,
      maxMemoryMB: 200,
      maxNetworkRequests: 20
    };

    this.cleanup = {
      intervals: new Set(),
      timeouts: new Set(),
      observers: new Set(),
      eventListeners: new Map()
    };
  }

  monitorResources() {
    setInterval(() => {
      const usage = this.getCurrentUsage();

      if (usage.memory > this.limits.maxMemoryMB) {
        this.performGarbageCollection();
      }

      if (usage.domNodes > this.limits.maxDOMNodes) {
        this.reduceDOMComplexity();
      }

      if (usage.listeners > this.limits.maxEventListeners) {
        this.cleanupEventListeners();
      }
    }, 10000);
  }

  performGarbageCollection() {
    // Clear caches
    if (window.caches) {
      this.clearOldCaches();
    }

    // Clear old incident data
    this.pruneOldIncidents();

    // Clear WebSocket message queue
    this.clearMessageQueue();

    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
  }

  reduceDOMComplexity() {
    // Remove off-screen incident cards
    const cards = document.querySelectorAll('.incident-card');
    const viewport = this.getViewport();

    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      if (!this.isInViewport(rect, viewport)) {
        card.remove();
      }
    });

    // Simplify map layers
    this.simplifyMapLayers();
  }

  pruneOldIncidents() {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days

    state.incidents = state.incidents.filter(incident => {
      const incidentTime = new Date(incident.first_seen_utc).getTime();
      return incidentTime > cutoff;
    });
  }
}
```

### 5. Performance Budgets
```javascript
const PERFORMANCE_BUDGETS = {
  mobile: {
    pageLoad: 3000,        // 3 seconds
    interaction: 100,      // 100ms response
    fps: 30,              // 30 FPS minimum
    memory: 150,          // 150MB max
    bundleSize: 500       // 500KB max
  },
  desktop: {
    pageLoad: 2000,        // 2 seconds
    interaction: 50,       // 50ms response
    fps: 60,              // 60 FPS target
    memory: 500,          // 500MB max
    bundleSize: 1000      // 1MB max
  },

  // Network-specific budgets
  network: {
    '4g': { pageLoad: 2000, dataUsage: 5000 },
    '3g': { pageLoad: 4000, dataUsage: 2000 },
    '2g': { pageLoad: 8000, dataUsage: 500 }
  }
};
```

## Optimization Strategies

### Code Splitting (for future modularization)
```javascript
// Lazy load heavy components
const loadHeavyComponent = async () => {
  const module = await import('./heavy-component.js');
  return module.default;
};

// Only load when needed
if (userNeedsFeature) {
  const Component = await loadHeavyComponent();
  Component.init();
}
```

### Image Optimization
```javascript
class ImageOptimizer {
  optimizeMapIcons() {
    // Use CSS sprites for markers
    const spriteSheet = this.generateSpriteSheet();

    // Lazy load infrastructure icons
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadIcon(entry.target);
        }
      });
    });

    // Use WebP where supported
    if (this.supportsWebP()) {
      this.useWebPImages();
    }
  }
}
```

## Monitoring Dashboard

### Real-time Metrics Display
```javascript
class PerformanceDashboard {
  render() {
    return `
      <div class="perf-dashboard">
        <div class="metric">
          <span class="label">FPS</span>
          <span class="value ${this.getFPSClass()}">${this.metrics.fps}</span>
        </div>
        <div class="metric">
          <span class="label">Memory</span>
          <span class="value ${this.getMemoryClass()}">${this.metrics.memory}MB</span>
        </div>
        <div class="metric">
          <span class="label">Load Time</span>
          <span class="value ${this.getLoadClass()}">${this.metrics.loadTime}ms</span>
        </div>
        <div class="metric">
          <span class="label">Incidents</span>
          <span class="value">${this.metrics.incidentCount}</span>
        </div>
      </div>
    `;
  }
}
```

## Testing Requirements

### Performance Tests
```javascript
describe('Performance', () => {
  test('page loads under 3 seconds on 3G', async () => {
    await throttleNetwork('3g');
    const loadTime = await measurePageLoad();
    expect(loadTime).toBeLessThan(3000);
  });

  test('handles 1000 incidents without lag', async () => {
    const incidents = generateIncidents(1000);
    const renderTime = await measureRenderTime(incidents);
    expect(renderTime).toBeLessThan(1000);
  });

  test('maintains 30 FPS on mobile', async () => {
    await emulateDevice('iPhone 12');
    const fps = await measureFPS();
    expect(fps).toBeGreaterThan(30);
  });
});
```

## Alert Thresholds

### Performance Alerts
- Page load > 5 seconds: Critical
- FPS < 20: Critical
- Memory > 80% limit: Warning
- Render time > 200ms: Warning
- Network errors > 10/min: Critical

## Parallel Coordination

Works in parallel with:
- **realtime-coordinator**: Optimizes WebSocket message handling
- **incident-validator**: Ensures efficient data validation
- **automation-reliability**: Monitors service performance
- **geo-intelligence-analyst**: Optimizes geospatial calculations
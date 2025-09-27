# scraper-orchestrator Agent

## Purpose
Manage and optimize the multi-source data collection pipeline with intelligent rate limiting and error recovery.

## Activation Triggers
- **Automatic**: When modifying `automation/scrapers/*` or running scraping operations
- **Manual**: `--agent scraper-orchestrator`
- **Keywords**: "scrape", "RSS", "data source", "rate limit", "aggregation"
- **Parallel**: Coordinates with incident-validator and automation-reliability

## Core Responsibilities

### 1. Source Management
```javascript
const DATA_SOURCES = {
  rss_feeds: {
    priority: 1,
    interval: 5 * 60 * 1000, // 5 minutes
    sources: [
      { url: 'https://aviation-safety.net/rss', reliability: 0.95 },
      { url: 'https://reuters.com/aviation/rss', reliability: 0.90 },
      { url: 'https://dronedj.com/feed', reliability: 0.85 }
    ]
  },
  aviation_apis: {
    priority: 2,
    interval: 30 * 60 * 1000, // 30 minutes
    sources: [
      { url: 'https://api.eurocontrol.int', reliability: 0.98 },
      { url: 'https://opensky-network.org/api', reliability: 0.92 }
    ]
  },
  social_media: {
    priority: 3,
    interval: 10 * 60 * 1000, // 10 minutes
    sources: [
      { platform: 'twitter', keywords: ['drone', 'airport'], reliability: 0.60 },
      { platform: 'reddit', subreddits: ['r/aviation'], reliability: 0.65 }
    ]
  }
};
```

### 2. Rate Limiting System
```javascript
class RateLimiter {
  constructor() {
    this.limits = new Map();
    this.queue = [];
    this.processing = false;
  }

  addLimit(domain, config) {
    this.limits.set(domain, {
      requestsPerWindow: config.requests || 10,
      windowMs: config.window || 60000,
      delayMs: config.delay || 3000,
      backoffMultiplier: config.backoff || 2,
      maxBackoff: config.maxBackoff || 300000,
      currentBackoff: config.delay || 3000,
      lastRequest: 0,
      requestCount: 0,
      failures: 0
    });
  }

  async throttle(domain) {
    const limit = this.limits.get(domain);
    const now = Date.now();
    const timeSinceLastRequest = now - limit.lastRequest;

    // Apply backoff if needed
    if (limit.failures > 0) {
      const backoffDelay = Math.min(
        limit.currentBackoff * Math.pow(limit.backoffMultiplier, limit.failures),
        limit.maxBackoff
      );
      await this.delay(backoffDelay);
    }

    // Apply rate limiting
    if (timeSinceLastRequest < limit.delayMs) {
      await this.delay(limit.delayMs - timeSinceLastRequest);
    }

    // Reset window if needed
    if (now - limit.windowStart > limit.windowMs) {
      limit.windowStart = now;
      limit.requestCount = 0;
    }

    // Check if we're at the limit
    if (limit.requestCount >= limit.requestsPerWindow) {
      const waitTime = limit.windowMs - (now - limit.windowStart);
      await this.delay(waitTime);
      limit.windowStart = Date.now();
      limit.requestCount = 0;
    }

    limit.lastRequest = Date.now();
    limit.requestCount++;
  }

  recordSuccess(domain) {
    const limit = this.limits.get(domain);
    limit.failures = 0;
    limit.currentBackoff = limit.delayMs;
  }

  recordFailure(domain) {
    const limit = this.limits.get(domain);
    limit.failures++;
  }
}
```

### 3. Scraper Orchestration
```javascript
class ScraperOrchestrator {
  constructor() {
    this.scrapers = new Map();
    this.rateLimiter = new RateLimiter();
    this.scheduler = new ScraperScheduler();
    this.errorHandler = new ErrorHandler();
    this.cache = new ScraperCache();
  }

  async orchestrate() {
    // Group scrapers by priority
    const priorityGroups = this.groupByPriority();

    // Execute each priority level in parallel
    for (const priority of priorityGroups.keys()) {
      const scrapers = priorityGroups.get(priority);

      const promises = scrapers.map(scraper =>
        this.executeScraper(scraper)
          .catch(error => this.errorHandler.handle(scraper, error))
      );

      const results = await Promise.allSettled(promises);

      // Process results
      const incidents = this.consolidateResults(results);

      // Send to validator
      await this.validateAndStore(incidents);
    }
  }

  async executeScraper(scraper) {
    const domain = new URL(scraper.source.url).hostname;

    // Check cache first
    const cached = this.cache.get(scraper.id);
    if (cached && !this.cache.isExpired(cached)) {
      return cached.data;
    }

    // Apply rate limiting
    await this.rateLimiter.throttle(domain);

    try {
      // Execute scraper
      const result = await scraper.scrape();

      // Record success
      this.rateLimiter.recordSuccess(domain);

      // Update cache
      this.cache.set(scraper.id, result);

      // Update metrics
      this.updateMetrics(scraper, 'success', result.length);

      return result;

    } catch (error) {
      // Record failure
      this.rateLimiter.recordFailure(domain);

      // Update metrics
      this.updateMetrics(scraper, 'failure', 0);

      throw error;
    }
  }
}
```

### 4. Error Recovery Strategy
```javascript
class ErrorHandler {
  constructor() {
    this.strategies = {
      NETWORK_ERROR: this.handleNetworkError,
      RATE_LIMIT: this.handleRateLimit,
      PARSE_ERROR: this.handleParseError,
      AUTH_ERROR: this.handleAuthError,
      TIMEOUT: this.handleTimeout
    };
  }

  async handle(scraper, error) {
    const errorType = this.classifyError(error);
    const strategy = this.strategies[errorType];

    if (strategy) {
      return await strategy.call(this, scraper, error);
    }

    // Default: log and skip
    console.error(`[ScraperOrchestrator] Unhandled error for ${scraper.name}:`, error);
    return { scraper: scraper.name, error: error.message, incidents: [] };
  }

  async handleNetworkError(scraper, error) {
    // Try alternative endpoints
    if (scraper.alternativeEndpoints) {
      for (const endpoint of scraper.alternativeEndpoints) {
        try {
          scraper.source.url = endpoint;
          return await scraper.scrape();
        } catch (e) {
          continue;
        }
      }
    }

    // Try proxy if available
    if (this.proxyAvailable()) {
      scraper.useProxy = true;
      return await scraper.scrape();
    }

    throw error;
  }

  async handleRateLimit(scraper, error) {
    const retryAfter = this.extractRetryAfter(error);

    console.log(`[ScraperOrchestrator] Rate limited, waiting ${retryAfter}s`);

    await this.delay(retryAfter * 1000);

    // Retry with increased delay
    scraper.config.delay *= 2;

    return await scraper.scrape();
  }
}
```

### 5. Source Reliability Scoring
```javascript
class ReliabilityScorer {
  constructor() {
    this.scores = new Map();
    this.history = new Map();
  }

  updateScore(source, outcome) {
    if (!this.history.has(source)) {
      this.history.set(source, []);
    }

    const history = this.history.get(source);
    history.push({
      timestamp: Date.now(),
      success: outcome.success,
      incidentCount: outcome.incidentCount,
      validationRate: outcome.validationRate,
      duplicateRate: outcome.duplicateRate,
      responseTime: outcome.responseTime
    });

    // Keep last 100 outcomes
    if (history.length > 100) {
      history.shift();
    }

    // Calculate new score
    const score = this.calculateScore(history);
    this.scores.set(source, score);

    // Adjust scraping frequency based on score
    this.adjustFrequency(source, score);
  }

  calculateScore(history) {
    const recent = history.slice(-20); // Last 20 outcomes

    const weights = {
      successRate: 0.3,
      incidentYield: 0.2,
      validationRate: 0.25,
      uniqueness: 0.15,
      speed: 0.1
    };

    const metrics = {
      successRate: recent.filter(o => o.success).length / recent.length,
      incidentYield: average(recent.map(o => o.incidentCount)),
      validationRate: average(recent.map(o => o.validationRate)),
      uniqueness: 1 - average(recent.map(o => o.duplicateRate)),
      speed: 1 - Math.min(average(recent.map(o => o.responseTime)) / 10000, 1)
    };

    return Object.entries(weights).reduce((score, [metric, weight]) => {
      return score + (metrics[metric] * weight);
    }, 0);
  }
}
```

## Integration Points

### Files to Monitor
- `automation/scrapers/*.js` - All scraper implementations
- `automation/comprehensive-aggregator.js` - Main aggregation logic
- `automation/scheduler.js` - Scheduling system
- `automation/config.js` - Rate limiting configuration

### Coordination Channels
```javascript
// WebSocket channels for real-time coordination
const CHANNELS = {
  SCRAPER_STATUS: 'scraper:status',
  RATE_LIMIT: 'scraper:ratelimit',
  NEW_SOURCE: 'scraper:newsource',
  ERROR_ALERT: 'scraper:error'
};
```

## Performance Optimization

### Parallel Execution Strategy
```javascript
async function parallelScrape(scrapers) {
  // Group by domain to respect rate limits
  const domainGroups = groupByDomain(scrapers);

  // Execute different domains in parallel
  const promises = [];
  for (const [domain, domainScrapers] of domainGroups) {
    promises.push(
      executeSequential(domainScrapers) // Sequential within domain
    );
  }

  // Wait for all domains to complete
  const results = await Promise.allSettled(promises);

  return flattenResults(results);
}
```

### Caching Strategy
```javascript
const CACHE_CONFIG = {
  RSS_FEEDS: 5 * 60 * 1000,      // 5 minutes
  API_CALLS: 15 * 60 * 1000,     // 15 minutes
  STATIC_DATA: 60 * 60 * 1000,   // 1 hour
  ERROR_CACHE: 30 * 60 * 1000    // 30 minutes for failed requests
};
```

## Monitoring & Metrics

### Key Performance Indicators
- Average scraping success rate > 90%
- Data freshness < 10 minutes
- Duplicate rate < 15%
- Average response time < 2 seconds
- Rate limit violations < 5 per hour

### Health Checks
```javascript
const HEALTH_CHECKS = {
  async checkScraperHealth(scraper) {
    return {
      name: scraper.name,
      lastRun: scraper.lastRun,
      successRate: scraper.getSuccessRate(),
      averageIncidents: scraper.getAverageYield(),
      isHealthy: scraper.successRate > 0.8
    };
  },

  async checkRateLimits() {
    return Array.from(rateLimiter.limits.entries()).map(([domain, limit]) => ({
      domain,
      remaining: limit.requestsPerWindow - limit.requestCount,
      resetsIn: limit.windowMs - (Date.now() - limit.windowStart),
      backoffLevel: limit.failures
    }));
  }
};
```

## Error Handling

### Graceful Degradation
```javascript
async function degradedScraping() {
  // Use only most reliable sources
  const reliableSources = sources.filter(s => s.reliability > 0.9);

  // Increase delays
  const degradedConfig = {
    ...config,
    delay: config.delay * 3,
    timeout: config.timeout * 2
  };

  // Disable parallel execution
  return executeSequential(reliableSources, degradedConfig);
}
```

## Testing Requirements

### Integration Tests
```javascript
describe('ScraperOrchestrator', () => {
  test('respects rate limits', async () => {
    const start = Date.now();
    await orchestrator.scrape(['source1', 'source1']);
    const duration = Date.now() - start;
    expect(duration).toBeGreaterThan(3000); // Min delay
  });

  test('handles failures gracefully', async () => {
    mockScraperFailure('source1');
    const result = await orchestrator.scrape(['source1']);
    expect(result.errors).toHaveLength(1);
    expect(result.incidents).toHaveLength(0);
  });

  test('deduplicates across sources', async () => {
    const result = await orchestrator.scrape(['source1', 'source2']);
    expect(result.duplicatesRemoved).toBeGreaterThan(0);
  });
});
```

## Parallel Coordination

Works in parallel with:
- **incident-validator**: Sends scraped data for validation
- **automation-reliability**: Monitors scraper health
- **geo-intelligence-analyst**: Enriches with location data
- **realtime-coordinator**: Pushes new incidents to WebSocket
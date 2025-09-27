#!/usr/bin/env node

/**
 * DroneWatch System Test
 * Comprehensive test of all integrated services
 */

import { AIAnalyzer } from './automation/ai-analyzer.js';
import { GeocodingService } from './automation/geocoding-service.js';
import { RSSNewsScraper } from './automation/scrapers/rss-news-scraper.js';
import { TwitterScraper } from './automation/scrapers/twitter-scraper.js';
import { AlertService } from './automation/alert-service.js';
import { WebSocketService } from './automation/websocket-service.js';
import fetch from 'node-fetch';

console.log(`
╔══════════════════════════════════════════════════════╗
║       🚁 DroneWatch System Test                      ║
║       Testing all integrated services                ║
╚══════════════════════════════════════════════════════╝
`);

const tests = {
  passed: 0,
  failed: 0,
  skipped: 0
};

// Test results collector
const results = [];

async function testService(name, testFn) {
  console.log(`\n📋 Testing ${name}...`);
  try {
    await testFn();
    tests.passed++;
    results.push({ name, status: 'PASSED', error: null });
    console.log(`  ✅ ${name} - PASSED`);
  } catch (error) {
    tests.failed++;
    results.push({ name, status: 'FAILED', error: error.message });
    console.log(`  ❌ ${name} - FAILED: ${error.message}`);
  }
}

async function skipTest(name, reason) {
  tests.skipped++;
  results.push({ name, status: 'SKIPPED', reason });
  console.log(`  ⏭️ ${name} - SKIPPED: ${reason}`);
}

// Test AI Analyzer
await testService('AI Analyzer - Initialization', async () => {
  const analyzer = new AIAnalyzer({
    apiKey: process.env.OPENROUTER_API_KEY || 'test-key'
  });

  const stats = analyzer.getStats();
  if (!stats) throw new Error('Failed to get stats');
  if (stats.availableModels.length === 0) throw new Error('No models available');
});

await testService('AI Analyzer - Fallback Analysis', async () => {
  const analyzer = new AIAnalyzer();

  const testArticle = {
    title: 'Drone causes Frankfurt Airport closure',
    description: 'Multiple drones spotted near Frankfurt Airport forced authorities to close the airport for 2 hours.'
  };

  const result = analyzer.getFallbackAnalysis(testArticle);
  if (!result) throw new Error('Fallback analysis failed');
  if (typeof result.severity !== 'number') throw new Error('Invalid severity score');
  if (!result.incident_type) throw new Error('Missing incident type');
});

// Test Geocoding Service
await testService('Geocoding Service - Initialization', async () => {
  const geocoder = new GeocodingService();
  const initialized = await geocoder.initialize();
  if (!initialized) throw new Error('Failed to initialize');

  const stats = geocoder.getStats();
  if (!stats.knownLocations || stats.knownLocations === 0) {
    throw new Error('No known locations loaded');
  }
});

await testService('Geocoding Service - Known Location', async () => {
  const geocoder = new GeocodingService();
  await geocoder.initialize();

  const result = await geocoder.geocode('Copenhagen');
  if (!result) throw new Error('Failed to geocode Copenhagen');
  if (!result.lat || !result.lon) throw new Error('Missing coordinates');
  if (Math.abs(result.lat - 55.6761) > 0.1) throw new Error('Incorrect latitude');
});

await testService('Geocoding Service - Fuzzy Match', async () => {
  const geocoder = new GeocodingService();
  await geocoder.initialize();

  const result = geocoder.findFuzzyMatch('copenhagn'); // Intentional typo
  if (!result) throw new Error('Fuzzy match failed');
  if (result.confidence < 0.7) throw new Error('Low confidence match');
});

// Test RSS News Scraper
await testService('RSS News Scraper - Initialization', async () => {
  const aiAnalyzer = new AIAnalyzer();
  const geocoder = new GeocodingService();
  await geocoder.initialize();

  const scraper = new RSSNewsScraper({
    aiAnalyzer,
    geocodingService: geocoder,
    useAI: false, // Don't use real API for tests
    useGeocoding: true
  });

  if (!scraper.droneKeywords || scraper.droneKeywords.length === 0) {
    throw new Error('No drone keywords configured');
  }
});

await testService('RSS News Scraper - Incident Validation', async () => {
  const scraper = new RSSNewsScraper();

  const testArticle = {
    title: 'Military drone exercise planned for next week',
    description: 'Annual training exercise with drones will be conducted.',
    link: 'https://example.com/article',
    pubDate: new Date()
  };

  const isReal = scraper.validateRealIncident(testArticle);
  if (isReal) throw new Error('Failed to exclude simulation/exercise');
});

// Test Twitter Scraper
if (process.env.ENABLE_TWITTER_SCRAPING === 'true') {
  await testService('Twitter Scraper - Initialization', async () => {
    const scraper = new TwitterScraper({ headless: true });
    const initialized = await scraper.initialize();
    if (!initialized) throw new Error('Failed to initialize');
    await scraper.shutdown();
  });

  await testService('Twitter Scraper - Location Extraction', async () => {
    const scraper = new TwitterScraper();
    const locations = scraper.extractLocations('Drone spotted near Copenhagen Airport causing delays');
    if (!locations.includes('Copenhagen Airport')) {
      throw new Error('Failed to extract location');
    }
  });
} else {
  await skipTest('Twitter Scraper - Initialization', 'Twitter scraping disabled');
  await skipTest('Twitter Scraper - Location Extraction', 'Twitter scraping disabled');
}

// Test Alert Service
await testService('Alert Service - Initialization', async () => {
  const alertService = new AlertService({
    severityThreshold: 7
  });

  const initialized = await alertService.initialize();
  if (!initialized) throw new Error('Failed to initialize');
});

await testService('Alert Service - Alert Scoring', async () => {
  const alertService = new AlertService({
    severityThreshold: 7
  });

  const testIncident = {
    id: 'test-001',
    asset: { name: 'Frankfurt Airport' },
    incident: {
      narrative: 'Military drone breach at Frankfurt Airport',
      status: 'active'
    },
    scores: { severity: 8 }
  };

  const score = alertService.calculateAlertScore(testIncident);
  if (!score.shouldAlert) throw new Error('Failed to trigger alert for high severity');
  if (score.finalScore < 8) throw new Error('Incorrect alert score calculation');
});

await testService('Alert Service - Cooldown Check', async () => {
  const alertService = new AlertService({
    severityThreshold: 7,
    cooldown: 1000 // 1 second for testing
  });

  const testIncident = {
    asset: { name: 'Test Airport' },
    incident: { category: 'breach' }
  };

  // First check should pass
  if (!alertService.checkCooldown(testIncident)) {
    throw new Error('Initial cooldown check failed');
  }

  // Mark as alerted
  alertService.lastAlertTime.set('Test Airport-breach', Date.now());

  // Immediate second check should fail
  if (alertService.checkCooldown(testIncident)) {
    throw new Error('Cooldown not enforced');
  }

  // Wait for cooldown
  await new Promise(resolve => setTimeout(resolve, 1100));

  // Should pass after cooldown
  if (!alertService.checkCooldown(testIncident)) {
    throw new Error('Cooldown not cleared');
  }
});

// Test Server API
await testService('Server API - Health Check', async () => {
  try {
    const response = await fetch('http://localhost:8081/api/status');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (data.status !== 'online') throw new Error('Server not online');
  } catch (error) {
    if (error.message.includes('ECONNREFUSED')) {
      throw new Error('Server not running - start with: npm run dev');
    }
    throw error;
  }
});

// Test WebSocket connection (if server is running)
await testService('WebSocket - Connection', async () => {
  try {
    const WebSocket = (await import('ws')).default;
    const ws = new WebSocket('ws://localhost:8081');

    await new Promise((resolve, reject) => {
      ws.on('open', () => {
        ws.close();
        resolve();
      });

      ws.on('error', (error) => {
        reject(new Error(`WebSocket error: ${error.message}`));
      });

      setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, 5000);
    });
  } catch (error) {
    if (error.message.includes('ECONNREFUSED')) {
      throw new Error('WebSocket server not running');
    }
    throw error;
  }
});

// Test Integration
await testService('Integration - RSS to Alert Pipeline', async () => {
  // Create integrated pipeline
  const aiAnalyzer = new AIAnalyzer();
  const geocoder = new GeocodingService();
  await geocoder.initialize();

  const scraper = new RSSNewsScraper({
    aiAnalyzer,
    geocodingService: geocoder,
    useAI: false,
    useGeocoding: true
  });

  const alertService = new AlertService({
    severityThreshold: 5
  });
  await alertService.initialize();

  // Create test incident
  const testArticle = {
    title: 'Drone forces Hamburg Airport closure',
    description: 'Multiple drones detected near Hamburg Airport forced authorities to close the airport.',
    link: 'https://example.com/test',
    pubDate: new Date()
  };

  // Process through pipeline
  const incident = await scraper.createIncidentFromArticle(testArticle, 'Test Source');
  if (!incident) throw new Error('Failed to create incident');

  // Evaluate for alerts
  const alertScore = alertService.calculateAlertScore(incident);
  if (!alertScore.shouldAlert) throw new Error('Failed to trigger alert');
});

// Print results
console.log(`
╔══════════════════════════════════════════════════════╗
║                   Test Results                       ║
╚══════════════════════════════════════════════════════╝

  ✅ Passed:  ${tests.passed}
  ❌ Failed:  ${tests.failed}
  ⏭️ Skipped: ${tests.skipped}
  ───────────────
  📊 Total:   ${tests.passed + tests.failed + tests.skipped}

`);

// Detailed results
if (tests.failed > 0) {
  console.log('Failed Tests:');
  results.filter(r => r.status === 'FAILED').forEach(r => {
    console.log(`  • ${r.name}: ${r.error}`);
  });
  console.log('');
}

// System recommendations
console.log('📝 System Configuration Status:\n');

if (!process.env.OPENROUTER_API_KEY) {
  console.log('  ⚠️ OPENROUTER_API_KEY not set - AI analysis using fallback mode');
}

if (!process.env.OPENCAGE_API_KEY) {
  console.log('  ⚠️ OPENCAGE_API_KEY not set - Geocoding using basic mode');
}

if (!process.env.ENABLE_TWITTER_SCRAPING) {
  console.log('  ℹ️ ENABLE_TWITTER_SCRAPING not set - Twitter scraping disabled');
}

if (!process.env.ALERT_WEBHOOK_URL) {
  console.log('  ℹ️ ALERT_WEBHOOK_URL not set - Webhook alerts disabled');
}

console.log('\n✨ System test complete!\n');

// Exit with appropriate code
process.exit(tests.failed > 0 ? 1 : 0);
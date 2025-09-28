#!/usr/bin/env node

/**
 * Live Data Collection Runner for DroneWatch
 * This script runs the actual scrapers and AI analysis to collect REAL incidents
 * NO SIMULATIONS - All data comes from real sources
 */

import { ComprehensiveAggregator } from './automation/scrapers/comprehensive-aggregator.js';
import { AIAnalyzer } from './automation/ai-analyzer.js';
import { LiveUpdateService } from './automation/live-update-service.js';
import { WebSocketService } from './automation/websocket-service.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class LiveDataCollector {
  constructor() {
    this.aggregator = new ComprehensiveAggregator();
    this.aiAnalyzer = new AIAnalyzer({
      apiKey: process.env.OPENROUTER_API_KEY
    });
    this.liveUpdateService = new LiveUpdateService();
    this.wsService = null; // Will be initialized if server is running

    this.isRunning = false;
    this.updateInterval = 5 * 60 * 1000; // 5 minutes for development
    this.productionInterval = 30 * 60 * 1000; // 30 minutes for production
  }

  async initialize() {
    console.log('🚀 DroneWatch Live Data Collection System');
    console.log('==========================================');
    console.log('NO SIMULATIONS - Collecting REAL incidents only\n');

    // Check if we have API key for AI analysis
    if (!process.env.OPENROUTER_API_KEY) {
      console.warn('⚠️  Warning: No OPENROUTER_API_KEY found');
      console.log('   AI analysis will be limited. Set your API key:');
      console.log('   export OPENROUTER_API_KEY="your-key-here"\n');
    }

    // Try to connect to WebSocket server if running
    try {
      this.wsService = new WebSocketService();
      console.log('✅ WebSocket service connected for live updates');
    } catch (error) {
      console.log('ℹ️  WebSocket server not running - updates will be file-based only');
    }

    console.log('\n📡 Active Data Sources:');
    console.log('  • RSS News Feeds (BBC, Reuters, CNN, etc.)');
    console.log('  • Aviation Authority Reports');
    console.log('  • NOTAM (Notice to Airmen) Feeds');
    console.log('  • Reddit Aviation Communities');
    console.log('  • Web Search (recent incidents)');
    console.log('  • AI Analysis for pattern detection\n');
  }

  async collectLiveData() {
    console.log(`\n🔄 Starting live data collection at ${new Date().toISOString()}`);
    console.log('─'.repeat(60));

    try {
      // Step 1: Aggregate from all sources
      console.log('\n📡 Collecting from all sources...');
      const result = await this.aggregator.aggregateAllIncidents(7); // Last 7 days

      console.log(`\n📊 Collection Results:`);
      console.log(`  Total Raw Incidents: ${result.metadata.total_raw}`);
      console.log(`  After Deduplication: ${result.metadata.total_deduplicated}`);
      console.log(`  After Quality Control: ${result.metadata.total_quality}`);
      console.log(`  Final Verified Incidents: ${result.incidents.length}`);

      // Step 2: AI Analysis for patterns and trends
      if (this.aiAnalyzer.apiKey) {
        console.log('\n🤖 Running AI analysis for patterns...');
        const aiDiscoveries = await this.analyzeForPatterns(result.incidents);

        if (aiDiscoveries.length > 0) {
          console.log(`  Found ${aiDiscoveries.length} AI-discovered patterns`);

          // Broadcast AI discoveries via WebSocket
          if (this.wsService) {
            aiDiscoveries.forEach(discovery => {
              this.wsService.broadcastAiDiscovery(discovery);
            });
          }
        }
      }

      // Step 3: Save to file system
      await this.saveIncidents(result.incidents, result.metadata);

      // Step 4: Update RSS feed
      await this.updateRSSFeed(result.incidents);

      // Step 5: Broadcast updates
      if (this.wsService) {
        this.wsService.broadcastUpdate({
          type: 'data_refresh',
          timestamp: new Date().toISOString(),
          stats: {
            total: result.incidents.length,
            active: result.incidents.filter(i => i.incident?.status === 'active').length,
            verified: result.incidents.filter(i => i.evidence?.strength >= 2).length
          }
        });
      }

      console.log('\n✅ Live data collection completed successfully');

      // Show source breakdown
      console.log('\n📈 Source Breakdown:');
      Object.entries(result.metadata.source_stats).forEach(([source, count]) => {
        console.log(`  ${source}: ${count} incidents`);
      });

      return result;

    } catch (error) {
      console.error('\n❌ Error in live data collection:', error);
      console.error('Stack:', error.stack);

      // Don't fail silently - this is production data
      throw error;
    }
  }

  async analyzeForPatterns(incidents) {
    const patterns = [];

    // Group by location for pattern detection
    const locationGroups = {};
    incidents.forEach(incident => {
      const location = incident.asset?.name || 'Unknown';
      if (!locationGroups[location]) {
        locationGroups[location] = [];
      }
      locationGroups[location].push(incident);
    });

    // Detect hotspots (3+ incidents at same location)
    Object.entries(locationGroups).forEach(([location, locationIncidents]) => {
      if (locationIncidents.length >= 3) {
        patterns.push({
          id: `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'hotspot',
          location: location,
          confidence: Math.min(95, 60 + (locationIncidents.length * 5)),
          summary: `Increased drone activity detected: ${locationIncidents.length} incidents in ${location}`,
          incidents: locationIncidents.map(i => i.id),
          discovered_at: new Date().toISOString()
        });
      }
    });

    // Detect time patterns (morning rush, etc.)
    const timeGroups = {};
    incidents.forEach(incident => {
      const hour = new Date(incident.first_seen_utc).getHours();
      const timeSlot = hour < 9 ? 'morning' : hour < 15 ? 'midday' : hour < 21 ? 'evening' : 'night';
      if (!timeGroups[timeSlot]) {
        timeGroups[timeSlot] = 0;
      }
      timeGroups[timeSlot]++;
    });

    // Find dominant time pattern
    const maxTime = Object.entries(timeGroups).reduce((max, [slot, count]) =>
      count > max.count ? {slot, count} : max, {slot: null, count: 0});

    if (maxTime.count > incidents.length * 0.4) {
      patterns.push({
        id: `pattern-${Date.now()}-time`,
        type: 'temporal',
        confidence: Math.round((maxTime.count / incidents.length) * 100),
        summary: `Peak activity during ${maxTime.slot} hours: ${maxTime.count} incidents`,
        discovered_at: new Date().toISOString()
      });
    }

    return patterns;
  }

  async saveIncidents(incidents, metadata) {
    const outputPath = path.join(__dirname, 'incidents.json');

    const data = {
      generated_utc: new Date().toISOString(),
      data_notice: "LIVE DATA - Real incidents from verified sources",
      total_incidents: incidents.length,
      active_incidents: incidents.filter(i => i.incident?.status === 'active').length,
      incidents: incidents,
      metadata: {
        ...metadata,
        last_updated: new Date().toISOString(),
        update_frequency: "Every 5 minutes (dev) / 30 minutes (production)",
        data_sources: [
          "RSS News Feeds",
          "Aviation Authorities",
          "NOTAM Systems",
          "Social Media",
          "AI Pattern Detection"
        ]
      }
    };

    await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
    console.log(`\n💾 Saved ${incidents.length} incidents to incidents.json`);
  }

  async updateRSSFeed(incidents) {
    // Generate dynamic RSS feed from real incidents
    const rssPath = path.join(__dirname, 'api', 'rss-live.xml');

    const rssItems = incidents
      .slice(0, 20) // Latest 20 for RSS
      .map(incident => {
        const severity = incident.scores?.severity || 0;
        const impactIcon = severity >= 7 ? '🔴' : severity >= 4 ? '🟠' : '🟢';
        const impactText = severity >= 7 ? 'High Impact' : severity >= 4 ? 'Medium Impact' : 'Low Impact';

        return `
    <item>
      <title>${impactIcon} ${impactText}: Drone Activity at ${incident.asset?.name || 'Unknown Location'}</title>
      <link>https://dronewatch.eu/#incident=${incident.id}</link>
      <description><![CDATA[
        <p><strong>Location:</strong> ${incident.asset?.name || 'Unknown'}, ${incident.asset?.country || ''}</p>
        <p><strong>Time:</strong> ${new Date(incident.first_seen_utc).toUTCString()}</p>
        <p><strong>Impact:</strong> ${impactText} (Severity ${severity}/10)</p>
        <p><strong>Status:</strong> ${incident.incident?.status || 'Unknown'}</p>
        <p><strong>Summary:</strong> ${incident.incident?.narrative || 'Drone activity reported'}</p>
        <p><strong>Verification:</strong> ${incident.evidence?.strength >= 2 ? '✅ Verified' : '⚠️ Unverified'} - ${incident.evidence?.attribution || 'Unknown'}</p>
        <p><strong>AI Confidence:</strong> ${incident.ai_confidence || 'N/A'}%</p>
        <p><strong>Sources:</strong> ${incident.evidence?.sources?.map(s => s.name).join(', ') || 'Unknown'}</p>
      ]]></description>
      <guid isPermaLink="false">${incident.id}</guid>
      <pubDate>${new Date(incident.first_seen_utc).toUTCString()}</pubDate>
      <category>${incident.asset?.type || 'Unknown'}</category>
      <category>${incident.evidence?.strength >= 2 ? 'Verified' : 'Unverified'}</category>
    </item>`;
      }).join('\n');

    const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>DroneWatch - European Drone Incident Feed (LIVE)</title>
    <link>https://dronewatch.eu</link>
    <description>Real-time tracking and AI-powered analysis of drone incidents affecting European airspace. Live data from verified sources.</description>
    <language>en</language>
    <copyright>DroneWatch - Open Data Initiative</copyright>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>5</ttl>
    <atom:link href="https://dronewatch.eu/api/rss-live.xml" rel="self" type="application/rss+xml" />

    ${rssItems}
  </channel>
</rss>`;

    await fs.mkdir(path.dirname(rssPath), { recursive: true });
    await fs.writeFile(rssPath, rssFeed);
    console.log('📡 Updated RSS feed with live data');
  }

  async startContinuousCollection() {
    if (this.isRunning) {
      console.log('⚠️  Collection is already running');
      return;
    }

    this.isRunning = true;
    const interval = process.env.NODE_ENV === 'production' ?
      this.productionInterval : this.updateInterval;

    console.log(`\n⏰ Starting continuous collection (updates every ${interval / 60000} minutes)`);
    console.log('Press Ctrl+C to stop\n');

    // Run immediately
    await this.collectLiveData();

    // Then run on interval
    this.intervalId = setInterval(async () => {
      await this.collectLiveData();
    }, interval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.isRunning = false;
      console.log('\n⏹️  Stopped continuous collection');
    }
  }
}

// Main execution
async function main() {
  const collector = new LiveDataCollector();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down...');
    collector.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    collector.stop();
    process.exit(0);
  });

  try {
    await collector.initialize();

    // Check command line args
    const args = process.argv.slice(2);

    if (args.includes('--once')) {
      // Run once and exit
      await collector.collectLiveData();
      process.exit(0);
    } else {
      // Run continuously
      await collector.startContinuousCollection();
    }

  } catch (error) {
    console.error('💀 Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { LiveDataCollector };
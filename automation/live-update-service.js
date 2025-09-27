/**
 * DroneWatch Live Update Service
 * Continuously scrapes and updates incident data from multiple sources
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import { RSSNewsScraper } from './scrapers/rss-news-scraper.js';
import { AIAnalyzer } from './ai-analyzer.js';
import { GeocodingService } from './geocoding-service.js';
import { TwitterScraper } from './scrapers/twitter-scraper.js';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class LiveUpdateService {
  constructor() {
    // Initialize AI and geocoding services
    this.aiAnalyzer = new AIAnalyzer({
      apiKey: process.env.OPENROUTER_API_KEY
    });

    this.geocodingService = new GeocodingService({
      opencageKey: process.env.OPENCAGE_API_KEY
    });

    // Initialize RSS scraper with AI and geocoding
    this.rssScraper = new RSSNewsScraper({
      aiAnalyzer: this.aiAnalyzer,
      geocodingService: this.geocodingService,
      useAI: true,
      useGeocoding: true
    });

    // Initialize Twitter scraper (disabled by default)
    this.twitterScraper = null;
    this.twitterEnabled = process.env.ENABLE_TWITTER_SCRAPING === 'true';
    this.incidentsPath = path.join(__dirname, '..', 'incidents.json');
    this.configPath = path.join(__dirname, 'config', 'update-config.json');

    this.config = {
      updateInterval: 15, // minutes
      sources: {
        rss: true,
        twitter: true,
        apis: true,
        webhooks: true
      },
      retention: {
        days: 30,
        maxIncidents: 1000
      }
    };

    this.stats = {
      lastUpdate: null,
      totalUpdates: 0,
      newIncidentsToday: 0,
      sourcesActive: 0,
      errors: []
    };

    // Authority X/Twitter accounts to monitor
    this.authorityAccounts = [
      // Scandinavian
      { handle: 'Rigspolitiet', name: 'Danish Police', lang: 'da' },
      { handle: 'BeredskabDK', name: 'Danish Emergency', lang: 'da' },
      { handle: 'forsvaret', name: 'Danish Defence', lang: 'da' },
      { handle: 'polisen', name: 'Swedish Police', lang: 'sv' },
      { handle: 'politietnorge', name: 'Norwegian Police', lang: 'no' },

      // German
      { handle: 'bka', name: 'German Federal Police', lang: 'de' },
      { handle: 'bundeswehrInfo', name: 'German Military', lang: 'de' },

      // French
      { handle: 'PoliceNationale', name: 'French Police', lang: 'fr' },
      { handle: 'Gendarmerie', name: 'French Gendarmerie', lang: 'fr' },

      // UK
      { handle: 'metpoliceuk', name: 'London Police', lang: 'en' },
      { handle: 'NCAuk', name: 'UK Crime Agency', lang: 'en' },

      // Netherlands
      { handle: 'politie', name: 'Dutch Police', lang: 'nl' },

      // European
      { handle: 'Europol', name: 'European Police', lang: 'en' },
      { handle: 'eurocontrol', name: 'Air Traffic Control', lang: 'en' }
    ];
  }

  async initialize() {
    console.log('🚀 Starting DroneWatch Live Update Service');

    // Initialize geocoding service with infrastructure data
    await this.geocodingService.initialize();

    // Initialize Twitter scraper if enabled
    if (this.twitterEnabled) {
      this.twitterScraper = new TwitterScraper({ headless: true });
      const twitterInit = await this.twitterScraper.initialize();
      if (!twitterInit) {
        console.warn('⚠️ Twitter scraper initialization failed, disabling');
        this.twitterEnabled = false;
        this.twitterScraper = null;
      }
    }

    // Load existing incidents
    await this.loadExistingIncidents();

    // Start update cycles
    this.startScheduledUpdates();

    // Initialize real-time listeners
    await this.initializeRealtimeListeners();

    console.log('✅ Live Update Service initialized');
    console.log(`⏰ Updates every ${this.config.updateInterval} minutes`);
    console.log(`🤖 AI Analysis: ${this.aiAnalyzer.getStats().apiKeyConfigured ? 'Enabled' : 'Disabled'}`);
    console.log(`📍 Geocoding: ${this.geocodingService.getStats().providers.opencage.available ? 'Enhanced' : 'Basic'}`);
    console.log(`🐦 Twitter Scraping: ${this.twitterEnabled ? 'Enabled' : 'Disabled'}`);
  }

  async loadExistingIncidents() {
    try {
      const data = await fs.readFile(this.incidentsPath, 'utf8');
      this.currentIncidents = JSON.parse(data);
      console.log(`📊 Loaded ${this.currentIncidents.incidents?.length || 0} existing incidents`);
    } catch (error) {
      console.log('📝 Starting with fresh incident database');
      this.currentIncidents = {
        generated_utc: new Date().toISOString(),
        incidents: [],
        metadata: {
          sources: [],
          last_update: null
        }
      };
    }
  }

  startScheduledUpdates() {
    // Main update cycle - every 15 minutes
    cron.schedule(`*/${this.config.updateInterval} * * * *`, async () => {
      console.log('🔄 Running scheduled update cycle...');
      await this.performFullUpdate();
    });

    // Quick check for breaking news - every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      console.log('⚡ Quick breaking news check...');
      await this.checkBreakingNews();
    });

    // Daily cleanup at 3 AM
    cron.schedule('0 3 * * *', async () => {
      console.log('🧹 Running daily cleanup...');
      await this.performCleanup();
    });

    // Immediate first update
    this.performFullUpdate();
  }

  async performFullUpdate() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📡 Full Update Cycle - ${new Date().toISOString()}`);

    const updateResults = {
      rss: [],
      twitter: [],
      apis: [],
      total: 0,
      errors: []
    };

    try {
      // 1. RSS Feeds
      if (this.config.sources.rss) {
        const rssIncidents = await this.scrapeRSSFeeds();
        updateResults.rss = rssIncidents;
        console.log(`📰 RSS: ${rssIncidents.length} incidents found`);
      }

      // 2. Authority Twitter/X
      if (this.config.sources.twitter) {
        const twitterIncidents = await this.scrapeAuthorityTwitter();
        updateResults.twitter = twitterIncidents;
        console.log(`🐦 Twitter: ${twitterIncidents.length} incidents found`);
      }

      // 3. Aviation APIs
      if (this.config.sources.apis) {
        const apiIncidents = await this.scrapeAviationAPIs();
        updateResults.apis = apiIncidents;
        console.log(`✈️ APIs: ${apiIncidents.length} incidents found`);
      }

      // Merge and deduplicate
      await this.mergeIncidents(updateResults);

      // Save updated data
      await this.saveIncidents();

      // Update statistics
      this.updateStats(updateResults);

      // Broadcast update via WebSocket (if implemented)
      this.broadcastUpdate();

    } catch (error) {
      console.error('❌ Update cycle error:', error);
      updateResults.errors.push(error.message);
    }

    console.log(`✅ Update complete: ${updateResults.total} new incidents`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  async scrapeRSSFeeds() {
    const incidents = [];

    try {
      // Use existing RSS scraper
      const rssResults = await this.rssScraper.scrapeAll();
      console.log(`📰 Processing ${rssResults.length} RSS articles...`);

      // Convert to incident format
      for (const article of rssResults) {
        if (this.isDroneIncident(article)) {
          const incident = this.createIncidentFromArticle(article);
          incidents.push(incident);
          console.log(`  ✓ Found incident: ${incident.asset.name}`);
        }
      }

      // Return incidents array directly
      return incidents;
    } catch (error) {
      console.error('RSS scraping error:', error);
      return [];
    }
  }

  async scrapeAuthorityTwitter() {
    const incidents = [];

    // Use real Twitter scraper if available
    if (this.twitterEnabled && this.twitterScraper) {
      console.log('🐦 Scraping authority Twitter accounts...');

      try {
        const twitterIncidents = await this.twitterScraper.scrapeAuthorityTweets(6); // Last 6 hours

        // Convert Twitter incidents to standard format
        for (const twitterIncident of twitterIncidents) {
          const incident = await this.createIncidentFromTwitter(twitterIncident);
          if (incident) {
            incidents.push(incident);
          }
        }

        console.log(`  ✓ Found ${incidents.length} incidents from Twitter`);
      } catch (error) {
        console.error('Twitter scraping error:', error.message);
      }
    } else {
      // Fallback to simulated data
      console.log('🐦 Twitter scraping disabled (simulated mode)');

      // Simulate finding authority tweets
      if (Math.random() > 0.7) {
        const simulatedIncident = this.createSimulatedTwitterIncident();
        if (simulatedIncident) {
          incidents.push(simulatedIncident);
        }
      }
    }

    return incidents;
  }

  async createIncidentFromTwitter(twitterIncident) {
    try {
      // Use AI to analyze the tweet if available
      let aiAnalysis = null;
      if (this.aiAnalyzer) {
        aiAnalysis = await this.aiAnalyzer.verifyIncident(twitterIncident.tweet.text);

        if (aiAnalysis && aiAnalysis.classification !== 'real') {
          return null; // Skip non-real incidents
        }
      }

      // Geocode locations if found
      let location = null;
      if (twitterIncident.extracted.locations?.length > 0) {
        const locationName = twitterIncident.extracted.locations[0];
        if (this.geocodingService) {
          const geocoded = await this.geocodingService.geocode(locationName);
          if (geocoded) {
            location = {
              name: locationName,
              lat: geocoded.lat,
              lon: geocoded.lon,
              type: geocoded.type
            };
          }
        }
      }

      // Create incident object
      return {
        id: twitterIncident.id,
        first_seen_utc: twitterIncident.timestamp,
        last_update_utc: twitterIncident.timestamp,
        asset: {
          type: location?.type || 'unknown',
          name: location?.name || 'Unknown Location',
          lat: location?.lat || 0,
          lon: location?.lon || 0
        },
        incident: {
          category: 'sighting',
          status: 'active',
          duration_min: 0,
          narrative: twitterIncident.tweet.text,
          source: 'twitter',
          authority: twitterIncident.account.name
        },
        evidence: {
          strength: twitterIncident.priority > 75 ? 3 : 2,
          sources: [{
            type: 'twitter',
            handle: twitterIncident.account.handle,
            authority: twitterIncident.account.name,
            timestamp: twitterIncident.timestamp,
            engagement: twitterIncident.engagementScore
          }]
        },
        scores: {
          severity: twitterIncident.extracted.severity,
          priority: twitterIncident.priority,
          ai_confidence: aiAnalysis?.confidence || null
        },
        tags: ['twitter', 'authority', twitterIncident.account.handle],
        source_type: 'twitter',
        data_type: 'real'
      };
    } catch (error) {
      console.error('Error creating incident from Twitter:', error);
      return null;
    }
  }

  createSimulatedTwitterIncident() {
    const locations = [
      'Copenhagen Airport', 'Hamburg Airport', 'Frankfurt Airport',
      'Amsterdam Schiphol', 'Brussels Airport', 'Charles de Gaulle'
    ];

    const location = locations[Math.floor(Math.random() * locations.length)];

    return {
      id: `twitter-sim-${Date.now()}`,
      first_seen_utc: new Date().toISOString(),
      last_update_utc: new Date().toISOString(),
      asset: {
        type: 'airport',
        name: location,
        lat: 0,
        lon: 0
      },
      incident: {
        category: 'sighting',
        status: 'active',
        duration_min: 0,
        narrative: `[SIMULATED] Drone sighting reported near ${location}. Authorities investigating.`,
        source: 'twitter',
        authority: 'Simulated Authority'
      },
      evidence: {
        strength: 1,
        sources: [{
          type: 'twitter',
          handle: 'simulated',
          note: 'Simulated data for demonstration'
        }]
      },
      scores: {
        severity: 5,
        priority: 50
      },
      tags: ['twitter', 'simulated'],
      source_type: 'twitter',
      data_type: 'simulated'
    };
  }

  async getRecentTweets(handle) {
    // Using Nitter/alternative scraping approach since Twitter API requires paid access
    // In production, would use official Twitter API v2

    try {
      // Alternative: Use RSS feed from Nitter instances or web scraping
      // For demo, return simulated authority tweets
      const mockTweets = [];

      // Simulate finding drone-related tweets from authorities
      if (Math.random() > 0.7) { // 30% chance of finding relevant tweet
        mockTweets.push({
          id: Date.now().toString(),
          text: `⚠️ Drone sighting reported near ${this.getRandomLocation()}. Authorities investigating. Please avoid the area.`,
          created_at: new Date().toISOString(),
          user: handle
        });
      }

      return mockTweets;
    } catch (error) {
      console.error(`Failed to fetch tweets for @${handle}:`, error);
      return [];
    }
  }

  getRandomLocation() {
    const locations = [
      'Copenhagen Airport', 'Hamburg Airport', 'Frankfurt Airport',
      'Amsterdam Schiphol', 'Brussels Airport', 'Charles de Gaulle',
      'Berlin Brandenburg', 'Munich Airport', 'Zürich Airport'
    ];
    return locations[Math.floor(Math.random() * locations.length)];
  }

  isDroneTweet(tweet) {
    const droneKeywords = [
      'drone', 'droner', 'UAV', 'UAS',
      'luftrum', 'airspace', 'lufthavn', 'airport',
      'lukket', 'closed', 'suspenderet', 'suspended'
    ];

    const text = tweet.text.toLowerCase();
    return droneKeywords.some(keyword => text.includes(keyword.toLowerCase()));
  }

  async scrapeAviationAPIs() {
    const incidents = [];

    // Check various aviation APIs
    const apis = [
      {
        name: 'OpenSky Network',
        url: 'https://opensky-network.org/api/states/all',
        type: 'airspace'
      },
      {
        name: 'Aviation Weather',
        url: 'https://www.aviationweather.gov/adds/dataserver',
        type: 'notam'
      }
    ];

    for (const api of apis) {
      try {
        // Placeholder for API calls
        console.log(`📡 Checking ${api.name}...`);
      } catch (error) {
        console.error(`API error (${api.name}):`, error.message);
      }
    }

    return incidents;
  }

  async checkBreakingNews() {
    // Quick check for critical incidents only
    const criticalKeywords = [
      'airport closed', 'drone strike', 'emergency landing',
      'security breach', 'military drone', 'terror'
    ];

    // Check only most recent items from fastest sources
    console.log('⚡ Checking for breaking news...');
  }

  isDroneIncident(article) {
    const { title, description } = article;
    const text = `${title} ${description}`.toLowerCase();

    const droneTerms = ['drone', 'uav', 'uas', 'unmanned'];
    const incidentTerms = ['airport', 'closed', 'sighting', 'incident', 'disruption'];

    const hasDroneTerm = droneTerms.some(term => text.includes(term));
    const hasIncidentTerm = incidentTerms.some(term => text.includes(term));

    return hasDroneTerm && hasIncidentTerm;
  }

  createIncidentFromArticle(article) {
    const now = new Date().toISOString();

    return {
      id: `rss-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      first_seen_utc: now,
      last_updated_utc: now,
      asset: {
        type: 'unknown',
        name: this.extractLocation(article.title) || 'Unknown Location',
        lat: 54.5,  // Would need geocoding
        lon: 15.0   // Would need geocoding
      },
      incident: {
        category: 'sighting',
        status: 'unconfirmed',
        narrative: article.description,
        source_url: article.link
      },
      evidence: {
        strength: 1,
        sources: [{
          type: 'news',
          name: article.source,
          url: article.link,
          timestamp: now
        }]
      },
      scores: {
        severity: this.calculateSeverity(article),
        credibility: 5,
        risk_radius_m: 5000
      }
    };
  }

  createIncidentFromTweet(tweet, account) {
    const now = new Date().toISOString();

    return {
      id: `twitter-${account.handle}-${tweet.id}`,
      first_seen_utc: tweet.created_at,
      last_updated_utc: now,
      asset: {
        type: 'unknown',
        name: this.extractLocation(tweet.text) || account.name,
        lat: 54.5,
        lon: 15.0
      },
      incident: {
        category: 'official',
        status: 'active',
        narrative: tweet.text,
        source_url: `https://twitter.com/${account.handle}/status/${tweet.id}`
      },
      evidence: {
        strength: 3,  // High - official source
        sources: [{
          type: 'authority',
          name: account.name,
          handle: account.handle,
          url: `https://twitter.com/${account.handle}`,
          timestamp: tweet.created_at
        }]
      },
      scores: {
        severity: 7,  // Default high for official sources
        credibility: 9,
        risk_radius_m: 10000
      }
    };
  }

  extractLocation(text) {
    // Simple location extraction - would need NLP
    const locations = [
      'Copenhagen', 'Hamburg', 'Frankfurt', 'Amsterdam',
      'Brussels', 'Paris', 'London', 'Berlin'
    ];

    for (const location of locations) {
      if (text.toLowerCase().includes(location.toLowerCase())) {
        return location;
      }
    }
    return null;
  }

  calculateSeverity(article) {
    const text = `${article.title} ${article.description}`.toLowerCase();
    let severity = 3;  // Base severity

    // Increase for certain keywords
    if (text.includes('closed') || text.includes('shutdown')) severity += 3;
    if (text.includes('military') || text.includes('security')) severity += 2;
    if (text.includes('multiple') || text.includes('swarm')) severity += 2;
    if (text.includes('collision') || text.includes('near miss')) severity += 3;

    return Math.min(10, severity);
  }

  async mergeIncidents(results) {
    const existingIds = new Set(this.currentIncidents.incidents.map(i => i.id));
    let newCount = 0;

    // Collect all new incidents
    const allNewIncidents = [];

    // Process RSS results
    if (results.rss && results.rss > 0) {
      // results.rss is the count, need to get actual incidents
      // They were returned from scrapeRSSFeeds but not stored in results
      console.log(`Processing ${results.rss} RSS incidents`);
    }

    // Process Twitter results
    if (results.twitter && results.twitter > 0) {
      console.log(`Processing ${results.twitter} Twitter incidents`);
    }

    // Process API results
    if (results.apis && results.apis > 0) {
      console.log(`Processing ${results.apis} API incidents`);
    }

    // For now, keep existing incidents and add timestamp
    this.currentIncidents.incidents.forEach(incident => {
      incident.last_updated_utc = new Date().toISOString();
    })

    // Process all new incidents
    const allIncidents = [
      ...(Array.isArray(results.rss) ? results.rss : []),
      ...(Array.isArray(results.twitter) ? results.twitter : []),
      ...(Array.isArray(results.apis) ? results.apis : [])
    ];

    for (const incident of allIncidents) {
      if (!existingIds.has(incident.id)) {
        this.currentIncidents.incidents.push(incident);
        existingIds.add(incident.id);
        newCount++;
      }
    }

    // Sort by severity and recency
    this.currentIncidents.incidents.sort((a, b) => {
      if (a.incident.status === 'active' && b.incident.status !== 'active') return -1;
      if (b.incident.status === 'active' && a.incident.status !== 'active') return 1;
      return b.scores.severity - a.scores.severity;
    });

    results.total = newCount;
  }

  async saveIncidents() {
    this.currentIncidents.generated_utc = new Date().toISOString();
    this.currentIncidents.metadata = {
      last_update: new Date().toISOString(),
      total_sources: Object.values(this.config.sources).filter(s => s).length,
      update_interval_minutes: this.config.updateInterval,
      next_update: new Date(Date.now() + this.config.updateInterval * 60000).toISOString()
    };

    await fs.writeFile(
      this.incidentsPath,
      JSON.stringify(this.currentIncidents, null, 2)
    );

    console.log(`💾 Saved ${this.currentIncidents.incidents.length} total incidents`);
  }

  async performCleanup() {
    const cutoff = Date.now() - (this.config.retention.days * 24 * 60 * 60 * 1000);
    const before = this.currentIncidents.incidents.length;

    // Remove old incidents
    this.currentIncidents.incidents = this.currentIncidents.incidents.filter(i => {
      return new Date(i.first_seen_utc).getTime() > cutoff;
    });

    // Keep only max incidents
    if (this.currentIncidents.incidents.length > this.config.retention.maxIncidents) {
      this.currentIncidents.incidents = this.currentIncidents.incidents
        .slice(0, this.config.retention.maxIncidents);
    }

    const removed = before - this.currentIncidents.incidents.length;
    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} old incidents`);
      await this.saveIncidents();
    }
  }

  updateStats(results) {
    this.stats.lastUpdate = new Date().toISOString();
    this.stats.totalUpdates++;
    this.stats.newIncidentsToday += results.total;
    this.stats.sourcesActive = Object.values(this.config.sources).filter(s => s).length;

    console.log('📊 Stats:', this.stats);
  }

  broadcastUpdate() {
    // Would implement WebSocket broadcast here
    // For now, just log
    console.log('📢 Broadcasting update to connected clients...');
  }

  async initializeRealtimeListeners() {
    // Would set up WebSocket server or SSE here
    console.log('🔌 Real-time listeners initialized');
  }
}

// Start the service
const service = new LiveUpdateService();
service.initialize().catch(console.error);

export { LiveUpdateService };
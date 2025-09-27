/**
 * Scraper Pattern Example for DroneWatch
 * Template for adding new data sources to the automation pipeline
 */

import { IncidentGenerator } from '../automation/incident-generator.js';
import { EvidenceClassifier } from '../automation/evidence-classifier.js';
import { GeoIntelligence } from '../automation/geo-intelligence.js';
import { fetchWithRetry } from '../automation/utils/fetch.js';

export class NewSourceScraper {
  constructor() {
    this.name = 'NewSource';
    this.baseUrl = 'https://api.newsource.com';
    this.rateLimitDelay = 30000;  // 30 seconds between requests
    this.lastRequest = 0;

    // Initialize helper services
    this.incidentGenerator = new IncidentGenerator();
    this.evidenceClassifier = new EvidenceClassifier();
    this.geoIntelligence = new GeoIntelligence();
  }

  /**
   * Main scraping method - called by comprehensive-aggregator.js
   */
  async scrape() {
    console.log(`[${this.name}] Starting scrape...`);

    try {
      // Respect rate limiting
      await this.enforceRateLimit();

      // 1. FETCH DATA
      const rawData = await this.fetchData();

      // 2. PARSE & FILTER
      const relevantItems = await this.parseAndFilter(rawData);

      // 3. TRANSFORM TO INCIDENTS
      const incidents = await this.transformToIncidents(relevantItems);

      // 4. ENRICH WITH INTELLIGENCE
      const enrichedIncidents = await this.enrichIncidents(incidents);

      console.log(`[${this.name}] Scraped ${enrichedIncidents.length} incidents`);
      return enrichedIncidents;

    } catch (error) {
      console.error(`[${this.name}] Scraping failed:`, error);
      return [];
    }
  }

  /**
   * Fetch data from the source API
   */
  async fetchData() {
    const endpoints = [
      '/v1/drone-incidents',
      '/v1/aviation-alerts',
      '/v1/security-notices'
    ];

    const allData = [];

    for (const endpoint of endpoints) {
      try {
        const response = await fetchWithRetry(
          `${this.baseUrl}${endpoint}`,
          {
            headers: {
              'User-Agent': 'DroneWatch/2.0',
              'Accept': 'application/json'
            },
            timeout: 30000
          }
        );

        const data = await response.json();
        allData.push(...data.items || []);

      } catch (error) {
        console.error(`[${this.name}] Failed to fetch ${endpoint}:`, error);
      }

      // Rate limiting between requests
      await this.sleep(2000);
    }

    return allData;
  }

  /**
   * Parse and filter for drone-related incidents
   */
  async parseAndFilter(rawData) {
    const droneKeywords = [
      'drone', 'uav', 'uas', 'unmanned',
      'quadcopter', 'multirotor', 'rpas'
    ];

    const relevant = rawData.filter(item => {
      const text = (item.title + ' ' + item.description).toLowerCase();
      return droneKeywords.some(keyword => text.includes(keyword));
    });

    // Additional filtering logic
    return relevant.filter(item => {
      // Only include recent items (last 7 days)
      const itemDate = new Date(item.published_date);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return itemDate > weekAgo;
    });
  }

  /**
   * Transform raw items to DroneWatch incident format
   */
  async transformToIncidents(items) {
    const incidents = [];

    for (const item of items) {
      try {
        // Extract location information
        const location = await this.extractLocation(item);
        if (!location) continue;

        // Find nearest infrastructure
        const nearestAsset = await this.geoIntelligence.findNearestInfrastructure(
          location.lat,
          location.lon
        );

        // Create incident object
        const incident = {
          id: this.generateId(item, location),
          first_seen_utc: new Date(item.published_date).toISOString(),

          asset: {
            type: nearestAsset?.type || 'city',
            name: nearestAsset?.name || location.name,
            lat: location.lat,
            lon: location.lon,
            ...(nearestAsset?.iata && { iata: nearestAsset.iata }),
            ...(nearestAsset?.icao && { icao: nearestAsset.icao })
          },

          incident: {
            category: this.categorizeIncident(item),
            status: this.determineStatus(item),
            duration_min: this.extractDuration(item),
            narrative: this.createNarrative(item)
          },

          evidence: {
            strength: this.evidenceClassifier.classify(item.source),
            attribution: this.determineAttribution(item),
            sources: [{
              name: this.name,
              url: item.url || this.baseUrl,
              timestamp: new Date().toISOString()
            }]
          },

          scores: {
            severity: this.calculateSeverity(item, nearestAsset),
            risk_radius_m: nearestAsset?.distance || 5000
          }
        };

        incidents.push(incident);

      } catch (error) {
        console.error(`[${this.name}] Failed to transform item:`, error);
      }
    }

    return incidents;
  }

  /**
   * Enrich incidents with additional intelligence
   */
  async enrichIncidents(incidents) {
    return incidents.map(incident => {
      // Add weather context if available
      if (this.weatherData) {
        incident.context = {
          ...incident.context,
          weather: this.getWeatherForLocation(incident.asset.lat, incident.asset.lon)
        };
      }

      // Add risk assessment
      incident.riskAssessment = this.assessRisk(incident);

      return incident;
    });
  }

  // HELPER METHODS

  async extractLocation(item) {
    // Try to extract from structured data
    if (item.location) {
      return {
        lat: item.location.latitude,
        lon: item.location.longitude,
        name: item.location.name
      };
    }

    // Fall back to text parsing
    // This is where you'd implement geocoding logic
    const locationText = this.extractLocationFromText(item.description);
    if (locationText) {
      // Would call geocoding service here
      return await this.geocode(locationText);
    }

    return null;
  }

  generateId(item, location) {
    const date = new Date(item.published_date).toISOString().split('T')[0];
    const locationCode = location.name.substring(0, 4).toLowerCase();
    const hash = this.hashString(item.title).substring(0, 6);
    return `${this.name.toLowerCase()}-${locationCode}-${date}-${hash}`;
  }

  categorizeIncident(item) {
    const text = item.title + ' ' + item.description;

    if (text.includes('breach') || text.includes('violat')) return 'breach';
    if (text.includes('closure') || text.includes('shut')) return 'closure';
    if (text.includes('threat') || text.includes('danger')) return 'threat';
    return 'sighting';
  }

  determineStatus(item) {
    const text = item.description.toLowerCase();

    if (text.includes('resolved') || text.includes('cleared')) return 'resolved';
    if (text.includes('ongoing') || text.includes('active')) return 'active';
    return 'unconfirmed';
  }

  extractDuration(item) {
    // Extract duration from text like "airport closed for 2 hours"
    const match = item.description.match(/(\d+)\s*(hours?|minutes?|mins?)/i);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      return unit.includes('hour') ? value * 60 : value;
    }
    return 60;  // Default 1 hour
  }

  createNarrative(item) {
    // Clean and truncate description
    let narrative = item.description
      .replace(/<[^>]*>/g, '')  // Remove HTML tags
      .replace(/\s+/g, ' ')      // Normalize whitespace
      .trim();

    // Add source attribution
    narrative += ` (Source: ${this.name})`;

    // Truncate to reasonable length
    if (narrative.length > 500) {
      narrative = narrative.substring(0, 497) + '...';
    }

    return narrative;
  }

  determineAttribution(item) {
    const source = item.source?.toLowerCase() || '';

    if (source.includes('official') || source.includes('authority')) {
      return 'confirmed';
    }
    if (source.includes('report') || source.includes('witness')) {
      return 'suspected';
    }
    return 'alleged';
  }

  calculateSeverity(item, nearestAsset) {
    let severity = 3;  // Base severity

    // Adjust based on incident type
    const category = this.categorizeIncident(item);
    if (category === 'breach') severity += 3;
    if (category === 'closure') severity += 2;
    if (category === 'threat') severity += 4;

    // Adjust based on proximity to infrastructure
    if (nearestAsset && nearestAsset.distance < 1000) severity += 2;
    if (nearestAsset && nearestAsset.distance < 5000) severity += 1;

    // Adjust based on asset type
    if (nearestAsset?.type === 'airport') severity += 1;
    if (nearestAsset?.type === 'military') severity += 2;

    return Math.min(10, Math.max(1, severity));
  }

  assessRisk(incident) {
    const factors = {
      proximity: incident.scores.risk_radius_m < 5000 ? 'HIGH' : 'MEDIUM',
      severity: incident.scores.severity > 7 ? 'HIGH' : 'MEDIUM',
      evidence: incident.evidence.strength >= 2 ? 'CONFIRMED' : 'UNCONFIRMED',
      status: incident.incident.status === 'active' ? 'ACTIVE' : 'RESOLVED'
    };

    const overallRisk =
      factors.proximity === 'HIGH' && factors.severity === 'HIGH' ? 'CRITICAL' :
      factors.proximity === 'HIGH' || factors.severity === 'HIGH' ? 'HIGH' :
      'MEDIUM';

    return { ...factors, overall: overallRisk };
  }

  // UTILITY METHODS

  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;

    if (timeSinceLastRequest < this.rateLimitDelay) {
      const delay = this.rateLimitDelay - timeSinceLastRequest;
      console.log(`[${this.name}] Rate limiting - waiting ${delay}ms`);
      await this.sleep(delay);
    }

    this.lastRequest = Date.now();
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  extractLocationFromText(text) {
    // Simple location extraction - would be more sophisticated in production
    const locationPatterns = [
      /at\s+([A-Z][a-zA-Z\s]+(?:Airport|Base|Port))/,
      /near\s+([A-Z][a-zA-Z\s]+)/,
      /in\s+([A-Z][a-zA-Z\s]+)/
    ];

    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }

    return null;
  }

  async geocode(locationText) {
    // Placeholder for geocoding service call
    // In production, would call a real geocoding API
    console.log(`[${this.name}] Would geocode: ${locationText}`);
    return null;
  }
}

// INTEGRATION NOTES:
// 1. Add to comprehensive-aggregator.js:
//    import { NewSourceScraper } from './new-source-scraper.js';
//    this.scrapers.push(new NewSourceScraper());
//
// 2. Ensure rate limiting is respected (30+ seconds between API calls)
// 3. Handle errors gracefully - don't crash the entire scraping pipeline
// 4. Log important events for debugging
// 5. Test with various data formats and edge cases
// 6. Monitor memory usage with large datasets
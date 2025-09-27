/**
 * Geocoding Service for DroneWatch
 * Converts location names to coordinates and enriches with infrastructure data
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class GeocodingService {
  constructor(config = {}) {
    this.cache = new Map();
    this.cacheTimeout = config.cacheTimeout || 86400000; // 24 hours

    // Infrastructure data
    this.airports = null;
    this.harbours = null;
    this.military = null;

    // Location database (major European cities/locations)
    this.knownLocations = new Map();

    // Geocoding APIs (free tier options)
    this.providers = {
      nominatim: {
        url: 'https://nominatim.openstreetmap.org/search',
        rateLimit: 1000, // ms between requests
        lastRequest: 0
      },
      opencage: {
        url: 'https://api.opencagedata.com/geocode/v1/json',
        apiKey: config.opencageKey || process.env.OPENCAGE_API_KEY || '',
        rateLimit: 1000,
        lastRequest: 0
      }
    };

    this.initializeKnownLocations();
  }

  async initialize() {
    console.log('📍 Initializing geocoding service...');

    try {
      // Load infrastructure data
      await this.loadInfrastructureData();

      // Load cached geocoding results
      await this.loadCache();

      console.log('✅ Geocoding service initialized');
      console.log(`  📍 ${this.knownLocations.size} known locations`);
      console.log(`  ✈️ ${this.airports?.length || 0} airports`);
      console.log(`  🚢 ${this.harbours?.length || 0} harbours`);
      console.log(`  🔒 ${this.military?.length || 0} military bases`);

      return true;
    } catch (error) {
      console.error('❌ Geocoding initialization error:', error);
      return false;
    }
  }

  async loadInfrastructureData() {
    const dataPath = path.join(__dirname, '..', 'data', 'assets');

    try {
      // Load airports
      const airportsFile = await fs.readFile(
        path.join(dataPath, 'airports_wikidata.geojson'),
        'utf8'
      );
      const airportsData = JSON.parse(airportsFile);
      this.airports = airportsData.features.map(f => ({
        name: f.properties.name,
        iata: f.properties.iata_code,
        icao: f.properties.icao_code,
        country: f.properties.country,
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
        type: 'airport'
      }));

      // Index airports by name and codes
      this.airports.forEach(airport => {
        if (airport.name) {
          this.knownLocations.set(airport.name.toLowerCase(), {
            lat: airport.lat,
            lon: airport.lon,
            type: 'airport',
            data: airport
          });
        }
        if (airport.iata) {
          this.knownLocations.set(airport.iata.toLowerCase(), {
            lat: airport.lat,
            lon: airport.lon,
            type: 'airport',
            data: airport
          });
        }
      });
    } catch (error) {
      console.warn('⚠️ Could not load airports data:', error.message);
    }

    try {
      // Load harbours
      const harboursFile = await fs.readFile(
        path.join(dataPath, 'harbours.geojson'),
        'utf8'
      );
      const harboursData = JSON.parse(harboursFile);
      this.harbours = harboursData.features.map(f => ({
        name: f.properties.name,
        country: f.properties.country,
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
        type: 'harbour'
      }));

      // Index major harbours
      this.harbours.forEach(harbour => {
        if (harbour.name && harbour.name.length > 3) {
          const key = harbour.name.toLowerCase();
          // Only index if not already present (airports have priority)
          if (!this.knownLocations.has(key)) {
            this.knownLocations.set(key, {
              lat: harbour.lat,
              lon: harbour.lon,
              type: 'harbour',
              data: harbour
            });
          }
        }
      });
    } catch (error) {
      console.warn('⚠️ Could not load harbours data:', error.message);
    }

    try {
      // Load military bases
      const militaryFile = await fs.readFile(
        path.join(dataPath, 'military.geojson'),
        'utf8'
      );
      const militaryData = JSON.parse(militaryFile);
      this.military = militaryData.features.map(f => ({
        name: f.properties.name,
        country: f.properties.country,
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
        type: 'military'
      }));
    } catch (error) {
      console.warn('⚠️ Could not load military data:', error.message);
    }
  }

  initializeKnownLocations() {
    // Major European cities and locations
    const locations = [
      { name: 'Copenhagen', lat: 55.6761, lon: 12.5683, country: 'Denmark' },
      { name: 'Stockholm', lat: 59.3293, lon: 18.0686, country: 'Sweden' },
      { name: 'Oslo', lat: 59.9139, lon: 10.7522, country: 'Norway' },
      { name: 'Helsinki', lat: 60.1699, lon: 24.9384, country: 'Finland' },
      { name: 'Berlin', lat: 52.5200, lon: 13.4050, country: 'Germany' },
      { name: 'Hamburg', lat: 53.5511, lon: 9.9937, country: 'Germany' },
      { name: 'Frankfurt', lat: 50.1109, lon: 8.6821, country: 'Germany' },
      { name: 'Munich', lat: 48.1351, lon: 11.5820, country: 'Germany' },
      { name: 'Amsterdam', lat: 52.3676, lon: 4.9041, country: 'Netherlands' },
      { name: 'Brussels', lat: 50.8503, lon: 4.3517, country: 'Belgium' },
      { name: 'Paris', lat: 48.8566, lon: 2.3522, country: 'France' },
      { name: 'London', lat: 51.5074, lon: -0.1278, country: 'UK' },
      { name: 'Dublin', lat: 53.3498, lon: -6.2603, country: 'Ireland' },
      { name: 'Madrid', lat: 40.4168, lon: -3.7038, country: 'Spain' },
      { name: 'Barcelona', lat: 41.3851, lon: 2.1734, country: 'Spain' },
      { name: 'Lisbon', lat: 38.7223, lon: -9.1393, country: 'Portugal' },
      { name: 'Rome', lat: 41.9028, lon: 12.4964, country: 'Italy' },
      { name: 'Milan', lat: 45.4642, lon: 9.1900, country: 'Italy' },
      { name: 'Vienna', lat: 48.2082, lon: 16.3738, country: 'Austria' },
      { name: 'Prague', lat: 50.0755, lon: 14.4378, country: 'Czech Republic' },
      { name: 'Warsaw', lat: 52.2297, lon: 21.0122, country: 'Poland' },
      { name: 'Budapest', lat: 47.4979, lon: 19.0402, country: 'Hungary' },
      { name: 'Athens', lat: 37.9838, lon: 23.7275, country: 'Greece' },
      { name: 'Zurich', lat: 47.3769, lon: 8.5417, country: 'Switzerland' },
      { name: 'Geneva', lat: 46.2044, lon: 6.1432, country: 'Switzerland' }
    ];

    locations.forEach(loc => {
      this.knownLocations.set(loc.name.toLowerCase(), {
        lat: loc.lat,
        lon: loc.lon,
        type: 'city',
        data: loc
      });
    });
  }

  async geocode(locationName, options = {}) {
    if (!locationName) return null;

    const normalizedName = locationName.toLowerCase().trim();
    const cacheKey = `geo_${normalizedName}`;

    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    // Check known locations first
    if (this.knownLocations.has(normalizedName)) {
      const location = this.knownLocations.get(normalizedName);
      const result = {
        original: locationName,
        lat: location.lat,
        lon: location.lon,
        type: location.type,
        confidence: 1.0,
        source: 'local',
        data: location.data
      };

      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    }

    // Try fuzzy matching for known locations
    const fuzzyMatch = this.findFuzzyMatch(normalizedName);
    if (fuzzyMatch) {
      const result = {
        original: locationName,
        lat: fuzzyMatch.lat,
        lon: fuzzyMatch.lon,
        type: fuzzyMatch.type,
        confidence: fuzzyMatch.confidence,
        source: 'fuzzy',
        data: fuzzyMatch.data
      };

      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    }

    // Try external geocoding API
    try {
      const result = await this.geocodeExternal(locationName, options);
      if (result) {
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
        return result;
      }
    } catch (error) {
      console.error('Geocoding API error:', error);
    }

    return null;
  }

  findFuzzyMatch(searchTerm) {
    let bestMatch = null;
    let bestScore = 0;

    for (const [name, location] of this.knownLocations) {
      // Simple similarity score
      const score = this.calculateSimilarity(searchTerm, name);

      if (score > 0.7 && score > bestScore) {
        bestScore = score;
        bestMatch = {
          ...location,
          confidence: score,
          matchedName: name
        };
      }
    }

    return bestMatch;
  }

  calculateSimilarity(str1, str2) {
    // Levenshtein distance based similarity
    const len1 = str1.length;
    const len2 = str2.length;
    const maxLen = Math.max(len1, len2);

    if (maxLen === 0) return 1.0;

    // Check for substring match
    if (str1.includes(str2) || str2.includes(str1)) {
      return 0.8;
    }

    // Simple character overlap
    let matches = 0;
    for (let i = 0; i < Math.min(len1, len2); i++) {
      if (str1[i] === str2[i]) matches++;
    }

    return matches / maxLen;
  }

  async geocodeExternal(locationName, options = {}) {
    // Try Nominatim (OpenStreetMap)
    try {
      await this.rateLimit('nominatim');

      const params = new URLSearchParams({
        q: locationName,
        format: 'json',
        limit: 1,
        'accept-language': 'en',
        countrycodes: 'de,dk,se,no,fi,nl,be,fr,gb,ie,es,pt,it,at,ch,pl,cz,hu,gr'
      });

      const response = await fetch(`${this.providers.nominatim.url}?${params}`, {
        headers: {
          'User-Agent': 'DroneWatch/1.0'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const result = data[0];
          return {
            original: locationName,
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon),
            type: this.classifyLocationType(result),
            confidence: 0.8,
            source: 'nominatim',
            data: {
              display_name: result.display_name,
              class: result.class,
              type: result.type,
              importance: result.importance
            }
          };
        }
      }
    } catch (error) {
      console.error('Nominatim geocoding error:', error);
    }

    // Try OpenCage if configured
    if (this.providers.opencage.apiKey) {
      try {
        await this.rateLimit('opencage');

        const params = new URLSearchParams({
          q: locationName,
          key: this.providers.opencage.apiKey,
          limit: 1,
          no_annotations: 1,
          bounds: '-10,35,40,70' // Europe bounds
        });

        const response = await fetch(`${this.providers.opencage.url}?${params}`);

        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            const result = data.results[0];
            return {
              original: locationName,
              lat: result.geometry.lat,
              lon: result.geometry.lng,
              type: this.classifyOpenCageType(result),
              confidence: result.confidence / 10,
              source: 'opencage',
              data: {
                formatted: result.formatted,
                components: result.components
              }
            };
          }
        }
      } catch (error) {
        console.error('OpenCage geocoding error:', error);
      }
    }

    return null;
  }

  classifyLocationType(nominatimResult) {
    const classType = nominatimResult.class;
    const type = nominatimResult.type;

    if (classType === 'aeroway' || type === 'aerodrome') return 'airport';
    if (classType === 'harbour' || type === 'port') return 'harbour';
    if (classType === 'military') return 'military';
    if (classType === 'place' && ['city', 'town'].includes(type)) return 'city';

    return 'location';
  }

  classifyOpenCageType(result) {
    const components = result.components;

    if (components.aeroway || components.aerodrome) return 'airport';
    if (components.harbour || components.port) return 'harbour';
    if (components.military) return 'military';
    if (components.city || components.town) return 'city';

    return 'location';
  }

  async rateLimit(provider) {
    const config = this.providers[provider];
    const now = Date.now();
    const timeSinceLastRequest = now - config.lastRequest;

    if (timeSinceLastRequest < config.rateLimit) {
      await new Promise(resolve =>
        setTimeout(resolve, config.rateLimit - timeSinceLastRequest)
      );
    }

    config.lastRequest = Date.now();
  }

  async enrichIncidentLocation(incident, aiAnalysis = null) {
    // Extract location from incident or AI analysis
    let locationName = null;

    if (aiAnalysis?.locations?.length > 0) {
      locationName = aiAnalysis.locations[0].name;
    } else if (incident.asset?.name) {
      locationName = incident.asset.name;
    } else {
      // Try to extract from narrative
      locationName = this.extractLocationFromText(incident.incident?.narrative || '');
    }

    if (!locationName) return incident;

    // Geocode the location
    const geocoded = await this.geocode(locationName);

    if (geocoded) {
      // Enrich incident with geocoded data
      incident.location = {
        ...incident.location,
        geocoded: {
          lat: geocoded.lat,
          lon: geocoded.lon,
          confidence: geocoded.confidence,
          source: geocoded.source
        }
      };

      // Find nearby infrastructure
      incident.nearby_infrastructure = await this.findNearbyInfrastructure(
        geocoded.lat,
        geocoded.lon,
        10000 // 10km radius
      );
    }

    return incident;
  }

  extractLocationFromText(text) {
    // Simple extraction for known patterns
    const patterns = [
      /(?:at|near|in|over)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:airport|harbour|port|base)/i,
      /(?:city of|town of)\s+([A-Z][a-z]+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  async findNearbyInfrastructure(lat, lon, radiusMeters = 10000) {
    const nearby = {
      airports: [],
      harbours: [],
      military: []
    };

    // Calculate distances to airports
    if (this.airports) {
      this.airports.forEach(airport => {
        const distance = this.calculateDistance(lat, lon, airport.lat, airport.lon);
        if (distance <= radiusMeters) {
          nearby.airports.push({
            ...airport,
            distance_m: Math.round(distance)
          });
        }
      });
      nearby.airports.sort((a, b) => a.distance_m - b.distance_m);
    }

    // Calculate distances to harbours
    if (this.harbours) {
      this.harbours.forEach(harbour => {
        const distance = this.calculateDistance(lat, lon, harbour.lat, harbour.lon);
        if (distance <= radiusMeters) {
          nearby.harbours.push({
            ...harbour,
            distance_m: Math.round(distance)
          });
        }
      });
      nearby.harbours.sort((a, b) => a.distance_m - b.distance_m);
    }

    // Calculate distances to military bases
    if (this.military) {
      this.military.forEach(base => {
        const distance = this.calculateDistance(lat, lon, base.lat, base.lon);
        if (distance <= radiusMeters) {
          nearby.military.push({
            ...base,
            distance_m: Math.round(distance)
          });
        }
      });
      nearby.military.sort((a, b) => a.distance_m - b.distance_m);
    }

    return nearby;
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    // Haversine formula for distance between two points
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  async batchGeocode(locations, options = {}) {
    console.log(`📍 Batch geocoding ${locations.length} locations...`);
    const results = [];

    for (const location of locations) {
      const result = await this.geocode(location, options);
      results.push(result);

      // Small delay between requests
      if (results.length < locations.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  async loadCache() {
    try {
      const cacheFile = path.join(__dirname, '..', 'cache', 'geocoding.json');
      const cacheData = await fs.readFile(cacheFile, 'utf8');
      const cached = JSON.parse(cacheData);

      // Load valid cache entries
      const now = Date.now();
      let validEntries = 0;

      Object.entries(cached).forEach(([key, value]) => {
        if (now - value.timestamp < this.cacheTimeout) {
          this.cache.set(key, value);
          validEntries++;
        }
      });

      console.log(`  📍 Loaded ${validEntries} cached geocoding results`);
    } catch (error) {
      // Cache file doesn't exist or is invalid
      console.log('  📍 No geocoding cache found');
    }
  }

  async saveCache() {
    try {
      const cacheDir = path.join(__dirname, '..', 'cache');
      await fs.mkdir(cacheDir, { recursive: true });

      const cacheData = {};
      for (const [key, value] of this.cache) {
        cacheData[key] = value;
      }

      await fs.writeFile(
        path.join(cacheDir, 'geocoding.json'),
        JSON.stringify(cacheData, null, 2)
      );

      console.log(`💾 Saved ${this.cache.size} geocoding results to cache`);
    } catch (error) {
      console.error('Failed to save geocoding cache:', error);
    }
  }

  getStats() {
    return {
      cacheSize: this.cache.size,
      knownLocations: this.knownLocations.size,
      airports: this.airports?.length || 0,
      harbours: this.harbours?.length || 0,
      military: this.military?.length || 0,
      providers: {
        nominatim: { available: true },
        opencage: { available: !!this.providers.opencage.apiKey }
      }
    };
  }
}
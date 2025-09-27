# geo-intelligence-analyst Agent

## Purpose
Analyze geospatial relationships, calculate proximity to critical infrastructure, and provide risk assessment based on location intelligence.

## Activation Triggers
- **Automatic**: Geolocation operations, proximity calculations, infrastructure analysis
- **Manual**: `--agent geo-intelligence-analyst`
- **Keywords**: "proximity", "location", "infrastructure", "coordinates", "distance", "risk radius"
- **Parallel**: Works with incident-validator and scraper-orchestrator

## Core Responsibilities

### 1. Infrastructure Proximity Analysis
```javascript
class GeoIntelligenceAnalyst {
  constructor() {
    this.infrastructure = {
      airports: null,      // 3,632 airports
      harbours: null,      // 14,217 harbours
      military: null,      // Military installations
      cities: null,        // Major population centers
      critical: null       // Power plants, dams, etc.
    };

    this.spatialIndex = {
      airports: null,
      harbours: null,
      military: null
    };

    this.riskZones = new Map();
    this.noFlyZones = new Map();

    this.loadInfrastructure();
    this.buildSpatialIndices();
  }

  async loadInfrastructure() {
    // Load GeoJSON files
    this.infrastructure.airports = await this.loadGeoJSON('data/assets/airports_wikidata.geojson');
    this.infrastructure.harbours = await this.loadGeoJSON('data/assets/harbours.geojson');
    this.infrastructure.military = await this.loadGeoJSON('data/assets/military.geojson');

    // Parse and index
    this.processInfrastructure();
  }

  buildSpatialIndices() {
    // Use KD-tree for efficient nearest neighbor searches
    const KDBush = require('kdbush');

    // Build index for airports
    const airportPoints = this.infrastructure.airports.features.map(f => ({
      lon: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
      properties: f.properties
    }));

    this.spatialIndex.airports = new KDBush(
      airportPoints,
      p => p.lon,
      p => p.lat
    );

    // Similar for harbours and military
    this.buildHarbourIndex();
    this.buildMilitaryIndex();
  }

  findNearestInfrastructure(lat, lon, options = {}) {
    const results = {
      airports: [],
      harbours: [],
      military: [],
      critical: []
    };

    const maxDistance = options.radius || 50000; // 50km default
    const types = options.types || ['airports', 'harbours', 'military'];

    for (const type of types) {
      if (!this.spatialIndex[type]) continue;

      // Find all infrastructure within radius
      const nearby = this.spatialIndex[type].within(lon, lat, maxDistance);

      for (const idx of nearby) {
        const point = this.infrastructure[type].features[idx];
        const distance = this.haversineDistance(
          lat, lon,
          point.geometry.coordinates[1],
          point.geometry.coordinates[0]
        );

        results[type].push({
          type,
          name: point.properties.name,
          distance,
          bearing: this.calculateBearing(lat, lon, point.geometry.coordinates[1], point.geometry.coordinates[0]),
          properties: point.properties,
          riskLevel: this.assessRiskLevel(type, distance)
        });
      }

      // Sort by distance
      results[type].sort((a, b) => a.distance - b.distance);
    }

    return {
      nearest: this.findAbsoluteNearest(results),
      byType: results,
      riskAssessment: this.calculateOverallRisk(results)
    };
  }

  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  calculateBearing(lat1, lon1, lat2, lon2) {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) -
              Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const θ = Math.atan2(y, x);

    return (θ * 180 / Math.PI + 360) % 360;
  }
}
```

### 2. Risk Zone Calculation
```javascript
class RiskZoneCalculator {
  calculateRiskZones(incident) {
    const zones = {
      immediate: {
        radius: 1000,  // 1km
        level: 'critical',
        color: '#dc2626',
        restrictions: ['no-fly', 'evacuate']
      },
      high: {
        radius: 5000,  // 5km
        level: 'high',
        color: '#ea580c',
        restrictions: ['restricted-airspace', 'caution']
      },
      medium: {
        radius: 10000, // 10km
        level: 'medium',
        color: '#d97706',
        restrictions: ['monitor']
      },
      low: {
        radius: 25000, // 25km
        level: 'low',
        color: '#16a34a',
        restrictions: ['awareness']
      }
    };

    // Adjust zones based on incident type and infrastructure
    if (incident.asset.type === 'airport') {
      zones.immediate.radius = 2000;
      zones.high.radius = 8000;
    } else if (incident.asset.type === 'military') {
      zones.immediate.radius = 3000;
      zones.high.radius = 10000;
    }

    // Adjust for incident severity
    const severityMultiplier = incident.scores.severity / 10;
    Object.keys(zones).forEach(zone => {
      zones[zone].radius *= (1 + severityMultiplier * 0.2);
    });

    return zones;
  }

  generateRiskPolygons(center, zones) {
    const polygons = {};

    Object.entries(zones).forEach(([name, zone]) => {
      polygons[name] = this.createCirclePolygon(
        center.lat,
        center.lon,
        zone.radius,
        64 // number of points
      );
    });

    return polygons;
  }

  createCirclePolygon(lat, lon, radius, points = 32) {
    const coords = [];
    const angleStep = (2 * Math.PI) / points;

    for (let i = 0; i <= points; i++) {
      const angle = i * angleStep;
      const dx = radius * Math.cos(angle);
      const dy = radius * Math.sin(angle);

      // Convert meters to degrees (approximate)
      const dLat = dy / 111320;
      const dLon = dx / (111320 * Math.cos(lat * Math.PI / 180));

      coords.push([lon + dLon, lat + dLat]);
    }

    return {
      type: 'Polygon',
      coordinates: [coords]
    };
  }
}
```

### 3. Geospatial Clustering
```javascript
class GeospatialClusterer {
  clusterIncidents(incidents, options = {}) {
    const clusters = [];
    const visited = new Set();

    const eps = options.radius || 5000; // 5km radius for clustering
    const minPts = options.minPoints || 3;

    // DBSCAN clustering algorithm
    for (let i = 0; i < incidents.length; i++) {
      if (visited.has(i)) continue;

      visited.add(i);
      const neighbors = this.getNeighbors(incidents, i, eps);

      if (neighbors.length < minPts) {
        // Noise point
        continue;
      }

      // Start new cluster
      const cluster = {
        id: `cluster-${clusters.length}`,
        incidents: [incidents[i]],
        center: null,
        radius: 0,
        severity: 0
      };

      // Expand cluster
      const seeds = [...neighbors];
      while (seeds.length > 0) {
        const j = seeds.shift();

        if (!visited.has(j)) {
          visited.add(j);
          const neighborNeighbors = this.getNeighbors(incidents, j, eps);

          if (neighborNeighbors.length >= minPts) {
            seeds.push(...neighborNeighbors);
          }
        }

        cluster.incidents.push(incidents[j]);
      }

      // Calculate cluster properties
      this.calculateClusterProperties(cluster);
      clusters.push(cluster);
    }

    return clusters;
  }

  getNeighbors(incidents, index, radius) {
    const neighbors = [];
    const point = incidents[index];

    for (let i = 0; i < incidents.length; i++) {
      if (i === index) continue;

      const distance = this.haversineDistance(
        point.asset.lat, point.asset.lon,
        incidents[i].asset.lat, incidents[i].asset.lon
      );

      if (distance <= radius) {
        neighbors.push(i);
      }
    }

    return neighbors;
  }

  calculateClusterProperties(cluster) {
    // Find centroid
    const lats = cluster.incidents.map(i => i.asset.lat);
    const lons = cluster.incidents.map(i => i.asset.lon);

    cluster.center = {
      lat: lats.reduce((a, b) => a + b) / lats.length,
      lon: lons.reduce((a, b) => a + b) / lons.length
    };

    // Calculate radius (max distance from center)
    cluster.radius = Math.max(...cluster.incidents.map(incident =>
      this.haversineDistance(
        cluster.center.lat, cluster.center.lon,
        incident.asset.lat, incident.asset.lon
      )
    ));

    // Calculate average severity
    cluster.severity = cluster.incidents.reduce((sum, i) =>
      sum + i.scores.severity, 0
    ) / cluster.incidents.length;

    // Identify affected infrastructure
    cluster.affectedInfrastructure = this.identifyAffectedInfrastructure(cluster);
  }
}
```

### 4. Flight Path Analysis
```javascript
class FlightPathAnalyzer {
  analyzeFlightPaths(incident) {
    // Get nearby airports
    const nearbyAirports = this.findNearbyAirports(
      incident.asset.lat,
      incident.asset.lon,
      100000 // 100km
    );

    const affectedPaths = [];

    for (const airport of nearbyAirports) {
      // Check if incident is near approach/departure paths
      const paths = this.getFlightPaths(airport);

      for (const path of paths) {
        const distance = this.distanceToPath(
          incident.asset.lat,
          incident.asset.lon,
          path
        );

        if (distance < 5000) { // Within 5km of flight path
          affectedPaths.push({
            airport: airport.name,
            iata: airport.iata,
            path: path.name,
            distance,
            risk: this.assessPathRisk(distance, incident.scores.severity)
          });
        }
      }
    }

    return affectedPaths;
  }

  getFlightPaths(airport) {
    // Simplified approach paths (would use real data in production)
    const runways = airport.properties.runways || [];
    const paths = [];

    for (const runway of runways) {
      // Approach path extends 10km from runway
      paths.push({
        name: `${runway.name} Approach`,
        start: runway.threshold,
        end: this.extendPoint(runway.threshold, runway.heading, 10000),
        width: 2000 // 2km corridor width
      });

      // Departure path
      paths.push({
        name: `${runway.name} Departure`,
        start: runway.end,
        end: this.extendPoint(runway.end, runway.heading + 180, 10000),
        width: 2000
      });
    }

    return paths;
  }

  distanceToPath(lat, lon, path) {
    // Calculate perpendicular distance to line segment
    const A = path.start;
    const B = path.end;
    const P = { lat, lon };

    const AP = { lat: P.lat - A.lat, lon: P.lon - A.lon };
    const AB = { lat: B.lat - A.lat, lon: B.lon - A.lon };

    const ab2 = AB.lat * AB.lat + AB.lon * AB.lon;
    const ap_ab = AP.lat * AB.lat + AP.lon * AB.lon;

    let t = ap_ab / ab2;
    t = Math.max(0, Math.min(1, t)); // Clamp to [0, 1]

    const closest = {
      lat: A.lat + t * AB.lat,
      lon: A.lon + t * AB.lon
    };

    return this.haversineDistance(lat, lon, closest.lat, closest.lon);
  }
}
```

### 5. Weather Integration
```javascript
class WeatherIntelligence {
  async getWeatherContext(lat, lon) {
    const weather = await this.fetchWeatherData(lat, lon);

    return {
      conditions: weather.current,
      visibility: weather.visibility,
      windSpeed: weather.wind.speed,
      windDirection: weather.wind.direction,
      cloudCeiling: weather.clouds.height,
      precipitation: weather.precipitation,
      droneRisk: this.calculateDroneRisk(weather)
    };
  }

  calculateDroneRisk(weather) {
    let risk = 0;

    // Wind speed impact
    if (weather.wind.speed > 40) risk += 3;
    else if (weather.wind.speed > 25) risk += 2;
    else if (weather.wind.speed > 15) risk += 1;

    // Visibility impact
    if (weather.visibility < 1000) risk += 3;
    else if (weather.visibility < 5000) risk += 2;
    else if (weather.visibility < 10000) risk += 1;

    // Precipitation
    if (weather.precipitation.intensity === 'heavy') risk += 2;
    else if (weather.precipitation.intensity === 'moderate') risk += 1;

    // Temperature extremes
    if (weather.temperature < -10 || weather.temperature > 40) risk += 1;

    return {
      score: Math.min(10, risk),
      factors: this.explainRiskFactors(weather, risk)
    };
  }
}
```

### 6. Territory & Airspace Analysis
```javascript
class AirspaceAnalyzer {
  async analyzeAirspace(lat, lon, altitude = 0) {
    const airspace = {
      class: null,          // A, B, C, D, E, F, G
      restrictions: [],     // No-fly zones, restricted areas
      controlling: null,    // ATC facility
      altitude_limits: {},  // Floor and ceiling
      special_use: []       // Military, danger, prohibited areas
    };

    // Check airspace class
    airspace.class = await this.getAirspaceClass(lat, lon, altitude);

    // Check for special use airspace
    const specialUse = await this.checkSpecialUseAirspace(lat, lon);
    if (specialUse.length > 0) {
      airspace.special_use = specialUse;
      airspace.restrictions.push(...specialUse.map(s => s.restriction));
    }

    // Check NOTAMs (Notice to Airmen)
    const notams = await this.checkNOTAMs(lat, lon);
    airspace.restrictions.push(...notams);

    // Determine controlling authority
    airspace.controlling = this.getControllingAuthority(lat, lon, airspace.class);

    // Risk assessment
    airspace.risk = this.assessAirspaceRisk(airspace);

    return airspace;
  }

  checkSpecialUseAirspace(lat, lon) {
    const specialAreas = [];

    // Check military zones
    for (const zone of this.militaryZones) {
      if (this.isPointInPolygon(lat, lon, zone.boundary)) {
        specialAreas.push({
          type: 'military',
          name: zone.name,
          restriction: 'prohibited',
          authority: zone.authority
        });
      }
    }

    // Check danger areas
    for (const area of this.dangerAreas) {
      if (this.isPointInPolygon(lat, lon, area.boundary)) {
        specialAreas.push({
          type: 'danger',
          name: area.name,
          restriction: 'restricted',
          active_times: area.times
        });
      }
    }

    return specialAreas;
  }
}
```

## Integration Points

### Files to Monitor
- `data/assets/*.geojson` - Infrastructure data files
- `automation/geo-intelligence.js` - Existing geo functions
- `automation/incident-generator.js` - Location enrichment
- `index.html` - Map visualization

### APIs to Integrate
```javascript
const GEO_APIS = {
  nominatim: 'https://nominatim.openstreetmap.org',
  geonames: 'https://api.geonames.org',
  airspace: 'https://api.airmap.com',
  weather: 'https://api.openweathermap.org'
};
```

## Performance Optimization

### Spatial Indexing
```javascript
// Use R-tree for complex polygons
const RBush = require('rbush');

class SpatialIndex {
  constructor() {
    this.tree = new RBush();
  }

  indexInfrastructure(features) {
    const items = features.map(f => ({
      minX: f.bbox[0],
      minY: f.bbox[1],
      maxX: f.bbox[2],
      maxY: f.bbox[3],
      data: f
    }));

    this.tree.load(items);
  }

  search(bbox) {
    return this.tree.search({
      minX: bbox[0],
      minY: bbox[1],
      maxX: bbox[2],
      maxY: bbox[3]
    });
  }
}
```

### Caching Strategy
```javascript
const CACHE_TTL = {
  infrastructure: 7 * 24 * 60 * 60 * 1000, // 7 days
  weather: 10 * 60 * 1000,                 // 10 minutes
  airspace: 60 * 60 * 1000,                // 1 hour
  geocoding: 30 * 24 * 60 * 60 * 1000      // 30 days
};
```

## Testing Requirements

### Unit Tests
```javascript
describe('GeoIntelligenceAnalyst', () => {
  test('calculates distance correctly', () => {
    const distance = analyst.haversineDistance(
      52.5200, 13.4050, // Berlin
      48.8566, 2.3522   // Paris
    );
    expect(Math.round(distance)).toBe(878000); // ~878km
  });

  test('finds nearest infrastructure', () => {
    const nearest = analyst.findNearestInfrastructure(50.0264, 8.5431);
    expect(nearest.nearest.type).toBe('airport');
    expect(nearest.nearest.name).toContain('Frankfurt');
  });

  test('identifies risk zones correctly', () => {
    const zones = analyst.calculateRiskZones(incident);
    expect(zones.immediate.radius).toBeGreaterThan(0);
  });
});
```

## Monitoring Metrics

- Infrastructure query time < 50ms
- Geocoding cache hit rate > 90%
- Spatial index memory < 100MB
- Weather API success rate > 95%

## Parallel Coordination

Works in parallel with:
- **incident-validator**: Validates location data
- **scraper-orchestrator**: Enriches scraped incidents with location data
- **realtime-coordinator**: Provides location context for broadcasts
- **performance-monitor**: Optimizes geospatial calculations
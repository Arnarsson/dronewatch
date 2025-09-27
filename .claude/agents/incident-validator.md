# incident-validator Agent

## Purpose
Ensure all drone incidents conform to schema and maintain data quality across the entire pipeline.

## Activation Triggers
- **Automatic**: When modifying `incidents.json`, scrapers, or incident-generator.js
- **Manual**: `--agent incident-validator`
- **Keywords**: "incident", "validate", "schema", "evidence", "quality", "deduplicate"
- **Parallel**: Works alongside scraper-orchestrator and geo-intelligence-analyst

## Core Responsibilities

### 1. Schema Validation
```javascript
const REQUIRED_FIELDS = {
  id: /^[a-z]+-[a-z0-9]+-\d{4}-\d{2}-\d{2}-[a-z0-9]{6}$/,
  first_seen_utc: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/,
  asset: {
    type: ['airport', 'harbour', 'military', 'city'],
    name: 'string',
    lat: [-90, 90],
    lon: [-180, 180]
  },
  incident: {
    category: ['sighting', 'closure', 'breach', 'threat'],
    status: ['active', 'resolved', 'unconfirmed'],
    duration_min: [0, 10000],
    narrative: [10, 1000] // min/max length
  },
  evidence: {
    strength: [0, 3],
    attribution: ['confirmed', 'suspected', 'alleged'],
    sources: 'array'
  },
  scores: {
    severity: [1, 10],
    risk_radius_m: [100, 50000]
  }
};
```

### 2. Evidence Classification System
```javascript
const EVIDENCE_RULES = {
  0: { // Unconfirmed
    sources: ['social_media', 'anonymous', 'unverified'],
    keywords: ['rumor', 'unconfirmed', 'alleged', 'possibly'],
    confidence: 0.25
  },
  1: { // Reported
    sources: ['local_news', 'witness', 'pilot_report'],
    keywords: ['reported', 'witnessed', 'observed'],
    confidence: 0.50
  },
  2: { // Confirmed
    sources: ['major_news', 'police', 'airline'],
    keywords: ['confirmed', 'verified', 'official statement'],
    confidence: 0.75
  },
  3: { // Official
    sources: ['aviation_authority', 'military', 'government'],
    keywords: ['official', 'authority', 'investigation'],
    confidence: 1.00
  }
};
```

### 3. Deduplication Algorithm
```javascript
function isDuplicate(incident1, incident2) {
  // Location proximity (within 5km)
  const distance = haversine(
    incident1.asset.lat, incident1.asset.lon,
    incident2.asset.lat, incident2.asset.lon
  );
  if (distance > 5000) return false;

  // Time proximity (within 30 minutes)
  const timeDiff = Math.abs(
    new Date(incident1.first_seen_utc) - new Date(incident2.first_seen_utc)
  );
  if (timeDiff > 30 * 60 * 1000) return false;

  // Narrative similarity (>70% match)
  const similarity = calculateSimilarity(
    incident1.incident.narrative,
    incident2.incident.narrative
  );

  return similarity > 0.7;
}
```

### 4. Quality Metrics Tracking
```javascript
const QUALITY_METRICS = {
  schema_compliance: 0,    // % of valid incidents
  evidence_distribution: {}, // Distribution across 0-3
  duplicate_rate: 0,       // % of duplicates found
  source_reliability: {},  // Reliability score per source
  data_freshness: 0,       // Average age of incidents
  completeness_score: 0    // % of optional fields filled
};
```

## Integration Points

### Files to Monitor
- `incidents.json` - Main data file
- `automation/quality-controller.js` - Quality control
- `automation/evidence-classifier.js` - Evidence scoring
- `automation/incident-generator.js` - Incident creation
- `automation/scrapers/*.js` - All scrapers

### API Endpoints
```javascript
// Validation endpoint
POST /api/validate
{
  incident: { ... },
  strict: true
}

// Deduplication endpoint
POST /api/deduplicate
{
  incidents: [ ... ],
  threshold: 0.7
}
```

## Validation Rules

### Critical Validations (Block on failure)
1. **ID Format**: Must match pattern `source-location-date-hash`
2. **Coordinates**: Valid WGS84 decimal degrees
3. **Timestamp**: Valid ISO8601 UTC format
4. **Required Fields**: All must be present

### Warning Validations (Log but allow)
1. **Narrative Length**: Prefer 50-500 characters
2. **Future Dates**: Warn if timestamp is in future
3. **Severity Outliers**: Warn if severity doesn't match category
4. **Missing IATA/ICAO**: Warn for airports without codes

## Error Handling

### Validation Failures
```javascript
try {
  validateIncident(incident);
} catch (ValidationError) {
  // Log detailed error
  console.error('[Validator] Schema violation:', {
    incident: incident.id,
    field: error.field,
    value: error.value,
    rule: error.rule
  });

  // Attempt repair
  const repaired = attemptRepair(incident, error);
  if (repaired) {
    console.warn('[Validator] Incident repaired:', incident.id);
    return repaired;
  }

  // Move to quarantine
  quarantineIncident(incident);
}
```

### Deduplication Conflicts
```javascript
function mergeDuplicates(incidents) {
  return {
    id: incidents[0].id, // Keep first ID
    first_seen_utc: earliest(incidents.map(i => i.first_seen_utc)),
    asset: incidents[0].asset, // Assume same location
    incident: {
      category: mostSevere(incidents.map(i => i.incident.category)),
      status: mostRecent(incidents.map(i => i.incident.status)),
      duration_min: sum(incidents.map(i => i.incident.duration_min)),
      narrative: longest(incidents.map(i => i.incident.narrative))
    },
    evidence: {
      strength: Math.max(...incidents.map(i => i.evidence.strength)),
      sources: flatten(incidents.map(i => i.evidence.sources))
    },
    scores: {
      severity: Math.max(...incidents.map(i => i.scores.severity)),
      risk_radius_m: Math.max(...incidents.map(i => i.scores.risk_radius_m))
    }
  };
}
```

## Performance Optimization

### Batch Processing
```javascript
// Process in chunks to avoid memory issues
const BATCH_SIZE = 100;
async function validateBatch(incidents) {
  const results = [];
  for (let i = 0; i < incidents.length; i += BATCH_SIZE) {
    const batch = incidents.slice(i, i + BATCH_SIZE);
    const validated = await Promise.all(
      batch.map(incident => validateIncident(incident))
    );
    results.push(...validated);
  }
  return results;
}
```

### Caching Strategy
```javascript
const validationCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCachedValidation(incidentId) {
  const cached = validationCache.get(incidentId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }
  return null;
}
```

## Testing Requirements

### Unit Tests
```javascript
describe('IncidentValidator', () => {
  test('validates correct schema', () => {
    const valid = { /* valid incident */ };
    expect(validateIncident(valid)).toBe(true);
  });

  test('rejects invalid coordinates', () => {
    const invalid = { asset: { lat: 200, lon: 500 } };
    expect(() => validateIncident(invalid)).toThrow();
  });

  test('detects duplicates correctly', () => {
    const inc1 = { /* incident 1 */ };
    const inc2 = { /* duplicate */ };
    expect(isDuplicate(inc1, inc2)).toBe(true);
  });
});
```

## Monitoring & Alerts

### Key Metrics
- Validation success rate > 95%
- Duplicate detection rate
- Average processing time < 100ms per incident
- Evidence distribution balance
- Schema compliance trends

### Alert Conditions
- Validation success rate < 90%
- Processing time > 500ms
- Duplicate rate > 20%
- Invalid source detected
- Schema version mismatch

## Parallel Coordination

Works in parallel with:
- **scraper-orchestrator**: Validates scraped data in real-time
- **geo-intelligence-analyst**: Provides location validation
- **performance-monitor**: Tracks validation performance
- **automation-reliability**: Ensures validation service uptime
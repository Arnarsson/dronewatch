#!/usr/bin/env node

import fs from 'fs/promises';

// Correct Danish airport coordinates
const DANISH_AIRPORTS = {
  'Copenhagen': {
    name: 'Copenhagen Airport',
    iata: 'CPH',
    icao: 'EKCH',
    lat: 55.6181,
    lon: 12.6561,
    country: 'Denmark'
  },
  'Aalborg': {
    name: 'Aalborg Airport',
    iata: 'AAL',
    icao: 'EKYT',
    lat: 57.0928,
    lon: 9.8492,
    country: 'Denmark'
  },
  'Billund': {
    name: 'Billund Airport',
    iata: 'BLL',
    icao: 'EKBI',
    lat: 55.7403,
    lon: 9.1522,
    country: 'Denmark'
  },
  'Karup': {
    name: 'Karup Air Base',
    iata: null,
    icao: 'EKKA',
    lat: 56.2975,
    lon: 9.1247,
    country: 'Denmark'
  }
};

async function fixDenmarkLocations() {
  console.log('🔧 Fixing Denmark incident locations...\n');

  // Read current incidents
  const data = JSON.parse(await fs.readFile('./incidents.json', 'utf-8'));
  let fixedCount = 0;

  // Process each incident
  data.incidents = data.incidents.map(incident => {
    const narrative = incident.incident?.narrative || '';
    const title = incident.evidence?.sources?.[0]?.title || '';
    const snippet = incident.evidence?.sources?.[0]?.snippet || '';
    const combinedText = `${narrative} ${title} ${snippet}`.toLowerCase();

    // Check if this is a Denmark incident that needs fixing
    if (combinedText.includes('denmark') ||
        combinedText.includes('danish') ||
        combinedText.includes('copenhagen') ||
        combinedText.includes('aalborg') ||
        combinedText.includes('billund') ||
        combinedText.includes('karup')) {

      // Determine which Danish location this should be
      let location = DANISH_AIRPORTS.Copenhagen; // Default to Copenhagen

      if (combinedText.includes('aalborg')) {
        location = DANISH_AIRPORTS.Aalborg;
        console.log(`✓ Fixed: ${incident.id} → Aalborg Airport`);
      } else if (combinedText.includes('billund')) {
        location = DANISH_AIRPORTS.Billund;
        console.log(`✓ Fixed: ${incident.id} → Billund Airport`);
      } else if (combinedText.includes('karup') || combinedText.includes('military base')) {
        location = DANISH_AIRPORTS.Karup;
        console.log(`✓ Fixed: ${incident.id} → Karup Air Base`);
      } else if (combinedText.includes('copenhagen')) {
        location = DANISH_AIRPORTS.Copenhagen;
        console.log(`✓ Fixed: ${incident.id} → Copenhagen Airport`);
      } else {
        // Generic Denmark mention - use Copenhagen as capital
        console.log(`✓ Fixed: ${incident.id} → Copenhagen Airport (default)`);
      }

      // Update the asset information
      incident.asset = {
        ...incident.asset,
        type: location.name.includes('Base') ? 'military' : 'airport',
        name: location.name,
        iata: location.iata,
        icao: location.icao,
        lat: location.lat,
        lon: location.lon,
        country: location.country
      };

      fixedCount++;
    }

    return incident;
  });

  // Save the fixed data
  await fs.writeFile('./incidents.json', JSON.stringify(data, null, 2));
  console.log(`\n✅ Fixed ${fixedCount} Denmark incidents`);

  // Also update public/incidents.json
  await fs.writeFile('./public/incidents.json', JSON.stringify(data, null, 2));
  console.log('✅ Updated public/incidents.json as well');
}

// Run the fix
fixDenmarkLocations().catch(console.error);
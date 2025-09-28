#!/usr/bin/env node

/**
 * Selective cleaning - removes only obvious non-incidents
 * Keeps real airport/airspace incidents
 */

import fs from 'fs/promises';

const NON_INCIDENT_IDS = [
  'reddit-1nrfifj-eham',  // DJI lawsuit
  'reddit-1nrluce-eddm',  // Wiki/Sidebar rework
  'rss-lfmn-2025-09-26-xuoqdc', // Rural Iceland drone services
  'rss-lyni-2025-09-25-3t3nvk', // Mission commander policy
  'rss-lgav-2025-09-26-ypwwuk', // Hungarian spy drones (military ops)
  'rss-lfmn-2025-09-25-ypww2v', // Ukraine military strikes
  'rss-port-2025-09-24-ypwvfo'  // Ukraine Black Sea military
];

// These are actually about Denmark incidents but have wrong locations
const NEEDS_LOCATION_FIX = {
  'rss-lyni-2025-09-27-g4d6l3': { // Denmark military base -> fix to Aalborg
    name: 'Aalborg Airport',
    iata: 'AAL',
    icao: 'EKYT',
    lat: 57.0928,
    lon: 9.8492,
    country: 'Denmark'
  },
  'rss-lgir-2025-09-26-7mvojq': { // Denmark flights grounded -> fix to Copenhagen
    name: 'Copenhagen Airport',
    iata: 'CPH',
    icao: 'EKCH',
    lat: 55.6181,
    lon: 12.6561,
    country: 'Denmark'
  },
  'rss-lgir-2025-09-25-amrkw9': { // Danish airports -> fix to Copenhagen
    name: 'Copenhagen Airport',
    iata: 'CPH',
    icao: 'EKCH',
    lat: 55.6181,
    lon: 12.6561,
    country: 'Denmark'
  },
  'rss-lgir-2025-09-23-d8w3fv': { // Copenhagen and Oslo -> fix to Copenhagen
    name: 'Copenhagen Airport',
    iata: 'CPH',
    icao: 'EKCH',
    lat: 55.6181,
    lon: 12.6561,
    country: 'Denmark'
  }
};

async function selectiveClean() {
  console.log('🧹 Selective cleaning of incidents.json...\n');

  // Read current data
  const data = JSON.parse(await fs.readFile('./incidents.json', 'utf-8'));
  const originalCount = data.incidents.length;

  console.log(`Found ${originalCount} incidents to process\n`);

  const keepIncidents = [];
  const removedIncidents = [];

  for (const incident of data.incidents) {
    // Check if it's a non-incident
    if (NON_INCIDENT_IDS.includes(incident.id)) {
      const title = incident.evidence?.sources?.[0]?.title || incident.incident?.narrative || 'Unknown';
      console.log(`❌ Removing non-incident: ${incident.id}`);
      console.log(`   ${title.substring(0, 70)}...`);
      removedIncidents.push(incident);
      continue;
    }

    // Check if needs location fix
    if (NEEDS_LOCATION_FIX[incident.id]) {
      const fix = NEEDS_LOCATION_FIX[incident.id];
      console.log(`📍 Fixing location for: ${incident.id}`);
      console.log(`   ${incident.asset.name} (${incident.asset.country}) -> ${fix.name} (${fix.country})`);

      // Update location
      incident.asset = {
        ...incident.asset,
        ...fix,
        type: 'airport'
      };
    }

    // Keep the incident
    console.log(`✅ Keeping: ${incident.id} - ${incident.incident?.narrative?.substring(0, 50)}...`);
    keepIncidents.push(incident);
  }

  // Update data
  data.incidents = keepIncidents;
  data.metadata = data.metadata || {};
  data.metadata.last_cleaned = new Date().toISOString();
  data.metadata.selective_cleaning = {
    original: originalCount,
    removed: removedIncidents.length,
    kept: keepIncidents.length,
    timestamp: new Date().toISOString()
  };

  // Save
  await fs.writeFile('./incidents.json', JSON.stringify(data, null, 2));
  console.log(`\n✅ Saved cleaned incidents.json`);

  await fs.writeFile('./public/incidents.json', JSON.stringify(data, null, 2));
  console.log('✅ Updated public/incidents.json\n');

  // Summary
  console.log('📊 Summary:');
  console.log(`   Original: ${originalCount} incidents`);
  console.log(`   Removed: ${removedIncidents.length} non-incidents`);
  console.log(`   Kept: ${keepIncidents.length} real incidents`);
  console.log(`   Fixed locations: ${Object.keys(NEEDS_LOCATION_FIX).length} Denmark incidents`);

  // Show what we kept
  console.log('\n🗂️ Remaining incidents by country:');
  const byCountry = {};
  keepIncidents.forEach(i => {
    const country = i.asset.country || 'Unknown';
    byCountry[country] = (byCountry[country] || 0) + 1;
  });
  Object.entries(byCountry).forEach(([country, count]) => {
    console.log(`   ${country}: ${count}`);
  });
}

selectiveClean().catch(console.error);
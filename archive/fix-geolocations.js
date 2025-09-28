#!/usr/bin/env node

/**
 * Fix incorrect geolocations in incidents.json
 * Articles about Denmark are assigned to wrong countries
 */

import fs from 'fs';
import path from 'path';

const incidentsPath = './public/incidents.json';

// Load current incidents
const data = JSON.parse(fs.readFileSync(incidentsPath, 'utf8'));

console.log('🔧 Fixing incorrect geolocations...');
console.log(`📊 Processing ${data.incidents.length} incidents`);

// Define correct locations for Denmark incidents
const denmarkLocations = {
  aalborg: {
    name: "Aalborg Airport",
    iata: "AAL",
    icao: "EKYT",
    lat: 57.0928,
    lon: 9.8492,
    country: "Denmark"
  },
  copenhagen: {
    name: "Copenhagen Airport",
    iata: "CPH",
    icao: "EKCH",
    lat: 55.6181,
    lon: 12.6561,
    country: "Denmark"
  },
  karup: {
    name: "Karup Air Base",
    iata: null,
    icao: "EKKA",
    lat: 56.3075,
    lon: 9.1247,
    country: "Denmark"
  }
};

// Poland location
const polandLocation = {
  warsaw: {
    name: "Warsaw Chopin Airport",
    iata: "WAW",
    icao: "EPWA",
    lat: 52.1657,
    lon: 20.9671,
    country: "Poland"
  }
};

// Norway location (Oslo)
const norwayLocation = {
  oslo: {
    name: "Oslo Airport",
    iata: "OSL",
    icao: "ENGM",
    lat: 60.1939,
    lon: 11.1004,
    country: "Norway"
  }
};

let fixCount = 0;

// Process each incident
data.incidents.forEach(incident => {
  const narrative = incident.incident?.narrative?.toLowerCase() || '';
  const title = incident.evidence?.sources?.[0]?.title?.toLowerCase() || '';
  const combined = narrative + ' ' + title;

  // Fix Denmark incidents
  if (combined.includes('denmark') || combined.includes('danish')) {
    // Determine which Danish location based on content
    let newLocation = denmarkLocations.copenhagen; // Default to Copenhagen

    if (combined.includes('aalborg')) {
      newLocation = denmarkLocations.aalborg;
    } else if (combined.includes('karup') || combined.includes('military base') || combined.includes('f-35')) {
      newLocation = denmarkLocations.karup;
    }

    // Only fix if not already correct
    if (incident.asset.country !== "Denmark") {
      console.log(`  ✅ Fixed: ${incident.asset.name} -> ${newLocation.name}`);
      incident.asset = { ...incident.asset, ...newLocation, type: incident.asset.type || "airport" };
      fixCount++;
    }
  }

  // Fix Poland incidents
  if (combined.includes('poland') || combined.includes('polish')) {
    if (incident.asset.country !== "Poland") {
      console.log(`  ✅ Fixed: ${incident.asset.name} -> ${polandLocation.warsaw.name}`);
      incident.asset = { ...incident.asset, ...polandLocation.warsaw, type: incident.asset.type || "airport" };
      fixCount++;
    }
  }

  // Fix Norway/Oslo incidents
  if (combined.includes('norway') || combined.includes('norwegian') || combined.includes('oslo')) {
    if (incident.asset.country !== "Norway") {
      console.log(`  ✅ Fixed: ${incident.asset.name} -> ${norwayLocation.oslo.name}`);
      incident.asset = { ...incident.asset, ...norwayLocation.oslo, type: incident.asset.type || "airport" };
      fixCount++;
    }
  }

  // Fix Ukraine incidents that mention specific regions
  if (combined.includes('ukraine') || combined.includes('ukrainian')) {
    // These are actually about Ukraine, not random European locations
    if (!incident.asset.country || incident.asset.country !== "Ukraine") {
      // Keep existing coordinates if they're in Ukraine, otherwise use Kyiv
      if (incident.asset.lat < 44 || incident.asset.lat > 52 ||
          incident.asset.lon < 22 || incident.asset.lon > 40) {
        incident.asset = {
          ...incident.asset,
          name: "Kyiv Boryspil Airport",
          iata: "KBP",
          icao: "UKBB",
          lat: 50.3450,
          lon: 30.8947,
          country: "Ukraine",
          type: incident.asset.type || "airport"
        };
        console.log(`  ✅ Fixed Ukraine incident: ${incident.incident.narrative.substring(0, 50)}...`);
        fixCount++;
      }
    }
  }
});

// Also update metadata timestamp
data.generated_utc = new Date().toISOString();

// Save the fixed data
fs.writeFileSync(incidentsPath, JSON.stringify(data, null, 2));

console.log('\n📊 Summary:');
console.log(`  Total incidents: ${data.incidents.length}`);
console.log(`  Fixed locations: ${fixCount}`);

// Show country distribution
const byCountry = {};
data.incidents.forEach(i => {
  const country = i.asset?.country || 'Unknown';
  byCountry[country] = (byCountry[country] || 0) + 1;
});

console.log('\n🌍 Updated Country Distribution:');
Object.entries(byCountry).sort((a, b) => b[1] - a[1]).forEach(([country, count]) => {
  console.log(`  ${country}: ${count} incident${count !== 1 ? 's' : ''}`);
});

console.log('\n✅ Geolocation fixes complete!');
console.log('🌐 Incidents now correctly show Denmark, Poland, and other European countries');
#!/usr/bin/env node

/**
 * Collect REAL incident data - NO SIMULATIONS
 */

import { ComprehensiveAggregator } from './automation/scrapers/comprehensive-aggregator.js';
import fs from 'fs/promises';

async function collectRealData() {
  console.log('🚀 Collecting REAL drone incidents - NO SIMULATIONS\n');

  const aggregator = new ComprehensiveAggregator();

  try {
    // Collect incidents from last 7 days
    console.log('📡 Starting data collection from all sources...\n');
    const result = await aggregator.aggregateAllIncidents(7);

    console.log('\n✅ Collection Complete:');
    console.log(`  Total Raw: ${result.metadata.total_raw}`);
    console.log(`  After Deduplication: ${result.metadata.total_deduplicated}`);
    console.log(`  Final Quality Checked: ${result.incidents.length}`);

    console.log('\n📊 Source Breakdown:');
    Object.entries(result.metadata.source_stats).forEach(([source, count]) => {
      console.log(`  ${source}: ${count} incidents`);
    });

    // Save the REAL data
    const data = {
      generated_utc: new Date().toISOString(),
      data_notice: "REAL INCIDENTS - Collected from verified news sources, NOTAMs, and aviation authorities. NO SIMULATIONS.",
      total_incidents: result.incidents.length,
      active_incidents: result.incidents.filter(i => i.incident?.status === 'active').length,
      verified_incidents: result.incidents.filter(i => i.evidence?.strength >= 2).length,
      incidents: result.incidents,
      metadata: {
        ...result.metadata,
        collection_timestamp: new Date().toISOString(),
        data_quality: "Production - Real incidents only"
      }
    };

    await fs.writeFile('incidents.json', JSON.stringify(data, null, 2));
    console.log(`\n💾 Saved ${result.incidents.length} REAL incidents to incidents.json`);

    // Show some example incidents
    console.log('\n📋 Sample Recent Incidents:');
    result.incidents.slice(0, 3).forEach(incident => {
      console.log(`\n  • ${incident.asset?.name || 'Unknown Location'}`);
      console.log(`    Time: ${new Date(incident.first_seen_utc).toLocaleString()}`);
      console.log(`    Status: ${incident.incident?.status}`);
      console.log(`    Evidence: ${incident.evidence?.strength >= 2 ? '✅ Verified' : '⚠️ Unverified'}`);
      console.log(`    Description: ${incident.incident?.narrative?.substring(0, 100)}...`);
    });

  } catch (error) {
    console.error('❌ Error collecting data:', error);
    console.error('Stack:', error.stack);
  }
}

// Run it
collectRealData().catch(console.error);
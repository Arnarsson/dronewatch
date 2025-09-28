#!/usr/bin/env node

/**
 * Simple runner for incident collection
 */

import { DroneIncidentAutomation } from './automation/index.js';

async function main() {
  console.log('🚀 Starting DroneWatch incident collection...');
  console.log('⏰ Time:', new Date().toISOString());
  console.log('');

  const automation = new DroneIncidentAutomation();

  try {
    // Run collection with force update
    console.log('📡 Collecting from all sources (RSS feeds, Reddit, etc.)...');
    const result = await automation.runOnce({ forceUpdate: true });

    console.log('\n✅ Collection Complete!');
    console.log('═'.repeat(60));

    // Summary statistics
    console.log('\n📊 Collection Summary:');
    console.log('  Total incidents collected:', result.incidents.length);
    console.log('  Data sources:', Object.keys(result.metadata.source_breakdown).join(', '));

    // Group by country
    const byCountry = {};
    result.incidents.forEach(incident => {
      const country = incident.asset?.country || 'Unknown';
      byCountry[country] = (byCountry[country] || 0) + 1;
    });

    console.log('\n🌍 Incidents by Country:');
    const sortedCountries = Object.entries(byCountry).sort((a, b) => b[1] - a[1]);
    sortedCountries.forEach(([country, count]) => {
      console.log(`  ${country.padEnd(20)} ${count} incident${count !== 1 ? 's' : ''}`);
    });

    // Check for specific countries user asked about
    const hasNorway = result.incidents.some(i =>
      i.asset?.country === 'Norway' ||
      i.asset?.name?.includes('Oslo') ||
      i.incident?.narrative?.includes('Norway')
    );

    const hasOtherEuropean = result.incidents.some(i => {
      const country = i.asset?.country || '';
      return ['France', 'Germany', 'Spain', 'Italy', 'Poland', 'Sweden', 'Finland'].includes(country);
    });

    console.log('\n🔍 Coverage Check:');
    console.log(`  Norway incidents: ${hasNorway ? '✅ Found' : '❌ Not found'}`);
    console.log(`  Other European: ${hasOtherEuropean ? '✅ Found' : '❌ Limited'}`);

    // Show some recent incidents
    console.log('\n📰 Recent Incidents (first 5):');
    result.incidents.slice(0, 5).forEach(incident => {
      const narrative = incident.incident.narrative.substring(0, 70);
      const location = `${incident.asset.name}${incident.asset.country ? ', ' + incident.asset.country : ''}`;
      console.log(`  • ${narrative}...`);
      console.log(`    📍 ${location}`);
      console.log('');
    });

    console.log('✅ Data saved to incidents.json');
    console.log('🌐 Open http://localhost:8081 to view the updated map');

  } catch (error) {
    console.error('\n❌ Error during collection:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Set timeout to prevent hanging
const timeout = setTimeout(() => {
  console.log('\n⏱️ Collection timeout reached (2 minutes). Exiting...');
  process.exit(0);
}, 120000);

// Run the collection
main().then(() => {
  clearTimeout(timeout);
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
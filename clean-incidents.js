#!/usr/bin/env node

/**
 * Clean incidents.json by removing non-incidents
 * Uses the IncidentValidator to verify each incident
 */

import fs from 'fs/promises';
import { IncidentValidator } from './automation/incident-validator.js';

const validator = new IncidentValidator();

async function cleanIncidents() {
  console.log('🧹 Cleaning incidents.json...\n');

  // Read current incidents
  const data = JSON.parse(await fs.readFile('./incidents.json', 'utf-8'));
  const originalCount = data.incidents.length;

  console.log(`Found ${originalCount} incidents to validate\n`);

  // Filter out non-incidents
  const validIncidents = [];
  const removedIncidents = [];

  for (const incident of data.incidents) {
    // Construct article-like object for validation
    const articleData = {
      title: incident.evidence?.sources?.[0]?.title || incident.incident?.narrative || '',
      description: incident.evidence?.sources?.[0]?.snippet || incident.incident?.narrative || '',
      snippet: incident.incident?.narrative || ''
    };

    // Quick check for obvious non-incidents
    const quickPass = validator.quickFilter(articleData.title);

    if (!quickPass) {
      console.log(`❌ Removing (quick filter): ${incident.id}`);
      console.log(`   Title: ${articleData.title.substring(0, 80)}...`);
      removedIncidents.push(incident);
      continue;
    }

    // Full validation
    const validation = validator.validate(articleData);

    if (!validation.isValid || validation.confidence < 50) {
      console.log(`❌ Removing (${validation.confidence}% confidence): ${incident.id}`);
      console.log(`   Reason: ${validation.reason}`);
      console.log(`   Title: ${articleData.title.substring(0, 80)}...`);
      removedIncidents.push(incident);
    } else {
      console.log(`✅ Keeping (${validation.confidence}% confidence): ${incident.id}`);
      validIncidents.push(incident);
    }
  }

  // Update the data
  data.incidents = validIncidents;
  data.metadata = data.metadata || {};
  data.metadata.last_cleaned = new Date().toISOString();
  data.metadata.cleaning_stats = {
    original_count: originalCount,
    removed_count: removedIncidents.length,
    kept_count: validIncidents.length,
    cleaning_timestamp: new Date().toISOString()
  };

  // Save cleaned data
  await fs.writeFile('./incidents.json', JSON.stringify(data, null, 2));
  console.log(`\n✅ Saved cleaned incidents.json`);

  // Also update public/incidents.json
  await fs.writeFile('./public/incidents.json', JSON.stringify(data, null, 2));
  console.log('✅ Updated public/incidents.json\n');

  // Summary
  console.log('📊 Summary:');
  console.log(`   Original incidents: ${originalCount}`);
  console.log(`   Removed: ${removedIncidents.length}`);
  console.log(`   Remaining: ${validIncidents.length}`);

  if (removedIncidents.length > 0) {
    console.log('\n🗑️ Removed incidents:');
    for (const incident of removedIncidents) {
      const title = incident.evidence?.sources?.[0]?.title || incident.incident?.narrative || 'Unknown';
      console.log(`   - ${incident.id}: ${title.substring(0, 60)}...`);
    }
  }
}

// Run the cleanup
cleanIncidents().catch(console.error);
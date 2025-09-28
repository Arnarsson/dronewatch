#!/usr/bin/env node

// Realistic Incident Status Classification System
const fs = require('fs');
const path = require('path');

function classifyIncidentStatus(incident) {
  const now = new Date();
  const incidentTime = new Date(incident.first_seen_utc);
  const hoursElapsed = (now - incidentTime) / (1000 * 60 * 60);

  // Extract incident details
  const category = incident.incident?.category || 'unknown';
  const severity = incident.scores?.severity || 5;
  const narrative = incident.incident?.narrative || '';
  const isBreachOrAttack = ['breach', 'attack'].includes(category);
  const isClosure = category === 'closure';
  const hasResolutionKeywords = /resolved|investigation.*completed|cleared|reopened|resumed/i.test(narrative);

  // Classification Logic

  // 1. ACTIVE: Recent critical incidents or ongoing situations
  if (hoursElapsed <= 6 && (severity >= 8 || isBreachOrAttack)) {
    return 'active';
  }

  // 2. ACTIVE: Very recent incidents (last 3 hours) regardless of severity
  if (hoursElapsed <= 3) {
    return 'active';
  }

  // 3. MONITORING: Recent medium severity or ongoing surveillance
  if (hoursElapsed <= 12 && severity >= 6 && !hasResolutionKeywords) {
    return 'monitoring';
  }

  // 4. RESOLVED: Clear resolution indicators
  if (hasResolutionKeywords || incident.incident?.duration_min > 0) {
    return 'resolved';
  }

  // 5. RESOLVED: Airport closures that are old (airports don't stay closed long)
  if (isClosure && hoursElapsed > 8) {
    return 'resolved';
  }

  // 6. RESOLVED: Old sightings with low-medium severity
  if (hoursElapsed > 24 && severity < 7) {
    return 'resolved';
  }

  // 7. MONITORING: Medium-term significant incidents
  if (hoursElapsed <= 48 && severity >= 7) {
    return 'monitoring';
  }

  // 8. Default: Older incidents are resolved
  return 'resolved';
}

function updateDurationForResolved(incident, newStatus) {
  if (newStatus === 'resolved' && incident.incident.duration_min === 0) {
    // Estimate realistic duration based on category and severity
    const category = incident.incident.category;
    const severity = incident.scores?.severity || 5;

    let baseDuration;
    switch (category) {
      case 'closure':
        baseDuration = 120; // Airport closures average 2 hours
        break;
      case 'breach':
        baseDuration = 180; // Security breaches take longer to resolve
        break;
      case 'attack':
        baseDuration = 45; // Attacks are usually brief but intense
        break;
      case 'sighting':
        baseDuration = 60; // Basic sightings resolved quickly
        break;
      default:
        baseDuration = 90;
    }

    // Adjust for severity
    const severityMultiplier = severity >= 8 ? 1.5 : severity >= 6 ? 1.2 : 1.0;
    const finalDuration = Math.floor(baseDuration * severityMultiplier + (Math.random() * 30 - 15));

    return Math.max(15, finalDuration); // Minimum 15 minutes
  }

  return incident.incident.duration_min;
}

// Load existing incidents
const incidentsPath = path.join(__dirname, 'incidents.json');
let data;
try {
  const fileContent = fs.readFileSync(incidentsPath, 'utf8');
  data = JSON.parse(fileContent);
} catch (e) {
  console.error('Error reading incidents.json:', e.message);
  process.exit(1);
}

console.log('🔄 Updating incident status classification...\n');

// Track changes
let statusChanges = {};
let totalIncidents = data.incidents.length;

// Update each incident
data.incidents.forEach((incident, index) => {
  const oldStatus = incident.incident.status;
  const newStatus = classifyIncidentStatus(incident);
  const newDuration = updateDurationForResolved(incident, newStatus);

  // Update the incident
  incident.incident.status = newStatus;
  incident.incident.duration_min = newDuration;
  incident.last_update_utc = new Date().toISOString();

  // Track changes
  const changeKey = `${oldStatus} → ${newStatus}`;
  statusChanges[changeKey] = (statusChanges[changeKey] || 0) + 1;

  // Log significant changes
  const hoursElapsed = (new Date() - new Date(incident.first_seen_utc)) / (1000 * 60 * 60);
  if (oldStatus !== newStatus) {
    console.log(`📍 ${incident.asset.name}: ${oldStatus} → ${newStatus} (${hoursElapsed.toFixed(1)}h ago, severity ${incident.scores?.severity})`);
  }
});

// Update timestamp
data.generated_utc = new Date().toISOString();

// Save updated data
fs.writeFileSync(incidentsPath, JSON.stringify(data, null, 2));

// Report results
console.log('\n✅ Status classification complete!\n');
console.log('📊 Status Changes:');
Object.entries(statusChanges).forEach(([change, count]) => {
  console.log(`   ${change}: ${count} incidents`);
});

console.log('\n📈 Final Status Distribution:');
const finalCounts = {};
data.incidents.forEach(incident => {
  const status = incident.incident.status;
  finalCounts[status] = (finalCounts[status] || 0) + 1;
});
Object.entries(finalCounts).forEach(([status, count]) => {
  const percentage = ((count / totalIncidents) * 100).toFixed(1);
  console.log(`   ${status}: ${count} incidents (${percentage}%)`);
});

console.log(`\n🎯 Total incidents processed: ${totalIncidents}`);
console.log('💾 Updated incidents.json saved');
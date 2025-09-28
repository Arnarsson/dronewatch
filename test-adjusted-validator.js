#!/usr/bin/env node

/**
 * Test the adjusted validator with sample incidents
 * Ensures we don't over-filter real incidents while still blocking non-incidents
 */

import { IncidentValidator } from './automation/incident-validator.js';

const validator = new IncidentValidator();

// Test cases: mix of real incidents and non-incidents
const testCases = [
  // REAL INCIDENTS (should pass)
  {
    title: "Denmark reports new drone sightings near its biggest military base",
    description: "Unexplained drone flights were reported Saturday over several Danish military sites",
    expected: true,
    type: "Real military incident"
  },
  {
    title: "Drones cause closures at Copenhagen and Oslo airports",
    description: "Airports temporarily closed due to drone sightings in airspace",
    expected: true,
    type: "Real airport closure"
  },
  {
    title: "Drone Incursions Force Third Aalborg Airport Shutdown in Denmark",
    description: "Denmark's Aalborg Airport was briefly closed Sept. 25 after drones were spotted",
    expected: true,
    type: "Real airport incident"
  },
  {
    title: "Unidentified Drones Ground Flights in Denmark Again",
    description: "The airspace over Aalborg Airport was closed overnight following reports of drones",
    expected: true,
    type: "Real disruption"
  },
  {
    title: "Drone activity reported again at several Danish airports",
    description: "Multiple airports affected by drone sightings causing flight disruptions",
    expected: true,
    type: "Real multi-airport incident"
  },

  // NON-INCIDENTS (should fail)
  {
    title: "DJI sues the US Department of Defense for labeling it a Chinese Military Company",
    description: "Drone manufacturer DJI files lawsuit against Department of Defense designation",
    expected: false,
    type: "Lawsuit - NOT an incident"
  },
  {
    title: "Wiki/Sidebar Rework and Looking for Moderators",
    description: "Community announcement about website changes and moderator recruitment",
    expected: false,
    type: "Website update - NOT an incident"
  },
  {
    title: "Rural Iceland is getting drones to deliver food and medicine",
    description: "New drone delivery service launches in remote areas of Iceland",
    expected: false,
    type: "Service announcement - NOT an incident"
  },
  {
    title: "Drone Strike on Black Sea Fleet's Novorossiysk Base",
    description: "Military operation using combat drones in warfare",
    expected: false,
    type: "Military operation - NOT civilian incident"
  },
  {
    title: "New regulations for drone operators announced",
    description: "Government unveils new framework for commercial drone operations",
    expected: false,
    type: "Regulation announcement - NOT an incident"
  }
];

console.log('🧪 Testing Adjusted IncidentValidator\n');
console.log('Settings:');
console.log('- Confidence threshold: 45% (lowered from 60%)');
console.log('- Non-incident keyword limit: 5 (raised from 3)');
console.log('- Added location-based indicators\n');
console.log('=' .repeat(80) + '\n');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.type}`);
  console.log(`Title: "${testCase.title}"`);

  // Quick filter first
  const quickPass = validator.quickFilter(testCase.title);

  if (!quickPass && testCase.expected) {
    console.log(`⚠️  Quick filter blocked (might be too strict)`);
  }

  // Full validation
  const result = validator.validate({
    title: testCase.title,
    description: testCase.description,
    snippet: testCase.description
  });

  const success = result.isValid === testCase.expected;

  if (success) {
    console.log(`✅ PASS - Correctly ${result.isValid ? 'accepted' : 'rejected'}`);
    passed++;
  } else {
    console.log(`❌ FAIL - Incorrectly ${result.isValid ? 'accepted' : 'rejected'}`);
    failed++;
  }

  console.log(`   Confidence: ${result.confidence}%`);
  console.log(`   Reason: ${result.reason}`);

  if (result.details) {
    console.log(`   Details:`, {
      incidentIndicators: result.details.incidentIndicatorCount,
      nonIncidentKeywords: result.details.nonIncidentCount,
      hasPattern: result.details.hasPattern
    });
  }

  console.log();
});

console.log('=' .repeat(80));
console.log('\n📊 Results Summary:');
console.log(`✅ Passed: ${passed}/${testCases.length}`);
console.log(`❌ Failed: ${failed}/${testCases.length}`);
console.log(`📈 Success Rate: ${Math.round((passed / testCases.length) * 100)}%`);

if (failed > 0) {
  console.log('\n⚠️  Some tests failed. The validator may need further adjustment.');
} else {
  console.log('\n🎉 All tests passed! The validator is well-balanced.');
}

console.log('\n💡 Recommendations:');
if (passed === testCases.length) {
  console.log('- Validator is working well with adjusted thresholds');
  console.log('- Should catch real incidents while filtering non-incidents');
  console.log('- Monitor future data collection for any issues');
} else {
  console.log('- Consider fine-tuning specific keyword lists');
  console.log('- May need to adjust confidence calculation weights');
  console.log('- Check if quick filter is too aggressive');
}
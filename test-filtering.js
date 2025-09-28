#!/usr/bin/env node

/**
 * Test script for incident filtering
 * Ensures only real drone incidents pass through
 */

import { IncidentValidator } from './automation/incident-validator.js';

const validator = new IncidentValidator();

// Test cases: mix of real incidents and non-incidents
const testCases = [
  {
    title: "Drone maker DJI loses lawsuit to exit Pentagon's list of firms with Chinese military ties",
    description: "A federal judge ruled against DJI's attempt to be removed from Pentagon blacklist",
    expected: false,
    reason: "Legal/business news, not an incident"
  },
  {
    title: "Drone sighting forces Amsterdam Schiphol Airport to temporarily close runway",
    description: "Airport operations disrupted after unauthorized drone spotted near runway 18R",
    expected: true,
    reason: "Real incident - airport disruption"
  },
  {
    title: "DJI unveils new Mavic 4 Pro drone with enhanced camera capabilities",
    description: "Company announces latest consumer drone model at tech conference",
    expected: false,
    reason: "Product announcement"
  },
  {
    title: "Multiple drones detected over Copenhagen Airport, flights diverted",
    description: "Danish authorities investigating after several UAVs spotted in restricted airspace",
    expected: true,
    reason: "Real incident - multiple sightings"
  },
  {
    title: "Amazon expands drone delivery service to 10 new cities",
    description: "E-commerce giant announces expansion of Prime Air delivery program",
    expected: false,
    reason: "Delivery service announcement"
  },
  {
    title: "Military conducts anti-drone exercise at Norfolk Naval Base",
    description: "Scheduled training exercise to test drone defense capabilities",
    expected: false,
    reason: "Training exercise/simulation"
  },
  {
    title: "Gatwick Airport: Drone incident causes 2-hour shutdown",
    description: "Police responded after drone sighted over airport perimeter yesterday evening",
    expected: true,
    reason: "Real incident - past event with response"
  },
  {
    title: "New EU drone regulations to take effect next month",
    description: "European Commission approves stricter rules for commercial drone operations",
    expected: false,
    reason: "Regulatory news"
  },
  {
    title: "Drone collides with police helicopter over Los Angeles",
    description: "LAPD helicopter struck by consumer drone during patrol, landed safely",
    expected: true,
    reason: "Real incident - collision"
  },
  {
    title: "Tech startup raises $50M for autonomous drone technology",
    description: "Investment round led by venture capital firm for drone AI development",
    expected: false,
    reason: "Business/investment news"
  },
  {
    title: "Hamburg Port operations suspended after drone breach",
    description: "Maritime authorities halted vessel movements following unauthorized UAV activity",
    expected: true,
    reason: "Real incident - port disruption"
  },
  {
    title: "Pentagon awards $1.2B contract for military drone program",
    description: "Defense contractor selected to develop next-generation surveillance drones",
    expected: false,
    reason: "Contract/business news"
  },
  {
    title: "Drone carrying contraband intercepted at UK prison",
    description: "Guards spotted UAV attempting to deliver package to inmates last night",
    expected: true,
    reason: "Real incident - security breach"
  },
  {
    title: "University researchers develop new drone swarm technology",
    description: "Academic team publishes paper on coordinated autonomous flight systems",
    expected: false,
    reason: "Research/development news"
  },
  {
    title: "NATO to conduct large-scale drone defense drill next week",
    description: "Allied forces will simulate drone threats in planned exercise",
    expected: false,
    reason: "Future exercise/simulation"
  }
];

console.log('🧪 Testing Incident Filtering System\n');
console.log('=' .repeat(80));

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  console.log(`\nTest: ${testCase.title.substring(0, 60)}...`);
  console.log(`Expected: ${testCase.expected ? '✅ REAL INCIDENT' : '❌ NOT INCIDENT'}`);

  // Quick filter test
  const quickPass = validator.quickFilter(testCase.title);
  if (!quickPass && testCase.expected) {
    console.log(`⚠️  Quick filter incorrectly rejected`);
  }

  // Full validation
  const validation = validator.validate(testCase);

  const result = validation.isValid;
  const correct = result === testCase.expected;

  if (correct) {
    console.log(`✅ PASSED - ${validation.reason} (${validation.confidence}% confidence)`);
    passed++;
  } else {
    console.log(`❌ FAILED - Got ${result}, expected ${testCase.expected}`);
    console.log(`   Reason: ${validation.reason}`);
    console.log(`   Details:`, validation.details);
    failed++;
  }

  if (validation.details) {
    console.log(`   Indicators: ${validation.details.incidentIndicatorCount} incident, ${validation.details.nonIncidentCount} non-incident`);
  }
}

console.log('\n' + '=' .repeat(80));
console.log(`\n📊 Test Results: ${passed}/${testCases.length} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All tests passed! Filtering system working correctly.');
} else {
  console.log(`⚠️  ${failed} tests failed. Review filtering logic.`);
  process.exit(1);
}
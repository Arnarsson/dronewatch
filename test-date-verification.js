#!/usr/bin/env node

/**
 * Test script for date verification system
 * Tests extraction of actual incident dates from article text
 */

import { DateExtractor } from './automation/utils/date-extractor.js';

const testCases = [
  {
    title: "Kyiv Post article about Sept 10 incident",
    text: "Over 90 Russian Drones Headed Toward Poland on Sept. 10, Zelensky Claims. The Ukrainian president said that at least 90 drones and missiles were launched toward Poland on September 10th, causing disruption at airports.",
    publicationDate: new Date("2024-09-28"),
    expectedIncidentDate: "2024-09-10"
  },
  {
    title: "Recent incident with 'yesterday' reference",
    text: "Airport closed yesterday after drone sighting. The incident occurred yesterday evening when multiple drones were spotted near the runway.",
    publicationDate: new Date("2024-09-28"),
    expectedDaysAgo: 1
  },
  {
    title: "Incident from last week",
    text: "Drone disruption at Copenhagen Airport last week. The incident that happened last Monday forced authorities to close the airport for 3 hours.",
    publicationDate: new Date("2024-09-28"),
    expectedDaysAgo: 5 // Approximately
  },
  {
    title: "Multiple dates - should pick incident date",
    text: "Published on September 28, 2024. On September 15, a drone was spotted near Frankfurt Airport causing major delays. The incident lasted 2 hours.",
    publicationDate: new Date("2024-09-28"),
    expectedIncidentDate: "2024-09-15"
  },
  {
    title: "Old incident from August",
    text: "Drone incident at Amsterdam Airport on August 20. The incident occurred on August 20 when unauthorized drones entered restricted airspace.",
    publicationDate: new Date("2024-09-28"),
    expectedIncidentDate: "2024-08-20"
  }
];

const extractor = new DateExtractor();

console.log("🧪 Testing Date Verification System\n");
console.log("=" .repeat(60) + "\n");

testCases.forEach((test, index) => {
  console.log(`Test ${index + 1}: ${test.title}`);
  console.log("-".repeat(40));

  const result = extractor.extractDates(test.text, test.publicationDate);

  console.log(`📅 Publication Date: ${result.publicationDate}`);
  console.log(`📍 Extracted Incident Date: ${result.incidentDate || 'Not found'}`);
  console.log(`✅ Verification Status: ${result.verificationStatus}`);
  console.log(`📊 Confidence: ${result.confidence}%`);
  console.log(`⏱️ Days Since Incident: ${result.daysDifference || 'N/A'}`);
  console.log(`🚨 Is Old Incident: ${result.isOldIncident ? 'Yes' : 'No'}`);

  if (test.expectedIncidentDate) {
    const expectedDate = new Date(test.expectedIncidentDate).toISOString().split('T')[0];
    const matches = result.incidentDate === expectedDate;
    console.log(`🎯 Expected Date Match: ${matches ? '✅ PASS' : '❌ FAIL'}`);
    if (!matches) {
      console.log(`   Expected: ${expectedDate}, Got: ${result.incidentDate}`);
    }
  }

  if (test.expectedDaysAgo !== undefined) {
    const withinRange = Math.abs(result.daysDifference - test.expectedDaysAgo) <= 2;
    console.log(`🎯 Days Ago Match: ${withinRange ? '✅ PASS' : '❌ FAIL'}`);
    if (!withinRange) {
      console.log(`   Expected: ~${test.expectedDaysAgo} days, Got: ${result.daysDifference} days`);
    }
  }

  console.log("\n");
});

// Test real Kyiv Post example
console.log("=" .repeat(60));
console.log("Real World Test: Kyiv Post Article");
console.log("=" .repeat(60) + "\n");

const realExample = {
  text: `Ukraine's drone wall defense inflicts devastating 20:1 Russian losses.
  Published September 28, 2024. The incident from September 10th involved over 90 drones
  heading toward Poland according to President Zelensky. The drones were intercepted
  and caused temporary closure of several airports.`,
  publicationDate: new Date("2024-09-28")
};

const realResult = extractor.extractDates(realExample.text, realExample.publicationDate);

console.log("📰 Real Article Test:");
console.log(`📅 Publication: ${realResult.publicationDate}`);
console.log(`📍 Incident Date: ${realResult.incidentDate}`);
console.log(`⏱️ Days Old: ${realResult.daysDifference}`);
console.log(`🚨 Old Incident: ${realResult.isOldIncident}`);
console.log(`✅ Status: ${realResult.verificationStatus}`);
console.log(`📊 Confidence: ${realResult.confidence}%`);

if (realResult.isOldIncident && realResult.daysDifference > 7) {
  console.log("\n⚠️  WARNING: This is an old incident being reported as news!");
  console.log(`The incident occurred ${realResult.daysDifference} days ago but was published recently.`);
}

console.log("\n✅ Date Verification System Test Complete!");
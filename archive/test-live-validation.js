#!/usr/bin/env node

/**
 * Test the complete validation pipeline
 * Ensures filtering is working across all data sources
 */

import { RSSNewsScraper } from './automation/scrapers/rss-news-scraper.js';
import { RedditScraper } from './automation/scrapers/reddit-scraper.js';
import { IncidentValidator } from './automation/incident-validator.js';

console.log('🧪 Testing Live Validation Pipeline\n');
console.log('=' .repeat(80));

// Test articles that should be filtered out
const testArticles = [
  {
    title: "DJI loses Pentagon lawsuit over Chinese military ties designation",
    description: "Court rules against drone maker's attempt to be removed from blacklist",
    link: "https://example.com/dji-lawsuit",
    shouldPass: false,
    reason: "Legal/business news"
  },
  {
    title: "Amazon announces drone delivery expansion to European cities",
    description: "E-commerce giant plans to launch Prime Air in Germany and UK",
    link: "https://example.com/amazon-delivery",
    shouldPass: false,
    reason: "Delivery service announcement"
  },
  {
    title: "NATO schedules large-scale anti-drone exercise for next month",
    description: "Military alliance to test drone defense systems in Poland",
    link: "https://example.com/nato-exercise",
    shouldPass: false,
    reason: "Future exercise"
  },
  {
    title: "Startup unveils new AI-powered drone swarm technology",
    description: "Company demonstrates autonomous coordination system at tech conference",
    link: "https://example.com/startup-tech",
    shouldPass: false,
    reason: "Product/tech announcement"
  },
  {
    title: "Drone forces Copenhagen Airport to close runway for 2 hours",
    description: "Unauthorized UAV spotted over restricted airspace, police investigating",
    link: "https://example.com/copenhagen-incident",
    shouldPass: true,
    reason: "Real incident"
  },
  {
    title: "Multiple drones disrupt operations at Hamburg Port",
    description: "Maritime authorities suspended vessel movements after drone sightings",
    link: "https://example.com/hamburg-incident",
    shouldPass: true,
    reason: "Real incident"
  }
];

async function testRSSValidation() {
  console.log('\n📰 Testing RSS News Scraper Validation:\n');

  const scraper = new RSSNewsScraper();
  let passed = 0;
  let failed = 0;

  for (const article of testArticles) {
    const result = scraper.validateRealIncident(article);
    const correct = result === article.shouldPass;

    if (correct) {
      console.log(`  ✅ ${article.shouldPass ? 'Accepted' : 'Rejected'}: ${article.title.substring(0, 50)}...`);
      passed++;
    } else {
      console.log(`  ❌ FAILED - ${result ? 'Accepted' : 'Rejected'} but should ${article.shouldPass ? 'pass' : 'fail'}: ${article.title.substring(0, 50)}...`);
      failed++;
    }
  }

  console.log(`\n  Results: ${passed}/${testArticles.length} correct, ${failed} failed`);
  return failed === 0;
}

async function testRedditValidation() {
  console.log('\n💬 Testing Reddit Scraper Validation:\n');

  const scraper = new RedditScraper();
  let passed = 0;
  let failed = 0;

  const redditPosts = testArticles.map(article => ({
    id: Math.random().toString(36).substr(2, 9),
    title: article.title,
    text: article.description,
    selftext: article.description,
    score: 100,
    num_comments: 10,
    created_utc: Date.now() / 1000,
    author: 'test_user',
    subreddit: 'drones',
    url: article.link
  }));

  // Add drone keyword to make them pass initial filter
  const dronePost = redditPosts.map(post => ({
    ...post,
    title: post.title.includes('drone') || post.title.includes('Drone') ?
           post.title : `Drone: ${post.title}`
  }));

  const filtered = scraper.filterDroneIncidents(dronePost);
  const filteredTitles = filtered.map(p => p.title);

  for (let i = 0; i < testArticles.length; i++) {
    const article = testArticles[i];
    const post = dronePost[i];
    const wasFiltered = filteredTitles.includes(post.title);
    const correct = wasFiltered === article.shouldPass;

    if (correct) {
      console.log(`  ✅ ${article.shouldPass ? 'Accepted' : 'Rejected'}: ${article.title.substring(0, 50)}...`);
      passed++;
    } else {
      console.log(`  ❌ FAILED - ${wasFiltered ? 'Accepted' : 'Rejected'} but should ${article.shouldPass ? 'pass' : 'fail'}: ${article.title.substring(0, 50)}...`);
      failed++;
    }
  }

  console.log(`\n  Results: ${passed}/${testArticles.length} correct, ${failed} failed`);
  return failed === 0;
}

async function testDirectValidator() {
  console.log('\n🛡️ Testing Direct Validator:\n');

  const validator = new IncidentValidator();
  let passed = 0;
  let failed = 0;

  for (const article of testArticles) {
    const validation = validator.validate(article);
    const result = validation.isValid && validation.confidence >= 60;
    const correct = result === article.shouldPass;

    if (correct) {
      console.log(`  ✅ ${article.shouldPass ? 'Accepted' : 'Rejected'} (${validation.confidence}%): ${article.title.substring(0, 50)}...`);
      passed++;
    } else {
      console.log(`  ❌ FAILED - ${result ? 'Accepted' : 'Rejected'} but should ${article.shouldPass ? 'pass' : 'fail'}: ${article.title.substring(0, 50)}...`);
      console.log(`     Confidence: ${validation.confidence}%, Reason: ${validation.reason}`);
      failed++;
    }
  }

  console.log(`\n  Results: ${passed}/${testArticles.length} correct, ${failed} failed`);
  return failed === 0;
}

// Run all tests
async function runTests() {
  const results = [];

  results.push(await testDirectValidator());
  results.push(await testRSSValidation());
  results.push(await testRedditValidation());

  console.log('\n' + '=' .repeat(80));

  if (results.every(r => r)) {
    console.log('\n🎉 All validation tests passed! System is properly filtering non-incidents.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Review the validation logic.\n');
    process.exit(1);
  }
}

runTests().catch(console.error);
#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧹 Automation Directory Cleanup Analysis');
console.log('=========================================\n');

// Files that appear to be unused or redundant
const REDUNDANT_FILES = {
  'automation/scrapers/rss-news-scraper-enhanced.js': 'Unused enhanced version - regular version is used',
  'automation/scrapers/reddit-scraper.js': 'Check if Reddit scraping is actually implemented/used',
  'automation/scrapers/twitter-scraper.js': 'Twitter API requires auth - check if functional',
  'automation/scrapers/social-media-scraper.js': 'Generic social media - check if functional'
};

// Check which scrapers are actually registered in comprehensive-aggregator
const aggregatorPath = path.join(__dirname, 'automation/scrapers/comprehensive-aggregator.js');
const aggregatorContent = fs.readFileSync(aggregatorPath, 'utf-8');

console.log('📊 Scraper Analysis:\n');

// Analyze each potentially redundant file
Object.entries(REDUNDANT_FILES).forEach(([file, reason]) => {
  const filePath = path.join(__dirname, file);
  const fileName = path.basename(file);
  const className = fileName.replace(/-([a-z])/g, (g) => g[1].toUpperCase())
    .replace('.js', '')
    .replace(/^./, str => str.toUpperCase())
    .replace('Scraper', '') + 'Scraper';

  if (fs.existsSync(filePath)) {
    // Check if it's imported anywhere
    const isImported = aggregatorContent.includes(fileName) || aggregatorContent.includes(className);

    if (!isImported) {
      console.log(`❌ ${fileName}`);
      console.log(`   Reason: ${reason}`);
      console.log(`   Status: Not imported in comprehensive-aggregator.js`);
      console.log(`   Action: Can be archived\n`);
    } else {
      console.log(`⚠️  ${fileName}`);
      console.log(`   Reason: ${reason}`);
      console.log(`   Status: Imported but needs verification`);
      console.log(`   Action: Check if functional\n`);
    }
  }
});

// Check for duplicate functionality
console.log('🔍 Checking for duplicate code patterns:\n');

const scraperDir = path.join(__dirname, 'automation/scrapers');
const scrapers = fs.readdirSync(scraperDir)
  .filter(f => f.endsWith('.js'))
  .map(f => ({
    name: f,
    path: path.join(scraperDir, f),
    size: fs.statSync(path.join(scraperDir, f)).size
  }));

// Find similar-sized files (potential duplicates)
scrapers.forEach((scraper, i) => {
  scrapers.forEach((other, j) => {
    if (i < j) {
      const sizeDiff = Math.abs(scraper.size - other.size);
      const sizeRatio = sizeDiff / Math.max(scraper.size, other.size);

      if (sizeRatio < 0.1 && scraper.name !== other.name) {
        console.log(`⚠️  Potential duplicate code:`);
        console.log(`   ${scraper.name} (${scraper.size} bytes)`);
        console.log(`   ${other.name} (${other.size} bytes)`);
        console.log(`   Size difference: ${sizeDiff} bytes (${(sizeRatio * 100).toFixed(1)}%)\n`);
      }
    }
  });
});

// Check automation services
console.log('📦 Automation Services Status:\n');

const services = [
  'automation/ai-analyzer.js',
  'automation/alert-service.js',
  'automation/continuous-monitor.js',
  'automation/evidence-classifier.js',
  'automation/geo-intelligence.js',
  'automation/geocoding-service.js',
  'automation/incident-generator.js',
  'automation/incident-validator.js',
  'automation/live-update-service.js',
  'automation/quality-controller.js',
  'automation/scheduler.js',
  'automation/server.js',
  'automation/websocket-service.js'
];

services.forEach(service => {
  const servicePath = path.join(__dirname, service);
  if (fs.existsSync(servicePath)) {
    const content = fs.readFileSync(servicePath, 'utf-8');
    const lines = content.split('\n').length;
    const hasExports = content.includes('export ');
    const isUsed = content.includes('class ') || content.includes('function ');

    const status = hasExports && isUsed ? '✅' : '⚠️';
    console.log(`${status} ${path.basename(service)} (${lines} lines)`);
  }
});

console.log('\n📋 Recommendations:');
console.log('1. Archive unused scrapers (rss-news-scraper-enhanced.js)');
console.log('2. Verify social media scrapers are functional or remove');
console.log('3. Consolidate duplicate code patterns');
console.log('4. Remove commented-out code blocks');
console.log('5. Standardize error handling across all scrapers');

console.log('\n✨ Analysis complete!');
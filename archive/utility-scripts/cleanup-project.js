#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Files to be archived (not deleted, moved to archive folder)
const FILES_TO_ARCHIVE = [
  // One-time fix scripts that are no longer needed
  'fix-denmark-locations.js',
  'fix-geolocations.js',
  'fix-source-links.js',
  'clean-incidents.js',
  'selective-clean.js',
  'run-collection.js',

  // Debug and test HTML files not in package.json
  'debug.html',
  'mobile-test.html',
  'test-data.html',
  'test-debug.html',
  'test-nodata.html',
  'debug-mobile-incidents.js',

  // Test JS files not referenced in package.json
  'test-adjusted-validator.js',
  'test-date-verification.js',
  'test-filtering.js',
  'test-live-validation.js',
  'test-real-data.js',
  'test-system.js',

  // Advanced/experimental versions
  'index-advanced.html',
  'monitoring-dashboard.html'
];

// Files to keep (production/development)
const FILES_TO_KEEP = [
  'index.html',           // Main production file
  'index-live.html',       // Live WebSocket version
  'admin.html',            // Admin interface
  'incidents.json',        // Data file
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'postcss.config.js',
  'tailwind.config.js',
  'next.config.js',
  'vercel.json',
  'playwright.config.js',
  'sw.js',                 // Service worker
  'favicon.svg',
  'manifest.json',
  'incidents.schema.json',

  // Test files referenced in package.json
  'test-scraper.js',
  'test-enhanced-scraper.js',
  'test-final-coverage.js',

  // Documentation
  'README.md',
  'CLAUDE.md',
  'INITIAL.md',
  'TASK.md',
  'AUTOMATION.md',
  'FEATURES.md',
  'SCRAPING_ARCHITECTURE.md',
  'TEST_RESULTS.md'
];

console.log('🧹 DroneWatch Project Cleanup');
console.log('==============================\n');

// Create archive directory
const archiveDir = path.join(process.cwd(), 'archive');
if (!fs.existsSync(archiveDir)) {
  fs.mkdirSync(archiveDir);
  console.log('✅ Created archive directory');
}

// Archive files
let archivedCount = 0;
let skippedCount = 0;

FILES_TO_ARCHIVE.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    const archivePath = path.join(archiveDir, file);
    fs.renameSync(filePath, archivePath);
    console.log(`📦 Archived: ${file}`);
    archivedCount++;
  } else {
    skippedCount++;
  }
});

console.log(`\n✅ Archived ${archivedCount} files`);
if (skippedCount > 0) {
  console.log(`⏭️  Skipped ${skippedCount} files (not found)`);
}

// Check for node_modules in root (should be gitignored)
const nodeModulesSize = () => {
  try {
    const stats = fs.statSync('node_modules');
    if (stats.isDirectory()) {
      // Rough estimate of size
      return 'exists (add to .gitignore if not already)';
    }
  } catch (e) {
    return 'not found';
  }
};

console.log(`\n📊 Project Statistics:`);
console.log(`- Production files: ${FILES_TO_KEEP.length}`);
console.log(`- Archived files: ${archivedCount}`);
console.log(`- node_modules: ${nodeModulesSize()}`);

// List remaining root files
console.log('\n📁 Remaining root files:');
const rootFiles = fs.readdirSync(process.cwd())
  .filter(f => fs.statSync(f).isFile())
  .filter(f => !f.startsWith('.'))
  .sort();

rootFiles.forEach(file => {
  const status = FILES_TO_KEEP.includes(file) ? '✅' : '❓';
  console.log(`  ${status} ${file}`);
});

console.log('\n✨ Cleanup complete!');
console.log('Files have been archived to ./archive/ (not deleted)');
console.log('You can safely delete the archive folder after verification.');
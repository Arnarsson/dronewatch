#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Python test files and screenshots to archive
const PATTERNS_TO_ARCHIVE = [
  // Python test files
  'test_*.py',
  'analyze_*.py',
  'debug_*.py',

  // Screenshots and images (except favicon)
  '*.png',

  // Additional documentation that's not core
  'ANTI-SIMULATION-STRATEGY.md',
  'MAGIC_EARTH_QA_REPORT.md',
  'MOBILE_RESPONSIVENESS_ASSESSMENT.md',
  'NEWS-FEATURES.md',
  'PARALLEL-AGENTS-GUIDE.md',
  'PARALLEL-EXECUTION-SUCCESS.md',
  'PRP-template.md',
  'cursor_check_codebase_for_issues.md',

  // Node.js utility scripts not in package.json
  'populate-real-incidents.cjs',
  'update-incident-status.cjs',

  // TypeScript config (using JS config instead)
  'tailwind.config.ts',

  // Redis dump file
  'dump.rdb',

  // Next.js generated file
  'next-env.d.ts'
];

console.log('🧹 DroneWatch Test Files & Images Cleanup');
console.log('==========================================\n');

// Ensure archive directory exists
const archiveDir = path.join(process.cwd(), 'archive');
if (!fs.existsSync(archiveDir)) {
  fs.mkdirSync(archiveDir);
}

// Create subdirectories for better organization
const testArchiveDir = path.join(archiveDir, 'python-tests');
const imageArchiveDir = path.join(archiveDir, 'screenshots');
const docsArchiveDir = path.join(archiveDir, 'extra-docs');
const scriptsArchiveDir = path.join(archiveDir, 'utility-scripts');

[testArchiveDir, imageArchiveDir, docsArchiveDir, scriptsArchiveDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
});

// Function to get destination directory based on file type
function getDestDir(filename) {
  if (filename.endsWith('.py')) return testArchiveDir;
  if (filename.endsWith('.png')) return imageArchiveDir;
  if (filename.endsWith('.md')) return docsArchiveDir;
  if (filename.endsWith('.cjs') || filename.endsWith('.ts')) return scriptsArchiveDir;
  if (filename === 'dump.rdb' || filename === 'next-env.d.ts') return scriptsArchiveDir;
  return archiveDir;
}

// Get all files in root directory
const files = fs.readdirSync(process.cwd())
  .filter(f => fs.statSync(f).isFile());

let archivedCount = {
  python: 0,
  images: 0,
  docs: 0,
  scripts: 0
};

// Archive files matching patterns
files.forEach(file => {
  // Check if file matches any pattern to archive
  const shouldArchive =
    file.match(/^test_.*\.py$/) ||
    file.match(/^analyze_.*\.py$/) ||
    file.match(/^debug_.*\.py$/) ||
    file.endsWith('.png') ||
    [
      'ANTI-SIMULATION-STRATEGY.md',
      'MAGIC_EARTH_QA_REPORT.md',
      'MOBILE_RESPONSIVENESS_ASSESSMENT.md',
      'NEWS-FEATURES.md',
      'PARALLEL-AGENTS-GUIDE.md',
      'PARALLEL-EXECUTION-SUCCESS.md',
      'PRP-template.md',
      'cursor_check_codebase_for_issues.md',
      'populate-real-incidents.cjs',
      'update-incident-status.cjs',
      'tailwind.config.ts',
      'dump.rdb',
      'next-env.d.ts'
    ].includes(file);

  if (shouldArchive) {
    const sourcePath = path.join(process.cwd(), file);
    const destDir = getDestDir(file);
    const destPath = path.join(destDir, file);

    fs.renameSync(sourcePath, destPath);

    // Count by type
    if (file.endsWith('.py')) {
      console.log(`🐍 Archived Python test: ${file}`);
      archivedCount.python++;
    } else if (file.endsWith('.png')) {
      console.log(`📸 Archived screenshot: ${file}`);
      archivedCount.images++;
    } else if (file.endsWith('.md')) {
      console.log(`📄 Archived doc: ${file}`);
      archivedCount.docs++;
    } else {
      console.log(`📦 Archived script: ${file}`);
      archivedCount.scripts++;
    }
  }
});

// Also archive the cleanup scripts themselves
['cleanup-project.js', 'cleanup-tests-images.js'].forEach(script => {
  if (fs.existsSync(script)) {
    const destPath = path.join(scriptsArchiveDir, script);
    fs.renameSync(script, destPath);
    console.log(`📦 Archived cleanup script: ${script}`);
    archivedCount.scripts++;
  }
});

console.log(`\n✅ Archive Summary:`);
console.log(`  - Python tests: ${archivedCount.python} files`);
console.log(`  - Screenshots: ${archivedCount.images} files`);
console.log(`  - Extra docs: ${archivedCount.docs} files`);
console.log(`  - Utility scripts: ${archivedCount.scripts} files`);
console.log(`  - Total: ${Object.values(archivedCount).reduce((a, b) => a + b, 0)} files`);

// List remaining root files
console.log('\n📁 Clean root directory - remaining files:');
const remainingFiles = fs.readdirSync(process.cwd())
  .filter(f => fs.statSync(f).isFile())
  .filter(f => !f.startsWith('.'))
  .sort();

const coreFiles = [
  'index.html',
  'index-live.html',
  'admin.html',
  'incidents.json',
  'package.json',
  'package-lock.json',
  'README.md',
  'CLAUDE.md',
  'INITIAL.md',
  'TASK.md',
  'AUTOMATION.md',
  'FEATURES.md',
  'SCRAPING_ARCHITECTURE.md',
  'TEST_RESULTS.md',
  'tsconfig.json',
  'postcss.config.js',
  'next.config.js',
  'vercel.json',
  'playwright.config.js',
  'sw.js',
  'favicon.svg',
  'manifest.json',
  'incidents.schema.json',
  'test-scraper.js',
  'test-enhanced-scraper.js',
  'test-final-coverage.js'
];

remainingFiles.forEach(file => {
  const icon = coreFiles.includes(file) ? '✅' : '❓';
  console.log(`  ${icon} ${file}`);
});

console.log('\n✨ Cleanup complete!');
console.log('All test files and screenshots have been organized in ./archive/');
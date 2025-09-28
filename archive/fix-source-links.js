#!/usr/bin/env node

/**
 * Fix broken source links in incidents.json
 * - Adds www. to Reddit URLs
 * - Validates news URLs
 * - Marks broken links
 */

import fs from 'fs';
import fetch from 'node-fetch';

const INCIDENTS_PATH = './incidents.json';
const PUBLIC_INCIDENTS_PATH = './public/incidents.json';

// URL validation with timeout
async function checkUrl(url, timeout = 5000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DroneWatch/1.0)'
      }
    });

    clearTimeout(timeoutId);
    return {
      valid: response.ok,
      status: response.status,
      finalUrl: response.url
    };
  } catch (error) {
    return {
      valid: false,
      status: error.name === 'AbortError' ? 'timeout' : 'error',
      error: error.message
    };
  }
}

async function fixIncidents() {
  console.log('🔧 Fixing source links in incidents.json...\n');

  // Load incidents
  const data = JSON.parse(fs.readFileSync(INCIDENTS_PATH, 'utf8'));
  let fixedCount = 0;
  let brokenCount = 0;
  let validCount = 0;

  // Process each incident
  for (const incident of data.incidents) {
    if (!incident.evidence?.sources?.[0]?.url) continue;

    const source = incident.evidence.sources[0];
    const originalUrl = source.url;
    let needsUpdate = false;
    let newUrl = originalUrl;

    // Fix Reddit URLs (add www.)
    if (originalUrl.includes('reddit.com') && !originalUrl.includes('www.reddit.com')) {
      newUrl = originalUrl.replace('reddit.com', 'www.reddit.com');
      needsUpdate = true;
      console.log(`✅ Fixed Reddit URL: ${source.publisher}`);
      fixedCount++;
    }

    // Validate the URL
    console.log(`🔍 Checking: ${source.publisher}...`);
    const validation = await checkUrl(newUrl);

    if (validation.valid) {
      validCount++;

      // Update URL if it was fixed
      if (needsUpdate) {
        source.url = newUrl;
      }

      // Add verification metadata
      source.url_verified = true;
      source.url_status = validation.status;
      source.last_verified = new Date().toISOString();

      // If URL redirected, store the final URL
      if (validation.finalUrl && validation.finalUrl !== newUrl) {
        source.final_url = validation.finalUrl;
        console.log(`   ↪️ Redirects to: ${validation.finalUrl}`);
      }

      console.log(`   ✅ Valid (${validation.status})`);
    } else {
      brokenCount++;

      // Mark as broken but keep original URL for reference
      source.url_verified = false;
      source.url_status = validation.status;
      source.url_error = validation.error || 'Not found';
      source.last_verified = new Date().toISOString();

      // Try to generate archive URL
      const archiveUrl = `https://web.archive.org/web/*/${originalUrl}`;
      source.archive_url = archiveUrl;

      console.log(`   ❌ Broken (${validation.status})`);
      console.log(`   📚 Archive: ${archiveUrl}`);

      // Special handling for known issues
      if (source.publisher === 'Kyiv Post') {
        // Kyiv Post may have changed their URL structure
        source.note = (source.note || '') + ' [URL may have changed - check archive]';
      }
    }
  }

  // Update timestamp
  data.generated_utc = new Date().toISOString();

  // Add metadata about the fix
  data.metadata = data.metadata || {};
  data.metadata.urls_verified = new Date().toISOString();
  data.metadata.url_stats = {
    total: data.incidents.length,
    valid: validCount,
    fixed: fixedCount,
    broken: brokenCount
  };

  // Save fixed data to both locations
  fs.writeFileSync(INCIDENTS_PATH, JSON.stringify(data, null, 2));
  fs.writeFileSync(PUBLIC_INCIDENTS_PATH, JSON.stringify(data, null, 2));

  console.log('\n📊 Summary:');
  console.log(`  Total incidents: ${data.incidents.length}`);
  console.log(`  Valid URLs: ${validCount}`);
  console.log(`  Fixed URLs: ${fixedCount}`);
  console.log(`  Broken URLs: ${brokenCount}`);

  if (brokenCount > 0) {
    console.log('\n⚠️  Some URLs are broken. Archive links have been added as fallback.');
  }

  console.log('\n✅ Source links fixed and verified!');
}

// Run the fix
fixIncidents().catch(console.error);
#!/usr/bin/env node

import puppeteer from 'puppeteer-core';

async function performanceTest() {
  let browser;

  try {
    console.log('🚀 Starting Performance Analysis...\n');

    browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222'
    });

    const page = await browser.newPage();

    // Capture performance metrics
    await page.coverage.startJSCoverage();
    await page.coverage.startCSSCoverage();

    const startTime = Date.now();
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle0' });
    const loadTime = Date.now() - startTime;

    await page.setViewport({ width: 1920, height: 1080 });

    // Get Core Web Vitals equivalent metrics
    const metrics = await page.evaluate(() => {
      return new Promise(resolve => {
        // Wait for page to be fully interactive
        setTimeout(() => {
          const performanceEntries = performance.getEntriesByType('navigation')[0];
          const paintEntries = performance.getEntriesByType('paint');

          const metrics = {
            // Time to Interactive approximation
            loadEventEnd: performanceEntries.loadEventEnd,
            domContentLoaded: performanceEntries.domContentLoadedEventEnd,

            // First Contentful Paint
            fcp: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,

            // Largest Contentful Paint (approximation)
            lcp: performanceEntries.loadEventEnd,

            // Total page size
            transferSize: performanceEntries.transferSize || 0,

            // DOM stats
            domNodes: document.querySelectorAll('*').length,

            // Resource count
            resourceCount: performance.getEntriesByType('resource').length
          };

          resolve(metrics);
        }, 2000);
      });
    });

    // Get JS and CSS coverage
    const jsCoverage = await page.coverage.stopJSCoverage();
    const cssCoverage = await page.coverage.stopCSSCoverage();

    const totalJSBytes = jsCoverage.reduce((sum, entry) => sum + entry.text.length, 0);
    const usedJSBytes = jsCoverage.reduce((sum, entry) => {
      return sum + entry.ranges.reduce((rangeSum, range) => rangeSum + (range.end - range.start), 0);
    }, 0);

    const totalCSSBytes = cssCoverage.reduce((sum, entry) => sum + entry.text.length, 0);
    const usedCSSBytes = cssCoverage.reduce((sum, entry) => {
      return sum + entry.ranges.reduce((rangeSum, range) => rangeSum + (range.end - range.start), 0);
    }, 0);

    console.log('📊 Performance Metrics:');
    console.log(`   - Page Load Time: ${loadTime}ms`);
    console.log(`   - First Contentful Paint: ${Math.round(metrics.fcp)}ms`);
    console.log(`   - DOM Content Loaded: ${Math.round(metrics.domContentLoaded)}ms`);
    console.log(`   - Load Event End: ${Math.round(metrics.loadEventEnd)}ms`);
    console.log(`   - Transfer Size: ${Math.round(metrics.transferSize / 1024)}KB`);
    console.log(`   - DOM Nodes: ${metrics.domNodes}`);
    console.log(`   - Resource Count: ${metrics.resourceCount}`);

    console.log('\n📊 Code Coverage Analysis:');
    console.log(`   - Total JS: ${Math.round(totalJSBytes / 1024)}KB`);
    console.log(`   - Used JS: ${Math.round(usedJSBytes / 1024)}KB (${Math.round((usedJSBytes / totalJSBytes) * 100)}%)`);
    console.log(`   - Total CSS: ${Math.round(totalCSSBytes / 1024)}KB`);
    console.log(`   - Used CSS: ${Math.round(usedCSSBytes / 1024)}KB (${Math.round((usedCSSBytes / totalCSSBytes) * 100)}%)`);

    // Performance grade
    let grade = 'A';
    if (loadTime > 3000) grade = 'B';
    if (loadTime > 5000) grade = 'C';
    if (loadTime > 8000) grade = 'D';

    console.log(`\n🎯 Performance Grade: ${grade}`);

    const issues = [];
    if (loadTime > 3000) issues.push('Page load time exceeds 3 seconds');
    if (metrics.fcp > 2500) issues.push('First Contentful Paint is slow');
    if ((usedJSBytes / totalJSBytes) < 0.6) issues.push('Low JavaScript code utilization');

    if (issues.length > 0) {
      console.log('\n⚠️  Performance Issues:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    } else {
      console.log('\n✅ No significant performance issues detected');
    }

  } catch (error) {
    console.error('❌ Performance test failed:', error.message);
  } finally {
    if (browser) {
      await browser.disconnect();
    }
  }
}

performanceTest().catch(console.error);
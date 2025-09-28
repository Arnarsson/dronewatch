#!/usr/bin/env node

import puppeteer from 'puppeteer-core';

async function takeScreenshot() {
  let browser;
  try {
    // Try to connect to the existing Chrome instance
    browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222'
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('Navigating to http://localhost:8081...');
    await page.goto('http://localhost:8081', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('Taking screenshot...');
    await page.screenshot({
      path: '/root/repo/screenshot.png',
      fullPage: true
    });

    console.log('Screenshot saved to /root/repo/screenshot.png');

    // Also get page title and console logs
    const title = await page.title();
    console.log('Page title:', title);

    // Wait a bit for any async loading
    await new Promise(resolve => setTimeout(resolve, 3000));

    await page.screenshot({
      path: '/root/repo/screenshot-final.png',
      fullPage: true
    });

    console.log('Final screenshot saved to /root/repo/screenshot-final.png');

  } catch (error) {
    console.error('Error taking screenshot:', error);
  } finally {
    if (browser) {
      await browser.disconnect();
    }
  }
}

takeScreenshot();
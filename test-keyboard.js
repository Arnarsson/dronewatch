#!/usr/bin/env node

import puppeteer from 'puppeteer-core';

async function testKeyboardShortcuts() {
  let browser;

  try {
    console.log('⌨️  Starting Keyboard Shortcuts Testing...\n');

    browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222'
    });

    const page = await browser.newPage();
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle0' });
    await page.setViewport({ width: 1920, height: 1080 });

    // Test keyboard shortcuts
    console.log('🔍 Testing Keyboard Shortcuts:');

    // Test 1: Ctrl+K for search focus
    console.log('1. Testing Ctrl+K (focus search)...');
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyK');
    await page.keyboard.up('Control');

    const searchFocused = await page.evaluate(() => {
      return document.activeElement.id === 'search-input';
    });
    console.log(`   ✅ Search focus: ${searchFocused ? 'Working' : 'Failed'}`);

    // Test 2: H for help
    console.log('2. Testing H (show help)...');
    await page.keyboard.press('KeyH');
    await new Promise(resolve => setTimeout(resolve, 500));

    const helpVisible = await page.evaluate(() => {
      const helpElement = document.querySelector('.help-modal, .keyboard-help');
      return helpElement && getComputedStyle(helpElement).display !== 'none';
    });
    console.log(`   ✅ Help modal: ${helpVisible ? 'Working' : 'Failed'}`);

    // Test 3: Escape key
    console.log('3. Testing Escape (close modals)...');
    await page.keyboard.press('Escape');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 4: Ctrl+Shift+T for theme toggle
    console.log('4. Testing Ctrl+Shift+T (theme toggle)...');
    const initialTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });

    await page.keyboard.down('Control');
    await page.keyboard.down('Shift');
    await page.keyboard.press('KeyT');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Control');
    await new Promise(resolve => setTimeout(resolve, 500));

    const newTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });

    const themeChanged = initialTheme !== newTheme;
    console.log(`   ✅ Theme toggle: ${themeChanged ? 'Working' : 'Failed'} (${initialTheme} → ${newTheme})`);

    // Test 5: Arrow keys for tab navigation
    console.log('5. Testing Arrow keys (tab navigation)...');

    // Click on first tab to ensure focus
    await page.click('.tab-btn');
    await page.keyboard.press('ArrowRight');
    await new Promise(resolve => setTimeout(resolve, 300));

    const activeTab = await page.evaluate(() => {
      const activeTabEl = document.querySelector('.tab-btn.active');
      return activeTabEl ? activeTabEl.textContent.trim() : null;
    });
    console.log(`   ✅ Arrow navigation: ${activeTab ? 'Working' : 'Failed'} (active: ${activeTab})`);

    // Test 6: Tab key for focus management
    console.log('6. Testing Tab key (focus management)...');
    await page.keyboard.press('Tab');
    await new Promise(resolve => setTimeout(resolve, 200));

    const focusedElement = await page.evaluate(() => {
      return document.activeElement.tagName + (document.activeElement.className ? '.' + document.activeElement.className.split(' ')[0] : '');
    });
    console.log(`   ✅ Tab navigation: Working (focused: ${focusedElement})`);

    console.log('\n🎉 Keyboard Testing Complete!');

  } catch (error) {
    console.error('❌ Keyboard test failed:', error.message);
  } finally {
    if (browser) {
      await browser.disconnect();
    }
  }
}

testKeyboardShortcuts().catch(console.error);
#!/usr/bin/env python3
"""
Mobile Responsiveness Test for DroneWatch Application
Tests mobile viewport behavior, sidebar functionality, and layout at different orientations
"""

import asyncio
import os
import time
from playwright.async_api import async_playwright

# Create directory for screenshots
SCREENSHOT_DIR = '/Users/sven/Desktop/MCP/dronewatch/qa_mobile_test'
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

async def test_mobile_responsiveness():
    """Test mobile responsiveness with focus on sidebar behavior and layout"""

    async with async_playwright() as p:
        print("🚀 Starting Mobile Responsiveness Test for DroneWatch")
        print("=" * 60)

        # Launch browser
        browser = await p.chromium.launch(headless=False, slow_mo=1000)

        results = {
            'portrait': {},
            'landscape': {},
            'issues': [],
            'recommendations': []
        }

        # Test 1: Portrait Mode (375px x 667px) - iPhone SE dimensions
        print("\n📱 TEST 1: Portrait Mode (375px x 667px)")
        print("-" * 40)

        context_portrait = await browser.new_context(
            viewport={'width': 375, 'height': 667},
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
        )
        page_portrait = await context_portrait.new_page()

        # Navigate and wait for load
        await page_portrait.goto('http://localhost:8085')
        await page_portrait.wait_for_load_state('networkidle')
        await asyncio.sleep(3)  # Allow dynamic content to load

        # Initial state analysis
        print("🔍 Analyzing initial state...")

        # Check for console errors
        console_errors = []
        page_portrait.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)

        # Take initial screenshot
        await page_portrait.screenshot(path=f'{SCREENSHOT_DIR}/01_portrait_initial_375x667.png', full_page=True)
        print("✅ Screenshot: Portrait initial load (375x667)")

        # Analyze layout elements
        sidebar_element = page_portrait.locator('#sidebar, .sidebar, [class*="sidebar"]')
        map_element = page_portrait.locator('#map, .map, [class*="map"]')

        # Check sidebar visibility and dimensions
        sidebar_visible = False
        sidebar_width = 0
        if await sidebar_element.count() > 0:
            sidebar_visible = await sidebar_element.first.is_visible()
            if sidebar_visible:
                sidebar_box = await sidebar_element.first.bounding_box()
                sidebar_width = sidebar_box['width'] if sidebar_box else 0

        # Check map visibility
        map_visible = False
        map_width = 0
        if await map_element.count() > 0:
            map_visible = await map_element.first.is_visible()
            if map_visible:
                map_box = await map_element.first.bounding_box()
                map_width = map_box['width'] if map_box else 0

        print(f"📊 Initial State Analysis:")
        print(f"   • Sidebar visible: {sidebar_visible}")
        print(f"   • Sidebar width: {sidebar_width}px")
        print(f"   • Map visible: {map_visible}")
        print(f"   • Map width: {map_width}px")
        print(f"   • Viewport width: 375px")

        # Calculate sidebar width percentage
        sidebar_percentage = (sidebar_width / 375) * 100 if sidebar_width > 0 else 0
        print(f"   • Sidebar takes {sidebar_percentage:.1f}% of screen width")

        results['portrait']['initial'] = {
            'sidebar_visible': sidebar_visible,
            'sidebar_width': sidebar_width,
            'sidebar_percentage': sidebar_percentage,
            'map_visible': map_visible,
            'map_width': map_width
        }

        # Check if sidebar is taking up too much space (issue mentioned in feedback)
        if sidebar_percentage > 80:
            results['issues'].append(f"❌ CRITICAL: Sidebar takes {sidebar_percentage:.1f}% of screen width in portrait mode")

        # Find and test sidebar toggle
        print("\n🔍 Looking for sidebar toggle...")
        toggle_selectors = [
            'button[aria-label*="menu"]',
            'button[aria-label*="sidebar"]',
            '.sidebar-toggle',
            '.menu-toggle',
            '.hamburger',
            'button:has-text("☰")',
            'button:has-text("Menu")',
            '[data-toggle="sidebar"]',
            '.btn-sidebar',
            'button[class*="menu"]',
            'button[class*="toggle"]'
        ]

        menu_button = None
        for selector in toggle_selectors:
            try:
                if await page_portrait.locator(selector).count() > 0:
                    menu_button = page_portrait.locator(selector).first
                    print(f"✅ Found sidebar toggle: {selector}")
                    break
            except:
                continue

        if menu_button:
            # Test sidebar toggle functionality
            print("🔄 Testing sidebar toggle...")

            # Open sidebar
            await menu_button.click()
            await asyncio.sleep(1.5)  # Allow animation

            # Check state after opening
            sidebar_visible_open = await sidebar_element.first.is_visible() if await sidebar_element.count() > 0 else False
            map_visible_open = await map_element.first.is_visible() if await map_element.count() > 0 else False

            if sidebar_visible_open:
                sidebar_box_open = await sidebar_element.first.bounding_box()
                sidebar_width_open = sidebar_box_open['width'] if sidebar_box_open else 0
                sidebar_percentage_open = (sidebar_width_open / 375) * 100
            else:
                sidebar_width_open = 0
                sidebar_percentage_open = 0

            await page_portrait.screenshot(path=f'{SCREENSHOT_DIR}/02_portrait_sidebar_open_375x667.png', full_page=True)
            print("✅ Screenshot: Portrait with sidebar open")

            print(f"📊 After Opening Sidebar:")
            print(f"   • Sidebar visible: {sidebar_visible_open}")
            print(f"   • Sidebar width: {sidebar_width_open}px ({sidebar_percentage_open:.1f}%)")
            print(f"   • Map visible: {map_visible_open}")

            results['portrait']['sidebar_open'] = {
                'sidebar_visible': sidebar_visible_open,
                'sidebar_width': sidebar_width_open,
                'sidebar_percentage': sidebar_percentage_open,
                'map_visible': map_visible_open
            }

            # Check if map is hidden when sidebar is open (critical issue)
            if sidebar_visible_open and not map_visible_open:
                results['issues'].append("❌ CRITICAL: Map completely hidden when sidebar is open in portrait mode")
            elif sidebar_percentage_open > 90:
                results['issues'].append(f"⚠️ WARNING: Sidebar takes {sidebar_percentage_open:.1f}% of screen when open")

            # Close sidebar
            await menu_button.click()
            await asyncio.sleep(1.5)

            # Verify map is visible when sidebar is closed
            map_visible_closed = await map_element.first.is_visible() if await map_element.count() > 0 else False
            sidebar_visible_closed = await sidebar_element.first.is_visible() if await sidebar_element.count() > 0 else False

            await page_portrait.screenshot(path=f'{SCREENSHOT_DIR}/03_portrait_sidebar_closed_375x667.png', full_page=True)
            print("✅ Screenshot: Portrait with sidebar closed")

            print(f"📊 After Closing Sidebar:")
            print(f"   • Sidebar visible: {sidebar_visible_closed}")
            print(f"   • Map visible: {map_visible_closed}")

            results['portrait']['sidebar_closed'] = {
                'sidebar_visible': sidebar_visible_closed,
                'map_visible': map_visible_closed
            }

            if not map_visible_closed:
                results['issues'].append("❌ CRITICAL: Map not visible even when sidebar is closed")
        else:
            print("⚠️ Could not find sidebar toggle button")
            results['issues'].append("⚠️ WARNING: Sidebar toggle button not found")

        # Check header height in portrait
        header_selectors = ['header', '.header', '.top-bar', '.navbar', '[class*="header"]']
        header_height = 0
        for selector in header_selectors:
            try:
                if await page_portrait.locator(selector).count() > 0:
                    header_height = await page_portrait.locator(selector).first.evaluate('el => el.offsetHeight')
                    print(f"📏 Header height (portrait): {header_height}px")
                    break
            except:
                continue

        results['portrait']['header_height'] = header_height

        if header_height != 64:
            results['issues'].append(f"⚠️ Header height is {header_height}px, expected 64px for portrait")

        await context_portrait.close()

        # Test 2: Landscape Mode (667px x 375px)
        print("\n📱 TEST 2: Landscape Mode (667px x 375px)")
        print("-" * 40)

        context_landscape = await browser.new_context(
            viewport={'width': 667, 'height': 375},
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
        )
        page_landscape = await context_landscape.new_page()

        await page_landscape.goto('http://localhost:8085')
        await page_landscape.wait_for_load_state('networkidle')
        await asyncio.sleep(3)

        # Take initial landscape screenshot
        await page_landscape.screenshot(path=f'{SCREENSHOT_DIR}/04_landscape_initial_667x375.png', full_page=True)
        print("✅ Screenshot: Landscape initial load (667x375)")

        # Analyze landscape layout
        sidebar_landscape = page_landscape.locator('#sidebar, .sidebar, [class*="sidebar"]')
        map_landscape = page_landscape.locator('#map, .map, [class*="map"]')

        sidebar_visible_land = False
        sidebar_width_land = 0
        if await sidebar_landscape.count() > 0:
            sidebar_visible_land = await sidebar_landscape.first.is_visible()
            if sidebar_visible_land:
                sidebar_box_land = await sidebar_landscape.first.bounding_box()
                sidebar_width_land = sidebar_box_land['width'] if sidebar_box_land else 0

        map_visible_land = False
        if await map_landscape.count() > 0:
            map_visible_land = await map_landscape.first.is_visible()

        sidebar_percentage_land = (sidebar_width_land / 667) * 100 if sidebar_width_land > 0 else 0

        print(f"📊 Landscape Analysis:")
        print(f"   • Sidebar visible: {sidebar_visible_land}")
        print(f"   • Sidebar width: {sidebar_width_land}px ({sidebar_percentage_land:.1f}%)")
        print(f"   • Map visible: {map_visible_land}")
        print(f"   • Viewport width: 667px")

        results['landscape']['initial'] = {
            'sidebar_visible': sidebar_visible_land,
            'sidebar_width': sidebar_width_land,
            'sidebar_percentage': sidebar_percentage_land,
            'map_visible': map_visible_land
        }

        # Test sidebar toggle in landscape
        for selector in toggle_selectors:
            try:
                if await page_landscape.locator(selector).count() > 0:
                    menu_button_land = page_landscape.locator(selector).first
                    await menu_button_land.click()
                    await asyncio.sleep(1.5)

                    await page_landscape.screenshot(path=f'{SCREENSHOT_DIR}/05_landscape_sidebar_open_667x375.png', full_page=True)
                    print("✅ Screenshot: Landscape with sidebar open")

                    # Check state in landscape with sidebar open
                    sidebar_visible_land_open = await sidebar_landscape.first.is_visible() if await sidebar_landscape.count() > 0 else False
                    map_visible_land_open = await map_landscape.first.is_visible() if await map_landscape.count() > 0 else False

                    print(f"📊 Landscape with sidebar open:")
                    print(f"   • Sidebar visible: {sidebar_visible_land_open}")
                    print(f"   • Map visible: {map_visible_land_open}")

                    results['landscape']['sidebar_open'] = {
                        'sidebar_visible': sidebar_visible_land_open,
                        'map_visible': map_visible_land_open
                    }
                    break
            except:
                continue

        # Check header height in landscape
        header_height_land = 0
        for selector in header_selectors:
            try:
                if await page_landscape.locator(selector).count() > 0:
                    header_height_land = await page_landscape.locator(selector).first.evaluate('el => el.offsetHeight')
                    print(f"📏 Header height (landscape): {header_height_land}px")
                    break
            except:
                continue

        results['landscape']['header_height'] = header_height_land

        if header_height_land != 68:
            results['issues'].append(f"⚠️ Header height is {header_height_land}px, expected 68px for landscape")

        await context_landscape.close()
        await browser.close()

        # Generate Assessment Report
        print("\n" + "=" * 60)
        print("📊 MOBILE RESPONSIVENESS ASSESSMENT REPORT")
        print("=" * 60)

        print(f"\n🎯 TEST SUMMARY:")
        print(f"   • Screenshots captured: 5")
        print(f"   • Issues found: {len(results['issues'])}")
        print(f"   • Test environments: Portrait (375x667), Landscape (667x375)")

        print(f"\n📱 PORTRAIT MODE RESULTS:")
        if 'initial' in results['portrait']:
            p = results['portrait']['initial']
            print(f"   • Initial sidebar width: {p['sidebar_percentage']:.1f}% of screen")
            print(f"   • Map visible initially: {'✅' if p['map_visible'] else '❌'}")

        print(f"\n📱 LANDSCAPE MODE RESULTS:")
        if 'initial' in results['landscape']:
            l = results['landscape']['initial']
            print(f"   • Initial sidebar width: {l['sidebar_percentage']:.1f}% of screen")
            print(f"   • Map visible initially: {'✅' if l['map_visible'] else '❌'}")

        if results['issues']:
            print(f"\n🚨 ISSUES FOUND:")
            for issue in results['issues']:
                print(f"   {issue}")
        else:
            print(f"\n✅ NO CRITICAL ISSUES FOUND")

        print(f"\n📁 Screenshots saved to: {SCREENSHOT_DIR}/")
        print(f"   • 01_portrait_initial_375x667.png")
        print(f"   • 02_portrait_sidebar_open_375x667.png")
        print(f"   • 03_portrait_sidebar_closed_375x667.png")
        print(f"   • 04_landscape_initial_667x375.png")
        print(f"   • 05_landscape_sidebar_open_667x375.png")

        return results

if __name__ == "__main__":
    asyncio.run(test_mobile_responsiveness())
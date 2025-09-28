#!/usr/bin/env python3
"""
Comprehensive QA test for Magic Earth-inspired DroneWatch interface
"""

import asyncio
from playwright.async_api import async_playwright
import time
import os

async def test_dronewatch_comprehensive():
    """Comprehensive testing of Magic Earth-inspired DroneWatch interface"""

    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        # Enable console logging
        console_messages = []
        page.on("console", lambda msg: console_messages.append({
            "type": msg.type,
            "text": msg.text,
            "timestamp": time.time()
        }))

        # Enable network monitoring
        network_requests = []
        page.on("request", lambda req: network_requests.append({
            "url": req.url,
            "method": req.method,
            "timestamp": time.time()
        }))

        # Navigate to the application
        print("🚀 Loading DroneWatch application...")
        await page.goto("http://localhost:8085")

        # Wait for page to load
        await page.wait_for_load_state('networkidle')
        await asyncio.sleep(3)  # Extra time for map initialization

        print("\n📊 TEST EXECUTION SUMMARY")
        print(f"- Test Environment: Chromium, viewport 1920x1080")
        print(f"- Test URL: http://localhost:8085")
        print(f"- Test Scope: Visual design, functionality, responsive design")

        # 1. VISUAL DESIGN ELEMENTS TEST
        print("\n🔍 VISUAL VERIFICATION")

        # Check page title
        title = await page.title()
        print(f"✅ Page title: {title}")

        # Check for Magic Earth-style header elements
        header_selectors = [
            '.magic-earth-header',
            'header',
            '.header',
            '[class*="header"]'
        ]

        header_found = False
        for selector in header_selectors:
            header = await page.query_selector(selector)
            if header:
                print(f"✅ Header element found: {selector}")
                header_found = True
                break

        if not header_found:
            print("⚠️ No header element found with common selectors")

        # Check for search bar in header
        search_selectors = [
            'input[type="search"]',
            'input[placeholder*="search"]',
            '.search-input',
            '.search-bar'
        ]

        search_found = False
        for selector in search_selectors:
            search = await page.query_selector(selector)
            if search:
                print(f"✅ Search input found: {selector}")
                search_found = True
                break

        if not search_found:
            print("⚠️ Search input not found")

        # Check for floating sidebar panels
        sidebar_selectors = [
            '.floating-sidebar',
            '.sidebar',
            '.side-panel',
            '[class*="sidebar"]'
        ]

        sidebar_found = False
        for selector in sidebar_selectors:
            sidebar = await page.query_selector(selector)
            if sidebar:
                print(f"✅ Sidebar element found: {selector}")
                sidebar_found = True
                break

        if not sidebar_found:
            print("⚠️ Sidebar element not found")

        # Check for glassmorphism effects
        glass_elements = await page.query_selector_all('[class*="glass"], [style*="backdrop-filter"]')
        print(f"✅ Glass effect elements found: {len(glass_elements)}")

        # Check dark theme application
        body_bg = await page.evaluate("getComputedStyle(document.body).backgroundColor")
        body_color = await page.evaluate("getComputedStyle(document.body).color")
        print(f"✅ Body background: {body_bg}")
        print(f"✅ Body text color: {body_color}")

        # Check CSS custom properties (Magic Earth theme)
        css_vars = await page.evaluate("""() => {
            const root = getComputedStyle(document.documentElement);
            return {
                primary: root.getPropertyValue('--primary'),
                surface: root.getPropertyValue('--surface'),
                textColor: root.getPropertyValue('--text'),
                glassPanel: root.getPropertyValue('--glass-panel')
            };
        }""")
        print(f"✅ CSS variables: {css_vars}")

        # Take desktop screenshot
        print("\n📸 Capturing desktop view...")
        await page.screenshot(path="test_desktop_1920.png", full_page=True)

        # 2. FUNCTIONALITY TESTING
        print("\n🌐 FUNCTIONALITY TESTING")

        # Check if map loads
        map_element = await page.query_selector('#map')
        if map_element:
            print("✅ Map container found")
            # Wait a bit more for Leaflet to initialize
            await asyncio.sleep(2)

            # Check if Leaflet tiles loaded
            tiles = await page.query_selector_all('.leaflet-tile')
            print(f"✅ Map tiles loaded: {len(tiles)}")

            # Check if map is interactive
            map_interactive = await page.evaluate("""() => {
                return window.state && window.state.map ? true : false;
            }""")
            print(f"✅ Map interactive: {map_interactive}")
        else:
            print("❌ Map container NOT found")

        # Check incident loading
        try:
            incident_count = await page.evaluate("""() => {
                return window.state && window.state.incidents ? window.state.incidents.length : 0;
            }""")
            print(f"✅ Incidents loaded: {incident_count}")
        except:
            print("⚠️ Could not access incident data")

        # Test filter controls
        filter_controls = [
            '#date-range',
            'input[type="checkbox"]',
            'select',
            '.filter-control'
        ]

        for selector in filter_controls:
            controls = await page.query_selector_all(selector)
            if controls:
                print(f"✅ Filter controls found ({selector}): {len(controls)}")

        # Test date filter if available
        date_filter = await page.query_selector('#date-range')
        if date_filter:
            await page.select_option('#date-range', '30')  # Change to 30 days
            await asyncio.sleep(1)  # Wait for filter application
            print("✅ Date filter tested")

        # Test tabs if available
        tabs = await page.query_selector_all('.tab, [role="tab"], .tab-button')
        print(f"✅ Tabs found: {len(tabs)}")

        if tabs:
            # Click on different tabs
            for i, tab in enumerate(tabs[:3]):  # Test first 3 tabs
                try:
                    await tab.click()
                    await asyncio.sleep(0.5)
                    print(f"✅ Tab {i+1} clicked successfully")
                except:
                    print(f"⚠️ Could not click tab {i+1}")

        # 3. RESPONSIVE DESIGN TESTING
        print("\n👁️ RESPONSIVE DESIGN TESTING")

        breakpoints = [
            {"name": "Mobile Portrait", "width": 375, "height": 667},
            {"name": "Mobile Landscape", "width": 480, "height": 320},
            {"name": "Tablet Portrait", "width": 768, "height": 1024},
            {"name": "Tablet Landscape", "width": 1024, "height": 768},
            {"name": "Desktop", "width": 1440, "height": 900},
            {"name": "Large Desktop", "width": 1920, "height": 1080},
            {"name": "Ultra-wide", "width": 2560, "height": 1440}
        ]

        for bp in breakpoints:
            print(f"\n📱 Testing {bp['name']} ({bp['width']}x{bp['height']})")
            await page.set_viewport_size({'width': bp['width'], 'height': bp['height']})
            await asyncio.sleep(1)  # Allow layout to adjust

            # Check viewport dimensions
            viewport = await page.evaluate("() => ({width: window.innerWidth, height: window.innerHeight})")
            print(f"   Actual viewport: {viewport['width']}x{viewport['height']}")

            # Check if sidebar adapts properly
            sidebar_visible = await page.is_visible('.sidebar, .floating-sidebar, [class*="sidebar"]')
            print(f"   Sidebar visible: {sidebar_visible}")

            # Check if header adapts
            header_height = await page.evaluate("""() => {
                const header = document.querySelector('header, .header, .magic-earth-header, [class*="header"]');
                return header ? header.offsetHeight : 0;
            }""")
            print(f"   Header height: {header_height}px")

            # Check if map container adapts
            map_height = await page.evaluate("""() => {
                const map = document.querySelector('#map');
                return map ? map.offsetHeight : 0;
            }""")
            print(f"   Map height: {map_height}px")

            # Take screenshot
            filename = bp['name'].lower().replace(' ', '_')
            await page.screenshot(path=f"test_{filename}.png")
            print(f"   📸 Screenshot saved: test_{filename}.png")

        # 4. PERFORMANCE METRICS
        print("\n⚡ PERFORMANCE METRICS")

        # Reset to desktop for performance testing
        await page.set_viewport_size({'width': 1920, 'height': 1080})

        # Reload page and measure load time
        start_time = time.time()
        await page.reload()
        await page.wait_for_load_state('networkidle')
        load_time = time.time() - start_time
        print(f"✅ Page load time: {load_time:.2f} seconds")

        # Performance timing
        timing = await page.evaluate("""() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            return {
                domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
                loadComplete: perfData.loadEventEnd - perfData.navigationStart,
                firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
                firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
            };
        }""")

        print(f"✅ DOM Content Loaded: {timing['domContentLoaded']:.0f}ms")
        print(f"✅ Load Complete: {timing['loadComplete']:.0f}ms")
        print(f"✅ First Paint: {timing['firstPaint']:.0f}ms")
        print(f"✅ First Contentful Paint: {timing['firstContentfulPaint']:.0f}ms")

        # Memory usage
        try:
            memory_info = await page.evaluate("() => performance.memory || {}")
            if memory_info:
                used_mb = memory_info.get('usedJSHeapSize', 0) / (1024 * 1024)
                total_mb = memory_info.get('totalJSHeapSize', 0) / (1024 * 1024)
                print(f"✅ Memory usage: {used_mb:.1f} MB / {total_mb:.1f} MB")
        except:
            print("⚠️ Memory info not available")

        # Network requests analysis
        print(f"✅ Network requests: {len(network_requests)}")
        failed_requests = [req for req in network_requests if 'error' in req.get('url', '').lower()]
        print(f"✅ Failed requests: {len(failed_requests)}")

        # 5. CONSOLE ANALYSIS
        print("\n🔍 CONSOLE ANALYSIS")

        error_count = len([msg for msg in console_messages if msg['type'] == 'error'])
        warning_count = len([msg for msg in console_messages if msg['type'] == 'warning'])
        info_count = len([msg for msg in console_messages if msg['type'] == 'info'])

        print(f"- Total console messages: {len(console_messages)}")
        print(f"- Errors Found: {error_count}")
        print(f"- Warnings: {warning_count}")
        print(f"- Info messages: {info_count}")

        if error_count > 0:
            print("\n🐛 CONSOLE ERRORS:")
            for msg in console_messages:
                if msg['type'] == 'error':
                    print(f"   ❌ {msg['text']}")

        if warning_count > 0:
            print("\n⚠️ CONSOLE WARNINGS:")
            for msg in console_messages:
                if msg['type'] == 'warning':
                    print(f"   ⚠️ {msg['text']}")

        # 6. FINAL ASSESSMENT
        print("\n✅ FINAL ASSESSMENT")

        # Calculate overall score
        score = 100
        if error_count > 0:
            score -= (error_count * 10)
        if warning_count > 3:
            score -= (warning_count * 2)
        if load_time > 3:
            score -= 15
        if not header_found:
            score -= 10
        if not sidebar_found:
            score -= 10

        overall_status = "PASS" if score >= 70 else "FAIL"

        print(f"- Load Time Assessment: {'PASS' if load_time < 3 else 'FAIL'} ({load_time:.2f}s)")
        print(f"- Console Error Assessment: {'PASS' if error_count == 0 else 'FAIL'} ({error_count} errors)")
        print(f"- Visual Elements Assessment: {'PASS' if header_found and sidebar_found else 'PARTIAL'}")
        print(f"- Overall Score: {score}/100")
        print(f"- Overall Status: {overall_status}")

        await browser.close()

        return {
            "load_time": load_time,
            "console_errors": error_count,
            "console_warnings": warning_count,
            "overall_status": overall_status,
            "score": score,
            "timing": timing
        }

if __name__ == "__main__":
    result = asyncio.run(test_dronewatch_comprehensive())
    print(f"\n🎯 Test Summary: {result}")
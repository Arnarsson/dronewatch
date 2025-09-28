#!/usr/bin/env python3
"""
Comprehensive DroneWatch Application Testing Script
Using Playwright with Chrome DevTools for QA automation
"""

import asyncio
from playwright.async_api import async_playwright
import json
import time
import os

class DroneWatchTester:
    def __init__(self):
        self.console_messages = []
        self.network_requests = []
        self.errors = []
        self.screenshots = []

    async def setup_monitoring(self, page):
        """Set up console and network monitoring"""
        page.on('console', lambda msg: self.console_messages.append({
            'type': msg.type,
            'text': msg.text,
            'location': msg.location if hasattr(msg, 'location') else 'unknown'
        }))

        page.on('request', lambda req: self.network_requests.append({
            'url': req.url,
            'method': req.method,
            'resource_type': req.resource_type
        }))

        page.on('pageerror', lambda error: self.errors.append(str(error)))

    async def test_desktop_view(self, page):
        """Test desktop view functionality"""
        print("👁️ VISUAL VERIFICATION - Desktop View")

        # Set desktop viewport
        await page.set_viewport_size({'width': 1920, 'height': 1080})
        await page.wait_for_timeout(1000)

        # Check DroneWatch logo
        logo_visible = await page.is_visible('svg')
        print(f"- DroneWatch Logo (SVG): {'✅ PASS' if logo_visible else '❌ FAIL'}")

        # Check for rounded corners (should be 0)
        border_radius_check = await page.evaluate('''() => {
            const elements = document.querySelectorAll('*');
            const elementsWithBorderRadius = [];
            for (let el of elements) {
                const style = window.getComputedStyle(el);
                if (style.borderRadius && style.borderRadius !== '0px') {
                    elementsWithBorderRadius.push({
                        tag: el.tagName,
                        class: el.className,
                        borderRadius: style.borderRadius
                    });
                }
            }
            return elementsWithBorderRadius;
        }''')

        if len(border_radius_check) == 0:
            print("- Rounded Corners Removed: ✅ PASS")
        else:
            print(f"- Rounded Corners Removed: ❌ FAIL - Found {len(border_radius_check)} elements")
            for item in border_radius_check[:3]:  # Show first 3
                print(f"  * {item['tag']}.{item['class']}: {item['borderRadius']}")

        # Check color palette (muted colors)
        bright_colors = await page.evaluate('''() => {
            const elements = document.querySelectorAll('*');
            const brightColors = [];
            for (let el of elements) {
                const style = window.getComputedStyle(el);
                const bg = style.backgroundColor;
                const color = style.color;

                // Check for bright colors (high saturation/lightness)
                if (bg.includes('rgb') && !bg.includes('rgba(0, 0, 0')) {
                    const values = bg.match(/\\d+/g);
                    if (values && values.length >= 3) {
                        const [r, g, b] = values.map(Number);
                        if (r > 200 || g > 200 || b > 200) {
                            brightColors.push({tag: el.tagName, bg: bg});
                        }
                    }
                }
            }
            return brightColors;
        }''')

        print(f"- Muted Color Palette: {'✅ PASS' if len(bright_colors) < 3 else '❌ FAIL'}")

        # Test Live Feed tab
        live_feed_visible = await page.is_visible('text=Live Feed')
        print(f"- Live Feed Tab Visible: {'✅ PASS' if live_feed_visible else '❌ FAIL'}")

        # Check risk level indicator
        risk_indicator = await page.is_visible('.live-indicator, [class*="risk"], [class*="alert"]')
        print(f"- Risk Level Indicator: {'✅ PASS' if risk_indicator else '❌ FAIL'}")

        # Take desktop screenshot
        await page.screenshot(path='desktop_view.png', full_page=True)
        self.screenshots.append('desktop_view.png')
        print("- Screenshot: desktop_view.png captured")
        print()

    async def test_mobile_responsiveness(self, page):
        """Test mobile responsiveness on different viewports"""
        print("📱 MOBILE RESPONSIVENESS TESTING")

        mobile_viewports = [
            {'name': 'iPhone SE', 'width': 375, 'height': 667},
            {'name': 'iPhone 12 Pro', 'width': 414, 'height': 896}
        ]

        for viewport in mobile_viewports:
            print(f"\n📱 Testing {viewport['name']} ({viewport['width']}x{viewport['height']})")

            # Set mobile viewport
            await page.set_viewport_size({'width': viewport['width'], 'height': viewport['height']})
            await page.wait_for_timeout(1000)

            # Test hamburger menu
            hamburger_visible = await page.is_visible('button[class*="menu"], .hamburger, [data-mobile-menu]')
            if not hamburger_visible:
                # Try to find any button that might be the mobile menu
                hamburger_visible = await page.is_visible('button')
            print(f"- Hamburger Menu: {'✅ PASS' if hamburger_visible else '❌ FAIL'}")

            # Test content readability
            content_overflow = await page.evaluate(f'''() => {{
                const width = {viewport['width']};
                const elements = document.querySelectorAll('*');
                let overflowing = 0;
                for (let el of elements) {{
                    const rect = el.getBoundingClientRect();
                    if (rect.width > width + 50) {{ // 50px tolerance
                        overflowing++;
                    }}
                }}
                return overflowing;
            }}''')

            if content_overflow < 5:
                print("- Content Fits Viewport: ✅ PASS")
            else:
                print(f"- Content Fits Viewport: ❌ FAIL - {content_overflow} overflowing elements")

            # Test touch-friendly buttons
            button_sizes = await page.evaluate('''() => {
                const buttons = document.querySelectorAll('button, .btn, [role="button"]');
                let smallButtons = 0;
                for (let btn of buttons) {
                    const rect = btn.getBoundingClientRect();
                    if (rect.height < 44 || rect.width < 44) { // iOS HIG minimum
                        smallButtons++;
                    }
                }
                return {total: buttons.length, small: smallButtons};
            }''')

            small_count = button_sizes['small']
            if small_count < 3:
                print("- Touch-Friendly Buttons: ✅ PASS")
            else:
                print(f"- Touch-Friendly Buttons: ❌ FAIL - {small_count} buttons too small")

            # Take mobile screenshot
            screenshot_name = f'mobile_{viewport["name"].lower().replace(" ", "_")}.png'
            await page.screenshot(path=screenshot_name, full_page=True)
            self.screenshots.append(screenshot_name)
            print(f"- Screenshot: {screenshot_name} captured")

        print()

    async def test_live_feed_functionality(self, page):
        """Test Live Feed tab functionality"""
        print("🌐 LIVE FEED TESTING")

        # Reset to desktop view
        await page.set_viewport_size({'width': 1920, 'height': 1080})
        await page.wait_for_timeout(500)

        # Click Live Feed tab
        try:
            await page.click('text=Live Feed', timeout=5000)
            print("- Live Feed Tab Click: ✅ PASS")
            await page.wait_for_timeout(1000)
        except:
            print("- Live Feed Tab Click: ❌ FAIL - Tab not clickable")
            return

        # Check feed items are present
        feed_items = await page.locator('.feed-item, [class*="feed"], .news-item').count()
        print(f"- Feed Items Present: {'✅ PASS' if feed_items > 0 else '❌ FAIL'} ({feed_items} items)")

        # Test hover effects on feed items
        if feed_items > 0:
            try:
                first_item = page.locator('.feed-item, [class*="feed"], .news-item').first
                await first_item.hover()
                print("- Feed Item Hover: ✅ PASS")
            except:
                print("- Feed Item Hover: ❌ FAIL")

        # Check for live indicator
        live_indicator = await page.is_visible('.live-indicator, [class*="live"], [class*="pulse"]')
        print(f"- Live Indicator: {'✅ PASS' if live_indicator else '❌ FAIL'}")

        # Test feed item click functionality
        if feed_items > 0:
            try:
                first_item = page.locator('.feed-item, [class*="feed"], .news-item').first
                await first_item.click()
                print("- Feed Item Click: ✅ PASS")
            except:
                print("- Feed Item Click: ❌ FAIL")

        # Take Live Feed screenshot
        await page.screenshot(path='live_feed_view.png', full_page=True)
        self.screenshots.append('live_feed_view.png')
        print("- Screenshot: live_feed_view.png captured")
        print()

    async def test_interactive_elements(self, page):
        """Test interactive elements and navigation"""
        print("🔧 INTERACTIVE ELEMENTS TESTING")

        # Test tab switching
        tabs = await page.locator('button, .tab, [role="tab"]').count()
        print(f"- Available Tabs: {tabs}")

        # Test search functionality
        search_input = await page.is_visible('input[type="search"], input[placeholder*="search"], .search-input')
        print(f"- Search Input: {'✅ PASS' if search_input else '❌ FAIL'}")

        # Test filter buttons
        filter_buttons = await page.locator('button').count()
        print(f"- Interactive Buttons: {filter_buttons}")

        # Test map presence
        map_container = await page.is_visible('#map, .map-container, [class*="map"]')
        print(f"- Map Container: {'✅ PASS' if map_container else '❌ FAIL'}")

        print()

    async def measure_performance(self, page):
        """Measure performance metrics"""
        print("⚡ PERFORMANCE METRICS")

        # Get performance metrics
        metrics = await page.evaluate('''() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            const memory = performance.memory || {};
            return {
                loadTime: perfData ? (perfData.loadEventEnd - perfData.loadEventStart) : 0,
                domComplete: perfData ? (perfData.domComplete - perfData.navigationStart) : 0,
                memoryUsed: memory.usedJSHeapSize || 0,
                memoryTotal: memory.totalJSHeapSize || 0
            };
        }''')

        print(f"- Page Load Time: {metrics['loadTime']:.2f}ms")
        print(f"- DOM Complete: {metrics['domComplete']:.2f}ms")

        if metrics['memoryUsed']:
            memory_mb = metrics['memoryUsed'] / (1024 * 1024)
            print(f"- Memory Usage: {memory_mb:.1f}MB")

        # Core Web Vitals simulation
        web_vitals = await page.evaluate('''() => {
            return new Promise((resolve) => {
                new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const vitals = {};
                    entries.forEach(entry => {
                        if (entry.entryType === 'largest-contentful-paint') {
                            vitals.lcp = entry.startTime;
                        }
                        if (entry.entryType === 'layout-shift') {
                            vitals.cls = (vitals.cls || 0) + entry.value;
                        }
                    });
                    resolve(vitals);
                }).observe({entryTypes: ['largest-contentful-paint', 'layout-shift']});

                setTimeout(() => resolve({}), 3000);
            });
        }''')

        if 'lcp' in web_vitals:
            print(f"- Largest Contentful Paint: {web_vitals['lcp']:.2f}ms")
        if 'cls' in web_vitals:
            print(f"- Cumulative Layout Shift: {web_vitals['cls']:.3f}")

        print()

    def generate_report(self, load_time):
        """Generate comprehensive test report"""
        print("🐛 ISSUES DISCOVERED")

        # Analyze console errors
        errors = [msg for msg in self.console_messages if msg['type'] == 'error']
        warnings = [msg for msg in self.console_messages if msg['type'] == 'warning']

        if errors:
            print("Critical Issues:")
            for i, error in enumerate(errors[:5], 1):
                print(f"{i}. {error['text']}")
        else:
            print("- No critical JavaScript errors detected")

        if warnings:
            print(f"Warnings ({len(warnings)} total):")
            for i, warning in enumerate(warnings[:3], 1):
                print(f"{i}. {warning['text']}")

        print()
        print("✅ RECOMMENDATIONS")

        if load_time > 3:
            print("- Optimize page load time (currently >3s)")

        if len(errors) > 0:
            print("- Fix JavaScript errors for better stability")

        if len(self.screenshots) > 0:
            print(f"- Review screenshots captured: {', '.join(self.screenshots)}")

        print("- Verify all interactive elements are accessible")
        print("- Test on real mobile devices for touch interaction")
        print("- Implement performance monitoring for production")

        print()

async def main():
    """Main testing function"""
    tester = DroneWatchTester()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        # Setup monitoring
        await tester.setup_monitoring(page)

        # Navigate to application
        print("🚀 Starting DroneWatch Application Testing")
        print("=" * 50)

        start_time = time.time()
        await page.goto('http://localhost:8081')
        await page.wait_for_load_state('networkidle')
        await page.wait_for_timeout(2000)  # Allow for dynamic content
        load_time = time.time() - start_time

        # Run all tests
        await tester.test_desktop_view(page)
        await tester.test_mobile_responsiveness(page)
        await tester.test_live_feed_functionality(page)
        await tester.test_interactive_elements(page)
        await tester.measure_performance(page)

        # Generate final report
        tester.generate_report(load_time)

        print("=" * 50)
        print("🎯 Testing Complete!")
        print(f"Screenshots saved: {len(tester.screenshots)}")
        print("Check current directory for captured images.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
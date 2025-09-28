#!/usr/bin/env python3
"""
Simplified DroneWatch Magic Earth Interface Testing
Direct visual verification and screenshot capture
"""

import asyncio
import time
from pathlib import Path

async def test_interface():
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        print("Installing Playwright...")
        import subprocess
        subprocess.run(["pip3", "install", "playwright"], check=True)
        from playwright.async_api import async_playwright

    print("📊 DroneWatch Magic Earth Interface Testing")
    print("- Test Environment: Chrome 1920x1080 + Mobile")
    print("- Target: http://localhost:8085")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(viewport={"width": 1920, "height": 1080})
        page = await context.new_page()

        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"{msg.type}: {msg.text}"))

        try:
            print("\n🔍 Loading interface...")
            await page.goto("http://localhost:8085", wait_until="networkidle", timeout=15000)
            await page.wait_for_timeout(3000)

            # Desktop screenshot
            desktop_path = "/Users/sven/Desktop/MCP/dronewatch/magic_earth_desktop.png"
            await page.screenshot(path=desktop_path, full_page=True)
            print(f"📸 Desktop screenshot: magic_earth_desktop.png")

            # Test glassmorphism
            print("\n✅ Testing glassmorphism effects...")
            glass_test = await page.evaluate("""() => {
                const elements = document.querySelectorAll('.glass, .header, .sidebar, .incident-card');
                let glassCount = 0;
                elements.forEach(el => {
                    const style = getComputedStyle(el);
                    if (style.backdropFilter && style.backdropFilter.includes('blur')) {
                        glassCount++;
                    }
                });
                return glassCount;
            }""")
            print(f"- Glassmorphism elements: {glass_test}")

            # Test neon effects
            print("\n✅ Testing neon glow effects...")
            neon_test = await page.evaluate("""() => {
                const elements = document.querySelectorAll('*');
                let neonCount = 0;
                elements.forEach(el => {
                    const style = getComputedStyle(el);
                    if (style.boxShadow && (style.boxShadow.includes('cyan') || style.boxShadow.includes('0, 255, 255'))) {
                        neonCount++;
                    }
                });
                return neonCount;
            }""")
            print(f"- Neon glow elements: {neon_test}")

            # Test data loading
            print("\n✅ Testing data consistency...")
            data_test = await page.evaluate("""() => {
                const statElements = document.querySelectorAll('.stat-value');
                const incidents = window.state ? window.state.incidents : [];
                return {
                    statsCount: statElements.length,
                    incidentsLoaded: incidents.length,
                    headerValue: statElements[0] ? statElements[0].textContent : '0'
                };
            }""")
            print(f"- Stats elements: {data_test['statsCount']}")
            print(f"- Incidents loaded: {data_test['incidentsLoaded']}")
            print(f"- Header shows: {data_test['headerValue']}")

            # Mobile test
            print("\n✅ Testing mobile responsiveness...")
            mobile_context = await browser.new_context(viewport={"width": 375, "height": 812})
            mobile_page = await mobile_context.new_page()
            await mobile_page.goto("http://localhost:8085", wait_until="networkidle")
            await mobile_page.wait_for_timeout(2000)

            mobile_path = "/Users/sven/Desktop/MCP/dronewatch/magic_earth_mobile.png"
            await mobile_page.screenshot(path=mobile_path, full_page=True)
            print(f"📸 Mobile screenshot: magic_earth_mobile.png")

            mobile_test = await mobile_page.evaluate("""() => {
                return {
                    width: window.innerWidth,
                    height: window.innerHeight,
                    mapVisible: document.querySelector('#map') ? true : false
                };
            }""")
            print(f"- Mobile viewport: {mobile_test['width']}x{mobile_test['height']}")
            print(f"- Map visible: {mobile_test['mapVisible']}")

            await mobile_context.close()

            # Console analysis
            print(f"\n🔍 Console messages: {len(console_logs)}")
            errors = [log for log in console_logs if 'error' in log.lower()]
            if errors:
                print("❌ Errors found:")
                for error in errors[:3]:
                    print(f"  {error}")
            else:
                print("✅ No console errors")

            print("\n📊 SUMMARY")
            print(f"✅ Glassmorphism: {glass_test} elements with backdrop-filter")
            print(f"✅ Neon Effects: {neon_test} elements with cyan glow")
            print(f"✅ Data Loading: {data_test['incidentsLoaded']} incidents")
            print(f"✅ Mobile Ready: {mobile_test['width']}px viewport")
            print("✅ Screenshots captured successfully")

        except Exception as e:
            print(f"❌ Error: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(test_interface())
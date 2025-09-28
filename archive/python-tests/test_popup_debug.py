#!/usr/bin/env python3
"""
Debug test to investigate popup source links
"""

import asyncio
from playwright.async_api import async_playwright

async def debug_popup():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, slow_mo=2000)
        page = await browser.new_page()

        # Enable console logging
        page.on('console', lambda msg: print(f"[CONSOLE] {msg.text}"))
        page.on('pageerror', lambda error: print(f"[ERROR] {error}"))

        print("🔍 Debugging popup and source links...")

        try:
            await page.goto('http://localhost:8010/')
            await page.wait_for_timeout(8000)  # Wait longer for full load

            print("📍 Page loaded, checking markers...")

            # Check if markers exist
            markers = await page.locator('.leaflet-marker-icon').count()
            print(f"🎯 Found {markers} markers")

            if markers > 0:
                print("🖱️ Clicking first marker...")

                # Try different approaches to click the marker
                try:
                    # Method 1: Direct click
                    await page.locator('.leaflet-marker-icon').first.click()
                    await page.wait_for_timeout(3000)

                    # Check for popup
                    popup = await page.locator('.leaflet-popup').count()
                    print(f"📋 Popups after click: {popup}")

                    if popup > 0:
                        # Get popup content
                        popup_html = await page.locator('.leaflet-popup').inner_html()
                        print(f"📝 Popup HTML length: {len(popup_html)}")

                        # Look for links
                        links = await page.locator('.leaflet-popup a').count()
                        print(f"🔗 Links in popup: {links}")

                        if links > 0:
                            for i in range(links):
                                link = page.locator('.leaflet-popup a').nth(i)
                                href = await link.get_attribute('href')
                                text = await link.text_content()
                                target = await link.get_attribute('target')
                                print(f"   Link {i+1}: '{text}' -> {href} (target: {target})")

                        # Take screenshot
                        await page.screenshot(path='/Users/sven/Desktop/MCP/dronewatch/debug_popup_open.png')
                        print("📸 Screenshot saved: debug_popup_open.png")

                    else:
                        print("❌ No popup appeared after marker click")

                        # Check if there are any clickable elements
                        clickables = await page.locator('.leaflet-marker-icon, .leaflet-clickable').count()
                        print(f"🎯 Clickable elements: {clickables}")

                        # Try clicking on map center
                        print("🗺️ Trying to click on map center...")
                        await page.locator('#map').click()
                        await page.wait_for_timeout(2000)

                        popup_after_map_click = await page.locator('.leaflet-popup').count()
                        print(f"📋 Popups after map click: {popup_after_map_click}")

                except Exception as e:
                    print(f"❌ Error clicking marker: {e}")

            else:
                print("❌ No markers found on map")

                # Debug map state
                map_initialized = await page.evaluate("typeof window.map !== 'undefined'")
                print(f"🗺️ Map initialized: {map_initialized}")

                if map_initialized:
                    layers = await page.evaluate("window.map ? Object.keys(window.map._layers).length : 0")
                    print(f"🧩 Map layers: {layers}")

            # Check state for incidents
            incidents_count = await page.evaluate("window.state ? window.state.incidents.length : 0")
            print(f"📊 Incidents in state: {incidents_count}")

            await page.wait_for_timeout(5000)

        except Exception as e:
            print(f"❌ Debug error: {e}")

        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(debug_popup())
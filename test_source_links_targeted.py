#!/usr/bin/env python3
"""
Targeted test for source links functionality
Focus on valid coordinate markers and their popups
"""

import asyncio
from playwright.async_api import async_playwright

async def test_source_links():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, slow_mo=1500)
        page = await browser.new_page()

        # Enable detailed console logging
        page.on('console', lambda msg: print(f"[CONSOLE] {msg.text}"))
        page.on('pageerror', lambda error: print(f"[ERROR] {error}"))

        print("🎯 TARGETED SOURCE LINKS TEST")
        print("=" * 50)

        try:
            await page.goto('http://localhost:8010/')
            await page.wait_for_timeout(8000)  # Wait for full load

            print("📍 Finding valid markers with coordinates...")

            # Get all markers and their positions
            markers = await page.locator('.leaflet-marker-icon').count()
            print(f"🎯 Total markers found: {markers}")

            # Since we know there are valid incidents, let's try clicking each marker
            source_links_found = 0

            for i in range(min(markers, 5)):  # Test up to 5 markers
                print(f"\n🖱️ Testing marker {i+1}...")

                try:
                    # Click the marker
                    marker = page.locator('.leaflet-marker-icon').nth(i)
                    await marker.click()
                    await page.wait_for_timeout(2000)

                    # Check for popup
                    popup = await page.locator('.leaflet-popup').first
                    popup_visible = await popup.is_visible()

                    if popup_visible:
                        print(f"   ✅ Popup {i+1} opened successfully")

                        # Get popup content
                        popup_html = await popup.inner_html()

                        # Look for source links
                        source_links = await popup.locator('a[href]').count()
                        print(f"   🔗 Source links found: {source_links}")

                        if source_links > 0:
                            source_links_found += source_links

                            # Test each source link
                            for j in range(source_links):
                                link = popup.locator('a[href]').nth(j)
                                href = await link.get_attribute('href')
                                text = await link.text_content()
                                target = await link.get_attribute('target')

                                print(f"     📎 Link {j+1}: '{text.strip()}' -> {href}")
                                print(f"       Target: {target}, Clickable: {await link.is_enabled()}")

                        # Take a screenshot of this popup
                        await page.screenshot(path=f'/Users/sven/Desktop/MCP/dronewatch/source_links_popup_{i+1}.png')
                        print(f"     📸 Screenshot: source_links_popup_{i+1}.png")

                        # Close popup by clicking elsewhere
                        await page.locator('#map').click()
                        await page.wait_for_timeout(1000)

                    else:
                        print(f"   ❌ No popup appeared for marker {i+1}")

                except Exception as e:
                    print(f"   ❌ Error with marker {i+1}: {e}")

            print(f"\n📊 RESULTS SUMMARY:")
            print(f"   • Total markers tested: {min(markers, 5)}")
            print(f"   • Total source links found: {source_links_found}")

            # Test the sidebar incident cards as well
            print(f"\n📋 Testing sidebar incident cards...")
            incident_cards = await page.locator('.incident-card').count()
            print(f"   • Incident cards in sidebar: {incident_cards}")

            # Check if any cards have source links directly
            sidebar_links = await page.locator('.incident-card a[href]').count()
            print(f"   • Direct links in sidebar cards: {sidebar_links}")

            # Final comprehensive screenshot
            await page.screenshot(path='/Users/sven/Desktop/MCP/dronewatch/source_links_final_test.png', full_page=True)
            print(f"📸 Final screenshot: source_links_final_test.png")

            # Overall assessment
            if source_links_found > 0:
                print(f"\n✅ SOURCE LINKS TEST: PASS")
                print(f"   Found {source_links_found} working source links")
            else:
                print(f"\n❌ SOURCE LINKS TEST: FAIL")
                print(f"   No source links found in any popups")

        except Exception as e:
            print(f"❌ Critical error: {e}")

        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(test_source_links())
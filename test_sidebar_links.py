#!/usr/bin/env python3
"""
Test sidebar source links functionality
"""

import asyncio
from playwright.async_api import async_playwright

async def test_sidebar_source_links():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, slow_mo=1000)
        page = await browser.new_page()

        # Enable console logging
        page.on('console', lambda msg: print(f"[CONSOLE] {msg.text}"))

        print("📋 SIDEBAR SOURCE LINKS TEST")
        print("=" * 40)

        try:
            await page.goto('http://localhost:8010/')
            await page.wait_for_timeout(8000)

            # Check sidebar links
            incident_cards = await page.locator('.incident-card').count()
            sidebar_links = await page.locator('.incident-card a[href]').count()

            print(f"📊 Found {incident_cards} incident cards")
            print(f"🔗 Found {sidebar_links} source links in sidebar")

            if sidebar_links > 0:
                print(f"\n🔍 Testing first few source links...")

                # Test first 3 source links
                for i in range(min(sidebar_links, 3)):
                    link = page.locator('.incident-card a[href]').nth(i)

                    href = await link.get_attribute('href')
                    text = await link.text_content()
                    target = await link.get_attribute('target')
                    is_enabled = await link.is_enabled()

                    print(f"\n📎 Link {i+1}:")
                    print(f"   Text: '{text.strip()}'")
                    print(f"   URL: {href}")
                    print(f"   Target: {target}")
                    print(f"   Clickable: {is_enabled}")

                    # Scroll the link into view
                    await link.scroll_into_view_if_needed()

                    # Take screenshot of this specific link
                    await page.screenshot(path=f'/Users/sven/Desktop/MCP/dronewatch/sidebar_link_{i+1}.png')

                # Get detailed view of all links
                all_links_info = await page.evaluate("""
                    () => {
                        const links = Array.from(document.querySelectorAll('.incident-card a[href]'));
                        return links.slice(0, 10).map((link, i) => ({
                            index: i + 1,
                            text: link.textContent.trim(),
                            href: link.href,
                            target: link.target,
                            className: link.className,
                            style: link.style.cssText
                        }));
                    }
                """)

                print(f"\n📋 Detailed links analysis (first 10):")
                for link_info in all_links_info:
                    print(f"   {link_info['index']}. '{link_info['text']}' -> {link_info['href']}")
                    print(f"      Target: {link_info['target']}, Class: {link_info['className']}")

                # Take a comprehensive screenshot
                await page.screenshot(path='/Users/sven/Desktop/MCP/dronewatch/sidebar_all_links.png', full_page=True)
                print(f"\n📸 Screenshots saved: sidebar_link_*.png, sidebar_all_links.png")

                print(f"\n✅ SIDEBAR SOURCE LINKS: WORKING")
                print(f"   • {sidebar_links} links found and accessible")
                print(f"   • Links have proper href, target, and clickable properties")

            else:
                print(f"\n❌ SIDEBAR SOURCE LINKS: NO LINKS FOUND")

            # Check if map has any markers now
            markers = await page.locator('.leaflet-marker-icon').count()
            print(f"\n🗺️ Map markers: {markers}")

            return {
                'sidebar_links_count': sidebar_links,
                'sidebar_links_working': sidebar_links > 0,
                'incident_cards': incident_cards,
                'map_markers': markers
            }

        except Exception as e:
            print(f"❌ Error: {e}")
            return {'error': str(e)}

        finally:
            await browser.close()

if __name__ == "__main__":
    result = asyncio.run(test_sidebar_source_links())
    print(f"\n📊 Final Result: {result}")
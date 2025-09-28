#!/usr/bin/env python3
"""
Debug test to check data loading and state management
"""

import asyncio
from playwright.async_api import async_playwright

async def debug_data_loading():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, slow_mo=1000)
        page = await browser.new_page()

        # Enable console logging
        page.on('console', lambda msg: print(f"[CONSOLE] {msg.text}"))
        page.on('pageerror', lambda error: print(f"[ERROR] {error}"))

        print("🔍 Debugging data loading and state...")

        try:
            await page.goto('http://localhost:8010/')
            await page.wait_for_timeout(10000)  # Wait longer for full load

            # Check the state object
            state_data = await page.evaluate("""
                () => {
                    return {
                        stateExists: typeof window.state !== 'undefined',
                        incidents: window.state ? window.state.incidents.length : 'no state',
                        incidentsArray: window.state ? window.state.incidents : null,
                        mapExists: typeof window.map !== 'undefined',
                        dataLoaded: window.state ? window.state.dataLoaded : false
                    };
                }
            """)

            print(f"📊 State Analysis:")
            print(f"   • State exists: {state_data['stateExists']}")
            print(f"   • Incidents count: {state_data['incidents']}")
            print(f"   • Data loaded flag: {state_data['dataLoaded']}")
            print(f"   • Map exists: {state_data['mapExists']}")

            # Check if incidents data has the lat/lon issue (lat: 0, lon: 0)
            if state_data['incidentsArray']:
                first_few = state_data['incidentsArray'][:3]
                print(f"📍 First few incidents data:")
                for i, incident in enumerate(first_few):
                    if incident and 'asset' in incident:
                        lat = incident['asset'].get('lat', 'missing')
                        lon = incident['asset'].get('lon', 'missing')
                        name = incident['asset'].get('name', 'missing')
                        print(f"   {i+1}. {name}: lat={lat}, lon={lon}")

            # Check what's actually rendered in DOM
            incident_cards = await page.locator('.incident-card').count()
            print(f"📋 Incident cards in DOM: {incident_cards}")

            # Check map markers
            markers = await page.locator('.leaflet-marker-icon').count()
            print(f"🎯 Map markers: {markers}")

            # Check for the sidebar content
            sidebar_content = await page.locator('#sidebar').inner_text()
            print(f"📄 Sidebar content length: {len(sidebar_content)} chars")

            # If there are markers, try to get their positions
            if markers > 0:
                marker_positions = await page.evaluate("""
                    () => {
                        const markers = document.querySelectorAll('.leaflet-marker-icon');
                        return Array.from(markers).slice(0, 3).map((marker, i) => {
                            const style = marker.style.transform;
                            return `Marker ${i+1}: ${style}`;
                        });
                    }
                """)
                print(f"🗺️ Marker positions:")
                for pos in marker_positions:
                    print(f"   • {pos}")

            # Try to manually trigger a marker click by JavaScript
            if markers > 0:
                print("🖱️ Trying to trigger marker click via JavaScript...")
                click_result = await page.evaluate("""
                    () => {
                        const marker = document.querySelector('.leaflet-marker-icon');
                        if (marker) {
                            marker.click();
                            setTimeout(() => {
                                const popup = document.querySelector('.leaflet-popup');
                                return popup ? 'popup appeared' : 'no popup';
                            }, 1000);
                            return 'clicked marker';
                        }
                        return 'no marker found';
                    }
                """)
                print(f"   Result: {click_result}")

                await page.wait_for_timeout(2000)

                # Check for popup again
                popup_count = await page.locator('.leaflet-popup').count()
                print(f"📋 Popups after JS click: {popup_count}")

                if popup_count > 0:
                    popup_html = await page.locator('.leaflet-popup').inner_html()
                    print(f"📝 Popup HTML snippet: {popup_html[:200]}...")

                    # Look for source links
                    source_links = await page.locator('.leaflet-popup a[href]').count()
                    print(f"🔗 Source links in popup: {source_links}")

            await page.screenshot(path='/Users/sven/Desktop/MCP/dronewatch/debug_data_state.png')
            print("📸 Screenshot saved: debug_data_state.png")

        except Exception as e:
            print(f"❌ Debug error: {e}")

        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(debug_data_loading())
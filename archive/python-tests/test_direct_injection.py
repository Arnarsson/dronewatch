#!/usr/bin/env python3

"""
Test by directly injecting JavaScript to check state and map creation.
"""

from playwright.sync_api import sync_playwright
import time

def test_direct_injection():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        print("🔍 Testing with direct JavaScript injection...")

        # Load the page
        page.goto("http://localhost:8085")
        page.wait_for_timeout(3000)

        print("\n📋 Step 1: Check current state")
        current_state = page.evaluate("""
            () => {
                return {
                    state_exists: typeof window.state !== 'undefined',
                    state_value: window.state,
                    leaflet_available: typeof L !== 'undefined',
                    map_element: !!document.getElementById('map')
                };
            }
        """)
        for key, value in current_state.items():
            if key == 'state_value':
                print(f"   {key}: {type(value)} {str(value)[:100] if value else value}")
            else:
                print(f"   {key}: {value}")

        print("\n🛠️ Step 2: Manually create state and map")
        manual_creation = page.evaluate("""
            () => {
                try {
                    // Create state if it doesn't exist
                    if (typeof window.state === 'undefined') {
                        window.state = {
                            map: null,
                            incidents: [],
                            markers: new Map(),
                            clusterGroup: null,
                            filters: { status: 'all' }
                        };
                        console.log('✅ Manually created state object');
                    }

                    // Try to create map
                    const mapElement = document.getElementById('map');
                    if (mapElement && !window.state.map) {
                        window.state.map = L.map('map').setView([54.5, 15.0], 5);

                        // Add tiles
                        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                            attribution: '© OpenStreetMap contributors © CARTO',
                            maxZoom: 19
                        }).addTo(window.state.map);

                        console.log('✅ Manually created map');
                        return { success: true, map_created: true };
                    }

                    return { success: true, map_created: false, reason: 'element or map already exists' };
                } catch (error) {
                    console.error('❌ Manual creation failed:', error);
                    return { success: false, error: error.message };
                }
            }
        """)

        print(f"   Manual creation result: {manual_creation}")

        print("\n📊 Step 3: Check state after manual creation")
        after_creation = page.evaluate("""
            () => {
                return {
                    state_exists: typeof window.state !== 'undefined',
                    map_exists: window.state && !!window.state.map,
                    map_has_tiles: window.state?.map ? Object.keys(window.state.map._layers).length : 0,
                    map_center: window.state?.map ? window.state.map.getCenter() : null,
                    incidents_count: window.state ? window.state.incidents.length : 0
                };
            }
        """)
        for key, value in after_creation.items():
            print(f"   {key}: {value}")

        print("\n🔄 Step 4: Try to load incidents manually")
        incidents_result = page.evaluate("""
            async () => {
                try {
                    // Try to fetch incidents.json
                    const response = await fetch('/incidents.json');
                    if (!response.ok) {
                        return { success: false, error: 'Fetch failed: ' + response.status };
                    }

                    const incidents = await response.json();
                    if (window.state) {
                        window.state.incidents = incidents;
                        console.log('✅ Manually loaded incidents:', incidents.length);
                        return { success: true, incidents_count: incidents.length };
                    }

                    return { success: false, error: 'No state object' };
                } catch (error) {
                    console.error('❌ Incident loading failed:', error);
                    return { success: false, error: error.message };
                }
            }
        """)

        print(f"   Incidents loading result: {incidents_result}")

        print("\n📈 Step 5: Final state check")
        final_state = page.evaluate("""
            () => {
                return {
                    state_exists: typeof window.state !== 'undefined',
                    map_works: window.state?.map ? window.state.map.getZoom() : 'no map',
                    incidents_count: window.state ? window.state.incidents.length : 0,
                    map_container_size: {
                        width: document.getElementById('map').offsetWidth,
                        height: document.getElementById('map').offsetHeight
                    }
                };
            }
        """)
        for key, value in final_state.items():
            print(f"   {key}: {value}")

        # Take screenshot
        page.screenshot(path="test_direct_injection.png", full_page=True)
        print(f"\n📸 Screenshot saved: test_direct_injection.png")

        print(f"\n👀 Page ready for inspection. Press Enter to continue...")
        input()

        browser.close()

if __name__ == "__main__":
    test_direct_injection()
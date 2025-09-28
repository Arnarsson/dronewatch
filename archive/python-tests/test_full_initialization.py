#!/usr/bin/env python3

"""
Test the full initialization sequence to debug incident loading.
"""

from playwright.sync_api import sync_playwright
import time

def test_full_initialization():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        # Set up console monitoring
        console_messages = []

        def handle_console(msg):
            console_messages.append({
                'type': msg.type,
                'text': msg.text,
                'timestamp': time.time()
            })

        page.on('console', handle_console)

        print("🔍 Testing full initialization sequence...")

        # Load the page
        page.goto("http://localhost:8085")

        # Wait for initial load
        page.wait_for_timeout(2000)

        # Check initial state
        initial_state = page.evaluate("""
            () => {
                return {
                    state_defined: typeof window.state !== 'undefined',
                    map_initialized: window.state && !!window.state.map,
                    incidents_array: window.state ? window.state.incidents.length : 'no state',
                    page_loaded: document.readyState
                };
            }
        """)

        print(f"\n📊 Initial State (2s after load):")
        for key, value in initial_state.items():
            print(f"   {key}: {value}")

        # Wait for DOMContentLoaded and check again
        page.wait_for_timeout(3000)

        # Manually trigger the initialization sequence
        print(f"\n🔄 Manually triggering initialization...")

        init_sequence = page.evaluate("""
            async () => {
                try {
                    // Initialize state if not exists
                    if (typeof window.state === 'undefined') {
                        window.state = {
                            map: null,
                            markers: null,
                            incidents: [],
                            filters: {
                                dateRange: 7,
                                status: ['active', 'resolved'],
                                evidence: [0, 1, 2, 3],
                                proximity: { enabled: false }
                            }
                        };
                        console.log('✅ State object created');
                    }

                    // Initialize map
                    if (!window.state.map) {
                        await initMap();
                        console.log('✅ Map initialized');
                    }

                    // Load incidents
                    await loadIncidents();
                    console.log('✅ Incidents loaded');

                    return {
                        success: true,
                        incidents_count: window.state.incidents.length,
                        map_exists: !!window.state.map,
                        markers_count: window.state.clusterGroup ? window.state.clusterGroup.getLayers().length : 0
                    };
                } catch (error) {
                    console.error('❌ Initialization error:', error);
                    return {
                        success: false,
                        error: error.message
                    };
                }
            }
        """)

        print(f"   Initialization result: {init_sequence}")

        # Wait a bit more and check final state
        page.wait_for_timeout(5000)

        final_state = page.evaluate("""
            () => {
                return {
                    state_exists: typeof window.state !== 'undefined',
                    map_exists: window.state && !!window.state.map,
                    incidents_count: window.state ? window.state.incidents.length : 0,
                    markers_count: window.state?.clusterGroup ? window.state.clusterGroup.getLayers().length : 0,
                    map_layers: window.state?.map ? window.state.map._layers : 'no map',
                    map_bounds: window.state?.map ? window.state.map.getBounds() : 'no map'
                };
            }
        """)

        print(f"\n📈 Final State (10s total):")
        for key, value in final_state.items():
            if key == 'map_layers':
                print(f"   {key}: {len(value) if isinstance(value, dict) else value} layers")
            elif key == 'map_bounds':
                print(f"   {key}: {str(value)[:100] if value != 'no map' else value}")
            else:
                print(f"   {key}: {value}")

        # Check for recent console errors
        recent_errors = [msg for msg in console_messages if msg['type'] == 'error']
        if recent_errors:
            print(f"\n❌ Recent Console Errors:")
            for error in recent_errors[-5:]:  # Last 5 errors
                print(f"   {error['text']}")

        # Take screenshot
        page.screenshot(path="test_full_initialization.png", full_page=True)
        print(f"\n📸 Screenshot saved: test_full_initialization.png")

        browser.close()

if __name__ == "__main__":
    test_full_initialization()
#!/usr/bin/env python3

"""
Monitor the state object creation and map initialization in detail.
"""

from playwright.sync_api import sync_playwright
import time

def test_state_monitoring():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        print("🔍 Monitoring state object and map initialization...")

        # Inject monitoring code before the page loads
        page.add_init_script("""
            // Monitor state object creation
            let stateMonitor = {
                stateCreated: false,
                mapInitialized: false,
                errors: []
            };

            // Override console methods to capture messages
            const originalLog = console.log;
            const originalError = console.error;

            console.log = function(...args) {
                if (args[0] && args[0].includes && args[0].includes('Initializing map')) {
                    stateMonitor.mapInitStarted = true;
                }
                if (args[0] && args[0].includes && args[0].includes('Map initialized')) {
                    stateMonitor.mapInitCompleted = true;
                }
                originalLog.apply(console, args);
            };

            console.error = function(...args) {
                stateMonitor.errors.push(args.join(' '));
                originalError.apply(console, args);
            };

            // Monitor window.state
            Object.defineProperty(window, 'state', {
                set: function(value) {
                    console.log('🔧 State object set:', value);
                    stateMonitor.stateCreated = true;
                    stateMonitor.stateValue = value;
                    this._state = value;
                },
                get: function() {
                    return this._state;
                }
            });

            window.stateMonitor = stateMonitor;
        """)

        # Load the page
        page.goto("http://localhost:8085")

        # Monitor state creation over time
        for i in range(10):
            time.sleep(1)

            state_info = page.evaluate("""
                () => {
                    return {
                        second: """ + str(i+1) + """,
                        monitor: window.stateMonitor || {},
                        state_exists: typeof window.state !== 'undefined',
                        state_value: window.state || null,
                        global_keys: Object.keys(window).filter(k => k.includes('state') || k.includes('State'))
                    };
                }
            """)

            print(f"\n⏱️ Second {i+1}:")
            print(f"   State exists: {state_info['state_exists']}")
            print(f"   Monitor: {state_info['monitor']}")
            if state_info['state_value']:
                print(f"   State.map: {state_info['state_value'].get('map', 'None')}")
                print(f"   State.incidents: {len(state_info['state_value'].get('incidents', []))}")

        # Final detailed check
        final_check = page.evaluate("""
            () => {
                try {
                    // Try to access different state variations
                    let results = {
                        window_state: typeof window.state,
                        state_direct: typeof state,
                        monitor_data: window.stateMonitor
                    };

                    // Check if map element has Leaflet instance
                    const mapElement = document.getElementById('map');
                    if (mapElement) {
                        results.map_element_leaflet = mapElement._leaflet_id || 'no leaflet id';
                        results.map_element_innerHTML = mapElement.innerHTML.length;
                    }

                    // Check for Leaflet global
                    results.leaflet_available = typeof L !== 'undefined';

                    return results;
                } catch (error) {
                    return { error: error.message };
                }
            }
        """)

        print(f"\n🔬 Final Detailed Check:")
        for key, value in final_check.items():
            print(f"   {key}: {value}")

        # Take screenshot
        page.screenshot(path="test_state_monitoring.png", full_page=True)
        print(f"\n📸 Screenshot saved: test_state_monitoring.png")

        browser.close()

if __name__ == "__main__":
    test_state_monitoring()
#!/usr/bin/env python3

"""
Test the natural page load without any intervention to see what fails.
"""

from playwright.sync_api import sync_playwright
import time

def test_natural_load():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        # Monitor console messages
        console_messages = []

        def handle_console(msg):
            timestamp = time.time()
            console_messages.append({
                'type': msg.type,
                'text': msg.text,
                'timestamp': timestamp
            })
            # Print errors and important messages in real-time
            if msg.type in ['error', 'warning']:
                print(f"[{msg.type.upper()}] {msg.text}")

        page.on('console', handle_console)

        print("🔍 Testing natural page load (no intervention)...")

        # Load the page and let it initialize naturally
        start_time = time.time()
        page.goto("http://localhost:8085")

        # Wait and periodically check state
        checkpoints = [1, 2, 3, 5, 8, 10]

        for checkpoint in checkpoints:
            page.wait_for_timeout(1000)  # Wait 1 second between checks
            current_time = time.time() - start_time

            if current_time >= checkpoint:
                state = page.evaluate("""
                    () => {
                        return {
                            time: """ + str(checkpoint) + """,
                            state_exists: typeof window.state !== 'undefined',
                            map_exists: window.state && !!window.state.map,
                            map_container_element: !!document.getElementById('map'),
                            incidents_count: window.state ? window.state.incidents.length : 0,
                            markers_count: window.state?.clusterGroup ? window.state.clusterGroup.getLayers().length : 0,
                            ready_state: document.readyState
                        };
                    }
                """)

                print(f"\n⏱️ Checkpoint {checkpoint}s:")
                for key, value in state.items():
                    if key != 'time':
                        status = "✅" if value else "❌" if isinstance(value, bool) else value
                        print(f"   {key}: {status}")

        # Final comprehensive check
        print(f"\n🔍 Final Analysis:")

        final_state = page.evaluate("""
            () => {
                try {
                    const mapElement = document.getElementById('map');
                    const mapElementRect = mapElement ? mapElement.getBoundingClientRect() : null;

                    return {
                        // Basic state
                        state_exists: typeof window.state !== 'undefined',
                        map_exists: window.state && !!window.state.map,
                        incidents_count: window.state ? window.state.incidents.length : 0,

                        // DOM elements
                        map_element_exists: !!mapElement,
                        map_element_dimensions: mapElementRect ? {
                            width: mapElementRect.width,
                            height: mapElementRect.height
                        } : null,

                        // Map state
                        map_initialized: window.state?.map ? true : false,
                        map_has_layers: window.state?.map ? Object.keys(window.state.map._layers).length : 0,
                        cluster_group_exists: !!window.state?.clusterGroup,

                        // Check if initMap function was called
                        init_console_logs: console.log.toString().includes('Initializing map') || false
                    };
                } catch (error) {
                    return { error: error.message };
                }
            }
        """)

        print("📊 Final State:")
        for key, value in final_state.items():
            print(f"   {key}: {value}")

        # Check for specific console messages
        map_logs = [msg for msg in console_messages if 'map' in msg['text'].lower()]
        init_logs = [msg for msg in console_messages if 'initializ' in msg['text'].lower()]

        print(f"\n📝 Map-related Console Messages ({len(map_logs)}):")
        for msg in map_logs[-5:]:  # Last 5 map-related messages
            print(f"   [{msg['type']}] {msg['text']}")

        print(f"\n🚀 Initialization Console Messages ({len(init_logs)}):")
        for msg in init_logs[-5:]:  # Last 5 initialization messages
            print(f"   [{msg['type']}] {msg['text']}")

        # Take a screenshot of the final state
        page.screenshot(path="test_natural_load.png", full_page=True)
        print(f"\n📸 Screenshot saved: test_natural_load.png")

        browser.close()

if __name__ == "__main__":
    test_natural_load()
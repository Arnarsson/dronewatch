#!/usr/bin/env python3

"""
Check console messages to debug the initialization issue.
"""

from playwright.sync_api import sync_playwright
import time

def check_console():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        console_messages = []

        def handle_console(msg):
            console_messages.append({
                'type': msg.type,
                'text': msg.text,
                'location': msg.location
            })

        page.on('console', handle_console)

        print("🔍 Loading page and capturing console...")

        # Load the page
        page.goto("http://localhost:8085")

        # Wait for page to load completely
        page.wait_for_timeout(8000)

        print(f"\n📋 Console Messages ({len(console_messages)} total):")

        for i, msg in enumerate(console_messages):
            if msg['type'] in ['error', 'warning']:
                print(f"\n   {i+1}. [{msg['type'].upper()}] {msg['text']}")
                if msg['location']:
                    print(f"      Location: {msg['location']}")

        # Check if key functions exist
        function_check = page.evaluate("""
            () => {
                return {
                    initMap_exists: typeof initMap !== 'undefined',
                    loadIncidents_exists: typeof loadIncidents !== 'undefined',
                    renderIncidents_exists: typeof renderIncidents !== 'undefined',
                    state_exists: typeof state !== 'undefined',
                    Leaflet_exists: typeof L !== 'undefined',
                    jQuery_exists: typeof $ !== 'undefined'
                };
            }
        """)

        print(f"\n🔧 Function Availability:")
        for key, value in function_check.items():
            status = "✅" if value else "❌"
            print(f"   {status} {key}: {value}")

        # Try to check the actual error
        try:
            init_result = page.evaluate("""
                () => {
                    try {
                        if (typeof initMap !== 'undefined') {
                            initMap();
                            return 'Map init called successfully';
                        } else {
                            return 'initMap function not found';
                        }
                    } catch (error) {
                        return 'Error: ' + error.message;
                    }
                }
            """)
            print(f"\n🗺️ Map Initialization Test: {init_result}")
        except Exception as e:
            print(f"\n🗺️ Map Initialization Test Failed: {e}")

        browser.close()

if __name__ == "__main__":
    check_console()
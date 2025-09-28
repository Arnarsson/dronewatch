#!/usr/bin/env python3

"""
Focused test to debug incident loading in DroneWatch.
"""

from playwright.sync_api import sync_playwright
import time

def test_incident_loading():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        print("🔍 Testing incident loading...")

        # Load the page
        page.goto("http://localhost:8085")

        # Wait for page to load
        page.wait_for_timeout(5000)

        # Check if incidents.json is being loaded
        print("\n📊 Network Activity:")
        network_requests = []

        def handle_request(request):
            if 'incidents.json' in request.url:
                network_requests.append({
                    'url': request.url,
                    'method': request.method
                })
                print(f"   📡 Request: {request.method} {request.url}")

        def handle_response(response):
            if 'incidents.json' in response.url:
                print(f"   📨 Response: {response.status} {response.url}")
                print(f"   📏 Content Length: {response.headers.get('content-length', 'Unknown')}")

        page.on('request', handle_request)
        page.on('response', handle_response)

        # Force reload to capture network activity
        page.reload()
        page.wait_for_timeout(3000)

        # Check JavaScript state
        js_state = page.evaluate("""
            () => {
                return {
                    incidents_length: window.state ? window.state.incidents.length : 'state not found',
                    map_exists: !!window.state?.map,
                    cluster_group_exists: !!window.state?.clusterGroup,
                    loadIncidents_exists: typeof loadIncidents !== 'undefined',
                    console_errors: window.console_errors || []
                };
            }
        """)

        print(f"\n🔧 JavaScript State:")
        for key, value in js_state.items():
            print(f"   {key}: {value}")

        # Try to manually trigger incident loading
        print(f"\n🔄 Manually triggering incident loading...")
        try:
            manual_load_result = page.evaluate("loadIncidents()")
            print(f"   Manual load result: {manual_load_result}")
        except Exception as e:
            print(f"   Manual load failed: {e}")

        # Wait and check again
        page.wait_for_timeout(3000)

        # Check final state
        final_state = page.evaluate("""
            () => {
                return {
                    incidents_count: window.state ? window.state.incidents.length : 0,
                    markers_on_map: window.state?.clusterGroup ? window.state.clusterGroup.getLayers().length : 0,
                    map_center: window.state?.map ? window.state.map.getCenter() : null,
                    map_zoom: window.state?.map ? window.state.map.getZoom() : null
                };
            }
        """)

        print(f"\n📈 Final State:")
        for key, value in final_state.items():
            print(f"   {key}: {value}")

        # Check if any incidents appear in sidebar
        incident_elements = page.locator('.incident-item').count()
        print(f"\n📋 Sidebar incident elements: {incident_elements}")

        # Check if loading indicator is still showing
        loading_overlay = page.locator('#map-loading')
        is_loading_visible = loading_overlay.is_visible() if loading_overlay.count() > 0 else False
        print(f"🔄 Loading overlay visible: {is_loading_visible}")

        # Take a screenshot
        page.screenshot(path="test_incident_loading_debug.png", full_page=True)
        print(f"\n📸 Screenshot saved: test_incident_loading_debug.png")

        print(f"\n👀 Page ready for inspection. Press Enter to continue...")
        input()

        browser.close()

if __name__ == "__main__":
    test_incident_loading()
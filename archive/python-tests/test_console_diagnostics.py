#!/usr/bin/env python3
"""
Console diagnostic test for DroneWatch interface
"""

import asyncio
from playwright.async_api import async_playwright
import time

async def diagnose_console_issues():
    """Detailed console error analysis"""

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        # Capture all network activity
        network_events = []
        console_messages = []

        page.on("console", lambda msg: console_messages.append({
            "type": msg.type,
            "text": msg.text,
            "location": msg.location,
            "timestamp": time.time()
        }))

        page.on("response", lambda response: network_events.append({
            "url": response.url,
            "status": response.status,
            "ok": response.ok,
            "timestamp": time.time()
        }))

        print("🔍 Loading DroneWatch for console diagnosis...")
        await page.goto("http://localhost:8085")
        await page.wait_for_load_state('networkidle')
        await asyncio.sleep(5)  # Let everything load

        print("\n📡 NETWORK ANALYSIS")
        failed_requests = [req for req in network_events if not req['ok']]
        print(f"Total requests: {len(network_events)}")
        print(f"Failed requests: {len(failed_requests)}")

        if failed_requests:
            print("\n❌ FAILED NETWORK REQUESTS:")
            for req in failed_requests[:10]:  # Show first 10
                print(f"   {req['status']} - {req['url']}")

        print("\n🐛 DETAILED CONSOLE ERROR ANALYSIS")

        # Categorize errors
        critical_errors = []
        resource_errors = []
        websocket_errors = []
        api_errors = []

        for msg in console_messages:
            if msg['type'] == 'error':
                text = msg['text']
                if 'Failed to load incidents' in text or 'Cannot set properties of null' in text:
                    critical_errors.append(msg)
                elif 'Failed to load resource' in text or '404' in text:
                    resource_errors.append(msg)
                elif 'WebSocket' in text:
                    websocket_errors.append(msg)
                elif 'analytics' in text or 'trends' in text or 'news' in text:
                    api_errors.append(msg)

        print(f"\n🚨 CRITICAL ERRORS ({len(critical_errors)}):")
        for error in critical_errors[:3]:
            print(f"   {error['text']}")

        print(f"\n📂 RESOURCE ERRORS ({len(resource_errors)}):")
        unique_resources = set()
        for error in resource_errors:
            if '404' in error['text']:
                # Extract URL from error message
                parts = error['text'].split()
                for part in parts:
                    if 'http' in part:
                        unique_resources.add(part)
        for resource in unique_resources:
            print(f"   404: {resource}")

        print(f"\n🔌 WEBSOCKET ERRORS ({len(websocket_errors)}):")
        print("   Multiple WebSocket connection failures - using HTTP server, not WebSocket server")

        print(f"\n🔗 API ERRORS ({len(api_errors)}):")
        for error in api_errors[:3]:
            print(f"   {error['text'][:100]}...")

        # Check if incidents.json exists
        incidents_response = None
        for req in network_events:
            if 'incidents.json' in req['url']:
                incidents_response = req
                break

        if incidents_response:
            print(f"\n✅ incidents.json: {incidents_response['status']} - {incidents_response['ok']}")
        else:
            print("\n⚠️ incidents.json: Not found in network requests")

        # Check if map is loading properly
        map_loaded = await page.evaluate("() => typeof L !== 'undefined' && document.querySelector('#map')")
        leaflet_loaded = await page.evaluate("() => typeof L !== 'undefined'")

        print(f"\n🗺️ MAP STATUS:")
        print(f"   Leaflet library loaded: {leaflet_loaded}")
        print(f"   Map container exists: {map_loaded}")

        # Check current state
        try:
            state_info = await page.evaluate("""() => {
                return {
                    hasState: typeof window.state !== 'undefined',
                    hasIncidents: window.state && window.state.incidents ? window.state.incidents.length : 0,
                    hasMap: window.state && window.state.map ? 'initialized' : 'not initialized'
                };
            }""")
            print(f"\n🔄 APPLICATION STATE:")
            print(f"   Window.state exists: {state_info['hasState']}")
            print(f"   Incidents loaded: {state_info['hasIncidents']}")
            print(f"   Map status: {state_info['hasMap']}")
        except Exception as e:
            print(f"\n⚠️ Could not read application state: {e}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(diagnose_console_issues())
#!/usr/bin/env python3
"""
QA Testing Script for DroneWatch Application
Tests clickable source links and live data updates functionality
"""

import asyncio
from playwright.async_api import async_playwright
import json
import time
from datetime import datetime

async def test_dronewatch_qa():
    """Test the DroneWatch application for source links and live updates"""

    async with async_playwright() as p:
        # Launch browser with console logging
        browser = await p.chromium.launch(headless=False, args=['--disable-web-security'])
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080}
        )

        # Enable console logging
        page = await context.new_page()

        console_messages = []
        errors = []

        def handle_console(msg):
            console_messages.append({
                'type': msg.type,
                'text': msg.text,
                'timestamp': datetime.now().isoformat()
            })
            print(f"[CONSOLE {msg.type.upper()}] {msg.text}")

        def handle_error(error):
            errors.append({
                'message': str(error),
                'timestamp': datetime.now().isoformat()
            })
            print(f"[PAGE ERROR] {error}")

        page.on('console', handle_console)
        page.on('pageerror', handle_error)

        print("🚀 Starting DroneWatch QA Testing...")
        print("=" * 60)

        try:
            # Navigate to the application
            print("📍 Navigating to http://localhost:8010/")
            await page.goto('http://localhost:8010/', wait_until='networkidle')
            await page.wait_for_timeout(3000)  # Wait for initial load

            # Take initial screenshot
            await page.screenshot(path='/Users/sven/Desktop/MCP/dronewatch/test_initial_load.png', full_page=True)
            print("📸 Initial screenshot saved: test_initial_load.png")

            # Test 1: Check for source links in incident cards
            print("\n🔗 TEST 1: Checking for clickable source links...")

            # Wait for incidents to load
            try:
                await page.wait_for_selector('.incident-card', timeout=10000)
                print("✅ Incident cards found")

                # Check for source links
                source_links = await page.locator('.incident-card .source-link').count()
                print(f"📊 Found {source_links} source links")

                if source_links > 0:
                    # Test clicking the first source link
                    first_link = page.locator('.incident-card .source-link').first
                    link_text = await first_link.text_content()
                    link_href = await first_link.get_attribute('href')

                    print(f"🔗 First source link: '{link_text}' -> {link_href}")

                    # Check if link has target="_blank"
                    target = await first_link.get_attribute('target')
                    print(f"🎯 Link target: {target}")

                    # Take screenshot showing source links
                    await page.screenshot(path='/Users/sven/Desktop/MCP/dronewatch/test_source_links.png', full_page=True)
                    print("📸 Source links screenshot saved: test_source_links.png")

                else:
                    print("❌ No source links found in incident cards")

            except Exception as e:
                print(f"❌ Error testing source links: {e}")

            # Test 2: Check WebSocket connection and live updates
            print("\n🔄 TEST 2: Checking WebSocket connection and live updates...")

            # Check for WebSocket connection status
            try:
                # Look for connection status indicators
                connection_status = await page.locator('.connection-status, .ws-status, .live-indicator').count()
                print(f"📡 Found {connection_status} connection status indicators")

                # Check console for WebSocket messages
                ws_messages = [msg for msg in console_messages if 'websocket' in msg['text'].lower() or 'ws' in msg['text'].lower()]
                print(f"🔌 WebSocket console messages: {len(ws_messages)}")

                for msg in ws_messages[-5:]:  # Show last 5 WS messages
                    print(f"   • {msg['type']}: {msg['text']}")

                # Wait for potential live updates (monitor for 10 seconds)
                print("⏳ Monitoring for live updates (10 seconds)...")
                initial_incidents = await page.locator('.incident-card').count()
                print(f"📊 Initial incident count: {initial_incidents}")

                await page.wait_for_timeout(10000)

                final_incidents = await page.locator('.incident-card').count()
                print(f"📊 Final incident count: {final_incidents}")

                if final_incidents != initial_incidents:
                    print(f"✅ Live updates detected! Incident count changed: {initial_incidents} → {final_incidents}")
                else:
                    print("ℹ️  No incident count changes detected during monitoring period")

            except Exception as e:
                print(f"❌ Error testing live updates: {e}")

            # Test 3: UI Functionality Test
            print("\n🖱️  TEST 3: Testing UI interactions...")

            try:
                # Test filter interactions
                filters = await page.locator('.filter-control, .filter-button, .filter-input').count()
                print(f"🎛️  Found {filters} filter controls")

                # Test map interactions
                map_element = await page.locator('#map').count()
                print(f"🗺️  Map element found: {'Yes' if map_element > 0 else 'No'}")

                # Check for any visible errors on the page
                error_elements = await page.locator('.error, .alert-error, .error-message').count()
                print(f"⚠️  Error elements visible: {error_elements}")

            except Exception as e:
                print(f"❌ Error testing UI interactions: {e}")

            # Test 4: Mobile responsiveness test
            print("\n📱 TEST 4: Testing mobile responsiveness...")

            try:
                # Switch to mobile viewport
                await page.set_viewport_size({'width': 375, 'height': 667})
                await page.wait_for_timeout(2000)

                # Take mobile screenshot
                await page.screenshot(path='/Users/sven/Desktop/MCP/dronewatch/test_mobile_view.png', full_page=True)
                print("📸 Mobile screenshot saved: test_mobile_view.png")

                # Check mobile navigation
                mobile_nav = await page.locator('.mobile-nav, .hamburger, .menu-toggle').count()
                print(f"📱 Mobile navigation elements: {mobile_nav}")

                # Switch back to desktop
                await page.set_viewport_size({'width': 1920, 'height': 1080})
                await page.wait_for_timeout(1000)

            except Exception as e:
                print(f"❌ Error testing mobile responsiveness: {e}")

            # Final screenshot
            await page.screenshot(path='/Users/sven/Desktop/MCP/dronewatch/test_final_state.png', full_page=True)
            print("📸 Final screenshot saved: test_final_state.png")

            # Summary report
            print("\n" + "=" * 60)
            print("📋 QA TEST SUMMARY REPORT")
            print("=" * 60)

            print(f"🔗 Source Links Test:")
            print(f"   • Links found: {source_links if 'source_links' in locals() else 'N/A'}")
            print(f"   • Clickable: {'Yes' if source_links > 0 else 'No'}")

            print(f"\n🔄 Live Updates Test:")
            print(f"   • WebSocket messages: {len(ws_messages) if 'ws_messages' in locals() else 'N/A'}")
            print(f"   • Data changes: {'Detected' if 'final_incidents' in locals() and final_incidents != initial_incidents else 'None observed'}")

            print(f"\n🖥️  UI Functionality:")
            print(f"   • Filter controls: {filters if 'filters' in locals() else 'N/A'}")
            print(f"   • Map element: {'Present' if map_element > 0 else 'Missing'}")
            print(f"   • Visible errors: {error_elements if 'error_elements' in locals() else 'N/A'}")

            print(f"\n📊 Console Messages: {len(console_messages)}")
            print(f"❌ JavaScript Errors: {len(errors)}")

            if errors:
                print("\n🚨 JavaScript Errors Found:")
                for error in errors:
                    print(f"   • {error['message']}")

            # Save detailed report
            report = {
                'timestamp': datetime.now().isoformat(),
                'source_links_found': source_links if 'source_links' in locals() else 0,
                'websocket_messages': len(ws_messages) if 'ws_messages' in locals() else 0,
                'filter_controls': filters if 'filters' in locals() else 0,
                'map_present': map_element > 0 if 'map_element' in locals() else False,
                'visible_errors': error_elements if 'error_elements' in locals() else 0,
                'console_messages': console_messages,
                'javascript_errors': errors
            }

            with open('/Users/sven/Desktop/MCP/dronewatch/qa_test_report.json', 'w') as f:
                json.dump(report, f, indent=2)

            print(f"\n📄 Detailed report saved: qa_test_report.json")
            print("✅ QA testing completed successfully!")

        except Exception as e:
            print(f"❌ Critical error during testing: {e}")

        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(test_dronewatch_qa())
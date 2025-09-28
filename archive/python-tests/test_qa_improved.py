#!/usr/bin/env python3
"""
Improved QA Testing Script for DroneWatch Application
Tests clickable source links and live data updates with detailed verification
"""

import asyncio
from playwright.async_api import async_playwright
import json
import time
from datetime import datetime

async def test_dronewatch_comprehensive():
    """Comprehensive test of DroneWatch application functionality"""

    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=False, slow_mo=1000)
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080}
        )

        page = await context.new_page()

        # Track console messages and errors
        console_messages = []
        errors = []
        js_errors = []

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

        def handle_response(response):
            if response.status >= 400:
                print(f"[HTTP ERROR] {response.status} - {response.url}")

        page.on('console', handle_console)
        page.on('pageerror', handle_error)
        page.on('response', handle_response)

        print("🚀 DRONEWATCH QA VERIFICATION TESTING")
        print("=" * 60)

        try:
            # Step 1: Navigate and wait for load
            print("📍 Step 1: Loading application...")
            await page.goto('http://localhost:8010/', wait_until='networkidle')
            await page.wait_for_timeout(5000)  # Allow time for full initialization

            # Initial screenshot
            await page.screenshot(path='/Users/sven/Desktop/MCP/dronewatch/qa_01_initial_load.png', full_page=True)
            print("📸 Screenshot: qa_01_initial_load.png")

            # Step 2: Wait for incidents to load and render
            print("\n📊 Step 2: Waiting for incident data to load...")

            # Wait for either incident cards or a message about no data
            try:
                # Wait longer for incidents to load and render
                await page.wait_for_function("""
                    () => {
                        const cards = document.querySelectorAll('.incident-card');
                        const incidents = window.state && window.state.incidents;
                        console.log('Cards found:', cards.length, 'Incidents loaded:', incidents ? incidents.length : 'none');
                        return cards.length > 0 || (incidents && incidents.length > 0);
                    }
                """, timeout=20000)

                incident_cards = await page.locator('.incident-card').count()
                print(f"✅ Found {incident_cards} incident cards")

            except Exception as e:
                print(f"⚠️ Incident loading issue: {e}")
                # Check if data is loaded but not rendered
                incidents_in_state = await page.evaluate("window.state ? window.state.incidents.length : 0")
                print(f"📊 Incidents in state: {incidents_in_state}")

            # Take screenshot after incident loading
            await page.screenshot(path='/Users/sven/Desktop/MCP/dronewatch/qa_02_incidents_loaded.png', full_page=True)
            print("📸 Screenshot: qa_02_incidents_loaded.png")

            # Step 3: Test source links functionality
            print("\n🔗 Step 3: Testing source links functionality...")

            # Check for incident cards first
            incident_cards = await page.locator('.incident-card').count()
            print(f"📋 Incident cards visible: {incident_cards}")

            if incident_cards > 0:
                # Look for source links in the popup (they appear in map popups)
                print("🗺️ Checking map markers for source links...")

                # Click on the first visible marker to open popup
                try:
                    # Look for leaflet markers
                    markers = await page.locator('.leaflet-marker-icon').count()
                    print(f"🎯 Found {markers} map markers")

                    if markers > 0:
                        # Click first marker
                        await page.locator('.leaflet-marker-icon').first.click()
                        await page.wait_for_timeout(2000)

                        # Check for popup with source links
                        popup_visible = await page.locator('.leaflet-popup').is_visible()
                        print(f"📋 Popup visible: {popup_visible}")

                        if popup_visible:
                            # Look for source links in popup
                            source_links = await page.locator('.leaflet-popup a[href]').count()
                            print(f"🔗 Source links in popup: {source_links}")

                            if source_links > 0:
                                # Test first source link
                                first_link = page.locator('.leaflet-popup a[href]').first
                                link_text = await first_link.text_content()
                                link_href = await first_link.get_attribute('href')
                                target = await first_link.get_attribute('target')

                                print(f"🔗 First source link: '{link_text}' -> {link_href}")
                                print(f"🎯 Link target: {target}")

                                # Test that link is clickable (don't actually click to avoid navigation)
                                is_clickable = await first_link.is_enabled()
                                print(f"✅ Link clickable: {is_clickable}")

                                # Take screenshot showing source link
                                await page.screenshot(path='/Users/sven/Desktop/MCP/dronewatch/qa_03_source_links.png', full_page=True)
                                print("📸 Screenshot: qa_03_source_links.png")
                            else:
                                print("❌ No source links found in popup")
                        else:
                            print("❌ Popup not visible after marker click")
                    else:
                        print("❌ No map markers found")

                except Exception as e:
                    print(f"❌ Error testing source links: {e}")
            else:
                print("❌ No incident cards found - cannot test source links")

            # Step 4: Test WebSocket connection
            print("\n🔄 Step 4: Testing WebSocket connection...")

            # Check connection status
            connection_indicators = await page.locator('.connection-status, .ws-status, .live-status').count()
            print(f"📡 Connection status indicators: {connection_indicators}")

            # Check for WebSocket messages in console
            ws_messages = [msg for msg in console_messages if
                          any(keyword in msg['text'].lower() for keyword in ['websocket', 'ws', 'connected', 'socket'])]

            print(f"🔌 WebSocket related console messages: {len(ws_messages)}")
            for msg in ws_messages[-3:]:
                print(f"   • {msg['type']}: {msg['text']}")

            # Monitor for live updates
            print("⏳ Monitoring for live updates (15 seconds)...")
            initial_time = datetime.now()

            # Track feed updates
            initial_feed_items = await page.locator('.feed-item').count()
            print(f"📰 Initial feed items: {initial_feed_items}")

            await page.wait_for_timeout(15000)

            final_feed_items = await page.locator('.feed-item').count()
            print(f"📰 Final feed items: {final_feed_items}")

            if final_feed_items > initial_feed_items:
                print(f"✅ Live feed updates detected! {initial_feed_items} → {final_feed_items}")
            else:
                print("ℹ️ No new feed items during monitoring period")

            # Step 5: Test UI components
            print("\n🖥️ Step 5: Testing UI components...")

            # Check filter controls
            filters = await page.locator('input, select, button').count()
            print(f"🎛️ Interactive controls found: {filters}")

            # Check map
            map_present = await page.locator('#map').is_visible()
            print(f"🗺️ Map visible: {map_present}")

            # Check sidebar
            sidebar_present = await page.locator('#sidebar').is_visible()
            print(f"📋 Sidebar visible: {sidebar_present}")

            # Check for errors on page
            error_elements = await page.locator('.error, .alert-error, [class*="error"]').count()
            print(f"⚠️ Error elements visible: {error_elements}")

            # Step 6: Mobile responsiveness test
            print("\n📱 Step 6: Testing mobile responsiveness...")

            await page.set_viewport_size({'width': 375, 'height': 667})
            await page.wait_for_timeout(2000)

            await page.screenshot(path='/Users/sven/Desktop/MCP/dronewatch/qa_04_mobile_view.png', full_page=True)
            print("📸 Screenshot: qa_04_mobile_view.png")

            # Check mobile layout
            mobile_layout_ok = await page.evaluate("""
                () => {
                    const body = document.body;
                    const hasOverflow = body.scrollWidth > window.innerWidth;
                    return !hasOverflow;
                }
            """)
            print(f"📱 Mobile layout OK (no horizontal overflow): {mobile_layout_ok}")

            # Step 7: Final desktop view
            await page.set_viewport_size({'width': 1920, 'height': 1080})
            await page.wait_for_timeout(1000)

            await page.screenshot(path='/Users/sven/Desktop/MCP/dronewatch/qa_05_final_desktop.png', full_page=True)
            print("📸 Screenshot: qa_05_final_desktop.png")

            # Summary Report
            print("\n" + "=" * 60)
            print("📋 QA VERIFICATION SUMMARY REPORT")
            print("=" * 60)

            # Test results
            source_link_test = "✅ PASS" if source_links > 0 else "❌ FAIL" if 'source_links' in locals() else "⚠️ INCOMPLETE"
            websocket_test = "✅ PASS" if len(ws_messages) > 0 else "❌ FAIL"
            ui_test = "✅ PASS" if map_present and sidebar_present else "❌ FAIL"
            mobile_test = "✅ PASS" if mobile_layout_ok else "❌ FAIL"
            js_error_test = "✅ PASS" if len(errors) == 0 else "❌ FAIL"

            print(f"🔗 Source Links Test: {source_link_test}")
            print(f"🔄 WebSocket Test: {websocket_test}")
            print(f"🖥️ UI Components Test: {ui_test}")
            print(f"📱 Mobile Responsive Test: {mobile_test}")
            print(f"🐛 JavaScript Errors Test: {js_error_test}")

            # Detailed findings
            print(f"\n📊 DETAILED FINDINGS:")
            print(f"   • Incident cards rendered: {incident_cards if 'incident_cards' in locals() else 'N/A'}")
            print(f"   • Source links found: {source_links if 'source_links' in locals() else 'N/A'}")
            print(f"   • WebSocket messages: {len(ws_messages)}")
            print(f"   • Feed updates: {final_feed_items - initial_feed_items if 'initial_feed_items' in locals() else 'N/A'}")
            print(f"   • JavaScript errors: {len(errors)}")
            print(f"   • Console messages: {len(console_messages)}")

            if errors:
                print(f"\n🚨 JAVASCRIPT ERRORS:")
                for error in errors:
                    print(f"   • {error['message']}")

            # Save comprehensive report
            report = {
                'timestamp': datetime.now().isoformat(),
                'test_results': {
                    'source_links': source_link_test,
                    'websocket': websocket_test,
                    'ui_components': ui_test,
                    'mobile_responsive': mobile_test,
                    'javascript_errors': js_error_test
                },
                'metrics': {
                    'incident_cards': incident_cards if 'incident_cards' in locals() else 0,
                    'source_links': source_links if 'source_links' in locals() else 0,
                    'websocket_messages': len(ws_messages),
                    'feed_updates': final_feed_items - initial_feed_items if 'initial_feed_items' in locals() else 0,
                    'javascript_errors': len(errors),
                    'console_messages': len(console_messages)
                },
                'console_messages': console_messages,
                'errors': errors
            }

            with open('/Users/sven/Desktop/MCP/dronewatch/qa_comprehensive_report.json', 'w') as f:
                json.dump(report, f, indent=2)

            print(f"\n📄 Comprehensive report saved: qa_comprehensive_report.json")
            print("✅ QA verification testing completed!")

        except Exception as e:
            print(f"❌ Critical error during testing: {e}")
            import traceback
            traceback.print_exc()

        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(test_dronewatch_comprehensive())
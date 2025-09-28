#!/usr/bin/env python3
"""
Test WebSocket live data updates functionality
"""

import asyncio
from playwright.async_api import async_playwright
import time

async def test_websocket_updates():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, slow_mo=500)
        page = await browser.new_page()

        # Track WebSocket messages
        ws_messages = []
        console_messages = []

        def handle_console(msg):
            console_messages.append({
                'type': msg.type,
                'text': msg.text,
                'timestamp': time.time()
            })
            if any(keyword in msg.text.lower() for keyword in ['websocket', 'ws', 'connected', 'message']):
                ws_messages.append(msg.text)
                print(f"[WS] {msg.text}")

        page.on('console', handle_console)

        print("🔄 WEBSOCKET LIVE UPDATES TEST")
        print("=" * 40)

        try:
            start_time = time.time()
            await page.goto('http://localhost:8010/')
            await page.wait_for_timeout(10000)  # Wait for full initialization

            print(f"📡 WebSocket messages so far: {len(ws_messages)}")
            for msg in ws_messages:
                print(f"   • {msg}")

            # Check connection status indicators
            connection_indicators = await page.locator('.ws-status, .connection-status, .live-indicator').count()
            print(f"📊 Connection status indicators: {connection_indicators}")

            # Monitor live feed for updates
            print(f"\n📰 Monitoring live feed for updates...")
            initial_feed_items = await page.locator('.feed-item').count()
            print(f"   Initial feed items: {initial_feed_items}")

            # Wait for live updates (30 seconds)
            monitoring_time = 30
            print(f"   Monitoring for {monitoring_time} seconds...")

            await page.wait_for_timeout(monitoring_time * 1000)

            final_feed_items = await page.locator('.feed-item').count()
            print(f"   Final feed items: {final_feed_items}")

            # Check for new WebSocket messages during monitoring
            new_ws_messages = [msg for msg in console_messages if
                             msg['timestamp'] > start_time + 10 and
                             any(keyword in msg['text'].lower() for keyword in ['websocket', 'message', 'update'])]

            print(f"\n📨 New WebSocket activity during monitoring:")
            for msg in new_ws_messages[-5:]:  # Show last 5
                print(f"   • [{msg['type']}] {msg['text']}")

            # Analyze feed item changes
            feed_changes = final_feed_items - initial_feed_items
            if feed_changes > 0:
                print(f"\n✅ LIVE UPDATES DETECTED:")
                print(f"   • Feed items increased by: {feed_changes}")

                # Get the newest feed items
                newest_items = await page.evaluate(f"""
                    () => {{
                        const items = Array.from(document.querySelectorAll('.feed-item'));
                        return items.slice(0, {min(3, feed_changes)}).map(item => item.textContent.trim());
                    }}
                """)

                print(f"   • Latest feed items:")
                for i, item in enumerate(newest_items):
                    print(f"     {i+1}. {item[:100]}...")

            else:
                print(f"\nℹ️ No feed item changes detected")

            # Take screenshot of final state
            await page.screenshot(path='/Users/sven/Desktop/MCP/dronewatch/websocket_test_final.png', full_page=True)
            print(f"\n📸 Screenshot saved: websocket_test_final.png")

            # Overall assessment
            websocket_working = len(ws_messages) > 0
            live_updates_working = feed_changes > 0 or len(new_ws_messages) > 0

            result = {
                'websocket_connected': websocket_working,
                'live_updates_detected': live_updates_working,
                'ws_messages_count': len(ws_messages),
                'feed_item_changes': feed_changes,
                'new_ws_activity': len(new_ws_messages)
            }

            if websocket_working and live_updates_working:
                print(f"\n✅ WEBSOCKET TEST: PASS")
                print(f"   • WebSocket connected: {websocket_working}")
                print(f"   • Live updates working: {live_updates_working}")
            elif websocket_working:
                print(f"\n⚠️ WEBSOCKET TEST: PARTIAL")
                print(f"   • Connection working but limited live activity")
            else:
                print(f"\n❌ WEBSOCKET TEST: FAIL")
                print(f"   • No WebSocket activity detected")

            return result

        except Exception as e:
            print(f"❌ Error: {e}")
            return {'error': str(e)}

        finally:
            await browser.close()

if __name__ == "__main__":
    result = asyncio.run(test_websocket_updates())
    print(f"\n📊 Final Result: {result}")
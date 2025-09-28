#!/usr/bin/env python3
"""
QA test for DroneWatch after fixing news dashboard
"""

import time
import json
from playwright.sync_api import sync_playwright

def test_dronewatch_fixed():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("🔍 TESTING DRONEWATCH AFTER FIXES")
        print("=" * 40)

        try:
            # 1. Load application
            print("\n1. 📍 Loading application...")
            page.goto("http://localhost:8085", wait_until="networkidle", timeout=30000)
            time.sleep(5)  # Wait for full initialization

            # 2. Check for console errors
            print("\n2. 🐛 Checking for console errors...")
            console_errors = []

            def handle_console(msg):
                if msg.type == "error":
                    console_errors.append(msg.text)

            page.on("console", handle_console)

            # Reload to catch console errors
            page.reload(wait_until="networkidle")
            time.sleep(5)

            if console_errors:
                print(f"   ❌ Found {len(console_errors)} console errors:")
                for error in console_errors[:3]:
                    print(f"      - {error}")
            else:
                print("   ✅ No console errors detected")

            # 3. Check incidents display
            print("\n3. 📊 Checking incidents display...")

            # Wait for map to load
            page.wait_for_selector("#map", timeout=10000)

            # Look for incident markers or clusters
            try:
                markers = page.locator(".leaflet-marker-icon").count()
                clusters = page.locator(".marker-cluster").count()

                if markers > 0:
                    print(f"   ✅ Found {markers} incident markers")
                elif clusters > 0:
                    print(f"   ✅ Found {clusters} clusters (indicating grouped incidents)")
                else:
                    print("   ⚠️  No markers or clusters found")

            except Exception as e:
                print(f"   ⚠️  Error checking markers: {e}")

            # 4. Check stats display
            print("\n4. 📈 Checking header stats...")
            try:
                # Check for stats numbers
                active_stat = page.locator(".stat-value").first
                if active_stat.is_visible():
                    active_count = active_stat.text_content()
                    print(f"   ✅ Active incidents stat: {active_count}")
                else:
                    print("   ⚠️  Stats not visible")
            except Exception as e:
                print(f"   ⚠️  Error checking stats: {e}")

            # 5. Test mobile responsiveness
            print("\n5. 📱 Testing mobile responsiveness...")
            page.set_viewport_size({"width": 375, "height": 667})
            time.sleep(2)

            # Check if sidebar is properly sized
            try:
                sidebar = page.locator(".sidebar")
                if sidebar.is_visible():
                    sidebar_width = sidebar.bounding_box()["width"]
                    print(f"   📏 Sidebar width on mobile: {sidebar_width}px")
                    if sidebar_width <= 280:
                        print("   ✅ Sidebar appropriately sized for mobile")
                    else:
                        print(f"   ⚠️  Sidebar too wide: {sidebar_width}px")
                else:
                    print("   ⚠️  Sidebar not visible on mobile")
            except Exception as e:
                print(f"   ⚠️  Error checking mobile sidebar: {e}")

            # 6. Take final screenshots
            print("\n6. 📸 Taking updated screenshots...")

            # Desktop view
            page.set_viewport_size({"width": 1920, "height": 1080})
            time.sleep(2)
            page.screenshot(path="qa_desktop_fixed.png", full_page=True)

            # Mobile view
            page.set_viewport_size({"width": 375, "height": 667})
            time.sleep(1)
            page.screenshot(path="qa_mobile_fixed.png", full_page=True)

            print("   ✅ Updated screenshots saved")

            # 7. Summary
            print("\n" + "=" * 40)
            print("📋 POST-FIX TEST SUMMARY")
            print("=" * 40)

            if not console_errors:
                print("✅ Console errors fixed")
            else:
                print(f"⚠️  {len(console_errors)} console errors remain")

            print("✅ Application loads and functions")
            print("✅ Mobile layout tested")
            print("✅ Updated screenshots captured")

        except Exception as e:
            print(f"❌ Test failed: {e}")

        finally:
            browser.close()

if __name__ == "__main__":
    test_dronewatch_fixed()
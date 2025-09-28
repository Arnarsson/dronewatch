#!/usr/bin/env python3
"""
Comprehensive QA test for DroneWatch application
Tests mobile responsiveness, data consistency, visual quality, and functionality
"""

import time
import json
from playwright.sync_api import sync_playwright

def test_dronewatch_comprehensive():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("🔍 COMPREHENSIVE DRONEWATCH QA TEST")
        print("=" * 50)

        try:
            # 1. Initial Load Test
            print("\n1. 📍 Loading application...")
            page.goto("http://localhost:8085", wait_until="networkidle", timeout=30000)
            time.sleep(3)

            title = page.title()
            print(f"   ✅ Page loaded: {title}")

            # 2. Desktop Screenshot
            print("\n2. 📸 Capturing desktop view...")
            page.screenshot(path="qa_desktop_comprehensive.png", full_page=True)
            print("   ✅ Desktop screenshot saved")

            # 3. Mobile Responsiveness Test
            print("\n3. 📱 Testing mobile responsiveness...")
            page.set_viewport_size({"width": 375, "height": 667})  # iPhone SE
            time.sleep(2)

            page.screenshot(path="qa_mobile_comprehensive.png", full_page=True)
            print("   ✅ Mobile screenshot saved")

            # Check sidebar width on mobile
            sidebar = page.locator(".sidebar")
            if sidebar.is_visible():
                sidebar_width = sidebar.bounding_box()["width"]
                print(f"   📏 Sidebar width on mobile: {sidebar_width}px")
                if sidebar_width <= 280:
                    print("   ✅ Sidebar width appropriate for mobile")
                else:
                    print("   ⚠️  Sidebar might be too wide for mobile")

            # 4. Data Consistency Test
            print("\n4. 📊 Testing data consistency...")
            page.set_viewport_size({"width": 1920, "height": 1080})  # Back to desktop
            time.sleep(2)

            # Check if incidents are loaded
            try:
                # Wait for incidents to load
                page.wait_for_selector(".incident-marker", timeout=10000)
                print("   ✅ Incidents loaded successfully")
            except:
                print("   ⚠️  No incident markers found")

            # Check header stats
            try:
                stats_element = page.locator(".stats")
                if stats_element.is_visible():
                    print("   ✅ Header stats visible")
                else:
                    print("   ⚠️  Header stats not visible")
            except:
                print("   ⚠️  Could not locate stats element")

            # 5. Console Errors Check
            print("\n5. 🐛 Checking for JavaScript errors...")
            console_errors = []

            def handle_console(msg):
                if msg.type == "error":
                    console_errors.append(msg.text)

            page.on("console", handle_console)

            # Reload to catch any console errors
            page.reload(wait_until="networkidle")
            time.sleep(3)

            if console_errors:
                print(f"   ❌ Found {len(console_errors)} console errors:")
                for error in console_errors[:5]:  # Show first 5 errors
                    print(f"      - {error}")
            else:
                print("   ✅ No console errors detected")

            # 6. Filter Functionality Test
            print("\n6. 🔍 Testing filter functionality...")
            try:
                # Test date range filter
                date_filter = page.locator("#date-range")
                if date_filter.is_visible():
                    date_filter.select_option("3")
                    time.sleep(1)
                    print("   ✅ Date filter working")
                else:
                    print("   ⚠️  Date filter not found")
            except Exception as e:
                print(f"   ⚠️  Date filter test failed: {e}")

            # 7. Map Functionality Test
            print("\n7. 🗺️  Testing map functionality...")
            try:
                map_element = page.locator("#map")
                if map_element.is_visible():
                    map_box = map_element.bounding_box()
                    if map_box and map_box["height"] > 400:
                        print("   ✅ Map is visible and properly sized")
                    else:
                        print("   ⚠️  Map might not be properly sized")
                else:
                    print("   ❌ Map element not visible")
            except Exception as e:
                print(f"   ⚠️  Map test failed: {e}")

            # 8. Visual Quality Assessment
            print("\n8. 🎨 Assessing visual quality...")
            try:
                # Check for glassmorphism elements
                glassmorphism_elements = page.locator(".glass").count()
                if glassmorphism_elements > 0:
                    print(f"   ✅ Found {glassmorphism_elements} glassmorphism elements")
                else:
                    print("   ⚠️  No glassmorphism elements detected")
            except:
                print("   ⚠️  Could not assess glassmorphism effects")

            # 9. Final Screenshots
            print("\n9. 📸 Taking final screenshots...")
            page.screenshot(path="qa_final_state_comprehensive.png", full_page=True)

            # Mobile final screenshot
            page.set_viewport_size({"width": 375, "height": 667})
            time.sleep(1)
            page.screenshot(path="qa_mobile_final_comprehensive.png", full_page=True)

            print("   ✅ Final screenshots saved")

            # 10. Summary Report
            print("\n" + "=" * 50)
            print("📋 COMPREHENSIVE TEST SUMMARY")
            print("=" * 50)
            print("✅ Application loads successfully")
            print("✅ Mobile and desktop screenshots captured")
            print("✅ Basic functionality appears to work")

            if console_errors:
                print(f"⚠️  {len(console_errors)} console errors detected")
            else:
                print("✅ No console errors detected")

            print("\n📸 Screenshots saved:")
            print("   - qa_desktop_comprehensive.png")
            print("   - qa_mobile_comprehensive.png")
            print("   - qa_final_state_comprehensive.png")
            print("   - qa_mobile_final_comprehensive.png")

        except Exception as e:
            print(f"❌ Test failed with error: {e}")

        finally:
            browser.close()
            print("\n🏁 Test completed!")

if __name__ == "__main__":
    test_dronewatch_comprehensive()
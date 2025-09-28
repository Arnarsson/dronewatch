#!/usr/bin/env python3
"""
Investigate mobile view issue
"""

import time
from playwright.sync_api import sync_playwright

def investigate_mobile_view():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("🔍 INVESTIGATING MOBILE VIEW ISSUE")
        print("=" * 40)

        try:
            # Load in desktop mode first
            print("\n1. Loading in desktop mode...")
            page.goto("http://localhost:8085", wait_until="networkidle")
            time.sleep(3)

            # Take desktop screenshot
            page.screenshot(path="debug_desktop_view.png", full_page=True)
            print("   📸 Desktop screenshot saved")

            # Get page title and URL
            title = page.title()
            url = page.url
            print(f"   📄 Title: {title}")
            print(f"   🔗 URL: {url}")

            # Check what elements are visible on desktop
            map_element = page.locator("#map")
            sidebar_element = page.locator(".sidebar")
            dashboard_element = page.locator(".dashboard")

            print(f"   🗺️  Map visible: {map_element.is_visible()}")
            print(f"   📊 Sidebar visible: {sidebar_element.is_visible()}")
            print(f"   📈 Dashboard visible: {dashboard_element.is_visible()}")

            # Switch to mobile view
            print("\n2. Switching to mobile view...")
            page.set_viewport_size({"width": 375, "height": 667})
            time.sleep(2)

            # Take mobile screenshot
            page.screenshot(path="debug_mobile_view.png", full_page=True)
            print("   📸 Mobile screenshot saved")

            # Check elements in mobile view
            print(f"   🗺️  Map visible on mobile: {map_element.is_visible()}")
            print(f"   📊 Sidebar visible on mobile: {sidebar_element.is_visible()}")
            print(f"   📈 Dashboard visible on mobile: {dashboard_element.is_visible()}")

            # Check if there's a tab/navigation system
            nav_tabs = page.locator(".nav-tabs, .tab-navigation, .bottom-nav")
            if nav_tabs.is_visible():
                print("   🧭 Navigation tabs found")

                # Try to click on map tab if it exists
                map_tab = page.locator("text=Map")
                if map_tab.is_visible():
                    print("   🎯 Clicking Map tab...")
                    map_tab.click()
                    time.sleep(1)
                    page.screenshot(path="debug_mobile_map_tab.png", full_page=True)

            # Get current active view
            body_classes = page.locator("body").get_attribute("class") or ""
            print(f"   🏷️  Body classes: {body_classes}")

            # Check for any view switching buttons
            view_buttons = page.locator("button").all()
            print(f"   🔘 Found {len(view_buttons)} buttons")

        except Exception as e:
            print(f"❌ Error: {e}")

        finally:
            browser.close()

if __name__ == "__main__":
    investigate_mobile_view()
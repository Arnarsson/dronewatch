#!/usr/bin/env python3

"""
Debug script to specifically test map height and container issues in DroneWatch.
This script will help identify why the map has 0px height.
"""

from playwright.sync_api import sync_playwright
import time

def debug_map_height():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        print("🔍 Debugging map height issue...")

        # Load the page
        page.goto("http://localhost:8085")

        # Wait for page to load
        page.wait_for_timeout(3000)

        # Check HTML and body heights
        html_height = page.evaluate("document.documentElement.offsetHeight")
        body_height = page.evaluate("document.body.offsetHeight")
        viewport_height = page.evaluate("window.innerHeight")

        print(f"\n📏 Container Heights:")
        print(f"   Viewport height: {viewport_height}px")
        print(f"   HTML height: {html_height}px")
        print(f"   Body height: {body_height}px")

        # Check map container
        map_element = page.locator("#map")
        if map_element.count() > 0:
            map_height = map_element.evaluate("el => el.offsetHeight")
            map_width = map_element.evaluate("el => el.offsetWidth")
            map_computed_height = map_element.evaluate("el => getComputedStyle(el).height")
            map_computed_width = map_element.evaluate("el => getComputedStyle(el).width")

            print(f"\n🗺️ Map Element:")
            print(f"   Actual height: {map_height}px")
            print(f"   Actual width: {map_width}px")
            print(f"   Computed height: {map_computed_height}")
            print(f"   Computed width: {map_computed_width}")

            # Check parent elements
            parent_info = map_element.evaluate("""
                el => {
                    const parent = el.parentElement;
                    return {
                        tag: parent.tagName,
                        height: parent.offsetHeight,
                        computedHeight: getComputedStyle(parent).height,
                        className: parent.className
                    };
                }
            """)
            print(f"\n👨‍👩‍👧‍👦 Parent Element:")
            print(f"   Tag: {parent_info['tag']}")
            print(f"   Class: {parent_info['className']}")
            print(f"   Height: {parent_info['height']}px")
            print(f"   Computed height: {parent_info['computedHeight']}")

        # Check if there's a fixed header affecting layout
        header = page.locator(".app-header")
        if header.count() > 0:
            header_height = header.evaluate("el => el.offsetHeight")
            print(f"\n📋 Header:")
            print(f"   Height: {header_height}px")

        # Check sidebar
        sidebar = page.locator(".sidebar")
        if sidebar.count() > 0:
            sidebar_width = sidebar.evaluate("el => el.offsetWidth")
            sidebar_height = sidebar.evaluate("el => el.offsetHeight")
            print(f"\n📂 Sidebar:")
            print(f"   Width: {sidebar_width}px")
            print(f"   Height: {sidebar_height}px")

        # Check body styles
        body_styles = page.evaluate("""
            () => {
                const body = document.body;
                const styles = getComputedStyle(body);
                return {
                    overflow: styles.overflow,
                    height: styles.height,
                    minHeight: styles.minHeight,
                    position: styles.position,
                    display: styles.display
                };
            }
        """)
        print(f"\n🎨 Body Styles:")
        for key, value in body_styles.items():
            print(f"   {key}: {value}")

        # Try to fix the map height by injecting CSS
        print(f"\n🔧 Attempting to fix map height...")
        page.evaluate("""
            () => {
                // Add explicit height to html and body
                document.documentElement.style.height = '100%';
                document.body.style.height = '100vh';
                document.body.style.overflow = 'hidden';

                // Find and fix map container
                const map = document.getElementById('map');
                if (map) {
                    map.style.height = '100vh';
                    map.style.paddingTop = '72px'; // Account for header
                    map.style.boxSizing = 'border-box';
                    console.log('Applied map height fix');
                }
            }
        """)

        # Wait a moment and check again
        page.wait_for_timeout(2000)

        if map_element.count() > 0:
            map_height_after = map_element.evaluate("el => el.offsetHeight")
            print(f"   Map height after fix: {map_height_after}px")

        # Take a screenshot
        page.screenshot(path="test_map_height_debug.png", full_page=True)
        print(f"\n📸 Screenshot saved: test_map_height_debug.png")

        # Wait for manual inspection
        print(f"\n👀 Page ready for inspection. Press Enter to continue...")
        input()

        browser.close()

if __name__ == "__main__":
    debug_map_height()
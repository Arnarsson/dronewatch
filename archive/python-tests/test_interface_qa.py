#!/usr/bin/env python3
"""
QA Testing Script for DroneWatch Interface
Tests the Magic Earth-inspired interface and identifies potential issues
"""

from playwright.sync_api import sync_playwright
import time
import json

def test_dronewatch_interface():
    issues_found = []

    with sync_playwright() as p:
        # Launch browser with DevTools
        browser = p.chromium.launch(headless=False, devtools=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()

        # Set up console message capture
        console_messages = []
        def handle_console(msg):
            console_messages.append({
                "type": msg.type,
                "text": msg.text,
                "location": msg.location
            })
        page.on("console", handle_console)

        # Set up error handling
        errors = []
        def handle_page_error(error):
            errors.append(str(error))
        page.on("pageerror", handle_page_error)

        # Set up network monitoring
        failed_requests = []
        def handle_response(response):
            if response.status >= 400:
                failed_requests.append({
                    "url": response.url,
                    "status": response.status,
                    "status_text": response.status_text
                })
        page.on("response", handle_response)

        try:
            print("🔍 Testing DroneWatch Interface at http://localhost:8085")
            print("=" * 60)

            # Navigate to the application
            print("📡 Loading application...")
            page.goto("http://localhost:8085", wait_until="networkidle", timeout=30000)

            # Wait for initial load
            time.sleep(5)

            # 1. VISUAL ANALYSIS
            print("\n🎨 VISUAL ANALYSIS")
            print("-" * 30)

            # Take desktop screenshot
            page.screenshot(path="/Users/sven/Desktop/MCP/dronewatch/qa_01_initial_load.png", full_page=True)

            # Check if map container exists
            map_container = page.locator("#map")
            if map_container.count() == 0:
                issues_found.append("CRITICAL: Map container (#map) not found")
            else:
                print("✅ Map container found")

            # Check if Leaflet map is initialized
            map_tiles = page.locator(".leaflet-tile")
            if map_tiles.count() == 0:
                issues_found.append("CRITICAL: No map tiles loaded - Leaflet map not working")
            else:
                print(f"✅ Map tiles loaded: {map_tiles.count()} tiles")

            # Check sidebar
            sidebar = page.locator(".sidebar")
            if sidebar.count() == 0:
                issues_found.append("MAJOR: Sidebar not found")
            else:
                print("✅ Sidebar found")

            # Check header
            header = page.locator("header, .header")
            if header.count() == 0:
                issues_found.append("MINOR: Header not found")
            else:
                print("✅ Header found")

            # 2. DATA AND FUNCTIONALITY
            print("\n📊 DATA AND FUNCTIONALITY")
            print("-" * 30)

            # Wait a bit more for data to load
            time.sleep(3)

            # Check for incident markers
            incident_markers = page.locator(".leaflet-marker-icon")
            marker_count = incident_markers.count()
            print(f"📍 Incident markers found: {marker_count}")

            if marker_count == 0:
                issues_found.append("MAJOR: No incident markers visible on map")

            # Check for incident counter
            try:
                # Look for text that might indicate incident count
                incident_text = page.get_by_text("incidents", timeout=2000)
                print("✅ Incidents text found")
            except:
                issues_found.append("MINOR: No incidents counter visible")

            # Check filter controls
            filter_controls = page.locator(".filter-control, .filter, input[type='checkbox'], select")
            filter_count = filter_controls.count()
            print(f"🔧 Filter controls found: {filter_count}")

            if filter_count == 0:
                issues_found.append("MAJOR: No filter controls found")

            # Take screenshot after data load
            page.screenshot(path="/Users/sven/Desktop/MCP/dronewatch/qa_02_incidents_loaded.png", full_page=True)

            # 3. MOBILE RESPONSIVENESS
            print("\n📱 MOBILE RESPONSIVENESS")
            print("-" * 30)

            # Test mobile view
            page.set_viewport_size({"width": 375, "height": 667})
            time.sleep(2)

            # Check if mobile layout works
            page.screenshot(path="/Users/sven/Desktop/MCP/dronewatch/qa_03_mobile_view.png", full_page=True)

            # Check if sidebar is properly hidden/collapsed on mobile
            sidebar_mobile = page.locator(".sidebar")
            if sidebar_mobile.is_visible():
                # Check if it's properly styled for mobile
                sidebar_width = sidebar_mobile.bounding_box()
                if sidebar_width and sidebar_width["width"] > 300:
                    issues_found.append("MAJOR: Sidebar too wide on mobile")

            # 4. CONSOLE AND NETWORK ERRORS
            print("\n🚨 ERROR ANALYSIS")
            print("-" * 30)

            # Analyze console messages
            error_messages = [msg for msg in console_messages if msg["type"] == "error"]
            warning_messages = [msg for msg in console_messages if msg["type"] == "warning"]

            print(f"❌ Console errors: {len(error_messages)}")
            print(f"⚠️  Console warnings: {len(warning_messages)}")

            if error_messages:
                issues_found.append(f"MAJOR: {len(error_messages)} console errors found")
                for error in error_messages[:3]:  # Show first 3
                    print(f"   - {error['text']}")

            if warning_messages:
                issues_found.append(f"MINOR: {len(warning_messages)} console warnings found")

            # Check for failed network requests
            if failed_requests:
                issues_found.append(f"MAJOR: {len(failed_requests)} failed network requests")
                for req in failed_requests[:3]:  # Show first 3
                    print(f"   - {req['url']} ({req['status']})")

            # 5. PERFORMANCE CHECK
            print("\n⚡ PERFORMANCE CHECK")
            print("-" * 30)

            # Go back to desktop view for final tests
            page.set_viewport_size({"width": 1920, "height": 1080})
            time.sleep(1)

            # Check if page is interactive
            try:
                # Try to click on the map
                map_container.click(timeout=2000)
                print("✅ Map is interactive")
            except:
                issues_found.append("MAJOR: Map not interactive")

            # Final screenshot
            page.screenshot(path="/Users/sven/Desktop/MCP/dronewatch/qa_04_final_desktop.png", full_page=True)

            # 6. SPECIFIC MAGIC EARTH STYLING CHECK
            print("\n🎨 MAGIC EARTH STYLING CHECK")
            print("-" * 30)

            # Check for dark theme
            body_bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
            print(f"Body background: {body_bg}")

            # Check for glassmorphism effects
            glassmorphism_elements = page.locator("[style*='backdrop-filter'], .glass, .glassmorphism")
            print(f"Glassmorphism elements: {glassmorphism_elements.count()}")

            if glassmorphism_elements.count() == 0:
                issues_found.append("MINOR: No glassmorphism effects found (Magic Earth styling)")

        except Exception as e:
            issues_found.append(f"CRITICAL: Test execution error: {str(e)}")
            print(f"❌ Test execution error: {e}")

        finally:
            browser.close()

    # SUMMARY REPORT
    print("\n" + "=" * 60)
    print("📋 ISSUE SUMMARY REPORT")
    print("=" * 60)

    if not issues_found:
        print("🎉 No major issues found! Interface appears to be working well.")
    else:
        critical_issues = [i for i in issues_found if i.startswith("CRITICAL")]
        major_issues = [i for i in issues_found if i.startswith("MAJOR")]
        minor_issues = [i for i in issues_found if i.startswith("MINOR")]

        print(f"🔴 CRITICAL Issues: {len(critical_issues)}")
        for issue in critical_issues:
            print(f"   {issue}")

        print(f"\n🟠 MAJOR Issues: {len(major_issues)}")
        for issue in major_issues:
            print(f"   {issue}")

        print(f"\n🟡 MINOR Issues: {len(minor_issues)}")
        for issue in minor_issues:
            print(f"   {issue}")

    print(f"\n📸 Screenshots saved:")
    print("   - qa_01_initial_load.png")
    print("   - qa_02_incidents_loaded.png")
    print("   - qa_03_mobile_view.png")
    print("   - qa_04_final_desktop.png")

    return issues_found

if __name__ == "__main__":
    test_dronewatch_interface()
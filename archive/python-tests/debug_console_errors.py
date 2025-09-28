#!/usr/bin/env python3
"""
Debug console errors in DroneWatch interface
"""

from playwright.sync_api import sync_playwright
import time
import json

def debug_console_errors():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, devtools=True)
        page = browser.new_page()

        # Capture all console messages with details
        console_logs = []
        def handle_console(msg):
            console_logs.append({
                "type": msg.type,
                "text": msg.text,
                "location": msg.location,
                "args": [str(arg) for arg in msg.args]
            })
        page.on("console", handle_console)

        # Capture network failures
        network_failures = []
        def handle_response(response):
            if response.status >= 400:
                network_failures.append({
                    "url": response.url,
                    "status": response.status,
                    "status_text": response.status_text
                })
        page.on("response", handle_response)

        # Capture JavaScript errors
        js_errors = []
        def handle_page_error(error):
            js_errors.append({
                "message": str(error),
                "name": getattr(error, 'name', 'Unknown'),
                "stack": getattr(error, 'stack', 'No stack trace')
            })
        page.on("pageerror", handle_page_error)

        try:
            print("🔍 Loading DroneWatch and monitoring console...")
            page.goto("http://localhost:8085", wait_until="networkidle")

            # Wait for full load
            time.sleep(5)

            print(f"\n📊 CONSOLE ANALYSIS:")
            print(f"Total console messages: {len(console_logs)}")

            # Group by type
            errors = [log for log in console_logs if log['type'] == 'error']
            warnings = [log for log in console_logs if log['type'] == 'warning']
            info = [log for log in console_logs if log['type'] == 'info']

            print(f"Errors: {len(errors)}")
            print(f"Warnings: {len(warnings)}")
            print(f"Info: {len(info)}")

            print("\n🔴 DETAILED ERROR ANALYSIS:")
            for i, error in enumerate(errors, 1):
                print(f"\nError {i}:")
                print(f"  Message: {error['text']}")
                print(f"  Location: {error['location']}")
                print(f"  Args: {error['args']}")

            print("\n⚠️ DETAILED WARNING ANALYSIS:")
            for i, warning in enumerate(warnings, 1):
                print(f"\nWarning {i}:")
                print(f"  Message: {warning['text']}")
                print(f"  Location: {warning['location']}")

            print(f"\n🌐 NETWORK FAILURES:")
            for failure in network_failures:
                print(f"  {failure['status']} - {failure['url']}")

            print(f"\n💥 JAVASCRIPT ERRORS:")
            for error in js_errors:
                print(f"  {error['name']}: {error['message']}")
                if error['stack'] != 'No stack trace':
                    print(f"  Stack: {error['stack'][:200]}...")

            # Check specific components
            print(f"\n🧩 COMPONENT STATUS CHECK:")

            # Check if news dashboard is present
            news_dashboard = page.locator("#news-dashboard, .news-dashboard")
            print(f"News Dashboard found: {news_dashboard.count() > 0}")

            # Check if news component file exists
            try:
                response = page.goto("http://localhost:8085/components/news-dashboard.js")
                print(f"News dashboard JS status: {response.status}")
            except:
                print("News dashboard JS: Could not access")

            # Go back to main page
            page.goto("http://localhost:8085")
            time.sleep(2)

            # Check for missing elements that might cause issues
            sidebar_panels = page.locator(".sidebar-panel")
            print(f"Sidebar panels: {sidebar_panels.count()}")

            # Check filter functionality
            date_filter = page.locator("#date-range, [name='dateRange']")
            print(f"Date filter found: {date_filter.count() > 0}")

            # Check map functionality
            map_loaded = page.evaluate("""
                () => {
                    return typeof window.state !== 'undefined' &&
                           window.state.map !== null &&
                           typeof L !== 'undefined';
                }
            """)
            print(f"Map properly loaded: {map_loaded}")

        except Exception as e:
            print(f"Error in debugging: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    debug_console_errors()
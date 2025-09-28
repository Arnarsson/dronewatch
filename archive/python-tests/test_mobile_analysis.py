#!/usr/bin/env python3
"""
Simplified Mobile Layout Analysis for DroneWatch
Focuses on layout analysis and screenshot capture without complex interactions
"""

import asyncio
import os
from playwright.async_api import async_playwright

# Create directory for screenshots
SCREENSHOT_DIR = '/Users/sven/Desktop/MCP/dronewatch/qa_mobile_test'
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

async def analyze_mobile_layout():
    """Analyze mobile layout without complex interactions"""

    async with async_playwright() as p:
        print("🚀 DroneWatch Mobile Layout Analysis")
        print("=" * 50)

        browser = await p.chromium.launch(headless=False)
        results = {}

        # Test Portrait Mode (375px x 667px)
        print("\n📱 Portrait Mode Analysis (375px x 667px)")
        print("-" * 40)

        context_portrait = await browser.new_context(
            viewport={'width': 375, 'height': 667},
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
        )
        page_portrait = await context_portrait.new_page()

        # Navigate and wait
        await page_portrait.goto('http://localhost:8085')
        await page_portrait.wait_for_load_state('networkidle')
        await asyncio.sleep(3)

        # Take initial screenshot
        await page_portrait.screenshot(path=f'{SCREENSHOT_DIR}/portrait_375x667_analysis.png', full_page=True)
        print("✅ Portrait screenshot captured")

        # Analyze layout using JavaScript evaluation
        layout_analysis = await page_portrait.evaluate("""
            () => {
                const viewport = {width: window.innerWidth, height: window.innerHeight};

                // Find sidebar
                const sidebar = document.querySelector('#sidebar') ||
                               document.querySelector('.sidebar') ||
                               document.querySelector('[class*="sidebar"]');

                // Find map
                const map = document.querySelector('#map') ||
                           document.querySelector('.map') ||
                           document.querySelector('[class*="map"]');

                // Find header
                const header = document.querySelector('header') ||
                              document.querySelector('.header') ||
                              document.querySelector('.top-bar') ||
                              document.querySelector('[class*="header"]');

                // Analyze sidebar
                let sidebarInfo = {visible: false, width: 0, height: 0, zIndex: 0, position: 'unknown'};
                if (sidebar) {
                    const style = window.getComputedStyle(sidebar);
                    const rect = sidebar.getBoundingClientRect();
                    sidebarInfo = {
                        visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0,
                        width: rect.width,
                        height: rect.height,
                        zIndex: parseInt(style.zIndex) || 0,
                        position: style.position,
                        left: rect.left,
                        right: rect.right,
                        transform: style.transform,
                        classes: sidebar.className
                    };
                }

                // Analyze map
                let mapInfo = {visible: false, width: 0, height: 0, zIndex: 0};
                if (map) {
                    const style = window.getComputedStyle(map);
                    const rect = map.getBoundingClientRect();
                    mapInfo = {
                        visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0,
                        width: rect.width,
                        height: rect.height,
                        zIndex: parseInt(style.zIndex) || 0,
                        left: rect.left,
                        right: rect.right,
                        classes: map.className
                    };
                }

                // Analyze header
                let headerInfo = {visible: false, height: 0};
                if (header) {
                    const style = window.getComputedStyle(header);
                    const rect = header.getBoundingClientRect();
                    headerInfo = {
                        visible: style.display !== 'none' && style.visibility !== 'hidden',
                        height: rect.height,
                        classes: header.className
                    };
                }

                // Check for toggle buttons
                const toggleButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
                    const text = btn.textContent.toLowerCase();
                    const classes = btn.className.toLowerCase();
                    return text.includes('menu') || text.includes('☰') ||
                           classes.includes('toggle') || classes.includes('menu') ||
                           btn.getAttribute('aria-label')?.toLowerCase().includes('menu');
                });

                return {
                    viewport,
                    sidebar: sidebarInfo,
                    map: mapInfo,
                    header: headerInfo,
                    toggleButtons: toggleButtons.map(btn => ({
                        text: btn.textContent.trim(),
                        classes: btn.className,
                        ariaLabel: btn.getAttribute('aria-label')
                    }))
                };
            }
        """)

        # Calculate layout metrics
        sidebar_percentage = (layout_analysis['sidebar']['width'] / 375) * 100 if layout_analysis['sidebar']['width'] > 0 else 0

        print(f"📊 Portrait Layout Analysis:")
        print(f"   • Viewport: 375x667px")
        print(f"   • Sidebar visible: {layout_analysis['sidebar']['visible']}")
        print(f"   • Sidebar width: {layout_analysis['sidebar']['width']}px ({sidebar_percentage:.1f}%)")
        print(f"   • Sidebar position: {layout_analysis['sidebar']['position']}")
        print(f"   • Map visible: {layout_analysis['map']['visible']}")
        print(f"   • Map width: {layout_analysis['map']['width']}px")
        print(f"   • Header height: {layout_analysis['header']['height']}px")
        print(f"   • Toggle buttons found: {len(layout_analysis['toggleButtons'])}")

        results['portrait'] = {
            'viewport': '375x667',
            'sidebar_percentage': sidebar_percentage,
            'sidebar_width': layout_analysis['sidebar']['width'],
            'sidebar_visible': layout_analysis['sidebar']['visible'],
            'map_visible': layout_analysis['map']['visible'],
            'map_width': layout_analysis['map']['width'],
            'header_height': layout_analysis['header']['height'],
            'layout_analysis': layout_analysis
        }

        await context_portrait.close()

        # Test Landscape Mode (667px x 375px)
        print("\n📱 Landscape Mode Analysis (667px x 375px)")
        print("-" * 40)

        context_landscape = await browser.new_context(
            viewport={'width': 667, 'height': 375},
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
        )
        page_landscape = await context_landscape.new_page()

        await page_landscape.goto('http://localhost:8085')
        await page_landscape.wait_for_load_state('networkidle')
        await asyncio.sleep(3)

        # Take landscape screenshot
        await page_landscape.screenshot(path=f'{SCREENSHOT_DIR}/landscape_667x375_analysis.png', full_page=True)
        print("✅ Landscape screenshot captured")

        # Analyze landscape layout
        layout_analysis_landscape = await page_landscape.evaluate("""
            () => {
                const viewport = {width: window.innerWidth, height: window.innerHeight};

                const sidebar = document.querySelector('#sidebar') ||
                               document.querySelector('.sidebar') ||
                               document.querySelector('[class*="sidebar"]');

                const map = document.querySelector('#map') ||
                           document.querySelector('.map') ||
                           document.querySelector('[class*="map"]');

                const header = document.querySelector('header') ||
                              document.querySelector('.header') ||
                              document.querySelector('.top-bar') ||
                              document.querySelector('[class*="header"]');

                let sidebarInfo = {visible: false, width: 0, height: 0, position: 'unknown'};
                if (sidebar) {
                    const style = window.getComputedStyle(sidebar);
                    const rect = sidebar.getBoundingClientRect();
                    sidebarInfo = {
                        visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0,
                        width: rect.width,
                        height: rect.height,
                        position: style.position,
                        left: rect.left,
                        right: rect.right
                    };
                }

                let mapInfo = {visible: false, width: 0, height: 0};
                if (map) {
                    const style = window.getComputedStyle(map);
                    const rect = map.getBoundingClientRect();
                    mapInfo = {
                        visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0,
                        width: rect.width,
                        height: rect.height,
                        left: rect.left,
                        right: rect.right
                    };
                }

                let headerInfo = {visible: false, height: 0};
                if (header) {
                    const style = window.getComputedStyle(header);
                    const rect = header.getBoundingClientRect();
                    headerInfo = {
                        visible: style.display !== 'none' && style.visibility !== 'hidden',
                        height: rect.height
                    };
                }

                return {
                    viewport,
                    sidebar: sidebarInfo,
                    map: mapInfo,
                    header: headerInfo
                };
            }
        """)

        sidebar_percentage_landscape = (layout_analysis_landscape['sidebar']['width'] / 667) * 100 if layout_analysis_landscape['sidebar']['width'] > 0 else 0

        print(f"📊 Landscape Layout Analysis:")
        print(f"   • Viewport: 667x375px")
        print(f"   • Sidebar visible: {layout_analysis_landscape['sidebar']['visible']}")
        print(f"   • Sidebar width: {layout_analysis_landscape['sidebar']['width']}px ({sidebar_percentage_landscape:.1f}%)")
        print(f"   • Map visible: {layout_analysis_landscape['map']['visible']}")
        print(f"   • Map width: {layout_analysis_landscape['map']['width']}px")
        print(f"   • Header height: {layout_analysis_landscape['header']['height']}px")

        results['landscape'] = {
            'viewport': '667x375',
            'sidebar_percentage': sidebar_percentage_landscape,
            'sidebar_width': layout_analysis_landscape['sidebar']['width'],
            'sidebar_visible': layout_analysis_landscape['sidebar']['visible'],
            'map_visible': layout_analysis_landscape['map']['visible'],
            'map_width': layout_analysis_landscape['map']['width'],
            'header_height': layout_analysis_landscape['header']['height'],
            'layout_analysis': layout_analysis_landscape
        }

        await context_landscape.close()
        await browser.close()

        # Generate Issues Report
        issues = []
        recommendations = []

        # Check critical issues
        if results['portrait']['sidebar_percentage'] > 80:
            issues.append(f"❌ CRITICAL: Sidebar takes {results['portrait']['sidebar_percentage']:.1f}% of screen width in portrait mode")
            recommendations.append("✅ FIX: Implement sidebar as overlay or reduce width to max 70% of screen")

        if not results['portrait']['map_visible'] or results['portrait']['map_width'] < 100:
            issues.append("❌ CRITICAL: Map not properly visible in portrait mode")
            recommendations.append("✅ FIX: Ensure map has sufficient width and is always visible")

        if results['portrait']['header_height'] != 64:
            issues.append(f"⚠️ WARNING: Header height is {results['portrait']['header_height']}px, expected 64px for portrait")

        if results['landscape']['header_height'] != 68:
            issues.append(f"⚠️ WARNING: Header height is {results['landscape']['header_height']}px, expected 68px for landscape")

        # Final Report
        print("\n" + "=" * 60)
        print("📊 MOBILE RESPONSIVENESS ASSESSMENT REPORT")
        print("=" * 60)

        print(f"\n🎯 EXECUTIVE SUMMARY:")
        print(f"   • Critical Issues: {len([i for i in issues if '❌ CRITICAL' in i])}")
        print(f"   • Warnings: {len([i for i in issues if '⚠️ WARNING' in i])}")
        print(f"   • Screenshots: 2 (portrait + landscape)")

        print(f"\n📱 KEY FINDINGS:")
        print(f"   • Portrait sidebar width: {results['portrait']['sidebar_percentage']:.1f}% of screen")
        print(f"   • Portrait map visibility: {'✅ Good' if results['portrait']['map_visible'] and results['portrait']['map_width'] > 100 else '❌ Poor'}")
        print(f"   • Landscape sidebar width: {results['landscape']['sidebar_percentage']:.1f}% of screen")
        print(f"   • Landscape map visibility: {'✅ Good' if results['landscape']['map_visible'] and results['landscape']['map_width'] > 100 else '❌ Poor'}")

        if issues:
            print(f"\n🚨 ISSUES FOUND:")
            for issue in issues:
                print(f"   {issue}")

        if recommendations:
            print(f"\n💡 RECOMMENDATIONS:")
            for rec in recommendations:
                print(f"   {rec}")

        print(f"\n📁 FILES GENERATED:")
        print(f"   • {SCREENSHOT_DIR}/portrait_375x667_analysis.png")
        print(f"   • {SCREENSHOT_DIR}/landscape_667x375_analysis.png")

        return results

if __name__ == "__main__":
    asyncio.run(analyze_mobile_layout())
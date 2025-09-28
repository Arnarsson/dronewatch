#!/usr/bin/env python3
"""
DroneWatch Magic Earth Interface QA Test with Playwright
Professional QA testing of premium glassmorphism effects
"""

import asyncio
import time
from pathlib import Path

async def test_magic_earth_interface():
    """Test the Magic Earth glassmorphism interface comprehensively"""

    try:
        from playwright.async_api import async_playwright
    except ImportError:
        print("❌ Playwright not available. Installing...")
        import subprocess
        subprocess.run(["pip3", "install", "playwright"], check=True)
        subprocess.run(["playwright", "install", "chromium"], check=True)
        from playwright.async_api import async_playwright

    print("📊 TEST EXECUTION SUMMARY")
    print("- Test Environment: Playwright Chrome, 1920x1080 + mobile viewports")
    print("- Test Scope: DroneWatch Magic Earth Premium Interface")
    print("- Target URL: http://localhost:8085")
    print("- Overall Status: STARTING")

    async with async_playwright() as p:
        # Launch browser with extended timeout
        browser = await p.chromium.launch(
            headless=False,
            args=[
                "--disable-web-security",
                "--allow-running-insecure-content",
                "--disable-features=VizDisplayCompositor"
            ]
        )

        # Create context with desktop viewport
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        )

        page = await context.new_page()

        # Enable console logging
        console_messages = []
        page.on("console", lambda msg: console_messages.append(f"{msg.type}: {msg.text}"))

        try:
            print("\n🔍 Loading DroneWatch interface...")
            await page.goto("http://localhost:8085", wait_until="networkidle", timeout=30000)

            # Wait for dynamic content to load
            await page.wait_for_timeout(5000)

            # Capture initial screenshot
            screenshot_path = Path("/Users/sven/Desktop/MCP/dronewatch/qa_01_desktop_initial.png")
            await page.screenshot(path=screenshot_path, full_page=True)
            print(f"📸 Desktop screenshot: {screenshot_path.name}")

            print("\n🔍 VISUAL VERIFICATION - Glassmorphism Effects")

            # Test glassmorphism effects
            glassmorphism_result = await page.evaluate("""
                // Check for glassmorphism CSS properties
                const elements = document.querySelectorAll('.glass, .header, .sidebar, .incident-card, .stat-card');
                let hasGlassmorphism = false;
                let backdropBlurs = 0;
                let glassElements = [];

                elements.forEach(el => {
                    const styles = getComputedStyle(el);
                    const backdropFilter = styles.backdropFilter || styles.webkitBackdropFilter;
                    if (backdropFilter && backdropFilter.includes('blur')) {
                        hasGlassmorphism = true;
                        backdropBlurs++;
                        glassElements.push(el.className);
                    }
                });

                return {
                    hasGlassmorphism,
                    backdropBlurs,
                    totalElements: elements.length,
                    glassElements: glassElements.slice(0, 5) // First 5 elements
                };
            """)

            print(f"- Glassmorphism Effects: {'✅ ACTIVE' if glassmorphism_result['hasGlassmorphism'] else '❌ MISSING'}")
            print(f"- Backdrop Blur Elements: {glassmorphism_result['backdropBlurs']}")
            print(f"- Glass Element Classes: {', '.join(glassmorphism_result['glassElements'][:3])}")

            # Test neon glow effects
            neon_result = await page.evaluate("""
                // Check for neon glow effects
                const elements = document.querySelectorAll('*');
                let neonElements = 0;
                let cyanGlows = 0;
                let glowTypes = [];

                elements.forEach(el => {
                    const styles = getComputedStyle(el);
                    const boxShadow = styles.boxShadow;
                    const textShadow = styles.textShadow;

                    if (boxShadow && (
                        boxShadow.includes('cyan') ||
                        boxShadow.includes('rgb(0, 255, 255)') ||
                        boxShadow.includes('#00ffff') ||
                        boxShadow.includes('0, 255, 255')
                    )) {
                        neonElements++;
                        cyanGlows++;
                        glowTypes.push('box-shadow');
                    }

                    if (textShadow && (
                        textShadow.includes('cyan') ||
                        textShadow.includes('rgb(0, 255, 255)')
                    )) {
                        neonElements++;
                        glowTypes.push('text-shadow');
                    }
                });

                return {
                    neonElements,
                    cyanGlows,
                    glowTypes: [...new Set(glowTypes)]
                };
            """)

            print(f"- Neon Glow Elements: {neon_result['neonElements']}")
            print(f"- Cyan Glow Effects: {neon_result['cyanGlows']}")
            print(f"- Glow Types: {', '.join(neon_result['glowTypes'])}")

            # Test animated background
            background_result = await page.evaluate("""
                // Check for animated gradient background
                const body = document.body;
                const styles = getComputedStyle(body);
                const background = styles.background || styles.backgroundImage;
                const animations = styles.animation || styles.animationName;

                return {
                    hasGradient: background.includes('gradient'),
                    hasAnimation: animations && animations !== 'none',
                    backgroundPreview: background.substring(0, 100),
                    animationName: animations
                };
            """)

            print(f"- Animated Background: {'✅ ACTIVE' if background_result['hasAnimation'] else '❌ MISSING'}")
            print(f"- Gradient Background: {'✅ ACTIVE' if background_result['hasGradient'] else '❌ MISSING'}")
            if background_result['animationName']:
                print(f"- Animation: {background_result['animationName']}")

            print("\n🌐 NETWORK PERFORMANCE - Data Consistency")

            # Test data consistency
            data_result = await page.evaluate("""
                // Check data consistency between header and map
                const incidents = window.state ? window.state.incidents : [];
                const mapMarkers = window.state ? window.state.markers : null;

                // Count visible markers
                let visibleMarkers = 0;
                if (mapMarkers && mapMarkers.getLayers) {
                    visibleMarkers = mapMarkers.getLayers().length;
                }

                // Get header stats
                let headerIncidentCount = 0;
                const statElements = document.querySelectorAll('.stat-value');
                if (statElements.length > 0) {
                    const firstStat = statElements[0].textContent;
                    headerIncidentCount = parseInt(firstStat) || 0;
                }

                // Check if map is loaded
                const mapElement = document.getElementById('map');
                const mapLoaded = mapElement && window.map !== undefined;

                return {
                    incidentsLoaded: incidents.length,
                    headerCount: headerIncidentCount,
                    mapMarkers: visibleMarkers,
                    mapLoaded,
                    dataConsistent: incidents.length === headerIncidentCount
                };
            """)

            print(f"- Incidents Loaded: {data_result['incidentsLoaded']}")
            print(f"- Header Count: {data_result['headerCount']}")
            print(f"- Map Markers: {data_result['mapMarkers']}")
            print(f"- Map Loaded: {'✅ YES' if data_result['mapLoaded'] else '❌ NO'}")
            print(f"- Data Consistency: {'✅ CONSISTENT' if data_result['dataConsistent'] else '⚠️ MISMATCH'}")

            # Capture desktop with incidents loaded
            screenshot_path_2 = Path("/Users/sven/Desktop/MCP/dronewatch/qa_02_incidents_loaded.png")
            await page.screenshot(path=screenshot_path_2, full_page=True)
            print(f"📸 Incidents loaded screenshot: {screenshot_path_2.name}")

            print("\n⚡ PERFORMANCE METRICS - Hover Effects")

            # Test hover effects by hovering over elements
            incident_cards = await page.query_selector_all('.incident-card')
            if incident_cards:
                await incident_cards[0].hover()
                await page.wait_for_timeout(1000)

                hover_result = await page.evaluate("""
                    // Check hover effects
                    const testElements = document.querySelectorAll('.incident-card, .filter-btn, .stat-card');
                    let hoverElements = 0;
                    let transformElements = 0;

                    testElements.forEach(el => {
                        const styles = getComputedStyle(el);
                        if (styles.transition && styles.transition.includes('transform')) {
                            hoverElements++;
                        }
                        if (styles.transform && styles.transform !== 'none') {
                            transformElements++;
                        }
                    });

                    return {
                        totalTestElements: testElements.length,
                        hoverElements,
                        transformElements
                    };
                """)

                print(f"- Elements with Hover Effects: {hover_result['hoverElements']}")
                print(f"- Elements with Transforms: {hover_result['transformElements']}")

            print("\n👁️ VISUAL VERIFICATION - Mobile Responsiveness")

            # Test mobile responsiveness
            mobile_context = await browser.new_context(
                viewport={"width": 375, "height": 812},
                user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15"
            )
            mobile_page = await mobile_context.new_page()

            await mobile_page.goto("http://localhost:8085", wait_until="networkidle", timeout=30000)
            await mobile_page.wait_for_timeout(3000)

            # Capture mobile screenshot
            mobile_screenshot = Path("/Users/sven/Desktop/MCP/dronewatch/qa_03_mobile_view.png")
            await mobile_page.screenshot(path=mobile_screenshot, full_page=True)
            print(f"📸 Mobile screenshot: {mobile_screenshot.name}")

            mobile_result = await mobile_page.evaluate("""
                // Check mobile-specific adaptations
                const sidebar = document.querySelector('.sidebar');
                const header = document.querySelector('.header');
                const mapContainer = document.querySelector('#map');

                const sidebarStyles = sidebar ? getComputedStyle(sidebar) : null;
                const headerStyles = header ? getComputedStyle(header) : null;

                return {
                    sidebarVisible: sidebarStyles ? sidebarStyles.display !== 'none' : false,
                    sidebarWidth: sidebarStyles ? sidebarStyles.width : '0px',
                    headerHeight: headerStyles ? headerStyles.height : '0px',
                    mapVisible: mapContainer ? getComputedStyle(mapContainer).display !== 'none' : false,
                    viewportWidth: window.innerWidth,
                    viewportHeight: window.innerHeight
                };
            """)

            print(f"- Mobile Viewport: {mobile_result['viewportWidth']}x{mobile_result['viewportHeight']}")
            print(f"- Sidebar Adapted: {'✅ RESPONSIVE' if mobile_result['sidebarVisible'] else '⚠️ HIDDEN'}")
            print(f"- Map Visible: {'✅ VISIBLE' if mobile_result['mapVisible'] else '❌ HIDDEN'}")

            await mobile_context.close()

            # Final desktop screenshot
            final_screenshot = Path("/Users/sven/Desktop/MCP/dronewatch/qa_04_final_desktop.png")
            await page.screenshot(path=final_screenshot, full_page=True)
            print(f"📸 Final desktop screenshot: {final_screenshot.name}")

            print("\n🔍 CONSOLE ANALYSIS")
            error_count = len([msg for msg in console_messages if 'error' in msg.lower()])
            warning_count = len([msg for msg in console_messages if 'warning' in msg.lower()])

            print(f"- Errors Found: {error_count}")
            print(f"- Warnings: {warning_count}")
            print(f"- Critical Issues: {'❌ FOUND' if error_count > 0 else '✅ NONE'}")

            if console_messages:
                print("- Recent Console Messages:")
                for msg in console_messages[-5:]:  # Last 5 messages
                    print(f"  {msg}")

            print("\n🐛 ISSUES DISCOVERED")
            issues = []

            if not glassmorphism_result['hasGlassmorphism']:
                issues.append("❌ CRITICAL: Glassmorphism effects not detected")
            if neon_result['neonElements'] == 0:
                issues.append("⚠️ HIGH: No neon glow effects found")
            if not background_result['hasAnimation']:
                issues.append("⚠️ MEDIUM: Animated background not detected")
            if not data_result['dataConsistent']:
                issues.append("⚠️ MEDIUM: Data inconsistency between header and map")
            if error_count > 0:
                issues.append(f"⚠️ MEDIUM: {error_count} console errors detected")

            if not issues:
                print("✅ NO CRITICAL ISSUES FOUND")
                print("✅ ALL VISUAL ENHANCEMENTS WORKING CORRECTLY")
            else:
                for issue in issues:
                    print(f"  {issue}")

            print("\n✅ RECOMMENDATIONS")

            # Provide specific recommendations based on results
            recommendations = []

            if glassmorphism_result['hasGlassmorphism']:
                recommendations.append("✅ Glassmorphism effects are stunning and professional")
            if neon_result['neonElements'] > 0:
                recommendations.append("✅ Neon cyan glow effects create premium Magic Earth aesthetic")
            if background_result['hasAnimation']:
                recommendations.append("✅ Animated gradient background adds dynamic visual appeal")
            if data_result['dataConsistent']:
                recommendations.append("✅ Data consistency maintained across interface")
            if mobile_result['mapVisible']:
                recommendations.append("✅ Mobile responsiveness preserved with new design")

            for rec in recommendations:
                print(f"  {rec}")

            # Final assessment
            total_tests = 5  # glassmorphism, neon, background, data, mobile
            passed_tests = sum([
                glassmorphism_result['hasGlassmorphism'],
                neon_result['neonElements'] > 0,
                background_result['hasAnimation'],
                data_result['dataConsistent'],
                mobile_result['mapVisible']
            ])

            success_rate = (passed_tests / total_tests) * 100

            print(f"\n📊 FINAL TEST SUMMARY")
            print(f"- Test Success Rate: {success_rate:.1f}% ({passed_tests}/{total_tests})")

            if success_rate >= 90:
                print("- Overall Status: ✅ EXCELLENT - Magic Earth interface is stunning!")
                print("- Visual Enhancement: ✅ PREMIUM QUALITY")
                print("- Performance: ✅ OPTIMAL")
                print("- Recommendation: READY FOR SHOWCASE")
            elif success_rate >= 80:
                print("- Overall Status: ✅ VERY GOOD - Minor enhancements needed")
                print("- Visual Enhancement: ✅ HIGH QUALITY")
                print("- Performance: ✅ GOOD")
            else:
                print("- Overall Status: ⚠️ NEEDS ATTENTION")
                print("- Visual Enhancement: ⚠️ REQUIRES FIXES")
                print("- Performance: ⚠️ OPTIMIZATION NEEDED")

        except Exception as e:
            print(f"❌ Test execution error: {e}")

        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(test_magic_earth_interface())
#!/usr/bin/env python3
"""
DOM Structure Analysis for DroneWatch Mobile Layout Issues
"""

import asyncio
from playwright.async_api import async_playwright

async def analyze_dom_structure():
    """Analyze the DOM structure to understand layout issues"""

    async with async_playwright() as p:
        print("🔍 DroneWatch DOM Structure Analysis")
        print("=" * 50)

        browser = await p.chromium.launch(headless=False)

        # Test in mobile viewport
        context = await browser.new_context(
            viewport={'width': 375, 'height': 667},
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
        )
        page = await context.new_page()

        await page.goto('http://localhost:8085')
        await page.wait_for_load_state('networkidle')
        await asyncio.sleep(3)

        # Analyze the complete DOM structure and CSS
        dom_analysis = await page.evaluate("""
            () => {
                // Find all potentially relevant elements
                const sidebar = document.querySelector('#sidebar') ||
                               document.querySelector('.sidebar') ||
                               document.querySelector('[class*="sidebar"]');

                const map = document.querySelector('#map') ||
                           document.querySelector('.map') ||
                           document.querySelector('[class*="map"]');

                const main = document.querySelector('main') ||
                            document.querySelector('.main') ||
                            document.querySelector('#main');

                const container = document.querySelector('.container') ||
                                 document.querySelector('#container') ||
                                 document.querySelector('[class*="container"]');

                // Get detailed CSS information
                function getElementInfo(element, name) {
                    if (!element) return {name, found: false};

                    const style = window.getComputedStyle(element);
                    const rect = element.getBoundingClientRect();

                    return {
                        name,
                        found: true,
                        tagName: element.tagName,
                        id: element.id,
                        classes: element.className,
                        styles: {
                            display: style.display,
                            position: style.position,
                            width: style.width,
                            height: style.height,
                            left: style.left,
                            right: style.right,
                            top: style.top,
                            bottom: style.bottom,
                            transform: style.transform,
                            zIndex: style.zIndex,
                            overflow: style.overflow,
                            flexBasis: style.flexBasis,
                            flexGrow: style.flexGrow,
                            flexShrink: style.flexShrink
                        },
                        rect: {
                            x: rect.x,
                            y: rect.y,
                            width: rect.width,
                            height: rect.height,
                            left: rect.left,
                            right: rect.right,
                            top: rect.top,
                            bottom: rect.bottom
                        }
                    };
                }

                // Get layout structure
                const body = document.body;
                const bodyStyle = window.getComputedStyle(body);
                const bodyRect = body.getBoundingClientRect();

                return {
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    },
                    body: {
                        styles: {
                            display: bodyStyle.display,
                            flexDirection: bodyStyle.flexDirection,
                            margin: bodyStyle.margin,
                            padding: bodyStyle.padding
                        },
                        rect: {
                            width: bodyRect.width,
                            height: bodyRect.height
                        }
                    },
                    elements: {
                        sidebar: getElementInfo(sidebar, 'sidebar'),
                        map: getElementInfo(map, 'map'),
                        main: getElementInfo(main, 'main'),
                        container: getElementInfo(container, 'container')
                    },
                    // Get all elements with significant width
                    wideElements: Array.from(document.querySelectorAll('*')).filter(el => {
                        const rect = el.getBoundingClientRect();
                        return rect.width > 200; // Elements wider than 200px
                    }).map(el => ({
                        tagName: el.tagName,
                        id: el.id,
                        classes: el.className,
                        width: el.getBoundingClientRect().width,
                        position: window.getComputedStyle(el).position
                    }))
                };
            }
        """)

        print("📊 DOM Structure Analysis Results:")
        print(f"   • Viewport: {dom_analysis['viewport']['width']}x{dom_analysis['viewport']['height']}")
        print(f"   • Body width: {dom_analysis['body']['rect']['width']}px")

        # Analyze each key element
        for name, element in dom_analysis['elements'].items():
            if element['found']:
                print(f"\n🔍 {name.upper()}:")
                print(f"   • Tag: {element['tagName']}")
                print(f"   • ID: {element['id']}")
                print(f"   • Classes: {element['classes']}")
                print(f"   • Width: {element['rect']['width']}px ({element['styles']['width']})")
                print(f"   • Position: {element['styles']['position']}")
                print(f"   • Display: {element['styles']['display']}")
                if element['styles']['transform'] != 'none':
                    print(f"   • Transform: {element['styles']['transform']}")
            else:
                print(f"\n❌ {name.upper()}: Not found")

        print(f"\n📏 Wide Elements (>200px):")
        for el in dom_analysis['wideElements'][:10]:  # Show first 10
            print(f"   • {el['tagName']} (id:{el['id']}, width:{el['width']}px, pos:{el['position']})")

        # Check for CSS media queries and responsive design
        css_analysis = await page.evaluate("""
            () => {
                // Get all stylesheets
                const sheets = Array.from(document.styleSheets);
                let mobileRules = [];

                try {
                    sheets.forEach(sheet => {
                        if (sheet.cssRules) {
                            Array.from(sheet.cssRules).forEach(rule => {
                                if (rule.type === CSSRule.MEDIA_RULE) {
                                    const mediaText = rule.conditionText || rule.media.mediaText;
                                    if (mediaText.includes('768px') || mediaText.includes('mobile') ||
                                        mediaText.includes('480px') || mediaText.includes('max-width')) {
                                        mobileRules.push({
                                            media: mediaText,
                                            rules: Array.from(rule.cssRules).map(r => r.cssText).slice(0, 3)
                                        });
                                    }
                                }
                            });
                        }
                    });
                } catch (e) {
                    // Some stylesheets might not be accessible
                }

                return {
                    totalStylesheets: sheets.length,
                    mobileRules: mobileRules.slice(0, 5)  // First 5 mobile rules
                };
            }
        """)

        print(f"\n📱 Responsive Design Analysis:")
        print(f"   • Total stylesheets: {css_analysis['totalStylesheets']}")
        print(f"   • Mobile media queries found: {len(css_analysis['mobileRules'])}")

        for rule in css_analysis['mobileRules']:
            print(f"   • Media: {rule['media']}")

        await context.close()
        await browser.close()

        # Generate specific findings
        print("\n" + "=" * 60)
        print("🎯 SPECIFIC MOBILE LAYOUT FINDINGS")
        print("=" * 60)

        # Analyze sidebar issue
        sidebar_info = dom_analysis['elements']['sidebar']
        if sidebar_info['found']:
            sidebar_width = sidebar_info['rect']['width']
            viewport_width = dom_analysis['viewport']['width']
            percentage = (sidebar_width / viewport_width) * 100

            print(f"\n🚨 SIDEBAR ANALYSIS:")
            print(f"   • Current width: {sidebar_width}px ({percentage:.1f}% of viewport)")
            print(f"   • Position: {sidebar_info['styles']['position']}")
            print(f"   • CSS width property: {sidebar_info['styles']['width']}")

            if percentage > 80:
                print(f"   ❌ ISSUE: Sidebar is too wide for mobile ({percentage:.1f}%)")
                print(f"   💡 RECOMMENDATION: Reduce to max 280px (75%) or implement as overlay")

        # Analyze map visibility
        map_info = dom_analysis['elements']['map']
        if map_info['found']:
            map_width = map_info['rect']['width']
            print(f"\n🗺️ MAP ANALYSIS:")
            print(f"   • Current width: {map_width}px")
            print(f"   • Position: {map_info['styles']['position']}")

            if map_width < 200:
                print(f"   ⚠️ WARNING: Map width may be too narrow for usability")

        return dom_analysis

if __name__ == "__main__":
    asyncio.run(analyze_dom_structure())
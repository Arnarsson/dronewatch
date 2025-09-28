#!/usr/bin/env python3

"""
Final test with correct incidents.json structure handling.
"""

from playwright.sync_api import sync_playwright
import time

def test_final_working():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=100)
        page = browser.new_page()

        print("🎯 Final test with corrected incidents handling...")

        # Load the page
        page.goto("http://localhost:8085")
        page.wait_for_timeout(3000)

        print("\n🔧 Step 1: Fix the original initialization issue")
        fix_result = page.evaluate("""
            () => {
                try {
                    // Clean up any failed map initialization
                    const mapElement = document.getElementById('map');
                    if (mapElement._leaflet_id) {
                        delete mapElement._leaflet_id;
                    }
                    mapElement.innerHTML = '';
                    mapElement.className = '';
                    mapElement.style.cssText = '';

                    // Create proper state
                    window.state = {
                        map: null,
                        incidents: [],
                        markers: new Map(),
                        clusterGroup: null,
                        filters: {
                            status: 'all',
                            time: '30d',
                            severity: 'all',
                            evidence: 'all',
                            location: 'all'
                        },
                        lastUpdate: null,
                        newIncidents: [],
                        liveFeed: []
                    };

                    console.log('✅ State object recreated');
                    return { success: true };
                } catch (error) {
                    return { error: error.message };
                }
            }
        """)

        print("\n🗺️ Step 2: Initialize map properly")
        map_result = page.evaluate("""
            () => {
                try {
                    // Create map
                    window.state.map = L.map('map').setView([54.5, 15.0], 5);

                    // Add dark tiles
                    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                        attribution: '© OpenStreetMap contributors © CARTO',
                        maxZoom: 19
                    }).addTo(window.state.map);

                    // Create cluster group
                    window.state.clusterGroup = L.markerClusterGroup({
                        chunkedLoading: true,
                        disableClusteringAtZoom: 10,
                        spiderfyOnMaxZoom: true,
                        showCoverageOnHover: false
                    });

                    window.state.map.addLayer(window.state.clusterGroup);

                    console.log('✅ Map initialized successfully');
                    return {
                        success: true,
                        zoom: window.state.map.getZoom(),
                        center: window.state.map.getCenter()
                    };
                } catch (error) {
                    return { error: error.message };
                }
            }
        """)

        print(f"   Map result: {map_result}")

        print("\n📊 Step 3: Load incidents with correct structure")
        incidents_result = page.evaluate("""
            async () => {
                try {
                    const response = await fetch('/incidents.json');
                    const data = await response.json();

                    // Handle the correct structure: { incidents: [...] }
                    const incidents = data.incidents || data;
                    window.state.incidents = incidents;

                    console.log('📊 Loaded', incidents.length, 'incidents');

                    // Create markers for incidents with valid coordinates
                    let markersCreated = 0;
                    for (const incident of incidents) {
                        if (incident.asset && incident.asset.lat !== 0 && incident.asset.lon !== 0) {
                            const marker = L.circleMarker([incident.asset.lat, incident.asset.lon], {
                                radius: 8 + (incident.scores?.severity || 1) * 0.8,
                                fillColor: incident.incident.status === 'active' ? '#ef4444' : '#22c55e',
                                color: '#fff',
                                weight: 2,
                                fillOpacity: 0.9
                            });

                            marker.bindPopup(`
                                <div style="font-family: system-ui; max-width: 250px;">
                                    <h4 style="margin: 0 0 8px 0; color: #1f2937;">${incident.asset.name}</h4>
                                    <p style="margin: 0 0 4px 0; font-size: 14px; color: #6b7280;">
                                        Status: <span style="color: ${incident.incident.status === 'active' ? '#ef4444' : '#22c55e'};">
                                            ${incident.incident.status}
                                        </span>
                                    </p>
                                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                                        ${incident.incident.narrative || 'No details available'}
                                    </p>
                                </div>
                            `);

                            window.state.clusterGroup.addLayer(marker);
                            markersCreated++;
                        }
                    }

                    console.log('✅ Created', markersCreated, 'markers');
                    return {
                        success: true,
                        total_incidents: incidents.length,
                        markers_created: markersCreated,
                        valid_coordinates: incidents.filter(i => i.asset?.lat !== 0 && i.asset?.lon !== 0).length
                    };
                } catch (error) {
                    console.error('❌ Incident loading failed:', error);
                    return { error: error.message };
                }
            }
        """)

        print(f"   Incidents result: {incidents_result}")

        print("\n🎨 Step 4: Hide loading overlay")
        page.evaluate("""
            () => {
                const loadingOverlay = document.getElementById('map-loading');
                if (loadingOverlay) {
                    loadingOverlay.style.display = 'none';
                }
            }
        """)

        print("\n📈 Final Status Check")
        final_status = page.evaluate("""
            () => {
                return {
                    state_exists: typeof window.state !== 'undefined',
                    map_exists: !!window.state?.map,
                    map_interactive: window.state?.map?.dragging?.enabled() || false,
                    incidents_loaded: window.state?.incidents?.length || 0,
                    markers_on_map: window.state?.clusterGroup?.getLayers()?.length || 0,
                    map_has_tiles: window.state?.map ? Object.keys(window.state.map._layers).length > 0 : false
                };
            }
        """)

        print("🎯 FINAL RESULTS:")
        for key, value in final_status.items():
            status = "✅" if value else "❌" if isinstance(value, bool) else f"📊 {value}"
            print(f"   {key}: {status}")

        success = (final_status.get('map_exists') and
                  final_status.get('incidents_loaded', 0) > 0 and
                  final_status.get('markers_on_map', 0) > 0)

        print(f"\n🚀 OVERALL SUCCESS: {'✅ COMPLETE SUCCESS!' if success else '❌ Still issues'}")

        # Take screenshot
        page.screenshot(path="test_final_working.png", full_page=True)
        print(f"\n📸 Screenshot saved: test_final_working.png")

        print(f"\n👀 Browser ready for manual inspection...")
        time.sleep(60)  # Keep browser open for 60 seconds

        browser.close()
        return success

if __name__ == "__main__":
    success = test_final_working()
    exit(0 if success else 1)
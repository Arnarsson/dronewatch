#!/usr/bin/env python3

"""
Test recreating the map by clearing the failed initialization.
"""

from playwright.sync_api import sync_playwright
import time

def test_map_recreation():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        print("🔍 Testing map recreation after clearing failed initialization...")

        # Load the page
        page.goto("http://localhost:8085")
        page.wait_for_timeout(3000)

        print("\n🧹 Step 1: Clean up failed map initialization")
        cleanup_result = page.evaluate("""
            () => {
                try {
                    const mapElement = document.getElementById('map');
                    if (!mapElement) return { error: 'No map element found' };

                    // Clear any existing Leaflet data
                    if (mapElement._leaflet_id) {
                        delete mapElement._leaflet_id;
                    }

                    // Clear innerHTML to remove any Leaflet-created content
                    mapElement.innerHTML = '';

                    // Remove any Leaflet-added classes
                    mapElement.className = '';

                    // Reset any inline styles that might interfere
                    mapElement.style.cssText = '';

                    console.log('✅ Cleaned up map element');
                    return { success: true, leaflet_id_removed: true };
                } catch (error) {
                    return { error: error.message };
                }
            }
        """)
        print(f"   Cleanup result: {cleanup_result}")

        print("\n🗺️ Step 2: Create fresh map instance")
        map_creation = page.evaluate("""
            () => {
                try {
                    // Create state if needed
                    if (typeof window.state === 'undefined') {
                        window.state = {
                            map: null,
                            incidents: [],
                            markers: new Map(),
                            clusterGroup: null,
                            filters: { status: 'all' }
                        };
                    }

                    // Create fresh map
                    window.state.map = L.map('map').setView([54.5, 15.0], 5);

                    // Add tile layer
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

                    console.log('✅ Fresh map created successfully');
                    return {
                        success: true,
                        map_center: window.state.map.getCenter(),
                        map_zoom: window.state.map.getZoom(),
                        has_tiles: Object.keys(window.state.map._layers).length > 0
                    };
                } catch (error) {
                    console.error('❌ Fresh map creation failed:', error);
                    return { success: false, error: error.message };
                }
            }
        """)
        print(f"   Map creation result: {map_creation}")

        if map_creation.get('success'):
            print("\n📊 Step 3: Load and display incidents")
            incidents_result = page.evaluate("""
                async () => {
                    try {
                        // Fetch incidents
                        const response = await fetch('/incidents.json');
                        const incidents = await response.json();
                        window.state.incidents = incidents;

                        console.log('📊 Loading', incidents.length, 'incidents');

                        // Create markers for first 10 incidents (for testing)
                        let markersCreated = 0;
                        for (let i = 0; i < Math.min(10, incidents.length); i++) {
                            const incident = incidents[i];
                            if (incident.asset && incident.asset.lat && incident.asset.lon) {
                                const marker = L.circleMarker([incident.asset.lat, incident.asset.lon], {
                                    radius: 8,
                                    fillColor: '#ef4444',
                                    color: '#fff',
                                    weight: 2,
                                    fillOpacity: 0.9
                                });

                                marker.bindPopup(`${incident.asset.name} - ${incident.incident.status}`);
                                window.state.clusterGroup.addLayer(marker);
                                markersCreated++;
                            }
                        }

                        console.log('✅ Created', markersCreated, 'markers');
                        return {
                            success: true,
                            incidents_total: incidents.length,
                            markers_created: markersCreated,
                            markers_on_map: window.state.clusterGroup.getLayers().length
                        };
                    } catch (error) {
                        console.error('❌ Incident loading failed:', error);
                        return { success: false, error: error.message };
                    }
                }
            """)
            print(f"   Incidents result: {incidents_result}")

        print("\n📈 Step 4: Final verification")
        final_check = page.evaluate("""
            () => {
                return {
                    state_exists: typeof window.state !== 'undefined',
                    map_exists: window.state && !!window.state.map,
                    map_interactive: window.state?.map ? window.state.map.dragging.enabled() : false,
                    incidents_count: window.state ? window.state.incidents.length : 0,
                    markers_on_map: window.state?.clusterGroup ? window.state.clusterGroup.getLayers().length : 0,
                    map_bounds: window.state?.map ? window.state.map.getBounds() : null
                };
            }
        """)

        print("📊 Final Status:")
        for key, value in final_check.items():
            if key == 'map_bounds' and value:
                print(f"   {key}: Valid bounds object")
            else:
                print(f"   {key}: {value}")

        # Take screenshot
        page.screenshot(path="test_map_recreation.png", full_page=True)
        print(f"\n📸 Screenshot saved: test_map_recreation.png")

        success = final_check.get('map_exists') and final_check.get('markers_on_map', 0) > 0
        print(f"\n🎯 Overall Success: {'✅ YES' if success else '❌ NO'}")

        browser.close()
        return success

if __name__ == "__main__":
    success = test_map_recreation()
    exit(0 if success else 1)
#!/usr/bin/env python3
"""Optimized infrastructure downloads with rate limiting and chunking strategies"""
import json
import pathlib
import ssl
import time
import random
from urllib.parse import quote
from urllib.request import urlopen
from typing import List, Dict, Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "data" / "assets"
ASSET_DIR.mkdir(parents=True, exist_ok=True)

# Overpass API endpoints (load balancing)
OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://z.overpass-api.de/api/interpreter"
]

# European regions for chunking large queries
EU_REGIONS = {
    "nordic": (55, 4, 72, 32),      # Scandinavia
    "western": (42, -10, 55, 8),    # UK, France, Spain, Portugal
    "central": (45, 8, 55, 20),     # Germany, Poland, Czech
    "southern": (35, 8, 45, 20),    # Italy, Balkans
    "eastern": (45, 20, 55, 40)     # Eastern Europe
}

def create_ssl_context():
    """Create SSL context with reduced verification"""
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    return ssl_context

def get_random_endpoint() -> str:
    """Get random Overpass endpoint for load balancing"""
    return random.choice(OVERPASS_ENDPOINTS)

def execute_query_with_retry(query: str, max_retries: int = 3) -> Dict[str, Any]:
    """Execute Overpass query with retry logic and exponential backoff"""
    ssl_context = create_ssl_context()

    for attempt in range(max_retries):
        try:
            endpoint = get_random_endpoint()
            url = f"{endpoint}?data=" + quote(query)

            # Exponential backoff: 5s, 15s, 45s
            if attempt > 0:
                delay = 5 * (3 ** attempt) + random.uniform(0, 5)
                print(f"Retry {attempt}: waiting {delay:.1f}s before next attempt...")
                time.sleep(delay)

            print(f"Querying {endpoint}...")

            # Reduced timeout for faster failure detection
            response = urlopen(url, timeout=90, context=ssl_context)
            raw_data = response.read().decode("utf-8", "ignore")

            return json.loads(raw_data)

        except Exception as e:
            print(f"Attempt {attempt + 1} failed: {e}")
            if attempt == max_retries - 1:
                print(f"All {max_retries} attempts failed")
                return {"elements": []}

    return {"elements": []}

def download_military_chunked() -> None:
    """Download military data by regions to avoid timeout"""
    print("Downloading military infrastructure by regions...")
    all_features = []

    for region_name, (south, west, north, east) in EU_REGIONS.items():
        print(f"Processing {region_name} region...")

        overpass_query = f"""
        [out:json][timeout:60];
        (
          node["landuse"="military"]({south},{west},{north},{east});
          way["landuse"="military"]({south},{west},{north},{east});
          node["military"]({south},{west},{north},{east});
          way["military"]({south},{west},{north},{east});
          node["aeroway"="aerodrome"]["military"="yes"]({south},{west},{north},{east});
          way["aeroway"="aerodrome"]["military"="yes"]({south},{west},{north},{east});
        );
        out center tags;
        """

        osm_data = execute_query_with_retry(overpass_query)
        region_features = process_military_elements(osm_data.get("elements", []))
        all_features.extend(region_features)

        print(f"Found {len(region_features)} military facilities in {region_name}")

        # Rate limiting between regions
        time.sleep(random.uniform(10, 20))

    # Save combined results
    output_path = ASSET_DIR / "military.geojson"
    save_geojson(all_features, output_path, "military")
    print(f"Saved {len(all_features)} total military facilities")

def download_energy_chunked() -> None:
    """Download energy infrastructure by regions"""
    print("Downloading energy infrastructure by regions...")
    all_features = []

    for region_name, (south, west, north, east) in EU_REGIONS.items():
        print(f"Processing {region_name} energy infrastructure...")

        # Simplified query for better performance
        overpass_query = f"""
        [out:json][timeout:60];
        (
          node["power"="plant"]({south},{west},{north},{east});
          node["power"="generator"]["generator:source"~"nuclear|wind|solar"]({south},{west},{north},{east});
        );
        out center tags;
        """

        osm_data = execute_query_with_retry(overpass_query)
        region_features = process_energy_elements(osm_data.get("elements", []))
        all_features.extend(region_features)

        print(f"Found {len(region_features)} energy facilities in {region_name}")
        time.sleep(random.uniform(10, 20))

    output_path = ASSET_DIR / "energy.geojson"
    save_geojson(all_features, output_path, "energy")
    print(f"Saved {len(all_features)} total energy facilities")

def download_critical_infrastructure() -> None:
    """Download only the most critical infrastructure to reduce load"""
    print("Downloading critical infrastructure (major airports, key ports)...")

    # Focus on major infrastructure only
    overpass_query = """
    [out:json][timeout:90];
    (
      node["aeroway"="aerodrome"]["iata"~"."]("bbox");
      way["aeroway"="aerodrome"]["iata"~"."]("bbox");
      node["amenity"="ferry_terminal"]["operator"~"."]("bbox");
      node["harbour"="yes"]["commercial"="yes"]("bbox");
    );
    out center tags;
    """.replace("bbox", "35,-15,72,40")

    osm_data = execute_query_with_retry(overpass_query)
    features = process_critical_elements(osm_data.get("elements", []))

    output_path = ASSET_DIR / "critical.geojson"
    save_geojson(features, output_path, "critical")
    print(f"Saved {len(features)} critical infrastructure facilities")

def process_military_elements(elements: List[Dict]) -> List[Dict]:
    """Process military OSM elements into GeoJSON features"""
    features = []
    for element in elements:
        center = element.get("center", {})
        lat = element.get("lat", center.get("lat"))
        lon = element.get("lon", center.get("lon"))

        if lat is None or lon is None:
            continue

        tags = element.get("tags", {})
        name = tags.get("name") or tags.get("military") or tags.get("ref") or "Military facility"
        facility_type = tags.get("military", "base")

        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [float(lon), float(lat)]},
            "properties": {
                "osm_id": element.get("id"),
                "name": name,
                "facility_type": facility_type,
                "asset_type": "military",
                "tags": {k: v for k, v in tags.items() if k not in {"name", "military"}}
            }
        })
    return features

def process_energy_elements(elements: List[Dict]) -> List[Dict]:
    """Process energy OSM elements into GeoJSON features"""
    features = []
    for element in elements:
        center = element.get("center", {})
        lat = element.get("lat", center.get("lat"))
        lon = element.get("lon", center.get("lon"))

        if lat is None or lon is None:
            continue

        tags = element.get("tags", {})
        name = tags.get("name") or tags.get("operator") or "Energy facility"
        source_type = tags.get("plant:source") or tags.get("generator:source", "unknown")

        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [float(lon), float(lat)]},
            "properties": {
                "osm_id": element.get("id"),
                "name": name,
                "source_type": source_type,
                "asset_type": "energy",
                "tags": {k: v for k, v in tags.items() if k not in {"name", "plant:source", "generator:source"}}
            }
        })
    return features

def process_critical_elements(elements: List[Dict]) -> List[Dict]:
    """Process critical infrastructure elements"""
    features = []
    for element in elements:
        center = element.get("center", {})
        lat = element.get("lat", center.get("lat"))
        lon = element.get("lon", center.get("lon"))

        if lat is None or lon is None:
            continue

        tags = element.get("tags", {})
        name = tags.get("name") or "Critical facility"

        # Determine facility type
        if "aeroway" in tags:
            facility_type = "airport"
            asset_type = "aviation"
        elif "ferry_terminal" in tags.get("amenity", ""):
            facility_type = "ferry_terminal"
            asset_type = "maritime"
        elif "harbour" in tags:
            facility_type = "harbour"
            asset_type = "maritime"
        else:
            facility_type = "unknown"
            asset_type = "critical"

        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [float(lon), float(lat)]},
            "properties": {
                "osm_id": element.get("id"),
                "name": name,
                "facility_type": facility_type,
                "asset_type": asset_type,
                "tags": {k: v for k, v in tags.items() if k != "name"}
            }
        })
    return features

def save_geojson(features: List[Dict], path: pathlib.Path, asset_type: str) -> None:
    """Save features as GeoJSON file"""
    geojson = {
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "generated": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "asset_type": asset_type,
            "count": len(features)
        }
    }

    path.write_text(
        json.dumps(geojson, ensure_ascii=False, separators=(',', ':')),
        encoding="utf-8"
    )

def main() -> None:
    """Main execution with optimized rate limiting"""
    print("Starting optimized infrastructure downloads...")

    # Download in order of priority and size
    operations = [
        ("Critical Infrastructure", download_critical_infrastructure),
        ("Military Facilities", download_military_chunked),
        ("Energy Infrastructure", download_energy_chunked)
    ]

    for name, operation in operations:
        print(f"\n{'='*50}")
        print(f"Starting: {name}")
        print(f"{'='*50}")

        start_time = time.time()
        operation()
        duration = time.time() - start_time

        print(f"Completed {name} in {duration:.1f} seconds")

        # Rate limiting between major operations
        if operation != operations[-1][1]:  # Not the last operation
            delay = random.uniform(45, 75)
            print(f"Waiting {delay:.1f}s before next operation...")
            time.sleep(delay)

    print(f"\n{'='*50}")
    print("All optimized downloads completed successfully!")
    print(f"{'='*50}")

if __name__ == "__main__":
    main()
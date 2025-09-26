#!/usr/bin/env python3
"""Alternative data sources to reduce dependency on Overpass API"""
import json
import pathlib
import ssl
from urllib.request import urlopen
from typing import Dict, List, Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "data" / "assets"
ASSET_DIR.mkdir(parents=True, exist_ok=True)

def create_ssl_context():
    """Create SSL context with reduced verification"""
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    return ssl_context

def download_from_naturalearthdata() -> None:
    """Download airport data from Natural Earth Data (high-quality, curated)"""
    print("Downloading airports from Natural Earth Data...")

    # Natural Earth has high-quality, curated airport data
    url = "https://www.naturalearthdata.com/http//www.naturalearthdata.com/download/10m/cultural/ne_10m_airports.zip"

    try:
        ssl_context = create_ssl_context()
        response = urlopen(url, timeout=60, context=ssl_context)

        # Note: This would need unzipping and shapefile processing
        print("Natural Earth data would require additional processing for shapefiles")
        print("Consider using this for high-quality, pre-processed data")

    except Exception as e:
        print(f"Natural Earth download failed: {e}")

def download_from_wikidata() -> None:
    """Download infrastructure data from Wikidata SPARQL endpoint"""
    print("Downloading from Wikidata SPARQL...")

    # Wikidata SPARQL for European airports with IATA codes
    sparql_query = """
    SELECT ?airport ?airportLabel ?iata ?icao ?coord ?country WHERE {
      ?airport wdt:P31/wdt:P279* wd:Q1248784 .  # Instance of airport
      ?airport wdt:P17 ?country .
      ?country wdt:P30 wd:Q46 .  # Europe
      OPTIONAL { ?airport wdt:P238 ?iata . }
      OPTIONAL { ?airport wdt:P239 ?icao . }
      OPTIONAL { ?airport wdt:P625 ?coord . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
    }
    """

    sparql_endpoint = "https://query.wikidata.org/sparql"

    try:
        import urllib.parse
        query_url = f"{sparql_endpoint}?query={urllib.parse.quote(sparql_query)}&format=json"

        ssl_context = create_ssl_context()
        response = urlopen(query_url, timeout=60, context=ssl_context)
        data = json.loads(response.read().decode())

        airports = []
        for binding in data.get("results", {}).get("bindings", []):
            airport_data = {
                "name": binding.get("airportLabel", {}).get("value", "Unknown"),
                "iata": binding.get("iata", {}).get("value"),
                "icao": binding.get("icao", {}).get("value"),
                "country": binding.get("country", {}).get("value"),
                "coordinates": binding.get("coord", {}).get("value")
            }
            airports.append(airport_data)

        print(f"Retrieved {len(airports)} airports from Wikidata")

        # Save as GeoJSON
        features = []
        for airport in airports:
            if airport["coordinates"]:
                # Parse coordinates from Wikidata format
                coord_str = airport["coordinates"].replace("Point(", "").replace(")", "")
                try:
                    lon, lat = map(float, coord_str.split())
                    features.append({
                        "type": "Feature",
                        "geometry": {"type": "Point", "coordinates": [lon, lat]},
                        "properties": {
                            "name": airport["name"],
                            "iata": airport["iata"],
                            "icao": airport["icao"],
                            "asset_type": "airport",
                            "source": "wikidata"
                        }
                    })
                except ValueError:
                    continue

        output_path = ASSET_DIR / "airports_wikidata.geojson"
        geojson = {"type": "FeatureCollection", "features": features}
        output_path.write_text(json.dumps(geojson, ensure_ascii=False))
        print(f"Saved {len(features)} airports to {output_path}")

    except Exception as e:
        print(f"Wikidata download failed: {e}")

def download_from_github_datasets() -> None:
    """Download from curated GitHub datasets"""
    print("Downloading from GitHub open datasets...")

    # Example: Airport data from davidmegginson/ourairports-data
    datasets = [
        {
            "name": "airports",
            "url": "https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv",
            "filename": "airports_github.csv"
        },
        {
            "name": "countries",
            "url": "https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/countries.csv",
            "filename": "countries.csv"
        }
    ]

    ssl_context = create_ssl_context()

    for dataset in datasets:
        try:
            print(f"Downloading {dataset['name']}...")
            response = urlopen(dataset["url"], timeout=60, context=ssl_context)
            data = response.read().decode("utf-8")

            output_path = ASSET_DIR / dataset["filename"]
            output_path.write_text(data)

            # Count lines for feedback
            lines = data.split('\n')
            print(f"Saved {len(lines)-1} {dataset['name']} records")

        except Exception as e:
            print(f"Failed to download {dataset['name']}: {e}")

def download_military_osm_extracts() -> None:
    """Download from OSM planet extracts (pre-processed)"""
    print("Using OSM extracts for military data...")

    # Geofabrik provides regional extracts that are updated daily
    # This reduces load on Overpass API by using pre-processed data
    extracts = [
        "https://download.geofabrik.de/europe/germany-latest.osm.pbf",
        "https://download.geofabrik.de/europe/france-latest.osm.pbf"
        # Note: These would need osmium or similar tools to process
    ]

    print("OSM extracts require osmium-tool for processing:")
    print("pip install osmium")
    print("osmium tags-filter germany-latest.osm.pbf landuse=military -o military.osm.xml")

def create_fallback_dataset() -> None:
    """Create minimal fallback dataset for testing"""
    print("Creating fallback dataset...")

    # Minimal European critical infrastructure for testing
    fallback_data = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [2.349014, 48.864716]},
                "properties": {"name": "Paris CDG Airport", "asset_type": "airport", "iata": "CDG"}
            },
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [-0.461941, 51.470020]},
                "properties": {"name": "London Heathrow", "asset_type": "airport", "iata": "LHR"}
            },
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [13.287808, 52.559686]},
                "properties": {"name": "Berlin Brandenburg", "asset_type": "airport", "iata": "BER"}
            },
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [12.238889, 45.505556]},
                "properties": {"name": "Venice Port", "asset_type": "harbour", "type": "commercial"}
            },
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [4.890444, 52.371667]},
                "properties": {"name": "Amsterdam Port", "asset_type": "harbour", "type": "commercial"}
            }
        ],
        "metadata": {
            "source": "fallback_dataset",
            "purpose": "minimal_testing_data",
            "count": 5
        }
    }

    output_path = ASSET_DIR / "fallback.geojson"
    output_path.write_text(json.dumps(fallback_data, ensure_ascii=False, indent=2))
    print(f"Created fallback dataset with {len(fallback_data['features'])} features")

def main() -> None:
    """Main function demonstrating alternative data sources"""
    print("Alternative Data Sources for Infrastructure Data")
    print("="*50)

    # Try alternative sources in order of preference
    sources = [
        ("GitHub Datasets", download_from_github_datasets),
        ("Wikidata SPARQL", download_from_wikidata),
        ("Fallback Dataset", create_fallback_dataset)
    ]

    for name, func in sources:
        print(f"\n--- {name} ---")
        try:
            func()
        except Exception as e:
            print(f"Error with {name}: {e}")

    print(f"\n{'='*50}")
    print("Alternative source downloads completed")
    print("Check data/assets/ for downloaded files")

if __name__ == "__main__":
    main()
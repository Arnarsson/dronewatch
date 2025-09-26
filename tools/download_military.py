#!/usr/bin/env python3
"""Download military infrastructure only"""
import json
import pathlib
import ssl
from urllib.parse import quote
from urllib.request import urlopen

ROOT = pathlib.Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "data" / "assets"
ASSET_DIR.mkdir(parents=True, exist_ok=True)

def download_military():
    """Download military bases across Europe"""
    overpass = """
    [out:json][timeout:120];
    (
      node["landuse"="military"](35,-15,72,40);
      way["landuse"="military"](35,-15,72,40);
      relation["landuse"="military"](35,-15,72,40);
      node["military"](35,-15,72,40);
      way["military"](35,-15,72,40);
      relation["military"](35,-15,72,40);
      node["aeroway"="aerodrome"]["military"="yes"](35,-15,72,40);
      way["aeroway"="aerodrome"]["military"="yes"](35,-15,72,40);
      relation["aeroway"="aerodrome"]["military"="yes"](35,-15,72,40);
    );
    out center tags;
    """
    url = "https://overpass-api.de/api/interpreter?data=" + quote(overpass)
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    raw = urlopen(url, timeout=240, context=ssl_context).read().decode("utf-8", "ignore")
    osm = json.loads(raw)
    features = []
    for element in osm.get("elements", []):
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
    out_path = ASSET_DIR / "military.geojson"
    out_path.write_text(json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False), encoding="utf-8")
    print(f"Saved {len(features)} military facilities -> {out_path}")

if __name__ == "__main__":
    download_military()
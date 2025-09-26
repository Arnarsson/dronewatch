#!/usr/bin/env python3
"""Download base asset registries (airports, harbours) for Drone Sightings.

Airports: OurAirports CSV filtered to Europe (broad definition).
Harbours: Overpass query grabbing harbours/ports/ferry terminals around Europe.
"""
from __future__ import annotations

import csv
import json
import pathlib
import ssl
import sys
from urllib.parse import quote
from urllib.request import urlopen

ROOT = pathlib.Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "data" / "assets"
ASSET_DIR.mkdir(parents=True, exist_ok=True)

EU_ISO = {
    "AL","AD","AT","BA","BE","BG","BY","CH","CY","CZ","DE","DK","EE","ES","FI","FO","FR","GB","GI","GR","HR",
    "HU","IE","IS","IT","LI","LT","LU","LV","MD","ME","MK","MT","NL","NO","PL","PT","RO","RS","RU","SE","SI","SK",
    "SM","UA"
}


def download_airports() -> None:
    url = "https://ourairports.com/data/airports.csv"
    # Create SSL context that doesn't verify certificates
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    text = urlopen(url, timeout=60, context=ssl_context).read().decode("utf-8", "ignore")
    rows = list(csv.DictReader(text.splitlines()))
    if not rows:
        print("[warn] OurAirports returned no rows", file=sys.stderr)
        return
    filtered = [row for row in rows if row.get("iso_country") in EU_ISO]
    out_path = ASSET_DIR / "airports.csv"
    if not filtered:
        out_path.write_text('', encoding='utf-8')
        print('[warn] no European airports matched filter', file=sys.stderr)
        return
    with out_path.open('w', encoding='utf-8', newline='') as fh:
        writer = csv.DictWriter(fh, fieldnames=filtered[0].keys())
        writer.writeheader()
        for row in filtered:
            writer.writerow(row)
    print(f"Saved {len(filtered)} European airports -> {out_path}")


def download_military() -> None:
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


def download_energy() -> None:
    """Download energy infrastructure (nuclear, wind, solar, etc.)"""
    overpass = """
    [out:json][timeout:120];
    (
      node["power"="plant"](35,-15,72,40);
      way["power"="plant"](35,-15,72,40);
      relation["power"="plant"](35,-15,72,40);
      node["power"="generator"]["generator:source"~"nuclear|wind|solar|gas|coal"](35,-15,72,40);
      way["power"="generator"]["generator:source"~"nuclear|wind|solar|gas|coal"](35,-15,72,40);
      relation["power"="generator"]["generator:source"~"nuclear|wind|solar|gas|coal"](35,-15,72,40);
      node["man_made"="offshore_platform"](35,-15,72,40);
      way["man_made"="offshore_platform"](35,-15,72,40);
      relation["man_made"="offshore_platform"](35,-15,72,40);
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
    out_path = ASSET_DIR / "energy.geojson"
    out_path.write_text(json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False), encoding="utf-8")
    print(f"Saved {len(features)} energy facilities -> {out_path}")


def download_rail() -> None:
    """Download critical rail infrastructure"""
    overpass = """
    [out:json][timeout:120];
    (
      node["railway"="station"]["station"~"train|subway"](35,-15,72,40);
      way["railway"="station"](35,-15,72,40);
      relation["railway"="station"](35,-15,72,40);
      node["public_transport"="station"]["station"="train"](35,-15,72,40);
      way["public_transport"="station"]["station"="train"](35,-15,72,40);
      relation["public_transport"="station"]["station"="train"](35,-15,72,40);
      node["railway"="halt"](35,-15,72,40);
      way["railway"="halt"](35,-15,72,40);
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
        name = tags.get("name") or "Rail station"
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [float(lon), float(lat)]},
            "properties": {
                "osm_id": element.get("id"),
                "name": name,
                "asset_type": "rail",
                "tags": {k: v for k, v in tags.items() if k not in {"name"}}
            }
        })
    out_path = ASSET_DIR / "rail.geojson"
    out_path.write_text(json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False), encoding="utf-8")
    print(f"Saved {len(features)} rail facilities -> {out_path}")


def download_border() -> None:
    """Download border crossings and critical border infrastructure"""
    overpass = """
    [out:json][timeout:120];
    (
      node["barrier"="border_control"](35,-15,72,40);
      way["barrier"="border_control"](35,-15,72,40);
      relation["barrier"="border_control"](35,-15,72,40);
      node["amenity"="customs"](35,-15,72,40);
      way["amenity"="customs"](35,-15,72,40);
      relation["amenity"="customs"](35,-15,72,40);
      node["checkpoint"](35,-15,72,40);
      way["checkpoint"](35,-15,72,40);
      relation["checkpoint"](35,-15,72,40);
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
        name = tags.get("name") or "Border crossing"
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [float(lon), float(lat)]},
            "properties": {
                "osm_id": element.get("id"),
                "name": name,
                "asset_type": "border",
                "tags": {k: v for k, v in tags.items() if k not in {"name"}}
            }
        })
    out_path = ASSET_DIR / "border.geojson"
    out_path.write_text(json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False), encoding="utf-8")
    print(f"Saved {len(features)} border facilities -> {out_path}")


def download_harbours() -> None:
    overpass = """
    [out:json][timeout:60];
    (
      node["harbour"](35,-15,72,40);
      way["harbour"](35,-15,72,40);
      relation["harbour"](35,-15,72,40);
      node["amenity"="ferry_terminal"](35,-15,72,40);
      way["amenity"="ferry_terminal"](35,-15,72,40);
      relation["amenity"="ferry_terminal"](35,-15,72,40);
      node["port"](35,-15,72,40);
      way["port"](35,-15,72,40);
      relation["port"](35,-15,72,40);
    );
    out center tags;
    """
    url = "https://overpass-api.de/api/interpreter?data=" + quote(overpass)
    # Create SSL context that doesn't verify certificates
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    raw = urlopen(url, timeout=180, context=ssl_context).read().decode("utf-8", "ignore")
    osm = json.loads(raw)
    features = []
    for element in osm.get("elements", []):
        center = element.get("center", {})
        lat = element.get("lat", center.get("lat"))
        lon = element.get("lon", center.get("lon"))
        if lat is None or lon is None:
            continue
        tags = element.get("tags", {})
        name = tags.get("name") or tags.get("harbour") or tags.get("ref") or "Unnamed harbour"
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [float(lon), float(lat)]},
            "properties": {
                "osm_id": element.get("id"),
                "name": name,
                "tags": {k: v for k, v in tags.items() if k not in {"name", "harbour"}}
            }
        })
    out_path = ASSET_DIR / "harbours.geojson"
    out_path.write_text(json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False), encoding="utf-8")
    print(f"Saved {len(features)} harbour/port features -> {out_path}")


def main() -> None:
    print("Downloading critical infrastructure data...")
    download_airports()
    print("Waiting 30s to avoid rate limiting...")
    import time
    time.sleep(30)

    download_harbours()
    time.sleep(30)

    download_military()
    time.sleep(30)

    download_energy()
    time.sleep(30)

    download_rail()
    time.sleep(30)

    download_border()
    print("All infrastructure data downloaded successfully!")


if __name__ == "__main__":
    main()

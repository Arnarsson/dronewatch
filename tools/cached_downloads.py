#!/usr/bin/env python3
"""Smart caching system for infrastructure data with incremental updates"""
import json
import pathlib
import time
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

ROOT = pathlib.Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "data" / "assets"
CACHE_DIR = ROOT / "data" / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Cache configuration
CACHE_EXPIRY = {
    "airports": 7,      # 7 days (airports change infrequently)
    "harbours": 14,     # 14 days (ports are very stable)
    "military": 30,     # 30 days (military bases rarely change)
    "energy": 3,        # 3 days (energy infrastructure changes more often)
    "rail": 14,         # 14 days (rail stations are stable)
    "border": 30        # 30 days (border crossings rarely change)
}

class AssetCache:
    def __init__(self):
        self.cache_index_path = CACHE_DIR / "cache_index.json"
        self.cache_index = self._load_cache_index()

    def _load_cache_index(self) -> Dict[str, Any]:
        """Load cache index or create new one"""
        if self.cache_index_path.exists():
            try:
                return json.loads(self.cache_index_path.read_text())
            except Exception:
                pass
        return {}

    def _save_cache_index(self) -> None:
        """Save cache index to disk"""
        self.cache_index_path.write_text(
            json.dumps(self.cache_index, indent=2, ensure_ascii=False)
        )

    def get_cache_key(self, asset_type: str, query_hash: str) -> str:
        """Generate cache key for asset type and query"""
        return f"{asset_type}_{query_hash}"

    def query_hash(self, query: str) -> str:
        """Generate hash for query to detect changes"""
        return hashlib.md5(query.encode()).hexdigest()[:12]

    def is_cache_valid(self, asset_type: str, query_hash: str) -> bool:
        """Check if cached data is still valid"""
        cache_key = self.get_cache_key(asset_type, query_hash)

        if cache_key not in self.cache_index:
            return False

        cache_info = self.cache_index[cache_key]
        cached_time = datetime.fromisoformat(cache_info["timestamp"])
        expiry_days = CACHE_EXPIRY.get(asset_type, 7)

        return datetime.now() - cached_time < timedelta(days=expiry_days)

    def get_cached_data(self, asset_type: str, query_hash: str) -> Optional[Dict]:
        """Retrieve cached data if valid"""
        if not self.is_cache_valid(asset_type, query_hash):
            return None

        cache_key = self.get_cache_key(asset_type, query_hash)
        cache_info = self.cache_index[cache_key]
        cache_file = CACHE_DIR / cache_info["filename"]

        if cache_file.exists():
            try:
                return json.loads(cache_file.read_text())
            except Exception:
                pass

        return None

    def cache_data(self, asset_type: str, query_hash: str, data: Dict) -> None:
        """Cache data with metadata"""
        cache_key = self.get_cache_key(asset_type, query_hash)
        filename = f"{cache_key}_{int(time.time())}.json"
        cache_file = CACHE_DIR / filename

        # Save data
        cache_file.write_text(
            json.dumps(data, ensure_ascii=False, separators=(',', ':'))
        )

        # Update index
        self.cache_index[cache_key] = {
            "asset_type": asset_type,
            "query_hash": query_hash,
            "filename": filename,
            "timestamp": datetime.now().isoformat(),
            "size": len(data.get("elements", [])),
            "file_size": cache_file.stat().st_size
        }

        self._save_cache_index()

    def clean_expired_cache(self) -> None:
        """Remove expired cache files"""
        now = datetime.now()
        expired_keys = []

        for cache_key, cache_info in self.cache_index.items():
            cached_time = datetime.fromisoformat(cache_info["timestamp"])
            asset_type = cache_info["asset_type"]
            expiry_days = CACHE_EXPIRY.get(asset_type, 7)

            if now - cached_time > timedelta(days=expiry_days):
                # Remove file
                cache_file = CACHE_DIR / cache_info["filename"]
                if cache_file.exists():
                    cache_file.unlink()
                expired_keys.append(cache_key)

        # Remove from index
        for key in expired_keys:
            del self.cache_index[key]

        if expired_keys:
            self._save_cache_index()
            print(f"Cleaned {len(expired_keys)} expired cache entries")

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_files = len(self.cache_index)
        total_size = sum(info.get("file_size", 0) for info in self.cache_index.values())

        by_type = {}
        for cache_info in self.cache_index.values():
            asset_type = cache_info["asset_type"]
            if asset_type not in by_type:
                by_type[asset_type] = {"count": 0, "size": 0}
            by_type[asset_type]["count"] += 1
            by_type[asset_type]["size"] += cache_info.get("file_size", 0)

        return {
            "total_files": total_files,
            "total_size_mb": total_size / (1024 * 1024),
            "by_type": by_type
        }

def smart_download_airports() -> None:
    """Download airports with caching"""
    cache = AssetCache()

    # Simple query hash since airports come from CSV
    query_hash = cache.query_hash("airports_csv_ourairports")

    cached_data = cache.get_cached_data("airports", query_hash)
    if cached_data:
        print("Using cached airport data...")
        # Copy cached data to assets directory
        output_path = ASSET_DIR / "airports.csv"
        output_path.write_text(cached_data["content"])
        print(f"Restored {cached_data['count']} airports from cache")
        return

    print("Downloading fresh airport data...")
    # Import the original function
    from build_assets import download_airports
    download_airports()

    # Cache the downloaded data
    output_path = ASSET_DIR / "airports.csv"
    if output_path.exists():
        content = output_path.read_text()
        lines = content.split('\n')
        cache_data = {
            "content": content,
            "count": len(lines) - 1,  # Subtract header
            "elements": lines  # For compatibility
        }
        cache.cache_data("airports", query_hash, cache_data)
        print("Airport data cached for future use")

def check_cache_status() -> None:
    """Display current cache status"""
    cache = AssetCache()
    cache.clean_expired_cache()
    stats = cache.get_cache_stats()

    print(f"\n{'='*40}")
    print("CACHE STATUS")
    print(f"{'='*40}")
    print(f"Total cached files: {stats['total_files']}")
    print(f"Total cache size: {stats['total_size_mb']:.1f} MB")

    for asset_type, info in stats["by_type"].items():
        age_days = CACHE_EXPIRY.get(asset_type, 7)
        print(f"- {asset_type}: {info['count']} files, {info['size']/(1024*1024):.1f} MB (expires: {age_days}d)")

def main() -> None:
    """Main function with caching"""
    print("Smart Infrastructure Downloads with Caching")

    # Check current cache status
    check_cache_status()

    # Download with caching
    smart_download_airports()

    # Show updated cache status
    check_cache_status()

if __name__ == "__main__":
    main()
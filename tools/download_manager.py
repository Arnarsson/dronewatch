#!/usr/bin/env python3
"""Download manager with rate limiting, fallbacks, and monitoring"""
import json
import pathlib
import time
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

ROOT = pathlib.Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "data" / "assets"
LOG_DIR = ROOT / "data" / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_DIR / 'downloads.log'),
        logging.StreamHandler()
    ]
)

@dataclass
class DownloadConfig:
    """Download configuration settings"""
    max_retries: int = 3
    base_delay: float = 30.0      # Base delay between requests
    timeout: int = 90             # Request timeout
    chunk_size: int = 2           # Regions per chunk
    enable_cache: bool = True
    enable_fallback: bool = True
    rate_limit_delay: float = 45.0  # Delay between major operations

class RateLimiter:
    """Smart rate limiting with exponential backoff"""

    def __init__(self, base_delay: float = 30.0):
        self.base_delay = base_delay
        self.last_request = 0.0
        self.consecutive_failures = 0
        self.total_requests = 0

    def wait_if_needed(self) -> None:
        """Wait if rate limiting is needed"""
        now = time.time()
        time_since_last = now - self.last_request

        # Calculate required delay based on failures
        required_delay = self.base_delay
        if self.consecutive_failures > 0:
            # Exponential backoff: 30s, 90s, 270s
            required_delay *= (3 ** self.consecutive_failures)

        if time_since_last < required_delay:
            wait_time = required_delay - time_since_last
            logging.info(f"Rate limiting: waiting {wait_time:.1f}s")
            time.sleep(wait_time)

        self.last_request = time.time()
        self.total_requests += 1

    def record_success(self) -> None:
        """Record successful request"""
        self.consecutive_failures = 0

    def record_failure(self) -> None:
        """Record failed request"""
        self.consecutive_failures += 1

class DownloadManager:
    """Manages all infrastructure downloads with rate limiting"""

    def __init__(self, config: DownloadConfig = None):
        self.config = config or DownloadConfig()
        self.rate_limiter = RateLimiter(self.config.base_delay)
        self.download_stats = {
            "started": datetime.now().isoformat(),
            "operations": [],
            "total_features": 0,
            "total_time": 0.0
        }

    def download_with_fallback(self, asset_type: str) -> bool:
        """Download asset with fallback strategies"""
        logging.info(f"Starting download: {asset_type}")
        start_time = time.time()

        strategies = [
            self._try_cached_download,
            self._try_optimized_download,
            self._try_alternative_sources,
            self._try_fallback_data
        ]

        for i, strategy in enumerate(strategies):
            try:
                self.rate_limiter.wait_if_needed()

                if strategy(asset_type):
                    duration = time.time() - start_time
                    self.rate_limiter.record_success()

                    self.download_stats["operations"].append({
                        "asset_type": asset_type,
                        "strategy": strategy.__name__,
                        "duration": duration,
                        "timestamp": datetime.now().isoformat(),
                        "success": True
                    })

                    logging.info(f"✅ {asset_type} downloaded successfully using {strategy.__name__} in {duration:.1f}s")
                    return True

            except Exception as e:
                logging.warning(f"Strategy {strategy.__name__} failed for {asset_type}: {e}")
                self.rate_limiter.record_failure()
                continue

        # All strategies failed
        duration = time.time() - start_time
        self.download_stats["operations"].append({
            "asset_type": asset_type,
            "strategy": "all_failed",
            "duration": duration,
            "timestamp": datetime.now().isoformat(),
            "success": False
        })

        logging.error(f"❌ All download strategies failed for {asset_type}")
        return False

    def _try_cached_download(self, asset_type: str) -> bool:
        """Try to use cached data"""
        if not self.config.enable_cache:
            return False

        from cached_downloads import AssetCache
        cache = AssetCache()

        # Simple cache check (would need proper implementation)
        cache_file = ASSET_DIR / f"{asset_type}_cached.geojson"
        if cache_file.exists():
            # Check if cache is recent enough
            cache_age = time.time() - cache_file.stat().st_mtime
            max_age = 24 * 3600  # 24 hours

            if cache_age < max_age:
                logging.info(f"Using cached {asset_type} data")
                return True

        return False

    def _try_optimized_download(self, asset_type: str) -> bool:
        """Try optimized chunked download"""
        from optimized_downloads import (
            download_military_chunked,
            download_energy_chunked,
            download_critical_infrastructure
        )

        download_functions = {
            "military": download_military_chunked,
            "energy": download_energy_chunked,
            "critical": download_critical_infrastructure
        }

        if asset_type in download_functions:
            download_functions[asset_type]()
            return True

        return False

    def _try_alternative_sources(self, asset_type: str) -> bool:
        """Try alternative data sources"""
        if not self.config.enable_fallback:
            return False

        from alternative_sources import (
            download_from_github_datasets,
            download_from_wikidata
        )

        if asset_type == "airports":
            download_from_github_datasets()
            return True
        elif asset_type == "infrastructure":
            download_from_wikidata()
            return True

        return False

    def _try_fallback_data(self, asset_type: str) -> bool:
        """Use minimal fallback data"""
        from alternative_sources import create_fallback_dataset

        create_fallback_dataset()
        logging.warning(f"Using fallback data for {asset_type}")
        return True

    def download_all_infrastructure(self) -> None:
        """Download all infrastructure with proper rate limiting"""
        assets = [
            "airports",
            "critical",
            "military",
            "energy"
        ]

        successful = 0
        total = len(assets)

        for i, asset_type in enumerate(assets):
            logging.info(f"Progress: {i+1}/{total} - {asset_type}")

            if self.download_with_fallback(asset_type):
                successful += 1

            # Rate limiting between assets
            if i < len(assets) - 1:  # Not the last asset
                delay = self.config.rate_limit_delay
                logging.info(f"Rate limiting: waiting {delay}s before next asset...")
                time.sleep(delay)

        # Final statistics
        total_time = time.time() - time.mktime(time.strptime(
            self.download_stats["started"], "%Y-%m-%dT%H:%M:%S.%f"
        ))

        self.download_stats.update({
            "completed": datetime.now().isoformat(),
            "total_time": total_time,
            "success_rate": successful / total,
            "successful_downloads": successful,
            "total_downloads": total
        })

        self._save_download_report()

        logging.info(f"\n{'='*50}")
        logging.info(f"DOWNLOAD SUMMARY")
        logging.info(f"{'='*50}")
        logging.info(f"Successful: {successful}/{total} ({successful/total*100:.1f}%)")
        logging.info(f"Total time: {total_time:.1f} seconds")
        logging.info(f"Average per asset: {total_time/total:.1f} seconds")

    def _save_download_report(self) -> None:
        """Save detailed download report"""
        report_path = LOG_DIR / f"download_report_{int(time.time())}.json"
        report_path.write_text(
            json.dumps(self.download_stats, indent=2, ensure_ascii=False)
        )
        logging.info(f"Download report saved: {report_path}")

def main() -> None:
    """Main execution with comprehensive rate limiting"""
    config = DownloadConfig(
        max_retries=3,
        base_delay=45.0,          # Conservative 45s between requests
        timeout=120,              # Longer timeout
        enable_cache=True,
        enable_fallback=True,
        rate_limit_delay=60.0     # 1 minute between major operations
    )

    manager = DownloadManager(config)

    logging.info("Starting comprehensive infrastructure download with rate limiting")
    manager.download_all_infrastructure()

if __name__ == "__main__":
    main()
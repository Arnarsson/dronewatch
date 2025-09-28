/**
 * URL Validator Module
 * Validates and verifies URLs for reliability
 */

import fetch from 'node-fetch';

export class URLValidator {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 3600000; // 1 hour
  }

  /**
   * Validate a URL and return its status
   * @param {string} url - URL to validate
   * @param {object} options - Validation options
   * @returns {object} Validation result
   */
  async validate(url, options = {}) {
    const {
      timeout = 5000,
      followRedirects = true,
      checkArchive = true
    } = options;

    // Check cache first
    const cacheKey = url;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }

    try {
      // Fix common URL issues
      const fixedUrl = this.fixCommonIssues(url);

      // Validate URL format
      const urlObj = new URL(fixedUrl);

      // Check if URL is reachable
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(fixedUrl, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: followRedirects ? 'follow' : 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DroneWatch/1.0; +https://dronewatch.eu)'
        }
      });

      clearTimeout(timeoutId);

      const result = {
        valid: response.ok,
        status: response.status,
        url: fixedUrl,
        finalUrl: response.url,
        verified: new Date().toISOString()
      };

      // If URL is broken, try to get archive link
      if (!response.ok && checkArchive) {
        result.archiveUrl = await this.getArchiveUrl(fixedUrl);
      }

      // Cache the result
      this.cache.set(cacheKey, {
        timestamp: Date.now(),
        result
      });

      return result;
    } catch (error) {
      const result = {
        valid: false,
        status: error.name === 'AbortError' ? 'timeout' : 'error',
        error: error.message,
        url,
        verified: new Date().toISOString()
      };

      // Try to get archive link for failed URLs
      if (checkArchive) {
        result.archiveUrl = await this.getArchiveUrl(url);
      }

      // Cache negative results too
      this.cache.set(cacheKey, {
        timestamp: Date.now(),
        result
      });

      return result;
    }
  }

  /**
   * Fix common URL issues
   */
  fixCommonIssues(url) {
    // Fix Reddit URLs missing www
    if (url.includes('reddit.com') && !url.includes('www.reddit.com')) {
      url = url.replace('reddit.com', 'www.reddit.com');
    }

    // Ensure protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // Fix double slashes (except after protocol)
    url = url.replace(/([^:])\/\/+/g, '$1/');

    return url;
  }

  /**
   * Get archive URL for a given URL
   */
  async getArchiveUrl(url) {
    // Try Wayback Machine
    try {
      const waybackUrl = `https://web.archive.org/web/*/${url}`;
      // Could validate if archive exists, but for now just return the search URL
      return waybackUrl;
    } catch {
      return null;
    }
  }

  /**
   * Batch validate multiple URLs
   */
  async validateBatch(urls, options = {}) {
    const results = [];
    for (const url of urls) {
      const result = await this.validate(url, options);
      results.push(result);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return results;
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export default URLValidator;
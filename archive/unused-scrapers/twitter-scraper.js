/**
 * Twitter/X Web Scraper for Authority Monitoring
 * Scrapes public tweets from authority accounts without API
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class TwitterScraper {
  constructor(config = {}) {
    this.browser = null;
    this.context = null;
    this.page = null;

    this.config = {
      headless: config.headless !== false,
      userAgent: config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: config.viewport || { width: 1280, height: 720 },
      timeout: config.timeout || 30000,
      scrollAttempts: config.scrollAttempts || 5,
      cacheDir: path.join(__dirname, '..', '..', 'cache', 'twitter')
    };

    // Authority accounts to monitor
    this.authorityAccounts = [
      // Scandinavian
      { handle: 'Rigspolitiet', name: 'Danish Police', lang: 'da', priority: 'high' },
      { handle: 'BeredskabDK', name: 'Danish Emergency', lang: 'da', priority: 'high' },
      { handle: 'forsvaret', name: 'Danish Defence', lang: 'da', priority: 'high' },
      { handle: 'polisen', name: 'Swedish Police', lang: 'sv', priority: 'high' },
      { handle: 'politietnorge', name: 'Norwegian Police', lang: 'no', priority: 'high' },
      { handle: 'Forsvaret_no', name: 'Norwegian Military', lang: 'no', priority: 'medium' },

      // German
      { handle: 'bka', name: 'German Federal Police', lang: 'de', priority: 'high' },
      { handle: 'bundeswehrInfo', name: 'German Military', lang: 'de', priority: 'high' },
      { handle: 'polizei_nrw', name: 'NRW Police', lang: 'de', priority: 'medium' },

      // French
      { handle: 'PoliceNationale', name: 'French Police', lang: 'fr', priority: 'high' },
      { handle: 'Gendarmerie', name: 'French Gendarmerie', lang: 'fr', priority: 'high' },
      { handle: 'Armee_de_lair', name: 'French Air Force', lang: 'fr', priority: 'medium' },

      // UK
      { handle: 'metpoliceuk', name: 'London Police', lang: 'en', priority: 'high' },
      { handle: 'NCAuk', name: 'UK Crime Agency', lang: 'en', priority: 'high' },
      { handle: 'defenceuk', name: 'UK Defence', lang: 'en', priority: 'medium' },

      // Netherlands & Belgium
      { handle: 'politie', name: 'Dutch Police', lang: 'nl', priority: 'high' },
      { handle: 'Defensie', name: 'Dutch Defence', lang: 'nl', priority: 'medium' },
      { handle: 'federalepolitie', name: 'Belgian Police', lang: 'nl', priority: 'medium' },

      // European
      { handle: 'Europol', name: 'European Police', lang: 'en', priority: 'high' },
      { handle: 'eurocontrol', name: 'Air Traffic Control', lang: 'en', priority: 'critical' },
      { handle: 'EU_Commission', name: 'EU Commission', lang: 'en', priority: 'low' }
    ];

    // Keywords for drone incident detection
    this.droneKeywords = [
      'drone', 'drones', 'UAV', 'UAS', 'unmanned',
      'drohne', 'drohnen', // German
      'dron', // Danish/Norwegian
      'drönare', // Swedish
      'onbemande', // Dutch
      'sans pilote', 'télépilot' // French
    ];

    this.incidentKeywords = [
      'airport', 'airspace', 'closed', 'security', 'threat',
      'lufthavn', 'luftrum', // Danish
      'flygplats', 'luftrum', // Swedish
      'lufthavn', 'luftrom', // Norwegian
      'flughafen', 'luftraum', // German
      'aéroport', 'espace aérien', // French
      'luchthaven', 'luchtruim' // Dutch
    ];

    this.cache = new Map();
    this.lastScraped = new Map();
  }

  async initialize() {
    console.log('🐦 Initializing Twitter/X web scraper...');

    try {
      // Launch browser
      this.browser = await chromium.launch({
        headless: this.config.headless,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          '--no-sandbox'
        ]
      });

      this.context = await this.browser.newContext({
        viewport: this.config.viewport,
        userAgent: this.config.userAgent,
        locale: 'en-US',
        timezoneId: 'Europe/Copenhagen'
      });

      // Add stealth modifications
      await this.context.addInitScript(() => {
        // Override navigator properties
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined
        });

        // Chrome specific
        window.chrome = {
          runtime: {}
        };

        // Permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );
      });

      // Create cache directory
      await fs.mkdir(this.config.cacheDir, { recursive: true });

      console.log('✅ Twitter/X scraper initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Twitter scraper:', error);
      return false;
    }
  }

  async scrapeAuthorityTweets(hoursBack = 24) {
    console.log(`🐦 Scraping tweets from ${this.authorityAccounts.length} authority accounts...`);
    const incidents = [];
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);

    // Process high priority accounts first
    const sortedAccounts = this.authorityAccounts.sort((a, b) => {
      const priority = { critical: 4, high: 3, medium: 2, low: 1 };
      return priority[b.priority] - priority[a.priority];
    });

    for (const account of sortedAccounts) {
      try {
        // Check if recently scraped
        const lastScraped = this.lastScraped.get(account.handle);
        if (lastScraped && Date.now() - lastScraped < 3600000) {
          console.log(`⏭️ Skipping ${account.handle} (recently scraped)`);
          continue;
        }

        const tweets = await this.scrapeAccountTweets(account, cutoffTime);
        const droneIncidents = this.filterDroneIncidents(tweets, account);

        if (droneIncidents.length > 0) {
          console.log(`✅ Found ${droneIncidents.length} drone incidents from @${account.handle}`);
          incidents.push(...droneIncidents);
        }

        this.lastScraped.set(account.handle, Date.now());

        // Random delay between accounts
        await this.randomDelay(3000, 7000);

      } catch (error) {
        console.error(`❌ Error scraping @${account.handle}:`, error.message);
      }
    }

    console.log(`📊 Twitter Scraper: Found ${incidents.length} total incidents`);
    return incidents;
  }

  async scrapeAccountTweets(account, cutoffTime) {
    const page = await this.context.newPage();

    try {
      // Try nitter instances first (more reliable, no login required)
      const nitterInstances = [
        'nitter.net',
        'nitter.1d4.us',
        'nitter.kavin.rocks',
        'nitter.unixfox.eu'
      ];

      for (const instance of nitterInstances) {
        try {
          return await this.scrapeNitter(page, account, instance, cutoffTime);
        } catch (error) {
          console.log(`Nitter ${instance} failed, trying next...`);
        }
      }

      // Fallback to direct Twitter scraping
      return await this.scrapeTwitterDirect(page, account, cutoffTime);

    } finally {
      await page.close();
    }
  }

  async scrapeNitter(page, account, instance, cutoffTime) {
    const url = `https://${instance}/${account.handle}`;
    console.log(`📡 Scraping ${account.name} via Nitter: ${url}`);

    await page.goto(url, { waitUntil: 'networkidle', timeout: this.config.timeout });

    // Wait for tweets to load
    await page.waitForSelector('.timeline-item', { timeout: 10000 });

    // Scroll to load more tweets
    for (let i = 0; i < this.config.scrollAttempts; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await this.randomDelay(1000, 2000);
    }

    // Extract tweets
    const tweets = await page.evaluate((cutoff) => {
      const items = document.querySelectorAll('.timeline-item');
      const results = [];

      items.forEach(item => {
        try {
          // Extract tweet text
          const contentEl = item.querySelector('.tweet-content');
          const text = contentEl?.textContent || '';

          // Extract timestamp
          const timeEl = item.querySelector('.tweet-date a');
          const timestamp = timeEl?.getAttribute('title') || '';

          // Extract link
          const linkEl = item.querySelector('.tweet-link');
          const link = linkEl?.href || '';

          // Extract stats
          const replies = item.querySelector('.icon-comment')?.parentElement?.textContent?.trim() || '0';
          const retweets = item.querySelector('.icon-retweet')?.parentElement?.textContent?.trim() || '0';
          const likes = item.querySelector('.icon-heart')?.parentElement?.textContent?.trim() || '0';

          // Check if it's recent enough
          const tweetTime = new Date(timestamp).getTime();
          if (tweetTime > cutoff) {
            results.push({
              text,
              timestamp,
              link,
              engagement: {
                replies: parseInt(replies) || 0,
                retweets: parseInt(retweets) || 0,
                likes: parseInt(likes) || 0
              }
            });
          }
        } catch (error) {
          // Skip problematic tweets
        }
      });

      return results;
    }, cutoffTime);

    return tweets;
  }

  async scrapeTwitterDirect(page, account, cutoffTime) {
    const url = `https://twitter.com/${account.handle}`;
    console.log(`📡 Scraping ${account.name} directly: ${url}`);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.config.timeout });

    // Wait for tweets or login wall
    try {
      await page.waitForSelector('[data-testid="tweet"]', { timeout: 10000 });
    } catch {
      console.log(`⚠️ Cannot access @${account.handle} directly (login required)`);
      return [];
    }

    // Scroll to load more tweets
    for (let i = 0; i < this.config.scrollAttempts; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await this.randomDelay(1500, 2500);
    }

    // Extract tweets
    const tweets = await page.evaluate((cutoff) => {
      const tweets = document.querySelectorAll('[data-testid="tweet"]');
      const results = [];

      tweets.forEach(tweet => {
        try {
          // Extract text
          const textEl = tweet.querySelector('[data-testid="tweetText"]');
          const text = textEl?.textContent || '';

          // Extract timestamp
          const timeEl = tweet.querySelector('time');
          const timestamp = timeEl?.getAttribute('datetime') || '';

          // Extract engagement
          const stats = tweet.querySelectorAll('[data-testid$="-count"]');
          const engagement = {
            replies: parseInt(stats[0]?.textContent || '0'),
            retweets: parseInt(stats[1]?.textContent || '0'),
            likes: parseInt(stats[2]?.textContent || '0')
          };

          // Check if recent
          const tweetTime = new Date(timestamp).getTime();
          if (tweetTime > cutoff) {
            results.push({
              text,
              timestamp,
              link: window.location.href,
              engagement
            });
          }
        } catch (error) {
          // Skip problematic tweets
        }
      });

      return results;
    }, cutoffTime);

    return tweets;
  }

  filterDroneIncidents(tweets, account) {
    const incidents = [];

    tweets.forEach(tweet => {
      const text = tweet.text.toLowerCase();

      // Check for drone keywords
      const hasDroneKeyword = this.droneKeywords.some(keyword =>
        text.includes(keyword.toLowerCase())
      );

      // Check for incident keywords
      const hasIncidentKeyword = this.incidentKeywords.some(keyword =>
        text.includes(keyword.toLowerCase())
      );

      if (hasDroneKeyword && hasIncidentKeyword) {
        // High engagement suggests important incident
        const engagementScore = tweet.engagement.replies +
                               tweet.engagement.retweets * 2 +
                               tweet.engagement.likes;

        incidents.push({
          id: `twitter-${account.handle}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          source: 'twitter',
          account: account,
          tweet: tweet,
          timestamp: new Date(tweet.timestamp).toISOString(),
          engagementScore,
          priority: this.calculatePriority(account, engagementScore),
          extracted: {
            locations: this.extractLocations(tweet.text),
            severity: this.assessSeverity(tweet.text, account.priority)
          }
        });
      }
    });

    return incidents;
  }

  extractLocations(text) {
    const locations = [];

    // Common location patterns
    const patterns = [
      /(?:at|near|in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:airport|harbour|port|base)/gi,
      /([A-Z]{3,4})\s+airport/gi // IATA/ICAO codes
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1] && match[1].length > 2) {
          locations.push(match[1]);
        }
      }
    });

    return [...new Set(locations)]; // Remove duplicates
  }

  assessSeverity(text, accountPriority) {
    let severity = 3; // Base severity

    // Account priority modifier
    if (accountPriority === 'critical') severity += 3;
    else if (accountPriority === 'high') severity += 2;
    else if (accountPriority === 'medium') severity += 1;

    // Keywords that increase severity
    const severeKeywords = ['closed', 'shutdown', 'emergency', 'threat', 'security'];
    severeKeywords.forEach(keyword => {
      if (text.includes(keyword)) severity += 1;
    });

    return Math.min(10, severity);
  }

  calculatePriority(account, engagementScore) {
    const basePriority = {
      critical: 100,
      high: 75,
      medium: 50,
      low: 25
    };

    const base = basePriority[account.priority] || 50;
    const engagementBonus = Math.min(25, Math.floor(engagementScore / 100));

    return base + engagementBonus;
  }

  async randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async shutdown() {
    if (this.browser) {
      await this.browser.close();
      console.log('🛑 Twitter scraper shut down');
    }
  }

  async saveCache() {
    try {
      const cacheData = {
        lastScraped: Object.fromEntries(this.lastScraped),
        timestamp: new Date().toISOString()
      };

      await fs.writeFile(
        path.join(this.config.cacheDir, 'scraper-cache.json'),
        JSON.stringify(cacheData, null, 2)
      );
    } catch (error) {
      console.error('Failed to save cache:', error);
    }
  }

  async loadCache() {
    try {
      const cacheFile = path.join(this.config.cacheDir, 'scraper-cache.json');
      const data = await fs.readFile(cacheFile, 'utf8');
      const cache = JSON.parse(data);

      // Load last scraped times
      Object.entries(cache.lastScraped).forEach(([handle, time]) => {
        this.lastScraped.set(handle, time);
      });

      console.log('📂 Loaded Twitter scraper cache');
    } catch (error) {
      console.log('📂 No Twitter cache found, starting fresh');
    }
  }
}

// Export for use in other modules
export default TwitterScraper;
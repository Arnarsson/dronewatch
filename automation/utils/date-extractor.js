/**
 * Date Extractor Module
 * Extracts and verifies actual incident dates from article content
 * Distinguishes between publication date and incident occurrence date
 */

export class DateExtractor {
  constructor() {
    // Common date patterns in news articles
    this.datePatterns = [
      // Explicit dates: "September 10", "Sept 10", "10 September"
      /(?:on\s+)?(?:January|Jan|February|Feb|March|Mar|April|Apr|May|June|Jun|July|Jul|August|Aug|September|Sept|Sep|October|Oct|November|Nov|December|Dec)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?/gi,
      /(?:on\s+)?\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:January|Jan|February|Feb|March|Mar|April|Apr|May|June|Jun|July|Jul|August|Aug|September|Sept|Sep|October|Oct|November|Nov|December|Dec)(?:\s+\d{4})?/gi,

      // Numeric dates: "10/09/2024", "2024-09-10", "10.09.2024"
      /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g,
      /\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}/g,

      // Relative dates that indicate past events
      /(?:last\s+)?(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/gi,
      /yesterday/gi,
      /(?:\d+|two|three|four|five|six|seven|eight|nine|ten)\s+(?:days?|weeks?|months?)\s+ago/gi,
      /earlier\s+this\s+(?:week|month|year)/gi,
      /last\s+(?:week|month|year)/gi
    ];

    // Incident indicators that often precede actual dates
    this.incidentIndicators = [
      'incident occurred',
      'incident happened',
      'incident took place',
      'was spotted',
      'was sighted',
      'was detected',
      'disrupted',
      'closed',
      'suspended operations',
      'forced to',
      'had to',
      'resulted in',
      'caused',
      'led to',
      'following',
      'after'
    ];

    // Publication indicators
    this.publicationIndicators = [
      'published',
      'posted',
      'updated',
      'written',
      'article from',
      'story from',
      'report from',
      'reporting'
    ];

    this.monthMap = {
      'january': 1, 'jan': 1,
      'february': 2, 'feb': 2,
      'march': 3, 'mar': 3,
      'april': 4, 'apr': 4,
      'may': 5,
      'june': 6, 'jun': 6,
      'july': 7, 'jul': 7,
      'august': 8, 'aug': 8,
      'september': 9, 'sept': 9, 'sep': 9,
      'october': 10, 'oct': 10,
      'november': 11, 'nov': 11,
      'december': 12, 'dec': 12
    };
  }

  /**
   * Extract dates from text content
   * @param {string} text - Article content
   * @param {Date} publicationDate - Known publication date
   * @returns {Object} Extracted date information
   */
  extractDates(text, publicationDate = new Date()) {
    const results = {
      publicationDate: this.normalizeDate(publicationDate),
      incidentDate: null,
      allDatesFound: [],
      confidence: 0,
      verificationStatus: 'unverified',
      daysDifference: null,
      isOldIncident: false,
      debugInfo: []
    };

    if (!text) {
      results.debugInfo.push('No text provided');
      return results;
    }

    // Extract all dates from the text
    const foundDates = this.findAllDates(text, publicationDate);
    results.allDatesFound = foundDates;

    // Find the most likely incident date
    const incidentInfo = this.findIncidentDate(text, foundDates, publicationDate);

    if (incidentInfo.date) {
      results.incidentDate = incidentInfo.date;
      results.confidence = incidentInfo.confidence;

      // Calculate days difference
      const pubDate = new Date(results.publicationDate);
      const incDate = new Date(results.incidentDate);
      results.daysDifference = Math.floor((pubDate - incDate) / (1000 * 60 * 60 * 24));

      // Flag old incidents (more than 7 days old)
      results.isOldIncident = results.daysDifference > 7;

      // Set verification status
      if (results.confidence >= 80) {
        results.verificationStatus = 'verified';
      } else if (results.confidence >= 50) {
        results.verificationStatus = 'probable';
      } else {
        results.verificationStatus = 'uncertain';
      }

      results.debugInfo.push(`Found incident date with ${results.confidence}% confidence`);
      results.debugInfo.push(`Days difference: ${results.daysDifference}`);
    } else {
      results.debugInfo.push('No incident date found');
    }

    return results;
  }

  /**
   * Find all dates mentioned in text
   */
  findAllDates(text, referenceDate) {
    const dates = [];
    const seenDates = new Set();

    // Search for each date pattern
    for (const pattern of this.datePatterns) {
      const matches = text.match(pattern) || [];

      for (const match of matches) {
        const parsed = this.parseDate(match, referenceDate);
        if (parsed && !seenDates.has(parsed.toISOString())) {
          dates.push({
            original: match,
            parsed: parsed,
            position: text.indexOf(match),
            context: this.getContext(text, text.indexOf(match), 50)
          });
          seenDates.add(parsed.toISOString());
        }
      }
    }

    // Sort by position in text
    dates.sort((a, b) => a.position - b.position);

    return dates;
  }

  /**
   * Identify the most likely incident date from found dates
   */
  findIncidentDate(text, foundDates, publicationDate) {
    if (foundDates.length === 0) {
      return { date: null, confidence: 0 };
    }

    const textLower = text.toLowerCase();
    const candidates = [];

    for (const dateInfo of foundDates) {
      let score = 0;
      const contextLower = dateInfo.context.toLowerCase();

      // Check if date is before publication
      if (dateInfo.parsed <= publicationDate) {
        score += 20;
      }

      // Check for incident indicators near the date
      for (const indicator of this.incidentIndicators) {
        if (contextLower.includes(indicator)) {
          score += 30;
          break;
        }
      }

      // Check if it's NOT a publication date
      let isPublication = false;
      for (const pubIndicator of this.publicationIndicators) {
        if (contextLower.includes(pubIndicator)) {
          isPublication = true;
          break;
        }
      }
      if (!isPublication) {
        score += 20;
      }

      // Earlier dates in the article are more likely to be incident dates
      const positionScore = Math.max(0, 30 - (dateInfo.position / text.length) * 30);
      score += positionScore;

      candidates.push({
        date: dateInfo.parsed,
        score: Math.min(100, score),
        original: dateInfo.original
      });
    }

    // Sort by score and return the best candidate
    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length > 0) {
      return {
        date: this.formatDate(candidates[0].date),
        confidence: candidates[0].score
      };
    }

    return { date: null, confidence: 0 };
  }

  /**
   * Parse a date string into a Date object
   */
  parseDate(dateStr, referenceDate = new Date()) {
    const str = dateStr.toLowerCase().trim();

    // Handle relative dates
    if (str.includes('yesterday')) {
      const date = new Date(referenceDate);
      date.setDate(date.getDate() - 1);
      return date;
    }

    if (str.includes('ago')) {
      const match = str.match(/(\d+|two|three|four|five|six|seven|eight|nine|ten)\s+(days?|weeks?|months?)\s+ago/);
      if (match) {
        const date = new Date(referenceDate);
        let num = parseInt(match[1]) || {
          'two': 2, 'three': 3, 'four': 4, 'five': 5,
          'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
        }[match[1]];

        const unit = match[2];
        if (unit.startsWith('day')) {
          date.setDate(date.getDate() - num);
        } else if (unit.startsWith('week')) {
          date.setDate(date.getDate() - (num * 7));
        } else if (unit.startsWith('month')) {
          date.setMonth(date.getMonth() - num);
        }
        return date;
      }
    }

    // Handle month day year formats
    for (const [monthName, monthNum] of Object.entries(this.monthMap)) {
      if (str.includes(monthName)) {
        const dayMatch = str.match(/\d{1,2}/);
        if (dayMatch) {
          const day = parseInt(dayMatch[0]);
          const yearMatch = str.match(/\d{4}/);
          const year = yearMatch ? parseInt(yearMatch[0]) : referenceDate.getFullYear();

          // If month/day is in future this year, assume last year
          const date = new Date(year, monthNum - 1, day);
          if (date > referenceDate && !yearMatch) {
            date.setFullYear(year - 1);
          }
          return date;
        }
      }
    }

    // Handle numeric formats
    const numericMatch = str.match(/(\d{1,4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,4})/);
    if (numericMatch) {
      let year, month, day;

      if (numericMatch[1].length === 4) {
        // Year first (YYYY-MM-DD)
        year = parseInt(numericMatch[1]);
        month = parseInt(numericMatch[2]);
        day = parseInt(numericMatch[3]);
      } else if (numericMatch[3].length === 4) {
        // Year last (DD/MM/YYYY or MM/DD/YYYY)
        year = parseInt(numericMatch[3]);
        // Assume European format (DD/MM) if day > 12
        if (parseInt(numericMatch[1]) > 12) {
          day = parseInt(numericMatch[1]);
          month = parseInt(numericMatch[2]);
        } else {
          // Could be either, default to MM/DD
          month = parseInt(numericMatch[1]);
          day = parseInt(numericMatch[2]);
        }
      } else {
        // No year, assume current year
        year = referenceDate.getFullYear();
        month = parseInt(numericMatch[1]);
        day = parseInt(numericMatch[2]);
      }

      const date = new Date(year, month - 1, day);
      if (date > referenceDate && numericMatch[3].length !== 4) {
        date.setFullYear(year - 1);
      }
      return date;
    }

    return null;
  }

  /**
   * Get context around a position in text
   */
  getContext(text, position, radius = 50) {
    const start = Math.max(0, position - radius);
    const end = Math.min(text.length, position + radius + 20);
    return text.substring(start, end);
  }

  /**
   * Normalize a date to ISO format
   */
  normalizeDate(date) {
    if (typeof date === 'string') {
      return new Date(date).toISOString().split('T')[0];
    }
    return date.toISOString().split('T')[0];
  }

  /**
   * Format a date for display
   */
  formatDate(date) {
    if (!date) return null;
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  /**
   * Verify if an incident is recent enough to display
   */
  isIncidentRecent(incidentDate, publicationDate, maxDaysOld = 30) {
    if (!incidentDate) return true; // If we can't verify, show it

    const inc = new Date(incidentDate);
    const pub = new Date(publicationDate);
    const daysDiff = Math.floor((pub - inc) / (1000 * 60 * 60 * 24));

    return daysDiff <= maxDaysOld;
  }
}

export default DateExtractor;
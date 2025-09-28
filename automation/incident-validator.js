/**
 * Strict Incident Validator
 * Ensures only real drone incidents (not news about drones) get through
 */

export class IncidentValidator {
  constructor() {
    // REAL INCIDENT INDICATORS - Must have at least one
    this.incidentIndicators = [
      // Direct incident words
      'sighting', 'spotted', 'seen', 'observed', 'detected',
      'disrupted', 'disruption', 'halted', 'stopped', 'delayed',
      'closed', 'closure', 'close', 'shut down', 'suspended', 'grounded',
      'forces', 'forced', 'causing', 'caused',
      'intercepted', 'shot down', 'downed', 'destroyed', 'neutralized',
      'breached', 'breach', 'entered', 'penetrated', 'violated',
      'collision', 'collides', 'collided', 'crashed', 'hit', 'struck', 'impact',
      'near miss', 'close call', 'narrowly avoided',
      'forced to land', 'emergency landing', 'diverted',

      // Response actions
      'police responded', 'military responded', 'authorities responded',
      'investigation launched', 'searching for operator',
      'airspace closed', 'flights cancelled', 'operations suspended',
      'evacuated', 'lockdown', 'security alert',

      // Temporal incident markers
      'incident occurred', 'incident reported', 'incident at',
      'drone incident', 'uav incident', 'uas incident',
      'happened at', 'took place', 'occurred on'
    ];

    // NON-INCIDENT EXCLUSIONS - If found, likely NOT an incident
    this.nonIncidentKeywords = [
      // Business/Legal
      'lawsuit', 'legal', 'court', 'judge', 'ruling', 'verdict',
      'patent', 'trademark', 'copyright', 'litigation',
      'merger', 'acquisition', 'investment', 'funding', 'ipo',
      'stock', 'shares', 'market', 'trading', 'investor',
      'earnings', 'revenue', 'profit', 'loss', 'quarterly',

      // Product/Technology
      'announced', 'unveils', 'launches', 'releases', 'introduces',
      'new model', 'new drone', 'product launch', 'preview',
      'review', 'specs', 'features', 'upgrade', 'update',
      'software', 'firmware', 'app', 'platform',

      // Regulations/Policy
      'regulation', 'legislation', 'bill', 'law', 'policy',
      'guidelines', 'framework', 'proposal', 'consultation',
      'ban proposed', 'considering ban', 'may ban', 'could ban',

      // Research/Development
      'research', 'study', 'survey', 'report', 'analysis',
      'development', 'testing facility', 'lab', 'experiment',
      'prototype', 'concept', 'design', 'innovation',

      // Industry/Business
      'conference', 'summit', 'expo', 'exhibition', 'trade show',
      'partnership', 'collaboration', 'agreement', 'contract',
      'delivery service', 'drone delivery', 'commercial use',

      // Future/Planning
      'will be', 'plans to', 'planning', 'scheduled', 'upcoming',
      'next year', 'next month', 'future', 'roadmap',

      // Simulations
      'simulation', 'exercise', 'drill', 'training', 'practice',
      'demonstration', 'demo', 'test', 'trial', 'mock',
      'hypothetical', 'scenario', 'tabletop', 'war game'
    ];

    // SPECIFIC INCIDENT PATTERNS (regex)
    this.incidentPatterns = [
      /drone.{0,20}(spotted|seen|detected|sighted).{0,20}(at|near|over)/i,
      /airport.{0,20}(closed|shut|suspended|halted)/i,
      /flights?.{0,20}(delayed|cancelled|suspended|diverted)/i,
      /(police|military|authorities).{0,20}(responded|called|alerted)/i,
      /airspace.{0,20}(closed|restricted|violation|breach)/i,
      /drone.{0,20}(hit|struck|collided|crashed)/i,
      /unauthorized.{0,20}drone/i,
      /drone.{0,20}incident/i
    ];

    // TEMPORAL VALIDATION - Must be past or present
    this.futureIndicators = [
      'will', 'would', 'could', 'should', 'might', 'may',
      'planning', 'planned', 'scheduled', 'upcoming', 'future',
      'tomorrow', 'next week', 'next month', 'next year',
      'to be held', 'to take place', 'to occur'
    ];

    // EVIDENCE STRENGTH INDICATORS
    this.strongEvidence = [
      'confirmed', 'verified', 'official', 'authorities said',
      'police confirmed', 'military confirmed', 'airport confirmed',
      'statement from', 'according to officials', 'spokesman said'
    ];

    this.weakEvidence = [
      'allegedly', 'reportedly', 'claimed', 'unconfirmed',
      'rumored', 'suspected', 'possible', 'potential',
      'may have', 'could have', 'might have'
    ];
  }

  /**
   * Main validation function
   * @param {Object} article - Article to validate
   * @param {Object} aiAnalysis - Optional AI analysis results
   * @returns {Object} Validation result with confidence score
   */
  validate(article, aiAnalysis = null) {
    const text = `${article.title} ${article.description || ''} ${article.snippet || ''}`.toLowerCase();

    // Step 1: Check for non-incident keywords (STRONG NEGATIVE)
    const nonIncidentCount = this.nonIncidentKeywords.filter(keyword =>
      text.includes(keyword)
    ).length;

    if (nonIncidentCount >= 3) {
      return {
        isValid: false,
        reason: 'Too many non-incident keywords',
        confidence: 90,
        details: { nonIncidentCount }
      };
    }

    // Step 2: Check for incident indicators (MUST HAVE)
    const incidentIndicatorCount = this.incidentIndicators.filter(indicator =>
      text.includes(indicator)
    ).length;

    if (incidentIndicatorCount === 0) {
      // Check patterns as fallback
      const hasPattern = this.incidentPatterns.some(pattern => pattern.test(text));
      if (!hasPattern) {
        return {
          isValid: false,
          reason: 'No incident indicators found',
          confidence: 85,
          details: { incidentIndicatorCount: 0, patternMatch: false }
        };
      }
    }

    // Step 3: Temporal validation (must not be future)
    const futureCount = this.futureIndicators.filter(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(text);
    }).length;

    const pastIndicators = ['yesterday', 'last night', 'earlier', 'ago', 'was', 'were', 'happened', 'occurred'];
    const pastCount = pastIndicators.filter(word => text.includes(word)).length;

    if (futureCount > pastCount + 2) {
      return {
        isValid: false,
        reason: 'Appears to be future event',
        confidence: 80,
        details: { futureCount, pastCount }
      };
    }

    // Step 4: Check specific exclusion patterns
    const exclusionPatterns = [
      /dji.{0,30}(lawsuit|legal|court)/i,
      /company.{0,30}(announces|unveils|launches)/i,
      /new.{0,20}(product|model|drone|technology)/i,
      /regulation.{0,30}(proposed|considered|approved)/i,
      /delivery.{0,20}service/i,
      /drone.{0,20}(manufacturer|company|startup)/i
    ];

    const hasExclusionPattern = exclusionPatterns.some(pattern => pattern.test(text));
    if (hasExclusionPattern && incidentIndicatorCount < 2) {
      return {
        isValid: false,
        reason: 'Matches exclusion pattern without strong incident indicators',
        confidence: 75,
        details: { hasExclusionPattern: true, incidentIndicatorCount }
      };
    }

    // Step 5: Calculate confidence score
    let confidence = 50; // Base confidence

    // Positive factors
    confidence += incidentIndicatorCount * 5; // Each indicator adds 5%
    confidence += this.incidentPatterns.filter(p => p.test(text)).length * 10; // Pattern matches add 10%

    // Evidence strength
    const strongEvidenceCount = this.strongEvidence.filter(e => text.includes(e)).length;
    const weakEvidenceCount = this.weakEvidence.filter(e => text.includes(e)).length;
    confidence += strongEvidenceCount * 8;
    confidence -= weakEvidenceCount * 3;

    // Negative factors
    confidence -= nonIncidentCount * 10;
    confidence -= futureCount * 5;

    // Cap confidence
    confidence = Math.min(95, Math.max(10, confidence));

    // Step 6: AI Analysis integration
    if (aiAnalysis) {
      // If AI says it's not real, heavily weight that
      if (aiAnalysis.classification === 'simulation' ||
          aiAnalysis.classification === 'announcement' ||
          !aiAnalysis.is_real_incident) {
        return {
          isValid: false,
          reason: 'AI classified as non-incident',
          confidence: aiAnalysis.confidence || 85,
          details: { aiClassification: aiAnalysis.classification }
        };
      }

      // Blend AI confidence with our confidence
      if (aiAnalysis.confidence) {
        confidence = (confidence + aiAnalysis.confidence) / 2;
      }
    }

    // Final decision
    const isValid = confidence >= 60 && incidentIndicatorCount > 0;

    return {
      isValid,
      reason: isValid ? 'Valid incident' : 'Insufficient incident indicators',
      confidence,
      details: {
        incidentIndicatorCount,
        nonIncidentCount,
        futureCount,
        strongEvidenceCount,
        weakEvidenceCount,
        hasPattern: this.incidentPatterns.some(p => p.test(text))
      }
    };
  }

  /**
   * Quick pre-filter to eliminate obvious non-incidents
   */
  quickFilter(title) {
    const lowerTitle = title.toLowerCase();

    // Quick reject patterns
    const quickRejects = [
      /dji.*lawsuit/i,
      /drone.*company.*announces/i,
      /new drone.*launched/i,
      /drone delivery/i,
      /drone.*regulation/i,
      /drone.*market/i,
      /drone.*investment/i
    ];

    return !quickRejects.some(pattern => pattern.test(lowerTitle));
  }

  /**
   * Enhanced OpenRouter prompt for validation
   */
  getValidationPrompt(article) {
    return `Analyze if this is a REAL DRONE INCIDENT that happened (not news about drones, companies, or regulations).

REAL INCIDENT criteria:
- An actual drone was physically present at a location
- It caused disruption, was sighted, or created a security concern
- It happened in the past or is currently happening
- It affected operations (airport closure, flight delays, etc.)

NOT an incident:
- Company announcements or product launches
- Legal matters (lawsuits, regulations)
- Future plans or scheduled events
- Drone industry news
- Technology demonstrations
- Training exercises

Article: "${article.title}"
${article.description || ''}

Return JSON:
{
  "is_real_incident": boolean,
  "incident_type": "sighting|disruption|breach|collision|none",
  "confidence": 0-100,
  "reason": "brief explanation"
}`;
  }
}

export default IncidentValidator;
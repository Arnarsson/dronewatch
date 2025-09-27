/**
 * AI-Powered News Analyzer
 * Uses OpenRouter API to intelligently analyze and extract drone incidents
 */

import fetch from 'node-fetch';

export class AIAnalyzer {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.OPENROUTER_API_KEY || '';
    this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';

    // Free models available on OpenRouter
    this.models = {
      fast: 'meta-llama/llama-3.2-3b-instruct:free',
      balanced: 'microsoft/phi-3-mini-128k-instruct:free',
      quality: 'meta-llama/llama-3.1-8b-instruct:free'
    };

    this.currentModel = this.models.fast;
    this.cache = new Map();
    this.cacheTimeout = 3600000; // 1 hour

    // Analysis templates
    this.prompts = {
      incident_extraction: `Analyze this news article for drone incidents. Extract ONLY real incidents (not simulations/exercises).

Return JSON with these fields:
{
  "is_real_incident": boolean,
  "locations": [{"name": string, "type": "airport|harbour|military|city"}],
  "severity": 1-10,
  "incident_type": "sighting|closure|breach|threat|disruption",
  "uav_count": number,
  "duration_minutes": number,
  "response_teams": ["police", "military", etc],
  "key_facts": ["bullet points"],
  "verification_confidence": 0-100
}

Article: {text}`,

      location_extraction: `Extract all specific location names from this text. Focus on:
- Airports (include IATA/ICAO codes if mentioned)
- Harbours/Ports
- Military bases
- Cities/Towns
- Landmarks

Return JSON:
{
  "primary_location": {"name": string, "type": string, "country": string},
  "secondary_locations": [{"name": string, "type": string}],
  "coordinates_mentioned": boolean
}

Text: {text}`,

      threat_assessment: `Assess the security threat level of this drone incident:

Consider:
- Critical infrastructure proximity
- Incident pattern (single vs multiple)
- Response level
- Intent indicators

Return JSON:
{
  "threat_level": "low|medium|high|critical",
  "infrastructure_at_risk": ["list"],
  "pattern_analysis": "description",
  "recommended_response": "description",
  "escalation_probability": 0-100
}

Incident: {text}`,

      verification: `Verify if this is a real drone incident or simulation/exercise/announcement:

Look for:
- Temporal indicators (past/present/future)
- Exercise keywords
- Official confirmation
- Witness reports

Return JSON:
{
  "classification": "real|simulation|announcement|unclear",
  "confidence": 0-100,
  "evidence_for": ["list"],
  "evidence_against": ["list"],
  "temporal_status": "past|ongoing|future|planned"
}

Text: {text}`
    };
  }

  async analyzeArticle(article, options = {}) {
    const cacheKey = this.getCacheKey(article.title + article.description);

    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const prompt = this.prompts.incident_extraction.replace('{text}',
        `Title: ${article.title}\n\nContent: ${article.description || article.content}`
      );

      const analysis = await this.callAI(prompt, options.model || this.currentModel);

      // Parse and validate response
      const result = this.parseAIResponse(analysis);

      // Cache successful analysis
      if (result) {
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
      }

      return result;
    } catch (error) {
      console.error('AI analysis error:', error);
      return this.getFallbackAnalysis(article);
    }
  }

  async extractLocations(text) {
    try {
      const prompt = this.prompts.location_extraction.replace('{text}', text);
      const response = await this.callAI(prompt, this.models.fast);
      return this.parseAIResponse(response);
    } catch (error) {
      console.error('Location extraction error:', error);
      return this.getFallbackLocationExtraction(text);
    }
  }

  async assessThreat(incidentText) {
    try {
      const prompt = this.prompts.threat_assessment.replace('{text}', incidentText);
      const response = await this.callAI(prompt, this.models.balanced);
      return this.parseAIResponse(response);
    } catch (error) {
      console.error('Threat assessment error:', error);
      return this.getFallbackThreatAssessment(incidentText);
    }
  }

  async verifyIncident(text) {
    try {
      const prompt = this.prompts.verification.replace('{text}', text);
      const response = await this.callAI(prompt, this.models.quality);
      return this.parseAIResponse(response);
    } catch (error) {
      console.error('Verification error:', error);
      return this.getFallbackVerification(text);
    }
  }

  async callAI(prompt, model = this.currentModel) {
    if (!this.apiKey) {
      console.warn('No OpenRouter API key configured, using fallback analysis');
      throw new Error('API key not configured');
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://dronewatch.eu',
        'X-Title': 'DroneWatch AI Analyzer'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a drone incident analysis expert. Provide accurate, structured JSON responses. Focus on real incidents, not simulations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  parseAIResponse(response) {
    try {
      // Handle both string and object responses
      if (typeof response === 'string') {
        // Clean up potential markdown formatting
        response = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        return JSON.parse(response);
      }
      return response;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return null;
    }
  }

  // Fallback analysis using pattern matching
  getFallbackAnalysis(article) {
    const text = `${article.title} ${article.description}`.toLowerCase();

    // Check if real incident
    const simulationKeywords = ['exercise', 'drill', 'simulation', 'training', 'test', 'demonstration'];
    const isSimulation = simulationKeywords.some(keyword => text.includes(keyword));

    // Extract severity indicators
    let severity = 3;
    if (text.includes('closed') || text.includes('shutdown')) severity += 3;
    if (text.includes('military') || text.includes('security')) severity += 2;
    if (text.includes('emergency') || text.includes('evacuated')) severity += 2;
    severity = Math.min(10, severity);

    // Determine incident type
    let incidentType = 'sighting';
    if (text.includes('closed') || text.includes('suspended')) incidentType = 'closure';
    if (text.includes('breach') || text.includes('violation')) incidentType = 'breach';
    if (text.includes('threat') || text.includes('hostile')) incidentType = 'threat';
    if (text.includes('disruption') || text.includes('delays')) incidentType = 'disruption';

    // Count UAVs
    let uavCount = 1;
    if (text.includes('multiple') || text.includes('several')) uavCount = 3;
    if (text.includes('swarm')) uavCount = 5;
    const numberMatch = text.match(/(\d+)\s*(drone|uav)/i);
    if (numberMatch) uavCount = parseInt(numberMatch[1]);

    // Extract response teams
    const responseTeams = [];
    if (text.includes('police')) responseTeams.push('police');
    if (text.includes('military')) responseTeams.push('military');
    if (text.includes('air force')) responseTeams.push('air force');
    if (responseTeams.length === 0) responseTeams.push('security');

    return {
      is_real_incident: !isSimulation,
      locations: this.extractLocationsFromText(text),
      severity: severity,
      incident_type: incidentType,
      uav_count: uavCount,
      duration_minutes: 60,
      response_teams: responseTeams,
      key_facts: this.extractKeyFacts(text),
      verification_confidence: isSimulation ? 20 : 70
    };
  }

  getFallbackLocationExtraction(text) {
    const locations = [];
    const locationPatterns = [
      { pattern: /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+[Aa]irport/g, type: 'airport' },
      { pattern: /[Pp]ort\s+of\s+([A-Z][a-z]+)/g, type: 'harbour' },
      { pattern: /([A-Z]{3,4})\s+airport/gi, type: 'airport' },
      { pattern: /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+[Hh]arbou?r/g, type: 'harbour' }
    ];

    locationPatterns.forEach(({ pattern, type }) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        locations.push({
          name: match[1],
          type: type
        });
      }
    });

    // Extract countries
    const countries = ['Denmark', 'Sweden', 'Norway', 'Germany', 'France', 'UK', 'Netherlands', 'Belgium'];
    const country = countries.find(c => text.includes(c));

    return {
      primary_location: locations[0] || { name: 'Unknown', type: 'unknown', country: country || 'Unknown' },
      secondary_locations: locations.slice(1),
      coordinates_mentioned: /\d+\.\d+[,\s]+\d+\.\d+/.test(text)
    };
  }

  getFallbackThreatAssessment(text) {
    const lowerText = text.toLowerCase();
    let threatLevel = 'low';

    if (lowerText.includes('military') || lowerText.includes('nuclear')) {
      threatLevel = 'critical';
    } else if (lowerText.includes('airport') && lowerText.includes('closed')) {
      threatLevel = 'high';
    } else if (lowerText.includes('multiple') || lowerText.includes('breach')) {
      threatLevel = 'medium';
    }

    const infrastructure = [];
    if (lowerText.includes('airport')) infrastructure.push('airport');
    if (lowerText.includes('harbour') || lowerText.includes('port')) infrastructure.push('harbour');
    if (lowerText.includes('military')) infrastructure.push('military base');
    if (lowerText.includes('nuclear')) infrastructure.push('nuclear facility');

    return {
      threat_level: threatLevel,
      infrastructure_at_risk: infrastructure,
      pattern_analysis: 'Standard incident pattern detected',
      recommended_response: threatLevel === 'critical' ? 'Immediate military response' : 'Standard security protocol',
      escalation_probability: threatLevel === 'critical' ? 75 : 25
    };
  }

  getFallbackVerification(text) {
    const lowerText = text.toLowerCase();

    // Check for simulation indicators
    const simulationWords = ['exercise', 'drill', 'simulation', 'training', 'planned', 'scheduled', 'will be', 'upcoming'];
    const isSimulation = simulationWords.some(word => lowerText.includes(word));

    // Check for real incident indicators
    const realWords = ['reported', 'spotted', 'detected', 'caused', 'forced', 'closed', 'investigated'];
    const isReal = realWords.some(word => lowerText.includes(word));

    let classification = 'unclear';
    let confidence = 50;

    if (isSimulation && !isReal) {
      classification = 'simulation';
      confidence = 80;
    } else if (isReal && !isSimulation) {
      classification = 'real';
      confidence = 75;
    }

    return {
      classification: classification,
      confidence: confidence,
      evidence_for: isReal ? ['Past tense used', 'Action verbs present'] : [],
      evidence_against: isSimulation ? ['Exercise keywords found'] : [],
      temporal_status: lowerText.includes('ongoing') ? 'ongoing' : 'past'
    };
  }

  extractLocationsFromText(text) {
    const locations = [];

    // Common European locations
    const knownLocations = [
      { name: 'Copenhagen', type: 'city' },
      { name: 'Hamburg', type: 'city' },
      { name: 'Frankfurt', type: 'city' },
      { name: 'Amsterdam', type: 'city' },
      { name: 'Brussels', type: 'city' },
      { name: 'Paris', type: 'city' },
      { name: 'Berlin', type: 'city' },
      { name: 'London', type: 'city' }
    ];

    knownLocations.forEach(location => {
      if (text.toLowerCase().includes(location.name.toLowerCase())) {
        locations.push(location);
      }
    });

    return locations.length > 0 ? locations : [{ name: 'Unknown', type: 'unknown' }];
  }

  extractKeyFacts(text) {
    const facts = [];
    const sentences = text.split(/[.!?]/);

    sentences.forEach(sentence => {
      const lower = sentence.toLowerCase();
      if (lower.includes('drone') || lower.includes('uav') ||
          lower.includes('closed') || lower.includes('airport')) {
        const cleaned = sentence.trim();
        if (cleaned.length > 10 && cleaned.length < 200) {
          facts.push(cleaned);
        }
      }
    });

    return facts.slice(0, 5);
  }

  getCacheKey(text) {
    // Simple hash for cache key
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'ai_' + Math.abs(hash).toString(36);
  }

  async batchAnalyze(articles, options = {}) {
    console.log(`🤖 AI analyzing ${articles.length} articles...`);
    const results = [];

    // Process in batches to avoid rate limiting
    const batchSize = options.batchSize || 5;
    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);
      const batchPromises = batch.map(article => this.analyzeArticle(article, options));

      try {
        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            results.push({
              article: batch[index],
              analysis: result.value
            });
          }
        });
      } catch (error) {
        console.error('Batch analysis error:', error);
      }

      // Rate limiting delay
      if (i + batchSize < articles.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  // Enhanced incident creation with AI analysis
  async createEnhancedIncident(article, baseIncident, sourceInfo) {
    const analysis = await this.analyzeArticle(article);

    if (!analysis || !analysis.is_real_incident) {
      return null;
    }

    // Enhance base incident with AI analysis
    const enhanced = {
      ...baseIncident,
      incident: {
        ...baseIncident.incident,
        category: analysis.incident_type,
        uav_count: analysis.uav_count,
        duration_min: analysis.duration_minutes,
        response: analysis.response_teams,
        ai_verified: true
      },
      scores: {
        ...baseIncident.scores,
        severity: analysis.severity,
        ai_confidence: analysis.verification_confidence
      },
      evidence: {
        ...baseIncident.evidence,
        ai_analysis: {
          key_facts: analysis.key_facts,
          locations: analysis.locations,
          confidence: analysis.verification_confidence,
          model: this.currentModel,
          analyzed_at: new Date().toISOString()
        }
      },
      tags: [
        ...baseIncident.tags,
        'ai-verified',
        `confidence-${Math.floor(analysis.verification_confidence / 20) * 20}`
      ]
    };

    // Add threat assessment if high severity
    if (analysis.severity >= 7) {
      const threat = await this.assessThreat(article.title + ' ' + article.description);
      enhanced.threat_assessment = threat;
    }

    return enhanced;
  }

  // Get API usage stats
  getStats() {
    return {
      cacheSize: this.cache.size,
      apiKeyConfigured: !!this.apiKey,
      currentModel: this.currentModel,
      availableModels: Object.keys(this.models)
    };
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    console.log('🧹 AI analysis cache cleared');
  }
}
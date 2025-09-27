/**
 * Alert Service for DroneWatch
 * Manages critical incident alerts and notifications
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class AlertService {
  constructor(config = {}) {
    this.config = {
      severityThreshold: config.severityThreshold || 7, // Alert on severity >= 7
      criticalAssets: config.criticalAssets || [],
      notificationChannels: config.channels || {
        webhook: process.env.ALERT_WEBHOOK_URL || null,
        email: process.env.ALERT_EMAIL || null,
        sms: process.env.ALERT_SMS || null,
        websocket: true // Always use WebSocket for real-time alerts
      },
      alertCooldown: config.cooldown || 300000, // 5 minutes between same alerts
      batchAlerts: config.batch || true,
      maxAlertsPerHour: config.maxPerHour || 20
    };

    // Alert tracking
    this.activeAlerts = new Map();
    this.alertHistory = [];
    this.lastAlertTime = new Map();
    this.alertsThisHour = 0;
    this.hourResetTime = Date.now() + 3600000;

    // Critical infrastructure patterns
    this.criticalPatterns = [
      // Major airports
      { pattern: /heathrow|gatwick|charles de gaulle|schiphol|frankfurt|munich/i, multiplier: 1.5 },
      { pattern: /copenhagen|kastrup|arlanda|oslo|helsinki/i, multiplier: 1.3 },

      // Military/Government
      { pattern: /military|defense|defence|nato|air force|navy|army/i, multiplier: 1.8 },
      { pattern: /government|parliament|embassy|ministry/i, multiplier: 1.5 },

      // Critical infrastructure
      { pattern: /nuclear|power plant|energy|lng terminal|refinery/i, multiplier: 2.0 },
      { pattern: /port|harbour|harbor|maritime|vessel|ship/i, multiplier: 1.2 }
    ];

    // Alert templates
    this.alertTemplates = {
      critical: {
        emoji: '🚨',
        prefix: 'CRITICAL ALERT',
        color: '#FF0000',
        priority: 'critical'
      },
      high: {
        emoji: '⚠️',
        prefix: 'HIGH PRIORITY',
        color: '#FF9900',
        priority: 'high'
      },
      medium: {
        emoji: '📢',
        prefix: 'ALERT',
        color: '#FFCC00',
        priority: 'medium'
      }
    };

    // WebSocket service reference (will be set by server)
    this.wsService = null;
  }

  async initialize() {
    console.log('🚨 Initializing Alert Service...');

    // Load alert history
    await this.loadAlertHistory();

    // Setup hourly reset
    setInterval(() => this.resetHourlyLimit(), 3600000);

    console.log('✅ Alert Service initialized');
    console.log(`  🎯 Severity threshold: ${this.config.severityThreshold}`);
    console.log(`  📡 Active channels: ${Object.keys(this.config.notificationChannels).filter(k => this.config.notificationChannels[k]).join(', ')}`);

    return true;
  }

  async evaluateIncident(incident) {
    // Check if incident requires alerting
    const alertScore = this.calculateAlertScore(incident);

    if (alertScore.shouldAlert) {
      // Check cooldown
      if (!this.checkCooldown(incident)) {
        return null;
      }

      // Check hourly limit
      if (this.alertsThisHour >= this.config.maxAlertsPerHour) {
        console.log('⚠️ Hourly alert limit reached');
        return null;
      }

      // Create alert
      const alert = this.createAlert(incident, alertScore);

      // Send alert
      await this.sendAlert(alert);

      return alert;
    }

    return null;
  }

  calculateAlertScore(incident) {
    let baseScore = incident.scores?.severity || 5;
    let multiplier = 1.0;
    let reasons = [];

    // Check against critical patterns
    const narrative = (incident.incident?.narrative || '').toLowerCase();
    const assetName = (incident.asset?.name || '').toLowerCase();
    const combinedText = `${narrative} ${assetName}`;

    for (const pattern of this.criticalPatterns) {
      if (pattern.pattern.test(combinedText)) {
        multiplier = Math.max(multiplier, pattern.multiplier);
        reasons.push(`Critical infrastructure match: ${pattern.pattern.source}`);
      }
    }

    // Authority source bonus
    if (incident.source_type === 'twitter' && incident.evidence?.sources?.[0]?.authority) {
      multiplier *= 1.2;
      reasons.push('Authority source');
    }

    // AI verification bonus
    if (incident.incident?.ai_verified && incident.incident?.ai_confidence > 80) {
      multiplier *= 1.1;
      reasons.push('AI verified with high confidence');
    }

    // Multiple sources bonus
    if (incident.evidence?.sources?.length > 1) {
      multiplier *= 1.1;
      reasons.push('Multiple sources');
    }

    // Active status bonus
    if (incident.incident?.status === 'active') {
      multiplier *= 1.1;
      reasons.push('Currently active');
    }

    const finalScore = baseScore * multiplier;
    const shouldAlert = finalScore >= this.config.severityThreshold;

    return {
      baseScore,
      multiplier,
      finalScore,
      shouldAlert,
      reasons,
      priority: this.getPriority(finalScore)
    };
  }

  getPriority(score) {
    if (score >= 9) return 'critical';
    if (score >= 7) return 'high';
    if (score >= 5) return 'medium';
    return 'low';
  }

  checkCooldown(incident) {
    const key = `${incident.asset?.name}-${incident.incident?.category}`;
    const lastAlert = this.lastAlertTime.get(key);

    if (lastAlert && Date.now() - lastAlert < this.config.alertCooldown) {
      return false;
    }

    return true;
  }

  createAlert(incident, alertScore) {
    const priority = alertScore.priority;
    const template = this.alertTemplates[priority] || this.alertTemplates.medium;

    const alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      priority: priority,
      score: alertScore.finalScore,
      incident_id: incident.id,
      asset: {
        name: incident.asset?.name,
        type: incident.asset?.type,
        location: {
          lat: incident.asset?.lat,
          lon: incident.asset?.lon
        }
      },
      incident: {
        category: incident.incident?.category,
        status: incident.incident?.status,
        narrative: incident.incident?.narrative,
        duration: incident.incident?.duration_min
      },
      reasons: alertScore.reasons,
      template: template,
      message: this.formatAlertMessage(incident, template),
      channels: [],
      status: 'pending'
    };

    // Track alert
    this.activeAlerts.set(alert.id, alert);
    this.alertHistory.push(alert);
    this.alertsThisHour++;

    // Update cooldown
    const cooldownKey = `${incident.asset?.name}-${incident.incident?.category}`;
    this.lastAlertTime.set(cooldownKey, Date.now());

    return alert;
  }

  formatAlertMessage(incident, template) {
    const location = incident.asset?.name || 'Unknown Location';
    const category = incident.incident?.category || 'incident';
    const severity = Math.round(incident.scores?.severity || 5);

    const message = `${template.emoji} ${template.prefix}: Drone ${category} at ${location}

📍 Location: ${location}
⚠️ Severity: ${severity}/10
📝 Category: ${category}
⏰ Time: ${new Date(incident.first_seen_utc).toLocaleString()}
🔄 Status: ${incident.incident?.status || 'unknown'}

${incident.incident?.narrative || 'No details available'}

🔗 Incident ID: ${incident.id}`;

    return message;
  }

  async sendAlert(alert) {
    const results = [];

    try {
      // WebSocket broadcast (always)
      if (this.wsService) {
        this.wsService.broadcastAlert(alert);
        results.push('websocket');
        alert.channels.push('websocket');
      }

      // Webhook notification
      if (this.config.notificationChannels.webhook) {
        const webhookResult = await this.sendWebhook(alert);
        if (webhookResult) {
          results.push('webhook');
          alert.channels.push('webhook');
        }
      }

      // Email notification (would need email service)
      if (this.config.notificationChannels.email) {
        // const emailResult = await this.sendEmail(alert);
        console.log(`📧 Email alert would be sent to: ${this.config.notificationChannels.email}`);
        results.push('email');
        alert.channels.push('email');
      }

      // SMS notification (would need SMS service)
      if (this.config.notificationChannels.sms) {
        // const smsResult = await this.sendSMS(alert);
        console.log(`📱 SMS alert would be sent to: ${this.config.notificationChannels.sms}`);
        results.push('sms');
        alert.channels.push('sms');
      }

      alert.status = 'sent';
      console.log(`${alert.template.emoji} Alert sent via: ${results.join(', ')}`);

    } catch (error) {
      console.error('❌ Alert sending error:', error);
      alert.status = 'failed';
      alert.error = error.message;
    }

    return results;
  }

  async sendWebhook(alert) {
    if (!this.config.notificationChannels.webhook) return false;

    try {
      const payload = {
        text: alert.message,
        alert: alert,
        timestamp: alert.timestamp,
        priority: alert.priority
      };

      const response = await fetch(this.config.notificationChannels.webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      return response.ok;
    } catch (error) {
      console.error('Webhook error:', error);
      return false;
    }
  }

  async evaluateBatch(incidents) {
    console.log(`🔍 Evaluating ${incidents.length} incidents for alerts...`);
    const alerts = [];

    for (const incident of incidents) {
      const alert = await this.evaluateIncident(incident);
      if (alert) {
        alerts.push(alert);
      }
    }

    if (alerts.length > 0) {
      console.log(`🚨 Generated ${alerts.length} alerts`);
    }

    return alerts;
  }

  resetHourlyLimit() {
    this.alertsThisHour = 0;
    this.hourResetTime = Date.now() + 3600000;
    console.log('📊 Hourly alert limit reset');
  }

  async loadAlertHistory() {
    try {
      const historyFile = path.join(__dirname, '..', 'data', 'alert-history.json');
      const data = await fs.readFile(historyFile, 'utf8');
      this.alertHistory = JSON.parse(data);
      console.log(`  📚 Loaded ${this.alertHistory.length} historical alerts`);
    } catch {
      console.log('  📚 No alert history found');
    }
  }

  async saveAlertHistory() {
    try {
      const historyFile = path.join(__dirname, '..', 'data', 'alert-history.json');
      await fs.mkdir(path.dirname(historyFile), { recursive: true });

      // Keep only last 1000 alerts
      const recentAlerts = this.alertHistory.slice(-1000);

      await fs.writeFile(
        historyFile,
        JSON.stringify(recentAlerts, null, 2)
      );
    } catch (error) {
      console.error('Failed to save alert history:', error);
    }
  }

  getActiveAlerts() {
    return Array.from(this.activeAlerts.values());
  }

  getAlertStats() {
    const now = Date.now();
    const hourAgo = now - 3600000;
    const dayAgo = now - 86400000;

    const alertsLastHour = this.alertHistory.filter(a =>
      new Date(a.timestamp).getTime() > hourAgo
    ).length;

    const alertsLastDay = this.alertHistory.filter(a =>
      new Date(a.timestamp).getTime() > dayAgo
    ).length;

    const byPriority = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    this.alertHistory.forEach(alert => {
      byPriority[alert.priority] = (byPriority[alert.priority] || 0) + 1;
    });

    return {
      active: this.activeAlerts.size,
      thisHour: this.alertsThisHour,
      lastHour: alertsLastHour,
      lastDay: alertsLastDay,
      total: this.alertHistory.length,
      byPriority,
      limitRemaining: this.config.maxAlertsPerHour - this.alertsThisHour,
      resetIn: Math.round((this.hourResetTime - now) / 60000) + ' minutes'
    };
  }

  clearAlert(alertId) {
    if (this.activeAlerts.has(alertId)) {
      const alert = this.activeAlerts.get(alertId);
      alert.status = 'cleared';
      alert.clearedAt = new Date().toISOString();
      this.activeAlerts.delete(alertId);
      return true;
    }
    return false;
  }

  setWebSocketService(wsService) {
    this.wsService = wsService;
    console.log('📡 Alert Service connected to WebSocket');
  }
}

export default AlertService;
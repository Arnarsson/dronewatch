// Incident Details Module for DroneWatch Public Interface
// Provides detailed view of incidents with full narratives and context

class IncidentDetailsPanel {
  constructor() {
    this.panel = null;
    this.currentIncident = null;
    this.initPanel();
  }

  initPanel() {
    // Create the detail panel HTML
    const panelHTML = `
      <div id="incidentDetailPanel" class="incident-detail-panel hidden">
        <div class="detail-panel-overlay" onclick="incidentDetails.close()"></div>
        <div class="detail-panel-content">
          <div class="detail-panel-header">
            <button class="detail-close-btn" onclick="incidentDetails.close()">✕</button>
            <div class="detail-header-badges">
              <span id="detailVerificationBadge" class="detail-badge"></span>
              <span id="detailAiBadge" class="detail-badge ai-badge hidden">🤖 AI Discovered</span>
            </div>
          </div>

          <div class="detail-panel-body">
            <!-- Location & Time -->
            <div class="detail-section">
              <h2 id="detailTitle" class="detail-title"></h2>
              <div class="detail-meta">
                <span id="detailLocation" class="meta-item"></span>
                <span id="detailTime" class="meta-item"></span>
              </div>
            </div>

            <!-- Main Narrative -->
            <div class="detail-section">
              <h3 class="section-heading">What Happened</h3>
              <div id="detailNarrative" class="detail-narrative"></div>
            </div>

            <!-- Impact Assessment -->
            <div class="detail-section">
              <h3 class="section-heading">Impact Assessment</h3>
              <div class="impact-grid">
                <div class="impact-item">
                  <span class="impact-label">Severity</span>
                  <div id="detailSeverity" class="impact-value"></div>
                </div>
                <div class="impact-item">
                  <span class="impact-label">Duration</span>
                  <div id="detailDuration" class="impact-value"></div>
                </div>
                <div class="impact-item">
                  <span class="impact-label">Status</span>
                  <div id="detailStatus" class="impact-value"></div>
                </div>
                <div class="impact-item">
                  <span class="impact-label">Category</span>
                  <div id="detailCategory" class="impact-value"></div>
                </div>
              </div>
            </div>

            <!-- Sources & Evidence -->
            <div class="detail-section">
              <h3 class="section-heading">Sources & Verification</h3>
              <div id="detailSources" class="sources-list"></div>
              <div id="detailEvidence" class="evidence-info"></div>
            </div>

            <!-- Context & Related -->
            <div class="detail-section">
              <h3 class="section-heading">Context</h3>
              <div id="detailContext" class="detail-context"></div>
            </div>

            <!-- AI Analysis (if applicable) -->
            <div id="aiAnalysisSection" class="detail-section hidden">
              <h3 class="section-heading">AI Analysis</h3>
              <div class="ai-analysis-box">
                <div class="ai-confidence">
                  <span>AI Confidence:</span>
                  <span id="detailAiConfidence" class="confidence-score"></span>
                </div>
                <div id="detailAiSummary" class="ai-summary"></div>
                <div id="detailAiSources" class="ai-sources"></div>
              </div>
            </div>

            <!-- Actions -->
            <div class="detail-actions">
              <button class="action-btn primary" onclick="incidentDetails.share()">
                <span>📤</span>
                <span>Share Incident</span>
              </button>
              <button class="action-btn secondary" onclick="incidentDetails.viewOnMap()">
                <span>🗺️</span>
                <span>View on Map</span>
              </button>
              <button class="action-btn secondary" onclick="incidentDetails.exportData()">
                <span>📊</span>
                <span>Export Data</span>
              </button>
            </div>

            <!-- Related Incidents -->
            <div class="detail-section">
              <h3 class="section-heading">Related Incidents</h3>
              <div id="relatedIncidents" class="related-grid"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add styles
    const styles = `
      <style>
        .incident-detail-panel {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 3000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .detail-panel-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
        }

        .detail-panel-content {
          position: relative;
          background: var(--glass-heavy);
          backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-xl);
          max-width: 800px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        .detail-panel-header {
          position: sticky;
          top: 0;
          background: var(--glass-heavy);
          backdrop-filter: blur(20px);
          padding: 1.5rem;
          border-bottom: 1px solid var(--glass-border);
          z-index: 10;
        }

        .detail-close-btn {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: var(--glass-light);
          border: 1px solid var(--glass-border);
          color: var(--text-primary);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .detail-close-btn:hover {
          background: var(--primary);
          border-color: var(--primary);
        }

        .detail-header-badges {
          display: flex;
          gap: 0.5rem;
          margin-right: 3rem;
        }

        .detail-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.375rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .detail-badge.verified {
          background: var(--verified);
          color: white;
        }

        .detail-badge.unverified {
          background: var(--unverified);
          color: white;
        }

        .detail-badge.ai-badge {
          background: var(--ai-gradient);
          color: white;
        }

        .detail-panel-body {
          padding: 1.5rem;
        }

        .detail-section {
          margin-bottom: 2rem;
        }

        .detail-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.75rem;
          line-height: 1.3;
        }

        .detail-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          color: var(--text-muted);
          font-size: 0.875rem;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .section-heading {
          font-size: 1rem;
          font-weight: 600;
          color: var(--primary);
          margin-bottom: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .detail-narrative {
          color: var(--text-secondary);
          line-height: 1.8;
          font-size: 1rem;
        }

        .impact-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }

        .impact-item {
          background: var(--glass-light);
          padding: 1rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--glass-border);
        }

        .impact-label {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.25rem;
        }

        .impact-value {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .sources-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .source-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: var(--glass-light);
          border-radius: var(--radius-md);
          border: 1px solid var(--glass-border);
        }

        .source-link {
          color: var(--primary);
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          transition: color 0.2s;
        }

        .source-link:hover {
          color: var(--primary-light);
          text-decoration: underline;
        }

        .evidence-info {
          margin-top: 1rem;
          padding: 0.75rem;
          background: var(--glass-light);
          border-radius: var(--radius-md);
          border: 1px solid var(--glass-border);
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .ai-analysis-box {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1));
          padding: 1rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--ai-accent);
        }

        .ai-confidence {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .confidence-score {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--ai-accent);
        }

        .detail-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          padding: 1.5rem 0;
          border-top: 1px solid var(--glass-border);
          border-bottom: 1px solid var(--glass-border);
          margin-bottom: 2rem;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid;
        }

        .action-btn.primary {
          background: var(--primary);
          border-color: var(--primary);
          color: white;
        }

        .action-btn.secondary {
          background: transparent;
          border-color: var(--glass-border);
          color: var(--text-primary);
        }

        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .related-grid {
          display: grid;
          gap: 0.75rem;
        }

        .related-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem;
          background: var(--glass-light);
          border-radius: var(--radius-md);
          border: 1px solid var(--glass-border);
          cursor: pointer;
          transition: all 0.2s;
        }

        .related-item:hover {
          background: var(--glass-medium);
          border-color: var(--primary);
        }

        @media (max-width: 768px) {
          .detail-panel-content {
            max-height: 100vh;
            border-radius: 0;
          }

          .impact-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .detail-title {
            font-size: 1.5rem;
          }
        }
      </style>
    `;

    // Add to document
    document.head.insertAdjacentHTML('beforeend', styles);
    document.body.insertAdjacentHTML('beforeend', panelHTML);
    this.panel = document.getElementById('incidentDetailPanel');
  }

  open(incident) {
    this.currentIncident = incident;
    this.populateDetails(incident);
    this.panel.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.panel.classList.add('hidden');
    document.body.style.overflow = '';
    this.currentIncident = null;
  }

  populateDetails(incident) {
    // Title and location
    document.getElementById('detailTitle').textContent =
      incident.asset?.name || 'Drone Incident';

    document.getElementById('detailLocation').innerHTML =
      `📍 ${incident.asset?.type || 'Location'} • ${incident.asset?.iata || ''}`;

    // Time
    const time = new Date(incident.first_seen_utc);
    document.getElementById('detailTime').innerHTML =
      `⏰ ${this.formatDateTime(time)}`;

    // Verification badge
    const verificationBadge = document.getElementById('detailVerificationBadge');
    if (incident.evidence?.strength >= 2) {
      verificationBadge.className = 'detail-badge verified';
      verificationBadge.textContent = '✅ Verified';
    } else {
      verificationBadge.className = 'detail-badge unverified';
      verificationBadge.textContent = '⚠️ Unverified';
    }

    // AI badge
    if (incident.ai_discovered) {
      document.getElementById('detailAiBadge').classList.remove('hidden');
    } else {
      document.getElementById('detailAiBadge').classList.add('hidden');
    }

    // Narrative
    document.getElementById('detailNarrative').textContent =
      incident.incident?.narrative || 'Details about this drone incident are being gathered.';

    // Impact Assessment
    const severity = incident.scores?.severity || 5;
    document.getElementById('detailSeverity').innerHTML =
      this.getSeverityDisplay(severity);

    document.getElementById('detailDuration').textContent =
      incident.incident?.duration_min ? `${incident.incident.duration_min} minutes` : 'Unknown';

    document.getElementById('detailStatus').innerHTML =
      this.getStatusDisplay(incident.incident?.status);

    document.getElementById('detailCategory').textContent =
      this.formatCategory(incident.incident?.category);

    // Sources
    this.populateSources(incident);

    // Evidence
    this.populateEvidence(incident);

    // Context
    this.populateContext(incident);

    // AI Analysis (if applicable)
    if (incident.ai_analysis) {
      this.populateAiAnalysis(incident.ai_analysis);
    }

    // Related incidents
    this.loadRelatedIncidents(incident);
  }

  populateSources(incident) {
    const sourcesContainer = document.getElementById('detailSources');
    const sources = incident.evidence?.sources || [];

    if (sources.length > 0) {
      sourcesContainer.innerHTML = sources.map(source => `
        <div class="source-item">
          <span>📰</span>
          <div style="flex: 1;">
            <a href="${source.url}" target="_blank" class="source-link">
              ${source.name}
              <span>→</span>
            </a>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
              ${this.formatDateTime(new Date(source.timestamp))}
            </div>
          </div>
        </div>
      `).join('');
    } else {
      sourcesContainer.innerHTML = '<p style="color: var(--text-muted);">Source information not available</p>';
    }
  }

  populateEvidence(incident) {
    const evidenceContainer = document.getElementById('detailEvidence');
    const strength = incident.evidence?.strength || 0;
    const attribution = incident.evidence?.attribution || 'unknown';

    evidenceContainer.innerHTML = `
      <strong>Evidence Strength:</strong> ${this.getEvidenceDisplay(strength)}<br>
      <strong>Attribution:</strong> ${this.formatAttribution(attribution)}
    `;
  }

  populateContext(incident) {
    const contextContainer = document.getElementById('detailContext');

    // Generate context based on incident type and location
    let context = '';

    if (incident.asset?.type === 'airport') {
      context = `This incident occurred at ${incident.asset.name}, a major aviation hub in Europe.
                 Drone incidents near airports can cause significant disruptions to air travel,
                 requiring temporary closures of airspace for safety reasons.`;
    } else if (incident.asset?.type === 'harbour') {
      context = `This incident took place at ${incident.asset.name}, an important maritime facility.
                 Unauthorized drone activity near ports can interfere with shipping operations
                 and raise security concerns.`;
    } else {
      context = `This drone incident highlights the increasing frequency of unauthorized drone
                 activity in European airspace and the challenges it poses for aviation safety.`;
    }

    contextContainer.innerHTML = `<p>${context}</p>`;
  }

  populateAiAnalysis(analysis) {
    const aiSection = document.getElementById('aiAnalysisSection');
    aiSection.classList.remove('hidden');

    document.getElementById('detailAiConfidence').textContent = `${analysis.confidence}%`;
    document.getElementById('detailAiSummary').textContent = analysis.summary;

    if (analysis.sources) {
      document.getElementById('detailAiSources').innerHTML = `
        <div style="margin-top: 0.75rem; font-size: 0.875rem;">
          <strong>AI analyzed ${analysis.sources.length} sources</strong> in ${analysis.processing_time}
        </div>
      `;
    }
  }

  loadRelatedIncidents(incident) {
    // Find related incidents (same location or nearby)
    const related = window.incidents?.filter(i =>
      i.id !== incident.id &&
      (i.asset?.name === incident.asset?.name ||
       (Math.abs(i.asset?.lat - incident.asset?.lat) < 0.5 &&
        Math.abs(i.asset?.lon - incident.asset?.lon) < 0.5))
    ).slice(0, 3);

    const container = document.getElementById('relatedIncidents');

    if (related && related.length > 0) {
      container.innerHTML = related.map(i => `
        <div class="related-item" onclick="viewDetails('${i.id}')">
          <div style="flex: 1;">
            <div style="font-weight: 500; margin-bottom: 0.25rem;">
              ${i.asset?.name || 'Unknown Location'}
            </div>
            <div style="font-size: 0.875rem; color: var(--text-muted);">
              ${this.getTimeAgo(new Date(i.first_seen_utc))}
            </div>
          </div>
          <span style="color: var(--text-muted);">→</span>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<p style="color: var(--text-muted);">No related incidents found</p>';
    }
  }

  // Utility functions
  formatDateTime(date) {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  getTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
  }

  getSeverityDisplay(severity) {
    if (severity >= 7) {
      return '<span style="color: var(--high-impact);">High (7-10)</span>';
    } else if (severity >= 4) {
      return '<span style="color: var(--medium-impact);">Medium (4-6)</span>';
    } else {
      return '<span style="color: var(--low-impact);">Low (1-3)</span>';
    }
  }

  getStatusDisplay(status) {
    const statusMap = {
      'active': '<span style="color: var(--high-impact);">● Active</span>',
      'resolved': '<span style="color: var(--verified);">● Resolved</span>',
      'unconfirmed': '<span style="color: var(--unverified);">● Unconfirmed</span>'
    };
    return statusMap[status] || '<span style="color: var(--text-muted);">Unknown</span>';
  }

  getEvidenceDisplay(strength) {
    const levels = ['Unconfirmed', 'Low', 'Medium', 'High'];
    return levels[Math.min(strength, 3)] || 'Unknown';
  }

  formatCategory(category) {
    if (!category) return 'General incident';
    return category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
  }

  formatAttribution(attribution) {
    if (!attribution) return 'Not specified';
    return attribution.charAt(0).toUpperCase() + attribution.slice(1);
  }

  // Action methods
  share() {
    if (this.currentIncident) {
      const text = `Drone incident at ${this.currentIncident.asset?.name}: ${this.currentIncident.incident?.narrative || 'Details pending'}`;

      if (navigator.share) {
        navigator.share({
          title: 'DroneWatch Incident',
          text: text,
          url: `${window.location.origin}${window.location.pathname}#incident=${this.currentIncident.id}`
        });
      } else {
        navigator.clipboard.writeText(`${text}\n\n${window.location.href}`);
        alert('Incident details copied to clipboard!');
      }
    }
  }

  viewOnMap() {
    if (this.currentIncident && window.map) {
      this.close();
      const lat = this.currentIncident.asset?.lat;
      const lon = this.currentIncident.asset?.lon;
      if (lat && lon) {
        window.map.setView([lat, lon], 12);
      }
    }
  }

  exportData() {
    if (this.currentIncident) {
      const dataStr = JSON.stringify(this.currentIncident, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `incident-${this.currentIncident.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }
}

// Initialize the incident details panel
const incidentDetails = new IncidentDetailsPanel();

// Make viewDetails function available globally
window.viewDetails = function(incidentId) {
  const incident = window.incidents?.find(i => i.id === incidentId);
  if (incident) {
    incidentDetails.open(incident);
  }
};
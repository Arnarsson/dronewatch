/**
 * DroneWatch Crowdsourced Verification System
 * Allows users to verify or dispute incident reports
 */

class VerificationSystem {
  constructor() {
    this.verificationData = this.loadVerificationData();
    this.userVotes = this.loadUserVotes();
    this.initializeEventListeners();
  }

  // Load verification data from localStorage
  loadVerificationData() {
    const stored = localStorage.getItem('dronewatch-verifications');
    return stored ? JSON.parse(stored) : {};
  }

  // Load user's voting history
  loadUserVotes() {
    const stored = localStorage.getItem('dronewatch-user-votes');
    return stored ? JSON.parse(stored) : {};
  }

  // Save verification data
  saveVerificationData() {
    localStorage.setItem('dronewatch-verifications', JSON.stringify(this.verificationData));
  }

  // Save user votes
  saveUserVotes() {
    localStorage.setItem('dronewatch-user-votes', JSON.stringify(this.userVotes));
  }

  // Initialize verification for an incident
  getVerificationStatus(incidentId) {
    if (!this.verificationData[incidentId]) {
      this.verificationData[incidentId] = {
        verifyCount: 0,
        disputeCount: 0,
        reports: [],
        lastUpdated: null
      };
    }
    return this.verificationData[incidentId];
  }

  // Calculate community confidence score
  calculateConfidence(incidentId) {
    const status = this.getVerificationStatus(incidentId);
    const total = status.verifyCount + status.disputeCount;

    if (total === 0) return null;

    const confidence = (status.verifyCount / total) * 100;
    return Math.round(confidence);
  }

  // Check if user has already voted
  hasUserVoted(incidentId) {
    return this.userVotes[incidentId] !== undefined;
  }

  // Submit verification
  submitVerification(incidentId, isVerified, details = {}) {
    // Check if user already voted
    if (this.hasUserVoted(incidentId)) {
      return {
        success: false,
        message: 'You have already submitted feedback for this incident'
      };
    }

    const status = this.getVerificationStatus(incidentId);

    if (isVerified) {
      status.verifyCount++;
    } else {
      status.disputeCount++;
    }

    // Add report details
    status.reports.push({
      type: isVerified ? 'verify' : 'dispute',
      timestamp: new Date().toISOString(),
      details: details,
      userId: this.getUserId()
    });

    status.lastUpdated = new Date().toISOString();

    // Record user vote
    this.userVotes[incidentId] = {
      vote: isVerified ? 'verify' : 'dispute',
      timestamp: new Date().toISOString()
    };

    // Save to localStorage
    this.saveVerificationData();
    this.saveUserVotes();

    // In production, this would send to server
    this.syncWithServer(incidentId, status);

    return {
      success: true,
      newConfidence: this.calculateConfidence(incidentId),
      totalVotes: status.verifyCount + status.disputeCount
    };
  }

  // Generate or retrieve user ID
  getUserId() {
    let userId = localStorage.getItem('dronewatch-user-id');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9) + Date.now();
      localStorage.setItem('dronewatch-user-id', userId);
    }
    return userId;
  }

  // Sync with server (placeholder for production)
  async syncWithServer(incidentId, status) {
    // In production, this would POST to an API endpoint
    console.log('Syncing verification data:', { incidentId, status });

    // Simulate server sync
    try {
      // await fetch('/api/verify', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ incidentId, status, userId: this.getUserId() })
      // });
    } catch (error) {
      console.error('Failed to sync verification:', error);
    }
  }

  // Create verification UI for an incident
  createVerificationUI(incidentId) {
    const status = this.getVerificationStatus(incidentId);
    const confidence = this.calculateConfidence(incidentId);
    const hasVoted = this.hasUserVoted(incidentId);
    const userVote = this.userVotes[incidentId];

    const verificationHTML = `
      <div class="verification-widget" data-incident-id="${incidentId}">
        <div class="verification-header">
          <span class="verification-title">
            ${window.DroneWatchTranslations ? window.DroneWatchTranslations.t('communityVerification') : 'Community Verification'}
          </span>
          ${confidence !== null ? `
            <span class="verification-confidence ${confidence >= 70 ? 'high' : confidence >= 40 ? 'medium' : 'low'}">
              ${confidence}% ${window.DroneWatchTranslations ? window.DroneWatchTranslations.t('confidence') : 'confidence'}
            </span>
          ` : '<span class="verification-confidence pending">Pending verification</span>'}
        </div>

        <div class="verification-stats">
          <div class="stat-item verified">
            <span class="stat-icon">✓</span>
            <span class="stat-count">${status.verifyCount}</span>
            <span class="stat-label">${window.DroneWatchTranslations ? window.DroneWatchTranslations.t('verified') : 'Verified'}</span>
          </div>
          <div class="stat-item disputed">
            <span class="stat-icon">✗</span>
            <span class="stat-count">${status.disputeCount}</span>
            <span class="stat-label">${window.DroneWatchTranslations ? window.DroneWatchTranslations.t('disputed') : 'Disputed'}</span>
          </div>
        </div>

        ${!hasVoted ? `
          <div class="verification-actions">
            <button class="verify-btn" onclick="verificationSystem.verify('${incidentId}')">
              <span>✓</span> I can verify this
            </button>
            <button class="dispute-btn" onclick="verificationSystem.dispute('${incidentId}')">
              <span>?</span> Report issue
            </button>
          </div>
        ` : `
          <div class="verification-voted">
            <span class="voted-message">
              ${userVote.vote === 'verify' ? '✓ You verified this incident' : '? You reported an issue'}
            </span>
          </div>
        `}

        ${status.reports.length > 0 ? `
          <div class="verification-reports">
            <details>
              <summary>View ${status.reports.length} community reports</summary>
              <div class="reports-list">
                ${status.reports.slice(-5).map(report => `
                  <div class="report-item">
                    <span class="report-type ${report.type}">${report.type === 'verify' ? '✓' : '?'}</span>
                    <span class="report-time">${this.formatTime(report.timestamp)}</span>
                  </div>
                `).join('')}
              </div>
            </details>
          </div>
        ` : ''}
      </div>
    `;

    return verificationHTML;
  }

  // Verify an incident
  verify(incidentId) {
    const result = this.submitVerification(incidentId, true);

    if (result.success) {
      this.showNotification('Thank you for verifying this incident!', 'success');
      this.updateVerificationUI(incidentId);
    } else {
      this.showNotification(result.message, 'error');
    }
  }

  // Dispute an incident
  dispute(incidentId) {
    // In production, show a modal for detailed feedback
    const reason = prompt('Please describe the issue with this report:');

    if (reason) {
      const result = this.submitVerification(incidentId, false, { reason });

      if (result.success) {
        this.showNotification('Thank you for your feedback!', 'success');
        this.updateVerificationUI(incidentId);
      } else {
        this.showNotification(result.message, 'error');
      }
    }
  }

  // Update UI after voting
  updateVerificationUI(incidentId) {
    const element = document.querySelector(`[data-incident-id="${incidentId}"]`);
    if (element) {
      element.outerHTML = this.createVerificationUI(incidentId);
    }
  }

  // Show notification
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `verification-notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => notification.classList.add('show'), 10);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Format timestamp
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString();
  }

  // Initialize event listeners
  initializeEventListeners() {
    // Make functions available globally
    window.verificationSystem = this;
  }

  // Get verification summary for all incidents
  getVerificationSummary() {
    const summary = {
      totalIncidents: Object.keys(this.verificationData).length,
      totalVotes: 0,
      averageConfidence: 0,
      highConfidenceCount: 0,
      disputedCount: 0
    };

    Object.entries(this.verificationData).forEach(([id, data]) => {
      const totalVotes = data.verifyCount + data.disputeCount;
      summary.totalVotes += totalVotes;

      const confidence = this.calculateConfidence(id);
      if (confidence !== null) {
        summary.averageConfidence += confidence;
        if (confidence >= 70) summary.highConfidenceCount++;
        if (confidence < 40) summary.disputedCount++;
      }
    });

    if (summary.totalIncidents > 0) {
      summary.averageConfidence /= summary.totalIncidents;
    }

    return summary;
  }
}

// Initialize verification system
const verificationSystem = new VerificationSystem();

// Add styles for verification UI
const verificationStyles = `
<style>
.verification-widget {
  background: var(--glass-light, rgba(255, 255, 255, 0.05));
  border-radius: var(--radius-lg, 0.75rem);
  padding: var(--space-md, 1rem);
  margin-top: var(--space-md, 1rem);
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
}

.verification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-sm, 0.5rem);
}

.verification-title {
  font-weight: 600;
  color: var(--text-primary, #f1f5f9);
  font-size: 0.875rem;
}

.verification-confidence {
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.verification-confidence.high {
  background: var(--verified, #10b981);
  color: white;
}

.verification-confidence.medium {
  background: var(--unverified, #f59e0b);
  color: white;
}

.verification-confidence.low {
  background: var(--high-impact, #ef4444);
  color: white;
}

.verification-confidence.pending {
  background: var(--glass-medium, rgba(255, 255, 255, 0.08));
  color: var(--text-secondary, #cbd5e1);
}

.verification-stats {
  display: flex;
  gap: var(--space-md, 1rem);
  margin-bottom: var(--space-sm, 0.5rem);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.stat-icon {
  font-size: 1rem;
}

.stat-item.verified .stat-icon {
  color: var(--verified, #10b981);
}

.stat-item.disputed .stat-icon {
  color: var(--high-impact, #ef4444);
}

.stat-count {
  font-weight: 600;
  color: var(--text-primary, #f1f5f9);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary, #cbd5e1);
}

.verification-actions {
  display: flex;
  gap: var(--space-sm, 0.5rem);
  margin-top: var(--space-sm, 0.5rem);
}

.verify-btn, .dispute-btn {
  flex: 1;
  padding: var(--space-sm, 0.5rem);
  border-radius: var(--radius-md, 0.5rem);
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
  background: var(--glass-light, rgba(255, 255, 255, 0.05));
  color: var(--text-secondary, #cbd5e1);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
}

.verify-btn:hover {
  background: var(--verified, #10b981);
  color: white;
  border-color: var(--verified, #10b981);
}

.dispute-btn:hover {
  background: var(--unverified, #f59e0b);
  color: white;
  border-color: var(--unverified, #f59e0b);
}

.verification-voted {
  text-align: center;
  padding: var(--space-sm, 0.5rem);
  background: var(--glass-light, rgba(255, 255, 255, 0.05));
  border-radius: var(--radius-md, 0.5rem);
  margin-top: var(--space-sm, 0.5rem);
}

.voted-message {
  color: var(--text-secondary, #cbd5e1);
  font-size: 0.875rem;
}

.verification-notification {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 1rem 1.5rem;
  background: var(--glass-heavy, rgba(15, 23, 42, 0.85));
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
  border-radius: var(--radius-lg, 0.75rem);
  color: var(--text-primary, #f1f5f9);
  font-size: 0.875rem;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.3s;
  z-index: 10000;
}

.verification-notification.show {
  opacity: 1;
  transform: translateY(0);
}

.verification-notification.success {
  border-color: var(--verified, #10b981);
  background: rgba(16, 185, 129, 0.1);
}

.verification-notification.error {
  border-color: var(--high-impact, #ef4444);
  background: rgba(239, 68, 68, 0.1);
}

.verification-reports {
  margin-top: var(--space-sm, 0.5rem);
}

.verification-reports summary {
  cursor: pointer;
  color: var(--text-secondary, #cbd5e1);
  font-size: 0.75rem;
}

.reports-list {
  margin-top: var(--space-sm, 0.5rem);
  padding: var(--space-sm, 0.5rem);
  background: var(--glass-light, rgba(255, 255, 255, 0.05));
  border-radius: var(--radius-md, 0.5rem);
}

.report-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm, 0.5rem);
  padding: 0.25rem 0;
  font-size: 0.75rem;
  color: var(--text-secondary, #cbd5e1);
}

.report-type {
  font-weight: 600;
}

.report-type.verify {
  color: var(--verified, #10b981);
}

.report-type.dispute {
  color: var(--unverified, #f59e0b);
}
</style>
`;

// Add styles to document
document.head.insertAdjacentHTML('beforeend', verificationStyles);
/**
 * EarlyBird Subscription Pause Detection System
 * Intelligent churn detection with automatic escalation
 * 
 * Features:
 * - Detect pause duration (7+ days, 14+ days)
 * - Churn risk scoring (3+ pauses in 30 days)
 * - Automatic alerts (Support → Churn Flag → Admin Escalation)
 * - Pause history tracking
 * - Intelligent reactivation intelligence
 * 
 * Alert Thresholds:
 * - 7+ days: Alert support buddy
 * - 3+ pauses in 30 days: Flag as churn risk
 * - 14+ days: Escalate to admin
 * 
 * @author EarlyBird Team
 * @version 2.0
 * @date January 2026
 */

class EarlyBirdPauseDetection {
  constructor() {
    this.storageKey = 'EARLYBIRD_PAUSE_DETECTION';
    this.alertsKey = 'EARLYBIRD_PAUSE_ALERTS';
    
    this.state = {
      pauseHistory: {},         // { customerId: [{ pausedAt, resumedAt, duration, reason }] }
      pauseAlerts: [],          // System alerts
      churnRiskCustomers: [],   // Customers flagged as churn risk
      escalatedCases: []        // Cases escalated to admin
    };
    
    this.thresholds = {
      earlyAlert: 7 * 24 * 60 * 60 * 1000,      // 7 days
      churnRiskCount: 3,                         // 3 pauses
      churnRiskWindow: 30 * 24 * 60 * 60 * 1000, // in 30 days
      adminEscalation: 14 * 24 * 60 * 60 * 1000  // 14 days
    };
    
    this.loadState();
  }

  loadState() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        this.state = JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed to load pause detection state:', e);
    }
  }

  saveState() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to save pause detection state:', e);
    }
  }

  /**
   * PAUSE TRACKING
   */

  /**
   * Record subscription pause
   * @param {string} customerId - Customer ID
   * @param {string} subscriptionId - Subscription ID
   * @param {string} reason - Why they paused
   * @returns {object} Pause record
   */
  recordPause(customerId, subscriptionId, reason = '') {
    if (!this.state.pauseHistory[customerId]) {
      this.state.pauseHistory[customerId] = [];
    }

    const pauseRecord = {
      pauseId: this.generateId(),
      customerId,
      subscriptionId,
      pausedAt: new Date().toISOString(),
      resumedAt: null,
      duration: 0,
      reason: reason || 'No reason provided',
      status: 'active' // active or resolved
    };

    this.state.pauseHistory[customerId].push(pauseRecord);
    this.saveState();

    // Trigger pause detection checks
    this.checkPauseAlerts(customerId);

    return pauseRecord;
  }

  /**
   * Record subscription resume
   * @param {string} customerId - Customer ID
   * @param {string} subscriptionId - Subscription ID
   * @returns {object} Updated pause record
   */
  recordResume(customerId, subscriptionId) {
    if (!this.state.pauseHistory[customerId]) {
      return null;
    }

    const pauseRecord = this.state.pauseHistory[customerId].find(
      p => p.subscriptionId === subscriptionId && p.status === 'active'
    );

    if (!pauseRecord) {
      return null;
    }

    const now = new Date();
    pauseRecord.resumedAt = now.toISOString();
    pauseRecord.duration = now.getTime() - new Date(pauseRecord.pausedAt).getTime();
    pauseRecord.status = 'resolved';

    this.saveState();

    return pauseRecord;
  }

  /**
   * ALERT SYSTEM
   */

  /**
   * Check if pause requires alerts
   * @param {string} customerId - Customer ID
   */
  checkPauseAlerts(customerId) {
    const history = this.state.pauseHistory[customerId] || [];
    if (history.length === 0) return;

    const activePause = history.find(p => p.status === 'active');
    if (!activePause) return;

    const pauseDuration = new Date().getTime() - new Date(activePause.pausedAt).getTime();
    const daysPaused = Math.floor(pauseDuration / (24 * 60 * 60 * 1000));

    // Check: 7+ days → Alert Support
    if (pauseDuration >= this.thresholds.earlyAlert && !this.hasAlert(customerId, 'early_alert')) {
      this.createAlert(customerId, 'early_alert', `Subscription paused for ${daysPaused}+ days`, {
        subscriptionId: activePause.subscriptionId,
        daysPaused,
        targetRole: 'support'
      });
    }

    // Check: 3+ pauses in 30 days → Churn Risk Flag
    if (this.isChurnRisk(customerId) && !this.hasChurnFlag(customerId)) {
      this.flagChurnRisk(customerId);
      this.createAlert(customerId, 'churn_risk', 'Customer flagged as churn risk (3+ pauses in 30 days)', {
        pauseCount: this.getPauseCountLast30Days(customerId),
        targetRole: 'support'
      });
    }

    // Check: 14+ days → Escalate to Admin
    if (pauseDuration >= this.thresholds.adminEscalation && !this.hasAlert(customerId, 'admin_escalation')) {
      this.escalateToAdmin(customerId, activePause);
      this.createAlert(customerId, 'admin_escalation', `CRITICAL: Subscription paused for ${daysPaused}+ days - requires intervention`, {
        subscriptionId: activePause.subscriptionId,
        daysPaused,
        targetRole: 'admin'
      });
    }
  }

  /**
   * Create system alert
   * @param {string} customerId - Customer ID
   * @param {string} alertType - Type of alert (early_alert, churn_risk, admin_escalation)
   * @param {string} message - Alert message
   * @param {object} metadata - Additional data
   */
  createAlert(customerId, alertType, message, metadata = {}) {
    const alert = {
      alertId: this.generateId(),
      customerId,
      alertType,
      message,
      metadata,
      createdAt: new Date().toISOString(),
      acknowledged: false,
      acknowledgedBy: null,
      acknowledgedAt: null
    };

    this.state.pauseAlerts.push(alert);
    this.saveState();

    // In real implementation: Send notification via WhatsApp/Email
    console.log(`🚨 ${alertType.toUpperCase()}: ${message}`);

    return alert;
  }

  /**
   * Acknowledge alert (Support buddy confirms they saw it)
   * @param {string} alertId - Alert ID
   * @param {string} userId - User acknowledging
   */
  acknowledgeAlert(alertId, userId) {
    const alert = this.state.pauseAlerts.find(a => a.alertId === alertId);
    if (!alert) return;

    alert.acknowledged = true;
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date().toISOString();
    this.saveState();
  }

  /**
   * Get unacknowledged alerts for support buddy
   * @returns {array} Alerts requiring attention
   */
  getUnacknowledgedAlerts() {
    return this.state.pauseAlerts.filter(a => !a.acknowledged);
  }

  /**
   * Get alerts for specific customer
   * @param {string} customerId - Customer ID
   * @returns {array} All alerts for customer
   */
  getCustomerAlerts(customerId) {
    return this.state.pauseAlerts.filter(a => a.customerId === customerId);
  }

  /**
   * CHURN RISK MANAGEMENT
   */

  /**
   * Check if customer is churn risk
   * @param {string} customerId - Customer ID
   * @returns {boolean} Is churn risk?
   */
  isChurnRisk(customerId) {
    return this.getPauseCountLast30Days(customerId) >= this.thresholds.churnRiskCount;
  }

  /**
   * Flag customer as churn risk
   * @param {string} customerId - Customer ID
   */
  flagChurnRisk(customerId) {
    if (!this.state.churnRiskCustomers.includes(customerId)) {
      this.state.churnRiskCustomers.push(customerId);
      this.saveState();
    }
  }

  /**
   * Get churn risk customers
   * @returns {array} Customers flagged as churn risk
   */
  getChurnRiskCustomers() {
    return this.state.churnRiskCustomers;
  }

  /**
   * Get churn score (0-100)
   * @param {string} customerId - Customer ID
   * @returns {number} Score (0-100)
   */
  getChurnScore(customerId) {
    const pauseCount = this.getPauseCountLast30Days(customerId);
    const activePause = this.getActivePause(customerId);
    let score = pauseCount * 20; // Each pause = 20 points

    if (activePause) {
      const daysPaused = Math.floor(
        (new Date().getTime() - new Date(activePause.pausedAt).getTime()) / (24 * 60 * 60 * 1000)
      );
      score += Math.min(daysPaused * 2, 30); // Up to 30 points for duration
    }

    return Math.min(score, 100);
  }

  /**
   * ESCALATION SYSTEM
   */

  /**
   * Escalate to admin
   * @param {string} customerId - Customer ID
   * @param {object} pauseRecord - Pause record details
   */
  escalateToAdmin(customerId, pauseRecord) {
    const escalation = {
      escalationId: this.generateId(),
      customerId,
      subscriptionId: pauseRecord.subscriptionId,
      pausedSince: pauseRecord.pausedAt,
      daysPaused: Math.floor(
        (new Date().getTime() - new Date(pauseRecord.pausedAt).getTime()) / (24 * 60 * 60 * 1000)
      ),
      pauseReason: pauseRecord.reason,
      churnScore: this.getChurnScore(customerId),
      pauseCount30Days: this.getPauseCountLast30Days(customerId),
      escalatedAt: new Date().toISOString(),
      status: 'pending', // pending, acknowledged, resolved
      adminNotes: null,
      recommendedAction: this.getEscalationRecommendation(customerId)
    };

    this.state.escalatedCases.push(escalation);
    this.saveState();

    return escalation;
  }

  /**
   * Get escalation recommendation
   * @param {string} customerId - Customer ID
   * @returns {string} Recommended action
   */
  getEscalationRecommendation(customerId) {
    const score = this.getChurnScore(customerId);
    const pauseCount = this.getPauseCountLast30Days(customerId);

    if (score >= 80 && pauseCount >= 4) {
      return 'High churn risk: Consider win-back offer or check-in call';
    } else if (score >= 60 && pauseCount >= 3) {
      return 'Churn risk: Reach out with personalized retention offer';
    } else if (score >= 40) {
      return 'Monitor: Check on customer status via support buddy';
    } else {
      return 'Low risk: Standard check-in email';
    }
  }

  /**
   * Get escalated cases
   * @param {string} status - Filter by status (pending, acknowledged, resolved)
   * @returns {array} Escalated cases
   */
  getEscalatedCases(status = null) {
    let cases = this.state.escalatedCases;
    if (status) {
      cases = cases.filter(c => c.status === status);
    }
    return cases;
  }

  /**
   * Acknowledge escalation (admin confirms)
   * @param {string} escalationId - Escalation ID
   * @param {string} adminId - Admin user ID
   * @param {string} notes - Action notes
   */
  acknowledgeEscalation(escalationId, adminId, notes = '') {
    const escalation = this.state.escalatedCases.find(e => e.escalationId === escalationId);
    if (!escalation) return;

    escalation.status = 'acknowledged';
    escalation.adminNotes = notes;
    escalation.acknowledgedBy = adminId;
    escalation.acknowledgedAt = new Date().toISOString();
    this.saveState();
  }

  /**
   * ANALYTICS & INSIGHTS
   */

  /**
   * Get pause history for customer
   * @param {string} customerId - Customer ID
   * @returns {array} All pauses for customer
   */
  getPauseHistory(customerId) {
    return this.state.pauseHistory[customerId] || [];
  }

  /**
   * Get active pause for customer
   * @param {string} customerId - Customer ID
   * @returns {object|null} Active pause or null
   */
  getActivePause(customerId) {
    const history = this.state.pauseHistory[customerId] || [];
    return history.find(p => p.status === 'active') || null;
  }

  /**
   * Get pause count in last N days
   * @param {string} customerId - Customer ID
   * @param {number} days - Days to look back (default 30)
   * @returns {number} Count of pauses
   */
  getPauseCountLast30Days(customerId, days = 30) {
    const history = this.state.pauseHistory[customerId] || [];
    const cutoff = new Date().getTime() - days * 24 * 60 * 60 * 1000;

    return history.filter(p => {
      const pauseTime = new Date(p.pausedAt).getTime();
      return pauseTime >= cutoff;
    }).length;
  }

  /**
   * Get pause reasons summary
   * @param {string} customerId - Customer ID
   * @returns {object} { reason: count }
   */
  getPauseReasonsSummary(customerId) {
    const history = this.state.pauseHistory[customerId] || [];
    const summary = {};

    history.forEach(p => {
      const reason = p.reason || 'No reason';
      summary[reason] = (summary[reason] || 0) + 1;
    });

    return summary;
  }

  /**
   * Get average pause duration
   * @param {string} customerId - Customer ID
   * @returns {number} Average duration in days
   */
  getAveragePauseDuration(customerId) {
    const history = this.state.pauseHistory[customerId] || [];
    const resolved = history.filter(p => p.status === 'resolved' && p.duration > 0);

    if (resolved.length === 0) return 0;

    const totalDuration = resolved.reduce((sum, p) => sum + p.duration, 0);
    return Math.floor(totalDuration / resolved.length / (24 * 60 * 60 * 1000));
  }

  /**
   * REACTIVATION INTELLIGENCE
   */

  /**
   * Get reactivation insight
   * @param {string} customerId - Customer ID
   * @returns {object} Insight and recommendation
   */
  getReactivationInsight(customerId) {
    const history = this.state.pauseHistory[customerId] || [];
    const avgDuration = this.getAveragePauseDuration(customerId);
    const pauseReasons = this.getPauseReasonsSummary(customerId);
    const activePause = this.getActivePause(customerId);

    let insight = {
      customerId,
      totalPauses: history.length,
      averagePauseDays: avgDuration,
      topReason: Object.entries(pauseReasons).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown',
      currentStatus: activePause ? 'Paused' : 'Active',
      recommendation: ''
    };

    // Generate recommendation
    if (!activePause) {
      insight.recommendation = 'Active subscription - No action needed';
    } else if (avgDuration > 10) {
      insight.recommendation = 'Typically pauses for 10+ days. Consider proactive win-back offer now.';
    } else if (history.length >= 3) {
      insight.recommendation = 'Frequent pauser. Offer flexible subscription options.';
    } else {
      insight.recommendation = 'First-time or infrequent pauser. Gentle check-in recommended.';
    }

    return insight;
  }

  /**
   * Get customers likely to reactivate (based on history)
   * @returns {array} Customers and their reactivation likelihood
   */
  getLikelyReactivations() {
    const customers = Object.keys(this.state.pauseHistory);
    const results = customers.map(customerId => {
      const insight = this.getReactivationInsight(customerId);
      const avgDuration = this.getAveragePauseDuration(customerId);
      const activePause = this.getActivePause(customerId);

      if (!activePause) {
        return null; // Not currently paused
      }

      const daysPaused = Math.floor(
        (new Date().getTime() - new Date(activePause.pausedAt).getTime()) / (24 * 60 * 60 * 1000)
      );

      // Likelihood based on average duration and current pause duration
      let likelihood = 'Low';
      if (daysPaused >= avgDuration * 0.8) {
        likelihood = 'High'; // Approaching typical resume time
      } else if (daysPaused >= avgDuration * 0.5) {
        likelihood = 'Medium'; // Halfway through typical duration
      }

      return {
        customerId,
        likelihood,
        daysPaused,
        expectedResumeIn: Math.max(0, Math.ceil(avgDuration - daysPaused)),
        insight: insight.recommendation
      };
    }).filter(r => r !== null);

    return results.sort((a, b) => {
      const order = { 'High': 0, 'Medium': 1, 'Low': 2 };
      return order[a.likelihood] - order[b.likelihood];
    });
  }

  /**
   * DASHBOARD STATISTICS
   */

  /**
   * Get dashboard statistics
   * @returns {object} Key metrics
   */
  getDashboardStats() {
    const allCustomers = Object.keys(this.state.pauseHistory);
    const churnRiskCount = this.state.churnRiskCustomers.length;
    const escalatedCount = this.state.escalatedCases.filter(c => c.status === 'pending').length;
    const unacknowledgedAlerts = this.state.pauseAlerts.filter(a => !a.acknowledged).length;

    const currentlyPaused = allCustomers.filter(cid => this.getActivePause(cid) !== null).length;

    return {
      totalCustomersTracked: allCustomers.length,
      currentlyPaused,
      churnRiskCount,
      escalatedCount,
      unacknowledgedAlerts,
      likelyReactivations: this.getLikelyReactivations().filter(r => r.likelihood === 'High').length,
      systemHealth: {
        alertsProcessed: this.state.pauseAlerts.length,
        casesEscalated: this.state.escalatedCases.length,
        alertsAcknowledged: this.state.pauseAlerts.filter(a => a.acknowledged).length
      }
    };
  }

  /**
   * UTILITY METHODS
   */

  generateId() {
    return 'PAUSE_' + Math.random().toString(36).substring(2, 15).toUpperCase();
  }

  hasAlert(customerId, alertType) {
    return this.state.pauseAlerts.some(
      a => a.customerId === customerId && a.alertType === alertType && !a.acknowledged
    );
  }

  hasChurnFlag(customerId) {
    return this.state.churnRiskCustomers.includes(customerId);
  }
}

// Initialize global instance
if (typeof window !== 'undefined') {
  window.EarlyBirdPauseDetection = EarlyBirdPauseDetection;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EarlyBirdPauseDetection;
}

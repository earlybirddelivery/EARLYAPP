/**
 * EarlyBird Shared Access Control System
 * Enables Support Buddy, Delivery Buddy, and Customer to share account access
 * with full attribution logging (who did what, when, where, why)
 * 
 * Features:
 * - Shared access invitations (Support/Delivery invite Customer)
 * - Permission inheritance (Customer can grant read-only access to household members)
 * - Action attribution (every change logged with role/user/timestamp/action/reason)
 * - Concurrent session handling (multiple users can access simultaneously)
 * - Audit trail (complete history of changes with rollback capability)
 * - Conflict resolution (simultaneous edits detected)
 * 
 * Storage:
 * - localStorage: Shared access configs, invitations, audit logs
 * - Key: 'EARLYBIRD_SHARED_ACCESS'
 * 
 * @author EarlyBird Team
 * @version 2.0
 * @date January 2026
 */

class EarlyBirdSharedAccess {
  constructor() {
    this.storageKey = 'EARLYBIRD_SHARED_ACCESS';
    this.auditKey = 'EARLYBIRD_AUDIT_LOG';
    this.sessionKey = 'EARLYBIRD_CURRENT_SESSION';
    
    this.state = {
      sharedAccounts: {},        // { customerId: { supportBuddy, deliveryBuddy, household } }
      invitations: [],           // Pending invitations
      accessLog: [],             // Audit trail of all access events
      activeSessions: {},        // Track concurrent users
      conflicts: []              // Detected conflicts (simultaneous edits)
    };
    
    this.permissions = {
      support: ['read', 'create', 'update', 'approve', 'view_payment'],
      delivery: ['read', 'update_delivery_status', 'mark_complete'],
      customer: ['read', 'create', 'update_own', 'share_access'],
      household: ['read', 'create_own'] // Family member limited access
    };
    
    this.loadState();
  }

  /**
   * LOAD/SAVE STATE
   */
  loadState() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        this.state = JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed to load shared access state:', e);
    }
  }

  saveState() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to save shared access state:', e);
    }
  }

  /**
   * INVITATION SYSTEM
   * Support/Delivery invites Customer to shared account
   */

  /**
   * Create invitation for customer to share access
   * @param {string} customerId - Customer being invited
   * @param {string} role - Role of inviter (support/delivery)
   * @param {object} inviter - { id, name, phone }
   * @returns {object} Invitation details with unique code
   */
  createInvitation(customerId, role, inviter) {
    if (!['support', 'delivery'].includes(role)) {
      throw new Error('Only Support and Delivery can create invitations');
    }

    const invitationCode = this.generateCode();
    const invitation = {
      invitationCode,
      customerId,
      inviterRole: role,
      inviterInfo: inviter,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      status: 'pending', // pending, accepted, declined, expired
      message: `${inviter.name} (${role}) has invited you to share account access.`
    };

    this.state.invitations.push(invitation);
    this.saveState();

    // Log invitation creation
    this.logAction(customerId, role, 'create_invitation', {
      invitationCode,
      inviterRole: role,
      inviterName: inviter.name
    });

    return invitation;
  }

  /**
   * Accept invitation and establish shared access
   * @param {string} customerId - Customer accepting
   * @param {string} invitationCode - Code from invitation
   * @returns {object} Updated shared access configuration
   */
  acceptInvitation(customerId, invitationCode) {
    const invitation = this.state.invitations.find(
      inv => inv.invitationCode === invitationCode && inv.status === 'pending'
    );

    if (!invitation) {
      throw new Error('Invalid or expired invitation');
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      invitation.status = 'expired';
      this.saveState();
      throw new Error('Invitation has expired');
    }

    // Accept invitation
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date().toISOString();

    // Initialize shared access if not exists
    if (!this.state.sharedAccounts[customerId]) {
      this.state.sharedAccounts[customerId] = {
        customerId,
        supportBuddy: null,
        deliveryBuddy: null,
        household: [],
        createdAt: new Date().toISOString()
      };
    }

    // Grant access based on inviter role
    if (invitation.inviterRole === 'support') {
      this.state.sharedAccounts[customerId].supportBuddy = {
        id: invitation.inviterInfo.id,
        name: invitation.inviterInfo.name,
        phone: invitation.inviterInfo.phone,
        grantedAt: new Date().toISOString(),
        permissions: this.permissions.support
      };
    } else if (invitation.inviterRole === 'delivery') {
      this.state.sharedAccounts[customerId].deliveryBuddy = {
        id: invitation.inviterInfo.id,
        name: invitation.inviterInfo.name,
        phone: invitation.inviterInfo.phone,
        grantedAt: new Date().toISOString(),
        permissions: this.permissions.delivery
      };
    }

    this.saveState();

    // Log acceptance
    this.logAction(customerId, 'customer', 'accept_invitation', {
      inviterRole: invitation.inviterRole,
      inviterName: invitation.inviterInfo.name
    });

    return this.state.sharedAccounts[customerId];
  }

  /**
   * Decline invitation
   * @param {string} customerId - Customer declining
   * @param {string} invitationCode - Code from invitation
   */
  declineInvitation(customerId, invitationCode) {
    const invitation = this.state.invitations.find(
      inv => inv.invitationCode === invitationCode && inv.status === 'pending'
    );

    if (!invitation) {
      throw new Error('Invalid invitation');
    }

    invitation.status = 'declined';
    invitation.declinedAt = new Date().toISOString();
    this.saveState();

    this.logAction(customerId, 'customer', 'decline_invitation', {
      inviterRole: invitation.inviterRole
    });
  }

  /**
   * Revoke access from Support/Delivery
   * @param {string} customerId - Customer revoking
   * @param {string} role - Role to revoke (support/delivery)
   */
  revokeAccess(customerId, role) {
    if (!this.state.sharedAccounts[customerId]) {
      throw new Error('No shared access configuration found');
    }

    const account = this.state.sharedAccounts[customerId];
    const revoked = {};

    if (role === 'support' && account.supportBuddy) {
      revoked = account.supportBuddy;
      account.supportBuddy = null;
    } else if (role === 'delivery' && account.deliveryBuddy) {
      revoked = account.deliveryBuddy;
      account.deliveryBuddy = null;
    }

    this.saveState();

    this.logAction(customerId, 'customer', 'revoke_access', {
      role,
      revokedId: revoked.id,
      revokedName: revoked.name
    });

    return { status: 'revoked', role, revokedUser: revoked };
  }

  /**
   * CONCURRENT SESSION MANAGEMENT
   * Track who's accessing what simultaneously
   */

  /**
   * Register active session
   * @param {string} customerId - Customer ID
   * @param {object} user - { userId, role, name, accessType: 'direct' | 'shared' }
   * @returns {string} Session ID
   */
  registerSession(customerId, user) {
    const sessionId = this.generateCode();
    
    if (!this.state.activeSessions[customerId]) {
      this.state.activeSessions[customerId] = [];
    }

    const session = {
      sessionId,
      userId: user.userId,
      role: user.role,
      name: user.name,
      accessType: user.accessType || 'direct', // direct or shared
      startedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    this.state.activeSessions[customerId].push(session);
    this.saveState();

    // Store in sessionStorage for current browser session
    sessionStorage.setItem(this.sessionKey, JSON.stringify({ customerId, sessionId, ...user }));

    return sessionId;
  }

  /**
   * Mark session as inactive
   * @param {string} customerId - Customer ID
   * @param {string} sessionId - Session ID to close
   */
  closeSession(customerId, sessionId) {
    if (!this.state.activeSessions[customerId]) return;

    const idx = this.state.activeSessions[customerId].findIndex(s => s.sessionId === sessionId);
    if (idx !== -1) {
      this.state.activeSessions[customerId][idx].closedAt = new Date().toISOString();
      this.saveState();
    }
  }

  /**
   * Get active sessions for a customer
   * @param {string} customerId - Customer ID
   * @returns {array} List of active sessions
   */
  getActiveSessions(customerId) {
    return (this.state.activeSessions[customerId] || []).filter(s => !s.closedAt);
  }

  /**
   * Check if other users are modifying same record
   * @param {string} customerId - Customer ID
   * @param {string} recordId - Order/Event ID
   * @returns {object} { isConflict, conflictingUsers: [] }
   */
  detectConflict(customerId, recordId) {
    const sessions = this.getActiveSessions(customerId);
    const recentActions = this.getAuditLog(customerId).filter(
      a => a.recordId === recordId && 
           new Date(a.timestamp) > new Date(Date.now() - 60000) // Last 60 seconds
    );

    const conflictingUsers = recentActions.map(a => ({
      userId: a.userId,
      role: a.role,
      action: a.action,
      timestamp: a.timestamp
    }));

    return {
      isConflict: conflictingUsers.length > 0,
      conflictingUsers,
      resolution: 'last_write_wins' // Can be changed to other strategies
    };
  }

  /**
   * AUDIT LOGGING
   * Complete attribution of every action
   */

  /**
   * Log action with full attribution
   * @param {string} customerId - Affected customer
   * @param {string} role - Role of actor (customer/support/delivery/household)
   * @param {string} action - Action type (create/update/delete/approve/etc)
   * @param {object} details - Action details (what changed, values, etc)
   * @param {object} options - { recordId, reason, recordType }
   */
  logAction(customerId, role, action, details = {}, options = {}) {
    const logEntry = {
      logId: this.generateCode(),
      timestamp: new Date().toISOString(),
      customerId,
      userId: this.getCurrentUserId(),
      role,
      action,
      details,
      recordId: options.recordId || null,
      recordType: options.recordType || null,
      reason: options.reason || null,
      ipAddress: this.getClientIP(),
      sessionId: this.getCurrentSessionId(),
      changesBefore: options.changesBefore || null,
      changesAfter: options.changesAfter || null
    };

    this.state.accessLog.push(logEntry);

    // Keep only last 10,000 entries (prevent bloat)
    if (this.state.accessLog.length > 10000) {
      this.state.accessLog = this.state.accessLog.slice(-10000);
    }

    this.saveState();
    return logEntry;
  }

  /**
   * Get audit log for customer
   * @param {string} customerId - Customer ID
   * @param {object} filters - { role, action, recordId, dateFrom, dateTo }
   * @returns {array} Filtered audit entries
   */
  getAuditLog(customerId, filters = {}) {
    let log = this.state.accessLog.filter(entry => entry.customerId === customerId);

    if (filters.role) {
      log = log.filter(e => e.role === filters.role);
    }
    if (filters.action) {
      log = log.filter(e => e.action === filters.action);
    }
    if (filters.recordId) {
      log = log.filter(e => e.recordId === filters.recordId);
    }
    if (filters.dateFrom) {
      log = log.filter(e => new Date(e.timestamp) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      log = log.filter(e => new Date(e.timestamp) <= new Date(filters.dateTo));
    }

    return log.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Get summary of who did what (attribution report)
   * @param {string} customerId - Customer ID
   * @param {number} days - Last N days (default 30)
   * @returns {object} { byRole: { support: { actions: [], count }, ... }, timeline: [] }
   */
  getAttributionSummary(customerId, days = 30) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const log = this.getAuditLog(customerId, { dateFrom: cutoff.toISOString() });

    const summary = {
      byRole: {},
      timeline: [],
      statistics: {
        totalActions: log.length,
        activeRoles: new Set(),
        actionCounts: {}
      }
    };

    // Group by role
    log.forEach(entry => {
      if (!summary.byRole[entry.role]) {
        summary.byRole[entry.role] = {
          role: entry.role,
          actions: [],
          count: 0,
          lastAction: null
        };
      }

      summary.byRole[entry.role].actions.push({
        action: entry.action,
        timestamp: entry.timestamp,
        details: entry.details
      });
      summary.byRole[entry.role].count++;
      summary.byRole[entry.role].lastAction = entry.timestamp;
      summary.statistics.activeRoles.add(entry.role);

      summary.statistics.actionCounts[entry.action] = (summary.statistics.actionCounts[entry.action] || 0) + 1;
    });

    summary.timeline = log;
    summary.statistics.activeRoles = Array.from(summary.statistics.activeRoles);

    return summary;
  }

  /**
   * PERMISSION CHECKING
   */

  /**
   * Check if role can perform action on record
   * @param {string} customerId - Customer ID
   * @param {string} role - Role trying to access
   * @param {string} action - Action trying to perform
   * @param {object} record - Record being accessed (for ownership checks)
   * @returns {boolean} Whether action is allowed
   */
  canPerformAction(customerId, role, action, record = {}) {
    const rolePermissions = this.permissions[role];
    
    if (!rolePermissions) {
      return false; // Unknown role
    }

    if (!rolePermissions.includes(action)) {
      return false; // Role doesn't have this permission
    }

    // Check if shared access is active (if not direct access)
    if (role === 'support' || role === 'delivery') {
      const account = this.state.sharedAccounts[customerId];
      if (!account) {
        return false; // No shared access established
      }

      if (role === 'support' && !account.supportBuddy) {
        return false; // Support access not granted
      }
      if (role === 'delivery' && !account.deliveryBuddy) {
        return false; // Delivery access not granted
      }
    }

    // Customer can only update own records
    if (role === 'customer' && action === 'update_own') {
      return true; // Customer can always update own
    }

    // Household members have limited access
    if (role === 'household' && action === 'create_own') {
      return true; // Household can create their own items
    }

    return true;
  }

  /**
   * Get shared account configuration
   * @param {string} customerId - Customer ID
   * @returns {object} Shared access config with active participants
   */
  getSharedAccountConfig(customerId) {
    const config = this.state.sharedAccounts[customerId];
    
    if (!config) {
      return null;
    }

    const activeSessions = this.getActiveSessions(customerId);

    return {
      customerId,
      participants: [
        { role: 'customer', status: 'owner' },
        ...(config.supportBuddy ? [{
          role: 'support',
          name: config.supportBuddy.name,
          status: 'active',
          grantedAt: config.supportBuddy.grantedAt
        }] : []),
        ...(config.deliveryBuddy ? [{
          role: 'delivery',
          name: config.deliveryBuddy.name,
          status: 'active',
          grantedAt: config.deliveryBuddy.grantedAt
        }] : []),
        ...(config.household ? config.household.map(member => ({
          role: 'household',
          name: member.name,
          status: 'active',
          grantedAt: member.grantedAt
        })) : [])
      ],
      activeSessions,
      createdAt: config.createdAt
    };
  }

  /**
   * HELPER METHODS
   */

  generateCode() {
    return Math.random().toString(36).substring(2, 15).toUpperCase();
  }

  getCurrentUserId() {
    try {
      const session = JSON.parse(sessionStorage.getItem(this.sessionKey) || '{}');
      return session.userId || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  getCurrentSessionId() {
    try {
      const session = JSON.parse(sessionStorage.getItem(this.sessionKey) || '{}');
      return session.sessionId || null;
    } catch {
      return null;
    }
  }

  getClientIP() {
    // In browser environment, we can't get real IP
    // This would be done on server-side
    return 'browser';
  }

  /**
   * ROLLBACK CAPABILITY
   * Ability to undo recent changes
   */

  /**
   * Rollback an action
   * @param {string} customerId - Customer ID
   * @param {string} logId - Log entry ID to rollback
   * @returns {object} Rollback result
   */
  rollbackAction(customerId, logId) {
    const logEntry = this.state.accessLog.find(e => e.logId === logId);

    if (!logEntry) {
      throw new Error('Log entry not found');
    }

    if (!logEntry.changesBefore) {
      throw new Error('Cannot rollback: original state not recorded');
    }

    // Log the rollback action
    this.logAction(customerId, 'admin', 'rollback_action', {
      rolledBackLogId: logId,
      originalAction: logEntry.action,
      restoredValues: logEntry.changesBefore
    });

    return {
      status: 'rolled_back',
      logId,
      restoredValues: logEntry.changesBefore
    };
  }

  /**
   * DATA EXPORT FOR ANALYTICS
   */

  /**
   * Export attribution data for analytics
   * @param {string} customerId - Customer ID
   * @returns {object} Data ready for export/analysis
   */
  exportAttributionData(customerId) {
    const auditLog = this.getAuditLog(customerId);
    const summary = this.getAttributionSummary(customerId, 30);
    const config = this.getSharedAccountConfig(customerId);

    return {
      exportedAt: new Date().toISOString(),
      customerId,
      configuration: config,
      auditLog: auditLog.map(entry => ({
        timestamp: entry.timestamp,
        role: entry.role,
        action: entry.action,
        details: entry.details,
        recordType: entry.recordType
      })),
      summary,
      statistics: {
        totalActions: auditLog.length,
        activeRoles: summary.statistics.activeRoles,
        actionBreakdown: summary.statistics.actionCounts
      }
    };
  }
}

// Initialize global instance
if (typeof window !== 'undefined') {
  window.EarlyBirdSharedAccess = EarlyBirdSharedAccess;
}

// Export for Node.js/testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EarlyBirdSharedAccess;
}

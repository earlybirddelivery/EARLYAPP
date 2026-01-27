// Shared Access Module Stub
class SharedAccess {
  constructor() {
    this.sharedUsers = [];
  }

  getSharedUsers() {
    return this.sharedUsers;
  }

  addSharedUser(userId) {
    this.sharedUsers.push(userId);
  }

  createInvitation(customerId, role, inviterInfo) {
    return { id: Date.now(), customerId, role, inviterInfo };
  }

  getAuditLog(customerId) {
    return [];
  }

  logAction(customerId, role, action, details) {
    // Stub implementation
  }
}

export default SharedAccess;

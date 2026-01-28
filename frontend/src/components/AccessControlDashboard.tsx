// @ts-nocheck
/**
 * PHASE 4B.6: Access Control Admin Dashboard Component
 * React component for managing permissions, 2FA, and audit logs
 * Author: AI Agent
 * Date: January 28, 2026
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AccessControlDashboard.css';

interface Permission {
  id: string;
  permission: string;
  resource_type?: string;
  resource_id?: string;
  granted_at: string;
}

interface Role {
  name: string;
  display_name: string;
  level: number;
  permissions_count: number;
  description: string;
}

interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  status: string;
  timestamp: string;
  details?: Record<string, any>;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  mfa_enabled: boolean;
}

const AccessControlDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'permissions' | '2fa' | 'audit' | 'resources'>('permissions');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Form states
  const [grantPermissionForm, setGrantPermissionForm] = useState({
    user_id: '',
    permission: '',
    resource_type: '',
    resource_id: ''
  });

  const [assignRoleForm, setAssignRoleForm] = useState({
    user_id: '',
    role: ''
  });

  const [auditFilter, setAuditFilter] = useState({
    user_id: '',
    resource_type: '',
    days: 30
  });

  // Load initial data
  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      // In production, fetch from /api/users
      const mockUsers: User[] = [
        { id: 'user_1', name: 'John Doe', email: 'john@example.com', role: 'admin', mfa_enabled: true },
        { id: 'user_2', name: 'Jane Smith', email: 'jane@example.com', role: 'manager', mfa_enabled: false },
        { id: 'user_3', name: 'Bob Wilson', email: 'bob@example.com', role: 'staff', mfa_enabled: true },
      ];
      setUsers(mockUsers);
    } catch (error) {
      setMessage('Error loading users');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await axios.get('/api/access/roles');
      if (response.data.success) {
        setRoles(response.data.roles);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const loadUserPermissions = async (userId: string) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/access/permissions/user/${userId}`);
      if (response.data.success) {
        setPermissions(response.data.permissions);
      }
    } catch (error) {
      setMessage('Error loading permissions');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const userId = auditFilter.user_id || undefined;
      const response = await axios.get(`/api/access/audit/user/${userId || 'all'}`, {
        params: {
          limit: 100,
          offset: 0
        }
      });
      if (response.data.success) {
        setAuditLogs(response.data.logs || []);
      }
    } catch (error) {
      setMessage('Error loading audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleGrantPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/access/permissions/grant', grantPermissionForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setMessage('Permission granted successfully');
        setGrantPermissionForm({ user_id: '', permission: '', resource_type: '', resource_id: '' });
        if (selectedUser) {
          loadUserPermissions(selectedUser.id);
        }
      }
    } catch (error) {
      setMessage('Error granting permission');
    }
  };

  const handleRevokePermission = async (permissionId: string) => {
    if (!window.confirm('Are you sure you want to revoke this permission?')) return;

    try {
      const permission = permissions.find(p => p.id === permissionId);
      if (!permission) return;

      const response = await axios.post('/api/access/permissions/revoke', {
        user_id: selectedUser?.id,
        permission: permission.permission,
        resource_id: permission.resource_id
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success) {
        setMessage('Permission revoked successfully');
        if (selectedUser) {
          loadUserPermissions(selectedUser.id);
        }
      }
    } catch (error) {
      setMessage('Error revoking permission');
    }
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/access/roles/assign', assignRoleForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setMessage(`Role '${assignRoleForm.role}' assigned successfully`);
        setAssignRoleForm({ user_id: '', role: '' });
        loadUsers();
      }
    } catch (error) {
      setMessage('Error assigning role');
    }
  };

  const handleEnableTOTP = async (userId: string) => {
    try {
      const response = await axios.post('/api/access/2fa/enable/totp', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setMessage('TOTP enabled. QR code generated.');
        // In production, show modal with QR code
      }
    } catch (error) {
      setMessage('Error enabling TOTP');
    }
  };

  const handleDisable2FA = async (userId: string) => {
    if (!window.confirm('Disable 2FA for this user?')) return;

    try {
      const response = await axios.post('/api/access/2fa/disable', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.success) {
        setMessage('2FA disabled successfully');
        loadUsers();
      }
    } catch (error) {
      setMessage('Error disabling 2FA');
    }
  };

  return (
    <div className="access-control-dashboard">
      <div className="dashboard-header">
        <h1>Access Control Management</h1>
        <p>Manage permissions, 2FA, audit trails, and resource access</p>
      </div>

      {message && (
        <div className="alert alert-info">
          {message}
          <button onClick={() => setMessage('')}>×</button>
        </div>
      )}

      <div className="dashboard-tabs">
        <button
          className={`tab-button ${activeTab === 'permissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('permissions')}
        >
          🔐 Permissions
        </button>
        <button
          className={`tab-button ${activeTab === '2fa' ? 'active' : ''}`}
          onClick={() => setActiveTab('2fa')}
        >
          🔑 2FA Management
        </button>
        <button
          className={`tab-button ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          📋 Audit Logs
        </button>
        <button
          className={`tab-button ${activeTab === 'resources' ? 'active' : ''}`}
          onClick={() => setActiveTab('resources')}
        >
          📦 Resources
        </button>
      </div>

      <div className="dashboard-content">
        {/* PERMISSIONS TAB */}
        {activeTab === 'permissions' && (
          <div className="tab-content">
            <div className="section">
              <h2>User Permissions</h2>
              
              {/* User Selection */}
              <div className="user-selection">
                <label>Select User:</label>
                <select 
                  value={selectedUser?.id || ''}
                  onChange={(e) => {
                    const user = users.find(u => u.id === e.target.value);
                    if (user) {
                      setSelectedUser(user);
                      loadUserPermissions(user.id);
                    }
                  }}
                >
                  <option value="">-- Select a user --</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </option>
                  ))}
                </select>
              </div>

              {selectedUser && (
                <>
                  {/* Grant Permission Form */}
                  <div className="form-section">
                    <h3>Grant Permission</h3>
                    <form onSubmit={handleGrantPermission}>
                      <div className="form-group">
                        <label>Permission:</label>
                        <select 
                          value={grantPermissionForm.permission}
                          onChange={(e) => setGrantPermissionForm({
                            ...grantPermissionForm,
                            user_id: selectedUser.id,
                            permission: e.target.value
                          })}
                          required
                        >
                          <option value="">-- Select permission --</option>
                          <option value="users:read">Read Users</option>
                          <option value="users:update">Update Users</option>
                          <option value="orders:read">Read Orders</option>
                          <option value="orders:update">Update Orders</option>
                          <option value="products:create">Create Products</option>
                          <option value="products:update">Update Products</option>
                          <option value="products:delete">Delete Products</option>
                          <option value="reports:read">Read Reports</option>
                          <option value="audit:read">Read Audit Logs</option>
                          <option value="permissions:read">Read Permissions</option>
                          <option value="permissions:update">Update Permissions</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Resource Type (optional):</label>
                        <input 
                          type="text"
                          placeholder="e.g., delivery_zone"
                          value={grantPermissionForm.resource_type}
                          onChange={(e) => setGrantPermissionForm({
                            ...grantPermissionForm,
                            resource_type: e.target.value
                          })}
                        />
                      </div>

                      <div className="form-group">
                        <label>Resource ID (optional):</label>
                        <input 
                          type="text"
                          placeholder="e.g., zone_north"
                          value={grantPermissionForm.resource_id}
                          onChange={(e) => setGrantPermissionForm({
                            ...grantPermissionForm,
                            resource_id: e.target.value
                          })}
                        />
                      </div>

                      <button type="submit" className="btn btn-primary">
                        Grant Permission
                      </button>
                    </form>
                  </div>

                  {/* Current Permissions */}
                  <div className="permissions-list">
                    <h3>Current Permissions ({permissions.length})</h3>
                    {loading ? (
                      <p>Loading...</p>
                    ) : permissions.length > 0 ? (
                      <table className="permissions-table">
                        <thead>
                          <tr>
                            <th>Permission</th>
                            <th>Resource Type</th>
                            <th>Resource ID</th>
                            <th>Granted</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {permissions.map(perm => (
                            <tr key={perm.id}>
                              <td><code>{perm.permission}</code></td>
                              <td>{perm.resource_type || '-'}</td>
                              <td>{perm.resource_id || '-'}</td>
                              <td>{new Date(perm.granted_at).toLocaleDateString()}</td>
                              <td>
                                <button 
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleRevokePermission(perm.id)}
                                >
                                  Revoke
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p>No permissions assigned</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Role Management */}
            <div className="section">
              <h2>Role Management</h2>
              
              <div className="form-section">
                <h3>Assign Role</h3>
                <form onSubmit={handleAssignRole}>
                  <div className="form-group">
                    <label>User:</label>
                    <select 
                      value={assignRoleForm.user_id}
                      onChange={(e) => setAssignRoleForm({
                        ...assignRoleForm,
                        user_id: e.target.value
                      })}
                      required
                    >
                      <option value="">-- Select user --</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Role:</label>
                    <select 
                      value={assignRoleForm.role}
                      onChange={(e) => setAssignRoleForm({
                        ...assignRoleForm,
                        role: e.target.value
                      })}
                      required
                    >
                      <option value="">-- Select role --</option>
                      {roles.map(role => (
                        <option key={role.name} value={role.name}>
                          {role.display_name} ({role.permissions_count} permissions)
                        </option>
                      ))}
                    </select>
                  </div>

                  <button type="submit" className="btn btn-primary">
                    Assign Role
                  </button>
                </form>
              </div>

              {/* Roles List */}
              <div className="roles-list">
                <h3>Available Roles</h3>
                <div className="roles-grid">
                  {roles.map(role => (
                    <div key={role.name} className="role-card">
                      <h4>{role.display_name}</h4>
                      <p className="role-level">Level: {role.level}/5</p>
                      <p className="role-description">{role.description}</p>
                      <p className="role-permissions">{role.permissions_count} permissions</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2FA TAB */}
        {activeTab === '2fa' && (
          <div className="tab-content">
            <div className="section">
              <h2>Two-Factor Authentication</h2>
              
              <table className="users-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>2FA Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td><span className="badge">{user.role}</span></td>
                      <td>
                        {user.mfa_enabled ? (
                          <span className="status-enabled">✓ Enabled</span>
                        ) : (
                          <span className="status-disabled">✗ Disabled</span>
                        )}
                      </td>
                      <td>
                        {!user.mfa_enabled ? (
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => handleEnableTOTP(user.id)}
                          >
                            Enable 2FA
                          </button>
                        ) : (
                          <button 
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDisable2FA(user.id)}
                          >
                            Disable 2FA
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="info-box">
                <h3>2FA Methods Supported</h3>
                <ul>
                  <li><strong>TOTP (Time-based One-Time Password)</strong>: Works with authenticator apps like Google Authenticator</li>
                  <li><strong>SMS</strong>: One-time codes sent via SMS</li>
                  <li><strong>Backup Codes</strong>: Emergency access codes</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* AUDIT TAB */}
        {activeTab === 'audit' && (
          <div className="tab-content">
            <div className="section">
              <h2>Audit Logs</h2>

              <div className="filter-section">
                <div className="form-group">
                  <label>User ID (optional):</label>
                  <input 
                    type="text"
                    value={auditFilter.user_id}
                    onChange={(e) => setAuditFilter({
                      ...auditFilter,
                      user_id: e.target.value
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Resource Type (optional):</label>
                  <input 
                    type="text"
                    value={auditFilter.resource_type}
                    onChange={(e) => setAuditFilter({
                      ...auditFilter,
                      resource_type: e.target.value
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Days:</label>
                  <select 
                    value={auditFilter.days}
                    onChange={(e) => setAuditFilter({
                      ...auditFilter,
                      days: parseInt(e.target.value)
                    })}
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                </div>

                <button 
                  className="btn btn-primary"
                  onClick={loadAuditLogs}
                >
                  Load Logs
                </button>
              </div>

              {loading ? (
                <p>Loading audit logs...</p>
              ) : auditLogs.length > 0 ? (
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>User</th>
                      <th>Action</th>
                      <th>Resource</th>
                      <th>Status</th>
                      <th>IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log.id} className={`status-${log.status}`}>
                        <td>{new Date(log.timestamp).toLocaleString()}</td>
                        <td>{log.user_id || '-'}</td>
                        <td><code>{log.action}</code></td>
                        <td>{log.resource_type}/{log.resource_id || '-'}</td>
                        <td>
                          <span className={`status-badge status-${log.status}`}>
                            {log.status}
                          </span>
                        </td>
                        <td>{log.details?.ip_address || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No audit logs found</p>
              )}
            </div>
          </div>
        )}

        {/* RESOURCES TAB */}
        {activeTab === 'resources' && (
          <div className="tab-content">
            <div className="section">
              <h2>Resource Access Control</h2>
              
              <div className="info-box">
                <h3>About Resource Access</h3>
                <p>
                  Resource-level access control allows you to grant specific users 
                  access to particular resources (e.g., specific delivery zones, product categories).
                </p>
              </div>

              <div className="form-section">
                <h3>Grant Resource Access</h3>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  // Handle resource access grant
                }}>
                  <div className="form-group">
                    <label>User:</label>
                    <select required>
                      <option value="">-- Select user --</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Resource Type:</label>
                    <select required>
                      <option value="">-- Select type --</option>
                      <option value="delivery_zone">Delivery Zone</option>
                      <option value="product_category">Product Category</option>
                      <option value="warehouse">Warehouse</option>
                      <option value="region">Region</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Resource ID:</label>
                    <input type="text" placeholder="e.g., zone_north" required />
                  </div>

                  <div className="form-group">
                    <label>Access Level:</label>
                    <select>
                      <option value="read">Read</option>
                      <option value="read_write">Read & Write</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <button type="submit" className="btn btn-primary">
                    Grant Access
                  </button>
                </form>
              </div>

              <div className="resources-list">
                <h3>Resource Access Matrix</h3>
                <table className="resources-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Resource Type</th>
                      <th>Resource ID</th>
                      <th>Access Level</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>John Doe</td>
                      <td>Delivery Zone</td>
                      <td>zone_north</td>
                      <td><span className="badge">read_write</span></td>
                      <td>
                        <button className="btn btn-danger btn-sm">Remove</button>
                      </td>
                    </tr>
                    <tr>
                      <td>Jane Smith</td>
                      <td>Product Category</td>
                      <td>vegetables</td>
                      <td><span className="badge">read</span></td>
                      <td>
                        <button className="btn btn-danger btn-sm">Remove</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccessControlDashboard;

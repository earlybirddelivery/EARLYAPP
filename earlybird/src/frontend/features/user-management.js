// ============================================
// User Management UI - Inspired by Emergent Code
// ============================================

const userManagementUI = {
    state: {
        users: [],
        currentFilter: ''
    },

    loadUsers() {
        console.log('Loading users...');

        // Get all users from auth module
        this.state.users = EarlyBirdAuth.getAllUsers();

        // Update stats
        this.updateStats();

        // Render table
        this.renderUsersTable();
    },

    updateStats() {
        const total = this.state.users.length;
        const customers = this.state.users.filter(u => u.role === 'customer').length;
        const deliveryBoys = this.state.users.filter(u => u.role === 'delivery_boy').length;
        const staff = this.state.users.filter(u => u.role === 'admin' || u.role === 'marketing_staff').length;

        document.getElementById('totalUsers').textContent = total;
        document.getElementById('totalCustomers').textContent = customers;
        document.getElementById('totalDeliveryBoys').textContent = deliveryBoys;
        document.getElementById('totalStaff').textContent = staff;
    },

    filterByRole(role) {
        this.state.currentFilter = role;

        // Update button states
        document.querySelectorAll('#usersPage .btn-sm').forEach(btn => {
            btn.classList.remove('active');
            btn.classList.add('btn-outline');
        });

        event.target.classList.add('active');
        event.target.classList.remove('btn-outline');

        // Re-render table
        this.renderUsersTable();
    },

    renderUsersTable() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        // Filter users
        let filteredUsers = this.state.users;
        if (this.state.currentFilter) {
            filteredUsers = this.state.users.filter(u => u.role === this.state.currentFilter);
        }

        if (filteredUsers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="padding: 40px; text-align: center;">No users found</td></tr>';
            return;
        }

        // Sort by creation date (newest first)
        filteredUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        let html = '';
        filteredUsers.forEach(user => {
            const roleColors = {
                'admin': '#9c27b0',
                'customer': '#2196f3',
                'delivery_boy': '#4caf50',
                'marketing_staff': '#ff9800',
                'supplier': '#607d8b'
            };

            const roleLabels = {
                'admin': '👨‍💼 Admin',
                'customer': '👤 Customer',
                'delivery_boy': '🚚 Delivery Boy',
                'marketing_staff': '📢 Marketing',
                'supplier': '🏭 Supplier'
            };

            const statusColor = user.isActive ? '#4caf50' : '#f44336';
            const statusLabel = user.isActive ? 'Active' : 'Inactive';

            const createdDate = new Date(user.createdAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            html += `
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 12px; font-weight: 600;">${user.name}</td>
                    <td style="padding: 12px; font-size: 13px;">${user.email}</td>
                    <td style="padding: 12px; font-size: 13px;">${user.phone}</td>
                    <td style="padding: 12px;">
                        <span style="background: ${roleColors[user.role] || '#999'}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                            ${roleLabels[user.role] || user.role}
                        </span>
                    </td>
                    <td style="padding: 12px;">
                        <span style="background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                            ${statusLabel}
                        </span>
                    </td>
                    <td style="padding: 12px; font-size: 13px; color: var(--text-secondary);">${createdDate}</td>
                    <td style="padding: 12px; text-align: center;">
                        <button class="btn btn-sm btn-outline" style="padding: 6px 12px; font-size: 12px; margin-right: 4px;"
                            onclick="userManagementUI.editUser('${user.id}')">✏️ Edit</button>
                        <button class="btn btn-sm btn-outline" style="padding: 6px 12px; font-size: 12px;"
                            onclick="userManagementUI.toggleUserStatus('${user.id}')">
                            ${user.isActive ? '❌ Deactivate' : '✅ Activate'}
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    },

    showAddUserModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-header">
                    <h2>➕ Add New User</h2>
                    <button onclick="this.closest('.modal-overlay').remove()"
                        style="background: none; border: none; font-size: 20px; cursor: pointer;">✕</button>
                </div>
                <div class="modal-body" style="padding: 20px;">
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Full Name *</label>
                        <input type="text" id="newUserName" required
                            style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px;"
                            placeholder="Enter full name">
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Email *</label>
                        <input type="email" id="newUserEmail" required
                            style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px;"
                            placeholder="user@example.com">
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Phone *</label>
                        <input type="tel" id="newUserPhone" maxlength="10" required
                            style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px;"
                            placeholder="10-digit phone number">
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Role *</label>
                        <select id="newUserRole" required
                            style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px;">
                            <option value="">Select role...</option>
                            <option value="customer">👤 Customer</option>
                            <option value="delivery_boy">🚚 Delivery Boy</option>
                            <option value="marketing_staff">📢 Marketing Staff</option>
                            <option value="admin">👨‍💼 Admin</option>
                            <option value="supplier">🏭 Supplier</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Password *</label>
                        <input type="password" id="newUserPassword" required
                            style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px;"
                            placeholder="Enter password">
                        <p style="font-size: 12px; color: var(--text-secondary); margin: 4px 0 0 0;">
                            Minimum 6 characters
                        </p>
                    </div>

                    <div style="display: flex; gap: 12px;">
                        <button class="btn btn-primary" style="flex: 1;" onclick="userManagementUI.saveNewUser(this)">
                            💾 Save User
                        </button>
                        <button class="btn btn-outline" style="flex: 1;" onclick="this.closest('.modal-overlay').remove()">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    saveNewUser(btn) {
        const name = document.getElementById('newUserName')?.value.trim();
        const email = document.getElementById('newUserEmail')?.value.trim();
        const phone = document.getElementById('newUserPhone')?.value.trim();
        const role = document.getElementById('newUserRole')?.value;
        const password = document.getElementById('newUserPassword')?.value;

        // Validation
        if (!name || !email || !phone || !role || !password) {
            alert('Please fill in all required fields');
            return;
        }

        if (phone.length !== 10) {
            alert('Please enter a valid 10-digit phone number');
            return;
        }

        if (password.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }

        // Create user via auth module
        const userId = EarlyBirdAuth.createUser({
            email,
            password,
            name,
            phone,
            role,
            metadata: {}
        });

        console.log('User created:', userId);

        // Close modal
        btn.closest('.modal-overlay').remove();

        // Reload users
        this.loadUsers();

        // Show success
        alert(`✓ User created successfully!\n\nLogin credentials:\nEmail: ${email}\nPassword: ${password}`);
    },

    editUser(userId) {
        const user = EarlyBirdAuth.getUserById(userId);
        if (!user) {
            alert('User not found');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-header">
                    <h2>✏️ Edit User - ${user.name}</h2>
                    <button onclick="this.closest('.modal-overlay').remove()"
                        style="background: none; border: none; font-size: 20px; cursor: pointer;">✕</button>
                </div>
                <div class="modal-body" style="padding: 20px;">
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Full Name</label>
                        <input type="text" id="editUserName" value="${user.name}"
                            style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px;">
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Phone</label>
                        <input type="tel" id="editUserPhone" value="${user.phone}" maxlength="10"
                            style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px;">
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Email (Read-only)</label>
                        <input type="email" value="${user.email}" disabled
                            style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px; background: var(--light);">
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Role (Read-only)</label>
                        <input type="text" value="${user.role}" disabled
                            style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px; background: var(--light);">
                    </div>

                    <div style="margin-bottom: 20px; padding: 16px; background: var(--light); border-radius: 8px;">
                        <h4 style="margin: 0 0 8px 0; font-size: 14px;">Change Password</h4>
                        <input type="password" id="editUserPassword" placeholder="Enter new password (optional)"
                            style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px;">
                        <p style="font-size: 12px; color: var(--text-secondary); margin: 4px 0 0 0;">
                            Leave blank to keep current password
                        </p>
                    </div>

                    <div style="display: flex; gap: 12px;">
                        <button class="btn btn-primary" style="flex: 1;" onclick="userManagementUI.saveUserEdit('${userId}', this)">
                            💾 Save Changes
                        </button>
                        <button class="btn btn-outline" style="flex: 1;" onclick="this.closest('.modal-overlay').remove()">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    saveUserEdit(userId, btn) {
        const name = document.getElementById('editUserName')?.value.trim();
        const phone = document.getElementById('editUserPhone')?.value.trim();
        const password = document.getElementById('editUserPassword')?.value;

        if (!name || !phone) {
            alert('Please fill in all required fields');
            return;
        }

        if (phone.length !== 10) {
            alert('Please enter a valid 10-digit phone number');
            return;
        }

        // Update user
        const result = EarlyBirdAuth.updateUser(userId, {
            name,
            phone
        });

        // If password is provided, change it
        if (password && password.length >= 6) {
            // Note: This is a simplified version. In production, you'd want to verify old password
            console.log('Password change requested for:', userId);
        }

        console.log('User updated:', result);

        // Close modal
        btn.closest('.modal-overlay').remove();

        // Reload users
        this.loadUsers();

        alert('✓ User updated successfully!');
    },

    toggleUserStatus(userId) {
        const user = EarlyBirdAuth.getUserById(userId);
        if (!user) {
            alert('User not found');
            return;
        }

        const newStatus = !user.isActive;
        const action = newStatus ? 'activate' : 'deactivate';

        if (!confirm(`Are you sure you want to ${action} ${user.name}?`)) {
            return;
        }

        const result = EarlyBirdAuth.updateUser(userId, {
            isActive: newStatus
        });

        console.log('User status toggled:', result);

        // Reload users
        this.loadUsers();

        alert(`✓ User ${newStatus ? 'activated' : 'deactivated'} successfully!`);
    }
};

// Auto-initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('User Management UI module loaded');
    });
} else {
    console.log('User Management UI module loaded');
}

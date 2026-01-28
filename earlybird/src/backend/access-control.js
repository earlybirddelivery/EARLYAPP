// ============================================
// EarlyBird Access Control & Role Filtering
// Permission-based calendar & order visibility
// ============================================

const EarlyBirdAccessControl = {
    
    // ========== USER ROLES & PERMISSIONS ==========
    
    // Store current user info in session
    currentUser: {
        id: null,
        name: null,
        role: null, // 'admin', 'support', 'delivery', 'supplier', 'customer'
        assignedCustomers: [], // For support buddy
        assignedRoutes: [], // For delivery buddy
        assignedOrders: [], // For delivery buddy
        supplierId: null // For supplier
    },
    
    // Role-based permissions matrix
    permissions: {
        admin: {
            canViewAllCalendars: true,
            canViewAllOrders: true,
            canViewAllCustomers: true,
            canEditOrders: true,
            canEditCustomers: true,
            canManageStaff: true,
            canViewAnalytics: true,
            canViewSuppliers: true,
            canApprovePayments: true,
            canManageSubscriptions: true
        },
        support: {
            canViewAllCalendars: false,
            canViewAllOrders: false,
            canViewAllCustomers: false,
            canEditOrders: true,
            canEditCustomers: true,
            canManageStaff: false,
            canViewAnalytics: false,
            canViewSuppliers: false,
            canApprovePayments: false,
            canManageSubscriptions: true
        },
        delivery: {
            canViewAllCalendars: false,
            canViewAllOrders: false,
            canViewAllCustomers: false,
            canEditOrders: true,
            canEditCustomers: false,
            canManageStaff: false,
            canViewAnalytics: false,
            canViewSuppliers: false,
            canApprovePayments: false,
            canManageSubscriptions: false
        },
        supplier: {
            canViewAllCalendars: false,
            canViewAllOrders: false,
            canViewAllCustomers: false,
            canEditOrders: false,
            canEditCustomers: false,
            canManageStaff: false,
            canViewAnalytics: true,
            canViewSuppliers: true,
            canApprovePayments: false,
            canManageSubscriptions: false
        },
        customer: {
            canViewAllCalendars: false,
            canViewAllOrders: true,
            canViewAllCustomers: false,
            canEditOrders: false,
            canEditCustomers: true,
            canManageStaff: false,
            canViewAnalytics: false,
            canViewSuppliers: false,
            canApprovePayments: false,
            canManageSubscriptions: true
        }
    },
    
    // ========== SESSION MANAGEMENT ==========
    
    /**
     * Set current user
     * @param {Object} user - User object with id, name, role, etc.
     */
    setCurrentUser(user) {
        this.currentUser = {
            id: user.id || null,
            name: user.name || 'Unknown User',
            role: user.role || 'customer',
            assignedCustomers: user.assignedCustomers || [],
            assignedRoutes: user.assignedRoutes || [],
            assignedOrders: user.assignedOrders || [],
            supplierId: user.supplierId || null
        };
        
        // Save to session storage
        sessionStorage.setItem('earlybird_currentUser', JSON.stringify(this.currentUser));
        
        console.log('User set:', this.currentUser);
    },
    
    /**
     * Get current user
     */
    getCurrentUser() {
        // Try to load from session first
        const stored = sessionStorage.getItem('earlybird_currentUser');
        if (stored) {
            this.currentUser = JSON.parse(stored);
        }
        return this.currentUser;
    },
    
    /**
     * Clear current user (logout)
     */
    clearCurrentUser() {
        this.currentUser = {
            id: null,
            name: null,
            role: null,
            assignedCustomers: [],
            assignedRoutes: [],
            assignedOrders: [],
            supplierId: null
        };
        sessionStorage.removeItem('earlybird_currentUser');
    },
    
    // ========== PERMISSION CHECKS ==========
    
    /**
     * Check if user has permission
     * @param {string} permission - Permission name
     * @returns {boolean}
     */
    hasPermission(permission) {
        const user = this.getCurrentUser();
        if (!user.role) return false;
        
        const rolePermissions = this.permissions[user.role];
        if (!rolePermissions) return false;
        
        return rolePermissions[permission] === true;
    },
    
    /**
     * Check if user can view specific customer
     * @param {string} customerId
     * @returns {boolean}
     */
    canViewCustomer(customerId) {
        const user = this.getCurrentUser();
        
        // Admin can view all
        if (user.role === 'admin') return true;
        
        // Customer can only view themselves
        if (user.role === 'customer') return user.id === customerId;
        
        // Support can view assigned customers
        if (user.role === 'support') return user.assignedCustomers.includes(customerId);
        
        // Delivery can view assigned customers
        if (user.role === 'delivery') return user.assignedCustomers.includes(customerId);
        
        return false;
    },
    
    /**
     * Check if user can view specific order
     * @param {Object} order - Order object
     * @returns {boolean}
     */
    canViewOrder(order) {
        const user = this.getCurrentUser();
        
        // Admin can view all
        if (user.role === 'admin') return true;
        
        // Customer can view own orders
        if (user.role === 'customer') return order.customerId === user.id;
        
        // Support can view assigned customers' orders
        if (user.role === 'support') return user.assignedCustomers.includes(order.customerId);
        
        // Delivery can view assigned orders
        if (user.role === 'delivery') return user.assignedOrders.includes(order.id);
        
        // Supplier cannot view specific orders (sees demand aggregate only)
        if (user.role === 'supplier') return false;
        
        return false;
    },
    
    /**
     * Check if user can edit order
     * @param {Object} order - Order object
     * @returns {boolean}
     */
    canEditOrder(order) {
        const user = this.getCurrentUser();
        
        // Admin can edit all
        if (user.role === 'admin') return true;
        
        // Support can edit assigned customers' orders
        if (user.role === 'support') return user.assignedCustomers.includes(order.customerId);
        
        // Delivery can edit assigned orders
        if (user.role === 'delivery') return user.assignedOrders.includes(order.id);
        
        return false;
    },
    
    // ========== CALENDAR FILTERING ==========
    
    /**
     * Filter calendar events based on user role
     * @param {Object} events - Events object { 'YYYY-MM-DD': [events] }
     * @returns {Object} - Filtered events
     */
    filterCalendarEvents(events) {
        const user = this.getCurrentUser();
        const filtered = {};
        
        Object.keys(events).forEach(dateStr => {
            filtered[dateStr] = events[dateStr].filter(event => {
                return this.canViewEvent(event, user);
            });
        });
        
        return filtered;
    },
    
    /**
     * Check if user can view specific event
     * @param {Object} event - Event object
     * @param {Object} user - User object (optional, uses current user if not provided)
     * @returns {boolean}
     */
    canViewEvent(event, user = null) {
        if (!user) {
            user = this.getCurrentUser();
        }
        
        // Admin sees all events
        if (user.role === 'admin') {
            return true;
        }
        
        // Supplier sees only relevant order events
        if (user.role === 'supplier') {
            return event.type === 'order' || event.type === 'delivery';
        }
        
        // Support buddy sees assigned customers' events
        if (user.role === 'support') {
            return event.customerId && user.assignedCustomers.includes(event.customerId);
        }
        
        // Delivery buddy sees assigned delivery events
        if (user.role === 'delivery') {
            return event.type === 'delivery' && user.assignedOrders.includes(event.orderId);
        }
        
        // Customer sees own events
        if (user.role === 'customer') {
            return event.customerId === user.id;
        }
        
        return false;
    },
    
    /**
     * Filter events for display based on user role
     * Apply role-based access control to calendar events
     */
    applyRoleFiltering() {
        if (typeof EarlyBirdCalendar === 'undefined') return;
        
        const user = this.getCurrentUser();
        if (!user.role) {
            console.warn('No user role set for filtering');
            return;
        }
        
        // Get original events
        const originalEvents = EarlyBirdCalendar.state.events;
        
        // Filter based on role
        const filteredEvents = this.filterCalendarEvents(originalEvents);
        
        // Apply filtered events
        EarlyBirdCalendar.state.events = filteredEvents;
        
        // Recalculate delivery counts
        EarlyBirdCalendar.calculateDeliveryCounts();
        
        // Re-render
        EarlyBirdCalendar.render();
        EarlyBirdCalendar.renderDateDetails();
    },
    
    // ========== ORDER FILTERING ==========
    
    /**
     * Filter orders based on user role
     * @param {Array} orders - Array of order objects
     * @returns {Array} - Filtered orders
     */
    filterOrders(orders) {
        const user = this.getCurrentUser();
        
        return orders.filter(order => {
            return this.canViewOrder(order, user);
        });
    },
    
    /**
     * Get visible customers for user
     * @returns {Array} - Array of customer IDs
     */
    getVisibleCustomers() {
        const user = this.getCurrentUser();
        
        if (user.role === 'admin') {
            // Return all customers
            return EarlyBirdUtils.getMockCustomers().map(c => c.id);
        }
        
        if (user.role === 'support' || user.role === 'delivery') {
            return user.assignedCustomers;
        }
        
        if (user.role === 'customer') {
            return [user.id];
        }
        
        return [];
    },
    
    /**
     * Get visible orders for user
     * @returns {Array} - Array of order objects
     */
    getVisibleOrders() {
        if (typeof EarlyBirdOrders === 'undefined') {
            console.warn('EarlyBirdOrders not loaded');
            return [];
        }
        
        return this.filterOrders(EarlyBirdOrders.state.orders);
    },
    
    // ========== SUPPLIER FILTERING ==========
    
    /**
     * Check if supplier can view their own data
     * @param {string} supplierId
     * @returns {boolean}
     */
    canSupplierViewData(supplierId) {
        const user = this.getCurrentUser();
        
        if (user.role === 'admin') return true;
        if (user.role === 'supplier') return user.supplierId === supplierId;
        
        return false;
    },
    
    /**
     * Get demand forecast filtered for current supplier
     * @returns {Object} - Filtered forecast
     */
    getSupplierFilteredForecast() {
        const user = this.getCurrentUser();
        
        if (user.role !== 'supplier') {
            console.warn('Only suppliers can access forecast');
            return null;
        }
        
        if (typeof EarlyBirdSupplier === 'undefined') {
            console.warn('EarlyBirdSupplier not loaded');
            return null;
        }
        
        // Get forecast only for this supplier's products
        const forecast = EarlyBirdSupplier.getSupplierDemandForecast(user.supplierId, 7);
        
        return forecast;
    },
    
    // ========== STAFF FILTERING ==========
    
    /**
     * Check if staff member can view earnings
     * @param {string} staffId
     * @returns {boolean}
     */
    canViewStaffEarnings(staffId) {
        const user = this.getCurrentUser();
        
        if (user.role === 'admin') return true;
        if (user.role === 'support' || user.role === 'delivery') {
            return user.id === staffId; // Can only view own earnings
        }
        
        return false;
    },
    
    /**
     * Get filtered leaderboard (hide sensitive data based on role)
     * @returns {Array} - Filtered leaderboard
     */
    getFilteredLeaderboard() {
        const user = this.getCurrentUser();
        
        if (typeof EarlyBirdStaffWallet === 'undefined') {
            console.warn('EarlyBirdStaffWallet not loaded');
            return [];
        }
        
        let leaderboard = EarlyBirdStaffWallet.getLeaderboard(
            user.role === 'support' ? 'support' : 'delivery'
        );
        
        // If not admin, don't show withdrawal amounts or account details
        if (user.role !== 'admin') {
            leaderboard = leaderboard.map(entry => ({
                rank: entry.rank,
                name: entry.name,
                earnings: entry.earnings,
                ordersCompleted: entry.ordersCompleted
                // Don't include: account details, withdrawal status, etc.
            }));
        }
        
        return leaderboard;
    },
    
    // ========== UI HELPERS ==========
    
    /**
     * Update UI based on user role
     * Hide/show elements based on permissions
     */
    updateUIForRole() {
        const user = this.getCurrentUser();
        if (!user.role) return;
        
        // Hide admin-only elements for non-admin users
        document.querySelectorAll('[data-role-admin]').forEach(el => {
            el.style.display = user.role === 'admin' ? '' : 'none';
        });
        
        // Hide support-specific elements
        document.querySelectorAll('[data-role-support]').forEach(el => {
            el.style.display = user.role === 'support' || user.role === 'admin' ? '' : 'none';
        });
        
        // Hide delivery-specific elements
        document.querySelectorAll('[data-role-delivery]').forEach(el => {
            el.style.display = user.role === 'delivery' || user.role === 'admin' ? '' : 'none';
        });
        
        // Hide supplier-specific elements
        document.querySelectorAll('[data-role-supplier]').forEach(el => {
            el.style.display = user.role === 'supplier' || user.role === 'admin' ? '' : 'none';
        });
        
        // Hide customer-specific elements
        document.querySelectorAll('[data-role-customer]').forEach(el => {
            el.style.display = user.role === 'customer' ? '' : 'none';
        });
    },
    
    /**
     * Get role label for display
     * @param {string} role
     * @returns {string}
     */
    getRoleLabel(role) {
        const labels = {
            admin: '👨‍💼 Admin',
            support: '💬 Support Buddy',
            delivery: '🚚 Delivery Buddy',
            supplier: '🏭 Supplier',
            customer: '👤 Customer'
        };
        return labels[role] || role;
    },
    
    // ========== DEBUG HELPERS ==========
    
    /**
     * Get current user info (for debugging)
     * @returns {string}
     */
    getUserInfo() {
        const user = this.getCurrentUser();
        return `
            Role: ${user.role}
            Name: ${user.name}
            ID: ${user.id}
            Assigned Customers: ${user.assignedCustomers.length}
            Assigned Orders: ${user.assignedOrders.length}
            ${user.supplierId ? `Supplier ID: ${user.supplierId}` : ''}
        `;
    },
    
    /**
     * Test role-based access (for debugging)
     * @param {Object} testEvent - Event to test
     */
    testAccess(testEvent) {
        const user = this.getCurrentUser();
        console.log(`Testing access for ${user.role}:`);
        console.log(`Can view event: ${this.canViewEvent(testEvent, user)}`);
        console.log(`Can view customer: ${this.canViewCustomer(testEvent.customerId)}`);
        console.log(`User info:`, this.getUserInfo());
    }
};

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Try to load saved user from session
    const saved = sessionStorage.getItem('earlybird_currentUser');
    if (saved) {
        EarlyBirdAccessControl.currentUser = JSON.parse(saved);
    } else {
        // Default to customer for testing (can be changed by app)
        console.log('No user role found. Defaulting to customer.');
    }
});

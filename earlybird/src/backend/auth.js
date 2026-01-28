// ============================================
// Authentication & User Management Module
// Inspired by Emergent Code JWT Auth Pattern
// ============================================

const EarlyBirdAuth = (function() {
    'use strict';

    // State management
    const state = {
        users: {},
        sessions: {},
        currentUser: null
    };

    // User roles
    const ROLES = {
        ADMIN: 'admin',
        CUSTOMER: 'customer',
        DELIVERY_BOY: 'delivery_boy',
        MARKETING: 'marketing_staff',
        SUPPLIER: 'supplier'
    };

    // Initialize with demo users
    function init() {
        // Load from localStorage
        const savedUsers = localStorage.getItem('earlybird_users');
        if (savedUsers) {
            state.users = JSON.parse(savedUsers);
        }

        // Create demo users if no users exist
        if (Object.keys(state.users).length === 0) {
            createDemoUsers();
        }

        // Check for existing session
        const savedSession = localStorage.getItem('earlybird_session');
        if (savedSession) {
            state.currentUser = JSON.parse(savedSession);
        }

        console.log('EarlyBird Auth initialized', Object.keys(state.users).length, 'users');
        console.log('Demo users:', Object.values(state.users).map(u => u.email));
    }

    function debug() {
        return {
            users: Object.values(state.users).map(u => ({ email: u.email, role: u.role })),
            currentUser: state.currentUser,
            userCount: Object.keys(state.users).length
        };
    }

    function createDemoUsers() {
        // Admin user
        createUser({
            email: 'admin@earlybird.com',
            password: 'admin123',
            name: 'Admin User',
            phone: '9999999999',
            role: ROLES.ADMIN
        });

        // Customer users
        createUser({
            email: 'customer@test.com',
            password: 'customer123',
            name: 'Ramesh Kumar',
            phone: '9876543210',
            role: ROLES.CUSTOMER,
            metadata: {
                area: 'Kukatpally',
                address: 'Plot 123, KPHB Colony'
            }
        });

        // Delivery boy users
        createUser({
            email: 'delivery@earlybird.com',
            password: 'delivery123',
            name: 'Ravi Kumar',
            phone: '9876543200',
            role: ROLES.DELIVERY_BOY,
            metadata: {
                vehicle: 'Bike',
                areas: ['Kukatpally', 'KPHB']
            }
        });

        createUser({
            email: 'delivery2@earlybird.com',
            password: 'delivery123',
            name: 'Suresh Reddy',
            phone: '9876543201',
            role: ROLES.DELIVERY_BOY,
            metadata: {
                vehicle: 'Scooter',
                areas: ['Miyapur', 'Madhapur']
            }
        });

        // Marketing staff
        createUser({
            email: 'marketing@earlybird.com',
            password: 'marketing123',
            name: 'Vijay Kumar',
            phone: '9876543202',
            role: ROLES.MARKETING,
            metadata: {
                commission_rate: 5
            }
        });

        // Supplier
        createUser({
            email: 'supplier@earlybird.com',
            password: 'supplier123',
            name: 'Mother Dairy',
            phone: '9876543203',
            role: ROLES.SUPPLIER,
            metadata: {
                company: 'Mother Dairy',
                products: ['milk', 'curd', 'buttermilk']
            }
        });

        saveUsers();
    }

    function createUser(userData) {
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const user = {
            id: userId,
            email: userData.email,
            password: hashPassword(userData.password), // Simple hash for demo
            name: userData.name,
            phone: userData.phone,
            role: userData.role,
            metadata: userData.metadata || {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true
        };

        state.users[userId] = user;
        saveUsers();

        // Auto-create payment link for customers
        if (userData.role === ROLES.CUSTOMER && typeof EarlyBirdPaymentLinks !== 'undefined') {
            EarlyBirdPaymentLinks.createPaymentLink(userId, userData.name, userData.phone);
            console.log(`💳 Auto-created payment link for customer ${userId}`);
        }

        return userId;
    }

    function hashPassword(password) {
        // Simple hash for demo (in production, use bcrypt or similar)
        // This is just for demonstration purposes
        return btoa(password);
    }

    function verifyPassword(password, hashedPassword) {
        return btoa(password) === hashedPassword;
    }

    function login(email, password) {
        // Find user by email
        const user = Object.values(state.users).find(u => u.email === email);

        if (!user) {
            return {
                success: false,
                message: 'User not found'
            };
        }

        if (!user.isActive) {
            return {
                success: false,
                message: 'Account is inactive'
            };
        }

        // Verify password
        if (!verifyPassword(password, user.password)) {
            return {
                success: false,
                message: 'Invalid password'
            };
        }

        // Create session
        const session = {
            userId: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            metadata: user.metadata,
            loginTime: new Date().toISOString(),
            token: generateToken(user)
        };

        state.currentUser = session;
        localStorage.setItem('earlybird_session', JSON.stringify(session));

        console.log('Login successful:', user.email, 'Role:', user.role);

        return {
            success: true,
            user: session,
            redirectUrl: getRedirectUrl(user.role)
        };
    }

    function logout() {
        state.currentUser = null;
        localStorage.removeItem('earlybird_session');
        console.log('User logged out');
    }

    function generateToken(user) {
        // Simple token generation (in production, use JWT)
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        };
        return btoa(JSON.stringify(payload));
    }

    function getRedirectUrl(role) {
        const roleUrls = {
            [ROLES.ADMIN]: 'admin.html',
            [ROLES.CUSTOMER]: 'customer.html',
            [ROLES.DELIVERY_BOY]: 'delivery.html',
            [ROLES.MARKETING]: 'admin.html',
            [ROLES.SUPPLIER]: 'supplier.html'
        };
        return roleUrls[role] || 'index.html';
    }

    function getCurrentUser() {
        return state.currentUser;
    }

    function isAuthenticated() {
        return state.currentUser !== null;
    }

    function hasRole(role) {
        return state.currentUser && state.currentUser.role === role;
    }

    function requireAuth() {
        if (!isAuthenticated()) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }

    function requireRole(role) {
        if (!requireAuth()) return false;

        if (!hasRole(role)) {
            alert('Access denied. You do not have permission to access this page.');
            window.location.href = getRedirectUrl(state.currentUser.role);
            return false;
        }

        return true;
    }

    function getAllUsers() {
        return Object.values(state.users).map(user => ({
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt
        }));
    }

    function getUserById(userId) {
        const user = state.users[userId];
        if (!user) return null;

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            role: user.role,
            metadata: user.metadata,
            isActive: user.isActive,
            createdAt: user.createdAt
        };
    }

    function getUsersByRole(role) {
        return Object.values(state.users)
            .filter(u => u.role === role)
            .map(user => ({
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                role: user.role,
                metadata: user.metadata,
                isActive: user.isActive
            }));
    }

    function updateUser(userId, updates) {
        const user = state.users[userId];
        if (!user) {
            return {
                success: false,
                message: 'User not found'
            };
        }

        // Update allowed fields
        const allowedFields = ['name', 'phone', 'metadata', 'isActive'];
        allowedFields.forEach(field => {
            if (updates.hasOwnProperty(field)) {
                user[field] = updates[field];
            }
        });

        user.updatedAt = new Date().toISOString();
        saveUsers();

        return {
            success: true,
            message: 'User updated successfully',
            user: getUserById(userId)
        };
    }

    function deleteUser(userId) {
        if (!state.users[userId]) {
            return {
                success: false,
                message: 'User not found'
            };
        }

        delete state.users[userId];
        saveUsers();

        return {
            success: true,
            message: 'User deleted successfully'
        };
    }

    function changePassword(userId, oldPassword, newPassword) {
        const user = state.users[userId];
        if (!user) {
            return {
                success: false,
                message: 'User not found'
            };
        }

        if (!verifyPassword(oldPassword, user.password)) {
            return {
                success: false,
                message: 'Current password is incorrect'
            };
        }

        user.password = hashPassword(newPassword);
        user.updatedAt = new Date().toISOString();
        saveUsers();

        return {
            success: true,
            message: 'Password changed successfully'
        };
    }

    function saveUsers() {
        localStorage.setItem('earlybird_users', JSON.stringify(state.users));
    }

    function resetPassword(email) {
        const user = Object.values(state.users).find(u => u.email === email);

        if (!user) {
            return {
                success: false,
                message: 'User not found'
            };
        }

        // In production, send email with reset link
        // For demo, just reset to a default password
        const tempPassword = 'reset123';
        user.password = hashPassword(tempPassword);
        user.updatedAt = new Date().toISOString();
        saveUsers();

        console.log(`Password reset for ${email}. Temporary password: ${tempPassword}`);

        return {
            success: true,
            message: 'Password reset successful. Temporary password: reset123',
            tempPassword
        };
    }

    // OTP-based authentication (for customers without email)
    function sendOTP(phone) {
        // In production, integrate with SMS service
        // For demo, generate a fixed OTP
        const otp = '123456';

        console.log(`OTP sent to ${phone}: ${otp}`);

        // Store OTP temporarily (in production, use server-side storage with expiry)
        const otpData = {
            phone,
            otp,
            expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
        };

        sessionStorage.setItem(`otp_${phone}`, JSON.stringify(otpData));

        return {
            success: true,
            message: 'OTP sent successfully',
            otp // Only for demo, don't return in production
        };
    }

    function verifyOTP(phone, otp) {
        const otpDataStr = sessionStorage.getItem(`otp_${phone}`);

        if (!otpDataStr) {
            return {
                success: false,
                message: 'OTP not found or expired'
            };
        }

        const otpData = JSON.parse(otpDataStr);

        if (Date.now() > otpData.expiresAt) {
            sessionStorage.removeItem(`otp_${phone}`);
            return {
                success: false,
                message: 'OTP expired'
            };
        }

        if (otpData.otp !== otp) {
            return {
                success: false,
                message: 'Invalid OTP'
            };
        }

        // Find user by phone
        const user = Object.values(state.users).find(u => u.phone === phone);

        if (!user) {
            return {
                success: false,
                message: 'User not found'
            };
        }

        // Clear OTP
        sessionStorage.removeItem(`otp_${phone}`);

        // Create session
        const session = {
            userId: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            metadata: user.metadata,
            loginTime: new Date().toISOString(),
            token: generateToken(user)
        };

        state.currentUser = session;
        localStorage.setItem('earlybird_session', JSON.stringify(session));

        return {
            success: true,
            user: session,
            redirectUrl: getRedirectUrl(user.role)
        };
    }

    // Public API
    return {
        init,
        debug,
        login,
        logout,
        createUser,
        getCurrentUser,
        isAuthenticated,
        hasRole,
        requireAuth,
        requireRole,
        getAllUsers,
        getUserById,
        getUsersByRole,
        updateUser,
        deleteUser,
        changePassword,
        resetPassword,
        sendOTP,
        verifyOTP,
        getRedirectUrl,
        ROLES
    };
})();

// Auto-initialize
if (typeof window !== 'undefined') {
    EarlyBirdAuth.init();
}

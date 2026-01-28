// ============================================
// EarlyBird Utils - Core Utilities
// Production-Ready Helper Functions
// ============================================

const EarlyBirdUtils = {
    
    // ========== DATE UTILITIES ==========

    // formatDate implemented once later in the file with extended formats (month-year, short-month)
    // This alias ensures backward compatibility
    formatDate(date, format = 'short') {
        // Call the later unified implementation (defined below)
        const d = typeof date === 'string' ? new Date(date) : date;
        const formats = {
            short: { day: '2-digit', month: 'short', year: 'numeric' },
            long: { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' },
            full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
            time: { hour: '2-digit', minute: '2-digit', hour12: true },
            datetime: { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' },
            'month-year': { month: 'long', year: 'numeric' },
            'short-month': { month: 'short' }
        };

        return d.toLocaleDateString('en-IN', formats[format] || formats.short);
    },
    
    /**
     * Check if two dates are the same day
     */
    isSameDay(date1, date2) {
        const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
        const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
        
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    },
    
    /**
     * Get date string in YYYY-MM-DD format
     */
    getDateString(date) {
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toISOString().split('T')[0];
    },

    /**
     * Get month key YYYY-MM for a date
     * @param {Date} date
     * @returns {string}
     */
    getMonthKey(date) {
        const d = typeof date === 'string' ? new Date(date) : date;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    },

    /**
     * Add months to a date
     * @param {Date} date
     * @param {number} n
     * @returns {Date}
     */
    addMonths(date, n) {
        const d = new Date(date);
        d.setMonth(d.getMonth() + n);
        return d;
    },
    
    /**
     * Add days to a date
     */
    addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    },
    
    /**
     * Get relative date string (Today, Tomorrow, Yesterday, etc.)
     */
    getRelativeDateString(date) {
        const d = typeof date === 'string' ? new Date(date) : date;
        const today = new Date();
        const tomorrow = this.addDays(today, 1);
        const yesterday = this.addDays(today, -1);
        
        if (this.isSameDay(d, today)) return 'Today';
        if (this.isSameDay(d, tomorrow)) return 'Tomorrow';
        if (this.isSameDay(d, yesterday)) return 'Yesterday';
        
        return this.formatDate(d, 'short');
    },
    
    // ========== CURRENCY UTILITIES ==========
    
    /**
     * Format amount as Indian currency
     */
    formatCurrency(amount, showDecimals = false) {
        const formatted = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: showDecimals ? 2 : 0,
            maximumFractionDigits: showDecimals ? 2 : 0
        }).format(amount);
        
        return formatted;
    },
    
    /**
     * Format number with Indian numbering system (lakhs, crores)
     */
    formatIndianNumber(num) {
        return new Intl.NumberFormat('en-IN').format(num);
    },
    
    // ========== TOAST NOTIFICATIONS ==========
    
    /**
     * Show toast notification
     * @param {string} message - Message to display
     * @param {string} type - 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duration in ms (default 3000)
     */
    showToast(message, type = 'info', duration = 3000) {
        // Create toast container if it doesn't exist
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        
        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Info'
        };
        
        toast.innerHTML = `
            <div class="toast-icon">${icons[type]}</div>
            <div class="toast-content">
                <div class="toast-title">${titles[type]}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
        `;
        
        container.appendChild(toast);
        
        // Auto remove after duration
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },
    
    // ========== MODAL MANAGEMENT ==========
    
    /**
     * Open modal
     */
    openModal(modalId) {
        const backdrop = document.getElementById(modalId + 'Backdrop');
        if (backdrop) {
            backdrop.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    },
    
    /**
     * Close modal
     */
    closeModal(modalId) {
        const backdrop = document.getElementById(modalId + 'Backdrop');
        if (backdrop) {
            backdrop.classList.remove('active');
            document.body.style.overflow = '';
        }
    },
    
    /**
     * Create modal programmatically
     */
    createModal(options) {
        const {
            id,
            title,
            content,
            footer,
            size = 'md' // 'sm', 'md', 'lg'
        } = options;
        
        const backdrop = document.createElement('div');
        backdrop.id = id + 'Backdrop';
        backdrop.className = 'modal-backdrop';
        
        backdrop.innerHTML = `
            <div class="modal modal-${size}">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="modal-close" onclick="EarlyBirdUtils.closeModal('${id}')">✕</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
            </div>
        `;
        
        // Close on backdrop click
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                this.closeModal(id);
            }
        });
        
        document.body.appendChild(backdrop);
        return backdrop;
    },
    
    // ========== LOCAL STORAGE ==========
    
    /**
     * Save to local storage with JSON stringification
     */
    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Error saving to storage:', e);
            return false;
        }
    },
    
    /**
     * Load from local storage with JSON parsing
     */
    loadFromStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Error loading from storage:', e);
            return defaultValue;
        }
    },
    
    /**
     * Remove from local storage
     */
    removeFromStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Error removing from storage:', e);
            return false;
        }
    },
    
    // ========== DATA SIMULATION (Mock API) ==========
    
    /**
     * Simulate API delay
     */
    async simulateDelay(ms = 500) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    /**
     * Generate unique ID
     */
    generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },
    
    /**
     * Get mock customer data
     */
    getMockCustomers() {
        return [
            { id: 'C001', name: 'Ramesh Kumar', phone: '9876543210', address: 'HSR Layout, Sector 2, #123', area: 'HSR Layout', trustScore: 85 },
            { id: 'C002', name: 'Priya Sharma', phone: '9876543211', address: 'Koramangala 5th Block, #456', area: 'Koramangala', trustScore: 92 },
            { id: 'C003', name: 'Amit Patel', phone: '9876543212', address: 'Indiranagar 100 Feet Road, #789', area: 'Indiranagar', trustScore: 78 },
            { id: 'C004', name: 'Sunita Reddy', phone: '9876543213', address: 'Whitefield Main Road, #234', area: 'Whitefield', trustScore: 95 },
            { id: 'C005', name: 'Rajesh Singh', phone: '9876543214', address: 'Jayanagar 4th Block, #567', area: 'Jayanagar', trustScore: 88 }
        ];
    },
    
    /**
     * Get mock products
     */
    getMockProducts() {
        return [
            { id: 'P001', name: 'Milk 500ml', category: 'Dairy', price: 25, unit: 'bottle', stock: 500, timeBound: true },
            { id: 'P002', name: 'Milk 1L', category: 'Dairy', price: 48, unit: 'bottle', stock: 300, timeBound: true },
            { id: 'P003', name: 'Bread', category: 'Bakery', price: 35, unit: 'packet', stock: 200, timeBound: true },
            { id: 'P004', name: 'Eggs 6pc', category: 'Dairy', price: 42, unit: 'tray', stock: 150, timeBound: false },
            { id: 'P005', name: 'Water Can 20L', category: 'Beverages', price: 60, unit: 'can', stock: 100, timeBound: false },
            { id: 'P006', name: 'Basmati Rice 1kg', category: 'Groceries', price: 120, unit: 'kg', stock: 80, timeBound: false },
            { id: 'P007', name: 'Toor Dal 1kg', category: 'Groceries', price: 140, unit: 'kg', stock: 60, timeBound: false },
            { id: 'P008', name: 'Sunflower Oil 1L', category: 'Groceries', price: 180, unit: 'bottle', stock: 90, timeBound: false },
            { id: 'P009', name: 'Atta 5kg', category: 'Groceries', price: 250, unit: 'kg', stock: 70, timeBound: false },
            { id: 'P010', name: 'Sugar 1kg', category: 'Groceries', price: 50, unit: 'kg', stock: 120, timeBound: false }
        ];
    },
    
    // ========== VALIDATION ==========
    
    /**
     * Validate Indian mobile number
     */
    validateMobile(mobile) {
        const pattern = /^[6-9]\d{9}$/;
        return pattern.test(mobile);
    },
    
    /**
     * Validate email
     */
    validateEmail(email) {
        const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return pattern.test(email);
    },
    
    /**
     * Validate non-empty string
     */
    validateRequired(value) {
        return value && value.trim().length > 0;
    },
    
    // ========== STRING UTILITIES ==========
    
    /**
     * Truncate string with ellipsis
     */
    truncate(str, length = 50) {
        if (str.length <= length) return str;
        return str.substring(0, length) + '...';
    },
    
    /**
     * Capitalize first letter
     */
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },
    
    /**
     * Generate initials from name
     */
    getInitials(name) {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    },
    
    // ========== ARRAY UTILITIES ==========
    
    /**
     * Group array by key
     */
    groupBy(array, key) {
        return array.reduce((result, item) => {
            const group = item[key];
            if (!result[group]) {
                result[group] = [];
            }
            result[group].push(item);
            return result;
        }, {});
    },
    
    /**
     * Sort array by key
     */
    sortBy(array, key, order = 'asc') {
        return [...array].sort((a, b) => {
            if (order === 'asc') {
                return a[key] > b[key] ? 1 : -1;
            } else {
                return a[key] < b[key] ? 1 : -1;
            }
        });
    },
    
    // ========== DEBOUNCE & THROTTLE ==========
    
    /**
     * Debounce function
     */
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    /**
     * Throttle function
     */
    throttle(func, limit = 300) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // ========== WHATSAPP INTEGRATION ==========
    
    /**
     * Generate WhatsApp message link
     */
    generateWhatsAppLink(phone, message) {
        const cleanPhone = phone.replace(/\D/g, '');
        const encodedMessage = encodeURIComponent(message);
        return `https://wa.me/91${cleanPhone}?text=${encodedMessage}`;
    },
    
    /**
     * Send order confirmation via WhatsApp
     */
    sendOrderConfirmation(order) {
        const message = `
🌅 *EarlyBird Order Confirmation*

Order ID: ${order.id}
Date: ${this.formatDate(order.date, 'long')}
Delivery: ${order.slot === 'am' ? 'Morning (6-9 AM)' : 'Evening (5-8 PM)'}

*Items:*
${order.items.map(item => `• ${item.name} x ${item.quantity} - ${this.formatCurrency(item.price * item.quantity)}`).join('\n')}

*Total: ${this.formatCurrency(order.total)}*

Thank you for your order! 🙏
        `.trim();
        
        const link = this.generateWhatsAppLink(order.customerPhone, message);
        window.open(link, '_blank');
    },
    
    // ========== PAYMENT LINK ==========
    
    /**
     * Generate permanent UPI payment link for customer
     */
    generatePaymentLink(customerId) {
        return `pay.earlybird.app/c/${customerId}`;
    },
    
    /**
     * Copy to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Copied to clipboard!', 'success', 2000);
            return true;
        } catch (err) {
            console.error('Failed to copy:', err);
            this.showToast('Failed to copy', 'error', 2000);
            return false;
        }
    }
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EarlyBirdUtils;
}

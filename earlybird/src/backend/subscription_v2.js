// ============================================
// EarlyBird Subscription Engine V2 (Hybrid)
// Combines original UI/Calendar integration with Python reference code's advanced logic
// ============================================

const EarlyBirdSubscriptionV2 = {

    // ========== STATE ==========
    state: {
        subscriptions: [],  // Array of subscription objects
        products: [],       // Available products
        customers: []       // Customer list with status
    },

    // ========== SUBSCRIPTION MODES (Enhanced) ==========
    MODES: {
        FIXED_DAILY: 'fixed_daily',        // Fixed quantity every day
        WEEKLY_PATTERN: 'weekly_pattern',  // Specific days of week [0-6]
        DAY_BY_DAY: 'day_by_day',          // Manual day-by-day overrides
        IRREGULAR: 'irregular',            // Irregular list of dates
        ONE_TIME: 'one_time',              // One-time delivery (date range)
        BIWEEKLY: 'biweekly',              // Every 2 weeks
        MONTHLY: 'monthly'                 // Monthly on specific day
    },

    // ========== STATUS TYPES (Enhanced) ==========
    STATUS: {
        DRAFT: 'draft',       // Not yet active (planning phase)
        ACTIVE: 'active',     // Currently delivering
        PAUSED: 'paused',     // Temporarily paused
        STOPPED: 'stopped'    // Permanently stopped
    },

    // ========== CUSTOMER STATUS ==========
    CUSTOMER_STATUS: {
        ACTIVE: 'active',
        TRIAL: 'trial',
        INACTIVE: 'inactive'
    },

    // ========== INITIALIZATION ==========

    init() {
        this.loadSubscriptions();
        this.loadProducts();
        this.loadCustomers();
        console.log('EarlyBird Subscription V2 initialized');
    },

    loadSubscriptions() {
        this.state.subscriptions = EarlyBirdUtils.loadFromStorage('earlybird_subscriptions_v2', []);
    },

    saveSubscriptions() {
        EarlyBirdUtils.saveToStorage('earlybird_subscriptions_v2', this.state.subscriptions);
    },

    loadProducts() {
        this.state.products = EarlyBirdUtils.getMockProducts();
    },

    loadCustomers() {
        // Load customers or use mock data
        this.state.customers = EarlyBirdUtils.loadFromStorage('earlybird_customers', []);
    },

    // ========== CORE ALGORITHM: COMPUTE QUANTITY (From Python Reference) ==========

    /**
     * Master algorithm to compute delivery quantity for a specific date
     *
     * Priority Order (Top to bottom):
     * 1. Draft → 0
     * 2. Stopped → 0
     * 3. Stop date → 0
     * 4. Pause intervals → 0
     * 5. Irregular list → qty
     * 6. Day overrides → qty
     * 7. Weekly pattern → qty
     * 8. One-time mode → qty
     * 9. Fixed daily → qty
     * 10. Day-by-day without override → 0
     * 11. Else → 0
     *
     * @param {string} dateStr - Date in YYYY-MM-DD format
     * @param {Object} subscription - Subscription object
     * @returns {number} Quantity for the date (0 if no delivery)
     */
    computeQuantity(dateStr, subscription) {
        const targetDate = new Date(dateStr);

        // Priority 1: Draft subscriptions never deliver
        if (subscription.status === this.STATUS.DRAFT) {
            return 0;
        }

        // Priority 2: Stopped subscriptions never deliver
        if (subscription.status === this.STATUS.STOPPED) {
            return 0;
        }

        // Priority 3: Check stop date (permanent stop)
        if (subscription.stopDate) {
            const stopDate = new Date(subscription.stopDate);
            if (targetDate >= stopDate) {
                return 0;
            }
        }

        // Priority 4: Check pause intervals (temporary pause)
        if (subscription.pauseIntervals && subscription.pauseIntervals.length > 0) {
            for (const interval of subscription.pauseIntervals) {
                const startDate = new Date(interval.start);
                // If end is null, pause is indefinite (until manually resumed)
                const endDate = interval.end ? new Date(interval.end) : new Date('9999-12-31');

                if (targetDate >= startDate && targetDate <= endDate) {
                    return 0;
                }
            }
        }

        // Priority 5: Check irregular list (specific dates with quantities)
        if (subscription.irregularList && subscription.irregularList.length > 0) {
            for (const irregular of subscription.irregularList) {
                if (irregular.date === dateStr) {
                    return parseFloat(irregular.quantity) || 0;
                }
            }
        }

        // Priority 6: Check day overrides (day-by-day mode)
        if (subscription.dayOverrides && subscription.dayOverrides.length > 0) {
            for (const override of subscription.dayOverrides) {
                if (override.date === dateStr) {
                    return parseFloat(override.quantity) || 0;
                }
            }
        }

        // Priority 7: Weekly pattern mode
        if (subscription.mode === this.MODES.WEEKLY_PATTERN) {
            if (subscription.weeklyPattern && subscription.weeklyPattern.length > 0) {
                const weekday = targetDate.getDay(); // 0=Sunday, 6=Saturday
                if (subscription.weeklyPattern.includes(weekday)) {
                    return parseFloat(subscription.defaultQuantity) || 0;
                }
                return 0;
            }
        }

        // Priority 8: One-time mode (date range)
        if (subscription.mode === this.MODES.ONE_TIME) {
            if (subscription.startDate && subscription.endDate) {
                const startDate = new Date(subscription.startDate);
                const endDate = new Date(subscription.endDate);

                if (targetDate >= startDate && targetDate <= endDate) {
                    return parseFloat(subscription.quantity) || parseFloat(subscription.defaultQuantity) || 0;
                }
            }
            return 0;
        }

        // Priority 9: Fixed daily mode
        if (subscription.mode === this.MODES.FIXED_DAILY) {
            return parseFloat(subscription.defaultQuantity) || 0;
        }

        // Priority 10: Biweekly mode
        if (subscription.mode === this.MODES.BIWEEKLY) {
            const startDate = new Date(subscription.startDate);
            const daysSinceStart = Math.floor((targetDate - startDate) / (1000 * 60 * 60 * 24));
            if (daysSinceStart >= 0 && daysSinceStart % 14 === 0) {
                return parseFloat(subscription.defaultQuantity) || 0;
            }
            return 0;
        }

        // Priority 11: Monthly mode
        if (subscription.mode === this.MODES.MONTHLY) {
            const renewalDay = subscription.renewalDay || 1;
            if (targetDate.getDate() === renewalDay) {
                return parseFloat(subscription.defaultQuantity) || 0;
            }
            return 0;
        }

        // Priority 12: Day-by-day mode without override = 0
        if (subscription.mode === this.MODES.DAY_BY_DAY) {
            return 0;
        }

        // Priority 13: Irregular mode without entry = 0
        if (subscription.mode === this.MODES.IRREGULAR) {
            return 0;
        }

        // Default: No delivery
        return 0;
    },

    // ========== DELIVERY DATE CHECKING (Enhanced) ==========

    /**
     * Check if a date is a delivery date for this subscription
     * Uses the priority-based computeQuantity algorithm
     */
    isDeliveryDate(subscription, date) {
        const dateStr = EarlyBirdUtils.getDateString(date);
        const quantity = this.computeQuantity(dateStr, subscription);
        return quantity > 0;
    },

    /**
     * Get next delivery date from a given date
     */
    getNextDeliveryDate(subscription, fromDate = new Date()) {
        let checkDate = new Date(fromDate);
        checkDate.setHours(0, 0, 0, 0);

        // Check up to 90 days in the future
        for (let i = 0; i < 90; i++) {
            if (this.isDeliveryDate(subscription, checkDate)) {
                return checkDate;
            }
            checkDate = EarlyBirdUtils.addDays(checkDate, 1);
        }

        return null;
    },

    /**
     * Get upcoming deliveries with quantities (next N days)
     */
    getUpcomingDeliveries(subscription, days = 30) {
        const deliveries = [];
        let checkDate = new Date();
        checkDate.setHours(0, 0, 0, 0);

        for (let i = 0; i < days; i++) {
            const dateStr = EarlyBirdUtils.getDateString(checkDate);
            const quantity = this.computeQuantity(dateStr, subscription);

            if (quantity > 0) {
                deliveries.push({
                    date: new Date(checkDate),
                    dateStr: dateStr,
                    quantity: quantity
                });
            }

            checkDate = EarlyBirdUtils.addDays(checkDate, 1);
        }

        return deliveries;
    },

    // ========== ELIGIBILITY VALIDATION (From Python Reference) ==========

    /**
     * Check if subscription is eligible for delivery generation
     *
     * Requirements:
     * 1. Customer status = "active" OR "trial" (for one-time subscriptions)
     * 2. Subscription status = "active" (NOT draft/stopped/paused)
     * 3. Subscription autoStart = true
     *
     * @param {Object} customer - Customer object
     * @param {Object} subscription - Subscription object
     * @returns {boolean} True if eligible, False otherwise
     */
    isDeliveryEligible(customer, subscription) {
        // Allow trial customers for one-time subscriptions
        const customerStatus = customer?.status || this.CUSTOMER_STATUS.INACTIVE;

        if (subscription.mode === this.MODES.ONE_TIME) {
            if (![this.CUSTOMER_STATUS.ACTIVE, this.CUSTOMER_STATUS.TRIAL].includes(customerStatus)) {
                return false;
            }
        } else {
            if (customerStatus !== this.CUSTOMER_STATUS.ACTIVE) {
                return false;
            }
        }

        if (subscription.status !== this.STATUS.ACTIVE) {
            return false;
        }

        if (!subscription.autoStart) {
            return false;
        }

        return true;
    },

    // ========== VALIDATION (From Python Reference) ==========

    /**
     * Validate subscription data before saving
     *
     * @param {Object} subscription - Subscription object
     * @returns {Object} { isValid: boolean, error: string|null }
     */
    validateSubscription(subscription) {
        // Required fields
        if (!subscription.customerId) {
            return { isValid: false, error: 'Customer ID is required' };
        }

        if (!subscription.mode) {
            return { isValid: false, error: 'Subscription mode is required' };
        }

        // Mode-specific validation
        const mode = subscription.mode;

        if (mode === this.MODES.WEEKLY_PATTERN) {
            const pattern = subscription.weeklyPattern;
            if (!pattern || !Array.isArray(pattern) || pattern.length === 0) {
                return { isValid: false, error: 'Weekly pattern must be a non-empty array of weekday numbers (0-6)' };
            }
            if (!pattern.every(day => Number.isInteger(day) && day >= 0 && day <= 6)) {
                return { isValid: false, error: 'Weekly pattern must contain only numbers 0-6 (Sun-Sat)' };
            }
        }

        if ([this.MODES.FIXED_DAILY, this.MODES.WEEKLY_PATTERN, this.MODES.BIWEEKLY, this.MODES.MONTHLY].includes(mode)) {
            if (!subscription.defaultQuantity || subscription.defaultQuantity <= 0) {
                return { isValid: false, error: `${mode} mode requires a positive defaultQuantity` };
            }
        }

        // Status validation
        const status = subscription.status || this.STATUS.DRAFT;
        if (!Object.values(this.STATUS).includes(status)) {
            return { isValid: false, error: 'Invalid status. Must be: draft, active, paused, or stopped' };
        }

        // If active, product and price required
        if (status === this.STATUS.ACTIVE) {
            if (!subscription.productId) {
                return { isValid: false, error: 'Product ID required for active subscription' };
            }
            if (!subscription.price || subscription.price <= 0) {
                return { isValid: false, error: 'Price required for active subscription' };
            }
        }

        return { isValid: true, error: null };
    },

    // ========== SUBSCRIPTION CRUD (Enhanced) ==========

    /**
     * Create new subscription (Enhanced)
     */
    create(data) {
        const subscription = {
            id: EarlyBirdUtils.generateId(),
            customerId: data.customerId,
            customerName: data.customerName,
            productId: data.productId,
            productName: data.productName,

            // Core fields
            mode: data.mode || this.MODES.FIXED_DAILY,
            status: data.status || this.STATUS.DRAFT, // Default to draft
            quantity: data.quantity || 1,
            defaultQuantity: data.defaultQuantity || data.quantity || 1,
            price: data.price,

            // Weekly pattern (for WEEKLY_PATTERN mode)
            weeklyPattern: data.weeklyPattern || [], // [0,1,2,3,4,5,6] where 0=Sunday

            // Day overrides (for DAY_BY_DAY mode)
            dayOverrides: data.dayOverrides || [], // [{date: 'YYYY-MM-DD', quantity: N}]

            // Irregular list (for IRREGULAR mode)
            irregularList: data.irregularList || [], // [{date: 'YYYY-MM-DD', quantity: N}]

            // Delivery settings
            deliveryWindow: data.deliveryWindow || 'am',
            deliveryTime: data.deliveryTime || null,

            // Schedule
            startDate: data.startDate || EarlyBirdUtils.getDateString(new Date()),
            endDate: data.endDate || null, // null = indefinite
            stopDate: data.stopDate || null, // Permanent stop date

            // Pause intervals (Enhanced: supports multiple intervals and indefinite pause)
            pauseIntervals: data.pauseIntervals || [], // [{start: 'YYYY-MM-DD', end: 'YYYY-MM-DD'|null}]

            // Backward compatibility with old skipDates
            skipDates: data.skipDates || [], // Deprecated in favor of dayOverrides

            // Auto-start flag
            autoStart: data.autoStart !== false, // Default true

            // Monthly renewal day
            renewalDay: data.renewalDay || 1,

            // Metadata
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: data.createdBy || 'system',
            notes: data.notes || ''
        };

        // Validate before saving
        const validation = this.validateSubscription(subscription);
        if (!validation.isValid) {
            EarlyBirdUtils.showToast(validation.error, 'error');
            return null;
        }

        this.state.subscriptions.push(subscription);
        this.saveSubscriptions();

        // Only schedule deliveries if status is active
        if (subscription.status === this.STATUS.ACTIVE) {
            this.scheduleDeliveries(subscription);
        }

        EarlyBirdUtils.showToast('Subscription created successfully', 'success');
        return subscription;
    },

    /**
     * Update existing subscription (Enhanced)
     */
    update(id, updates) {
        const index = this.state.subscriptions.findIndex(s => s.id === id);
        if (index === -1) {
            EarlyBirdUtils.showToast('Subscription not found', 'error');
            return null;
        }

        const updatedSubscription = {
            ...this.state.subscriptions[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        // Validate before saving
        const validation = this.validateSubscription(updatedSubscription);
        if (!validation.isValid) {
            EarlyBirdUtils.showToast(validation.error, 'error');
            return null;
        }

        this.state.subscriptions[index] = updatedSubscription;
        this.saveSubscriptions();

        // Reschedule deliveries
        this.rescheduleDeliveries(updatedSubscription);

        EarlyBirdUtils.showToast('Subscription updated successfully', 'success');
        return updatedSubscription;
    },

    /**
     * Delete subscription
     */
    delete(id) {
        const index = this.state.subscriptions.findIndex(s => s.id === id);
        if (index === -1) {
            EarlyBirdUtils.showToast('Subscription not found', 'error');
            return false;
        }

        // Remove scheduled deliveries
        this.removeScheduledDeliveries(this.state.subscriptions[index]);

        this.state.subscriptions.splice(index, 1);
        this.saveSubscriptions();

        EarlyBirdUtils.showToast('Subscription deleted', 'success');
        return true;
    },

    /**
     * Get subscription by ID
     */
    get(id) {
        return this.state.subscriptions.find(s => s.id === id);
    },

    /**
     * Get all subscriptions for a customer
     */
    getByCustomer(customerId) {
        return this.state.subscriptions.filter(s => s.customerId === customerId);
    },

    /**
     * Get active subscriptions (Enhanced: excludes draft and stopped)
     */
    getActive() {
        return this.state.subscriptions.filter(s => s.status === this.STATUS.ACTIVE);
    },

    /**
     * Get draft subscriptions
     */
    getDrafts() {
        return this.state.subscriptions.filter(s => s.status === this.STATUS.DRAFT);
    },

    // ========== PAUSE/RESUME (Enhanced with intervals) ==========

    /**
     * Pause subscription with optional date range
     * @param {string} id - Subscription ID
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string|null} endDate - End date (YYYY-MM-DD) or null for indefinite
     * @param {string} reason - Reason for pause
     */
    pause(id, startDate = null, endDate = null, reason = '') {
        const subscription = this.get(id);
        if (!subscription) {
            EarlyBirdUtils.showToast('Subscription not found', 'error');
            return false;
        }

        const start = startDate || EarlyBirdUtils.getDateString(new Date());

        // Add pause interval
        if (!subscription.pauseIntervals) {
            subscription.pauseIntervals = [];
        }

        subscription.pauseIntervals.push({
            start: start,
            end: endDate, // null = indefinite
            reason: reason
        });

        subscription.status = this.STATUS.PAUSED;
        subscription.updatedAt = new Date().toISOString();

        this.saveSubscriptions();

        // Remove future deliveries during pause period
        this.rescheduleDeliveries(subscription);

        const pauseMsg = endDate
            ? `Subscription paused from ${start} to ${endDate}`
            : `Subscription paused from ${start} (indefinite)`;
        EarlyBirdUtils.showToast(pauseMsg, 'info');
        return true;
    },

    /**
     * Resume subscription (removes last indefinite pause or makes current)
     */
    resume(id) {
        const subscription = this.get(id);
        if (!subscription) {
            EarlyBirdUtils.showToast('Subscription not found', 'error');
            return false;
        }

        // Find and end the last indefinite pause
        if (subscription.pauseIntervals && subscription.pauseIntervals.length > 0) {
            const lastInterval = subscription.pauseIntervals[subscription.pauseIntervals.length - 1];
            if (!lastInterval.end) {
                lastInterval.end = EarlyBirdUtils.getDateString(new Date());
            }
        }

        subscription.status = this.STATUS.ACTIVE;
        subscription.updatedAt = new Date().toISOString();

        this.saveSubscriptions();

        // Reschedule deliveries from today
        this.scheduleDeliveries(subscription, new Date());

        EarlyBirdUtils.showToast('Subscription resumed', 'success');
        return true;
    },

    /**
     * Stop subscription permanently
     */
    stop(id, stopDate = null) {
        const subscription = this.get(id);
        if (!subscription) {
            EarlyBirdUtils.showToast('Subscription not found', 'error');
            return false;
        }

        subscription.status = this.STATUS.STOPPED;
        subscription.stopDate = stopDate || EarlyBirdUtils.getDateString(new Date());
        subscription.updatedAt = new Date().toISOString();

        this.saveSubscriptions();

        // Remove all future deliveries
        this.removeScheduledDeliveries(subscription, new Date());

        EarlyBirdUtils.showToast('Subscription stopped permanently', 'info');
        return true;
    },

    /**
     * Activate a draft subscription
     */
    activate(id) {
        const subscription = this.get(id);
        if (!subscription) {
            EarlyBirdUtils.showToast('Subscription not found', 'error');
            return false;
        }

        if (subscription.status !== this.STATUS.DRAFT) {
            EarlyBirdUtils.showToast('Only draft subscriptions can be activated', 'error');
            return false;
        }

        // Validate before activating
        const validation = this.validateSubscription({ ...subscription, status: this.STATUS.ACTIVE });
        if (!validation.isValid) {
            EarlyBirdUtils.showToast(`Cannot activate: ${validation.error}`, 'error');
            return false;
        }

        subscription.status = this.STATUS.ACTIVE;
        subscription.updatedAt = new Date().toISOString();

        this.saveSubscriptions();

        // Schedule deliveries
        this.scheduleDeliveries(subscription);

        EarlyBirdUtils.showToast('Subscription activated', 'success');
        return true;
    },

    // ========== CALENDAR INTEGRATION (Enhanced) ==========

    /**
     * Schedule deliveries in calendar (next 60 days)
     * Uses computeQuantity for accurate quantity calculation
     */
    scheduleDeliveries(subscription, fromDate = new Date()) {
        if (subscription.status !== this.STATUS.ACTIVE) return;

        const deliveries = this.getUpcomingDeliveries(subscription, 60);

        deliveries.forEach(delivery => {
            const event = {
                type: 'delivery',
                customer: subscription.customerName,
                customerId: subscription.customerId,
                time: subscription.deliveryWindow === 'am' ? '7:00 AM' : '6:00 PM',
                status: 'pending',
                details: `${subscription.productName} x ${delivery.quantity} (Subscription)`,
                amount: subscription.price * delivery.quantity,
                subscriptionId: subscription.id,
                quantity: delivery.quantity
            };

            EarlyBirdCalendar.addEvent(delivery.date, event);
        });
    },

    /**
     * Reschedule all deliveries
     */
    rescheduleDeliveries(subscription) {
        // Remove all existing deliveries
        this.removeScheduledDeliveries(subscription);

        // Add new deliveries if active
        if (subscription.status === this.STATUS.ACTIVE) {
            this.scheduleDeliveries(subscription);
        }
    },

    /**
     * Remove scheduled deliveries from calendar
     */
    removeScheduledDeliveries(subscription, fromDate = null) {
        Object.keys(EarlyBirdCalendar.state.events).forEach(dateStr => {
            if (fromDate && dateStr < EarlyBirdUtils.getDateString(fromDate)) {
                return; // Skip past dates
            }

            EarlyBirdCalendar.state.events[dateStr] = EarlyBirdCalendar.state.events[dateStr].filter(
                event => event.subscriptionId !== subscription.id
            );

            // Remove date key if no events left
            if (EarlyBirdCalendar.state.events[dateStr].length === 0) {
                delete EarlyBirdCalendar.state.events[dateStr];
            }
        });

        EarlyBirdCalendar.saveEvents();
    },

    // ========== UTILITY FUNCTIONS (From Python Reference) ==========

    /**
     * Convert weekly pattern to human-readable format
     * Example: [0,2,4] → "Sun, Tue, Thu"
     */
    explainWeeklyPattern(pattern) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return pattern.map(i => days[i]).join(', ');
    },

    /**
     * Get total quantity for a date range
     */
    getTotalQuantityForPeriod(subscription, startDate, endDate) {
        let total = 0;
        let current = new Date(startDate);
        const end = new Date(endDate);

        while (current <= end) {
            const dateStr = EarlyBirdUtils.getDateString(current);
            const quantity = this.computeQuantity(dateStr, subscription);
            total += quantity;
            current = EarlyBirdUtils.addDays(current, 1);
        }

        return total;
    },

    /**
     * Get pending irregular entries (dates without entries in irregular mode)
     */
    getPendingIrregularEntries(subscription, startDate, endDate) {
        if (subscription.mode !== this.MODES.IRREGULAR) {
            return 0;
        }

        const irregularDates = new Set(
            (subscription.irregularList || []).map(item => item.date)
        );

        let pendingCount = 0;
        let current = new Date(startDate);
        const end = new Date(endDate);

        while (current <= end) {
            const dateStr = EarlyBirdUtils.getDateString(current);
            if (!irregularDates.has(dateStr)) {
                pendingCount++;
            }
            current = EarlyBirdUtils.addDays(current, 1);
        }

        return pendingCount;
    }
};

// Initialize on load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        EarlyBirdSubscriptionV2.init();
    });
}

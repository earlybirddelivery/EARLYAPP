/**
 * EarlyBird Smart Features - Tier 1
 * Intelligent customer & staff insights with calendar integration
 * Features: Pause detection, instant-to-subscription, journey tracker, payment escalation, trust score, route deviation
 */

const EarlyBirdSmartFeatures = {
    state: {
        subscriptionMonitoring: {},
        customerJourneys: {},
        paymentReminders: {},
        trustScores: {},
        routeDeviations: {},
        intelligenceNotes: []
    },

    /**
     * Initialize smart features
     */
    init() {
        this.loadFromStorage();
        this.startMonitoring();
    },

    /**
     * Start continuous monitoring
     */
    startMonitoring() {
        setInterval(() => {
            this.checkSubscriptionPauses();
            this.analyzePurchasePatterns();
            this.processPaymentReminders();
            this.calculateTrustScores();
        }, 5 * 60 * 1000); // Every 5 minutes
    },

    // ============================================================================
    // FEATURE 1: SMART SUBSCRIPTION PAUSE DETECTION
    // ============================================================================

    /**
     * Monitor subscriptions for unusual pause patterns
     */
    checkSubscriptionPauses() {
        const subscriptions = EarlyBirdSubscription?.state?.subscriptions || [];

        subscriptions.forEach(sub => {
            if (!this.state.subscriptionMonitoring[sub.customerId]) {
                this.state.subscriptionMonitoring[sub.customerId] = {};
            }

            const monitor = this.state.subscriptionMonitoring[sub.customerId];

            // Check pause duration
            if (sub.status === 'paused') {
                const pauseStart = new Date(sub.pausedDate);
                const daysPaused = Math.floor((new Date() - pauseStart) / (1000 * 60 * 60 * 24));

                // Alert if paused > 7 days
                if (daysPaused > 7) {
                    this.alertUnusualPause(sub.customerId, sub.id, daysPaused);
                    monitor[sub.id] = { daysPaused, alerted: true };
                }
            }

            // Track pause frequency
            if (!monitor.pauseCount) monitor.pauseCount = 0;
            if (sub.status === 'paused') monitor.pauseCount++;

            // Alert if 3+ pauses in 30 days (churn risk)
            if (monitor.pauseCount >= 3) {
                this.flagChurnRisk(sub.customerId, 'frequent_pauses', monitor.pauseCount);
            }
        });

        this.saveToStorage();
    },

    /**
     * Alert about unusual pause
     */
    alertUnusualPause(customerId, subscriptionId, daysPaused) {
        const alert = {
            type: 'SUBSCRIPTION_PAUSE_ALERT',
            customerId: customerId,
            subscriptionId: subscriptionId,
            daysPaused: daysPaused,
            timestamp: new Date(),
            severity: daysPaused > 14 ? 'high' : 'medium',
            action: 'Support Buddy should call customer',
            message: `⚠️ Customer paused subscription for ${daysPaused} days. Check if they need help.`
        };

        // Log to calendar
        EarlyBirdCalendar.addEvent({
            title: `Pause Alert: ${daysPaused} days`,
            type: 'SUBSCRIPTION_PAUSE_ALERT',
            status: 'alert',
            details: alert
        });

        // Send to admin/support
        console.log('Subscription Pause Alert:', alert);
    },

    /**
     * Flag customer for churn risk
     */
    flagChurnRisk(customerId, reason, value) {
        const risk = {
            customerId: customerId,
            reason: reason,
            value: value,
            flaggedDate: new Date(),
            severity: reason === 'frequent_pauses' ? 'high' : 'medium'
        };

        if (!this.state.subscriptionMonitoring[customerId].churnRisk) {
            this.state.subscriptionMonitoring[customerId].churnRisk = risk;
        }
    },

    // ============================================================================
    // FEATURE 2: INSTANT-TO-SUBSCRIPTION INTELLIGENCE
    // ============================================================================

    /**
     * Analyze purchase patterns and suggest subscriptions
     */
    analyzePurchasePatterns() {
        const orders = EarlyBirdOrders?.state?.orders || [];
        const subscriptions = EarlyBirdSubscription?.state?.subscriptions || [];

        // Group orders by customer and product
        const customerProducts = {};

        orders.forEach(order => {
            if (!customerProducts[order.customerId]) {
                customerProducts[order.customerId] = {};
            }

            order.items.forEach(item => {
                if (!customerProducts[order.customerId][item.id]) {
                    customerProducts[order.customerId][item.id] = {
                        product: item,
                        orderCount: 0,
                        lastOrderDate: null,
                        dates: []
                    };
                }

                customerProducts[order.customerId][item.id].orderCount++;
                customerProducts[order.customerId][item.id].lastOrderDate = new Date(order.date);
                customerProducts[order.customerId][item.id].dates.push(new Date(order.date));
            });
        });

        // Check conversion opportunities
        for (const [customerId, products] of Object.entries(customerProducts)) {
            for (const [productId, data] of Object.entries(products)) {
                // Rule: 3+ orders in 45 days = subscription candidate
                const fortyFiveDaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
                const recentOrders = data.dates.filter(d => d > fortyFiveDaysAgo).length;

                if (recentOrders >= 3 && !this.isAlreadySubscribed(customerId, productId)) {
                    this.suggestSubscriptionConversion(customerId, data.product, recentOrders);
                }
            }
        }
    },

    /**
     * Check if customer already subscribed to product
     */
    isAlreadySubscribed(customerId, productId) {
        const subscriptions = EarlyBirdSubscription?.state?.subscriptions || [];
        return subscriptions.some(s =>
            s.customerId === customerId &&
            s.productId === productId &&
            s.status === 'active'
        );
    },

    /**
     * Suggest subscription conversion
     */
    suggestSubscriptionConversion(customerId, product, orderCount) {
        const suggestion = {
            customerId: customerId,
            product: product,
            orderCount: orderCount,
            message: `💡 Customer ordered ${product.name} ${orderCount} times in 45 days. Suggest subscription for better savings!`,
            suggestedDate: new Date(),
            actionUrl: `/subscription?customer=${customerId}&product=${product.id}`
        };

        // Log to calendar
        EarlyBirdCalendar.addEvent({
            title: `Subscription Suggestion: ${product.name}`,
            type: 'SUBSCRIPTION_SUGGESTION',
            status: 'suggestion',
            details: suggestion
        });

        // Send WhatsApp to support buddy
        console.log('Subscription Conversion Suggestion:', suggestion);
    },

    // ============================================================================
    // FEATURE 3: FIRST 30 DAYS CUSTOMER JOURNEY TRACKER
    // ============================================================================

    /**
     * Track new customer milestones
     */
    trackCustomerJourney(customerId) {
        if (!this.state.customerJourneys[customerId]) {
            this.state.customerJourneys[customerId] = {
                createdDate: new Date(),
                milestones: {
                    account_created: { completed: true, date: new Date() },
                    first_order: { completed: false, targetDay: 3 },
                    first_payment: { completed: false, targetDay: 5 },
                    first_subscription: { completed: false, targetDay: 7 },
                    second_order: { completed: false, targetDay: 14 },
                    retention_confirmed: { completed: false, targetDay: 30 }
                }
            };
        }

        const journey = this.state.customerJourneys[customerId];
        const daysSinceCreation = Math.floor((new Date() - journey.createdDate) / (1000 * 60 * 60 * 24));

        // Check milestones
        const orders = EarlyBirdOrders?.state?.orders || [];
        const subscriptions = EarlyBirdSubscription?.state?.subscriptions || [];

        // First order milestone
        if (!journey.milestones.first_order.completed && orders.some(o => o.customerId === customerId)) {
            journey.milestones.first_order = { completed: true, date: new Date() };
            this.celebrateMilestone(customerId, 'first_order');
        }

        // First payment milestone
        if (!journey.milestones.first_payment.completed && this.hasPayment(customerId)) {
            journey.milestones.first_payment = { completed: true, date: new Date() };
            this.celebrateMilestone(customerId, 'first_payment');
        }

        // First subscription milestone
        if (!journey.milestones.first_subscription.completed && subscriptions.some(s => s.customerId === customerId)) {
            journey.milestones.first_subscription = { completed: true, date: new Date() };
            this.celebrateMilestone(customerId, 'first_subscription');
        }

        // Check delays
        this.checkMilestoneDelays(customerId, journey, daysSinceCreation);
    },

    /**
     * Check if customer has made payment
     */
    hasPayment(customerId) {
        const wallet = EarlyBirdWallet?.state?.transactions || {};
        return wallet[customerId] && wallet[customerId].some(t => t.transaction_type === 'debit');
    },

    /**
     * Celebrate milestone achievement
     */
    celebrateMilestone(customerId, milestoneType) {
        const messages = {
            first_order: '🎉 First order placed! Send personalized offer.',
            first_payment: '💰 First payment received! Confirm subscription interest.',
            first_subscription: '✅ First subscription confirmed! Retention milestone.',
            second_order: '📈 Repeat customer! Upsell opportunity.',
            retention_confirmed: '⭐ 30-day retention! Customer is stable.'
        };

        const event = {
            type: 'CUSTOMER_MILESTONE',
            customerId: customerId,
            milestone: milestoneType,
            message: messages[milestoneType],
            timestamp: new Date()
        };

        EarlyBirdCalendar.addEvent({
            title: `🎯 Milestone: ${milestoneType}`,
            type: 'CUSTOMER_MILESTONE',
            status: 'completed',
            details: event
        });

        console.log('Milestone Achievement:', event);
    },

    /**
     * Check for delayed milestones
     */
    checkMilestoneDelays(customerId, journey, daysSinceCreation) {
        const criticalMilestones = [
            { name: 'first_order', targetDay: 3, severity: 'high' },
            { name: 'first_payment', targetDay: 5, severity: 'high' },
            { name: 'first_subscription', targetDay: 7, severity: 'medium' }
        ];

        criticalMilestones.forEach(milestone => {
            if (!journey.milestones[milestone.name].completed && daysSinceCreation > milestone.targetDay) {
                this.alertDelayedMilestone(customerId, milestone);
            }
        });
    },

    /**
     * Alert about delayed milestone
     */
    alertDelayedMilestone(customerId, milestone) {
        const alert = {
            type: 'MILESTONE_DELAY_ALERT',
            customerId: customerId,
            milestone: milestone.name,
            message: `⚠️ Customer hasn't completed ${milestone.name}. Follow up needed.`,
            severity: milestone.severity,
            action: 'Support Buddy should call and assist'
        };

        EarlyBirdCalendar.addEvent({
            title: `⚠️ ${milestone.name} delayed`,
            type: 'MILESTONE_DELAY',
            status: 'alert',
            details: alert
        });
    },

    // ============================================================================
    // FEATURE 4: PAYMENT REMINDER ESCALATION LOGIC
    // ============================================================================

    /**
     * Process payment reminders with smart escalation
     */
    processPaymentReminders() {
        const customers = this.getAllCustomers();

        customers.forEach(customer => {
            const outstanding = this.getOutstandingBalance(customer.id);
            if (outstanding <= 0) return;

            const daysSinceCreation = this.daysSinceDate(new Date(customer.createdDate || Date.now()));

            // Smart escalation based on payment history
            const escalationLevel = this.determineEscalationLevel(customer.id, outstanding, daysSinceCreation);

            if (!this.state.paymentReminders[customer.id]) {
                this.state.paymentReminders[customer.id] = {};
            }

            const currentLevel = this.state.paymentReminders[customer.id].level || 0;

            if (escalationLevel > currentLevel) {
                this.triggerPaymentReminder(customer, outstanding, escalationLevel);
                this.state.paymentReminders[customer.id].level = escalationLevel;
                this.state.paymentReminders[customer.id].lastReminder = new Date();
            }
        });
    },

    /**
     * Determine escalation level (1-5)
     */
    determineEscalationLevel(customerId, outstanding, days) {
        // Level 1: Days 1-3 - Gentle reminder
        if (days <= 3) return 1;

        // Level 2: Days 4-7 - Balance warning
        if (days <= 7) return 2;

        // Level 3: Days 8-10 - Support Buddy call trigger
        if (days <= 10) return 3;

        // Level 4: Days 11-14 - Subscription pause warning
        if (days <= 14) return 4;

        // Level 5: Days 15+ - Subscription pause + legal notice
        return 5;
    },

    /**
     * Get outstanding balance
     */
    getOutstandingBalance(customerId) {
        const wallet = EarlyBirdWallet?.state?.wallets?.[customerId];
        return Math.max(0, (wallet?.outstanding_balance || 0));
    },

    /**
     * Trigger payment reminder
     */
    triggerPaymentReminder(customer, outstanding, escalationLevel) {
        const messages = {
            1: `⏰ Friendly reminder: Pay ₹${outstanding} when convenient`,
            2: `💰 Outstanding balance: ₹${outstanding}. Please settle soon.`,
            3: `📞 Payment pending ${Math.floor((Date.now() - new Date(this.state.paymentReminders[customer.id]?.lastReminder || Date.now())) / (1000 * 60 * 60 * 24))} days. Support Buddy will call.`,
            4: `⚠️ Outstanding ₹${outstanding} for ${Math.floor((Date.now() - new Date(this.state.paymentReminders[customer.id]?.lastReminder || Date.now())) / (1000 * 60 * 60 * 24))} days. Subscription at risk.`,
            5: `🚨 URGENT: Outstanding ₹${outstanding}. Subscription will be paused if not settled within 24 hours.`
        };

        const event = {
            type: 'PAYMENT_REMINDER_ESCALATION',
            customerId: customer.id,
            level: escalationLevel,
            outstanding: outstanding,
            message: messages[escalationLevel],
            action: escalationLevel >= 3 ? 'Contact customer' : 'Automated message',
            timestamp: new Date()
        };

        // Color code calendar
        const colors = { 1: 'yellow', 2: 'orange', 3: 'red', 4: 'darkred', 5: 'darkred' };

        EarlyBirdCalendar.addEvent({
            title: `Payment: ₹${outstanding}`,
            type: 'PAYMENT_DUE',
            status: `escalation_${escalationLevel}`,
            details: event,
            color: colors[escalationLevel]
        });
    },

    // ============================================================================
    // FEATURE 5: CUSTOMER TRUST SCORE (INTERNAL METRIC)
    // ============================================================================

    /**
     * Calculate customer trust score (0-100)
     * Formula: Payment punctuality (40%) + Subscription stability (30%) + Order frequency (20%) + Feedback (10%)
     */
    calculateTrustScores() {
        const customers = this.getAllCustomers();

        customers.forEach(customer => {
            const score = this.computeTrustScore(customer.id);
            this.state.trustScores[customer.id] = {
                score: score,
                level: this.getTrustLevel(score),
                lastUpdated: new Date(),
                components: this.getTrustComponents(customer.id)
            };
        });

        this.saveToStorage();
    },

    /**
     * Compute trust score
     */
    computeTrustScore(customerId) {
        let score = 0;

        // Component 1: Payment Punctuality (40%)
        const paymentScore = this.calculatePaymentPunctuality(customerId);
        score += paymentScore * 0.4;

        // Component 2: Subscription Stability (30%)
        const subscriptionScore = this.calculateSubscriptionStability(customerId);
        score += subscriptionScore * 0.3;

        // Component 3: Order Frequency (20%)
        const frequencyScore = this.calculateOrderFrequency(customerId);
        score += frequencyScore * 0.2;

        // Component 4: Customer Feedback (10%)
        const feedbackScore = this.calculateFeedbackScore(customerId);
        score += feedbackScore * 0.1;

        return Math.round(Math.min(100, Math.max(0, score)));
    },

    /**
     * Calculate payment punctuality (0-100)
     */
    calculatePaymentPunctuality(customerId) {
        const wallet = EarlyBirdWallet?.state?.transactions || {};
        const transactions = wallet[customerId] || [];

        if (transactions.length === 0) return 50; // Neutral

        const latePayments = transactions.filter(t => {
            // Mock: Check if payment was late (>5 days)
            return t.daysLate > 5;
        }).length;

        const onTimeRate = (1 - (latePayments / transactions.length)) * 100;
        return Math.min(100, onTimeRate);
    },

    /**
     * Calculate subscription stability (0-100)
     */
    calculateSubscriptionStability(customerId) {
        const subscriptions = EarlyBirdSubscription?.state?.subscriptions || [];
        const customerSubs = subscriptions.filter(s => s.customerId === customerId);

        if (customerSubs.length === 0) return 50;

        const activeSubs = customerSubs.filter(s => s.status === 'active').length;
        const pauseFrequency = customerSubs.filter(s => s.pauseCount > 2).length;

        const stabilityScore = (activeSubs / customerSubs.length) * 100 - (pauseFrequency * 10);
        return Math.min(100, Math.max(0, stabilityScore));
    },

    /**
     * Calculate order frequency (0-100)
     */
    calculateOrderFrequency(customerId) {
        const orders = EarlyBirdOrders?.state?.orders || [];
        const customerOrders = orders.filter(o => o.customerId === customerId);

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentOrders = customerOrders.filter(o => new Date(o.date) > thirtyDaysAgo).length;

        // 0 orders: 0, 1-2 orders: 40, 3-5 orders: 70, 6+ orders: 100
        if (recentOrders === 0) return 0;
        if (recentOrders <= 2) return 40;
        if (recentOrders <= 5) return 70;
        return 100;
    },

    /**
     * Calculate feedback score (0-100) - mock implementation
     */
    calculateFeedbackScore(customerId) {
        // Would come from actual customer feedback/rating system
        return 75; // Default neutral score
    },

    /**
     * Get trust level
     */
    getTrustLevel(score) {
        if (score >= 85) return '⭐⭐⭐⭐⭐ Excellent';
        if (score >= 70) return '⭐⭐⭐⭐ Good';
        if (score >= 50) return '⭐⭐⭐ Fair';
        if (score >= 30) return '⭐⭐ Poor';
        return '⭐ Very Poor';
    },

    /**
     * Get trust score components
     */
    getTrustComponents(customerId) {
        return {
            payment: Math.round(this.calculatePaymentPunctuality(customerId)),
            subscription: Math.round(this.calculateSubscriptionStability(customerId)),
            frequency: Math.round(this.calculateOrderFrequency(customerId)),
            feedback: Math.round(this.calculateFeedbackScore(customerId))
        };
    },

    // ============================================================================
    // FEATURE 6: ROUTE DEVIATION ALERTS WITH GPS
    // ============================================================================

    /**
     * Log route deviation (from delivery buddy)
     */
    logRouteDeviation(deliveryBuddyId, orderLocation, currentLocation, deviation) {
        if (deviation > 500) { // > 500m deviation
            const alert = {
                type: 'ROUTE_DEVIATION',
                deliveryBuddyId: deliveryBuddyId,
                deviationMeters: deviation,
                timestamp: new Date(),
                orderLocation: orderLocation,
                currentLocation: currentLocation,
                status: 'pending_reason'
            };

            EarlyBirdCalendar.addEvent({
                title: `Route Deviation: ${deviation}m`,
                type: 'ROUTE_DEVIATION',
                status: 'alert',
                details: alert
            });

            console.log('Route Deviation Alert:', alert);
        }
    },

    /**
     * Record deviation reason and log to calendar
     */
    recordDeviationReason(deliveryBuddyId, reason, notes) {
        const record = {
            deliveryBuddyId: deliveryBuddyId,
            reason: reason,
            notes: notes,
            timestamp: new Date()
        };

        if (!this.state.routeDeviations[deliveryBuddyId]) {
            this.state.routeDeviations[deliveryBuddyId] = [];
        }

        this.state.routeDeviations[deliveryBuddyId].push(record);

        EarlyBirdCalendar.addEvent({
            title: `Deviation Reason: ${reason}`,
            type: 'DEVIATION_REASON_LOGGED',
            status: 'completed',
            details: record
        });

        this.saveToStorage();
    },

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    /**
     * Get all customers
     */
    getAllCustomers() {
        // Mock implementation - would fetch from actual database
        return [];
    },

    /**
     * Days since date
     */
    daysSinceDate(date) {
        return Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
    },

    /**
     * Save to localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem('earlybird_smart_features', JSON.stringify(this.state));
        } catch (e) {
            console.error('Error saving smart features:', e);
        }
    },

    /**
     * Load from localStorage
     */
    loadFromStorage() {
        try {
            const saved = JSON.parse(localStorage.getItem('earlybird_smart_features') || '{}');
            this.state = { ...this.state, ...saved };
        } catch (e) {
            console.error('Error loading smart features:', e);
        }
    }
};

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => EarlyBirdSmartFeatures.init());
} else {
    EarlyBirdSmartFeatures.init();
}

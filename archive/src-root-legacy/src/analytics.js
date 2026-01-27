/**
 * EarlyBird Analytics - Tier 3 Advanced Features
 * Churn prediction, dynamic pricing, leaderboards, heatmaps, bulk actions, gamification
 */

const EarlyBirdAnalytics = {
    state: {
        churnPredictions: {},
        dynamicPricing: {},
        leaderboards: {},
        activityHeatmaps: {},
        bulkActions: [],
        achievements: {},
        weatherCache: {},
        languagePreferences: {},
        referrals: {}
    },

    /**
     * Initialize analytics system
     */
    init() {
        this.loadFromStorage();
        this.startAnalytics();
    },

    /**
     * Start analytics monitoring
     */
    startAnalytics() {
        setInterval(() => {
            this.predictChurnRisk();
            this.calculateDynamicPricing();
            this.updateLeaderboards();
            this.generateActivityHeatmaps();
            this.checkAchievements();
        }, 10 * 60 * 1000); // Every 10 minutes
    },

    // ============================================================================
    // TIER 3 FEATURE 1: PREDICTIVE SUBSCRIPTION CHURN MODEL
    // ============================================================================

    /**
     * Predict churn risk for all customers (0-100%)
     * Inputs: pause frequency, payment delays, order reduction, interaction frequency
     */
    predictChurnRisk() {
        const customers = this.getAllCustomers();

        customers.forEach(customer => {
            const riskScore = this.calculateChurnScore(customer.id);
            this.state.churnPredictions[customer.id] = {
                score: riskScore,
                level: this.getChurnLevel(riskScore),
                lastUpdated: new Date(),
                factors: this.getChurnFactors(customer.id),
                recommendedAction: this.getRetentionAction(riskScore)
            };
        });

        this.saveToStorage();
    },

    /**
     * Calculate churn score (0-100)
     */
    calculateChurnScore(customerId) {
        let score = 0;

        // Factor 1: Subscription pause frequency (30%)
        const pauseScore = this.getPauseFrequencyScore(customerId);
        score += pauseScore * 0.30;

        // Factor 2: Payment delay trends (25%)
        const paymentScore = this.getPaymentDelayScore(customerId);
        score += paymentScore * 0.25;

        // Factor 3: Order quantity reduction (20%)
        const orderReductionScore = this.getOrderReductionScore(customerId);
        score += orderReductionScore * 0.20;

        // Factor 4: Monthly order frequency (15%)
        const frequencyScore = this.getOrderFrequencyScore(customerId);
        score += frequencyScore * 0.15;

        // Factor 5: Support interaction frequency (10%)
        const interactionScore = this.getSupportInteractionScore(customerId);
        score += interactionScore * 0.10;

        return Math.min(100, Math.max(0, score));
    },

    /**
     * Get pause frequency score (0-100, higher = riskier)
     */
    getPauseFrequencyScore(customerId) {
        const subscriptions = EarlyBirdSubscription?.state?.subscriptions || [];
        const customerSubs = subscriptions.filter(s => s.customerId === customerId);

        let pauseCount = 0;
        let consecutivePauses = 0;

        customerSubs.forEach(sub => {
            pauseCount += sub.pauseCount || 0;
            if (sub.status === 'paused') consecutivePauses++;
        });

        // 0 pauses: 0, 1 pause: 10, 2-3 pauses: 40, 4+ pauses: 80, currently paused: +20
        let score = Math.min(80, pauseCount * 20);
        if (consecutivePauses > 0) score += 20;

        return score;
    },

    /**
     * Get payment delay score (0-100)
     */
    getPaymentDelayScore(customerId) {
        const transactions = this.getCustomerTransactions(customerId) || [];
        if (transactions.length === 0) return 0;

        const delays = transactions.filter(t => (t.daysLate || 0) > 0);
        const avgDelay = delays.length > 0 ? 
            delays.reduce((sum, t) => sum + (t.daysLate || 0), 0) / delays.length : 0;

        // Map to 0-100: 0 days = 0, 5+ days = 60, 10+ days = 100
        return Math.min(100, avgDelay * 10);
    },

    /**
     * Get order reduction score (0-100)
     */
    getOrderReductionScore(customerId) {
        const orders = EarlyBirdOrders?.state?.orders || [];
        const customerOrders = orders.filter(o => o.customerId === customerId);

        const thirtyDaysAgo = this.addDays(new Date(), -30);
        const sixtyDaysAgo = this.addDays(new Date(), -60);

        const recentOrderCount = customerOrders.filter(o => new Date(o.date) > thirtyDaysAgo).length;
        const previousOrderCount = customerOrders.filter(o =>
            new Date(o.date) > sixtyDaysAgo && new Date(o.date) <= thirtyDaysAgo
        ).length;

        if (previousOrderCount === 0) return 0;

        const reductionRate = (1 - (recentOrderCount / previousOrderCount)) * 100;
        return Math.min(100, Math.max(0, reductionRate));
    },

    /**
     * Get order frequency score
     */
    getOrderFrequencyScore(customerId) {
        const orders = EarlyBirdOrders?.state?.orders || [];
        const customerOrders = orders.filter(o => o.customerId === customerId);

        const thirtyDaysAgo = this.addDays(new Date(), -30);
        const recentOrders = customerOrders.filter(o => new Date(o.date) > thirtyDaysAgo).length;

        // 0 orders: 100, 1 order: 70, 2-3: 40, 4-6: 20, 7+: 0
        if (recentOrders === 0) return 100;
        if (recentOrders === 1) return 70;
        if (recentOrders <= 3) return 40;
        if (recentOrders <= 6) return 20;
        return 0;
    },

    /**
     * Get support interaction score (lower = riskier)
     */
    getSupportInteractionScore(customerId) {
        // Mock: Would track actual support interactions
        // Higher interaction frequency = lower risk
        return Math.random() * 40; // 0-40 score
    },

    /**
     * Get churn level (0-30: green, 31-60: yellow, 61-100: red)
     */
    getChurnLevel(score) {
        if (score <= 30) return { level: 'low', color: 'green', icon: '✅' };
        if (score <= 60) return { level: 'medium', color: 'yellow', icon: '⚠️' };
        return { level: 'high', color: 'red', icon: '🚨' };
    },

    /**
     * Get churn factors for transparency
     */
    getChurnFactors(customerId) {
        return {
            pauseFrequency: this.getPauseFrequencyScore(customerId).toFixed(0),
            paymentDelays: this.getPaymentDelayScore(customerId).toFixed(0),
            orderReduction: this.getOrderReductionScore(customerId).toFixed(0),
            orderFrequency: this.getOrderFrequencyScore(customerId).toFixed(0),
            supportInteraction: this.getSupportInteractionScore(customerId).toFixed(0)
        };
    },

    /**
     * Get retention action based on churn level
     */
    getRetentionAction(score) {
        if (score <= 30) return '✅ No action needed - customer is stable';
        if (score <= 60) return '📞 Schedule check-in call with customer';
        return '🎯 Offer retention incentive (₹100 wallet credit)';
    },

    // ============================================================================
    // TIER 3 FEATURE 2: DYNAMIC PRICING BASED ON DEMAND
    // ============================================================================

    /**
     * Calculate dynamic prices for next day
     */
    calculateDynamicPricing() {
        const tomorrow = this.addDays(new Date(), 1);
        const tomorrowOrders = this.getOrdersForDate(tomorrow);

        if (tomorrowOrders.length === 0) return;

        // Aggregate product demand
        const demandByProduct = {};
        tomorrowOrders.forEach(order => {
            order.items.forEach(item => {
                if (!demandByProduct[item.id]) {
                    demandByProduct[item.id] = { name: item.name, count: 0, totalQty: 0 };
                }
                demandByProduct[item.id].count++;
                demandByProduct[item.id].totalQty += parseFloat(item.quantity);
            });
        });

        // Calculate dynamic prices
        for (const [productId, demand] of Object.entries(demandByProduct)) {
            const basePrice = this.getBasePrice(productId);
            const dynamicPrice = this.applyPricingRules(productId, basePrice, demand, tomorrow);

            this.state.dynamicPricing[productId] = {
                basePrice: basePrice,
                dynamicPrice: dynamicPrice,
                multiplier: (dynamicPrice / basePrice).toFixed(2),
                demand: demand,
                effectiveDate: tomorrow,
                rule: this.getPricingRule(demand, tomorrow)
            };
        }

        this.saveToStorage();
    },

    /**
     * Get base price for product
     */
    getBasePrice(productId) {
        const prices = {
            'milk_500ml': 25,
            'milk_1L': 48,
            'rice_25kg': 1650,
            'atta_10kg': 450,
            'dal_2kg': 320,
            'sugar_5kg': 225,
            'oil_2L': 890
        };
        return prices[productId] || 100;
    },

    /**
     * Apply pricing rules
     */
    applyPricingRules(productId, basePrice, demand, date) {
        let priceMultiplier = 1.0;

        // Rule 1: Surge pricing - high demand
        if (demand.count > 100) {
            priceMultiplier *= 1.10; // +10%
        }

        // Rule 2: Promotional pricing - low demand
        if (demand.count < 30) {
            priceMultiplier *= 0.90; // -10% discount
        }

        // Rule 3: Weekend bulk discount
        if (date.getDay() === 0 || date.getDay() === 6) {
            priceMultiplier *= 0.95; // -5% on weekends
        }

        // Rule 4: Festival premium (mock - real would check festival calendar)
        if (this.isFestivalWeek(date)) {
            priceMultiplier *= 1.05; // +5% during festivals
        }

        return Math.round(basePrice * priceMultiplier * 100) / 100;
    },

    /**
     * Get pricing rule description
     */
    getPricingRule(demand, date) {
        if (demand.count > 100) return 'High demand surge pricing';
        if (demand.count < 30) return 'Low demand promotional discount';
        if (date.getDay() === 0 || date.getDay() === 6) return 'Weekend bulk discount';
        return 'Regular pricing';
    },

    /**
     * Check if festival week
     */
    isFestivalWeek(date) {
        // Mock: Would check actual festival calendar
        return false;
    },

    /**
     * Get orders for date
     */
    getOrdersForDate(date) {
        const orders = EarlyBirdOrders?.state?.orders || [];
        const dateStr = date.toISOString().split('T')[0];
        
        return orders.filter(order => {
            const orderDate = new Date(order.date).toISOString().split('T')[0];
            return orderDate === dateStr;
        });
    },

    // ============================================================================
    // TIER 3 FEATURE 3: LEADERBOARD GAMIFICATION
    // ============================================================================

    /**
     * Update leaderboards
     */
    updateLeaderboards() {
        this.updateDeliveryBuddyLeaderboard();
        this.updateSupportBuddyLeaderboard();
        this.checkAchievements();
    },

    /**
     * Update delivery buddy leaderboard
     */
    updateDeliveryBuddyLeaderboard() {
        const deliveryData = this.getDeliveryBuddyData();

        // Sort by earnings this month
        const ranked = deliveryData.sort((a, b) => b.monthlyEarnings - a.monthlyEarnings);

        this.state.leaderboards.delivery = {
            period: 'this_month',
            updatedAt: new Date(),
            rankings: ranked.map((buddy, index) => ({
                rank: index + 1,
                buddyId: buddy.id,
                name: buddy.name,
                earnings: buddy.monthlyEarnings,
                deliveries: buddy.deliveryCount,
                instantOrders: buddy.instantOrderCount,
                subscriptionConverts: buddy.subscriptionConverts,
                rating: buddy.rating,
                achievements: this.getBuddyAchievements(buddy.id)
            }))
        };

        // Log to calendar if available
        if (typeof EarlyBirdCalendar !== 'undefined' && EarlyBirdCalendar.addEvent) {
            EarlyBirdCalendar.addEvent({
                title: `🏆 Leaderboard Updated - Delivery Buddies`,
                type: 'LEADERBOARD_UPDATE',
                status: 'completed',
                details: this.state.leaderboards.delivery
            });
        }
    },

    /**
     * Get delivery buddy data
     */
    getDeliveryBuddyData() {
        // Mock data - would aggregate from actual delivery records
        return [
            {
                id: 'buddy_001',
                name: 'Ramesh Kumar',
                monthlyEarnings: 12450,
                deliveryCount: 145,
                instantOrderCount: 8,
                subscriptionConverts: 2,
                rating: 4.8
            },
            {
                id: 'buddy_002',
                name: 'Suresh Patil',
                monthlyEarnings: 11200,
                deliveryCount: 138,
                instantOrderCount: 6,
                subscriptionConverts: 1,
                rating: 4.6
            },
            {
                id: 'buddy_003',
                name: 'Mahesh Reddy',
                monthlyEarnings: 10800,
                deliveryCount: 142,
                instantOrderCount: 4,
                subscriptionConverts: 0,
                rating: 4.5
            }
        ];
    },

    /**
     * Get buddy achievements
     */
    getBuddyAchievements(buddyId) {
        const achievements = [];

        // Mock achievement logic
        const data = this.getDeliveryBuddyData().find(d => d.id === buddyId);
        if (!data) return [];

        if (data.deliveryCount >= 100) achievements.push({ icon: '💯', name: '100 Deliveries Streak' });
        if (data.rating >= 4.8) achievements.push({ icon: '⭐', name: 'Top Rated' });
        if (data.monthlyEarnings >= 10000) achievements.push({ icon: '💰', name: '₹10K Earner' });
        if (data.subscriptionConverts >= 2) achievements.push({ icon: '📈', name: 'Subscription Guru' });

        return achievements;
    },

    /**
     * Update support buddy leaderboard
     */
    updateSupportBuddyLeaderboard() {
        // Similar structure to delivery buddy leaderboard
        this.state.leaderboards.support = {
            period: 'this_month',
            updatedAt: new Date(),
            rankings: [] // Would populate similarly
        };
    },

    // ============================================================================
    // TIER 3 FEATURE 4: ACTIVITY HEATMAPS
    // ============================================================================

    /**
     * Generate activity heatmaps
     */
    generateActivityHeatmaps() {
        this.generateSupportBuddyHeatmap();
        this.generateDeliveryBuddyHeatmap();
        this.generateCustomerHeatmap();
    },

    /**
     * Generate support buddy activity heatmap
     */
    generateSupportBuddyHeatmap() {
        const buddyActivity = {
            // Mon-Sun, hours 9-17
            'buddy_001': [
                [8, 9, 7, 9, 8, 0, 1], // 9 AM
                [9, 10, 9, 8, 9, 0, 0], // 10 AM
                [7, 8, 6, 7, 8, 0, 0], // 11 AM
                [2, 2, 2, 2, 2, 0, 0], // 12 PM (lunch)
                [8, 9, 8, 9, 8, 1, 1], // 1 PM
                [7, 6, 7, 8, 7, 2, 1], // 2 PM
                [6, 7, 6, 7, 6, 3, 2]  // 3 PM
            ]
        };

        this.state.activityHeatmaps.supportBuddy = buddyActivity;

        EarlyBirdCalendar.addEvent({
            title: '📊 Support Buddy Activity Heatmap Updated',
            type: 'HEATMAP_UPDATE',
            status: 'completed',
            details: buddyActivity
        });
    },

    /**
     * Generate delivery buddy heatmap
     */
    generateDeliveryBuddyHeatmap() {
        // Route location heatmap - where most deliveries happen
        this.state.activityHeatmaps.deliveryBuddy = {
            routeHotspots: [
                { area: 'East Zone', deliveryCount: 450, avgTime: 18, satisfaction: 4.7 },
                { area: 'West Zone', deliveryCount: 380, avgTime: 16, satisfaction: 4.6 },
                { area: 'North Zone', deliveryCount: 290, avgTime: 22, satisfaction: 4.4 },
                { area: 'South Zone', deliveryCount: 210, avgTime: 25, satisfaction: 4.3 }
            ]
        };
    },

    /**
     * Generate customer heatmap
     */
    generateCustomerHeatmap() {
        // When customers are most active/placing orders
        this.state.activityHeatmaps.customer = {
            orderPeakTimes: [
                { day: 'Monday', peakHour: '6-7 AM', orders: 245 },
                { day: 'Tuesday', peakHour: '6-7 AM', orders: 230 },
                { day: 'Friday', peakHour: '5-6 PM', orders: 280 }
            ]
        };
    },

    // ============================================================================
    // TIER 3 FEATURE 5: ACHIEVEMENT SYSTEM & GAMIFICATION
    // ============================================================================

    /**
     * Check and award achievements
     */
    checkAchievements() {
        const buddies = this.getDeliveryBuddyData();

        buddies.forEach(buddy => {
            if (!this.state.achievements[buddy.id]) {
                this.state.achievements[buddy.id] = [];
            }

            // Check for new achievements
            const achievements = [];

            if (buddy.deliveryCount >= 100 && !this.hasAchievement(buddy.id, 'delivery_100')) {
                achievements.push({
                    id: 'delivery_100',
                    name: '💯 100 Deliveries',
                    description: 'Completed 100 deliveries',
                    reward: '₹500 bonus',
                    awardedDate: new Date()
                });
            }

            if (buddy.monthlyEarnings >= 10000 && !this.hasAchievement(buddy.id, 'earning_10k')) {
                achievements.push({
                    id: 'earning_10k',
                    name: '💰 ₹10K Club',
                    description: 'Earned ₹10,000 in a month',
                    reward: 'Recognition + ₹1000 bonus',
                    awardedDate: new Date()
                });
            }

            achievements.forEach(ach => {
                this.state.achievements[buddy.id].push(ach);
                this.notifyAchievementEarned(buddy.id, ach);
            });
        });

        this.saveToStorage();
    },

    /**
     * Check if achievement already awarded
     */
    hasAchievement(buddyId, achievementId) {
        return this.state.achievements[buddyId]?.some(a => a.id === achievementId) || false;
    },

    /**
     * Notify achievement earned
     */
    notifyAchievementEarned(buddyId, achievement) {
        EarlyBirdCalendar.addEvent({
            title: `🏆 ${achievement.name}`,
            type: 'ACHIEVEMENT_EARNED',
            status: 'completed',
            details: {
                buddyId: buddyId,
                achievement: achievement
            }
        });

        console.log(`Achievement Earned: ${achievement.name}`);
    },

    // ============================================================================
    // TIER 3 FEATURE 6: BULK CALENDAR ACTIONS
    // ============================================================================

    /**
     * Execute bulk calendar action
     */
    executeBulkAction(action, selectedDates, params) {
        const bulkAction = {
            id: EarlyBirdUtils.generateId(),
            type: action,
            affectedDates: selectedDates,
            params: params,
            executedAt: new Date(),
            status: 'completed',
            affectedOrders: 0
        };

        switch (action) {
            case 'pause_subscriptions':
                bulkAction.affectedOrders = this.pauseAllSubscriptionsForDates(selectedDates);
                break;
            case 'apply_discount':
                bulkAction.affectedOrders = this.applyBulkDiscount(selectedDates, params);
                break;
            case 'send_reminders':
                bulkAction.affectedOrders = this.sendBulkReminders(selectedDates, params);
                break;
            case 'reassign_routes':
                bulkAction.affectedOrders = this.reassignRoutes(selectedDates, params);
                break;
        }

        this.state.bulkActions.push(bulkAction);

        // Log each affected date
        selectedDates.forEach(date => {
            EarlyBirdCalendar.addEvent({
                title: `📋 Bulk Action: ${action}`,
                type: 'BULK_ACTION',
                status: 'completed',
                details: bulkAction,
                date: date
            });
        });

        this.saveToStorage();
        return bulkAction;
    },

    /**
     * Pause subscriptions for date range
     */
    pauseAllSubscriptionsForDates(dates) {
        // Mock implementation
        return dates.length * 15; // ~15 subscriptions per date
    },

    /**
     * Apply bulk discount
     */
    applyBulkDiscount(dates, params) {
        // Mock: Apply discount to all orders on these dates
        return dates.length * 20;
    },

    /**
     * Send bulk reminders
     */
    sendBulkReminders(dates, params) {
        // Mock: Send payment reminders to customers
        return dates.length * 25;
    },

    /**
     * Reassign routes
     */
    reassignRoutes(dates, params) {
        // Mock: Reassign delivery routes
        return dates.length * 10;
    },

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    /**
     * Get customer transactions
     */
    getCustomerTransactions(customerId) {
        const wallet = EarlyBirdWallet?.state?.transactions || {};
        return wallet[customerId] || [];
    },

    /**
     * Get all customers
     */
    getAllCustomers() {
        // Mock - would fetch from database
        return [];
    },

    /**
     * Add days
     */
    addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    },

    /**
     * Save to storage
     */
    saveToStorage() {
        try {
            localStorage.setItem('earlybird_analytics', JSON.stringify(this.state));
        } catch (e) {
            console.error('Error saving analytics:', e);
        }
    },

    /**
     * Load from storage
     */
    loadFromStorage() {
        try {
            const saved = JSON.parse(localStorage.getItem('earlybird_analytics') || '{}');
            this.state = { ...this.state, ...saved };
        } catch (e) {
            console.error('Error loading analytics:', e);
        }
    }
};

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => EarlyBirdAnalytics.init());
} else {
    EarlyBirdAnalytics.init();
}

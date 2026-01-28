// ============================================
// EarlyBird Staff Wallet System
// CRITICAL GAP #4: Support & Delivery Buddy Wallets
// Real-time commission tracking & withdrawal
// ============================================

const EarlyBirdStaffWallet = {
    
    state: {
        staffWallets: {},  // { staffId: { balance, earnings, commissions, withdrawals } }
        commissionRules: {},  // Commission configuration per role
        withdrawalRequests: {},
        leaderboard: {},
        earnings: {}  // { staffId: { daily, weekly, monthly } }
    },

    // ========== INITIALIZATION ==========

    init() {
        this.loadStaffWallets();
        this.setupDefaultCommissionRules();
        console.log('✅ EarlyBirdStaffWallet initialized with staff earning tracking');
    },

    loadStaffWallets() {
        this.state.staffWallets = EarlyBirdUtils.loadFromStorage('earlybird_staff_wallets', {});
        this.state.commissionRules = EarlyBirdUtils.loadFromStorage('earlybird_commission_rules', {});
        this.state.withdrawalRequests = EarlyBirdUtils.loadFromStorage('earlybird_withdrawal_requests', {});
        this.state.earnings = EarlyBirdUtils.loadFromStorage('earlybird_staff_earnings', {});
    },

    saveStaffWallets() {
        EarlyBirdUtils.saveToStorage('earlybird_staff_wallets', this.state.staffWallets);
        EarlyBirdUtils.saveToStorage('earlybird_commission_rules', this.state.commissionRules);
        EarlyBirdUtils.saveToStorage('earlybird_withdrawal_requests', this.state.withdrawalRequests);
        EarlyBirdUtils.saveToStorage('earlybird_staff_earnings', this.state.earnings);
    },

    // ========== COMMISSION RULES ==========

    setupDefaultCommissionRules() {
        // Support Buddy commissions
        this.state.commissionRules['support_buddy'] = {
            role: 'support_buddy',
            commissions: {
                per_order: 50,  // ₹50 per order created
                subscription_conversion: 200,  // ₹200 for converting instant to subscription
                referral: 500,  // ₹500 per referred customer who places first order
                performance_bonus: {
                    tier1_50orders: 2000,  // ₹2000 for 50 orders/month
                    tier2_100orders: 5000,  // ₹5000 for 100 orders/month
                    tier3_150orders: 10000  // ₹10000 for 150 orders/month
                }
            },
            payoutCycle: 'weekly',  // or 'monthly'
            minWithdrawal: 100
        };

        // Delivery Buddy commissions
        this.state.commissionRules['delivery_buddy'] = {
            role: 'delivery_buddy',
            commissions: {
                per_delivery: 30,  // ₹30 per delivery
                instant_order_bonus: 20,  // ₹20 for instant orders
                on_time_bonus: 10,  // ₹10 if delivered on time
                performance_bonus: {
                    tier1_100deliveries: 3000,
                    tier2_200deliveries: 7000,
                    tier3_300deliveries: 15000
                }
            },
            payoutCycle: 'weekly',
            minWithdrawal: 100
        };

        this.saveStaffWallets();
    },

    /**
     * Create wallet for staff member
     */
    createStaffWallet(staffId, staffName, role, phoneNumber, bankAccount = null) {
        if (this.state.staffWallets[staffId]) {
            return this.state.staffWallets[staffId];
        }

        this.state.staffWallets[staffId] = {
            staffId: staffId,
            name: staffName,
            role: role,  // 'support_buddy' or 'delivery_buddy'
            phoneNumber: phoneNumber,
            bankAccount: bankAccount,
            balance: 0,
            totalEarnings: 0,
            totalWithdrawals: 0,
            pendingWithdrawal: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            transactions: [],
            monthlyEarnings: {}  // { '2026-01': { earned: 0, withdrawn: 0, pending: 0 } }
        };

        // Initialize earnings
        this.state.earnings[staffId] = {
            daily: {},
            weekly: {},
            monthly: {},
            lifetime: 0
        };

        this.saveStaffWallets();
        console.log(`💼 Created wallet for ${role} ${staffName}: ${staffId}`);
        return this.state.staffWallets[staffId];
    },

    /**
     * Get staff wallet
     */
    getStaffWallet(staffId) {
        return this.state.staffWallets[staffId] || null;
    },

    // ========== COMMISSION TRACKING ==========

    /**
     * Add commission for order creation (Support Buddy)
     */
    addOrderCommission(staffId, orderId, orderAmount) {
        const wallet = this.state.staffWallets[staffId];
        if (!wallet || wallet.role !== 'support_buddy') {
            console.warn(`⚠️ Invalid staff ID or role: ${staffId}`);
            return null;
        }

        const rules = this.state.commissionRules['support_buddy'];
        const commission = rules.commissions.per_order;

        wallet.balance += commission;
        wallet.totalEarnings += commission;
        wallet.updatedAt = new Date().toISOString();

        wallet.transactions.push({
            type: 'commission',
            amount: commission,
            reason: `Order commission (Order #${orderId})`,
            orderId: orderId,
            orderAmount: orderAmount,
            timestamp: new Date().toISOString(),
            status: 'completed'
        });

        this.updateDailyEarnings(staffId, commission);
        this.saveStaffWallets();

        console.log(`💰 Support Buddy ${staffId} earned ₹${commission} for order ${orderId}`);
        return commission;
    },

    /**
     * Add commission for subscription conversion
     */
    addSubscriptionConversionCommission(staffId, customerId, subscriptionAmount) {
        const wallet = this.state.staffWallets[staffId];
        if (!wallet || wallet.role !== 'support_buddy') return null;

        const rules = this.state.commissionRules['support_buddy'];
        const commission = rules.commissions.subscription_conversion;

        wallet.balance += commission;
        wallet.totalEarnings += commission;

        wallet.transactions.push({
            type: 'conversion_bonus',
            amount: commission,
            reason: `Subscription conversion bonus (Customer ${customerId}, ₹${subscriptionAmount})`,
            customerId: customerId,
            subscriptionAmount: subscriptionAmount,
            timestamp: new Date().toISOString(),
            status: 'completed'
        });

        this.updateDailyEarnings(staffId, commission);
        this.saveStaffWallets();

        console.log(`🎉 Support Buddy ${staffId} earned ₹${commission} for subscription conversion`);
        return commission;
    },

    /**
     * Add commission for delivery
     */
    addDeliveryCommission(staffId, deliveryId, isOnTime = false) {
        const wallet = this.state.staffWallets[staffId];
        if (!wallet || wallet.role !== 'delivery_buddy') return null;

        const rules = this.state.commissionRules['delivery_buddy'];
        let commission = rules.commissions.per_delivery;

        if (isOnTime) {
            commission += rules.commissions.on_time_bonus;
        }

        wallet.balance += commission;
        wallet.totalEarnings += commission;

        wallet.transactions.push({
            type: 'delivery_commission',
            amount: commission,
            reason: `Delivery commission (Delivery #${deliveryId}${isOnTime ? ' - On Time Bonus' : ''})`,
            deliveryId: deliveryId,
            isOnTime: isOnTime,
            timestamp: new Date().toISOString(),
            status: 'completed'
        });

        this.updateDailyEarnings(staffId, commission);
        this.saveStaffWallets();

        console.log(`🚚 Delivery Buddy ${staffId} earned ₹${commission} for delivery ${deliveryId}`);
        return commission;
    },

    /**
     * Add instant order bonus
     */
    addInstantOrderBonus(staffId, orderId) {
        const wallet = this.state.staffWallets[staffId];
        if (!wallet || wallet.role !== 'delivery_buddy') return null;

        const bonus = this.state.commissionRules['delivery_buddy'].commissions.instant_order_bonus;

        wallet.balance += bonus;
        wallet.totalEarnings += bonus;

        wallet.transactions.push({
            type: 'instant_bonus',
            amount: bonus,
            reason: `Instant order bonus (Order #${orderId})`,
            orderId: orderId,
            timestamp: new Date().toISOString(),
            status: 'completed'
        });

        this.updateDailyEarnings(staffId, bonus);
        this.saveStaffWallets();

        return bonus;
    },

    /**
     * Add performance bonus (monthly)
     */
    addPerformanceBonus(staffId, metricsCount) {
        const wallet = this.state.staffWallets[staffId];
        if (!wallet) return null;

        const rules = this.state.commissionRules[wallet.role];
        const bonusKey = wallet.role === 'support_buddy' ? 
            `tier${Math.ceil(metricsCount / 50)}_${metricsCount}orders` :
            `tier${Math.ceil(metricsCount / 100)}_${metricsCount}deliveries`;

        const bonus = rules.commissions.performance_bonus[bonusKey] || 0;

        if (bonus > 0) {
            wallet.balance += bonus;
            wallet.totalEarnings += bonus;

            wallet.transactions.push({
                type: 'performance_bonus',
                amount: bonus,
                reason: `Performance bonus (${metricsCount} ${wallet.role === 'support_buddy' ? 'orders' : 'deliveries'} this month)`,
                metricsCount: metricsCount,
                timestamp: new Date().toISOString(),
                status: 'completed'
            });

            this.updateDailyEarnings(staffId, bonus);
            this.saveStaffWallets();

            console.log(`🏆 ${wallet.role} ${staffId} earned ₹${bonus} performance bonus`);
        }

        return bonus;
    },

    // ========== EARNINGS TRACKING ==========

    updateDailyEarnings(staffId, amount) {
        const today = EarlyBirdUtils.getDateString(new Date());

        if (!this.state.earnings[staffId]) {
            this.state.earnings[staffId] = { daily: {}, weekly: {}, monthly: {}, lifetime: 0 };
        }

        // Daily
        if (!this.state.earnings[staffId].daily[today]) {
            this.state.earnings[staffId].daily[today] = 0;
        }
        this.state.earnings[staffId].daily[today] += amount;

        // Lifetime
        this.state.earnings[staffId].lifetime += amount;

        this.saveStaffWallets();
    },

    getDailyEarnings(staffId, date = null) {
        const dateStr = date ? EarlyBirdUtils.getDateString(date) : EarlyBirdUtils.getDateString(new Date());
        return this.state.earnings[staffId]?.daily[dateStr] || 0;
    },

    getWeeklyEarnings(staffId) {
        const earnings = this.state.earnings[staffId];
        if (!earnings) return 0;

        let total = 0;
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            const dateStr = EarlyBirdUtils.getDateString(date);
            total += earnings.daily[dateStr] || 0;
        }

        return total;
    },

    getMonthlyEarnings(staffId) {
        const earnings = this.state.earnings[staffId];
        if (!earnings) return 0;

        let total = 0;
        const today = new Date();
        const currentMonth = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');

        Object.keys(earnings.daily).forEach(dateStr => {
            if (dateStr.startsWith(currentMonth)) {
                total += earnings.daily[dateStr];
            }
        });

        return total;
    },

    // ========== WITHDRAWAL SYSTEM ==========

    /**
     * Request withdrawal
     */
    requestWithdrawal(staffId, amount, method = 'instant') {
        const wallet = this.state.staffWallets[staffId];
        if (!wallet) return { success: false, message: 'Staff not found' };

        const rules = this.state.commissionRules[wallet.role];
        if (amount < rules.minWithdrawal) {
            return { 
                success: false, 
                message: `Minimum withdrawal amount: ₹${rules.minWithdrawal}` 
            };
        }

        if (amount > wallet.balance) {
            return { 
                success: false, 
                message: `Insufficient balance. Available: ₹${wallet.balance}` 
            };
        }

        const withdrawalId = EarlyBirdUtils.generateId();
        const withdrawal = {
            id: withdrawalId,
            staffId: staffId,
            amount: amount,
            method: method,  // 'instant', 'weekly', 'monthly'
            bankAccount: wallet.bankAccount,
            status: 'pending',  // 'pending' -> 'approved' -> 'completed' -> 'failed'
            requestedAt: new Date().toISOString(),
            completedAt: null
        };

        if (!this.state.withdrawalRequests[staffId]) {
            this.state.withdrawalRequests[staffId] = [];
        }

        this.state.withdrawalRequests[staffId].push(withdrawal);

        // Deduct from balance (pending)
        wallet.balance -= amount;
        wallet.pendingWithdrawal += amount;

        wallet.transactions.push({
            type: 'withdrawal_request',
            amount: amount,
            reason: `Withdrawal request (${method})`,
            withdrawalId: withdrawalId,
            timestamp: new Date().toISOString(),
            status: 'pending'
        });

        this.saveStaffWallets();

        console.log(`💸 Withdrawal request ${withdrawalId}: ₹${amount} for ${staffId}`);
        return { 
            success: true, 
            withdrawalId: withdrawalId,
            message: 'Withdrawal request submitted. Processing in 1-2 business days.'
        };
    },

    /**
     * Approve withdrawal (Admin only)
     */
    approveWithdrawal(withdrawalId) {
        let found = false;

        for (const staffId in this.state.withdrawalRequests) {
            const withdrawal = this.state.withdrawalRequests[staffId].find(w => w.id === withdrawalId);
            if (withdrawal) {
                withdrawal.status = 'approved';
                found = true;
                break;
            }
        }

        if (found) {
            this.saveStaffWallets();
            console.log(`✅ Withdrawal ${withdrawalId} approved`);
            return { success: true, message: 'Withdrawal approved' };
        }

        return { success: false, message: 'Withdrawal not found' };
    },

    /**
     * Complete withdrawal (Bank processed)
     */
    completeWithdrawal(withdrawalId) {
        let found = false;
        let staffId = null;

        for (const sId in this.state.withdrawalRequests) {
            const withdrawal = this.state.withdrawalRequests[sId].find(w => w.id === withdrawalId);
            if (withdrawal) {
                withdrawal.status = 'completed';
                withdrawal.completedAt = new Date().toISOString();
                found = true;
                staffId = sId;
                break;
            }
        }

        if (found && staffId) {
            const wallet = this.state.staffWallets[staffId];
            const withdrawal = this.state.withdrawalRequests[staffId].find(w => w.id === withdrawalId);
            wallet.totalWithdrawals += withdrawal.amount;
            wallet.pendingWithdrawal -= withdrawal.amount;

            wallet.transactions.push({
                type: 'withdrawal_completed',
                amount: withdrawal.amount,
                reason: 'Withdrawal completed',
                withdrawalId: withdrawalId,
                timestamp: new Date().toISOString(),
                status: 'completed'
            });

            this.saveStaffWallets();
            console.log(`💰 Withdrawal ${withdrawalId} completed. Amount transferred to bank.`);
            return { success: true, message: 'Withdrawal completed' };
        }

        return { success: false, message: 'Withdrawal not found' };
    },

    getPendingWithdrawals(staffId) {
        return (this.state.withdrawalRequests[staffId] || []).filter(w => w.status === 'pending');
    },

    // ========== LEADERBOARD ==========

    /**
     * Get leaderboard for role
     */
    getLeaderboard(role) {
        const leaderboard = [];

        for (const staffId in this.state.staffWallets) {
            const wallet = this.state.staffWallets[staffId];
            if (wallet.role === role) {
                const monthlyEarnings = this.getMonthlyEarnings(staffId);
                leaderboard.push({
                    staffId: staffId,
                    name: wallet.name,
                    totalEarnings: wallet.totalEarnings,
                    monthlyEarnings: monthlyEarnings,
                    weeklyEarnings: this.getWeeklyEarnings(staffId),
                    balance: wallet.balance,
                    orderCount: wallet.transactions.filter(t => t.type === 'commission').length,
                    totalWithdrawals: wallet.totalWithdrawals
                });
            }
        }

        // Sort by monthly earnings (descending)
        return leaderboard.sort((a, b) => b.monthlyEarnings - a.monthlyEarnings);
    },

    // ========== DASHBOARD DATA ==========

    /**
     * Get staff dashboard data
     */
    getStaffDashboard(staffId) {
        const wallet = this.state.staffWallets[staffId];
        if (!wallet) return null;

        const today = EarlyBirdUtils.getDateString(new Date());
        const dailyEarnings = this.state.earnings[staffId]?.daily[today] || 0;
        const weeklyEarnings = this.getWeeklyEarnings(staffId);
        const monthlyEarnings = this.getMonthlyEarnings(staffId);

        return {
            staffId: staffId,
            name: wallet.name,
            role: wallet.role,
            balance: wallet.balance,
            pendingWithdrawal: wallet.pendingWithdrawal,
            earnings: {
                today: dailyEarnings,
                thisWeek: weeklyEarnings,
                thisMonth: monthlyEarnings,
                lifetime: this.state.earnings[staffId].lifetime
            },
            recentTransactions: wallet.transactions.slice(-10),
            pendingWithdrawals: this.getPendingWithdrawals(staffId),
            leaderboardPosition: this.getLeaderboardPosition(staffId)
        };
    },

    getLeaderboardPosition(staffId) {
        const wallet = this.state.staffWallets[staffId];
        if (!wallet) return null;

        const leaderboard = this.getLeaderboard(wallet.role);
        const position = leaderboard.findIndex(l => l.staffId === staffId) + 1;

        return {
            position: position,
            outOf: leaderboard.length,
            monthlyEarningsRank: leaderboard[position - 1]?.monthlyEarnings || 0
        };
    }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EarlyBirdStaffWallet;
}

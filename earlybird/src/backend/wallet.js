// ============================================
// EarlyBird Wallet System
// Complete wallet management with UPI integration
// ============================================

const EarlyBirdWallet = {
    
    // State
    state: {
        wallets: {},  // { userId: { balance, type, transactions, upiLink } }
        transactions: {},  // { userId: [transaction history] }
        paymentLinks: {},  // { customerId: permanentUpiLink }
        withdrawalMethods: ['instant', 'weekly', 'monthly'],
        withdrawalRequests: []
    },
    
    // ========== INITIALIZATION ==========
    
    init() {
        this.loadWallets();
        this.loadPaymentLinks();
        console.log('EarlyBirdWallet initialized');
    },
    
    loadWallets() {
        this.state.wallets = EarlyBirdUtils.loadFromStorage('earlybird_wallets', {});
        this.state.transactions = EarlyBirdUtils.loadFromStorage('earlybird_transactions', {});
    },
    
    saveWallets() {
        EarlyBirdUtils.saveToStorage('earlybird_wallets', this.state.wallets);
        EarlyBirdUtils.saveToStorage('earlybird_transactions', this.state.transactions);
    },
    
    loadPaymentLinks() {
        this.state.paymentLinks = EarlyBirdUtils.loadFromStorage('earlybird_payment_links', {});
    },
    
    savePaymentLinks() {
        EarlyBirdUtils.saveToStorage('earlybird_payment_links', this.state.paymentLinks);
    },
    
    // ========== WALLET CREATION & MANAGEMENT ==========
    
    /**
     * Create or get wallet for user
     */
    getOrCreateWallet(userId, userType, userName = '') {
        if (!this.state.wallets[userId]) {
            this.state.wallets[userId] = {
                userId: userId,
                userType: userType,  // 'customer', 'delivery_boy', 'staff', 'supplier'
                userName: userName,
                balance: 0,
                advance: 0,
                totalEarnings: 0,
                totalDeductions: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                
                // For customers: ONE permanent UPI link
                upiLink: userType === 'customer' ? 
                    this.generatePermanentUpiLink(userId) : null
            };
            
            this.state.transactions[userId] = [];
            this.saveWallets();
        }
        
        return this.state.wallets[userId];
    },
    
    /**
     * Generate permanent UPI link for customer
     */
    generatePermanentUpiLink(customerId) {
        if (this.state.paymentLinks[customerId]) {
            return this.state.paymentLinks[customerId];
        }
        
        // Generate unique link
        const link = `pay.earlybird.app/c/${customerId}`;
        this.state.paymentLinks[customerId] = link;
        this.savePaymentLinks();
        
        return link;
    },
    
    /**
     * Get wallet balance
     */
    getBalance(userId, userType = 'customer') {
        const wallet = this.getOrCreateWallet(userId, userType);
        return wallet.balance;
    },
    
    /**
     * Get complete wallet details
     */
    getWallet(userId) {
        return this.state.wallets[userId] || null;
    },
    
    // ========== TRANSACTIONS ==========
    
    /**
     * Add credit to wallet (for customers: top-up; for staff: commission)
     */
    addCredit(userId, userType, amount, source, description = '') {
        const wallet = this.getOrCreateWallet(userId, userType);
        const transaction = this.createTransaction(userId, 'credit', amount, source, description);
        
        wallet.balance += amount;
        if (userType === 'delivery_boy' || userType === 'staff') {
            wallet.totalEarnings += amount;
        }
        wallet.updatedAt = new Date().toISOString();
        
        this.addToTransactionHistory(userId, transaction);
        this.saveWallets();
        
        EarlyBirdUtils.showToast(`₹${amount} credited to wallet`, 'success');
        return transaction;
    },
    
    /**
     * Top-up wallet (customer adds money)
     */
    topUp(customerId, amount, paymentMethod = 'upi') {
        const wallet = this.getOrCreateWallet(customerId, 'customer');
        const beforeBalance = wallet.balance;
        
        // In production, integrate with payment gateway
        const transaction = this.createTransaction(
            customerId,
            'topup',
            amount,
            paymentMethod,
            `Wallet top-up via ${paymentMethod}`
        );
        
        wallet.balance += amount;
        wallet.advance += amount;  // Top-up goes to advance credit
        wallet.updatedAt = new Date().toISOString();
        
        // #region agent log - wallet topUp
        fetch('http://127.0.0.1:7242/ingest/703d05fc-6195-4f5e-8f5a-fbf2bc8ae341', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: 'debug-session',
                runId: 'pre-fix-1',
                hypothesisId: 'H1',
                location: 'wallet.js:topUp',
                message: 'Wallet topUp applied',
                data: {
                    customerId,
                    amount,
                    paymentMethod,
                    beforeBalance,
                    afterBalance: wallet.balance
                },
                timestamp: Date.now()
            })
        }).catch(() => {});
        // #endregion agent log
        
        this.addToTransactionHistory(customerId, transaction);
        this.saveWallets();
        
        EarlyBirdUtils.showToast(`₹${amount} added to wallet`, 'success');
        return transaction;
    },
    
    /**
     * Deduct from wallet (for payments, bills, etc.)
     */
    deduct(userId, userType, amount, reason, description = '') {
        const wallet = this.getOrCreateWallet(userId, userType);
        
        if (wallet.balance < amount) {
            EarlyBirdUtils.showToast('Insufficient wallet balance', 'error');
            return null;
        }
        
        const transaction = this.createTransaction(
            userId,
            'debit',
            amount,
            reason,
            description || `Deduction for ${reason}`
        );
        
        wallet.balance -= amount;
        wallet.totalDeductions += amount;
        wallet.updatedAt = new Date().toISOString();
        
        this.addToTransactionHistory(userId, transaction);
        this.saveWallets();
        
        EarlyBirdUtils.showToast(`₹${amount} deducted from wallet`, 'info');
        return transaction;
    },
    
    /**
     * Auto-deduct from wallet after delivery (for wallet payments)
     */
    autoDeductAfterDelivery(customerId, amount, deliveryId) {
        return this.deduct(customerId, 'customer', amount, 'delivery_payment', `Payment for delivery ${deliveryId}`);
    },
    
    /**
     * Auto-deduct from wallet for order payment
     * Handles partial payments (wallet + remaining amount)
     * Returns: { success: boolean, deducted: number, remaining: number, transaction: object }
     */
    autoDeductFromWallet(customerId, orderAmount, orderId) {
        const wallet = this.getOrCreateWallet(customerId, 'customer');
        const currentBalance = wallet.balance || 0;
        
        // #region agent log - wallet autoDeductFromWallet entry
        fetch('http://127.0.0.1:7242/ingest/703d05fc-6195-4f5e-8f5a-fbf2bc8ae341', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: 'debug-session',
                runId: 'pre-fix-1',
                hypothesisId: 'H2',
                location: 'wallet.js:autoDeductFromWallet',
                message: 'autoDeductFromWallet called',
                data: {
                    customerId,
                    orderAmount,
                    orderId,
                    currentBalance
                },
                timestamp: Date.now()
            })
        }).catch(() => {});
        // #endregion agent log
        
        if (currentBalance >= orderAmount) {
            // Full payment from wallet
            const transaction = this.deduct(
                customerId, 
                'customer', 
                orderAmount, 
                'order_payment', 
                `Payment for order ${orderId}`
            );
            
            // Log to calendar
            if (typeof EarlyBirdCalendar !== 'undefined') {
                EarlyBirdCalendar.addEvent({
                    type: 'WALLET_DEBIT',
                    customerId: customerId,
                    date: EarlyBirdUtils.getDateString(new Date()),
                    amount: orderAmount,
                    description: `Order payment: ${orderId}`,
                    orderId: orderId
                });
            }
            
            return {
                success: true,
                deducted: orderAmount,
                remaining: 0,
                transaction: transaction,
                paymentStatus: 'paid_from_wallet'
            };
        } else if (currentBalance > 0) {
            // Partial payment from wallet
            const transaction = this.deduct(
                customerId,
                'customer',
                currentBalance,
                'order_payment_partial',
                `Partial payment for order ${orderId} (₹${currentBalance} of ₹${orderAmount})`
            );
            
            const remaining = orderAmount - currentBalance;
            
            // Log to calendar
            if (typeof EarlyBirdCalendar !== 'undefined') {
                EarlyBirdCalendar.addEvent({
                    type: 'WALLET_DEBIT',
                    customerId: customerId,
                    date: EarlyBirdUtils.getDateString(new Date()),
                    amount: currentBalance,
                    description: `Partial payment for order ${orderId}. Remaining: ₹${remaining}`,
                    orderId: orderId
                });
            }
            
            return {
                success: true,
                deducted: currentBalance,
                remaining: remaining,
                transaction: transaction,
                paymentStatus: 'partially_paid'
            };
        } else {
            // No wallet balance
            return {
                success: false,
                deducted: 0,
                remaining: orderAmount,
                transaction: null,
                paymentStatus: 'payment_pending'
            };
        }
    },
    
    /**
     * Add transaction (for compatibility with payment-links.js)
     */
    addTransaction(userId, transactionData) {
        const transaction = this.createTransaction(
            userId,
            transactionData.type || 'credit',
            transactionData.amount,
            transactionData.reason || transactionData.source || 'manual',
            transactionData.description || transactionData.reason || ''
        );
        
        // Update wallet balance if credit
        if (transactionData.type === 'credit' || transactionData.type === 'topup') {
            const wallet = this.getOrCreateWallet(userId, 'customer');
            wallet.balance = (wallet.balance || 0) + transactionData.amount;
            this.saveWallets();
        }
        
        this.addToTransactionHistory(userId, transaction);
        return transaction;
    },
    
    /**
     * Add commission/earnings to staff wallet (real-time)
     */
    addCommission(staffId, amount, source = 'delivery_earnings', description = '') {
        return this.addCredit(staffId, 'delivery_boy', amount, source, description || `Earnings from ${source}`);
    },
    
    /**
     * Create transaction object
     */
    createTransaction(userId, type, amount, source, description) {
        return {
            id: 'TXN_' + EarlyBirdUtils.generateId(),
            userId: userId,
            type: type,  // credit, debit, topup, withdrawal, commission
            amount: amount,
            source: source,  // source or reason
            description: description,
            timestamp: new Date().toISOString(),
            balanceAfter: this.getBalance(userId)
        };
    },
    
    /**
     * Add transaction to history
     */
    addToTransactionHistory(userId, transaction) {
        if (!this.state.transactions[userId]) {
            this.state.transactions[userId] = [];
        }
        
        this.state.transactions[userId].unshift(transaction);  // Most recent first
        
        // Keep only last 1000 transactions per user
        if (this.state.transactions[userId].length > 1000) {
            this.state.transactions[userId].pop();
        }
    },
    
    /**
     * Get transaction history
     */
    getTransactions(userId, limit = 50) {
        const transactions = this.state.transactions[userId] || [];
        return transactions.slice(0, limit);
    },
    
    /**
     * Get transaction summary for date range
     */
    getTransactionSummary(userId, startDate, endDate) {
        const transactions = this.getTransactions(userId, 1000);
        
        const filtered = transactions.filter(t => {
            const txDate = new Date(t.timestamp).toISOString().split('T')[0];
            return txDate >= startDate && txDate <= endDate;
        });
        
        const summary = {
            period: { start: startDate, end: endDate },
            credits: filtered.filter(t => t.type === 'credit'),
            debits: filtered.filter(t => t.type === 'debit'),
            
            totalCredit: filtered
                .filter(t => t.type === 'credit')
                .reduce((sum, t) => sum + t.amount, 0),
            
            totalDebit: filtered
                .filter(t => t.type === 'debit')
                .reduce((sum, t) => sum + t.amount, 0),
            
            netChange: 0,
            transactions: filtered
        };
        
        summary.netChange = summary.totalCredit - summary.totalDebit;
        return summary;
    },
    
    // ========== WITHDRAWALS ==========
    
    /**
     * Request withdrawal (for staff and delivery boys)
     */
    requestWithdrawal(userId, userType, amount, method = 'instant') {
        const wallet = this.getOrCreateWallet(userId, userType);
        
        if (wallet.balance < amount) {
            EarlyBirdUtils.showToast('Insufficient balance for withdrawal', 'error');
            return null;
        }
        
        if (!this.state.withdrawalMethods.includes(method)) {
            EarlyBirdUtils.showToast('Invalid withdrawal method', 'error');
            return null;
        }
        
        const withdrawal = {
            id: 'WTH_' + EarlyBirdUtils.generateId(),
            userId: userId,
            userType: userType,
            amount: amount,
            method: method,
            status: 'pending',  // pending, approved, transferred, failed
            requestedAt: new Date().toISOString(),
            transferredAt: null,
            failureReason: null
        };
        
        this.state.withdrawalRequests.push(withdrawal);
        
        // Create transaction for pending withdrawal
        const transaction = this.createTransaction(
            userId,
            'withdrawal',
            amount,
            method,
            `Withdrawal request via ${method}`
        );
        
        this.addToTransactionHistory(userId, transaction);
        this.saveWallets();
        
        EarlyBirdUtils.showToast('Withdrawal request submitted', 'success');
        return withdrawal;
    },
    
    /**
     * Approve withdrawal (admin function)
     */
    approveWithdrawal(withdrawalId) {
        const withdrawal = this.state.withdrawalRequests.find(w => w.id === withdrawalId);
        if (!withdrawal) return null;
        
        withdrawal.status = 'approved';
        
        // In production, integrate with payment gateway
        setTimeout(() => {
            withdrawal.status = 'transferred';
            withdrawal.transferredAt = new Date().toISOString();
            this.saveWallets();
        }, 1000);
        
        return withdrawal;
    },
    
    /**
     * Get all withdrawal requests
     */
    getWithdrawalRequests(status = null) {
        if (status) {
            return this.state.withdrawalRequests.filter(w => w.status === status);
        }
        return this.state.withdrawalRequests;
    },
    
    // ========== PERMANENT UPI LINK ==========
    
    /**
     * Get customer's permanent UPI link
     */
    getPaymentLink(customerId) {
        return this.generatePermanentUpiLink(customerId);
    },
    
    /**
     * Generate payment link text
     */
    getPaymentLinkText(customerId) {
        return `pay.earlybird.app/c/${customerId}`;
    },
    
    /**
     * Get payment link HTML
     */
    getPaymentLinkHTML(customerId) {
        const link = this.getPaymentLink(customerId);
        return `
            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px;">
                <div style="font-size: 12px; color: #666; margin-bottom: 8px; font-weight: 600;">
                    Your Permanent Payment Link
                </div>
                <div style="background: white; padding: 12px; border-radius: 6px; margin-bottom: 12px; font-family: monospace; word-break: break-all;">
                    ${link}
                </div>
                <div style="font-size: 12px; color: #999;">
                    Use this link for all UPI payments. Save in your UPI app!
                </div>
            </div>
        `;
    },
    
    // ========== ANALYTICS & REPORTING ==========
    
    /**
     * Get wallet balance report for all users
     */
    getAllWalletBalances(userType = null) {
        const wallets = Object.values(this.state.wallets);
        
        if (userType) {
            return wallets.filter(w => w.userType === userType);
        }
        
        return wallets;
    },
    
    /**
     * Get top earners
     */
    getTopEarners(limit = 10) {
        return Object.values(this.state.wallets)
            .filter(w => w.userType === 'delivery_boy')
            .sort((a, b) => b.totalEarnings - a.totalEarnings)
            .slice(0, limit)
            .map(w => ({
                userId: w.userId,
                userName: w.userName,
                totalEarnings: w.totalEarnings,
                currentBalance: w.balance,
                transactions: this.getTransactions(w.userId, 10).length
            }));
    },
    
    /**
     * Get daily revenue
     */
    getDailyRevenue(dateStr) {
        let totalRevenue = 0;
        
        Object.keys(this.state.transactions).forEach(userId => {
            const transactions = this.state.transactions[userId];
            
            const dayTransactions = transactions.filter(t => {
                const txDate = new Date(t.timestamp).toISOString().split('T')[0];
                return txDate === dateStr && t.type === 'debit' && t.source === 'delivery_payment';
            });
            
            totalRevenue += dayTransactions.reduce((sum, t) => sum + t.amount, 0);
        });
        
        return totalRevenue;
    },
    
    /**
     * Get revenue for date range
     */
    getRevenueReport(startDate, endDate) {
        let totalRevenue = 0;
        let totalPayments = 0;
        let totalCommissions = 0;
        
        Object.keys(this.state.transactions).forEach(userId => {
            const transactions = this.state.transactions[userId];
            
            transactions.forEach(t => {
                const txDate = new Date(t.timestamp).toISOString().split('T')[0];
                
                if (txDate >= startDate && txDate <= endDate) {
                    if (t.type === 'debit' && t.source === 'delivery_payment') {
                        totalRevenue += t.amount;
                        totalPayments += 1;
                    } else if (t.type === 'credit' && (t.source === 'delivery_earnings' || t.source === 'commission')) {
                        totalCommissions += t.amount;
                    }
                }
            });
        });
        
        return {
            period: { start: startDate, end: endDate },
            totalRevenue: totalRevenue,
            totalPayments: totalPayments,
            totalCommissions: totalCommissions,
            netProfit: totalRevenue - totalCommissions,
            avgOrderValue: totalPayments > 0 ? (totalRevenue / totalPayments).toFixed(2) : 0
        };
    },
    
    /**
     * Get customer lifetime value
     */
    getCustomerLTV(customerId) {
        const transactions = this.getTransactions(customerId, 1000);
        
        const payments = transactions.filter(t => t.type === 'debit' && t.source === 'delivery_payment');
        
        return {
            customerId: customerId,
            totalSpent: payments.reduce((sum, t) => sum + t.amount, 0),
            totalTransactions: payments.length,
            avgOrderValue: payments.length > 0 ? 
                (payments.reduce((sum, t) => sum + t.amount, 0) / payments.length).toFixed(2) : 0,
            lastPayment: payments.length > 0 ? payments[0].timestamp : null,
            firstPayment: payments.length > 0 ? payments[payments.length - 1].timestamp : null
        };
    },
    
    // ========== AUDIT & COMPLIANCE ==========
    
    /**
     * Get complete audit trail for user
     */
    getAuditTrail(userId) {
        const wallet = this.getWallet(userId);
        const transactions = this.getTransactions(userId, 1000);
        
        return {
            user: wallet,
            totalTransactions: transactions.length,
            dateRange: {
                earliest: transactions.length > 0 ? transactions[transactions.length - 1].timestamp : null,
                latest: transactions.length > 0 ? transactions[0].timestamp : null
            },
            transactions: transactions,
            currentBalance: wallet.balance,
            totalEarnings: wallet.totalEarnings,
            totalDeductions: wallet.totalDeductions
        };
    },
    
    /**
     * Export transaction data (for compliance/tax)
     */
    exportTransactions(userId, format = 'csv') {
        const transactions = this.getTransactions(userId, 1000);
        
        if (format === 'csv') {
            let csv = 'Date,Type,Amount,Source,Description,Balance\n';
            
            transactions.forEach(t => {
                const date = new Date(t.timestamp).toLocaleDateString();
                csv += `"${date}","${t.type}","${t.amount}","${t.source}","${t.description}","${t.balanceAfter}"\n`;
            });
            
            return csv;
        }
        
        return transactions;
    }
};

// Initialize on load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        EarlyBirdWallet.init();
    });
}

// ============================================
// EarlyBird Payment Links System
// CRITICAL GAP #2: Exclusive UPI Payment Links
// One permanent link per customer: pay.earlybird.app/c/[CUSTOMER_ID]
// ============================================

const EarlyBirdPaymentLinks = {
    
    state: {
        paymentLinks: {},  // { customerId: { link, upiId, displayName, whatsappText } }
        webhookLogs: {},   // Track webhook payments
        pendingOrders: {}  // Orders awaiting payment confirmation
    },

    // ========== INITIALIZATION ==========

    init() {
        this.loadPaymentLinks();
        console.log('✅ EarlyBirdPaymentLinks initialized with permanent UPI links');
    },

    loadPaymentLinks() {
        this.state.paymentLinks = EarlyBirdUtils.loadFromStorage('earlybird_payment_links_system', {});
        this.state.webhookLogs = EarlyBirdUtils.loadFromStorage('earlybird_webhook_logs', {});
        this.state.pendingOrders = EarlyBirdUtils.loadFromStorage('earlybird_pending_payment_orders', {});
    },

    savePaymentLinks() {
        EarlyBirdUtils.saveToStorage('earlybird_payment_links_system', this.state.paymentLinks);
        EarlyBirdUtils.saveToStorage('earlybird_webhook_logs', this.state.webhookLogs);
        EarlyBirdUtils.saveToStorage('earlybird_pending_payment_orders', this.state.pendingOrders);
    },

    // ========== PAYMENT LINK CREATION ==========

    /**
     * Generate permanent payment link on customer creation
     * Format: pay.earlybird.app/c/[CUSTOMER_ID]
     */
    createPaymentLink(customerId, customerName, phoneNumber) {
        if (this.state.paymentLinks[customerId]) {
            return this.state.paymentLinks[customerId];
        }

        const upiId = `earlybird.${customerId}@okhdfcbank`;
        const link = `pay.earlybird.app/c/${customerId}`;

        this.state.paymentLinks[customerId] = {
            customerId: customerId,
            link: link,
            upiId: upiId,
            customerName: customerName,
            phoneNumber: phoneNumber,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            totalPaymentsMade: 0,
            totalAmountPaid: 0,
            lastPaymentDate: null,
            status: 'active'
        };

        this.savePaymentLinks();
        console.log(`💳 Created permanent payment link for ${customerId}: ${link}`);
        return this.state.paymentLinks[customerId];
    },

    /**
     * Get payment link for customer
     */
    getPaymentLink(customerId) {
        return this.state.paymentLinks[customerId] || null;
    },

    /**
     * Get WhatsApp message template for payment
     */
    getWhatsAppPaymentMessage(customerId, amount, orderId = null) {
        const link = this.state.paymentLinks[customerId];
        if (!link) return null;

        const amountText = `₹${amount}`;
        const orderText = orderId ? `\n📦 Order ID: ${orderId}` : '';
        
        return {
            message: `🌅 EarlyBird Payment\n\nHi ${link.customerName}!\n\nYour payment amount: ${amountText}${orderText}\n\nJust open your UPI app (GPay/PhonePe/Paytm), find "EarlyBird Payment" in your favorites, and pay ${amountText}.\n\nLink saved for future payments!`,
            link: link.link,
            upiId: link.upiId,
            amount: amount,
            customerId: customerId,
            timestamp: new Date().toISOString()
        };
    },

    // ========== WEBHOOK PAYMENT PROCESSING ==========

    /**
     * Process incoming payment webhook from UPI provider
     * Webhook payload structure:
     * {
     *   transactionId: "TXN123456",
     *   customerId: "CUST001",
     *   amount: 2500,
     *   status: "SUCCESS|FAILED|PENDING",
     *   upiRef: "123456789@okhdfcbank",
     *   timestamp: "2026-01-20T10:30:00Z"
     * }
     */
    processPaymentWebhook(webhook) {
        const { transactionId, customerId, amount, status, upiRef, timestamp } = webhook;

        console.log(`⚙️ Processing webhook for ${customerId}: ₹${amount} - ${status}`);

        // Log webhook
        if (!this.state.webhookLogs[customerId]) {
            this.state.webhookLogs[customerId] = [];
        }

        this.state.webhookLogs[customerId].push({
            transactionId: transactionId,
            amount: amount,
            status: status,
            upiRef: upiRef,
            receivedAt: timestamp,
            processedAt: new Date().toISOString()
        });

        if (status === 'SUCCESS') {
            this.handleSuccessfulPayment(customerId, amount, transactionId, upiRef);
        } else if (status === 'FAILED') {
            this.handleFailedPayment(customerId, amount, transactionId);
        }

        this.savePaymentLinks();
        return { success: true, message: 'Webhook processed' };
    },

    /**
     * Handle successful payment
     * 1. Add to wallet
     * 2. Auto-approve associated order
     * 3. Send confirmation
     */
    handleSuccessfulPayment(customerId, amount, transactionId, upiRef) {
        console.log(`✅ Payment successful: ${customerId} - ₹${amount}`);

        // Step 1: Add to wallet
        if (typeof EarlyBirdWallet !== 'undefined') {
            const beforeBalance = EarlyBirdWallet.getBalance(customerId, 'customer');
            EarlyBirdWallet.topUp(customerId, amount, 'upi_link');
            
            // Also add transaction record
            EarlyBirdWallet.addTransaction(customerId, {
                type: 'credit',
                amount: amount,
                reason: 'UPI Payment via Exclusive Link',
                description: `Payment received via UPI link. Transaction: ${transactionId}`,
                transactionId: transactionId,
                upiRef: upiRef,
                status: 'completed'
            });
            
            // Log to calendar
            if (typeof EarlyBirdCalendar !== 'undefined') {
                EarlyBirdCalendar.addEvent({
                    type: 'WALLET_CREDIT',
                    customerId: customerId,
                    date: EarlyBirdUtils.getDateString(new Date()),
                    amount: amount,
                    description: `Payment received via UPI link`,
                    transactionId: transactionId
                });
            }
            
            // #region agent log - payment-links handleSuccessfulPayment wallet update
            try {
                const afterBalance = EarlyBirdWallet.getBalance(customerId, 'customer');
                fetch('http://127.0.0.1:7242/ingest/703d05fc-6195-4f5e-8f5a-fbf2bc8ae341', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: 'debug-session',
                        runId: 'pre-fix-1',
                        hypothesisId: 'H5',
                        location: 'payment-links.js:handleSuccessfulPayment',
                        message: 'Wallet updated from payment link',
                        data: {
                            customerId,
                            amount,
                            beforeBalance,
                            afterBalance
                        },
                        timestamp: Date.now()
                    })
                }).catch(() => {});
            } catch (e) {
                // swallow logging errors
            }
            // #endregion agent log
        }

        // Step 2: Auto-deduct from wallet for pending orders
        if (typeof EarlyBirdWallet !== 'undefined') {
            const pendingOrders = this.state.pendingOrders[customerId] || [];
            let remainingAmount = amount;
            
            pendingOrders.forEach(order => {
                if (order.paymentStatus === 'pending' && remainingAmount > 0) {
                    const orderAmount = order.totalAmount || 0;
                    
                    if (orderAmount <= remainingAmount) {
                        // Auto-deduct from wallet
                        const deductionResult = EarlyBirdWallet.autoDeductFromWallet(
                            customerId, 
                            orderAmount, 
                            order.id
                        );
                        
                        if (deductionResult.success) {
                            order.paymentStatus = 'completed';
                            order.paymentMethod = 'upi_link';
                            order.transactionId = transactionId;
                            order.approvedAt = new Date().toISOString();
                            order.paidFromWallet = deductionResult.deducted;
                            remainingAmount -= orderAmount;
                            
                            console.log(`📦 Auto-approved order ${order.id} for ${customerId}`);

                            // Update order in orders system
                            if (typeof EarlyBirdOrders !== 'undefined') {
                                const fullOrder = EarlyBirdOrders.getOrder(order.id);
                                if (fullOrder) {
                                    fullOrder.status = 'confirmed';
                                    fullOrder.paymentMethod = 'upi_link';
                                    fullOrder.paymentStatus = 'completed';
                                    fullOrder.paidAt = new Date().toISOString();
                                    EarlyBirdOrders.saveOrders();
                                }
                            }
                            
                            // #region agent log - payment-links auto-approve order
                            fetch('http://127.0.0.1:7242/ingest/703d05fc-6195-4f5e-8f5a-fbf2bc8ae341', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    sessionId: 'debug-session',
                                    runId: 'pre-fix-1',
                                    hypothesisId: 'H6',
                                    location: 'payment-links.js:handleSuccessfulPayment',
                                    message: 'Pending order auto-approved from payment link',
                                    data: {
                                        customerId,
                                        orderId: order.id,
                                        orderAmount,
                                        deductionStatus: deductionResult.paymentStatus
                                    },
                                    timestamp: Date.now()
                                })
                            }).catch(() => {});
                            // #endregion agent log
                        }
                    }
                }
            });
        }

        // Update payment link stats
        const link = this.state.paymentLinks[customerId];
        if (link) {
            link.totalPaymentsMade++;
            link.totalAmountPaid = (link.totalAmountPaid || 0) + amount;
            link.updatedAt = new Date().toISOString();
        }

        this.savePaymentLinks();
    },

    /**
     * Handle failed payment
     */
    handleFailedPayment(customerId, amount, transactionId) {
        console.log(`❌ Payment failed: ${customerId} - ₹${amount}`);

        // Add failed transaction
        if (typeof EarlyBirdWallet !== 'undefined') {
            EarlyBirdWallet.addTransaction(customerId, {
                type: 'failed_payment',
                amount: amount,
                reason: 'UPI Payment Failed',
                description: `Payment attempt failed. Transaction ID: ${transactionId}`,
                transactionId: transactionId,
                status: 'failed'
            });
        }

        // Keep order in pending state for retry
    },

    // ========== PENDING ORDER MANAGEMENT ==========

    /**
     * Add order to pending payment
     */
    addPendingPaymentOrder(customerId, order) {
        if (!this.state.pendingOrders[customerId]) {
            this.state.pendingOrders[customerId] = [];
        }

        this.state.pendingOrders[customerId].push({
            id: order.id,
            totalAmount: order.totalAmount || 0,
            items: order.items,
            paymentStatus: 'pending',
            createdAt: new Date().toISOString()
        });

        this.savePaymentLinks();
    },

    /**
     * Get pending orders for customer
     */
    getPendingPaymentOrders(customerId) {
        return this.state.pendingOrders[customerId] || [];
    },

    /**
     * Mark order as paid
     */
    markOrderAsPaid(customerId, orderId) {
        if (this.state.pendingOrders[customerId]) {
            const order = this.state.pendingOrders[customerId].find(o => o.id === orderId);
            if (order) {
                order.paymentStatus = 'completed';
            }
        }
        this.savePaymentLinks();
    },

    // ========== PAYMENT REMINDER SYSTEM ==========

    /**
     * Generate payment reminder escalation schedule
     * Day 1-3: Gentle reminder
     * Day 4-7: Balance warning
     * Day 8-10: Support Buddy call trigger
     * Day 11+: Subscription pause warning
     */
    generatePaymentReminderEscalation(customerId, dueAmount) {
        const today = new Date();
        
        return {
            level1_day1: {
                day: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000),
                message: `🌅 Hi! Your EarlyBird balance is low. Current: ₹${dueAmount}. Please pay when convenient.`,
                channel: 'whatsapp',
                type: 'gentle'
            },
            level2_day4: {
                day: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000),
                message: `⚠️ Balance Alert: ₹${dueAmount} pending. Please pay to continue receiving orders.`,
                channel: 'whatsapp',
                type: 'warning'
            },
            level3_day8: {
                day: new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000),
                message: `🔴 Action Required: Outstanding balance ₹${dueAmount}. Your Support Buddy will call you shortly.`,
                channel: 'whatsapp',
                action: 'trigger_support_buddy_call',
                type: 'urgent'
            },
            level4_day11: {
                day: new Date(today.getTime() + 11 * 24 * 60 * 60 * 1000),
                message: `⛔ Subscription will pause if payment not received. Current due: ₹${dueAmount}`,
                channel: 'whatsapp',
                action: 'pause_subscription_warning',
                type: 'critical'
            }
        };
    },

    // ========== ANALYTICS ==========

    /**
     * Get payment link statistics
     */
    getPaymentLinkStats() {
        let totalLinks = Object.keys(this.state.paymentLinks).length;
        let totalPaymentsMade = 0;
        let totalAmountProcessed = 0;
        let successfulPayments = 0;
        let failedPayments = 0;

        Object.values(this.state.paymentLinks).forEach(link => {
            totalPaymentsMade += link.totalPaymentsMade || 0;
            totalAmountProcessed += link.totalAmountPaid || 0;
        });

        Object.values(this.state.webhookLogs).forEach(logs => {
            logs.forEach(log => {
                if (log.status === 'SUCCESS') successfulPayments++;
                else if (log.status === 'FAILED') failedPayments++;
            });
        });

        return {
            activePaymentLinks: totalLinks,
            totalPaymentsMade: totalPaymentsMade,
            totalAmountProcessed: totalAmountProcessed,
            successfulPayments: successfulPayments,
            failedPayments: failedPayments,
            successRate: totalPaymentsMade > 0 ? 
                ((successfulPayments / totalPaymentsMade) * 100).toFixed(2) + '%' : '0%'
        };
    },

    /**
     * Get customer payment history
     */
    getPaymentHistory(customerId) {
        return {
            paymentLink: this.state.paymentLinks[customerId] || null,
            webhookLogs: this.state.webhookLogs[customerId] || [],
            pendingOrders: this.state.pendingOrders[customerId] || []
        };
    }
};

// Export for use in frontend
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EarlyBirdPaymentLinks;
}

/**
 * EarlyBird Payment System
 * Handles payment processing, wallet management, and transaction tracking
 * Integration with payment gateways (Razorpay, PayU)
 */

class EarlyBirdPayments {
    constructor() {
        this.transactions = [];
        this.paymentMethods = ['razorpay', 'payumoney', 'upi', 'wallet'];
        this.gatewayConfig = {
            razorpay: {
                key: 'rzp_live_demo', // Demo key
                currency: 'INR'
            },
            payumoney: {
                merchantId: 'earlybird_demo',
                currency: 'INR'
            }
        };
        this.loadTransactions();
    }

    /**
     * Generate payment link for customer
     */
    generatePaymentLink(orderId, customerId, amount) {
        const paymentLink = {
            id: `pay_${Date.now()}`,
            orderId: orderId,
            customerId: customerId,
            amount: amount,
            currency: 'INR',
            description: `Payment for Order ${orderId}`,
            shortUrl: `https://earlybird.link/${Date.now()}`,
            upiString: `upi://pay?pa=earlybird@upi&pn=EarlyBird&am=${amount}&tn=Order%20${orderId}`,
            createdAt: new Date().toISOString(),
            status: 'active',
            expiresAt: new Date(Date.now() + 24*60*60*1000).toISOString(),
            attempts: 0
        };

        localStorage.setItem(`payment_link_${paymentLink.id}`, JSON.stringify(paymentLink));
        
        // Attempt to sync with backend
        fetch('/api/wallet/payment-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentLink)
        }).catch(() => console.log('Backend sync pending'));

        return paymentLink;
    }

    /**
     * Process payment via Razorpay
     */
    processPaymentRazorpay(customerId, amount, orderId) {
        const paymentLink = this.generatePaymentLink(orderId, customerId, amount);
        
        // Simulate Razorpay payment flow
        const paymentData = {
            key: this.gatewayConfig.razorpay.key,
            amount: amount * 100, // Convert to paise
            currency: this.gatewayConfig.razorpay.currency,
            name: 'EarlyBird',
            description: `Payment for Order ${orderId}`,
            order_id: paymentLink.id,
            prefill: {
                email: `customer${customerId}@earlybird.com`,
                contact: '8888888888'
            },
            theme: {
                color: '#2ecc71'
            }
        };

        // Store for webhook confirmation
        localStorage.setItem(`razorpay_order_${paymentLink.id}`, JSON.stringify(paymentData));

        // Return payment link that would open Razorpay
        return paymentLink;
    }

    /**
     * Process payment via PayUMoney
     */
    processPaymentPayU(customerId, amount, orderId) {
        const paymentLink = this.generatePaymentLink(orderId, customerId, amount);
        
        const paymentData = {
            key: this.gatewayConfig.payumoney.merchantId,
            txnid: paymentLink.id,
            amount: amount,
            productinfo: `Order ${orderId}`,
            firstname: `Customer${customerId}`,
            email: `customer${customerId}@earlybird.com`,
            phone: '8888888888',
            surl: '/api/payments/payu-success',
            furl: '/api/payments/payu-failure',
            hash: this.generatePayUHash(paymentLink.id, amount)
        };

        localStorage.setItem(`payu_order_${paymentLink.id}`, JSON.stringify(paymentData));
        return paymentLink;
    }

    /**
     * Generate PayU hash for security
     */
    generatePayUHash(txnid, amount) {
        // Simplified hash (in production, use server-side hash)
        return btoa(`${txnid}:${amount}:demo_key`);
    }

    /**
     * Process UPI payment
     */
    processPaymentUPI(customerId, amount, orderId) {
        const paymentLink = this.generatePaymentLink(orderId, customerId, amount);
        
        const upiData = {
            pa: 'earlybird@okaxis',
            pn: 'EarlyBird Dairy',
            am: amount,
            tn: `Order ${orderId}`,
            tr: paymentLink.id
        };

        const upiLink = `upi://pay?pa=${upiData.pa}&pn=${encodeURIComponent(upiData.pn)}&am=${upiData.am}&tn=${encodeURIComponent(upiData.tn)}`;
        
        paymentLink.upiLink = upiLink;
        localStorage.setItem(`upi_order_${paymentLink.id}`, JSON.stringify(paymentLink));

        return paymentLink;
    }

    /**
     * Process wallet payment (direct deduction)
     */
    async processPaymentWallet(customerId, amount, orderId) {
        const walletData = JSON.parse(localStorage.getItem(`wallet_${customerId}`) || '{"balance": 5000, "transactions": []}');
        
        if (walletData.balance < amount) {
            return {
                success: false,
                message: `Insufficient wallet balance. Required: ₹${amount}, Available: ₹${walletData.balance}`,
                orderId: orderId
            };
        }

        // Deduct from wallet
        const transaction = {
            id: `txn_${Date.now()}`,
            orderId: orderId,
            amount: amount,
            type: 'debit',
            method: 'wallet',
            timestamp: new Date().toISOString(),
            status: 'completed',
            description: `Payment for Order ${orderId}`
        };

        walletData.balance -= amount;
        walletData.transactions = walletData.transactions || [];
        walletData.transactions.push(transaction);

        localStorage.setItem(`wallet_${customerId}`, JSON.stringify(walletData));
        this.recordTransaction(transaction);

        // Sync with backend
        fetch('/api/wallet/deduct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerId,
                amount,
                orderId,
                transaction
            })
        }).catch(() => console.log('Backend sync pending'));

        return {
            success: true,
            message: `✓ Payment of ₹${amount} processed from wallet`,
            orderId: orderId,
            remainingBalance: walletData.balance,
            transaction: transaction
        };
    }

    /**
     * Handle webhook from payment gateway
     */
    handlePaymentWebhook(paymentData) {
        const { paymentId, status, amount, orderId } = paymentData;
        
        const transaction = {
            id: paymentId,
            orderId: orderId,
            amount: amount,
            type: status === 'success' ? 'credit' : 'debit',
            method: 'gateway',
            status: status,
            timestamp: new Date().toISOString(),
            gatewayResponse: paymentData
        };

        this.recordTransaction(transaction);

        if (status === 'success') {
            this.updateOrderPaymentStatus(orderId, 'paid', paymentId);
        } else if (status === 'failed') {
            this.updateOrderPaymentStatus(orderId, 'failed', paymentId);
        }

        // Sync with backend
        fetch('/api/payments/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction)
        }).catch(() => console.log('Backend sync pending'));

        return transaction;
    }

    /**
     * Record transaction in localStorage and attempt backend sync
     */
    recordTransaction(transaction) {
        this.transactions.push(transaction);
        localStorage.setItem('transactions', JSON.stringify(this.transactions));

        // Sync with backend
        fetch('/api/payments/record-transaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction)
        }).catch(() => console.log('Backend sync pending'));
    }

    /**
     * Update order payment status
     */
    updateOrderPaymentStatus(orderId, status, paymentId) {
        const orders = JSON.parse(localStorage.getItem('orders') || '[]');
        const order = orders.find(o => o.id === orderId);
        
        if (order) {
            order.paymentStatus = status;
            order.paymentId = paymentId;
            order.paidAt = new Date().toISOString();
            localStorage.setItem('orders', JSON.stringify(orders));

            // Sync with backend
            fetch(`/api/orders/${orderId}/payment-status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: status,
                    paymentId: paymentId,
                    paidAt: order.paidAt
                })
            }).catch(() => console.log('Backend sync pending'));
        }

        return order;
    }

    /**
     * Get wallet balance for customer
     */
    getWalletBalance(customerId) {
        const walletData = JSON.parse(localStorage.getItem(`wallet_${customerId}`) || '{"balance": 5000, "transactions": []}');
        return walletData.balance;
    }

    /**
     * Add credit to wallet (refund, cashback, etc)
     */
    addWalletCredit(customerId, amount, reason) {
        const walletData = JSON.parse(localStorage.getItem(`wallet_${customerId}`) || '{"balance": 5000, "transactions": []}');
        
        const transaction = {
            id: `txn_${Date.now()}`,
            amount: amount,
            type: 'credit',
            reason: reason,
            timestamp: new Date().toISOString(),
            status: 'completed'
        };

        walletData.balance += amount;
        walletData.transactions = walletData.transactions || [];
        walletData.transactions.push(transaction);

        localStorage.setItem(`wallet_${customerId}`, JSON.stringify(walletData));
        this.recordTransaction(transaction);

        return {
            success: true,
            newBalance: walletData.balance,
            transaction: transaction
        };
    }

    /**
     * Load transactions from localStorage
     */
    loadTransactions() {
        const stored = localStorage.getItem('transactions');
        this.transactions = stored ? JSON.parse(stored) : [];
    }

    /**
     * Get transaction history
     */
    getTransactionHistory(customerId = null, limit = 50) {
        let transactions = this.transactions;
        if (customerId) {
            transactions = transactions.filter(t => t.customerId === customerId);
        }
        return transactions.slice(-limit).reverse();
    }

    /**
     * Retry failed payment
     */
    retryPayment(paymentLinkId, method = 'razorpay') {
        const paymentLink = JSON.parse(localStorage.getItem(`payment_link_${paymentLinkId}`) || '{}');
        
        if (!paymentLink.id) {
            return { success: false, message: 'Payment link not found' };
        }

        paymentLink.attempts = (paymentLink.attempts || 0) + 1;
        localStorage.setItem(`payment_link_${paymentLinkId}`, JSON.stringify(paymentLink));

        return this.processPayment(paymentLink.customerId, paymentLink.amount, paymentLink.orderId, method);
    }

    /**
     * Process payment with method selection
     */
    processPayment(customerId, amount, orderId, method = 'razorpay') {
        switch(method) {
            case 'razorpay':
                return this.processPaymentRazorpay(customerId, amount, orderId);
            case 'payumoney':
                return this.processPaymentPayU(customerId, amount, orderId);
            case 'upi':
                return this.processPaymentUPI(customerId, amount, orderId);
            case 'wallet':
                return this.processPaymentWallet(customerId, amount, orderId);
            default:
                return { error: 'Invalid payment method' };
        }
    }

    /**
     * Get payment status
     */
    getPaymentStatus(paymentLinkId) {
        const paymentLink = JSON.parse(localStorage.getItem(`payment_link_${paymentLinkId}`) || '{}');
        return paymentLink;
    }

    /**
     * Cancel payment
     */
    cancelPayment(paymentLinkId) {
        const paymentLink = JSON.parse(localStorage.getItem(`payment_link_${paymentLinkId}`) || '{}');
        
        if (!paymentLink.id) {
            return { success: false, message: 'Payment link not found' };
        }

        paymentLink.status = 'cancelled';
        paymentLink.cancelledAt = new Date().toISOString();
        localStorage.setItem(`payment_link_${paymentLinkId}`, JSON.stringify(paymentLink));

        return {
            success: true,
            message: `Payment ${paymentLinkId} cancelled`,
            paymentLink: paymentLink
        };
    }
}

// Global instance
const earlyBirdPayments = new EarlyBirdPayments();

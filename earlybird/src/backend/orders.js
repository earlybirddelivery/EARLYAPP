// ============================================
// EarlyBird Orders Engine
// Order Management - Cart, Checkout, Confirmation
// ============================================

const EarlyBirdOrders = {
    
    // State
    state: {
        cart: [],  // Array of cart items
        orders: [],  // Array of completed orders
        selectedDate: null,
        selectedCustomerId: null,
        selectedDeliverySlot: 'am'  // 'am' or 'pm'
    },
    
    // ========== INITIALIZATION ==========
    
    init() {
        this.loadOrders();
        this.loadCart();
        console.log('EarlyBirdOrders initialized');
    },
    
    loadOrders() {
        this.state.orders = EarlyBirdUtils.loadFromStorage('earlybird_orders', []);
    },
    
    saveOrders() {
        EarlyBirdUtils.saveToStorage('earlybird_orders', this.state.orders);
    },
    
    loadCart() {
        this.state.cart = EarlyBirdUtils.loadFromStorage('earlybird_cart', []);
    },
    
    saveCart() {
        EarlyBirdUtils.saveToStorage('earlybird_cart', this.state.cart);
    },
    
    // ========== CART MANAGEMENT ==========
    
    /**
     * Add item to cart
     */
    addToCart(productId, quantity = 1) {
        const products = EarlyBirdUtils.getMockProducts();
        const product = products.find(p => p.id === productId);
        
        if (!product) {
            EarlyBirdUtils.showToast('Product not found', 'error');
            return false;
        }
        
        // Check if product already in cart
        const cartItem = this.state.cart.find(item => item.productId === productId);
        
        if (cartItem) {
            cartItem.quantity += quantity;
        } else {
            this.state.cart.push({
                productId: productId,
                productName: product.name,
                price: product.price,
                quantity: quantity,
                unit: product.unit
            });
        }
        
        this.saveCart();
        EarlyBirdUtils.showToast(`${product.name} added to cart`, 'success');
        return true;
    },
    
    /**
     * Remove item from cart
     */
    removeFromCart(productId) {
        const index = this.state.cart.findIndex(item => item.productId === productId);
        if (index !== -1) {
            const itemName = this.state.cart[index].productName;
            this.state.cart.splice(index, 1);
            this.saveCart();
            EarlyBirdUtils.showToast(`${itemName} removed from cart`, 'info');
            return true;
        }
        return false;
    },
    
    /**
     * Update quantity of item in cart
     */
    updateQuantity(productId, quantity) {
        const cartItem = this.state.cart.find(item => item.productId === productId);
        if (cartItem) {
            if (quantity <= 0) {
                return this.removeFromCart(productId);
            }
            cartItem.quantity = quantity;
            this.saveCart();
            return true;
        }
        return false;
    },
    
    /**
     * Get cart items
     */
    getCart() {
        return this.state.cart;
    },
    
    /**
     * Clear cart
     */
    clearCart() {
        this.state.cart = [];
        this.saveCart();
    },
    
    /**
     * Calculate cart total
     */
    calculateTotal() {
        return this.state.cart.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);
    },
    
    /**
     * Get item count in cart
     */
    getCartItemCount() {
        return this.state.cart.reduce((count, item) => count + item.quantity, 0);
    },
    
    // ========== ORDER CREATION ==========
    
    /**
     * Open create order modal
     */
    openCreateOrder(dateStr, customerId) {
        this.state.selectedDate = dateStr;
        this.state.selectedCustomerId = customerId;
        
        // Show order creation modal or page
        EarlyBirdUtils.showToast('Opening order creation...', 'info');
        
        // In a real app, this would open a modal or navigate to order creation page
        console.log('Create order for date:', dateStr, 'Customer:', customerId);
    },
    
    /**
     * Submit order
     */
    submitOrder(orderData) {
        if (this.state.cart.length === 0) {
            EarlyBirdUtils.showToast('Cart is empty', 'error');
            return null;
        }
        
        const customerId = this.state.selectedCustomerId || orderData.customerId;
        const orderTotal = this.calculateTotal();
        
        // #region agent log - orders submitOrder entry
        fetch('http://127.0.0.1:7242/ingest/703d05fc-6195-4f5e-8f5a-fbf2bc8ae341', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: 'debug-session',
                runId: 'pre-fix-1',
                hypothesisId: 'H3',
                location: 'orders.js:submitOrder',
                message: 'submitOrder called',
                data: {
                    customerId,
                    orderTotal,
                    paymentMethod: orderData.paymentMethod || 'wallet',
                    cartLength: this.state.cart.length
                },
                timestamp: Date.now()
            })
        }).catch(() => {});
        // #endregion agent log
        
        const order = {
            id: 'ORD_' + EarlyBirdUtils.generateId(),
            customerId: customerId,
            customerPhone: orderData.customerPhone,
            deliveryDate: this.state.selectedDate || orderData.deliveryDate,
            deliverySlot: this.state.selectedDeliverySlot || orderData.deliverySlot,
            items: [...this.state.cart],
            total: orderTotal,
            totalAmount: orderTotal,  // Alias for payment-links compatibility
            status: 'pending',  // pending, confirmed, out_for_delivery, delivered, cancelled
            paymentMethod: orderData.paymentMethod || 'wallet',
            paymentStatus: 'pending',
            createdAt: new Date().toISOString(),
            notes: orderData.notes || ''
        };
        
        // Add to pending payment orders if using payment links
        if (typeof EarlyBirdPaymentLinks !== 'undefined' && orderData.paymentMethod === 'upi_link') {
            EarlyBirdPaymentLinks.addPendingPaymentOrder(customerId, order);
        }
        
        // Try auto-deduct from wallet if payment method is wallet
        if (orderData.paymentMethod === 'wallet' && typeof EarlyBirdWallet !== 'undefined') {
            const deductionResult = EarlyBirdWallet.autoDeductFromWallet(customerId, orderTotal, order.id);
            
            if (deductionResult.success) {
                if (deductionResult.remaining === 0) {
                    // Fully paid from wallet
                    order.paymentStatus = 'completed';
                    order.status = 'confirmed';
                    order.paidAt = new Date().toISOString();
                    order.paidFromWallet = deductionResult.deducted;
                } else {
                    // Partially paid, need remaining payment
                    order.paymentStatus = 'partially_paid';
                    order.paidFromWallet = deductionResult.deducted;
                    order.remainingAmount = deductionResult.remaining;
                    
                    // Add to pending payment for remaining amount
                    if (typeof EarlyBirdPaymentLinks !== 'undefined') {
                        const partialOrder = { ...order, totalAmount: deductionResult.remaining };
                        EarlyBirdPaymentLinks.addPendingPaymentOrder(customerId, partialOrder);
                    }
                }
            } else {
                // No wallet balance, payment pending
                order.paymentStatus = 'payment_pending';
            }
        }
        
        // #region agent log - orders submitOrder after wallet logic
        fetch('http://127.0.0.1:7242/ingest/703d05fc-6195-4f5e-8f5a-fbf2bc8ae341', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: 'debug-session',
                runId: 'pre-fix-1',
                hypothesisId: 'H4',
                location: 'orders.js:submitOrder',
                message: 'submitOrder after wallet deduction',
                data: {
                    orderId: order.id,
                    paymentStatus: order.paymentStatus,
                    status: order.status,
                    paidFromWallet: order.paidFromWallet || 0,
                    remainingAmount: order.remainingAmount || 0
                },
                timestamp: Date.now()
            })
        }).catch(() => {});
        // #endregion agent log
        
        this.state.orders.push(order);
        this.saveOrders();
        
        // Add to calendar
        if (typeof EarlyBirdCalendar !== 'undefined') {
            EarlyBirdCalendar.addEvent({
                type: 'ORDER_PLACED',
                customerId: customerId,
                date: order.deliveryDate,
                orderId: order.id,
                amount: orderTotal,
                description: `Order placed: ${order.items.length} items`,
                status: order.status
            });
        }
        
        // Add order commission to support buddy if order was created by support
        // (This would be set in orderData if created by support buddy)
        if (orderData.createdByStaffId && typeof EarlyBirdStaffWallet !== 'undefined') {
            EarlyBirdStaffWallet.addOrderCommission(
                orderData.createdByStaffId,
                order.id,
                orderTotal
            );
        }
        
        this.clearCart();
        
        EarlyBirdUtils.showToast('Order created successfully', 'success');
        return order;
    },
    
    /**
     * Update order (for payment-links compatibility)
     */
    updateOrder(orderId, updates) {
        const order = this.getOrder(orderId);
        if (order) {
            Object.assign(order, updates);
            this.saveOrders();
            return true;
        }
        return false;
    },
    
    /**
     * Get order by ID
     */
    getOrder(orderId) {
        return this.state.orders.find(order => order.id === orderId);
    },
    
    /**
     * Get orders for customer
     */
    getOrdersForCustomer(customerId) {
        return this.state.orders.filter(order => order.customerId === customerId);
    },
    
    /**
     * Get orders for date
     */
    getOrdersForDate(dateStr) {
        return this.state.orders.filter(order => order.deliveryDate === dateStr);
    },
    
    /**
     * Update order status
     */
    updateOrderStatus(orderId, status) {
        const order = this.getOrder(orderId);
        if (order) {
            order.status = status;
            this.saveOrders();
            EarlyBirdUtils.showToast(`Order status updated to ${status}`, 'info');
            return true;
        }
        return false;
    },
    
    /**
     * Cancel order
     */
    cancelOrder(orderId, reason = '') {
        const order = this.getOrder(orderId);
        if (order && order.status !== 'delivered') {
            order.status = 'cancelled';
            order.cancellationReason = reason;
            order.cancelledAt = new Date().toISOString();
            this.saveOrders();
            EarlyBirdUtils.showToast('Order cancelled', 'info');
            return true;
        }
        return false;
    },
    
    // ========== ORDER CONFIRMATION ==========
    
    /**
     * Send order confirmation via WhatsApp
     */
    sendConfirmation(orderId) {
        const order = this.getOrder(orderId);
        if (!order) {
            EarlyBirdUtils.showToast('Order not found', 'error');
            return false;
        }
        
        const itemsText = order.items.map(item => 
            `• ${item.productName} x${item.quantity} = ₹${item.price * item.quantity}`
        ).join('\n');
        
        const slotText = order.deliverySlot === 'am' ? 'Morning (6-9 AM)' : 'Evening (5-8 PM)';
        
        const message = `
🌅 *EarlyBird Order Confirmation*

Order ID: ${order.id}
Date: ${EarlyBirdUtils.formatDate(order.deliveryDate, 'long')}
Slot: ${slotText}

*Items:*
${itemsText}

*Total: ₹${order.total}*
Payment: ${order.paymentMethod}

Thank you for your order! 🙏
        `.trim();
        
        const link = EarlyBirdUtils.generateWhatsAppLink(order.customerPhone, message);
        window.open(link, '_blank');
        
        EarlyBirdUtils.showToast('WhatsApp confirmation sent', 'success');
        return true;
    },
    
    /**
     * Get order summary HTML
     */
    getOrderSummaryHTML(order) {
        const itemsHTML = order.items.map(item => `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                <div>
                    <div>${item.productName}</div>
                    <div style="font-size: 12px; color: #999;">x${item.quantity} ${item.unit}</div>
                </div>
                <div style="font-weight: 600;">₹${item.price * item.quantity}</div>
            </div>
        `).join('');
        
        const slotText = order.deliverySlot === 'am' ? 'Morning (6-9 AM)' : 'Evening (5-8 PM)';
        
        return `
            <div style="max-width: 400px;">
                <div style="padding: 16px; background: #f5f5f5; border-radius: 8px; margin-bottom: 16px;">
                    <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Order ID</div>
                    <div style="font-weight: 600; font-size: 16px;">${order.id}</div>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <div style="font-size: 12px; color: #666; font-weight: 600; margin-bottom: 8px;">Items</div>
                    ${itemsHTML}
                </div>
                
                <div style="padding: 12px; background: #f9f9f9; border-radius: 8px; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span>Subtotal:</span>
                        <span>₹${order.total}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 16px; border-top: 1px solid #ddd; padding-top: 8px;">
                        <span>Total:</span>
                        <span>₹${order.total}</span>
                    </div>
                </div>
                
                <div style="background: #f0f8ff; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                    <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Delivery</div>
                    <div style="font-weight: 600;">${EarlyBirdUtils.formatDate(order.deliveryDate, 'long')}</div>
                    <div style="font-size: 12px; color: #666;">${slotText}</div>
                </div>
            </div>
        `;
    },
    
    // ========== BULK OPERATIONS ==========
    
    /**
     * Get all orders for date range
     */
    getOrdersForDateRange(startDate, endDate) {
        return this.state.orders.filter(order => {
            const orderDate = order.deliveryDate;
            return orderDate >= startDate && orderDate <= endDate;
        });
    },
    
    /**
     * Get delivery schedule for date
     */
    getDeliverySchedule(dateStr) {
        const orders = this.getOrdersForDate(dateStr);
        
        return {
            am: orders.filter(o => o.deliverySlot === 'am' && o.status !== 'cancelled'),
            pm: orders.filter(o => o.deliverySlot === 'pm' && o.status !== 'cancelled'),
            total: orders.filter(o => o.status !== 'cancelled').length
        };
    }
};

// Initialize on load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        EarlyBirdOrders.init();
    });
}

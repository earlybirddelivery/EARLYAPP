// ============================================
// EarlyBird Delivery Engine
// Delivery Management with On-the-Fly Additions
// ============================================

const EarlyBirdDelivery = {
    
    // State
    state: {
        deliveries: [],      // Array of delivery assignments
        deliveryProofs: {},   // { deliveryId: { photo, signature, timestamp } }
        activeSessions: {},   // { deliveryBoyId: { currentDelivery, location, status } }
        failureReasons: []    // Pre-defined failure reasons
    },
    
    // ========== INITIALIZATION ==========
    
    init() {
        this.loadDeliveries();
        this.loadFailureReasons();
        console.log('EarlyBirdDelivery initialized');
    },
    
    loadDeliveries() {
        this.state.deliveries = EarlyBirdUtils.loadFromStorage('earlybird_deliveries', []);
    },
    
    saveDeliveries() {
        EarlyBirdUtils.saveToStorage('earlybird_deliveries', this.state.deliveries);
    },
    
    loadFailureReasons() {
        this.state.failureReasons = [
            'Customer not available',
            'Wrong address',
            'Customer refused',
            'Payment issue',
            'Item out of stock',
            'Vehicle breakdown',
            'Customer requested postponement',
            'Area blockade',
            'Other'
        ];
    },
    
    // ========== DELIVERY CREATION & ASSIGNMENT ==========
    
    /**
     * Create delivery from order
     */
    createDeliveryFromOrder(order, deliveryBoyId) {
        const delivery = {
            id: 'DEL_' + EarlyBirdUtils.generateId(),
            orderId: order.id,
            customerId: order.customerId,
            customerName: order.customerName || 'Customer',
            customerPhone: order.customerPhone,
            deliveryDate: order.deliveryDate,
            deliverySlot: order.deliverySlot || 'am',
            
            // Assigned delivery boy
            deliveryBoyId: deliveryBoyId,
            deliveryBoyName: 'Delivery Boy #' + deliveryBoyId.slice(-3),
            
            // Items
            originalItems: [...order.items],
            currentItems: [...order.items],
            addedItems: [],  // Items added on-the-fly
            
            // Totals
            originalTotal: order.total,
            currentTotal: order.total,
            
            // Status
            status: 'pending',  // pending, assigned, in_transit, delivered, failed
            assignedAt: new Date().toISOString(),
            pickedUpAt: null,
            deliveredAt: null,
            failedAt: null,
            
            // Delivery Details
            location: null,
            gpsCoordinates: null,
            deliveryProof: null,  // Photo path
            signature: null,
            notes: '',
            
            // Cash Collection
            cashCollected: 0,
            paymentMethod: order.paymentMethod,
            
            // Failure Info
            failureReason: null,
            failureNotes: '',
            
            // Metadata
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.state.deliveries.push(delivery);
        this.saveDeliveries();
        
        EarlyBirdUtils.showToast('Delivery created', 'success');
        return delivery;
    },
    
    /**
     * Get deliveries for specific slot and date
     */
    getDeliveriesForSlot(slot, dateStr) {
        return this.state.deliveries.filter(d => 
            d.deliveryDate === dateStr && 
            d.deliverySlot === slot && 
            d.status !== 'failed'
        );
    },
    
    /**
     * Get all deliveries for delivery boy
     */
    getDeliveriesForBoy(deliveryBoyId, date = null) {
        let deliveries = this.state.deliveries.filter(d => 
            d.deliveryBoyId === deliveryBoyId && 
            d.status !== 'failed'
        );
        
        if (date) {
            deliveries = deliveries.filter(d => d.deliveryDate === date);
        }
        
        return deliveries;
    },
    
    /**
     * Get delivery by ID
     */
    getDelivery(deliveryId) {
        return this.state.deliveries.find(d => d.id === deliveryId);
    },
    
    // ========== ON-THE-FLY ADDITIONS (CRITICAL PRD FEATURE) ==========
    
    /**
     * Add instant item during delivery (delivery boy adds new item at customer door)
     */
    addItemOnTheFly(deliveryId, productId, quantity, scheduleDate = null) {
        const delivery = this.getDelivery(deliveryId);
        if (!delivery) {
            EarlyBirdUtils.showToast('Delivery not found', 'error');
            return null;
        }
        
        const products = EarlyBirdUtils.getMockProducts();
        const product = products.find(p => p.id === productId);
        
        if (!product) {
            EarlyBirdUtils.showToast('Product not found', 'error');
            return null;
        }
        
        // Check if product already in current items
        const existingItem = delivery.currentItems.find(item => item.productId === productId);
        
        if (existingItem) {
            // Just update quantity
            return this.addExtraQuantity(deliveryId, productId, quantity);
        }
        
        // Add as new item
        const addedItem = {
            productId: productId,
            productName: product.name,
            price: product.price,
            quantity: quantity,
            unit: product.unit,
            addedAt: new Date().toISOString(),
            scheduleDate: scheduleDate,  // null = deliver today, or future date
            status: 'added_pending'
        };
        
        delivery.addedItems.push(addedItem);
        delivery.currentItems.push(addedItem);
        
        // Recalculate total
        this.recalculateDeliveryTotal(deliveryId);
        
        EarlyBirdUtils.showToast(`${product.name} added on-the-fly`, 'success');
        this.saveDeliveries();
        
        return addedItem;
    },
    
    /**
     * Add extra quantity of existing item
     */
    addExtraQuantity(deliveryId, productId, extraQty) {
        const delivery = this.getDelivery(deliveryId);
        if (!delivery) {
            EarlyBirdUtils.showToast('Delivery not found', 'error');
            return null;
        }
        
        const item = delivery.currentItems.find(item => item.productId === productId);
        if (!item) {
            EarlyBirdUtils.showToast('Product not in current delivery', 'error');
            return null;
        }
        
        item.quantity += extraQty;
        
        // Mark as modified if it's an original item
        if (!item.scheduleDate) {
            item.quantityModified = true;
            item.modifiedAt = new Date().toISOString();
        }
        
        this.recalculateDeliveryTotal(deliveryId);
        
        EarlyBirdUtils.showToast(`${extraQty} more added`, 'success');
        this.saveDeliveries();
        
        return item;
    },
    
    /**
     * Schedule item for future date (delivery boy can schedule items to be delivered later)
     */
    scheduleItemForFuture(deliveryId, productId, quantity, futureDate) {
        const delivery = this.getDelivery(deliveryId);
        if (!delivery) {
            EarlyBirdUtils.showToast('Delivery not found', 'error');
            return null;
        }
        
        const products = EarlyBirdUtils.getMockProducts();
        const product = products.find(p => p.id === productId);
        
        if (!product) {
            EarlyBirdUtils.showToast('Product not found', 'error');
            return null;
        }
        
        // Create item scheduled for future
        const scheduledItem = {
            productId: productId,
            productName: product.name,
            price: product.price,
            quantity: quantity,
            unit: product.unit,
            scheduleDate: futureDate,
            addedAt: new Date().toISOString(),
            status: 'scheduled_for_future'
        };
        
        // Add to calendar for future date
        const futureDelivery = this.getOrCreateDeliveryForDate(
            delivery.customerId,
            futureDate,
            delivery.deliverySlot
        );
        
        futureDelivery.currentItems.push(scheduledItem);
        this.recalculateDeliveryTotal(futureDelivery.id);
        
        EarlyBirdUtils.showToast(`${product.name} scheduled for ${EarlyBirdUtils.formatDate(futureDate, 'short')}`, 'success');
        this.saveDeliveries();
        
        return scheduledItem;
    },
    
    /**
     * Get or create delivery for customer on specific date
     */
    getOrCreateDeliveryForDate(customerId, dateStr, slot = 'am') {
        let delivery = this.state.deliveries.find(d => 
            d.customerId === customerId && 
            d.deliveryDate === dateStr && 
            d.deliverySlot === slot
        );
        
        if (!delivery) {
            // Create new delivery
            delivery = {
                id: 'DEL_' + EarlyBirdUtils.generateId(),
                customerId: customerId,
                deliveryDate: dateStr,
                deliverySlot: slot,
                status: 'scheduled',
                originalItems: [],
                currentItems: [],
                addedItems: [],
                originalTotal: 0,
                currentTotal: 0,
                createdAt: new Date().toISOString()
            };
            
            this.state.deliveries.push(delivery);
        }
        
        return delivery;
    },
    
    // ========== DELIVERY EXECUTION ==========
    
    /**
     * Mark delivery as in transit (delivery boy starts route)
     */
    startDelivery(deliveryId, location) {
        const delivery = this.getDelivery(deliveryId);
        if (!delivery) return null;
        
        delivery.status = 'in_transit';
        delivery.location = location;
        delivery.pickedUpAt = new Date().toISOString();
        
        this.saveDeliveries();
        EarlyBirdUtils.showToast('Delivery started', 'info');
        
        return delivery;
    },
    
    /**
     * Get current GPS location (mock implementation)
     */
    getCurrentLocation() {
        // In production, use actual GPS API
        return {
            latitude: 12.9716 + (Math.random() - 0.5) * 0.01,
            longitude: 77.5946 + (Math.random() - 0.5) * 0.01,
            accuracy: Math.random() * 20 + 5,
            timestamp: new Date().toISOString()
        };
    },
    
    /**
     * Update location in real-time
     */
    updateLocation(deliveryId, location) {
        const delivery = this.getDelivery(deliveryId);
        if (!delivery) return null;
        
        delivery.gpsCoordinates = location;
        delivery.updatedAt = new Date().toISOString();
        
        this.saveDeliveries();
        return delivery;
    },
    
    // ========== DELIVERY COMPLETION ==========
    
    /**
     * Mark delivery as delivered
     */
    markDelivered(deliveryId, proofData = {}) {
        const delivery = this.getDelivery(deliveryId);
        if (!delivery) {
            EarlyBirdUtils.showToast('Delivery not found', 'error');
            return null;
        }
        
        delivery.status = 'delivered';
        delivery.deliveredAt = new Date().toISOString();
        delivery.deliveryProof = proofData.photo || null;
        delivery.signature = proofData.signature || null;
        delivery.notes = proofData.notes || '';
        
        // Auto-deduct from wallet if payment method is wallet
        if (delivery.paymentMethod === 'wallet') {
            this.deductFromWallet(delivery.customerId, delivery.currentTotal);
        }
        
        // Add delivery commission to delivery boy
        if (delivery.deliveryBoyId && typeof EarlyBirdStaffWallet !== 'undefined') {
            const isOnTime = this.checkOnTimeDelivery(delivery);
            EarlyBirdStaffWallet.addDeliveryCommission(
                delivery.deliveryBoyId,
                deliveryId,
                isOnTime
            );
        }
        
        // Update calendar with delivered event
        this.addDeliveredEventToCalendar(delivery);
        
        this.saveDeliveries();
        EarlyBirdUtils.showToast('Delivery marked complete', 'success');
        
        return delivery;
    },
    
    /**
     * Collect cash payment
     */
    collectCash(deliveryId, amount) {
        const delivery = this.getDelivery(deliveryId);
        if (!delivery) return null;
        
        delivery.cashCollected = amount;
        delivery.paymentMethod = 'cash';
        
        // Add cash to delivery boy's earnings
        this.addDeliveryBoyEarnings(delivery.deliveryBoyId, amount);
        
        this.saveDeliveries();
        EarlyBirdUtils.showToast(`₹${amount} collected`, 'success');
        
        return delivery;
    },
    
    /**
     * Mark delivery as failed
     */
    markFailed(deliveryId, failureReason, notes = '') {
        const delivery = this.getDelivery(deliveryId);
        if (!delivery) return null;
        
        delivery.status = 'failed';
        delivery.failedAt = new Date().toISOString();
        delivery.failureReason = failureReason;
        delivery.failureNotes = notes;
        
        EarlyBirdUtils.showToast(`Delivery failed: ${failureReason}`, 'warning');
        this.saveDeliveries();
        
        return delivery;
    },
    
    // ========== FINANCIAL OPERATIONS ==========
    
    /**
     * Deduct amount from customer wallet
     */
    deductFromWallet(customerId, amount) {
        // This integrates with wallet.js
        if (typeof EarlyBirdWallet !== 'undefined') {
            EarlyBirdWallet.deduct(customerId, amount, 'delivery_payment');
        } else {
            console.log(`Deduct ₹${amount} from customer ${customerId} wallet`);
        }
    },
    
    /**
     * Check if delivery was on time
     */
    checkOnTimeDelivery(delivery) {
        if (!delivery.deliveredAt || !delivery.deliverySlot) return false;
        
        const deliveredTime = new Date(delivery.deliveredAt);
        const slotEnd = delivery.deliverySlot === 'am' ? 9 : 20; // 9 AM or 8 PM
        const slotHour = deliveredTime.getHours();
        
        return slotHour < slotEnd;
    },
    
    /**
     * Add earnings to delivery boy wallet
     */
    addDeliveryBoyEarnings(deliveryBoyId, amount) {
        // This integrates with wallet.js
        if (typeof EarlyBirdWallet !== 'undefined') {
            EarlyBirdWallet.addCommission(deliveryBoyId, amount, 'delivery_earnings');
        } else {
            console.log(`Add ₹${amount} earnings to delivery boy ${deliveryBoyId}`);
        }
    },
    
    // ========== RECALCULATION ==========
    
    /**
     * Recalculate total for delivery
     */
    recalculateDeliveryTotal(deliveryId) {
        const delivery = this.getDelivery(deliveryId);
        if (!delivery) return 0;
        
        const total = delivery.currentItems.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);
        
        delivery.currentTotal = total;
        return total;
    },
    
    /**
     * Get delivery summary
     */
    getDeliverySummary(deliveryId) {
        const delivery = this.getDelivery(deliveryId);
        if (!delivery) return null;
        
        const addedItemsCount = delivery.addedItems.length;
        const quantityChanges = delivery.currentItems.filter(item => item.quantityModified).length;
        
        return {
            deliveryId: delivery.id,
            customerId: delivery.customerId,
            customerName: delivery.customerName,
            customerPhone: delivery.customerPhone,
            date: delivery.deliveryDate,
            slot: delivery.deliverySlot,
            status: delivery.status,
            
            originalItems: delivery.originalItems.length,
            currentItems: delivery.currentItems.length,
            itemsAdded: addedItemsCount,
            quantityModified: quantityChanges,
            
            originalTotal: delivery.originalTotal,
            currentTotal: delivery.currentTotal,
            priceChange: delivery.currentTotal - delivery.originalTotal,
            
            cashCollected: delivery.cashCollected,
            paymentMethod: delivery.paymentMethod
        };
    },
    
    /**
     * Add delivered event to calendar
     */
    addDeliveredEventToCalendar(delivery) {
        if (typeof EarlyBirdCalendar !== 'undefined') {
            const event = {
                id: 'EVT_' + delivery.id,
                type: 'delivery',
                customer: delivery.customerName,
                customerId: delivery.customerId,
                time: delivery.deliverySlot === 'am' ? '8:00 AM' : '6:00 PM',
                status: 'completed',
                amount: delivery.currentTotal,
                details: `${delivery.currentItems.length} items`,
                createdAt: delivery.deliveredAt
            };
            
            EarlyBirdCalendar.addEvent(new Date(delivery.deliveryDate), event);
        }
    },
    
    // ========== BULK OPERATIONS ==========
    
    /**
     * Get daily route summary
     */
    getDailyRouteSummary(dateStr, slot) {
        const deliveries = this.getDeliveriesForSlot(slot, dateStr);
        
        return {
            date: dateStr,
            slot: slot,
            totalDeliveries: deliveries.length,
            pending: deliveries.filter(d => d.status === 'pending').length,
            inTransit: deliveries.filter(d => d.status === 'in_transit').length,
            completed: deliveries.filter(d => d.status === 'delivered').length,
            failed: deliveries.filter(d => d.status === 'failed').length,
            
            totalRevenue: deliveries
                .filter(d => d.status === 'delivered')
                .reduce((sum, d) => sum + d.currentTotal, 0),
            
            deliveries: deliveries.map(d => this.getDeliverySummary(d.id))
        };
    },
    
    /**
     * Get delivery boy performance metrics
     */
    getDeliveryBoyMetrics(deliveryBoyId, dateStr = null) {
        let deliveries = this.getDeliveriesForBoy(deliveryBoyId, dateStr);
        
        const completed = deliveries.filter(d => d.status === 'delivered');
        const failed = deliveries.filter(d => d.status === 'failed');
        
        return {
            deliveryBoyId: deliveryBoyId,
            date: dateStr,
            totalAssigned: deliveries.length,
            completed: completed.length,
            failed: failed.length,
            completionRate: deliveries.length > 0 ? (completed.length / deliveries.length * 100).toFixed(1) : 0,
            
            totalRevenue: completed.reduce((sum, d) => sum + d.currentTotal, 0),
            cashCollected: completed.reduce((sum, d) => sum + d.cashCollected, 0),
            
            itemsAdded: deliveries.reduce((sum, d) => sum + d.addedItems.length, 0),
            avgDeliveryTime: this.calculateAverageDeliveryTime(completed),
            
            failureReasons: this.summarizeFailureReasons(failed)
        };
    },
    
    /**
     * Calculate average delivery time
     */
    calculateAverageDeliveryTime(deliveries) {
        if (deliveries.length === 0) return 0;
        
        const times = deliveries
            .filter(d => d.pickedUpAt && d.deliveredAt)
            .map(d => {
                const pickup = new Date(d.pickedUpAt);
                const delivered = new Date(d.deliveredAt);
                return (delivered - pickup) / (1000 * 60); // minutes
            });
        
        const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
        return Math.round(avg);
    },
    
    /**
     * Summarize failure reasons
     */
    summarizeFailureReasons(deliveries) {
        const summary = {};
        
        deliveries.forEach(d => {
            if (d.failureReason) {
                summary[d.failureReason] = (summary[d.failureReason] || 0) + 1;
            }
        });
        
        return summary;
    },
    
    /**
     * Get all failure reasons
     */
    getFailureReasons() {
        return this.state.failureReasons;
    }
};

// Initialize on load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        EarlyBirdDelivery.init();
    });
}

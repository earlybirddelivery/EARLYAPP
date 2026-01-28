// ============================================
// EarlyBird Subscription Engine
// Complete CRUD + Pause/Resume/Skip/Frequency
// ============================================

const EarlyBirdSubscription = {
    
    // State
    state: {
        subscriptions: [],  // Array of subscription objects
        products: []  // Available products
    },
    
    // ========== INITIALIZATION ==========
    
    init() {
        this.loadSubscriptions();
        this.loadProducts();
    },
    
    loadSubscriptions() {
        this.state.subscriptions = EarlyBirdUtils.loadFromStorage('earlybird_subscriptions', []);
    },
    
    saveSubscriptions() {
        EarlyBirdUtils.saveToStorage('earlybird_subscriptions', this.state.subscriptions);
    },
    
    loadProducts() {
        this.state.products = EarlyBirdUtils.getMockProducts();
    },
    
    // ========== SUBSCRIPTION CRUD ==========
    
    /**
     * Create new subscription
     * @param {Object} data - Subscription data
     * @returns {Object} Created subscription
     */
    create(data) {
        const subscription = {
            id: EarlyBirdUtils.generateId(),
            customerId: data.customerId,
            customerName: data.customerName,
            productId: data.productId,
            productName: data.productName,
            quantity: data.quantity || 1,
            price: data.price,
            
            // Frequency
            frequency: data.frequency, // 'daily', 'weekly', 'biweekly', 'monthly', 'custom'
            customDays: data.customDays || [], // For custom frequency [0-6] Sunday=0
            
            // Delivery
            deliveryWindow: data.deliveryWindow || 'am', // 'am', 'pm', 'anytime'
            deliveryTime: data.deliveryTime || null, // Specific time if needed
            
            // Schedule
            startDate: data.startDate || EarlyBirdUtils.getDateString(new Date()),
            endDate: data.endDate || null, // null = indefinite
            
            // Status
            status: 'active', // 'active', 'paused', 'cancelled'
            pausedDate: null,
            pausedReason: null,
            
            // Skip dates
            skipDates: [], // Array of date strings to skip
            
            // Auto-renewal
            autoRenew: data.autoRenew !== false, // Default true
            renewalDay: data.renewalDay || 1, // Day of month for monthly
            
            // Metadata
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: data.createdBy || 'system',
            
            // Notes
            notes: data.notes || ''
        };
        
        this.state.subscriptions.push(subscription);
        this.saveSubscriptions();
        
        // Add initial deliveries to calendar
        this.scheduleDeliveries(subscription);
        
        EarlyBirdUtils.showToast('Subscription created successfully', 'success');
        return subscription;
    },
    
    /**
     * Update existing subscription
     */
    update(id, updates) {
        const index = this.state.subscriptions.findIndex(s => s.id === id);
        if (index === -1) {
            EarlyBirdUtils.showToast('Subscription not found', 'error');
            return null;
        }
        
        this.state.subscriptions[index] = {
            ...this.state.subscriptions[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        this.saveSubscriptions();
        
        // Reschedule deliveries
        this.rescheduleDeliveries(this.state.subscriptions[index]);
        
        EarlyBirdUtils.showToast('Subscription updated successfully', 'success');
        return this.state.subscriptions[index];
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
     * Get active subscriptions
     */
    getActive() {
        return this.state.subscriptions.filter(s => s.status === 'active');
    },
    
    // ========== PAUSE/RESUME ==========
    
    /**
     * Pause subscription
     */
    pause(id, reason = '') {
        const subscription = this.get(id);
        if (!subscription) {
            EarlyBirdUtils.showToast('Subscription not found', 'error');
            return false;
        }
        
        subscription.status = 'paused';
        subscription.pausedDate = EarlyBirdUtils.getDateString(new Date());
        subscription.pausedReason = reason;
        subscription.updatedAt = new Date().toISOString();
        
        this.saveSubscriptions();
        
        // Remove future deliveries
        this.removeScheduledDeliveries(subscription, new Date());
        
        // Hook into pause detection system
        if (typeof EarlyBirdPauseDetection !== 'undefined') {
            const pauseDetection = new EarlyBirdPauseDetection();
            pauseDetection.recordPause(subscription.customerId, id, reason);
        }
        
        EarlyBirdUtils.showToast(`Subscription paused${reason ? ': ' + reason : ''}`, 'info');
        return true;
    },
    
    /**
     * Resume subscription
     */
    resume(id) {
        const subscription = this.get(id);
        if (!subscription) {
            EarlyBirdUtils.showToast('Subscription not found', 'error');
            return false;
        }
        
        subscription.status = 'active';
        const wasPaused = subscription.pausedDate !== null;
        subscription.pausedDate = null;
        subscription.pausedReason = null;
        subscription.updatedAt = new Date().toISOString();
        
        this.saveSubscriptions();
        
        // Reschedule deliveries from today
        this.scheduleDeliveries(subscription, new Date());
        
        // Hook into pause detection system
        if (typeof EarlyBirdPauseDetection !== 'undefined' && wasPaused) {
            const pauseDetection = new EarlyBirdPauseDetection();
            pauseDetection.recordResume(subscription.customerId, id);
        }
        
        EarlyBirdUtils.showToast('Subscription resumed', 'success');
        return true;
    },
    
    /**
     * Check for paused subscriptions > 7 days (PRD requirement)
     */
    detectLongPauses() {
        const sevenDaysAgo = EarlyBirdUtils.addDays(new Date(), -7);
        
        return this.state.subscriptions.filter(s => {
            if (s.status !== 'paused' || !s.pausedDate) return false;
            
            const pausedDate = new Date(s.pausedDate);
            return pausedDate < sevenDaysAgo;
        });
    },
    
    // ========== SKIP DATES ==========
    
    /**
     * Add skip date to subscription
     */
    addSkipDate(id, date) {
        const subscription = this.get(id);
        if (!subscription) {
            EarlyBirdUtils.showToast('Subscription not found', 'error');
            return false;
        }
        
        const dateStr = EarlyBirdUtils.getDateString(date);
        
        if (!subscription.skipDates.includes(dateStr)) {
            subscription.skipDates.push(dateStr);
            subscription.updatedAt = new Date().toISOString();
            this.saveSubscriptions();
            
            // Remove delivery for this date
            this.removeDeliveryForDate(subscription, dateStr);
            
            EarlyBirdUtils.showToast(`Delivery skipped for ${EarlyBirdUtils.formatDate(date, 'short')}`, 'info');
        }
        
        return true;
    },
    
    /**
     * Remove skip date
     */
    removeSkipDate(id, date) {
        const subscription = this.get(id);
        if (!subscription) return false;
        
        const dateStr = EarlyBirdUtils.getDateString(date);
        const index = subscription.skipDates.indexOf(dateStr);
        
        if (index > -1) {
            subscription.skipDates.splice(index, 1);
            subscription.updatedAt = new Date().toISOString();
            this.saveSubscriptions();
            
            // Re-add delivery for this date if it falls on schedule
            if (this.isDeliveryDate(subscription, new Date(dateStr))) {
                this.addDeliveryForDate(subscription, dateStr);
            }
            
            EarlyBirdUtils.showToast(`Skip removed for ${EarlyBirdUtils.formatDate(date, 'short')}`, 'success');
        }
        
        return true;
    },
    
    // ========== FREQUENCY MANAGEMENT ==========
    
    /**
     * Check if a date is a delivery date for this subscription
     */
    isDeliveryDate(subscription, date) {
        const dateStr = EarlyBirdUtils.getDateString(date);
        
        // Check if date is skipped
        if (subscription.skipDates.includes(dateStr)) {
            return false;
        }
        
        // Check if date is before start date
        if (dateStr < subscription.startDate) {
            return false;
        }
        
        // Check if date is after end date
        if (subscription.endDate && dateStr > subscription.endDate) {
            return false;
        }
        
        // Check frequency
        switch (subscription.frequency) {
            case 'daily':
                return true;
                
            case 'weekly':
                // Check if same day of week as start date
                const startDay = new Date(subscription.startDate).getDay();
                return date.getDay() === startDay;
                
            case 'biweekly':
                // Check if 14 days apart from start date
                const daysSinceStart = Math.floor((date - new Date(subscription.startDate)) / (1000 * 60 * 60 * 24));
                return daysSinceStart % 14 === 0;
                
            case 'monthly':
                // Check if same day of month as renewal day
                return date.getDate() === subscription.renewalDay;
                
            case 'custom':
                // Check if day of week is in customDays array
                return subscription.customDays.includes(date.getDay());
                
            default:
                return false;
        }
    },
    
    /**
     * Get next delivery date
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
     * Get upcoming deliveries (next 30 days)
     */
    getUpcomingDeliveries(subscription, days = 30) {
        const deliveries = [];
        let checkDate = new Date();
        checkDate.setHours(0, 0, 0, 0);
        
        for (let i = 0; i < days; i++) {
            if (this.isDeliveryDate(subscription, checkDate)) {
                deliveries.push(new Date(checkDate));
            }
            checkDate = EarlyBirdUtils.addDays(checkDate, 1);
        }
        
        return deliveries;
    },
    
    // ========== CALENDAR INTEGRATION ==========
    
    /**
     * Schedule deliveries in calendar (next 60 days)
     */
    scheduleDeliveries(subscription, fromDate = new Date()) {
        if (subscription.status !== 'active') return;
        
        const deliveries = this.getUpcomingDeliveries(subscription, 60);
        
        deliveries.forEach(date => {
            const event = {
                type: 'delivery',
                customer: subscription.customerName,
                customerId: subscription.customerId,
                time: subscription.deliveryWindow === 'am' ? '7:00 AM' : '6:00 PM',
                status: 'pending',
                details: `${subscription.productName} x ${subscription.quantity} (Subscription)`,
                amount: subscription.price * subscription.quantity,
                subscriptionId: subscription.id
            };
            
            EarlyBirdCalendar.addEvent(date, event);
        });
    },
    
    /**
     * Reschedule all deliveries
     */
    rescheduleDeliveries(subscription) {
        // Remove all existing deliveries
        this.removeScheduledDeliveries(subscription);
        
        // Add new deliveries
        if (subscription.status === 'active') {
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
    
    /**
     * Remove delivery for specific date
     */
    removeDeliveryForDate(subscription, dateStr) {
        if (EarlyBirdCalendar.state.events[dateStr]) {
            EarlyBirdCalendar.state.events[dateStr] = EarlyBirdCalendar.state.events[dateStr].filter(
                event => event.subscriptionId !== subscription.id
            );
            
            if (EarlyBirdCalendar.state.events[dateStr].length === 0) {
                delete EarlyBirdCalendar.state.events[dateStr];
            }
            
            EarlyBirdCalendar.saveEvents();
        }
    },
    
    /**
     * Add delivery for specific date
     */
    addDeliveryForDate(subscription, dateStr) {
        const event = {
            type: 'delivery',
            customer: subscription.customerName,
            customerId: subscription.customerId,
            time: subscription.deliveryWindow === 'am' ? '7:00 AM' : '6:00 PM',
            status: 'pending',
            details: `${subscription.productName} x ${subscription.quantity} (Subscription)`,
            amount: subscription.price * subscription.quantity,
            subscriptionId: subscription.id
        };
        
        EarlyBirdCalendar.addEvent(new Date(dateStr), event);
    },
    
    // ========== INSTANT TO SUBSCRIPTION CONVERSION (PRD: 3+ orders in 45 days) ==========
    
    /**
     * Detect customers eligible for subscription conversion
     */
    detectConversionOpportunities() {
        const opportunities = [];
        const customers = EarlyBirdUtils.getMockCustomers();
        const products = this.state.products;
        
        customers.forEach(customer => {
            // Get customer orders from last 45 days
            const fortyFiveDaysAgo = EarlyBirdUtils.addDays(new Date(), -45);
            let customerOrders = [];
            
            Object.keys(EarlyBirdCalendar.state.events).forEach(dateStr => {
                if (new Date(dateStr) >= fortyFiveDaysAgo) {
                    const orders = EarlyBirdCalendar.state.events[dateStr].filter(
                        e => e.customerId === customer.id && e.type === 'order'
                    );
                    customerOrders = customerOrders.concat(orders);
                }
            });
            
            // Group by product
            const productCounts = {};
            customerOrders.forEach(order => {
                // Parse product from details
                const productName = order.details.split(':')[1]?.trim();
                if (productName) {
                    productCounts[productName] = (productCounts[productName] || 0) + 1;
                }
            });
            
            // Find products ordered 3+ times
            Object.keys(productCounts).forEach(productName => {
                if (productCounts[productName] >= 3) {
                    opportunities.push({
                        customer: customer,
                        productName: productName,
                        orderCount: productCounts[productName],
                        suggestedFrequency: this.suggestFrequency(productCounts[productName], 45)
                    });
                }
            });
        });
        
        return opportunities;
    },
    
    /**
     * Suggest frequency based on order pattern
     */
    suggestFrequency(orderCount, days) {
        const avgDaysBetween = days / orderCount;
        
        if (avgDaysBetween <= 2) return 'daily';
        if (avgDaysBetween <= 7) return 'weekly';
        if (avgDaysBetween <= 14) return 'biweekly';
        return 'monthly';
    },
    
    // ========== UI HELPERS ==========
    
    /**
     * Open create subscription modal
     */
    openCreateModal(customerId = null, customerName = null) {
        const products = this.state.products;
        
        const content = `
            <form id="createSubscriptionForm">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label form-label-required">Customer</label>
                        <input type="text" class="form-control" name="customerName" 
                               value="${customerName || ''}" 
                               ${customerId ? 'readonly' : ''} required>
                        <input type="hidden" name="customerId" value="${customerId || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label form-label-required">Product</label>
                        <select class="form-control" name="productId" required onchange="EarlyBirdSubscription.updateProductPrice(this)">
                            <option value="">Select product</option>
                            ${products.map(p => `<option value="${p.id}" data-price="${p.price}">${p.name} - ${EarlyBirdUtils.formatCurrency(p.price)}</option>`).join('')}
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label form-label-required">Quantity</label>
                        <input type="number" class="form-control" name="quantity" value="1" min="1" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Price</label>
                        <input type="number" class="form-control" name="price" readonly>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label form-label-required">Frequency</label>
                        <select class="form-control" name="frequency" required onchange="EarlyBirdSubscription.toggleCustomDays(this)">
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="biweekly">Bi-weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="custom">Custom Days</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label form-label-required">Delivery Window</label>
                        <select class="form-control" name="deliveryWindow" required>
                            <option value="am">Morning (AM)</option>
                            <option value="pm">Evening (PM)</option>
                            <option value="anytime">Anytime</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group" id="customDaysGroup" style="display: none;">
                    <label class="form-label">Select Days</label>
                    <div class="flex gap-2">
                        <label><input type="checkbox" name="customDays" value="0"> Sun</label>
                        <label><input type="checkbox" name="customDays" value="1"> Mon</label>
                        <label><input type="checkbox" name="customDays" value="2"> Tue</label>
                        <label><input type="checkbox" name="customDays" value="3"> Wed</label>
                        <label><input type="checkbox" name="customDays" value="4"> Thu</label>
                        <label><input type="checkbox" name="customDays" value="5"> Fri</label>
                        <label><input type="checkbox" name="customDays" value="6"> Sat</label>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label form-label-required">Start Date</label>
                        <input type="date" class="form-control" name="startDate" 
                               value="${EarlyBirdUtils.getDateString(new Date())}" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">End Date (Optional)</label>
                        <input type="date" class="form-control" name="endDate">
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Notes</label>
                    <textarea class="form-control" name="notes" rows="2"></textarea>
                </div>
            </form>
        `;
        
        const footer = `
            <button class="btn btn-outline" onclick="EarlyBirdUtils.closeModal('createSubscription')">Cancel</button>
            <button class="btn btn-primary" onclick="EarlyBirdSubscription.submitCreate()">Create Subscription</button>
        `;
        
        EarlyBirdUtils.createModal({
            id: 'createSubscription',
            title: '➕ Create Subscription',
            content: content,
            footer: footer,
            size: 'lg'
        });
        
        EarlyBirdUtils.openModal('createSubscription');
    },
    
    updateProductPrice(select) {
        const option = select.options[select.selectedIndex];
        const price = option.getAttribute('data-price');
        const priceInput = document.querySelector('[name="price"]');
        if (priceInput && price) {
            priceInput.value = price;
        }
    },
    
    toggleCustomDays(select) {
        const customDaysGroup = document.getElementById('customDaysGroup');
        if (customDaysGroup) {
            customDaysGroup.style.display = select.value === 'custom' ? 'block' : 'none';
        }
    },
    
    submitCreate() {
        const form = document.getElementById('createSubscriptionForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const formData = new FormData(form);
        const data = {
            customerId: formData.get('customerId') || EarlyBirdUtils.generateId(),
            customerName: formData.get('customerName'),
            productId: formData.get('productId'),
            productName: form.querySelector('[name="productId"]').options[form.querySelector('[name="productId"]').selectedIndex].text.split(' - ')[0],
            quantity: parseInt(formData.get('quantity')),
            price: parseFloat(formData.get('price')),
            frequency: formData.get('frequency'),
            deliveryWindow: formData.get('deliveryWindow'),
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate') || null,
            notes: formData.get('notes'),
            customDays: formData.getAll('customDays').map(d => parseInt(d))
        };
        
        this.create(data);
        EarlyBirdUtils.closeModal('createSubscription');
        
        // Refresh calendar
        if (typeof EarlyBirdCalendar !== 'undefined') {
            EarlyBirdCalendar.render();
            EarlyBirdCalendar.renderDateDetails();
        }
    }
};

// Initialize on load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        EarlyBirdSubscription.init();
    });
}

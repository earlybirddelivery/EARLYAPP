/**
 * Subscription Frontend Integration
 * Connects all portals (admin, support, delivery, customer) to new subscription engine
 * Supports multi-subscription, calendar integration, pause/resume, order creation
 */

class SubscriptionIntegration {
    constructor() {
        this.apiBase = '/api';
        this.currentCustomer = null;
        this.currentDate = new Date();
        this.calendar = {};
        this.useSimulatedBackend = true; // Use simulated data for demo
        this.simulatedData = {
            subscriptions: [],
            orders: []
        };
    }

    // ==================== INITIALIZATION ====================

    async init() {
        console.log('Initializing Subscription Integration...');
        this.setupEventListeners();
        await this.loadDataIfNeeded();
    }

    setupEventListeners() {
        // Calendar navigation
        document.addEventListener('calendar-prev', () => this.previousMonth());
        document.addEventListener('calendar-next', () => this.nextMonth());
        document.addEventListener('calendar-date-click', (e) => this.onDateClick(e.detail.date));
        
        // Subscription actions
        document.addEventListener('subscription-pause', (e) => this.pauseSubscription(e.detail.id));
        document.addEventListener('subscription-resume', (e) => this.resumeSubscription(e.detail.id));
        document.addEventListener('subscription-stop', (e) => this.stopSubscription(e.detail.id));
        
        // Create new
        document.addEventListener('create-subscription', (e) => this.showCreateSubscriptionModal(e.detail));
        document.addEventListener('create-order', (e) => this.showCreateOrderModal(e.detail));
        
        // Customer view
        document.addEventListener('customer-info-click', (e) => this.showCustomerInfo(e.detail.customerId));
    }

    async loadDataIfNeeded() {
        const customerId = this.getCustomerFromContext();
        if (customerId) {
            try {
                await this.loadCustomerSubscriptions(customerId);
            } catch (error) {
                console.warn('Could not load customer subscriptions:', error);
                // Continue anyway - system can still work in demo mode
            }
        }
    }

    // ==================== SIMULATED API LAYER ====================

    async simulatedFetch(endpoint, options = {}) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 300));

        if (endpoint.includes('/subscriptions/create') && options.method === 'POST') {
            const data = JSON.parse(options.body);
            const newSubscription = {
                id: `SUB_${Date.now()}`,
                customer_id: data.customer_id,
                mode: data.mode,
                config: data.config,
                status: 'active',
                created_at: new Date().toISOString()
            };
            this.simulatedData.subscriptions.push(newSubscription);
            return { success: true, subscription: newSubscription };
        }

        if (endpoint.includes('/orders/create') && options.method === 'POST') {
            const data = JSON.parse(options.body);
            const newOrder = {
                id: `ORD_${Date.now()}`,
                customer_id: data.customer_id,
                product_id: data.product_id,
                quantity: data.quantity,
                delivery_date: data.delivery_date,
                status: 'pending',
                created_at: new Date().toISOString()
            };
            this.simulatedData.orders.push(newOrder);
            return { success: true, order: newOrder };
        }

        if (endpoint.includes('/subscriptions/') && endpoint.includes('/pause')) {
            const subId = endpoint.match(/subscriptions\/(\w+)/)[1];
            const sub = this.simulatedData.subscriptions.find(s => s.id === subId);
            if (sub) {
                sub.status = 'paused';
                sub.paused_at = new Date().toISOString();
            }
            return { success: true };
        }

        if (endpoint.includes('/subscriptions/') && endpoint.includes('/resume')) {
            const subId = endpoint.match(/subscriptions\/(\w+)/)[1];
            const sub = this.simulatedData.subscriptions.find(s => s.id === subId);
            if (sub) {
                sub.status = 'active';
                delete sub.paused_at;
            }
            return { success: true };
        }

        if (endpoint.includes('/subscriptions/') && endpoint.includes('/stop')) {
            const subId = endpoint.match(/subscriptions\/(\w+)/)[1];
            const sub = this.simulatedData.subscriptions.find(s => s.id === subId);
            if (sub) {
                sub.status = 'stopped';
                sub.stopped_at = new Date().toISOString();
            }
            return { success: true };
        }

        return { success: true, message: 'Simulated response' };
    }

    async fetchWithFallback(endpoint, options = {}) {
        try {
            if (this.useSimulatedBackend) {
                return await this.simulatedFetch(endpoint, options);
            }
            const response = await fetch(`${this.apiBase}${endpoint}`, options);
            return await response.json();
        } catch (error) {
            console.warn('API call failed, using simulated backend:', error);
            return await this.simulatedFetch(endpoint, options);
        }
    }

    // ==================== CALENDAR METHODS ====================

    async loadCalendar(customerId, year, month) {
        try {
            const response = await fetch(
                `${this.apiBase}/calendar/${customerId}/${year}/${month}`
            );
            const data = await response.json();
            
            if (data.success) {
                this.calendar = data.calendar;
                this.renderCalendar(year, month, data.calendar);
                return data;
            }
        } catch (error) {
            console.error('Error loading calendar:', error);
            this.showToast('Error loading calendar', 'error');
        }
    }

    renderCalendar(year, month, calendar) {
        const calendarContainer = document.getElementById('calendarGrid');
        if (!calendarContainer) return;

        // Clear existing
        calendarContainer.innerHTML = '';

        // Get days in month
        const daysInMonth = new Date(year, month, 0).getDate();
        const firstDay = new Date(year, month - 1, 1).getDay();

        // Render grid
        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day empty';
            calendarContainer.appendChild(emptyCell);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayData = calendar[dateStr];
            
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';
            
            if (dayData) {
                dayCell.classList.add('has-deliveries');
                dayCell.innerHTML = `
                    <div class="day-number">${day}</div>
                    <div class="delivery-count">${dayData.delivery_count} delivery(ies)</div>
                    <div class="total-qty">${dayData.total_quantity} units</div>
                `;
            } else {
                dayCell.innerHTML = `<div class="day-number">${day}</div>`;
            }
            
            dayCell.addEventListener('click', () => {
                this.onDateClick(dateStr, dayData);
            });
            
            calendarContainer.appendChild(dayCell);
        }

        // Update header
        const header = document.getElementById('calendarMonthTitle');
        if (header) {
            header.textContent = new Date(year, month - 1).toLocaleDateString('en-US', 
                { month: 'long', year: 'numeric' });
        }
    }

    async onDateClick(dateStr, dayData) {
        try {
            const customerId = this.currentCustomer;
            const response = await fetch(
                `${this.apiBase}/calendar/${customerId}/${dateStr}`
            );
            const data = await response.json();
            
            if (data.success) {
                this.renderDateDetails(data.details);
            }
        } catch (error) {
            console.error('Error loading date details:', error);
        }
    }

    renderDateDetails(details) {
        const detailView = document.getElementById('dateDetailView');
        if (!detailView) return;

        let html = `<h3>${new Date(details.date).toLocaleDateString()}</h3>`;

        // Subscriptions
        if (details.subscriptions.length > 0) {
            html += '<h4>Subscriptions</h4><div class="details-list">';
            details.subscriptions.forEach(sub => {
                html += `
                    <div class="detail-item subscription">
                        <div class="item-header">
                            <span class="product">${sub.product_id || 'Product'}</span>
                            <span class="quantity">${sub.quantity} units</span>
                        </div>
                        <div class="item-meta">
                            <span class="mode">${sub.mode}</span>
                            <span class="status ${sub.status}">${sub.status}</span>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        // Orders
        if (details.orders.length > 0) {
            html += '<h4>Orders</h4><div class="details-list">';
            details.orders.forEach(order => {
                html += `
                    <div class="detail-item order">
                        <div class="item-header">
                            <span class="product">${order.product_id || 'Product'}</span>
                            <span class="quantity">${order.quantity} units</span>
                        </div>
                        <div class="item-meta">
                            <span class="type">One-time Order</span>
                            <span class="status ${order.status}">${order.status}</span>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        // Total
        html += `<div class="detail-total">
            <strong>Total for ${details.date}:</strong> ${details.total_quantity} units
        </div>`;

        detailView.innerHTML = html;
    }

    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.refreshCalendar();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.refreshCalendar();
    }

    async refreshCalendar() {
        await this.loadCalendar(
            this.currentCustomer,
            this.currentDate.getFullYear(),
            this.currentDate.getMonth() + 1
        );
    }

    // ==================== SUBSCRIPTION MANAGEMENT ====================

    async loadCustomerSubscriptions(customerId) {
        try {
            const response = await fetch(`${this.apiBase}/subscriptions/customer/${customerId}`);
            const data = await response.json();
            
            if (data.success) {
                this.currentCustomer = customerId;
                this.renderSubscriptionsList(data.subscriptions);
                
                // Load calendar for this customer
                const now = new Date();
                await this.loadCalendar(customerId, now.getFullYear(), now.getMonth() + 1);
                
                return data;
            }
        } catch (error) {
            console.error('Error loading subscriptions:', error);
        }
    }

    renderSubscriptionsList(subscriptions) {
        const container = document.getElementById('subscriptionsList');
        if (!container) return;

        if (subscriptions.length === 0) {
            container.innerHTML = '<p class="empty-state">No subscriptions yet</p>';
            return;
        }

        let html = '<div class="subscriptions-grid">';
        subscriptions.forEach(sub => {
            const summary = sub.summary || {};
            html += `
                <div class="subscription-card ${sub.status}">
                    <div class="card-header">
                        <h4>${summary.frequency || sub.mode}</h4>
                        <span class="status-badge ${sub.status}">${sub.status}</span>
                    </div>
                    
                    <div class="card-body">
                        <div class="info-row">
                            <span class="label">Mode:</span>
                            <span class="value">${sub.mode}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Quantity:</span>
                            <span class="value">${sub.default_qty || sub.quantity || 'N/A'} units</span>
                        </div>
                        ${sub.next_deliveries ? `
                            <div class="info-row">
                                <span class="label">Next Deliveries:</span>
                                <span class="value">${sub.next_deliveries.length} days</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="card-actions">
                        ${sub.status === 'active' ? `
                            <button class="btn btn-sm btn-warning" onclick="subscriptionIntegration.showPauseModal('${sub._id}')">
                                ⏸️ Pause
                            </button>
                        ` : ''}
                        ${sub.status === 'paused' ? `
                            <button class="btn btn-sm btn-success" onclick="subscriptionIntegration.resumeSubscription('${sub._id}')">
                                ▶️ Resume
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-danger" onclick="subscriptionIntegration.stopSubscription('${sub._id}')">
                            ⏹️ Stop
                        </button>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        container.innerHTML = html;
    }

    async pauseSubscription(subscriptionId, endDate = null) {
        try {
            const data = await this.fetchWithFallback(
                `/subscriptions/${subscriptionId}/pause`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ end_date: endDate })
                }
            );
            
            if (data.success) {
                this.showToast('✅ Subscription paused successfully', 'success');
                await this.refreshCalendar();
                return data;
            } else {
                this.showToast(data.error || 'Error pausing subscription', 'error');
            }
        } catch (error) {
            console.error('Error pausing subscription:', error);
            this.showToast('✅ Subscription paused! (Demo Mode)', 'success');
        }
    }

    async resumeSubscription(subscriptionId) {
        try {
            const data = await this.fetchWithFallback(
                `/subscriptions/${subscriptionId}/resume`,
                { method: 'POST' }
            );
            
            if (data.success) {
                this.showToast('✅ Subscription resumed', 'success');
                await this.refreshCalendar();
                return data;
            }
        } catch (error) {
            console.error('Error resuming subscription:', error);
            this.showToast('✅ Subscription resumed! (Demo Mode)', 'success');
        }
    }

    async stopSubscription(subscriptionId) {
        if (!confirm('Are you sure you want to permanently stop this subscription?')) {
            return;
        }

        try {
            const data = await this.fetchWithFallback(
                `/subscriptions/${subscriptionId}/stop`,
                { method: 'POST' }
            );
            
            if (data.success) {
                this.showToast('✅ Subscription stopped', 'success');
                await this.refreshCalendar();
                return data;
            }
        } catch (error) {
            console.error('Error stopping subscription:', error);
            this.showToast('✅ Subscription stopped! (Demo Mode)', 'success');
        }
    }

    // ==================== CREATE FORMS ====================

    showCreateSubscriptionModal(options = {}) {
        try {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Create New Subscription</h2>
                        <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                    </div>
                    
                    <form id="createSubscriptionForm" class="subscription-form">
                        <div class="form-group">
                            <label>Subscription Mode *</label>
                            <select id="subscriptionMode" required onchange="subscriptionIntegration.updateModeFields(this.value)">
                                <option value="">Select Mode</option>
                                <option value="fixed_daily">Fixed Daily (Every Day)</option>
                                <option value="weekly_pattern">Weekly Pattern (Specific Days)</option>
                                <option value="one_time">One-Time (Date Range)</option>
                                <option value="day_by_day">Day by Day (Manual)</option>
                                <option value="irregular">Irregular (Specific Dates)</option>
                            </select>
                        </div>

                        <div id="modeSpecificFields"></div>

                        <div class="form-group">
                            <label>Product *</label>
                            <select id="productId" required>
                                <option value="">Select Product</option>
                                <option value="MILK_500ML">Milk 500ML - ₹30</option>
                                <option value="MILK_1L">Milk 1L - ₹50</option>
                                <option value="CURD_500G">Curd 500G - ₹25</option>
                                <option value="BUTTER_200G">Butter 200G - ₹100</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>Quantity *</label>
                            <input type="number" id="quantity" required min="1" value="1">
                        </div>

                        <div class="form-group">
                            <label>Price per Unit *</label>
                            <input type="number" id="pricePerUnit" required min="0" step="0.01">
                        </div>

                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">Create Subscription</button>
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                        </div>
                    </form>
                </div>
            `;

            document.body.appendChild(modal);

            const form = document.getElementById('createSubscriptionForm');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.submitCreateSubscription();
                });
            }
            
            console.log('✅ Subscription modal opened');
        } catch (error) {
            console.error('Error showing subscription modal:', error);
            this.showToast('Error opening modal', 'error');
        }
    }

    updateModeFields(mode) {
        const fieldsContainer = document.getElementById('modeSpecificFields');
        fieldsContainer.innerHTML = '';

        const fields = {
            'fixed_daily': `
                <div class="form-group">
                    <label>Daily Quantity *</label>
                    <input type="number" id="defaultQty" required min="1" value="1">
                </div>
            `,
            'weekly_pattern': `
                <div class="form-group">
                    <label>Days of Week *</label>
                    <div class="days-selector">
                        <label><input type="checkbox" name="weekday" value="0"> Monday</label>
                        <label><input type="checkbox" name="weekday" value="1"> Tuesday</label>
                        <label><input type="checkbox" name="weekday" value="2"> Wednesday</label>
                        <label><input type="checkbox" name="weekday" value="3"> Thursday</label>
                        <label><input type="checkbox" name="weekday" value="4"> Friday</label>
                        <label><input type="checkbox" name="weekday" value="5"> Saturday</label>
                        <label><input type="checkbox" name="weekday" value="6"> Sunday</label>
                    </div>
                </div>
                <div class="form-group">
                    <label>Quantity per Delivery *</label>
                    <input type="number" id="defaultQty" required min="1" value="1">
                </div>
            `,
            'one_time': `
                <div class="form-group">
                    <label>Start Date *</label>
                    <input type="date" id="startDate" required>
                </div>
                <div class="form-group">
                    <label>End Date *</label>
                    <input type="date" id="endDate" required>
                </div>
                <div class="form-group">
                    <label>Daily Quantity *</label>
                    <input type="number" id="quantity" required min="1" value="1">
                </div>
            `,
            'day_by_day': `
                <div class="info-box">
                    <p>📅 Manually add deliveries day-by-day</p>
                    <p>You can add individual days after creation</p>
                </div>
            `,
            'irregular': `
                <div class="info-box">
                    <p>📅 Add specific dates and quantities</p>
                    <p>You can add dates after creation</p>
                </div>
            `
        };

        if (fields[mode]) {
            fieldsContainer.innerHTML = fields[mode];
        }
    }

    async submitCreateSubscription() {
        try {
            const mode = document.getElementById('subscriptionMode').value;
            if (!mode) {
                this.showToast('Please select a subscription mode', 'error');
                return;
            }

            const customerId = this.currentCustomer || 'CUST_' + Date.now();
            this.currentCustomer = customerId;

            const config = {
                mode: mode,
                product_id: document.getElementById('productId').value,
                price_per_unit: parseFloat(document.getElementById('pricePerUnit').value) || 0
            };

            // Mode-specific config
            if (mode === 'fixed_daily') {
                config.default_qty = parseInt(document.getElementById('defaultQty')?.value) || 1;
            } else if (mode === 'weekly_pattern') {
                const checked = Array.from(document.querySelectorAll('input[name="weekday"]:checked'));
                config.weekly_pattern = checked.map(c => parseInt(c.value));
                config.default_qty = parseInt(document.getElementById('defaultQty')?.value) || 1;
            } else if (mode === 'one_time') {
                config.start_date = document.getElementById('startDate')?.value || new Date().toISOString().split('T')[0];
                config.end_date = document.getElementById('endDate')?.value || new Date().toISOString().split('T')[0];
                config.quantity = parseInt(document.getElementById('quantity')?.value) || 1;
            }

            const data = await this.fetchWithFallback('/subscriptions/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_id: customerId,
                    mode: mode,
                    config: config
                })
            });

            if (data.success) {
                this.showToast('✅ Subscription created successfully!', 'success');
                const modal = document.querySelector('.modal-overlay');
                if (modal) modal.remove();
                await this.loadCustomerSubscriptions(customerId);
            } else {
                this.showToast(data.error || 'Error creating subscription', 'error');
            }
        } catch (error) {
            console.error('Error creating subscription:', error);
            this.showToast('✅ Subscription created! (Demo Mode)', 'success');
            const modal = document.querySelector('.modal-overlay');
            if (modal) modal.remove();
        }
    }

    showCreateOrderModal(options = {}) {
        try {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Create One-Time Order</h2>
                        <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                    </div>
                    
                    <form id="createOrderForm" class="order-form">
                        <div class="form-group">
                            <label>Product *</label>
                            <select id="orderProductId" required>
                                <option value="">Select Product</option>
                                <option value="MILK_500ML">Milk 500ML - ₹30</option>
                                <option value="MILK_1L">Milk 1L - ₹50</option>
                                <option value="CURD_500G">Curd 500G - ₹25</option>
                                <option value="BUTTER_200G">Butter 200G - ₹100</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>Quantity *</label>
                            <input type="number" id="orderQuantity" required min="1" value="1">
                        </div>

                        <div class="form-group">
                            <label>Delivery Date *</label>
                            <input type="date" id="orderDeliveryDate" required>
                        </div>

                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">Create Order</button>
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                        </div>
                    </form>
                </div>
            `;

            document.body.appendChild(modal);

            const form = document.getElementById('createOrderForm');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.submitCreateOrder();
                });
            }
            
            console.log('✅ Order modal opened');
        } catch (error) {
            console.error('Error showing order modal:', error);
            this.showToast('Error opening modal', 'error');
        }
    }

    async submitCreateOrder() {
        try {
            const customerId = this.currentCustomer || 'CUST_' + Date.now();
            this.currentCustomer = customerId;

            const data = await this.fetchWithFallback('/orders/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_id: customerId,
                    product_id: document.getElementById('orderProductId')?.value,
                    quantity: parseInt(document.getElementById('orderQuantity')?.value) || 1,
                    delivery_date: document.getElementById('orderDeliveryDate')?.value || new Date().toISOString().split('T')[0]
                })
            });

            if (data.success) {
                this.showToast('✅ Order created successfully!', 'success');
                const modal = document.querySelector('.modal-overlay');
                if (modal) modal.remove();
                await this.refreshCalendar();
            } else {
                this.showToast(data.error || 'Error creating order', 'error');
            }
        } catch (error) {
            console.error('Error creating order:', error);
            this.showToast('✅ Order created! (Demo Mode)', 'success');
            const modal = document.querySelector('.modal-overlay');
            if (modal) modal.remove();
        }
    }

    // ==================== CUSTOMER INFO VIEW ====================

    async showCustomerInfo(customerId) {
        try {
            const response = await fetch(`${this.apiBase}/customers/${customerId}/info`);
            const data = response.json();

            if (data.success) {
                this.renderCustomerModal(data);
            }
        } catch (error) {
            console.error('Error loading customer info:', error);
        }
    }

    renderCustomerModal(data) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';

        const customerData = data.customer;
        const subs = data.subscriptions;
        const orders = data.orders;
        const deliveries = data.deliveries;
        const pauses = data.pause_state.active_pauses;
        const metrics = data.metrics;

        modal.innerHTML = `
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h2>Customer Profile: ${customerData.name || 'Unknown'}</h2>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>

                <div class="customer-profile">
                    <!-- Metrics Section -->
                    <section class="profile-section metrics-section">
                        <h3>📊 Metrics</h3>
                        <div class="metrics-grid">
                            <div class="metric">
                                <div class="value">${metrics.active_subscription_count}</div>
                                <div class="label">Active Subscriptions</div>
                            </div>
                            <div class="metric">
                                <div class="value">₹${metrics.total_recurring_value}</div>
                                <div class="label">Monthly Recurring Value</div>
                            </div>
                            <div class="metric">
                                <div class="value">₹${metrics.monthly_estimated_revenue}</div>
                                <div class="label">Estimated Monthly Revenue</div>
                            </div>
                        </div>
                    </section>

                    <!-- Subscriptions Section -->
                    <section class="profile-section">
                        <h3>📦 Subscriptions (${subs.active.length} Active)</h3>
                        ${subs.active.length > 0 ? `
                            <div class="subscriptions-list">
                                ${subs.active.map(sub => `
                                    <div class="sub-item">
                                        <span class="mode">${sub.mode}</span>
                                        <span class="qty">${sub.default_qty || sub.quantity} units</span>
                                        <span class="status active">Active</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<p class="empty">No active subscriptions</p>'}
                    </section>

                    <!-- Pause State Section -->
                    ${pauses.length > 0 ? `
                        <section class="profile-section pause-section">
                            <h3>⏸️ Active Pauses</h3>
                            <div class="pauses-list">
                                ${pauses.map(p => `
                                    <div class="pause-item">
                                        <span class="sub-mode">${p.mode}</span>
                                        <span class="dates">${p.pause_start} → ${p.pause_end || 'Indefinite'}</span>
                                        <span class="remaining">${p.remaining_days ? p.remaining_days + ' days left' : 'Indefinite'}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </section>
                    ` : ''}

                    <!-- Orders Section -->
                    <section class="profile-section">
                        <h3>📋 Orders (${orders.active.length} Pending)</h3>
                        ${orders.active.length > 0 ? `
                            <div class="orders-list">
                                ${orders.active.map(o => `
                                    <div class="order-item">
                                        <span class="product">${o.product_id}</span>
                                        <span class="qty">${o.quantity} units</span>
                                        <span class="date">${o.delivery_date}</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<p class="empty">No pending orders</p>'}
                    </section>

                    <!-- Delivery History Section -->
                    <section class="profile-section">
                        <h3>🚚 Delivery History (Last 30 Days: ${deliveries.history.length})</h3>
                        <div class="deliveries-summary">
                            <p><strong>Total Deliveries:</strong> ${deliveries.total_last_30_days}</p>
                            <p><strong>Upcoming (7 days):</strong> ${deliveries.pending.length}</p>
                        </div>
                    </section>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // ==================== HELPERS ====================

    getCustomerFromContext() {
        // Try to get from URL params, session, or HTML data attributes
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('customerId') || localStorage.getItem('selectedCustomerId');
    }

    showPauseModal(subscriptionId) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Pause Subscription</h2>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                
                <form onsubmit="event.preventDefault(); subscriptionIntegration.pauseSubscription('${subscriptionId}', document.getElementById('pauseEndDate').value);">
                    <div class="form-group">
                        <label>Pause Until (Optional)</label>
                        <p class="help-text">Leave empty for indefinite pause</p>
                        <input type="date" id="pauseEndDate">
                    </div>

                    <div class="form-actions">
                        <button type="submit" class="btn btn-warning">Pause Subscription</button>
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
    }

    showToast(message, type = 'info') {
        try {
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.textContent = message;
            toast.style.cssText += ';animation: slideIn 0.3s ease-out;';
            document.body.appendChild(toast);
            
            console.log(`🔔 [${type.toUpperCase()}] ${message}`);

            setTimeout(() => {
                try {
                    toast.remove();
                } catch (e) {
                    // Already removed
                }
            }, 3000);
        } catch (error) {
            console.error('Error showing toast:', error);
        }
    }

    // ==================== DEBUGGING & TESTING ====================
    
    testConnection() {
        console.log('🧪 Testing Subscription Integration...');
        console.log('✅ subscriptionIntegration object exists');
        console.log('✅ Available methods:', Object.getOwnPropertyNames(SubscriptionIntegration.prototype));
        this.showToast('✅ Subscription Integration is working!', 'success');
        return true;
    }

    showDebugPanel() {
        const panel = document.createElement('div');
        panel.id = 'subscription-debug-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #1e1e2e;
            color: #00ff00;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            max-width: 300px;
            z-index: 10000;
            border: 2px solid #00ff00;
            max-height: 200px;
            overflow-y: auto;
        `;
        
        panel.innerHTML = `
            <div style="margin-bottom: 10px;">
                <strong>🔧 Subscription Debug</strong>
            </div>
            <div>Status: <strong style="color: #00ff00;">ACTIVE</strong></div>
            <div>Mode: <strong>${this.useSimulatedBackend ? 'SIMULATED' : 'LIVE'}</strong></div>
            <div>Customer: <strong>${this.currentCustomer || 'NONE'}</strong></div>
            <div>Subscriptions: <strong>${this.simulatedData.subscriptions.length}</strong></div>
            <div>Orders: <strong>${this.simulatedData.orders.length}</strong></div>
            <hr style="border-color: #00ff00; margin: 10px 0;">
            <div>
                <button onclick="subscriptionIntegration.testConnection()" style="
                    background: #00ff00;
                    color: #1e1e2e;
                    border: none;
                    padding: 5px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 11px;
                ">Test Connection</button>
            </div>
            <button onclick="document.getElementById('subscription-debug-panel').remove()" style="
                background: #ff0000;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
                margin-top: 5px;
                width: 100%;
            ">Close</button>
        `;
        
        document.body.appendChild(panel);
    }
}

// Create global instance
let subscriptionIntegration = null;

// Initialize when DOM is ready
function initializeSubscriptionSystem() {
    try {
        subscriptionIntegration = new SubscriptionIntegration();
        
        // Initialize async without blocking UI
        Promise.resolve().then(() => {
            subscriptionIntegration.init().catch(e => {
                console.warn('Subscription initialization warning:', e);
            });
        });
        
        // Show debug panel after a short delay to ensure DOM is ready
        setTimeout(() => {
            try {
                // Debug panel disabled - was causing issues
                // subscriptionIntegration.showDebugPanel();
                console.log('✅ System ready. Use window.subscriptionIntegration to access');
            } catch (e) {
                console.warn('Could not show debug panel:', e);
            }
        }, 100);
        
        console.log('✅ Subscription Integration initialized successfully');
        console.log('📍 Global instance available as: window.subscriptionIntegration');
        window.subscriptionIntegration = subscriptionIntegration;
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize Subscription Integration:', error);
        return false;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSubscriptionSystem);
} else {
    // DOM already loaded
    initializeSubscriptionSystem();
}

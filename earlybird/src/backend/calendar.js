// ============================================
// EarlyBird Calendar Engine
// Calendar-Centric Architecture - THE SPINE
// ============================================

const EarlyBirdCalendar = {
    
    // State
    state: {
        currentMonth: new Date(),
        selectedDate: new Date(),
        events: {},  // { 'YYYY-MM-DD': [events] }
        deliveryCounts: {}  // { 'YYYY-MM-DD': count }
    },
    
    // ========== INITIALIZATION ==========
    
    init(containerId, detailsContainerId, userRole = null) {
        this.containerEl = document.getElementById(containerId);
        this.detailsEl = document.getElementById(detailsContainerId);
        
        if (!this.containerEl) {
            console.error('Calendar container not found:', containerId);
            return;
        }
        
        // Set user role for filtering
        if (userRole) {
            this.userRole = userRole;
        }
        
        // Load events from storage
        this.loadEvents();
        
        // Apply role-based filtering if access control available
        if (typeof EarlyBirdAccessControl !== 'undefined') {
            EarlyBirdAccessControl.applyRoleFiltering();
        }
        
        // Render calendar
        this.render();
        
        // Render date details
        if (this.detailsEl) {
            this.renderDateDetails();
        }
    },
    
    // ========== DATA MANAGEMENT ==========
    
    loadEvents() {
        // Load from local storage
        const stored = EarlyBirdUtils.loadFromStorage('earlybird_events', {});
        this.state.events = stored;
        
        // Calculate delivery counts
        this.calculateDeliveryCounts();
        
        // If no events, generate mock data
        if (Object.keys(this.state.events).length === 0) {
            this.generateMockEvents();
        }
    },
    
    saveEvents() {
        EarlyBirdUtils.saveToStorage('earlybird_events', this.state.events);
        this.calculateDeliveryCounts();
    },
    
    addEvent(date, event) {
        const dateStr = EarlyBirdUtils.getDateString(date);
        
        if (!this.state.events[dateStr]) {
            this.state.events[dateStr] = [];
        }
        
        // Add unique ID if not present
        if (!event.id) {
            event.id = EarlyBirdUtils.generateId();
        }
        
        // Add timestamp
        event.createdAt = new Date().toISOString();
        
        this.state.events[dateStr].push(event);
        this.saveEvents();
        
        // Re-render if this date is visible
        this.render();
        if (EarlyBirdUtils.isSameDay(date, this.state.selectedDate)) {
            this.renderDateDetails();
        }
        
        return event;
    },
    
    getEventsForDate(date) {
        const dateStr = EarlyBirdUtils.getDateString(date);
        return this.state.events[dateStr] || [];
    },
    
    calculateDeliveryCounts() {
        this.state.deliveryCounts = {};
        
        Object.keys(this.state.events).forEach(dateStr => {
            const events = this.state.events[dateStr];
            const deliveryCount = events.filter(e => e.type === 'delivery').length;
            this.state.deliveryCounts[dateStr] = deliveryCount;
        });
    },
    
    getDeliveryCount(date) {
        const dateStr = EarlyBirdUtils.getDateString(date);
        return this.state.deliveryCounts[dateStr] || 0;
    },
    
    // ========== HEAT MAP ==========
    
    getHeatClass(count) {
        if (count === 0) return '';
        if (count <= 20) return 'heat-low';
        if (count <= 50) return 'heat-medium';
        if (count <= 100) return 'heat-high';
        return 'heat-alert';
    },
    
    // ========== RENDERING ==========
    
    render() {
        if (!this.containerEl) return;
        
        const month = this.state.currentMonth;
        const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
        const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
        const startingDayOfWeek = firstDay.getDay();
        
        let html = '';
        
        // Calendar header
        html += `
            <div class="calendar-header">
                <h3 class="calendar-month-title">
                    ${month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <div class="calendar-nav">
                    <button class="btn btn-outline btn-sm" onclick="EarlyBirdCalendar.previousMonth()">
                        ◀ Previous
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="EarlyBirdCalendar.today()">
                        Today
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="EarlyBirdCalendar.nextMonth()">
                        Next ▶
                    </button>
                </div>
            </div>
        `;
        
        // Calendar grid
        html += '<div class="calendar-grid">';
        
        // Day headers
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        days.forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });
        
        // Previous month days
        const prevMonthLastDay = new Date(month.getFullYear(), month.getMonth(), 0).getDate();
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            html += `
                <div class="calendar-day other-month">
                    <div class="day-number">${prevMonthLastDay - i}</div>
                </div>
            `;
        }
        
        // Current month days
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(month.getFullYear(), month.getMonth(), day);
            const dateStr = EarlyBirdUtils.getDateString(date);
            const isToday = EarlyBirdUtils.isSameDay(date, new Date());
            const isSelected = EarlyBirdUtils.isSameDay(date, this.state.selectedDate);
            
            const deliveryCount = this.getDeliveryCount(date);
            const heatClass = this.getHeatClass(deliveryCount);
            
            const events = this.getEventsForDate(date);
            const hasDelivery = events.some(e => e.type === 'delivery');
            const hasPayment = events.some(e => e.type === 'payment');
            const hasOrder = events.some(e => e.type === 'order');
            const hasSubscription = events.some(e => e.type === 'subscription');
            
            html += `
                <div class="calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${heatClass}"
                     onclick="EarlyBirdCalendar.selectDate('${dateStr}')">
                    <div class="day-number">${day}</div>
                    ${deliveryCount > 0 ? `<div class="day-count">${deliveryCount} 📦</div>` : ''}
                    <div class="day-indicators">
                        ${hasDelivery ? '<div class="indicator delivery" title="Delivery"></div>' : ''}
                        ${hasPayment ? '<div class="indicator payment" title="Payment"></div>' : ''}
                        ${hasOrder ? '<div class="indicator order" title="Order"></div>' : ''}
                        ${hasSubscription ? '<div class="indicator subscription" title="Subscription"></div>' : ''}
                    </div>
                </div>
            `;
        }
        
        // Next month days
        const totalCells = startingDayOfWeek + lastDay.getDate();
        const remainingCells = totalCells <= 35 ? 35 - totalCells : 42 - totalCells;
        for (let day = 1; day <= remainingCells; day++) {
            html += `
                <div class="calendar-day other-month">
                    <div class="day-number">${day}</div>
                </div>
            `;
        }
        
        html += '</div>'; // Close calendar-grid
        
        this.containerEl.innerHTML = html;
    },
    
    renderDateDetails() {
        if (!this.detailsEl) return;
        
        const date = this.state.selectedDate;
        const dateStr = EarlyBirdUtils.getDateString(date);
        const events = this.getEventsForDate(date);
        
        // Calculate stats
        const deliveries = events.filter(e => e.type === 'delivery').length;
        const orders = events.filter(e => e.type === 'order').length;
        const payments = events.filter(e => e.type === 'payment')
            .reduce((sum, e) => sum + (e.amount || 0), 0);
        
        let html = `
            <div class="date-detail-header">
                <div class="date-detail-title">
                    <h3>${EarlyBirdUtils.formatDate(date, 'full')}</h3>
                    <span class="date-badge">${events.length} Event${events.length !== 1 ? 's' : ''}</span>
                </div>
            </div>
            
            <div class="quick-summary">
                <div class="summary-box">
                    <div class="summary-label">Deliveries</div>
                    <div class="summary-value">${deliveries}</div>
                </div>
                <div class="summary-box">
                    <div class="summary-label">Orders</div>
                    <div class="summary-value">${orders}</div>
                </div>
                <div class="summary-box">
                    <div class="summary-label">Payments</div>
                    <div class="summary-value">${EarlyBirdUtils.formatCurrency(payments)}</div>
                </div>
            </div>
            
            ${this.renderDemandForecast(dateStr)}
            ${this.renderStockAlerts(dateStr)}
            
            <div class="event-timeline">
        `;
        
        if (events.length === 0) {
            html += `
                <div class="empty-state">
                    <div class="empty-state-icon">📅</div>
                    <h3>No events on this date</h3>
                    <p>No deliveries, orders, or payments scheduled</p>
                    <button class="btn btn-primary mt-3" onclick="EarlyBirdOrders.openCreateOrder('${dateStr}')">
                        ➕ Create Order
                    </button>
                </div>
            `;
        } else {
            // Sort events by time
            const sortedEvents = [...events].sort((a, b) => {
                return (a.time || '').localeCompare(b.time || '');
            });
            
            sortedEvents.forEach(event => {
                html += this.renderEventCard(event);
            });
        }
        
        html += '</div>'; // Close event-timeline
        
        this.detailsEl.innerHTML = html;
    },
    
    renderEventCard(event) {
        const typeConfig = {
            delivery: { icon: '🚚', label: 'Delivery', class: 'delivery' },
            payment: { icon: '💰', label: 'Payment', class: 'payment' },
            order: { icon: '📦', label: 'Order', class: 'order' },
            subscription: { icon: '🔄', label: 'Subscription', class: 'subscription' }
        };
        
        const config = typeConfig[event.type] || { icon: '📋', label: 'Event', class: 'order' };
        
        return `
            <div class="event-card" onclick="EarlyBirdCalendar.viewEvent('${event.id}')">
                <div class="event-header">
                    <div class="event-type">
                        <div class="event-icon ${config.class}">
                            ${config.icon}
                        </div>
                        <div class="event-info">
                            <h4>${config.label} - ${event.customer || 'Unknown'}</h4>
                            <div class="event-time">${event.time || 'Time not set'}</div>
                        </div>
                    </div>
                    <span class="event-status ${event.status || 'pending'}">${event.status || 'pending'}</span>
                </div>
                <div class="event-details">
                    ${event.details || 'No details available'}
                    ${event.amount ? `<br><strong>Amount:</strong> ${EarlyBirdUtils.formatCurrency(event.amount)}` : ''}
                </div>
            </div>
        `;
    },
    
    // ========== NAVIGATION ==========
    
    previousMonth() {
        this.state.currentMonth = new Date(
            this.state.currentMonth.getFullYear(),
            this.state.currentMonth.getMonth() - 1,
            1
        );
        this.render();
    },
    
    nextMonth() {
        this.state.currentMonth = new Date(
            this.state.currentMonth.getFullYear(),
            this.state.currentMonth.getMonth() + 1,
            1
        );
        this.render();
    },
    
    today() {
        this.state.currentMonth = new Date();
        this.state.selectedDate = new Date();
        this.render();
        this.renderDateDetails();
    },
    
    selectDate(dateStr) {
        this.state.selectedDate = new Date(dateStr);
        this.render();
        this.renderDateDetails();
    },
    
    viewEvent(eventId) {
        // Find event
        let foundEvent = null;
        let foundDate = null;
        
        Object.keys(this.state.events).forEach(dateStr => {
            const event = this.state.events[dateStr].find(e => e.id === eventId);
            if (event) {
                foundEvent = event;
                foundDate = dateStr;
            }
        });
        
        if (foundEvent) {
            // Show event details modal
            this.showEventModal(foundEvent, foundDate);
        }
    },
    
    showEventModal(event, dateStr) {
        const typeLabels = {
            delivery: 'Delivery',
            payment: 'Payment',
            order: 'Order',
            subscription: 'Subscription'
        };
        
        const content = `
            <div class="form-group">
                <label class="form-label">Type</label>
                <div><span class="badge badge-primary">${typeLabels[event.type] || event.type}</span></div>
            </div>
            <div class="form-group">
                <label class="form-label">Customer</label>
                <div>${event.customer || 'N/A'}</div>
            </div>
            <div class="form-group">
                <label class="form-label">Date & Time</label>
                <div>${EarlyBirdUtils.formatDate(dateStr, 'long')} ${event.time ? '• ' + event.time : ''}</div>
            </div>
            <div class="form-group">
                <label class="form-label">Status</label>
                <div><span class="badge badge-${event.status === 'completed' ? 'success' : 'warning'}">${event.status || 'pending'}</span></div>
            </div>
            ${event.amount ? `
                <div class="form-group">
                    <label class="form-label">Amount</label>
                    <div class="text-lg font-bold text-primary">${EarlyBirdUtils.formatCurrency(event.amount)}</div>
                </div>
            ` : ''}
            <div class="form-group">
                <label class="form-label">Details</label>
                <div>${event.details || 'No details available'}</div>
            </div>
        `;
        
        const footer = `
            <button class="btn btn-outline" onclick="EarlyBirdUtils.closeModal('eventDetails')">Close</button>
            ${event.status === 'pending' ? `
                <button class="btn btn-success" onclick="EarlyBirdCalendar.markEventComplete('${event.id}')">
                    ✓ Mark Complete
                </button>
            ` : ''}
        `;
        
        EarlyBirdUtils.createModal({
            id: 'eventDetails',
            title: `${typeLabels[event.type] || 'Event'} Details`,
            content: content,
            footer: footer
        });
        
        EarlyBirdUtils.openModal('eventDetails');
    },
    
    markEventComplete(eventId) {
        // Find and update event
        Object.keys(this.state.events).forEach(dateStr => {
            const event = this.state.events[dateStr].find(e => e.id === eventId);
            if (event) {
                event.status = 'completed';
                event.completedAt = new Date().toISOString();
            }
        });
        
        this.saveEvents();
        this.render();
        this.renderDateDetails();
        
        EarlyBirdUtils.closeModal('eventDetails');
        EarlyBirdUtils.showToast('Event marked as completed', 'success');
    },
    
    // ========== MOCK DATA GENERATION ==========
    
    generateMockEvents() {
        const customers = EarlyBirdUtils.getMockCustomers();
        const products = EarlyBirdUtils.getMockProducts();
        
        // Generate events for past 30 days and next 30 days
        for (let i = -30; i <= 30; i++) {
            const date = EarlyBirdUtils.addDays(new Date(), i);
            const dateStr = EarlyBirdUtils.getDateString(date);
            const eventCount = Math.floor(Math.random() * 8) + 2;
            
            for (let j = 0; j < eventCount; j++) {
                const eventTypes = ['delivery', 'payment', 'order', 'subscription'];
                const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
                const customer = customers[Math.floor(Math.random() * customers.length)];
                const product = products[Math.floor(Math.random() * products.length)];
                
                const event = {
                    id: EarlyBirdUtils.generateId(),
                    type: type,
                    customer: customer.name,
                    customerId: customer.id,
                    time: `${Math.floor(Math.random() * 12) + 1}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')} ${Math.random() > 0.5 ? 'AM' : 'PM'}`,
                    status: Math.random() > 0.3 ? 'completed' : 'pending',
                    amount: type === 'payment' ? Math.floor(Math.random() * 2000) + 100 : null,
                    details: type === 'delivery' ? `${product.name}, ${products[Math.floor(Math.random() * products.length)].name}` :
                            type === 'order' ? `New order: ${product.name}` :
                            type === 'subscription' ? `Daily ${product.name} subscription` :
                            'Payment received via UPI',
                    createdAt: new Date().toISOString()
                };
                
                this.addEvent(date, event);
            }
        }
    }
};

// ========== GLOBAL HELPER FUNCTIONS ==========
// These are called from HTML onclick handlers

/**
 * Global function to initialize calendar
 */
function initCalendar() {
    // Initialize EarlyBirdUtils if needed
    if (typeof EarlyBirdUtils === 'undefined') {
        console.error('EarlyBirdUtils not loaded');
        return;
    }
    
    // Find calendar containers
    const calendarGrid = document.getElementById('calendarGrid');
    const dateDetailView = document.getElementById('dateDetailView');
    
    if (calendarGrid) {
        EarlyBirdCalendar.init('calendarGrid', 'dateDetailView');
    }
}

/**
 * Global function to change month
 * @param {number} direction - -1 for previous, 0 for today, 1 for next
 */
function changeMonth(direction) {
    if (direction === 0) {
        // Go to today
        EarlyBirdCalendar.state.currentMonth = new Date();
    } else if (direction === -1) {
        // Previous month
        EarlyBirdCalendar.state.currentMonth.setMonth(EarlyBirdCalendar.state.currentMonth.getMonth() - 1);
    } else if (direction === 1) {
        // Next month
        EarlyBirdCalendar.state.currentMonth.setMonth(EarlyBirdCalendar.state.currentMonth.getMonth() + 1);
    }
    
    // Re-render calendar
    EarlyBirdCalendar.render();
}

/**
 * Global function to set active navigation item
 * @param {string} pageId - The page ID to set as active
 */
function setActiveNav(pageId) {
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to matching nav item
    const navItem = document.querySelector(`.nav-item[data-page="${pageId}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }
}

/**
 * Render demand forecast for date (Admin/Supplier view)
 * Attached as a method on EarlyBirdCalendar.
 */
EarlyBirdCalendar.renderDemandForecast = function(dateStr) {
    // Only show in admin/supplier context
    if (typeof EarlyBirdDemandForecast === 'undefined') {
        return '';
    }
    
    try {
            // Get all orders for this date
            const orders = typeof EarlyBirdOrders !== 'undefined' ? 
                EarlyBirdOrders.getOrdersForDate(dateStr) : [];
            
            if (orders.length === 0) {
                return '';
            }
            
            // Generate forecast
            const forecast = new EarlyBirdDemandForecast();
            const aggregated = forecast.aggregateDemand(orders, 1); // 1 day ahead
            
            if (Object.keys(aggregated).length === 0) {
                return '';
            }
            
            let html = `
                <div class="date-detail-item" style="background: #f0f8ff; border-left-color: #2196F3; margin-top: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <strong style="color: #2196F3; font-size: 16px;">📊 Demand Forecast</strong>
                        <button class="btn btn-sm" onclick="adminPortalUI.generateSupplierOrders('${dateStr}')" 
                            style="padding: 6px 12px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">
                            Generate Supplier Orders
                        </button>
                    </div>
            `;
            
            Object.entries(aggregated).forEach(([supplierId, forecasts]) => {
                if (forecasts.length > 0) {
                    const dailyForecast = forecasts[0]; // First (and only) forecast for this date
                    const totalQty = dailyForecast.totalQty || 0;
                    const itemCount = dailyForecast.items.length;
                    
                    html += `
                        <div style="padding: 8px; background: white; border-radius: 4px; margin-bottom: 8px;">
                            <div style="font-weight: 600; margin-bottom: 4px;">Supplier: ${supplierId}</div>
                            <div style="font-size: 13px; color: #666;">
                                ${itemCount} products | Total: ${totalQty} units
                            </div>
                        </div>
                    `;
                }
            });
            
            html += '</div>';
            return html;
        } catch (error) {
            console.error('Error rendering demand forecast:', error);
            return '';
        }
    };
    
/**
 * Render stock alerts for date
 * Attached as a method on EarlyBirdCalendar.
 */
EarlyBirdCalendar.renderStockAlerts = function(dateStr) {
    if (typeof EarlyBirdSupplier === 'undefined') {
        return '';
    }
    
    try {
            const alerts = EarlyBirdSupplier.checkInventoryLevels();
            const dateAlerts = alerts.filter(a => {
                // Check if alert is relevant for this date
                return true; // For now, show all alerts
            });
            
            if (dateAlerts.length === 0) {
                return '';
            }
            
            let html = `
                <div class="date-detail-item" style="background: #fff3e0; border-left-color: #FF9800; margin-top: 12px;">
                    <strong style="color: #FF9800; font-size: 16px;">⚠️ Stock Alerts</strong>
            `;
            
            dateAlerts.slice(0, 5).forEach(alert => {
                const severityColor = alert.severity === 'RED' ? '#F44336' : '#FF9800';
                html += `
                    <div style="padding: 8px; background: white; border-radius: 4px; margin-top: 8px; border-left: 3px solid ${severityColor};">
                        <div style="font-weight: 600; color: ${severityColor};">${alert.product}</div>
                        <div style="font-size: 12px; color: #666; margin-top: 4px;">
                            Need: ${alert.demandNext3Days} | Have: ${alert.currentStock} | Shortage: ${alert.shortage}
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            return html;
        } catch (error) {
            console.error('Error rendering stock alerts:', error);
            return '';
        }
    };
    
// Initialize on DOM ready
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // Auto-initialize if containers exist
        const container = document.getElementById('calendarGrid');
        const details = document.getElementById('dateDetailView');
        
        if (container) {
            EarlyBirdCalendar.init('calendarGrid', 'dateDetailView');
        }
    });
}

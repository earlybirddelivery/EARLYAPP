// ============================================
// Delivery Boy Dashboard UI - Inspired by Emergent Code
// ============================================

const deliveryBoyUI = {
    state: {
        deliveryDate: new Date().toISOString().split('T')[0],
        deliveries: [],
        deliveryBoyId: null, // Set from session on init
        products: [],
        summary: {
            total: 0,
            completed: 0,
            pending: 0,
            totalItems: 0
        }
    },

    init() {
        console.log('Initializing Delivery Boy UI...');
        
        // Get delivery boy ID from session (not hardcoded)
        if (typeof EarlyBirdAuth !== 'undefined') {
            const currentUser = EarlyBirdAuth.getCurrentUser();
            if (currentUser) {
                this.state.deliveryBoyId = currentUser.userId;
                console.log('Delivery Boy ID from session:', this.state.deliveryBoyId);
            }
        }
        
        this.loadProducts();
        this.setupDatePicker();
    },

    setupDatePicker() {
        const picker = document.getElementById('deliveryDatePicker');
        if (picker) {
            picker.value = this.state.deliveryDate;
        }
    },

    loadProducts() {
        // Load products from system
        this.state.products = [
            { id: 'milk-500ml', name: 'Milk 500ml', price: 30, unit: 'packet' },
            { id: 'milk-1l', name: 'Milk 1L', price: 60, unit: 'packet' },
            { id: 'curd-500ml', name: 'Curd 500ml', price: 25, unit: 'packet' },
            { id: 'buttermilk-1l', name: 'Buttermilk 1L', price: 20, unit: 'packet' }
        ];
    },

    loadTodayRoute() {
        const picker = document.getElementById('deliveryDatePicker');
        if (picker) {
            this.state.deliveryDate = picker.value;
        }

        console.log('Loading route for:', this.state.deliveryDate);

        // Update header
        const dateElem = document.getElementById('routeDate');
        if (dateElem) {
            const date = new Date(this.state.deliveryDate);
            dateElem.textContent = `Deliveries for ${date.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
        }

        // Generate mock delivery data
        this.generateMockDeliveries();

        // Calculate summary
        this.calculateSummary();

        // Render deliveries
        this.renderDeliveriesByArea();

        // Update summary cards
        this.updateSummaryCards();
    },

    generateMockDeliveries() {
        // Mock customers grouped by area
        const areas = [
            {
                area: 'Kukatpally',
                customers: [
                    { id: 'c1', name: 'Ramesh Kumar', phone: '9876543210', address: 'Plot 123, KPHB Colony', shift: 'morning', status: 'pending' },
                    { id: 'c2', name: 'Lakshmi Devi', phone: '9876543211', address: 'Flat 4B, Sai Towers', shift: 'morning', status: 'pending' },
                    { id: 'c3', name: 'Venkat Rao', phone: '9876543212', address: 'House 789, Phase 2', shift: 'evening', status: 'pending' }
                ]
            },
            {
                area: 'KPHB',
                customers: [
                    { id: 'c4', name: 'Sita Reddy', phone: '9876543213', address: 'Villa 12, Phase 3', shift: 'morning', status: 'pending' },
                    { id: 'c5', name: 'Krishna Prasad', phone: '9876543214', address: 'Flat 201, Greenview', shift: 'evening', status: 'pending' }
                ]
            },
            {
                area: 'Miyapur',
                customers: [
                    { id: 'c6', name: 'Rajesh Gupta', phone: '9876543215', address: 'Plot 456, Miyapur Main', shift: 'morning', status: 'pending' }
                ]
            }
        ];

        // Add products to each customer
        this.state.deliveries = areas.map(area => ({
            ...area,
            customers: area.customers.map(customer => ({
                ...customer,
                products: this.generateCustomerProducts()
            }))
        }));
    },

    generateCustomerProducts() {
        const products = [];

        // Randomly assign products
        this.state.products.forEach(product => {
            if (Math.random() > 0.5) { // 50% chance
                products.push({
                    id: product.id,
                    name: product.name,
                    quantity: Math.floor(Math.random() * 3) + 1, // 1-3 quantity
                    price: product.price
                });
            }
        });

        return products;
    },

    calculateSummary() {
        let total = 0;
        let completed = 0;
        let totalItems = 0;

        this.state.deliveries.forEach(area => {
            area.customers.forEach(customer => {
                total++;
                if (customer.status === 'delivered') {
                    completed++;
                }
                totalItems += customer.products.length;
            });
        });

        this.state.summary = {
            total,
            completed,
            pending: total - completed,
            totalItems
        };
    },

    updateSummaryCards() {
        const { total, completed, pending, totalItems } = this.state.summary;

        document.getElementById('totalDeliveries').textContent = total;
        document.getElementById('completedCount').textContent = completed;
        document.getElementById('pendingCount').textContent = pending;
        document.getElementById('totalItems').textContent = totalItems;

        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        document.getElementById('completionRate').textContent = `${completionRate}% complete`;

        // Breakdown by shift
        let morning = 0, evening = 0;
        this.state.deliveries.forEach(area => {
            area.customers.forEach(customer => {
                if (customer.shift === 'morning') morning++;
                if (customer.shift === 'evening') evening++;
            });
        });

        document.getElementById('deliveryBreakdown').textContent = `Morning: ${morning} | Evening: ${evening}`;
        document.getElementById('pendingBreakdown').textContent = `To be delivered`;

        // Items breakdown
        let milk = 0, curd = 0, other = 0;
        this.state.deliveries.forEach(area => {
            area.customers.forEach(customer => {
                customer.products.forEach(product => {
                    if (product.id.includes('milk')) milk += product.quantity;
                    else if (product.id.includes('curd')) curd += product.quantity;
                    else other += product.quantity;
                });
            });
        });

        document.getElementById('itemsBreakdown').textContent = `Milk: ${milk} | Curd: ${curd}`;
    },

    renderDeliveriesByArea() {
        const container = document.getElementById('deliveriesByArea');
        if (!container) return;

        let html = '';

        this.state.deliveries.forEach(area => {
            const areaCompleted = area.customers.filter(c => c.status === 'delivered').length;
            const areaTotal = area.customers.length;
            const areaProgress = areaTotal > 0 ? Math.round((areaCompleted / areaTotal) * 100) : 0;

            html += `
                <div class="card" style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <div>
                            <h3 style="margin: 0; display: flex; align-items: center; gap: 8px;">
                                <span>📍 ${area.area}</span>
                                <span style="background: var(--light); padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 600;">
                                    ${areaCompleted}/${areaTotal} completed
                                </span>
                            </h3>
                            <p style="margin: 4px 0 0 0; color: var(--text-secondary); font-size: 14px;">
                                ${areaProgress}% completion rate
                            </p>
                        </div>
                        <button class="btn btn-sm btn-outline" onclick="deliveryBoyUI.markAreaComplete('${area.area}')"
                            style="padding: 8px 16px;">
                            ✅ Mark All Delivered
                        </button>
                    </div>

                    <!-- Progress bar -->
                    <div style="height: 6px; background: var(--light); border-radius: 3px; margin-bottom: 20px; overflow: hidden;">
                        <div style="height: 100%; width: ${areaProgress}%; background: linear-gradient(90deg, #4caf50, #8bc34a); transition: width 0.3s;"></div>
                    </div>

                    <!-- Customer list -->
                    <div style="display: grid; gap: 12px;">
            `;

            area.customers.forEach(customer => {
                const isDelivered = customer.status === 'delivered';
                const borderColor = isDelivered ? '#4caf50' : '#e0e0e0';
                const bgColor = isDelivered ? '#f1f8f4' : 'white';

                html += `
                    <div style="border: 2px solid ${borderColor}; border-radius: 8px; padding: 16px; background: ${bgColor}; position: relative;">
                        ${isDelivered ? '<div style="position: absolute; top: 10px; right: 10px; background: #4caf50; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">✓ Delivered</div>' : ''}

                        <div style="display: grid; grid-template-columns: 1fr auto; gap: 16px; margin-bottom: 12px;">
                            <div>
                                <div style="font-weight: 700; font-size: 15px; margin-bottom: 4px;">${customer.name}</div>
                                <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">
                                    📞 ${customer.phone}
                                </div>
                                <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">
                                    📍 ${customer.address}
                                </div>
                                <div style="font-size: 13px; color: var(--text-secondary);">
                                    ${customer.shift === 'morning' ? '🌅 Morning Shift' : '🌙 Evening Shift'}
                                </div>
                            </div>
                            <div style="text-align: right;">
                                ${!isDelivered ? `
                                    <button class="btn btn-primary" style="padding: 8px 16px; margin-bottom: 8px;"
                                        onclick="deliveryBoyUI.markDelivered('${area.area}', '${customer.id}')">
                                        ✓ Mark Delivered
                                    </button>
                                ` : ''}
                                <button class="btn btn-sm btn-outline" style="padding: 6px 12px; display: block; width: 100%;"
                                    onclick="deliveryBoyUI.adjustQuantity('${area.area}', '${customer.id}')">
                                    ✏️ Adjust Quantity
                                </button>
                            </div>
                        </div>

                        <!-- Products list -->
                        <div style="background: white; border-radius: 6px; padding: 12px; border: 1px solid var(--border);">
                            <div style="font-weight: 600; font-size: 13px; margin-bottom: 8px; color: var(--text-secondary);">Items to Deliver:</div>
                            <div style="display: grid; gap: 6px;">
                `;

                customer.products.forEach(product => {
                    html += `
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 13px;">
                            <span>${product.name}</span>
                            <span style="font-weight: 600;">${product.quantity} ${product.quantity > 1 ? 'units' : 'unit'} × ₹${product.price} = ₹${product.quantity * product.price}</span>
                        </div>
                    `;
                });

                const totalAmount = customer.products.reduce((sum, p) => sum + (p.quantity * p.price), 0);

                html += `
                            </div>
                            <div style="margin-top: 8px; padding-top: 8px; border-top: 2px solid var(--border); display: flex; justify-content: space-between; font-weight: 700; font-size: 14px;">
                                <span>Total Amount:</span>
                                <span style="color: #4caf50;">₹${totalAmount}</span>
                            </div>
                        </div>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        container.innerHTML = html || '<div class="empty-state"><p>No deliveries scheduled for this date</p></div>';
    },

    markDelivered(areaName, customerId) {
        // Find and update customer status
        const area = this.state.deliveries.find(a => a.area === areaName);
        if (!area) return;

        const customer = area.customers.find(c => c.id === customerId);
        if (!customer) return;

        customer.status = 'delivered';

        console.log(`Marked ${customer.name} as delivered`);

        // Recalculate and re-render
        this.calculateSummary();
        this.updateSummaryCards();
        this.renderDeliveriesByArea();

        // Show success message
        this.showToast(`✓ Delivery completed for ${customer.name}`, 'success');
    },

    markAreaComplete(areaName) {
        const area = this.state.deliveries.find(a => a.area === areaName);
        if (!area) return;

        let count = 0;
        area.customers.forEach(customer => {
            if (customer.status !== 'delivered') {
                customer.status = 'delivered';
                count++;
            }
        });

        if (count > 0) {
            console.log(`Marked ${count} customers in ${areaName} as delivered`);

            // Recalculate and re-render
            this.calculateSummary();
            this.updateSummaryCards();
            this.renderDeliveriesByArea();

            this.showToast(`✓ Marked all ${count} deliveries in ${areaName} as complete`, 'success');
        } else {
            this.showToast(`All deliveries in ${areaName} are already completed`, 'info');
        }
    },

    adjustQuantity(areaName, customerId) {
        const area = this.state.deliveries.find(a => a.area === areaName);
        if (!area) return;

        const customer = area.customers.find(c => c.id === customerId);
        if (!customer) return;

        // Create modal for quantity adjustment
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-header">
                    <h2>✏️ Adjust Delivery - ${customer.name}</h2>
                    <button onclick="this.closest('.modal-overlay').remove()"
                        style="background: none; border: none; font-size: 20px; cursor: pointer;">✕</button>
                </div>
                <div class="modal-body" style="padding: 20px;">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Adjustment Type</label>
                        <select id="adjustmentType"
                            style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px;">
                            <option value="this_day_only">This date only (temporary)</option>
                            <option value="till_further_notice">Till further notice (permanent)</option>
                            <option value="specific_date">Until specific date</option>
                        </select>
                    </div>

                    <div id="specificDateDiv" style="margin-bottom: 20px; display: none;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Until Date</label>
                        <input type="date" id="specificDate"
                            style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px;">
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Select Product</label>
                        <select id="adjustProduct"
                            style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px;">
                            ${customer.products.map(p => `<option value="${p.id}">${p.name} (Current: ${p.quantity})</option>`).join('')}
                        </select>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Action</label>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                            <button class="btn btn-outline" onclick="document.getElementById('adjustAction').value='add'; this.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active')); this.classList.add('active');" style="position: relative;">
                                ➕ Add
                            </button>
                            <button class="btn btn-outline" onclick="document.getElementById('adjustAction').value='reduce'; this.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active')); this.classList.add('active');">
                                ➖ Reduce
                            </button>
                            <button class="btn btn-outline" onclick="document.getElementById('adjustAction').value='pause'; this.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active')); this.classList.add('active');">
                                ⏸️ Pause
                            </button>
                        </div>
                        <input type="hidden" id="adjustAction" value="add">
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Quantity</label>
                        <input type="number" id="adjustQuantity" min="1" max="10" value="1"
                            style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px;">
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Reason (Optional)</label>
                        <textarea id="adjustReason" rows="3"
                            style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px;"
                            placeholder="e.g., Customer requested extra, Going on vacation, etc."></textarea>
                    </div>

                    <button class="btn btn-primary" style="width: 100%;"
                        onclick="deliveryBoyUI.saveAdjustment('${areaName}', '${customerId}', this)">
                        Save Changes
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Add event listener for adjustment type
        modal.querySelector('#adjustmentType').addEventListener('change', (e) => {
            const specificDateDiv = modal.querySelector('#specificDateDiv');
            if (e.target.value === 'specific_date') {
                specificDateDiv.style.display = 'block';
            } else {
                specificDateDiv.style.display = 'none';
            }
        });
    },

    saveAdjustment(areaName, customerId, btn) {
        const type = document.getElementById('adjustmentType')?.value;
        const action = document.getElementById('adjustAction')?.value;
        const productId = document.getElementById('adjustProduct')?.value;
        const quantity = parseInt(document.getElementById('adjustQuantity')?.value) || 0;
        const reason = document.getElementById('adjustReason')?.value;

        console.log('Saving adjustment:', { type, action, productId, quantity, reason });

        // Close modal
        btn.closest('.modal-overlay').remove();

        // Save to localStorage for persistence
        const routeKey = `route_${this.state.deliveryDate}_${this.state.deliveryBoyId}`;
        const savedRoute = JSON.parse(localStorage.getItem(routeKey) || '{}');
        
        if (!savedRoute.adjustments) {
            savedRoute.adjustments = [];
        }
        
        savedRoute.adjustments.push({
            timestamp: new Date().toISOString(),
            customerId,
            productId,
            quantity: parseInt(quantity),
            action,
            type,
            reason
        });
        
        localStorage.setItem(routeKey, JSON.stringify(savedRoute));

        // Show confirmation
        this.showToast(`✓ Adjustment saved: ${action} ${quantity} ${productId} (${type})`, 'success');
        
        console.log('Route adjustment persisted for:', this.state.deliveryBoyId);

        // TODO: Also send to backend for permanent storage
        this.syncRouteToBackend(routeKey, savedRoute);
    },

    startNavigation() {
        const firstPending = this.findFirstPendingDelivery();

        if (!firstPending) {
            this.showToast('All deliveries completed! 🎉', 'success');
            return;
        }

        const { area, customer } = firstPending;

        // In a real app, this would open Maps with the address
        this.showToast(`🗺️ Navigation started to ${customer.name} in ${area.area}`, 'info');

        console.log('Starting navigation to:', customer.address);

        // Try to open Google Maps if available, otherwise simulate
        const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(customer.address)}`;
        
        try {
            // Attempt to open in new window
            window.open(mapsUrl, '_blank');
            console.log('Opened Google Maps navigation');
        } catch (e) {
            // Fallback: show address in dialog
            this.showToast(`📍 Navigate to: ${customer.name}, ${customer.address}`, 'info');
        }
    },

    syncRouteToBackend(routeKey, routeData) {
        // Send route to backend for permanent storage
        if (typeof fetch !== 'undefined') {
            fetch('/api/routes/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deliveryBoyId: this.state.deliveryBoyId,
                    date: this.state.deliveryDate,
                    routeData: routeData
                })
            }).catch(err => {
                console.log('Backend sync not available, using localStorage only:', err.message);
            });
        }
    },

    showAMDeliveries() {
        const container = document.getElementById('am-deliveriesPage');
        if (!container) return;
        
        const amDeliveries = this.state.deliveries
            .flatMap(area => area.customers.map(c => ({ ...c, area: area.area })))
            .filter(c => c.shift === 'morning');
        
        container.innerHTML = `
            <div class="page-header">
                <div class="page-header-left">
                    <h2>🌅 AM Deliveries (7 AM - 12 PM)</h2>
                    <p>Morning shift deliveries - ${amDeliveries.length} customers</p>
                </div>
                <button class="btn btn-primary" onclick="deliveryBoyUI.loadTodayRoute()">🔄 Refresh</button>
            </div>
            <div class="deliveries-list">
                ${amDeliveries.map(customer => `
                    <div class="delivery-card">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <h4>${customer.name}</h4>
                                <p>📍 ${customer.address}</p>
                                <p>📞 ${customer.phone}</p>
                                <p style="color: #666;">Area: ${customer.area}</p>
                            </div>
                            <span class="badge badge-pending">Pending</span>
                        </div>
                        <button class="btn btn-success" onclick="deliveryBoyUI.markDeliveryComplete('${customer.id}')">✓ Complete Delivery</button>
                    </div>
                `).join('')}
            </div>
        `;
    },

    showPMDeliveries() {
        const container = document.getElementById('pm-deliveriesPage');
        if (!container) return;
        
        const pmDeliveries = this.state.deliveries
            .flatMap(area => area.customers.map(c => ({ ...c, area: area.area })))
            .filter(c => c.shift === 'evening');
        
        container.innerHTML = `
            <div class="page-header">
                <div class="page-header-left">
                    <h2>🌙 PM Deliveries (12 PM - 8 PM)</h2>
                    <p>Evening shift deliveries - ${pmDeliveries.length} customers</p>
                </div>
                <button class="btn btn-primary" onclick="deliveryBoyUI.loadTodayRoute()">🔄 Refresh</button>
            </div>
            <div class="deliveries-list">
                ${pmDeliveries.map(customer => `
                    <div class="delivery-card">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <h4>${customer.name}</h4>
                                <p>📍 ${customer.address}</p>
                                <p>📞 ${customer.phone}</p>
                                <p style="color: #666;">Area: ${customer.area}</p>
                            </div>
                            <span class="badge badge-pending">Pending</span>
                        </div>
                        <button class="btn btn-success" onclick="deliveryBoyUI.markDeliveryComplete('${customer.id}')">✓ Complete Delivery</button>
                    </div>
                `).join('')}
            </div>
        `;
    },

    findFirstPendingDelivery() {
        for (const area of this.state.deliveries) {
            for (const customer of area.customers) {
                if (customer.status !== 'delivered') {
                    return { area, customer };
                }
            }
        }
        return null;
    },

    markDeliveryComplete(customerId) {
        // Find customer in deliveries and mark as completed
        let found = false;
        this.state.deliveries.forEach(area => {
            area.customers.forEach(customer => {
                if (customer.id === customerId) {
                    customer.status = 'delivered';
                    found = true;
                    this.showToast(`✓ Delivery completed for ${customer.name}`, 'success');
                }
            });
        });

        if (found) {
            // Refresh the current page view
            this.calculateSummary();
            this.updateSummaryCards();
            
            // Re-render the AM/PM page if visible
            const amPage = document.getElementById('am-deliveriesPage');
            const pmPage = document.getElementById('pm-deliveriesPage');
            
            if (amPage && amPage.style.display !== 'none') {
                this.showAMDeliveries();
            } else if (pmPage && pmPage.style.display !== 'none') {
                this.showPMDeliveries();
            }
        }
    },

    showToast(message, type = 'info') {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 16px 24px;
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
            color: white;
            border-radius: 8px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// Add animation styles
if (!document.getElementById('toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
        .btn.active {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
        }
    `;
    document.head.appendChild(style);
}

// Auto-initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Delivery Boy UI module loaded');
    });
} else {
    console.log('Delivery Boy UI module loaded');
}

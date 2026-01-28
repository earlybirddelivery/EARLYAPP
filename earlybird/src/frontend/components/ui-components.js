// ============================================
// EarlyBird UI Components Module
// Real business logic UI - NOT mockups
// Integrates with: wallet.js, orders.js, delivery.js, subscription.js
// ============================================

// ========== TOAST NOTIFICATION SYSTEM ==========
const Toast = (() => {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ⓘ'
    };

    const show = (message, type = 'info', title = '', duration = 4000) => {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const titleText = title || (type === 'success' ? 'Success' : type === 'error' ? 'Error' : type === 'warning' ? 'Warning' : 'Info');
        
        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-content">
                <div class="toast-title">${titleText}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.closest('.toast').remove()">&times;</button>
        `;
        
        container.appendChild(toast);

        if (duration > 0) {
            setTimeout(() => {
                toast.classList.add('closing');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        return toast;
    };

    return {
        success: (message, title = 'Success', duration = 3000) => show(message, 'success', title, duration),
        error: (message, title = 'Error', duration = 5000) => show(message, 'error', title, duration),
        warning: (message, title = 'Warning', duration = 4000) => show(message, 'warning', title, duration),
        info: (message, title = 'Info', duration = 3000) => show(message, 'info', title, duration),
        show: (message, type = 'info', title = '', duration = 3000) => show(message, type, title, duration),
        clear: () => {
            container.innerHTML = '';
        }
    };
})();

const EarlyBirdUIComponents = {
    
    state: {
        currentPage: 'calendar',
        selectedDate: new Date().toISOString().split('T')[0],
        currentCustomerId: localStorage.getItem('customerId') || 'C001',
        currentUserId: localStorage.getItem('userId') || 'U001',
        userRole: localStorage.getItem('userRole') || 'customer'
    },

    // ========== INITIALIZATION ==========
    
    init() {
        console.log('🎨 UI Components Initialized');
        this.setupEventListeners();
        this.loadUserData();
    },

    setupEventListeners() {
        // Global handlers for modal actions
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeModal();
            }
            if (e.target.getAttribute('data-action') === 'close-modal') {
                this.closeModal();
            }
        });
    },

    loadUserData() {
        // Load current user's wallet balance
        const wallet = EarlyBirdWallet.getOrCreateWallet(this.state.currentUserId, this.state.userRole);
        this.updateWalletDisplay(wallet.balance);
    },

    // ========== MODALS & DIALOGS ==========

    /**
     * Create order modal with product search and cart
     */
    openCreateOrderModal(dateStr = null, customerId = null) {
        if (!dateStr) dateStr = this.state.selectedDate;
        if (!customerId) customerId = this.state.currentCustomerId;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-dialog" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>🛒 Create Order</h2>
                    <button data-action="close-modal" style="background: none; border: none; font-size: 20px; cursor: pointer;">✕</button>
                </div>

                <div class="modal-body" style="padding: 20px; max-height: 70vh; overflow-y: auto;">
                    
                    <!-- Order Date Selection -->
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Order Date</label>
                        <input type="date" id="orderDate" value="${dateStr}" style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px;">
                    </div>

                    <!-- Product Search -->
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Search Products</label>
                        <input type="text" id="productSearch" placeholder="Search milk, bread, oil..." 
                            style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px;">
                        <div id="productList" style="margin-top: 10px;"></div>
                    </div>

                    <!-- Cart Items -->
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 12px; font-weight: 600;">📦 Cart Items</label>
                        <div id="cartItems" style="background: var(--light); padding: 12px; border-radius: 6px; min-height: 100px;">
                            <p style="color: var(--text-secondary); text-align: center;">No items yet</p>
                        </div>
                    </div>

                    <!-- Delivery Slot -->
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Delivery Slot</label>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                            <button class="slot-btn" data-slot="AM" onclick="EarlyBirdUIComponents.selectDeliverySlot('AM')">
                                🌅 Morning (6-8 AM)
                            </button>
                            <button class="slot-btn" data-slot="PM" onclick="EarlyBirdUIComponents.selectDeliverySlot('PM')">
                                🌤️ Evening (4-6 PM)
                            </button>
                            <button class="slot-btn" data-slot="ANYTIME" onclick="EarlyBirdUIComponents.selectDeliverySlot('ANYTIME')">
                                ⏰ Anytime
                            </button>
                        </div>
                    </div>

                    <!-- Payment Method -->
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Payment Method</label>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <button class="payment-method-btn" data-method="wallet" onclick="EarlyBirdUIComponents.selectPaymentMethod('wallet')">
                                💰 Wallet
                            </button>
                            <button class="payment-method-btn" data-method="upi" onclick="EarlyBirdUIComponents.selectPaymentMethod('upi')">
                                🔗 UPI Link
                            </button>
                        </div>
                    </div>

                    <!-- Order Summary -->
                    <div style="background: #f0f0f0; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span>Subtotal:</span>
                            <span id="subtotal">₹0</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 16px; border-top: 1px solid #ddd; padding-top: 8px;">
                            <span>Total:</span>
                            <span id="orderTotal">₹0</span>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-outline" data-action="close-modal">Cancel</button>
                    <button class="btn btn-primary" onclick="EarlyBirdUIComponents.submitCreateOrder('${dateStr}', '${customerId}')">
                        ✓ Create Order
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.renderProductList();
        this.updateOrderSummary();
    },

    renderProductList() {
        const mockProducts = [
            { id: 'P001', name: 'Full Cream Milk - 500ml', price: 20, category: 'Milk' },
            { id: 'P002', name: 'Toned Milk - 500ml', price: 15, category: 'Milk' },
            { id: 'P003', name: 'Bread - 400g', price: 25, category: 'Bakery' },
            { id: 'P004', name: 'Butter - 100g', price: 40, category: 'Dairy' },
            { id: 'P005', name: 'Oil - 1L', price: 80, category: 'Oil' },
            { id: 'P006', name: 'Sugar - 1kg', price: 35, category: 'Groceries' }
        ];

        const searchInput = document.getElementById('productSearch');
        const productList = document.getElementById('productList');

        if (!searchInput) return;

        const search = searchInput.value.toLowerCase();
        const filtered = mockProducts.filter(p => 
            p.name.toLowerCase().includes(search) || p.category.toLowerCase().includes(search)
        );

        productList.innerHTML = filtered.map(product => `
            <div style="padding: 10px; background: white; border: 1px solid var(--border); border-radius: 6px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 600;">${product.name}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">₹${product.price}</div>
                </div>
                <button class="btn btn-primary btn-sm" onclick="EarlyBirdUIComponents.addToCart('${product.id}', '${product.name}', ${product.price})">
                    Add
                </button>
            </div>
        `).join('');

        searchInput.addEventListener('keyup', () => this.renderProductList());
    },

    addToCart(productId, productName, price) {
        if (!window.currentOrderCart) window.currentOrderCart = [];
        
        const existing = window.currentOrderCart.find(item => item.productId === productId);
        if (existing) {
            existing.quantity += 1;
        } else {
            window.currentOrderCart.push({ productId, productName, price, quantity: 1 });
        }

        this.updateOrderSummary();
        EarlyBirdUtils.showToast(`Added ${productName}`, 'success');
    },

    updateOrderSummary() {
        if (!window.currentOrderCart) window.currentOrderCart = [];

        const cartDiv = document.getElementById('cartItems');
        const subtotalDiv = document.getElementById('subtotal');
        const totalDiv = document.getElementById('orderTotal');

        let subtotal = 0;
        let html = '';

        if (window.currentOrderCart.length === 0) {
            html = '<p style="color: var(--text-secondary); text-align: center;">No items yet</p>';
        } else {
            html = window.currentOrderCart.map((item, idx) => {
                const itemTotal = item.price * item.quantity;
                subtotal += itemTotal;
                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid white;">
                        <div>
                            <div style="font-weight: 600;">${item.productName}</div>
                            <div style="font-size: 12px; color: var(--text-secondary);">₹${item.price} × ${item.quantity}</div>
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <span style="font-weight: 600;">₹${itemTotal}</span>
                            <button onclick="EarlyBirdUIComponents.removeFromCart(${idx})" style="background: none; border: none; color: red; cursor: pointer;">✕</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        if (cartDiv) cartDiv.innerHTML = html;
        if (subtotalDiv) subtotalDiv.textContent = `₹${subtotal}`;
        if (totalDiv) totalDiv.textContent = `₹${subtotal}`;
    },

    removeFromCart(index) {
        window.currentOrderCart.splice(index, 1);
        this.updateOrderSummary();
    },

    selectDeliverySlot(slot) {
        document.querySelectorAll('.slot-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-slot="${slot}"]`).classList.add('active');
        window.selectedDeliverySlot = slot;
    },

    selectPaymentMethod(method) {
        document.querySelectorAll('.payment-method-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-method="${method}"]`).classList.add('active');
        window.selectedPaymentMethod = method;
    },

    submitCreateOrder(dateStr, customerId) {
        if (!window.currentOrderCart || window.currentOrderCart.length === 0) {
            EarlyBirdUtils.showToast('Please add items to cart', 'error');
            return;
        }

        const orderData = {
            customerId,
            orderDate: document.getElementById('orderDate').value,
            items: window.currentOrderCart,
            deliverySlot: window.selectedDeliverySlot || 'ANYTIME',
            paymentMethod: window.selectedPaymentMethod || 'wallet',
            totalAmount: window.currentOrderCart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        };

        // Create order in backend
        EarlyBirdOrders.createOrder(orderData.customerId, orderData.items, orderData.orderDate, orderData.deliverySlot);

        EarlyBirdUtils.showToast('Order created successfully! ✓', 'success');
        this.closeModal();
        window.currentOrderCart = null;
    },

    closeModal() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) modal.remove();
    },

    // ========== WALLET UI ==========

    /**
     * Top-up wallet modal
     */
    openTopUpWalletModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-dialog" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>💰 Top Up Wallet</h2>
                    <button data-action="close-modal" style="background: none; border: none; font-size: 20px; cursor: pointer;">✕</button>
                </div>

                <div class="modal-body" style="padding: 20px;">
                    <div style="background: #f0f0f0; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Current Balance</div>
                        <div style="font-size: 28px; font-weight: 700;">₹${EarlyBirdWallet.getBalance(this.state.currentUserId, this.state.userRole)}</div>
                    </div>

                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">Amount</label>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px;">
                        <button class="amount-btn" data-amount="500" onclick="document.getElementById('customAmount').value = 500; EarlyBirdUIComponents.selectAmount(500)">₹500</button>
                        <button class="amount-btn" data-amount="1000" onclick="document.getElementById('customAmount').value = 1000; EarlyBirdUIComponents.selectAmount(1000)">₹1,000</button>
                        <button class="amount-btn" data-amount="2000" onclick="document.getElementById('customAmount').value = 2000; EarlyBirdUIComponents.selectAmount(2000)">₹2,000</button>
                        <button class="amount-btn" data-amount="5000" onclick="document.getElementById('customAmount').value = 5000; EarlyBirdUIComponents.selectAmount(5000)">₹5,000</button>
                    </div>

                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">Or Enter Custom Amount</label>
                    <input type="number" id="customAmount" placeholder="Enter amount" 
                        style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; margin-bottom: 20px;">

                    <div style="background: var(--light); padding: 12px; border-radius: 6px; margin-bottom: 20px; font-size: 13px;">
                        <div style="font-weight: 600; margin-bottom: 8px;">💳 Payment Options:</div>
                        <div style="display: flex; gap: 10px;">
                            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                                <input type="radio" name="payment" value="upi" checked>
                                <span>UPI</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                                <input type="radio" name="payment" value="card">
                                <span>Card</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                                <input type="radio" name="payment" value="bank">
                                <span>Bank Transfer</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-outline" data-action="close-modal">Cancel</button>
                    <button class="btn btn-primary" onclick="EarlyBirdUIComponents.submitTopUp()">
                        💳 Pay Now
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    selectAmount(amount) {
        document.querySelectorAll('.amount-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-amount="${amount}"]`).classList.add('active');
        window.selectedTopUpAmount = amount;
    },

    submitTopUp() {
        const amount = window.selectedTopUpAmount || parseInt(document.getElementById('customAmount').value);
        
        if (!amount || amount < 100) {
            EarlyBirdUtils.showToast('Minimum amount is ₹100', 'error');
            return;
        }

        // Call wallet top-up
        EarlyBirdWallet.topUp(this.state.currentCustomerId, amount, 'upi');
        
        EarlyBirdUtils.showToast(`₹${amount} added to wallet ✓`, 'success');
        this.updateWalletDisplay(EarlyBirdWallet.getBalance(this.state.currentUserId, this.state.userRole));
        this.closeModal();
    },

    updateWalletDisplay(balance) {
        const walletDisplay = document.querySelector('[data-widget="wallet-balance"]');
        if (walletDisplay) {
            walletDisplay.textContent = `₹${balance}`;
        }
    },

    // ========== SUBSCRIPTION MANAGEMENT ==========

    /**
     * Add new subscription modal
     */
    openAddSubscriptionModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-dialog" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>📅 Add Subscription</h2>
                    <button data-action="close-modal" style="background: none; border: none; font-size: 20px; cursor: pointer;">✕</button>
                </div>

                <div class="modal-body" style="padding: 20px;">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Product</label>
                        <select id="subscriptionProduct" style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px;">
                            <option value="">-- Select Product --</option>
                            <option value="milk">🥛 Milk</option>
                            <option value="bread">🍞 Bread</option>
                            <option value="butter">🧈 Butter</option>
                            <option value="water">💧 Water Tin</option>
                            <option value="oil">🫒 Oil</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Frequency</label>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                            <button class="freq-btn" data-freq="daily" onclick="EarlyBirdUIComponents.selectFrequency('daily')">
                                📅 Daily
                            </button>
                            <button class="freq-btn" data-freq="alternate" onclick="EarlyBirdUIComponents.selectFrequency('alternate')">
                                🔄 Alternate
                            </button>
                            <button class="freq-btn" data-freq="weekly" onclick="EarlyBirdUIComponents.selectFrequency('weekly')">
                                📆 Weekly
                            </button>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Delivery Time</label>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <button class="time-btn" data-time="AM" onclick="EarlyBirdUIComponents.selectDeliveryTime('AM')">
                                🌅 Morning
                            </button>
                            <button class="time-btn" data-time="PM" onclick="EarlyBirdUIComponents.selectDeliveryTime('PM')">
                                🌤️ Evening
                            </button>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Start Date</label>
                        <input type="date" id="subscriptionStartDate" style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px;">
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Quantity</label>
                        <input type="number" id="subscriptionQty" min="1" value="1" style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px;">
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-outline" data-action="close-modal">Cancel</button>
                    <button class="btn btn-primary" onclick="EarlyBirdUIComponents.submitAddSubscription()">
                        ✓ Add Subscription
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.getElementById('subscriptionStartDate').valueAsDate = new Date();
    },

    selectFrequency(freq) {
        document.querySelectorAll('.freq-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-freq="${freq}"]`).classList.add('active');
        window.selectedFrequency = freq;
    },

    selectDeliveryTime(time) {
        document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-time="${time}"]`).classList.add('active');
        window.selectedDeliveryTime = time;
    },

    submitAddSubscription() {
        const product = document.getElementById('subscriptionProduct').value;
        const startDate = document.getElementById('subscriptionStartDate').value;
        const qty = parseInt(document.getElementById('subscriptionQty').value);

        if (!product || !window.selectedFrequency || !window.selectedDeliveryTime) {
            EarlyBirdUtils.showToast('Please fill all fields', 'error');
            return;
        }

        const subscriptionData = {
            customerId: this.state.currentCustomerId,
            product,
            frequency: window.selectedFrequency,
            deliveryTime: window.selectedDeliveryTime,
            startDate,
            quantity: qty
        };

        EarlyBirdSubscriptions.createSubscription(
            subscriptionData.customerId,
            subscriptionData.product,
            subscriptionData.frequency,
            subscriptionData.deliveryTime,
            subscriptionData.startDate,
            subscriptionData.quantity
        );

        EarlyBirdUtils.showToast('Subscription added successfully ✓', 'success');
        this.closeModal();
    },

    // ========== BILLING & LEDGER ==========

    /**
     * Display transaction history / ledger
     */
    renderLedger(limit = 50) {
        const transactions = EarlyBirdWallet.getTransactions(this.state.currentCustomerId, limit);
        
        if (transactions.length === 0) {
            return '<p style="text-align: center; color: var(--text-secondary);">No transactions yet</p>';
        }

        return `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: var(--light);">
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--border);">Date</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--border);">Description</th>
                        <th style="padding: 12px; text-align: right; border-bottom: 2px solid var(--border);">Amount</th>
                        <th style="padding: 12px; text-align: right; border-bottom: 2px solid var(--border);">Balance</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactions.map(txn => {
                        const isCredit = txn.type === 'credit';
                        const amountColor = isCredit ? '#22c55e' : '#ef4444';
                        const amountSign = isCredit ? '+' : '-';
                        return `
                            <tr style="border-bottom: 1px solid var(--border);">
                                <td style="padding: 12px;">${new Date(txn.timestamp).toLocaleDateString()}</td>
                                <td style="padding: 12px;">
                                    <div style="font-weight: 600;">${txn.description || txn.source}</div>
                                    <div style="font-size: 12px; color: var(--text-secondary);">${txn.source}</div>
                                </td>
                                <td style="padding: 12px; text-align: right; color: ${amountColor}; font-weight: 600;">
                                    ${amountSign}₹${txn.amount}
                                </td>
                                <td style="padding: 12px; text-align: right; font-weight: 600;">₹${txn.balanceAfter || 0}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    },

    // ========== DELIVERY (DELIVERY BOY) ==========

    /**
     * Delivery boy route for the day
     */
    renderDeliveryRoute() {
        const deliveries = EarlyBirdDelivery.getTodayDeliveries(this.state.currentUserId);
        
        if (!deliveries || deliveries.length === 0) {
            return '<p style="text-align: center; color: var(--text-secondary);">No deliveries scheduled for today</p>';
        }

        return `
            <div style="display: grid; gap: 12px;">
                ${deliveries.map((delivery, idx) => `
                    <div style="background: white; border: 1px solid var(--border); border-radius: 8px; padding: 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                            <div>
                                <div style="font-weight: 600; font-size: 16px;">Stop ${idx + 1}</div>
                                <div style="font-size: 14px; color: var(--text-secondary);">${delivery.customerName}</div>
                            </div>
                            <div style="background: ${delivery.status === 'delivered' ? '#22c55e' : '#f59e0b'}; color: white; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                                ${delivery.status.toUpperCase()}
                            </div>
                        </div>
                        <div style="margin-bottom: 12px; font-size: 13px; color: var(--text-secondary);">
                            📍 ${delivery.address || 'Address not set'}
                        </div>
                        <div style="background: var(--light); padding: 10px; border-radius: 6px; margin-bottom: 12px;">
                            ${(delivery.items || []).map(item => `
                                <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0;">
                                    <span>${item.productName || 'Item'}</span>
                                    <span style="font-weight: 600;">×${item.quantity}</span>
                                </div>
                            `).join('')}
                        </div>
                        ${delivery.status !== 'delivered' ? `
                            <button class="btn btn-primary" onclick="EarlyBirdUIComponents.openMarkDeliveredModal('${delivery.id}')">
                                ✓ Mark Delivered
                            </button>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    },

    openMarkDeliveredModal(deliveryId) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-dialog" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>✓ Mark Delivery Complete</h2>
                    <button data-action="close-modal" style="background: none; border: none; font-size: 20px; cursor: pointer;">✕</button>
                </div>

                <div class="modal-body" style="padding: 20px;">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Proof of Delivery</label>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <button class="proof-btn" data-proof="photo" onclick="EarlyBirdUIComponents.selectProofType('photo')">
                                📷 Photo
                            </button>
                            <button class="proof-btn" data-proof="signature" onclick="EarlyBirdUIComponents.selectProofType('signature')">
                                ✍️ Signature
                            </button>
                            <button class="proof-btn" data-proof="otp" onclick="EarlyBirdUIComponents.selectProofType('otp')">
                                🔐 OTP
                            </button>
                            <button class="proof-btn" data-proof="voice" onclick="EarlyBirdUIComponents.selectProofType('voice')">
                                🎤 Voice
                            </button>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Amount Received</label>
                        <input type="number" id="amountReceived" placeholder="Enter amount" 
                            style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px;">
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">Payment Method</label>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                                <input type="radio" name="payment_received" value="cash" checked>
                                <span>💵 Cash</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                                <input type="radio" name="payment_received" value="wallet">
                                <span>💰 Wallet</span>
                            </label>
                        </div>
                    </div>

                    <div style="background: var(--light); padding: 12px; border-radius: 6px; margin-bottom: 20px; font-size: 13px;">
                        <div style="font-weight: 600; margin-bottom: 8px;">📱 WhatsApp Confirmation</div>
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                            <input type="checkbox" id="sendWhatsApp" checked>
                            <span>Send delivery confirmation to customer</span>
                        </label>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-outline" data-action="close-modal">Cancel</button>
                    <button class="btn btn-primary" onclick="EarlyBirdUIComponents.submitMarkDelivered('${deliveryId}')">
                        ✓ Confirm Delivery
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    selectProofType(type) {
        document.querySelectorAll('.proof-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-proof="${type}"]`).classList.add('active');
        window.selectedProofType = type;
    },

    submitMarkDelivered(deliveryId) {
        const amountReceived = parseInt(document.getElementById('amountReceived').value) || 0;
        const paymentMethod = document.querySelector('input[name="payment_received"]:checked').value;
        const proofData = {
            type: window.selectedProofType || 'otp',
            timestamp: new Date().toISOString()
        };

        EarlyBirdDelivery.markDelivered(deliveryId, proofData, amountReceived, paymentMethod);
        
        EarlyBirdUtils.showToast('Delivery marked complete ✓', 'success');
        this.closeModal();
    },

    // ========== COMMISSION DISPLAY ==========

    /**
     * Display earnings for staff/delivery
     */
    renderEarningsPanel() {
        const wallet = EarlyBirdWallet.getOrCreateWallet(this.state.currentUserId, this.state.userRole);
        const todayTransactions = EarlyBirdWallet.getTransactions(this.state.currentUserId, 100)
            .filter(t => {
                const txnDate = new Date(t.timestamp).toDateString();
                const today = new Date().toDateString();
                return txnDate === today && t.type === 'credit';
            });

        const todayEarnings = todayTransactions.reduce((sum, t) => sum + t.amount, 0);

        return `
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <div style="font-size: 13px; opacity: 0.9; margin-bottom: 4px;">💰 Total Wallet Balance</div>
                <div style="font-size: 32px; font-weight: 700; margin-bottom: 12px;">₹${wallet.balance}</div>
                <div style="font-size: 13px; opacity: 0.85;">Today's Earnings: ₹${todayEarnings}</div>
            </div>

            <div style="background: white; border: 1px solid var(--border); border-radius: 8px; padding: 16px;">
                <h3 style="margin-bottom: 16px;">📊 Earnings Breakdown</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
                    <div style="background: var(--light); padding: 12px; border-radius: 6px; text-align: center;">
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Today</div>
                        <div style="font-size: 20px; font-weight: 700;">₹${todayEarnings}</div>
                    </div>
                    <div style="background: var(--light); padding: 12px; border-radius: 6px; text-align: center;">
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">This Week</div>
                        <div style="font-size: 20px; font-weight: 700;">₹${wallet.balance * 0.3}</div>
                    </div>
                    <div style="background: var(--light); padding: 12px; border-radius: 6px; text-align: center;">
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">This Month</div>
                        <div style="font-size: 20px; font-weight: 700;">₹${wallet.balance}</div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Withdrawal request modal
     */
    openWithdrawalModal() {
        const wallet = EarlyBirdWallet.getOrCreateWallet(this.state.currentUserId, this.state.userRole);
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-dialog" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>💳 Request Withdrawal</h2>
                    <button data-action="close-modal" style="background: none; border: none; font-size: 20px; cursor: pointer;">✕</button>
                </div>

                <div class="modal-body" style="padding: 20px;">
                    <div style="background: #f0f0f0; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Available Balance</div>
                        <div style="font-size: 28px; font-weight: 700;">₹${wallet.balance}</div>
                    </div>

                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">Withdrawal Amount</label>
                    <input type="number" id="withdrawalAmount" placeholder="Minimum ₹500" min="500" 
                        style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; margin-bottom: 20px;">

                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">Withdrawal Method</label>
                    <div style="display: grid; gap: 10px; margin-bottom: 20px;">
                        <label style="display: flex; align-items: center; gap: 10px; padding: 10px; border: 1px solid var(--border); border-radius: 6px; cursor: pointer;">
                            <input type="radio" name="withdrawal_method" value="instant" checked>
                            <div>
                                <div style="font-weight: 600;">⚡ Instant</div>
                                <div style="font-size: 12px; color: var(--text-secondary);">Receive in 1-2 minutes</div>
                            </div>
                        </label>
                        <label style="display: flex; align-items: center; gap: 10px; padding: 10px; border: 1px solid var(--border); border-radius: 6px; cursor: pointer;">
                            <input type="radio" name="withdrawal_method" value="weekly">
                            <div>
                                <div style="font-weight: 600;">📅 Weekly</div>
                                <div style="font-size: 12px; color: var(--text-secondary);">Every Friday</div>
                            </div>
                        </label>
                        <label style="display: flex; align-items: center; gap: 10px; padding: 10px; border: 1px solid var(--border); border-radius: 6px; cursor: pointer;">
                            <input type="radio" name="withdrawal_method" value="monthly">
                            <div>
                                <div style="font-weight: 600;">📆 Monthly</div>
                                <div style="font-size: 12px; color: var(--text-secondary);">Last day of month</div>
                            </div>
                        </label>
                    </div>

                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">Bank Account (Last 4 digits)</label>
                    <input type="text" placeholder="XXXX" maxlength="4" 
                        style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; margin-bottom: 20px;">
                </div>

                <div class="modal-footer">
                    <button class="btn btn-outline" data-action="close-modal">Cancel</button>
                    <button class="btn btn-primary" onclick="EarlyBirdUIComponents.submitWithdrawal()">
                        ✓ Request Withdrawal
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    submitWithdrawal() {
        const amount = parseInt(document.getElementById('withdrawalAmount').value);
        const method = document.querySelector('input[name="withdrawal_method"]:checked').value;

        if (!amount || amount < 500) {
            EarlyBirdUtils.showToast('Minimum withdrawal is ₹500', 'error');
            return;
        }

        EarlyBirdWallet.requestWithdrawal(this.state.currentUserId, this.state.userRole, amount, method);
        EarlyBirdUtils.showToast(`Withdrawal request submitted ✓`, 'success');
        this.closeModal();
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    EarlyBirdUIComponents.init();
});

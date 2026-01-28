// ============================================
// EarlyBird Supplier Portal System
// CRITICAL GAP #3: Supplier Role & Portal
// Demand forecasting, order confirmation, payment tracking
// ============================================

const EarlyBirdSupplier = {
    
    state: {
        suppliers: {},  // { supplierId: supplier data }
        supplierOrders: {},  // { supplierId: [orders] }
        demands: {},  // { supplierId: { byDate: { '2026-01-20': { product: qty } } } }
        supplierWallets: {},  // { supplierId: wallet data }
        inventory: {},  // { supplierId: { product: { stock, reorderLevel } } }
        forecastAlerts: {}  // Stock shortage alerts
    },

    // ========== INITIALIZATION ==========

    init() {
        this.loadSuppliers();
        console.log('✅ EarlyBirdSupplier initialized - Supplier portal ready');
    },

    loadSuppliers() {
        this.state.suppliers = EarlyBirdUtils.loadFromStorage('earlybird_suppliers', {});
        this.state.supplierOrders = EarlyBirdUtils.loadFromStorage('earlybird_supplier_orders', {});
        this.state.demands = EarlyBirdUtils.loadFromStorage('earlybird_supplier_demands', {});
        this.state.supplierWallets = EarlyBirdUtils.loadFromStorage('earlybird_supplier_wallets', {});
        this.state.inventory = EarlyBirdUtils.loadFromStorage('earlybird_supplier_inventory', {});
        this.state.forecastAlerts = EarlyBirdUtils.loadFromStorage('earlybird_forecast_alerts', {});
    },

    saveSuppliers() {
        EarlyBirdUtils.saveToStorage('earlybird_suppliers', this.state.suppliers);
        EarlyBirdUtils.saveToStorage('earlybird_supplier_orders', this.state.supplierOrders);
        EarlyBirdUtils.saveToStorage('earlybird_supplier_demands', this.state.demands);
        EarlyBirdUtils.saveToStorage('earlybird_supplier_wallets', this.state.supplierWallets);
        EarlyBirdUtils.saveToStorage('earlybird_supplier_inventory', this.state.inventory);
        EarlyBirdUtils.saveToStorage('earlybird_forecast_alerts', this.state.forecastAlerts);
    },

    // ========== SUPPLIER ONBOARDING ==========

    /**
     * Register new supplier
     */
    registerSupplier(supplierData) {
        const supplierId = 'SUP_' + EarlyBirdUtils.generateId();

        this.state.suppliers[supplierId] = {
            id: supplierId,
            name: supplierData.name,
            type: supplierData.type,  // 'dairy', 'kirana', 'bakery', etc.
            products: supplierData.products || [],  // [{ name, basePrice, unit }]
            phoneNumber: supplierData.phoneNumber,
            email: supplierData.email,
            address: supplierData.address,
            bankAccount: supplierData.bankAccount,
            gstin: supplierData.gstin,
            registeredAt: new Date().toISOString(),
            status: 'active',
            rating: 0,
            totalOrders: 0,
            totalDelivered: 0
        };

        // Create wallet
        this.state.supplierWallets[supplierId] = {
            supplierId: supplierId,
            balance: 0,
            totalPayments: 0,
            totalOutstanding: 0,
            nextPaymentDue: null,
            transactions: []
        };

        // Initialize demands tracking
        this.state.demands[supplierId] = {
            byDate: {},
            byProduct: {}
        };

        // Initialize inventory
        this.state.inventory[supplierId] = {};

        this.saveSuppliers();
        console.log(`✅ Supplier registered: ${supplierData.name} (${supplierId})`);
        return { supplierId, success: true };
    },

    getSupplier(supplierId) {
        return this.state.suppliers[supplierId] || null;
    },

    // ========== DEMAND FORECASTING ==========

    /**
     * Calculate demand for specific date
     * Aggregates all customer orders for that date by product
     */
    calculateDemandForDate(date) {
        const dateStr = EarlyBirdUtils.getDateString(date);
        const demand = {};  // { supplier: { product: qty } }

        // Get all orders scheduled for this date
        if (typeof EarlyBirdOrders !== 'undefined') {
            const ordersOnDate = EarlyBirdOrders.getOrdersByDate(date);
            
            ordersOnDate.forEach(order => {
                order.items.forEach(item => {
                    // Find which supplier provides this product
                    for (const supplierId in this.state.suppliers) {
                        const supplier = this.state.suppliers[supplierId];
                        const product = supplier.products.find(p => p.name === item.name);
                        
                        if (product) {
                            if (!demand[supplierId]) demand[supplierId] = {};
                            demand[supplierId][item.name] = (demand[supplierId][item.name] || 0) + item.quantity;
                        }
                    }
                });
            });
        }

        return demand;
    },

    /**
     * Generate demand forecast for next N days
     */
    generateDemandForecast(days = 7) {
        const forecast = {};  // { supplierId: { day: { product: qty } } }

        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dateStr = EarlyBirdUtils.getDateString(date);

            const dayDemand = this.calculateDemandForDate(date);

            for (const supplierId in dayDemand) {
                if (!forecast[supplierId]) {
                    forecast[supplierId] = {};
                }
                forecast[supplierId][dateStr] = dayDemand[supplierId];
            }
        }

        // Save for supplier access
        for (const supplierId in forecast) {
            this.state.demands[supplierId].byDate = {
                ...this.state.demands[supplierId].byDate,
                ...forecast[supplierId]
            };
        }

        this.saveSuppliers();
        return forecast;
    },

    /**
     * Get demand forecast for supplier
     */
    getSupplierDemandForecast(supplierId, days = 7) {
        const forecast = {
            supplierId: supplierId,
            forecastDays: [],
            totalProducts: 0,
            criticalItems: []
        };

        const today = new Date();
        for (let i = 0; i < days; i++) {
            const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
            const dateStr = EarlyBirdUtils.getDateString(date);

            const demand = this.state.demands[supplierId]?.byDate[dateStr] || {};

            forecast.forecastDays.push({
                date: dateStr,
                dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
                products: demand,
                totalItems: Object.values(demand).reduce((a, b) => a + b, 0)
            });

            forecast.totalProducts += Object.values(demand).reduce((a, b) => a + b, 0);
        }

        // Check for critical stock levels
        const inventory = this.state.inventory[supplierId] || {};
        forecast.forecastDays.forEach(day => {
            Object.keys(day.products).forEach(product => {
                const needed = day.products[product];
                const stock = inventory[product]?.stock || 0;
                const reorderLevel = inventory[product]?.reorderLevel || needed * 1.5;

                if (stock < reorderLevel) {
                    forecast.criticalItems.push({
                        product: product,
                        needed: needed,
                        onHand: stock,
                        shortageBy: Math.max(0, needed - stock),
                        reorderLevel: reorderLevel,
                        dueDate: day.date,
                        severity: stock < needed ? 'CRITICAL' : 'WARNING'
                    });
                }
            });
        });

        return forecast;
    },

    // ========== STOCK SHORTAGE ALERTS ==========

    /**
     * Check inventory and generate alerts
     */
    checkInventoryLevels() {
        const alerts = [];

        for (const supplierId in this.state.inventory) {
            const inventory = this.state.inventory[supplierId];
            const demands = this.state.demands[supplierId]?.byDate || {};

            for (const product in inventory) {
                const item = inventory[product];
                
                // Get demand for next 3 days
                let demandNext3Days = 0;
                for (let i = 0; i < 3; i++) {
                    const date = new Date();
                    date.setDate(date.getDate() + i);
                    const dateStr = EarlyBirdUtils.getDateString(date);
                    demandNext3Days += demands[dateStr]?.[product] || 0;
                }

                if (item.stock < demandNext3Days) {
                    alerts.push({
                        supplierId: supplierId,
                        product: product,
                        currentStock: item.stock,
                        demandNext3Days: demandNext3Days,
                        shortage: demandNext3Days - item.stock,
                        reorderLevel: item.reorderLevel,
                        severity: item.stock === 0 ? 'RED' : 'YELLOW',
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }

        this.state.forecastAlerts = alerts;
        this.saveSuppliers();

        return alerts;
    },

    getInventoryAlerts(supplierId) {
        return this.state.forecastAlerts.filter(a => a.supplierId === supplierId);
    },

    // ========== SUPPLIER ORDERS ==========

    /**
     * Generate purchase order from forecast
     */
    generateSupplierOrder(supplierId, forecast) {
        const orderId = 'PO_' + EarlyBirdUtils.generateId();
        const supplier = this.state.suppliers[supplierId];

        const order = {
            id: orderId,
            supplierId: supplierId,
            supplierName: supplier.name,
            items: [],  // Will be filled from forecast
            generatedAt: new Date().toISOString(),
            status: 'awaiting_confirmation',  // awaiting_confirmation -> confirmed -> shipped -> delivered
            dueDate: null,
            confirmedAt: null,
            deliveredAt: null,
            totalAmount: 0,
            notes: 'Auto-generated from demand forecast'
        };

        // Convert forecast to order items
        forecast.forEach(day => {
            Object.keys(day.products).forEach(product => {
                const qty = day.products[product];
                const existing = order.items.find(i => i.product === product);

                if (existing) {
                    existing.quantity += qty;
                    existing.dates.push(day.date);
                } else {
                    const supplierProduct = supplier.products.find(p => p.name === product);
                    if (supplierProduct) {
                        order.items.push({
                            product: product,
                            quantity: qty,
                            unit: supplierProduct.unit,
                            unitPrice: supplierProduct.basePrice,
                            amount: qty * supplierProduct.basePrice,
                            dates: [day.date]
                        });
                    }
                }
            });
        });

        // Calculate total
        order.totalAmount = order.items.reduce((sum, item) => sum + item.amount, 0);

        if (!this.state.supplierOrders[supplierId]) {
            this.state.supplierOrders[supplierId] = [];
        }

        this.state.supplierOrders[supplierId].push(order);
        this.saveSuppliers();

        console.log(`📋 Purchase order generated: ${orderId} for ${supplier.name}`);
        return order;
    },

    /**
     * Supplier confirms purchase order
     */
    confirmSupplierOrder(orderId, notes = '') {
        for (const supplierId in this.state.supplierOrders) {
            const order = this.state.supplierOrders[supplierId].find(o => o.id === orderId);
            if (order) {
                order.status = 'confirmed';
                order.confirmedAt = new Date().toISOString();
                order.supplierNotes = notes;

                // Update supplier stats
                const supplier = this.state.suppliers[supplierId];
                supplier.totalOrders++;

                this.saveSuppliers();
                console.log(`✅ Order ${orderId} confirmed by ${supplier.name}`);
                return order;
            }
        }

        return null;
    },

    /**
     * Supplier marks order as shipped
     */
    shipSupplierOrder(orderId) {
        for (const supplierId in this.state.supplierOrders) {
            const order = this.state.supplierOrders[supplierId].find(o => o.id === orderId);
            if (order) {
                order.status = 'shipped';
                order.shippedAt = new Date().toISOString();

                this.saveSuppliers();
                console.log(`🚚 Order ${orderId} shipped`);
                return order;
            }
        }

        return null;
    },

    /**
     * Confirm order delivery
     */
    confirmOrderDelivery(orderId) {
        for (const supplierId in this.state.supplierOrders) {
            const order = this.state.supplierOrders[supplierId].find(o => o.id === orderId);
            if (order) {
                order.status = 'delivered';
                order.deliveredAt = new Date().toISOString();

                // Update supplier stats
                const supplier = this.state.suppliers[supplierId];
                supplier.totalDelivered++;

                // Add payment transaction
                const wallet = this.state.supplierWallets[supplierId];
                wallet.totalOutstanding += order.totalAmount;
                wallet.nextPaymentDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();  // 7 days

                wallet.transactions.push({
                    type: 'order_delivered',
                    amount: order.totalAmount,
                    orderId: orderId,
                    dueDate: wallet.nextPaymentDue,
                    timestamp: new Date().toISOString(),
                    status: 'pending'
                });

                this.saveSuppliers();
                console.log(`✅ Order ${orderId} delivered. Payment outstanding: ₹${order.totalAmount}`);
                return order;
            }
        }

        return null;
    },

    // ========== SUPPLIER WALLET & PAYMENTS ==========

    /**
     * Get supplier wallet/payment status
     */
    getSupplierWallet(supplierId) {
        return this.state.supplierWallets[supplierId] || null;
    },

    /**
     * Record payment to supplier
     */
    paySupplier(supplierId, amount, paymentMethod = 'bank_transfer') {
        const wallet = this.state.supplierWallets[supplierId];
        if (!wallet) return null;

        if (amount > wallet.totalOutstanding) {
            return { success: false, message: 'Payment exceeds outstanding amount' };
        }

        const paymentId = 'SUPP_PAY_' + EarlyBirdUtils.generateId();

        wallet.balance += amount;
        wallet.totalPayments += amount;
        wallet.totalOutstanding = Math.max(0, wallet.totalOutstanding - amount);

        wallet.transactions.push({
            type: 'payment_received',
            amount: amount,
            paymentId: paymentId,
            method: paymentMethod,
            timestamp: new Date().toISOString(),
            status: 'completed'
        });

        this.saveSuppliers();
        console.log(`💰 Paid supplier ${supplierId}: ₹${amount}`);

        return {
            success: true,
            paymentId: paymentId,
            message: `Payment of ₹${amount} processed`
        };
    },

    // ========== SUPPLIER INVENTORY ==========

    /**
     * Update supplier inventory
     */
    updateInventory(supplierId, product, stock, reorderLevel) {
        if (!this.state.inventory[supplierId]) {
            this.state.inventory[supplierId] = {};
        }

        this.state.inventory[supplierId][product] = {
            stock: stock,
            reorderLevel: reorderLevel,
            lastUpdated: new Date().toISOString()
        };

        this.saveSuppliers();
    },

    getInventory(supplierId) {
        return this.state.inventory[supplierId] || {};
    },

    // ========== SUPPLIER ANALYTICS ==========

    /**
     * Get supplier performance dashboard
     */
    getSupplierDashboard(supplierId) {
        const supplier = this.state.suppliers[supplierId];
        const wallet = this.state.supplierWallets[supplierId];
        const orders = this.state.supplierOrders[supplierId] || [];
        const forecast = this.getSupplierDemandForecast(supplierId, 7);

        return {
            supplierId: supplierId,
            supplierName: supplier.name,
            status: supplier.status,
            rating: supplier.rating,
            performance: {
                totalOrders: supplier.totalOrders,
                totalDelivered: supplier.totalDelivered,
                onTimePercentage: supplier.totalOrders > 0 ? 
                    ((supplier.totalDelivered / supplier.totalOrders) * 100).toFixed(2) : 0
            },
            payment: {
                balance: wallet.balance,
                outstandingAmount: wallet.totalOutstanding,
                nextPaymentDue: wallet.nextPaymentDue,
                totalPaymentsReceived: wallet.totalPayments
            },
            forecast: forecast,
            alerts: this.getInventoryAlerts(supplierId),
            recentOrders: orders.slice(-5)
        };
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EarlyBirdSupplier;
}

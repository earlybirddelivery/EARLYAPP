/**
 * EarlyBird Supplier Integration System
 * Complete supplier management with auto-order generation, demand forecasting, stock alerts, payment tracking
 */

// Extend the backend EarlyBirdSupplier if it exists, otherwise define it
if (typeof EarlyBirdSupplier === 'undefined') {
    const EarlyBirdSupplier = {};
}

// Add frontend features to EarlyBirdSupplier
Object.assign(EarlyBirdSupplier, {
    state: {
        suppliers: [],
        supplierOrders: [],
        demandForecasts: {},
        stockAlerts: [],
        supplierPayments: {},
        supplierWallets: {},
        autoOrderRules: []
    },

    /**
     * Initialize supplier system
     */
    init() {
        this.loadFromStorage();
        this.generateMockSuppliers();
    },

    /**
     * Generate mock suppliers for testing
     */
    generateMockSuppliers() {
        if (this.state.suppliers.length > 0) return;

        this.state.suppliers = [
            {
                id: 'sup_001',
                name: 'Fresh Milk Dairy',
                contactPerson: 'Ramesh Kumar',
                mobile: '+919876543210',
                email: 'fresh@milkdairy.com',
                productIds: ['milk_500ml', 'milk_1L', 'curd_500g'],
                paymentTerms: 7,
                minOrderQty: 50,
                leadTime: 1,
                status: 'active'
            },
            {
                id: 'sup_002',
                name: 'Grain wholesalers',
                contactPerson: 'Priya Sharma',
                mobile: '+918765432109',
                email: 'grains@wholesale.com',
                productIds: ['rice_25kg', 'atta_10kg', 'dal_2kg'],
                paymentTerms: 15,
                minOrderQty: 100,
                leadTime: 2,
                status: 'active'
            },
            {
                id: 'sup_003',
                name: 'Local Dairy Co',
                contactPerson: 'Suresh Patel',
                mobile: '+917654321098',
                email: 'contact@localdairy.in',
                productIds: ['milk_500ml', 'milk_1L'],
                paymentTerms: 7,
                minOrderQty: 40,
                leadTime: 1,
                status: 'active'
            }
        ];
    },

    // ============================================================================
    // SUPPLIER CALENDAR INTEGRATION
    // ============================================================================

    /**
     * Generate supplier orders from calendar demand
     * Called when admin clicks "Generate Supplier Orders" for a specific date
     */
    generateSupplierOrdersForDate(date) {
        // Get all customer orders for this date from calendar
        const dayOrders = this.getOrdersForDate(date);

        if (dayOrders.length === 0) {
            EarlyBirdUtils.showToast('ℹ️ No orders for this date', 'info');
            return;
        }

        // Aggregate demand by product
        const demandByProduct = {};
        const demandBySupplier = {};

        dayOrders.forEach(order => {
            order.items.forEach(item => {
                if (!demandByProduct[item.id]) {
                    demandByProduct[item.id] = { name: item.name, qty: 0, unit: item.unit };
                }
                demandByProduct[item.id].qty += parseFloat(item.quantity);

                // Map product to supplier
                const supplier = this.getSupplierForProduct(item.id);
                if (supplier) {
                    if (!demandBySupplier[supplier.id]) {
                        demandBySupplier[supplier.id] = {
                            supplier: supplier,
                            items: []
                        };
                    }
                    demandBySupplier[supplier.id].items.push({
                        productId: item.id,
                        name: item.name,
                        qty: demandByProduct[item.id].qty,
                        unit: item.unit
                    });
                }
            });
        });

        // Create supplier purchase orders
        for (const [supplierId, demand] of Object.entries(demandBySupplier)) {
            this.createSupplierPurchaseOrder(demand.supplier, demand.items, date);
        }

        // Log to calendar
        EarlyBirdCalendar.addEvent({
            title: `Supplier Orders Generated - ${Object.keys(demandBySupplier).length} suppliers`,
            type: 'SUPPLIER_ORDERS_GENERATED',
            status: 'completed',
            details: {
                date: date,
                supplierCount: Object.keys(demandBySupplier).length,
                totalProducts: Object.keys(demandByProduct).length,
                demand: demandByProduct
            }
        });

        EarlyBirdUtils.showToast(`✅ Generated orders for ${Object.keys(demandBySupplier).length} suppliers`, 'success');
    },

    /**
     * Create purchase order for supplier
     */
    createSupplierPurchaseOrder(supplier, items, date) {
        const poId = 'PO-' + new Date().getFullYear() + '-' + EarlyBirdUtils.generateId().substring(0, 8);

        const purchaseOrder = {
            id: poId,
            supplierId: supplier.id,
            supplierName: supplier.name,
            orderDate: new Date(),
            deliveryDate: date,
            items: items,
            totalAmount: this.calculatePOTotal(supplier, items),
            status: 'draft', // draft, sent, confirmed, partial, rejected, delivered, paid
            paymentTerms: supplier.paymentTerms,
            paymentDueDate: this.addDays(date, supplier.paymentTerms),
            notes: `Auto-generated PO for delivery on ${date.toDateString()}`
        };

        this.state.supplierOrders.push(purchaseOrder);

        // Send to supplier
        this.sendSupplierOrderNotification(supplier, purchaseOrder);

        // Log to calendar
        EarlyBirdCalendar.addEvent({
            title: `PO ${poId}: ${supplier.name}`,
            type: 'SUPPLIER_ORDER_PLACED',
            status: 'draft',
            details: purchaseOrder,
            date: date
        });
    },

    /**
     * Calculate PO total
     */
    calculatePOTotal(supplier, items) {
        // Mock prices - would come from supplier catalog
        const prices = {
            'milk_500ml': 25,
            'milk_1L': 48,
            'rice_25kg': 1650,
            'atta_10kg': 450,
            'dal_2kg': 320
        };

        return items.reduce((total, item) => {
            const price = prices[item.productId] || 100;
            return total + (item.qty * price);
        }, 0);
    },

    /**
     * Send order notification to supplier
     */
    sendSupplierOrderNotification(supplier, po) {
        // Mock WhatsApp/Email notification
        const message = `
Purchase Order #${po.id}

To: ${supplier.name}

Delivery Date: ${po.deliveryDate.toDateString()}
Delivery Time: 5:00 AM (before customer deliveries)

Items:
${po.items.map(item => `• ${item.name}: ${item.qty} ${item.unit}`).join('\n')}

Total: ₹${po.totalAmount}
Payment Terms: ${supplier.paymentTerms} days (Due: ${po.paymentDueDate.toDateString()})

Please confirm availability in app or reply with this PO ID.
        `;

        console.log('Supplier Order Notification:', message);

        // In production: Send via WhatsApp API
        // sendWhatsAppMessage(supplier.mobile, message);
    },

    /**
     * Handle supplier confirmation
     */
    confirmSupplierOrder(poId, confirmation) {
        const po = this.state.supplierOrders.find(p => p.id === poId);
        if (!po) return;

        if (confirmation.status === 'confirmed') {
            po.status = 'confirmed';
            
            // Update stock forecast
            this.updateStockForecast(po.supplierId, po.items, po.deliveryDate);

            EarlyBirdUtils.showToast('✅ Order confirmed by supplier', 'success');
        } else if (confirmation.status === 'partial') {
            po.status = 'partial';
            po.partialItems = confirmation.items;
            
            EarlyBirdUtils.showToast('⚠️ Supplier can only partially fulfill', 'warning');
            this.handleSupplierShortage(po, confirmation);
        } else if (confirmation.status === 'rejected') {
            po.status = 'rejected';
            EarlyBirdUtils.showToast('❌ Supplier rejected order', 'error');
        }

        // Log to calendar
        EarlyBirdCalendar.addEvent({
            title: `PO ${poId} - ${confirmation.status.toUpperCase()}`,
            type: 'SUPPLIER_ORDER_CONFIRMED',
            status: confirmation.status,
            details: { po: po, confirmation: confirmation },
            date: po.deliveryDate
        });

        this.saveToStorage();
    },

    /**
     * Handle supplier shortage
     */
    handleSupplierShortage(po, confirmation) {
        const shortage = {};
        
        po.items.forEach(item => {
            const confirmed = confirmation.items.find(i => i.productId === item.productId);
            if (!confirmed || confirmed.qty < item.qty) {
                shortage[item.productId] = {
                    needed: item.qty,
                    available: confirmed?.qty || 0,
                    short: item.qty - (confirmed?.qty || 0)
                };
            }
        });

        const alert = {
            type: 'SUPPLIER_SHORTAGE',
            poId: po.id,
            supplierId: po.supplierId,
            shortage: shortage,
            message: `⚠️ ${po.supplierName} can only partially fulfill. ${Object.keys(shortage).length} items short.`,
            action: 'Find alternate supplier or reduce customer allocations'
        };

        EarlyBirdCalendar.addEvent({
            title: `⚠️ Shortage Alert - ${po.supplierName}`,
            type: 'SUPPLIER_SHORTAGE',
            status: 'alert',
            details: alert,
            date: po.deliveryDate
        });
    },

    /**
     * Mark delivery received
     */
    markDeliveryReceived(poId) {
        const po = this.state.supplierOrders.find(p => p.id === poId);
        if (!po) return;

        po.status = 'delivered';
        po.deliveryReceivedDate = new Date();

        // Create payable amount in supplier wallet
        if (!this.state.supplierPayments[po.supplierId]) {
            this.state.supplierPayments[po.supplierId] = {
                outstanding: 0,
                paid: 0,
                history: []
            };
        }

        this.state.supplierPayments[po.supplierId].outstanding += po.totalAmount;
        this.state.supplierPayments[po.supplierId].history.push({
            type: 'delivery_received',
            poId: poId,
            amount: po.totalAmount,
            date: new Date(),
            dueDate: po.paymentDueDate
        });

        EarlyBirdCalendar.addEvent({
            title: `Delivery Received - ${po.supplierName}`,
            type: 'SUPPLIER_DELIVERY_RECEIVED',
            status: 'completed',
            details: { po: po },
            date: po.deliveryDate
        });

        this.checkPaymentDueDates();
        this.saveToStorage();
    },

    /**
     * Check and alert payment due dates
     */
    checkPaymentDueDates() {
        this.state.supplierOrders.forEach(po => {
            if (po.status === 'delivered' && !po.paymentProcessed) {
                const daysUntilDue = Math.floor((po.paymentDueDate - new Date()) / (1000 * 60 * 60 * 24));

                if (daysUntilDue === 0) {
                    EarlyBirdCalendar.addEvent({
                        title: `💰 Payment Due - ${po.supplierName}`,
                        type: 'SUPPLIER_PAYMENT_DUE',
                        status: 'payment_due',
                        details: { po: po, amount: po.totalAmount },
                        date: po.paymentDueDate
                    });
                }
            }
        });
    },

    /**
     * Process supplier payment
     */
    processSupplierPayment(supplierId, amount) {
        if (!this.state.supplierPayments[supplierId]) {
            this.state.supplierPayments[supplierId] = { outstanding: 0, paid: 0, history: [] };
        }

        const payment = this.state.supplierPayments[supplierId];
        payment.outstanding -= amount;
        payment.paid += amount;

        payment.history.push({
            type: 'payment_processed',
            amount: amount,
            date: new Date(),
            reference: 'TXN-' + EarlyBirdUtils.generateId()
        });

        const supplier = this.state.suppliers.find(s => s.id === supplierId);

        EarlyBirdCalendar.addEvent({
            title: `✅ Payment Processed - ${supplier.name}`,
            type: 'SUPPLIER_PAYMENT_PROCESSED',
            status: 'completed',
            details: { supplierId: supplierId, amount: amount },
            date: new Date()
        });

        this.saveToStorage();
    },

    // ============================================================================
    // STOCK ALERTS & INVENTORY MANAGEMENT
    // ============================================================================

    /**
     * Generate stock alerts for upcoming dates
     */
    generateStockAlerts() {
        const upcomingDays = 14;
        const today = new Date();

        for (let i = 1; i <= upcomingDays; i++) {
            const forecastDate = this.addDays(today, i);
            const dayOrders = this.getOrdersForDate(forecastDate);

            if (dayOrders.length === 0) continue;

            // Aggregate product demand
            const demandByProduct = {};
            dayOrders.forEach(order => {
                order.items.forEach(item => {
                    if (!demandByProduct[item.id]) {
                        demandByProduct[item.id] = { name: item.name, needed: 0, current: 0 };
                    }
                    demandByProduct[item.id].needed += parseFloat(item.quantity);
                });
            });

            // Check against current stock
            for (const [productId, demand] of Object.entries(demandByProduct)) {
                const currentStock = this.getCurrentStock(productId);

                if (currentStock < demand.needed) {
                    const alert = {
                        date: forecastDate,
                        productId: productId,
                        productName: demand.name,
                        needed: demand.needed,
                        current: currentStock,
                        short: demand.needed - currentStock,
                        severity: currentStock === 0 ? 'critical' : (currentStock < demand.needed * 0.5 ? 'high' : 'medium')
                    };

                    this.state.stockAlerts.push(alert);

                    // Log to calendar
                    const icon = alert.severity === 'critical' ? '🚨' : alert.severity === 'high' ? '⚠️' : '📢';
                    EarlyBirdCalendar.addEvent({
                        title: `${icon} Stock: ${alert.productName} (Need ${alert.needed}, Have ${alert.current})`,
                        type: 'STOCK_ALERT',
                        status: alert.severity,
                        details: alert,
                        date: forecastDate
                    });
                }
            }
        }
    },

    /**
     * Get current stock (mock)
     */
    getCurrentStock(productId) {
        // Mock stock levels - would come from actual inventory system
        const mockStock = {
            'milk_500ml': 50,
            'milk_1L': 80,
            'rice_25kg': 40,
            'atta_10kg': 60,
            'dal_2kg': 30
        };
        return mockStock[productId] || 0;
    },

    /**
     * Update stock forecast
     */
    updateStockForecast(supplierId, items, deliveryDate) {
        const supplier = this.state.suppliers.find(s => s.id === supplierId);
        
        items.forEach(item => {
            if (!this.state.demandForecasts[item.productId]) {
                this.state.demandForecasts[item.productId] = [];
            }

            this.state.demandForecasts[item.productId].push({
                supplier: supplier.name,
                qty: item.qty,
                deliveryDate: deliveryDate,
                status: 'confirmed'
            });
        });
    },

    // ============================================================================
    // SUPPLIER PERFORMANCE & ANALYTICS
    // ============================================================================

    /**
     * Get supplier performance metrics
     */
    getSupplierPerformance(supplierId) {
        const supplier = this.state.suppliers.find(s => s.id === supplierId);
        const orders = this.state.supplierOrders.filter(po => po.supplierId === supplierId);

        if (orders.length === 0) {
            return { supplier: supplier, metrics: null };
        }

        const delivered = orders.filter(o => o.status === 'delivered').length;
        const confirmed = orders.filter(o => o.status === 'confirmed').length;
        const partial = orders.filter(o => o.status === 'partial').length;
        const rejected = orders.filter(o => o.status === 'rejected').length;

        return {
            supplier: supplier,
            metrics: {
                totalOrders: orders.length,
                delivered: delivered,
                confirmed: confirmed,
                partial: partial,
                rejected: rejected,
                fulfillmentRate: (delivered / orders.length * 100).toFixed(1) + '%',
                partialRate: (partial / orders.length * 100).toFixed(1) + '%',
                rejectRate: (rejected / orders.length * 100).toFixed(1) + '%'
            }
        };
    },

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    /**
     * Get supplier for product
     */
    getSupplierForProduct(productId) {
        return this.state.suppliers.find(s => s.productIds.includes(productId));
    },

    /**
     * Get orders for specific date
     */
    getOrdersForDate(date) {
        const orders = EarlyBirdOrders?.state?.orders || [];
        const dateStr = date.toISOString().split('T')[0];
        
        return orders.filter(order => {
            const orderDate = new Date(order.date).toISOString().split('T')[0];
            return orderDate === dateStr;
        });
    },

    /**
     * Add days to date
     */
    addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    },

    /**
     * Save to storage
     */
    saveToStorage() {
        try {
            localStorage.setItem('earlybird_suppliers', JSON.stringify(this.state));
        } catch (e) {
            console.error('Error saving supplier data:', e);
        }
    },

    /**
     * Load from storage
     */
    loadFromStorage() {
        try {
            const saved = JSON.parse(localStorage.getItem('earlybird_suppliers') || '{}');
            this.state = { ...this.state, ...saved };
        } catch (e) {
            console.error('Error loading supplier data:', e);
        }
    }
});

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => EarlyBirdSupplier.init());
} else {
    EarlyBirdSupplier.init();
}

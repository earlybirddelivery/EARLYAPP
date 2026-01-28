/**
 * EarlyBird Real-Time Inventory Monitoring System
 * Tracks stock levels, generates alerts, monitors supply chain
 */

class EarlyBirdInventoryMonitoring {
    constructor() {
        this.inventory = {};
        this.alerts = [];
        this.thresholds = {
            critical: 3,  // days of supply
            warning: 7,   // days of supply
            safe: 30      // days of supply
        };
        this.loadInventory();
    }

    /**
     * Update inventory level for a product
     */
    updateInventory(product, quantity, action = 'set') {
        if (!this.inventory[product]) {
            this.inventory[product] = {
                quantity: 0,
                unit: 'pieces',
                lastUpdated: new Date().toISOString(),
                history: []
            };
        }

        const oldQuantity = this.inventory[product].quantity;

        if (action === 'set') {
            this.inventory[product].quantity = quantity;
        } else if (action === 'add') {
            this.inventory[product].quantity += quantity;
        } else if (action === 'subtract') {
            this.inventory[product].quantity = Math.max(0, this.inventory[product].quantity - quantity);
        }

        this.inventory[product].lastUpdated = new Date().toISOString();
        
        // Track history
        this.inventory[product].history.push({
            timestamp: new Date().toISOString(),
            action: action,
            oldQuantity: oldQuantity,
            newQuantity: this.inventory[product].quantity,
            change: this.inventory[product].quantity - oldQuantity
        });

        this.checkInventoryAlerts(product);
        this.saveInventory();

        return this.inventory[product];
    }

    /**
     * Check and generate alerts for inventory level
     */
    checkInventoryAlerts(product) {
        const stockRisk = earlyBirdDemandForecasting.calculateStockRisk(product);
        const daysOfSupply = parseFloat(stockRisk.days);

        // Remove existing alerts for this product
        this.alerts = this.alerts.filter(a => a.product !== product || a.status === 'resolved');

        // Generate new alert if needed
        if (daysOfSupply < this.thresholds.critical) {
            this.createAlert(product, 'critical', `CRITICAL: Only ${daysOfSupply.toFixed(1)} days of supply remaining`);
        } else if (daysOfSupply < this.thresholds.warning) {
            this.createAlert(product, 'warning', `WARNING: Only ${daysOfSupply.toFixed(1)} days of supply remaining`);
        }
    }

    /**
     * Create stock alert
     */
    createAlert(product, severity, message) {
        const alert = {
            id: `INV_ALERT_${Date.now()}`,
            product: product,
            severity: severity,
            message: message,
            createdAt: new Date().toISOString(),
            status: 'active',
            acknowledgements: []
        };

        this.alerts.push(alert);

        // Send notification
        this.notifyStockAlert(alert);

        // Sync with backend
        fetch('/api/inventory/alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alert)
        }).catch(() => console.log('Backend sync pending'));

        return alert;
    }

    /**
     * Notify about stock alert (send to suppliers, admins)
     */
    notifyStockAlert(alert) {
        // In production, this would send emails/SMS to suppliers and admins
        console.log(`📢 Stock Alert: ${alert.message}`);

        // Create notification record
        const notification = {
            id: `NOTIF_${Date.now()}`,
            type: 'stock_alert',
            alert: alert,
            recipients: ['admin@earlybird.com', 'supplier@supplier.com'],
            channels: ['email', 'sms', 'push'],
            sentAt: new Date().toISOString(),
            status: 'sent'
        };

        const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
        notifications.push(notification);
        localStorage.setItem('notifications', JSON.stringify(notifications));

        // Try to sync with backend
        fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(notification)
        }).catch(() => console.log('Backend notification pending'));
    }

    /**
     * Auto-generate purchase order when stock is low
     */
    autoGeneratePurchaseOrder(product) {
        const forecast = earlyBirdDemandForecasting.generateForecast(product, 7);
        const recommendedQuantity = forecast.reduce((sum, f) => sum + f.quantity, 0) * 1.5; // 1.5x buffer

        const po = {
            id: `AUTO_PO_${Date.now()}`,
            product: product,
            quantity: Math.round(recommendedQuantity),
            reason: 'auto_low_stock',
            createdAt: new Date().toISOString(),
            status: 'draft'
        };

        // Store purchase order draft
        const drafts = JSON.parse(localStorage.getItem('purchaseOrderDrafts') || '[]');
        drafts.push(po);
        localStorage.setItem('purchaseOrderDrafts', JSON.stringify(drafts));

        // Notify admins
        this.notifyPurchaseOrderDraft(po);

        return po;
    }

    /**
     * Notify about auto-generated purchase order
     */
    notifyPurchaseOrderDraft(po) {
        const notification = {
            id: `NOTIF_${Date.now()}`,
            type: 'purchase_order_draft',
            order: po,
            message: `Auto-generated purchase order draft for ${po.product}: ${po.quantity} units`,
            createdAt: new Date().toISOString(),
            status: 'pending_review'
        };

        fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(notification)
        }).catch(() => console.log('Backend sync pending'));
    }

    /**
     * Get current inventory status
     */
    getInventoryStatus() {
        const status = {};

        Object.keys(this.inventory).forEach(product => {
            const inv = this.inventory[product];
            const risk = earlyBirdDemandForecasting.calculateStockRisk(product);

            status[product] = {
                quantity: inv.quantity,
                unit: inv.unit,
                daysOfSupply: risk.days,
                riskLevel: risk.level,
                lastUpdated: inv.lastUpdated,
                alert: this.alerts.find(a => a.product === product && a.status === 'active')
            };
        });

        return status;
    }

    /**
     * Get active alerts
     */
    getActiveAlerts() {
        return this.alerts.filter(a => a.status === 'active').sort((a, b) => {
            const severityOrder = { critical: 0, warning: 1, info: 2 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        });
    }

    /**
     * Get alerts by product
     */
    getProductAlerts(product) {
        return this.alerts.filter(a => a.product === product);
    }

    /**
     * Acknowledge alert
     */
    acknowledgeAlert(alertId, acknowledgedBy) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (!alert) return null;

        alert.acknowledgements.push({
            by: acknowledgedBy,
            at: new Date().toISOString()
        });

        // Sync with backend
        fetch(`/api/inventory/alert/${alertId}/acknowledge`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ acknowledgedBy })
        }).catch(() => console.log('Backend sync pending'));

        return alert;
    }

    /**
     * Resolve alert
     */
    resolveAlert(alertId, resolvedBy, notes = '') {
        const alert = this.alerts.find(a => a.id === alertId);
        if (!alert) return null;

        alert.status = 'resolved';
        alert.resolvedAt = new Date().toISOString();
        alert.resolvedBy = resolvedBy;
        alert.resolutionNotes = notes;

        this.saveInventory();

        // Sync with backend
        fetch(`/api/inventory/alert/${alertId}/resolve`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resolvedBy, notes })
        }).catch(() => console.log('Backend sync pending'));

        return alert;
    }

    /**
     * Get inventory analytics
     */
    getInventoryAnalytics() {
        const status = this.getInventoryStatus();
        const activeAlerts = this.getActiveAlerts();

        const criticalProducts = Object.entries(status)
            .filter(([_, inv]) => inv.riskLevel === 'critical')
            .map(([product, _]) => product);

        const warningProducts = Object.entries(status)
            .filter(([_, inv]) => inv.riskLevel === 'warning')
            .map(([product, _]) => product);

        return {
            totalProducts: Object.keys(this.inventory).length,
            averageDaysOfSupply: (Object.values(status).reduce((sum, inv) => sum + parseFloat(inv.daysOfSupply), 0) / Object.keys(this.inventory).length).toFixed(1),
            criticalProducts: criticalProducts,
            warningProducts: warningProducts,
            activeAlerts: activeAlerts.length,
            recentTransactions: this.getRecentTransactions(10)
        };
    }

    /**
     * Get recent inventory transactions
     */
    getRecentTransactions(limit = 10) {
        const transactions = [];

        Object.keys(this.inventory).forEach(product => {
            const history = this.inventory[product].history;
            history.forEach(h => {
                transactions.push({
                    product: product,
                    ...h
                });
            });
        });

        return transactions.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        ).slice(0, limit);
    }

    /**
     * Set alert thresholds
     */
    setThresholds(critical, warning, safe) {
        this.thresholds = {
            critical: critical,
            warning: warning,
            safe: safe
        };

        localStorage.setItem('inventoryThresholds', JSON.stringify(this.thresholds));
    }

    /**
     * Load inventory from localStorage
     */
    loadInventory() {
        const stored = localStorage.getItem('inventory');
        if (stored) {
            this.inventory = JSON.parse(stored);
        } else {
            this.generateSampleInventory();
        }

        const storedAlerts = localStorage.getItem('inventoryAlerts');
        this.alerts = storedAlerts ? JSON.parse(storedAlerts) : [];

        const storedThresholds = localStorage.getItem('inventoryThresholds');
        if (storedThresholds) {
            this.thresholds = JSON.parse(storedThresholds);
        }
    }

    /**
     * Generate sample inventory for demo
     */
    generateSampleInventory() {
        const products = ['milk', 'bread', 'eggs', 'paneer', 'ghee', 'curd', 'butter', 'rice'];
        
        products.forEach(product => {
            this.inventory[product] = {
                quantity: Math.floor(Math.random() * 500) + 50,
                unit: 'pieces',
                lastUpdated: new Date().toISOString(),
                history: []
            };
        });
    }

    /**
     * Save inventory to localStorage
     */
    saveInventory() {
        localStorage.setItem('inventory', JSON.stringify(this.inventory));
        localStorage.setItem('inventoryAlerts', JSON.stringify(this.alerts));
    }

    /**
     * Get predictive restocking recommendation
     */
    getRestockingRecommendation(product) {
        const forecast = earlyBirdDemandForecasting.generateForecast(product, 14);
        const totalDemand = forecast.reduce((sum, f) => sum + f.quantity, 0);
        const safetyStock = (totalDemand / 14) * 3; // 3 days safety stock

        return {
            product: product,
            recommendedQuantity: Math.round(totalDemand + safetyStock),
            baseForecasted14Days: totalDemand,
            safetyStock: Math.round(safetyStock),
            reason: 'Maintain 3 days of safety stock + 14-day demand',
            priority: forecast[0].quantity > (totalDemand / 14) * 1.5 ? 'high' : 'normal'
        };
    }
}

// Global instance
const earlyBirdInventoryMonitoring = new EarlyBirdInventoryMonitoring();

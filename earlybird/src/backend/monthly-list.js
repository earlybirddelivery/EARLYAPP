// ============================================
// EarlyBird Monthly List Management
// Monthly Master List with Smart Diff
// ============================================

const EarlyBirdMonthlyList = {
    
    // State
    state: {
        monthlyLists: {}, // { 'YYYY-MM': { items: [], createdAt: date, customerId: id } }
        currentMonth: new Date(),
        selectedMonth: new Date()
    },
    
    // ========== INITIALIZATION ==========
    
    init() {
        this.loadMonthlyLists();
        console.log('EarlyBirdMonthlyList initialized');
    },
    
    loadMonthlyLists() {
        this.state.monthlyLists = EarlyBirdUtils.loadFromStorage('earlybird_monthly_lists', {});
    },
    
    saveMonthlyLists() {
        EarlyBirdUtils.saveToStorage('earlybird_monthly_lists', this.state.monthlyLists);
    },
    
    // ========== MONTHLY LIST MANAGEMENT ==========
    
    /**
     * Create or get monthly list for customer
     * @param {string} customerId - Customer ID
     * @param {Date} month - Month (defaults to current month)
     * @returns {Object} - Monthly list data
     */
    getOrCreateMonthlyList(customerId, month = null) {
        if (!month) {
            month = new Date();
        }
        
        const monthKey = EarlyBirdUtils.getMonthKey(month); // 'YYYY-MM'
        const listKey = `${customerId}_${monthKey}`;
        
        // If list doesn't exist, create from previous month
        if (!this.state.monthlyLists[listKey]) {
            const previousMonth = EarlyBirdUtils.addMonths(month, -1);
            const prevMonthList = this.getPreviousMonthList(customerId, previousMonth);
            
            // Create new list with items from previous month (same quantities)
            this.state.monthlyLists[listKey] = {
                customerId: customerId,
                month: monthKey,
                items: prevMonthList ? JSON.parse(JSON.stringify(prevMonthList.items)) : [], // Deep copy
                createdAt: new Date().toISOString(),
                notes: '',
                status: 'active'
            };
            
            this.saveMonthlyLists();
        }
        
        return this.state.monthlyLists[listKey];
    },
    
    /**
     * Get previous month's list
     * @param {string} customerId
     * @param {Date} month
     * @returns {Object} - Previous month list (or null)
     */
    getPreviousMonthList(customerId, month) {
        const monthKey = EarlyBirdUtils.getMonthKey(month);
        const listKey = `${customerId}_${monthKey}`;
        
        return this.state.monthlyLists[listKey] || null;
    },
    
    /**
     * Add item to monthly list
     * @param {string} customerId
     * @param {string} month - 'YYYY-MM' format
     * @param {Object} item - { productId, name, brand, quantity, unit }
     */
    addItemToList(customerId, month, item) {
        const listKey = `${customerId}_${month}`;
        
        if (!this.state.monthlyLists[listKey]) {
            // Auto-create if doesn't exist
            this.getOrCreateMonthlyList(customerId, new Date(month + '-01'));
        }
        
        const list = this.state.monthlyLists[listKey];
        
        // Check if item already exists
        const existingIndex = list.items.findIndex(i => i.productId === item.productId);
        
        if (existingIndex >= 0) {
            // Update quantity
            list.items[existingIndex].quantity = item.quantity;
            list.items[existingIndex].updatedAt = new Date().toISOString();
        } else {
            // Add new item
            item.id = EarlyBirdUtils.generateId();
            item.createdAt = new Date().toISOString();
            list.items.push(item);
        }
        
        this.saveMonthlyLists();
        return item;
    },
    
    /**
     * Remove item from monthly list
     * @param {string} customerId
     * @param {string} month - 'YYYY-MM'
     * @param {string} productId
     */
    removeItemFromList(customerId, month, productId) {
        const listKey = `${customerId}_${month}`;
        const list = this.state.monthlyLists[listKey];
        
        if (!list) return false;
        
        list.items = list.items.filter(i => i.productId !== productId);
        this.saveMonthlyLists();
        return true;
    },
    
    /**
     * Update item quantity
     * @param {string} customerId
     * @param {string} month
     * @param {string} productId
     * @param {number} quantity
     */
    updateItemQuantity(customerId, month, productId, quantity) {
        const listKey = `${customerId}_${month}`;
        const list = this.state.monthlyLists[listKey];
        
        if (!list) return false;
        
        const item = list.items.find(i => i.productId === productId);
        if (item) {
            item.quantity = quantity;
            item.updatedAt = new Date().toISOString();
            this.saveMonthlyLists();
            return true;
        }
        
        return false;
    },
    
    /**
     * Clear monthly list
     * @param {string} customerId
     * @param {string} month
     */
    clearMonthlyList(customerId, month) {
        const listKey = `${customerId}_${month}`;
        const list = this.state.monthlyLists[listKey];
        
        if (list) {
            list.items = [];
            list.clearedAt = new Date().toISOString();
            this.saveMonthlyLists();
        }
    },
    
    /**
     * Create order from monthly list
     * @param {string} customerId - Customer ID
     * @param {string} month - 'YYYY-MM' format (defaults to current month)
     * @param {object} orderData - Additional order data (deliveryDate, slot, etc.)
     * @returns {object} - Created order
     */
    createOrderFromMonthlyList(customerId, month = null, orderData = {}) {
        if (!month) {
            month = EarlyBirdUtils.getMonthKey(new Date());
        }
        
        const list = this.getOrCreateMonthlyList(customerId, new Date(month + '-01'));
        
        if (!list || !list.items || list.items.length === 0) {
            EarlyBirdUtils.showToast('Monthly list is empty', 'warning');
            return null;
        }
        
        // Convert monthly list items to order items
        if (typeof EarlyBirdOrders !== 'undefined') {
            // Clear cart first
            EarlyBirdOrders.clearCart();
            
            // Add all items from monthly list to cart
            list.items.forEach(item => {
                if (item.productId) {
                    EarlyBirdOrders.addToCart(item.productId, item.quantity || 1);
                }
            });
            
            // Submit order
            const order = EarlyBirdOrders.submitOrder({
                customerId: customerId,
                customerPhone: orderData.customerPhone || '',
                deliveryDate: orderData.deliveryDate || EarlyBirdUtils.getDateString(new Date()),
                deliverySlot: orderData.deliverySlot || 'am',
                paymentMethod: orderData.paymentMethod || 'wallet',
                notes: `Order from monthly list (${month})`
            });
            
            if (order) {
                EarlyBirdUtils.showToast(`Order created from monthly list! ${list.items.length} items`, 'success');
                
                // Log to calendar
                if (typeof EarlyBirdCalendar !== 'undefined') {
                    EarlyBirdCalendar.addEvent({
                        type: 'ORDER_PLACED',
                        customerId: customerId,
                        date: order.deliveryDate,
                        orderId: order.id,
                        description: `Order from monthly list: ${list.items.length} items`,
                        source: 'monthly_list'
                    });
                }
            }
            
            return order;
        }
        
        return null;
    },
    
    // ========== SMART DIFF VIEW ==========
    
    /**
     * Get Smart Diff - comparison between two months
     * Shows: This Month vs Last Month
     * @param {string} customerId
     * @param {Date} month - Current month
     * @returns {Object} - Diff data with statistics
     */
    getSmartDiff(customerId, month = null) {
        if (!month) {
            month = new Date();
        }
        
        const currentMonthKey = EarlyBirdUtils.getMonthKey(month);
        const previousMonth = EarlyBirdUtils.addMonths(month, -1);
        const previousMonthKey = EarlyBirdUtils.getMonthKey(previousMonth);
        
        const currentList = this.state.monthlyLists[`${customerId}_${currentMonthKey}`] || { items: [] };
        const previousList = this.state.monthlyLists[`${customerId}_${previousMonthKey}`] || { items: [] };
        
        // Build comparison
        const allProducts = new Set();
        currentList.items.forEach(item => allProducts.add(item.productId));
        previousList.items.forEach(item => allProducts.add(item.productId));
        
        const diffItems = [];
        let totalAdded = 0;
        let totalRemoved = 0;
        let totalIncreased = 0;
        let totalDecreased = 0;
        let totalUnchanged = 0;
        
        allProducts.forEach(productId => {
            const currentItem = currentList.items.find(i => i.productId === productId);
            const previousItem = previousList.items.find(i => i.productId === productId);
            
            let status = 'unchanged';
            let change = 0;
            let changePercent = 0;
            
            if (previousItem && !currentItem) {
                status = 'removed';
                change = -previousItem.quantity;
                totalRemoved++;
            } else if (!previousItem && currentItem) {
                status = 'added';
                change = currentItem.quantity;
                totalAdded++;
            } else if (previousItem && currentItem) {
                if (currentItem.quantity > previousItem.quantity) {
                    status = 'increased';
                    change = currentItem.quantity - previousItem.quantity;
                    changePercent = ((change / previousItem.quantity) * 100).toFixed(0);
                    totalIncreased++;
                } else if (currentItem.quantity < previousItem.quantity) {
                    status = 'decreased';
                    change = currentItem.quantity - previousItem.quantity;
                    changePercent = ((change / previousItem.quantity) * 100).toFixed(0);
                    totalDecreased++;
                } else {
                    totalUnchanged++;
                }
            }
            
            diffItems.push({
                productId: productId,
                name: currentItem?.name || previousItem?.name || 'Unknown',
                brand: currentItem?.brand || previousItem?.brand || '',
                unit: currentItem?.unit || previousItem?.unit || 'qty',
                lastMonth: previousItem?.quantity || 0,
                thisMonth: currentItem?.quantity || 0,
                change: change,
                changePercent: changePercent,
                status: status // 'added', 'removed', 'increased', 'decreased', 'unchanged'
            });
        });
        
        // Sort by status (added/removed first, then changes)
        diffItems.sort((a, b) => {
            const statusOrder = { added: 0, increased: 1, unchanged: 2, decreased: 3, removed: 4 };
            return statusOrder[a.status] - statusOrder[b.status];
        });
        
        return {
            customerId: customerId,
            currentMonth: currentMonthKey,
            previousMonth: previousMonthKey,
            currentLabel: EarlyBirdUtils.formatDate(month, 'month-year'),
            previousLabel: EarlyBirdUtils.formatDate(previousMonth, 'month-year'),
            items: diffItems,
            summary: {
                totalItems: allProducts.size,
                itemsAdded: totalAdded,
                itemsRemoved: totalRemoved,
                itemsIncreased: totalIncreased,
                itemsDecreased: totalDecreased,
                itemsUnchanged: totalUnchanged,
                totalLastMonth: previousList.items.reduce((sum, i) => sum + i.quantity, 0),
                totalThisMonth: currentList.items.reduce((sum, i) => sum + i.quantity, 0)
            }
        };
    },
    
    /**
     * Get change insights from monthly comparison
     * @param {string} customerId
     * @param {Date} month
     * @returns {Object} - Insights and recommendations
     */
    getMonthlyInsights(customerId, month = null) {
        const diff = this.getSmartDiff(customerId, month);
        const insights = [];
        
        // Insight 1: Overall volume change
        const volumeChange = diff.summary.totalThisMonth - diff.summary.totalLastMonth;
        if (volumeChange > 0) {
            insights.push({
                type: 'increase',
                emoji: '📈',
                title: 'Higher consumption this month',
                message: `You're ordering ${Math.abs(volumeChange)} more units (+${((volumeChange / diff.summary.totalLastMonth) * 100).toFixed(0)}%)`,
                action: 'Review if intentional or update forecast'
            });
        } else if (volumeChange < 0) {
            insights.push({
                type: 'decrease',
                emoji: '📉',
                title: 'Lower consumption this month',
                message: `You're ordering ${Math.abs(volumeChange)} fewer units (${((volumeChange / diff.summary.totalLastMonth) * 100).toFixed(0)}%)`,
                action: 'Good opportunity to save money!'
            });
        }
        
        // Insight 2: Items removed (churn)
        if (diff.summary.itemsRemoved > 0) {
            insights.push({
                type: 'removed',
                emoji: '❌',
                title: `${diff.summary.itemsRemoved} items removed`,
                message: 'You are no longer ordering these items',
                action: 'Check if accidental or intentional'
            });
        }
        
        // Insight 3: Items added (new preferences)
        if (diff.summary.itemsAdded > 0) {
            insights.push({
                type: 'added',
                emoji: '✨',
                title: `${diff.summary.itemsAdded} new items added`,
                message: 'You have started ordering new products',
                action: 'Verify quantities are correct'
            });
        }
        
        // Insight 4: Big increases (need attention)
        const bigIncreases = diff.items.filter(i => i.status === 'increased' && i.changePercent > 50);
        if (bigIncreases.length > 0) {
            insights.push({
                type: 'alert',
                emoji: '⚠️',
                title: `${bigIncreases.length} items increased significantly`,
                message: bigIncreases.map(i => `${i.name}: +${i.changePercent}%`).join(', '),
                action: 'Double-check large quantity increases'
            });
        }
        
        return {
            diff: diff,
            insights: insights
        };
    },
    
    // ========== MONTH NAVIGATION ==========
    
    /**
     * Get all months with data for customer
     * @param {string} customerId
     * @returns {Array} - Months in 'YYYY-MM' format
     */
    getAvailableMonths(customerId) {
        return Object.keys(this.state.monthlyLists)
            .filter(key => key.startsWith(customerId))
            .map(key => key.replace(`${customerId}_`, ''))
            .sort()
            .reverse(); // Newest first
    },
    
    /**
     * Go to specific month (for UI navigation)
     * @param {Date} month
     */
    selectMonth(month) {
        this.state.selectedMonth = new Date(month);
    },
    
    /**
     * Go to previous month
     */
    previousMonth() {
        this.state.selectedMonth = EarlyBirdUtils.addMonths(this.state.selectedMonth, -1);
    },
    
    /**
     * Go to next month
     */
    nextMonth() {
        this.state.selectedMonth = EarlyBirdUtils.addMonths(this.state.selectedMonth, 1);
    },
    
    /**
     * Go to current month
     */
    currentMonth() {
        this.state.selectedMonth = new Date();
    },
    
    // ========== COPY FROM LAST MONTH ==========
    
    /**
     * One-click copy previous month to current month
     * @param {string} customerId
     * @param {Date} toMonth - Month to copy to (defaults to current)
     * @returns {boolean} - Success
     */
    copyFromPreviousMonth(customerId, toMonth = null) {
        if (!toMonth) {
            toMonth = new Date();
        }
        
        const toMonthKey = EarlyBirdUtils.getMonthKey(toMonth);
        const fromMonth = EarlyBirdUtils.addMonths(toMonth, -1);
        const fromMonthKey = EarlyBirdUtils.getMonthKey(fromMonth);
        
        const fromList = this.state.monthlyLists[`${customerId}_${fromMonthKey}`];
        
        if (!fromList) {
            console.warn('No previous month data to copy');
            return false;
        }
        
        // Create new list with same items (deep copy)
        const toListKey = `${customerId}_${toMonthKey}`;
        this.state.monthlyLists[toListKey] = {
            customerId: customerId,
            month: toMonthKey,
            items: JSON.parse(JSON.stringify(fromList.items)),
            createdAt: new Date().toISOString(),
            copiedFrom: fromMonthKey,
            notes: '',
            status: 'active'
        };
        
        this.saveMonthlyLists();
        return true;
    },
    
    /**
     * Copy and adjust - copy previous month with percentage multiplier
     * @param {string} customerId
     * @param {number} multiplier - 1.1 for +10%, 0.9 for -10%
     * @param {Date} toMonth
     */
    copyWithAdjustment(customerId, multiplier = 1.0, toMonth = null) {
        if (!toMonth) {
            toMonth = new Date();
        }
        
        const toMonthKey = EarlyBirdUtils.getMonthKey(toMonth);
        const fromMonth = EarlyBirdUtils.addMonths(toMonth, -1);
        const fromMonthKey = EarlyBirdUtils.getMonthKey(fromMonth);
        
        const fromList = this.state.monthlyLists[`${customerId}_${fromMonthKey}`];
        
        if (!fromList) return false;
        
        // Create new list with adjusted quantities
        const toListKey = `${customerId}_${toMonthKey}`;
        this.state.monthlyLists[toListKey] = {
            customerId: customerId,
            month: toMonthKey,
            items: fromList.items.map(item => ({
                ...item,
                quantity: Math.round(item.quantity * multiplier),
                adjustedFrom: item.quantity,
                multiplier: multiplier
            })),
            createdAt: new Date().toISOString(),
            copiedFrom: fromMonthKey,
            notes: `Adjusted by ${((multiplier - 1) * 100).toFixed(0)}%`,
            status: 'active'
        };
        
        this.saveMonthlyLists();
        return true;
    },
    
    // ========== EXPORT & IMPORT ==========
    
    /**
     * Export monthly list as CSV
     * @param {string} customerId
     * @param {string} month - 'YYYY-MM'
     * @returns {string} - CSV content
     */
    exportAsCSV(customerId, month) {
        const list = this.state.monthlyLists[`${customerId}_${month}`];
        if (!list) return '';
        
        let csv = 'Product,Brand,Quantity,Unit\n';
        csv += list.items.map(item => 
            `"${item.name}","${item.brand || ''}",${item.quantity},"${item.unit}"`
        ).join('\n');
        
        return csv;
    },
    
    /**
     * Import items from CSV
     * @param {string} customerId
     * @param {string} month
     * @param {string} csvContent
     * @returns {boolean} - Success
     */
    importFromCSV(customerId, month, csvContent) {
        const listKey = `${customerId}_${month}`;
        
        if (!this.state.monthlyLists[listKey]) {
            this.getOrCreateMonthlyList(customerId, new Date(month + '-01'));
        }
        
        const list = this.state.monthlyLists[listKey];
        const lines = csvContent.split('\n').slice(1); // Skip header
        
        lines.forEach(line => {
            if (!line.trim()) return;
            
            const parts = line.split(',').map(p => p.replace(/^"|"$/g, ''));
            if (parts.length >= 3) {
                this.addItemToList(customerId, month, {
                    productId: EarlyBirdUtils.generateId(),
                    name: parts[0],
                    brand: parts[1],
                    quantity: parseInt(parts[2]),
                    unit: parts[3] || 'qty'
                });
            }
        });
        
        return true;
    },
    
    // ========== STATISTICS ==========
    
    /**
     * Get customer's order history (by month)
     * @param {string} customerId
     * @param {number} months - How many months back
     * @returns {Array} - Historical data
     */
    getOrderHistory(customerId, months = 12) {
        const history = [];
        
        for (let i = 0; i < months; i++) {
            const month = EarlyBirdUtils.addMonths(new Date(), -i);
            const monthKey = EarlyBirdUtils.getMonthKey(month);
            const list = this.state.monthlyLists[`${customerId}_${monthKey}`];
            
            if (list) {
                history.push({
                    month: monthKey,
                    label: EarlyBirdUtils.formatDate(month, 'short-month'),
                    itemCount: list.items.length,
                    totalQuantity: list.items.reduce((sum, i) => sum + i.quantity, 0),
                    createdAt: list.createdAt
                });
            }
        }
        
        return history;
    },
    
    /**
     * Get top products (recurring items)
     * @param {string} customerId
     * @param {number} months - Analyze last N months
     * @returns {Array} - Top products with frequency
     */
    getTopRecurringProducts(customerId, months = 6) {
        const productFreq = {};
        
        for (let i = 0; i < months; i++) {
            const month = EarlyBirdUtils.addMonths(new Date(), -i);
            const monthKey = EarlyBirdUtils.getMonthKey(month);
            const list = this.state.monthlyLists[`${customerId}_${monthKey}`];
            
            if (list) {
                list.items.forEach(item => {
                    if (!productFreq[item.productId]) {
                        productFreq[item.productId] = {
                            name: item.name,
                            brand: item.brand,
                            frequency: 0,
                            avgQuantity: 0,
                            totalQuantity: 0
                        };
                    }
                    productFreq[item.productId].frequency++;
                    productFreq[item.productId].totalQuantity += item.quantity;
                });
            }
        }
        
        // Calculate average and sort
        const topProducts = Object.values(productFreq)
            .map(p => ({
                ...p,
                avgQuantity: Math.round(p.totalQuantity / p.frequency)
            }))
            .sort((a, b) => b.frequency - a.frequency);
        
        return topProducts;
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof EarlyBirdMonthlyList !== 'undefined') {
        EarlyBirdMonthlyList.init();
    }
});

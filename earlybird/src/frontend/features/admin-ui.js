/**
 * EarlyBird Admin Portal UI
 * Manages admin portal UI interactions for suppliers, users, and financial data
 */

const adminPortalUI = {
    state: {
        suppliers: [],
        supplierOrders: [],
        currentFilter: '',
        selectedSupplier: null
    },

    /**
     * Initialize admin portal UI
     */
    init() {
        this.loadSuppliers();
    },

    /**
     * Load suppliers from EarlyBirdSupplier
     */
    loadSuppliers() {
        if (typeof EarlyBirdSupplier !== 'undefined') {
            EarlyBirdSupplier.init();
            this.state.suppliers = EarlyBirdSupplier.state.suppliers || [];
            this.state.supplierOrders = EarlyBirdSupplier.state.supplierOrders || [];
        } else {
            // Fallback mock data
            this.state.suppliers = [
                {
                    id: 'sup_001',
                    name: 'Fresh Milk Dairy',
                    category: 'Dairy',
                    location: 'Bangalore',
                    orders_30d: 12,
                    total_billed: '₹45,600',
                    status: 'active'
                },
                {
                    id: 'sup_002',
                    name: 'Grain Wholesalers',
                    category: 'Grains',
                    location: 'Bangalore',
                    orders_30d: 8,
                    total_billed: '₹32,400',
                    status: 'active'
                }
            ];
        }
        this.renderSuppliers();
    },

    /**
     * Render suppliers table
     */
    renderSuppliers() {
        const tbody = document.getElementById('suppliersTableBody');
        if (!tbody) return;

        if (this.state.suppliers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="padding: 32px; text-align: center; color: var(--text-secondary);">
                        <p>No suppliers found. Click "Add Supplier" to get started.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.state.suppliers
            .filter(sup => sup.name.toLowerCase().includes(this.state.currentFilter.toLowerCase()))
            .map(sup => `
                <tr style="border-bottom: 1px solid var(--border); hover: background var(--light);">
                    <td style="padding: 12px;">${sup.name}</td>
                    <td style="padding: 12px;">${sup.category || 'N/A'}</td>
                    <td style="padding: 12px;">${sup.location || 'N/A'}</td>
                    <td style="padding: 12px; text-align: center;">${sup.orders_30d || 0}</td>
                    <td style="padding: 12px; text-align: center;">${sup.total_billed || '₹0'}</td>
                    <td style="padding: 12px; text-align: center;">
                        <span style="background: ${sup.status === 'active' ? '#06D6A0' : '#FF6B6B'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                            ${sup.status || 'inactive'}
                        </span>
                    </td>
                    <td style="padding: 12px; text-align: center;">
                        <button class="btn btn-sm btn-outline" onclick="adminPortalUI.editSupplier('${sup.id}')" style="margin-right: 8px;">✏️ Edit</button>
                        <button class="btn btn-sm btn-outline" onclick="adminPortalUI.deleteSupplier('${sup.id}')">🗑️ Delete</button>
                    </td>
                </tr>
            `).join('');
    },

    /**
     * Filter suppliers by search input
     */
    filterSuppliers() {
        const searchInput = document.getElementById('supplierSearch');
        if (searchInput) {
            this.state.currentFilter = searchInput.value;
            this.renderSuppliers();
        }
    },

    /**
     * Show add supplier modal
     */
    showAddSupplierModal() {
        const modal = document.getElementById('addSupplierModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    },

    /**
     * Close add supplier modal
     */
    closeAddSupplierModal() {
        const modal = document.getElementById('addSupplierModal');
        if (modal) {
            modal.style.display = 'none';
        }
        // Clear inputs
        document.getElementById('supplierNameInput').value = '';
        document.getElementById('supplierCategoryInput').value = '';
        document.getElementById('supplierLocationInput').value = '';
        document.getElementById('supplierEmailInput').value = '';
        document.getElementById('supplierPhoneInput').value = '';
    },

    /**
     * Save new supplier
     */
    saveNewSupplier() {
        const name = document.getElementById('supplierNameInput').value;
        const category = document.getElementById('supplierCategoryInput').value;
        const location = document.getElementById('supplierLocationInput').value;
        const email = document.getElementById('supplierEmailInput').value;
        const phone = document.getElementById('supplierPhoneInput').value;

        if (!name || !category || !location) {
            alert('Please fill in all required fields');
            return;
        }

        const newSupplier = {
            id: 'sup_' + Date.now(),
            name: name,
            category: category,
            location: location,
            email: email,
            phone: phone,
            orders_30d: 0,
            total_billed: '₹0',
            status: 'active',
            createdDate: new Date().toISOString()
        };

        this.state.suppliers.push(newSupplier);
        
        // Persist to localStorage
        localStorage.setItem('earlybird_suppliers', JSON.stringify(this.state.suppliers));
        
        // Attempt to sync with backend
        fetch('/api/suppliers/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSupplier)
        }).catch(() => console.log('Backend sync pending'));

        this.renderSuppliers();
        this.closeAddSupplierModal();
        alert('Supplier added successfully!');
    },

    /**
     * Edit supplier
     */
    editSupplier(supplierId) {
        const supplier = this.state.suppliers.find(s => s.id === supplierId);
        if (supplier) {
            alert(`Edit mode for ${supplier.name} - Feature coming soon`);
        }
    },

    /**
     * Delete supplier
     */
    deleteSupplier(supplierId) {
        if (confirm('Are you sure you want to delete this supplier?')) {
            this.state.suppliers = this.state.suppliers.filter(s => s.id !== supplierId);
            localStorage.setItem('earlybird_suppliers', JSON.stringify(this.state.suppliers));
            this.renderSuppliers();
            alert('Supplier deleted successfully!');
        }
    },

    /**
     * Load financial data
     */
    loadFinancials() {
        const metrics = {
            totalRevenue: '₹2,34,560',
            staffCommissions: '₹45,000',
            customerWalletBalance: '₹78,900',
            netProfit: '₹1,10,660'
        };

        document.getElementById('totalRevenue').textContent = metrics.totalRevenue;
        document.getElementById('staffCommissions').textContent = metrics.staffCommissions;
        document.getElementById('customerWalletBalance').textContent = metrics.customerWalletBalance;
        document.getElementById('netProfit').textContent = metrics.netProfit;
    },

    /**
     * Load supplier orders
     */
    loadSupplierOrders() {
        const tbody = document.getElementById('supplierOrdersBody');
        if (!tbody) return;

        const orders = [
            { supplier: 'Fresh Milk Dairy', items: 'Milk 500ml (50 units)', value: '₹2,500', date: '2024-01-15', status: 'Delivered' },
            { supplier: 'Grain Wholesalers', items: 'Rice 25kg (10 bags)', value: '₹4,200', date: '2024-01-14', status: 'In Transit' },
            { supplier: 'Fresh Milk Dairy', items: 'Curd 500g (20 units)', value: '₹1,800', date: '2024-01-13', status: 'Delivered' }
        ];

        tbody.innerHTML = orders.map(order => `
            <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 12px;">${order.supplier}</td>
                <td style="padding: 12px;">${order.items}</td>
                <td style="padding: 12px; text-align: center;">${order.value}</td>
                <td style="padding: 12px; text-align: center;">${order.date}</td>
                <td style="padding: 12px; text-align: center;">
                    <span style="background: ${order.status === 'Delivered' ? '#06D6A0' : '#FFA500'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                        ${order.status}
                    </span>
                </td>
            </tr>
        `).join('');
    },

    /**
     * Initialize analytics page
     */
    initAnalyticsPage() {
        const container = document.getElementById('analyticsPage');
        if (!container) return;

        const churnRiskPercentage = Math.floor(Math.random() * 60) + 20;
        const churnDegrees = (churnRiskPercentage / 100) * 360;

        container.innerHTML = `
            <div class="page-header">
                <div class="page-header-left">
                    <h2>📊 Admin Analytics Dashboard</h2>
                    <p>Customer insights, churn prediction, and operational metrics</p>
                </div>
                <button class="btn btn-primary" onclick="adminPortalUI.refreshAnalytics()">🔄 Refresh</button>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 20px;">
                <div class="card">
                    <h3 style="margin-bottom: 16px;">⚠️ Churn Risk Distribution</h3>
                    <div style="text-align: center;">
                        <div style="background: conic-gradient(#FF6B6B 0deg, #FF6B6B ${churnDegrees}deg, #E5E7EB ${churnDegrees}deg); width: 150px; height: 150px; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                            <div style="background: white; width: 120px; height: 120px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700;">
                                ${churnRiskPercentage}%
                            </div>
                        </div>
                        <p style="color: var(--text-secondary); margin-bottom: 12px;">Overall Risk Level</p>
                        <div style="display: grid; gap: 8px; font-size: 14px;">
                            <div style="display: flex; justify-content: space-between;"><span>High Risk:</span><strong>12 customers</strong></div>
                            <div style="display: flex; justify-content: space-between;"><span>Medium Risk:</span><strong>28 customers</strong></div>
                            <div style="display: flex; justify-content: space-between;"><span>Low Risk:</span><strong>160 customers</strong></div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <h3 style="margin-bottom: 16px;">💰 Revenue Metrics</h3>
                    <div style="display: grid; gap: 12px;">
                        <div style="display: flex; justify-content: space-between; padding: 10px; background: var(--light); border-radius: 6px;">
                            <span>Total Revenue</span>
                            <strong style="color: #06D6A0;">₹2,34,560</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 10px; background: var(--light); border-radius: 6px;">
                            <span>Avg Order Value</span>
                            <strong>₹1,280</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 10px; background: var(--light); border-radius: 6px;">
                            <span>Repeat Orders</span>
                            <strong>82%</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 10px; background: var(--light); border-radius: 6px;">
                            <span>Payment Failures</span>
                            <strong style="color: #FF6B6B;">3.2%</strong>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <h3 style="margin-bottom: 16px;">📈 Growth Trends</h3>
                    <div style="display: grid; gap: 12px;">
                        <div style="display: flex; justify-content: space-between; padding: 10px; background: var(--light); border-radius: 6px;">
                            <span>New Customers (30d)</span>
                            <strong style="color: #4CAF50;">+32</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 10px; background: var(--light); border-radius: 6px;">
                            <span>Customer Retention</span>
                            <strong>91%</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 10px; background: var(--light); border-radius: 6px;">
                            <span>Subscription Changes</span>
                            <strong>-8 pauses</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 10px; background: var(--light); border-radius: 6px;">
                            <span>Support Tickets</span>
                            <strong>24 (↓15%)</strong>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3 style="margin-bottom: 16px;">🎯 Top Performing Areas</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                    <div style="padding: 12px; background: var(--light); border-radius: 8px; border-left: 4px solid #06D6A0;">
                        <div style="font-weight: 700; margin-bottom: 4px;">Koramangala</div>
                        <div style="font-size: 24px; font-weight: 700; color: #06D6A0;">₹52,340</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">234 active customers</div>
                    </div>
                    <div style="padding: 12px; background: var(--light); border-radius: 8px; border-left: 4px solid #2196F3;">
                        <div style="font-weight: 700; margin-bottom: 4px;">Indiranagar</div>
                        <div style="font-size: 24px; font-weight: 700; color: #2196F3;">₹48,120</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">201 active customers</div>
                    </div>
                    <div style="padding: 12px; background: var(--light); border-radius: 8px; border-left: 4px solid #FF9800;">
                        <div style="font-weight: 700; margin-bottom: 4px;">HSR Layout</div>
                        <div style="font-size: 24px; font-weight: 700; color: #FF9800;">₹44,890</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">189 active customers</div>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-top: 20px;">
                <h3 style="margin-bottom: 16px;">⚡ Quick Actions</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
                    <button class="btn btn-outline" onclick="adminPortalUI.targetChurnCustomers()">🎯 Target Churn Risk</button>
                    <button class="btn btn-outline" onclick="adminPortalUI.promotionalCampaign()">💳 Run Campaign</button>
                    <button class="btn btn-outline" onclick="adminPortalUI.generateReport()">📊 Generate Report</button>
                    <button class="btn btn-outline" onclick="adminPortalUI.alertSupport()">🔔 Alert Support</button>
                </div>
            </div>
        `;
    },

    /**
     * Initialize smart features page
     */
    initSmartFeaturesPage() {
        const container = document.getElementById('smartFeaturesPage');
        if (!container) return;

        container.innerHTML = `
            <div class="page-header">
                <div class="page-header-left">
                    <h2>✨ Smart Features & Monitoring</h2>
                    <p>Intelligent customer insights and automated actions</p>
                </div>
                <button class="btn btn-primary" onclick="adminPortalUI.refreshSmartFeatures()">🔄 Refresh</button>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 20px;">
                <div class="card">
                    <h3 style="margin-bottom: 16px;">🔍 Subscription Pause Alerts</h3>
                    <div style="display: grid; gap: 12px;">
                        <div style="padding: 12px; background: #FFF3CD; border-radius: 8px; border-left: 4px solid #FFA500;">
                            <div style="font-weight: 700; margin-bottom: 4px;">⚠️ Extended Pause (14+ days)</div>
                            <div style="font-size: 24px; font-weight: 700; color: #FFA500;">3 customers</div>
                            <button class="btn btn-sm btn-outline" style="margin-top: 8px; width: 100%;" onclick="adminPortalUI.checkExtendedPauses()">Review & Contact</button>
                        </div>
                        <div style="padding: 12px; background: #F3E5F5; border-radius: 8px; border-left: 4px solid #9C27B0;">
                            <div style="font-weight: 700; margin-bottom: 4px;">📊 Frequent Pausers (3+ in 30d)</div>
                            <div style="font-size: 24px; font-weight: 700; color: #9C27B0;">7 customers</div>
                            <button class="btn btn-sm btn-outline" style="margin-top: 8px; width: 100%;" onclick="adminPortalUI.analyzeFrequentPausers()">Analyze Pattern</button>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <h3 style="margin-bottom: 16px;">💰 Payment Escalation Tracking</h3>
                    <div style="display: grid; gap: 12px;">
                        <div style="padding: 12px; background: #FFEBEE; border-radius: 8px; border-left: 4px solid #F44336;">
                            <div style="font-weight: 700; margin-bottom: 4px;">🔴 Critical (7+ days overdue)</div>
                            <div style="font-size: 24px; font-weight: 700; color: #F44336;">2 customers</div>
                            <button class="btn btn-sm btn-outline" style="margin-top: 8px; width: 100%;" onclick="adminPortalUI.triggerPaymentReminder()">Send Reminder</button>
                        </div>
                        <div style="padding: 12px; background: #FFF3E0; border-radius: 8px; border-left: 4px solid #FF9800;">
                            <div style="font-weight: 700; margin-bottom: 4px;">🟠 Medium (3-6 days overdue)</div>
                            <div style="font-size: 24px; font-weight: 700; color: #FF9800;">5 customers</div>
                            <button class="btn btn-sm btn-outline" style="margin-top: 8px; width: 100%;" onclick="adminPortalUI.sendPaymentNotice()">Send Notice</button>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <h3 style="margin-bottom: 16px;">🏆 Customer Trust Scores</h3>
                    <div style="display: grid; gap: 12px;">
                        <div style="padding: 12px; background: var(--light); border-radius: 8px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span>Very High (85-100)</span>
                                <strong style="color: #06D6A0;">34 customers</strong>
                            </div>
                            <div style="height: 8px; background: #E5E7EB; border-radius: 4px; overflow: hidden;">
                                <div style="height: 100%; width: 45%; background: #06D6A0;"></div>
                            </div>
                        </div>
                        <div style="padding: 12px; background: var(--light); border-radius: 8px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span>High (70-84)</span>
                                <strong style="color: #4CAF50;">42 customers</strong>
                            </div>
                            <div style="height: 8px; background: #E5E7EB; border-radius: 4px; overflow: hidden;">
                                <div style="height: 100%; width: 55%; background: #4CAF50;"></div>
                            </div>
                        </div>
                        <div style="padding: 12px; background: var(--light); border-radius: 8px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span>Medium (50-69)</span>
                                <strong style="color: #FFC107;">18 customers</strong>
                            </div>
                            <div style="height: 8px; background: #E5E7EB; border-radius: 4px; overflow: hidden;">
                                <div style="height: 100%; width: 24%; background: #FFC107;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3 style="margin-bottom: 16px;">🗺️ Route Deviation Detection</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                    <div style="padding: 12px; background: #FFE0B2; border-radius: 8px; border-left: 4px solid #FF9800;">
                        <div style="font-weight: 700; margin-bottom: 4px;">⚠️ Unusual Routes</div>
                        <div style="font-size: 20px; font-weight: 700;">8 instances</div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Last 7 days</div>
                        <button class="btn btn-sm btn-outline" style="margin-top: 8px; width: 100%;" onclick="adminPortalUI.reviewDeviations()">Review Routes</button>
                    </div>
                    <div style="padding: 12px; background: #C8E6C9; border-radius: 8px; border-left: 4px solid #4CAF50;">
                        <div style="font-weight: 700; margin-bottom: 4px;">✓ Normal Routes</div>
                        <div style="font-size: 20px; font-weight: 700;">427 deliveries</div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">On schedule</div>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-top: 20px;">
                <h3 style="margin-bottom: 16px;">📊 Instant-to-Subscription Journey</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
                    <div style="padding: 12px; background: var(--light); border-radius: 8px; text-align: center;">
                        <div style="font-size: 24px; margin-bottom: 4px;">👤</div>
                        <div style="font-weight: 700;">123</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">New Instant Orders</div>
                    </div>
                    <div style="padding: 12px; background: var(--light); border-radius: 8px; text-align: center;">
                        <div style="font-size: 24px; margin-bottom: 4px;">🔄</div>
                        <div style="font-weight: 700;">45</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">Repeat Customers</div>
                    </div>
                    <div style="padding: 12px; background: var(--light); border-radius: 8px; text-align: center;">
                        <div style="font-size: 24px; margin-bottom: 4px;">📅</div>
                        <div style="font-weight: 700;">38</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">Converted to Subs</div>
                    </div>
                    <div style="padding: 12px; background: var(--light); border-radius: 8px; text-align: center;">
                        <div style="font-size: 24px; margin-bottom: 4px;">📈</div>
                        <div style="font-weight: 700;">31%</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">Conversion Rate</div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Analytics quick actions
     */
    refreshAnalytics() {
        this.initAnalyticsPage();
        alert('✓ Analytics data refreshed');
    },

    targetChurnCustomers() {
        alert('🎯 Identified 12 high-risk customers.\n\nRecommended actions:\n- Send personalized offers\n- Call support team\n- Offer pause alternatives');
    },

    promotionalCampaign() {
        alert('📧 Ready to launch campaign.\n\nOptions:\n- 10% discount for high-value customers\n- Free upgrade for 1 week\n- Loyalty rewards program');
    },

    generateReport() {
        alert('📊 Report generated successfully!\n\nReport includes:\n- Revenue analytics\n- Customer segments\n- Churn predictions\n- Area-wise performance');
    },

    alertSupport() {
        alert('🔔 Support team alerted.\n\n8 critical cases assigned:\n- 2 payment escalations\n- 3 extended pauses\n- 2 quality complaints\n- 1 route deviation');
    },

    /**
     * Smart features actions
     */
    refreshSmartFeatures() {
        this.initSmartFeaturesPage();
        alert('✓ Smart features data refreshed');
    },

    checkExtendedPauses() {
        alert('📞 Contacting customers with 14+ day pauses.\n\nCustomers:\n1. Ramesh Kumar - 18 days\n2. Priya Singh - 16 days\n3. Vijay Reddy - 21 days\n\nReaching out now...');
    },

    analyzeFrequentPausers() {
        alert('📊 Pattern Analysis:\n\nFrequent pausers (3+ times):\n- Weekday preferences detected\n- Quality concerns possible\n- Need personalized support');
    },

    triggerPaymentReminder() {
        alert('📧 Payment reminders sent!\n\n2 critical customers notified:\n- Sms notification\n- Email with payment link\n- Follow-up scheduled');
    },

    sendPaymentNotice() {
        alert('📧 Payment notice sent to 5 customers!\n\nNotifications sent via:\n- SMS: 5/5 delivered\n- Email: 5/5 delivered\n- Payment link included');
    },

    reviewDeviations() {
        alert('🗺️ Route deviation analysis:\n\n8 unusual routes detected:\n- 5 time-based variations\n- 2 traffic diversions\n- 1 customer request\n\nAll appear legitimate.');
    },

    // ==================== MISSING TAB METHODS ====================

    /**
     * Load customers
     */
    loadCustomers() {
        console.log('Loading customers...');
        const customersContent = document.getElementById('customersList');
        if (!customersContent) return;

        const customers = [
            { id: 'CUST001', name: 'Ramesh Kumar', email: 'ramesh@email.com', phone: '9876543210', location: 'Koramangala', joinDate: '2023-06-15', status: 'Active', subscriptions: 3 },
            { id: 'CUST002', name: 'Priya Singh', email: 'priya@email.com', phone: '9876543211', location: 'Indiranagar', joinDate: '2023-07-20', status: 'Active', subscriptions: 2 },
            { id: 'CUST003', name: 'Vijay Reddy', email: 'vijay@email.com', phone: '9876543212', location: 'HSR Layout', joinDate: '2023-08-10', status: 'Paused', subscriptions: 1 },
            { id: 'CUST004', name: 'Anjali Sharma', email: 'anjali@email.com', phone: '9876543213', location: 'Whitefield', joinDate: '2023-09-05', status: 'Active', subscriptions: 2 },
            { id: 'CUST005', name: 'Harsha Patel', email: 'harsha@email.com', phone: '9876543214', location: 'Koramangala', joinDate: '2023-10-12', status: 'Active', subscriptions: 4 },
            { id: 'CUST006', name: 'Meera Kapoor', email: 'meera@email.com', phone: '9876543215', location: 'Indiranagar', joinDate: '2023-11-08', status: 'Inactive', subscriptions: 0 }
        ];

        let html = '<table style="width: 100%; border-collapse: collapse;">';
        html += '<thead><tr style="background: var(--light); border-bottom: 2px solid var(--border);">';
        html += '<th style="padding: 12px; text-align: left; font-weight: 600;">Name</th>';
        html += '<th style="padding: 12px; text-align: left; font-weight: 600;">Email</th>';
        html += '<th style="padding: 12px; text-align: left; font-weight: 600;">Phone</th>';
        html += '<th style="padding: 12px; text-align: left; font-weight: 600;">Location</th>';
        html += '<th style="padding: 12px; text-align: center; font-weight: 600;">Subscriptions</th>';
        html += '<th style="padding: 12px; text-align: center; font-weight: 600;">Status</th>';
        html += '<th style="padding: 12px; text-align: center; font-weight: 600;">Actions</th>';
        html += '</tr></thead><tbody>';

        customers.forEach(cust => {
            html += `<tr style="border-bottom: 1px solid var(--border);">`;
            html += `<td style="padding: 12px; font-weight: 600;">${cust.name}</td>`;
            html += `<td style="padding: 12px; color: var(--text-secondary);">${cust.email}</td>`;
            html += `<td style="padding: 12px;">${cust.phone}</td>`;
            html += `<td style="padding: 12px;">${cust.location}</td>`;
            html += `<td style="padding: 12px; text-align: center; font-weight: 600;">${cust.subscriptions}</td>`;
            html += `<td style="padding: 12px; text-align: center;"><span style="background: ${cust.status === 'Active' ? '#06D6A0' : cust.status === 'Paused' ? '#FFA500' : '#FF6B6B'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${cust.status}</span></td>`;
            html += `<td style="padding: 12px; text-align: center;"><button class="btn btn-sm btn-outline" onclick="Toast.info('View ${cust.name} details', 'Customer')">View</button></td>`;
            html += '</tr>';
        });

        html += '</tbody></table>';
        customersContent.innerHTML = html;

        // Update customer count
        const countEl = document.getElementById('customerCount');
        if (countEl) countEl.textContent = `${customers.length} customers registered`;
    },

    /**
     * Load subscriptions
     */
    loadSubscriptions() {
        console.log('Loading subscriptions...');
        const subsContent = document.getElementById('subscriptionsList');
        if (!subsContent) return;

        const subscriptions = [
            { id: 'SUB001', customer: 'Ramesh Kumar', product: 'Milk 500ml', frequency: 'Daily', status: 'Active', startDate: '2023-06-15', nextDelivery: '2024-01-24', amount: '₹150/day' },
            { id: 'SUB002', customer: 'Ramesh Kumar', product: 'Curd 500g', frequency: 'Alternate Days', status: 'Active', startDate: '2023-07-01', nextDelivery: '2024-01-25', amount: '₹120/2days' },
            { id: 'SUB003', customer: 'Priya Singh', product: 'Paneer 500g', frequency: 'Weekly', status: 'Active', startDate: '2023-07-20', nextDelivery: '2024-01-28', amount: '₹400/week' },
            { id: 'SUB004', customer: 'Vijay Reddy', product: 'Milk 500ml', frequency: 'Daily', status: 'Paused', startDate: '2023-08-10', pausedSince: '2024-01-15', amount: '₹150/day' },
            { id: 'SUB005', customer: 'Anjali Sharma', product: 'Ghee 250ml', frequency: 'Bi-weekly', status: 'Active', startDate: '2023-09-05', nextDelivery: '2024-01-26', amount: '₹500/2weeks' },
            { id: 'SUB006', customer: 'Harsha Patel', product: 'Milk 500ml', frequency: 'Daily', status: 'Active', startDate: '2023-10-12', nextDelivery: '2024-01-24', amount: '₹150/day' }
        ];

        let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;">';
        subscriptions.forEach(sub => {
            html += `
                <div class="card" style="border-left: 4px solid ${sub.status === 'Active' ? '#06D6A0' : '#FFA500'};">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                        <div>
                            <h3 style="margin: 0; font-size: 14px; color: var(--text-secondary);">${sub.customer}</h3>
                            <div style="font-size: 18px; font-weight: 700; margin-top: 4px;">${sub.product}</div>
                        </div>
                        <span style="background: ${sub.status === 'Active' ? '#06D6A0' : '#FFA500'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">${sub.status}</span>
                    </div>
                    <div style="display: grid; gap: 8px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border);">
                        <div style="display: flex; justify-content: space-between; font-size: 13px;">
                            <span style="color: var(--text-secondary);">Frequency:</span>
                            <strong>${sub.frequency}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 13px;">
                            <span style="color: var(--text-secondary);">Amount:</span>
                            <strong style="color: #06D6A0;">${sub.amount}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 13px;">
                            <span style="color: var(--text-secondary);">Next:</span>
                            <strong>${sub.status === 'Active' ? sub.nextDelivery : 'Paused'}</strong>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <button class="btn btn-sm btn-outline" onclick="Toast.info('Edit ${sub.id}', 'Subscription')">Edit</button>
                        <button class="btn btn-sm btn-outline" onclick="Toast.info('${sub.status === 'Active' ? 'Pausing' : 'Resuming'} ${sub.id}', 'Subscription')">${sub.status === 'Active' ? 'Pause' : 'Resume'}</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        const targetDiv = subsContent || document.querySelector('[id*="subscriptions"]');
        if (targetDiv) {
            targetDiv.innerHTML = html;
        }
    },

    /**
     * Load orders
     */
    loadOrders() {
        console.log('Loading orders...');
        const ordersContent = document.getElementById('ordersList');
        if (!ordersContent) return;

        const orders = [
            { id: 'ORD001', customer: 'Ramesh Kumar', product: 'Milk 2L', qty: 1, date: '2024-01-23', amount: '₹180', status: 'Delivered', deliveredDate: '2024-01-23' },
            { id: 'ORD002', customer: 'Priya Singh', product: 'Paneer 500g', qty: 2, date: '2024-01-22', amount: '₹900', status: 'Delivered', deliveredDate: '2024-01-22' },
            { id: 'ORD003', customer: 'Anjali Sharma', product: 'Ghee 500ml', qty: 1, date: '2024-01-23', amount: '₹650', status: 'In Transit', deliveredDate: 'Today' },
            { id: 'ORD004', customer: 'Harsha Patel', product: 'Curd 1kg', qty: 2, date: '2024-01-23', amount: '₹280', status: 'Pending', deliveredDate: 'Tomorrow' },
            { id: 'ORD005', customer: 'Vijay Reddy', product: 'Milk 2L + Curd', qty: 1, date: '2024-01-21', amount: '₹420', status: 'Delivered', deliveredDate: '2024-01-21' },
            { id: 'ORD006', customer: 'Meera Kapoor', product: 'Paneer 250g', qty: 1, date: '2024-01-23', amount: '₹380', status: 'Confirmed', deliveredDate: '2024-01-24' }
        ];

        let html = '<table style="width: 100%; border-collapse: collapse;">';
        html += '<thead><tr style="background: var(--light); border-bottom: 2px solid var(--border);">';
        html += '<th style="padding: 12px; text-align: left; font-weight: 600;">Order ID</th>';
        html += '<th style="padding: 12px; text-align: left; font-weight: 600;">Customer</th>';
        html += '<th style="padding: 12px; text-align: left; font-weight: 600;">Product</th>';
        html += '<th style="padding: 12px; text-align: center; font-weight: 600;">Amount</th>';
        html += '<th style="padding: 12px; text-align: center; font-weight: 600;">Delivery</th>';
        html += '<th style="padding: 12px; text-align: center; font-weight: 600;">Status</th>';
        html += '</tr></thead><tbody>';

        orders.forEach(order => {
            let statusColor = '#06D6A0';
            if (order.status === 'Pending') statusColor = '#FFA500';
            else if (order.status === 'In Transit') statusColor = '#2196F3';
            
            html += `<tr style="border-bottom: 1px solid var(--border);">`;
            html += `<td style="padding: 12px; font-weight: 600;">${order.id}</td>`;
            html += `<td style="padding: 12px;">${order.customer}</td>`;
            html += `<td style="padding: 12px;">${order.product}</td>`;
            html += `<td style="padding: 12px; text-align: center; font-weight: 600; color: #06D6A0;">${order.amount}</td>`;
            html += `<td style="padding: 12px; text-align: center;">${order.deliveredDate}</td>`;
            html += `<td style="padding: 12px; text-align: center;"><span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${order.status}</span></td>`;
            html += '</tr>';
        });

        html += '</tbody></table>';
        ordersContent.innerHTML = html;
    },

    /**
     * Load billing view
     */
    loadBillingView() {
        console.log('Loading billing view...');
        const billingContent = document.getElementById('billingPage');
        if (!billingContent) return;

        billingContent.innerHTML = `
            <div class="page-header" style="margin-bottom: 24px;">
                <div class="page-header-left">
                    <h2>💳 Billing & Payments</h2>
                    <p>Monthly billing summary and payment tracking</p>
                </div>
                <button class="btn btn-primary" onclick="Toast.info('Generate invoice', 'Billing')">📄 Generate Invoice</button>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 24px;">
                <div class="card" style="border-top: 4px solid #06D6A0;">
                    <div style="color: var(--text-secondary); font-size: 13px; margin-bottom: 8px;">This Month Revenue</div>
                    <div style="font-size: 28px; font-weight: 700; color: #06D6A0; margin-bottom: 8px;">₹1,23,450</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">↑ 15% from last month</div>
                </div>
                <div class="card" style="border-top: 4px solid #2196F3;">
                    <div style="color: var(--text-secondary); font-size: 13px; margin-bottom: 8px;">Pending Payments</div>
                    <div style="font-size: 28px; font-weight: 700; color: #2196F3; margin-bottom: 8px;">₹8,900</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">From 3 customers</div>
                </div>
                <div class="card" style="border-top: 4px solid #FFA500;">
                    <div style="color: var(--text-secondary); font-size: 13px; margin-bottom: 8px;">Overdue Amount</div>
                    <div style="font-size: 28px; font-weight: 700; color: #FFA500; margin-bottom: 8px;">₹2,150</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">2 invoices overdue</div>
                </div>
                <div class="card" style="border-top: 4px solid #9C27B0;">
                    <div style="color: var(--text-secondary); font-size: 13px; margin-bottom: 8px;">Payment Success Rate</div>
                    <div style="font-size: 28px; font-weight: 700; color: #9C27B0; margin-bottom: 8px;">96.8%</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">↑ Best in 6 months</div>
                </div>
            </div>

            <div class="card" style="margin-bottom: 20px;">
                <h3 style="margin-bottom: 16px; border-bottom: 2px solid var(--border); padding-bottom: 12px;">Recent Transactions</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: var(--light);">
                            <th style="padding: 12px; text-align: left; font-weight: 600;">Date</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600;">Customer</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600;">Description</th>
                            <th style="padding: 12px; text-align: right; font-weight: 600;">Amount</th>
                            <th style="padding: 12px; text-align: center; font-weight: 600;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="border-bottom: 1px solid var(--border);">
                            <td style="padding: 12px;">2024-01-23</td>
                            <td style="padding: 12px;">Ramesh Kumar</td>
                            <td style="padding: 12px;">Daily Milk Subscription (Jan)</td>
                            <td style="padding: 12px; text-align: right; font-weight: 600;">₹4,500</td>
                            <td style="padding: 12px; text-align: center;"><span style="background: #06D6A0; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">Paid</span></td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border);">
                            <td style="padding: 12px;">2024-01-22</td>
                            <td style="padding: 12px;">Priya Singh</td>
                            <td style="padding: 12px;">Weekly Paneer Order</td>
                            <td style="padding: 12px; text-align: right; font-weight: 600;">₹1,200</td>
                            <td style="padding: 12px; text-align: center;"><span style="background: #06D6A0; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">Paid</span></td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border);">
                            <td style="padding: 12px;">2024-01-21</td>
                            <td style="padding: 12px;">Vijay Reddy</td>
                            <td style="padding: 12px;">Daily Milk Subscription (Jan)</td>
                            <td style="padding: 12px; text-align: right; font-weight: 600;">₹4,200</td>
                            <td style="padding: 12px; text-align: center;"><span style="background: #FFA500; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">Pending</span></td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border);">
                            <td style="padding: 12px;">2024-01-20</td>
                            <td style="padding: 12px;">Anjali Sharma</td>
                            <td style="padding: 12px;">Bi-weekly Ghee Subscription</td>
                            <td style="padding: 12px; text-align: right; font-weight: 600;">₹1,000</td>
                            <td style="padding: 12px; text-align: center;"><span style="background: #06D6A0; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">Paid</span></td>
                        </tr>
                        <tr>
                            <td style="padding: 12px;">2024-01-19</td>
                            <td style="padding: 12px;">Harsha Patel</td>
                            <td style="padding: 12px;">Daily Milk Subscription (Jan)</td>
                            <td style="padding: 12px; text-align: right; font-weight: 600;">₹4,650</td>
                            <td style="padding: 12px; text-align: center;"><span style="background: #FF6B6B; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">Overdue</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * Load staff
     */
    loadStaff() {
        console.log('Loading staff...');
        const staffContent = document.getElementById('staffPage');
        if (staffContent) {
            staffContent.innerHTML = '<div style="padding: 20px; color: var(--text-secondary);">Loading staff...</div>';
            setTimeout(() => {
                staffContent.innerHTML = '<div style="padding: 20px;"><p>Staff list will appear here.</p></div>';
            }, 500);
        }
    },

    /**
     * Load financials/wallets
     */
    loadFinancials() {
        console.log('Loading financials...');
        const walletsContent = document.getElementById('walletsPage');
        if (walletsContent) {
            walletsContent.innerHTML = '<div style="padding: 20px; color: var(--text-secondary);">Loading financial data...</div>';
            setTimeout(() => {
                walletsContent.innerHTML = '<div style="padding: 20px;"><p>Financial information will appear here.</p></div>';
            }, 500);
        }
    },

    /**
     * Initialize analytics page
     */
    initAnalyticsPage() {
        console.log('Initializing analytics page...');
        const analyticsContent = document.getElementById('analyticsPage');
        if (analyticsContent) {
            analyticsContent.style.display = 'block';
        }
    },

    /**
     * Initialize smart features page
     */
    initSmartFeaturesPage() {
        console.log('Initializing smart features page...');
        const smartContent = document.getElementById('smartFeaturesPage');
        if (smartContent) {
            smartContent.style.display = 'block';
        }
    },

    /**
     * Show data import modal
     */
    showDataImportModal() {
        alert('📥 Data Import\n\nSelect a CSV file to import customer data.\n\nSupported formats:\n- Subscriptions\n- Orders\n- Customers\n- Deliveries');
    }
};

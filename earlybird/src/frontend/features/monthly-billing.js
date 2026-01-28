// ============================================
// Monthly Billing Grid UI - Inspired by Emergent Code
// ============================================

const monthlyBillingUI = {
    state: {
        currentMonth: '',
        currentView: 'edit', // 'edit' or 'billing'
        billingData: [],
        products: [],
        visibleProducts: [],
        areas: [],
        deliveryBoys: [],
        filters: {
            area: '',
            paymentStatus: 'all'
        }
    },

    init() {
        console.log('Initializing Monthly Billing UI...');
        this.setupMonth();
        this.loadProducts();
        this.loadAreas();
        this.loadDeliveryBoys();
    },

    setupMonth() {
        const monthInput = document.getElementById('billingMonth');
        if (monthInput) {
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            monthInput.value = currentMonth;
            this.state.currentMonth = currentMonth;
        }
    },

    loadProducts() {
        // Get products from subscription system
        const products = [
            { id: 'milk-500ml', name: 'Milk 500ml', price: 30, unit: 'packet' },
            { id: 'milk-1l', name: 'Milk 1L', price: 60, unit: 'packet' },
            { id: 'curd-500ml', name: 'Curd 500ml', price: 25, unit: 'packet' },
            { id: 'buttermilk-1l', name: 'Buttermilk 1L', price: 20, unit: 'packet' }
        ];

        this.state.products = products;
        this.state.visibleProducts = products.map(p => p.id);
        this.renderProductFilters();
    },

    renderProductFilters() {
        const container = document.getElementById('productFilters');
        if (!container) return;

        let html = '';
        this.state.products.forEach(product => {
            const checked = this.state.visibleProducts.includes(product.id) ? 'checked' : '';
            html += `
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" ${checked} value="${product.id}"
                        onchange="monthlyBillingUI.toggleProduct('${product.id}')"
                        style="cursor: pointer;">
                    <span style="font-size: 13px;">${product.name}</span>
                </label>
            `;
        });
        container.innerHTML = html;
    },

    toggleProduct(productId) {
        const index = this.state.visibleProducts.indexOf(productId);
        if (index > -1) {
            this.state.visibleProducts.splice(index, 1);
        } else {
            this.state.visibleProducts.push(productId);
        }
        this.renderEditView();
    },

    loadAreas() {
        // Get unique areas from delivery system
        const areas = ['Kukatpally', 'KPHB', 'Miyapur', 'Madhapur', 'Kondapur'];
        this.state.areas = areas;

        const select = document.getElementById('areaFilter');
        if (select) {
            areas.forEach(area => {
                const option = document.createElement('option');
                option.value = area;
                option.textContent = area;
                select.appendChild(option);
            });
        }
    },

    loadDeliveryBoys() {
        // Get delivery boys from system
        this.state.deliveryBoys = [
            { id: 'db1', name: 'Ravi Kumar' },
            { id: 'db2', name: 'Suresh Reddy' },
            { id: 'db3', name: 'Krishna Rao' }
        ];
    },

    loadMonth() {
        const monthInput = document.getElementById('billingMonth');
        if (!monthInput) return;

        this.state.currentMonth = monthInput.value;
        console.log('Loading month:', this.state.currentMonth);

        // Generate mock data for demonstration
        this.generateMockData();

        if (this.state.currentView === 'edit') {
            this.renderEditView();
        } else {
            this.renderBillingView();
        }
    },

    generateMockData() {
        // Generate mock customer data with daily deliveries
        const customers = [
            { id: 'c1', name: 'Ramesh Kumar', phone: '9876543210', area: 'Kukatpally', deliveryBoy: 'db1', shift: 'morning' },
            { id: 'c2', name: 'Lakshmi Devi', phone: '9876543211', area: 'KPHB', deliveryBoy: 'db1', shift: 'morning' },
            { id: 'c3', name: 'Venkat Rao', phone: '9876543212', area: 'Kukatpally', deliveryBoy: 'db2', shift: 'evening' },
            { id: 'c4', name: 'Sita Reddy', phone: '9876543213', area: 'Miyapur', deliveryBoy: 'db2', shift: 'morning' },
            { id: 'c5', name: 'Krishna Prasad', phone: '9876543214', area: 'Madhapur', deliveryBoy: 'db3', shift: 'evening' },
        ];

        const [year, month] = this.state.currentMonth.split('-');
        const daysInMonth = new Date(year, month, 0).getDate();

        this.state.billingData = customers.map(customer => {
            const dailyData = {};

            // Generate random delivery data for each day
            for (let day = 1; day <= daysInMonth; day++) {
                const products = {};

                // Randomly assign quantities (simulating real data)
                if (Math.random() > 0.2) { // 80% delivery rate
                    this.state.products.forEach(product => {
                        if (Math.random() > 0.7) { // 30% chance of ordering each product
                            products[product.id] = Math.floor(Math.random() * 3) + 1; // 1-3 packets
                        }
                    });
                }

                dailyData[day] = products;
            }

            return {
                ...customer,
                dailyData,
                previousBalance: Math.random() > 0.5 ? Math.floor(Math.random() * 500) : 0,
                payments: []
            };
        });
    },

    renderEditView() {
        const table = document.getElementById('billingGrid');
        const tbody = document.getElementById('billingGridBody');
        if (!table || !tbody) return;

        // Update header with day columns
        const [year, month] = this.state.currentMonth.split('-');
        const daysInMonth = new Date(year, month, 0).getDate();

        let headerHTML = `
            <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                <th style="padding: 12px; text-align: left; position: sticky; left: 0; background: #667eea; z-index: 2; min-width: 150px;">Customer</th>
                <th style="padding: 12px; text-align: left; min-width: 100px;">Area</th>
                <th style="padding: 12px; text-align: left; min-width: 120px;">Delivery Boy</th>
                <th style="padding: 12px; text-align: left; min-width: 100px;">Shift</th>
        `;

        // Add day columns
        for (let day = 1; day <= daysInMonth; day++) {
            headerHTML += `<th style="padding: 8px; text-align: center; min-width: 80px; font-size: 12px;">${day}</th>`;
        }
        headerHTML += `</tr>`;
        table.querySelector('thead').innerHTML = headerHTML;

        // Filter data
        let filteredData = this.state.billingData;
        if (this.state.filters.area) {
            filteredData = filteredData.filter(c => c.area === this.state.filters.area);
        }

        // Render body rows
        let bodyHTML = '';
        filteredData.forEach(customer => {
            // Create a row for each visible product
            this.state.visibleProducts.forEach(productId => {
                const product = this.state.products.find(p => p.id === productId);
                if (!product) return;

                bodyHTML += `
                    <tr style="border-bottom: 1px solid var(--border);">
                        <td style="padding: 10px; position: sticky; left: 0; background: white; z-index: 1; border-right: 2px solid var(--border);">
                            <div style="font-weight: 600; font-size: 13px;">${customer.name}</div>
                            <div style="font-size: 11px; color: var(--text-secondary);">${product.name}</div>
                        </td>
                        <td style="padding: 10px; font-size: 13px;">${customer.area}</td>
                        <td style="padding: 10px;">
                            <select onchange="monthlyBillingUI.updateDeliveryBoy('${customer.id}', this.value)"
                                style="width: 100%; padding: 6px; border: 1px solid var(--border); border-radius: 4px; font-size: 12px;">
                                ${this.state.deliveryBoys.map(db =>
                                    `<option value="${db.id}" ${db.id === customer.deliveryBoy ? 'selected' : ''}>${db.name}</option>`
                                ).join('')}
                            </select>
                        </td>
                        <td style="padding: 10px;">
                            <select onchange="monthlyBillingUI.updateShift('${customer.id}', this.value)"
                                style="width: 100%; padding: 6px; border: 1px solid var(--border); border-radius: 4px; font-size: 12px;">
                                <option value="morning" ${customer.shift === 'morning' ? 'selected' : ''}>Morning</option>
                                <option value="evening" ${customer.shift === 'evening' ? 'selected' : ''}>Evening</option>
                                <option value="both" ${customer.shift === 'both' ? 'selected' : ''}>Both</option>
                            </select>
                        </td>
                `;

                // Add quantity cells for each day
                for (let day = 1; day <= daysInMonth; day++) {
                    const qty = customer.dailyData[day]?.[productId] || 0;
                    const bgColor = qty > 0 ? '#e8f5e9' : 'white';

                    bodyHTML += `
                        <td style="padding: 4px; background: ${bgColor}; text-align: center;">
                            <input type="number" min="0" max="10" step="1" value="${qty}"
                                onchange="monthlyBillingUI.updateQuantity('${customer.id}', '${productId}', ${day}, this.value)"
                                style="width: 50px; padding: 4px; border: 1px solid ${qty > 0 ? '#4caf50' : 'var(--border)'};
                                       border-radius: 4px; text-align: center; font-size: 13px; font-weight: 600;">
                        </td>
                    `;
                }

                bodyHTML += `</tr>`;
            });
        });

        tbody.innerHTML = bodyHTML || '<tr><td colspan="100" style="padding: 40px; text-align: center;">No data available</td></tr>';
    },

    renderBillingView() {
        const tbody = document.getElementById('billingViewBody');
        if (!tbody) return;

        // Filter data
        let filteredData = this.state.billingData;
        if (this.state.filters.area) {
            filteredData = filteredData.filter(c => c.area === this.state.filters.area);
        }

        // Calculate weekly totals
        let bodyHTML = '';
        filteredData.forEach(customer => {
            const weeks = [0, 0, 0, 0];
            let totalBill = 0;

            // Calculate totals for each week
            Object.keys(customer.dailyData).forEach(day => {
                const dayNum = parseInt(day);
                const weekIndex = Math.floor((dayNum - 1) / 7);

                Object.keys(customer.dailyData[day]).forEach(productId => {
                    const product = this.state.products.find(p => p.id === productId);
                    if (product) {
                        const qty = customer.dailyData[day][productId];
                        const amount = qty * product.price;
                        if (weekIndex < 4) {
                            weeks[weekIndex] += amount;
                        }
                        totalBill += amount;
                    }
                });
            });

            const totalPaid = customer.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
            const balance = totalBill + customer.previousBalance - totalPaid;

            const balanceColor = balance > 0 ? '#f44336' : balance < 0 ? '#4caf50' : '#666';

            bodyHTML += `
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 12px; font-weight: 600;">${customer.name}</td>
                    <td style="padding: 12px; text-align: right;">₹${weeks[0].toFixed(0)}</td>
                    <td style="padding: 12px; text-align: right;">₹${weeks[1].toFixed(0)}</td>
                    <td style="padding: 12px; text-align: right;">₹${weeks[2].toFixed(0)}</td>
                    <td style="padding: 12px; text-align: right;">₹${weeks[3].toFixed(0)}</td>
                    <td style="padding: 12px; text-align: right; font-weight: 700;">₹${totalBill.toFixed(0)}</td>
                    <td style="padding: 12px; text-align: right; color: #4caf50;">₹${totalPaid.toFixed(0)}</td>
                    <td style="padding: 12px; text-align: right; font-weight: 700; color: ${balanceColor};">₹${balance.toFixed(0)}</td>
                    <td style="padding: 12px; text-align: center;">
                        <button class="btn btn-sm" style="padding: 6px 12px; font-size: 12px; margin-right: 4px;"
                            onclick="monthlyBillingUI.recordPayment('${customer.id}')">💰 Payment</button>
                        <button class="btn btn-sm btn-outline" style="padding: 6px 12px; font-size: 12px;"
                            onclick="monthlyBillingUI.sendWhatsApp('${customer.id}')">📱 WhatsApp</button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = bodyHTML || '<tr><td colspan="9" style="padding: 40px; text-align: center;">No data available</td></tr>';
    },

    toggleView() {
        this.state.currentView = this.state.currentView === 'edit' ? 'billing' : 'edit';

        const editContainer = document.getElementById('editViewContainer');
        const billingContainer = document.getElementById('billingViewContainer');
        const toggleBtn = document.getElementById('toggleViewBtn');

        if (this.state.currentView === 'edit') {
            editContainer.style.display = 'block';
            billingContainer.style.display = 'none';
            toggleBtn.innerHTML = '👁️ Switch to Billing View';
            this.renderEditView();
        } else {
            editContainer.style.display = 'none';
            billingContainer.style.display = 'block';
            toggleBtn.innerHTML = '✏️ Switch to Edit View';
            this.renderBillingView();
        }
    },

    updateQuantity(customerId, productId, day, quantity) {
        const customer = this.state.billingData.find(c => c.id === customerId);
        if (!customer) return;

        if (!customer.dailyData[day]) {
            customer.dailyData[day] = {};
        }

        const qty = parseInt(quantity) || 0;
        if (qty > 0) {
            customer.dailyData[day][productId] = qty;
        } else {
            delete customer.dailyData[day][productId];
        }

        console.log(`Updated ${customer.name} - Day ${day} - ${productId}: ${qty}`);
    },

    updateDeliveryBoy(customerId, deliveryBoyId) {
        const customer = this.state.billingData.find(c => c.id === customerId);
        if (!customer) return;

        customer.deliveryBoy = deliveryBoyId;
        console.log(`Updated ${customer.name} delivery boy to ${deliveryBoyId}`);
    },

    updateShift(customerId, shift) {
        const customer = this.state.billingData.find(c => c.id === customerId);
        if (!customer) return;

        customer.shift = shift;
        console.log(`Updated ${customer.name} shift to ${shift}`);
    },

    applyFilters() {
        this.state.filters.area = document.getElementById('areaFilter')?.value || '';
        this.state.filters.paymentStatus = document.getElementById('paymentFilter')?.value || 'all';

        if (this.state.currentView === 'edit') {
            this.renderEditView();
        } else {
            this.renderBillingView();
        }
    },

    recordPayment(customerId) {
        const customer = this.state.billingData.find(c => c.id === customerId);
        if (!customer) return;

        // Create modal for payment recording
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-header">
                    <h2>💰 Record Payment - ${customer.name}</h2>
                    <button onclick="this.closest('.modal-overlay').remove()"
                        style="background: none; border: none; font-size: 20px; cursor: pointer;">✕</button>
                </div>
                <div class="modal-body" style="padding: 20px;">
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Amount (₹)</label>
                        <input type="number" id="paymentAmount" min="0" step="1"
                            style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px;"
                            placeholder="Enter payment amount">
                    </div>
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Payment Date</label>
                        <input type="date" id="paymentDate" value="${new Date().toISOString().split('T')[0]}"
                            style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px;">
                    </div>
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Payment Method</label>
                        <select id="paymentMethod"
                            style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px;">
                            <option value="cash">Cash</option>
                            <option value="upi">UPI</option>
                            <option value="card">Card</option>
                            <option value="cheque">Cheque</option>
                        </select>
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Notes</label>
                        <textarea id="paymentNotes" rows="3"
                            style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px;"
                            placeholder="Optional notes"></textarea>
                    </div>
                    <button class="btn btn-primary" style="width: 100%;"
                        onclick="monthlyBillingUI.savePayment('${customerId}', this)">Save Payment</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    savePayment(customerId, btn) {
        const amount = parseFloat(document.getElementById('paymentAmount')?.value) || 0;
        const date = document.getElementById('paymentDate')?.value;
        const method = document.getElementById('paymentMethod')?.value;
        const notes = document.getElementById('paymentNotes')?.value;

        if (amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        const customer = this.state.billingData.find(c => c.id === customerId);
        if (!customer) return;

        if (!customer.payments) customer.payments = [];
        customer.payments.push({
            amount,
            date,
            method,
            notes,
            timestamp: new Date().toISOString()
        });

        console.log(`Payment recorded for ${customer.name}: ₹${amount}`);

        // Close modal
        btn.closest('.modal-overlay').remove();

        // Refresh view
        if (this.state.currentView === 'billing') {
            this.renderBillingView();
        }

        alert(`Payment of ₹${amount} recorded successfully!`);
    },

    sendWhatsApp(customerId) {
        const customer = this.state.billingData.find(c => c.id === customerId);
        if (!customer) return;

        // Calculate bill
        let totalBill = 0;
        Object.keys(customer.dailyData).forEach(day => {
            Object.keys(customer.dailyData[day]).forEach(productId => {
                const product = this.state.products.find(p => p.id === productId);
                if (product) {
                    const qty = customer.dailyData[day][productId];
                    totalBill += qty * product.price;
                }
            });
        });

        const totalPaid = customer.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        const balance = totalBill + customer.previousBalance - totalPaid;

        // Generate message (English)
        const message = `🌅 EarlyBird Delivery - Monthly Bill

Dear ${customer.name},

Bill for ${this.state.currentMonth}
━━━━━━━━━━━━━━━
Total Bill: ₹${totalBill.toFixed(0)}
Amount Paid: ₹${totalPaid.toFixed(0)}
Previous Balance: ₹${customer.previousBalance.toFixed(0)}
Current Balance: ₹${balance.toFixed(0)}

${balance > 0 ? '⚠️ Please clear the pending amount.' : balance < 0 ? '✅ Advance credit available!' : '✅ All cleared!'}

Thank you for choosing EarlyBird! 🙏`;

        const whatsappUrl = `https://wa.me/${customer.phone}?text=${encodeURIComponent(message)}`;

        // Open WhatsApp in new tab
        window.open(whatsappUrl, '_blank');

        console.log('WhatsApp message sent to:', customer.phone);
    },

    exportToExcel() {
        // Generate CSV from billing data
        if (this.state.billingData.length === 0) {
            alert('No billing data to export. Please generate billing first.');
            return;
        }

        // CSV Header
        const headers = ['Customer ID', 'Customer Name', 'Phone', 'Area', 'Product', 'Quantity', 'Unit Price', 'Total Price', 'Status', 'Date'];
        
        // CSV Rows
        const rows = [];
        this.state.billingData.forEach(customer => {
            if (customer.items && customer.items.length > 0) {
                customer.items.forEach(item => {
                    rows.push([
                        customer.customerId || 'N/A',
                        customer.customerName || 'N/A',
                        customer.phone || 'N/A',
                        customer.area || 'N/A',
                        item.name || 'N/A',
                        item.quantity || 0,
                        '₹' + (item.price || 0),
                        '₹' + (item.totalPrice || 0),
                        customer.status || 'pending',
                        this.state.currentMonth || new Date().toISOString().split('T')[0]
                    ]);
                });
            }
        });

        // Create CSV content
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => {
                // Escape cells with commas or quotes
                const cellStr = String(cell);
                if (cellStr.includes(',') || cellStr.includes('"')) {
                    return '"' + cellStr.replace(/"/g, '""') + '"';
                }
                return cellStr;
            }).join(','))
        ].join('\n');

        // Add summary section
        const totalAmount = this.state.billingData.reduce((sum, c) => {
            const itemsSum = (c.items || []).reduce((s, i) => s + (i.totalPrice || 0), 0);
            return sum + itemsSum;
        }, 0);

        const summaryCSV = `\n\nBilling Summary\nMonth,${this.state.currentMonth}\nTotal Customers,${this.state.billingData.length}\nTotal Amount,₹${totalAmount}`;

        // Combine and create download
        const fullCSV = csvContent + summaryCSV;

        // Create blob and download
        const blob = new Blob([fullCSV], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `billing_${this.state.currentMonth}_${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log('✓ Billing data exported to CSV:', this.state.currentMonth);
        alert('✓ Billing data exported successfully!\n\nFile: billing_' + this.state.currentMonth + '.csv');
    }
};

// Auto-initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Monthly Billing module loaded');
    });
} else {
    console.log('Monthly Billing module loaded');
}

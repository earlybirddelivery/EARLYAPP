// ============================================
// EarlyBird Demo Data Generator
// Creates comprehensive dummy data for all features
// ============================================

const EarlyBirdDemoData = {

    // ========== DEMO CUSTOMERS ==========

    customers: [
        {
            id: 'CUST001',
            name: 'Rajesh Kumar',
            email: 'rajesh.kumar@example.com',
            phone: '9876543210',
            address: '123 MG Road, Bangalore',
            status: 'active', // active, trial, inactive
            joinedDate: '2025-12-01',
            totalOrders: 45,
            lifetimeValue: 12500,
            preferredDeliveryTime: 'am',
            notes: 'Regular customer, prefers morning deliveries'
        },
        {
            id: 'CUST002',
            name: 'Priya Sharma',
            email: 'priya.sharma@example.com',
            phone: '9876543211',
            address: '456 Brigade Road, Bangalore',
            status: 'active',
            joinedDate: '2025-11-15',
            totalOrders: 62,
            lifetimeValue: 18900,
            preferredDeliveryTime: 'pm',
            notes: 'VIP customer, prefers evening deliveries'
        },
        {
            id: 'CUST003',
            name: 'Amit Patel',
            email: 'amit.patel@example.com',
            phone: '9876543212',
            address: '789 Koramangala, Bangalore',
            status: 'trial',
            joinedDate: '2026-01-15',
            totalOrders: 3,
            lifetimeValue: 450,
            preferredDeliveryTime: 'am',
            notes: 'New trial customer, testing products'
        },
        {
            id: 'CUST004',
            name: 'Sneha Reddy',
            email: 'sneha.reddy@example.com',
            phone: '9876543213',
            address: '321 Indiranagar, Bangalore',
            status: 'active',
            joinedDate: '2025-10-20',
            totalOrders: 89,
            lifetimeValue: 25600,
            preferredDeliveryTime: 'am',
            notes: 'Premium customer, bulk orders'
        },
        {
            id: 'CUST005',
            name: 'Vikram Singh',
            email: 'vikram.singh@example.com',
            phone: '9876543214',
            address: '555 Whitefield, Bangalore',
            status: 'active',
            joinedDate: '2025-09-10',
            totalOrders: 120,
            lifetimeValue: 34500,
            preferredDeliveryTime: 'anytime',
            notes: 'Flexible schedule, long-term customer'
        },
        {
            id: 'CUST006',
            name: 'Meera Iyer',
            email: 'meera.iyer@example.com',
            phone: '9876543215',
            address: '888 Jayanagar, Bangalore',
            status: 'inactive',
            joinedDate: '2025-08-05',
            totalOrders: 15,
            lifetimeValue: 2100,
            preferredDeliveryTime: 'am',
            notes: 'Inactive - moved to different city'
        },
        {
            id: 'CUST007',
            name: 'Arjun Mehta',
            email: 'arjun.mehta@example.com',
            phone: '9876543216',
            address: '999 HSR Layout, Bangalore',
            status: 'trial',
            joinedDate: '2026-01-18',
            totalOrders: 1,
            lifetimeValue: 150,
            preferredDeliveryTime: 'pm',
            notes: 'New trial customer, interested in subscriptions'
        },
        {
            id: 'CUST008',
            name: 'Kavya Krishnan',
            email: 'kavya.krishnan@example.com',
            phone: '9876543217',
            address: '444 Electronic City, Bangalore',
            status: 'active',
            joinedDate: '2025-07-12',
            totalOrders: 156,
            lifetimeValue: 42300,
            preferredDeliveryTime: 'am',
            notes: 'Top customer, weekly pattern subscriber'
        }
    ],

    // ========== DEMO PRODUCTS ==========

    products: [
        {
            id: 'PROD001',
            name: 'Fresh Milk (1L)',
            category: 'Dairy',
            price: 55,
            unit: 'liter',
            stock: 500,
            supplier: 'Local Dairy Farm',
            description: 'Fresh cow milk, daily delivery'
        },
        {
            id: 'PROD002',
            name: 'Whole Wheat Bread',
            category: 'Bakery',
            price: 45,
            unit: 'piece',
            stock: 200,
            supplier: 'Baker\'s Delight',
            description: 'Freshly baked whole wheat bread'
        },
        {
            id: 'PROD003',
            name: 'Farm Eggs (6 pcs)',
            category: 'Poultry',
            price: 85,
            unit: 'pack',
            stock: 150,
            supplier: 'Happy Hens Farm',
            description: 'Free-range organic eggs'
        },
        {
            id: 'PROD004',
            name: 'Mixed Vegetables (1kg)',
            category: 'Vegetables',
            price: 120,
            unit: 'kg',
            stock: 300,
            supplier: 'Green Valley Farms',
            description: 'Fresh seasonal vegetables'
        },
        {
            id: 'PROD005',
            name: 'Fresh Fruits (1kg)',
            category: 'Fruits',
            price: 180,
            unit: 'kg',
            stock: 250,
            supplier: 'Orchard Fresh',
            description: 'Seasonal fresh fruits'
        },
        {
            id: 'PROD006',
            name: 'Paneer (250g)',
            category: 'Dairy',
            price: 95,
            unit: 'pack',
            stock: 100,
            supplier: 'Local Dairy Farm',
            description: 'Fresh homemade paneer'
        },
        {
            id: 'PROD007',
            name: 'Yogurt (500g)',
            category: 'Dairy',
            price: 60,
            unit: 'pack',
            stock: 180,
            supplier: 'Local Dairy Farm',
            description: 'Fresh yogurt, daily preparation'
        },
        {
            id: 'PROD008',
            name: 'Premium Rice (5kg)',
            category: 'Grains',
            price: 450,
            unit: 'bag',
            stock: 80,
            supplier: 'Rice Mills Co',
            description: 'Basmati rice, premium quality'
        }
    ],

    // ========== DEMO SUBSCRIPTIONS (V2 Format) ==========

    subscriptionsV2: [
        // 1. Fixed Daily - Rajesh's Daily Milk
        {
            id: 'SUB001',
            customerId: 'CUST001',
            customerName: 'Rajesh Kumar',
            productId: 'PROD001',
            productName: 'Fresh Milk (1L)',
            mode: 'fixed_daily',
            status: 'active',
            defaultQuantity: 2,
            price: 55,
            startDate: '2026-01-01',
            endDate: null, // Indefinite
            deliveryWindow: 'am',
            autoStart: true,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
            notes: 'Daily morning milk delivery for family'
        },

        // 2. Weekly Pattern - Priya's Weekly Bread
        {
            id: 'SUB002',
            customerId: 'CUST002',
            customerName: 'Priya Sharma',
            productId: 'PROD002',
            productName: 'Whole Wheat Bread',
            mode: 'weekly_pattern',
            status: 'active',
            weeklyPattern: [1, 3, 5], // Monday, Wednesday, Friday
            defaultQuantity: 1,
            price: 45,
            startDate: '2026-01-06', // Monday
            endDate: null,
            deliveryWindow: 'pm',
            autoStart: true,
            createdAt: '2026-01-06T00:00:00Z',
            updatedAt: '2026-01-06T00:00:00Z',
            notes: 'Fresh bread on Mon, Wed, Fri evenings'
        },

        // 3. One-Time - Amit's Trial Pack (Trial Customer)
        {
            id: 'SUB003',
            customerId: 'CUST003',
            customerName: 'Amit Patel',
            productId: 'PROD005',
            productName: 'Fresh Fruits (1kg)',
            mode: 'one_time',
            status: 'active',
            quantity: 1,
            price: 180,
            startDate: '2026-01-20',
            endDate: '2026-01-26', // 1 week trial
            deliveryWindow: 'am',
            autoStart: true,
            createdAt: '2026-01-15T00:00:00Z',
            updatedAt: '2026-01-15T00:00:00Z',
            notes: 'Trial customer - testing fruit delivery service'
        },

        // 4. Day-by-Day - Sneha's Variable Egg Orders
        {
            id: 'SUB004',
            customerId: 'CUST004',
            customerName: 'Sneha Reddy',
            productId: 'PROD003',
            productName: 'Farm Eggs (6 pcs)',
            mode: 'day_by_day',
            status: 'active',
            price: 85,
            startDate: '2026-01-20',
            endDate: null,
            deliveryWindow: 'am',
            autoStart: true,
            dayOverrides: [
                { date: '2026-01-21', quantity: 2 },
                { date: '2026-01-23', quantity: 1 },
                { date: '2026-01-25', quantity: 3 },
                { date: '2026-01-26', quantity: 1 }, // Republic Day
                { date: '2026-01-28', quantity: 2 },
                { date: '2026-01-30', quantity: 1 }
            ],
            createdAt: '2026-01-20T00:00:00Z',
            updatedAt: '2026-01-20T00:00:00Z',
            notes: 'Variable egg demand based on family needs'
        },

        // 5. Irregular - Vikram's Random Vegetable Orders
        {
            id: 'SUB005',
            customerId: 'CUST005',
            customerName: 'Vikram Singh',
            productId: 'PROD004',
            productName: 'Mixed Vegetables (1kg)',
            mode: 'irregular',
            status: 'active',
            price: 120,
            startDate: '2026-01-20',
            endDate: null,
            deliveryWindow: 'anytime',
            autoStart: true,
            irregularList: [
                { date: '2026-01-21', quantity: 2 },
                { date: '2026-01-24', quantity: 1 },
                { date: '2026-01-28', quantity: 3 },
                { date: '2026-02-01', quantity: 2 },
                { date: '2026-02-07', quantity: 1 }
            ],
            createdAt: '2026-01-20T00:00:00Z',
            updatedAt: '2026-01-20T00:00:00Z',
            notes: 'Orders vegetables irregularly based on availability'
        },

        // 6. Paused - Kavya's Milk (On Vacation)
        {
            id: 'SUB006',
            customerId: 'CUST008',
            customerName: 'Kavya Krishnan',
            productId: 'PROD001',
            productName: 'Fresh Milk (1L)',
            mode: 'weekly_pattern',
            status: 'paused',
            weeklyPattern: [1, 2, 3, 4, 5], // Weekdays only
            defaultQuantity: 1,
            price: 55,
            startDate: '2025-12-01',
            endDate: null,
            deliveryWindow: 'am',
            autoStart: true,
            pauseIntervals: [
                {
                    start: '2026-01-25',
                    end: '2026-02-05',
                    reason: 'Family vacation to Goa'
                }
            ],
            createdAt: '2025-12-01T00:00:00Z',
            updatedAt: '2026-01-20T00:00:00Z',
            notes: 'Paused for vacation, will resume automatically'
        },

        // 7. Draft - Priya's Future Yogurt Subscription
        {
            id: 'SUB007',
            customerId: 'CUST002',
            customerName: 'Priya Sharma',
            productId: 'PROD007',
            productName: 'Yogurt (500g)',
            mode: 'weekly_pattern',
            status: 'draft',
            weeklyPattern: [0, 2, 4, 6], // Sun, Tue, Thu, Sat
            defaultQuantity: 1,
            price: 60,
            startDate: '2026-02-01',
            endDate: null,
            deliveryWindow: 'pm',
            autoStart: true,
            createdAt: '2026-01-20T00:00:00Z',
            updatedAt: '2026-01-20T00:00:00Z',
            notes: 'Draft subscription - planning to activate from Feb 1'
        },

        // 8. Stopped - Meera's Cancelled Subscription
        {
            id: 'SUB008',
            customerId: 'CUST006',
            customerName: 'Meera Iyer',
            productId: 'PROD002',
            productName: 'Whole Wheat Bread',
            mode: 'fixed_daily',
            status: 'stopped',
            defaultQuantity: 1,
            price: 45,
            startDate: '2025-08-05',
            endDate: null,
            stopDate: '2026-01-10',
            deliveryWindow: 'am',
            autoStart: true,
            createdAt: '2025-08-05T00:00:00Z',
            updatedAt: '2026-01-10T00:00:00Z',
            notes: 'Customer moved to different city - permanently stopped'
        },

        // 9. Biweekly - Sneha's Rice Subscription
        {
            id: 'SUB009',
            customerId: 'CUST004',
            customerName: 'Sneha Reddy',
            productId: 'PROD008',
            productName: 'Premium Rice (5kg)',
            mode: 'biweekly',
            status: 'active',
            defaultQuantity: 1,
            price: 450,
            startDate: '2026-01-15',
            endDate: null,
            deliveryWindow: 'anytime',
            autoStart: true,
            createdAt: '2026-01-15T00:00:00Z',
            updatedAt: '2026-01-15T00:00:00Z',
            notes: 'Rice delivered every 2 weeks'
        },

        // 10. Monthly - Rajesh's Paneer
        {
            id: 'SUB010',
            customerId: 'CUST001',
            customerName: 'Rajesh Kumar',
            productId: 'PROD006',
            productName: 'Paneer (250g)',
            mode: 'monthly',
            status: 'active',
            defaultQuantity: 2,
            renewalDay: 1, // 1st of every month
            price: 95,
            startDate: '2026-01-01',
            endDate: null,
            deliveryWindow: 'am',
            autoStart: true,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
            notes: 'Monthly paneer delivery on 1st of month'
        },

        // 11. With Day Overrides - Vikram's Festival Boost
        {
            id: 'SUB011',
            customerId: 'CUST005',
            customerName: 'Vikram Singh',
            productId: 'PROD001',
            productName: 'Fresh Milk (1L)',
            mode: 'fixed_daily',
            status: 'active',
            defaultQuantity: 1,
            price: 55,
            startDate: '2026-01-01',
            endDate: null,
            deliveryWindow: 'am',
            autoStart: true,
            dayOverrides: [
                { date: '2026-01-26', quantity: 3 }, // Republic Day - family gathering
                { date: '2026-03-14', quantity: 4 }  // Holi - festival boost
            ],
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-15T00:00:00Z',
            notes: 'Regular daily milk with festival day overrides'
        },

        // 12. Trial Customer with One-Time
        {
            id: 'SUB012',
            customerId: 'CUST007',
            customerName: 'Arjun Mehta',
            productId: 'PROD003',
            productName: 'Farm Eggs (6 pcs)',
            mode: 'one_time',
            status: 'active',
            quantity: 1,
            price: 85,
            startDate: '2026-01-21',
            endDate: '2026-01-23',
            deliveryWindow: 'pm',
            autoStart: true,
            createdAt: '2026-01-18T00:00:00Z',
            updatedAt: '2026-01-18T00:00:00Z',
            notes: 'Trial customer testing egg quality'
        }
    ],

    // ========== DEMO USERS (Login Credentials) ==========
    // Note: Auth.js expects users as an OBJECT keyed by userId, not an array
    // Passwords will be hashed by auth.js using btoa()

    users: {
        'USER001': {
            id: 'USER001',
            email: 'admin@earlybird.com',
            password: 'YWRtaW4xMjM=', // btoa('admin123')
            role: 'admin',
            name: 'Admin User',
            phone: '9999999999',
            metadata: {},
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
            isActive: true
        },
        'USER002': {
            id: 'USER002',
            email: 'customer@test.com',
            password: 'Y3VzdG9tZXIxMjM=', // btoa('customer123')
            role: 'customer',
            name: 'Test Customer',
            phone: '9999999998',
            metadata: {
                customerId: 'CUST001' // Links to Rajesh Kumar
            },
            createdAt: '2025-12-01T00:00:00Z',
            updatedAt: '2025-12-01T00:00:00Z',
            isActive: true
        },
        'USER003': {
            id: 'USER003',
            email: 'delivery@earlybird.com',
            password: 'ZGVsaXZlcnkxMjM=', // btoa('delivery123')
            role: 'delivery_boy',
            name: 'Delivery Person',
            phone: '9999999997',
            metadata: {},
            createdAt: '2025-06-01T00:00:00Z',
            updatedAt: '2025-06-01T00:00:00Z',
            isActive: true
        },
        'USER004': {
            id: 'USER004',
            email: 'marketing@earlybird.com',
            password: 'bWFya2V0aW5nMTIz', // btoa('marketing123')
            role: 'marketing_staff',
            name: 'Marketing Manager',
            phone: '9999999996',
            metadata: {},
            createdAt: '2025-03-15T00:00:00Z',
            updatedAt: '2025-03-15T00:00:00Z',
            isActive: true
        },
        'USER005': {
            id: 'USER005',
            email: 'supplier@earlybird.com',
            password: 'c3VwcGxpZXIxMjM=', // btoa('supplier123')
            role: 'supplier',
            name: 'Supplier Manager',
            phone: '9999999995',
            metadata: {},
            createdAt: '2025-02-10T00:00:00Z',
            updatedAt: '2025-02-10T00:00:00Z',
            isActive: true
        },
        'USER006': {
            id: 'USER006',
            email: 'rajesh.kumar@example.com',
            password: 'cmFqZXNoMTIz', // btoa('rajesh123')
            role: 'customer',
            name: 'Rajesh Kumar',
            phone: '9876543210',
            metadata: {
                customerId: 'CUST001'
            },
            createdAt: '2025-12-01T00:00:00Z',
            updatedAt: '2025-12-01T00:00:00Z',
            isActive: true
        },
        'USER007': {
            id: 'USER007',
            email: 'priya.sharma@example.com',
            password: 'cHJpeWExMjM=', // btoa('priya123')
            role: 'customer',
            name: 'Priya Sharma',
            phone: '9876543211',
            metadata: {
                customerId: 'CUST002'
            },
            createdAt: '2025-11-15T00:00:00Z',
            updatedAt: '2025-11-15T00:00:00Z',
            isActive: true
        }
    },

    // ========== INITIALIZATION FUNCTION ==========

    init() {
        console.log('🚀 Initializing EarlyBird Demo Data...');

        // Save customers
        localStorage.setItem('earlybird_customers', JSON.stringify(this.customers));
        console.log(`✅ Loaded ${this.customers.length} customers`);

        // Save products
        localStorage.setItem('earlybird_products', JSON.stringify(this.products));
        console.log(`✅ Loaded ${this.products.length} products`);

        // Save subscriptions V2
        localStorage.setItem('earlybird_subscriptions_v2', JSON.stringify(this.subscriptionsV2));
        console.log(`✅ Loaded ${this.subscriptionsV2.length} subscriptions (V2)`);

        // Save users (for authentication) - as OBJECT not array
        localStorage.setItem('earlybird_users', JSON.stringify(this.users));
        const userCount = Object.keys(this.users).length;
        console.log(`✅ Loaded ${userCount} users`);

        console.log('🎉 Demo data loaded successfully!');
        console.log('');
        console.log('📋 Login Credentials:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔑 Admin:     admin@earlybird.com / admin123');
        console.log('🔑 Customer:  customer@test.com / customer123');
        console.log('🔑 Customer2: rajesh.kumar@example.com / rajesh123');
        console.log('🔑 Customer3: priya.sharma@example.com / priya123');
        console.log('🔑 Delivery:  delivery@earlybird.com / delivery123');
        console.log('🔑 Marketing: marketing@earlybird.com / marketing123');
        console.log('🔑 Supplier:  supplier@earlybird.com / supplier123');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📱 OTP Login: Any 10-digit phone / OTP: 123456');
        console.log('');

        return {
            customers: this.customers.length,
            products: this.products.length,
            subscriptions: this.subscriptionsV2.length,
            users: userCount
        };
    },

    // ========== HELPER: GET SUBSCRIPTION SUMMARY ==========

    getSubscriptionSummary() {
        const subs = this.subscriptionsV2;

        return {
            total: subs.length,
            active: subs.filter(s => s.status === 'active').length,
            paused: subs.filter(s => s.status === 'paused').length,
            draft: subs.filter(s => s.status === 'draft').length,
            stopped: subs.filter(s => s.status === 'stopped').length,
            byMode: {
                fixed_daily: subs.filter(s => s.mode === 'fixed_daily').length,
                weekly_pattern: subs.filter(s => s.mode === 'weekly_pattern').length,
                day_by_day: subs.filter(s => s.mode === 'day_by_day').length,
                irregular: subs.filter(s => s.mode === 'irregular').length,
                one_time: subs.filter(s => s.mode === 'one_time').length,
                biweekly: subs.filter(s => s.mode === 'biweekly').length,
                monthly: subs.filter(s => s.mode === 'monthly').length
            }
        };
    },

    // ========== HELPER: GET CUSTOMER SUMMARY ==========

    getCustomerSummary() {
        const customers = this.customers;

        return {
            total: customers.length,
            active: customers.filter(c => c.status === 'active').length,
            trial: customers.filter(c => c.status === 'trial').length,
            inactive: customers.filter(c => c.status === 'inactive').length,
            totalRevenue: customers.reduce((sum, c) => sum + c.lifetimeValue, 0),
            avgLifetimeValue: Math.round(customers.reduce((sum, c) => sum + c.lifetimeValue, 0) / customers.length)
        };
    },

    // ========== HELPER: PRINT DEMO INFO ==========

    printDemoInfo() {
        console.log('');
        console.log('📊 Demo Data Summary');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const subSummary = this.getSubscriptionSummary();
        console.log('📦 Subscriptions:');
        console.log(`   Total: ${subSummary.total}`);
        console.log(`   Active: ${subSummary.active}`);
        console.log(`   Paused: ${subSummary.paused}`);
        console.log(`   Draft: ${subSummary.draft}`);
        console.log(`   Stopped: ${subSummary.stopped}`);
        console.log('');
        console.log('   By Mode:');
        console.log(`   - Fixed Daily: ${subSummary.byMode.fixed_daily}`);
        console.log(`   - Weekly Pattern: ${subSummary.byMode.weekly_pattern}`);
        console.log(`   - Day-by-Day: ${subSummary.byMode.day_by_day}`);
        console.log(`   - Irregular: ${subSummary.byMode.irregular}`);
        console.log(`   - One-Time: ${subSummary.byMode.one_time}`);
        console.log(`   - Biweekly: ${subSummary.byMode.biweekly}`);
        console.log(`   - Monthly: ${subSummary.byMode.monthly}`);
        console.log('');

        const custSummary = this.getCustomerSummary();
        console.log('👥 Customers:');
        console.log(`   Total: ${custSummary.total}`);
        console.log(`   Active: ${custSummary.active}`);
        console.log(`   Trial: ${custSummary.trial}`);
        console.log(`   Inactive: ${custSummary.inactive}`);
        console.log(`   Total Revenue: ₹${custSummary.totalRevenue.toLocaleString()}`);
        console.log(`   Avg Lifetime Value: ₹${custSummary.avgLifetimeValue.toLocaleString()}`);
        console.log('');

        console.log(`📦 Products: ${this.products.length}`);
        console.log(`🔑 Users: ${Object.keys(this.users).length}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
};

// Auto-initialize on load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // Check if demo data already loaded
        const existing = localStorage.getItem('earlybird_demo_loaded');

        if (!existing) {
            EarlyBirdDemoData.init();
            EarlyBirdDemoData.printDemoInfo();
            localStorage.setItem('earlybird_demo_loaded', 'true');
        } else {
            console.log('ℹ️  Demo data already loaded. To reload, run: EarlyBirdDemoData.init()');
        }
    });
}

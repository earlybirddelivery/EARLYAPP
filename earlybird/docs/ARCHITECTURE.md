# EarlyBird System Architecture

## Overview
EarlyBird is a comprehensive delivery management system with customer, admin, support, and delivery portals.

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   FRONTEND PORTALS                      │
├─────────────────────────────────────────────────────────┤
│ Customer Portal │ Admin Portal │ Support │ Delivery    │
└────────┬────────┴──────┬───────┴────┬────┴────┬────────┘
         │               │            │         │
         └───────────────┼────────────┼─────────┘
                         │ ui-components.js
                         │ (Modal & Renderer Layer)
         ┌───────────────┼────────────┼─────────┐
         │               │            │         │
    ┌────▼──────────┬────▼──────┬────▼───┬─────▼────┐
    │   Backend Modules         │ Features (Phase 3) │
    ├────────────────────────────┼─────────────────┤
    │ • wallet.js               │ • voice.js      │
    │ • orders.js               │ • image-ocr.js  │
    │ • subscription.js         │ • analytics.js  │
    │ • delivery.js             │ • supplier.js   │
    │ • calendar.js             │ • smart-feat.   │
    │ • utils.js                │                 │
    └────────────────────────────┴─────────────────┘
```

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: JavaScript (Node.js compatible)
- **Storage**: localStorage (currently), can be upgraded to database
- **Styling**: CSS with responsive design

## File Organization

```
src/
├── backend/              # Business logic modules
│   ├── wallet.js        # Payment & wallet management
│   ├── orders.js        # Order creation & tracking
│   ├── subscription.js  # Subscription management
│   ├── delivery.js      # Delivery operations
│   ├── calendar.js      # Calendar & events
│   └── utils.js         # Shared utilities
│
├── frontend/
│   ├── portals/         # User interface pages
│   │   ├── index.html       # Landing page
│   │   ├── customer.html    # Customer portal (70% complete)
│   │   ├── admin.html       # Admin portal (20% complete)
│   │   ├── support.html     # Support portal (10% complete)
│   │   └── delivery.html    # Delivery portal (40% complete)
│   │
│   ├── components/      # Reusable UI components
│   │   └── ui-components.js # Modals & renderers
│   │
│   ├── features/        # Phase 3 features
│   │   ├── voice.js         # Voice ordering
│   │   ├── image-ocr.js     # Image recognition
│   │   ├── analytics.js     # Analytics dashboard
│   │   ├── supplier.js      # Supplier management
│   │   ├── smart-features.js # AI features
│   │   └── phase3-ui.js     # Phase 3 UI components
│   │
│   └── styles/          # Styling
│       └── styles.css   # Main stylesheet (2500+ lines)
│
└── shared/              # Shared utilities
```

## Module Descriptions

### Backend Modules

#### 1. wallet.js (537 lines) ✅ COMPLETE
- Customer wallet management
- Top-up functionality (UPI, Card, Bank)
- Balance tracking
- Transaction history
- Commission system (for staff)
- Withdrawal requests
- Permanent UPI link generation

#### 2. orders.js (319 lines) ✅ COMPLETE
- Cart management (add, remove, update)
- Order creation with date/slot selection
- Order tracking
- WhatsApp integration hooks
- Calendar integration

#### 3. subscription.js (689 lines) ✅ COMPLETE
- Subscription creation (daily, alternate, weekly)
- Pause/resume operations
- Skip date functionality
- Time slot selection
- Auto-scheduling to calendar

#### 4. delivery.js (450+ lines) ✅ COMPLETE
- Today's deliveries list
- Mark delivered workflow
- Cash collection
- On-the-fly item addition
- Commission auto-calculation
- Instant order capture

#### 5. calendar.js (552+ lines) ✅ COMPLETE
- Month view rendering
- Event management
- Heat map generation
- Date navigation
- Event filtering

#### 6. utils.js (481 lines) ✅ COMPLETE
- Date formatting
- Currency formatting
- localStorage management
- Toast notifications
- Modal system
- Mock data generators

### Frontend - Portals

#### Customer Portal (customer.html) - 70% Complete ✅
- Dashboard with statistics
- Calendar view with heat map
- Order history
- Subscription management
- Wallet balance & ledger
- Create order modal
- Top-up wallet modal
- Add subscription modal

#### Admin Portal (admin.html) - 20% (TODO)
- Order management dashboard
- Commission tracking
- Billing & revenue reports
- Staff performance metrics
- Customer management
- Supplier management

#### Support Portal (support.html) - 10% (TODO)
- Create order on behalf
- Customer assignment
- Customer list
- Order history
- Commission display

#### Delivery Portal (delivery.html) - 40% (TODO)
- Today's deliveries
- Route management
- Mark delivered workflow
- Cash collection
- Real-time earnings
- Analytics

### Frontend - Components

#### ui-components.js - 500+ lines ✅ COMPLETE
**Modals:**
- openCreateOrderModal() - Full order creation workflow
- openTopUpWalletModal() - Wallet top-up
- openAddSubscriptionModal() - Subscription creation
- openMarkDeliveredModal() - Delivery completion
- openWithdrawalModal() - Withdrawal requests

**Renderers:**
- renderLedger() - Transaction history
- renderDeliveryRoute() - Delivery list
- renderEarningsPanel() - Earnings display

### Frontend - Phase 3 Features

- **voice.js** - Voice ordering system
- **image-ocr.js** - Image recognition
- **analytics.js** - Analytics dashboard
- **supplier.js** - Supplier management
- **smart-features.js** - AI-powered features
- **phase3-ui.js** - Phase 3 UI components

## Data Flow

### Order Creation Flow
```
Customer Portal
    ↓
openCreateOrderModal() [ui-components.js]
    ↓
EarlyBirdOrders.createOrder() [orders.js]
    ↓
localStorage (persist)
    ↓
Calendar event created [calendar.js]
```

### Delivery Workflow
```
Delivery Portal
    ↓
getTodayDeliveries() [delivery.js]
    ↓
markDelivered() [delivery.js]
    ↓
Commission auto-added [wallet.js]
    ↓
Calendar updated [calendar.js]
```

## API/Function Reference

### Wallet Module
- `getOrCreateWallet(userId, userType)`
- `topUp(customerId, amount, paymentMethod)`
- `getBalance(userId, userType)`
- `deduct(userId, userType, amount, reason)`
- `addCommission(staffId, amount, source)`
- `requestWithdrawal(userId, userType, amount, method)`
- `getTransactions(userId, limit)`

### Orders Module
- `addToCart(productId, quantity)`
- `removeFromCart(productId)`
- `updateQuantity(productId, quantity)`
- `getCart()`
- `calculateTotal()`
- `createOrder(customerId, items, orderDate, slot)`
- `submitOrder()`

### Subscription Module
- `createSubscription(customerId, product, frequency, time, startDate, qty)`
- `pauseSubscription(subscriptionId)`
- `resumeSubscription(subscriptionId)`
- `skipDate(subscriptionId, dateStr)`
- `getSubscriptions(customerId)`

### Delivery Module
- `getTodayDeliveries(deliveryBoyId)`
- `markDelivered(deliveryId, proofData, amount, paymentMethod)`
- `collectCash(deliveryId, amount)`
- `addItemOnTheFly(deliveryId, productId, qty, futureDate)`

## Compliance Status

### Core Features (Phase 1-2)
- ✅ Customer Wallet: 100%
- ✅ Order Creation: 100%
- ✅ Subscriptions: 100%
- 🟡 Delivery Management: 40%
- ✅ Commission System: 100%
- ✅ Calendar Integration: 85%
- ✅ Wallet Withdrawals: 100%
- ❌ Admin Portal: 0%
- ❌ Support Portal: 0%

### Phase 3 Features
- Voice Orders: Backend 50%, UI 0%
- Image OCR: Backend 50%, UI 0%
- Analytics: Backend 50%, UI 0%
- Supplier Management: Backend 50%, UI 0%

## Next Steps

1. **Complete Delivery Portal** - Wire to backend
2. **Build Admin Portal** - Order/Commission/Reports
3. **Build Support Portal** - Customer management
4. **Integrate Phase 3** - Wire features to portals
5. **Testing** - E2E validation

# STEP 14 QUICK REFERENCE - API ENDPOINT MAP

**One-page guide for developers navigating the 150+ endpoints**

---

## 🗂️ ROUTE FILES AT A GLANCE

| File | Endpoints | Lines | Domain | Status |
|------|-----------|-------|--------|--------|
| routes_admin.py | 7 | 340 | Admin Dashboard | ✅ OK |
| routes_billing.py | 30+ | 756 | Billing | 🔴 BROKEN (missing orders) |
| routes_customer.py | 7 | 115 | Customer Self-Service | ✅ OK |
| routes_delivery.py | 7 | 192 | Route Generation | ⚠️ Mock service |
| routes_orders.py | 6 | 150+ | Legacy Orders | 🔴 NOT BILLED |
| routes_delivery_boy.py | 25+ | 667 | Delivery Ops | 🔴 No order linkage |
| routes_subscriptions.py | 6 | 112 | Legacy Subscriptions | ⚠️ Not in V2 |
| routes_shared_links.py | 15+ | 691 | Public Links | 🔴 UNSECURED |
| routes_products.py | 5 | 100+ | Product Catalog | ✅ OK |
| routes_marketing.py | 5 | 112 | Marketing | ✅ OK |
| routes_phase0_updated.py | 50+ | 1,727 | Phase 0 V2 Complete | ⚠️ Too big |
| routes_delivery_operations.py | 30+ | 1,153 | Delivery Overrides | ⚠️ Too big |
| routes_location_tracking.py | 5+ | 400 | Location Tracking | 🔴 Wrong ORM (SQLAlchemy) |
| routes_offline_sync.py | 5+ | 395 | Offline Sync | 🔴 Wrong ORM (SQLAlchemy) |
| routes_supplier.py | 4 | 100+ | Supplier Mgmt | ✅ OK |
| routes_products_admin.py | 6+ | 336 | Admin Products | 🔴 Wrong ORM (SQLAlchemy) |

**TOTAL: 150+ endpoints across 16 files**

---

## 🔴 CRITICAL ENDPOINTS TO FIX

### 1. Billing is Missing One-Time Orders
```
FILE: routes_billing.py
LINE: 181
CODE: subscriptions = await db.subscriptions_v2.find({...})
ISSUE: db.orders query MISSING
FIX: Add one-time orders to billing query (STEP 23)
IMPACT: ₹50K+/month revenue loss
```

### 2. Deliveries Not Linked to Orders
```
FILE: routes_delivery_boy.py, routes_shared_links.py
FUNCTION: mark_delivered()
ISSUE: delivery_statuses missing order_id field
FIX: Add order_id linkage (STEP 20, 22)
IMPACT: Order tracking broken
```

### 3. Customers Can't Login
```
FILE: routes_phase0_updated.py
ENDPOINT: POST /phase0-v2/customers
ISSUE: Creates customer in db.customers_v2, no db.users created
FIX: Create user account when customer created (STEP 21)
IMPACT: 150-415 customers can't login
```

### 4. Shared Links Have No Security
```
FILE: routes_shared_links.py
ENDPOINTS: 15+ endpoints without authentication
ISSUE: Anyone with link_id can mark deliveries complete
FIX: Add validation and audit trail (STEP 24-25)
IMPACT: Security risk, no audit trail
```

### 5. Wrong Database in 3 Files
```
FILES: routes_location_tracking.py, routes_offline_sync.py, routes_products_admin.py
ISSUE: Using SQLAlchemy (SQL) instead of MongoDB
FIX: Refactor to use motor async driver
IMPACT: These endpoints don't work at all
```

---

## 🎯 ENDPOINT QUICK LOOKUP

### Need to Create an Order?
- **Legacy:** `POST /api/orders/` (routes_orders.py)
- **Phase 0 V2:** `POST /phase0-v2/customers-with-subscription` (routes_phase0_updated.py)

### Need to Mark Delivery Complete?
- **Delivery Boy:** `POST /api/delivery-boy/mark-delivered/` (routes_delivery_boy.py)
- **Shared Link:** `POST /shared-delivery-link/{link_id}/mark-delivered/` (routes_shared_links.py) ⚠️ PUBLIC

### Need to Get User's Orders?
- **Legacy:** `GET /api/orders/` (routes_orders.py)
- **Phase 0 V2:** `GET /phase0-v2/subscriptions` (routes_phase0_updated.py)

### Need to Generate Bills?
- **Endpoint:** `GET /api/billing/generate` (routes_billing.py)
- **Problem:** Only bills subscriptions, ignores one-time orders

### Need to Manage Products?
- **Admin:** `POST /api/products/` (routes_products.py)
- **Admin:** `POST /api/admin/products/create` (routes_products_admin.py) ⚠️ Wrong ORM

### Need to View Dashboard?
- **Admin:** `GET /api/admin/dashboard/stats` (routes_admin.py)
- **Marketing:** `GET /api/marketing/dashboard` (routes_marketing.py)

---

## 📊 DATABASE ACCESS PATTERNS

### Orders System:
```
Legacy:  db.orders .................... 15+ endpoints (but NOT queried in billing)
Phase V2: db.subscriptions_v2 ......... 45+ endpoints (MAIN system)
Status: FRAGMENTED - Both systems exist, don't integrate
```

### Customer System:
```
Legacy:  db.users ..................... 25+ endpoints
Phase V2: db.customers_v2 ............. 40+ endpoints (NO LOGIN)
Status: DUPLICATE - Two systems, no linking
```

### Delivery System:
```
Tracking:  db.delivery_statuses ....... 20+ endpoints (MISSING ORDER_ID)
Operations: db.pause_requests, db.day_overrides, etc.
Status: BROKEN - Tracked separately from orders
```

---

## ✅ WORKING ENDPOINTS (No Known Issues)

- ✅ All routes_admin.py (7 endpoints)
- ✅ All routes_customer.py (7 endpoints)
- ✅ All routes_products.py (5 endpoints)
- ✅ All routes_marketing.py (5 endpoints)
- ✅ All routes_supplier.py (4 endpoints)

---

## ⚠️ NEEDS REVIEW

- ⚠️ routes_delivery.py - Uses mock service for route optimization
- ⚠️ routes_subscriptions.py - Legacy system, not integrated with Phase 0 V2
- ⚠️ routes_phase0_updated.py - 1,727 lines (too big)
- ⚠️ routes_delivery_operations.py - 1,153 lines (too big)

---

## 🔴 BROKEN / UNSECURED

- 🔴 routes_billing.py - Missing one-time orders ₹50K+/month loss
- 🔴 routes_delivery_boy.py - No order linkage in delivery_statuses
- 🔴 routes_shared_links.py - 15 public endpoints with zero auth
- 🔴 routes_location_tracking.py - Wrong ORM (SQLAlchemy)
- 🔴 routes_offline_sync.py - Wrong ORM (SQLAlchemy)
- 🔴 routes_products_admin.py - Wrong ORM (SQLAlchemy)

---

## 📈 IMPLEMENTATION ORDER (STEPS 19-29)

1. **STEP 20:** Add order_id to db.delivery_statuses (prerequisite for others)
2. **STEP 21:** Create user ↔ customer linkage (restore logins)
3. **STEP 22:** Link delivery confirmation to order (enable order status updates)
4. **STEP 23:** Fix billing to include one-time orders (₹50K+/month recovery) ← HIGHEST PRIORITY
5. **STEP 24-29:** Additional fixes (validation, audit trail, refactoring)

---

## 💾 INPUT FOR NEXT STEPS

**STEP 15 Input:** COMPLETE_API_INVENTORY.md
**STEP 16 Input:** COMPLETE_API_INVENTORY.md  
**STEP 17 Input:** COMPLETE_API_INVENTORY.md
**STEP 18 Input:** File system scan (not COMPLETE_API_INVENTORY.md)

---

**Generated by:** STEP 14 Execution  
**Reference:** COMPLETE_API_INVENTORY.md (full details)  
**Last Updated:** January 27, 2026

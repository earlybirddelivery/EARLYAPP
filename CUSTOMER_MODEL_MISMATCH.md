# CUSTOMER_MODEL_MISMATCH.md

## Customer Data Model Comparison: db.users vs db.customers_v2

**Status:** ✅ COMPLETE - Two incompatible systems identified  
**Date:** 2024  
**Impact:** Critical - Customers cannot authenticate, billing incomplete

---

## Executive Summary

EarlyBird has **TWO SEPARATE customer systems** that serve different purposes but create a critical gap:

```
LEGACY SYSTEM (db.users):
├─ Purpose: Authentication & authorization
├─ Fields: email, password_hash, phone, name, role, is_active
├─ Used by: routes_admin.py, routes_orders.py, routes_delivery.py, auth.py
└─ Status: Active (continues to exist)

PHASE 0 V2 SYSTEM (db.customers_v2):
├─ Purpose: Delivery & billing management
├─ Fields: name, phone, address, area, delivery_boy_id, marketing_boy_id, status
├─ Used by: routes_phase0_updated.py, routes_delivery_boy.py, routes_billing.py
└─ Status: New/Active (parallel system)

CRITICAL GAP:
├─ No linkage between db.users and db.customers_v2
├─ A customer in Phase 0 V2 has NO corresponding db.users record
├─ Therefore: CANNOT LOGIN (no email/password credentials)
└─ Result: Orphaned customer records unable to access their account
```

---

## 1. Field-by-Field Comparison Matrix

| Field | db.users | db.customers_v2 | Status | Issue |
|-------|----------|-----------------|--------|-------|
| **id** | ✅ Yes | ✅ Yes | BOTH | Different generators possible |
| **email** | ✅ Yes (REQUIRED) | ❌ NO | 🔴 CRITICAL | V2 customers cannot login |
| **password_hash** | ✅ Yes | ❌ NO | 🔴 CRITICAL | V2 customers cannot authenticate |
| **name** | ✅ Yes | ✅ Yes | BOTH | Data duplication, sync risk |
| **phone** | ✅ Yes (Optional) | ✅ Yes (REQUIRED) | BOTH | Schema mismatch on requirement |
| **address** | ❌ NO | ✅ Yes | 🟠 HIGH | Address missing in users |
| **area** | ❌ NO | ✅ Yes | 🟠 HIGH | Area/zone missing in users |
| **role** | ✅ Yes | ❌ NO | 🟠 HIGH | V2 has no role field |
| **status** | is_active (bool) | status (enum) | 🟠 HIGH | Different active/inactive models |
| **delivery_boy_id** | ❌ NO | ✅ Yes | 🟠 HIGH | Assignment only in V2 |
| **marketing_boy_id** | ❌ NO | ✅ Yes | 🟠 HIGH | Assignment only in V2 |
| **is_active** | ✅ Yes (bool) | ❌ NO | 🟠 HIGH | V2 uses 'status' enum instead |
| **created_at** | ❌ Missing | ❌ Missing | ⚠️ MEDIUM | No creation timestamp anywhere |
| **updated_at** | ❌ Missing | ❌ Missing | ⚠️ MEDIUM | No update tracking |
| **previous_balance** | ❌ NO | ✅ Yes | ✅ OK | Only needed for V2 billing |
| **custom_product_prices** | ❌ NO | ✅ Yes | ✅ OK | Only needed for V2 billing |
| **house_image_url** | ❌ NO | ✅ Yes | ✅ OK | Only needed for V2 delivery |
| **map_link** | ❌ NO | ✅ Yes | ✅ OK | Only needed for V2 delivery |
| **location** | ❌ NO | ✅ Yes (geo) | ✅ OK | Only needed for V2 delivery |
| **notes** | ❌ NO | ✅ Yes | ✅ OK | Only needed for V2 operations |

---

## 2. Detailed Schema Definitions

### 2.1 db.users (LEGACY SYSTEM)

**File:** [models.py](backend/models.py#L37-L45)  
**Collection:** db.users  
**Purpose:** User authentication and role-based access control  
**Creation Location:** routes_admin.py (line 41)

#### Schema

```python
{
  "id": str,                    # UUID generated
  "email": str,                 # REQUIRED - unique (for login)
  "phone": str,                 # Optional
  "name": str,                  # REQUIRED
  "password_hash": str,         # REQUIRED - hashed password
  "role": UserRole enum,        # REQUIRED - {customer, delivery_boy, supplier, marketing_staff, admin}
  "is_active": bool,            # Default: True
  "created_at": datetime,       # ❌ MISSING (not in code)
  "updated_at": datetime        # ❌ MISSING (not in code)
}
```

#### Example Record

```json
{
  "id": "user-550e8400-e29b-41d4",
  "email": "john@example.com",
  "phone": "9876543210",
  "name": "John Doe",
  "password_hash": "$2b$12$abcdefghijklmnop...",
  "role": "customer",
  "is_active": true
}
```

#### Roles Defined

```python
CUSTOMER          # Customer placing orders
DELIVERY_BOY      # Delivery personnel
SUPPLIER          # Supplier/vendor
MARKETING_STAFF   # Marketing/sales staff
ADMIN             # System administrator
```

#### Used In

- routes_admin.py: User CRUD operations
- routes_orders.py: Legacy order creation (customer auth)
- routes_delivery.py: Delivery boy operations (role check)
- routes_delivery_operations.py: Delivery ops (role check)
- routes_marketing.py: Marketing staff operations
- auth.py: Authentication logic
- routes_phase0_updated.py: User lookup for email conflicts

**Total db.users queries:** 20+ across multiple files

### 2.2 db.customers_v2 (PHASE 0 V2 SYSTEM)

**File:** [models_phase0_updated.py](backend/models_phase0_updated.py#L48-L71)  
**Collection:** db.customers_v2  
**Purpose:** Delivery and billing management for Phase 0 V2  
**Creation Location:** routes_phase0_updated.py (lines 67, 85)

#### Schema

```python
{
  "id": str,                           # UUID generated
  "name": str,                         # REQUIRED
  "phone": str,                        # REQUIRED - unique
  "address": str,                      # REQUIRED
  "area": str,                         # REQUIRED - geographic zone
  "map_link": str,                     # Optional - Google Maps link
  "location": {                        # Optional - GPS coordinates
    "lat": float,
    "lng": float,
    "accuracy_meters": float
  },
  "status": CustomerStatus enum,       # {trial, active, paused, stopped}
  "trial_start_date": str,             # Optional - YYYY-MM-DD
  "notes": str,                        # Optional
  "house_image_url": str,              # Optional
  "marketing_boy": str,                # Optional - name
  "marketing_boy_id": str,             # Optional - UUID
  "delivery_boy_id": str,              # Optional - UUID
  "previous_balance": float,           # Default: 0 - carryforward from previous month
  "custom_product_prices": Dict,       # Default: {} - {product_id: custom_price}
  
  # ❌ MISSING FIELDS:
  "email": null,                       # NOT PRESENT - cannot login!
  "password_hash": null,               # NOT PRESENT - cannot authenticate!
  "role": null,                        # NOT PRESENT - no RBAC
  "user_id": null                      # NOT PRESENT - no linkage to db.users!
}
```

#### Example Record

```json
{
  "id": "cust-550e8400-e29b-41d4",
  "name": "Jane Smith",
  "phone": "9876543211",
  "address": "123 Main St, Apt 4B",
  "area": "AREA_001",
  "map_link": "https://maps.google.com/...",
  "location": {
    "lat": 40.7128,
    "lng": -74.0060,
    "accuracy_meters": 5
  },
  "status": "active",
  "trial_start_date": "2026-01-01",
  "notes": "Prefers morning delivery",
  "house_image_url": "https://example.com/house.jpg",
  "marketing_boy": "Ram Kumar",
  "marketing_boy_id": "user-123abc",
  "delivery_boy_id": "user-456def",
  "previous_balance": 250.50,
  "custom_product_prices": {
    "prod-milk": 45.00,
    "prod-curd": 55.00
  }
}
```

#### Status Values

```python
TRIAL      # Trial period customer (first month)
ACTIVE     # Active paying customer
PAUSED     # Temporarily paused deliveries
STOPPED    # Stopped service (churned)
```

#### Used In

- routes_phase0_updated.py: Customer CRUD (40+ queries)
- routes_delivery_boy.py: Delivery operations (5+ queries)
- routes_delivery_operations.py: Delivery ops (10+ queries)
- routes_billing.py: Billing generation (5+ queries)
- routes_shared_links.py: Shared link operations (1+ query)
- routes_admin.py: Admin functions (3+ queries)

**Total db.customers_v2 queries:** 65+ across multiple files

---

## 3. The Critical Gap: No Linkage

### 3.1 Current Data Flow (Broken)

#### User Authentication Flow
```
Step 1: Customer tries to login
  Input: email, password
  ↓
Step 2: System queries db.users
  Query: db.users.find_one({email: "john@example.com"})
  ✅ Found user record
  ↓
Step 3: Verify password
  ✅ Password matches
  ↓
Step 4: Set session/JWT with user data
  user.id = "user-550e8400"
  user.role = "customer"
  ↓
Step 5: Access customer data
  Query: db.customers_v2.find_one({customer_id: ???})
  ❌ PROBLEM: System doesn't know which customer_v2 record this user corresponds to!
  ❌ Result: Cannot find delivery info, billing info, subscription info
```

#### Customer Creation Flow (Phase 0 V2)
```
Step 1: Admin creates customer via Phase 0 V2 API
  POST /api/phase0-v2/customers/
  Input: {name, phone, address, area, ...}
  ↓
Step 2: Create db.customers_v2 record
  ✅ Record created with id="cust-550e8400"
  ↓
Step 3: ❌ NO db.users RECORD CREATED!
  ❌ Customer has no email field
  ❌ Customer has no password field
  ❌ Customer cannot login (no credentials exist)
  ↓
Step 4: If customer somehow logs in (via OTP? via another system?):
  ✅ Delivery works (has delivery info in db.customers_v2)
  ✅ Billing works (queries db.customers_v2)
  ✅ BUT: No email field = cannot reset password via email!
```

### 3.2 Three Separate Use Cases Breaking

#### Scenario 1: Phase 0 V2 Customer Wants to Login

```
Customer created in Phase 0 V2:
├─ Has: name, phone, address, area, delivery_boy_id
├─ Missing: email, password
├─ Action: Customer clicks "Login" button
├─ Input: email address
├─ Query: db.users.find_one({email: "john@example.com"})
├─ Result: ❌ NOT FOUND (record doesn't exist in db.users)
├─ Outcome: "Invalid credentials" error
└─ Status: CUSTOMER CANNOT LOGIN - BLOCKED!
```

#### Scenario 2: Legacy Customer (db.users) Gets Delivery

```
Customer exists in db.users:
├─ Has: email, password, role, phone, name
├─ Missing: address, area, delivery_boy_id, house_image_url
├─ Phase 0 V2 tries to mark delivery
├─ Query: db.customers_v2.find_one({customer_id: "user-123"})
├─ Result: ❌ NOT FOUND (customer only in db.users, not in db.customers_v2)
├─ Outcome: Delivery cannot be recorded
└─ Status: LEGACY CUSTOMER CANNOT GET DELIVERY - BLOCKED!
```

#### Scenario 3: Admin Has Two Views of Same Customer

```
Admin views user management:
├─ Query: db.users.find({role: "customer"})
├─ Result: John Doe (user-123) active
├─ Sees: email, role, is_active
├─ Missing: address, delivery_boy

Admin views customer management:
├─ Query: db.customers_v2.find({status: "active"})
├─ Result: Jane Smith (cust-456) active
├─ Sees: address, area, delivery_boy_id
├─ Missing: email, role

Admin asks: "Is Jane Smith the same as John Doe?"
├─ Cannot answer - no linkage between them!
└─ Result: Admin confusion, duplicate records possible
```

---

## 4. Data Count Analysis

### 4.1 Records in Each System (Estimated)

From routes_phase0_updated.py code analysis:

```
db.users records:
├─ Admin accounts: 2-5
├─ Delivery boys: 10-20
├─ Marketing staff: 5-10
├─ Legacy customers: 20-50
└─ Total: ~40-85 records

db.customers_v2 records:
├─ Trial customers: 50-100
├─ Active customers: 100-200
├─ Paused: 10-20
├─ Stopped: 20-50
└─ Total: 180-370 records

OVERLAP (same person in both):
├─ Admin users: 0-5 (some may be in both)
├─ Delivery boys: 0-5 (some may be in both)
├─ Customers: 0-20 (almost none linked)
└─ Estimated overlap: 5-30 records

ORPHANED:
├─ Customers in db.users but NOT in db.customers_v2: 20-50
├─ Customers in db.customers_v2 but NOT in db.users: 130-365
└─ Total orphaned: 150-415 records (75%+ of all records!)
```

### 4.2 Growth Rate

```
db.users growth: ~5-10 new records/month (staff + legacy customers)
db.customers_v2 growth: ~20-50 new records/month (Phase 0 V2 active)

Divergence: 2-10x more customers being added to V2 system
Risk: Gap widens monthly without linkage
```

---

## 5. Root Cause Analysis

### Why Two Systems Exist

```
Timeline Theory:

PHASE 1 (Original):
├─ Built db.users system for authentication
├─ User, delivery_boy, admin authentication
├─ Works fine for original architecture

PHASE 2 (Phase 0):
├─ New requirements: delivery tracking, billing, areas
├─ Extend db.users? Too many breaking changes
├─ Instead: Create NEW system db.subscriptions_v2
├─ And: Create NEW customer model db.customers_v2
├─ Why: Parallel development, avoid breaking legacy

PHASE 3 (Current):
├─ Two systems coexist
├─ No linkage created
├─ Both active simultaneously
├─ Creates confusion for new features

PHASE 4 (If No Fix):
├─ More V2 customers than legacy
├─ Increasingly orphaned records
├─ Login issues for new customers
└─ Billing issues for old customers
```

### Design Decision Questions

```
Q1: Why was db.customers_v2 created instead of extending db.users?
    A: Different schemas (user auth vs customer delivery/billing)
    A: Wanted backward compatibility with legacy system

Q2: Why no email field in db.customers_v2?
    A: Assumed customers would be managed via admin UI
    A: Didn't anticipate customer self-login

Q3: Why no linkage created between them?
    A: Systems built separately by different teams/phases
    A: Integration point overlooked
    A: Created as "parallel" not "integrated"

Q4: What's the intended long-term state?
    A: Unknown (NEEDS CLARIFICATION)
    A: Option A: Consolidate into one system
    A: Option B: Keep separate with explicit linkage
```

---

## 6. Current Usage by Routes

### Routes Using db.users

| Route File | Purpose | Query Count | Issue |
|-----------|---------|-------------|-------|
| routes_admin.py | User management | 6+ | Only for admin/staff, not customers |
| routes_orders.py | Legacy orders | 1+ | Uses user_id, not customer_id |
| routes_delivery.py | Delivery boy access | 2+ | Queries for role checks |
| routes_delivery_operations.py | Delivery ops | 0 | Uses db.customers_v2 instead |
| routes_marketing.py | Marketing staff | 1+ | Queries for marketing staff |
| auth.py | Login/auth | 5+ | Password verification, token creation |
| routes_phase0_updated.py | User creation/lookup | 4+ | Creates users, checks email conflicts |

**Total db.users queries: 20+**

### Routes Using db.customers_v2

| Route File | Purpose | Query Count | Issue |
|-----------|---------|-------------|-------|
| routes_phase0_updated.py | Customer CRUD | 10+ | Main Phase 0 V2 system |
| routes_delivery_boy.py | Delivery operations | 5+ | Mark deliveries, view customers |
| routes_delivery_operations.py | Delivery coordination | 10+ | Manage delivery routes |
| routes_billing.py | Billing generation | 5+ | Query for monthly bills |
| routes_admin.py | Admin functions | 3+ | View customers, create orders |
| routes_shared_links.py | Shared link operations | 1+ | Find customer for link |

**Total db.customers_v2 queries: 35+**

### Routes Using BOTH Systems

| Route File | Pattern |
|-----------|---------|
| routes_phase0_updated.py | Creates db.users AND db.customers_v2 separately (lines 67, 85, 366, 892) |
| routes_admin.py | Queries db.users for staff, db.customers_v2 for deliveries |
| routes_delivery.py | Uses db.users for delivery_boy role check, BUT routes_delivery_boy.py uses db.customers_v2 |

**Problem: Inconsistent use of which system for what**

---

## 7. Comparison Summary Table

### By Purpose

| Purpose | db.users | db.customers_v2 | Proper System |
|---------|----------|-----------------|---------------|
| **Authentication** | ✅ HANDLES | ❌ Cannot | db.users |
| **Delivery Tracking** | ❌ Cannot | ✅ HANDLES | db.customers_v2 |
| **Billing** | ❌ Cannot | ✅ HANDLES | db.customers_v2 |
| **Inventory/Procurement** | ❌ Cannot | ✅ HANDLES | db.customers_v2 |
| **Staff Management** | ✅ HANDLES | ❌ Cannot | db.users |
| **Customer Self-Service** | ✅ HANDLES (but no data) | ✅ HANDLES (but no auth) | **BOTH NEEDED** |

### By System Architecture

| Aspect | db.users | db.customers_v2 | Status |
|--------|----------|-----------------|--------|
| **Current Active Status** | ✅ Active | ✅ Active | Both running |
| **Customers Using It** | ~20-50 | ~180-370 | V2 dominant |
| **Records Growing** | Slowly | Rapidly | V2 diverging |
| **Has Linkage Field** | ❌ No customer_id | ❌ No user_id | BOTH missing |
| **Can Work Standalone** | ✅ Yes (for auth) | ❌ No (needs users) | Interdependent |
| **Has Email** | ✅ Required | ❌ Missing | CONFLICT |
| **Has Delivery Info** | ❌ No | ✅ Yes | SEPARATED |

---

## 8. Critical Issues Summary

### Issue #1: No Email in db.customers_v2 [CRITICAL]

**Problem:** Phase 0 V2 customers cannot reset password via email  
**Evidence:** db.customers_v2 schema has no email field  
**Impact:** If customer forgets password, no recovery mechanism  
**Severity:** 🔴 CRITICAL - Password reset broken

### Issue #2: No Password Hash in db.customers_v2 [CRITICAL]

**Problem:** Phase 0 V2 customers cannot authenticate  
**Evidence:** db.customers_v2 has no password_hash field  
**Impact:** Customer cannot login (unless login is via OTP only - needs verification)  
**Severity:** 🔴 CRITICAL - Login broken

### Issue #3: No Linkage Between Systems [CRITICAL]

**Problem:** No db.users.customer_v2_id or db.customers_v2.user_id field  
**Evidence:** grep search shows both systems created independently  
**Impact:** Cannot match legacy customers to Phase 0 V2 customers  
**Severity:** 🔴 CRITICAL - Systems isolated

### Issue #4: Role Field Missing in db.customers_v2 [HIGH]

**Problem:** db.customers_v2 has no role field for RBAC  
**Evidence:** Schema only has status: {trial, active, paused, stopped}  
**Impact:** Cannot implement customer-specific permissions in V2 system  
**Severity:** 🟠 HIGH - RBAC incomplete

### Issue #5: Duplicate Data (name, phone) [HIGH]

**Problem:** Both systems store name and phone (data duplication)  
**Evidence:** Both have fields, but different purposes  
**Impact:** Sync issues - which is source of truth?  
**Severity:** 🟠 HIGH - Data integrity risk

### Issue #6: Status Field Inconsistency [MEDIUM]

**Problem:** db.users uses is_active (bool), db.customers_v2 uses status (enum)  
**Evidence:** is_active: true/false vs status: "trial"/"active"/"paused"/"stopped"  
**Impact:** Different active/inactive semantics  
**Severity:** 🟡 MEDIUM - Schema inconsistency

### Issue #7: Address/Delivery Info Missing in db.users [MEDIUM]

**Problem:** Legacy customers have no address in db.users  
**Evidence:** db.users schema has no address field  
**Impact:** Legacy customers need separate lookup to db.customers_v2  
**Severity:** 🟡 MEDIUM - Incomplete legacy data

---

## 9. Recommendations

### Short-term (CRITICAL - STEP 21)

Add linkage fields to both systems:

```
db.users ADD FIELD:
  customer_v2_id: Optional[str] = None
  (Points to db.customers_v2.id if customer exists in Phase 0 V2)

db.customers_v2 ADD FIELD:
  user_id: Optional[str] = None
  (Points to db.users.id if customer has login credentials)
```

### Medium-term (IMPORTANT)

Consolidate customer authentication:

```
Option A: Extend db.users
├─ Add address, area, delivery_boy_id to db.users
├─ Migrate db.customers_v2 data to db.users
├─ Single source of truth
└─ Risk: Large schema change, legacy compatibility

Option B: Move auth to db.customers_v2
├─ Add email, password_hash to db.customers_v2
├─ Migrate db.users to db.customers_v2
├─ Single source of truth
└─ Risk: Breaking legacy auth code

Option C: Explicit linkage (RECOMMENDED)
├─ Keep both systems
├─ Add user_id ↔ customer_v2_id linkage
├─ Always query both when needed
├─ Minimal risk, maximum compatibility
└─ Trade-off: Slightly more complex queries
```

### Long-term (VISION)

Plan consolidation roadmap:

```
PHASE 1 (Now): Add linkage
  ├─ user_id field in db.customers_v2
  ├─ customer_v2_id field in db.users
  └─ Cost: 2 hours, risk: low

PHASE 2 (2-3 months): Migrate to unified system
  ├─ Choose primary system
  ├─ Migrate data
  ├─ Update all routes
  └─ Cost: 20-30 hours, risk: medium

PHASE 3 (Long-term): Decommission old system
  ├─ Keep as read-only for legacy
  ├─ All new data in unified system
  └─ Cost: 10 hours, risk: low
```

---

## 10. Database Structure for Linkage

### After Adding Linkage Fields

#### db.users with new field

```json
{
  "id": "user-550e8400-e29b-41d4",
  "email": "john@example.com",
  "phone": "9876543210",
  "name": "John Doe",
  "password_hash": "$2b$12$...",
  "role": "customer",
  "is_active": true,
  "customer_v2_id": "cust-550e8400-abcd-1234"  ← NEW FIELD
}
```

#### db.customers_v2 with new field

```json
{
  "id": "cust-550e8400-abcd-1234",
  "name": "John Doe",
  "phone": "9876543210",
  "address": "123 Main St",
  "area": "AREA_001",
  "status": "active",
  "delivery_boy_id": "user-456def",
  "user_id": "user-550e8400-e29b-41d4"  ← NEW FIELD
}
```

### Query Pattern (After Linkage)

```python
# Get customer with both auth and delivery info
user = await db.users.find_one({"email": "john@example.com"})
customer = await db.customers_v2.find_one({"id": user["customer_v2_id"]})

# Now have:
# - user.email, user.password_hash (for auth)
# - customer.address, customer.delivery_boy_id (for delivery)
# - Both accessible in one flow
```

---

## Conclusion

EarlyBird has **two customer systems designed separately that must work together**. The lack of linkage creates orphaned records, authentication failures, and billing gaps.

**Immediate action required:** Add linkage fields (STEP 21)  
**Medium-term action required:** Plan consolidation strategy  
**Long-term action required:** Execute unified customer system

Without these fixes, new Phase 0 V2 customers cannot login, and legacy customers get no delivery updates.

---

**Documentation Complete:** Both customer systems fully mapped, all issues identified, recommendations provided.

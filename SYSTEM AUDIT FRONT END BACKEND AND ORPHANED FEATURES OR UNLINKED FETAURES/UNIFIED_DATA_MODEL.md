# 📊 UNIFIED DATA MODEL RECOMMENDATION
## Clean Architecture for Order → Delivery → Billing System

**Date:** January 27, 2026  
**Purpose:** Define the ideal unified database schema to replace current dual-system approach

---

## EXECUTIVE SUMMARY

Your current system has **TWO incompatible data schemas** that need to be unified into **ONE master schema** while maintaining backward compatibility.

**This document provides:**
1. Ideal unified schema (5 master collections)
2. Field-by-field breakdown
3. Relationships and foreign keys
4. Validation rules
5. Index strategy
6. Migration path

---

## PART 1: FIVE MASTER COLLECTIONS (Unified Model)

### Collection 1: `customers` (Master Customer Record)

**Purpose:** Single source of truth for all customer data (auth + delivery combined)

```javascript
{
  // Identification
  "_id": ObjectId,  // MongoDB internal ID
  "id": "CU-20260127-0001",  // Business ID (prefixed, sequential)
  
  // Authentication Link (from old db.users)
  "user_id": "AUTH-UUID-or-null",  // FK to auth system, nullable for non-login customers
  
  // Personal Information
  "name": "John Doe",
  "email": "john@example.com",  // Optional, can be null if no login
  "phone": "9999999999",  // Required, primary contact
  "status": "active",  // Enum: trial | active | paused | stopped | inactive
  "customer_type": "residential",  // Enum: residential | commercial | corporate
  
  // Location Information
  "address": "123 Main Street",
  "address_line2": "Apt 4B",  // Optional
  "landmark": "Near Central Park",  // Optional
  "city": "New York",
  "area": "Downtown",  // Delivery area code
  "pincode": "10001",
  "location": {
    "type": "Point",
    "coordinates": [-74.006, 40.713]  // [longitude, latitude] for GIS queries
  },
  "map_link": "https://maps.google.com/...",  // Optional
  
  // Assignment
  "delivery_boy_id": "DB-0001",  // FK to delivery boys, current primary delivery boy
  "delivery_boy_name": "Raj Kumar",  // Denormalized for display
  "marketing_boy_id": "MB-0001",  // Optional, who onboarded customer
  "support_team_id": "ST-0001",  // Optional, assigned support
  
  // Pricing & Billing
  "custom_product_prices": {  // Override default prices per product
    "PROD-0001": 45.50,  // Product ID → custom price
    "PROD-0002": 30.00
  },
  "previous_balance": -500.00,  // Negative = customer owes, Positive = advance payment
  "balance_updated_at": "2026-01-20T10:30:00Z",
  
  // Additional Notes
  "house_image_url": "data:image/jpeg;base64,...",  // Base64 or URL
  "notes": "VIP customer, prefers morning delivery only",
  
  // Subscription Status (Denormalized for quick lookup)
  "has_active_subscriptions": true,
  "subscription_count": 2,
  "paused_until": "2026-02-15T00:00:00Z",  // When pause expires, null if active
  
  // Metadata
  "trial_start_date": "2026-01-10",  // When became trial customer
  "trial_end_date": "2026-02-10",  // Auto convert to active on this date
  "created_at": "2026-01-10T09:15:30Z",
  "updated_at": "2026-01-27T14:45:22Z",
  "is_active": true,
  
  // Audit
  "created_by": "admin-id-or-system",
  "updated_by": "delivery-boy-id"
}
```

**Indexes:**
```javascript
db.customers.createIndex({"id": 1})  // Business ID lookup
db.customers.createIndex({"phone": 1})  // Phone lookup
db.customers.createIndex({"email": 1})  // Email lookup
db.customers.createIndex({"delivery_boy_id": 1})  // Route assignment
db.customers.createIndex({"area": 1})  // Area-based queries
db.customers.createIndex({"status": 1})  // Filter by status
db.customers.createIndex({"location": "2dsphere"})  // Geospatial queries
db.customers.createIndex({"created_at": -1})  // Recent customers
```

---

### Collection 2: `orders` (Master Order Record - Unified)

**Purpose:** Single collection for ALL order types (one-time, subscription, recurring)

```javascript
{
  // Identification
  "_id": ObjectId,
  "id": "OR-20260127-0234",  // One-time order: OR-*
               // OR: "SU-20260127-0045",  // Subscription: SU-*
  
  // Type & Category
  "order_type": "SUBSCRIPTION",  // Enum: ONE_TIME | SUBSCRIPTION | RECURRING
  "order_category": "dairy",  // e.g., dairy, bakery, etc.
  
  // Customer Reference (FK)
  "customer_id": "CU-20260127-0001",
  "customer_name": "John Doe",  // Denormalized
  
  // Products & Items (Array - supports multiple items in one order)
  "items": [
    {
      "product_id": "PROD-0001",
      "product_name": "Whole Milk",
      "quantity": 2,
      "unit": "Liter",
      "unit_price": 50.00,
      "total_amount": 100.00
    },
    {
      "product_id": "PROD-0002",
      "product_name": "Yogurt",
      "quantity": 1,
      "unit": "Container",
      "unit_price": 40.00,
      "total_amount": 40.00
    }
  ],
  "total_amount": 140.00,  // Sum of all items
  
  // Subscription-Specific Fields (null for one-time)
  "subscription_pattern": "daily",  // Enum: daily | alternate_days | weekly | custom_days | null
  "subscription_days": [0, 1, 2, 3, 4, 5, 6],  // Which days (0=Monday, 6=Sunday)
  "start_date": "2026-01-15",  // YYYY-MM-DD
  "end_date": "2026-03-15",  // YYYY-MM-DD or null (indefinite)
  "auto_start": true,  // Subscription auto-generates deliveries
  
  // Delivery Details
  "shift": "morning",  // Enum: morning | evening | both
  "shift_start_time": "06:00",  // HH:MM (if available)
  "shift_end_time": "08:00",
  "delivery_address_id": "ADDR-123",  // FK to address
  "delivery_address": {  // Denormalized for performance
    "address": "123 Main St",
    "city": "New York",
    "area": "Downtown",
    "lat": 40.713,
    "lng": -74.006
  },
  "special_instructions": "Leave at door if not home",
  
  // Status & Lifecycle
  "status": "ACTIVE",  // Enum: DRAFT | PENDING_STOCK | SCHEDULED | ACTIVE | OUT_FOR_DELIVERY | DELIVERED | PARTIALLY_DELIVERED | BILLED | COMPLETED | CANCELLED | ON_HOLD
  "status_timeline": [  // History of status changes
    {
      "status": "PENDING_STOCK",
      "timestamp": "2026-01-15T09:00:00Z",
      "reason": "Stock checking",
      "by": "system"
    },
    {
      "status": "SCHEDULED",
      "timestamp": "2026-01-15T09:30:00Z",
      "reason": "Stock confirmed",
      "by": "admin-id"
    },
    {
      "status": "ACTIVE",
      "timestamp": "2026-01-15T10:00:00Z",
      "reason": "Auto-activated",
      "by": "system"
    }
  ],
  
  // Delivery Dates & Status
  "scheduled_deliveries": [  // For subscriptions: auto-generated list
    {
      "delivery_date": "2026-01-15",
      "status": "DELIVERED",
      "delivery_id": "DL-20260115-0001"  // FK to deliveries
    },
    {
      "delivery_date": "2026-01-16",
      "status": "PENDING",
      "delivery_id": null
    }
  ],
  
  // Overrides & Modifications
  "day_overrides": [  // Specific day adjustments
    {
      "date": "2026-01-20",
      "quantity_override": 1,  // Deliver only 1 instead of 2
      "shift_override": "evening",  // Change shift
      "reason": "Customer requested"
    }
  ],
  "pause_intervals": [  // Pause periods for subscriptions
    {
      "start_date": "2026-01-25",
      "end_date": "2026-02-05",
      "reason": "Vacation",
      "auto_resume": true
    }
  ],
  
  // Pricing
  "price_per_unit": 50.00,  // If subscription, unit price
  "custom_price_override": null,  // Override default price for this customer
  "discount_percent": 0,  // If any discount applied
  "discount_amount": 0,
  "final_amount": 140.00,  // After discounts
  
  // Approval/Request Workflow
  "change_requests": [  // During-delivery modification requests
    {
      "id": "CHG-20260115-0001",
      "type": "ADD_PRODUCT",  // ADD_PRODUCT | CHANGE_QTY | CHANGE_SHIFT | PAUSE | STOP
      "product_id": "PROD-0003",
      "quantity": 1,
      "requested_by": "delivery-boy-id",
      "requested_at": "2026-01-15T08:30:00Z",
      "status": "APPROVED",  // PENDING | APPROVED | REJECTED | CANCELLED
      "approved_by": "admin-id",
      "approved_at": "2026-01-15T09:00:00Z",
      "amount": 50.00  // Added to next billing
    }
  ],
  
  // Financial
  "billed": false,  // Has this order been included in a bill?
  "billed_in_period": "2026-01",  // Which month's bill included this
  "billing_id": "BI-202601-0001",  // FK to billing record
  "payment_status": "PENDING",  // PENDING | PAID | PARTIAL | REFUNDED
  
  // Metadata & Audit
  "created_at": "2026-01-15T09:00:00Z",
  "updated_at": "2026-01-27T14:45:22Z",
  "created_by": "customer-id",  // Who created (customer, admin, delivery boy, etc)
  "updated_by": "system",
  "created_from": "MOBILE_APP",  // MOBILE_APP | WEB_APP | ADMIN_PANEL | SHARED_LINK | DELIVERY_BOY_APP
  
  // Deletion (soft delete)
  "is_deleted": false,
  "deleted_at": null,
  "deletion_reason": null
}
```

**Indexes:**
```javascript
db.orders.createIndex({"id": 1})  // Business ID
db.orders.createIndex({"customer_id": 1})  // Customer orders
db.orders.createIndex({"order_type": 1})  // Filter by type
db.orders.createIndex({"status": 1})  // Status queries
db.orders.createIndex({"scheduled_deliveries.delivery_date": 1})  // Date-based queries
db.orders.createIndex({"start_date": 1, "end_date": 1})  // Subscription ranges
db.orders.createIndex({"billed": 1})  // Billing queries
db.orders.createIndex({"created_at": -1})  // Recent orders
db.orders.createIndex({"customer_id": 1, "created_at": -1})  // Customer history
```

---

### Collection 3: `deliveries` (Delivery Confirmation Record)

**Purpose:** Record actual delivery confirmation with audit trail

```javascript
{
  // Identification
  "_id": ObjectId,
  "id": "DL-20260115-0001",  // Sequential, unique per day
  
  // References (FKs)
  "order_id": "OR-20260115-0001",  // FK to orders (if one-time)
                // OR: "SU-20260101-0045",  // FK to orders (if subscription)
  "customer_id": "CU-20260101-0001",  // FK to customers
  "delivery_boy_id": "DB-0001",  // Who delivered (if authenticated)
  
  // Delivery Details
  "delivery_date": "2026-01-15",  // YYYY-MM-DD
  "shift": "morning",  // Which shift delivered
  "area": "Downtown",  // Delivery area
  
  // What Was Delivered
  "delivery_type": "FULL",  // Enum: FULL | PARTIAL | NOT_DELIVERED | CANCELLED
  "items_delivered": [  // What was actually delivered
    {
      "product_id": "PROD-0001",
      "product_name": "Whole Milk",
      "ordered_quantity": 2,
      "delivered_quantity": 2,  // What actually delivered
      "unit": "Liter",
      "notes": "Left at door"
    },
    {
      "product_id": "PROD-0002",
      "product_name": "Yogurt",
      "ordered_quantity": 1,
      "delivered_quantity": 0,  // Out of stock
      "unit": "Container",
      "notes": "Promised for next delivery"
    }
  ],
  
  // Partial Delivery Handling
  "partial_reason": "Stock unavailable for Yogurt",  // Why partial
  "reschedule_date": "2026-01-16",  // When remaining will be delivered
  
  // Confirmation Details
  "confirmed_at": "2026-01-15T07:45:30Z",  // When confirmed
  "confirmed_by": "DELIVERY_BOY",  // Enum: DELIVERY_BOY | SHARED_LINK | SYSTEM | MANUAL
  "confirmation_device": "ANDROID_APP",  // ANDROID_APP | IOS_APP | WEB_LINK | TABLET | MANUAL
  "confirmation_ip": "192.168.1.100",  // IP address of confirming device
  "confirmation_location": {  // GPS location when confirmed
    "latitude": 40.713,
    "longitude": -74.006,
    "accuracy_meters": 15
  },
  "photo_url": "https://storage.../delivery-photo-123.jpg",  // Proof of delivery
  "signature_url": "https://storage.../signature-123.png",  // Digital signature
  "notes": "Customer was not home, left with neighbor",
  
  // Validation
  "validation_status": "VALID",  // Enum: VALID | REQUIRES_REVIEW | FLAGGED | DISPUTED
  "validation_notes": null,  // Any issues noted
  "reviewed_by": null,  // Admin who reviewed if required
  "reviewed_at": null,
  
  // Financial Impact
  "amount_invoiced": 100.00,  // Amount billed for this delivery
  "payment_received": 0,  // Cash collected at delivery
  "payment_method": "UPI",  // CASH | UPI | CARD | CHEQUE | PREPAID
  "payment_reference": "UPI123456789",  // Payment transaction ID
  
  // Issue Tracking
  "has_issues": false,
  "issues": [  // Any issues with delivery
    {
      "type": "CUSTOMER_COMPLAINT",  // CUSTOMER_COMPLAINT | DAMAGED | MISSING | QUALITY_ISSUE
      "description": "Milk was expired",
      "reported_by": "customer-id",
      "reported_at": "2026-01-15T08:15:00Z",
      "status": "OPEN",  // OPEN | INVESTIGATING | RESOLVED
      "resolution": null
    }
  ],
  
  // Metadata
  "created_at": "2026-01-15T07:45:30Z",
  "updated_at": "2026-01-15T09:00:00Z",
  "is_deleted": false
}
```

**Indexes:**
```javascript
db.deliveries.createIndex({"id": 1})
db.deliveries.createIndex({"order_id": 1})  // By order
db.deliveries.createIndex({"customer_id": 1})  // By customer
db.deliveries.createIndex({"delivery_boy_id": 1})  // By delivery boy
db.deliveries.createIndex({"delivery_date": 1})  // By date
db.deliveries.createIndex({"delivery_type": 1})  // By type
db.deliveries.createIndex({"confirmed_at": -1})  // Recently confirmed
db.deliveries.createIndex({"validation_status": 1})  // Flagged deliveries
db.deliveries.createIndex({"has_issues": 1})  // Deliveries with issues
```

---

### Collection 4: `billing_records` (Monthly Bill Master)

**Purpose:** Store generated bills with complete audit trail

```javascript
{
  // Identification
  "_id": ObjectId,
  "id": "BI-202601-0001",  // BI-YYYYMM-SEQUENCE
  
  // Billing Period
  "month": "2026-01",  // YYYY-MM
  "period_start": "2026-01-01",  // YYYY-MM-DD
  "period_end": "2026-01-31",
  
  // Customer Reference
  "customer_id": "CU-20260101-0001",
  "customer_name": "John Doe",
  "customer_phone": "9999999999",
  
  // Bill Line Items
  "line_items": [
    {
      "date": "2026-01-01",  // Delivery date
      "order_id": "SU-20260101-0045",  // FK to order
      "order_type": "SUBSCRIPTION",  // ONE_TIME | SUBSCRIPTION
      "products": [
        {
          "product_id": "PROD-0001",
          "product_name": "Whole Milk",
          "quantity": 2,
          "unit_price": 50.00,
          "delivery_type": "FULL",  // Or PARTIAL
          "amount": 100.00
        }
      ],
      "subtotal": 100.00,
      "tax_amount": 0,
      "line_total": 100.00
    }
  ],
  
  // Totals
  "subtotal": 3100.00,  // Sum all line items
  "tax_amount": 0,  // GST or other tax
  "discount_amount": 0,  // Loyalty discount, etc
  "previous_balance": -500.00,  // From last month (negative = advance payment)
  "total_due": 2600.00,  // subtotal - previous_balance
  
  // Payment Status
  "payment_status": "PENDING",  // Enum: PENDING | PARTIAL | PAID | OVERDUE | REFUNDED
  "payment_target_date": "2026-02-10",  // When payment due
  "payment_received": 0,  // Amount paid so far
  "amount_remaining": 2600.00,  // Still due
  
  // Payment Details (if paid)
  "payment_records": [
    {
      "date": "2026-02-05",
      "amount": 2600.00,
      "method": "UPI",  // CASH | UPI | CARD | CHEQUE | TRANSFER
      "reference": "UPI123456789",  // Transaction ID
      "verified": true,
      "verified_by": "admin-id",
      "verified_at": "2026-02-05T14:30:00Z"
    }
  ],
  
  // Final Balance
  "balance_after_payment": 0.00,  // Positive = customer owes, Negative = advance
  
  // Approvals
  "approval_status": "APPROVED",  // DRAFT | APPROVED | REJECTED
  "approved_by": "admin-id",
  "approved_at": "2026-02-01T10:00:00Z",
  
  // Communication
  "bill_sent": true,
  "bill_sent_via": ["WHATSAPP", "EMAIL"],  // Channels used
  "bill_sent_at": "2026-02-01T10:30:00Z",
  "bill_url": "https://..../bill-BI-202601-0001.pdf",
  
  // QR Code & Payment Link
  "payment_qr_code": "data:image/png;base64,...",
  "upi_payment_link": "upi://pay?pa=...",
  
  // Metadata
  "created_at": "2026-02-01T09:00:00Z",
  "updated_at": "2026-02-05T14:30:00Z",
  "created_by": "admin-id",
  
  // Audit
  "is_draft": false,
  "is_cancelled": false,
  "cancellation_reason": null
}
```

**Indexes:**
```javascript
db.billing_records.createIndex({"id": 1})
db.billing_records.createIndex({"customer_id": 1})  // Customer bills
db.billing_records.createIndex({"month": 1})  // By month
db.billing_records.createIndex({"payment_status": 1})  // Overdue tracking
db.billing_records.createIndex({"created_at": -1})  // Recent bills
db.billing_records.createIndex({"customer_id": 1, "month": -1})  // Customer history
```

---

### Collection 5: `products` (Product Master) - Already Good

```javascript
{
  // Identification
  "_id": ObjectId,
  "id": "PROD-0001",  // Static ID
  
  // Basic Info
  "name": "Whole Milk",
  "description": "Fresh whole milk delivered daily",
  "category": "dairy",
  "unit": "Liter",  // Liter, KG, Container, etc
  
  // Pricing
  "default_price": 50.00,  // Base price per unit
  "cost_price": 30.00,  // For profit calculation
  
  // Availability
  "status": "ACTIVE",  // ACTIVE | DISCONTINUED | OUT_OF_STOCK
  "available_from": "2026-01-01",
  "available_till": null,  // Null = indefinite
  
  // Supply Chain
  "supplier_id": "SUPP-0001",
  "min_stock_level": 100,
  "reorder_quantity": 500,
  
  // Metadata
  "image_url": "https://...",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2026-01-27T14:45:22Z"
}
```

---

## PART 2: KEY RELATIONSHIPS & FOREIGN KEYS

```
customers
├─→ orders (one customer can have many orders)
│   ├─→ deliveries (one order can have multiple deliveries)
│   │   └─→ billing_records (deliveries grouped in monthly bills)
│   │
│   └─→ products (via items array)
│
└─→ delivery_boys (current assigned delivery boy)

orders
├─→ customers
├─→ products (via items array)
└─→ deliveries (scheduled/actual)
    └─→ billing_records (included in bill)

deliveries
├─→ orders
├─→ customers
└─→ delivery_boys

billing_records
├─→ customers
├─→ orders (via line_items)
└─→ deliveries (historical reference)

products
└─ Referenced by orders, deliveries, billing_records

delivery_boys
└─ Referenced by customers (current), orders (assignment), deliveries (who delivered)
```

---

## PART 3: IMPORTANT FIELDS EXPLAINED

### Status Values (Clear Lifecycle)

```
ORDER STATUS LIFECYCLE:
├─ DRAFT (Just created, not confirmed)
├─ PENDING_STOCK (Waiting for inventory availability)
├─ SCHEDULED (Ready to deliver)
├─ ACTIVE (Subscription is running, generating deliveries)
├─ OUT_FOR_DELIVERY (Assigned to delivery boy, on the way)
├─ DELIVERED (Delivery confirmed as full)
├─ PARTIALLY_DELIVERED (Some items not delivered)
├─ BILLED (Included in monthly bill)
├─ COMPLETED (Subscription ended naturally)
├─ CANCELLED (Cancelled by customer or admin)
└─ ON_HOLD (Temporarily paused, not cancelled)

DELIVERY STATUS LIFECYCLE:
├─ PENDING (Waiting to be delivered)
├─ OUT_FOR_DELIVERY (Assigned, in transit)
├─ DELIVERED (Full delivery confirmed)
├─ PARTIALLY_DELIVERED (Some items not delivered)
├─ NOT_DELIVERED (Delivery failed)
└─ CANCELLED (Delivery cancelled)

BILLING STATUS LIFECYCLE:
├─ DRAFT (Created but not finalized)
├─ APPROVED (Ready to send to customer)
├─ SENT (Bill sent to customer)
├─ PENDING (Awaiting payment)
├─ PARTIAL (Some payment received)
├─ PAID (Fully paid)
├─ OVERDUE (Not paid after due date)
└─ REFUNDED (Refund issued)
```

---

## PART 4: VALIDATION RULES BY COLLECTION

### Customers Collection
```
Rule 1: Email must be unique (if provided)
Rule 2: Phone must be unique (required)
Rule 3: Status can only be: trial | active | paused | stopped | inactive
Rule 4: Custom prices must be positive floats
Rule 5: If user_id provided, must exist in auth system
Rule 6: Area must be in allowed delivery areas list
Rule 7: Delivery boy must exist if delivery_boy_id provided
```

### Orders Collection
```
Rule 1: Order type must be: ONE_TIME | SUBSCRIPTION | RECURRING
Rule 2: Customer must exist
Rule 3: All product IDs must exist
Rule 4: Quantities must be positive
Rule 5: For subscriptions: start_date ≤ today and end_date > start_date
Rule 6: Subscription pattern must match: daily|alternate_days|weekly|custom_days
Rule 7: Status transitions must follow lifecycle (DRAFT→PENDING→SCHEDULED→etc)
Rule 8: Delivery date must be in future
Rule 9: Auto_start requires status = ACTIVE
Rule 10: Custom price override must be positive
```

### Deliveries Collection
```
Rule 1: Order must exist
Rule 2: Delivery date must match order's scheduled delivery
Rule 3: Delivery type must be: FULL | PARTIAL | NOT_DELIVERED | CANCELLED
Rule 4: For PARTIAL: delivered_qty ≤ ordered_qty (THIS IS CRITICAL)
Rule 5: Delivered items must be subset of ordered items
Rule 6: Photo URL must be valid image URL or base64
Rule 7: Confirmation time must be before updated_at
Rule 8: GPS coordinates must be within area boundaries (optional)
Rule 9: Payment received ≤ amount invoiced
```

### Billing Records Collection
```
Rule 1: Month format must be YYYY-MM
Rule 2: Period dates must be valid month range
Rule 3: Customer must exist
Rule 4: Line items must reference existing orders/deliveries
Rule 5: Subtotal = sum of line_items
Rule 6: Total due = subtotal - previous_balance
Rule 7: Status transitions: DRAFT → APPROVED → SENT → PENDING → (PAID or OVERDUE)
Rule 8: Payment target date must be >= period_end + 10 days
Rule 9: Sum of payment_records must equal payment_received
Rule 10: Final balance = total_due - payment_received
```

---

## PART 5: DATA MIGRATION MAP (Old → New)

### Customers Migration
```
db.users (OLD)                →  db.customers (NEW)
├─ id                         →  user_id
├─ name                       →  name
├─ email                      →  email
├─ phone                      →  phone
├─ is_active                  →  (determine status)
└─ created_at                 →  created_at

db.customers_v2 (CURRENT)     →  db.customers (NEW)
├─ id                         →  id
├─ name                       →  name
├─ phone                      →  phone
├─ address                    →  address
├─ area                       →  area
├─ delivery_boy_id           →  delivery_boy_id
├─ status                    →  status
├─ created_at                →  created_at
└─ (Link via phone matching)
```

### Orders Migration
```
db.orders (OLD)               →  db.orders (NEW)
├─ id                         →  id (keep or regenerate as OR-*)
├─ user_id                    →  customer_id (via customer lookup)
├─ items[]                    →  items[] (same structure)
├─ total_amount               →  total_amount
├─ delivery_date              →  scheduled_deliveries[0].delivery_date
├─ status                     →  status (map PENDING/DELIVERED/CANCELLED)
└─ created_at                 →  created_at

db.subscriptions_v2 (CURRENT) →  db.orders (NEW) with order_type=SUBSCRIPTION
├─ id                         →  id (regenerate as SU-*)
├─ customer_id                →  customer_id
├─ product_id                 →  items[0].product_id
├─ mode                       →  subscription_pattern
├─ default_qty                →  items[0].quantity
├─ status                     →  status (map DRAFT/ACTIVE/PAUSED/STOPPED)
├─ start_date                 →  start_date
├─ end_date                   →  end_date
└─ created_at                 →  created_at
```

### Deliveries Migration
```
db.delivery_statuses (CURRENT) →  db.deliveries (NEW)
├─ (generate new id as DL-*)
├─ customer_id                →  customer_id
├─ delivery_date              →  delivery_date
├─ status                     →  delivery_type (DELIVERED→FULL, etc)
├─ delivered_at              →  confirmed_at
├─ created_at                →  created_at
└─ (Add missing fields with defaults)
    ├─ order_id: (lookup from orders by customer_id + delivery_date)
    ├─ delivery_boy_id: (from context)
    └─ items_delivered: (extract from order)
```

---

## PART 6: INDEXING STRATEGY FOR PERFORMANCE

### High-Priority Indexes (Create First)
```javascript
// Customers
db.customers.createIndex({"phone": 1}, {unique: true})
db.customers.createIndex({"delivery_boy_id": 1})
db.customers.createIndex({"status": 1})

// Orders
db.orders.createIndex({"customer_id": 1})
db.orders.createIndex({"order_type": 1})
db.orders.createIndex({"status": 1})
db.orders.createIndex({"scheduled_deliveries.delivery_date": 1})

// Deliveries
db.deliveries.createIndex({"order_id": 1})
db.deliveries.createIndex({"customer_id": 1})
db.deliveries.createIndex({"delivery_date": 1})
db.deliveries.createIndex({"delivery_type": 1})

// Billing
db.billing_records.createIndex({"customer_id": 1, "month": 1}, {unique: true})
db.billing_records.createIndex({"payment_status": 1})
```

### Medium-Priority Indexes (Create After)
```javascript
db.customers.createIndex({"area": 1})
db.customers.createIndex({"created_at": -1})

db.orders.createIndex({"created_by": 1})
db.orders.createIndex({"billed": 1})

db.deliveries.createIndex({"delivery_boy_id": 1})
db.deliveries.createIndex({"confirmed_at": -1})
db.deliveries.createIndex({"has_issues": 1})
```

### Geo Indexes (If Using Location Features)
```javascript
db.customers.createIndex({"location": "2dsphere"})  // Geospatial queries
db.deliveries.createIndex({"confirmation_location": "2dsphere"})
```

---

## PART 7: DENORMALIZATION STRATEGY

### What We Denormalize (Store Duplicates for Performance)
```
✅ Customer name in orders (instead of always joining)
✅ Customer name in deliveries (reduce joins)
✅ Product name in order items (product might change later)
✅ Delivery boy name in orders (reference by name in logs)
✅ Totals in orders (don't recalculate every time)
```

### When to Re-Synchronize Denormalized Data
```
Event: Customer name updated
├─ Update customers.name
└─ Update all orders.customer_name (via script)

Event: Product price updated
├─ Update products.default_price
└─ Don't update historical line_items (price locked at purchase)
    └─ But recalculate on next bill

Event: Delivery boy name updated
├─ Update delivery_boys.name
└─ Update matching deliveries.delivery_boy_name
```

---

## PART 8: QUERY EXAMPLES (With Unified Schema)

### Query 1: Get All Deliveries Not Yet Billed for Customer
```javascript
// Easy with unified schema
db.orders.aggregate([
  {$match: {customer_id: "CU-20260101-0001", billed: false}},
  {$lookup: {
    from: "deliveries",
    localField: "id",
    foreignField: "order_id",
    as: "delivery_records"
  }},
  {$match: {"delivery_records.delivery_type": "FULL"}},
  {$project: {id: 1, items: 1, delivery_records: 1}}
])
```

### Query 2: Get Monthly Revenue (Old vs New)
```javascript
// OLD (only subscriptions):
db.subscriptions_v2.aggregate([...])

// NEW (both orders + subscriptions):
db.deliveries.aggregate([
  {$match: {delivery_date: {$gte: "2026-01-01", $lte: "2026-01-31"}, delivery_type: "FULL"}},
  {$lookup: {
    from: "orders",
    localField: "order_id",
    foreignField: "id",
    as: "order_details"
  }},
  {$group: {_id: null, total: {$sum: "$amount_invoiced"}}}
])
```

### Query 3: Find Orders with Validation Issues
```javascript
db.deliveries.find({
  validation_status: {$in: ["REQUIRES_REVIEW", "FLAGGED", "DISPUTED"]}
}).sort({reviewed_at: 1})
```

---

## PART 9: VALIDATION & DATA QUALITY

### Data Quality Checks (Run Weekly)
```python
# Check 1: Orphaned orders (no deliveries)
orphaned = db.orders.find(
    {"_id": {"$nin": db.deliveries.distinct("order_id")}}
)

# Check 2: Deliveries without orders
unlinked_deliveries = db.deliveries.find(
    {"order_id": {"$exists": False}}
)

# Check 3: Billed but unpaid
overdue = db.billing_records.find({
    "payment_status": "OVERDUE",
    "payment_target_date": {"$lt": datetime.now()}
})

# Check 4: Qty mismatch
qty_mismatch = db.deliveries.find({
    $expr: {$gt: ["$items_delivered.delivered_quantity", "$items_delivered.ordered_quantity"]}
})
```

---

## PART 10: COLLECTION SIZE & GROWTH ESTIMATES

### For 10,000 Customers
```
Customers:      10,000 documents × 2KB = 20 MB
Orders:        100,000 documents × 1KB = 100 MB
Deliveries:    300,000 documents × 1KB = 300 MB
Billing:        10,000 documents × 5KB = 50 MB
Products:           500 documents × 2KB = 1 MB
─────────────────────────────────────────────
TOTAL:                                 ~471 MB

Indexes:                               ~150 MB
─────────────────────────────────────────────
GRAND TOTAL:                           ~621 MB
```

### Annual Growth (50% increase per year)
```
Year 1:  621 MB
Year 2:  931 MB
Year 3: 1.4 GB
Year 4: 2.1 GB
Year 5: 3.1 GB
```

---

## FINAL CHECKLIST

Before considering migration complete, verify:

- [ ] All old orders migrated to new orders collection
- [ ] All old subscriptions migrated to new orders collection with order_type=SUBSCRIPTION
- [ ] All customers in db.users linked to customers_v2 (now merged)
- [ ] All deliveries have order_id foreign key
- [ ] All billing line items reference orders
- [ ] All indexes created and performing
- [ ] Validation rules enforced at application layer
- [ ] No orphaned records (every delivery has order, every order has customer)
- [ ] Data migration complete for 100% of records
- [ ] Query performance acceptable (<500ms for typical queries)
- [ ] Rollback plan documented and tested

---

**END OF DATA MODEL SPECIFICATION**

*This document defines the ideal unified schema. Implementation should follow the migration plan in the audit report.*

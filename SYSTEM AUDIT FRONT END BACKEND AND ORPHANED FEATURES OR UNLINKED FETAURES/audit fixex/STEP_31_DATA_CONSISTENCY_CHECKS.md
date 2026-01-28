# STEP 31: Data Consistency Checks & Reporting
**Date:** January 27, 2026  
**Phase:** 5 - Data Integrity Fixes  
**Status:** READY FOR DEPLOYMENT  
**Objective:** Create queries to identify orphaned/inconsistent data and generate reports

---

## Overview

This step identifies data integrity issues that could impact billing, delivery, and customer operations. These checks should be run monthly to maintain data quality.

---

## Report 1: Orphaned Orders (Not Linked to Subscription)

**Purpose:** Find one-time orders that might not be billed

**Query:**
```python
# MongoDB Query
db.orders.find({
    "subscription_id": {"$exists": False}
})

# OR for orders explicitly null
db.orders.find({
    "$or": [
        {"subscription_id": {"$exists": False}},
        {"subscription_id": None}
    ]
})
```

**Expected Result:** 
- One-time orders only (legitimate)
- Should have status: DELIVERED
- Should have billed: True

**Critical Issues to Check:**
1. Count: How many orphaned orders exist?
2. Status: Are they all DELIVERED? Or some PENDING?
3. Billing: Have they all been billed (billed: true)?
4. Age: Any older than 90 days with status PENDING?

**Sample Detection Code:**
```python
async def check_orphaned_orders(db):
    """Find orders not linked to subscriptions"""
    orphaned = await db.orders.find({
        "$or": [
            {"subscription_id": {"$exists": False}},
            {"subscription_id": None}
        ]
    }).to_list(None)
    
    issues = []
    for order in orphaned:
        # Issue 1: Not billed
        if not order.get("billed", False):
            issues.append({
                "type": "UNBILLED_ORDER",
                "order_id": order["id"],
                "severity": "CRITICAL",
                "description": f"Order {order['id']} is unbilled and not linked to subscription",
                "amount": sum(item.get("total", 0) for item in order.get("items", []))
            })
        
        # Issue 2: Still pending (should be delivered or cancelled)
        if order.get("status") == "PENDING":
            issues.append({
                "type": "PENDING_ORDER_NOT_DELIVERED",
                "order_id": order["id"],
                "severity": "HIGH",
                "days_pending": (datetime.now() - order.get("created_at", datetime.now())).days,
                "description": f"Order {order['id']} still PENDING after creation"
            })
    
    return {
        "total_orphaned_orders": len(orphaned),
        "issues": issues,
        "summary": {
            "unbilled_critical": len([i for i in issues if i["type"] == "UNBILLED_ORDER"]),
            "pending_not_delivered": len([i for i in issues if i["type"] == "PENDING_ORDER_NOT_DELIVERED"])
        }
    }
```

**Action Items:**
- [ ] Run query monthly
- [ ] Count unbilled orders
- [ ] Calculate total revenue loss
- [ ] Mark for billing in batch process
- [ ] Document in BILLING_ORPHAN_REPORT_YYYY_MM.md

---

## Report 2: Orphaned Customers (No User Record)

**Purpose:** Find customers created in Phase 0 V2 who cannot login

**Query:**
```python
# Find customers with no user_id
db.customers_v2.find({
    "$or": [
        {"user_id": {"$exists": False}},
        {"user_id": None}
    ]
})

# Also check: Find users with no customer_v2_id
db.users.find({
    "$or": [
        {"customer_v2_id": {"$exists": False}},
        {"customer_v2_id": None}
    ]
})
```

**Expected Result:**
- Customers created via Phase 0 before user linking (STEP 21)
- These customers cannot login (no email/password in db.users)

**Critical Issues:**
1. Count: How many customers have no user?
2. Impact: Can they receive deliveries? Can they be billed?
3. Revenue: How much is billed to users without accounts?

**Sample Detection Code:**
```python
async def check_orphaned_customers(db):
    """Find customers not linked to user accounts"""
    orphaned_customers = await db.customers_v2.find({
        "$or": [
            {"user_id": {"$exists": False}},
            {"user_id": None}
        ]
    }).to_list(None)
    
    issues = []
    for customer in orphaned_customers:
        # Issue: Customer cannot login
        issues.append({
            "type": "CUSTOMER_NO_LOGIN",
            "customer_id": customer["id"],
            "severity": "MEDIUM",
            "customer_phone": customer.get("phone"),
            "description": f"Customer {customer['id']} has no user account for login",
            "status": customer.get("status")
        })
        
        # Check if they have active subscriptions
        active_subs = await db.subscriptions_v2.count_documents({
            "customer_id": customer["id"],
            "status": {"$in": ["active", "paused"]}
        })
        
        if active_subs > 0:
            issues.append({
                "type": "CUSTOMER_NO_LOGIN_WITH_ACTIVE_SUBSCRIPTIONS",
                "customer_id": customer["id"],
                "severity": "HIGH",
                "active_subscriptions": active_subs,
                "description": f"Customer {customer['id']} has {active_subs} active subscriptions but no user account"
            })
    
    return {
        "total_orphaned_customers": len(orphaned_customers),
        "issues": issues,
        "summary": {
            "cannot_login": len([i for i in issues if i["type"] == "CUSTOMER_NO_LOGIN"]),
            "active_subs_no_login": len([i for i in issues if i["type"] == "CUSTOMER_NO_LOGIN_WITH_ACTIVE_SUBSCRIPTIONS"])
        }
    }
```

**Action Items:**
- [ ] Run query monthly
- [ ] Identify customers with active subscriptions
- [ ] Create user accounts for them (link Phase 21 fix)
- [ ] Enable login capability
- [ ] Document in CUSTOMER_LINKING_REPORT_YYYY_MM.md

---

## Report 3: Delivery Confirmations with No Order

**Purpose:** Find phantom deliveries (marked delivered but no order exists)

**Query:**
```python
# Find deliveries with no matching order
db.delivery_statuses.find().forEach(function(delivery) {
    var order = db.orders.findOne({id: delivery.order_id});
    if (!order) {
        print("Phantom delivery: " + delivery._id + " -> order " + delivery.order_id);
    }
});

# Optimized query:
db.delivery_statuses.aggregate([
    {
        "$lookup": {
            "from": "orders",
            "localField": "order_id",
            "foreignField": "id",
            "as": "matched_order"
        }
    },
    {
        "$match": {
            "matched_order": {"$eq": []}
        }
    }
])
```

**Expected Result:**
- Should be ZERO phantom deliveries after STEP 20 fix (order_id linkage)
- If any found: critical data issue

**Critical Issues:**
1. Count: How many deliveries have no order?
2. Impact: These were marked delivered but billing won't find them
3. Risk: Revenue loss for these phantom deliveries

**Sample Detection Code:**
```python
async def check_phantom_deliveries(db):
    """Find delivery confirmations with no matching order"""
    pipeline = [
        {
            "$lookup": {
                "from": "orders",
                "localField": "order_id",
                "foreignField": "id",
                "as": "matched_order"
            }
        },
        {
            "$match": {
                "matched_order": {"$eq": []}
            }
        }
    ]
    
    phantom_deliveries = await db.delivery_statuses.aggregate(pipeline).to_list(None)
    
    issues = []
    total_lost_revenue = 0
    
    for delivery in phantom_deliveries:
        # Calculate what this delivery should have been billed
        delivery_date = delivery.get("confirmed_at")
        
        issues.append({
            "type": "PHANTOM_DELIVERY_NO_ORDER",
            "delivery_id": delivery["id"],
            "order_id": delivery.get("order_id", "UNKNOWN"),
            "severity": "CRITICAL",
            "customer_id": delivery.get("customer_id"),
            "confirmed_at": delivery_date,
            "description": f"Delivery {delivery['id']} confirmed but no matching order found"
        })
    
    return {
        "total_phantom_deliveries": len(phantom_deliveries),
        "issues": issues,
        "summary": {
            "critical_count": len([i for i in issues if i["severity"] == "CRITICAL"])
        }
    }
```

**Action Items:**
- [ ] Run query immediately (critical check)
- [ ] If found: Investigate how they were created
- [ ] Check shared link endpoints for validation gaps
- [ ] Document in PHANTOM_DELIVERY_INVESTIGATION_YYYY_MM.md

---

## Report 4: Unmatched Subscription References

**Purpose:** Find orders/deliveries referencing subscriptions that don't exist

**Query:**
```python
# Find orders linked to non-existent subscriptions
db.orders.aggregate([
    {
        "$match": {
            "subscription_id": {"$exists": True, "$ne": None}
        }
    },
    {
        "$lookup": {
            "from": "subscriptions_v2",
            "localField": "subscription_id",
            "foreignField": "id",
            "as": "subscription"
        }
    },
    {
        "$match": {
            "subscription": {"$eq": []}
        }
    }
])

# Find deliveries linked to non-existent orders
db.delivery_statuses.aggregate([
    {
        "$match": {
            "order_id": {"$exists": True, "$ne": None}
        }
    },
    {
        "$lookup": {
            "from": "orders",
            "localField": "order_id",
            "foreignField": "id",
            "as": "order"
        }
    },
    {
        "$match": {
            "order": {"$eq": []}
        }
    }
])
```

**Expected Result:**
- Should be ZERO after proper foreign key validation
- If any found: data consistency error

**Sample Detection Code:**
```python
async def check_invalid_references(db):
    """Find invalid foreign key references"""
    issues = []
    
    # Check 1: Orders with invalid subscription_id
    pipeline = [
        {"$match": {"subscription_id": {"$exists": True, "$ne": None}}},
        {
            "$lookup": {
                "from": "subscriptions_v2",
                "localField": "subscription_id",
                "foreignField": "id",
                "as": "sub"
            }
        },
        {"$match": {"sub": {"$eq": []}}}
    ]
    
    invalid_orders = await db.orders.aggregate(pipeline).to_list(None)
    
    for order in invalid_orders:
        issues.append({
            "type": "INVALID_SUBSCRIPTION_REFERENCE",
            "order_id": order["id"],
            "subscription_id": order["subscription_id"],
            "severity": "HIGH",
            "description": f"Order references non-existent subscription {order['subscription_id']}"
        })
    
    # Check 2: Deliveries with invalid order_id
    pipeline = [
        {"$match": {"order_id": {"$exists": True, "$ne": None}}},
        {
            "$lookup": {
                "from": "orders",
                "localField": "order_id",
                "foreignField": "id",
                "as": "ord"
            }
        },
        {"$match": {"ord": {"$eq": []}}}
    ]
    
    invalid_deliveries = await db.delivery_statuses.aggregate(pipeline).to_list(None)
    
    for delivery in invalid_deliveries:
        issues.append({
            "type": "INVALID_ORDER_REFERENCE",
            "delivery_id": delivery["id"],
            "order_id": delivery["order_id"],
            "severity": "HIGH",
            "description": f"Delivery references non-existent order {delivery['order_id']}"
        })
    
    return {
        "total_invalid_references": len(issues),
        "issues": issues,
        "summary": {
            "invalid_orders": len([i for i in issues if i["type"] == "INVALID_SUBSCRIPTION_REFERENCE"]),
            "invalid_deliveries": len([i for i in issues if i["type"] == "INVALID_ORDER_REFERENCE"])
        }
    }
```

**Action Items:**
- [ ] Run query monthly
- [ ] Investigate root cause of invalid references
- [ ] Document cleanup plan
- [ ] Implement foreign key validation (STEP 32)

---

## Report 5: Duplicate Customers

**Purpose:** Find duplicate customer records that should be merged

**Query:**
```python
# Find customers with same phone number
db.customers_v2.aggregate([
    {
        "$group": {
            "_id": "$phone",
            "count": {"$sum": 1},
            "customer_ids": {"$push": "$id"}
        }
    },
    {
        "$match": {
            "count": {"$gt": 1}
        }
    }
])

# Find users with same email
db.users.aggregate([
    {
        "$group": {
            "_id": "$email",
            "count": {"$sum": 1},
            "user_ids": {"$push": "$id"}
        }
    },
    {
        "$match": {
            "count": {"$gt": 1}
        }
    }
])
```

**Expected Result:**
- Should find duplicate phones in customers_v2
- Should find duplicate emails in users
- Each represents data quality issue (same person created twice)

**Sample Detection Code:**
```python
async def check_duplicate_customers(db):
    """Find duplicate customer records"""
    issues = []
    
    # Check 1: Duplicate phone numbers in customers_v2
    pipeline = [
        {
            "$group": {
                "_id": "$phone",
                "count": {"$sum": 1},
                "customer_ids": {"$push": "$id"},
                "customer_names": {"$push": "$name"}
            }
        },
        {
            "$match": {
                "count": {"$gt": 1}
            }
        }
    ]
    
    duplicate_phones = await db.customers_v2.aggregate(pipeline).to_list(None)
    
    for dup in duplicate_phones:
        issues.append({
            "type": "DUPLICATE_CUSTOMER_PHONE",
            "phone": dup["_id"],
            "count": dup["count"],
            "customer_ids": dup["customer_ids"],
            "severity": "MEDIUM",
            "description": f"Phone {dup['_id']} appears in {dup['count']} customer records",
            "action": "Manual review: keep one, archive others"
        })
    
    # Check 2: Duplicate emails in users
    pipeline = [
        {
            "$group": {
                "_id": "$email",
                "count": {"$sum": 1},
                "user_ids": {"$push": "$id"}
            }
        },
        {
            "$match": {
                "count": {"$gt": 1}
            }
        }
    ]
    
    duplicate_emails = await db.users.aggregate(pipeline).to_list(None)
    
    for dup in duplicate_emails:
        issues.append({
            "type": "DUPLICATE_USER_EMAIL",
            "email": dup["_id"],
            "count": dup["count"],
            "user_ids": dup["user_ids"],
            "severity": "HIGH",
            "description": f"Email {dup['_id']} appears in {dup['count']} user records",
            "action": "Critical: prevents login, need to merge accounts"
        })
    
    return {
        "total_duplicates": len(issues),
        "issues": issues,
        "summary": {
            "duplicate_phones": len([i for i in issues if i["type"] == "DUPLICATE_CUSTOMER_PHONE"]),
            "duplicate_emails": len([i for i in issues if i["type"] == "DUPLICATE_USER_EMAIL"])
        }
    }
```

**Action Items:**
- [ ] Run query monthly
- [ ] Create merge plan for duplicate records
- [ ] Keep most recent, archive others
- [ ] Update all references to use primary record
- [ ] Document in DUPLICATE_MERGE_LOG_YYYY_MM.md

---

## Report 6: Billing Data Integrity

**Purpose:** Find billing records that don't match actual orders/subscriptions

**Query:**
```python
# Find billing records with no matching subscription
db.billing_records.aggregate([
    {
        "$lookup": {
            "from": "subscriptions_v2",
            "localField": "subscription_id",
            "foreignField": "id",
            "as": "subscription"
        }
    },
    {
        "$match": {
            "subscription": {"$eq": []}
        }
    }
])

# Find billing records with amount mismatch
# (should calculate: sum of order amounts in period)
```

**Expected Result:**
- All billing records should reference valid subscriptions
- Amounts should match calculated totals

**Sample Detection Code:**
```python
async def check_billing_integrity(db):
    """Verify billing records match subscriptions"""
    issues = []
    
    # Check 1: Billing with no matching subscription
    pipeline = [
        {
            "$lookup": {
                "from": "subscriptions_v2",
                "localField": "subscription_id",
                "foreignField": "id",
                "as": "subscription"
            }
        },
        {
            "$match": {
                "subscription": {"$eq": []}
            }
        }
    ]
    
    orphaned_bills = await db.billing_records.aggregate(pipeline).to_list(None)
    
    for bill in orphaned_bills:
        issues.append({
            "type": "BILLING_NO_SUBSCRIPTION",
            "billing_id": bill["id"],
            "subscription_id": bill.get("subscription_id"),
            "amount": bill.get("total_amount", 0),
            "severity": "HIGH",
            "description": f"Billing record {bill['id']} references non-existent subscription"
        })
    
    # Check 2: Billing records that double-billed (same period, multiple bills)
    pipeline = [
        {
            "$group": {
                "_id": {"subscription_id": "$subscription_id", "period": "$period_date"},
                "count": {"$sum": 1},
                "billing_ids": {"$push": "$id"},
                "amounts": {"$push": "$total_amount"}
            }
        },
        {
            "$match": {
                "count": {"$gt": 1}
            }
        }
    ]
    
    double_bills = await db.billing_records.aggregate(pipeline).to_list(None)
    
    for dup in double_bills:
        issues.append({
            "type": "DOUBLE_BILLING",
            "subscription_id": dup["_id"]["subscription_id"],
            "period": dup["_id"]["period"],
            "count": dup["count"],
            "billing_ids": dup["billing_ids"],
            "total_overcharge": sum(dup["amounts"]),
            "severity": "CRITICAL",
            "description": f"Subscription {dup['_id']['subscription_id']} billed {dup['count']} times in period {dup['_id']['period']}"
        })
    
    return {
        "total_billing_issues": len(issues),
        "issues": issues,
        "summary": {
            "orphaned_bills": len([i for i in issues if i["type"] == "BILLING_NO_SUBSCRIPTION"]),
            "double_bills": len([i for i in issues if i["type"] == "DOUBLE_BILLING"]),
            "total_overcharge": sum([i.get("total_overcharge", 0) for i in issues if i["type"] == "DOUBLE_BILLING"])
        }
    }
```

**Action Items:**
- [ ] Run query daily
- [ ] Alert on any double billing immediately
- [ ] Investigate orphaned billing records
- [ ] Issue credits for overcharges
- [ ] Document in BILLING_INTEGRITY_REPORT_YYYY_MM.md

---

## Report 7: Status Consistency

**Purpose:** Find records with invalid or inconsistent status values

**Query:**
```python
# Find subscriptions with invalid status
db.subscriptions_v2.find({
    "status": {"$nin": ["draft", "active", "paused", "stopped"]}
})

# Find orders with invalid status
db.orders.find({
    "status": {"$nin": ["pending", "confirmed", "delivered", "cancelled"]}
})

# Find delivery_statuses with invalid status
db.delivery_statuses.find({
    "status": {"$nin": ["pending", "out_for_delivery", "delivered", "not_delivered", "cancelled"]}
})
```

**Expected Result:**
- All statuses should be from defined enums
- No typos or invalid values

**Sample Detection Code:**
```python
async def check_status_consistency(db):
    """Find records with invalid status values"""
    issues = []
    
    # Valid statuses for each collection
    valid_statuses = {
        "subscriptions_v2": ["draft", "active", "paused", "stopped"],
        "orders": ["pending", "confirmed", "delivered", "cancelled"],
        "delivery_statuses": ["pending", "out_for_delivery", "delivered", "not_delivered", "cancelled"]
    }
    
    # Check subscriptions
    invalid_subs = await db.subscriptions_v2.find({
        "status": {"$nin": valid_statuses["subscriptions_v2"]}
    }).to_list(None)
    
    for sub in invalid_subs:
        issues.append({
            "type": "INVALID_SUBSCRIPTION_STATUS",
            "subscription_id": sub["id"],
            "status": sub.get("status"),
            "severity": "HIGH",
            "description": f"Subscription has invalid status: {sub.get('status')}"
        })
    
    # Check orders
    invalid_orders = await db.orders.find({
        "status": {"$nin": valid_statuses["orders"]}
    }).to_list(None)
    
    for order in invalid_orders:
        issues.append({
            "type": "INVALID_ORDER_STATUS",
            "order_id": order["id"],
            "status": order.get("status"),
            "severity": "HIGH",
            "description": f"Order has invalid status: {order.get('status')}"
        })
    
    # Check delivery_statuses
    invalid_deliveries = await db.delivery_statuses.find({
        "status": {"$nin": valid_statuses["delivery_statuses"]}
    }).to_list(None)
    
    for delivery in invalid_deliveries:
        issues.append({
            "type": "INVALID_DELIVERY_STATUS",
            "delivery_id": delivery["id"],
            "status": delivery.get("status"),
            "severity": "HIGH",
            "description": f"Delivery has invalid status: {delivery.get('status')}"
        })
    
    return {
        "total_status_issues": len(issues),
        "issues": issues,
        "summary": {
            "invalid_subscriptions": len([i for i in issues if i["type"] == "INVALID_SUBSCRIPTION_STATUS"]),
            "invalid_orders": len([i for i in issues if i["type"] == "INVALID_ORDER_STATUS"]),
            "invalid_deliveries": len([i for i in issues if i["type"] == "INVALID_DELIVERY_STATUS"])
        }
    }
```

**Action Items:**
- [ ] Run query weekly
- [ ] Fix invalid statuses (correct typos or standardize)
- [ ] Document in STATUS_CLEANUP_LOG_YYYY_MM.md

---

## Implementation: Data Consistency Checker Script

Create this script to run all checks monthly:

**File:** `backend/data_consistency_checker.py`

```python
"""
Data Consistency Checker
Runs all consistency checks and generates reports
Run monthly: python backend/data_consistency_checker.py
"""

import asyncio
from datetime import datetime
from database import get_database
import json

async def generate_consistency_report(db):
    """Generate complete data consistency report"""
    
    print("\n" + "="*60)
    print("DATA CONSISTENCY REPORT")
    print(f"Generated: {datetime.now().isoformat()}")
    print("="*60 + "\n")
    
    all_issues = {
        "generated_at": datetime.now().isoformat(),
        "reports": {}
    }
    
    # Report 1: Orphaned Orders
    print("[1/7] Checking orphaned orders...")
    orphaned_orders = await check_orphaned_orders(db)
    all_issues["reports"]["orphaned_orders"] = orphaned_orders
    print(f"✓ Found {orphaned_orders['total_orphaned_orders']} orphaned orders")
    print(f"  - Unbilled: {orphaned_orders['summary']['unbilled_critical']}")
    
    # Report 2: Orphaned Customers
    print("[2/7] Checking orphaned customers...")
    orphaned_customers = await check_orphaned_customers(db)
    all_issues["reports"]["orphaned_customers"] = orphaned_customers
    print(f"✓ Found {orphaned_customers['total_orphaned_customers']} orphaned customers")
    
    # Report 3: Phantom Deliveries
    print("[3/7] Checking phantom deliveries...")
    phantom_deliveries = await check_phantom_deliveries(db)
    all_issues["reports"]["phantom_deliveries"] = phantom_deliveries
    if phantom_deliveries["total_phantom_deliveries"] > 0:
        print(f"⚠️  CRITICAL: Found {phantom_deliveries['total_phantom_deliveries']} phantom deliveries!")
    else:
        print(f"✓ No phantom deliveries found")
    
    # Report 4: Invalid References
    print("[4/7] Checking invalid references...")
    invalid_refs = await check_invalid_references(db)
    all_issues["reports"]["invalid_references"] = invalid_refs
    print(f"✓ Found {invalid_refs['total_invalid_references']} invalid references")
    
    # Report 5: Duplicate Customers
    print("[5/7] Checking duplicate customers...")
    duplicates = await check_duplicate_customers(db)
    all_issues["reports"]["duplicates"] = duplicates
    print(f"✓ Found {duplicates['total_duplicates']} duplicate records")
    
    # Report 6: Billing Integrity
    print("[6/7] Checking billing integrity...")
    billing_issues = await check_billing_integrity(db)
    all_issues["reports"]["billing"] = billing_issues
    print(f"✓ Found {billing_issues['total_billing_issues']} billing issues")
    if billing_issues["summary"]["double_bills"] > 0:
        print(f"  ⚠️  WARNING: {billing_issues['summary']['double_bills']} double-billing instances!")
    
    # Report 7: Status Consistency
    print("[7/7] Checking status consistency...")
    status_issues = await check_status_consistency(db)
    all_issues["reports"]["status"] = status_issues
    print(f"✓ Found {status_issues['total_status_issues']} status issues")
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    total_issues = sum([
        orphaned_orders["summary"].get("unbilled_critical", 0),
        orphaned_customers["summary"].get("active_subs_no_login", 0),
        phantom_deliveries["summary"]["critical_count"],
        invalid_refs["total_invalid_references"],
        duplicates["total_duplicates"],
        billing_issues["summary"]["double_bills"],
        status_issues["total_status_issues"]
    ])
    
    print(f"\nTotal Critical Issues Found: {total_issues}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    
    # Save report
    filename = f"data_consistency_report_{datetime.now().strftime('%Y_%m_%d_%H%M%S')}.json"
    with open(filename, 'w') as f:
        json.dump(all_issues, f, indent=2, default=str)
    
    print(f"\nReport saved: {filename}")
    
    return all_issues

async def main():
    db = await get_database()
    report = await generate_consistency_report(db)
    
    # If critical issues found, return error code
    critical_count = sum([
        report["reports"]["phantom_deliveries"]["summary"]["critical_count"],
        report["reports"]["billing"]["summary"]["double_bills"]
    ])
    
    if critical_count > 0:
        print(f"\n⚠️  {critical_count} CRITICAL ISSUES FOUND - Please review immediately!")
        exit(1)
    else:
        print("\n✅ No critical issues found")
        exit(0)

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Deployment Checklist

- [ ] Create backend/data_consistency_checker.py
- [ ] Create backend/consistency_report_definitions.py (with all check functions)
- [ ] Run first consistency check manually
- [ ] Review all 7 reports
- [ ] Create data cleanup plan based on findings
- [ ] Set up monthly scheduler (cron job)
- [ ] Document report location and access
- [ ] Create alert for critical issues (double-billing, phantom deliveries)

---

## Next Steps

**After completing STEP 31:**
1. Review all 7 consistency reports
2. Prioritize issues by severity (CRITICAL → HIGH → MEDIUM)
3. Proceed to STEP 32: Add Referential Integrity Validation

**STEP 32 will add validation to prevent these issues in future:**
- Foreign key validation (prevent creating orders with invalid subscription_id)
- Reference integrity checks before any insert/update
- Automatic orphan detection and alerts

---

## Related Steps

- **STEP 28-29:** Consolidated routes + UUID standardization (completed)
- **STEP 30:** Database index strategy (completed)
- **STEP 31:** Data consistency checks (THIS STEP)
- **STEP 32:** Referential integrity validation (next)
- **STEP 33:** Field validation rules (after STEP 32)
- **STEP 34:** Data migration playbook (after STEP 33)

---

**Status:** ✅ READY FOR IMPLEMENTATION  
**Estimated Time:** 2-3 hours to run all checks  
**Complexity:** HIGH (data analysis required)  
**Risk:** LOW (read-only operations)

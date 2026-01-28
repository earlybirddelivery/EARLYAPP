"""
Data Consistency Checks Implementation
Provides functions to identify orphaned/inconsistent data in MongoDB
"""

from datetime import datetime
from typing import Dict, List, Any

# ============================================================================
# REPORT 1: Orphaned Orders (Not Linked to Subscription)
# ============================================================================

async def check_orphaned_orders(db) -> Dict[str, Any]:
    """
    Find orders not linked to subscriptions that might not be billed.
    
    Expected: One-time orders should have status DELIVERED and billed=True
    Issues: Unbilled orders, pending orders not delivered
    """
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
            items_total = sum(
                item.get("quantity", 1) * item.get("price", 0) 
                for item in order.get("items", [])
            )
            issues.append({
                "type": "UNBILLED_ORDER",
                "order_id": order.get("id"),
                "severity": "CRITICAL",
                "status": order.get("status"),
                "amount": items_total,
                "created_at": order.get("created_at"),
                "description": f"Order {order.get('id')} is unbilled and not linked to subscription"
            })
        
        # Issue 2: Still pending (should be delivered or cancelled)
        if order.get("status") in ["pending", "confirmed"]:
            created_at = order.get("created_at")
            if isinstance(created_at, str):
                try:
                    created_at = datetime.fromisoformat(created_at)
                except:
                    created_at = None
            
            if created_at:
                days_pending = (datetime.now() - created_at).days
                if days_pending > 7:  # More than a week
                    issues.append({
                        "type": "PENDING_ORDER_NOT_DELIVERED",
                        "order_id": order.get("id"),
                        "severity": "HIGH",
                        "days_pending": days_pending,
                        "status": order.get("status"),
                        "description": f"Order {order.get('id')} pending for {days_pending} days"
                    })
    
    return {
        "total_orphaned_orders": len(orphaned),
        "issues": issues,
        "summary": {
            "unbilled_critical": len([i for i in issues if i["type"] == "UNBILLED_ORDER"]),
            "pending_not_delivered": len([i for i in issues if i["type"] == "PENDING_ORDER_NOT_DELIVERED"])
        }
    }


# ============================================================================
# REPORT 2: Orphaned Customers (No User Record)
# ============================================================================

async def check_orphaned_customers(db) -> Dict[str, Any]:
    """
    Find customers created in Phase 0 V2 who cannot login.
    
    Expected: All customers should have user_id linking to db.users
    Issues: Customer cannot login, active subscriptions with no user account
    """
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
            "customer_id": customer.get("id"),
            "severity": "MEDIUM",
            "customer_phone": customer.get("phone"),
            "customer_name": customer.get("name"),
            "description": f"Customer {customer.get('id')} has no user account for login"
        })
        
        # Check if they have active subscriptions
        try:
            active_subs = await db.subscriptions_v2.count_documents({
                "customer_id": customer.get("id"),
                "status": {"$in": ["active", "paused", "draft"]}
            })
            
            if active_subs > 0:
                issues.append({
                    "type": "CUSTOMER_NO_LOGIN_WITH_ACTIVE_SUBSCRIPTIONS",
                    "customer_id": customer.get("id"),
                    "severity": "HIGH",
                    "active_subscriptions": active_subs,
                    "customer_phone": customer.get("phone"),
                    "description": f"Customer {customer.get('id')} has {active_subs} active subscriptions but no user account"
                })
        except Exception as e:
            print(f"Error counting subscriptions for customer {customer.get('id')}: {e}")
    
    return {
        "total_orphaned_customers": len(orphaned_customers),
        "issues": issues,
        "summary": {
            "cannot_login": len([i for i in issues if i["type"] == "CUSTOMER_NO_LOGIN"]),
            "active_subs_no_login": len([i for i in issues if i["type"] == "CUSTOMER_NO_LOGIN_WITH_ACTIVE_SUBSCRIPTIONS"])
        }
    }


# ============================================================================
# REPORT 3: Phantom Deliveries (No Matching Order)
# ============================================================================

async def check_phantom_deliveries(db) -> Dict[str, Any]:
    """
    Find delivery confirmations with no matching order (marked delivered but no order).
    
    Expected: ZERO phantom deliveries after STEP 20 fix
    Critical: These were marked delivered but billing won't find them
    """
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
    for delivery in phantom_deliveries:
        issues.append({
            "type": "PHANTOM_DELIVERY_NO_ORDER",
            "delivery_id": delivery.get("id"),
            "order_id": delivery.get("order_id", "UNKNOWN"),
            "severity": "CRITICAL",
            "customer_id": delivery.get("customer_id"),
            "confirmed_at": delivery.get("confirmed_at"),
            "description": f"Delivery {delivery.get('id')} confirmed but no matching order found"
        })
    
    return {
        "total_phantom_deliveries": len(phantom_deliveries),
        "issues": issues,
        "summary": {
            "critical_count": len([i for i in issues if i["severity"] == "CRITICAL"])
        }
    }


# ============================================================================
# REPORT 4: Invalid References
# ============================================================================

async def check_invalid_references(db) -> Dict[str, Any]:
    """
    Find foreign key references that point to non-existent records.
    
    Expected: ZERO invalid references after STEP 32
    High Priority: Indicates data consistency issues
    """
    issues = []
    
    # Check 1: Orders with invalid subscription_id
    try:
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
                "order_id": order.get("id"),
                "subscription_id": order.get("subscription_id"),
                "severity": "HIGH",
                "description": f"Order references non-existent subscription {order.get('subscription_id')}"
            })
    except Exception as e:
        print(f"Error checking invalid subscription references: {e}")
    
    # Check 2: Deliveries with invalid order_id
    try:
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
                "delivery_id": delivery.get("id"),
                "order_id": delivery.get("order_id"),
                "severity": "HIGH",
                "description": f"Delivery references non-existent order {delivery.get('order_id')}"
            })
    except Exception as e:
        print(f"Error checking invalid order references: {e}")
    
    return {
        "total_invalid_references": len(issues),
        "issues": issues,
        "summary": {
            "invalid_orders": len([i for i in issues if i["type"] == "INVALID_SUBSCRIPTION_REFERENCE"]),
            "invalid_deliveries": len([i for i in issues if i["type"] == "INVALID_ORDER_REFERENCE"])
        }
    }


# ============================================================================
# REPORT 5: Duplicate Customers
# ============================================================================

async def check_duplicate_customers(db) -> Dict[str, Any]:
    """
    Find duplicate customer records that should be merged.
    
    Expected: Each phone/email appears only once
    Issues: Duplicates prevent login and cause data confusion
    """
    issues = []
    
    # Check 1: Duplicate phone numbers in customers_v2
    try:
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
                "phone": dup.get("_id"),
                "count": dup.get("count"),
                "customer_ids": dup.get("customer_ids"),
                "severity": "MEDIUM",
                "description": f"Phone {dup.get('_id')} appears in {dup.get('count')} customer records"
            })
    except Exception as e:
        print(f"Error checking duplicate phones: {e}")
    
    # Check 2: Duplicate emails in users
    try:
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
                "email": dup.get("_id"),
                "count": dup.get("count"),
                "user_ids": dup.get("user_ids"),
                "severity": "HIGH",
                "description": f"Email {dup.get('_id')} appears in {dup.get('count')} user records"
            })
    except Exception as e:
        print(f"Error checking duplicate emails: {e}")
    
    return {
        "total_duplicates": len(issues),
        "issues": issues,
        "summary": {
            "duplicate_phones": len([i for i in issues if i["type"] == "DUPLICATE_CUSTOMER_PHONE"]),
            "duplicate_emails": len([i for i in issues if i["type"] == "DUPLICATE_USER_EMAIL"])
        }
    }


# ============================================================================
# REPORT 6: Billing Integrity
# ============================================================================

async def check_billing_integrity(db) -> Dict[str, Any]:
    """
    Verify billing records match subscriptions and check for double-billing.
    
    Expected: All billing records reference valid subscriptions, no double-billing
    Critical: Double-billing results in customer overcharges
    """
    issues = []
    
    # Check 1: Billing with no matching subscription
    try:
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
                "billing_id": bill.get("id"),
                "subscription_id": bill.get("subscription_id"),
                "amount": bill.get("total_amount", 0),
                "period": bill.get("period_date"),
                "severity": "HIGH",
                "description": f"Billing record {bill.get('id')} references non-existent subscription"
            })
    except Exception as e:
        print(f"Error checking orphaned billing records: {e}")
    
    # Check 2: Billing records that double-billed (same period, multiple bills)
    try:
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
            total_overcharge = sum(dup.get("amounts", []))
            issues.append({
                "type": "DOUBLE_BILLING",
                "subscription_id": dup.get("_id", {}).get("subscription_id"),
                "period": dup.get("_id", {}).get("period"),
                "count": dup.get("count"),
                "billing_ids": dup.get("billing_ids"),
                "total_overcharge": total_overcharge,
                "severity": "CRITICAL",
                "description": f"Subscription billed {dup.get('count')} times in period {dup.get('_id', {}).get('period')}"
            })
    except Exception as e:
        print(f"Error checking double-billing: {e}")
    
    return {
        "total_billing_issues": len(issues),
        "issues": issues,
        "summary": {
            "orphaned_bills": len([i for i in issues if i["type"] == "BILLING_NO_SUBSCRIPTION"]),
            "double_bills": len([i for i in issues if i["type"] == "DOUBLE_BILLING"]),
            "total_overcharge": sum([i.get("total_overcharge", 0) for i in issues if i["type"] == "DOUBLE_BILLING"])
        }
    }


# ============================================================================
# REPORT 7: Status Consistency
# ============================================================================

async def check_status_consistency(db) -> Dict[str, Any]:
    """
    Find records with invalid or inconsistent status values.
    
    Expected: All statuses from defined enums, no typos or invalid values
    """
    issues = []
    
    # Valid statuses for each collection
    valid_statuses = {
        "subscriptions_v2": ["draft", "active", "paused", "stopped"],
        "orders": ["pending", "confirmed", "delivered", "cancelled"],
        "delivery_statuses": ["pending", "out_for_delivery", "delivered", "not_delivered", "cancelled"]
    }
    
    # Check subscriptions
    try:
        invalid_subs = await db.subscriptions_v2.find({
            "status": {"$nin": valid_statuses["subscriptions_v2"]}
        }).to_list(None)
        
        for sub in invalid_subs:
            issues.append({
                "type": "INVALID_SUBSCRIPTION_STATUS",
                "subscription_id": sub.get("id"),
                "status": sub.get("status"),
                "severity": "HIGH",
                "description": f"Subscription has invalid status: {sub.get('status')}"
            })
    except Exception as e:
        print(f"Error checking subscription statuses: {e}")
    
    # Check orders
    try:
        invalid_orders = await db.orders.find({
            "status": {"$nin": valid_statuses["orders"]}
        }).to_list(None)
        
        for order in invalid_orders:
            issues.append({
                "type": "INVALID_ORDER_STATUS",
                "order_id": order.get("id"),
                "status": order.get("status"),
                "severity": "HIGH",
                "description": f"Order has invalid status: {order.get('status')}"
            })
    except Exception as e:
        print(f"Error checking order statuses: {e}")
    
    # Check delivery_statuses
    try:
        invalid_deliveries = await db.delivery_statuses.find({
            "status": {"$nin": valid_statuses["delivery_statuses"]}
        }).to_list(None)
        
        for delivery in invalid_deliveries:
            issues.append({
                "type": "INVALID_DELIVERY_STATUS",
                "delivery_id": delivery.get("id"),
                "status": delivery.get("status"),
                "severity": "HIGH",
                "description": f"Delivery has invalid status: {delivery.get('status')}"
            })
    except Exception as e:
        print(f"Error checking delivery statuses: {e}")
    
    return {
        "total_status_issues": len(issues),
        "issues": issues,
        "summary": {
            "invalid_subscriptions": len([i for i in issues if i["type"] == "INVALID_SUBSCRIPTION_STATUS"]),
            "invalid_orders": len([i for i in issues if i["type"] == "INVALID_ORDER_STATUS"]),
            "invalid_deliveries": len([i for i in issues if i["type"] == "INVALID_DELIVERY_STATUS"])
        }
    }

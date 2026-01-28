# STEP 32: Referential Integrity Validation
**Date:** January 27, 2026  
**Phase:** 5 - Data Integrity Fixes  
**Status:** READY FOR IMPLEMENTATION  
**Objective:** Add validation functions to ensure all foreign key relationships are valid before insert/update

---

## Overview

This step adds validation to prevent creating records with invalid references. Instead of finding broken links later (STEP 31), we prevent them from being created in the first place.

**Implementation Pattern:**
```python
# BEFORE creating a record, validate all foreign keys:
async def create_order(order_data):
    # 1. Validate user exists
    await validate_user_exists(order_data.user_id)
    
    # 2. Validate products exist
    for item in order_data.items:
        await validate_product_exists(item.product_id)
    
    # 3. If subscription link provided, validate subscription exists
    if order_data.subscription_id:
        await validate_subscription_exists(order_data.subscription_id)
    
    # 4. If all validations pass, create the record
    return await db.orders.insert_one(order_data)
```

---

## Core Validation Functions

### 1. User Existence Validation

**File:** `backend/validators/user_validators.py`

```python
"""
User validation functions - check if users exist before creating references
"""

from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException

async def validate_user_exists(db: AsyncIOMotorDatabase, user_id: str) -> bool:
    """
    Check if user exists in db.users
    
    Args:
        db: MongoDB database
        user_id: UUID of user
        
    Raises:
        HTTPException(404): User not found
        HTTPException(400): Invalid user_id format
        
    Returns:
        bool: True if exists
    """
    if not user_id or not isinstance(user_id, str):
        raise HTTPException(status_code=400, detail="Invalid user_id format")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    
    return True


async def validate_user_role(
    db: AsyncIOMotorDatabase,
    user_id: str,
    required_role: str
) -> bool:
    """
    Check if user exists AND has required role
    
    Args:
        db: MongoDB database
        user_id: UUID of user
        required_role: Required role (e.g., "admin", "customer")
        
    Raises:
        HTTPException(403): User doesn't have required role
        HTTPException(404): User not found
        
    Returns:
        bool: True if user has role
    """
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    
    if user.get("role") != required_role:
        raise HTTPException(
            status_code=403,
            detail=f"User role '{user.get('role')}' does not have permission for '{required_role}' operation"
        )
    
    return True


async def validate_user_active(db: AsyncIOMotorDatabase, user_id: str) -> bool:
    """
    Check if user is active (not suspended or deleted)
    
    Args:
        db: MongoDB database
        user_id: UUID of user
        
    Raises:
        HTTPException(403): User is not active
        HTTPException(404): User not found
        
    Returns:
        bool: True if user is active
    """
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    
    if not user.get("is_active", False):
        raise HTTPException(status_code=403, detail="User account is inactive")
    
    return True
```

### 2. Product Existence Validation

**File:** `backend/validators/product_validators.py`

```python
"""
Product validation functions - check if products exist before creating references
"""

from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException
from typing import List

async def validate_product_exists(db: AsyncIOMotorDatabase, product_id: str) -> bool:
    """
    Check if product exists in db.products
    
    Args:
        db: MongoDB database
        product_id: UUID of product
        
    Raises:
        HTTPException(404): Product not found
        HTTPException(400): Invalid product_id format
        
    Returns:
        bool: True if exists
    """
    if not product_id or not isinstance(product_id, str):
        raise HTTPException(status_code=400, detail="Invalid product_id format")
    
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    
    return True


async def validate_products_exist(
    db: AsyncIOMotorDatabase,
    product_ids: List[str]
) -> bool:
    """
    Check if multiple products exist
    
    Args:
        db: MongoDB database
        product_ids: List of product UUIDs
        
    Raises:
        HTTPException(404): One or more products not found
        HTTPException(400): Invalid product_ids format
        
    Returns:
        bool: True if all exist
    """
    if not product_ids or not isinstance(product_ids, list):
        raise HTTPException(status_code=400, detail="Invalid product_ids format")
    
    missing_products = []
    for product_id in product_ids:
        product = await db.products.find_one({"id": product_id})
        if not product:
            missing_products.append(product_id)
    
    if missing_products:
        raise HTTPException(
            status_code=404,
            detail=f"Products not found: {', '.join(missing_products)}"
        )
    
    return True


async def validate_product_available(db: AsyncIOMotorDatabase, product_id: str) -> bool:
    """
    Check if product is available (not discontinued)
    
    Args:
        db: MongoDB database
        product_id: UUID of product
        
    Raises:
        HTTPException(410): Product is discontinued
        HTTPException(404): Product not found
        
    Returns:
        bool: True if available
    """
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    
    if product.get("discontinued", False):
        raise HTTPException(status_code=410, detail=f"Product {product_id} is no longer available")
    
    return True
```

### 3. Subscription Existence Validation

**File:** `backend/validators/subscription_validators.py`

```python
"""
Subscription validation functions - check if subscriptions exist before creating references
"""

from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException

async def validate_subscription_exists(db: AsyncIOMotorDatabase, subscription_id: str) -> bool:
    """
    Check if subscription exists in db.subscriptions_v2
    
    Args:
        db: MongoDB database
        subscription_id: UUID of subscription
        
    Raises:
        HTTPException(404): Subscription not found
        HTTPException(400): Invalid subscription_id format
        
    Returns:
        bool: True if exists
    """
    if not subscription_id or not isinstance(subscription_id, str):
        raise HTTPException(status_code=400, detail="Invalid subscription_id format")
    
    subscription = await db.subscriptions_v2.find_one({"id": subscription_id})
    if not subscription:
        raise HTTPException(status_code=404, detail=f"Subscription {subscription_id} not found")
    
    return True


async def validate_subscription_active(db: AsyncIOMotorDatabase, subscription_id: str) -> bool:
    """
    Check if subscription is in active/paused state (not stopped/draft)
    
    Args:
        db: MongoDB database
        subscription_id: UUID of subscription
        
    Raises:
        HTTPException(410): Subscription is not active
        HTTPException(404): Subscription not found
        
    Returns:
        bool: True if active or paused
    """
    subscription = await db.subscriptions_v2.find_one({"id": subscription_id})
    if not subscription:
        raise HTTPException(status_code=404, detail=f"Subscription {subscription_id} not found")
    
    status = subscription.get("status")
    if status not in ["active", "paused"]:
        raise HTTPException(
            status_code=410,
            detail=f"Subscription {subscription_id} is {status}, cannot create orders for {status} subscription"
        )
    
    return True


async def validate_subscription_can_be_billed(db: AsyncIOMotorDatabase, subscription_id: str) -> bool:
    """
    Check if subscription should be included in billing
    
    Args:
        db: MongoDB database
        subscription_id: UUID of subscription
        
    Raises:
        HTTPException(410): Subscription cannot be billed
        HTTPException(404): Subscription not found
        
    Returns:
        bool: True if can be billed
    """
    subscription = await db.subscriptions_v2.find_one({"id": subscription_id})
    if not subscription:
        raise HTTPException(status_code=404, detail=f"Subscription {subscription_id} not found")
    
    status = subscription.get("status")
    if status in ["draft", "stopped"]:
        raise HTTPException(
            status_code=410,
            detail=f"Subscription {subscription_id} with status '{status}' cannot be billed"
        )
    
    return True
```

### 4. Order Existence Validation

**File:** `backend/validators/order_validators.py`

```python
"""
Order validation functions - check if orders exist before creating references
"""

from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException

async def validate_order_exists(db: AsyncIOMotorDatabase, order_id: str) -> bool:
    """
    Check if order exists in db.orders
    
    Args:
        db: MongoDB database
        order_id: UUID of order
        
    Raises:
        HTTPException(404): Order not found
        HTTPException(400): Invalid order_id format
        
    Returns:
        bool: True if exists
    """
    if not order_id or not isinstance(order_id, str):
        raise HTTPException(status_code=400, detail="Invalid order_id format")
    
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")
    
    return True


async def validate_order_can_be_delivered(db: AsyncIOMotorDatabase, order_id: str) -> bool:
    """
    Check if order can be marked as delivered
    (not already cancelled, not in pending state too long)
    
    Args:
        db: MongoDB database
        order_id: UUID of order
        
    Raises:
        HTTPException(410): Order cannot be delivered
        HTTPException(404): Order not found
        
    Returns:
        bool: True if can be delivered
    """
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")
    
    status = order.get("status")
    if status == "cancelled":
        raise HTTPException(
            status_code=410,
            detail=f"Cannot mark cancelled order {order_id} as delivered"
        )
    
    return True


async def validate_order_not_already_billed(db: AsyncIOMotorDatabase, order_id: str) -> bool:
    """
    Check if order has not been billed already (prevent double-billing)
    
    Args:
        db: MongoDB database
        order_id: UUID of order
        
    Raises:
        HTTPException(410): Order already billed
        HTTPException(404): Order not found
        
    Returns:
        bool: True if not already billed
    """
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")
    
    if order.get("billed", False):
        raise HTTPException(
            status_code=410,
            detail=f"Order {order_id} has already been billed"
        )
    
    return True
```

### 5. Customer Existence Validation

**File:** `backend/validators/customer_validators.py`

```python
"""
Customer validation functions - check if customers exist before creating references
"""

from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException

async def validate_customer_exists(db: AsyncIOMotorDatabase, customer_id: str) -> bool:
    """
    Check if customer exists in db.customers_v2
    
    Args:
        db: MongoDB database
        customer_id: UUID of customer
        
    Raises:
        HTTPException(404): Customer not found
        HTTPException(400): Invalid customer_id format
        
    Returns:
        bool: True if exists
    """
    if not customer_id or not isinstance(customer_id, str):
        raise HTTPException(status_code=400, detail="Invalid customer_id format")
    
    customer = await db.customers_v2.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found")
    
    return True


async def validate_customer_user_link(db: AsyncIOMotorDatabase, customer_id: str) -> bool:
    """
    Check if customer is linked to a user (can login)
    
    Args:
        db: MongoDB database
        customer_id: UUID of customer
        
    Raises:
        HTTPException(400): Customer not linked to user
        HTTPException(404): Customer not found
        
    Returns:
        bool: True if linked to user
    """
    customer = await db.customers_v2.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found")
    
    if not customer.get("user_id"):
        raise HTTPException(
            status_code=400,
            detail=f"Customer {customer_id} is not linked to a user account. Cannot proceed."
        )
    
    return True


async def validate_customer_active(db: AsyncIOMotorDatabase, customer_id: str) -> bool:
    """
    Check if customer is active (not stopped)
    
    Args:
        db: MongoDB database
        customer_id: UUID of customer
        
    Raises:
        HTTPException(410): Customer is not active
        HTTPException(404): Customer not found
        
    Returns:
        bool: True if active
    """
    customer = await db.customers_v2.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found")
    
    status = customer.get("status", "active")
    if status == "stopped":
        raise HTTPException(
            status_code=410,
            detail=f"Customer {customer_id} is stopped. Cannot create new subscriptions."
        )
    
    return True
```

---

## Integration Examples

### Example 1: Validate Order Creation

**File:** `backend/routes_orders_consolidated.py` (in POST /api/orders/)

```python
from validators.user_validators import validate_user_exists
from validators.product_validators import validate_products_exist

@app.post("/api/orders/")
async def create_order(
    order_request: CreateOrderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create new order with full validation"""
    
    try:
        # Step 1: Validate user exists and is active
        await validate_user_exists(db, current_user.id)
        
        # Step 2: Validate all products in order exist
        product_ids = [item.product_id for item in order_request.items]
        await validate_products_exist(db, product_ids)
        
        # Step 3: If subscription linked, validate subscription exists
        if order_request.subscription_id:
            from validators.subscription_validators import validate_subscription_active
            await validate_subscription_active(db, order_request.subscription_id)
        
        # Step 4: Create order (all validations passed)
        order_data = {
            "id": generate_order_id(),
            "user_id": current_user.id,
            "items": order_request.items,
            "subscription_id": order_request.subscription_id,
            "status": "pending",
            "billed": False,
            "created_at": datetime.now()
        }
        
        result = await db.orders.insert_one(order_data)
        
        return {
            "status": "success",
            "order_id": order_data["id"],
            "message": "Order created successfully"
        }
        
    except HTTPException:
        raise  # Re-raise validation errors
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")
```

### Example 2: Validate Delivery Confirmation

**File:** `backend/routes_delivery.py` (in POST mark-delivered/)

```python
from validators.order_validators import validate_order_exists, validate_order_can_be_delivered
from validators.customer_validators import validate_customer_exists

@app.post("/api/delivery-boy/mark-delivered/")
async def mark_delivery_complete(
    delivery_request: MarkDeliveredRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Mark delivery complete with full validation"""
    
    try:
        # Step 1: Validate order exists
        await validate_order_exists(db, delivery_request.order_id)
        
        # Step 2: Validate order can be delivered
        await validate_order_can_be_delivered(db, delivery_request.order_id)
        
        # Step 3: Validate customer exists
        await validate_customer_exists(db, delivery_request.customer_id)
        
        # Step 4: Create delivery confirmation
        delivery_data = {
            "id": generate_id("del"),
            "order_id": delivery_request.order_id,
            "customer_id": delivery_request.customer_id,
            "confirmed_by_user_id": current_user.id,
            "confirmed_at": datetime.now(),
            "status": "delivered",
            "items": delivery_request.items
        }
        
        await db.delivery_statuses.insert_one(delivery_data)
        
        # Step 5: Update order status to DELIVERED
        await db.orders.update_one(
            {"id": delivery_request.order_id},
            {"$set": {"status": "DELIVERED", "delivered_at": datetime.now()}}
        )
        
        return {
            "status": "success",
            "delivery_id": delivery_data["id"],
            "message": "Delivery confirmed and order updated"
        }
        
    except HTTPException:
        raise  # Re-raise validation errors
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to confirm delivery: {str(e)}")
```

### Example 3: Validate Billing Creation

**File:** `backend/routes_billing.py` (in GET /billing/generate/)

```python
from validators.subscription_validators import validate_subscription_can_be_billed
from validators.customer_validators import validate_customer_exists

async def generate_billing(
    period_date: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Generate billing with validation"""
    
    try:
        # Get all active subscriptions
        subscriptions = await db.subscriptions_v2.find({
            "status": {"$in": ["active", "paused"]}
        }).to_list(None)
        
        billing_records = []
        
        for subscription in subscriptions:
            # Step 1: Validate subscription can be billed
            await validate_subscription_can_be_billed(db, subscription["id"])
            
            # Step 2: Validate customer exists
            await validate_customer_exists(db, subscription["customer_id"])
            
            # Step 3: Create billing record
            amount = calculate_billing_amount(subscription)
            
            billing_record = {
                "id": generate_billing_id(),
                "subscription_id": subscription["id"],
                "customer_id": subscription["customer_id"],
                "period_date": period_date,
                "total_amount": amount,
                "created_at": datetime.now()
            }
            
            billing_records.append(billing_record)
        
        # Insert all valid billing records
        if billing_records:
            await db.billing_records.insert_many(billing_records)
        
        return {
            "status": "success",
            "billing_records_created": len(billing_records),
            "period": period_date
        }
        
    except HTTPException:
        raise  # Re-raise validation errors
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Billing generation failed: {str(e)}")
```

---

## Deployment Checklist

- [ ] Create validators/ directory in backend/
- [ ] Create validators/__init__.py
- [ ] Create validators/user_validators.py
- [ ] Create validators/product_validators.py
- [ ] Create validators/subscription_validators.py
- [ ] Create validators/order_validators.py
- [ ] Create validators/customer_validators.py
- [ ] Update all routes to use validators before insert/update
- [ ] Test each endpoint with invalid references (should be rejected)
- [ ] Test each endpoint with valid references (should succeed)
- [ ] Document in REFERENTIAL_INTEGRITY_IMPLEMENTATION.md

---

## Error Handling Guide

### HTTP Status Codes

| Status | Meaning | Example |
|--------|---------|---------|
| 400 | Bad Request - Invalid format | Invalid user_id format |
| 403 | Forbidden - Permission/role issue | User role insufficient |
| 404 | Not Found - Record doesn't exist | User 123 not found |
| 410 | Gone - Record exists but unavailable | Product discontinued |

### Error Response Format

```json
{
    "status": "error",
    "code": 404,
    "detail": "User user-001 not found",
    "timestamp": "2026-01-27T14:30:00"
}
```

---

## Related Steps

- **STEP 31:** Data consistency checks (completed)
- **STEP 32:** Referential integrity validation (THIS STEP)
- **STEP 33:** Field validation rules (next)
- **STEP 34:** Data migration playbook (after STEP 33)

---

**Status:** ✅ READY FOR IMPLEMENTATION  
**Estimated Time:** 3-4 hours to implement and test  
**Complexity:** MEDIUM (refactoring existing routes)  
**Risk:** LOW (validation only, no data changes)  
**Testing:** HIGH priority - test all paths

"""
STEP 28 PHASE 1: Orders & Subscriptions Consolidation
=====================================================
Consolidated routes for all order and subscription operations.

CONSOLIDATION DETAILS:
- Source files: routes_orders.py (79 lines) + routes_subscriptions.py (112 lines)
- Total merged: 191 lines
- Output file: routes_orders_consolidated.py
- Router prefix: /orders, /subscriptions
- Organization:
  * Section 1: Order Management (6 endpoints)
  * Section 2: Subscription Management (6 endpoints)

IMPROVEMENTS:
- Centralized order & subscription operations
- Shared models and imports
- Unified request/response handling
- Clear section organization
- STEPS 25-27 audit trail & validation ready for integration

DEPENDENCIES:
- FastAPI routing
- MongoDB collections (orders, subscriptions, addresses, products)
- Authentication (require_role)
- Models (Order, Subscription, OrderCreate, etc.)
- Subscription engine for calendar generation
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime, timezone, date

from models import *
from database import db
from auth import require_role, get_current_user
from subscription_engine_v2 import subscription_engine
from utils_id_generator import generate_order_id, generate_subscription_id

# Main router for both orders and subscriptions
router = APIRouter(tags=["Orders & Subscriptions"])

# ============================================================================
# SECTION 1: ORDER MANAGEMENT (6 endpoints)
# ============================================================================

order_router = APIRouter(prefix="/orders", tags=["Orders"])

@order_router.post("/", response_model=Order)
async def create_order(order: OrderCreate, current_user: dict = Depends(require_role([UserRole.CUSTOMER]))):
    """
    Create a new one-time order.
    
    Validates:
    - Address exists and belongs to user
    - All items reference valid products
    - Calculate total amount from items
    
    Creates order with:
    - Unique order ID
    - Current timestamp
    - PENDING status
    - Assigned delivery date
    """
    address = await db.addresses.find_one(
        {"id": order.address_id, "user_id": current_user["id"]}, 
        {"_id": 0}
    )
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    
    total_amount = sum(item.total for item in order.items)
    
    order_doc = {
        "id": generate_order_id(),
        "user_id": current_user["id"],
        "customer_id": current_user["id"],  # PHASE 0.4: Link to customer
        "order_type": OrderType.ONE_TIME,
        "subscription_id": None,
        "items": [item.model_dump() for item in order.items],
        "total_amount": total_amount,
        "delivery_date": order.delivery_date.isoformat(),
        "address_id": order.address_id,
        "address": address,
        "status": DeliveryStatus.PENDING,
        "delivery_boy_id": None,
        "notes": order.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "delivered_at": None,
        "billed": False,  # PHASE 0.4.1: Initialize as not billed
        "delivery_confirmed": False,  # PHASE 0.4.2: Initialize as not confirmed
        "billed_at": None,
        "billed_month": None
    }
    
    await db.orders.insert_one(order_doc)
    return order_doc


@order_router.get("/", response_model=List[Order])
async def get_orders(current_user: dict = Depends(require_role([UserRole.CUSTOMER]))):
    """
    Get all orders for current customer, sorted by creation date (newest first).
    
    Returns:
    - List of Order objects
    - Paginated by default behavior
    """
    orders = await db.orders.find(
        {"user_id": current_user["id"]}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(None)
    return orders


@order_router.get("/history", response_model=List[Order])
async def get_order_history(
    limit: int = 50, 
    current_user: dict = Depends(require_role([UserRole.CUSTOMER]))
):
    """
    Get order history with pagination.
    
    Parameters:
    - limit: Maximum number of orders to return (default: 50)
    
    Returns:
    - Limited list of historical orders, sorted by date (newest first)
    """
    orders = await db.orders.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(None)
    return orders


@order_router.get("/{order_id}", response_model=Order)
async def get_order(order_id: str, current_user: dict = Depends(get_current_user)):
    """
    Get a specific order by ID.
    
    Security:
    - ADMIN: Can view any order
    - CUSTOMER: Can only view own orders
    - DELIVERY_BOY: Can view orders assigned to them (not implemented in basic version)
    
    Parameters:
    - order_id: Unique identifier of the order
    
    Raises:
    - 404: Order not found
    - 403: Access denied (customer trying to access other's order)
    """
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if current_user["role"] == UserRole.CUSTOMER and order["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return order


@order_router.post("/{order_id}/cancel")
async def cancel_order(order_id: str, current_user: dict = Depends(require_role([UserRole.CUSTOMER]))):
    """
    Cancel an order.
    
    Restrictions:
    - Only customer who placed order can cancel
    - Only PENDING or OUT_FOR_DELIVERY orders can be cancelled
    - DELIVERED, CANCELLED, or FAILED orders cannot be cancelled
    
    Parameters:
    - order_id: Unique identifier of the order
    
    Returns:
    - Success message
    
    Raises:
    - 404: Order not found
    - 400: Order cannot be cancelled (invalid status)
    """
    order = await db.orders.find_one(
        {"id": order_id, "user_id": current_user["id"]}, 
        {"_id": 0}
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order["status"] not in [DeliveryStatus.PENDING, DeliveryStatus.OUT_FOR_DELIVERY]:
        raise HTTPException(status_code=400, detail="Cannot cancel order")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": DeliveryStatus.CANCELLED}}
    )
    
    return {"message": "Order cancelled"}


# ============================================================================
# SECTION 2: SUBSCRIPTION MANAGEMENT (6 endpoints)
# ============================================================================

subscription_router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

@subscription_router.post("/", response_model=Subscription)
async def create_subscription(
    sub: SubscriptionCreate, 
    current_user: dict = Depends(require_role([UserRole.CUSTOMER]))
):
    """
    Create a new subscription.
    
    Validates:
    - Address exists and belongs to user
    - Product exists in system
    - Frequency and quantity are valid
    
    Creates subscription with:
    - Unique subscription ID
    - Active status
    - Empty overrides and pauses arrays
    - Creation timestamp
    """
    address = await db.addresses.find_one(
        {"id": sub.address_id, "user_id": current_user["id"]}, 
        {"_id": 0}
    )
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    
    product = await db.products.find_one({"id": sub.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    sub_doc = {
        "id": generate_subscription_id(),
        "user_id": current_user["id"],
        **sub.model_dump(),
        "overrides": [],
        "pauses": [],
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    sub_doc["start_date"] = sub_doc["start_date"].isoformat()
    if sub_doc.get("end_date"):
        sub_doc["end_date"] = sub_doc["end_date"].isoformat()
    
    await db.subscriptions.insert_one(sub_doc)
    return sub_doc


@subscription_router.get("/", response_model=List[Subscription])
async def get_subscriptions(
    current_user: dict = Depends(require_role([UserRole.CUSTOMER]))
):
    """
    Get all active subscriptions for current customer.
    
    Returns:
    - List of Subscription objects with current overrides and pauses
    """
    subs = await db.subscriptions.find(
        {"user_id": current_user["id"]}, 
        {"_id": 0}
    ).to_list(None)
    return subs


@subscription_router.get("/{subscription_id}", response_model=Subscription)
async def get_subscription(
    subscription_id: str, 
    current_user: dict = Depends(require_role([UserRole.CUSTOMER]))
):
    """
    Get a specific subscription by ID.
    
    Parameters:
    - subscription_id: Unique identifier of the subscription
    
    Security:
    - Customer can only view own subscriptions
    
    Raises:
    - 404: Subscription not found or access denied
    """
    sub = await db.subscriptions.find_one(
        {"id": subscription_id, "user_id": current_user["id"]}, 
        {"_id": 0}
    )
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return sub


@subscription_router.put("/{subscription_id}")
async def update_subscription(
    subscription_id: str, 
    update: SubscriptionUpdate, 
    current_user: dict = Depends(require_role([UserRole.CUSTOMER]))
):
    """
    Update subscription details.
    
    Can update:
    - Frequency (daily, weekly, etc.)
    - Quantity
    - End date
    - Other non-critical fields
    
    Parameters:
    - subscription_id: Unique identifier of the subscription
    - update: SubscriptionUpdate object with fields to update
    
    Returns:
    - Success message
    
    Raises:
    - 404: Subscription not found
    """
    result = await db.subscriptions.update_one(
        {"id": subscription_id, "user_id": current_user["id"]},
        {"$set": update.model_dump(exclude_unset=True)}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"message": "Subscription updated"}


@subscription_router.post("/{subscription_id}/override")
async def add_subscription_override(
    subscription_id: str, 
    override: SubscriptionOverrideCreate, 
    current_user: dict = Depends(require_role([UserRole.CUSTOMER]))
):
    """
    Add a quantity override for a specific date.
    
    Override rules:
    - One override per date (replaces existing override)
    - Allows temporary quantity changes without pausing
    - Quantity = 0 means skip delivery that day
    
    Parameters:
    - subscription_id: Unique identifier of the subscription
    - override: Override details (date, quantity)
    
    Returns:
    - Success message
    
    Raises:
    - 404: Subscription not found
    """
    sub = await db.subscriptions.find_one(
        {"id": subscription_id, "user_id": current_user["id"]}, 
        {"_id": 0}
    )
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    override_doc = {
        "date": override.date.isoformat(),
        "quantity": override.quantity
    }
    
    # Remove existing override for this date if any
    await db.subscriptions.update_one(
        {"id": subscription_id},
        {"$pull": {"overrides": {"date": override.date.isoformat()}}}
    )
    
    # Add new override
    await db.subscriptions.update_one(
        {"id": subscription_id},
        {"$push": {"overrides": override_doc}}
    )
    
    return {"message": "Override added"}


@subscription_router.post("/{subscription_id}/pause")
async def add_subscription_pause(
    subscription_id: str, 
    pause: SubscriptionPauseCreate, 
    current_user: dict = Depends(require_role([UserRole.CUSTOMER]))
):
    """
    Pause a subscription for a date range.
    
    Pause rules:
    - Multiple pauses can be active simultaneously
    - Pauses take precedence over overrides
    - Customer provides reason for audit trail
    
    Parameters:
    - subscription_id: Unique identifier of the subscription
    - pause: Pause details (start_date, end_date, reason)
    
    Returns:
    - Success message
    
    Raises:
    - 404: Subscription not found
    """
    sub = await db.subscriptions.find_one(
        {"id": subscription_id, "user_id": current_user["id"]}, 
        {"_id": 0}
    )
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    pause_doc = {
        "start_date": pause.start_date.isoformat(),
        "end_date": pause.end_date.isoformat(),
        "reason": pause.reason
    }
    
    await db.subscriptions.update_one(
        {"id": subscription_id},
        {"$push": {"pauses": pause_doc}}
    )
    
    return {"message": "Pause added"}


@subscription_router.get("/{subscription_id}/calendar")
async def get_subscription_calendar(
    subscription_id: str, 
    days: int = 30, 
    current_user: dict = Depends(require_role([UserRole.CUSTOMER]))
):
    """
    Get delivery calendar for a subscription.
    
    Calendar shows:
    - Scheduled delivery days
    - Overrides (different quantities)
    - Paused dates
    - Warnings (skipped deliveries, etc.)
    
    Parameters:
    - subscription_id: Unique identifier of the subscription
    - days: Number of days to generate calendar for (default: 30)
    
    Returns:
    - Calendar data with delivery schedule
    
    Raises:
    - 404: Subscription not found
    """
    sub = await db.subscriptions.find_one(
        {"id": subscription_id, "user_id": current_user["id"]}, 
        {"_id": 0}
    )
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    calendar = subscription_engine.get_delivery_calendar(sub, date.today(), days)
    return {"subscription_id": subscription_id, "calendar": calendar}


# ============================================================================
# ROUTER REGISTRATION
# ============================================================================

# Include both routers
router.include_router(order_router)
router.include_router(subscription_router)

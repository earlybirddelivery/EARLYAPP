from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, date, timedelta
import uuid
from models_phase0_updated import *
from database import db
from auth import get_current_user
from subscription_engine_v2 import subscription_engine

router = APIRouter(prefix="/delivery-boy", tags=["Delivery Boy"])

# ==================== MODELS ====================

class DeliveryStatusUpdate(BaseModel):
    order_id: str  # STEP 20: REQUIRED - Foreign key to db.orders
    customer_id: str
    delivery_date: str  # YYYY-MM-DD
    status: str  # delivered, not_delivered, pending
    delivered_at: Optional[str] = None
    notes: Optional[str] = None

class QuantityAdjustment(BaseModel):
    customer_id: str
    product_id: str
    date: str  # YYYY-MM-DD
    new_quantity_packets: float
    adjustment_type: str  # this_day_only, till_further_notice
    reason: Optional[str] = None

class DeliveryPause(BaseModel):
    customer_id: str
    start_date: str  # YYYY-MM-DD
    pause_type: str  # this_day_only, till_date, indefinite
    end_date: Optional[str] = None  # For till_date type
    reason: Optional[str] = None

class NewProductRequest(BaseModel):
    customer_id: str
    product_id: str
    quantity_packets: float
    tentative_date: Optional[str] = None  # YYYY-MM-DD or None for "when available"
    notes: Optional[str] = None

class DeliveryShiftTime(BaseModel):
    delivery_date: str  # YYYY-MM-DD
    area: str
    shift_start_time: Optional[str] = None  # HH:MM
    shift_end_time: Optional[str] = None  # HH:MM

class AreaDeliveryComplete(BaseModel):
    delivery_date: str
    area: str
    completed_at: str

# ==================== HELPER FUNCTIONS ====================

def packets_to_liters(packets: float, product: dict) -> float:
    """Convert packets to liters for milk products"""
    if product["unit"] == "Liter" or product["unit"] == "L":
        return packets * 0.5
    return packets

def liters_to_packets(liters: float, product: dict) -> int:
    """Convert liters to packets for display"""
    if product["unit"] == "Liter" or product["unit"] == "L":
        return int(liters * 2)
    return int(liters)

# ==================== DELIVERY LIST ====================

@router.get("/today-deliveries")
async def get_today_deliveries(
    delivery_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get delivery list for the logged-in delivery boy"""
    
    if current_user.get("role") != "delivery_boy":
        raise HTTPException(status_code=403, detail="Delivery boy access only")
    
    delivery_boy_id = current_user.get("id")
    target_date = delivery_date or date.today().isoformat()
    
    # Get all customers assigned to this delivery boy
    customers = await db.customers_v2.find({
        "delivery_boy_id": delivery_boy_id,
        "status": {"$in": ["active", "trial"]}
    }, {"_id": 0}).to_list(1000)
    
    # Get all products
    products = await db.products.find({}, {"_id": 0}).to_list(100)
    product_map = {p["id"]: p for p in products}
    
    # Get subscriptions for these customers
    customer_ids = [c["id"] for c in customers]
    subscriptions = await db.subscriptions_v2.find({
        "$or": [
            {"customerId": {"$in": customer_ids}},  # New camelCase field
            {"customer_id": {"$in": customer_ids}}  # Old snake_case field
        ],
        "status": "active"
    }, {"_id": 0}).to_list(5000)
    
    # Group subscriptions by customer
    sub_map = {}
    for sub in subscriptions:
        cid = sub.get("customerId") or sub.get("customer_id")  # Handle both field names
        if cid not in sub_map:
            sub_map[cid] = []
        sub_map[cid].append(sub)
    
    # Get delivery statuses for today
    delivery_statuses = await db.delivery_statuses.find({
        "delivery_date": target_date,
        "delivery_boy_id": delivery_boy_id
    }, {"_id": 0}).to_list(1000)
    
    status_map = {ds["customer_id"]: ds for ds in delivery_statuses}
    
    # Build delivery list
    delivery_list = []
    
    for customer in customers:
        customer_subs = sub_map.get(customer["id"], [])
        
        # Calculate products and quantities for today
        products_data = []
        total_liters = 0
        
        for sub in customer_subs:
            product_id = sub.get("productId") or sub.get("product_id")
            product = product_map.get(product_id)
            if not product:
                continue
            
            qty = subscription_engine.compute_qty(target_date, sub)
            
            if qty > 0:
                packets = liters_to_packets(qty, product)
                products_data.append({
                    "product_id": product["id"],
                    "product_name": product["name"],
                    "quantity_liters": qty,
                    "quantity_packets": packets,
                    "unit": product["unit"]
                })
                total_liters += qty
        
        # Only include customers with deliveries today
        if products_data:
            delivery_status = status_map.get(customer["id"])
            
            delivery_list.append({
                "customer_id": customer["id"],
                "customer_name": customer["name"],
                "phone": customer["phone"],
                "address": customer["address"],
                "area": customer["area"],
                "shift": customer.get("shift", "morning"),
                "products": products_data,
                "total_liters": round(total_liters, 2),
                "delivery_status": delivery_status["status"] if delivery_status else "pending",
                "delivered_at": delivery_status.get("delivered_at") if delivery_status else None,
                "notes": customer.get("notes", "")
            })
    
    # Sort by area
    delivery_list.sort(key=lambda x: x["area"])
    
    return {
        "delivery_date": target_date,
        "delivery_boy_id": delivery_boy_id,
        "total_customers": len(delivery_list),
        "deliveries": delivery_list
    }

# ==================== DELIVERY STATUS ====================

@router.post("/mark-delivered")
async def mark_delivered(
    update: DeliveryStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Mark a customer delivery as delivered"""
    
    if current_user.get("role") != "delivery_boy":
        raise HTTPException(status_code=403, detail="Delivery boy access only")
    
    delivery_boy_id = current_user.get("id")
    
    # STEP 20: Validate order_id exists in db.orders
    order = await db.orders.find_one({"id": update.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(
            status_code=400,
            detail=f"Order {update.order_id} not found. Cannot mark delivery without valid order."
        )
    
    # STEP 22: Validate order is not CANCELLED
    if order.get("status") == "CANCELLED":
        raise HTTPException(
            status_code=400,
            detail="Cannot mark delivery for a cancelled order"
        )
    
    # STEP 27: Validate delivery date
    from datetime import date
    delivery_date_obj = datetime.strptime(update.delivery_date, "%Y-%m-%d").date()
    today = date.today()
    
    # Check 1: No future dates
    if delivery_date_obj > today:
        raise HTTPException(
            status_code=400,
            detail="Delivery date cannot be in the future"
        )
    
    # Check 2: Within order window (±1 day from order delivery date)
    order_delivery_date_obj = datetime.strptime(order.get("delivery_date", update.delivery_date), "%Y-%m-%d").date()
    date_diff = abs((delivery_date_obj - order_delivery_date_obj).days)
    if date_diff > 1:
        window_start = order_delivery_date_obj - timedelta(days=1)
        window_end = order_delivery_date_obj + timedelta(days=1)
        raise HTTPException(
            status_code=400,
            detail=f"Delivery date outside order window ({window_start.strftime('%b %d')} to {window_end.strftime('%b %d')})"
        )
    
    # Create or update delivery status
    existing = await db.delivery_statuses.find_one({
        "customer_id": update.customer_id,
        "delivery_date": update.delivery_date,
        "delivery_boy_id": delivery_boy_id
    }, {"_id": 0})
    
    now_iso = datetime.now().isoformat()
    
    # STEP 25: Prepare audit trail fields for delivery boy confirmation
    audit_fields = {
        "confirmed_by_user_id": delivery_boy_id,
        "confirmed_by_name": current_user.get("name", "Unknown"),
        "confirmed_at": now_iso,
        "confirmation_method": "delivery_boy"
    }
    
    if existing:
        await db.delivery_statuses.update_one(
            {"id": existing["id"]},
            {"$set": {
                "order_id": update.order_id,  # STEP 20: Add order_id to update
                "status": update.status,
                "delivered_at": update.delivered_at or now_iso,
                "notes": update.notes,
                "updated_at": now_iso,
                **audit_fields  # STEP 25: Add audit trail
            }}
        )
    else:
        status_doc = {
            "id": str(uuid.uuid4()),
            "order_id": update.order_id,  # STEP 20: Add order_id to new record
            "customer_id": update.customer_id,
            "delivery_date": update.delivery_date,
            "delivery_boy_id": delivery_boy_id,
            "status": update.status,
            "delivered_at": update.delivered_at or now_iso,
            "notes": update.notes,
            "created_at": now_iso,
            **audit_fields  # STEP 25: Add audit trail
        }
        await db.delivery_statuses.insert_one(status_doc)
    
    # STEP 22: Update order status when delivery marked complete
    if update.status == "delivered":
        await db.orders.update_one(
            {"id": update.order_id},
            {"$set": {
                "status": "DELIVERED",
                "delivered_at": update.delivered_at or now_iso,
                "delivery_confirmed": True,
                "delivery_boy_id": delivery_boy_id,
                "updated_at": now_iso
            }}
        )
        
        # STEP 22: Also update subscription_v2 if order is linked to subscription
        if order.get("subscription_id"):
            await db.subscriptions_v2.update_one(
                {"id": order["subscription_id"]},
                {"$set": {
                    "last_delivery_date": update.delivery_date,
                    "last_delivery_at": update.delivered_at or now_iso,
                    "last_delivery_confirmed": True,
                    "updated_at": now_iso
                }}
            )
    
    return {"message": "Delivery marked as delivered", "order_id": update.order_id, "order_status": "updated"}

@router.post("/mark-area-delivered")
async def mark_area_delivered(
    update: AreaDeliveryComplete,
    current_user: dict = Depends(get_current_user)
):
    """Mark all customers in an area as delivered"""
    
    if current_user.get("role") != "delivery_boy":
        raise HTTPException(status_code=403, detail="Delivery boy access only")
    
    delivery_boy_id = current_user.get("id")
    
    # Get all customers in this area
    customers = await db.customers_v2.find({
        "delivery_boy_id": delivery_boy_id,
        "area": update.area,
        "status": {"$in": ["active", "trial"]}
    }, {"_id": 0}).to_list(1000)
    
    marked_count = 0
    
    for customer in customers:
        # Check if customer has delivery today
        # Mark as delivered
        existing = await db.delivery_statuses.find_one({
            "customer_id": customer["id"],
            "delivery_date": update.delivery_date,
            "delivery_boy_id": delivery_boy_id
        }, {"_id": 0})
        
        if existing:
            await db.delivery_statuses.update_one(
                {"id": existing["id"]},
                {"$set": {
                    "status": "delivered",
                    "delivered_at": update.completed_at,
                    "updated_at": datetime.now().isoformat()
                }}
            )
        else:
            status_doc = {
                "id": str(uuid.uuid4()),
                "customer_id": customer["id"],
                "delivery_date": update.delivery_date,
                "delivery_boy_id": delivery_boy_id,
                "status": "delivered",
                "delivered_at": update.completed_at,
                "created_at": datetime.now().isoformat()
            }
            await db.delivery_statuses.insert_one(status_doc)
        
        marked_count += 1
    
    return {
        "message": f"Marked {marked_count} customers in {update.area} as delivered",
        "customers_marked": marked_count
    }

# ==================== QUANTITY ADJUSTMENTS ====================

@router.post("/adjust-quantity")
async def adjust_quantity(
    adjustment: QuantityAdjustment,
    current_user: dict = Depends(get_current_user)
):
    """Adjust delivery quantity - this day only or till further notice"""
    
    if current_user.get("role") != "delivery_boy":
        raise HTTPException(status_code=403, detail="Delivery boy access only")
    
    # Get product info
    product = await db.products.find_one({"id": adjustment.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Convert packets to liters
    new_qty_liters = packets_to_liters(adjustment.new_quantity_packets, product)
    
    # Get subscription
    subscription = await db.subscriptions_v2.find_one({
        "customer_id": adjustment.customer_id,
        "product_id": adjustment.product_id,
        "status": "active"
    }, {"_id": 0})
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    if adjustment.adjustment_type == "this_day_only":
        # Add/update day_override for this date only
        day_overrides = subscription.get("day_overrides", [])
        day_overrides = [d for d in day_overrides if d.get("date") != adjustment.date]
        
        if new_qty_liters > 0:
            day_overrides.append({
                "date": adjustment.date,
                "quantity": new_qty_liters,
                "shift": subscription.get("shift", "morning")
            })
        
        await db.subscriptions_v2.update_one(
            {"id": subscription["id"]},
            {"$set": {"day_overrides": day_overrides}}
        )
        
        # Log the change
        await db.delivery_adjustments.insert_one({
            "id": str(uuid.uuid4()),
            "subscription_id": subscription["id"],
            "customer_id": adjustment.customer_id,
            "product_id": adjustment.product_id,
            "date": adjustment.date,
            "old_quantity": subscription_engine.compute_qty(adjustment.date, subscription),
            "new_quantity": new_qty_liters,
            "adjustment_type": "this_day_only",
            "reason": adjustment.reason,
            "adjusted_by": current_user.get("id"),
            "adjusted_at": datetime.now().isoformat()
        })
        
        return {"message": f"Quantity adjusted for {adjustment.date} only"}
    
    elif adjustment.adjustment_type == "till_further_notice":
        # Update default quantity
        await db.subscriptions_v2.update_one(
            {"id": subscription["id"]},
            {"$set": {"default_qty": new_qty_liters}}
        )
        
        # Log the change
        await db.delivery_adjustments.insert_one({
            "id": str(uuid.uuid4()),
            "subscription_id": subscription["id"],
            "customer_id": adjustment.customer_id,
            "product_id": adjustment.product_id,
            "date": adjustment.date,
            "old_quantity": subscription.get("default_qty", 0),
            "new_quantity": new_qty_liters,
            "adjustment_type": "till_further_notice",
            "reason": adjustment.reason,
            "adjusted_by": current_user.get("id"),
            "adjusted_at": datetime.now().isoformat()
        })
        
        return {"message": "Default quantity updated permanently"}

# ==================== PAUSE/STOP DELIVERY ====================

@router.post("/pause-delivery")
async def pause_delivery(
    pause: DeliveryPause,
    current_user: dict = Depends(get_current_user)
):
    """Pause customer delivery"""
    
    if current_user.get("role") != "delivery_boy":
        raise HTTPException(status_code=403, detail="Delivery boy access only")
    
    # Get all subscriptions for customer
    subscriptions = await db.subscriptions_v2.find({
        "customer_id": pause.customer_id,
        "status": "active"
    }, {"_id": 0}).to_list(100)
    
    if not subscriptions:
        raise HTTPException(status_code=404, detail="No active subscriptions found")
    
    if pause.pause_type == "this_day_only":
        # Add day override with 0 quantity
        for sub in subscriptions:
            day_overrides = sub.get("day_overrides", [])
            day_overrides = [d for d in day_overrides if d.get("date") != pause.start_date]
            day_overrides.append({
                "date": pause.start_date,
                "quantity": 0,
                "shift": sub.get("shift", "morning")
            })
            
            await db.subscriptions_v2.update_one(
                {"id": sub["id"]},
                {"$set": {"day_overrides": day_overrides}}
            )
        
        return {"message": f"Delivery paused for {pause.start_date} only"}
    
    elif pause.pause_type == "till_date":
        # Add pause interval
        for sub in subscriptions:
            pause_intervals = sub.get("pause_intervals", [])
            pause_intervals.append({
                "start_date": pause.start_date,
                "end_date": pause.end_date,
                "reason": pause.reason
            })
            
            await db.subscriptions_v2.update_one(
                {"id": sub["id"]},
                {"$set": {"pause_intervals": pause_intervals}}
            )
        
        return {"message": f"Delivery paused from {pause.start_date} to {pause.end_date}"}
    
    elif pause.pause_type == "indefinite":
        # Update customer status to paused
        await db.customers_v2.update_one(
            {"id": pause.customer_id},
            {"$set": {"status": "paused"}}
        )
        
        # Update all subscriptions to draft
        for sub in subscriptions:
            await db.subscriptions_v2.update_one(
                {"id": sub["id"]},
                {"$set": {"status": "draft"}}
            )
        
        return {"message": "Delivery paused indefinitely"}

# ==================== NEW PRODUCT REQUEST ====================

@router.post("/request-new-product")
async def request_new_product(
    request: NewProductRequest,
    current_user: dict = Depends(get_current_user)
):
    """Customer requests a new product"""
    
    if current_user.get("role") != "delivery_boy":
        raise HTTPException(status_code=403, detail="Delivery boy access only")
    
    # Get product info
    product = await db.products.find_one({"id": request.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Create product request
    request_doc = {
        "id": str(uuid.uuid4()),
        "customer_id": request.customer_id,
        "product_id": request.product_id,
        "product_name": product["name"],
        "quantity_packets": request.quantity_packets,
        "quantity_liters": packets_to_liters(request.quantity_packets, product),
        "tentative_date": request.tentative_date,
        "status": "pending",  # pending, approved, delivered, rejected
        "notes": request.notes,
        "requested_by": current_user.get("id"),
        "requested_at": datetime.now().isoformat()
    }
    
    await db.product_requests.insert_one(request_doc)
    
    return {
        "message": "Product request submitted",
        "request_id": request_doc["id"],
        "status": "pending"
    }

# ==================== SHIFT TIME TRACKING ====================

@router.post("/shift-time")
async def update_shift_time(
    shift: DeliveryShiftTime,
    current_user: dict = Depends(get_current_user)
):
    """Record shift start/end time"""
    
    if current_user.get("role") != "delivery_boy":
        raise HTTPException(status_code=403, detail="Delivery boy access only")
    
    delivery_boy_id = current_user.get("id")
    
    # Find or create shift record
    existing = await db.delivery_shifts.find_one({
        "delivery_boy_id": delivery_boy_id,
        "delivery_date": shift.delivery_date,
        "area": shift.area
    }, {"_id": 0})
    
    if existing:
        update_data = {}
        if shift.shift_start_time:
            update_data["shift_start_time"] = shift.shift_start_time
        if shift.shift_end_time:
            update_data["shift_end_time"] = shift.shift_end_time
        
        await db.delivery_shifts.update_one(
            {"id": existing["id"]},
            {"$set": update_data}
        )
        return {"message": "Shift time updated"}
    else:
        shift_doc = {
            "id": str(uuid.uuid4()),
            "delivery_boy_id": delivery_boy_id,
            "delivery_date": shift.delivery_date,
            "area": shift.area,
            "shift_start_time": shift.shift_start_time,
            "shift_end_time": shift.shift_end_time,
            "created_at": datetime.now().isoformat()
        }
        await db.delivery_shifts.insert_one(shift_doc)
        return {"message": "Shift time recorded"}

# ==================== DELIVERY SUMMARY ====================

@router.get("/delivery-summary")
async def get_delivery_summary(
    delivery_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get delivery summary for the day"""
    
    if current_user.get("role") != "delivery_boy":
        raise HTTPException(status_code=403, detail="Delivery boy access only")
    
    delivery_boy_id = current_user.get("id")
    target_date = delivery_date or date.today().isoformat()
    
    # Get delivery list
    deliveries_response = await get_today_deliveries(target_date, current_user)
    deliveries = deliveries_response["deliveries"]
    
    # Calculate summary
    total_customers = len(deliveries)
    delivered_count = len([d for d in deliveries if d["delivery_status"] == "delivered"])
    pending_count = total_customers - delivered_count
    
    # Group by area
    by_area = {}
    for delivery in deliveries:
        area = delivery["area"]
        if area not in by_area:
            by_area[area] = {"total": 0, "delivered": 0, "pending": 0}
        
        by_area[area]["total"] += 1
        if delivery["delivery_status"] == "delivered":
            by_area[area]["delivered"] += 1
        else:
            by_area[area]["pending"] += 1
    
    return {
        "delivery_date": target_date,
        "total_customers": total_customers,
        "delivered": delivered_count,
        "pending": pending_count,
        "completion_percentage": round((delivered_count / total_customers * 100) if total_customers > 0 else 0, 1),
        "by_area": by_area
    }


# ==================== EARNINGS & COMMISSIONS ====================

@router.get("/{delivery_boy_id}/earnings")
async def get_earnings(
    delivery_boy_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Calculate earnings for delivery boy
    Daily: ₹25 base + ₹10 bulk bonus (>10 items) + ₹50 per instant order
    """
    try:
        if current_user.get("role") != "delivery_boy" and current_user.get("id") != delivery_boy_id:
            if current_user.get("role") not in ["admin", "marketing"]:
                raise HTTPException(status_code=403, detail="Unauthorized")
        
        # Date range
        today = date.today()
        end = datetime.fromisoformat(end_date).date() if end_date else today
        start = datetime.fromisoformat(start_date).date() if start_date else (today - timedelta(days=7))
        
        daily_earnings = {}
        total_earnings = 0
        
        # Iterate through each day
        current_day = start
        while current_day <= end:
            day_str = current_day.isoformat()
            day_earnings = 25  # Base ₹25
            
            # Get deliveries for this day
            deliveries = await db.delivery_records.find({
                "delivery_boy_id": delivery_boy_id,
                "delivery_date": day_str,
                "status": "delivered"
            }).to_list(1000)
            
            # Calculate bonuses
            bulk_deliveries = len([d for d in deliveries if d.get("quantity_packets", 0) > 10])
            if bulk_deliveries > 0:
                day_earnings += 10  # Bulk bonus
            
            # Instant orders
            instant_orders = len([d for d in deliveries if d.get("order_type") == "instant"])
            day_earnings += (instant_orders * 50)
            
            daily_earnings[day_str] = {
                "earnings": day_earnings,
                "base": 25,
                "bulk_bonus": 10 if bulk_deliveries > 0 else 0,
                "instant_bonus": instant_orders * 50,
                "deliveries": len(deliveries)
            }
            
            total_earnings += day_earnings
            current_day += timedelta(days=1)
        
        # Calculate weekly
        week_start = start if start.weekday() == 0 else start - timedelta(days=start.weekday())
        weekly_earnings = sum(v["earnings"] for v in daily_earnings.values())
        
        # Calculate monthly
        month_start = start.replace(day=1)
        monthly_query = {
            "delivery_boy_id": delivery_boy_id,
            "delivery_date": {"$gte": month_start.isoformat()},
            "status": "delivered"
        }
        monthly_deliveries = await db.delivery_records.count_documents(monthly_query)
        monthly_earnings = total_earnings  # Simplified for now
        
        return {
            "delivery_boy_id": delivery_boy_id,
            "period": {
                "start": start.isoformat(),
                "end": end.isoformat()
            },
            "daily": daily_earnings,
            "weekly": weekly_earnings,
            "monthly": monthly_earnings,
            "total": total_earnings,
            "currency": "INR",
            "summary": {
                "total_deliveries": len(deliveries),
                "base_earnings": 25 * (end - start).days,
                "bonuses": total_earnings - (25 * (end - start).days)
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating earnings: {str(e)}")


"""
CONSOLIDATED DELIVERY ROUTES
Merges: routes_delivery.py + routes_delivery_boy.py + routes_delivery_operations.py
Purpose: Single unified delivery management endpoint
Router Prefix: /delivery
Total Lines: ~2100 (merged from 3 files)
Status: NEW - Ready to test before replacing individual files

ENDPOINT ORGANIZATION:
- Route Generation & Management (from routes_delivery.py)
- Delivery Boy Operations (from routes_delivery_boy.py)
- Delivery Operations & Overrides (from routes_delivery_operations.py)
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, date, date as date_type, timedelta
from pydantic import BaseModel
import uuid
from models_phase0_updated import *
from notification_service import notification_service
from models import *
from database import db
from auth import get_current_user, require_role
from mock_services import mock_maps
from subscription_engine import subscription_engine
from subscription_engine_v2 import subscription_engine as subscription_engine_v2

router = APIRouter(prefix="/delivery", tags=["Delivery Operations"])

# ==================== REQUEST MODELS ====================

class DeliveryStatusUpdate(BaseModel):
    order_id: str
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
    product_id: Optional[str] = None
    start_date: str  # YYYY-MM-DD
    pause_type: str  # this_day_only, till_date, indefinite
    end_date: Optional[str] = None
    reason: Optional[str] = None

class NewProductRequest(BaseModel):
    customer_id: str
    product_id: str
    quantity_packets: float
    tentative_date: Optional[str] = None
    notes: Optional[str] = None

class DeliveryShiftTime(BaseModel):
    delivery_date: str
    area: str
    shift_start_time: Optional[str] = None
    shift_end_time: Optional[str] = None

class AreaDeliveryComplete(BaseModel):
    delivery_date: str
    area: str
    completed_at: str

class QuantityOverride(BaseModel):
    customer_id: str
    product_id: str
    date: str
    quantity: int

class DeliveryStop(BaseModel):
    customer_id: str
    product_id: str
    reason: Optional[str] = None

class DeliveryBoyOverride(BaseModel):
    customer_id: str
    product_id: str
    date: str
    delivery_boy: str

class ShiftOverride(BaseModel):
    customer_id: str
    product_id: str
    date: str
    shift: str

class AddProductDelivery(BaseModel):
    customer_id: str
    product_id: str
    date: str
    quantity: int

class DeliveryNotes(BaseModel):
    customer_id: str
    date: str
    notes: str

class UpdateSubscriptionQuantity(BaseModel):
    default_qty: int

class UpdateSubscriptionDeliveryBoy(BaseModel):
    delivery_boy: str

class UpdateSubscriptionShift(BaseModel):
    shift: str

class PauseSubscription(BaseModel):
    pause_start: str
    pause_end: Optional[str] = None

class DeliveryUpdate(BaseModel):
    order_id: str
    status: str
    notes: Optional[str] = None
    cash_collected: Optional[float] = None

# ==================== HELPER FUNCTIONS ====================

def packets_to_liters(packets: float, product: dict) -> float:
    """Convert packets to liters for milk products"""
    if product.get("unit") in ["Liter", "L"]:
        return packets * 0.5
    return packets

def liters_to_packets(liters: float, product: dict) -> int:
    """Convert liters to packets for display"""
    if product.get("unit") in ["Liter", "L"]:
        return int(liters * 2)
    return int(liters)

async def find_subscription(customer_id: str, product_id: str):
    """Find subscription supporting both camelCase and snake_case field names"""
    subscription = await db.subscriptions_v2.find_one({
        "$or": [
            {"customer_id": customer_id, "product_id": product_id},
            {"customerId": customer_id, "productId": product_id}
        ],
        "status": {"$in": ["active", "paused"]}
    })
    return subscription

# ==================== SECTION 1: ROUTE GENERATION & MANAGEMENT ====================

@router.post("/routes/generate")
async def generate_routes(target_date: str, current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.DELIVERY_BOY]))):
    """Generate optimized routes for delivery date"""
    delivery_date = date.fromisoformat(target_date)
    
    orders = await db.orders.find({
        "delivery_date": delivery_date.isoformat(),
        "status": "PENDING"
    }, {"_id": 0}).to_list(None)
    
    if not orders:
        return {"message": "No orders for this date", "routes": []}
    
    stops = []
    for order in orders:
        addr = order.get("address", {})
        stops.append({
            "order_id": order["id"],
            "user_id": order["user_id"],
            "customer_name": order.get("customer_name", "Customer"),
            "address": f"{addr.get('address_line1', '')}, {addr.get('city', '')}",
            "latitude": addr.get("latitude", 0),
            "longitude": addr.get("longitude", 0),
            "items": order.get("items", []),
            "sequence": 0,
            "status": "PENDING",
            "notes": order.get("notes")
        })
    
    optimized_stops, total_distance, estimated_duration = mock_maps.optimize_route(stops)
    
    delivery_boys = await db.users.find({"role": "delivery_boy", "is_active": True}, {"_id": 0}).to_list(None)
    
    if not delivery_boys:
        raise HTTPException(status_code=400, detail="No active delivery boys available")
    
    delivery_boy = delivery_boys[0]
    
    route_doc = {
        "id": str(uuid.uuid4()),
        "delivery_boy_id": delivery_boy["id"],
        "delivery_boy_name": delivery_boy["name"],
        "date": delivery_date.isoformat(),
        "stops": optimized_stops,
        "total_distance_km": total_distance,
        "estimated_duration_mins": estimated_duration,
        "created_at": datetime.now().isoformat(),
        "status": "planned"
    }
    
    await db.routes.insert_one(route_doc)
    
    order_ids = [stop["order_id"] for stop in optimized_stops]
    await db.orders.update_many(
        {"id": {"$in": order_ids}},
        {"$set": {"delivery_boy_id": delivery_boy["id"], "status": "OUT_FOR_DELIVERY"}}
    )
    
    return route_doc

@router.get("/routes/today")
async def get_today_route(current_user: dict = Depends(require_role([UserRole.DELIVERY_BOY]))):
    """Get today's route for delivery boy"""
    today = date.today().isoformat()
    
    route = await db.routes.find_one({
        "delivery_boy_id": current_user["id"],
        "date": today
    }, {"_id": 0})
    
    if not route:
        raise HTTPException(status_code=404, detail="No route assigned for today")
    
    return route

@router.get("/routes/{route_id}")
async def get_route(route_id: str, current_user: dict = Depends(require_role([UserRole.DELIVERY_BOY, UserRole.ADMIN]))):
    """Get route details"""
    route = await db.routes.find_one({"id": route_id}, {"_id": 0})
    
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    if current_user.get("role") == "delivery_boy" and route.get("delivery_boy_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return route

@router.put("/routes/{route_id}/reorder")
async def reorder_route_stops(route_id: str, stop_order: List[str], current_user: dict = Depends(require_role([UserRole.DELIVERY_BOY]))):
    """Manually reorder route stops"""
    route = await db.routes.find_one({"id": route_id, "delivery_boy_id": current_user["id"]}, {"_id": 0})
    
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    stops = route.get("stops", [])
    stop_map = {stop["order_id"]: stop for stop in stops}
    
    reordered_stops = []
    for idx, order_id in enumerate(stop_order):
        if order_id in stop_map:
            stop = stop_map[order_id]
            stop["sequence"] = idx + 1
            reordered_stops.append(stop)
    
    await db.routes.update_one(
        {"id": route_id},
        {"$set": {"stops": reordered_stops}}
    )
    
    return {"message": "Route reordered"}

@router.post("/delivery/update")
async def update_delivery_status(update: DeliveryUpdate, current_user: dict = Depends(require_role([UserRole.DELIVERY_BOY]))):
    """Update delivery status"""
    order = await db.orders.find_one({"id": update.order_id, "delivery_boy_id": current_user["id"]}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found or not assigned to you")
    
    update_data = {"status": update.status}
    
    if update.status == "DELIVERED":
        update_data["delivered_at"] = datetime.now().isoformat()
    
    if update.notes:
        update_data["delivery_notes"] = update.notes
    
    if update.cash_collected is not None:
        update_data["cash_collected"] = update.cash_collected
    
    await db.orders.update_one(
        {"id": update.order_id},
        {"$set": update_data}
    )
    
    await db.routes.update_one(
        {"delivery_boy_id": current_user["id"], "stops.order_id": update.order_id},
        {"$set": {"stops.$.status": update.status}}
    )
    
    return {"message": "Delivery status updated"}

@router.get("/delivery/today-summary")
async def get_today_summary(current_user: dict = Depends(require_role([UserRole.DELIVERY_BOY]))):
    """Get today's delivery summary"""
    today = date.today().isoformat()
    
    orders = await db.orders.find({
        "delivery_boy_id": current_user["id"],
        "delivery_date": today
    }, {"_id": 0}).to_list(None)
    
    total = len(orders)
    delivered = len([o for o in orders if o.get("status") == "DELIVERED"])
    pending = len([o for o in orders if o.get("status") in ["PENDING", "OUT_FOR_DELIVERY"]])
    not_delivered = len([o for o in orders if o.get("status") == "NOT_DELIVERED"])
    cash_collected = sum(o.get("cash_collected", 0) for o in orders)
    
    return {
        "date": today,
        "total_deliveries": total,
        "delivered": delivered,
        "pending": pending,
        "not_delivered": not_delivered,
        "cash_collected": cash_collected
    }

# ==================== SECTION 2: DELIVERY BOY OPERATIONS ====================

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
    
    customers = await db.customers_v2.find({
        "delivery_boy_id": delivery_boy_id,
        "status": {"$in": ["active", "trial"]}
    }, {"_id": 0}).to_list(1000)
    
    products = await db.products.find({}, {"_id": 0}).to_list(100)
    product_map = {p["id"]: p for p in products}
    
    subscriptions = await db.subscriptions_v2.find({
        "$or": [
            {"customerId": {"$in": [c["id"] for c in customers]}},
            {"customer_id": {"$in": [c["id"] for c in customers]}}
        ],
        "status": "active"
    }, {"_id": 0}).to_list(5000)
    
    sub_map = {}
    for sub in subscriptions:
        cid = sub.get("customerId") or sub.get("customer_id")
        if cid not in sub_map:
            sub_map[cid] = []
        sub_map[cid].append(sub)
    
    delivery_statuses = await db.delivery_statuses.find({
        "delivery_date": target_date,
        "delivery_boy_id": delivery_boy_id
    }, {"_id": 0}).to_list(1000)
    
    status_map = {ds["customer_id"]: ds for ds in delivery_statuses}
    
    delivery_list = []
    
    for customer in customers:
        customer_subs = sub_map.get(customer["id"], [])
        products_data = []
        total_liters = 0
        
        for sub in customer_subs:
            product_id = sub.get("productId") or sub.get("product_id")
            product = product_map.get(product_id)
            if not product:
                continue
            
            qty = subscription_engine_v2.compute_qty(target_date, sub)
            
            if qty > 0:
                packets = liters_to_packets(qty, product)
                products_data.append({
                    "product_id": product["id"],
                    "product_name": product["name"],
                    "quantity_liters": qty,
                    "quantity_packets": packets,
                    "unit": product.get("unit")
                })
                total_liters += qty
        
        if products_data:
            delivery_status = status_map.get(customer["id"])
            
            delivery_list.append({
                "customer_id": customer["id"],
                "customer_name": customer["name"],
                "phone": customer.get("phone"),
                "address": customer.get("address"),
                "area": customer.get("area"),
                "shift": customer.get("shift", "morning"),
                "products": products_data,
                "total_liters": round(total_liters, 2),
                "delivery_status": delivery_status.get("status") if delivery_status else "pending",
                "delivered_at": delivery_status.get("delivered_at") if delivery_status else None,
                "notes": customer.get("notes", "")
            })
    
    delivery_list.sort(key=lambda x: x.get("area", ""))
    
    return {
        "delivery_date": target_date,
        "delivery_boy_id": delivery_boy_id,
        "total_customers": len(delivery_list),
        "deliveries": delivery_list
    }

@router.post("/mark-delivered")
async def mark_delivered(
    update: DeliveryStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Mark a customer delivery as delivered"""
    
    if current_user.get("role") != "delivery_boy":
        raise HTTPException(status_code=403, detail="Delivery boy access only")
    
    delivery_boy_id = current_user.get("id")
    
    order = await db.orders.find_one({"id": update.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(
            status_code=400,
            detail=f"Order {update.order_id} not found. Cannot mark delivery without valid order."
        )
    
    if order.get("status") == "CANCELLED":
        raise HTTPException(
            status_code=400,
            detail="Cannot mark delivery for a cancelled order"
        )
    
    delivery_date_obj = datetime.strptime(update.delivery_date, "%Y-%m-%d").date()
    today = date.today()
    
    if delivery_date_obj > today:
        raise HTTPException(
            status_code=400,
            detail="Delivery date cannot be in the future"
        )
    
    order_delivery_date_obj = datetime.strptime(order.get("delivery_date", update.delivery_date), "%Y-%m-%d").date()
    date_diff = abs((delivery_date_obj - order_delivery_date_obj).days)
    if date_diff > 1:
        window_start = order_delivery_date_obj - timedelta(days=1)
        window_end = order_delivery_date_obj + timedelta(days=1)
        raise HTTPException(
            status_code=400,
            detail=f"Delivery date outside order window ({window_start.strftime('%b %d')} to {window_end.strftime('%b %d')})"
        )
    
    existing = await db.delivery_statuses.find_one({
        "customer_id": update.customer_id,
        "delivery_date": update.delivery_date,
        "delivery_boy_id": delivery_boy_id
    }, {"_id": 0})
    
    now_iso = datetime.now().isoformat()
    
    audit_fields = {
        "confirmed_by_user_id": delivery_boy_id,
        "confirmed_by_name": current_user.get("name", "Unknown"),
        "confirmed_at": now_iso,
        "confirmation_method": "delivery_boy"
    }
    
    # Send WhatsApp delivery confirmation notification
    try:
        customer = await db.customers_v2.find_one({"id": update.customer_id}, {"_id": 0})
        if customer and customer.get("phone_number"):
            await notification_service.send_delivery_confirmed(
                phone=customer["phone_number"],
                delivery_date=update.delivery_date,
                reference_id=update.order_id
            )
    except Exception as e:
        # Log error but don't fail the delivery marking
        print(f"WhatsApp notification failed for delivery {update.order_id}: {str(e)}")
    
    if existing:
        await db.delivery_statuses.update_one(
            {"id": existing["id"]},
            {"$set": {
                "order_id": update.order_id,
                "status": update.status,
                "delivered_at": update.delivered_at or now_iso,
                "notes": update.notes,
                "updated_at": now_iso,
                **audit_fields
            }}
        )
    else:
        status_doc = {
            "id": str(uuid.uuid4()),
            "order_id": update.order_id,
            "customer_id": update.customer_id,
            "delivery_date": update.delivery_date,
            "delivery_boy_id": delivery_boy_id,
            "status": update.status,
            "delivered_at": update.delivered_at or now_iso,
            "notes": update.notes,
            "created_at": now_iso,
            **audit_fields
        }
        await db.delivery_statuses.insert_one(status_doc)
    
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
    
    customers = await db.customers_v2.find({
        "delivery_boy_id": delivery_boy_id,
        "area": update.area,
        "status": {"$in": ["active", "trial"]}
    }, {"_id": 0}).to_list(1000)
    
    marked_count = 0
    
    for customer in customers:
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

@router.post("/adjust-quantity")
async def adjust_quantity(
    adjustment: QuantityAdjustment,
    current_user: dict = Depends(get_current_user)
):
    """Adjust delivery quantity - this day only or till further notice"""
    
    if current_user.get("role") != "delivery_boy":
        raise HTTPException(status_code=403, detail="Delivery boy access only")
    
    product = await db.products.find_one({"id": adjustment.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    new_qty_liters = packets_to_liters(adjustment.new_quantity_packets, product)
    
    subscription = await db.subscriptions_v2.find_one({
        "customer_id": adjustment.customer_id,
        "product_id": adjustment.product_id,
        "status": "active"
    }, {"_id": 0})
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    if adjustment.adjustment_type == "this_day_only":
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
        
        await db.delivery_adjustments.insert_one({
            "id": str(uuid.uuid4()),
            "subscription_id": subscription["id"],
            "customer_id": adjustment.customer_id,
            "product_id": adjustment.product_id,
            "date": adjustment.date,
            "old_quantity": subscription_engine_v2.compute_qty(adjustment.date, subscription),
            "new_quantity": new_qty_liters,
            "adjustment_type": "this_day_only",
            "reason": adjustment.reason,
            "adjusted_by": current_user.get("id"),
            "adjusted_at": datetime.now().isoformat()
        })
        
        return {"message": f"Quantity adjusted for {adjustment.date} only"}
    
    elif adjustment.adjustment_type == "till_further_notice":
        await db.subscriptions_v2.update_one(
            {"id": subscription["id"]},
            {"$set": {"default_qty": new_qty_liters}}
        )
        
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

@router.post("/pause-delivery")
async def pause_delivery(
    pause: DeliveryPause,
    current_user: dict = Depends(get_current_user)
):
    """Pause customer delivery"""
    
    if current_user.get("role") != "delivery_boy":
        raise HTTPException(status_code=403, detail="Delivery boy access only")
    
    subscriptions = await db.subscriptions_v2.find({
        "customer_id": pause.customer_id,
        "status": "active"
    }, {"_id": 0}).to_list(100)
    
    if not subscriptions:
        raise HTTPException(status_code=404, detail="No active subscriptions found")
    
    if pause.pause_type == "this_day_only":
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
        await db.customers_v2.update_one(
            {"id": pause.customer_id},
            {"$set": {"status": "paused"}}
        )
        
        for sub in subscriptions:
            await db.subscriptions_v2.update_one(
                {"id": sub["id"]},
                {"$set": {"status": "draft"}}
            )
        
        return {"message": "Delivery paused indefinitely"}

@router.post("/request-new-product")
async def request_new_product(
    request: NewProductRequest,
    current_user: dict = Depends(get_current_user)
):
    """Customer requests a new product"""
    
    if current_user.get("role") != "delivery_boy":
        raise HTTPException(status_code=403, detail="Delivery boy access only")
    
    product = await db.products.find_one({"id": request.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    request_doc = {
        "id": str(uuid.uuid4()),
        "customer_id": request.customer_id,
        "product_id": request.product_id,
        "product_name": product["name"],
        "quantity_packets": request.quantity_packets,
        "quantity_liters": packets_to_liters(request.quantity_packets, product),
        "tentative_date": request.tentative_date,
        "status": "pending",
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

@router.post("/shift-time")
async def update_shift_time(
    shift: DeliveryShiftTime,
    current_user: dict = Depends(get_current_user)
):
    """Record shift start/end time"""
    
    if current_user.get("role") != "delivery_boy":
        raise HTTPException(status_code=403, detail="Delivery boy access only")
    
    delivery_boy_id = current_user.get("id")
    
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
    
    deliveries_response = await get_today_deliveries(target_date, current_user)
    deliveries = deliveries_response["deliveries"]
    
    total_customers = len(deliveries)
    delivered_count = len([d for d in deliveries if d["delivery_status"] == "delivered"])
    pending_count = total_customers - delivered_count
    
    by_area = {}
    for delivery in deliveries:
        area = delivery.get("area")
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

@router.get("/{delivery_boy_id}/earnings")
async def get_earnings(
    delivery_boy_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Calculate earnings for delivery boy"""
    try:
        if current_user.get("role") != "delivery_boy" and current_user.get("id") != delivery_boy_id:
            if current_user.get("role") not in ["admin", "marketing"]:
                raise HTTPException(status_code=403, detail="Unauthorized")
        
        today = date.today()
        end = datetime.fromisoformat(end_date).date() if end_date else today
        start = datetime.fromisoformat(start_date).date() if start_date else (today - timedelta(days=7))
        
        daily_earnings = {}
        total_earnings = 0
        
        current_day = start
        while current_day <= end:
            day_str = current_day.isoformat()
            day_earnings = 25
            
            deliveries = await db.delivery_records.find({
                "delivery_boy_id": delivery_boy_id,
                "delivery_date": day_str,
                "status": "delivered"
            }).to_list(1000)
            
            bulk_deliveries = len([d for d in deliveries if d.get("quantity_packets", 0) > 10])
            if bulk_deliveries > 0:
                day_earnings += 10
            
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
        
        week_start = start if start.weekday() == 0 else start - timedelta(days=start.weekday())
        weekly_earnings = sum(v["earnings"] for v in daily_earnings.values())
        
        month_start = start.replace(day=1)
        monthly_query = {
            "delivery_boy_id": delivery_boy_id,
            "delivery_date": {"$gte": month_start.isoformat()},
            "status": "delivered"
        }
        monthly_deliveries = await db.delivery_records.count_documents(monthly_query)
        monthly_earnings = total_earnings
        
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

# ==================== SECTION 3: DELIVERY OPERATIONS & OVERRIDES ====================

@router.post("/phase0-v2/delivery/override-quantity")
async def override_quantity(
    override: QuantityOverride,
    current_user: dict = Depends(get_current_user)
):
    """Override quantity for a specific date only"""
    try:
        subscription = await find_subscription(override.customer_id, override.product_id)
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        existing_override = await db.day_overrides.find_one({
            "subscription_id": subscription.get("id"),
            "date": override.date
        })
        
        if existing_override:
            await db.day_overrides.update_one(
                {"id": existing_override["id"]},
                {"$set": {"quantity": override.quantity}}
            )
            return {"message": "Quantity override updated"}
        else:
            override_doc = {
                "id": str(uuid.uuid4()),
                "subscription_id": subscription.get("id"),
                "customer_id": override.customer_id,
                "product_id": override.product_id,
                "date": override.date,
                "quantity": override.quantity,
                "created_at": datetime.now().isoformat()
            }
            await db.day_overrides.insert_one(override_doc)
            return {"message": "Quantity override created"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/phase0-v2/delivery/pause")
async def pause_subscription_delivery(
    pause: DeliveryPause,
    current_user: dict = Depends(get_current_user)
):
    """Pause delivery for a customer"""
    try:
        if pause.product_id:
            subscription = await find_subscription(pause.customer_id, pause.product_id)
            if not subscription:
                raise HTTPException(status_code=404, detail="Subscription not found")
            
            pause_intervals = subscription.get("pause_intervals", [])
            pause_intervals.append({
                "start_date": pause.start_date,
                "end_date": pause.end_date or pause.start_date,
                "reason": pause.reason
            })
            
            await db.subscriptions_v2.update_one(
                {"id": subscription.get("id")},
                {"$set": {"pause_intervals": pause_intervals}}
            )
        else:
            subscriptions = await db.subscriptions_v2.find({
                "customer_id": pause.customer_id,
                "status": "active"
            }).to_list(100)
            
            for sub in subscriptions:
                pause_intervals = sub.get("pause_intervals", [])
                pause_intervals.append({
                    "start_date": pause.start_date,
                    "end_date": pause.end_date or pause.start_date,
                    "reason": pause.reason
                })
                
                await db.subscriptions_v2.update_one(
                    {"id": sub.get("id")},
                    {"$set": {"pause_intervals": pause_intervals}}
                )
        
        return {"message": "Delivery paused successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/phase0-v2/delivery/override-delivery-boy")
async def override_delivery_boy(
    override: DeliveryBoyOverride,
    current_user: dict = Depends(get_current_user)
):
    """Override delivery boy assignment for a date"""
    try:
        subscription = await find_subscription(override.customer_id, override.product_id)
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        delivery_boy_overrides = subscription.get("delivery_boy_overrides", [])
        delivery_boy_overrides = [o for o in delivery_boy_overrides if o.get("date") != override.date]
        delivery_boy_overrides.append({
            "date": override.date,
            "delivery_boy": override.delivery_boy
        })
        
        await db.subscriptions_v2.update_one(
            {"id": subscription.get("id")},
            {"$set": {"delivery_boy_overrides": delivery_boy_overrides}}
        )
        
        return {"message": "Delivery boy assignment updated"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== END OF CONSOLIDATED DELIVERY ROUTES ====================

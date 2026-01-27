from fastapi import APIRouter, Depends, HTTPException
from typing import List
import uuid
from datetime import datetime, timezone, date

from models import *
from database import db
from auth import require_role
from mock_services import mock_maps
from subscription_engine import subscription_engine

router = APIRouter(prefix="/delivery", tags=["Delivery Operations"])

# ==================== ROUTE GENERATION ====================

@router.post("/routes/generate")
async def generate_routes(target_date: str, current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.DELIVERY_BOY]))):
    """Generate optimized routes for delivery date"""
    delivery_date = date.fromisoformat(target_date)
    
    # Get all pending orders for the date
    orders = await db.orders.find({
        "delivery_date": delivery_date.isoformat(),
        "status": DeliveryStatus.PENDING
    }, {"_id": 0}).to_list(None)
    
    if not orders:
        return {"message": "No orders for this date", "routes": []}
    
    # Convert orders to stops
    stops = []
    for order in orders:
        addr = order["address"]
        stops.append({
            "order_id": order["id"],
            "user_id": order["user_id"],
            "customer_name": order.get("customer_name", "Customer"),
            "address": f"{addr['address_line1']}, {addr['city']}",
            "latitude": addr["latitude"],
            "longitude": addr["longitude"],
            "items": order["items"],
            "sequence": 0,
            "status": DeliveryStatus.PENDING,
            "notes": order.get("notes")
        })
    
    # Optimize route
    optimized_stops, total_distance, estimated_duration = mock_maps.optimize_route(stops)
    
    # Get delivery boys
    delivery_boys = await db.users.find({"role": UserRole.DELIVERY_BOY, "is_active": True}, {"_id": 0}).to_list(None)
    
    if not delivery_boys:
        raise HTTPException(status_code=400, detail="No active delivery boys available")
    
    # Assign to first available delivery boy (simplified)
    delivery_boy = delivery_boys[0]
    
    route_doc = {
        "id": str(uuid.uuid4()),
        "delivery_boy_id": delivery_boy["id"],
        "delivery_boy_name": delivery_boy["name"],
        "date": delivery_date.isoformat(),
        "stops": optimized_stops,
        "total_distance_km": total_distance,
        "estimated_duration_mins": estimated_duration,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "planned"
    }
    
    await db.routes.insert_one(route_doc)
    
    # Update orders with delivery boy assignment
    order_ids = [stop["order_id"] for stop in optimized_stops]
    await db.orders.update_many(
        {"id": {"$in": order_ids}},
        {"$set": {"delivery_boy_id": delivery_boy["id"], "status": DeliveryStatus.OUT_FOR_DELIVERY}}
    )
    
    return route_doc

@router.get("/routes/today", response_model=Route)
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

@router.get("/routes/{route_id}", response_model=Route)
async def get_route(route_id: str, current_user: dict = Depends(require_role([UserRole.DELIVERY_BOY, UserRole.ADMIN]))):
    """Get route details"""
    route = await db.routes.find_one({"id": route_id}, {"_id": 0})
    
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    # Delivery boys can only see their own routes
    if current_user["role"] == UserRole.DELIVERY_BOY and route["delivery_boy_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return route

@router.put("/routes/{route_id}/reorder")
async def reorder_route_stops(route_id: str, stop_order: List[str], current_user: dict = Depends(require_role([UserRole.DELIVERY_BOY]))):
    """Manually reorder route stops"""
    route = await db.routes.find_one({"id": route_id, "delivery_boy_id": current_user["id"]}, {"_id": 0})
    
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    stops = route["stops"]
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
    
    if update.status == DeliveryStatus.DELIVERED:
        update_data["delivered_at"] = datetime.now(timezone.utc).isoformat()
    
    if update.notes:
        update_data["delivery_notes"] = update.notes
    
    if update.cash_collected is not None:
        update_data["cash_collected"] = update.cash_collected
    
    await db.orders.update_one(
        {"id": update.order_id},
        {"$set": update_data}
    )
    
    # Update route stop status
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
    delivered = len([o for o in orders if o["status"] == DeliveryStatus.DELIVERED])
    pending = len([o for o in orders if o["status"] in [DeliveryStatus.PENDING, DeliveryStatus.OUT_FOR_DELIVERY]])
    not_delivered = len([o for o in orders if o["status"] == DeliveryStatus.NOT_DELIVERED])
    cash_collected = sum(o.get("cash_collected", 0) for o in orders)
    
    return {
        "date": today,
        "total_deliveries": total,
        "delivered": delivered,
        "pending": pending,
        "not_delivered": not_delivered,
        "cash_collected": cash_collected
    }

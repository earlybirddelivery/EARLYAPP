from fastapi import APIRouter, Depends, HTTPException
from typing import List
import uuid
from datetime import datetime, timezone

from models import *
from database import db
from auth import require_role, get_current_user

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.post("/", response_model=Order)
async def create_order(order: OrderCreate, current_user: dict = Depends(require_role([UserRole.CUSTOMER]))):
    address = await db.addresses.find_one({"id": order.address_id, "user_id": current_user["id"]}, {"_id": 0})
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    
    total_amount = sum(item.total for item in order.items)
    
    order_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
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
        "delivered_at": None
    }
    
    await db.orders.insert_one(order_doc)
    return order_doc

@router.get("/", response_model=List[Order])
async def get_orders(current_user: dict = Depends(require_role([UserRole.CUSTOMER]))):
    orders = await db.orders.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(None)
    return orders

@router.get("/history", response_model=List[Order])
async def get_order_history(limit: int = 50, current_user: dict = Depends(require_role([UserRole.CUSTOMER]))):
    orders = await db.orders.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(None)
    return orders

@router.get("/{order_id}", response_model=Order)
async def get_order(order_id: str, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if current_user["role"] == UserRole.CUSTOMER and order["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return order

@router.post("/{order_id}/cancel")
async def cancel_order(order_id: str, current_user: dict = Depends(require_role([UserRole.CUSTOMER]))):
    order = await db.orders.find_one({"id": order_id, "user_id": current_user["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order["status"] not in [DeliveryStatus.PENDING, DeliveryStatus.OUT_FOR_DELIVERY]:
        raise HTTPException(status_code=400, detail="Cannot cancel order")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": DeliveryStatus.CANCELLED}}
    )
    
    return {"message": "Order cancelled"}

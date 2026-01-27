from fastapi import APIRouter, Depends, HTTPException
from typing import List
import uuid
from datetime import datetime, timezone

from models import *
from database import db
from auth import require_role

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])

@router.post("/", response_model=Supplier)
async def create_supplier(supplier: SupplierCreate, current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    supplier_doc = {
        "id": str(uuid.uuid4()),
        **supplier.model_dump(),
        "is_active": True
    }
    await db.suppliers.insert_one(supplier_doc)
    return supplier_doc

@router.get("/", response_model=List[Supplier])
async def get_suppliers(current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.SUPPLIER]))):
    suppliers = await db.suppliers.find({}, {"_id": 0}).to_list(None)
    return suppliers

@router.get("/my-orders")
async def get_supplier_orders(current_user: dict = Depends(require_role([UserRole.SUPPLIER]))):
    # Find supplier by user email
    supplier = await db.suppliers.find_one({"email": current_user["email"]}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier profile not found")
    
    orders = await db.procurement_orders.find(
        {"supplier_id": supplier["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(None)
    
    return orders

@router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str, current_user: dict = Depends(require_role([UserRole.SUPPLIER, UserRole.ADMIN]))):
    if status not in ["pending", "confirmed", "delivered", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.procurement_orders.update_one(
        {"id": order_id},
        {"$set": {"status": status}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Order status updated"}

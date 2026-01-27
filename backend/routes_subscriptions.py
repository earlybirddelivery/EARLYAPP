from fastapi import APIRouter, Depends, HTTPException
from typing import List
import uuid
from datetime import datetime, timezone, date

from models import *
from database import db
from auth import require_role
from subscription_engine import subscription_engine

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

@router.post("/", response_model=Subscription)
async def create_subscription(sub: SubscriptionCreate, current_user: dict = Depends(require_role([UserRole.CUSTOMER]))):
    address = await db.addresses.find_one({"id": sub.address_id, "user_id": current_user["id"]}, {"_id": 0})
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    
    product = await db.products.find_one({"id": sub.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    sub_doc = {
        "id": str(uuid.uuid4()),
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

@router.get("/", response_model=List[Subscription])
async def get_subscriptions(current_user: dict = Depends(require_role([UserRole.CUSTOMER]))):
    subs = await db.subscriptions.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(None)
    return subs

@router.get("/{subscription_id}", response_model=Subscription)
async def get_subscription(subscription_id: str, current_user: dict = Depends(require_role([UserRole.CUSTOMER]))):
    sub = await db.subscriptions.find_one({"id": subscription_id, "user_id": current_user["id"]}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return sub

@router.put("/{subscription_id}")
async def update_subscription(subscription_id: str, update: SubscriptionUpdate, current_user: dict = Depends(require_role([UserRole.CUSTOMER]))):
    result = await db.subscriptions.update_one(
        {"id": subscription_id, "user_id": current_user["id"]},
        {"$set": update.model_dump(exclude_unset=True)}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"message": "Subscription updated"}

@router.post("/{subscription_id}/override")
async def add_subscription_override(subscription_id: str, override: SubscriptionOverrideCreate, current_user: dict = Depends(require_role([UserRole.CUSTOMER]))):
    sub = await db.subscriptions.find_one({"id": subscription_id, "user_id": current_user["id"]}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    override_doc = {
        "date": override.date.isoformat(),
        "quantity": override.quantity
    }
    
    await db.subscriptions.update_one(
        {"id": subscription_id},
        {"$pull": {"overrides": {"date": override.date.isoformat()}}}
    )
    
    await db.subscriptions.update_one(
        {"id": subscription_id},
        {"$push": {"overrides": override_doc}}
    )
    
    return {"message": "Override added"}

@router.post("/{subscription_id}/pause")
async def add_subscription_pause(subscription_id: str, pause: SubscriptionPauseCreate, current_user: dict = Depends(require_role([UserRole.CUSTOMER]))):
    sub = await db.subscriptions.find_one({"id": subscription_id, "user_id": current_user["id"]}, {"_id": 0})
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

@router.get("/{subscription_id}/calendar")
async def get_subscription_calendar(subscription_id: str, days: int = 30, current_user: dict = Depends(require_role([UserRole.CUSTOMER]))):
    sub = await db.subscriptions.find_one({"id": subscription_id, "user_id": current_user["id"]}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    calendar = subscription_engine.get_delivery_calendar(sub, date.today(), days)
    return {"subscription_id": subscription_id, "calendar": calendar}

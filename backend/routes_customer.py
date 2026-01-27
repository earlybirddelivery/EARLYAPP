from fastapi import APIRouter, Depends, HTTPException
from typing import List
import uuid
from datetime import date

from models import *
from database import db
from auth import require_role, get_current_user
from mock_services import mock_maps
from ai_service import ai_service
from subscription_engine import subscription_engine

router = APIRouter(prefix="/customers", tags=["Customers"])

# ==================== ADDRESSES ====================

@router.post("/addresses", response_model=Address)
async def create_address(address: AddressCreate, current_user: dict = Depends(require_role([UserRole.CUSTOMER]))):
    if not address.latitude or not address.longitude:
        lat, lng = mock_maps.geocode_address(f"{address.address_line1}, {address.city}", address.city)
        address.latitude = lat
        address.longitude = lng
    
    address_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        **address.model_dump()
    }
    
    if address.is_default:
        await db.addresses.update_many(
            {"user_id": current_user["id"]},
            {"$set": {"is_default": False}}
        )
    
    await db.addresses.insert_one(address_doc)
    return address_doc

@router.get("/addresses", response_model=List[Address])
async def get_addresses(current_user: dict = Depends(require_role([UserRole.CUSTOMER]))):
    addresses = await db.addresses.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(None)
    return addresses

@router.put("/addresses/{address_id}")
async def update_address(address_id: str, address: AddressCreate, current_user: dict = Depends(require_role([UserRole.CUSTOMER]))):
    result = await db.addresses.update_one(
        {"id": address_id, "user_id": current_user["id"]},
        {"$set": address.model_dump(exclude_unset=True)}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Address not found")
    return {"message": "Address updated"}

@router.delete("/addresses/{address_id}")
async def delete_address(address_id: str, current_user: dict = Depends(require_role([UserRole.CUSTOMER]))):
    result = await db.addresses.delete_one({"id": address_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Address not found")
    return {"message": "Address deleted"}

# ==================== FAMILY PROFILE ====================

@router.post("/family-profile", response_model=FamilyProfile)
async def create_family_profile(profile: FamilyProfileCreate, current_user: dict = Depends(require_role([UserRole.CUSTOMER]))):
    existing = await db.family_profiles.find_one({"user_id": current_user["id"]}, {"_id": 0})
    
    profile_doc = {
        "id": existing["id"] if existing else str(uuid.uuid4()),
        "user_id": current_user["id"],
        "members": [m.model_dump() for m in profile.members],
        "household_size": len(profile.members)
    }
    
    if existing:
        await db.family_profiles.update_one(
            {"user_id": current_user["id"]},
            {"$set": profile_doc}
        )
    else:
        await db.family_profiles.insert_one(profile_doc)
    
    return profile_doc

@router.get("/family-profile", response_model=FamilyProfile)
async def get_family_profile(current_user: dict = Depends(require_role([UserRole.CUSTOMER]))):
    profile = await db.family_profiles.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Family profile not found")
    return profile

# ==================== AI RECOMMENDATIONS ====================

@router.post("/ai/recommendations", response_model=AIRecommendation)
async def get_ai_recommendations(request: AIRecommendationRequest, current_user: dict = Depends(require_role([UserRole.CUSTOMER]))):
    family_profile = await db.family_profiles.find_one({"user_id": current_user["id"]}, {"_id": 0})
    
    if not family_profile:
        raise HTTPException(status_code=404, detail="Please create family profile first")
    
    past_orders = await db.orders.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(None)
    
    if request.recommendation_type == "grocery":
        result = await ai_service.get_grocery_recommendations(family_profile, past_orders)
    elif request.recommendation_type == "meal_plan":
        result = await ai_service.get_meal_plan(family_profile)
    elif request.recommendation_type == "milk_requirement":
        result = await ai_service.calculate_milk_requirement(family_profile)
    else:
        raise HTTPException(status_code=400, detail="Invalid recommendation type")
    
    return result

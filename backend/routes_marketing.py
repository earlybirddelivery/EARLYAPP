from fastapi import APIRouter, Depends, HTTPException
from typing import List
import uuid
from datetime import datetime, timezone

from models import *
from database import db
from auth import require_role

router = APIRouter(prefix="/marketing", tags=["Marketing"])

# ==================== LEADS ====================

@router.post("/leads", response_model=Lead)
async def create_lead(lead: LeadCreate, current_user: dict = Depends(require_role([UserRole.MARKETING_STAFF]))):
    lead_doc = {
        "id": str(uuid.uuid4()),
        "marketing_staff_id": current_user["id"],
        **lead.model_dump(),
        "status": "contacted",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "converted_to_customer_id": None
    }
    await db.leads.insert_one(lead_doc)
    return lead_doc

@router.get("/leads", response_model=List[Lead])
async def get_my_leads(current_user: dict = Depends(require_role([UserRole.MARKETING_STAFF]))):
    leads = await db.leads.find(
        {"marketing_staff_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(None)
    return leads

@router.put("/leads/{lead_id}")
async def update_lead_status(lead_id: str, status: str, notes: str = None, current_user: dict = Depends(require_role([UserRole.MARKETING_STAFF]))):
    if status not in ["contacted", "interested", "converted", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    update_data = {"status": status}
    if notes:
        update_data["notes"] = notes
    
    result = await db.leads.update_one(
        {"id": lead_id, "marketing_staff_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return {"message": "Lead updated"}

@router.post("/leads/{lead_id}/convert")
async def convert_lead_to_customer(lead_id: str, customer_id: str, current_user: dict = Depends(require_role([UserRole.MARKETING_STAFF]))):
    """Mark lead as converted and link to customer"""
    lead = await db.leads.find_one({"id": lead_id, "marketing_staff_id": current_user["id"]}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Verify customer exists
    customer = await db.users.find_one({"id": customer_id, "role": UserRole.CUSTOMER}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    await db.leads.update_one(
        {"id": lead_id},
        {"$set": {"status": "converted", "converted_to_customer_id": customer_id}}
    )
    
    # Create commission record (example: 100 per conversion)
    commission_doc = {
        "id": str(uuid.uuid4()),
        "marketing_staff_id": current_user["id"],
        "customer_id": customer_id,
        "amount": 100.0,
        "period": datetime.now(timezone.utc).strftime("%Y-%m"),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.commissions.insert_one(commission_doc)
    
    return {"message": "Lead converted, commission created"}

# ==================== COMMISSIONS ====================

@router.get("/commissions", response_model=List[Commission])
async def get_my_commissions(current_user: dict = Depends(require_role([UserRole.MARKETING_STAFF]))):
    commissions = await db.commissions.find(
        {"marketing_staff_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(None)
    return commissions

@router.get("/dashboard")
async def get_marketing_dashboard(current_user: dict = Depends(require_role([UserRole.MARKETING_STAFF]))):
    leads = await db.leads.find({"marketing_staff_id": current_user["id"]}, {"_id": 0}).to_list(None)
    commissions = await db.commissions.find({"marketing_staff_id": current_user["id"]}, {"_id": 0}).to_list(None)
    
    total_leads = len(leads)
    converted = len([l for l in leads if l["status"] == "converted"])
    total_commission = sum(c["amount"] for c in commissions)
    pending_commission = sum(c["amount"] for c in commissions if c["status"] == "pending")
    
    return {
        "total_leads": total_leads,
        "converted_leads": converted,
        "conversion_rate": (converted / total_leads * 100) if total_leads > 0 else 0,
        "total_commission": total_commission,
        "pending_commission": pending_commission
    }

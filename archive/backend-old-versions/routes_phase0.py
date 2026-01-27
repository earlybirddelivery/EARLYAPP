from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, date as date_type
import uuid
from models_phase0 import (
    Customer, CustomerCreate, CustomerUpdate,
    Subscription, SubscriptionCreate, SubscriptionUpdate,
    DeliveryBoy, DeliveryBoyCreate,
    DeliveryRecord, DeliveryRecordCreate,
    DeliveryListItem, DashboardStats, CustomerBill
)
from database import db
from auth import get_current_user

router = APIRouter(prefix="/phase0", tags=["Phase 0"])

# ==================== CUSTOMER ROUTES ====================

@router.post("/customers", response_model=Customer)
async def create_customer(customer: CustomerCreate, current_user: dict = Depends(get_current_user)):
    """Create a new customer"""
    customer_doc = {
        "id": str(uuid.uuid4()),
        **customer.model_dump()
    }
    await db.customers.insert_one(customer_doc)
    return customer_doc

@router.get("/customers", response_model=List[Customer])
async def get_customers(current_user: dict = Depends(get_current_user)):
    """Get all customers"""
    customers = await db.customers.find({}, {"_id": 0}).to_list(1000)
    return customers

@router.get("/customers/{customer_id}", response_model=Customer)
async def get_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific customer"""
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.put("/customers/{customer_id}", response_model=Customer)
async def update_customer(customer_id: str, updates: CustomerUpdate, current_user: dict = Depends(get_current_user)):
    """Update a customer"""
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    result = await db.customers.update_one({"id": customer_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    return customer

@router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a customer"""
    result = await db.customers.delete_one({"id": customer_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Also delete related subscriptions
    await db.subscriptions.delete_many({"customer_id": customer_id})
    
    return {"message": "Customer deleted successfully"}

# ==================== SUBSCRIPTION ROUTES ====================

@router.post("/subscriptions", response_model=Subscription)
async def create_subscription(subscription: SubscriptionCreate, current_user: dict = Depends(get_current_user)):
    """Create a new subscription"""
    # Verify customer exists
    customer = await db.customers.find_one({"id": subscription.customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    subscription_doc = {
        "id": str(uuid.uuid4()),
        **subscription.model_dump()
    }
    await db.subscriptions.insert_one(subscription_doc)
    return subscription_doc

@router.get("/subscriptions", response_model=List[Subscription])
async def get_subscriptions(customer_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get all subscriptions, optionally filtered by customer"""
    query = {"customer_id": customer_id} if customer_id else {}
    subscriptions = await db.subscriptions.find(query, {"_id": 0}).to_list(1000)
    return subscriptions

@router.get("/subscriptions/{subscription_id}", response_model=Subscription)
async def get_subscription(subscription_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific subscription"""
    subscription = await db.subscriptions.find_one({"id": subscription_id}, {"_id": 0})
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return subscription

@router.put("/subscriptions/{subscription_id}", response_model=Subscription)
async def update_subscription(subscription_id: str, updates: SubscriptionUpdate, current_user: dict = Depends(get_current_user)):
    """Update a subscription"""
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    result = await db.subscriptions.update_one({"id": subscription_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    subscription = await db.subscriptions.find_one({"id": subscription_id}, {"_id": 0})
    return subscription

@router.delete("/subscriptions/{subscription_id}")
async def delete_subscription(subscription_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a subscription"""
    result = await db.subscriptions.delete_one({"id": subscription_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    return {"message": "Subscription deleted successfully"}

# ==================== DELIVERY BOY ROUTES ====================

@router.post("/delivery-boys", response_model=DeliveryBoy)
async def create_delivery_boy(delivery_boy: DeliveryBoyCreate, current_user: dict = Depends(get_current_user)):
    """Create a new delivery boy"""
    delivery_boy_doc = {
        "id": str(uuid.uuid4()),
        **delivery_boy.model_dump()
    }
    await db.delivery_boys.insert_one(delivery_boy_doc)
    return delivery_boy_doc

@router.get("/delivery-boys", response_model=List[DeliveryBoy])
async def get_delivery_boys(area: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get all delivery boys, optionally filtered by area"""
    query = {"area_assigned": area} if area else {}
    delivery_boys = await db.delivery_boys.find(query, {"_id": 0}).to_list(1000)
    return delivery_boys

# ==================== DELIVERY LIST GENERATION ====================

@router.get("/delivery-list", response_model=List[DeliveryListItem])
async def generate_delivery_list(
    delivery_date: str,
    area: Optional[str] = None,
    delivery_boy_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate delivery list for a specific date.
    Filter by either area OR delivery_boy_id.
    """
    # Get all customers
    customers = await db.customers.find({}, {"_id": 0}).to_list(1000)
    
    # Get all subscriptions
    subscriptions = await db.subscriptions.find({}, {"_id": 0}).to_list(1000)
    
    # If filtering by delivery_boy, get their area
    if delivery_boy_id:
        delivery_boy = await db.delivery_boys.find_one({"id": delivery_boy_id}, {"_id": 0})
        if delivery_boy:
            area = delivery_boy["area_assigned"]
    
    # Build customer lookup
    customer_map = {c["id"]: c for c in customers}
    
    # Build subscription lookup by customer_id
    subscription_map = {}
    for sub in subscriptions:
        subscription_map[sub["customer_id"]] = sub
    
    delivery_list = []
    serial = 1
    
    for customer in customers:
        # Filter by area if specified
        if area and customer.get("area") != area:
            continue
        
        # Get customer's subscription
        subscription = subscription_map.get(customer["id"])
        if not subscription:
            continue
        
        # Check if date is paused
        is_paused = delivery_date in subscription.get("pause_dates", [])
        
        # Get quantity for this date
        quantity = subscription["default_quantity"]
        
        # Check for day overrides
        for override in subscription.get("day_overrides", []):
            if override["date"] == delivery_date:
                quantity = override["quantity"]
                break
        
        # Determine status
        status = "Paused" if is_paused else subscription.get("status", "active").capitalize()
        
        delivery_list.append({
            "serial": serial,
            "customer_id": customer["id"],
            "customer_name": customer["name"],
            "phone": customer["phone"],
            "address": customer["address"],
            "quantity": quantity if not is_paused else 0,
            "notes": customer.get("notes", ""),
            "status": status,
            "map_link": customer.get("map_link", ""),
            "area": customer.get("area", "")
        })
        serial += 1
    
    return delivery_list

@router.get("/delivery-list/whatsapp-format")
async def get_whatsapp_format(
    delivery_date: str,
    area: Optional[str] = None,
    delivery_boy_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate WhatsApp formatted text for delivery list.
    Format:
    1) Customer Name - Qty - Phone
    2) Address
    3) Notes
    """
    # Get the delivery list
    delivery_list = await generate_delivery_list(delivery_date, area, delivery_boy_id, current_user)
    
    # Format for WhatsApp
    lines = [f"📅 Delivery List for {delivery_date}\n"]
    
    for item in delivery_list:
        if item["quantity"] > 0:  # Only include active deliveries
            lines.append(f"{item['serial']}) {item['customer_name']} - {item['quantity']}L - {item['phone']}")
            lines.append(f"   📍 {item['address']}")
            if item['notes']:
                lines.append(f"   📝 {item['notes']}")
            if item['map_link']:
                lines.append(f"   🗺️ {item['map_link']}")
            lines.append("")  # Empty line between entries
    
    return {"text": "\n".join(lines)}

# ==================== DASHBOARD ====================

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    stat_date: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get dashboard statistics for a specific date.
    Returns: total customers, total active subscriptions, total liters by area.
    """
    # Get all customers
    customers = await db.customers.find({}, {"_id": 0}).to_list(1000)
    total_customers = len(customers)
    
    # Get all active subscriptions
    subscriptions = await db.subscriptions.find({"status": "active"}, {"_id": 0}).to_list(1000)
    total_active_subscriptions = len(subscriptions)
    
    # Calculate liters by area for the given date
    liters_by_area = {}
    
    # Build customer lookup
    customer_map = {c["id"]: c for c in customers}
    
    for subscription in subscriptions:
        customer = customer_map.get(subscription["customer_id"])
        if not customer:
            continue
        
        area = customer.get("area", "Unknown")
        
        # Check if date is paused
        is_paused = stat_date in subscription.get("pause_dates", [])
        if is_paused:
            continue
        
        # Get quantity for this date
        quantity = subscription["default_quantity"]
        
        # Check for day overrides
        for override in subscription.get("day_overrides", []):
            if override["date"] == stat_date:
                quantity = override["quantity"]
                break
        
        # Add to area total
        if area not in liters_by_area:
            liters_by_area[area] = 0
        liters_by_area[area] += quantity
    
    return {
        "total_customers": total_customers,
        "total_active_subscriptions": total_active_subscriptions,
        "liters_by_area": liters_by_area
    }

# ==================== DELIVERY RECORDS (for billing) ====================

@router.post("/delivery-records", response_model=DeliveryRecord)
async def create_delivery_record(record: DeliveryRecordCreate, current_user: dict = Depends(get_current_user)):
    """Create a delivery record (for tracking actual deliveries)"""
    record_doc = {
        "id": str(uuid.uuid4()),
        **record.model_dump()
    }
    await db.delivery_records.insert_one(record_doc)
    return record_doc

@router.get("/delivery-records")
async def get_delivery_records(
    customer_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get delivery records with optional filters"""
    query = {}
    
    if customer_id:
        query["customer_id"] = customer_id
    
    if start_date and end_date:
        query["delivery_date"] = {"$gte": start_date, "$lte": end_date}
    elif start_date:
        query["delivery_date"] = {"$gte": start_date}
    elif end_date:
        query["delivery_date"] = {"$lte": end_date}
    
    records = await db.delivery_records.find(query, {"_id": 0}).to_list(10000)
    return records

# ==================== BILLING ====================

@router.get("/billing/customer/{customer_id}", response_model=CustomerBill)
async def get_customer_bill(
    customer_id: str,
    start_date: str,
    end_date: str,
    rate_per_liter: float = 60.0,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate bill for a customer for a date range.
    Shows all deliveries and calculates total amount.
    """
    # Get customer details
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get delivery records for this customer in date range
    records = await db.delivery_records.find({
        "customer_id": customer_id,
        "delivery_date": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).sort("delivery_date", 1).to_list(1000)
    
    # Calculate total
    total_liters = sum(r["quantity"] for r in records)
    total_amount = total_liters * rate_per_liter
    
    # Format deliveries
    deliveries = [{"date": r["delivery_date"], "quantity": r["quantity"]} for r in records]
    
    return {
        "customer_id": customer["id"],
        "customer_name": customer["name"],
        "phone": customer["phone"],
        "address": customer["address"],
        "start_date": start_date,
        "end_date": end_date,
        "deliveries": deliveries,
        "total_liters": total_liters,
        "rate_per_liter": rate_per_liter,
        "total_amount": total_amount
    }

@router.get("/areas")
async def get_all_areas(current_user: dict = Depends(get_current_user)):
    """Get list of all unique areas"""
    customers = await db.customers.find({}, {"_id": 0, "area": 1}).to_list(1000)
    areas = list(set(c.get("area", "") for c in customers if c.get("area")))
    return {"areas": sorted(areas)}

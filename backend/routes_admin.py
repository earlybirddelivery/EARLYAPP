from fastapi import APIRouter, Depends, HTTPException
from typing import List
import uuid
from datetime import datetime, timezone, date, timedelta

from models import *
from database import db
from auth import require_role, hash_password
from procurement_engine import procurement_engine

router = APIRouter(prefix="/admin", tags=["Admin"])

# ==================== USER MANAGEMENT ====================

@router.get("/users", response_model=List[UserBase])
async def get_all_users(role: str = None, current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    query = {}
    if role:
        query["role"] = role
    
    users = await db.users.find(query, {"_id": 0, "password": 0}).to_list(None)
    return users

@router.post("/users/create", response_model=UserBase)
async def create_user(user: UserCreate, current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    existing = await db.users.find_one({"email": user.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": user.email,
        "phone": user.phone,
        "name": user.name,
        "role": user.role,
        "password": hash_password(user.password),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    user_doc.pop("password", None)
    return user_doc

@router.put("/users/{user_id}/toggle-status")
async def toggle_user_status(user_id: str, current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_status = not user.get("is_active", True)
    await db.users.update_one({"id": user_id}, {"$set": {"is_active": new_status}})
    
    return {"message": f"User {'activated' if new_status else 'deactivated'}"}

# ==================== DASHBOARD STATS ====================

@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    total_customers = await db.users.count_documents({"role": UserRole.CUSTOMER})
    active_subscriptions = await db.subscriptions.count_documents({"is_active": True})
    
    today = date.today().isoformat()
    today_orders = await db.orders.find({"delivery_date": today}, {"_id": 0}).to_list(None)
    
    today_deliveries = len(today_orders)
    pending_deliveries = len([o for o in today_orders if o["status"] in [DeliveryStatus.PENDING, DeliveryStatus.OUT_FOR_DELIVERY]])
    
    # Calculate revenue
    all_orders = await db.orders.find({"status": DeliveryStatus.DELIVERED}, {"_id": 0}).to_list(None)
    total_revenue = sum(o.get("total_amount", 0) for o in all_orders)
    
    # Monthly revenue (current month)
    month_start = date.today().replace(day=1).isoformat()
    monthly_orders = await db.orders.find({
        "status": DeliveryStatus.DELIVERED,
        "delivered_at": {"$gte": month_start}
    }, {"_id": 0}).to_list(None)
    monthly_revenue = sum(o.get("total_amount", 0) for o in monthly_orders)
    
    return {
        "total_customers": total_customers,
        "active_subscriptions": active_subscriptions,
        "today_deliveries": today_deliveries,
        "pending_deliveries": pending_deliveries,
        "total_revenue": total_revenue,
        "monthly_revenue": monthly_revenue
    }

@router.get("/dashboard/delivery-boys", response_model=List[DeliveryBoyStats])
async def get_delivery_boy_stats(current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    delivery_boys = await db.users.find({"role": UserRole.DELIVERY_BOY, "is_active": True}, {"_id": 0}).to_list(None)
    
    today = date.today().isoformat()
    stats_list = []
    
    for boy in delivery_boys:
        orders = await db.orders.find({
            "delivery_boy_id": boy["id"],
            "delivery_date": today
        }, {"_id": 0}).to_list(None)
        
        total = len(orders)
        completed = len([o for o in orders if o["status"] == DeliveryStatus.DELIVERED])
        pending = total - completed
        cash = sum(o.get("cash_collected", 0) for o in orders)
        
        stats_list.append({
            "delivery_boy_id": boy["id"],
            "name": boy["name"],
            "today_deliveries": total,
            "completed": completed,
            "pending": pending,
            "cash_collected": cash
        })
    
    return stats_list

# ==================== PROCUREMENT ====================

@router.get("/procurement/requirements/{date_str}")
async def get_procurement_requirements(date_str: str, current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    from datetime import date as date_class
    target_date = date_class.fromisoformat(date_str)
    requirements = await procurement_engine.calculate_all_products_requirement(target_date)
    return {"date": date_str, "requirements": requirements}

@router.get("/procurement/shortfall/{date_str}")
async def get_shortfall(date_str: str, current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    from datetime import date as date_class
    target_date = date_class.fromisoformat(date_str)
    shortfalls = await procurement_engine.detect_shortfall(target_date)
    return {"date": date_str, "shortfalls": shortfalls}

@router.post("/procurement/auto-order")
async def auto_generate_procurement_order(target_date: str, supplier_id: str, current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    date_obj = date.fromisoformat(target_date)
    result = await procurement_engine.auto_create_procurement_order(date_obj, supplier_id)
    return result

@router.get("/procurement/orders")
async def get_procurement_orders(current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    orders = await db.procurement_orders.find({}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(None)
    return orders

# ==================== REPORTS ====================

@router.get("/reports/orders")
async def get_orders_report(start_date: str = None, end_date: str = None, current_user: dict = Depends(require_role([UserRole.ADMIN]))):
    query = {}
    if start_date:
        query["delivery_date"] = {"$gte": start_date}
    if end_date:
        if "delivery_date" in query:
            query["delivery_date"]["$lte"] = end_date
        else:
            query["delivery_date"] = {"$lte": end_date}
    
    orders = await db.orders.find(query, {"_id": 0}).sort("delivery_date", -1).to_list(None)
    
    total_orders = len(orders)
    total_revenue = sum(o.get("total_amount", 0) for o in orders)
    delivered = len([o for o in orders if o["status"] == DeliveryStatus.DELIVERED])
    
    return {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "delivered_orders": delivered,
        "delivery_rate": (delivered / total_orders * 100) if total_orders > 0 else 0,
        "orders": orders
    }


# ==================== PRODUCT REQUEST APPROVALS ====================

class ProductRequestApproval(BaseModel):
    request_id: str
    action: str  # approve or reject
    admin_notes: Optional[str] = None

@router.get("/product-requests")
async def get_pending_product_requests(
    status: str = "pending",
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.MARKETING_STAFF]))
):
    """Get all requests (product, pause, stop) from shared links"""
    
    all_requests = []
    
    # Get product requests
    product_reqs = await db.product_requests.find({"status": status} if status else {}, {"_id": 0}).sort("requested_at", -1).to_list(1000)
    for req in product_reqs:
        customer = await db.customers_v2.find_one({"id": req["customer_id"]}, {"_id": 0, "name": 1, "area": 1})
        req["request_type"] = "product"
        req["customer_name"] = customer["name"] if customer else "Unknown"
        req["customer_area"] = customer.get("area", "N/A") if customer else "N/A"
        all_requests.append(req)
    
    # Get pause requests
    pause_reqs = await db.pause_requests.find({"status": status} if status else {}, {"_id": 0}).sort("requested_at", -1).to_list(1000)
    for req in pause_reqs:
        customer = await db.customers_v2.find_one({"id": req["customer_id"]}, {"_id": 0, "name": 1, "area": 1})
        req["request_type"] = "pause"
        req["customer_name"] = customer["name"] if customer else "Unknown"
        req["customer_area"] = customer.get("area", "N/A") if customer else "N/A"
        all_requests.append(req)
    
    # Get stop requests
    stop_reqs = await db.stop_requests.find({"status": status} if status else {}, {"_id": 0}).sort("requested_at", -1).to_list(1000)
    for req in stop_reqs:
        customer = await db.customers_v2.find_one({"id": req["customer_id"]}, {"_id": 0, "name": 1, "area": 1})
        req["request_type"] = "stop"
        req["customer_name"] = customer["name"] if customer else "Unknown"
        req["customer_area"] = customer.get("area", "N/A") if customer else "N/A"
        all_requests.append(req)
    
    # Sort all by requested_at
    all_requests.sort(key=lambda x: x.get("requested_at", ""), reverse=True)
    
    return all_requests

@router.post("/product-requests/approve")
async def approve_or_reject_product_request(
    approval: ProductRequestApproval,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.MARKETING_STAFF]))
):
    """Approve or reject a product request"""
    request_doc = await db.product_requests.find_one({"id": approval.request_id}, {"_id": 0})
    
    if not request_doc:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request_doc["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Request already {request_doc['status']}")
    
    if approval.action == "approve":
        # Update request status
        await db.product_requests.update_one(
            {"id": approval.request_id},
            {"$set": {
                "status": "approved",
                "approved_by": current_user["id"],
                "approved_at": datetime.now().isoformat(),
                "admin_notes": approval.admin_notes
            }}
        )
        
        # If tentative_date exists, create a subscription or day override
        if request_doc.get("tentative_date"):
            # Check if customer already has a subscription for this product
            subscription = await db.subscriptions_v2.find_one({
                "customerId": request_doc["customer_id"],
                "productId": request_doc["product_id"],
                "isActive": True
            }, {"_id": 0})
            
            if subscription:
                # Add day override to existing subscription
                day_override = {
                    "date": request_doc["tentative_date"],
                    "quantity": request_doc["quantity_packets"],
                    "shift": subscription.get("shift", "morning")
                }
                
                # Check if override already exists for this date
                existing_overrides = subscription.get("dayOverrides", [])
                date_exists = any(o["date"] == request_doc["tentative_date"] for o in existing_overrides)
                
                if date_exists:
                    # Update existing override
                    await db.subscriptions_v2.update_one(
                        {
                            "id": subscription["id"],
                            "dayOverrides.date": request_doc["tentative_date"]
                        },
                        {"$set": {
                            "dayOverrides.$.quantity": request_doc["quantity_packets"]
                        }}
                    )
                else:
                    # Add new override
                    await db.subscriptions_v2.update_one(
                        {"id": subscription["id"]},
                        {"$push": {"dayOverrides": day_override}}
                    )
            else:
                # Create new one-time subscription
                subscription_doc = {
                    "id": str(uuid.uuid4()),
                    "customerId": request_doc["customer_id"],
                    "productId": request_doc["product_id"],
                    "mode": "one_time",
                    "quantity": request_doc["quantity_packets"],
                    "shift": "morning",
                    "startDate": request_doc["tentative_date"],
                    "endDate": request_doc["tentative_date"],
                    "status": "active",
                    "auto_start": True,
                    "isActive": True,
                    "dayOverrides": [],
                    "customPricing": None,
                    "createdAt": datetime.now().isoformat()
                }
                await db.subscriptions_v2.insert_one(subscription_doc)
        
        return {
            "message": "Product request approved and scheduled",
            "request_id": approval.request_id,
            "status": "approved"
        }
    
    elif approval.action == "reject":
        # Update request status
        await db.product_requests.update_one(
            {"id": approval.request_id},
            {"$set": {
                "status": "rejected",
                "rejected_by": current_user["id"],
                "rejected_at": datetime.now().isoformat(),
                "admin_notes": approval.admin_notes
            }}
        )
        
        return {
            "message": "Product request rejected",
            "request_id": approval.request_id,
            "status": "rejected"
        }
    
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'approve' or 'reject'")

@router.get("/product-requests/count")
async def get_pending_requests_count(
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.MARKETING_STAFF]))
):
    """Get count of pending product requests for notifications"""
    count = await db.product_requests.count_documents({"status": "pending"})
    return {"pending_count": count}

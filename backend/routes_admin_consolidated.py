"""
STEP 28 PHASE 4: Admin & Marketing Consolidation
=================================================
Consolidated routes for all admin and marketing operations.

CONSOLIDATION DETAILS:
- Source files: routes_admin.py (340 lines) + routes_marketing.py (112 lines)
- Total merged: 452 lines
- Output file: routes_admin_consolidated.py
- Router prefixes: /admin, /marketing
- Organization:
  * Section 1: User Management (3 endpoints)
  * Section 2: Dashboard & Analytics (2 endpoints)
  * Section 3: Procurement Management (4 endpoints)
  * Section 4: Reports (1 endpoint)
  * Section 5: Product Request Approvals (3 endpoints)
  * Section 6: Lead Management (4 endpoints)
  * Section 7: Commission Tracking (2 endpoints)

IMPROVEMENTS:
- Centralized admin and marketing operations
- Clear section organization (7 sections, 19+ endpoints)
- Unified request handling and authentication
- Shared models and imports
- STEPS 25-27 audit trail & validation ready for integration

DEPENDENCIES:
- FastAPI routing
- MongoDB collections (users, subscriptions, orders, leads, commissions, etc.)
- Authentication (require_role)
- Procurement engine for order calculations
- Models (User, DashboardStats, DeliveryBoyStats, Lead, Commission, etc.)
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, date, timedelta

from models import *
from database import db
from auth import require_role, hash_password
from procurement_engine import procurement_engine
from utils_id_generator import generate_user_id, generate_id, generate_billing_id, generate_subscription_id

# Main router
router = APIRouter(tags=["Admin & Marketing"])


# ============================================================================
# SECTION 1: USER MANAGEMENT (3 endpoints)
# ============================================================================

admin_users_router = APIRouter(prefix="/admin/users", tags=["Admin Users"])

@admin_users_router.get("/", response_model=List[UserBase])
async def get_all_users(
    role: str = None, 
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """
    Get all users, optionally filtered by role.
    
    Parameters:
    - role: (optional) Filter by role (ADMIN, CUSTOMER, DELIVERY_BOY, etc.)
    
    Returns:
    - List of UserBase objects (passwords excluded)
    
    Security:
    - Admin role required
    """
    query = {}
    if role:
        query["role"] = role
    
    users = await db.users.find(query, {"_id": 0, "password": 0}).to_list(None)
    return users


@admin_users_router.post("/create", response_model=UserBase)
async def create_user(
    user: UserCreate, 
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """
    Create a new user (admin only).
    
    Validates:
    - Email is unique
    - Password is hashed before storage
    
    Creates user with:
    - Unique UUID
    - Active status
    - Creation timestamp
    - Hashed password
    
    Parameters:
    - user: UserCreate object with user details
    
    Returns:
    - Created UserBase object (password excluded)
    
    Raises:
    - 400: Email already exists
    """
    existing = await db.users.find_one({"email": user.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    user_doc = {
        "id": generate_user_id(),
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


@admin_users_router.put("/{user_id}/toggle-status")
async def toggle_user_status(
    user_id: str, 
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """
    Activate or deactivate a user account.
    
    Toggles the is_active flag (True <-> False).
    
    Parameters:
    - user_id: Unique identifier of the user
    
    Returns:
    - Success message with new status
    
    Raises:
    - 404: User not found
    """
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_status = not user.get("is_active", True)
    await db.users.update_one({"id": user_id}, {"$set": {"is_active": new_status}})
    
    return {"message": f"User {'activated' if new_status else 'deactivated'}"}


# ============================================================================
# SECTION 2: DASHBOARD & ANALYTICS (2 endpoints)
# ============================================================================

admin_dashboard_router = APIRouter(prefix="/admin/dashboard", tags=["Admin Dashboard"])

@admin_dashboard_router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """
    Get overall dashboard statistics.
    
    Calculates:
    - Total customers
    - Active subscriptions
    - Today's deliveries (pending vs completed)
    - Total revenue (all time)
    - Monthly revenue (current month)
    
    Returns:
    - DashboardStats object with all metrics
    """
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


@admin_dashboard_router.get("/delivery-boys", response_model=List[DeliveryBoyStats])
async def get_delivery_boy_stats(
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """
    Get performance statistics for all delivery boys.
    
    For each delivery boy:
    - Today's delivery count
    - Completed deliveries
    - Pending deliveries
    - Cash collected
    
    Returns:
    - List of DeliveryBoyStats objects
    """
    delivery_boys = await db.users.find(
        {"role": UserRole.DELIVERY_BOY, "is_active": True}, 
        {"_id": 0}
    ).to_list(None)
    
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


# ============================================================================
# SECTION 3: PROCUREMENT MANAGEMENT (4 endpoints)
# ============================================================================

procurement_router = APIRouter(prefix="/admin/procurement", tags=["Procurement"])

@procurement_router.get("/requirements/{date_str}")
async def get_procurement_requirements(
    date_str: str, 
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """
    Calculate procurement requirements for a specific date.
    
    Analyzes:
    - Active subscriptions for the date
    - One-time orders for the date
    - Inventory on hand
    
    Returns:
    - Product-wise quantity requirements
    
    Parameters:
    - date_str: Date in ISO format (YYYY-MM-DD)
    """
    target_date = date.fromisoformat(date_str)
    requirements = await procurement_engine.calculate_all_products_requirement(target_date)
    return {"date": date_str, "requirements": requirements}


@procurement_router.get("/shortfall/{date_str}")
async def get_shortfall(
    date_str: str, 
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """
    Detect procurement shortfalls for a specific date.
    
    Compares requirements vs available inventory.
    
    Returns:
    - List of products with shortfall quantities
    
    Parameters:
    - date_str: Date in ISO format (YYYY-MM-DD)
    """
    target_date = date.fromisoformat(date_str)
    shortfalls = await procurement_engine.detect_shortfall(target_date)
    return {"date": date_str, "shortfalls": shortfalls}


@procurement_router.post("/auto-order")
async def auto_generate_procurement_order(
    target_date: str, 
    supplier_id: str, 
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """
    Automatically generate procurement order for a supplier.
    
    Based on requirements and shortfalls, creates purchase order.
    
    Parameters:
    - target_date: Date in ISO format (YYYY-MM-DD)
    - supplier_id: Supplier to order from
    
    Returns:
    - Created procurement order details
    """
    date_obj = date.fromisoformat(target_date)
    result = await procurement_engine.auto_create_procurement_order(date_obj, supplier_id)
    return result


@procurement_router.get("/orders")
async def get_procurement_orders(
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """
    Get recent procurement orders.
    
    Returns:
    - List of last 50 procurement orders, sorted by creation date
    """
    orders = await db.procurement_orders.find({}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(None)
    return orders


# ============================================================================
# SECTION 4: REPORTS (1 endpoint)
# ============================================================================

reports_router = APIRouter(prefix="/admin/reports", tags=["Reports"])

@reports_router.get("/orders")
async def get_orders_report(
    start_date: str = None, 
    end_date: str = None, 
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    """
    Get orders report for a date range.
    
    Parameters:
    - start_date: (optional) Start date in ISO format
    - end_date: (optional) End date in ISO format
    
    Returns:
    - Aggregated statistics:
      * Total orders in range
      * Total revenue
      * Delivered order count
      * Delivery rate %
      * Detailed order list
    """
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


# ============================================================================
# SECTION 5: PRODUCT REQUEST APPROVALS (3 endpoints)
# ============================================================================

class ProductRequestApproval(BaseModel):
    request_id: str
    action: str  # approve or reject
    admin_notes: Optional[str] = None

product_requests_router = APIRouter(prefix="/admin/product-requests", tags=["Product Requests"])

@product_requests_router.get("/")
async def get_pending_product_requests(
    status: str = "pending",
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.MARKETING_STAFF]))
):
    """
    Get all product requests (product, pause, stop) from shared links.
    
    Aggregates requests from multiple collections:
    - product_requests: New product requests
    - pause_requests: Pause requests
    - stop_requests: Termination requests
    
    Parameters:
    - status: (optional) Filter by status (pending, approved, rejected)
    
    Returns:
    - Combined list of all requests with customer details, sorted by date
    """
    all_requests = []
    
    # Get product requests
    product_reqs = await db.product_requests.find(
        {"status": status} if status else {}, 
        {"_id": 0}
    ).sort("requested_at", -1).to_list(1000)
    for req in product_reqs:
        customer = await db.customers_v2.find_one(
            {"id": req["customer_id"]}, 
            {"_id": 0, "name": 1, "area": 1}
        )
        req["request_type"] = "product"
        req["customer_name"] = customer["name"] if customer else "Unknown"
        req["customer_area"] = customer.get("area", "N/A") if customer else "N/A"
        all_requests.append(req)
    
    # Get pause requests
    pause_reqs = await db.pause_requests.find(
        {"status": status} if status else {}, 
        {"_id": 0}
    ).sort("requested_at", -1).to_list(1000)
    for req in pause_reqs:
        customer = await db.customers_v2.find_one(
            {"id": req["customer_id"]}, 
            {"_id": 0, "name": 1, "area": 1}
        )
        req["request_type"] = "pause"
        req["customer_name"] = customer["name"] if customer else "Unknown"
        req["customer_area"] = customer.get("area", "N/A") if customer else "N/A"
        all_requests.append(req)
    
    # Get stop requests
    stop_reqs = await db.stop_requests.find(
        {"status": status} if status else {}, 
        {"_id": 0}
    ).sort("requested_at", -1).to_list(1000)
    for req in stop_reqs:
        customer = await db.customers_v2.find_one(
            {"id": req["customer_id"]}, 
            {"_id": 0, "name": 1, "area": 1}
        )
        req["request_type"] = "stop"
        req["customer_name"] = customer["name"] if customer else "Unknown"
        req["customer_area"] = customer.get("area", "N/A") if customer else "N/A"
        all_requests.append(req)
    
    # Sort all by requested_at
    all_requests.sort(key=lambda x: x.get("requested_at", ""), reverse=True)
    
    return all_requests


@product_requests_router.post("/approve")
async def approve_or_reject_product_request(
    approval: ProductRequestApproval,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.MARKETING_STAFF]))
):
    """
    Approve or reject a product request.
    
    On approval:
    - Marks request as approved
    - Optionally creates subscription or day override if tentative_date provided
    - Records approver and timestamp
    
    On rejection:
    - Marks request as rejected
    - Records rejector and timestamp
    
    Parameters:
    - approval: ProductRequestApproval with request_id, action, and optional notes
    
    Returns:
    - Success message with status
    
    Raises:
    - 404: Request not found
    - 400: Request already processed
    """
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
                    "id": generate_subscription_id(),
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


@product_requests_router.get("/count")
async def get_pending_requests_count(
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.MARKETING_STAFF]))
):
    """
    Get count of pending product requests.
    
    Useful for notifications and quick status checks.
    
    Returns:
    - pending_count: Number of requests awaiting approval
    """
    count = await db.product_requests.count_documents({"status": "pending"})
    return {"pending_count": count}


# ============================================================================
# SECTION 6: LEAD MANAGEMENT (4 endpoints)
# ============================================================================

marketing_leads_router = APIRouter(prefix="/marketing/leads", tags=["Marketing Leads"])

@marketing_leads_router.post("/", response_model=Lead)
async def create_lead(
    lead: LeadCreate, 
    current_user: dict = Depends(require_role([UserRole.MARKETING_STAFF]))
):
    """
    Create a new lead (marketing staff only).
    
    Creates lead with:
    - Unique UUID
    - Marketing staff assignment
    - Initial "contacted" status
    - Creation timestamp
    
    Parameters:
    - lead: LeadCreate object with lead details
    
    Returns:
    - Created Lead object
    """
    lead_doc = {
        "id": generate_id("lnk"),
        "marketing_staff_id": current_user["id"],
        **lead.model_dump(),
        "status": "contacted",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "converted_to_customer_id": None
    }
    await db.leads.insert_one(lead_doc)
    return lead_doc


@marketing_leads_router.get("/", response_model=List[Lead])
async def get_my_leads(
    current_user: dict = Depends(require_role([UserRole.MARKETING_STAFF]))
):
    """
    Get all leads assigned to current marketing staff member.
    
    Returns:
    - List of Lead objects, sorted by creation date (newest first)
    """
    leads = await db.leads.find(
        {"marketing_staff_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(None)
    return leads


@marketing_leads_router.put("/{lead_id}")
async def update_lead_status(
    lead_id: str, 
    status: str, 
    notes: str = None, 
    current_user: dict = Depends(require_role([UserRole.MARKETING_STAFF]))
):
    """
    Update lead status.
    
    Valid statuses:
    - contacted: Initial contact made
    - interested: Lead showed interest
    - converted: Became a customer
    - rejected: Not interested
    
    Parameters:
    - lead_id: Unique identifier of the lead
    - status: New status from valid list
    - notes: (optional) Additional notes about status change
    
    Returns:
    - Success message
    
    Raises:
    - 400: Invalid status provided
    - 404: Lead not found or not owned by current user
    """
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


@marketing_leads_router.post("/{lead_id}/convert")
async def convert_lead_to_customer(
    lead_id: str, 
    customer_id: str, 
    current_user: dict = Depends(require_role([UserRole.MARKETING_STAFF]))
):
    """
    Convert lead to customer and create commission.
    
    On conversion:
    - Marks lead as converted
    - Links to customer
    - Creates commission record (standard: 100 per conversion)
    
    Parameters:
    - lead_id: Unique identifier of the lead
    - customer_id: ID of the converted customer
    
    Returns:
    - Success message with commission created
    
    Raises:
    - 404: Lead or customer not found
    """
    lead = await db.leads.find_one(
        {"id": lead_id, "marketing_staff_id": current_user["id"]}, 
        {"_id": 0}
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Verify customer exists
    customer = await db.users.find_one(
        {"id": customer_id, "role": UserRole.CUSTOMER}, 
        {"_id": 0}
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    await db.leads.update_one(
        {"id": lead_id},
        {"$set": {"status": "converted", "converted_to_customer_id": customer_id}}
    )
    
    # Create commission record (100 per conversion)
    commission_doc = {
        "id": generate_billing_id(),
        "marketing_staff_id": current_user["id"],
        "customer_id": customer_id,
        "amount": 100.0,
        "period": datetime.now(timezone.utc).strftime("%Y-%m"),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.commissions.insert_one(commission_doc)
    
    return {"message": "Lead converted, commission created"}


# ============================================================================
# SECTION 7: COMMISSION TRACKING (2 endpoints)
# ============================================================================

marketing_commissions_router = APIRouter(prefix="/marketing/commissions", tags=["Marketing Commissions"])

@marketing_commissions_router.get("/", response_model=List[Commission])
async def get_my_commissions(
    current_user: dict = Depends(require_role([UserRole.MARKETING_STAFF]))
):
    """
    Get all commissions earned by current marketing staff member.
    
    Returns:
    - List of Commission objects, sorted by creation date (newest first)
    """
    commissions = await db.commissions.find(
        {"marketing_staff_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(None)
    return commissions


@marketing_commissions_router.get("/dashboard")
async def get_marketing_dashboard(
    current_user: dict = Depends(require_role([UserRole.MARKETING_STAFF]))
):
    """
    Get marketing dashboard with key metrics.
    
    Calculates:
    - Total leads assigned
    - Converted leads count
    - Conversion rate %
    - Total commission earned
    - Pending commission amount
    
    Returns:
    - Dashboard metrics for performance tracking
    """
    leads = await db.leads.find(
        {"marketing_staff_id": current_user["id"]}, 
        {"_id": 0}
    ).to_list(None)
    commissions = await db.commissions.find(
        {"marketing_staff_id": current_user["id"]}, 
        {"_id": 0}
    ).to_list(None)
    
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


# ============================================================================
# ROUTER REGISTRATION
# ============================================================================

# Include all routers
router.include_router(admin_users_router)
router.include_router(admin_dashboard_router)
router.include_router(procurement_router)
router.include_router(reports_router)
router.include_router(product_requests_router)
router.include_router(marketing_leads_router)
router.include_router(marketing_commissions_router)

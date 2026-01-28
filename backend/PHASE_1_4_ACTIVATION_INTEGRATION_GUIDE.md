# Phase 1.4: Activation Integration Guide
# Shows how to integrate activation engine into existing routes

"""
INTEGRATION GUIDE FOR PHASE 1.4 ACTIVATION ENGINE

This file documents how to integrate the ActivationEngine into existing routes
to automatically track customer activation pipeline.

KEY INTEGRATIONS:

1. Customer Signup Route (routes_customer.py or routes_auth.py)
   - When customer created → Call activate_engine.initialize_customer_activation()

2. Order Creation Route (routes_orders.py)
   - When order created → Call activate_engine.handle_first_order()

3. Delivery Confirmation Route (routes_delivery.py)
   - When delivery marked delivered → Call activate_engine.handle_first_delivery()

4. Activation Dashboard Route (routes_activation.py) ✅ CREATED
   - Admin endpoint to view activation metrics and customer journey
"""

# ============================================================================
# INTEGRATION 1: Customer Signup (Add to routes_customer.py or routes_auth.py)
# ============================================================================

INTEGRATION_1_SIGNUP = """
# In routes_customer.py or routes_auth.py

from activation_engine import ActivationEngine

@router.post("/customers", response_model=CustomerResponse)
async def create_customer(
    customer_create: CustomerCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
    activation_engine: ActivationEngine = Depends(get_activation_engine)
):
    '''Create new customer'''
    
    # Existing code to create customer
    customer_doc = {
        "id": str(uuid.uuid4()),
        "name": customer_create.name,
        "phone": customer_create.phone,
        "email": customer_create.email,
        "address": customer_create.address,
        "created_at": datetime.now(),
        # ... other fields
    }
    
    result = await db.customers_v2.insert_one(customer_doc)
    customer_id = customer_doc.get("id")
    
    # ✅ NEW: Initialize activation status
    await activation_engine.initialize_customer_activation(customer_id, customer_doc)
    
    # Return response
    customer_doc["_id"] = str(result.inserted_id)
    return customer_doc
"""

# ============================================================================
# INTEGRATION 2: Order Creation (Add to routes_orders.py)
# ============================================================================

INTEGRATION_2_ORDER_CREATION = """
# In routes_orders.py

from activation_engine import ActivationEngine

@router.post("/api/orders", response_model=OrderResponse)
async def create_order(
    order_create: OrderCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
    activation_engine: ActivationEngine = Depends(get_activation_engine)
):
    '''Create new order'''
    
    customer_id = current_user.get("customer_id")  # or order_create.customer_id
    
    # Existing code to create order
    order_doc = {
        "id": str(uuid.uuid4()),
        "customer_id": customer_id,
        "items": order_create.items,
        "total_amount": order_create.total_amount,
        "created_at": datetime.now(),
        # ... other fields
    }
    
    result = await db.orders.insert_one(order_doc)
    order_id = order_doc.get("id")
    
    # ✅ NEW: Track first order for activation
    await activation_engine.handle_first_order(
        customer_id=customer_id,
        order_id=order_id,
        order_amount=order_doc.get("total_amount", 0)
    )
    
    # Return response
    return order_doc
"""

# ============================================================================
# INTEGRATION 3: Delivery Confirmation (Add to routes_delivery.py)
# ============================================================================

INTEGRATION_3_DELIVERY_CONFIRMATION = """
# In routes_delivery.py

from activation_engine import ActivationEngine

@router.put("/api/delivery/{order_id}/mark-delivered", response_model=DeliveryResponse)
async def mark_delivery_delivered(
    order_id: str,
    delivery_update: DeliveryUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
    activation_engine: ActivationEngine = Depends(get_activation_engine)
):
    '''Mark order as delivered'''
    
    # Get order to find customer
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    customer_id = order.get("customer_id")
    
    # Existing code to update delivery status
    delivery_doc = {
        "order_id": order_id,
        "customer_id": customer_id,
        "status": "delivered",
        "updated_at": datetime.now(),
        # ... other fields
    }
    
    result = await db.delivery_statuses.update_one(
        {"order_id": order_id},
        {"$set": delivery_doc},
        upsert=True
    )
    
    # ✅ NEW: Track first delivery for activation
    await activation_engine.handle_first_delivery(
        customer_id=customer_id,
        order_id=order_id
    )
    
    # Return response
    return delivery_doc
"""

# ============================================================================
# INTEGRATION 4: Setup Activation Engine in server.py
# ============================================================================

INTEGRATION_4_SERVER_SETUP = """
# In server.py

from fastapi import FastAPI, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from activation_engine import ActivationEngine
import routes_activation

# Create FastAPI app
app = FastAPI()

# MongoDB database instance
db: AsyncIOMotorDatabase = None

async def get_database():
    return db

async def get_activation_engine(database: AsyncIOMotorDatabase = Depends(get_database)) -> ActivationEngine:
    '''Dependency injection for ActivationEngine'''
    return ActivationEngine(database)

# Include activation routes
app.include_router(routes_activation.router)

# ✅ Make sure to inject activation_engine in route dependencies
# Example route dependency:
# async def create_order(
#     activation_engine: ActivationEngine = Depends(get_activation_engine)
# )
"""

# ============================================================================
# ACTIVATION STATUS ENUM (Add to models.py)
# ============================================================================

MODELS_UPDATE = """
# In models.py, add this enum to track activation states

from enum import Enum

class ActivationStatus(str, Enum):
    '''Customer activation status in pipeline'''
    NEW = "new"              # Just signed up, no order yet
    ONBOARDED = "onboarded"  # Placed first order
    ACTIVE = "active"        # Recent activity (within 30 days)
    ENGAGED = "engaged"      # 3+ orders or regular subscriber
    INACTIVE = "inactive"    # No activity for 30+ days
    CHURNED = "churned"      # No activity for 60+ days
"""

# ============================================================================
# DATABASE SCHEMA UPDATES (Add to customers_v2 collection)
# ============================================================================

DATABASE_SCHEMA = """
# Fields to add to db.customers_v2 collection

{
    // Existing fields...
    "id": "CUST_001",
    "name": "John Doe",
    "phone": "9876543210",
    "email": "john@example.com",
    "address": "123 Main Street",
    
    // ✅ NEW: Activation tracking fields
    "activation_status": "active",       // new, onboarded, active, engaged, inactive, churned
    "signup_date": "2026-01-01T10:00:00",
    "first_order_date": "2026-01-15T14:30:00",
    "first_delivery_date": "2026-01-16T08:00:00",
    "last_contact_date": "2026-01-27T15:00:00",
    "last_order_date": "2026-01-25T12:00:00",
    "first_contact_date": null,
    "churn_date": null,
    "onboarding_completed": true,
    "welcome_message_sent": true,
    "activation_events": [
        {
            "event": "SIGNUP",
            "timestamp": "2026-01-01T10:00:00",
            "status": "new"
        },
        {
            "event": "FIRST_ORDER_PLACED",
            "timestamp": "2026-01-15T14:30:00",
            "order_id": "ORD_001",
            "amount": 500
        },
        {
            "event": "FIRST_DELIVERY_COMPLETED",
            "timestamp": "2026-01-16T08:00:00",
            "order_id": "ORD_001"
        }
    ]
}
"""

# ============================================================================
# DAILY CRON JOB (Run daily to update inactive customers)
# ============================================================================

CRON_JOB = """
# Add this to your scheduler (e.g., APScheduler, Celery, etc.)

from activation_engine import ActivationEngine
from motor.motor_asyncio import AsyncIOMotorDatabase

async def daily_activation_check(db: AsyncIOMotorDatabase):
    '''Run daily to check and update customer activation status'''
    
    engine = ActivationEngine(db)
    metrics = await engine.get_activation_metrics()
    
    # Get all active customers and check for inactivity
    customers = await db.customers_v2.find({
        "activation_status": {"$in": ["active", "engaged"]}
    }).to_list(None)
    
    updated_count = 0
    for customer in customers:
        new_status = await engine.check_and_update_status(customer.get("id"))
        if new_status:
            updated_count += 1
    
    # Log results
    logger.info(f"[DAILY CHECK] Processed {len(customers)} customers, updated {updated_count}")

# Schedule to run daily at 2 AM
scheduler.add_job(
    daily_activation_check,
    'cron',
    hour=2,
    minute=0,
    args=[db]
)
"""

# ============================================================================
# API ENDPOINTS SUMMARY
# ============================================================================

API_ENDPOINTS = """
✅ NEW ACTIVATION ENDPOINTS (routes_activation.py)

1. GET /api/admin/activation/dashboard
   - Get activation metrics (total, new, onboarded, active, etc.)
   - Shows conversion funnel percentages
   
2. GET /api/admin/activation/customers?status=active
   - List customers filtered by activation status
   - Supports pagination (limit, offset)
   
3. GET /api/admin/activation/customers/{customer_id}/status
   - Get current activation status and details for one customer
   
4. GET /api/admin/activation/customers/{customer_id}/timeline
   - Get chronological timeline of all activation events for customer
   
5. POST /api/admin/activation/customers/{customer_id}/resend-welcome
   - Manually resend welcome message to customer
   
6. POST /api/admin/activation/batch/check-status
   - Batch check and update status for inactive customers
   - Should be called daily via cron
   
7. GET /api/admin/activation/analytics/cohort
   - Get cohort analysis (retention by signup month)
   - Shows retention rates for each signup cohort
"""

# ============================================================================
# TESTING THE IMPLEMENTATION
# ============================================================================

TESTING_GUIDE = """
✅ HOW TO TEST PHASE 1.4 ACTIVATION

1. Run backfill script to initialize existing customers:
   cd backend
   python backfill_customers_activation.py
   
2. Test API endpoints:
   
   a) Check dashboard:
      curl http://localhost:1001/api/admin/activation/dashboard
      
   b) List active customers:
      curl http://localhost:1001/api/admin/activation/customers?status=active
      
   c) Check specific customer timeline:
      curl http://localhost:1001/api/admin/activation/customers/CUST_001/timeline
      
   d) Batch check status:
      curl -X POST http://localhost:1001/api/admin/activation/batch/check-status
      
3. Test integration in routes:
   - Create new customer (should have activation_status: "new")
   - Create order for customer (should transition to "onboarded")
   - Mark order delivered (should transition to "active")

4. Run test suite:
   pytest test_activation_engine.py -v
"""

# ============================================================================
# PRINT SUMMARY
# ============================================================================

if __name__ == "__main__":
    print("\n" + "="*80)
    print("PHASE 1.4: ACTIVATION ENGINE INTEGRATION GUIDE")
    print("="*80 + "\n")
    
    print("📋 INTEGRATION 1: Customer Signup")
    print("-" * 80)
    print(INTEGRATION_1_SIGNUP)
    
    print("\n📋 INTEGRATION 2: Order Creation")
    print("-" * 80)
    print(INTEGRATION_2_ORDER_CREATION)
    
    print("\n📋 INTEGRATION 3: Delivery Confirmation")
    print("-" * 80)
    print(INTEGRATION_3_DELIVERY_CONFIRMATION)
    
    print("\n📋 INTEGRATION 4: Server Setup")
    print("-" * 80)
    print(INTEGRATION_4_SERVER_SETUP)
    
    print("\n📋 DATABASE SCHEMA")
    print("-" * 80)
    print(DATABASE_SCHEMA)
    
    print("\n📋 API ENDPOINTS")
    print("-" * 80)
    print(API_ENDPOINTS)
    
    print("\n📋 TESTING GUIDE")
    print("-" * 80)
    print(TESTING_GUIDE)
    
    print("\n" + "="*80)
    print("NEXT STEPS:")
    print("1. Add activation_engine.py to imports in server.py")
    print("2. Add routes_activation.py to server.py routers")
    print("3. Add get_activation_engine dependency in server.py")
    print("4. Run backfill_customers_activation.py to initialize existing customers")
    print("5. Add activation engine calls to customer/order/delivery routes")
    print("6. Run test suite to verify integration")
    print("="*80 + "\n")

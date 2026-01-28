from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from datetime import datetime, timezone, date, timedelta
import os
import logging
from pathlib import Path
import uuid

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import models and services
from models import UserLogin, Token, UserRole
from database import db, close_database
from auth import hash_password, verify_password, create_access_token, get_current_user
from password_migration import verify_password_with_migration, update_migration_stats

# Create the main app
app = FastAPI(title="EarlyBird Delivery Services")

# Add CORS middleware FIRST (before routes)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "EarlyBird Delivery Services API", "status": "running"}

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login with email and password"""
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    
    # Check if user exists first
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Support both "password" and "password_hash" fields
    user_password = user.get("password_hash") or user.get("password")
    if not user_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password with migration support (SHA256 → Bcrypt)
    is_valid, was_upgraded = await verify_password_with_migration(
        credentials.password,
        user_password,
        user_id=user["id"],
        db=db
    )
    
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Log password upgrade if it occurred
    if was_upgraded:
        print(f"[PASSWORD MIGRATION] User {user['email']} password upgraded from SHA256 to bcrypt")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is inactive")
    
    # STEP 21: Include customer_v2_id in JWT token if linked
    token_payload = {
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"]
    }
    if user.get("customer_v2_id"):
        token_payload["customer_v2_id"] = user["customer_v2_id"]
    
    token = create_access_token(token_payload)
    
    user.pop("password", None)
    
    return {"access_token": token, "token_type": "bearer", "user": user}

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user details"""
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# Import consolidated routes (STEP 28-29 consolidation & UUID standardization)
try:
    from routes_orders_consolidated import router as orders_router
    api_router.include_router(orders_router)
    print("[OK] Consolidated Orders & Subscriptions routes loaded")
except Exception as e:
    print(f"[WARN] Consolidated Orders routes not available: {e}")

try:
    from routes_products_consolidated import router as products_router
    api_router.include_router(products_router)
    print("[OK] Consolidated Products, Admin & Supplier routes loaded")
except Exception as e:
    print(f"[WARN] Consolidated Products routes not available: {e}")

try:
    from routes_admin_consolidated import router as admin_router
    api_router.include_router(admin_router)
    print("[OK] Consolidated Admin & Marketing routes loaded")
except Exception as e:
    print(f"[WARN] Consolidated Admin routes not available: {e}")

# Import Phase 0 V2 for compatibility
try:
    from routes_phase0_updated import router as phase0_v2_router
    api_router.include_router(phase0_v2_router)
    print("[OK] Phase 0 V2 routes loaded")
except Exception as e:
    print(f"[WARN] Phase 0 V2 routes not available: {e}")

# Import remaining specialized routes
try:
    from routes_billing import router as billing_router
    api_router.include_router(billing_router)
    print("[OK] Billing routes loaded")
except Exception as e:
    print(f"[WARN] Billing routes not available: {e}")

try:
    from routes_notifications import router as notifications_router
    api_router.include_router(notifications_router)
    print("[OK] WhatsApp Notification routes loaded")
except Exception as e:
    print(f"[WARN] Notification routes not available: {e}")

try:
    from routes_customer import router as customer_router
    api_router.include_router(customer_router)
    print("[OK] Customer routes loaded")
except Exception as e:
    print(f"[WARN] Customer routes not available: {e}")

try:
    from routes_delivery_consolidated import router as delivery_router
    api_router.include_router(delivery_router)
    print("[OK] Consolidated delivery routes loaded")
except Exception as e:
    print(f"[WARN] Consolidated delivery routes not available: {e}")

try:
    from routes_shared_links import router as shared_links_router
    api_router.include_router(shared_links_router)
    print("[OK] Shared links routes loaded")
except Exception as e:
    print(f"[WARN] Shared links routes not available: {e}")

try:
    from routes_disputes import router as disputes_router
    api_router.include_router(disputes_router)
    print("[OK] Dispute Resolution routes loaded")
except Exception as e:
    print(f"[WARN] Dispute Resolution routes not available: {e}")

try:
    from routes_product_requests import router as product_requests_router
    api_router.include_router(product_requests_router)
    print("[OK] Product Requests routes loaded")
except Exception as e:
    print(f"[WARN] Product Requests routes not available: {e}")

try:
    from routes_analytics import router as analytics_router
    api_router.include_router(analytics_router)
    print("[OK] Analytics routes loaded")
except Exception as e:
    print(f"[WARN] Analytics routes not available: {e}")

try:
    from routes_gps import router as gps_router
    api_router.include_router(gps_router)
    print("[OK] GPS Tracking routes loaded")
except Exception as e:
    print(f"[WARN] GPS Tracking routes not available: {e}")

try:
    from routes_earnings import router as earnings_router
    api_router.include_router(earnings_router)
    print("[OK] Staff Earnings routes loaded")
except Exception as e:
    print(f"[WARN] Staff Earnings routes not available: {e}")

try:
    from routes_staff_wallet import router as staff_wallet_router
    api_router.include_router(staff_wallet_router)
    print("[OK] Staff Wallet routes loaded")
except Exception as e:
    print(f"[WARN] Staff Wallet routes not available: {e}")

# Include the api router in the main app
app.include_router(api_router)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== STARTUP & SHUTDOWN ====================

@app.on_event("startup")
async def startup_event():
    """Initialize WhatsApp notification templates and start background tasks"""
    try:
        from notification_templates import initialize_templates
        await initialize_templates()
        print("[OK] WhatsApp notification templates initialized")
    except Exception as e:
        print(f"[WARN] Failed to initialize notification templates: {e}")
    
    # Start background queue processor task
    import asyncio
    
    async def process_notification_queue():
        """Background task to process message queue every 5 minutes"""
        from notification_service import notification_service
        while True:
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                await notification_service.process_queue()
            except Exception as e:
                logger.error(f"Error processing notification queue: {e}")
    
    try:
        asyncio.create_task(process_notification_queue())
        print("[OK] Background notification queue processor started")
    except Exception as e:
        print(f"[WARN] Failed to start background queue processor: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    close_database()


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("SERVER_PORT", 9885))
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    )
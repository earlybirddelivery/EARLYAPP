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
    if not user_password or not verify_password(credentials.password, user_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
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

# Import routes - skip if they don't exist
try:
    from routes_phase0_updated import router as phase0_v2_router
    api_router.include_router(phase0_v2_router)
    print("[OK] Phase 0 V2 routes loaded")
except Exception as e:
    print(f"[WARN] Phase 0 V2 routes not available: {e}")

try:
    from routes_admin import router as admin_router
    api_router.include_router(admin_router)
    print("[OK] Admin routes loaded")
except Exception as e:
    print(f"[WARN] Admin routes not available: {e}")

try:
    from routes_products import router as products_router
    api_router.include_router(products_router)
    print("[OK] Products routes loaded")
except Exception as e:
    print(f"[WARN] Products routes not available: {e}")

try:
    from routes_supplier import router as suppliers_router
    api_router.include_router(suppliers_router)
    print("[OK] Supplier routes loaded")
except Exception as e:
    print(f"[WARN] Supplier routes not available: {e}")

try:
    from routes_billing import router as billing_router
    api_router.include_router(billing_router)
    print("[OK] Billing routes loaded")
except Exception as e:
    print(f"[WARN] Billing routes not available: {e}")

try:
    from routes_orders import router as orders_router
    api_router.include_router(orders_router)
    print("[OK] Orders routes loaded")
except Exception as e:
    print(f"[WARN] Orders routes not available: {e}")

try:
    from routes_customer import router as customer_router
    api_router.include_router(customer_router)
    print("[OK] Customer routes loaded")
except Exception as e:
    print(f"[WARN] Customer routes not available: {e}")

try:
    from routes_delivery_operations import router as delivery_ops_router
    api_router.include_router(delivery_ops_router)
    print("[OK] Delivery operations routes loaded")
except Exception as e:
    print(f"[WARN] Delivery operations routes not available: {e}")

try:
    from routes_shared_links import router as shared_links_router
    api_router.include_router(shared_links_router)
    print("[OK] Shared links routes loaded")
except Exception as e:
    print(f"[WARN] Shared links routes not available: {e}")

# Include the api router in the main app
app.include_router(api_router)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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
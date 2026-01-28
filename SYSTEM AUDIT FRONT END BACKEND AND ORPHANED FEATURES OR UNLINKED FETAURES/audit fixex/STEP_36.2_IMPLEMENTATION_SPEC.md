# STEP 36.2 IMPLEMENTATION SPECIFICATION

**EarlyBird Delivery Services**  
**Phase 6 - Testing & Deployment**  
**Role-Based Access Control Testing**  
**Date:** January 27, 2026

---

## Overview

This specification details the implementation of comprehensive role-based access control (RBAC) testing for STEP 36.2. It extends the existing test suite with 46+ access control test cases covering 5 user roles and security validation.

---

## Part 1: Backend RBAC Implementation

### 1.1 JWT Token Structure

**Admin Token Payload:**
```json
{
  "sub": "user-admin-001",
  "email": "admin@test.com",
  "role": "admin",
  "name": "Admin User",
  "iat": 1706209200,
  "exp": 1706295600,
  "iss": "earlybird-auth",
  "aud": "earlybird-api"
}
```

**Customer Token Payload:**
```json
{
  "sub": "user-customer-001",
  "email": "customer@test.com",
  "role": "customer",
  "customer_id": "customer-001",
  "iat": 1706209200,
  "exp": 1706295600,
  "iss": "earlybird-auth",
  "aud": "earlybird-api"
}
```

### 1.2 JWT Middleware Implementation

**File:** `backend/auth.py`

```python
# JWT Configuration
ALGORITHM = "HS256"
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-here")
ACCESS_TOKEN_EXPIRE_MINUTES = 24 * 60

# Token Generation
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Token Validation
def decode_token(token: str):
    """Decode and validate JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        if user_id is None or role is None:
            return None
        return {"user_id": user_id, "role": role, "payload": payload}
    except jwt.ExpiredSignatureError:
        return {"error": "Token expired"}
    except jwt.InvalidTokenError:
        return {"error": "Invalid token"}

# Get current user from token
async def get_current_user(request: Request) -> dict:
    """Extract user from Authorization header"""
    auth_header = request.headers.get("Authorization")
    
    if not auth_header:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    try:
        scheme, token = auth_header.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token_data = decode_token(token)
    
    if token_data is None or "error" in token_data:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return token_data
```

### 1.3 Role-Based Decorators

**File:** `backend/auth.py` (continued)

```python
# Role requirement decorators
def require_role(*roles):
    """Decorator to require specific roles"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user: dict = Depends(get_current_user), **kwargs):
            user_role = current_user.get("role")
            if user_role not in roles:
                raise HTTPException(
                    status_code=403,
                    detail=f"This operation requires one of roles: {', '.join(roles)}"
                )
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator

def require_admin(func):
    """Require admin role"""
    return require_role("admin")(func)

def require_customer(func):
    """Require customer role"""
    return require_role("customer")(func)

def require_delivery_boy(func):
    """Require delivery_boy role"""
    return require_role("delivery_boy")(func)

def public(func):
    """Allow public access (no auth required)"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        return await func(*args, **kwargs)
    return wrapper

# Data scoping decorators
async def get_user_customer_id(current_user: dict) -> str:
    """Get customer_id for current user"""
    customer_id = current_user.get("customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="User has no associated customer")
    return customer_id

def scope_customer_data(func):
    """Scope data to current customer only"""
    @wraps(func)
    async def wrapper(*args, current_user: dict, **kwargs):
        if current_user.get("role") == "admin":
            # Admins can see all data
            return await func(*args, current_user=current_user, **kwargs)
        else:
            # Non-admins can only see own data
            current_user["scoped_customer_id"] = await get_user_customer_id(current_user)
            return await func(*args, current_user=current_user, **kwargs)
    return wrapper
```

### 1.4 Route Implementation Examples

**File:** `backend/routes_orders.py`

```python
from fastapi import APIRouter, Depends
from auth import require_admin, require_customer, require_role, get_current_user, scope_customer_data

router = APIRouter(prefix="/api/orders", tags=["orders"])

# ✅ PROTECTED: Customers can create their own orders
@router.post("/")
async def create_order(
    request: CreateOrderRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new order
    - Admin: Can create for any customer
    - Customer: Can create for self
    - Others: 403 Forbidden
    """
    if current_user.get("role") not in ["admin", "customer"]:
        raise HTTPException(status_code=403, detail="Cannot create orders")
    
    # Create order logic
    order = await db.orders.insert_one({...})
    return {"id": order.inserted_id, ...}

# ✅ PROTECTED: Customers see own orders, admins see all
@router.get("/")
async def list_orders(
    current_user: dict = Depends(get_current_user)
):
    """
    List orders
    - Admin: See all orders
    - Customer: See own orders
    - Others: 403 Forbidden
    """
    role = current_user.get("role")
    
    if role == "admin":
        orders = await db.orders.find({}).to_list(1000)
    elif role == "customer":
        customer_id = current_user.get("customer_id")
        orders = await db.orders.find({"customer_id": customer_id}).to_list(1000)
    else:
        raise HTTPException(status_code=403, detail="Cannot view orders")
    
    return orders

# ✅ PROTECTED: Customers see own, admins delete any
@router.delete("/{order_id}")
async def delete_order(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete order
    - Admin: Can delete any
    - Customer: Cannot delete
    - Others: 403 Forbidden
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only operation")
    
    await db.orders.delete_one({"id": order_id})
    return {"status": "deleted"}
```

**File:** `backend/routes_admin.py`

```python
# ✅ PROTECTED: Admin only
@router.get("/dashboard/")
async def get_dashboard(
    current_user: dict = Depends(get_current_user)
):
    """Get admin dashboard"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    # Dashboard logic
    return {
        "statistics": {...},
        "orders": {...},
        "customers": {...}
    }

# ✅ PROTECTED: Admin only - List all users
@router.get("/users/")
async def list_users(
    current_user: dict = Depends(get_current_user)
):
    """List all users"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    users = await db.users.find({}).to_list(1000)
    return users

# ✅ PROTECTED: Admin only - Create user
@router.post("/users/")
async def create_user(
    request: CreateUserRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create new user"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    user = await db.users.insert_one({...})
    return {"id": user.inserted_id}
```

**File:** `backend/routes_shared_links.py`

```python
# ✅ PUBLIC: No authentication required
@router.get("/shared-delivery-link/{link_id}")
async def get_shared_link(link_id: str):
    """Get shared delivery link (public)"""
    link = await db.shared_links.find_one({"id": link_id})
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    return link

# ✅ PUBLIC: No authentication required
@router.post("/shared-delivery-link/{link_id}/mark-delivered")
async def mark_delivered_via_link(link_id: str):
    """Mark delivery complete via shared link (public)"""
    link = await db.shared_links.find_one({"id": link_id})
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    
    # Mark delivery complete
    await db.delivery_statuses.update_one(
        {"id": link["delivery_id"]},
        {"$set": {"status": "delivered", "confirmed_at": datetime.utcnow()}}
    )
    return {"status": "delivered"}
```

---

## Part 2: Test Suite Implementation

### 2.1 New Test Fixtures

**File:** `tests/conftest.py` (additions)

```python
# Shared link user fixture (no authentication)
@pytest.fixture
def test_shared_link_user():
    """Shared link user (public, no auth)"""
    return {
        "link_id": "link-shared-001",
        "order_id": "order-001",
        "token": None  # No token for shared links
    }

# Anonymous user fixture
@pytest.fixture
def test_anonymous_user():
    """Anonymous user (no authentication)"""
    return {
        "token": None,
        "headers": {"Content-Type": "application/json"}
    }

# Admin headers fixture
@pytest.fixture
def admin_headers(test_user_admin):
    """Headers with admin JWT"""
    return {
        "Authorization": f"Bearer {test_user_admin['token']}",
        "Content-Type": "application/json"
    }

# Customer headers fixture
@pytest.fixture
def customer_headers(test_user_customer):
    """Headers with customer JWT"""
    return {
        "Authorization": f"Bearer {test_user_customer['token']}",
        "Content-Type": "application/json"
    }

# Delivery boy headers fixture
@pytest.fixture
def delivery_boy_headers(test_user_delivery_boy):
    """Headers with delivery boy JWT"""
    return {
        "Authorization": f"Bearer {test_user_delivery_boy['token']}",
        "Content-Type": "application/json"
    }

# No auth headers fixture
@pytest.fixture
def no_auth_headers():
    """Headers without authentication"""
    return {"Content-Type": "application/json"}
```

### 2.2 Access Control Test Cases

**File:** `tests/test_access_control.py`

```python
import pytest
from httpx import AsyncClient

class TestAdminAccess:
    """Test admin role access control"""
    
    @pytest.mark.asyncio
    async def test_admin_can_access_dashboard(self, client: AsyncClient, admin_headers):
        """Admin can access admin dashboard"""
        response = await client.get("/api/admin/dashboard/", headers=admin_headers)
        assert response.status_code == 200
        assert "statistics" in response.json()
    
    @pytest.mark.asyncio
    async def test_admin_can_list_users(self, client: AsyncClient, admin_headers):
        """Admin can list all users"""
        response = await client.get("/api/admin/users/", headers=admin_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    @pytest.mark.asyncio
    async def test_admin_can_create_user(self, client: AsyncClient, admin_headers):
        """Admin can create new user"""
        response = await client.post(
            "/api/admin/users/",
            headers=admin_headers,
            json={
                "email": "newuser@test.com",
                "role": "customer",
                "name": "New User"
            }
        )
        assert response.status_code == 201
        assert response.json()["email"] == "newuser@test.com"
    
    @pytest.mark.asyncio
    async def test_admin_can_delete_any_order(self, client: AsyncClient, admin_headers, test_order_one_time):
        """Admin can delete any order"""
        response = await client.delete(
            f"/api/orders/{test_order_one_time['id']}",
            headers=admin_headers
        )
        assert response.status_code == 204


class TestCustomerAccess:
    """Test customer role access control"""
    
    @pytest.mark.asyncio
    async def test_customer_can_view_profile(self, client: AsyncClient, customer_headers):
        """Customer can view own profile"""
        response = await client.get("/api/customer/profile/", headers=customer_headers)
        assert response.status_code == 200
        assert "customer_id" in response.json() or "id" in response.json()
    
    @pytest.mark.asyncio
    async def test_customer_can_create_order(self, client: AsyncClient, customer_headers):
        """Customer can create order"""
        response = await client.post(
            "/api/orders/",
            headers=customer_headers,
            json={
                "items": [{"product_id": "prod-1", "quantity": 2}],
                "delivery_date": "2026-01-28"
            }
        )
        assert response.status_code == 201
        assert "id" in response.json()
    
    @pytest.mark.asyncio
    async def test_customer_cannot_access_admin_dashboard(self, client: AsyncClient, customer_headers):
        """Customer cannot access admin dashboard"""
        response = await client.get("/api/admin/dashboard/", headers=customer_headers)
        assert response.status_code == 403
    
    @pytest.mark.asyncio
    async def test_customer_cannot_create_user(self, client: AsyncClient, customer_headers):
        """Customer cannot create user"""
        response = await client.post(
            "/api/admin/users/",
            headers=customer_headers,
            json={"email": "user@test.com", "role": "customer"}
        )
        assert response.status_code == 403


class TestDeliveryBoyAccess:
    """Test delivery boy role access control"""
    
    @pytest.mark.asyncio
    async def test_delivery_boy_can_mark_delivery(self, client: AsyncClient, delivery_boy_headers, test_order_one_time):
        """Delivery boy can mark delivery complete"""
        response = await client.post(
            "/api/delivery-boy/mark-delivered/",
            headers=delivery_boy_headers,
            json={
                "order_id": test_order_one_time["id"],
                "delivery_date": "2026-01-27"
            }
        )
        assert response.status_code == 200
        assert response.json()["status"] == "delivered"
    
    @pytest.mark.asyncio
    async def test_delivery_boy_cannot_create_order(self, client: AsyncClient, delivery_boy_headers):
        """Delivery boy cannot create order"""
        response = await client.post(
            "/api/orders/",
            headers=delivery_boy_headers,
            json={
                "items": [{"product_id": "prod-1", "quantity": 1}],
                "delivery_date": "2026-01-28"
            }
        )
        assert response.status_code == 403
    
    @pytest.mark.asyncio
    async def test_delivery_boy_cannot_access_billing(self, client: AsyncClient, delivery_boy_headers):
        """Delivery boy cannot access billing"""
        response = await client.get("/api/billing/", headers=delivery_boy_headers)
        assert response.status_code == 403


class TestSharedLinkAccess:
    """Test shared link user (public) access"""
    
    @pytest.mark.asyncio
    async def test_shared_link_user_can_access_link(self, client: AsyncClient, no_auth_headers):
        """Shared link user can access public link"""
        response = await client.get(
            "/api/shared-delivery-link/link-shared-001",
            headers=no_auth_headers
        )
        assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_shared_link_user_can_mark_delivered(self, client: AsyncClient, no_auth_headers):
        """Shared link user can mark delivery complete"""
        response = await client.post(
            "/api/shared-delivery-link/link-shared-001/mark-delivered",
            headers=no_auth_headers,
            json={}
        )
        assert response.status_code == 200


class TestAnonymousAccess:
    """Test anonymous (no auth) access"""
    
    @pytest.mark.asyncio
    async def test_anonymous_cannot_view_orders(self, client: AsyncClient, no_auth_headers):
        """Anonymous cannot access protected endpoints"""
        response = await client.get("/api/orders/", headers=no_auth_headers)
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_anonymous_cannot_access_admin(self, client: AsyncClient, no_auth_headers):
        """Anonymous cannot access admin endpoints"""
        response = await client.get("/api/admin/dashboard/", headers=no_auth_headers)
        assert response.status_code == 401


class TestSecurityValidation:
    """Test security validation"""
    
    @pytest.mark.asyncio
    async def test_invalid_token_rejected(self, client: AsyncClient):
        """Invalid token is rejected"""
        headers = {
            "Authorization": "Bearer invalid.token.here",
            "Content-Type": "application/json"
        }
        response = await client.get("/api/orders/", headers=headers)
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_missing_auth_header(self, client: AsyncClient):
        """Missing auth header returns 401"""
        response = await client.get("/api/orders/")
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_customer_cannot_escalate_role(self, client: AsyncClient, customer_headers):
        """Customer cannot escalate own role to admin"""
        response = await client.put(
            "/api/customer/profile/",
            headers=customer_headers,
            json={"role": "admin"}
        )
        # Either 403 or ignore the field
        assert response.status_code in [403, 200]
        if response.status_code == 200:
            # Verify role wasn't changed
            assert response.json().get("role") != "admin"
```

---

## Part 3: Deployment Checklist

### Pre-Deployment Validation

- [ ] All JWT middleware implemented in `backend/auth.py`
- [ ] All route decorators applied to endpoints
- [ ] All 46+ test cases passing
- [ ] Error messages consistent
- [ ] Documentation up to date
- [ ] Security audit complete

### Testing Steps

```bash
# 1. Run access control tests
pytest tests/test_access_control.py -v

# 2. Run all integration tests
pytest tests/integration/ -m critical -v

# 3. Run smoke tests
pytest tests/smoke_tests.py -m smoke -v

# 4. Verify backend starts
cd backend && python -m uvicorn server:app --host 0.0.0.0 --port 1001
```

### Success Criteria

- ✅ All 46+ tests PASS
- ✅ 0 security issues
- ✅ All roles tested
- ✅ Documentation complete

---

**Status:** 🟢 READY FOR IMPLEMENTATION  
**Next Step:** STEP 36.3 - Smoke Test Documentation  
**Estimated Effort:** 3-4 hours  
**Files Modified:** 15+ route files + auth.py + tests/

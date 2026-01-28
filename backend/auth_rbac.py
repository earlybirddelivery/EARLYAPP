"""
PHASE 1.2.1: Role-Based Access Control (RBAC) Helpers

This module provides decorators and utilities for enforcing role-based access control
across all routes in the EarlyBird system.

Roles:
- admin: Full system access
- customer: Own data access only
- delivery_boy: Delivery operations only
- supplier: Supplier operations only

Usage:
    from auth_rbac import verify_admin_role, verify_customer_role
    
    @router.get("/admin/users")
    async def get_users(current_user = Depends(verify_admin_role)):
        # Only accessible to admins
        pass
"""

from fastapi import HTTPException, status, Depends
from typing import Optional, Dict, Any
from datetime import datetime
from functools import wraps
import logging

logger = logging.getLogger(__name__)

# ============================================================================
# 1. CORE ROLE VERIFICATION FUNCTIONS
# ============================================================================

async def get_current_user(token: str = None) -> Dict[str, Any]:
    """
    Extract user from JWT token or session.
    Returns user dict with _id, email, role, etc.
    """
    # This would normally call verify_token() from auth.py
    # For now, placeholder - actual implementation depends on auth system
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No authentication token provided"
        )
    # TODO: Implement actual token verification
    return {}


async def verify_admin_role(current_user: Dict = Depends(get_current_user)) -> Dict:
    """
    Verify that the current user has admin role.
    
    Usage:
        @router.get("/admin/users")
        async def get_users(current_user = Depends(verify_admin_role)):
            ...
    
    Returns:
        Dict: User object if admin
    
    Raises:
        HTTPException: 403 if not admin
    """
    if current_user.get("role") != "admin":
        logger.warning(f"Admin access denied for user {current_user.get('_id')}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required for this operation"
        )
    return current_user


async def verify_customer_role(current_user: Dict = Depends(get_current_user)) -> Dict:
    """
    Verify that the current user has customer role.
    
    Usage:
        @router.post("/orders")
        async def create_order(current_user = Depends(verify_customer_role)):
            ...
    
    Returns:
        Dict: User object if customer
    
    Raises:
        HTTPException: 403 if not customer
    """
    if current_user.get("role") != "customer":
        logger.warning(f"Customer access denied for user {current_user.get('_id')}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customer role required for this operation"
        )
    return current_user


async def verify_delivery_boy_role(current_user: Dict = Depends(get_current_user)) -> Dict:
    """
    Verify that the current user has delivery_boy role.
    
    Usage:
        @router.post("/delivery/mark-delivered")
        async def mark_delivered(current_user = Depends(verify_delivery_boy_role)):
            ...
    
    Returns:
        Dict: User object if delivery_boy
    
    Raises:
        HTTPException: 403 if not delivery_boy
    """
    if current_user.get("role") != "delivery_boy":
        logger.warning(f"Delivery boy access denied for user {current_user.get('_id')}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Delivery boy role required for this operation"
        )
    return current_user


async def verify_supplier_role(current_user: Dict = Depends(get_current_user)) -> Dict:
    """
    Verify that the current user has supplier role.
    
    Usage:
        @router.get("/supplier/orders")
        async def get_supplier_orders(current_user = Depends(verify_supplier_role)):
            ...
    
    Returns:
        Dict: User object if supplier
    
    Raises:
        HTTPException: 403 if not supplier
    """
    if current_user.get("role") != "supplier":
        logger.warning(f"Supplier access denied for user {current_user.get('_id')}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Supplier role required for this operation"
        )
    return current_user


async def verify_admin_or_delivery_boy(current_user: Dict = Depends(get_current_user)) -> Dict:
    """
    Verify that user is either admin or delivery_boy.
    
    Usage:
        @router.get("/delivery/today")
        async def get_today_deliveries(current_user = Depends(verify_admin_or_delivery_boy)):
            ...
    
    Returns:
        Dict: User object if admin or delivery_boy
    
    Raises:
        HTTPException: 403 otherwise
    """
    if current_user.get("role") not in ["admin", "delivery_boy"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or delivery boy role required"
        )
    return current_user


async def verify_authenticated(current_user: Dict = Depends(get_current_user)) -> Dict:
    """
    Verify that user is authenticated (any role).
    
    Usage:
        @router.get("/profile")
        async def get_profile(current_user = Depends(verify_authenticated)):
            ...
    
    Returns:
        Dict: Current user object
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return current_user


# ============================================================================
# 2. DATA ISOLATION HELPERS
# ============================================================================

def verify_customer_ownership(customer_id: str, current_user: Dict) -> bool:
    """
    Verify that customer_id matches current user.
    
    Args:
        customer_id: Customer ID to check
        current_user: Current user object
    
    Returns:
        bool: True if user owns this customer record
    
    Raises:
        HTTPException: 403 if user doesn't own this customer
    """
    user_id = str(current_user.get("_id"))
    
    # For admin, allow access to any customer
    if current_user.get("role") == "admin":
        return True
    
    # For customer, verify ownership
    if current_user.get("role") == "customer":
        if str(customer_id) != user_id:
            logger.warning(
                f"Customer {user_id} attempted to access customer {customer_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only access your own customer records"
            )
        return True
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Customer access required"
    )


def verify_order_ownership(order_data: Dict, current_user: Dict) -> bool:
    """
    Verify that user owns this order.
    
    Args:
        order_data: Order document from database
        current_user: Current user object
    
    Returns:
        bool: True if user owns this order
    
    Raises:
        HTTPException: 403 if user doesn't own this order
    """
    user_id = str(current_user.get("_id"))
    order_customer_id = str(order_data.get("customer_id"))
    
    # Admin can access any order
    if current_user.get("role") == "admin":
        return True
    
    # Customer can only access own orders
    if current_user.get("role") == "customer":
        if order_customer_id != user_id:
            logger.warning(
                f"Customer {user_id} attempted to access order {order_data.get('_id')}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only access your own orders"
            )
        return True
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Unauthorized to access this order"
    )


def verify_subscription_ownership(subscription_data: Dict, current_user: Dict) -> bool:
    """
    Verify that user owns this subscription.
    
    Args:
        subscription_data: Subscription document
        current_user: Current user object
    
    Returns:
        bool: True if user owns subscription
    
    Raises:
        HTTPException: 403 if not owner
    """
    user_id = str(current_user.get("_id"))
    subscription_customer_id = str(subscription_data.get("customer_id"))
    
    # Admin can access any subscription
    if current_user.get("role") == "admin":
        return True
    
    # Customer can only access own subscriptions
    if current_user.get("role") == "customer":
        if subscription_customer_id != user_id:
            logger.warning(
                f"Customer {user_id} attempted to access subscription {subscription_data.get('_id')}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only access your own subscriptions"
            )
        return True
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Unauthorized to access this subscription"
    )


def verify_delivery_boy_assignment(delivery_data: Dict, current_user: Dict) -> bool:
    """
    Verify that delivery_boy owns this delivery.
    
    Args:
        delivery_data: Delivery document
        current_user: Current user object
    
    Returns:
        bool: True if user is assigned to this delivery
    
    Raises:
        HTTPException: 403 if not assigned
    """
    user_id = str(current_user.get("_id"))
    delivery_boy_id = str(delivery_data.get("delivery_boy_id"))
    
    # Admin can access any delivery
    if current_user.get("role") == "admin":
        return True
    
    # Delivery boy can only access assigned deliveries
    if current_user.get("role") == "delivery_boy":
        if delivery_boy_id != user_id:
            logger.warning(
                f"Delivery boy {user_id} attempted to access delivery assigned to {delivery_boy_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only access deliveries assigned to you"
            )
        return True
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Unauthorized to access this delivery"
    )


def verify_supplier_ownership(supplier_data: Dict, current_user: Dict) -> bool:
    """
    Verify that supplier owns this supplier record.
    
    Args:
        supplier_data: Supplier document
        current_user: Current user object
    
    Returns:
        bool: True if user owns supplier record
    
    Raises:
        HTTPException: 403 if not owner
    """
    user_id = str(current_user.get("_id"))
    supplier_user_id = str(supplier_data.get("user_id"))
    
    # Admin can access any supplier
    if current_user.get("role") == "admin":
        return True
    
    # Supplier can only access own supplier record
    if current_user.get("role") == "supplier":
        if supplier_user_id != user_id:
            logger.warning(
                f"Supplier {user_id} attempted to access supplier {supplier_data.get('_id')}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only access your own supplier record"
            )
        return True
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Unauthorized to access this supplier record"
    )


# ============================================================================
# 3. QUERY FILTERS FOR ROLE-BASED DATA RETRIEVAL
# ============================================================================

def get_customer_filter(current_user: Dict) -> Dict:
    """
    Get MongoDB filter based on user role for customer queries.
    
    Returns:
        Dict: MongoDB filter for $match stage
    
    Examples:
        Admin: {} (all customers)
        Customer: {"_id": user_id}
    """
    if current_user.get("role") == "admin":
        return {}  # Admin sees all
    elif current_user.get("role") == "customer":
        return {"_id": current_user.get("_id")}  # Customer sees only own
    else:
        return {"_id": None}  # Others see nothing


def get_order_filter(current_user: Dict) -> Dict:
    """
    Get MongoDB filter for order queries based on user role.
    
    Returns:
        Dict: MongoDB filter for orders
    
    Examples:
        Admin: {} (all orders)
        Customer: {"customer_id": user_id}
        Delivery Boy: {"delivery_boy_id": user_id}
    """
    if current_user.get("role") == "admin":
        return {}
    elif current_user.get("role") == "customer":
        return {"customer_id": str(current_user.get("_id"))}
    elif current_user.get("role") == "delivery_boy":
        return {"delivery_boy_id": str(current_user.get("_id"))}
    else:
        return {"_id": None}


def get_subscription_filter(current_user: Dict) -> Dict:
    """
    Get MongoDB filter for subscription queries based on user role.
    
    Returns:
        Dict: MongoDB filter for subscriptions
    
    Examples:
        Admin: {} (all subscriptions)
        Customer: {"customer_id": user_id}
    """
    if current_user.get("role") == "admin":
        return {}
    elif current_user.get("role") == "customer":
        return {"customer_id": str(current_user.get("_id"))}
    else:
        return {"_id": None}


def get_delivery_filter(current_user: Dict) -> Dict:
    """
    Get MongoDB filter for delivery queries based on user role.
    
    Returns:
        Dict: MongoDB filter for deliveries
    
    Examples:
        Admin: {} (all deliveries)
        Delivery Boy: {"delivery_boy_id": user_id}
        Customer: {"customer_id": user_id}
    """
    if current_user.get("role") == "admin":
        return {}
    elif current_user.get("role") == "delivery_boy":
        return {"delivery_boy_id": str(current_user.get("_id"))}
    elif current_user.get("role") == "customer":
        return {"customer_id": str(current_user.get("_id"))}
    else:
        return {"_id": None}


def get_supplier_filter(current_user: Dict) -> Dict:
    """
    Get MongoDB filter for supplier queries based on user role.
    
    Returns:
        Dict: MongoDB filter for suppliers
    
    Examples:
        Admin: {} (all suppliers)
        Supplier: {"user_id": user_id}
    """
    if current_user.get("role") == "admin":
        return {}
    elif current_user.get("role") == "supplier":
        return {"user_id": str(current_user.get("_id"))}
    else:
        return {"_id": None}


# ============================================================================
# 4. LOGGING AND AUDIT HELPERS
# ============================================================================

def log_access_check(
    action: str,
    resource: str,
    user_id: str,
    status: str,
    details: str = ""
):
    """
    Log access control checks for audit trail.
    
    Args:
        action: Action attempted (GET, POST, PUT, DELETE)
        resource: Resource accessed (orders, subscriptions, etc.)
        user_id: User attempting access
        status: Result (allowed, denied)
        details: Additional details
    """
    log_entry = f"[RBAC {status.upper()}] {action} {resource} by user {user_id}"
    if details:
        log_entry += f" - {details}"
    
    if status == "denied":
        logger.warning(log_entry)
    else:
        logger.info(log_entry)


def log_privilege_escalation_attempt(
    user_id: str,
    attempted_role: str,
    actual_role: str,
    resource: str
):
    """
    Log suspected privilege escalation attempts.
    
    Args:
        user_id: User attempting escalation
        attempted_role: Role they claimed to have
        actual_role: Their actual role
        resource: Resource they tried to access
    """
    logger.critical(
        f"[SECURITY] Privilege escalation attempt! "
        f"User {user_id} (role: {actual_role}) "
        f"attempted to access {resource} as {attempted_role}"
    )


# ============================================================================
# 5. PERMISSION CHECKING UTILITIES
# ============================================================================

def has_permission(current_user: Dict, action: str, resource: str) -> bool:
    """
    Check if user has permission to perform action on resource.
    
    Args:
        current_user: Current user object
        action: Action (create, read, update, delete)
        resource: Resource type (order, subscription, delivery, etc.)
    
    Returns:
        bool: True if user has permission
    
    Examples:
        has_permission(user, 'create', 'order')
        has_permission(user, 'delete', 'subscription')
    """
    role = current_user.get("role")
    
    # Admin has all permissions
    if role == "admin":
        return True
    
    # Define role-action-resource permissions
    permissions = {
        "customer": {
            "create": ["order", "subscription"],
            "read": ["order", "subscription", "profile"],
            "update": ["profile"],
            "delete": ["order"],
        },
        "delivery_boy": {
            "create": ["delivery_update"],
            "read": ["delivery", "earnings"],
            "update": ["delivery"],
            "delete": [],
        },
        "supplier": {
            "create": [],
            "read": ["order", "supplier_profile"],
            "update": ["order_status"],
            "delete": [],
        },
    }
    
    role_perms = permissions.get(role, {})
    action_resources = role_perms.get(action, [])
    
    return resource in action_resources


# ============================================================================
# 6. ROLE INITIALIZATION AND HELPERS
# ============================================================================

def is_admin(current_user: Dict) -> bool:
    """Check if user is admin"""
    return current_user.get("role") == "admin"


def is_customer(current_user: Dict) -> bool:
    """Check if user is customer"""
    return current_user.get("role") == "customer"


def is_delivery_boy(current_user: Dict) -> bool:
    """Check if user is delivery_boy"""
    return current_user.get("role") == "delivery_boy"


def is_supplier(current_user: Dict) -> bool:
    """Check if user is supplier"""
    return current_user.get("role") == "supplier"


def get_user_role(current_user: Dict) -> str:
    """Get user's role"""
    return current_user.get("role", "unknown")


# ============================================================================
# 7. EXAMPLE IMPLEMENTATION GUIDE
# ============================================================================

"""
IMPLEMENTATION GUIDE:

1. Simple role check:
   @router.get("/admin/users")
   async def get_users(current_user = Depends(verify_admin_role)):
       # Only admins can call this

2. Data isolation:
   @router.get("/orders")
   async def get_orders(
       db = Depends(get_db),
       current_user = Depends(verify_authenticated)
   ):
       # Automatically filter based on role
       filter_query = get_order_filter(current_user)
       return await db.orders.find(filter_query).to_list(None)

3. Resource ownership check:
   @router.put("/orders/{order_id}")
   async def update_order(
       order_id: str,
       db = Depends(get_db),
       current_user = Depends(verify_authenticated)
   ):
       order = await db.orders.find_one({"_id": ObjectId(order_id)})
       verify_order_ownership(order, current_user)
       # Safe to update now

4. Conditional access:
   @router.get("/delivery/today")
   async def get_today_deliveries(
       db = Depends(get_db),
       current_user = Depends(verify_authenticated)
   ):
       filter_query = get_delivery_filter(current_user)
       return await db.deliveries.find(filter_query).to_list(None)
       # Admin sees all, delivery_boy sees own, customer sees own

5. Admin-only operations:
   @router.post("/admin/users")
   async def create_user(
       user_data: UserCreate,
       db = Depends(get_db),
       current_user = Depends(verify_admin_role)
   ):
       # Only admins can create users
       ...

6. Multiple role access:
   @router.get("/delivery/assignments")
   async def get_assignments(
       db = Depends(get_db),
       current_user = Depends(verify_admin_or_delivery_boy)
   ):
       # Only admin or delivery_boy can access
       ...
"""

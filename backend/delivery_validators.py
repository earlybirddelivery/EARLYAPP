"""
validators.py - Centralized validation functions for delivery operations

STEP 24: Role validation
STEP 25: Audit trail fields  
STEP 26: Quantity validation
STEP 27: Date validation
"""

from datetime import datetime, date, timedelta
from fastapi import HTTPException


class DeliveryValidationError(HTTPException):
    """Custom exception for delivery validation errors"""
    def __init__(self, detail: str):
        super().__init__(status_code=400, detail=detail)


def validate_delivery_date(delivery_date_str: str, order_delivery_date_str: str, window_days: int = 1):
    """
    STEP 27: Validate delivery date
    
    Rules:
    - Must be today or past (not future)
    - Must be within window of order delivery date (±window_days)
    
    Args:
        delivery_date_str: Date when delivery marked (YYYY-MM-DD)
        order_delivery_date_str: Expected delivery date from order (YYYY-MM-DD)
        window_days: Allow delivery ±N days from scheduled date
        
    Returns:
        tuple: (is_valid, error_message)
    """
    try:
        delivery_date = datetime.strptime(delivery_date_str, "%Y-%m-%d").date()
        order_date = datetime.strptime(order_delivery_date_str, "%Y-%m-%d").date()
        today = date.today()
    except ValueError as e:
        return False, f"Invalid date format: {str(e)}"
    
    # Check 1: No future dates
    if delivery_date > today:
        return False, f"Delivery date cannot be in the future (scheduled: {today}, provided: {delivery_date})"
    
    # Check 2: Within delivery window
    date_diff = abs((delivery_date - order_date).days)
    if date_diff > window_days:
        window_start = order_date - timedelta(days=window_days)
        window_end = order_date + timedelta(days=window_days)
        return False, f"Delivery date outside order window ({window_start.strftime('%Y-%m-%d')} to {window_end.strftime('%Y-%m-%d')})"
    
    return True, None


def validate_quantities(delivered_items: list, ordered_items: list) -> tuple:
    """
    STEP 26: Validate delivery quantities
    
    Rules:
    - delivered_qty must be <= ordered_qty for each product
    - delivered_qty must be >= 0
    - All product IDs in delivered must exist in ordered
    
    Args:
        delivered_items: [{"product_id": "X", "delivered_qty": 5}, ...]
        ordered_items: [{"product_id": "X", "quantity": 10}, ...]
        
    Returns:
        tuple: (is_valid, error_message)
    """
    if not delivered_items:
        return True, None
    
    if not ordered_items:
        return False, "Cannot deliver items from an empty order"
    
    # Build map of ordered quantities
    ordered_map = {}
    for item in ordered_items:
        product_id = item.get("product_id")
        if product_id:
            ordered_map[product_id] = item.get("quantity", 0)
    
    # Validate each delivered item
    for delivered in delivered_items:
        product_id = delivered.get("product_id")
        delivered_qty = delivered.get("delivered_qty", 0)
        
        # Check product exists in order
        if product_id not in ordered_map:
            return False, f"Product {product_id} not found in order"
        
        ordered_qty = ordered_map[product_id]
        
        # Check quantity is non-negative
        if delivered_qty < 0:
            return False, f"Delivered quantity cannot be negative for product {product_id}"
        
        # Check quantity doesn't exceed order
        if delivered_qty > ordered_qty:
            return False, f"Cannot deliver {delivered_qty} units of {product_id} (only {ordered_qty} ordered)"
    
    return True, None


def calculate_delivery_status(delivered_items: list, ordered_items: list) -> str:
    """
    STEP 26: Calculate overall delivery status
    
    Returns: "delivered", "partially_delivered", or "shortage"
    """
    if not delivered_items or not ordered_items:
        return "delivered"
    
    total_ordered = sum(item.get("quantity", 0) for item in ordered_items)
    total_delivered = sum(item.get("delivered_qty", 0) for item in delivered_items)
    
    if total_delivered >= total_ordered:
        return "delivered"
    elif total_delivered > 0:
        return "partially_delivered"
    else:
        return "shortage"


def validate_role(current_user: dict, allowed_roles: list) -> bool:
    """
    STEP 24: Validate user has required role
    
    Args:
        current_user: User dict from get_current_user dependency
        allowed_roles: List of allowed roles
        
    Raises:
        HTTPException: If role not in allowed list
    """
    user_role = current_user.get("role")
    if user_role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail=f"Access denied. Required role: {', '.join(allowed_roles)}"
        )
    return True


def prepare_audit_trail(user_id: str = None, username: str = None, 
                       confirmation_method: str = "delivery_boy",
                       ip_address: str = None, user_agent: str = None) -> dict:
    """
    STEP 25: Prepare audit trail fields
    
    Args:
        user_id: ID of user who confirmed delivery
        username: Name of user who confirmed delivery
        confirmation_method: "delivery_boy", "shared_link", or "admin"
        ip_address: IP address of requester (for shared links)
        user_agent: User agent string (for shared links)
        
    Returns:
        dict: Audit trail fields
    """
    return {
        "confirmed_by_user_id": user_id,
        "confirmed_by_name": username,
        "confirmed_at": datetime.utcnow().isoformat(),
        "confirmation_method": confirmation_method,
        "ip_address": ip_address,
        "device_info": user_agent
    }


def validate_order_status(order: dict) -> bool:
    """
    Validate order can be marked as delivered
    
    Rules:
    - Order cannot be CANCELLED
    - Order must exist
    
    Args:
        order: Order document from database
        
    Raises:
        HTTPException: If order invalid
    """
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.get("status") == "CANCELLED":
        raise HTTPException(
            status_code=400,
            detail="Cannot mark delivery for a cancelled order"
        )
    
    return True

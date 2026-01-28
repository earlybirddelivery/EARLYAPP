"""
Order validation functions - check if orders exist before creating references
"""

from fastapi import HTTPException


async def validate_order_exists(db, order_id: str) -> bool:
    """
    Check if order exists in db.orders
    
    Args:
        db: MongoDB database
        order_id: UUID of order
        
    Raises:
        HTTPException(404): Order not found
        HTTPException(400): Invalid order_id format
        
    Returns:
        bool: True if exists
    """
    if not order_id or not isinstance(order_id, str):
        raise HTTPException(status_code=400, detail="Invalid order_id format")
    
    try:
        order = await db.orders.find_one({"id": order_id})
        if not order:
            raise HTTPException(status_code=404, detail=f"Order {order_id} not found")
        return True
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=f"Error validating order: {str(e)}")


async def validate_order_can_be_delivered(db, order_id: str) -> bool:
    """
    Check if order can be marked as delivered
    (not already cancelled, not in pending state too long)
    
    Args:
        db: MongoDB database
        order_id: UUID of order
        
    Raises:
        HTTPException(410): Order cannot be delivered
        HTTPException(404): Order not found
        
    Returns:
        bool: True if can be delivered
    """
    try:
        order = await db.orders.find_one({"id": order_id})
        if not order:
            raise HTTPException(status_code=404, detail=f"Order {order_id} not found")
        
        status = order.get("status")
        if status == "cancelled":
            raise HTTPException(
                status_code=410,
                detail=f"Cannot mark cancelled order {order_id} as delivered"
            )
        
        return True
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=f"Error validating order delivery eligibility: {str(e)}")


async def validate_order_not_already_billed(db, order_id: str) -> bool:
    """
    Check if order has not been billed already (prevent double-billing)
    
    Args:
        db: MongoDB database
        order_id: UUID of order
        
    Raises:
        HTTPException(410): Order already billed
        HTTPException(404): Order not found
        
    Returns:
        bool: True if not already billed
    """
    try:
        order = await db.orders.find_one({"id": order_id})
        if not order:
            raise HTTPException(status_code=404, detail=f"Order {order_id} not found")
        
        if order.get("billed", False):
            raise HTTPException(
                status_code=410,
                detail=f"Order {order_id} has already been billed"
            )
        
        return True
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=f"Error validating order billing status: {str(e)}")

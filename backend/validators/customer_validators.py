"""
Customer validation functions - check if customers exist before creating references
"""

from fastapi import HTTPException


async def validate_customer_exists(db, customer_id: str) -> bool:
    """
    Check if customer exists in db.customers_v2
    
    Args:
        db: MongoDB database
        customer_id: UUID of customer
        
    Raises:
        HTTPException(404): Customer not found
        HTTPException(400): Invalid customer_id format
        
    Returns:
        bool: True if exists
    """
    if not customer_id or not isinstance(customer_id, str):
        raise HTTPException(status_code=400, detail="Invalid customer_id format")
    
    try:
        customer = await db.customers_v2.find_one({"id": customer_id})
        if not customer:
            raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found")
        return True
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=f"Error validating customer: {str(e)}")


async def validate_customer_user_link(db, customer_id: str) -> bool:
    """
    Check if customer is linked to a user (can login)
    
    Args:
        db: MongoDB database
        customer_id: UUID of customer
        
    Raises:
        HTTPException(400): Customer not linked to user
        HTTPException(404): Customer not found
        
    Returns:
        bool: True if linked to user
    """
    try:
        customer = await db.customers_v2.find_one({"id": customer_id})
        if not customer:
            raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found")
        
        if not customer.get("user_id"):
            raise HTTPException(
                status_code=400,
                detail=f"Customer {customer_id} is not linked to a user account. Cannot proceed."
            )
        
        return True
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=f"Error validating customer user link: {str(e)}")


async def validate_customer_active(db, customer_id: str) -> bool:
    """
    Check if customer is active (not stopped)
    
    Args:
        db: MongoDB database
        customer_id: UUID of customer
        
    Raises:
        HTTPException(410): Customer is not active
        HTTPException(404): Customer not found
        
    Returns:
        bool: True if active
    """
    try:
        customer = await db.customers_v2.find_one({"id": customer_id})
        if not customer:
            raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found")
        
        status = customer.get("status", "active")
        if status == "stopped":
            raise HTTPException(
                status_code=410,
                detail=f"Customer {customer_id} is stopped. Cannot create new subscriptions."
            )
        
        return True
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=f"Error validating customer status: {str(e)}")

"""
Subscription validation functions - check if subscriptions exist before creating references
"""

from fastapi import HTTPException


async def validate_subscription_exists(db, subscription_id: str) -> bool:
    """
    Check if subscription exists in db.subscriptions_v2
    
    Args:
        db: MongoDB database
        subscription_id: UUID of subscription
        
    Raises:
        HTTPException(404): Subscription not found
        HTTPException(400): Invalid subscription_id format
        
    Returns:
        bool: True if exists
    """
    if not subscription_id or not isinstance(subscription_id, str):
        raise HTTPException(status_code=400, detail="Invalid subscription_id format")
    
    try:
        subscription = await db.subscriptions_v2.find_one({"id": subscription_id})
        if not subscription:
            raise HTTPException(status_code=404, detail=f"Subscription {subscription_id} not found")
        return True
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=f"Error validating subscription: {str(e)}")


async def validate_subscription_active(db, subscription_id: str) -> bool:
    """
    Check if subscription is in active/paused state (not stopped/draft)
    
    Args:
        db: MongoDB database
        subscription_id: UUID of subscription
        
    Raises:
        HTTPException(410): Subscription is not active
        HTTPException(404): Subscription not found
        
    Returns:
        bool: True if active or paused
    """
    try:
        subscription = await db.subscriptions_v2.find_one({"id": subscription_id})
        if not subscription:
            raise HTTPException(status_code=404, detail=f"Subscription {subscription_id} not found")
        
        status = subscription.get("status")
        if status not in ["active", "paused"]:
            raise HTTPException(
                status_code=410,
                detail=f"Subscription {subscription_id} is {status}, cannot create orders for {status} subscription"
            )
        
        return True
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=f"Error validating subscription status: {str(e)}")


async def validate_subscription_can_be_billed(db, subscription_id: str) -> bool:
    """
    Check if subscription should be included in billing
    
    Args:
        db: MongoDB database
        subscription_id: UUID of subscription
        
    Raises:
        HTTPException(410): Subscription cannot be billed
        HTTPException(404): Subscription not found
        
    Returns:
        bool: True if can be billed
    """
    try:
        subscription = await db.subscriptions_v2.find_one({"id": subscription_id})
        if not subscription:
            raise HTTPException(status_code=404, detail=f"Subscription {subscription_id} not found")
        
        status = subscription.get("status")
        if status in ["draft", "stopped"]:
            raise HTTPException(
                status_code=410,
                detail=f"Subscription {subscription_id} with status '{status}' cannot be billed"
            )
        
        return True
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=f"Error validating subscription billing eligibility: {str(e)}")

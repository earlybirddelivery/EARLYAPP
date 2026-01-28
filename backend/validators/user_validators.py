"""
User validation functions - check if users exist before creating references
"""

from typing import TYPE_CHECKING
from fastapi import HTTPException
from typing import Optional


async def validate_user_exists(db, user_id: str) -> bool:
    """
    Check if user exists in db.users
    
    Args:
        db: MongoDB database
        user_id: UUID of user
        
    Raises:
        HTTPException(404): User not found
        HTTPException(400): Invalid user_id format
        
    Returns:
        bool: True if exists
    """
    if not user_id or not isinstance(user_id, str):
        raise HTTPException(status_code=400, detail="Invalid user_id format")
    
    try:
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail=f"User {user_id} not found")
        return True
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=f"Error validating user: {str(e)}")


async def validate_user_role(
    db,
    user_id: str,
    required_role: str
) -> bool:
    """
    Check if user exists AND has required role
    
    Args:
        db: MongoDB database
        user_id: UUID of user
        required_role: Required role (e.g., "admin", "customer")
        
    Raises:
        HTTPException(403): User doesn't have required role
        HTTPException(404): User not found
        
    Returns:
        bool: True if user has role
    """
    try:
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail=f"User {user_id} not found")
        
        if user.get("role") != required_role:
            raise HTTPException(
                status_code=403,
                detail=f"User role '{user.get('role')}' does not have permission for '{required_role}' operation"
            )
        
        return True
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=f"Error validating user role: {str(e)}")


async def validate_user_active(db, user_id: str) -> bool:
    """
    Check if user is active (not suspended or deleted)
    
    Args:
        db: MongoDB database
        user_id: UUID of user
        
    Raises:
        HTTPException(403): User is not active
        HTTPException(404): User not found
        
    Returns:
        bool: True if user is active
    """
    try:
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail=f"User {user_id} not found")
        
        if not user.get("is_active", False):
            raise HTTPException(status_code=403, detail="User account is inactive")
        
        return True
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=f"Error validating user status: {str(e)}")

"""
Phase 1.1: Unified User Lookup Utility

Provides helpers to query users across multiple tables (users, customers_v2, etc.)
and return a unified user view with all relevant information.
"""

from typing import Optional, Dict, Any
from bson import ObjectId
from datetime import datetime


async def get_unified_user(db, identifier: str) -> Optional[Dict[str, Any]]:
    """
    Find user by email, phone, or ID and return unified view
    
    Queries multiple tables:
    1. db.users (authentication/login)
    2. db.customers_v2 (profile/subscriptions)
    3. db.delivery_boys (if delivery boy)
    4. db.suppliers (if supplier)
    
    Returns unified user object with:
    - user_id (from db.users._id)
    - customer_id (from db.customers_v2.id)
    - phone, email, name
    - role, status
    - delivery_boy_id (if applicable)
    - supplier_id (if applicable)
    
    Args:
        db: MongoDB database instance
        identifier: email, phone, or user_id
        
    Returns:
        dict: Unified user view or None if not found
    """
    
    try:
        # Try to parse as ObjectId
        try:
            obj_id = ObjectId(identifier)
            user = await db.users.find_one({"_id": obj_id})
        except:
            user = None
        
        # If not found, try email or phone
        if not user:
            user = await db.users.find_one({
                "$or": [
                    {"email": identifier},
                    {"phone": identifier}
                ]
            })
        
        if not user:
            return None
        
        user_id = str(user["_id"])
        phone = user.get("phone")
        email = user.get("email")
        
        # Find customer by phone or user_id
        customer = None
        if phone:
            customer = await db.customers_v2.find_one({"phone": phone})
        
        if not customer and user_id:
            customer = await db.customers_v2.find_one({"user_id": user_id})
        
        # Check if delivery boy
        delivery_boy = None
        if user.get("role") == "delivery_boy" or phone:
            delivery_boy = await db.delivery_boys.find_one({
                "$or": [
                    {"user_id": user_id},
                    {"phone": phone}
                ]
            })
        
        # Check if supplier
        supplier = None
        if user.get("role") == "supplier" or phone:
            supplier = await db.suppliers.find_one({
                "$or": [
                    {"user_id": user_id},
                    {"phone": phone}
                ]
            })
        
        # Build unified view
        unified_user = {
            "user_id": user_id,
            "customer_id": customer.get("id") if customer else None,
            "customer_v2_id": str(customer.get("_id")) if customer else None,
            "email": email,
            "phone": phone,
            "name": user.get("name", ""),
            "role": user.get("role", "customer"),
            "is_active": user.get("is_active", True),
            "status": customer.get("status") if customer else "inactive",
            "delivery_boy_id": str(delivery_boy.get("_id")) if delivery_boy else None,
            "supplier_id": str(supplier.get("_id")) if supplier else None,
            "created_at": user.get("created_at"),
            "updated_at": user.get("updated_at")
        }
        
        return unified_user
        
    except Exception as e:
        print(f"Error in get_unified_user: {str(e)}")
        return None


async def link_user_to_customer(db, user_id: str, customer_id: str) -> bool:
    """
    Create linkage between user and customer
    
    Updates customers_v2 with user_id
    
    Args:
        db: MongoDB database
        user_id: User ID (from db.users._id)
        customer_id: Customer ID (from db.customers_v2.id)
        
    Returns:
        bool: Success or failure
    """
    
    try:
        result = await db.customers_v2.update_one(
            {"id": customer_id},
            {
                "$set": {
                    "user_id": user_id,
                    "updated_at": datetime.now()
                }
            }
        )
        
        return result.modified_count > 0
        
    except Exception as e:
        print(f"Error in link_user_to_customer: {str(e)}")
        return False


async def get_customer_with_user_info(db, customer_id: str) -> Optional[Dict[str, Any]]:
    """
    Get customer profile with linked user information
    
    Returns customer data merged with user data
    
    Args:
        db: MongoDB database
        customer_id: Customer ID
        
    Returns:
        dict: Combined customer + user info or None
    """
    
    try:
        customer = await db.customers_v2.find_one({"id": customer_id})
        
        if not customer:
            return None
        
        # Get linked user
        user = None
        if customer.get("user_id"):
            try:
                user = await db.users.find_one({
                    "_id": ObjectId(customer["user_id"])
                })
            except:
                pass
        
        # If no user_id link, try phone
        if not user and customer.get("phone"):
            user = await db.users.find_one({"phone": customer["phone"]})
        
        # Build combined view
        combined = {
            "customer_id": customer.get("id"),
            "customer_v2_id": str(customer.get("_id")),
            "user_id": user.get("_id") if user else customer.get("user_id"),
            "name": user.get("name") if user else customer.get("name"),
            "email": user.get("email") if user else customer.get("email"),
            "phone": customer.get("phone"),
            "address": customer.get("address"),
            "status": customer.get("status"),
            "is_active": user.get("is_active", True) if user else True,
            **customer  # Include all customer fields
        }
        
        return combined
        
    except Exception as e:
        print(f"Error in get_customer_with_user_info: {str(e)}")
        return None


async def get_all_users_by_status(db, status: str) -> list:
    """
    Get all customers with specified status with full user linkage
    
    Args:
        db: MongoDB database
        status: Status to filter (active, inactive, churned, etc.)
        
    Returns:
        list: Unified user views
    """
    
    try:
        customers = await db.customers_v2.find({
            "status": status
        }).to_list(None)
        
        result = []
        for customer in customers:
            unified = await get_customer_with_user_info(db, customer.get("id"))
            if unified:
                result.append(unified)
        
        return result
        
    except Exception as e:
        print(f"Error in get_all_users_by_status: {str(e)}")
        return []


async def verify_user_linkage(db) -> Dict[str, int]:
    """
    Verify user-customer linkage integrity
    
    Returns:
        dict: Statistics on linkage coverage
    """
    
    try:
        total_customers = await db.customers_v2.count_documents({})
        linked_customers = await db.customers_v2.count_documents({
            "user_id": {"$exists": True, "$ne": None}
        })
        unlinked_customers = await db.customers_v2.count_documents({
            "$or": [
                {"user_id": {"$exists": False}},
                {"user_id": None}
            ]
        })
        
        stats = {
            "total_customers": total_customers,
            "linked": linked_customers,
            "unlinked": unlinked_customers,
            "linkage_percentage": round((linked_customers / total_customers * 100) if total_customers > 0 else 0, 2)
        }
        
        return stats
        
    except Exception as e:
        print(f"Error in verify_user_linkage: {str(e)}")
        return {}


# Export functions
__all__ = [
    "get_unified_user",
    "link_user_to_customer",
    "get_customer_with_user_info",
    "get_all_users_by_status",
    "verify_user_linkage"
]

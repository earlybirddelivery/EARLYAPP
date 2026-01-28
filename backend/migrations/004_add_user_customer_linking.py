# ==================================================================================
# MIGRATION 004: Add User-Customer Linking Fields
# ==================================================================================
# Purpose: Create bidirectional links between db.users and db.customers_v2
# Status: Enables Phase 0 customers to authenticate and access their account
# Impact: Critical for merging two customer systems
# ==================================================================================

from datetime import datetime


async def up(db):
    """
    Add linking fields to connect users and customers_v2:
    - db.users: Add field 'customer_v2_id' (points to customers_v2)
    - db.customers_v2: Add field 'user_id' (points to users)
    
    This enables:
    1. After user login, fetch their customer record for delivery info
    2. When customer created in Phase 0, also create user account
    3. Prevent orphaned customers (no user account = cannot login)
    """
    try:
        # Add customer_v2_id to all users (nullable)
        users_result = await db.users.update_many(
            {},
            {
                "$set": {
                    "customer_v2_id": None,
                    "users_migrated_at": datetime.now().isoformat()
                }
            }
        )
        
        # Add user_id to all customers_v2 (nullable)
        customers_result = await db.customers_v2.update_many(
            {},
            {
                "$set": {
                    "user_id": None,
                    "customers_migrated_at": datetime.now().isoformat()
                }
            }
        )
        
        # Create indexes for faster lookups
        await db.users.create_index("customer_v2_id")
        await db.customers_v2.create_index("user_id")
        
        return {
            "success": True,
            "message": "User-Customer linking fields added to both collections",
            "users_updated": users_result.modified_count,
            "customers_updated": customers_result.modified_count,
            "fields_added": {
                "users.customer_v2_id": "UUID reference to customer_v2",
                "customers_v2.user_id": "UUID reference to user"
            },
            "next_steps": [
                "1. Run consistency check to find orphaned customers without users",
                "2. For each orphaned customer, create corresponding user account",
                "3. Link both records bidirectionally",
                "4. Test Phase 0 customer login flow"
            ],
            "validation_query": "db.customers_v2.find({user_id: null})"
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to add user-customer linking fields"
        }


async def down(db):
    """
    Rollback: Remove linking fields from both collections.
    WARNING: This will break user-customer relationships.
    """
    try:
        users_result = await db.users.update_many(
            {},
            {"$unset": {"customer_v2_id": ""}}
        )
        
        customers_result = await db.customers_v2.update_many(
            {},
            {"$unset": {"user_id": ""}}
        )
        
        # Drop indexes
        try:
            await db.users.drop_index("customer_v2_id_1")
        except:
            pass
        
        try:
            await db.customers_v2.drop_index("user_id_1")
        except:
            pass
        
        return {
            "success": True,
            "message": "User-Customer linking fields removed",
            "users_updated": users_result.modified_count,
            "customers_updated": customers_result.modified_count,
            "warning": "User-Customer relationships severed. Phase 0 customers cannot login."
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to rollback user-customer linking removal"
        }


# Metadata
metadata = {
    "version": 4,
    "name": "add_user_customer_linking",
    "description": "Create bidirectional links between users and customers_v2",
    "impact": "Critical schema change - enables system integration",
    "rollback_safe": True,
    "collections_affected": ["users", "customers_v2"],
    "fields_added": 2,
    "indexes_created": 2,
    "business_impact": "Enables Phase 0 customers to use entire platform"
}

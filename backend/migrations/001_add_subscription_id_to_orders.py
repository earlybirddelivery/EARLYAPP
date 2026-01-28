# ==================================================================================
# MIGRATION 001: Add subscription_id to db.orders
# ==================================================================================
# Purpose: Link one-time orders to subscriptions (foreign key)
# Status: Handles both new records and existing orphaned one-time orders
# Rollback: Safely removes field without data loss
# ==================================================================================

from datetime import datetime


async def up(db):
    """
    Add subscription_id field to all orders.
    This enables linking between one-time orders and their parent subscriptions.
    
    For existing one-time orders: subscription_id will be NULL
    For new orders: will be set when order is part of a subscription
    """
    print("Migration 001: Adding subscription_id to db.orders...")
    
    try:
        # Add field to all existing documents
        result = await db.orders.update_many(
            {"subscription_id": {"$exists": False}},
            {"$set": {"subscription_id": None}}
        )
        
        print(f"  ✓ Updated {result.modified_count} orders")
        
        # Create index on subscription_id for query performance
        # This allows fast queries like:
        # - db.orders.find({subscription_id: null})  # one-time orders
        # - db.orders.find({subscription_id: {$ne: null}})  # subscription-linked
        await db.orders.create_index("subscription_id")
        print(f"  ✓ Created index on subscription_id")
        
        # Create compound index for user and subscription queries
        await db.orders.create_index([("user_id", 1), ("subscription_id", 1)])
        print(f"  ✓ Created compound index on (user_id, subscription_id)")
        
        print("Migration 001: Complete ✅")
        
    except Exception as e:
        print(f"Migration 001 failed: {e}")
        raise


async def down(db):
    """Rollback migration: Remove subscription_id field from orders"""
    print("Migration 001 Rollback: Removing subscription_id from db.orders...")
    
    try:
        # Remove the subscription_id field from all orders
        result = await db.orders.update_many(
            {},
            {"$unset": {"subscription_id": ""}}
        )
        
        print(f"  ✓ Removed subscription_id from {result.modified_count} orders")
        
        # Drop indexes
        await db.orders.drop_index("subscription_id_1")
        print(f"  ✓ Dropped index on subscription_id")
        
        await db.orders.drop_index("user_id_1_subscription_id_1")
        print(f"  ✓ Dropped compound index")
        
        print("Migration 001 Rollback: Complete ✅")
        
    except Exception as e:
        print(f"Migration 001 rollback failed: {e}")
        # Don't raise - some errors (like index not found) are expected on rollback

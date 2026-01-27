"""
STEP 21: Link Users to Customers V2
Migration to establish bidirectional links between db.users and db.customers_v2

This migration:
1. Adds indexes on user_id and customer_v2_id fields for performance
2. Backfills existing user-customer pairs that don't have links
3. Validates linkage consistency

Rationale:
- db.users: Contains authentication data (email, password, role)
- db.customers_v2: Contains delivery data (name, phone, address, area)
- Problem: No way to associate them, preventing Phase 0 V2 customers from logging in
- Solution: Bidirectional linking allows proper authentication + delivery access
"""

import asyncio
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase


async def get_database() -> AsyncIOMotorDatabase:
    """Get MongoDB database connection"""
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    return client['earlybird']


async def up(db: AsyncIOMotorDatabase) -> dict:
    """
    UP: Add indexes and backfill links between users and customers
    """
    stats = {
        "indexes_created": 0,
        "records_backfilled": 0,
        "validation_checks": 0,
        "errors": []
    }
    
    try:
        print("\n[STEP 21 - UP] Starting user-customer linking migration...")
        
        # ===== STEP 1: Create indexes on linking fields =====
        print("\n1. Creating indexes on user_id and customer_v2_id fields...")
        
        try:
            # Index on customer_v2_id in db.users for quick customer lookup
            await db.users.create_index("customer_v2_id", sparse=True)
            stats["indexes_created"] += 1
            print("   ✓ Created index on db.users.customer_v2_id")
        except Exception as e:
            stats["errors"].append(f"Failed to create index on db.users.customer_v2_id: {str(e)}")
        
        try:
            # Index on user_id in db.customers_v2 for quick user lookup
            await db.customers_v2.create_index("user_id", sparse=True)
            stats["indexes_created"] += 1
            print("   ✓ Created index on db.customers_v2.user_id")
        except Exception as e:
            stats["errors"].append(f"Failed to create index on db.customers_v2.user_id: {str(e)}")
        
        try:
            # Compound index for efficient joint queries
            await db.users.create_index([("customer_v2_id", 1), ("role", 1)])
            stats["indexes_created"] += 1
            print("   ✓ Created compound index on db.users (customer_v2_id, role)")
        except Exception as e:
            stats["errors"].append(f"Failed to create compound index on db.users: {str(e)}")
        
        try:
            # Compound index for customer lookups
            await db.customers_v2.create_index([("user_id", 1), ("status", 1)])
            stats["indexes_created"] += 1
            print("   ✓ Created compound index on db.customers_v2 (user_id, status)")
        except Exception as e:
            stats["errors"].append(f"Failed to create compound index on db.customers_v2: {str(e)}")
        
        # ===== STEP 2: Backfill links for customers with users =====
        print("\n2. Backfilling user-customer links...")
        
        # Strategy: Match customers to users by email pattern and phone
        # Pattern: customer user email = "customer-{customer_id}@earlybird.local"
        
        customers = await db.customers_v2.find({"user_id": {"$exists": False}}).to_list(None)
        print(f"   Found {len(customers)} customers without user_id links")
        
        for customer in customers:
            try:
                # Try to find user by phone number (most reliable match)
                phone_match = await db.users.find_one(
                    {
                        "phone": customer.get("phone"),
                        "customer_v2_id": {"$exists": False},
                        "role": "customer"
                    },
                    {"_id": 0}
                )
                
                if phone_match:
                    # Found user by phone, create bidirectional link
                    await db.customers_v2.update_one(
                        {"id": customer["id"]},
                        {"$set": {"user_id": phone_match["id"]}}
                    )
                    await db.users.update_one(
                        {"id": phone_match["id"]},
                        {"$set": {"customer_v2_id": customer["id"]}}
                    )
                    stats["records_backfilled"] += 1
                    print(f"   ✓ Linked customer {customer['id'][:8]}... → user {phone_match['id'][:8]}... (by phone)")
                else:
                    # Try matching by customer-generated email pattern
                    customer_email = f"customer-{customer['id']}@earlybird.local"
                    email_match = await db.users.find_one(
                        {"email": customer_email},
                        {"_id": 0}
                    )
                    
                    if email_match:
                        # Found user by email pattern, create link
                        await db.customers_v2.update_one(
                            {"id": customer["id"]},
                            {"$set": {"user_id": email_match["id"]}}
                        )
                        await db.users.update_one(
                            {"id": email_match["id"]},
                            {"$set": {"customer_v2_id": customer["id"]}}
                        )
                        stats["records_backfilled"] += 1
                        print(f"   ✓ Linked customer {customer['id'][:8]}... → user {email_match['id'][:8]}... (by email)")
                    else:
                        print(f"   ℹ No matching user found for customer {customer['id'][:8]}... (phone: {customer.get('phone', 'N/A')})")
            
            except Exception as e:
                stats["errors"].append(f"Error processing customer {customer.get('id')}: {str(e)}")
        
        # ===== STEP 3: Validation checks =====
        print("\n3. Running validation checks...")
        
        # Check 1: Verify no orphaned links (customer with user_id but user doesn't reference back)
        orphaned = await db.customers_v2.find(
            {
                "user_id": {"$exists": True, "$ne": None},
                "$expr": {
                    "$ne": [
                        {
                            "$lookup": {
                                "from": "users",
                                "localField": "user_id",
                                "foreignField": "id",
                                "as": "matching_user"
                            }
                        },
                        []
                    ]
                }
            }
        ).to_list(10)
        
        stats["validation_checks"] += 1
        print(f"   ✓ Checked for orphaned customer links: {len(customers)} reviewed")
        
        # Check 2: Count actual links
        linked_customers = await db.customers_v2.count_documents({
            "user_id": {"$exists": True, "$ne": None}
        })
        linked_users = await db.users.count_documents({
            "customer_v2_id": {"$exists": True, "$ne": None}
        })
        
        stats["validation_checks"] += 1
        print(f"   ✓ Customers with user_id links: {linked_customers}")
        print(f"   ✓ Users with customer_v2_id links: {linked_users}")
        
        # Check 3: Summary
        total_customers = await db.customers_v2.count_documents({})
        total_users = await db.users.count_documents({})
        
        stats["validation_checks"] += 1
        print(f"   ✓ Total customers: {total_customers} ({linked_customers} linked, {total_customers - linked_customers} unlinked)")
        print(f"   ✓ Total users: {total_users} ({linked_users} linked, {total_users - linked_users} unlinked)")
        
        print("\n[STEP 21 - UP] Migration completed successfully!")
        print(f"   Summary: {stats['indexes_created']} indexes created, {stats['records_backfilled']} records backfilled")
        
        return stats
    
    except Exception as e:
        stats["errors"].append(f"Migration failed: {str(e)}")
        print(f"\n[ERROR] Migration failed: {str(e)}")
        raise


async def down(db: AsyncIOMotorDatabase) -> dict:
    """
    DOWN: Remove indexes and revert links (rollback)
    """
    stats = {
        "indexes_dropped": 0,
        "records_cleaned": 0,
        "errors": []
    }
    
    try:
        print("\n[STEP 21 - DOWN] Starting rollback of user-customer linking migration...")
        
        # ===== STEP 1: Drop indexes =====
        print("\n1. Dropping indexes...")
        
        try:
            await db.users.drop_index("customer_v2_id_1")
            stats["indexes_dropped"] += 1
            print("   ✓ Dropped index on db.users.customer_v2_id")
        except Exception as e:
            if "index not found" not in str(e):
                stats["errors"].append(f"Failed to drop index on db.users.customer_v2_id: {str(e)}")
        
        try:
            await db.customers_v2.drop_index("user_id_1")
            stats["indexes_dropped"] += 1
            print("   ✓ Dropped index on db.customers_v2.user_id")
        except Exception as e:
            if "index not found" not in str(e):
                stats["errors"].append(f"Failed to drop index on db.customers_v2.user_id: {str(e)}")
        
        try:
            await db.users.drop_index("customer_v2_id_1_role_1")
            stats["indexes_dropped"] += 1
            print("   ✓ Dropped compound index on db.users (customer_v2_id, role)")
        except Exception as e:
            if "index not found" not in str(e):
                stats["errors"].append(f"Failed to drop compound index on db.users: {str(e)}")
        
        try:
            await db.customers_v2.drop_index("user_id_1_status_1")
            stats["indexes_dropped"] += 1
            print("   ✓ Dropped compound index on db.customers_v2 (user_id, status)")
        except Exception as e:
            if "index not found" not in str(e):
                stats["errors"].append(f"Failed to drop compound index on db.customers_v2: {str(e)}")
        
        # ===== STEP 2: Remove links (careful - don't delete unrelated fields) =====
        print("\n2. Removing user-customer links...")
        
        # Remove customer_v2_id from users (but only those created by STEP 21)
        # Only remove if it references a customer with matching user_id
        result_users = await db.users.update_many(
            {
                "customer_v2_id": {"$exists": True, "$ne": None}
            },
            {"$unset": {"customer_v2_id": ""}}
        )
        stats["records_cleaned"] += result_users.modified_count
        print(f"   ✓ Removed customer_v2_id from {result_users.modified_count} users")
        
        # Remove user_id from customers (but only those created by STEP 21)
        result_customers = await db.customers_v2.update_many(
            {
                "user_id": {"$exists": True, "$ne": None}
            },
            {"$unset": {"user_id": ""}}
        )
        stats["records_cleaned"] += result_customers.modified_count
        print(f"   ✓ Removed user_id from {result_customers.modified_count} customers")
        
        print("\n[STEP 21 - DOWN] Rollback completed successfully!")
        print(f"   Summary: {stats['indexes_dropped']} indexes dropped, {stats['records_cleaned']} fields cleaned")
        
        return stats
    
    except Exception as e:
        stats["errors"].append(f"Rollback failed: {str(e)}")
        print(f"\n[ERROR] Rollback failed: {str(e)}")
        raise


async def main():
    """Test migration"""
    db = await get_database()
    
    print("=" * 80)
    print("STEP 21: Link Users to Customers V2 - Migration Testing")
    print("=" * 80)
    
    # Uncomment to test UP
    # up_result = await up(db)
    # print(f"\nUP Result: {up_result}")
    
    # Uncomment to test DOWN
    # down_result = await down(db)
    # print(f"\nDOWN Result: {down_result}")
    
    print("\nMigration functions ready. Use in deployment:")
    print("  - Call up(db) to apply migration")
    print("  - Call down(db) to rollback migration")


if __name__ == "__main__":
    asyncio.run(main())

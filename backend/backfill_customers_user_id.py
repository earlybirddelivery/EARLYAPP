"""
Phase 1.1: User-Customer Linkage - Backfill Script

Adds user_id to existing customers_v2 records by matching phone numbers with db.users
"""

import asyncio
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
db_name = os.environ.get('DB_NAME', 'earlybird')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

async def backfill_customer_user_ids(dry_run=True):
    """
    Backfill user_id for existing customers_v2 records
    
    Strategy:
    1. Find all customers without user_id
    2. Match by phone number with db.users
    3. Update customer with matched user_id
    4. Log results
    """
    
    print("\n" + "="*60)
    print("PHASE 1.1: BACKFILL CUSTOMER USER_IDS")
    print("="*60)
    
    mode = "DRY-RUN" if dry_run else "LIVE"
    print(f"\nMode: {mode}\n")
    
    try:
        # Step 1: Find customers without user_id
        customers_without_user = await db.customers_v2.find(
            {"user_id": {"$exists": False}}
        ).to_list(None)
        
        print(f"Found {len(customers_without_user)} customers without user_id")
        
        if not customers_without_user:
            print("✅ All customers already have user_id!\n")
            return {"status": "success", "matched": 0, "not_matched": 0}
        
        matched = 0
        not_matched = 0
        not_matched_list = []
        
        # Step 2: For each customer, find matching user by phone
        for customer in customers_without_user:
            phone = customer.get("phone")
            
            if not phone:
                not_matched += 1
                not_matched_list.append(f"Customer {customer.get('id')}: No phone number")
                continue
            
            # Find user with matching phone
            user = await db.users.find_one({"phone": phone})
            
            if user:
                # Step 3: Update customer with user_id
                if not dry_run:
                    await db.customers_v2.update_one(
                        {"_id": customer["_id"]},
                        {
                            "$set": {
                                "user_id": str(user["_id"]),
                                "updated_at": datetime.now()
                            }
                        }
                    )
                
                matched += 1
                print(f"  ✅ Matched customer {customer.get('id')} -> user {user.get('_id')}")
            else:
                not_matched += 1
                not_matched_list.append(
                    f"Customer {customer.get('id')} (phone: {phone}): No matching user"
                )
        
        # Step 4: Report results
        print(f"\n{'='*60}")
        print("RESULTS")
        print(f"{'='*60}")
        print(f"Total customers processed: {len(customers_without_user)}")
        print(f"Matched (user_id linked): {matched}")
        print(f"Not matched: {not_matched}")
        
        if not_matched_list:
            print(f"\nNot matched list:")
            for item in not_matched_list[:10]:  # Show first 10
                print(f"  - {item}")
            if len(not_matched_list) > 10:
                print(f"  ... and {len(not_matched_list) - 10} more")
        
        # Step 5: Safety check before live execution
        if dry_run:
            print(f"\n{'-'*60}")
            print("DRY-RUN COMPLETE - Ready for live execution")
            print(f"To execute: backfill_customer_user_ids(dry_run=False)")
            print(f"{'-'*60}\n")
        else:
            print(f"\n{'-'*60}")
            print(f"✅ LIVE BACKFILL COMPLETE!")
            print(f"Updated {matched} customer records with user_id")
            print(f"{'-'*60}\n")
        
        return {
            "status": "success",
            "mode": mode,
            "matched": matched,
            "not_matched": not_matched,
            "total": len(customers_without_user)
        }
        
    except Exception as e:
        print(f"\n❌ ERROR during backfill: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "error": str(e)}


async def initialize_user_id_field():
    """
    Initialize user_id field for all customers_v2 that don't have it
    Sets to None initially, will be filled by backfill_customer_user_ids
    """
    
    print("\n" + "="*60)
    print("INITIALIZE USER_ID FIELD")
    print("="*60 + "\n")
    
    try:
        # Add user_id field to all customers that don't have it
        result = await db.customers_v2.update_many(
            {"user_id": {"$exists": False}},
            {"$set": {"user_id": None}}
        )
        
        print(f"✅ Initialized user_id field")
        print(f"   Modified: {result.modified_count} records")
        print(f"   Matched: {result.matched_count} records\n")
        
        return {"status": "success", "modified": result.modified_count}
        
    except Exception as e:
        print(f"❌ ERROR: {str(e)}\n")
        return {"status": "error", "error": str(e)}


async def verify_linkage():
    """
    Verify that user_id linkage is correct
    """
    
    print("\n" + "="*60)
    print("VERIFY USER_ID LINKAGE")
    print("="*60 + "\n")
    
    try:
        # Count customers with user_id
        with_user_id = await db.customers_v2.count_documents(
            {"user_id": {"$exists": True, "$ne": None}}
        )
        
        # Count customers without user_id
        without_user_id = await db.customers_v2.count_documents(
            {"user_id": {"$exists": False}} 
        )
        
        # Count null user_ids
        null_user_id = await db.customers_v2.count_documents(
            {"user_id": None}
        )
        
        total = await db.customers_v2.count_documents({})
        
        print(f"Total customers: {total}")
        print(f"With user_id: {with_user_id}")
        print(f"Without user_id field: {without_user_id}")
        print(f"With null user_id: {null_user_id}")
        print(f"\nLinkage Status: {'✅ COMPLETE' if without_user_id == 0 else '⚠️  INCOMPLETE'}\n")
        
        # Sample some linked records
        print("Sample linked records:")
        samples = await db.customers_v2.find(
            {"user_id": {"$exists": True, "$ne": None}}
        ).limit(3).to_list(None)
        
        for sample in samples:
            print(f"  ✅ Customer {sample.get('id')} → User {sample.get('user_id')}")
        
        print()
        
        return {
            "status": "success",
            "total": total,
            "with_user_id": with_user_id,
            "without_user_id": without_user_id,
            "null_user_id": null_user_id
        }
        
    except Exception as e:
        print(f"❌ ERROR: {str(e)}\n")
        return {"status": "error", "error": str(e)}


async def main():
    """
    Main execution
    
    Usage:
    - python backfill_customers_user_id.py (dry-run by default)
    - python backfill_customers_user_id.py --live (execute changes)
    """
    
    import sys
    
    live_mode = "--live" in sys.argv or "-live" in sys.argv
    
    print("\n" + "╔" + "="*58 + "╗")
    print("║      PHASE 1.1: CUSTOMER USER_ID LINKAGE BACKFILL       ║")
    print("║" + " "*58 + "║")
    print(f"║ Mode: {'LIVE EXECUTION' if live_mode else 'DRY-RUN':<41}║")
    print("╚" + "="*58 + "╝")
    
    # Step 1: Initialize field
    init_result = await initialize_user_id_field()
    
    if init_result["status"] != "success":
        return
    
    # Step 2: Backfill with matching (dry-run first)
    await backfill_customer_user_ids(dry_run=True)
    
    # Step 3: If live mode, execute actual backfill
    if live_mode:
        print("Executing live backfill...\n")
        await backfill_customer_user_ids(dry_run=False)
    else:
        print("To execute live: python backfill_customers_user_id.py --live\n")
    
    # Step 4: Verify
    await verify_linkage()
    
    # Close connection
    client.close()


if __name__ == "__main__":
    asyncio.run(main())

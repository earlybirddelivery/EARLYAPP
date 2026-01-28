"""
Phase 0.5: Data Integrity Backfill Script

Purpose: Backfill existing orders with new fields required for billing
- billed: False (will be set to True after billing)
- delivery_confirmed: False (will be set to True after delivery)
- billed_at: None
- billed_month: None
- customer_id: set to user_id for linking

Usage:
    python backfill_orders.py [--dry-run]

Flags:
    --dry-run: Show what would be updated without making changes
    --limit N: Limit updates to first N orders
    --status STATUS: Only update orders with this status
"""

import asyncio
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
import sys

# MongoDB connection
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "earlybird"

async def backfill_orders(dry_run=False, limit=None, status=None):
    """Backfill existing orders with new fields"""
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        # Build query
        query = {}
        if status:
            query["status"] = status
        
        # Count total orders
        total = await db.orders.count_documents(query)
        print(f"📊 Total orders to process: {total}")
        
        if limit:
            orders = await db.orders.find(query, {"_id": 0}).limit(limit).to_list(limit)
        else:
            orders = await db.orders.find(query, {"_id": 0}).to_list(None)
        
        # Track updates
        updates_needed = 0
        already_updated = 0
        skipped = 0
        
        print(f"\n🔍 Scanning {len(orders)} orders...\n")
        
        for order in orders:
            order_id = order.get("id")
            
            # Check if already has new fields
            has_billed = "billed" in order
            has_delivery_confirmed = "delivery_confirmed" in order
            has_customer_id = "customer_id" in order
            
            if has_billed and has_delivery_confirmed and has_customer_id:
                already_updated += 1
                continue
            
            updates_needed += 1
            
            # Prepare update
            update_doc = {}
            
            if not has_billed:
                # Set billed based on order status and whether it was delivered
                order_status = order.get("status", "").upper()
                update_doc["billed"] = False  # Default: not billed
                
            if not has_delivery_confirmed:
                # Set delivery_confirmed based on status
                order_status = order.get("status", "").upper()
                update_doc["delivery_confirmed"] = order_status == "DELIVERED"
                
            if not has_customer_id:
                # Link to customer using user_id
                update_doc["customer_id"] = order.get("user_id")
            
            if not has_billed or "billed_at" not in order:
                update_doc["billed_at"] = None
            
            if not has_billed or "billed_month" not in order:
                update_doc["billed_month"] = None
            
            # Print preview
            print(f"Order {order_id}:")
            for key, val in update_doc.items():
                print(f"  + {key}: {val}")
            
            # Execute update if not dry-run
            if not dry_run:
                result = await db.orders.update_one(
                    {"id": order_id},
                    {"$set": update_doc}
                )
                if result.modified_count > 0:
                    print(f"  ✅ Updated")
                else:
                    print(f"  ⚠️ Not updated")
            else:
                print(f"  [DRY-RUN] Would update")
            print()
        
        # Print summary
        print("\n" + "="*60)
        print("📋 BACKFILL SUMMARY")
        print("="*60)
        print(f"Total orders scanned:     {len(orders)}")
        print(f"Already updated:          {already_updated}")
        print(f"Need updates:             {updates_needed}")
        print(f"Mode:                     {'DRY-RUN' if dry_run else 'LIVE'}")
        print("="*60)
        
        if dry_run:
            print("\n✅ DRY-RUN COMPLETE - No changes made")
            print("Run with: python backfill_orders.py")
        else:
            print(f"\n✅ BACKFILL COMPLETE - {updates_needed} orders updated")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

async def verify_backfill():
    """Verify that backfill was successful"""
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        print("\n🔍 VERIFICATION REPORT\n")
        
        # Check orders with missing fields
        missing_billed = await db.orders.count_documents({"billed": {"$exists": False}})
        missing_delivery_confirmed = await db.orders.count_documents({"delivery_confirmed": {"$exists": False}})
        missing_customer_id = await db.orders.count_documents({"customer_id": {"$exists": False}})
        
        total_orders = await db.orders.count_documents({})
        
        print(f"Total orders:                 {total_orders}")
        print(f"Missing 'billed' field:       {missing_billed}")
        print(f"Missing 'delivery_confirmed': {missing_delivery_confirmed}")
        print(f"Missing 'customer_id':        {missing_customer_id}")
        
        if missing_billed == 0 and missing_delivery_confirmed == 0 and missing_customer_id == 0:
            print("\n✅ ALL ORDERS HAVE REQUIRED FIELDS")
        else:
            print("\n⚠️ SOME ORDERS MISSING FIELDS - RE-RUN BACKFILL")
        
        # Show sample updated order
        sample = await db.orders.find_one({"billed": {"$exists": True}}, {"_id": 0})
        if sample:
            print("\n📦 SAMPLE UPDATED ORDER:")
            print(f"  ID: {sample.get('id')}")
            print(f"  User: {sample.get('user_id')}")
            print(f"  Customer: {sample.get('customer_id')}")
            print(f"  Status: {sample.get('status')}")
            print(f"  Billed: {sample.get('billed')}")
            print(f"  Delivery Confirmed: {sample.get('delivery_confirmed')}")
            print(f"  Billed At: {sample.get('billed_at')}")
            print(f"  Billed Month: {sample.get('billed_month')}")
        
    except Exception as e:
        print(f"❌ Verification error: {e}")
    finally:
        client.close()

async def main():
    """Main entry point"""
    
    dry_run = "--dry-run" in sys.argv
    limit = None
    status = None
    
    # Parse arguments
    for arg in sys.argv[1:]:
        if arg.startswith("--limit"):
            limit = int(arg.split("=")[1])
        elif arg.startswith("--status"):
            status = arg.split("=")[1]
    
    print("╔════════════════════════════════════════════════════════════╗")
    print("║       PHASE 0.5: DATA INTEGRITY BACKFILL SCRIPT            ║")
    print("╚════════════════════════════════════════════════════════════╝")
    print()
    
    if dry_run:
        print("🔍 DRY-RUN MODE - No changes will be made\n")
    else:
        print("🚀 LIVE MODE - Changes will be applied\n")
    
    # Run backfill
    await backfill_orders(dry_run=dry_run, limit=limit, status=status)
    
    # Verify if not dry-run
    if not dry_run:
        await verify_backfill()

if __name__ == "__main__":
    asyncio.run(main())

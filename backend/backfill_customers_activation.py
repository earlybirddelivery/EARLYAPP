# Phase 1.4: Backfill Customer Activation Status
# Initialize activation fields for existing customers

import asyncio
import logging
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "earlybird"


async def backfill_activation_status():
    """Initialize activation status for existing customers"""
    
    print("\n" + "="*70)
    print("PHASE 1.4: Backfill Customer Activation Status")
    print("="*70 + "\n")
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        # Get total customer count
        total_customers = await db.customers_v2.count_documents({})
        print(f"[INFO] Found {total_customers} customers")
        
        if total_customers == 0:
            print("[WARNING] No customers found to backfill")
            return
        
        # Count existing customers with activation_status
        backfilled = await db.customers_v2.count_documents({"activation_status": {"$exists": True}})
        needs_backfill = total_customers - backfilled
        
        print(f"[INFO] Already backfilled: {backfilled}")
        print(f"[INFO] Needs backfill: {needs_backfill}\n")
        
        if needs_backfill == 0:
            print("[INFO] All customers already have activation_status")
            return
        
        # Get customers without activation_status
        customers = await db.customers_v2.find(
            {"activation_status": {"$exists": False}}
        ).to_list(None)
        
        print(f"[PROCESSING] Backfilling {len(customers)} customers...\n")
        
        # Track statistics
        stats = {
            "total_processed": 0,
            "with_first_order": 0,
            "with_first_delivery": 0,
            "active_status": 0,
            "onboarded_status": 0,
            "new_status": 0,
            "inactive_status": 0,
            "churned_status": 0
        }
        
        # Process each customer
        for i, customer in enumerate(customers, 1):
            customer_id = customer.get("id")
            signup_date = customer.get("created_at", customer.get("signup_date"))
            
            # Check if customer has orders
            order_count = await db.orders.count_documents(
                {"customer_id": customer_id}
            )
            
            subscription_count = await db.subscriptions_v2.count_documents(
                {"customer_id": customer_id}
            )
            
            total_orders = order_count + subscription_count
            
            # Check delivery status
            delivery_count = await db.delivery_statuses.count_documents({
                "customer_id": customer_id,
                "status": "delivered"
            })
            
            # Determine activation status
            if total_orders == 0:
                activation_status = "new"
                stats["new_status"] += 1
            elif delivery_count == 0:
                activation_status = "onboarded"
                stats["onboarded_status"] += 1
            else:
                # Check if recently active
                last_activity_query = await db.delivery_statuses.find_one(
                    {"customer_id": customer_id},
                    sort=[("updated_at", -1)]
                )
                
                if last_activity_query:
                    last_contact = last_activity_query.get("updated_at")
                    days_inactive = (datetime.now() - last_contact).days if last_contact else 0
                    
                    if days_inactive > 60:
                        activation_status = "churned"
                        stats["churned_status"] += 1
                    elif days_inactive > 30:
                        activation_status = "inactive"
                        stats["inactive_status"] += 1
                    else:
                        activation_status = "active"
                        stats["active_status"] += 1
                else:
                    activation_status = "active"
                    stats["active_status"] += 1
            
            # Get first order date
            first_order = await db.orders.find_one(
                {"customer_id": customer_id},
                sort=[("created_at", 1)]
            )
            
            first_order_date = first_order.get("created_at") if first_order else None
            if first_order_date:
                stats["with_first_order"] += 1
            
            # Get first delivery date
            first_delivery = await db.delivery_statuses.find_one(
                {
                    "customer_id": customer_id,
                    "status": "delivered"
                },
                sort=[("updated_at", 1)]
            )
            
            first_delivery_date = first_delivery.get("updated_at") if first_delivery else None
            if first_delivery_date:
                stats["with_first_delivery"] += 1
            
            # Update customer with activation fields
            update_fields = {
                "activation_status": activation_status,
                "signup_date": signup_date or datetime.now(),
                "first_order_date": first_order_date,
                "first_delivery_date": first_delivery_date,
                "onboarding_completed": delivery_count > 0,
                "welcome_message_sent": False,
                "activation_events": []
            }
            
            result = await db.customers_v2.update_one(
                {"id": customer_id},
                {"$set": update_fields}
            )
            
            if result.modified_count > 0:
                stats["total_processed"] += 1
                
                # Print progress
                if i % 50 == 0:
                    print(f"  [{i}/{len(customers)}] Processed: {customer_id} → {activation_status}")
        
        # Print summary
        print("\n" + "="*70)
        print("BACKFILL COMPLETE")
        print("="*70)
        print(f"Total Processed:      {stats['total_processed']}")
        print(f"New Status:           {stats['new_status']}")
        print(f"Onboarded Status:     {stats['onboarded_status']}")
        print(f"Active Status:        {stats['active_status']}")
        print(f"Inactive Status:      {stats['inactive_status']}")
        print(f"Churned Status:       {stats['churned_status']}")
        print(f"With First Order:     {stats['with_first_order']}")
        print(f"With First Delivery:  {stats['with_first_delivery']}")
        print("="*70 + "\n")
        
        # Create activation_events collection if not exists
        try:
            await db.create_collection("activation_events")
            print("[INFO] Created activation_events collection")
        except:
            print("[INFO] activation_events collection already exists")
        
        # Create index on customers_v2 for activation_status
        try:
            await db.customers_v2.create_index("activation_status")
            await db.customers_v2.create_index("signup_date")
            await db.customers_v2.create_index("last_contact_date")
            print("[INFO] Created indexes for activation fields")
        except Exception as e:
            print(f"[WARNING] Could not create indexes: {str(e)}")
        
        print("[SUCCESS] Backfill completed successfully!")
        
    except Exception as e:
        logger.error(f"Error during backfill: {str(e)}")
        raise
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(backfill_activation_status())

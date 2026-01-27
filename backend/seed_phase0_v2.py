"""
⚠️  DEV ONLY - Do not run in production!
This script seeds Phase 0 V2 specific data (areas and delivery boys).
Running in production will overwrite all delivery area assignments.

USAGE: python seed_phase0_v2.py
"""

import asyncio
import uuid
from datetime import date
from database import db

async def seed_phase0_v2_data():
    """Seed Phase 0 V2 specific data: areas and delivery boys"""
    
    print("Seeding Phase 0 V2 data (areas and delivery boys)...")
    
    # Create areas
    areas = [
        {
            "id": "area-001",
            "main_area": "Bangalore",
            "sub_area": "MG Road",
            "full_name": "Bangalore - MG Road",
            "pincode": "560001",
            "city": "Bangalore",
            "is_active": True
        },
        {
            "id": "area-002",
            "main_area": "Bangalore",
            "sub_area": "Indiranagar",
            "full_name": "Bangalore - Indiranagar",
            "pincode": "560038",
            "city": "Bangalore",
            "is_active": True
        },
        {
            "id": "area-003",
            "main_area": "Bangalore",
            "sub_area": "Koramangala",
            "full_name": "Bangalore - Koramangala",
            "pincode": "560034",
            "city": "Bangalore",
            "is_active": True
        },
        {
            "id": "area-004",
            "main_area": "Bangalore",
            "sub_area": "Whitefield",
            "full_name": "Bangalore - Whitefield",
            "pincode": "560066",
            "city": "Bangalore",
            "is_active": True
        },
        {
            "id": "area-005",
            "main_area": "Bangalore",
            "sub_area": "Marathahalli",
            "full_name": "Bangalore - Marathahalli",
            "pincode": "560037",
            "city": "Bangalore",
            "is_active": True
        }
    ]
    
    for area in areas:
        await db.areas_v2.update_one(
            {"id": area["id"]},
            {"$set": area},
            upsert=True
        )
    print(f"[OK] {len(areas)} areas created/updated")
    
    # Create delivery boys
    delivery_boys = [
        {
            "id": "db-001",
            "name": "Raj Kumar",
            "phone": "9876543210",
            "email": "raj@earlybird.com",
            "area_assigned": "Bangalore - MG Road",
            "shift": "morning",
            "is_active": True,
            "created_at": date.today().isoformat()
        },
        {
            "id": "db-002",
            "name": "Pradeep Singh",
            "phone": "9876543211",
            "email": "pradeep@earlybird.com",
            "area_assigned": "Bangalore - Indiranagar",
            "shift": "morning",
            "is_active": True,
            "created_at": date.today().isoformat()
        },
        {
            "id": "db-003",
            "name": "Anand Verma",
            "phone": "9876543212",
            "email": "anand@earlybird.com",
            "area_assigned": "Bangalore - Koramangala",
            "shift": "evening",
            "is_active": True,
            "created_at": date.today().isoformat()
        },
        {
            "id": "db-004",
            "name": "Vikram Reddy",
            "phone": "9876543213",
            "email": "vikram@earlybird.com",
            "area_assigned": "Bangalore - Whitefield",
            "shift": "morning",
            "is_active": True,
            "created_at": date.today().isoformat()
        },
        {
            "id": "db-005",
            "name": "Sanjay Patel",
            "phone": "9876543214",
            "email": "sanjay@earlybird.com",
            "area_assigned": "Bangalore - Marathahalli",
            "shift": "evening",
            "is_active": True,
            "created_at": date.today().isoformat()
        }
    ]
    
    for boy in delivery_boys:
        await db.delivery_boys_v2.update_one(
            {"id": boy["id"]},
            {"$set": boy},
            upsert=True
        )
    print(f"[OK] {len(delivery_boys)} delivery boys created/updated")
    
    # Create sample customers with subscriptions
    products = await db.products.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(10)
    if not products:
        print("[WARN] No products found. Please run seed_data.py first.")
        return
    
    sample_customers = [
        {
            "id": "cust-001",
            "name": "Rajesh Kumar",
            "phone": "9876543220",
            "email": "rajesh@example.com",
            "address": "123 MG Road, Bangalore",
            "area": "Bangalore - MG Road",
            "delivery_boy_id": "db-001",
            "delivery_boy_name": "Raj Kumar",
            "status": "active",
            "is_active": True
        },
        {
            "id": "cust-002",
            "name": "Priya Sharma",
            "phone": "9876543221",
            "email": "priya@example.com",
            "address": "456 Indiranagar, Bangalore",
            "area": "Bangalore - Indiranagar",
            "delivery_boy_id": "db-002",
            "delivery_boy_name": "Pradeep Singh",
            "status": "active",
            "is_active": True
        },
        {
            "id": "cust-003",
            "name": "Amit Patel",
            "phone": "9876543222",
            "email": "amit@example.com",
            "address": "789 Koramangala, Bangalore",
            "area": "Bangalore - Koramangala",
            "delivery_boy_id": "db-003",
            "delivery_boy_name": "Anand Verma",
            "status": "active",
            "is_active": True
        },
        {
            "id": "cust-004",
            "name": "Sarah Johnson",
            "phone": "9876543223",
            "email": "sarah@example.com",
            "address": "321 Whitefield, Bangalore",
            "area": "Bangalore - Whitefield",
            "delivery_boy_id": "db-004",
            "delivery_boy_name": "Vikram Reddy",
            "status": "active",
            "is_active": True
        },
        {
            "id": "cust-005",
            "name": "Arun Khanna",
            "phone": "9876543224",
            "email": "arun@example.com",
            "address": "654 Marathahalli, Bangalore",
            "area": "Bangalore - Marathahalli",
            "delivery_boy_id": "db-005",
            "delivery_boy_name": "Sanjay Patel",
            "status": "active",
            "is_active": True
        }
    ]
    
    for customer in sample_customers:
        await db.customers_v2.update_one(
            {"id": customer["id"]},
            {"$set": customer},
            upsert=True
        )
    print(f"[OK] {len(sample_customers)} customers created/updated")
    
    # Create subscriptions
    subscriptions = []
    for i, customer in enumerate(sample_customers):
        product = products[i % len(products)]
        subscription = {
            "id": f"sub-{i+1:03d}",
            "customerId": customer["id"],
            "customer_id": customer["id"],
            "productId": product["id"],
            "product_id": product["id"],
            "quantity": 1.0 + (i % 3) * 0.5,  # 1.0, 1.5, 2.0, etc
            "shift": "morning" if i % 2 == 0 else "evening",
            "status": "active",
            "price_per_unit": 60.0,
            "created_at": date.today().isoformat()
        }
        subscriptions.append(subscription)
    
    for sub in subscriptions:
        await db.subscriptions_v2.update_one(
            {"id": sub["id"]},
            {"$set": sub},
            upsert=True
        )
    print(f"[OK] {len(subscriptions)} subscriptions created/updated")
    
    print("\n✅ Phase 0 V2 data seeded successfully!")

async def main():
    await seed_phase0_v2_data()

if __name__ == "__main__":
    asyncio.run(main())

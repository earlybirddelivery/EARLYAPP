"""
Seed data script for EarlyBird Phase-0
Creates sample users, customers, subscriptions, and delivery boys
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import date, timedelta
import uuid
from auth import hash_password
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "earlybird_delivery")

async def seed_data():
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("🌱 Seeding Phase-0 data...")
    
    # Clear existing data
    await db.users.delete_many({})
    await db.customers.delete_many({})
    await db.subscriptions.delete_many({})
    await db.delivery_boys.delete_many({})
    await db.delivery_records.delete_many({})
    
    print("✓ Cleared existing data")
    
    # Create users (Admin and Marketing Staff)
    users = [
        {
            "id": str(uuid.uuid4()),
            "email": "admin@earlybird.com",
            "name": "Admin User",
            "role": "admin",
            "password": hash_password("admin123"),
            "is_active": True
        },
        {
            "id": str(uuid.uuid4()),
            "email": "marketing@earlybird.com",
            "name": "Marketing Staff",
            "role": "marketing_staff",
            "password": hash_password("marketing123"),
            "is_active": True
        }
    ]
    
    await db.users.insert_many(users)
    print(f"✓ Created {len(users)} users")
    
    # Create delivery boys
    delivery_boys = [
        {
            "id": str(uuid.uuid4()),
            "name": "Rajesh Kumar",
            "area_assigned": "Koramangala"
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Suresh Patel",
            "area_assigned": "Indiranagar"
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Amit Singh",
            "area_assigned": "Whitefield"
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Vijay Reddy",
            "area_assigned": "HSR Layout"
        }
    ]
    
    await db.delivery_boys.insert_many(delivery_boys)
    print(f"✓ Created {len(delivery_boys)} delivery boys")
    
    # Create customers
    customers = [
        {
            "id": str(uuid.uuid4()),
            "name": "Priya Sharma",
            "phone": "9876543210",
            "address": "123, 5th Cross, Koramangala 4th Block, Bangalore",
            "area": "Koramangala",
            "map_link": "https://goo.gl/maps/example1",
            "notes": "Gate code: 1234. Ring twice."
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Arjun Mehta",
            "phone": "9876543211",
            "address": "45, 12th Main Road, Indiranagar, Bangalore",
            "area": "Indiranagar",
            "map_link": "https://goo.gl/maps/example2",
            "notes": "Leave at door if not home"
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Lakshmi Iyer",
            "phone": "9876543212",
            "address": "78, Whitefield Main Road, Bangalore",
            "area": "Whitefield",
            "map_link": "https://goo.gl/maps/example3",
            "notes": "Call before delivery"
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Ramesh Gupta",
            "phone": "9876543213",
            "address": "56, 27th Main, HSR Layout Sector 1, Bangalore",
            "area": "HSR Layout",
            "map_link": None,
            "notes": None
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Deepa Nair",
            "phone": "9876543214",
            "address": "90, 8th Cross, Koramangala 6th Block, Bangalore",
            "area": "Koramangala",
            "map_link": "https://goo.gl/maps/example5",
            "notes": "Elderly customer, please be patient"
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Vikram Rao",
            "phone": "9876543215",
            "address": "34, 100 Feet Road, Indiranagar, Bangalore",
            "area": "Indiranagar",
            "map_link": None,
            "notes": "Prefers morning delivery before 7 AM"
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Anita Desai",
            "phone": "9876543216",
            "address": "12, ITPL Main Road, Whitefield, Bangalore",
            "area": "Whitefield",
            "map_link": "https://goo.gl/maps/example7",
            "notes": None
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Sanjay Kulkarni",
            "phone": "9876543217",
            "address": "67, 14th Main, HSR Layout Sector 2, Bangalore",
            "area": "HSR Layout",
            "map_link": "https://goo.gl/maps/example8",
            "notes": "Has a dog, please ring bell"
        }
    ]
    
    await db.customers.insert_many(customers)
    print(f"✓ Created {len(customers)} customers")
    
    # Create subscriptions for customers
    today = date.today()
    tomorrow = today + timedelta(days=1)
    day_after = today + timedelta(days=2)
    
    subscriptions = [
        {
            "id": str(uuid.uuid4()),
            "customer_id": customers[0]["id"],
            "default_quantity": 2.0,
            "day_overrides": [
                {"date": tomorrow.isoformat(), "quantity": 3.0}  # Extra milk tomorrow
            ],
            "pause_dates": [],
            "status": "active"
        },
        {
            "id": str(uuid.uuid4()),
            "customer_id": customers[1]["id"],
            "default_quantity": 1.5,
            "day_overrides": [],
            "pause_dates": [tomorrow.isoformat()],  # Paused tomorrow
            "status": "active"
        },
        {
            "id": str(uuid.uuid4()),
            "customer_id": customers[2]["id"],
            "default_quantity": 1.0,
            "day_overrides": [],
            "pause_dates": [],
            "status": "active"
        },
        {
            "id": str(uuid.uuid4()),
            "customer_id": customers[3]["id"],
            "default_quantity": 2.5,
            "day_overrides": [],
            "pause_dates": [],
            "status": "active"
        },
        {
            "id": str(uuid.uuid4()),
            "customer_id": customers[4]["id"],
            "default_quantity": 1.5,
            "day_overrides": [],
            "pause_dates": [],
            "status": "active"
        },
        {
            "id": str(uuid.uuid4()),
            "customer_id": customers[5]["id"],
            "default_quantity": 2.0,
            "day_overrides": [
                {"date": day_after.isoformat(), "quantity": 1.0}  # Less milk day after
            ],
            "pause_dates": [],
            "status": "active"
        },
        {
            "id": str(uuid.uuid4()),
            "customer_id": customers[6]["id"],
            "default_quantity": 1.0,
            "day_overrides": [],
            "pause_dates": [],
            "status": "paused"  # Subscription paused
        },
        {
            "id": str(uuid.uuid4()),
            "customer_id": customers[7]["id"],
            "default_quantity": 3.0,
            "day_overrides": [],
            "pause_dates": [],
            "status": "active"
        }
    ]
    
    await db.subscriptions.insert_many(subscriptions)
    print(f"✓ Created {len(subscriptions)} subscriptions")
    
    # Create some delivery records for billing (past 7 days)
    delivery_records = []
    for i in range(7):
        delivery_date = (today - timedelta(days=i)).isoformat()
        
        # Add records for active customers
        for idx, customer in enumerate(customers[:6]):  # First 6 customers
            subscription = subscriptions[idx]
            if subscription["status"] == "active" and delivery_date not in subscription.get("pause_dates", []):
                delivery_records.append({
                    "id": str(uuid.uuid4()),
                    "customer_id": customer["id"],
                    "delivery_date": delivery_date,
                    "quantity": subscription["default_quantity"],
                    "delivery_boy_id": delivery_boys[idx % len(delivery_boys)]["id"],
                    "notes": None
                })
    
    if delivery_records:
        await db.delivery_records.insert_many(delivery_records)
        print(f"✓ Created {len(delivery_records)} delivery records")
    
    print("\n✅ Phase-0 seed data created successfully!")
    print("\n📝 Login credentials:")
    print("   Admin: admin@earlybird.com / admin123")
    print("   Marketing: marketing@earlybird.com / marketing123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_data())

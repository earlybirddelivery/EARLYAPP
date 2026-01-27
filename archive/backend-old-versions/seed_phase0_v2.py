"""
Seed data script for EarlyBird Phase-0 Updated
Creates products, customers (trial/active), subscriptions with various modes, and delivery boys
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
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("🌱 Seeding Phase-0 V2 data...")
    
    # Clear existing v2 data
    await db.customers_v2.delete_many({})
    await db.subscriptions_v2.delete_many({})
    await db.delivery_boys_v2.delete_many({})
    await db.products.delete_many({})
    
    print("✓ Cleared existing v2 data")
    
    # Create products
    products = [
        {
            "id": str(uuid.uuid4()),
            "name": "Full Cream Milk",
            "unit": "Liter",
            "default_price": 60.0
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Toned Milk",
            "unit": "Liter",
            "default_price": 55.0
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Curd",
            "unit": "500g",
            "default_price": 30.0
        }
    ]
    
    await db.products.insert_many(products)
    print(f"✓ Created {len(products)} products")
    
    milk_product = products[0]
    toned_product = products[1]
    curd_product = products[2]
    
    # Create delivery boys
    delivery_boys = [
        {"id": str(uuid.uuid4()), "name": "Rajesh Kumar", "area_assigned": "Koramangala"},
        {"id": str(uuid.uuid4()), "name": "Suresh Patel", "area_assigned": "Indiranagar"},
        {"id": str(uuid.uuid4()), "name": "Amit Singh", "area_assigned": "Whitefield"},
        {"id": str(uuid.uuid4()), "name": "Vijay Reddy", "area_assigned": "HSR Layout"}
    ]
    
    await db.delivery_boys_v2.insert_many(delivery_boys)
    print(f"✓ Created {len(delivery_boys)} delivery boys")
    
    # Get marketing user ID
    marketing_user = await db.users.find_one({"role": "marketing_staff"}, {"_id": 0})
    marketing_id = marketing_user["id"] if marketing_user else None
    marketing_name = marketing_user["name"] if marketing_user else "Marketing Staff"
    
    # Create customers with GPS locations
    today = date.today()
    tomorrow = today + timedelta(days=1)
    next_week = today + timedelta(days=7)
    
    customers = [
        # Trial customers
        {
            "id": str(uuid.uuid4()),
            "name": "Priya Sharma (Trial)",
            "phone": "9876543210",
            "address": "123, 5th Cross, Koramangala 4th Block, Bangalore",
            "area": "Koramangala",
            "map_link": "https://goo.gl/maps/example1",
            "location": {"lat": 12.9352, "lng": 77.6245, "accuracy_meters": 15.0},
            "status": "trial",
            "notes": "Gate code: 1234",
            "marketing_boy": marketing_name,
            "marketing_boy_id": marketing_id,
            "delivery_boy_id": delivery_boys[0]["id"]  # Rajesh Kumar - Koramangala
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Arjun Mehta (Trial)",
            "phone": "9876543211",
            "address": "45, 12th Main Road, Indiranagar, Bangalore",
            "area": "Indiranagar",
            "map_link": "https://goo.gl/maps/example2",
            "location": {"lat": 12.9716, "lng": 77.6412, "accuracy_meters": 20.0},
            "status": "trial",
            "notes": "New customer",
            "marketing_boy": marketing_name,
            "marketing_boy_id": marketing_id,
            "delivery_boy_id": delivery_boys[1]["id"]  # Suresh Patel - Indiranagar
        },
        # Active customers
        {
            "id": str(uuid.uuid4()),
            "name": "Lakshmi Iyer",
            "phone": "9876543212",
            "address": "78, Whitefield Main Road, Bangalore",
            "area": "Whitefield",
            "map_link": "https://goo.gl/maps/example3",
            "location": {"lat": 12.9698, "lng": 77.7499, "accuracy_meters": 10.0},
            "status": "active",
            "notes": "Call before delivery",
            "marketing_boy": marketing_name,
            "marketing_boy_id": marketing_id,
            "delivery_boy_id": delivery_boys[2]["id"]  # Amit Singh - Whitefield
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Ramesh Gupta",
            "phone": "9876543213",
            "address": "56, 27th Main, HSR Layout Sector 1, Bangalore",
            "area": "HSR Layout",
            "map_link": None,
            "location": {"lat": 12.9121, "lng": 77.6446, "accuracy_meters": 25.0},
            "status": "active",
            "notes": None,
            "marketing_boy": marketing_name,
            "marketing_boy_id": marketing_id,
            "delivery_boy_id": delivery_boys[3]["id"]  # Vijay Reddy - HSR Layout
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Deepa Nair",
            "phone": "9876543214",
            "address": "90, 8th Cross, Koramangala 6th Block, Bangalore",
            "area": "Koramangala",
            "map_link": "https://goo.gl/maps/example5",
            "location": {"lat": 12.9279, "lng": 77.6271, "accuracy_meters": 12.0},
            "status": "active",
            "notes": "Elderly customer, please be patient",
            "marketing_boy": marketing_name,
            "marketing_boy_id": marketing_id,
            "delivery_boy_id": delivery_boys[0]["id"]  # Rajesh Kumar - Koramangala
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Vikram Rao",
            "phone": "9876543215",
            "address": "34, 100 Feet Road, Indiranagar, Bangalore",
            "area": "Indiranagar",
            "map_link": None,
            "location": None,
            "status": "active",
            "notes": "Prefers morning delivery before 7 AM",
            "marketing_boy": marketing_name,
            "marketing_boy_id": marketing_id,
            "delivery_boy_id": delivery_boys[1]["id"]  # Suresh Patel - Indiranagar
        }
    ]
    
    await db.customers_v2.insert_many(customers)
    print(f"✓ Created {len(customers)} customers (2 trial, 4 active)")
    
    # Create subscriptions with different modes
    subscriptions = [
        # Fixed daily - Trial customer
        {
            "id": str(uuid.uuid4()),
            "customer_id": customers[0]["id"],
            "product_id": milk_product["id"],
            "price_per_unit": 60.0,
            "mode": "fixed_daily",
            "default_qty": 2.0,
            "weekly_pattern": None,
            "day_overrides": [
                {"date": tomorrow.isoformat(), "quantity": 3.0}
            ],
            "irregular_list": [],
            "pause_intervals": [],
            "stop_date": None,
            "status": "active",
            "auto_start": True
        },
        # Weekly pattern - Trial customer
        {
            "id": str(uuid.uuid4()),
            "customer_id": customers[1]["id"],
            "product_id": toned_product["id"],
            "price_per_unit": 55.0,
            "mode": "weekly_pattern",
            "default_qty": 1.5,
            "weekly_pattern": [0, 2, 4],  # Mon, Wed, Fri
            "day_overrides": [],
            "irregular_list": [],
            "pause_intervals": [],
            "stop_date": None,
        "status": "active",
        "auto_start": True
        },
        # Fixed daily with pause - Active
        {
            "id": str(uuid.uuid4()),
            "customer_id": customers[2]["id"],
            "product_id": milk_product["id"],
            "price_per_unit": 60.0,
            "mode": "fixed_daily",
            "default_qty": 1.0,
            "weekly_pattern": None,
            "day_overrides": [],
            "irregular_list": [],
            "pause_intervals": [
                {"start": next_week.isoformat(), "end": (next_week + timedelta(days=3)).isoformat()}
            ],
            "stop_date": None,
        "status": "active",
        "auto_start": True
        },
        # Day by day with overrides - Active
        {
            "id": str(uuid.uuid4()),
            "customer_id": customers[3]["id"],
            "product_id": milk_product["id"],
            "price_per_unit": 60.0,
            "mode": "day_by_day",
            "default_qty": 2.5,
            "weekly_pattern": None,
            "day_overrides": [
                {"date": (today + timedelta(days=2)).isoformat(), "quantity": 1.0},
                {"date": (today + timedelta(days=5)).isoformat(), "quantity": 3.0}
            ],
            "irregular_list": [],
            "pause_intervals": [],
            "stop_date": None,
        "status": "active",
        "auto_start": True
        },
        # Irregular - Active
        {
            "id": str(uuid.uuid4()),
            "customer_id": customers[4]["id"],
            "product_id": curd_product["id"],
            "price_per_unit": 30.0,
            "mode": "irregular",
            "default_qty": 0,
            "weekly_pattern": None,
            "day_overrides": [],
            "irregular_list": [
                {"date": today.isoformat(), "quantity": 2.0, "note": "Sunday special"},
                {"date": (today + timedelta(days=3)).isoformat(), "quantity": 1.0, "note": None},
                {"date": (today + timedelta(days=7)).isoformat(), "quantity": 2.0, "note": None}
            ],
            "pause_intervals": [],
            "stop_date": None,
        "status": "active",
        "auto_start": True
        },
        # Multiple products for one customer
        {
            "id": str(uuid.uuid4()),
            "customer_id": customers[4]["id"],
            "product_id": milk_product["id"],
            "price_per_unit": 60.0,
            "mode": "fixed_daily",
            "default_qty": 1.5,
            "weekly_pattern": None,
            "day_overrides": [],
            "irregular_list": [],
            "pause_intervals": [],
            "stop_date": None,
        "status": "active",
        "auto_start": True
        },
        # Weekly pattern - Active
        {
            "id": str(uuid.uuid4()),
            "customer_id": customers[5]["id"],
            "product_id": milk_product["id"],
            "price_per_unit": 60.0,
            "mode": "weekly_pattern",
            "default_qty": 2.0,
            "weekly_pattern": [0, 1, 2, 3, 4],  # Mon-Fri
            "day_overrides": [],
            "irregular_list": [],
            "pause_intervals": [],
            "stop_date": None,
        "status": "active",
        "auto_start": True
        }
    ]
    
    await db.subscriptions_v2.insert_many(subscriptions)
    print(f"✓ Created {len(subscriptions)} subscriptions with various modes")
    
    print("\n✅ Phase-0 V2 seed data created successfully!")
    print("\n📝 Login credentials:")
    print("   Admin: admin@earlybird.com / admin123")
    print("   Marketing: marketing@earlybird.com / marketing123")
    print("\n📊 Data summary:")
    print(f"   Products: {len(products)}")
    print(f"   Customers: {len(customers)} (2 trial, 4 active)")
    print(f"   Subscriptions: {len(subscriptions)}")
    print(f"   Delivery Boys: {len(delivery_boys)}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_data())

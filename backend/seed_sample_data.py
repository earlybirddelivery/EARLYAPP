"""
⚠️  DEV ONLY - Do not run in production!
This script creates sample customer and subscription test data.
Running in production will pollute database with test records.

USAGE: python seed_sample_data.py
"""

import asyncio
import uuid
from datetime import date, timedelta
from database import db

async def seed_sample_data():
    """Seed sample customer and subscription data"""

    print("Seeding sample customers and subscriptions...")

    # Get existing products
    products = await db.products.find({}).to_list(length=10)
    if not products:
        print("No products found. Please run seed_data.py first.")
        return

    # Create sample customers
    sample_customers = [
        {
            "id": str(uuid.uuid4()),
            "name": "Rajesh Kumar",
            "phone": "9876543210",
            "email": "rajesh@example.com",
            "address": "123 MG Road, Bangalore",
            "area": "MG Road",
            "delivery_instructions": "Ring doorbell",
            "is_active": True,
            "created_at": date.today().isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Priya Sharma",
            "phone": "9876543211",
            "email": "priya@example.com",
            "address": "456 Indiranagar, Bangalore",
            "area": "Indiranagar",
            "delivery_instructions": "Leave at gate",
            "is_active": True,
            "created_at": date.today().isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Amit Patel",
            "phone": "9876543212",
            "email": "amit@example.com",
            "address": "789 Koramangala, Bangalore",
            "area": "Koramangala",
            "delivery_instructions": "Call before delivery",
            "is_active": True,
            "created_at": date.today().isoformat()
        }
    ]

    for customer in sample_customers:
        await db.customers.update_one(
            {"phone": customer["phone"]},
            {"$set": customer},
            upsert=True
        )
    print(f"[OK] Created {len(sample_customers)} customers")

    # Create sample subscriptions
    milk_product = products[0]  # Fresh Milk

    for customer in sample_customers:
        subscription = {
            "id": str(uuid.uuid4()),
            "customer_id": customer["id"],
            "product_id": milk_product["id"],
            "quantity": 1,
            "frequency": "daily",
            "start_date": date.today().isoformat(),
            "status": "active",
            "delivery_days": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
            "shift": "morning",
            "created_at": date.today().isoformat()
        }
        await db.subscriptions.update_one(
            {"customer_id": customer["id"], "product_id": milk_product["id"]},
            {"$set": subscription},
            upsert=True
        )
    print(f"[OK] Created {len(sample_customers)} subscriptions")

    print("\n=== Sample Data Seeded ===")
    print(f"Customers: {len(sample_customers)}")
    print(f"Subscriptions: {len(sample_customers)}")

if __name__ == "__main__":
    asyncio.run(seed_sample_data())

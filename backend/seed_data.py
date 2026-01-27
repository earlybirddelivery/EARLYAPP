"""
⚠️  DEV ONLY - Do not run in production!
This script resets user authentication data.
Running in production will erase all user passwords and role assignments.

USAGE: python seed_data.py
"""

import asyncio
import uuid
from datetime import date
from database import db
from auth import hash_password

async def seed_database():
    """Seed initial data for testing"""
    
    print("Seeding database...")
    
    # Create admin user
    admin = {
        "id": str(uuid.uuid4()),
        "email": "admin@earlybird.com",
        "phone": "9999999999",
        "name": "Admin User",
        "role": "admin",
        "password": hash_password("admin123"),
        "is_active": True,
        "created_at": date.today().isoformat()
    }
    await db.users.update_one({"email": admin["email"]}, {"$set": admin}, upsert=True)
    print("[OK] Admin user created (admin@earlybird.com / admin123)")
    
    # Create delivery boy
    delivery_boy = {
        "id": str(uuid.uuid4()),
        "email": "delivery@earlybird.com",
        "phone": "9999999998",
        "name": "Delivery Boy",
        "role": "delivery_boy",
        "password": hash_password("delivery123"),
        "is_active": True,
        "created_at": date.today().isoformat()
    }
    await db.users.update_one({"email": delivery_boy["email"]}, {"$set": delivery_boy}, upsert=True)
    print("[OK] Delivery boy created (delivery@earlybird.com / delivery123)")
    
    # Create marketing staff
    marketing = {
        "id": str(uuid.uuid4()),
        "email": "marketing@earlybird.com",
        "phone": "9999999997",
        "name": "Marketing Staff",
        "role": "marketing_staff",
        "password": hash_password("marketing123"),
        "is_active": True,
        "created_at": date.today().isoformat()
    }
    await db.users.update_one({"email": marketing["email"]}, {"$set": marketing}, upsert=True)
    print("[OK] Marketing staff created (marketing@earlybird.com / marketing123)")
    
    # Create sample products
    products = [
        {
            "id": str(uuid.uuid4()),
            "name": "Fresh Milk",
            "category": "dairy",
            "unit": "liter",
            "price": 60.0,
            "default_price": 60.0,
            "description": "Fresh cow milk delivered daily",
            "image_url": "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400"
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Buffalo Milk",
            "category": "dairy",
            "unit": "liter",
            "price": 80.0,
            "default_price": 80.0,
            "description": "Premium buffalo milk",
            "image_url": "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400"
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Bread",
            "category": "bakery",
            "unit": "packet",
            "price": 40.0,
            "default_price": 40.0,
            "description": "Fresh bread",
            "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400"
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Eggs",
            "category": "protein",
            "unit": "dozen",
            "price": 70.0,
            "default_price": 70.0,
            "description": "Farm fresh eggs",
            "image_url": "https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?w=400"
        }
    ]
    
    for product in products:
        await db.products.update_one({"name": product["name"]}, {"$set": product}, upsert=True)
    print(f"[OK] {len(products)} products created")
    
    # Create sample supplier
    supplier = {
        "id": str(uuid.uuid4()),
        "name": "Local Dairy Farm",
        "email": "supplier@farm.com",
        "phone": "9999999996",
        "address": "Farm Road, Village, District",
        "products_supplied": [p["id"] for p in products[:2]],  # Milk products
        "payment_terms": "Weekly payment",
        "is_active": True
    }
    await db.suppliers.update_one({"email": supplier["email"]}, {"$set": supplier}, upsert=True)
    print("[OK] Supplier created")
    
    print("\n=== Seeding Complete ===")
    print("\nTest Accounts:")
    print("Admin: admin@earlybird.com / admin123")
    print("Delivery: delivery@earlybird.com / delivery123")
    print("Marketing: marketing@earlybird.com / marketing123")
    print("\nCustomers can register via OTP (use 123456)")

if __name__ == "__main__":
    asyncio.run(seed_database())

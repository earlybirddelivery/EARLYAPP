#!/usr/bin/env python3
"""
Generate comprehensive seed data for EarlyBird Delivery Services
- 10 customers with addresses
- 5 delivery boys
- 2 suppliers
- 4 products
- Sample subscriptions
"""

import asyncio
import uuid
from datetime import date, timedelta
import sys
sys.path.append('/app/backend')

from database import db
from auth import hash_password

async def generate_seed_data():
    print("Generating seed data for EarlyBird Delivery Services...\n")
    
    # Clear existing data
    await db.users.delete_many({"email": {"$regex": "test|customer|delivery|supplier|marketing|admin"}})
    await db.addresses.delete_many({})
    await db.subscriptions.delete_many({})
    await db.products.delete_many({})
    await db.suppliers.delete_many({})
    
    # 1. Create admin user
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
    await db.users.insert_one(admin)
    print("✓ Admin user created")
    
    # 2. Create 5 delivery boys
    delivery_boys = []
    for i in range(1, 6):
        boy = {
            "id": str(uuid.uuid4()),
            "email": f"delivery{i}@earlybird.com",
            "phone": f"999999999{i}",
            "name": f"Delivery Boy {i}",
            "role": "delivery_boy",
            "password": hash_password("delivery123"),
            "is_active": True,
            "created_at": date.today().isoformat()
        }
        delivery_boys.append(boy)
        await db.users.insert_one(boy)
    print(f"✓ {len(delivery_boys)} delivery boys created")
    
    # 3. Create marketing staff
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
    await db.users.insert_one(marketing)
    print("✓ Marketing staff created")
    
    # 4. Create products
    products = [
        {
            "id": str(uuid.uuid4()),
            "name": "Fresh Milk",
            "category": "dairy",
            "unit": "liter",
            "price": 60.0,
            "description": "Fresh cow milk delivered daily",
            "image_url": "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400"
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Buffalo Milk",
            "category": "dairy",
            "unit": "liter",
            "price": 80.0,
            "description": "Premium buffalo milk",
            "image_url": "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400"
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Bread",
            "category": "bakery",
            "unit": "packet",
            "price": 40.0,
            "description": "Fresh bread",
            "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400"
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Eggs",
            "category": "protein",
            "unit": "dozen",
            "price": 70.0,
            "description": "Farm fresh eggs",
            "image_url": "https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?w=400"
        }
    ]
    for product in products:
        await db.products.insert_one(product)
    print(f"✓ {len(products)} products created")
    
    # 5. Create 2 suppliers
    suppliers = [
        {
            "id": str(uuid.uuid4()),
            "name": "Local Dairy Farm",
            "email": "supplier1@farm.com",
            "phone": "9999999996",
            "address": "Farm Road, Village, District",
            "products_supplied": [products[0]["id"], products[1]["id"]],
            "payment_terms": "Weekly payment",
            "is_active": True
        },
        {
            "id": str(uuid.uuid4()),
            "name": "City Bakery",
            "email": "supplier2@bakery.com",
            "phone": "9999999995",
            "address": "Main Street, City",
            "products_supplied": [products[2]["id"]],
            "payment_terms": "Daily payment",
            "is_active": True
        }
    ]
    for supplier in suppliers:
        await db.suppliers.insert_one(supplier)
    print(f"✓ {len(suppliers)} suppliers created")
    
    # 6. Create 10 customers with addresses
    mumbai_areas = [
        {"area": "Andheri", "lat": 19.1136, "lng": 72.8697},
        {"area": "Bandra", "lat": 19.0596, "lng": 72.8295},
        {"area": "Powai", "lat": 19.1176, "lng": 72.9060},
        {"area": "Goregaon", "lat": 19.1663, "lng": 72.8526},
        {"area": "Malad", "lat": 19.1876, "lng": 72.8485},
        {"area": "Borivali", "lat": 19.2304, "lng": 72.8573},
        {"area": "Kandivali", "lat": 19.2074, "lng": 72.8507},
        {"area": "Dahisar", "lat": 19.2559, "lng": 72.8636},
        {"area": "Thane", "lat": 19.2183, "lng": 72.9781},
        {"area": "Mulund", "lat": 19.1720, "lng": 72.9565}
    ]
    
    for i in range(1, 11):
        customer_id = str(uuid.uuid4())
        area_info = mumbai_areas[i-1]
        
        # Create customer
        customer = {
            "id": customer_id,
            "email": f"customer{i}@earlybird.com",
            "phone": f"98765432{i:02d}",
            "name": f"Customer {i}",
            "role": "customer",
            "password": hash_password("customer123"),
            "is_active": True,
            "created_at": date.today().isoformat()
        }
        await db.users.insert_one(customer)
        
        # Create 2 addresses per customer
        for j in range(1, 3):
            address = {
                "id": str(uuid.uuid4()),
                "user_id": customer_id,
                "label": "Home" if j == 1 else "Work",
                "address_line1": f"Building {i}, Floor {j}",
                "address_line2": f"Street {j}, {area_info['area']}",
                "landmark": f"{area_info['area']} Station",
                "city": "Mumbai",
                "state": "Maharashtra",
                "pincode": f"40000{i}",
                "latitude": area_info['lat'] + (j * 0.001),
                "longitude": area_info['lng'] + (j * 0.001),
                "is_default": j == 1
            }
            await db.addresses.insert_one(address)
            
            # Create subscription for primary address
            if j == 1:
                subscription = {
                    "id": str(uuid.uuid4()),
                    "user_id": customer_id,
                    "product_id": products[0]["id"],  # Fresh Milk
                    "pattern": "daily" if i % 3 == 0 else "custom_days",
                    "quantity": i % 3 + 1,
                    "custom_days": [0, 2, 4] if i % 3 != 0 else None,
                    "start_date": date.today().isoformat(),
                    "end_date": None,
                    "overrides": [],
                    "pauses": [],
                    "is_active": True,
                    "created_at": date.today().isoformat(),
                    "address_id": address["id"]
                }
                await db.subscriptions.insert_one(subscription)
    
    print(f"✓ 10 customers created with 20 addresses and 10 subscriptions")
    
    print("\n=== Seed Data Generation Complete ===")
    print(f"\nTest Accounts:")
    print(f"  Admin: admin@earlybird.com / admin123")
    print(f"  Delivery Boys: delivery1-5@earlybird.com / delivery123")
    print(f"  Marketing: marketing@earlybird.com / marketing123")
    print(f"  Customers: customer1-10@earlybird.com / customer123")
    print(f"  OTP Login: Any phone / OTP: 123456")
    print(f"\nData Summary:")
    print(f"  - 1 admin, 5 delivery boys, 1 marketing staff, 10 customers")
    print(f"  - 4 products, 2 suppliers")
    print(f"  - 20 addresses (2 per customer)")
    print(f"  - 10 active subscriptions")

if __name__ == "__main__":
    asyncio.run(generate_seed_data())

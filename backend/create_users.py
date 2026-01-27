import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from auth import hash_password

load_dotenv()
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "earlybird_delivery")

async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Check existing users
    users = await db.users.find({}).to_list(10)
    print(f"✓ Found {len(users)} users")
    for u in users:
        print(f"  - {u.get('email')}: {u.get('role')}")
    
    # Create admin and marketing users if they don't exist
    admin = await db.users.find_one({"email": "admin@earlybird.com"})
    if not admin:
        admin_user = {
            "id": "admin-001",
            "email": "admin@earlybird.com",
            "password_hash": hash_password("admin123"),
            "role": "admin",
            "name": "Admin User",
            "is_active": True
        }
        await db.users.insert_one(admin_user)
        print("\n✅ Created admin user: admin@earlybird.com / admin123")
    else:
        print("\n✓ Admin user already exists")
    
    marketing = await db.users.find_one({"email": "marketing@earlybird.com"})
    if not marketing:
        marketing_user = {
            "id": "marketing-001",
            "email": "marketing@earlybird.com",
            "password_hash": hash_password("marketing123"),
            "role": "marketing_staff",
            "name": "Marketing Staff",
            "is_active": True
        }
        await db.users.insert_one(marketing_user)
        print("✅ Created marketing user: marketing@earlybird.com / marketing123")
    else:
        print("✓ Marketing user already exists")
    
    # Verify
    users = await db.users.find({}).to_list(10)
    print(f"\n📊 Total users now: {len(users)}")
    for u in users:
        print(f"  - {u.get('email')}: {u.get('role')}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(main())

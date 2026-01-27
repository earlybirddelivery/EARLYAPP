import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from auth import hash_password
import uuid

load_dotenv()
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "earlybird_delivery")

async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Clear and recreate users with new password hashing
    await db.users.delete_many({})
    
    users = [
        {
            "id": str(uuid.uuid4()),
            "email": "admin@earlybird.com",
            "password_hash": hash_password("admin123"),
            "role": "admin",
            "name": "Admin User",
            "is_active": True
        },
        {
            "id": str(uuid.uuid4()),
            "email": "marketing@earlybird.com",
            "password_hash": hash_password("marketing123"),
            "role": "marketing_staff",
            "name": "Marketing Staff",
            "is_active": True
        },
        {
            "id": str(uuid.uuid4()),
            "email": "delivery@earlybird.com",
            "password_hash": hash_password("delivery123"),
            "role": "delivery_boy",
            "name": "Delivery Boy",
            "is_active": True
        }
    ]
    
    await db.users.insert_many(users)
    print("✅ Created fresh users with SHA256 password hashing:")
    for u in users:
        print(f"  ✓ {u['email']}: {u['role']}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(main())

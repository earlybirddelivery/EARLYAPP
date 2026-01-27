import asyncio
from datetime import datetime, timedelta
from database import db

async def create_test_shared_link():
    """Create a test shared delivery link"""
    
    print("Creating test shared delivery link...")
    
    # Create a shared link
    link_data = {
        "link_id": "yu9MJDNp1Yh0DLvit3vG0w",
        "name": "Test Shared Delivery Link",
        "delivery_boy_id": "db-001",
        "delivery_boy_name": "Raj Kumar",
        "area": "Bangalore - MG Road",
        "shift": "morning",
        "date": "2026-01-26",
        "auto_renew_daily": True,
        "require_login": False,
        "added_products": [],
        "created_by": "admin-001",
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": (datetime.utcnow() + timedelta(days=30)).isoformat(),
        "access_count": 0,
        "last_accessed": None
    }
    
    result = await db.shared_delivery_links.insert_one(link_data)
    print(f"✅ Shared delivery link created with ID: yu9MJDNp1Yh0DLvit3vG0w")
    print(f"   Name: Test Shared Delivery Link")
    print(f"   Delivery Boy: Raj Kumar")
    print(f"   Area: Bangalore - MG Road")
    print(f"   Date: 2026-01-26")
    print(f"   Expires: 30 days from now")
    print(f"\n   Access URL: http://localhost:3000/shared-delivery/yu9MJDNp1Yh0DLvit3vG0w")

async def main():
    await create_test_shared_link()

if __name__ == "__main__":
    asyncio.run(main())

#!/usr/bin/env python3
"""Test the missing endpoints"""
import asyncio
import aiohttp
from datetime import date as date_type

async def test_endpoints():
    base_url = "http://localhost:1001/api"
    
    # Test login first
    async with aiohttp.ClientSession() as session:
        login_data = {"email": "admin@earlybird.com", "password": "admin123"}
        async with session.post(f"{base_url}/auth/login", json=login_data) as resp:
            result = await resp.json()
            token = result.get("access_token")
            print(f"✅ Login successful - Token: {token[:40]}...\n")
        
        headers = {"Authorization": f"Bearer {token}"}
        date_str = str(date_type.today())
        
        # Test 1: Paused deliveries
        print(f"1. Testing GET /api/phase0-v2/delivery/paused?date={date_str}")
        async with session.get(f"{base_url}/phase0-v2/delivery/paused?date={date_str}", headers=headers) as resp:
            print(f"   Status: {resp.status}")
            data = await resp.json()
            print(f"   Response: {data}\n")
        
        # Test 2: Stopped deliveries
        print(f"2. Testing GET /api/phase0-v2/delivery/stopped")
        async with session.get(f"{base_url}/phase0-v2/delivery/stopped", headers=headers) as resp:
            print(f"   Status: {resp.status}")
            data = await resp.json()
            print(f"   Response: {data}\n")
        
        # Test 3: Added products
        print(f"3. Testing GET /api/phase0-v2/delivery/added-products?date={date_str}")
        async with session.get(f"{base_url}/phase0-v2/delivery/added-products?date={date_str}", headers=headers) as resp:
            print(f"   Status: {resp.status}")
            data = await resp.json()
            print(f"   Response: {data}\n")
        
        # Test 4: Shared links
        print(f"4. Testing GET /api/shared-delivery-links")
        async with session.get(f"{base_url}/shared-delivery-links", headers=headers) as resp:
            print(f"   Status: {resp.status}")
            data = await resp.json()
            print(f"   Response: {data}\n")

if __name__ == "__main__":
    asyncio.run(test_endpoints())

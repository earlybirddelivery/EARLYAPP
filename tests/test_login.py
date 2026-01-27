#!/usr/bin/env python
import asyncio
from database import db

async def test():
    try:
        result = await db.users.find_one({'email': 'admin@earlybird.com'})
        if result:
            print(f'✓ User found: {result.get("name", "Unknown")} - {result.get("role")}')
            print(f'  Has password: {"password" in result or "password_hash" in result}')
            print(f'  Is active: {result.get("is_active", True)}')
        else:
            print('✗ User not found')
    except Exception as e:
        print(f'✗ Error: {e}')

asyncio.run(test())

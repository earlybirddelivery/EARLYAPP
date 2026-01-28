#!/usr/bin/env python
"""
Migration Runner - Executes a specific migration
Usage: python run_migration.py [migration_number]
"""

import asyncio
import sys
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def run_migration(migration_num: int = 4):
    """Run a specific migration"""
    
    # Connect to MongoDB
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    db_name = os.getenv("DB_NAME", "earlybird")
    
    client = AsyncIOMotorClient(mongo_uri)
    db = client[db_name]
    
    try:
        # Import the migration module
        migration_name = f"{migration_num:03d}_whatsapp_notifications"
        migration_module = __import__(f"migrations.{migration_name}", fromlist=["upgrade"])
        
        # Run upgrade
        print(f"\n🔄 Running migration {migration_num}...")
        result = await migration_module.upgrade(db)
        
        if result:
            print(f"✅ Migration {migration_num} completed successfully!")
        else:
            print(f"❌ Migration {migration_num} failed!")
            sys.exit(1)
    
    except ImportError as e:
        print(f"❌ Migration module not found: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error running migration: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    migration_num = int(sys.argv[1]) if len(sys.argv) > 1 else 4
    asyncio.run(run_migration(migration_num))

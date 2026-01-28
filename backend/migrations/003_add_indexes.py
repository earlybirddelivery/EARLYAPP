"""
Migration 003: Add Database Indexes
====================================
Purpose: Create strategic indexes for query performance optimization
Date: January 27, 2026
Status: Ready for deployment

This migration creates 12 Priority 1 indexes that are critical for production performance.
These indexes target the most frequent database queries identified in STEP 30 analysis.

PRIORITY 1 INDEXES (12 total):
==============================

Collection: db.users (3 indexes)
  1. {"id": 1} - User ID lookups (authentication)
  2. {"email": 1} - Email lookups (login, uniqueness)
  3. {"role": 1} - Role-based queries (admin operations)

Collection: db.orders (4 indexes)
  1. {"user_id": 1} - Customer order history
  2. {"status": 1, "delivery_date": -1} - Status + date queries
  3. {"delivery_date": 1} - Date range queries
  4. {"user_id": 1, "status": 1} - Combined queries

Collection: db.subscriptions_v2 (3 indexes)
  1. {"status": 1} - CRITICAL for billing
  2. {"customer_id": 1} - Customer subscriptions
  3. {"id": 1, "status": 1} - ID + status lookups

Collection: db.products (1 index)
  1. {"id": 1} - Product lookups

Collection: db.delivery_statuses (1 index)
  1. {"order_id": 1} - Delivery to order linkage (STEP 20)

Expected Performance Improvement: 25-100x faster queries
Expected Disk Usage: +10-50MB
Rollback: Can be rolled back without data loss
"""

import asyncio
from motor import motor_asyncio
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class Migration003:
    """Database migration: Add strategic indexes"""

    def __init__(self, db):
        """Initialize migration with database connection"""
        self.db = db
        self.indexes_created = []

    async def up(self):
        """Apply migration: Create all indexes"""
        logger.info("Starting Migration 003: Creating indexes...")

        try:
            # COLLECTION: db.users
            await self._create_user_indexes()

            # COLLECTION: db.orders
            await self._create_order_indexes()

            # COLLECTION: db.subscriptions_v2
            await self._create_subscription_indexes()

            # COLLECTION: db.products
            await self._create_product_indexes()

            # COLLECTION: db.delivery_statuses
            await self._create_delivery_status_indexes()

            logger.info(f"✓ Migration 003 completed successfully")
            logger.info(f"  Created {len(self.indexes_created)} indexes")
            return True

        except Exception as e:
            logger.error(f"✗ Migration 003 failed: {e}")
            raise

    async def down(self):
        """Rollback migration: Drop all created indexes"""
        logger.info("Rolling back Migration 003: Dropping indexes...")

        try:
            for index_name, collection_name in self.indexes_created:
                collection = self.db[collection_name]
                await collection.drop_index(index_name)
                logger.info(f"  Dropped index: {collection_name}.{index_name}")

            logger.info("✓ Rollback completed successfully")
            return True

        except Exception as e:
            logger.error(f"✗ Rollback failed: {e}")
            raise

    async def _create_user_indexes(self):
        """Create indexes on db.users collection"""
        logger.info("Creating indexes on db.users...")
        collection = self.db["users"]

        # Index 1: ID lookup (authentication)
        idx_name = await collection.create_index([("id", 1)])
        logger.info(f"  ✓ Created index: {idx_name}")
        self.indexes_created.append((idx_name, "users"))

        # Index 2: Email lookup (unique for login)
        idx_name = await collection.create_index([("email", 1)], unique=True)
        logger.info(f"  ✓ Created index (UNIQUE): {idx_name}")
        self.indexes_created.append((idx_name, "users"))

        # Index 3: Role-based queries (admin operations)
        idx_name = await collection.create_index([("role", 1)])
        logger.info(f"  ✓ Created index: {idx_name}")
        self.indexes_created.append((idx_name, "users"))

    async def _create_order_indexes(self):
        """Create indexes on db.orders collection"""
        logger.info("Creating indexes on db.orders...")
        collection = self.db["orders"]

        # Index 1: User ID (customer order history)
        idx_name = await collection.create_index([("user_id", 1)])
        logger.info(f"  ✓ Created index: {idx_name}")
        self.indexes_created.append((idx_name, "orders"))

        # Index 2: Status + delivery date (compound for filtering & sorting)
        idx_name = await collection.create_index([("status", 1), ("delivery_date", -1)])
        logger.info(f"  ✓ Created compound index: {idx_name}")
        self.indexes_created.append((idx_name, "orders"))

        # Index 3: Delivery date (date range queries)
        idx_name = await collection.create_index([("delivery_date", 1)])
        logger.info(f"  ✓ Created index: {idx_name}")
        self.indexes_created.append((idx_name, "orders"))

        # Index 4: User ID + status (combined queries)
        idx_name = await collection.create_index([("user_id", 1), ("status", 1)])
        logger.info(f"  ✓ Created compound index: {idx_name}")
        self.indexes_created.append((idx_name, "orders"))

    async def _create_subscription_indexes(self):
        """Create indexes on db.subscriptions_v2 collection"""
        logger.info("Creating indexes on db.subscriptions_v2...")
        collection = self.db["subscriptions_v2"]

        # Index 1: Status (CRITICAL for billing generation)
        idx_name = await collection.create_index([("status", 1)])
        logger.info(f"  ✓ Created index (CRITICAL): {idx_name}")
        self.indexes_created.append((idx_name, "subscriptions_v2"))

        # Index 2: Customer ID (customer lookups)
        idx_name = await collection.create_index([("customer_id", 1)])
        logger.info(f"  ✓ Created index: {idx_name}")
        self.indexes_created.append((idx_name, "subscriptions_v2"))

        # Index 3: ID + status (compound for updates)
        idx_name = await collection.create_index([("id", 1), ("status", 1)])
        logger.info(f"  ✓ Created compound index: {idx_name}")
        self.indexes_created.append((idx_name, "subscriptions_v2"))

    async def _create_product_indexes(self):
        """Create indexes on db.products collection"""
        logger.info("Creating indexes on db.products...")
        collection = self.db["products"]

        # Index 1: Product ID (product lookups)
        idx_name = await collection.create_index([("id", 1)])
        logger.info(f"  ✓ Created index: {idx_name}")
        self.indexes_created.append((idx_name, "products"))

    async def _create_delivery_status_indexes(self):
        """Create indexes on db.delivery_statuses collection"""
        logger.info("Creating indexes on db.delivery_statuses...")
        collection = self.db["delivery_statuses"]

        # Index 1: Order ID (STEP 20 linkage)
        idx_name = await collection.create_index([("order_id", 1)])
        logger.info(f"  ✓ Created index (STEP 20 linkage): {idx_name}")
        self.indexes_created.append((idx_name, "delivery_statuses"))


async def run_migration():
    """
    Standalone runner for testing the migration.
    
    Usage:
        python migrations/003_add_indexes.py
    """
    from dotenv import load_dotenv
    import os

    # Load environment
    load_dotenv()

    # Connect to MongoDB
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.getenv("DB_NAME", "earlybird")

    print(f"Connecting to MongoDB: {mongo_url}")
    print(f"Database: {db_name}\n")

    client = motor_asyncio.AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    # Create and run migration
    migration = Migration003(db)

    try:
        print("=" * 60)
        print("MIGRATION 003: ADD DATABASE INDEXES")
        print("=" * 60)
        print()

        await migration.up()

        print()
        print("=" * 60)
        print("MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 60)
        print()

        # Verify indexes
        print("VERIFICATION: Listing all indexes\n")
        collections = [
            "users",
            "orders",
            "subscriptions_v2",
            "products",
            "delivery_statuses",
        ]

        for coll_name in collections:
            collection = db[coll_name]
            indexes = await collection.list_indexes().to_list(None)

            print(f"\n{coll_name}:")
            print("-" * 40)
            for idx in indexes:
                key = idx.get("key", {})
                unique = "UNIQUE" if idx.get("unique", False) else ""
                print(f"  {idx['name']}: {key} {unique}")

        print()
        print("Index creation verified successfully!")

    except Exception as e:
        print(f"ERROR: {e}")
        print("\nAttempting rollback...")
        await migration.down()
        raise

    finally:
        client.close()


if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    # Run migration
    asyncio.run(run_migration())

"""
Database migration framework for EarlyBird Delivery Services

Migrations should be named with a version number and descriptive name:
- 001_add_subscription_id_to_orders.py
- 002_add_order_id_to_delivery_statuses.py
- etc.

Each migration file should contain:
- async def up(db): Apply the migration
- async def down(db): Rollback the migration
"""

import importlib
import os
from pathlib import Path


async def load_and_run_migrations(db, target_version=None):
    """Load and run all migrations in order"""
    migration_dir = Path(__file__).parent
    migration_files = sorted([f for f in os.listdir(migration_dir) if f.startswith(('001_', '002_', '003_', '004_', '005_'))])
    
    for migration_file in migration_files:
        if migration_file.endswith('.py'):
            try:
                # Import the migration
                module_name = migration_file.replace('.py', '')
                spec = importlib.util.spec_from_file_location(module_name, migration_dir / migration_file)
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                
                # Run the migration
                if hasattr(module, 'up'):
                    await module.up(db)
                    print(f"✅ Applied: {migration_file}")
            except Exception as e:
                print(f"❌ Failed: {migration_file}: {e}")
                raise


async def rollback_migrations(db):
    """Rollback all migrations in reverse order"""
    migration_dir = Path(__file__).parent
    migration_files = sorted([f for f in os.listdir(migration_dir) if f.startswith(('001_', '002_', '003_', '004_', '005_'))], reverse=True)
    
    for migration_file in migration_files:
        if migration_file.endswith('.py'):
            try:
                # Import the migration
                module_name = migration_file.replace('.py', '')
                spec = importlib.util.spec_from_file_location(module_name, migration_dir / migration_file)
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                
                # Run the rollback
                if hasattr(module, 'down'):
                    await module.down(db)
                    print(f"✅ Rolled back: {migration_file}")
            except Exception as e:
                print(f"❌ Rollback failed: {migration_file}: {e}")

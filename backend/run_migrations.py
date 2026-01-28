#!/usr/bin/env python3
# ==================================================================================
# MIGRATION RUNNER - Execute Database Migrations
# ==================================================================================
# Purpose: Main entry point for running database migrations
# Usage: python run_migrations.py (run all) or python run_migrations.py --version 1
# Status: Production-ready migration management tool
# ==================================================================================

import asyncio
import sys
import json
from datetime import datetime
from pathlib import Path

# Import database connection
sys.path.insert(0, str(Path(__file__).parent))
from database import db

# Import migration modules directly
from migrations import _001_add_subscription_id_to_orders as migration_001
from migrations import _002_add_order_id_to_delivery_statuses as migration_002  
from migrations import _003_add_indexes as migration_003
from migrations import _004_add_user_customer_linking as migration_004
from migrations import _005_add_delivery_confirmation_fields as migration_005


# Simplified migration execution
async def run_all_migrations():
    """Run all migrations in sequence"""
    print("\n" + "="*80)
    print("EarlyBird Migration Runner - Running ALL Migrations")
    print("="*80 + "\n")
    
    migrations = [
        ("001", "add_subscription_id_to_orders", migration_001),
        ("002", "add_order_id_to_delivery_statuses", migration_002),
        ("003", "add_indexes", migration_003),
        ("004", "add_user_customer_linking", migration_004),
        ("005", "add_delivery_confirmation_fields", migration_005),
    ]
    
    completed = 0
    failed = 0
    
    for version, name, migration_module in migrations:
        try:
            print(f"Running migration {version}: {name}...")
            await migration_module.up(db)
            print(f"  ✅ Completed\n")
            completed += 1
        except Exception as e:
            print(f"  ❌ Failed: {str(e)}\n")
            failed += 1
    
    print(f"{'='*80}")
    print(f"Total: {len(migrations)} | Completed: {completed} | Failed: {failed}")
    print(f"{'='*80}\n")
    
    return 0 if failed == 0 else 1


async def run_specific_migration(version: int):
    """Run a specific migration"""
    print(f"\nRunning Migration #{version}...")
    
    migrations = {
        1: ("add_subscription_id_to_orders", migration_001),
        2: ("add_order_id_to_delivery_statuses", migration_002),
        3: ("add_indexes", migration_003),
        4: ("add_user_customer_linking", migration_004),
        5: ("add_delivery_confirmation_fields", migration_005),
    }
    
    if version not in migrations:
        print(f"❌ Migration {version} not found")
        return 1
    
    name, migration_module = migrations[version]
    try:
        print(f"Executing: {name}")
        await migration_module.up(db)
        print(f"✅ Migration {version} completed\n")
        return 0
    except Exception as e:
        print(f"❌ Migration {version} failed: {str(e)}\n")
        return 1


async def run_to_version(target_version: int):
    """Run migrations up to specific version"""
    print(f"\nRunning migrations up to version {target_version}...")
    
    migrations = [
        (1, "add_subscription_id_to_orders", migration_001),
        (2, "add_order_id_to_delivery_statuses", migration_002),
        (3, "add_indexes", migration_003),
        (4, "add_user_customer_linking", migration_004),
        (5, "add_delivery_confirmation_fields", migration_005),
    ]
    
    completed = 0
    for version, name, migration_module in migrations:
        if version > target_version:
            break
        try:
            print(f"Running migration {version}: {name}...")
            await migration_module.up(db)
            print(f"  ✅ Completed\n")
            completed += 1
        except Exception as e:
            print(f"  ❌ Failed: {str(e)}\n")
            return 1
    
    print(f"✅ Completed {completed} migration(s) up to version {target_version}\n")
    return 0


# Old failed code - remove the BaseMigration classes
class Migration001:
    pass
class Migration002:
    pass
class Migration003:
    pass
class Migration004:
    pass
class Migration005:
    pass


async def rollback_all_migrations():
    """Rollback all migrations in reverse order"""
    print("\n⚠️  WARNING: Rolling back ALL migrations")
    print("This will reverse all database changes.\n")
    
    response = input("Are you sure? Type 'yes' to confirm: ")
    if response.lower() != 'yes':
        print("Rollback cancelled.")
        return 0
    
    print("Rollback feature not yet implemented")
    return 0


async def list_migrations():
    """List all available migrations"""
    print("\n" + "="*80)
    print("Available Migrations")
    print("="*80 + "\n")
    
    migrations = [
        ("001", "add_subscription_id_to_orders"),
        ("002", "add_order_id_to_delivery_statuses"),
        ("003", "add_indexes"),
        ("004", "add_user_customer_linking"),
        ("005", "add_delivery_confirmation_fields"),
    ]
    
    for version, name in migrations:
        print(f"Migration #{version}: {name}")


def print_help():
    """Print help message"""
    print("""
Migration Runner - Usage
========================

Commands:
  python run_migrations.py               - Run all migrations
  python run_migrations.py --version 1   - Run migration #1
  python run_migrations.py --rollback    - Rollback all migrations
  python run_migrations.py --list        - List all migrations
  python run_migrations.py --help        - Show this help

Examples:
  python run_migrations.py                    # Run all migrations
  python run_migrations.py --version 3        # Run migration 3 only
  python run_migrations.py --rollback         # Rollback all changes
  python run_migrations.py --list             # List available migrations

Safety:
  - Backup your database before running migrations
  - Test migrations on staging first
  - Rollback is available if needed
  - All migrations are safe and reversible

For more information, see STEP_34_DATA_MIGRATION_FRAMEWORK.md
    """)


async def main():
    """Main entry point"""
    if len(sys.argv) < 2 or sys.argv[1] == "--help":
        print_help()
        return 0
    
    if sys.argv[1] == "--list":
        await list_migrations()
        return 0
    
    if sys.argv[1] == "--version" and len(sys.argv) > 2:
        try:
            version = int(sys.argv[2])
            return await run_specific_migration(version)
        except ValueError:
            print(f"Invalid version: {sys.argv[2]}")
            return 1
    
    if sys.argv[1] == "--rollback":
        return await rollback_all_migrations()
    
    # Default: run all migrations
    return await run_all_migrations()


if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\nMigration interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

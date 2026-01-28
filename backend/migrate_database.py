#!/usr/bin/env python
"""
Database Migration Script for Phase 5 Deployment
Handles all database schema migrations, data migrations, and backups
"""

import os
import sys
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DatabaseMigration:
    """Handle database migrations for Phase 5"""
    
    def __init__(self, mongodb_uri: str, db_name: str = "kirana_db"):
        """Initialize migration manager"""
        self.mongodb_uri = mongodb_uri
        self.db_name = db_name
        self.client = None
        self.db = None
        self.migration_history = []
        
    def connect(self) -> bool:
        """Connect to MongoDB"""
        try:
            self.client = MongoClient(self.mongodb_uri, serverSelectionTimeoutMS=5000)
            # Verify connection
            self.client.admin.command('ping')
            self.db = self.client[self.db_name]
            logger.info(f"Connected to MongoDB: {self.db_name}")
            return True
        except ServerSelectionTimeoutError as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from MongoDB"""
        if self.client:
            self.client.close()
            logger.info("Disconnected from MongoDB")
    
    def backup_database(self, backup_dir: str = "./backups") -> bool:
        """Backup database before migration"""
        try:
            Path(backup_dir).mkdir(parents=True, exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_file = f"{backup_dir}/backup_{timestamp}.json"
            
            logger.info(f"Backing up database to {backup_file}")
            
            backup_data = {}
            for collection_name in self.db.list_collection_names():
                collection = self.db[collection_name]
                backup_data[collection_name] = list(collection.find({}, {'_id': 0}))
            
            with open(backup_file, 'w') as f:
                json.dump(backup_data, f, default=str)
            
            logger.info(f"Backup completed: {backup_file}")
            return True
        except Exception as e:
            logger.error(f"Backup failed: {e}")
            return False
    
    def restore_database(self, backup_file: str) -> bool:
        """Restore database from backup"""
        try:
            if not os.path.exists(backup_file):
                logger.error(f"Backup file not found: {backup_file}")
                return False
            
            logger.info(f"Restoring database from {backup_file}")
            
            with open(backup_file, 'r') as f:
                backup_data = json.load(f)
            
            # Clear existing data
            for collection_name in self.db.list_collection_names():
                self.db[collection_name].delete_many({})
            
            # Restore collections
            for collection_name, documents in backup_data.items():
                if documents:
                    self.db[collection_name].insert_many(documents)
            
            logger.info("Restore completed successfully")
            return True
        except Exception as e:
            logger.error(f"Restore failed: {e}")
            return False
    
    # =====================
    # Phase 5 Migrations
    # =====================
    
    def migrate_v1_to_v2_access_control(self):
        """Migration: Add access control collections (Phase 4B.6)"""
        logger.info("Migrating: Adding access control collections")
        
        try:
            # Create permissions collection
            if 'permissions' not in self.db.list_collection_names():
                self.db.create_collection('permissions')
                self.db['permissions'].create_index([('user_id', 1), ('resource_id', 1)], unique=True)
                logger.info("✓ Created 'permissions' collection")
            
            # Create roles collection
            if 'roles' not in self.db.list_collection_names():
                self.db.create_collection('roles')
                self.db['roles'].create_index([('name', 1)], unique=True)
                logger.info("✓ Created 'roles' collection")
            
            # Create audit_logs collection
            if 'audit_logs' not in self.db.list_collection_names():
                self.db.create_collection('audit_logs')
                self.db['audit_logs'].create_index([('user_id', 1), ('timestamp', -1)])
                logger.info("✓ Created 'audit_logs' collection")
            
            # Create 2fa_devices collection
            if 'twofa_devices' not in self.db.list_collection_names():
                self.db.create_collection('twofa_devices')
                self.db['twofa_devices'].create_index([('user_id', 1)])
                logger.info("✓ Created 'twofa_devices' collection")
            
            return True
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            return False
    
    def migrate_v2_to_v3_payments(self):
        """Migration: Add payment tracking for Phase 4B.1"""
        logger.info("Migrating: Adding payment tracking")
        
        try:
            if 'payments' in self.db.list_collection_names():
                # Add payment status tracking
                self.db['payments'].update_many(
                    {'status': {'$exists': False}},
                    {'$set': {'status': 'pending'}}
                )
                logger.info("✓ Updated payment status field")
            
            if 'orders' in self.db.list_collection_names():
                # Add payment method to orders
                self.db['orders'].update_many(
                    {'payment_method': {'$exists': False}},
                    {'$set': {'payment_method': 'unknown'}}
                )
                logger.info("✓ Added payment method field to orders")
            
            return True
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            return False
    
    def migrate_v3_to_v4_gamification(self):
        """Migration: Add gamification collections for Phase 4A.6"""
        logger.info("Migrating: Adding gamification collections")
        
        try:
            # Create loyalty_points collection
            if 'loyalty_points' not in self.db.list_collection_names():
                self.db.create_collection('loyalty_points')
                self.db['loyalty_points'].create_index([('user_id', 1)])
                logger.info("✓ Created 'loyalty_points' collection")
            
            # Create achievements collection
            if 'achievements' not in self.db.list_collection_names():
                self.db.create_collection('achievements')
                self.db['achievements'].create_index([('user_id', 1)])
                logger.info("✓ Created 'achievements' collection")
            
            # Create leaderboards collection
            if 'leaderboards' not in self.db.list_collection_names():
                self.db.create_collection('leaderboards')
                self.db['leaderboards'].create_index([('timestamp', -1)])
                logger.info("✓ Created 'leaderboards' collection")
            
            return True
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            return False
    
    def migrate_v4_to_v5_mobile(self):
        """Migration: Add mobile app collections for Phase 4A.4"""
        logger.info("Migrating: Adding mobile app collections")
        
        try:
            # Create mobile_devices collection
            if 'mobile_devices' not in self.db.list_collection_names():
                self.db.create_collection('mobile_devices')
                self.db['mobile_devices'].create_index([('user_id', 1)])
                logger.info("✓ Created 'mobile_devices' collection")
            
            # Create offline_sync collection
            if 'offline_sync' not in self.db.list_collection_names():
                self.db.create_collection('offline_sync')
                self.db['offline_sync'].create_index([('user_id', 1), ('timestamp', -1)])
                logger.info("✓ Created 'offline_sync' collection")
            
            return True
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            return False
    
    def run_all_migrations(self) -> bool:
        """Run all pending migrations"""
        migrations = [
            ('v1_to_v2_access_control', self.migrate_v1_to_v2_access_control),
            ('v2_to_v3_payments', self.migrate_v2_to_v3_payments),
            ('v3_to_v4_gamification', self.migrate_v3_to_v4_gamification),
            ('v4_to_v5_mobile', self.migrate_v4_to_v5_mobile),
        ]
        
        for migration_name, migration_func in migrations:
            try:
                logger.info(f"\n{'='*60}")
                logger.info(f"Running migration: {migration_name}")
                logger.info(f"{'='*60}")
                
                if migration_func():
                    self.migration_history.append({
                        'name': migration_name,
                        'status': 'success',
                        'timestamp': datetime.now().isoformat()
                    })
                    logger.info(f"✓ Migration completed: {migration_name}\n")
                else:
                    self.migration_history.append({
                        'name': migration_name,
                        'status': 'failed',
                        'timestamp': datetime.now().isoformat()
                    })
                    logger.error(f"✗ Migration failed: {migration_name}\n")
                    return False
            except Exception as e:
                logger.error(f"Unexpected error in {migration_name}: {e}")
                return False
        
        return True
    
    def print_migration_summary(self):
        """Print migration summary"""
        logger.info("\n" + "="*60)
        logger.info("MIGRATION SUMMARY")
        logger.info("="*60)
        
        for migration in self.migration_history:
            status_icon = "✓" if migration['status'] == 'success' else "✗"
            logger.info(f"{status_icon} {migration['name']}: {migration['status']}")
        
        logger.info("="*60 + "\n")


def main():
    """Main migration entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Database Migration Tool')
    parser.add_argument('--action', choices=['migrate', 'backup', 'restore'], 
                       default='migrate', help='Action to perform')
    parser.add_argument('--backup-file', help='Backup file for restore')
    parser.add_argument('--mongodb-uri', default=os.getenv('MONGODB_URI'),
                       help='MongoDB connection URI')
    parser.add_argument('--db-name', default='kirana_db', help='Database name')
    
    args = parser.parse_args()
    
    if not args.mongodb_uri:
        logger.error("MongoDB URI not provided. Set MONGODB_URI environment variable.")
        sys.exit(1)
    
    migration = DatabaseMigration(args.mongodb_uri, args.db_name)
    
    try:
        if not migration.connect():
            sys.exit(1)
        
        if args.action == 'migrate':
            if migration.backup_database():
                if migration.run_all_migrations():
                    migration.print_migration_summary()
                    logger.info("✓ All migrations completed successfully!")
                else:
                    logger.error("✗ Migrations failed. Rolling back...")
                    sys.exit(1)
            else:
                logger.error("✗ Backup failed. Aborting migrations.")
                sys.exit(1)
        
        elif args.action == 'backup':
            migration.backup_database()
        
        elif args.action == 'restore':
            if not args.backup_file:
                logger.error("Backup file path required for restore")
                sys.exit(1)
            migration.restore_database(args.backup_file)
    
    finally:
        migration.disconnect()


if __name__ == '__main__':
    main()

# ==================================================================================
# MIGRATION FRAMEWORK - Database Schema & Data Changes
# ==================================================================================
# Purpose: Centralized migration management for all database changes
# Usage: python backend/run_migrations.py (run all) or specific migration
# Status: Production-ready migration framework for EarlyBird system
# ==================================================================================

import asyncio
import importlib
import os
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional
from abc import ABC, abstractmethod
import traceback
from motor.motor_asyncio import AsyncIOMotorDatabase


class BaseMigration(ABC):
    """Base class for all database migrations"""
    
    def __init__(self, version: int, name: str, description: str):
        self.version = version
        self.name = name
        self.description = description
        self.created_at = datetime.now()
        self.status = "pending"
        self.duration = None
        self.error = None
        self.rolled_back = False
    
    @abstractmethod
    async def up(self, db: AsyncIOMotorDatabase) -> Dict[str, Any]:
        """Apply migration (schema changes, data modifications)"""
        pass
    
    @abstractmethod
    async def down(self, db: AsyncIOMotorDatabase) -> Dict[str, Any]:
        """Rollback migration (restore previous state)"""
        pass
    
    async def execute(self, db: AsyncIOMotorDatabase, direction: str = "up") -> Dict[str, Any]:
        """Execute migration with error handling and tracking"""
        try:
            start_time = datetime.now()
            
            if direction == "up":
                result = await self.up(db)
                self.status = "completed"
            else:
                result = await self.down(db)
                self.status = "rolled_back"
                self.rolled_back = True
            
            self.duration = (datetime.now() - start_time).total_seconds()
            result["migration"] = {
                "version": self.version,
                "name": self.name,
                "status": self.status,
                "duration_seconds": self.duration,
                "executed_at": start_time.isoformat()
            }
            
            return result
        
        except Exception as e:
            self.status = "failed"
            self.error = str(e)
            return {
                "success": False,
                "error": str(e),
                "traceback": traceback.format_exc(),
                "migration": {
                    "version": self.version,
                    "name": self.name,
                    "status": "failed",
                    "error": self.error
                }
            }
    
    def __str__(self) -> str:
        return f"Migration #{self.version}: {self.name} - {self.description}"


class MigrationRunner:
    """Manages migration execution and tracking"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.migrations: List[BaseMigration] = []
        self.executed_migrations: List[Dict[str, Any]] = []
    
    def register(self, migration: BaseMigration) -> None:
        """Register a migration"""
        self.migrations.append(migration)
        self.migrations.sort(key=lambda m: m.version)
    
    def register_all(self, *migrations: BaseMigration) -> None:
        """Register multiple migrations"""
        for migration in migrations:
            self.register(migration)
    
    async def run_all(self, skip_failed: bool = False) -> Dict[str, Any]:
        """Execute all pending migrations"""
        summary = {
            "total": len(self.migrations),
            "completed": 0,
            "failed": 0,
            "skipped": 0,
            "migrations": [],
            "start_time": datetime.now().isoformat()
        }
        
        for migration in self.migrations:
            result = await migration.execute(self.db, "up")
            self.executed_migrations.append(result)
            summary["migrations"].append(result.get("migration", {}))
            
            if result.get("success", True):
                summary["completed"] += 1
            else:
                summary["failed"] += 1
                if not skip_failed:
                    summary["error"] = f"Migration {migration.version} failed: {migration.error}"
                    break
        
        summary["end_time"] = datetime.now().isoformat()
        return summary
    
    async def run_specific(self, version: int) -> Dict[str, Any]:
        """Run a specific migration by version"""
        migration = next((m for m in self.migrations if m.version == version), None)
        if not migration:
            return {"success": False, "error": f"Migration version {version} not found"}
        
        return await migration.execute(self.db, "up")
    
    async def rollback_all(self) -> Dict[str, Any]:
        """Rollback all executed migrations (in reverse order)"""
        summary = {
            "total_rolled_back": 0,
            "failed": 0,
            "migrations": [],
            "start_time": datetime.now().isoformat()
        }
        
        # Rollback in reverse order
        for migration in reversed(self.executed_migrations):
            version = migration.get("migration", {}).get("version")
            if version:
                mig = next((m for m in self.migrations if m.version == version), None)
                if mig:
                    result = await mig.execute(self.db, "down")
                    summary["migrations"].append(result.get("migration", {}))
                    if result.get("success", True):
                        summary["total_rolled_back"] += 1
                    else:
                        summary["failed"] += 1
        
        summary["end_time"] = datetime.now().isoformat()
        return summary
    
    async def rollback_specific(self, version: int) -> Dict[str, Any]:
        """Rollback a specific migration"""
        migration = next((m for m in self.migrations if m.version == version), None)
        if not migration:
            return {"success": False, "error": f"Migration version {version} not found"}
        
        return await migration.execute(self.db, "down")


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

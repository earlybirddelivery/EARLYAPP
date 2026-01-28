"""
Database Models for Import Logging
Tracks all data imports for audit and compliance
"""

from pymongo import MongoClient
from pymongo.collection import Collection
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import uuid
import json

@dataclass
class ImportLog:
    """
    Audit log for data imports
    
    Fields:
    - id: Unique import identifier
    - import_date: When the import occurred
    - imported_by: User ID who performed import
    - data_type: Type of data imported (customers, orders, etc.)
    - file_name: Original file name
    - total_records: Total records in file
    - imported_records: Successfully imported records
    - failed_records: Records that failed
    - errors: List of validation/import errors
    - warnings: List of warnings during import
    - status: 'success', 'partial', or 'failed'
    - file_hash: SHA256 of file (for duplicate detection)
    - duration_ms: How long import took in milliseconds
    - created_at: Timestamp of creation
    """
    id: str
    import_date: str  # ISO format datetime
    imported_by: str  # User ID
    data_type: str  # customers, orders, delivery, subscriptions, suppliers
    file_name: str
    total_records: int
    imported_records: int
    failed_records: int
    errors: List[str]
    warnings: List[str]
    status: str  # success, partial, failed
    file_hash: Optional[str] = None
    duration_ms: int = 0
    created_at: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for MongoDB"""
        data = asdict(self)
        if not data.get('created_at'):
            data['created_at'] = datetime.now(timezone.utc).isoformat()
        return data

class ImportLogRepository:
    """Database operations for import logs"""
    
    def __init__(self, db):
        """
        Initialize with MongoDB database
        
        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.collection: Collection = db.import_logs
        self._ensure_indexes()
    
    def _ensure_indexes(self):
        """Create necessary database indexes"""
        # Index for fast lookups by import ID
        self.collection.create_index("id", unique=True)
        
        # Index for filtering by data type
        self.collection.create_index("data_type")
        
        # Index for filtering by user (admin audit)
        self.collection.create_index("imported_by")
        
        # Index for date range queries
        self.collection.create_index("import_date")
        
        # Compound index for common queries
        self.collection.create_index([
            ("data_type", 1),
            ("import_date", -1)
        ])
        
        # TTL index to auto-delete logs older than 365 days
        # Comment out if you want to keep all logs permanently
        # self.collection.create_index("created_at", expireAfterSeconds=31536000)
    
    async def create(self, log: ImportLog) -> str:
        """
        Create new import log
        
        Args:
            log: ImportLog instance
            
        Returns:
            ID of created log
        """
        log_dict = log.to_dict()
        result = await self.collection.insert_one(log_dict)
        return str(result.inserted_id)
    
    async def get_by_id(self, import_id: str) -> Optional[Dict[str, Any]]:
        """Get import log by ID"""
        return await self.collection.find_one({"id": import_id})
    
    async def get_by_type(self, data_type: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent imports of specific type"""
        return await self.collection.find(
            {"data_type": data_type}
        ).sort("import_date", -1).limit(limit).to_list(None)
    
    async def get_by_user(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get all imports by specific user"""
        return await self.collection.find(
            {"imported_by": user_id}
        ).sort("import_date", -1).limit(limit).to_list(None)
    
    async def get_recent(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get most recent imports"""
        return await self.collection.find(
            {}
        ).sort("import_date", -1).limit(limit).to_list(None)
    
    async def get_statistics(self) -> Dict[str, Any]:
        """
        Get aggregated import statistics
        
        Returns statistics by data type and overall
        """
        pipeline = [
            {
                "$group": {
                    "_id": "$data_type",
                    "total_imports": {"$sum": 1},
                    "total_records_imported": {"$sum": "$imported_records"},
                    "total_records_processed": {"$sum": "$total_records"},
                    "total_failed": {"$sum": "$failed_records"},
                    "success_imports": {
                        "$sum": {"$cond": [{"$eq": ["$status", "success"]}, 1, 0]}
                    },
                    "partial_imports": {
                        "$sum": {"$cond": [{"$eq": ["$status", "partial"]}, 1, 0]}
                    },
                    "failed_imports": {
                        "$sum": {"$cond": [{"$eq": ["$status", "failed"]}, 1, 0]}
                    },
                    "avg_duration_ms": {"$avg": "$duration_ms"}
                }
            },
            {"$sort": {"total_imports": -1}}
        ]
        
        return await self.collection.aggregate(pipeline).to_list(None)
    
    async def get_error_summary(self) -> List[Dict[str, Any]]:
        """Get summary of most common import errors"""
        pipeline = [
            {"$unwind": "$errors"},
            {
                "$group": {
                    "_id": "$errors",
                    "count": {"$sum": 1},
                    "data_types": {"$push": "$data_type"},
                    "recent_date": {"$max": "$import_date"}
                }
            },
            {"$sort": {"count": -1}},
            {"$limit": 20}
        ]
        
        return await self.collection.aggregate(pipeline).to_list(None)
    
    async def get_imports_in_range(
        self,
        start_date: str,
        end_date: str,
        data_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get imports within date range"""
        query = {
            "import_date": {
                "$gte": start_date,
                "$lte": end_date
            }
        }
        
        if data_type:
            query["data_type"] = data_type
        
        return await self.collection.find(query).sort(
            "import_date", -1
        ).to_list(None)
    
    async def delete_old_logs(self, days: int = 365) -> int:
        """
        Delete logs older than specified days
        
        Args:
            days: Keep logs from last N days
            
        Returns:
            Number of logs deleted
        """
        from datetime import datetime, timezone, timedelta
        
        cutoff_date = (
            datetime.now(timezone.utc) - timedelta(days=days)
        ).isoformat()
        
        result = await self.collection.delete_many(
            {"import_date": {"$lt": cutoff_date}}
        )
        
        return result.deleted_count

# ==================== USAGE EXAMPLE ====================

"""
# Initialize repository
from database import db
import_repo = ImportLogRepository(db)

# Create import log
log = ImportLog(
    id=str(uuid.uuid4()),
    import_date=datetime.now(timezone.utc).isoformat(),
    imported_by="user-123",
    data_type="customers",
    file_name="customer_import.xlsx",
    total_records=1000,
    imported_records=995,
    failed_records=5,
    errors=[
        "Row 23: Invalid email format",
        "Row 45: Duplicate phone number"
    ],
    warnings=[
        "Row 15: Phone number reformatted"
    ],
    status="partial",
    duration_ms=2543
)

# Save to database
import_id = await import_repo.create(log)

# Retrieve statistics
stats = await import_repo.get_statistics()
print(stats)

# Find errors
errors = await import_repo.get_error_summary()
print(errors)
"""

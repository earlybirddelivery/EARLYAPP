"""
PHASE 4A.2: Event Logging System
Author: System
Date: January 27, 2026
Purpose: Log all real-time events to database for audit trail and analytics

Features:
- Event persistence to MongoDB
- Event querying and filtering
- Event analytics
- Automatic cleanup of old events
- Event replay capability
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from websocket_service import WebSocketEvent, EventType
import json

logger = logging.getLogger(__name__)


class EventLogger:
    """
    Handles logging of all WebSocket events to database
    
    Collections:
    - event_logs: All events (persistent)
    - event_analytics: Aggregated statistics
    - event_errors: Failed event delivery tracking
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.events_collection = db.event_logs
        self.analytics_collection = db.event_analytics
        self.errors_collection = db.event_errors
    
    async def initialize(self):
        """Create indexes and setup collections"""
        
        # Event logs indexes
        await self.events_collection.create_index("timestamp")
        await self.events_collection.create_index("event_type")
        await self.events_collection.create_index("user_id")
        await self.events_collection.create_index("source")
        await self.events_collection.create_index(
            [("timestamp", -1), ("event_type", 1)],
            name="timestamp_event_type"
        )
        await self.events_collection.create_index(
            [("user_id", 1), ("timestamp", -1)],
            name="user_events"
        )
        
        # TTL index: auto-delete events older than 90 days
        await self.events_collection.create_index(
            "timestamp",
            expireAfterSeconds=7776000  # 90 days
        )
        
        logger.info("Event logging initialized with indexes")
    
    async def log_event(self, event: WebSocketEvent):
        """
        Log an event to database
        
        Args:
            event: WebSocketEvent to log
        """
        try:
            event_doc = {
                "event_id": event.event_id,
                "event_type": event.event_type.value,
                "event_level": event.event_level.value,
                "user_id": event.user_id,
                "timestamp": event.timestamp,
                "source": event.source,
                "data": event.data,
                "retry_count": event.retry_count,
                "created_at": datetime.utcnow(),
                "log_timestamp": datetime.utcnow(),
            }
            
            result = await self.events_collection.insert_one(event_doc)
            logger.debug(f"Event logged: {event.event_id}")
            
            # Update analytics
            await self._update_analytics(event)
            
            return result.inserted_id
            
        except Exception as e:
            logger.error(f"Failed to log event: {e}")
            await self.log_error(event, str(e))
    
    async def get_event(self, event_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a specific event by ID"""
        return await self.events_collection.find_one({"event_id": event_id})
    
    async def get_user_events(
        self,
        user_id: str,
        event_type: Optional[str] = None,
        limit: int = 50,
        skip: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        Get events for a specific user
        
        Args:
            user_id: User to get events for
            event_type: Filter by event type (optional)
            limit: Maximum results
            skip: Skip first N results
            
        Returns:
            List of events
        """
        query = {"user_id": user_id}
        
        if event_type:
            query["event_type"] = event_type
        
        events = await self.events_collection.find(
            query
        ).sort("timestamp", -1).skip(skip).limit(limit).to_list(None)
        
        return events
    
    async def get_events_by_type(
        self,
        event_type: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Get events by type within time range
        
        Args:
            event_type: Type of events to retrieve
            start_time: Start of time range
            end_time: End of time range
            limit: Maximum results
            
        Returns:
            List of matching events
        """
        query = {"event_type": event_type}
        
        if start_time or end_time:
            query["timestamp"] = {}
            if start_time:
                query["timestamp"]["$gte"] = start_time
            if end_time:
                query["timestamp"]["$lte"] = end_time
        
        events = await self.events_collection.find(
            query
        ).sort("timestamp", -1).limit(limit).to_list(None)
        
        return events
    
    async def get_events_by_source(
        self,
        source: str,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Get events from a specific service/source"""
        events = await self.events_collection.find(
            {"source": source}
        ).sort("timestamp", -1).limit(limit).to_list(None)
        
        return events
    
    async def get_critical_events(
        self,
        hours: int = 24,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get all CRITICAL level events from last N hours"""
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        
        events = await self.events_collection.find({
            "event_level": "critical",
            "timestamp": {"$gte": cutoff}
        }).sort("timestamp", -1).limit(limit).to_list(None)
        
        return events
    
    async def get_event_timeline(
        self,
        user_id: str,
        start_time: datetime,
        end_time: datetime,
    ) -> List[Dict[str, Any]]:
        """
        Get timeline of events for a user in time range
        Useful for replaying user actions
        """
        events = await self.events_collection.find({
            "user_id": user_id,
            "timestamp": {
                "$gte": start_time,
                "$lte": end_time
            }
        }).sort("timestamp", 1).to_list(None)
        
        return events
    
    async def _update_analytics(self, event: WebSocketEvent):
        """Update analytics collection with event stats"""
        try:
            # Date key for aggregation
            date_key = event.timestamp.strftime("%Y-%m-%d")
            
            # Update event type stats
            await self.analytics_collection.update_one(
                {
                    "date": date_key,
                    "type": "by_event_type"
                },
                {
                    "$inc": {
                        f"events.{event.event_type.value}": 1,
                        "total": 1,
                    },
                    "$set": {"last_updated": datetime.utcnow()}
                },
                upsert=True
            )
            
            # Update source stats
            await self.analytics_collection.update_one(
                {
                    "date": date_key,
                    "type": "by_source"
                },
                {
                    "$inc": {
                        f"sources.{event.source}": 1,
                        "total": 1,
                    },
                    "$set": {"last_updated": datetime.utcnow()}
                },
                upsert=True
            )
            
            # Update level stats
            await self.analytics_collection.update_one(
                {
                    "date": date_key,
                    "type": "by_level"
                },
                {
                    "$inc": {
                        f"levels.{event.event_level.value}": 1,
                        "total": 1,
                    },
                    "$set": {"last_updated": datetime.utcnow()}
                },
                upsert=True
            )
            
        except Exception as e:
            logger.error(f"Failed to update analytics: {e}")
    
    async def log_error(
        self,
        event: WebSocketEvent,
        error_message: str,
        retry_scheduled: bool = False,
    ):
        """
        Log a failed event delivery
        
        Args:
            event: Event that failed
            error_message: Error description
            retry_scheduled: Whether retry is scheduled
        """
        try:
            error_doc = {
                "event_id": event.event_id,
                "event_type": event.event_type.value,
                "user_id": event.user_id,
                "error": error_message,
                "timestamp": event.timestamp,
                "retry_count": event.retry_count,
                "retry_scheduled": retry_scheduled,
                "logged_at": datetime.utcnow(),
            }
            
            await self.errors_collection.insert_one(error_doc)
            logger.warning(
                f"Event error logged: {event.event_id} - {error_message}"
            )
            
        except Exception as e:
            logger.error(f"Failed to log error: {e}")
    
    async def get_analytics_summary(
        self,
        date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get analytics summary for a date
        
        Args:
            date: Date in YYYY-MM-DD format (default: today)
            
        Returns:
            Analytics summary dictionary
        """
        if not date:
            date = datetime.utcnow().strftime("%Y-%m-%d")
        
        summary = {
            "date": date,
            "by_event_type": {},
            "by_source": {},
            "by_level": {},
            "total_events": 0,
            "critical_events": 0,
        }
        
        try:
            # Get all analytics for this date
            analytics = await self.analytics_collection.find({
                "date": date
            }).to_list(None)
            
            for doc in analytics:
                if doc.get("type") == "by_event_type":
                    summary["by_event_type"] = doc.get("events", {})
                    summary["total_events"] = doc.get("total", 0)
                
                elif doc.get("type") == "by_source":
                    summary["by_source"] = doc.get("sources", {})
                
                elif doc.get("type") == "by_level":
                    summary["by_level"] = doc.get("levels", {})
                    summary["critical_events"] = doc.get("levels", {}).get(
                        "critical", 0
                    )
            
            return summary
            
        except Exception as e:
            logger.error(f"Failed to get analytics: {e}")
            return summary
    
    async def get_error_summary(
        self,
        hours: int = 24,
    ) -> Dict[str, Any]:
        """Get summary of errors in last N hours"""
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        
        summary = {
            "period_hours": hours,
            "total_errors": 0,
            "by_event_type": {},
            "by_error": {},
            "recent_errors": [],
        }
        
        try:
            errors = await self.errors_collection.find({
                "logged_at": {"$gte": cutoff}
            }).to_list(None)
            
            summary["total_errors"] = len(errors)
            
            # Count by event type
            for error in errors:
                event_type = error.get("event_type", "unknown")
                error_msg = error.get("error", "unknown")
                
                summary["by_event_type"][event_type] = \
                    summary["by_event_type"].get(event_type, 0) + 1
                
                summary["by_error"][error_msg] = \
                    summary["by_error"].get(error_msg, 0) + 1
            
            # Get recent errors
            summary["recent_errors"] = await self.errors_collection.find({
                "logged_at": {"$gte": cutoff}
            }).sort("logged_at", -1).limit(10).to_list(None)
            
            return summary
            
        except Exception as e:
            logger.error(f"Failed to get error summary: {e}")
            return summary
    
    async def cleanup_old_events(self, days: int = 90):
        """
        Delete events older than N days
        Note: This is automatic via TTL index, but can be manual
        
        Args:
            days: Age threshold in days
        """
        try:
            cutoff = datetime.utcnow() - timedelta(days=days)
            
            result = await self.events_collection.delete_many({
                "timestamp": {"$lt": cutoff}
            })
            
            logger.info(
                f"Cleaned up {result.deleted_count} events older than "
                f"{days} days"
            )
            
        except Exception as e:
            logger.error(f"Failed to cleanup events: {e}")
    
    async def export_events(
        self,
        start_time: datetime,
        end_time: datetime,
        output_format: str = "json",
    ) -> str:
        """
        Export events to file
        
        Args:
            start_time: Start of range
            end_time: End of range
            output_format: Format (json, csv)
            
        Returns:
            Exported data as string
        """
        events = await self.events_collection.find({
            "timestamp": {
                "$gte": start_time,
                "$lte": end_time
            }
        }).sort("timestamp", 1).to_list(None)
        
        # Convert ObjectIds to strings
        for event in events:
            if "_id" in event:
                event["_id"] = str(event["_id"])
            if "timestamp" in event:
                event["timestamp"] = event["timestamp"].isoformat()
        
        if output_format == "json":
            return json.dumps(events, indent=2)
        
        elif output_format == "csv":
            import csv
            from io import StringIO
            
            output = StringIO()
            if events:
                writer = csv.DictWriter(output, fieldnames=events[0].keys())
                writer.writeheader()
                writer.writerows(events)
            
            return output.getvalue()
        
        return json.dumps(events, indent=2)
    
    async def get_user_activity_heatmap(
        self,
        user_id: str,
        days: int = 30,
    ) -> Dict[str, int]:
        """
        Get user activity by hour (for heatmap visualization)
        
        Args:
            user_id: User to analyze
            days: Number of days to analyze
            
        Returns:
            Dictionary with hour counts
        """
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        heatmap = {}
        
        events = await self.events_collection.find({
            "user_id": user_id,
            "timestamp": {"$gte": cutoff}
        }).to_list(None)
        
        # Count by hour
        for event in events:
            hour_key = event["timestamp"].strftime("%Y-%m-%d %H:00")
            heatmap[hour_key] = heatmap.get(hour_key, 0) + 1
        
        return heatmap


# Global logger instance
event_logger: Optional[EventLogger] = None


async def initialize_event_logger(db: AsyncIOMotorDatabase):
    """Initialize the global event logger"""
    global event_logger
    event_logger = EventLogger(db)
    await event_logger.initialize()

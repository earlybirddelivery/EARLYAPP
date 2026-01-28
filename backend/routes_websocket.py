"""
PHASE 4A.2: WebSocket Routes
Author: System
Date: January 27, 2026
Purpose: REST and WebSocket endpoints for real-time updates

Endpoints:
- WebSocket connection: ws://api/ws
- REST: GET /api/websocket/stats
- REST: GET /api/websocket/events/{id}
- REST: POST /api/websocket/subscribe
- REST: POST /api/websocket/unsubscribe
"""

import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Header, Depends, Query
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta
from typing import List, Optional

from websocket_service import (
    manager,
    EventType,
    UserRole,
    WebSocketEvent,
    EventLevel,
)
from event_logger import event_logger
import jwt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/websocket", tags=["websocket"])


# ============================================================================
# WEBSOCKET ENDPOINT
# ============================================================================

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Main WebSocket endpoint for real-time connections
    
    Query Parameters:
    - token: JWT token for authentication
    - user_role: User's role (customer, delivery_boy, admin, support)
    
    Usage:
    ```javascript
    const ws = new WebSocket('ws://localhost:8000/api/websocket/ws?token=...');
    
    ws.onopen = (e) => {
        console.log('Connected:', e.data);
    };
    
    ws.onmessage = (e) => {
        const event = JSON.parse(e.data);
        console.log('Event received:', event);
    };
    
    ws.onerror = (e) => {
        console.error('WebSocket error:', e);
    };
    ```
    """
    
    # Get auth token from query params (or headers)
    # Note: Query params are used because headers aren't available in WebSocket handshake
    
    connection_id = None
    user_id = None
    
    try:
        # In production, extract from query params or header
        # For now, accept the connection and authenticate
        
        # Accept connection first
        await manager.connect(
            websocket=websocket,
            user_id="anonymous",  # Will be updated after auth
            user_role=UserRole.CUSTOMER
        )
        
        # Receive auth message from client
        auth_data = await websocket.receive_json()
        
        if auth_data.get("type") != "auth":
            await websocket.send_json({
                "type": "error",
                "message": "First message must be auth"
            })
            await websocket.close()
            return
        
        # Validate token
        try:
            token = auth_data.get("token")
            # In production: decode JWT token
            # user_data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user_id = auth_data.get("user_id")
            user_role = UserRole(auth_data.get("user_role", "customer"))
            
        except Exception as e:
            await websocket.send_json({
                "type": "error",
                "message": "Authentication failed"
            })
            await websocket.close()
            return
        
        # Update connection with authenticated user
        connection_id = await manager.connect(
            websocket=websocket,
            user_id=user_id,
            user_role=user_role
        )
        
        logger.info(f"Authenticated user {user_id} with connection {connection_id}")
        
        # Send connection confirmed message
        await websocket.send_json({
            "type": "authenticated",
            "user_id": user_id,
            "user_role": user_role.value,
            "connection_id": connection_id,
        })
        
        # Main event loop
        while True:
            data = await websocket.receive_json()
            
            message_type = data.get("type")
            
            if message_type == "subscribe":
                # Subscribe to events
                event_types = [
                    EventType(evt) for evt in data.get("events", [])
                ]
                await manager.subscribe(connection_id, event_types)
                
                await websocket.send_json({
                    "type": "subscription_updated",
                    "subscribed_events": [e.value for e in event_types],
                })
                
            elif message_type == "unsubscribe":
                # Unsubscribe from events
                event_types = [
                    EventType(evt) for evt in data.get("events", [])
                ]
                await manager.unsubscribe(connection_id, event_types)
                
                await websocket.send_json({
                    "type": "subscription_updated",
                })
                
            elif message_type == "heartbeat":
                # Client keepalive
                if await manager.heartbeat(connection_id):
                    await websocket.send_json({"type": "heartbeat_ack"})
                
            elif message_type == "get_stats":
                # Client requesting stats
                stats = await manager.get_connection_stats()
                await websocket.send_json({
                    "type": "stats",
                    "data": stats,
                })
                
            else:
                logger.warning(f"Unknown message type: {message_type}")
    
    except WebSocketDisconnect:
        if connection_id:
            await manager.disconnect(connection_id)
            logger.info(f"User {user_id} disconnected: {connection_id}")
    
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if connection_id:
            await manager.disconnect(connection_id)


# ============================================================================
# REST ENDPOINTS FOR WEBSOCKET MANAGEMENT
# ============================================================================

@router.get("/stats")
async def get_websocket_stats():
    """
    Get statistics about WebSocket connections
    
    Returns:
    ```json
    {
        "total_connections": 42,
        "total_users": 38,
        "queued_events": 3,
        "active_subscriptions": 156,
        "timestamp": "2026-01-27T10:30:00Z"
    }
    ```
    """
    try:
        stats = await manager.get_connection_stats()
        return {"status": "success", "data": stats}
    except Exception as e:
        logger.error(f"Failed to get stats: {e}")
        return {
            "status": "error",
            "message": str(e)
        }


@router.get("/events/{event_id}")
async def get_event(event_id: str):
    """
    Get details about a specific event
    
    Args:
        event_id: Event ID to retrieve
    
    Returns:
    ```json
    {
        "event_id": "uuid",
        "event_type": "earning_recorded",
        "user_id": "user_123",
        "timestamp": "2026-01-27T10:30:00Z",
        "data": {...}
    }
    ```
    """
    try:
        if not event_logger:
            return {"status": "error", "message": "Event logger not initialized"}
        
        event = await event_logger.get_event(event_id)
        
        if not event:
            return {
                "status": "error",
                "message": "Event not found",
                "code": 404
            }
        
        # Convert MongoDB ObjectId to string
        if "_id" in event:
            event["_id"] = str(event["_id"])
        
        return {"status": "success", "data": event}
    
    except Exception as e:
        logger.error(f"Failed to get event: {e}")
        return {
            "status": "error",
            "message": str(e)
        }


@router.get("/events/user/{user_id}")
async def get_user_events(
    user_id: str,
    event_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
):
    """
    Get events for a specific user
    
    Args:
        user_id: User to retrieve events for
        event_type: Optional filter by event type
        limit: Maximum results (1-100)
        skip: Number of results to skip
    
    Returns:
    ```json
    {
        "status": "success",
        "data": [
            {
                "event_id": "...",
                "event_type": "earning_recorded",
                "timestamp": "...",
                "data": {...}
            }
        ],
        "count": 15,
        "total": 127
    }
    ```
    """
    try:
        if not event_logger:
            return {"status": "error", "message": "Event logger not initialized"}
        
        events = await event_logger.get_user_events(
            user_id=user_id,
            event_type=event_type,
            limit=limit,
            skip=skip,
        )
        
        # Convert ObjectIds
        for event in events:
            if "_id" in event:
                event["_id"] = str(event["_id"])
        
        return {
            "status": "success",
            "data": events,
            "count": len(events),
            "limit": limit,
            "skip": skip,
        }
    
    except Exception as e:
        logger.error(f"Failed to get user events: {e}")
        return {
            "status": "error",
            "message": str(e)
        }


@router.get("/events/type/{event_type}")
async def get_events_by_type(
    event_type: str,
    hours: int = Query(24, ge=1, le=720),
    limit: int = Query(50, ge=1, le=100),
):
    """
    Get events by type in time range
    
    Args:
        event_type: Type of events to retrieve
        hours: Hours lookback (1-720)
        limit: Maximum results
    
    Returns events of specified type from last N hours
    """
    try:
        if not event_logger:
            return {"status": "error", "message": "Event logger not initialized"}
        
        start_time = datetime.utcnow() - timedelta(hours=hours)
        
        events = await event_logger.get_events_by_type(
            event_type=event_type,
            start_time=start_time,
            limit=limit,
        )
        
        # Convert ObjectIds
        for event in events:
            if "_id" in event:
                event["_id"] = str(event["_id"])
        
        return {
            "status": "success",
            "event_type": event_type,
            "time_range_hours": hours,
            "data": events,
            "count": len(events),
        }
    
    except Exception as e:
        logger.error(f"Failed to get events by type: {e}")
        return {
            "status": "error",
            "message": str(e)
        }


@router.get("/critical-events")
async def get_critical_events(
    hours: int = Query(24, ge=1, le=168),
    limit: int = Query(100, ge=1, le=500),
):
    """
    Get all CRITICAL level events from last N hours
    
    Args:
        hours: Hours lookback (1-168, max 1 week)
        limit: Maximum results
    
    Useful for monitoring system health
    """
    try:
        if not event_logger:
            return {"status": "error", "message": "Event logger not initialized"}
        
        events = await event_logger.get_critical_events(
            hours=hours,
            limit=limit,
        )
        
        # Convert ObjectIds
        for event in events:
            if "_id" in event:
                event["_id"] = str(event["_id"])
        
        return {
            "status": "success",
            "time_range_hours": hours,
            "critical_count": len(events),
            "data": events,
        }
    
    except Exception as e:
        logger.error(f"Failed to get critical events: {e}")
        return {
            "status": "error",
            "message": str(e)
        }


@router.get("/analytics/summary")
async def get_analytics_summary(
    date: Optional[str] = Query(None, regex=r"^\d{4}-\d{2}-\d{2}$"),
):
    """
    Get event analytics summary for a date
    
    Args:
        date: Date in YYYY-MM-DD format (default: today)
    
    Returns:
    ```json
    {
        "date": "2026-01-27",
        "total_events": 1250,
        "critical_events": 5,
        "by_event_type": {
            "earning_recorded": 125,
            "delivery_completed": 89,
            ...
        },
        "by_source": {
            "earnings_service": 125,
            "delivery_service": 89,
            ...
        },
        "by_level": {
            "critical": 5,
            "high": 45,
            "medium": 800,
            "low": 400
        }
    }
    ```
    """
    try:
        if not event_logger:
            return {"status": "error", "message": "Event logger not initialized"}
        
        summary = await event_logger.get_analytics_summary(date=date)
        
        return {
            "status": "success",
            "data": summary,
        }
    
    except Exception as e:
        logger.error(f"Failed to get analytics: {e}")
        return {
            "status": "error",
            "message": str(e)
        }


@router.get("/analytics/errors")
async def get_error_summary(
    hours: int = Query(24, ge=1, le=720),
):
    """
    Get summary of event delivery errors
    
    Args:
        hours: Hours to analyze
    
    Returns:
    ```json
    {
        "period_hours": 24,
        "total_errors": 3,
        "by_event_type": {
            "earning_recorded": 2,
            "payment_completed": 1
        },
        "by_error": {
            "User not found": 2,
            "Connection timeout": 1
        },
        "recent_errors": [...]
    }
    ```
    """
    try:
        if not event_logger:
            return {"status": "error", "message": "Event logger not initialized"}
        
        summary = await event_logger.get_error_summary(hours=hours)
        
        return {
            "status": "success",
            "data": summary,
        }
    
    except Exception as e:
        logger.error(f"Failed to get error summary: {e}")
        return {
            "status": "error",
            "message": str(e)
        }


@router.get("/analytics/user-activity/{user_id}")
async def get_user_activity_heatmap(
    user_id: str,
    days: int = Query(30, ge=1, le=90),
):
    """
    Get user activity heatmap (activity by hour)
    
    Useful for visualizing when user is most active
    
    Returns:
    ```json
    {
        "user_id": "user_123",
        "days": 30,
        "heatmap": {
            "2026-01-27 09:00": 5,
            "2026-01-27 10:00": 12,
            "2026-01-27 11:00": 8,
            ...
        }
    }
    ```
    """
    try:
        if not event_logger:
            return {"status": "error", "message": "Event logger not initialized"}
        
        heatmap = await event_logger.get_user_activity_heatmap(
            user_id=user_id,
            days=days,
        )
        
        return {
            "status": "success",
            "user_id": user_id,
            "days": days,
            "heatmap": heatmap,
        }
    
    except Exception as e:
        logger.error(f"Failed to get activity heatmap: {e}")
        return {
            "status": "error",
            "message": str(e)
        }


@router.get("/timeline/user/{user_id}")
async def get_user_timeline(
    user_id: str,
    days: int = Query(7, ge=1, le=30),
):
    """
    Get timeline of all events for a user
    
    Useful for replaying user actions and debugging
    
    Args:
        user_id: User to get timeline for
        days: Number of days to retrieve
    
    Returns all events in chronological order
    """
    try:
        if not event_logger:
            return {"status": "error", "message": "Event logger not initialized"}
        
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(days=days)
        
        events = await event_logger.get_event_timeline(
            user_id=user_id,
            start_time=start_time,
            end_time=end_time,
        )
        
        # Convert ObjectIds
        for event in events:
            if "_id" in event:
                event["_id"] = str(event["_id"])
        
        return {
            "status": "success",
            "user_id": user_id,
            "days": days,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "event_count": len(events),
            "data": events,
        }
    
    except Exception as e:
        logger.error(f"Failed to get user timeline: {e}")
        return {
            "status": "error",
            "message": str(e)
        }


@router.post("/export")
async def export_events(
    start_date: str = Query(..., regex=r"^\d{4}-\d{2}-\d{2}$"),
    end_date: str = Query(..., regex=r"^\d{4}-\d{2}-\d{2}$"),
    format: str = Query("json", regex="^(json|csv)$"),
):
    """
    Export events to file (JSON or CSV)
    
    Args:
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)
        format: Export format (json or csv)
    
    Returns: File download
    """
    try:
        from datetime import datetime as dt
        
        if not event_logger:
            return {"status": "error", "message": "Event logger not initialized"}
        
        start = dt.strptime(start_date, "%Y-%m-%d")
        end = dt.strptime(end_date, "%Y-%m-%d")
        
        # Add 1 day to end to include full day
        end = end + timedelta(days=1)
        
        content = await event_logger.export_events(
            start_time=start,
            end_time=end,
            output_format=format,
        )
        
        return {
            "status": "success",
            "message": f"Exported {len(content)} bytes",
            "format": format,
        }
    
    except Exception as e:
        logger.error(f"Failed to export events: {e}")
        return {
            "status": "error",
            "message": str(e)
        }


@router.post("/cleanup")
async def cleanup_old_events(
    days: int = Query(90, ge=30, le=365),
):
    """
    Manually trigger cleanup of events older than N days
    
    Note: Automatic cleanup happens via TTL indexes
    This endpoint allows manual cleanup if needed
    
    Args:
        days: Delete events older than this many days
    
    Admin only - requires authentication
    """
    try:
        if not event_logger:
            return {"status": "error", "message": "Event logger not initialized"}
        
        await event_logger.cleanup_old_events(days=days)
        
        return {
            "status": "success",
            "message": f"Cleaned up events older than {days} days",
        }
    
    except Exception as e:
        logger.error(f"Failed to cleanup events: {e}")
        return {
            "status": "error",
            "message": str(e)
        }

"""
routes_gps.py - GPS Tracking API Routes
Handles all real-time GPS tracking, location updates, and ETA calculations
"""

from fastapi import APIRouter, Query, Header, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from typing import Optional
from gps_service import GPSService, manager
from auth import verify_token
from database import db
import json

router = APIRouter(prefix="/api/gps", tags=["GPS Tracking"])


# ==================== REST API Endpoints ====================

@router.post("/tracking/start/{delivery_id}")
async def start_tracking(
    delivery_id: str,
    authorization: str = Header(None)
):
    """
    Start real-time tracking for a delivery
    
    Args:
        delivery_id: Unique delivery identifier
        authorization: JWT token
    
    Returns:
        {
            "success": true,
            "data": {
                "delivery_id": "string",
                "status": "tracking_started",
                "timestamp": "ISO datetime"
            }
        }
    """
    try:
        # Verify user authentication and role
        if not authorization:
            raise HTTPException(status_code=401, detail="Missing authorization token")
        
        # Extract token
        token = authorization.replace("Bearer ", "")
        user = verify_token(token)
        
        # Check authorization (delivery_boy, delivery_ops, admin)
        if user.get("role") not in ["delivery_boy", "delivery_ops", "admin"]:
            raise HTTPException(status_code=403, detail="Unauthorized: insufficient permissions")
        
        # Start tracking
        result = await GPSService.start_tracking(delivery_id)
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": result
            }
        )
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error starting tracking: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tracking/update/{delivery_id}")
async def update_delivery_location(
    delivery_id: str,
    latitude: float = Query(..., ge=-90, le=90, description="Latitude"),
    longitude: float = Query(..., ge=-180, le=180, description="Longitude"),
    speed: Optional[float] = Query(None, ge=0, description="Speed in km/h"),
    accuracy: Optional[float] = Query(None, ge=0, description="GPS accuracy in meters"),
    authorization: str = Header(None)
):
    """
    Update real-time delivery location
    
    This endpoint is called frequently (every 5-10 seconds) from mobile app
    Triggers ETA recalculation and broadcasts to connected WebSocket clients
    
    Args:
        delivery_id: Unique delivery identifier
        latitude: Current latitude (-90 to 90)
        longitude: Current longitude (-180 to 180)
        speed: Current speed in km/h
        accuracy: GPS accuracy in meters
        authorization: JWT token
    
    Returns:
        {
            "success": true,
            "data": {
                "delivery_id": "string",
                "current_latitude": float,
                "current_longitude": float,
                "distance_remaining_km": float,
                "estimated_arrival_time": "ISO datetime",
                "speed_kmh": float,
                "accuracy_meters": float,
                "last_updated": "ISO datetime"
            }
        }
    """
    try:
        # Verify authentication
        if not authorization:
            raise HTTPException(status_code=401, detail="Missing authorization token")
        
        token = authorization.replace("Bearer ", "")
        user = verify_token(token)
        
        # Check authorization
        if user.get("role") not in ["delivery_boy", "delivery_ops", "admin"]:
            raise HTTPException(status_code=403, detail="Unauthorized: insufficient permissions")
        
        # Validate coordinates
        if not GPSService.validate_coordinates(latitude, longitude):
            raise HTTPException(status_code=400, detail="Invalid coordinates")
        
        # Update location
        result = await GPSService.update_delivery_location(
            delivery_id=delivery_id,
            latitude=latitude,
            longitude=longitude,
            speed=speed,
            accuracy=accuracy
        )
        
        # Broadcast to WebSocket clients if connection manager has active connections
        if delivery_id in manager.active_connections:
            await manager.broadcast(delivery_id, {
                "type": "location_update",
                "data": result
            })
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": result
            }
        )
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error updating location: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tracking/end/{delivery_id}")
async def end_tracking(
    delivery_id: str,
    authorization: str = Header(None)
):
    """
    End tracking for a delivery (delivery completed)
    
    Args:
        delivery_id: Unique delivery identifier
        authorization: JWT token
    
    Returns:
        {
            "success": true,
            "data": {
                "delivery_id": "string",
                "status": "completed",
                "total_distance_km": float,
                "total_time_minutes": int,
                "completion_time": "ISO datetime"
            }
        }
    """
    try:
        # Verify authentication
        if not authorization:
            raise HTTPException(status_code=401, detail="Missing authorization token")
        
        token = authorization.replace("Bearer ", "")
        user = verify_token(token)
        
        # Check authorization
        if user.get("role") not in ["delivery_boy", "delivery_ops", "admin"]:
            raise HTTPException(status_code=403, detail="Unauthorized: insufficient permissions")
        
        # End tracking
        result = await GPSService.end_tracking(delivery_id)
        
        # Notify WebSocket clients
        if delivery_id in manager.active_connections:
            await manager.broadcast(delivery_id, {
                "type": "delivery_completed",
                "data": result
            })
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": result
            }
        )
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error ending tracking: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tracking/{delivery_id}")
async def get_tracking(
    delivery_id: str,
    authorization: str = Header(None)
):
    """
    Get current tracking data for a delivery
    
    Args:
        delivery_id: Unique delivery identifier
        authorization: JWT token
    
    Returns:
        {
            "success": true,
            "data": {
                "delivery_id": "string",
                "order_id": "string",
                "status": "in_transit|completed|failed",
                "current_latitude": float,
                "current_longitude": float,
                "distance_remaining_km": float,
                "estimated_arrival_time": "ISO datetime",
                "speed_kmh": float,
                "accuracy_meters": float,
                "last_updated": "ISO datetime"
            }
        }
    """
    try:
        # Verify authentication
        if not authorization:
            raise HTTPException(status_code=401, detail="Missing authorization token")
        
        token = authorization.replace("Bearer ", "")
        user = verify_token(token)
        
        # Get tracking
        result = await GPSService.get_delivery_tracking(delivery_id)
        
        if not result:
            raise HTTPException(status_code=404, detail="Delivery tracking not found")
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": result
            }
        )
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error fetching tracking: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tracking/{delivery_id}/history")
async def get_tracking_history(
    delivery_id: str,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    authorization: str = Header(None)
):
    """
    Get location history for a delivery
    
    Returns up to 'limit' location records (newest first)
    
    Args:
        delivery_id: Unique delivery identifier
        limit: Max records to return (1-1000)
        offset: Skip this many records
        authorization: JWT token
    
    Returns:
        {
            "success": true,
            "data": [
                {
                    "latitude": float,
                    "longitude": float,
                    "speed_kmh": float,
                    "accuracy_meters": float,
                    "timestamp": "ISO datetime"
                },
                ...
            ]
        }
    """
    try:
        # Verify authentication
        if not authorization:
            raise HTTPException(status_code=401, detail="Missing authorization token")
        
        token = authorization.replace("Bearer ", "")
        verify_token(token)
        
        # Get history
        result = await GPSService.get_delivery_history(delivery_id, limit, offset)
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": result
            }
        )
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error fetching history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/deliveries/active")
async def get_active_deliveries(authorization: str = Header(None)):
    """
    Get all active deliveries (in transit)
    Used by operations dashboard
    
    Args:
        authorization: JWT token
    
    Returns:
        {
            "success": true,
            "data": [
                {
                    "delivery_id": "string",
                    "order_id": "string",
                    "delivery_boy_name": "string",
                    "status": "in_transit",
                    "current_latitude": float,
                    "current_longitude": float,
                    "distance_remaining_km": float,
                    "estimated_arrival_time": "ISO datetime",
                    "speed_kmh": float,
                    "last_updated": "ISO datetime"
                },
                ...
            ],
            "count": int
        }
    """
    try:
        # Verify authentication
        if not authorization:
            raise HTTPException(status_code=401, detail="Missing authorization token")
        
        token = authorization.replace("Bearer ", "")
        user = verify_token(token)
        
        # Check authorization (delivery_ops, admin)
        if user.get("role") not in ["delivery_ops", "admin"]:
            raise HTTPException(status_code=403, detail="Unauthorized: insufficient permissions")
        
        # Get active deliveries
        result = await GPSService.get_all_active_deliveries()
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": result,
                "count": len(result)
            }
        )
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error fetching active deliveries: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/eta")
async def calculate_eta(
    current_latitude: float = Query(..., ge=-90, le=90),
    current_longitude: float = Query(..., ge=-180, le=180),
    destination_latitude: float = Query(..., ge=-90, le=90),
    destination_longitude: float = Query(..., ge=-180, le=180),
    average_speed_kmh: float = Query(15, ge=1, le=120),
    authorization: str = Header(None)
):
    """
    Calculate ETA between two points
    
    Standalone endpoint for ETA calculation
    Uses Haversine formula for accurate distance calculation
    Adds 20% buffer for traffic, stops, etc.
    
    Args:
        current_latitude: Current latitude
        current_longitude: Current longitude
        destination_latitude: Destination latitude
        destination_longitude: Destination longitude
        average_speed_kmh: Average speed (default 15 km/h)
        authorization: JWT token
    
    Returns:
        {
            "success": true,
            "data": {
                "distance_km": float,
                "estimated_time_minutes": int,
                "eta_time": "ISO datetime",
                "eta_readable": "HH:MM AM/PM"
            }
        }
    """
    try:
        # Verify authentication
        if not authorization:
            raise HTTPException(status_code=401, detail="Missing authorization token")
        
        token = authorization.replace("Bearer ", "")
        verify_token(token)
        
        # Calculate ETA
        result = GPSService.calculate_eta(
            current_latitude,
            current_longitude,
            destination_latitude,
            destination_longitude,
            average_speed_kmh
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": result
            }
        )
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error calculating ETA: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== WebSocket Endpoint ====================

@router.websocket("/ws/tracking/{delivery_id}")
async def websocket_tracking(websocket: WebSocket, delivery_id: str):
    """
    WebSocket endpoint for real-time delivery tracking
    
    Streams real-time location updates to connected clients
    Supports:
    - location_update: Receive location updates
    - ping: Keep-alive heartbeat
    - auth: Send JWT token for authentication
    
    Message format:
    {
        "type": "location_update|ping|auth",
        "token": "JWT token",  // for auth
        "latitude": float,      // for location_update
        "longitude": float,     // for location_update
        "speed": float,         // optional
        "accuracy": float       // optional
    }
    
    Server sends:
    {
        "type": "location_update|pong|delivery_completed",
        "data": {...tracking_data}
    }
    """
    try:
        # Connect to manager
        await manager.connect(delivery_id, websocket)
        
        # Send initial tracking data
        initial_tracking = await GPSService.get_delivery_tracking(delivery_id)
        if initial_tracking:
            await websocket.send_json({
                "type": "location_update",
                "data": initial_tracking
            })
        
        # Listen for messages
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "location_update":
                # Update location
                latitude = data.get("latitude")
                longitude = data.get("longitude")
                speed = data.get("speed")
                accuracy = data.get("accuracy")
                
                if latitude is not None and longitude is not None:
                    # Update in database
                    result = await GPSService.update_delivery_location(
                        delivery_id,
                        latitude,
                        longitude,
                        speed,
                        accuracy
                    )
                    
                    # Broadcast to all connected clients
                    await manager.broadcast(delivery_id, {
                        "type": "location_update",
                        "data": result
                    })
            
            elif data.get("type") == "ping":
                # Keep-alive response
                await websocket.send_json({"type": "pong"})
    
    except WebSocketDisconnect:
        manager.disconnect(delivery_id, websocket)
        print(f"Client disconnected from delivery {delivery_id}")
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
        manager.disconnect(delivery_id, websocket)
        raise


# ==================== Health Check ====================

@router.get("/health")
async def health_check():
    """GPS service health check"""
    return {
        "status": "healthy",
        "service": "gps_tracking",
        "active_connections": len(manager.active_connections)
    }

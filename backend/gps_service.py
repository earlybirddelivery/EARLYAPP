/**
 * gps_service.py - Real-time GPS tracking service for deliveries
 * Handles location updates, ETA calculation, and distance tracking
 */

from fastapi import APIRouter, WebSocket, Query, Header, HTTPException
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
import math
import json
from database import db
from auth import verify_token
import asyncio

# GPS Service Methods (Business Logic)

class GPSService:
    """Real-time GPS tracking service"""
    
    EARTH_RADIUS_KM = 6371  # For haversine distance calculation
    
    @staticmethod
    def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two coordinates using Haversine formula"""
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        return GPSService.EARTH_RADIUS_KM * c
    
    @staticmethod
    def calculate_eta(
        current_lat: float, 
        current_lon: float,
        destination_lat: float,
        destination_lon: float,
        average_speed_kmh: float = 15
    ) -> Dict[str, Any]:
        """Calculate ETA based on current position and destination"""
        distance_km = GPSService.calculate_distance(
            current_lat, current_lon,
            destination_lat, destination_lon
        )
        
        # Calculate time in minutes
        time_minutes = (distance_km / average_speed_kmh) * 60
        
        # Add buffer for traffic, stops, etc. (20% buffer)
        time_minutes_with_buffer = time_minutes * 1.2
        
        eta_time = datetime.now() + timedelta(minutes=time_minutes_with_buffer)
        
        return {
            "distance_km": round(distance_km, 2),
            "estimated_time_minutes": round(time_minutes_with_buffer),
            "eta_time": eta_time.isoformat(),
            "eta_readable": eta_time.strftime("%I:%M %p")
        }
    
    @staticmethod
    async def update_delivery_location(
        delivery_id: str,
        latitude: float,
        longitude: float,
        speed: Optional[float] = None,
        accuracy: Optional[float] = None
    ) -> Dict[str, Any]:
        """Update delivery location in real-time"""
        
        # Get delivery details
        delivery = await db.delivery_statuses.find_one({"_id": delivery_id})
        if not delivery:
            raise HTTPException(status_code=404, detail="Delivery not found")
        
        # Get destination coordinates (from customer address)
        customer = await db.customers_v2.find_one({"_id": delivery.get("customer_id")})
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        destination_lat = customer.get("latitude", 0)
        destination_lon = customer.get("longitude", 0)
        
        # Calculate ETA
        eta_info = GPSService.calculate_eta(
            latitude, longitude,
            destination_lat, destination_lon
        )
        
        # Update delivery tracking record
        tracking_data = {
            "delivery_id": delivery_id,
            "order_id": delivery.get("order_id"),
            "customer_id": delivery.get("customer_id"),
            "current_latitude": latitude,
            "current_longitude": longitude,
            "speed_kmh": speed,
            "accuracy_meters": accuracy,
            "distance_remaining_km": eta_info["distance_km"],
            "estimated_arrival_time": eta_info["eta_time"],
            "last_updated": datetime.now().isoformat(),
            "status": "in_transit"
        }
        
        # Store in tracking collection
        await db.delivery_tracking.update_one(
            {"delivery_id": delivery_id},
            {"$set": tracking_data},
            upsert=True
        )
        
        # Update delivery status
        await db.delivery_statuses.update_one(
            {"_id": delivery_id},
            {
                "$set": {
                    "current_location": {
                        "latitude": latitude,
                        "longitude": longitude
                    },
                    "eta": eta_info["eta_time"],
                    "distance_remaining_km": eta_info["distance_km"],
                    "last_location_update": datetime.now()
                }
            }
        )
        
        return tracking_data
    
    @staticmethod
    async def get_delivery_tracking(delivery_id: str) -> Optional[Dict[str, Any]]:
        """Get current tracking data for a delivery"""
        tracking = await db.delivery_tracking.find_one({"delivery_id": delivery_id})
        return tracking
    
    @staticmethod
    async def get_all_active_deliveries() -> List[Dict[str, Any]]:
        """Get all active deliveries with current tracking"""
        active_deliveries = await db.delivery_tracking.find({
            "status": "in_transit"
        }).to_list(length=1000)
        return active_deliveries
    
    @staticmethod
    async def start_tracking(delivery_id: str) -> Dict[str, Any]:
        """Start tracking a delivery"""
        tracking = {
            "delivery_id": delivery_id,
            "order_id": "",
            "customer_id": "",
            "current_latitude": 0,
            "current_longitude": 0,
            "status": "pending",
            "created_at": datetime.now().isoformat(),
            "last_updated": datetime.now().isoformat(),
            "total_distance_km": 0,
            "journey_started_at": None,
            "journey_ended_at": None
        }
        
        # Get delivery details
        delivery = await db.delivery_statuses.find_one({"_id": delivery_id})
        if delivery:
            tracking["order_id"] = delivery.get("order_id")
            tracking["customer_id"] = delivery.get("customer_id")
        
        # Insert tracking record
        await db.delivery_tracking.insert_one(tracking)
        
        return tracking
    
    @staticmethod
    async def end_tracking(delivery_id: str) -> Dict[str, Any]:
        """End tracking a delivery"""
        await db.delivery_tracking.update_one(
            {"delivery_id": delivery_id},
            {
                "$set": {
                    "status": "completed",
                    "journey_ended_at": datetime.now().isoformat()
                }
            }
        )
        
        tracking = await db.delivery_tracking.find_one({"delivery_id": delivery_id})
        return tracking
    
    @staticmethod
    async def get_delivery_history(delivery_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get location history for a delivery"""
        history = await db.delivery_location_history.find({
            "delivery_id": delivery_id
        }).sort("timestamp", -1).to_list(length=limit)
        return history


# API Routes

router = APIRouter(prefix="/gps", tags=["GPS Tracking"])


@router.post("/tracking/start/{delivery_id}")
async def start_tracking(
    delivery_id: str,
    authorization: str = Header(None)
):
    """Start tracking a delivery"""
    user = verify_token(authorization)
    
    # Only delivery boys can start their own tracking
    if user["role"] not in ["delivery_boy", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    tracking = await GPSService.start_tracking(delivery_id)
    
    return {
        "success": True,
        "data": tracking,
        "message": "Tracking started"
    }


@router.post("/tracking/update/{delivery_id}")
async def update_delivery_location(
    delivery_id: str,
    latitude: float = Query(...),
    longitude: float = Query(...),
    speed: Optional[float] = Query(None),
    accuracy: Optional[float] = Query(None),
    authorization: str = Header(None)
):
    """
    Update delivery location
    POST /api/gps/tracking/update/{delivery_id}?latitude=28.7041&longitude=77.1025&speed=15&accuracy=5
    """
    user = verify_token(authorization)
    
    # Only delivery boys can update their location
    if user["role"] not in ["delivery_boy", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Validate coordinates
    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        raise HTTPException(status_code=400, detail="Invalid coordinates")
    
    tracking = await GPSService.update_delivery_location(
        delivery_id, latitude, longitude, speed, accuracy
    )
    
    return {
        "success": True,
        "data": tracking,
        "message": "Location updated"
    }


@router.post("/tracking/end/{delivery_id}")
async def end_tracking(
    delivery_id: str,
    authorization: str = Header(None)
):
    """End tracking a delivery"""
    user = verify_token(authorization)
    
    if user["role"] not in ["delivery_boy", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    tracking = await GPSService.end_tracking(delivery_id)
    
    return {
        "success": True,
        "data": tracking,
        "message": "Tracking ended"
    }


@router.get("/tracking/{delivery_id}")
async def get_delivery_tracking(
    delivery_id: str,
    authorization: str = Header(None)
):
    """Get current tracking data for a delivery"""
    user = verify_token(authorization)
    
    # Customer can only see their own delivery
    tracking = await GPSService.get_delivery_tracking(delivery_id)
    
    if not tracking:
        raise HTTPException(status_code=404, detail="Tracking not found")
    
    return {
        "success": True,
        "data": tracking
    }


@router.get("/tracking/{delivery_id}/history")
async def get_delivery_history(
    delivery_id: str,
    limit: int = Query(100),
    authorization: str = Header(None)
):
    """Get location history for a delivery"""
    user = verify_token(authorization)
    
    history = await GPSService.get_delivery_history(delivery_id, limit)
    
    return {
        "success": True,
        "data": history,
        "count": len(history)
    }


@router.get("/deliveries/active")
async def get_active_deliveries(authorization: str = Header(None)):
    """Get all active deliveries"""
    user = verify_token(authorization)
    
    if user["role"] not in ["admin", "delivery_ops"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    deliveries = await GPSService.get_all_active_deliveries()
    
    return {
        "success": True,
        "data": deliveries,
        "count": len(deliveries)
    }


@router.get("/eta")
async def calculate_eta(
    current_latitude: float = Query(...),
    current_longitude: float = Query(...),
    destination_latitude: float = Query(...),
    destination_longitude: float = Query(...),
    average_speed_kmh: float = Query(15),
    authorization: str = Header(None)
):
    """
    Calculate ETA
    GET /api/gps/eta?current_latitude=28.7041&current_longitude=77.1025&destination_latitude=28.7589&destination_longitude=77.0262
    """
    user = verify_token(authorization)
    
    eta_info = GPSService.calculate_eta(
        current_latitude,
        current_longitude,
        destination_latitude,
        destination_longitude,
        average_speed_kmh
    )
    
    return {
        "success": True,
        "data": eta_info
    }


# WebSocket connection manager for real-time updates
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, delivery_id: str, websocket: WebSocket):
        await websocket.accept()
        if delivery_id not in self.active_connections:
            self.active_connections[delivery_id] = []
        self.active_connections[delivery_id].append(websocket)
    
    def disconnect(self, delivery_id: str, websocket: WebSocket):
        if delivery_id in self.active_connections:
            self.active_connections[delivery_id].remove(websocket)
            if not self.active_connections[delivery_id]:
                del self.active_connections[delivery_id]
    
    async def broadcast(self, delivery_id: str, message: dict):
        if delivery_id in self.active_connections:
            for connection in self.active_connections[delivery_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"Error broadcasting: {e}")


manager = ConnectionManager()


@router.websocket("/ws/tracking/{delivery_id}")
async def websocket_tracking(websocket: WebSocket, delivery_id: str):
    """
    WebSocket for real-time tracking updates
    ws://localhost:8000/api/gps/ws/tracking/{delivery_id}
    """
    await manager.connect(delivery_id, websocket)
    
    try:
        while True:
            # Wait for location updates from client
            data = await websocket.receive_json()
            
            if data.get("type") == "location_update":
                # Update location
                tracking = await GPSService.update_delivery_location(
                    delivery_id,
                    data["latitude"],
                    data["longitude"],
                    data.get("speed"),
                    data.get("accuracy")
                )
                
                # Broadcast to all connected clients
                await manager.broadcast(delivery_id, {
                    "type": "location_update",
                    "data": tracking
                })
            
            elif data.get("type") == "ping":
                # Keep-alive ping
                await websocket.send_json({"type": "pong"})
    
    except Exception as e:
        print(f"WebSocket error: {e}")
    
    finally:
        manager.disconnect(delivery_id, websocket)

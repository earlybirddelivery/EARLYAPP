"""
Location Tracking Endpoints - Backend
Handles real-time location updates from delivery boys and marketing staff
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
import logging
import json

from backend.models import Delivery, DeliveryLocation, User, Order
from backend.database import get_db
from backend.auth import verify_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/deliveries", tags=["location"])

# ==================== LOCATION TRACKING ====================

@router.post("/{delivery_id}/location")
async def update_delivery_location(
    delivery_id: int,
    location_data: dict,
    current_user = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """
    Update delivery boy's location
    
    Expected fields:
    - latitude: float
    - longitude: float
    - accuracy: float
    - timestamp: str (ISO datetime)
    """
    try:
        delivery = db.query(Delivery).filter(
            Delivery.id == delivery_id,
            Delivery.deleted_at.is_(None)
        ).first()

        if not delivery:
            raise HTTPException(status_code=404, detail="Delivery not found")

        # Check permission
        if current_user['role'] == 'delivery_boy':
            if delivery.delivery_boy_id != current_user['id']:
                raise HTTPException(status_code=403, detail="Not authorized")

        # Update delivery location
        delivery.current_latitude = location_data.get('latitude')
        delivery.current_longitude = location_data.get('longitude')
        delivery.current_accuracy = location_data.get('accuracy')
        delivery.location_updated_at = datetime.utcnow()
        delivery.status = 'in_progress'

        # Update location history
        location_history = delivery.location_history or []
        location_history.append({
            'latitude': location_data.get('latitude'),
            'longitude': location_data.get('longitude'),
            'accuracy': location_data.get('accuracy'),
            'timestamp': datetime.utcnow().isoformat(),
        })
        delivery.location_history = location_history

        db.add(delivery)
        db.commit()
        db.refresh(delivery)

        logger.info(f"[Location] Delivery {delivery_id} location updated")

        return {
            "success": True,
            "message": "Location updated successfully",
            "delivery": {
                "id": delivery.id,
                "latitude": delivery.current_latitude,
                "longitude": delivery.current_longitude,
                "accuracy": delivery.current_accuracy,
                "updated_at": delivery.location_updated_at.isoformat()
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Location] Error updating location: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{delivery_id}/location/history")
async def get_location_history(
    delivery_id: int,
    current_user = Depends(verify_token),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200)
):
    """
    Get delivery location history
    """
    try:
        delivery = db.query(Delivery).filter(
            Delivery.id == delivery_id,
            Delivery.deleted_at.is_(None)
        ).first()

        if not delivery:
            raise HTTPException(status_code=404, detail="Delivery not found")

        # Get location history
        history = delivery.location_history or []
        # Return latest N locations
        history = history[-limit:]

        return {
            "success": True,
            "delivery_id": delivery_id,
            "total": len(history),
            "locations": history
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Location] Error getting history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== CUSTOMER TRACKING ====================

@router.get("/{delivery_id}/track")
async def track_delivery_for_customer(
    delivery_id: int,
    db: Session = Depends(get_db)
):
    """
    Get delivery tracking info for customers
    Returns: delivery boy location, ETA, order details
    """
    try:
        delivery = db.query(Delivery).filter(
            Delivery.id == delivery_id,
            Delivery.deleted_at.is_(None)
        ).first()

        if not delivery:
            raise HTTPException(status_code=404, detail="Delivery not found")

        # Get delivery boy info
        boy = db.query(User).filter(
            User.id == delivery.delivery_boy_id
        ).first()

        # Get order info
        order = db.query(Order).filter(
            Order.delivery_id == delivery_id
        ).first()

        # Get upcoming deliveries for ETA calculation
        upcoming = db.query(Delivery).filter(
            Delivery.delivery_boy_id == delivery.delivery_boy_id,
            Delivery.status == 'pending',
            Delivery.id != delivery_id,
            Delivery.deleted_at.is_(None)
        ).order_by(Delivery.created_at.asc()).limit(5).all()

        tracking_data = {
            "delivery": {
                "id": delivery.id,
                "status": delivery.status,
                "latitude": delivery.current_latitude,
                "longitude": delivery.current_longitude,
                "accuracy": delivery.current_accuracy,
                "location_updated_at": delivery.location_updated_at.isoformat() if delivery.location_updated_at else None,
                "started_at": delivery.started_at.isoformat() if delivery.started_at else None,
            },
            "delivery_boy": {
                "id": boy.id,
                "name": boy.name,
                "phone": boy.phone,
                "photo": boy.profile_photo,
                "rating": boy.rating or 4.5,
                "reviews": boy.review_count or 0,
            },
            "order": {
                "id": order.id if order else None,
                "delivery_address": order.delivery_address if order else None,
                "delivery_latitude": order.delivery_latitude if order else None,
                "delivery_longitude": order.delivery_longitude if order else None,
                "delivery_notes": order.special_instructions if order else None,
                "items": [
                    {
                        "name": item.get('name'),
                        "quantity": item.get('quantity')
                    }
                    for item in (order.items or [])
                ] if order else [],
                "created_at": order.created_at.isoformat() if order else None,
            },
            "upcoming_stops": [
                {
                    "id": d.id,
                    "latitude": d.current_latitude or d.delivery_latitude,
                    "longitude": d.current_longitude or d.delivery_longitude,
                }
                for d in upcoming
            ]
        }

        return {
            "success": True,
            "tracking": tracking_data
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Track] Error getting tracking info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/boy/{delivery_boy_id}/current")
async def get_delivery_boy_current_location(
    delivery_boy_id: int,
    current_user = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """
    Get current location of a delivery boy
    Only customers/admins/supervisors can view
    """
    try:
        # Check permission
        if current_user['role'] == 'delivery_boy':
            raise HTTPException(status_code=403, detail="Not authorized")

        # Get latest delivery for this boy
        latest_delivery = db.query(Delivery).filter(
            Delivery.delivery_boy_id == delivery_boy_id,
            Delivery.status == 'in_progress',
            Delivery.deleted_at.is_(None)
        ).order_by(Delivery.location_updated_at.desc()).first()

        if not latest_delivery or not latest_delivery.current_latitude:
            return {
                "success": True,
                "location": None,
                "message": "Delivery boy offline or no active delivery"
            }

        return {
            "success": True,
            "delivery_boy_id": delivery_boy_id,
            "location": {
                "latitude": latest_delivery.current_latitude,
                "longitude": latest_delivery.current_longitude,
                "accuracy": latest_delivery.current_accuracy,
                "updated_at": latest_delivery.location_updated_at.isoformat(),
                "speed": latest_delivery.current_speed,
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Track] Error getting boy location: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/area/{area_id}/active")
async def get_active_deliveries_in_area(
    area_id: int,
    current_user = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """
    Get all active deliveries in an area with locations
    For supervisor tracking
    """
    try:
        # Check permission
        if current_user['role'] not in ['supervisor', 'admin']:
            raise HTTPException(status_code=403, detail="Not authorized")

        active_deliveries = db.query(Delivery).filter(
            Delivery.area_id == area_id,
            Delivery.status.in_(['pending', 'in_progress']),
            Delivery.deleted_at.is_(None)
        ).all()

        deliveries_data = []
        for delivery in active_deliveries:
            boy = db.query(User).filter(User.id == delivery.delivery_boy_id).first()
            
            deliveries_data.append({
                "id": delivery.id,
                "status": delivery.status,
                "latitude": delivery.current_latitude,
                "longitude": delivery.current_longitude,
                "accuracy": delivery.current_accuracy,
                "location_updated_at": delivery.location_updated_at.isoformat() if delivery.location_updated_at else None,
                "delivery_boy": {
                    "id": boy.id,
                    "name": boy.name,
                    "phone": boy.phone,
                } if boy else None,
            })

        return {
            "success": True,
            "area_id": area_id,
            "count": len(deliveries_data),
            "deliveries": deliveries_data
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Track] Error getting area deliveries: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== ANALYTICS ====================

@router.get("/{delivery_id}/analytics")
async def get_delivery_analytics(
    delivery_id: int,
    current_user = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """
    Get analytics for a delivery
    Distance traveled, time taken, etc.
    """
    try:
        delivery = db.query(Delivery).filter(
            Delivery.id == delivery_id,
            Delivery.deleted_at.is_(None)
        ).first()

        if not delivery:
            raise HTTPException(status_code=404, detail="Delivery not found")

        # Calculate analytics from location history
        history = delivery.location_history or []
        
        total_distance = 0
        if len(history) > 1:
            for i in range(len(history) - 1):
                loc1 = history[i]
                loc2 = history[i + 1]
                
                # Haversine distance
                from math import radians, cos, sin, asin, sqrt
                lon1, lat1, lon2, lat2 = map(radians, [
                    loc1['longitude'], loc1['latitude'],
                    loc2['longitude'], loc2['latitude']
                ])
                dlat = lat2 - lat1
                dlon = lon2 - lon1
                a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
                c = 2 * asin(sqrt(a))
                r = 6371  # km
                total_distance += c * r

        # Calculate time
        time_taken = None
        if delivery.started_at and delivery.completed_at:
            time_taken = (delivery.completed_at - delivery.started_at).total_seconds() / 60

        # Average speed
        avg_speed = None
        if time_taken and time_taken > 0:
            avg_speed = (total_distance / time_taken) * 60  # km/h

        return {
            "success": True,
            "delivery_id": delivery_id,
            "analytics": {
                "total_distance_km": round(total_distance, 2),
                "time_taken_minutes": time_taken,
                "average_speed_kmh": round(avg_speed, 2) if avg_speed else None,
                "locations_tracked": len(history),
                "status": delivery.status,
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Analytics] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def include_location_routes(app):
    app.include_router(router)

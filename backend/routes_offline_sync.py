"""
Offline Sync Endpoints - Backend
Handles syncing offline operations from delivery boys
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
import logging

# Import models and database
from backend.models import Delivery, Order, Customer, SyncLog
from backend.database import get_db
from backend.auth import verify_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/sync", tags=["sync"])

# ==================== SYNC OPERATIONS ====================

@router.post("/deliveries/{delivery_id}")
async def sync_delivery_update(
    delivery_id: int,
    update_data: dict,
    current_user = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """
    Sync delivery updates from offline delivery boy
    
    Expected fields in update_data:
    - status: str (pending, in_progress, completed, failed)
    - current_latitude: float
    - current_longitude: float
    - current_accuracy: float
    - remarks: list of remarks
    - proof_of_delivery: str (base64 or url)
    - completed_at: str (ISO datetime)
    - offline_updated: bool
    - last_updated_by: int (user id)
    - last_updated_by_role: str (delivery_boy, supervisor, admin)
    """
    try:
        # Verify user has permission to update this delivery
        delivery = db.query(Delivery).filter(
            Delivery.id == delivery_id,
            Delivery.deleted_at.is_(None)
        ).first()
        
        if not delivery:
            raise HTTPException(status_code=404, detail="Delivery not found")
        
        # Check permissions
        if current_user['role'] == 'delivery_boy':
            if delivery.delivery_boy_id != current_user['id']:
                raise HTTPException(status_code=403, detail="Not authorized to update this delivery")
        elif current_user['role'] == 'supervisor':
            if delivery.area_id != current_user['area_id']:
                raise HTTPException(status_code=403, detail="Not authorized for this area")
        # admin can update any delivery
        
        # Apply updates
        for key, value in update_data.items():
            if hasattr(delivery, key) and key != 'id':
                setattr(delivery, key, value)
        
        # Add sync metadata
        delivery.synced_at = datetime.utcnow()
        delivery.synced_by = current_user['id']
        delivery.synced_by_role = current_user['role']
        
        # Track location history if location updated
        if 'current_latitude' in update_data and 'current_longitude' in update_data:
            location_history = delivery.location_history or []
            location_history.append({
                'latitude': update_data['current_latitude'],
                'longitude': update_data['current_longitude'],
                'accuracy': update_data.get('current_accuracy'),
                'timestamp': datetime.utcnow().isoformat(),
                'source': 'offline_sync'
            })
            delivery.location_history = location_history
        
        db.add(delivery)
        db.commit()
        db.refresh(delivery)
        
        # Log sync
        sync_log = SyncLog(
            operation_type='delivery_update',
            entity_type='Delivery',
            entity_id=delivery_id,
            user_id=current_user['id'],
            user_role=current_user['role'],
            data=update_data,
            status='success',
            offline_sync=update_data.get('offline_updated', False)
        )
        db.add(sync_log)
        db.commit()
        
        logger.info(f"[Sync] Delivery {delivery_id} synced by {current_user['id']}")
        
        return {
            "success": True,
            "message": "Delivery updated successfully",
            "delivery": delivery.to_dict()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Sync] Error syncing delivery {delivery_id}: {str(e)}")
        db.rollback()
        
        # Log failed sync
        try:
            sync_log = SyncLog(
                operation_type='delivery_update',
                entity_type='Delivery',
                entity_id=delivery_id,
                user_id=current_user['id'],
                user_role=current_user['role'],
                data=update_data,
                status='failed',
                error=str(e)
            )
            db.add(sync_log)
            db.commit()
        except:
            pass
        
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/orders/{order_id}")
async def sync_order_update(
    order_id: int,
    update_data: dict,
    current_user = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """
    Sync order updates from offline
    """
    try:
        order = db.query(Order).filter(
            Order.id == order_id,
            Order.deleted_at.is_(None)
        ).first()
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Check permissions
        if current_user['role'] == 'delivery_boy':
            # Delivery boy can only update delivery status
            allowed_fields = {'delivery_status', 'delivery_notes'}
            if not set(update_data.keys()).issubset(allowed_fields):
                raise HTTPException(status_code=403, detail="Not authorized for this operation")
        
        # Apply updates
        for key, value in update_data.items():
            if hasattr(order, key) and key != 'id':
                setattr(order, key, value)
        
        order.synced_at = datetime.utcnow()
        db.add(order)
        db.commit()
        db.refresh(order)
        
        logger.info(f"[Sync] Order {order_id} synced by {current_user['id']}")
        
        return {
            "success": True,
            "message": "Order updated successfully",
            "order": order.to_dict()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Sync] Error syncing order {order_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch-sync")
async def batch_sync(
    operations: List[dict],
    current_user = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """
    Sync multiple operations at once (optimized for batch syncs)
    
    operations format:
    [
        {
            "type": "delivery_update",
            "id": 123,
            "data": {...}
        }
    ]
    """
    results = {
        "total": len(operations),
        "success": 0,
        "failed": 0,
        "errors": []
    }
    
    for i, operation in enumerate(operations):
        try:
            op_type = operation.get('type')
            entity_id = operation.get('id')
            data = operation.get('data', {})
            
            if op_type == 'delivery_update':
                delivery = db.query(Delivery).filter(
                    Delivery.id == entity_id,
                    Delivery.deleted_at.is_(None)
                ).first()
                
                if not delivery:
                    results['failed'] += 1
                    results['errors'].append(f"Op {i}: Delivery {entity_id} not found")
                    continue
                
                # Update delivery
                for key, value in data.items():
                    if hasattr(delivery, key) and key != 'id':
                        setattr(delivery, key, value)
                
                delivery.synced_at = datetime.utcnow()
                db.add(delivery)
                results['success'] += 1
                
            elif op_type == 'order_update':
                order = db.query(Order).filter(
                    Order.id == entity_id,
                    Order.deleted_at.is_(None)
                ).first()
                
                if not order:
                    results['failed'] += 1
                    results['errors'].append(f"Op {i}: Order {entity_id} not found")
                    continue
                
                for key, value in data.items():
                    if hasattr(order, key) and key != 'id':
                        setattr(order, key, value)
                
                order.synced_at = datetime.utcnow()
                db.add(order)
                results['success'] += 1
        
        except Exception as e:
            results['failed'] += 1
            results['errors'].append(f"Op {i}: {str(e)}")
    
    db.commit()
    
    logger.info(f"[Sync] Batch sync completed: {results['success']} succeeded, {results['failed']} failed")
    
    return results


# ==================== FETCH OPERATIONS ====================

@router.get("/deliveries")
async def fetch_deliveries_for_sync(
    current_user = Depends(verify_token),
    db: Session = Depends(get_db),
    limit: int = Query(100, ge=1, le=500),
    since: Optional[str] = None
):
    """
    Fetch deliveries for offline caching
    Respects user role and permissions
    """
    try:
        query = db.query(Delivery).filter(Delivery.deleted_at.is_(None))
        
        # Filter by role
        if current_user['role'] == 'delivery_boy':
            query = query.filter(Delivery.delivery_boy_id == current_user['id'])
        elif current_user['role'] == 'supervisor':
            query = query.filter(Delivery.area_id == current_user['area_id'])
        # admin sees all
        
        # Filter by timestamp if provided
        if since:
            since_dt = datetime.fromisoformat(since)
            query = query.filter(Delivery.updated_at >= since_dt)
        
        deliveries = query.order_by(Delivery.created_at.desc()).limit(limit).all()
        
        return {
            "success": True,
            "count": len(deliveries),
            "deliveries": [d.to_dict() for d in deliveries]
        }
    except Exception as e:
        logger.error(f"[Sync] Error fetching deliveries: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/orders")
async def fetch_orders_for_sync(
    current_user = Depends(verify_token),
    db: Session = Depends(get_db),
    limit: int = Query(100, ge=1, le=500),
    since: Optional[str] = None
):
    """
    Fetch orders for offline caching
    """
    try:
        query = db.query(Order).filter(Order.deleted_at.is_(None))
        
        # Filter based on role
        if current_user['role'] == 'delivery_boy':
            # Only orders assigned to this delivery boy's deliveries
            query = query.join(Delivery).filter(
                Delivery.delivery_boy_id == current_user['id']
            )
        elif current_user['role'] == 'supervisor':
            query = query.join(Delivery).filter(
                Delivery.area_id == current_user['area_id']
            )
        
        if since:
            since_dt = datetime.fromisoformat(since)
            query = query.filter(Order.updated_at >= since_dt)
        
        orders = query.order_by(Order.created_at.desc()).limit(limit).all()
        
        return {
            "success": True,
            "count": len(orders),
            "orders": [o.to_dict() for o in orders]
        }
    except Exception as e:
        logger.error(f"[Sync] Error fetching orders: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== SYNC STATUS ====================

@router.get("/status")
async def get_sync_status(
    current_user = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """
    Get user's sync status and pending operations count
    """
    try:
        # Get pending deliveries
        pending_deliveries = db.query(Delivery).filter(
            Delivery.synced_at.is_(None),
            Delivery.delivery_boy_id == current_user['id'],
            Delivery.deleted_at.is_(None)
        ).count()
        
        # Get sync logs
        sync_logs = db.query(SyncLog).filter(
            SyncLog.user_id == current_user['id']
        ).order_by(SyncLog.created_at.desc()).limit(10).all()
        
        return {
            "success": True,
            "pending_operations": pending_deliveries,
            "last_sync": sync_logs[0].created_at if sync_logs else None,
            "recent_syncs": [
                {
                    "operation": log.operation_type,
                    "entity": f"{log.entity_type}#{log.entity_id}",
                    "status": log.status,
                    "timestamp": log.created_at.isoformat()
                }
                for log in sync_logs
            ]
        }
    except Exception as e:
        logger.error(f"[Sync] Error getting status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Register router in main app
def include_sync_routes(app):
    app.include_router(router)

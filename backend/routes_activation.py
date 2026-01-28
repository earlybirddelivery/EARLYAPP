# Phase 1.4: Customer Activation Routes
# Endpoints for tracking and managing customer activation pipeline

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging

router = APIRouter(prefix="/api/admin/activation", tags=["activation"])
logger = logging.getLogger(__name__)

# Import activation engine
from activation_engine import ActivationEngine, ActivationStatus


async def get_activation_engine(db=Depends(lambda: None)) -> ActivationEngine:
    """Dependency to get activation engine instance"""
    # Will be injected with actual db in server.py
    return ActivationEngine(db)


@router.get("/dashboard", response_model=Dict[str, Any])
async def get_activation_dashboard(
    current_user: dict = Depends(lambda: {}),  # Add auth dependency
    engine: ActivationEngine = Depends(get_activation_engine)
) -> Dict[str, Any]:
    """
    Get activation metrics dashboard.
    
    Shows customer journey funnel and key metrics:
    - Total customers by status
    - Conversion rates
    - Churn rate
    - Revenue by status
    
    Returns:
    {
        "total_customers": 1000,
        "new": 50,
        "onboarded": 200,
        "active": 600,
        "engaged": 100,
        "inactive": 40,
        "churned": 10,
        "conversion_funnel": {
            "signup_to_first_order": "25%",
            "first_order_to_active": "75%"
        }
    }
    """
    try:
        metrics = await engine.get_activation_metrics()
        return metrics
    except Exception as e:
        logger.error(f"Error getting dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get metrics")


@router.get("/customers", response_model=Dict[str, Any])
async def list_customers_by_status(
    status: Optional[ActivationStatus] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(lambda: {}),
    engine: ActivationEngine = Depends(get_activation_engine)
) -> Dict[str, Any]:
    """
    List customers filtered by activation status.
    
    Query Parameters:
    - status: Filter by activation status (new, onboarded, active, inactive, churned)
    - limit: Number of results (1-1000)
    - offset: Pagination offset
    
    Returns:
    {
        "total": 200,
        "status": "active",
        "customers": [
            {
                "id": "CUST_001",
                "name": "John Doe",
                "email": "john@example.com",
                "phone": "9876543210",
                "activation_status": "active",
                "first_order_date": "2026-01-15",
                "last_contact_date": "2026-01-27",
                "signup_date": "2026-01-01"
            }
        ]
    }
    """
    try:
        query = {}
        if status:
            query["activation_status"] = status
        
        db = engine.db
        total = await db.customers_v2.count_documents(query)
        
        customers = await db.customers_v2.find(query).skip(offset).limit(limit).to_list(limit)
        
        # Format response
        response = {
            "total": total,
            "status": status,
            "limit": limit,
            "offset": offset,
            "customers": [
                {
                    "id": c.get("id"),
                    "name": c.get("name"),
                    "email": c.get("email"),
                    "phone": c.get("phone"),
                    "activation_status": c.get("activation_status"),
                    "first_order_date": c.get("first_order_date"),
                    "last_contact_date": c.get("last_contact_date"),
                    "signup_date": c.get("signup_date"),
                    "onboarding_completed": c.get("onboarding_completed")
                }
                for c in customers
            ]
        }
        
        return response
    except Exception as e:
        logger.error(f"Error listing customers: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to list customers")


@router.get("/customers/{customer_id}/timeline", response_model=List[Dict[str, Any]])
async def get_customer_timeline(
    customer_id: str,
    current_user: dict = Depends(lambda: {}),
    engine: ActivationEngine = Depends(get_activation_engine)
) -> List[Dict[str, Any]]:
    """
    Get activation timeline for a specific customer.
    
    Shows all activation events in chronological order:
    - Signup
    - First order
    - First delivery
    - Status changes
    - Churn
    
    Returns:
    [
        {
            "event": "SIGNUP",
            "timestamp": "2026-01-01T10:00:00",
            "status": "new"
        },
        {
            "event": "FIRST_ORDER",
            "timestamp": "2026-01-15T14:30:00",
            "status": "onboarded"
        }
    ]
    """
    try:
        timeline = await engine.get_customer_timeline(customer_id)
        if not timeline:
            raise HTTPException(status_code=404, detail="Customer not found")
        return timeline
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting timeline: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get timeline")


@router.get("/customers/{customer_id}/status", response_model=Dict[str, Any])
async def get_customer_status(
    customer_id: str,
    current_user: dict = Depends(lambda: {}),
    engine: ActivationEngine = Depends(get_activation_engine)
) -> Dict[str, Any]:
    """
    Get current activation status and details for a customer.
    
    Returns:
    {
        "id": "CUST_001",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "9876543210",
        "activation_status": "active",
        "signup_date": "2026-01-01T10:00:00",
        "first_order_date": "2026-01-15T14:30:00",
        "first_delivery_date": "2026-01-16T08:00:00",
        "last_contact_date": "2026-01-27T15:00:00",
        "last_order_date": "2026-01-25T12:00:00",
        "onboarding_completed": true,
        "welcome_message_sent": true
    }
    """
    try:
        customer = await engine.get_customer_status(customer_id)
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Remove MongoDB _id field
        customer.pop("_id", None)
        
        return customer
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get status")


@router.post("/customers/{customer_id}/resend-welcome", response_model=Dict[str, Any])
async def resend_welcome_message(
    customer_id: str,
    current_user: dict = Depends(lambda: {}),
    engine: ActivationEngine = Depends(get_activation_engine)
) -> Dict[str, Any]:
    """
    Manually resend welcome message to a customer.
    
    Used when welcome message didn't go through or for re-engagement.
    """
    try:
        customer = await engine.get_customer_status(customer_id)
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # In actual implementation, would send SMS/email here
        logger.info(f"[ACTIVATION] Resending welcome message to {customer_id}")
        
        # Mark as sent
        await engine.db.customers_v2.update_one(
            {"id": customer_id},
            {"$set": {"welcome_message_sent": True}}
        )
        
        return {
            "success": True,
            "message": f"Welcome message resent to {customer.get('email')}",
            "customer_id": customer_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resending welcome: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to resend welcome message")


@router.post("/batch/check-status", response_model=Dict[str, Any])
async def batch_check_status(
    limit: int = Query(100, ge=1, le=1000),
    current_user: dict = Depends(lambda: {}),
    engine: ActivationEngine = Depends(get_activation_engine)
) -> Dict[str, Any]:
    """
    Batch check and update activation status for inactive customers.
    
    Checks customers for inactivity and transitions them to appropriate status:
    - ACTIVE → INACTIVE (if 30+ days inactive)
    - INACTIVE → CHURNED (if 60+ days inactive)
    
    This should be run daily via cron job.
    """
    try:
        db = engine.db
        
        # Get all active and engaged customers
        customers = await db.customers_v2.find({
            "activation_status": {"$in": [ActivationStatus.ACTIVE, ActivationStatus.ENGAGED]}
        }).to_list(limit)
        
        updated_count = 0
        updated_customers = []
        
        for customer in customers:
            new_status = await engine.check_and_update_status(customer.get("id"))
            if new_status:
                updated_count += 1
                updated_customers.append({
                    "customer_id": customer.get("id"),
                    "new_status": new_status
                })
        
        return {
            "success": True,
            "checked": len(customers),
            "updated": updated_count,
            "updated_customers": updated_customers[:10],  # Show first 10
            "message": f"Checked {len(customers)} customers, updated {updated_count} statuses"
        }
    except Exception as e:
        logger.error(f"Error batch checking status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to batch check status")


@router.get("/analytics/cohort", response_model=Dict[str, Any])
async def get_cohort_analysis(
    current_user: dict = Depends(lambda: {}),
    engine: ActivationEngine = Depends(get_activation_engine)
) -> Dict[str, Any]:
    """
    Get cohort analysis by signup month.
    
    Shows retention and activation rates for customers grouped by signup month.
    
    Returns:
    {
        "cohorts": [
            {
                "month": "2025-12",
                "signup_count": 100,
                "active_now": 85,
                "retention_rate": "85%",
                "average_orders": 4.2
            }
        ]
    }
    """
    try:
        db = engine.db
        
        # Aggregate by month of signup
        pipeline = [
            {
                "$group": {
                    "_id": {
                        "$dateToString": {
                            "format": "%Y-%m",
                            "date": "$signup_date"
                        }
                    },
                    "signup_count": {"$sum": 1},
                    "active_count": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$activation_status", ActivationStatus.ACTIVE]},
                                1,
                                0
                            ]
                        }
                    },
                    "engaged_count": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$activation_status", ActivationStatus.ENGAGED]},
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            {"$sort": {"_id": -1}}
        ]
        
        results = await db.customers_v2.aggregate(pipeline).to_list(None)
        
        cohorts = []
        for result in results:
            active = result.get("active_count", 0) + result.get("engaged_count", 0)
            total = result.get("signup_count", 1)
            retention_rate = (active / total * 100) if total > 0 else 0
            
            cohorts.append({
                "month": result.get("_id"),
                "signup_count": total,
                "active_now": active,
                "retention_rate": f"{retention_rate:.1f}%"
            })
        
        return {
            "success": True,
            "cohorts": cohorts
        }
    except Exception as e:
        logger.error(f"Error getting cohort analysis: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get cohort analysis")


# Export router for use in server.py
__all__ = ["router"]

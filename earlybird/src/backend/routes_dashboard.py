#!/usr/bin/env python3
"""
Dashboard API Routes for EarlyBird Admin Portal
Provides customer stats, delivery stats, and other dashboard data
"""

from fastapi import APIRouter, HTTPException, Header
from typing import Optional, List, Dict, Any
from datetime import datetime, date

router = APIRouter(prefix="", tags=["Dashboard"])

# Mock data storage (would be database in production)
dashboard_data = {
    "customers": {
        "total": 225,
        "active": 225,
        "trial": 0,
        "inactive": 0,
        "totalRevenue": 125300,
        "avgLifetimeValue": 556
    },
    "areas": {
        "count": 53,
        "topAreas": ["Downtown", "Uptown", "Midtown", "Lakeside", "Riverside"]
    },
    "delivery": {
        "count": 5,
        "boys": ["Boy 1", "Boy 2", "Boy 3", "Boy 4", "Boy 5"]
    },
    "marketing": {
        "count": 10,
        "staff": []
    }
}

customers_db = []

# ==================== STATS ENDPOINTS ====================

@router.get("/api/stats")
async def get_dashboard_stats(authorization: Optional[str] = Header(None)):
    """Get dashboard statistics"""
    return {
        "success": True,
        "data": dashboard_data
    }

@router.get("/api/customers")
async def get_customers(
    limit: int = 50,
    offset: int = 0,
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """Get customers list with pagination"""
    try:
        import json
        from pathlib import Path
        
        # Try to load from localStorage simulation (in real app would use DB)
        # For now, return sample data
        customers = [
            {
                "id": f"cust_{i:03d}",
                "name": f"Customer {i}",
                "email": f"customer{i}@example.com",
                "phone": f"98765432{i:02d}",
                "area": ["Downtown", "Uptown", "Midtown", "Lakeside"][i % 4],
                "status": "active" if i % 10 != 0 else "trial",
                "lifetimeValue": 500 + (i * 10)
            }
            for i in range(1, 226)
        ]
        
        return {
            "success": True,
            "data": customers[offset:offset+limit],
            "total": len(customers),
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "data": []
        }

@router.get("/api/delivery-stats")
async def get_delivery_stats(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    shift: Optional[str] = None,
    delivery_boy: Optional[str] = None,
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """Get delivery statistics with filters"""
    
    filters = {
        "from_date": from_date,
        "to_date": to_date,
        "shift": shift,
        "delivery_boy": delivery_boy
    }
    
    return {
        "success": True,
        "data": {
            "filters": filters,
            "stats": {
                "totalDeliveries": 1250,
                "completedDeliveries": 1200,
                "pendingDeliveries": 50,
                "failedDeliveries": 0,
                "averageTimePerDelivery": 25,  # minutes
                "totalDistance": 450  # km
            },
            "deliveryBoys": [
                {
                    "id": f"boy_{i}",
                    "name": f"Delivery Boy {i}",
                    "deliveries": 250 - (i * 10),
                    "completionRate": 95 + (i * 0.5)
                }
                for i in range(1, 6)
            ]
        }
    }

@router.get("/api/summary")
async def get_dashboard_summary(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Get complete dashboard summary"""
    return {
        "success": True,
        "data": {
            "date": datetime.now().isoformat(),
            "customers": {
                "total": 225,
                "active": 225,
                "trial": 0,
                "byArea": [
                    {"area": "Downtown", "count": 45},
                    {"area": "Uptown", "count": 38},
                    {"area": "Midtown", "count": 52},
                    {"area": "Lakeside", "count": 40},
                    {"area": "Riverside", "count": 50}
                ]
            },
            "delivery": {
                "totalDeliveries": 1250,
                "completedToday": 120,
                "pendingToday": 30,
                "deliveryBoys": 5,
                "averageDeliveriesPerBoy": 24
            },
            "orders": {
                "totalOrders": 2100,
                "ordersToday": 150,
                "pendingOrders": 45,
                "averageOrderValue": 350
            },
            "revenue": {
                "totalRevenue": 735000,
                "revenueToday": 52500,
                "revenueThisMonth": 1575000
            }
        }
    }

@router.get("/api/areas")
async def get_areas(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Get areas data"""
    return {
        "success": True,
        "data": [
            {"id": f"area_{i}", "name": area, "customers": count, "deliveries": count * 2}
            for i, (area, count) in enumerate([
                ("Downtown", 45),
                ("Uptown", 38),
                ("Midtown", 52),
                ("Lakeside", 40),
                ("Riverside", 50),
                ("East End", 0),  # No area
            ])
        ]
    }

@router.get("/api/pending-requests")
async def get_pending_requests(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Get pending requests/approvals"""
    return {
        "success": True,
        "data": [
            {
                "id": "req_001",
                "type": "customer_registration",
                "customer": "New Customer Inc",
                "createdAt": datetime.now().isoformat(),
                "status": "pending"
            }
        ],
        "count": 1
    }

@router.get("/api/deleted-records")
async def get_deleted_records(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Get deleted records"""
    return {
        "success": True,
        "data": [],
        "count": 0
    }

# ==================== HEALTH CHECK ====================

@router.get("/api/health")
async def health_check() -> Dict[str, Any]:
    """Health check for dashboard API"""
    return {
        "success": True,
        "status": "Dashboard API healthy",
        "timestamp": datetime.now().isoformat()
    }

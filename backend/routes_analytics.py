"""
routes_analytics.py - Analytics API endpoints
Provides comprehensive business analytics and reporting
"""

from fastapi import APIRouter, Header, HTTPException, Query
from analytics_engine import AnalyticsEngine
from auth import verify_token

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


# ==================== REVENUE ANALYTICS ====================

@router.get("/revenue")
async def get_revenue_analytics(
    start_date: str = Query(None),
    end_date: str = Query(None),
    authorization: str = Header(None)
):
    """
    Get revenue analytics overview
    
    Query Parameters:
    - start_date: ISO format date (default: 30 days ago)
    - end_date: ISO format date (default: today)
    
    Returns: Revenue overview with daily breakdown
    """
    try:
        user = verify_token(authorization)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or missing authentication")

        # Check admin role
        if user.get("role") not in ["admin", "superadmin"]:
            raise HTTPException(status_code=403, detail="Admin access required")

        analytics = AnalyticsEngine()
        revenue_data = await analytics.get_revenue_overview(start_date, end_date)

        return {
            "success": True,
            "data": revenue_data
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== CUSTOMER ANALYTICS ====================

@router.get("/customers")
async def get_customer_analytics(
    start_date: str = Query(None),
    end_date: str = Query(None),
    authorization: str = Header(None)
):
    """
    Get customer metrics and insights
    
    Query Parameters:
    - start_date: ISO format date
    - end_date: ISO format date
    
    Returns: Customer metrics including retention, LTV, segments
    """
    try:
        user = verify_token(authorization)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or missing authentication")

        if user.get("role") not in ["admin", "superadmin"]:
            raise HTTPException(status_code=403, detail="Admin access required")

        analytics = AnalyticsEngine()
        customer_data = await analytics.get_customer_metrics(start_date, end_date)

        return {
            "success": True,
            "data": customer_data
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== DELIVERY ANALYTICS ====================

@router.get("/delivery")
async def get_delivery_analytics(
    start_date: str = Query(None),
    end_date: str = Query(None),
    authorization: str = Header(None)
):
    """
    Get delivery performance metrics
    
    Query Parameters:
    - start_date: ISO format date
    - end_date: ISO format date
    
    Returns: Delivery metrics including on-time rate, performance by driver
    """
    try:
        user = verify_token(authorization)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or missing authentication")

        if user.get("role") not in ["admin", "superadmin", "delivery_ops"]:
            raise HTTPException(status_code=403, detail="Authorization required")

        analytics = AnalyticsEngine()
        delivery_data = await analytics.get_delivery_metrics(start_date, end_date)

        return {
            "success": True,
            "data": delivery_data
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== INVENTORY ANALYTICS ====================

@router.get("/inventory")
async def get_inventory_analytics(authorization: str = Header(None)):
    """
    Get inventory insights and management metrics
    
    Returns: Inventory insights including low stock, bestsellers, stockout risk
    """
    try:
        user = verify_token(authorization)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or missing authentication")

        if user.get("role") not in ["admin", "superadmin", "inventory_manager"]:
            raise HTTPException(status_code=403, detail="Authorization required")

        analytics = AnalyticsEngine()
        inventory_data = await analytics.get_inventory_insights()

        return {
            "success": True,
            "data": inventory_data
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== DASHBOARD (Combined) ====================

@router.get("/dashboard")
async def get_full_dashboard(
    start_date: str = Query(None),
    end_date: str = Query(None),
    authorization: str = Header(None)
):
    """
    Get complete analytics dashboard (all metrics combined)
    
    Returns: Comprehensive dashboard data
    """
    try:
        user = verify_token(authorization)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or missing authentication")

        if user.get("role") not in ["admin", "superadmin"]:
            raise HTTPException(status_code=403, detail="Admin access required")

        analytics = AnalyticsEngine()

        # Get all analytics data
        revenue = await analytics.get_revenue_overview(start_date, end_date)
        customers = await analytics.get_customer_metrics(start_date, end_date)
        delivery = await analytics.get_delivery_metrics(start_date, end_date)
        inventory = await analytics.get_inventory_insights()

        return {
            "success": True,
            "data": {
                "revenue": revenue,
                "customers": customers,
                "delivery": delivery,
                "inventory": inventory,
                "generated_at": __import__('datetime').datetime.now().isoformat()
            }
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== EXPORTS ====================

@router.get("/export/revenue/{format}")
async def export_revenue_report(
    format: str,
    start_date: str = Query(None),
    end_date: str = Query(None),
    authorization: str = Header(None)
):
    """
    Export revenue report in specified format
    
    Path Parameters:
    - format: csv, json, excel, pdf, html
    
    Returns: File in requested format
    """
    try:
        user = verify_token(authorization)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or missing authentication")

        if user.get("role") not in ["admin", "superadmin"]:
            raise HTTPException(status_code=403, detail="Admin access required")

        analytics = AnalyticsEngine()
        revenue_data = await analytics.get_revenue_overview(start_date, end_date)

        if format not in ["csv", "json", "excel", "pdf", "html"]:
            raise HTTPException(status_code=400, detail="Invalid format. Use: csv, json, excel, pdf, html")

        if format == "csv":
            content = AnalyticsEngine.generate_csv_export(revenue_data, "revenue")
            return {
                "success": True,
                "format": "csv",
                "data": content
            }

        elif format == "json":
            content = AnalyticsEngine.generate_json_export(revenue_data)
            return {
                "success": True,
                "format": "json",
                "data": content
            }

        elif format == "html":
            content = AnalyticsEngine.generate_html_export(revenue_data, "revenue")
            return {
                "success": True,
                "format": "html",
                "data": content
            }

        elif format == "excel":
            content = AnalyticsEngine.generate_excel_export(revenue_data, "revenue")
            return {
                "success": True,
                "format": "excel",
                "data": content.hex()  # Convert bytes to hex for JSON serialization
            }

        elif format == "pdf":
            content = AnalyticsEngine.generate_pdf_export(revenue_data, "revenue")
            return {
                "success": True,
                "format": "pdf",
                "data": content.hex()  # Convert bytes to hex for JSON serialization
            }

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export/customers/{format}")
async def export_customer_report(
    format: str,
    start_date: str = Query(None),
    end_date: str = Query(None),
    authorization: str = Header(None)
):
    """
    Export customer report in specified format
    
    Path Parameters:
    - format: csv, json, excel, pdf, html
    """
    try:
        user = verify_token(authorization)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or missing authentication")

        if user.get("role") not in ["admin", "superadmin"]:
            raise HTTPException(status_code=403, detail="Admin access required")

        analytics = AnalyticsEngine()
        customer_data = await analytics.get_customer_metrics(start_date, end_date)

        if format not in ["csv", "json", "excel", "pdf", "html"]:
            raise HTTPException(status_code=400, detail="Invalid format")

        if format == "csv":
            content = AnalyticsEngine.generate_csv_export(customer_data, "customers")
        elif format == "json":
            content = AnalyticsEngine.generate_json_export(customer_data)
        elif format == "html":
            content = AnalyticsEngine.generate_html_export(customer_data, "customers")
        else:
            raise HTTPException(status_code=400, detail="Format not yet implemented")

        return {
            "success": True,
            "format": format,
            "data": content
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export/delivery/{format}")
async def export_delivery_report(
    format: str,
    start_date: str = Query(None),
    end_date: str = Query(None),
    authorization: str = Header(None)
):
    """
    Export delivery report in specified format
    
    Path Parameters:
    - format: csv, json, excel, pdf, html
    """
    try:
        user = verify_token(authorization)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or missing authentication")

        if user.get("role") not in ["admin", "superadmin", "delivery_ops"]:
            raise HTTPException(status_code=403, detail="Authorization required")

        analytics = AnalyticsEngine()
        delivery_data = await analytics.get_delivery_metrics(start_date, end_date)

        if format not in ["csv", "json", "excel", "pdf", "html"]:
            raise HTTPException(status_code=400, detail="Invalid format")

        if format == "json":
            content = AnalyticsEngine.generate_json_export(delivery_data)
        elif format == "html":
            content = AnalyticsEngine.generate_html_export(delivery_data, "delivery")
        else:
            raise HTTPException(status_code=400, detail="Format not yet implemented")

        return {
            "success": True,
            "format": format,
            "data": content
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== SUMMARIES ====================

@router.get("/summary")
async def get_analytics_summary(authorization: str = Header(None)):
    """
    Get high-level summary of all metrics (for dashboard cards)
    
    Returns: Key metrics summary for quick overview
    """
    try:
        user = verify_token(authorization)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or missing authentication")

        if user.get("role") not in ["admin", "superadmin"]:
            raise HTTPException(status_code=403, detail="Admin access required")

        analytics = AnalyticsEngine()

        # Get last 30 days data
        revenue = await analytics.get_revenue_overview()
        customers = await analytics.get_customer_metrics()
        delivery = await analytics.get_delivery_metrics()

        return {
            "success": True,
            "summary": {
                "total_revenue": revenue.get("total_revenue", 0),
                "total_orders": revenue.get("total_orders", 0),
                "average_order_value": revenue.get("average_order_value", 0),
                "total_customers": customers.get("total_customers", 0),
                "new_customers": customers.get("new_customers", 0),
                "repeat_customers": customers.get("repeat_customers", 0),
                "customer_retention": customers.get("customer_retention", 0),
                "total_deliveries": delivery.get("total_deliveries", 0),
                "on_time_delivery": delivery.get("on_time_delivery_percentage", 0),
                "delivery_success_rate": (delivery.get("delivered", 0) / delivery.get("total_deliveries", 1) * 100) if delivery.get("total_deliveries", 0) > 0 else 0
            }
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

"""
Advanced Search & Filtering API Routes
REST endpoints for search, filters, facets, saved searches, analytics

Endpoints:
- POST /api/search - Execute search
- GET /api/search/suggestions - Get autocomplete suggestions
- GET /api/search/trending - Get trending searches
- POST /api/search/filters - Get available filters
- POST /api/saved-searches - Save search
- GET /api/saved-searches - List saved searches
- GET /api/saved-searches/{id} - Load saved search
- DELETE /api/saved-searches/{id} - Delete saved search
- GET /api/search/analytics - Search analytics
- POST /api/search/export - Export results
"""

from fastapi import APIRouter, Query, Body, HTTPException, Depends
from fastapi.responses import StreamingResponse
import io
import csv
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any

from models import UserAuth, get_current_user
from database import get_database
from search_service import (
    SearchManager, SearchQuery, SearchType, SearchResponse,
    FilterOperator, SortOrder, get_search_manager
)

router = APIRouter(prefix="/api/search", tags=["search"])


@router.post("/search")
async def execute_search(
    query: SearchQuery,
    current_user: UserAuth = Depends(get_current_user),
    db = Depends(get_database)
) -> SearchResponse:
    """
    Execute advanced search with filters, sorting, and pagination
    
    Args:
        query: SearchQuery with search text, filters, sorting
        
    Returns:
        SearchResponse with results, facets, suggestions, analytics
        
    Example:
        {
            "search_type": "orders",
            "query": "deli",
            "filters": {
                "status": "DELIVERED",
                "created_at": {
                    "operator": "gte",
                    "value": "2026-01-20"
                }
            },
            "sort_by": "created_at",
            "sort_order": "desc",
            "page": 1,
            "page_size": 20,
            "facets": ["status", "category"]
        }
    """
    search_manager = get_search_manager(db)
    
    try:
        results = await search_manager.search(query, user_id=current_user.user_id)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggestions")
async def get_suggestions(
    search_type: SearchType = Query(..., description="Type of search (orders, products, etc)"),
    partial: str = Query("", description="Partial query for autocomplete"),
    current_user: UserAuth = Depends(get_current_user),
    db = Depends(get_database)
) -> List[str]:
    """
    Get search suggestions/autocomplete
    
    Args:
        search_type: Type of entity to search
        partial: Partial query string for matching
        
    Returns:
        List of suggestions matching the partial query
        
    Example:
        GET /api/search/suggestions?search_type=orders&partial=del
        Response: ["delhi delivery", "delivery address"]
    """
    search_manager = get_search_manager(db)
    
    try:
        # Build temporary query for suggestions
        query = SearchQuery(
            search_type=search_type,
            query=partial
        )
        suggestions = await search_manager._get_suggestions(partial, search_type)
        return suggestions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trending")
async def get_trending_searches(
    search_type: Optional[SearchType] = Query(None, description="Filter by search type"),
    days: int = Query(7, ge=1, le=30, description="Days to analyze"),
    current_user: UserAuth = Depends(get_current_user),
    db = Depends(get_database)
) -> List[Dict]:
    """
    Get trending searches
    
    Args:
        search_type: Optional filter for specific entity type
        days: Number of days to analyze (1-30)
        
    Returns:
        List of trending searches with counts
        
    Example:
        GET /api/search/trending?search_type=orders&days=7
        Response: [
            {"_id": "delhi", "count": 45, "avg_time_ms": 125.3},
            {"_id": "pending", "count": 38, "avg_time_ms": 98.2}
        ]
    """
    search_manager = get_search_manager(db)
    
    try:
        trending = await search_manager.get_trending_searches(search_type, days)
        return trending
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/filters")
async def get_available_filters(
    search_type: SearchType = Body(..., embed=True, description="Type of search"),
    current_user: UserAuth = Depends(get_current_user),
    db = Depends(get_database)
) -> Dict[str, List]:
    """
    Get available filters and their possible values for search type
    
    Args:
        search_type: Type of entity (orders, products, etc)
        
    Returns:
        Dict of filter fields and their available values
        
    Example:
        POST /api/search/filters
        Body: {"search_type": "orders"}
        Response: {
            "status": ["PENDING", "CONFIRMED", "DELIVERED", "CANCELLED"],
            "payment_method": ["CASH", "CARD", "UPI", "WALLET"],
            "city": ["Delhi", "Mumbai", "Bangalore"]
        }
    """
    filters = {}
    
    if search_type == SearchType.ORDERS:
        filters = {
            "status": ["PENDING", "CONFIRMED", "DELIVERED", "CANCELLED"],
            "payment_method": ["CASH", "CARD", "UPI", "WALLET"],
            "payment_status": ["UNPAID", "PAID", "REFUNDED"],
            "order_type": ["subscription", "one-time"]
        }
    elif search_type == SearchType.PRODUCTS:
        filters = {
            "category": ["Fresh Produce", "Dairy", "Snacks", "Beverages", "Essentials"],
            "in_stock": [True, False],
            "price_range": ["0-100", "100-500", "500-1000", "1000+"]
        }
    elif search_type == SearchType.CUSTOMERS:
        filters = {
            "subscription_status": ["ACTIVE", "INACTIVE", "CANCELLED"],
            "city": ["Delhi", "Mumbai", "Bangalore", "Pune"]
        }
    elif search_type == SearchType.DELIVERIES:
        filters = {
            "status": ["PENDING", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "CANCELLED"],
            "delivery_type": ["HOME_DELIVERY", "PICKUP"]
        }
    
    return filters


@router.post("/saved-searches")
async def save_search(
    name: str = Body(..., description="Name of saved search"),
    description: str = Body("", description="Description of saved search"),
    query: SearchQuery = Body(..., description="Search query to save"),
    current_user: UserAuth = Depends(get_current_user),
    db = Depends(get_database)
) -> Dict[str, str]:
    """
    Save search for later use
    
    Args:
        name: Name for the saved search
        description: Optional description
        query: SearchQuery to save
        
    Returns:
        ID of saved search
        
    Example:
        POST /api/saved-searches
        Body: {
            "name": "My pending orders",
            "description": "All pending orders in Delhi",
            "query": {
                "search_type": "orders",
                "filters": {"status": "PENDING", "city": "Delhi"}
            }
        }
        Response: {"search_id": "507f1f77bcf86cd799439011"}
    """
    search_manager = get_search_manager(db)
    
    try:
        search_id = await search_manager.save_search(
            user_id=current_user.user_id,
            name=name,
            description=description,
            query=query
        )
        return {"search_id": search_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/saved-searches")
async def list_saved_searches(
    current_user: UserAuth = Depends(get_current_user),
    db = Depends(get_database)
) -> List[Dict]:
    """
    List all saved searches for current user
    
    Returns:
        List of saved searches with metadata
        
    Example:
        GET /api/saved-searches
        Response: [
            {
                "_id": "507f1f77bcf86cd799439011",
                "name": "My pending orders",
                "description": "All pending orders in Delhi",
                "created_at": "2026-01-27T10:30:00",
                "last_used": "2026-01-27T11:15:00",
                "use_count": 5
            }
        ]
    """
    search_manager = get_search_manager(db)
    
    try:
        searches = await search_manager.get_saved_searches(current_user.user_id)
        return searches
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/saved-searches/{search_id}")
async def load_saved_search(
    search_id: str,
    current_user: UserAuth = Depends(get_current_user),
    db = Depends(get_database)
) -> SearchResponse:
    """
    Load and execute a saved search
    
    Args:
        search_id: ID of saved search
        
    Returns:
        SearchResponse with results
        
    Example:
        GET /api/saved-searches/507f1f77bcf86cd799439011
    """
    search_manager = get_search_manager(db)
    
    try:
        query = await search_manager.load_saved_search(search_id, current_user.user_id)
        if not query:
            raise HTTPException(status_code=404, detail="Saved search not found")
        
        results = await search_manager.search(query, user_id=current_user.user_id)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/saved-searches/{search_id}")
async def delete_saved_search(
    search_id: str,
    current_user: UserAuth = Depends(get_current_user),
    db = Depends(get_database)
) -> Dict[str, str]:
    """
    Delete a saved search
    
    Args:
        search_id: ID of saved search to delete
        
    Returns:
        Confirmation message
    """
    search_manager = get_search_manager(db)
    
    try:
        deleted = await search_manager.delete_saved_search(search_id, current_user.user_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Saved search not found")
        return {"message": "Search deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics")
async def get_search_analytics(
    days: int = Query(30, ge=1, le=90, description="Days to analyze"),
    current_user: UserAuth = Depends(get_current_user),
    db = Depends(get_database)
) -> Dict:
    """
    Get search analytics for dashboard
    
    Args:
        days: Number of days to analyze
        
    Returns:
        Analytics summary
        
    Example:
        GET /api/search/analytics?days=30
        Response: {
            "total_searches": 152,
            "by_search_type": {
                "orders": 98,
                "products": 42,
                "customers": 12
            },
            "avg_execution_time_ms": 125.3,
            "max_execution_time_ms": 1250.5
        }
    """
    search_manager = get_search_manager(db)
    
    try:
        analytics = await search_manager.get_search_analytics(
            user_id=current_user.user_id,
            days=days
        )
        return analytics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export")
async def export_results(
    query: SearchQuery = Body(..., description="Search query to export"),
    format: str = Body("json", description="Export format (json or csv)"),
    current_user: UserAuth = Depends(get_current_user),
    db = Depends(get_database)
) -> StreamingResponse:
    """
    Export search results in JSON or CSV format
    
    Args:
        query: SearchQuery to export (exports all results, ignoring pagination)
        format: Export format - "json" or "csv"
        
    Returns:
        File download (application/json or text/csv)
        
    Example:
        POST /api/search/export
        Body: {
            "query": {...},
            "format": "csv"
        }
    """
    search_manager = get_search_manager(db)
    
    try:
        # Execute search
        query.page_size = 1000  # Large page size for export
        results = await search_manager.search(query, user_id=current_user.user_id)
        
        # Export results
        content = await search_manager.export_search_results(results, format)
        
        # Determine media type and filename
        if format == "csv":
            media_type = "text/csv"
            filename = f"search_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        else:
            media_type = "application/json"
            filename = f"search_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        # Return as download
        return StreamingResponse(
            iter([content]),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/popular-filters/{search_type}")
async def get_popular_filters(
    search_type: SearchType = Query(..., description="Type of search"),
    limit: int = Query(10, ge=1, le=50, description="Number of results"),
    current_user: UserAuth = Depends(get_current_user),
    db = Depends(get_database)
) -> List[Dict]:
    """
    Get popular filter combinations for search type
    
    Args:
        search_type: Type of entity
        limit: Number of results
        
    Returns:
        List of popular filter combinations
        
    Example:
        GET /api/search/popular-filters/orders?limit=10
        Response: [
            {
                "_id": "Delhi",
                "count": 150,
                "avg_results": 25.3
            }
        ]
    """
    search_manager = get_search_manager(db)
    
    try:
        filters = await search_manager.get_popular_filters(search_type, limit)
        return filters
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

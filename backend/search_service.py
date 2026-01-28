"""
Advanced Search & Filtering Service
Search, filtering, faceting, and analytics for orders, products, deliveries

Features:
- Full-text search across multiple fields
- Advanced filtering (date, amount, status, category)
- Search suggestions & autocomplete
- Faceted search with counts
- Saved searches for users
- Search analytics & trending
- Pagination and sorting
"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from enum import Enum
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import pymongo
from pymongo import ASCENDING, DESCENDING, TEXT
import json
import re


class SearchType(str, Enum):
    """Types of searchable entities"""
    ORDERS = "orders"
    PRODUCTS = "products"
    DELIVERIES = "deliveries"
    CUSTOMERS = "customers"
    DELIVERY_BOYS = "delivery_boys"


class FilterOperator(str, Enum):
    """Filter operations"""
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    GREATER_THAN = "gt"
    LESS_THAN = "lt"
    GREATER_EQUAL = "gte"
    LESS_EQUAL = "lte"
    IN = "in"
    NOT_IN = "not_in"
    EXISTS = "exists"
    REGEX = "regex"


class SortOrder(str, Enum):
    """Sort order"""
    ASC = "asc"
    DESC = "desc"


class SearchQuery(BaseModel):
    """Search query model"""
    search_type: SearchType
    query: str = Field(default="", description="Search text")
    filters: Dict[str, Any] = Field(default_factory=dict, description="Advanced filters")
    sort_by: str = Field(default="relevance", description="Sort field")
    sort_order: SortOrder = Field(default=SortOrder.DESC)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    facets: List[str] = Field(default_factory=list, description="Fields to get facet counts")


class SearchResult(BaseModel):
    """Single search result"""
    id: str = Field(alias="_id")
    search_type: SearchType
    title: str
    description: str
    relevance_score: float
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SearchResponse(BaseModel):
    """Complete search response"""
    results: List[SearchResult]
    total_count: int
    page: int
    page_size: int
    total_pages: int
    facets: Dict[str, List[tuple]] = Field(default_factory=dict)
    suggestions: List[str] = Field(default_factory=list)
    execution_time_ms: float


class SavedSearch(BaseModel):
    """Saved search for user"""
    user_id: str
    name: str
    description: str
    search_query: SearchQuery
    created_at: datetime
    last_used: Optional[datetime] = None
    use_count: int = 0


class SearchAnalytics(BaseModel):
    """Search analytics record"""
    user_id: Optional[str] = None
    search_text: str
    search_type: SearchType
    results_count: int
    execution_time_ms: float
    timestamp: datetime
    session_id: Optional[str] = None


class SearchManager:
    """Manages search, filtering, and analytics"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.search_collection = db.search_index
        self.saved_searches_collection = db.saved_searches
        self.search_analytics_collection = db.search_analytics
        self.suggestions_cache = {}  # User ID -> suggestions
        
    async def initialize(self):
        """Create indexes for search performance"""
        # Text indexes for full-text search
        await self.db.orders.create_index([("customer_name", TEXT), ("items", TEXT), ("address", TEXT)])
        await self.db.products.create_index([("name", TEXT), ("description", TEXT), ("category", TEXT)])
        await self.db.customers_v2.create_index([("name", TEXT), ("phone", TEXT)])
        await self.db.delivery_boys_v2.create_index([("name", TEXT), ("phone", TEXT)])
        
        # Composite indexes for filtering
        await self.db.orders.create_index([("status", ASCENDING), ("created_at", DESCENDING)])
        await self.db.orders.create_index([("customer_id", ASCENDING), ("status", ASCENDING)])
        await self.db.products.create_index([("category", ASCENDING), ("price", ASCENDING)])
        await self.db.delivery_statuses.create_index([("status", ASCENDING), ("updated_at", DESCENDING)])
        
        # Analytics indexes
        await self.search_analytics_collection.create_index([("timestamp", DESCENDING)])
        await self.search_analytics_collection.create_index([("user_id", ASCENDING), ("timestamp", DESCENDING)])
        await self.search_analytics_collection.create_index([("search_text", ASCENDING)])
        
        # Saved searches index
        await self.saved_searches_collection.create_index([("user_id", ASCENDING)])
        await self.saved_searches_collection.create_index([("created_at", DESCENDING)])
    
    async def search(self, query: SearchQuery, user_id: Optional[str] = None) -> SearchResponse:
        """Execute search with filters and faceting"""
        start_time = datetime.now()
        
        # Get collection
        collection = self.db[query.search_type.value]
        
        # Build search filter
        search_filter = {}
        
        # Full-text search if query provided
        if query.query:
            search_filter["$text"] = {"$search": query.query}
        
        # Apply advanced filters
        search_filter.update(await self._build_filter_query(query.filters))
        
        # Get total count
        total_count = await collection.count_documents(search_filter)
        total_pages = (total_count + query.page_size - 1) // query.page_size
        
        # Build sort
        sort_key = [(query.sort_by, DESCENDING if query.sort_order == SortOrder.DESC else ASCENDING)]
        if query.query and query.sort_by == "relevance":
            # Add text score for relevance sorting
            sort_key = [("score", {"$meta": "textScore"})] + sort_key
        
        # Execute search with pagination
        skip = (query.page - 1) * query.page_size
        cursor = collection.find(
            search_filter,
            {"score": {"$meta": "textScore"} if query.query and query.sort_by == "relevance" else None}
        ).sort(sort_key).skip(skip).limit(query.page_size)
        
        results = []
        async for doc in cursor:
            result = await self._format_result(doc, query.search_type)
            results.append(result)
        
        # Get facets if requested
        facets = {}
        if query.facets:
            facets = await self._get_facets(collection, search_filter, query.facets)
        
        # Get suggestions
        suggestions = await self._get_suggestions(query.search_text if query.query else "", query.search_type)
        
        # Calculate execution time
        execution_time = (datetime.now() - start_time).total_seconds() * 1000
        
        # Log search analytics
        if user_id:
            await self._log_search(user_id, query, total_count, execution_time)
        
        return SearchResponse(
            results=results,
            total_count=total_count,
            page=query.page,
            page_size=query.page_size,
            total_pages=total_pages,
            facets=facets,
            suggestions=suggestions,
            execution_time_ms=execution_time
        )
    
    async def _build_filter_query(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        """Build MongoDB filter query from filter dict"""
        mongo_filter = {}
        
        for field, filter_spec in filters.items():
            if isinstance(filter_spec, dict):
                # Complex filter with operator
                operator = filter_spec.get("operator", FilterOperator.EQUALS)
                value = filter_spec.get("value")
                
                if operator == FilterOperator.EQUALS:
                    mongo_filter[field] = value
                elif operator == FilterOperator.NOT_EQUALS:
                    mongo_filter[field] = {"$ne": value}
                elif operator == FilterOperator.GREATER_THAN:
                    mongo_filter[field] = {"$gt": value}
                elif operator == FilterOperator.LESS_THAN:
                    mongo_filter[field] = {"$lt": value}
                elif operator == FilterOperator.GREATER_EQUAL:
                    mongo_filter[field] = {"$gte": value}
                elif operator == FilterOperator.LESS_EQUAL:
                    mongo_filter[field] = {"$lte": value}
                elif operator == FilterOperator.IN:
                    mongo_filter[field] = {"$in": value if isinstance(value, list) else [value]}
                elif operator == FilterOperator.NOT_IN:
                    mongo_filter[field] = {"$nin": value if isinstance(value, list) else [value]}
                elif operator == FilterOperator.EXISTS:
                    mongo_filter[field] = {"$exists": value}
                elif operator == FilterOperator.REGEX:
                    mongo_filter[field] = {"$regex": value, "$options": "i"}
            else:
                # Simple equality filter
                mongo_filter[field] = filter_spec
        
        return mongo_filter
    
    async def _format_result(self, doc: Dict, search_type: SearchType) -> SearchResult:
        """Format database document as SearchResult"""
        # Extract relevant fields based on search type
        if search_type == SearchType.ORDERS:
            return SearchResult(
                id=str(doc.get("_id")),
                search_type=search_type,
                title=f"Order {doc.get('order_id', 'N/A')}",
                description=f"{doc.get('customer_name')} - {doc.get('status')}",
                relevance_score=doc.get("score", 1.0),
                metadata={
                    "customer_id": doc.get("customer_id"),
                    "status": doc.get("status"),
                    "amount": doc.get("total_amount"),
                    "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
                    "items_count": len(doc.get("items", []))
                }
            )
        elif search_type == SearchType.PRODUCTS:
            return SearchResult(
                id=str(doc.get("_id")),
                search_type=search_type,
                title=doc.get("name", ""),
                description=doc.get("description", ""),
                relevance_score=doc.get("score", 1.0),
                metadata={
                    "category": doc.get("category"),
                    "price": doc.get("price"),
                    "stock": doc.get("stock"),
                    "rating": doc.get("rating")
                }
            )
        elif search_type == SearchType.CUSTOMERS:
            return SearchResult(
                id=str(doc.get("_id")),
                search_type=search_type,
                title=doc.get("name", ""),
                description=f"{doc.get('phone')} - {doc.get('city')}",
                relevance_score=doc.get("score", 1.0),
                metadata={
                    "phone": doc.get("phone"),
                    "email": doc.get("email"),
                    "city": doc.get("city"),
                    "total_orders": doc.get("total_orders", 0)
                }
            )
        else:
            return SearchResult(
                id=str(doc.get("_id")),
                search_type=search_type,
                title=str(doc.get("name", doc.get("order_id", ""))),
                description=str(doc.get("status", "")),
                relevance_score=doc.get("score", 1.0),
                metadata=doc
            )
    
    async def _get_facets(self, collection, search_filter: Dict, facet_fields: List[str]) -> Dict[str, List[tuple]]:
        """Get facet counts for fields"""
        facets = {}
        
        for field in facet_fields:
            pipeline = [
                {"$match": search_filter},
                {"$group": {"_id": f"${field}", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 10}
            ]
            
            results = await collection.aggregate(pipeline).to_list(None)
            facets[field] = [(r["_id"], r["count"]) for r in results if r["_id"] is not None]
        
        return facets
    
    async def _get_suggestions(self, partial_query: str, search_type: SearchType) -> List[str]:
        """Get search suggestions/autocomplete"""
        if not partial_query or len(partial_query) < 2:
            return []
        
        # Get collection
        collection = self.db[search_type.value]
        
        # Query for suggestions
        suggestions = []
        if search_type == SearchType.ORDERS:
            results = await collection.distinct(
                "customer_name",
                {"customer_name": {"$regex": f"^{re.escape(partial_query)}", "$options": "i"}}
            )
            suggestions.extend(results[:5])
        elif search_type == SearchType.PRODUCTS:
            results = await collection.distinct(
                "name",
                {"name": {"$regex": f"^{re.escape(partial_query)}", "$options": "i"}}
            )
            suggestions.extend(results[:5])
        elif search_type == SearchType.CUSTOMERS:
            results = await collection.distinct(
                "name",
                {"name": {"$regex": f"^{re.escape(partial_query)}", "$options": "i"}}
            )
            suggestions.extend(results[:5])
        
        return list(set(suggestions))[:5]
    
    async def save_search(self, user_id: str, name: str, description: str, query: SearchQuery) -> str:
        """Save search for later"""
        saved_search = {
            "user_id": user_id,
            "name": name,
            "description": description,
            "search_query": query.dict(),
            "created_at": datetime.now(),
            "last_used": None,
            "use_count": 0
        }
        
        result = await self.saved_searches_collection.insert_one(saved_search)
        return str(result.inserted_id)
    
    async def get_saved_searches(self, user_id: str) -> List[Dict]:
        """Get user's saved searches"""
        searches = []
        cursor = self.saved_searches_collection.find(
            {"user_id": user_id}
        ).sort("created_at", DESCENDING)
        
        async for search in cursor:
            search["_id"] = str(search["_id"])
            searches.append(search)
        
        return searches
    
    async def load_saved_search(self, search_id: str, user_id: str) -> Optional[SearchQuery]:
        """Load and execute saved search"""
        search = await self.saved_searches_collection.find_one_and_update(
            {"_id": search_id, "user_id": user_id},
            {
                "$set": {"last_used": datetime.now()},
                "$inc": {"use_count": 1}
            }
        )
        
        if search:
            return SearchQuery(**search["search_query"])
        return None
    
    async def delete_saved_search(self, search_id: str, user_id: str) -> bool:
        """Delete saved search"""
        result = await self.saved_searches_collection.delete_one({
            "_id": search_id,
            "user_id": user_id
        })
        return result.deleted_count > 0
    
    async def _log_search(self, user_id: str, query: SearchQuery, results_count: int, execution_time_ms: float):
        """Log search for analytics"""
        analytics = {
            "user_id": user_id,
            "search_text": query.query,
            "search_type": query.search_type.value,
            "results_count": results_count,
            "execution_time_ms": execution_time_ms,
            "timestamp": datetime.now()
        }
        
        await self.search_analytics_collection.insert_one(analytics)
    
    async def get_trending_searches(self, search_type: Optional[SearchType] = None, days: int = 7) -> List[Dict]:
        """Get trending searches"""
        start_date = datetime.now() - timedelta(days=days)
        
        match_stage = {"$match": {"timestamp": {"$gte": start_date}}}
        if search_type:
            match_stage["$match"]["search_type"] = search_type.value
        
        pipeline = [
            match_stage,
            {"$group": {
                "_id": "$search_text",
                "count": {"$sum": 1},
                "avg_time_ms": {"$avg": "$execution_time_ms"}
            }},
            {"$sort": {"count": -1}},
            {"$limit": 20}
        ]
        
        results = await self.search_analytics_collection.aggregate(pipeline).to_list(None)
        return results
    
    async def get_search_analytics(self, user_id: Optional[str] = None, days: int = 30) -> Dict:
        """Get search analytics"""
        start_date = datetime.now() - timedelta(days=days)
        
        match_stage = {"$match": {"timestamp": {"$gte": start_date}}}
        if user_id:
            match_stage["$match"]["user_id"] = user_id
        
        # Total searches
        total = await self.search_analytics_collection.count_documents(match_stage["$match"])
        
        # By search type
        pipeline = [
            match_stage,
            {"$group": {
                "_id": "$search_type",
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}}
        ]
        by_type = await self.search_analytics_collection.aggregate(pipeline).to_list(None)
        
        # Average execution time
        pipeline = [
            match_stage,
            {"$group": {
                "_id": None,
                "avg_time_ms": {"$avg": "$execution_time_ms"},
                "max_time_ms": {"$max": "$execution_time_ms"}
            }}
        ]
        exec_time = await self.search_analytics_collection.aggregate(pipeline).to_list(None)
        
        return {
            "total_searches": total,
            "by_search_type": {item["_id"]: item["count"] for item in by_type},
            "avg_execution_time_ms": exec_time[0]["avg_time_ms"] if exec_time else 0,
            "max_execution_time_ms": exec_time[0]["max_time_ms"] if exec_time else 0
        }
    
    async def get_popular_filters(self, search_type: SearchType, limit: int = 10) -> List[Dict]:
        """Get popular filter combinations"""
        pipeline = [
            {"$match": {"search_type": search_type.value}},
            {"$group": {
                "_id": "$search_text",
                "count": {"$sum": 1},
                "avg_results": {"$avg": "$results_count"}
            }},
            {"$sort": {"count": -1}},
            {"$limit": limit}
        ]
        
        results = await self.search_analytics_collection.aggregate(pipeline).to_list(None)
        return results
    
    async def export_search_results(self, results: SearchResponse, format: str = "json") -> str:
        """Export search results"""
        if format == "json":
            return json.dumps(
                {
                    "results": [r.dict() for r in results.results],
                    "total": results.total_count,
                    "page": results.page,
                    "execution_time_ms": results.execution_time_ms
                },
                indent=2,
                default=str
            )
        elif format == "csv":
            lines = ["id,title,description,type,relevance_score"]
            for result in results.results:
                lines.append(f'"{result.id}","{result.title}","{result.description}","{result.search_type}",{result.relevance_score}')
            return "\n".join(lines)
        else:
            raise ValueError(f"Unsupported format: {format}")


# Global search manager instance
search_manager: Optional[SearchManager] = None


def get_search_manager(db: AsyncIOMotorDatabase) -> SearchManager:
    """Get or create search manager"""
    global search_manager
    if search_manager is None:
        search_manager = SearchManager(db)
    return search_manager

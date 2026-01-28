# PHASE 4A.3: Advanced Search & Filtering - API Reference

**Date:** January 27, 2026  
**Status:** ✅ COMPLETE  
**Total Endpoints:** 11  
**Authentication:** JWT Required (except public endpoints)

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Search Endpoints](#search-endpoints)
4. [Filter Endpoints](#filter-endpoints)
5. [Saved Searches](#saved-searches)
6. [Analytics Endpoints](#analytics-endpoints)
7. [Export Endpoints](#export-endpoints)
8. [Error Handling](#error-handling)
9. [Rate Limiting](#rate-limiting)
10. [JavaScript Client Example](#javascript-client-example)

---

## Overview

### Base URL
```
http://localhost:8000/api/search
```

### Authentication
All endpoints require Bearer token in Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Response Format
All responses are JSON with consistent structure:
```json
{
  "data": {...},
  "status": "success|error",
  "message": "Optional message",
  "timestamp": "2026-01-27T10:30:00Z"
}
```

---

## Authentication

### Get Token
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 86400
}
```

### Token Headers
Include token in all search API requests:
```
GET /api/search/suggestions
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Search Endpoints

### 1. Execute Search

**Endpoint**: `POST /api/search`

**Description**: Execute a search query with optional filters, sorting, and pagination

**Authentication**: Required

**Request Body**:
```json
{
  "search_type": "orders",
  "query": "delhi delivery",
  "filters": {
    "status": "DELIVERED",
    "created_at": {
      "operator": "gte",
      "value": "2026-01-20"
    },
    "total_amount": {
      "operator": "gte",
      "value": 500
    }
  },
  "sort_by": "created_at",
  "sort_order": "desc",
  "page": 1,
  "page_size": 20,
  "facets": ["status", "payment_method", "city"]
}
```

**Query Parameters**:
- `search_type` (required): "orders" | "products" | "customers" | "deliveries" | "delivery_boys"
- `query` (optional): Search text (empty string for filter-only search)
- `filters` (optional): Advanced filter object
- `sort_by` (optional, default: "relevance"): Field to sort by
- `sort_order` (optional, default: "desc"): "asc" | "desc"
- `page` (optional, default: 1): Page number (1-based)
- `page_size` (optional, default: 20): Results per page (1-100)
- `facets` (optional): Array of fields to get facet counts

**Response** (200 OK):
```json
{
  "results": [
    {
      "id": "507f1f77bcf86cd799439011",
      "search_type": "orders",
      "title": "Order #ORD-2026-001234",
      "description": "Rajesh Kumar - DELIVERED",
      "relevance_score": 0.95,
      "metadata": {
        "customer_id": "cust_123",
        "status": "DELIVERED",
        "amount": 1250.50,
        "created_at": "2026-01-25T10:30:00Z",
        "items_count": 3,
        "payment_method": "UPI",
        "city": "Delhi"
      }
    },
    {
      "id": "507f1f77bcf86cd799439012",
      "search_type": "orders",
      "title": "Order #ORD-2026-001235",
      "description": "Priya Sharma - DELIVERED",
      "relevance_score": 0.87,
      "metadata": {
        "customer_id": "cust_124",
        "status": "DELIVERED",
        "amount": 890.25,
        "created_at": "2026-01-25T11:45:00Z",
        "items_count": 2,
        "payment_method": "CARD",
        "city": "Delhi"
      }
    }
  ],
  "total_count": 254,
  "page": 1,
  "page_size": 20,
  "total_pages": 13,
  "facets": {
    "status": [
      ["DELIVERED", 180],
      ["PENDING", 45],
      ["CANCELLED", 29]
    ],
    "payment_method": [
      ["CASH", 120],
      ["CARD", 95],
      ["UPI", 39]
    ],
    "city": [
      ["Delhi", 180],
      ["Mumbai", 45],
      ["Bangalore", 29]
    ]
  },
  "suggestions": [
    "delhi delivery completed",
    "delhi delivery express",
    "delhi delivery pending"
  ],
  "execution_time_ms": 125.3
}
```

**Status Codes**:
- `200 OK`: Successful search
- `400 Bad Request`: Invalid search_type or parameters
- `401 Unauthorized`: Invalid or missing token
- `500 Server Error`: Database or server error

**Examples**:

**Full-text search**:
```bash
curl -X POST http://localhost:8000/api/search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "search_type": "orders",
    "query": "delhi"
  }'
```

**Filter-only search**:
```bash
curl -X POST http://localhost:8000/api/search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "search_type": "orders",
    "filters": {
      "status": "DELIVERED",
      "created_at": {
        "operator": "gte",
        "value": "2026-01-20"
      }
    },
    "page": 1,
    "page_size": 50
  }'
```

**Search with facets**:
```bash
curl -X POST http://localhost:8000/api/search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "search_type": "orders",
    "query": "delhi",
    "facets": ["status", "payment_method"],
    "page": 1,
    "page_size": 20
  }'
```

---

### 2. Get Search Suggestions

**Endpoint**: `GET /api/search/suggestions`

**Description**: Get autocomplete suggestions for a partial query

**Authentication**: Required

**Query Parameters**:
- `search_type` (required): "orders" | "products" | "customers" | "deliveries" | "delivery_boys"
- `partial` (optional, default: ""): Partial query to match (minimum 2 characters)

**Response** (200 OK):
```json
[
  "delhi delivery",
  "delhi delivery express",
  "delhi delivery fast",
  "delhi dairy products",
  "delhi desi ghee"
]
```

**Examples**:

```bash
# Get suggestions for "del"
curl -X GET "http://localhost:8000/api/search/suggestions?search_type=orders&partial=del" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get product suggestions for "milk"
curl -X GET "http://localhost:8000/api/search/suggestions?search_type=products&partial=milk" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 3. Get Trending Searches

**Endpoint**: `GET /api/search/trending`

**Description**: Get trending searches for the past N days

**Authentication**: Required

**Query Parameters**:
- `search_type` (optional): Filter by search type
- `days` (optional, default: 7): Days to analyze (1-30)

**Response** (200 OK):
```json
[
  {
    "_id": "delhi",
    "count": 245,
    "avg_time_ms": 125.3
  },
  {
    "_id": "pending orders",
    "count": 189,
    "avg_time_ms": 98.2
  },
  {
    "_id": "delivered",
    "count": 167,
    "avg_time_ms": 110.5
  }
]
```

**Examples**:

```bash
# Trending searches in past 7 days
curl -X GET "http://localhost:8000/api/search/trending?days=7" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Trending order searches in past 30 days
curl -X GET "http://localhost:8000/api/search/trending?search_type=orders&days=30" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Filter Endpoints

### 4. Get Available Filters

**Endpoint**: `POST /api/search/filters`

**Description**: Get available filters and their possible values for a search type

**Authentication**: Required

**Request Body**:
```json
{
  "search_type": "orders"
}
```

**Response** (200 OK):
```json
{
  "status": ["PENDING", "CONFIRMED", "DELIVERED", "CANCELLED"],
  "payment_method": ["CASH", "CARD", "UPI", "WALLET"],
  "payment_status": ["UNPAID", "PAID", "REFUNDED"],
  "order_type": ["subscription", "one-time"],
  "city": ["Delhi", "Mumbai", "Bangalore", "Pune"]
}
```

**Filter Values by Search Type**:

**Orders**:
- status: PENDING, CONFIRMED, DELIVERED, CANCELLED
- payment_method: CASH, CARD, UPI, WALLET
- payment_status: UNPAID, PAID, REFUNDED
- order_type: subscription, one-time

**Products**:
- category: Fresh Produce, Dairy, Snacks, Beverages, Essentials
- in_stock: true, false
- rating: 1, 2, 3, 4, 5

**Customers**:
- subscription_status: ACTIVE, INACTIVE, CANCELLED
- city: Delhi, Mumbai, Bangalore, Pune

**Examples**:

```bash
# Get order filters
curl -X POST http://localhost:8000/api/search/filters \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"search_type": "orders"}'

# Get product filters
curl -X POST http://localhost:8000/api/search/filters \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"search_type": "products"}'
```

---

## Saved Searches

### 5. Save Search

**Endpoint**: `POST /api/saved-searches`

**Description**: Save a search for quick access later

**Authentication**: Required

**Request Body**:
```json
{
  "name": "My Pending Orders",
  "description": "All pending orders in Delhi area",
  "query": {
    "search_type": "orders",
    "query": "",
    "filters": {
      "status": "PENDING",
      "city": "Delhi"
    },
    "sort_by": "created_at",
    "sort_order": "desc",
    "page": 1,
    "page_size": 20
  }
}
```

**Response** (200 OK):
```json
{
  "search_id": "507f1f77bcf86cd799439011"
}
```

**Examples**:

```bash
curl -X POST http://localhost:8000/api/saved-searches \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Delivered Orders",
    "description": "All delivered orders",
    "query": {
      "search_type": "orders",
      "filters": {"status": "DELIVERED"}
    }
  }'
```

---

### 6. List Saved Searches

**Endpoint**: `GET /api/saved-searches`

**Description**: List all saved searches for the current user

**Authentication**: Required

**Response** (200 OK):
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Pending Orders",
    "description": "All pending orders in Delhi",
    "created_at": "2026-01-27T10:00:00Z",
    "last_used": "2026-01-27T15:30:00Z",
    "use_count": 23
  },
  {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Delivered Today",
    "description": "Orders delivered today",
    "created_at": "2026-01-27T08:00:00Z",
    "last_used": "2026-01-27T14:15:00Z",
    "use_count": 5
  }
]
```

---

### 7. Load Saved Search

**Endpoint**: `GET /api/saved-searches/{search_id}`

**Description**: Load and execute a saved search

**Authentication**: Required

**Path Parameters**:
- `search_id` (required): ID of saved search

**Response** (200 OK):
Returns the same response as [Execute Search](#1-execute-search)

**Examples**:

```bash
curl -X GET "http://localhost:8000/api/saved-searches/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 8. Delete Saved Search

**Endpoint**: `DELETE /api/saved-searches/{search_id}`

**Description**: Delete a saved search

**Authentication**: Required

**Response** (200 OK):
```json
{
  "message": "Search deleted successfully"
}
```

---

## Analytics Endpoints

### 9. Get Search Analytics

**Endpoint**: `GET /api/search/analytics`

**Description**: Get search analytics and statistics

**Authentication**: Required (Admin/Manager)

**Query Parameters**:
- `days` (optional, default: 30): Days to analyze (1-90)

**Response** (200 OK):
```json
{
  "total_searches": 1542,
  "by_search_type": {
    "orders": 892,
    "products": 423,
    "customers": 187,
    "deliveries": 40
  },
  "avg_execution_time_ms": 125.3,
  "max_execution_time_ms": 1250.5,
  "trends": {
    "peak_hour": 14,
    "peak_day": "Monday",
    "growth_rate": 12.5
  }
}
```

---

### 10. Get Popular Filters

**Endpoint**: `GET /api/search/popular-filters/{search_type}`

**Description**: Get popular filter combinations

**Authentication**: Required (Admin/Manager)

**Response** (200 OK):
```json
[
  {
    "_id": "DELIVERED",
    "count": 892,
    "avg_results": 25.3
  },
  {
    "_id": "PENDING",
    "count": 423,
    "avg_results": 15.7
  }
]
```

---

## Export Endpoints

### 11. Export Search Results

**Endpoint**: `POST /api/search/export`

**Description**: Export search results in JSON or CSV format

**Authentication**: Required

**Request Body**:
```json
{
  "query": {
    "search_type": "orders",
    "query": "delhi",
    "filters": {"status": "DELIVERED"},
    "sort_by": "created_at",
    "sort_order": "desc",
    "page": 1,
    "page_size": 1000
  },
  "format": "csv"
}
```

**Response** (200 OK):
```
Content-Type: text/csv
Content-Disposition: attachment; filename=search_results_20260127_103000.csv

id,title,description,type,relevance_score
507f1f77bcf86cd799439011,Order #ORD-2026-001234,Rajesh Kumar - DELIVERED,orders,0.95
507f1f77bcf86cd799439012,Order #ORD-2026-001235,Priya Sharma - DELIVERED,orders,0.87
```

**Supported Formats**:
- `csv`: Comma-separated values
- `json`: JSON array

---

## Error Handling

### Error Response Format

```json
{
  "status": "error",
  "error": "INVALID_SEARCH_TYPE",
  "message": "Invalid search_type: 'invalid'. Allowed: orders, products, customers, deliveries, delivery_boys",
  "timestamp": "2026-01-27T10:30:00Z"
}
```

### Common Error Codes

| Code | Status | Message | Solution |
|------|--------|---------|----------|
| `INVALID_SEARCH_TYPE` | 400 | Invalid search_type value | Use valid type from enum |
| `INVALID_FILTER` | 400 | Invalid filter specification | Check filter operator and value |
| `INVALID_PAGE_SIZE` | 400 | Page size out of range | Use 1-100 |
| `INVALID_TOKEN` | 401 | Invalid or expired token | Refresh token |
| `NOT_AUTHORIZED` | 403 | Not authorized for this resource | Use admin account or request access |
| `SEARCH_NOT_FOUND` | 404 | Saved search not found | Use valid search_id |
| `DATABASE_ERROR` | 500 | Database connection failed | Check database status |
| `SERVER_ERROR` | 500 | Internal server error | Check logs, retry later |

---

## Rate Limiting

### Limits

- **Search endpoint**: 60 requests/minute per user
- **Suggestions endpoint**: 120 requests/minute per user
- **Trending endpoint**: 20 requests/minute per user
- **Admin endpoints**: 10 requests/minute per user

### Rate Limit Headers

All responses include:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1643282400
```

### Rate Limit Error

```json
{
  "status": "error",
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Try again in 30 seconds.",
  "retry_after": 30
}
```

---

## JavaScript Client Example

### Complete Example

```javascript
// searchClient.js
class SearchClient {
  constructor(baseUrl = 'http://localhost:8000', token) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  // Execute search
  async search(query) {
    const response = await fetch(`${this.baseUrl}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(query)
    });
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Get suggestions
  async getSuggestions(searchType, partial) {
    const response = await fetch(
      `${this.baseUrl}/api/search/suggestions?search_type=${searchType}&partial=${encodeURIComponent(partial)}`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      }
    );
    
    return response.json();
  }

  // Save search
  async saveSearch(name, description, query) {
    const response = await fetch(`${this.baseUrl}/api/saved-searches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({ name, description, query })
    });
    
    return response.json();
  }

  // Get saved searches
  async getSavedSearches() {
    const response = await fetch(`${this.baseUrl}/api/saved-searches`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    
    return response.json();
  }

  // Load saved search
  async loadSavedSearch(searchId) {
    const response = await fetch(`${this.baseUrl}/api/saved-searches/${searchId}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    
    return response.json();
  }
}

// Usage
const client = new SearchClient('http://localhost:8000', 'your_token_here');

// Execute search
const results = await client.search({
  search_type: 'orders',
  query: 'delhi',
  filters: { status: 'DELIVERED' },
  page: 1,
  page_size: 20
});

console.log(`Found ${results.total_count} results`);
console.log(`Execution time: ${results.execution_time_ms}ms`);
results.results.forEach(item => {
  console.log(`- ${item.title}: ${item.description}`);
});

// Get suggestions
const suggestions = await client.getSuggestions('orders', 'del');
console.log('Suggestions:', suggestions);

// Save search
const saved = await client.saveSearch(
  'My Pending Orders',
  'All pending orders in Delhi',
  { search_type: 'orders', filters: { status: 'PENDING' } }
);
console.log('Saved search ID:', saved.search_id);
```

---

**Version:** 1.0.0  
**Last Updated:** January 27, 2026  
**Status:** ✅ COMPLETE & PRODUCTION READY

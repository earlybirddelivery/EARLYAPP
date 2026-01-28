# Phase 2.3 - Quick Start Guide

## What's New?

Phase 2.3 adds a **Product Request Queue** system where customers can request products and admins can manage approvals with a voting mechanism to track demand.

---

## For Customers

### How to Request a Product

1. Navigate to **"Request Product"** in the main menu
2. Fill in the form:
   - **Product Name** (required) - e.g., "Organic Milk (1L)"
   - **Category** (optional) - Choose from 8 categories
   - **Description** (required) - Tell us about it (min 10 characters)
   - **Estimated Price** (optional) - Help us find suppliers
   - **Urgency** - Low/Normal/High (default: Normal)
   - **Notes** (optional) - Any additional details
3. Click **"Submit Request"**
4. See success confirmation
5. Your request is now visible to others!

### How to Upvote a Request

1. Browse product requests in the marketplace
2. Find a product you want
3. Click **"I Want This"** button (or upvote icon)
4. Vote counted immediately
5. Once voted, button disables (one vote per request per customer)
6. Product vote count updates in real-time

### View Your Requests

- Go to **"My Requests"** page
- See all your submissions with current vote counts
- Track status changes (Pending → Approved/Rejected)

---

## For Admins

### Access Admin Dashboard

1. Log in as admin account
2. Navigate to **"Admin > Product Requests"**
3. Dashboard shows:
   - **Statistics Cards**: Total, Pending, Approved, Rejected, Approval Rate
   - **Top Products**: Highest-voted requests
   - **Requests Table**: All requests with filters/sorting

### Review Requests

1. Use **Status Filter** to view:
   - Pending (default) - Awaiting admin action
   - Approved - Already approved
   - Rejected - Not viable
   - In Progress - Being sourced
2. Use **Sort By**:
   - Most Voted (default) - Highest demand
   - Newest - Latest submissions
   - Urgency - Customer urgency level
3. Click **"View"** button on any request to see details

### Approve a Request

1. Click **"View"** on pending request
2. Review:
   - Product details and description
   - Customer notes
   - Number of votes
   - Estimated price
3. Click **"Approve Request"** button
4. (Optional) Add approval notes
5. Click **"Confirm Approval"**
6. ✅ Request status changes to APPROVED
7. 📱 Customer gets WhatsApp notification

### Reject a Request

1. Click **"View"** on pending request
2. Click **"Reject Request"** button
3. **Select rejection reason**:
   - Product not available in market
   - Supplier not found
   - Price not viable
   - Low demand
   - Out of scope
   - Quality concerns
   - Other
4. (Optional) Add additional notes
5. Click **"Confirm Rejection"**
6. ❌ Request status changes to REJECTED
7. 📱 Customer gets WhatsApp notification

### Interpret Statistics

- **Total Requests**: All submissions to date
- **Pending**: Awaiting admin action
- **Approved**: Successfully added to catalog
- **Rejected**: Not viable
- **Approval Rate**: (Approved / Total) × 100%
- **Top Products**: Highest-demand items

**Key Insight**: High-vote products indicate strong customer demand - prioritize sourcing these!

---

## API Endpoints (Developer Reference)

### Customer Endpoints

```bash
# Create request
POST /api/product-requests/create
Body: {
  "product_name": "Organic Milk (1L)",
  "description": "Fresh organic cow milk",
  "category": "dairy",
  "estimated_price": 120,
  "urgency": "high",
  "notes": "Need daily"
}

# Get my requests
GET /api/product-requests/my-requests?limit=20&skip=0

# Get request details
GET /api/product-requests/{request_id}

# Upvote request
POST /api/product-requests/{request_id}/upvote
```

### Admin Endpoints

```bash
# List all requests
GET /api/product-requests?status=PENDING&sort_by=votes&limit=50&skip=0

# Approve request
PUT /api/product-requests/{request_id}/approve
Body: {
  "admin_notes": "Will add this product next week"
}

# Reject request
PUT /api/product-requests/{request_id}/reject
Body: {
  "rejection_reason": "Product not available in market",
  "admin_notes": "Check again in Q2"
}

# Get statistics
GET /api/product-requests/admin/statistics
```

---

## Files Created

### Backend (1,050 lines)
- `/backend/product_request_engine.py` (600 lines)
  - Core business logic
  - Request creation, voting, approval/rejection
  - Statistics aggregation
  
- `/backend/routes_product_requests.py` (450 lines)
  - 8 REST API endpoints
  - Full authentication & validation
  - Error handling

### Frontend (550 lines)
- `/frontend/src/components/ProductRequestForm.jsx` (250 lines)
  - Customer request submission form
  - Validation & success screens
  
- `/frontend/src/components/AdminProductRequestDashboard.jsx` (300 lines)
  - Admin management interface
  - Statistics & filtering
  - Detail & action modals

### Service Layer (200 lines)
- `/frontend/src/services/productRequestService.js` (200 lines)
  - API wrapper methods
  - Error handling

### Documentation (4,500+ lines)
- `PHASE_2_3_COMPLETE_DOCUMENTATION.md`
  - Comprehensive guide
  - Architecture overview
  - User workflows
  - Testing checklist

---

## Database Schema

**Collection: product_requests**

```javascript
{
  "_id": ObjectId,
  "customer_id": String,           // Who requested
  "product_name": String,          // Product name
  "description": String,           // Product details
  "category": String,              // Category
  "estimated_price": Number,       // Price estimate
  "urgency": String,               // low|normal|high
  "notes": String,                 // Additional notes
  "status": String,                // PENDING|APPROVED|REJECTED|IN_PROGRESS
  "votes": Number,                 // Vote count (starts at 1)
  "voted_by": [String],            // Customer IDs who voted
  "created_at": Date,              // Submission time
  "updated_at": Date,              // Last update
  "approved_at": Date,             // Approval time
  "rejected_at": Date,             // Rejection time
  "rejection_reason": String,      // Rejection reason
  "admin_notes": String,           // Admin notes
  "approved_by": String            // Admin ID
}
```

---

## Sample Data

### Sample Request
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "customer_id": "cust_123",
  "product_name": "Organic Milk (1L)",
  "description": "Fresh organic cow milk from local farms",
  "category": "dairy",
  "estimated_price": 120,
  "urgency": "high",
  "notes": "Need this daily for breakfast",
  "status": "PENDING",
  "votes": 23,
  "voted_by": ["cust_123", "cust_456", "cust_789", ...],
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T15:45:00Z",
  "voted_by_count": 23
}
```

---

## Status Workflow

```
┌─────────────────────────────┐
│    Customer Submits         │
│    Request (PENDING)        │
└──────────────┬──────────────┘
               │
        ┌──────▼───────┐
        │  Other Users │
        │  Can Upvote  │
        └──────┬───────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌────────────┐     ┌────────────┐
│  APPROVED  │     │  REJECTED  │
│            │     │            │
│ Admin      │     │ Admin      │
│ approves   │     │ rejects    │
│ request    │     │ request    │
└────────────┘     └────────────┘
    │
    ▼
┌────────────────────────┐
│  IN_PROGRESS           │
│  (Sourcing product)    │
└────────────────────────┘
    │
    ▼
┌────────────────────────┐
│  Added to Catalog      │
│  Available for Purchase│
└────────────────────────┘
```

---

## Key Features

✅ **Vote Tracking**
- One vote per customer per request
- Vote count starts at 1 (requester's vote)
- Demand indicator for admin decisions

✅ **Admin Approval/Rejection**
- Approve with optional notes
- Reject with mandatory reason + optional notes
- Status transitions managed

✅ **Notifications**
- WhatsApp notification on approval
- WhatsApp notification on rejection
- Messages include reason and context

✅ **Statistics Dashboard**
- Real-time request counts
- Approval rate calculation
- Top 5 products by demand
- KPI cards for quick insight

✅ **Customer Engagement**
- Easy request submission
- Upvote mechanism
- Personal request history
- Real-time vote updates

---

## Troubleshooting

### "Request not found" Error
- Check request ID is correct
- Verify request exists in database
- Request might be deleted

### "Already voted for this request"
- This customer has already upvoted this request
- Only one vote per customer per request allowed
- Try upvoting a different request

### WhatsApp notification not sent
- Check notification service is running
- Verify customer phone number in system
- Check WhatsApp template is configured
- Review notification logs

### Statistics not updating
- Statistics are cached for 5 minutes
- Try refreshing page
- Check database connection
- Verify product_requests collection exists

---

## Performance

- **Requests loaded per page**: 50
- **Statistics cache duration**: 5 minutes
- **Database indexes**: On status, customer_id, created_at
- **Notification delivery**: Async (non-blocking)

---

## Expected Revenue Impact

**Monthly Revenue: ₹2-5K**

**Mechanisms:**
1. Customers request specific products
2. Demand votes indicate interest level
3. Admins prioritize high-demand products
4. Faster inventory optimization
5. Reduced dead stock
6. Increased customer engagement

---

## Next Steps

1. **Testing**: Run full test suite on all endpoints
2. **Staging**: Deploy to staging environment
3. **QA**: Test workflows with sample data
4. **Production**: Deploy to live environment
5. **Monitoring**: Track request volumes and approval rates
6. **Optimization**: Refine based on usage patterns

---

## Support

For issues or questions:
1. Check `PHASE_2_3_COMPLETE_DOCUMENTATION.md` for detailed info
2. Review API response examples for debugging
3. Check database collection schema
4. Test endpoints with curl/Postman

**Estimated Go-Live**: Ready for immediate deployment after testing

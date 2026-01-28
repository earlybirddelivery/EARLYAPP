"""
PHASE 4B.2: STAFF WALLET - API REFERENCE
=========================================

Complete REST API documentation with examples and response codes.

Author: AI Agent
Date: January 27, 2026

BASE URL: https://api.yourdomain.com/api/staff/wallet

AUTHENTICATION
==============
All endpoints require Bearer token in Authorization header:
  Authorization: Bearer <JWT_TOKEN>

HTTP METHODS
============
GET     - Retrieve data
POST    - Create new data
PUT     - Update existing data

HTTP STATUS CODES
=================
200 OK                - Request successful
201 Created          - Resource created
204 No Content       - Success, no response body
400 Bad Request      - Invalid input
401 Unauthorized     - Missing/invalid token
403 Forbidden        - Not authorized for this resource
404 Not Found        - Resource not found
500 Internal Error   - Server error

================================================================

EARNINGS ENDPOINTS
==================

1. CREATE DAILY EARNINGS
========================

POST /earnings/daily

Create or update daily earnings record for a staff member.

Headers:
  Authorization: Bearer <token>
  Content-Type: application/json

Request Body:
{
  "staff_id": "550e8400-e29b-41d4-a716-446655440000",
  "date": "2024-01-15",
  "deliveries_completed": 15,
  "rating": 4.8,
  "on_time_percentage": 96.5,
  "complaints": 0
}

Request Validation:
  - staff_id: Required, valid UUID format
  - date: Required, YYYY-MM-DD format
  - deliveries_completed: Required, integer >= 0
  - rating: Required, float 0-5
  - on_time_percentage: Required, float 0-100
  - complaints: Required, integer >= 0

Response (200 OK):
{
  "success": true,
  "earnings_id": "550e8400-e29b-41d4-a716-446655440001",
  "data": {
    "earnings": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "staff_id": "550e8400-e29b-41d4-a716-446655440000",
      "date": "2024-01-15",
      "deliveries_completed": 15,
      "delivery_amount": 300.00,
      "bonus_amount": 33.00,
      "deductions_amount": 0.00,
      "net_earnings": 333.00,
      "rating": 4.8,
      "on_time_percentage": 96.5,
      "complaints": 0,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    },
    "bonuses": [
      {
        "bonus_type": "ON_TIME",
        "amount": 15.00,
        "reason": "On-time delivery bonus (96.5% on-time)"
      },
      {
        "bonus_type": "RATING",
        "amount": 3.00,
        "reason": "Rating bonus (4.8 stars)"
      },
      {
        "bonus_type": "COMPLETION",
        "amount": 30.00,
        "reason": "Completion bonus (no complaints, 15 deliveries)"
      }
    ],
    "deductions": [],
    "breakdown": {
      "base_amount": 300.00,
      "bonus_total": 33.00,
      "deduction_total": 0.00,
      "net_earnings": 333.00
    }
  }
}

Response (400 Bad Request):
{
  "detail": "Deliveries completed must be positive integer"
}

Response (403 Forbidden):
{
  "detail": "Not authorized"
}

Example cURL:
curl -X POST https://api.yourdomain.com/api/staff/wallet/earnings/daily \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "staff_id": "550e8400-e29b-41d4-a716-446655440000",
    "date": "2024-01-15",
    "deliveries_completed": 15,
    "rating": 4.8,
    "on_time_percentage": 96.5,
    "complaints": 0
  }'

---

2. GET TODAY'S EARNINGS
=======================

GET /earnings/today/{staff_id}

Retrieve today's earnings record.

Path Parameters:
  staff_id: Valid UUID of delivery staff

Response (200 OK):
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "staff_id": "550e8400-e29b-41d4-a716-446655440000",
    "date": "2024-01-15",
    "deliveries_completed": 12,
    "delivery_amount": 240.00,
    "bonus_amount": 12.00,
    "deductions_amount": 50.00,
    "net_earnings": 202.00,
    "rating": 4.5,
    "on_time_percentage": 95.0,
    "complaints": 1,
    "created_at": "2024-01-15T09:00:00Z",
    "updated_at": "2024-01-15T17:30:00Z"
  }
}

Response (200 OK - No Data):
{
  "success": true,
  "data": null
}

Example:
GET https://api.yourdomain.com/api/staff/wallet/earnings/today/550e8400-e29b-41d4-a716-446655440000

---

3. GET EARNINGS BY DATE
=======================

GET /earnings/date/{staff_id}?date_str=YYYY-MM-DD

Retrieve earnings for a specific date.

Path Parameters:
  staff_id: Valid UUID

Query Parameters:
  date_str: Date in YYYY-MM-DD format (required)

Response: Same as GET /earnings/today

Example:
GET https://api.yourdomain.com/api/staff/wallet/earnings/date/550e8400-e29b-41d4-a716-446655440000?date_str=2024-01-15

---

4. GET EARNINGS RANGE
=====================

GET /earnings/range/{staff_id}?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD

Retrieve earnings for a date range.

Query Parameters:
  start_date: Start date YYYY-MM-DD (required)
  end_date: End date YYYY-MM-DD (required)

Response (200 OK):
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "staff_id": "550e8400-e29b-41d4-a716-446655440000",
      "date": "2024-01-15",
      ...
    },
    ...
  ]
}

Example:
GET https://api.yourdomain.com/api/staff/wallet/earnings/range/550e8400-e29b-41d4-a716-446655440000?start_date=2024-01-01&end_date=2024-01-15

================================================================

STATEMENT ENDPOINTS
===================

1. GET MONTHLY STATEMENT
========================

GET /statement/{staff_id}/{month}?month=YYYY-MM

Get or generate monthly statement.

Path Parameters:
  staff_id: Valid UUID
  month: Month in YYYY-MM format

Response (200 OK):
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "staff_id": "550e8400-e29b-41d4-a716-446655440000",
    "month": "2024-01",
    "total_deliveries": 300,
    "base_earnings": 6000.00,
    "total_bonuses": 680.50,
    "total_deductions": 150.00,
    "net_earnings": 6530.50,
    "average_rating": 4.7,
    "on_time_percentage": 94.8,
    "complaints_count": 2,
    "created_at": "2024-02-01T09:00:00Z"
  }
}

Response (200 OK - No Data):
{
  "success": true,
  "data": null,
  "message": "No earnings found for this month"
}

Example:
GET https://api.yourdomain.com/api/staff/wallet/statement/550e8400-e29b-41d4-a716-446655440000/2024-01

---

2. GET ALL STATEMENTS
=====================

GET /statements/{staff_id}?limit=12

Get all monthly statements (default 12 months).

Query Parameters:
  limit: Number of months to retrieve (optional, default: 12)

Response (200 OK):
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "month": "2024-01",
      ...
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440011",
      "month": "2023-12",
      ...
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440012",
      "month": "2023-11",
      ...
    }
  ]
}

================================================================

WALLET SUMMARY ENDPOINTS
========================

GET /summary/{staff_id}

Get current wallet status and balance.

Response (200 OK):
{
  "success": true,
  "data": {
    "staff_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Rajesh Kumar",
    "phone": "+91-98765-43210",
    "today_earnings": 285.50,
    "month_earnings": 5840.75,
    "pending_payout": 2000.00,
    "lifetime_earnings": 45230.25,
    "average_rating": 4.68,
    "on_time_percentage": 94.2,
    "total_deliveries": 312,
    "pending_requests": 2,
    "last_payout_date": "2024-01-08"
  }
}

================================================================

BONUS ENDPOINTS
===============

1. APPLY BONUS (ADMIN)
=====================

POST /bonus/apply

Apply manual bonus to earnings (admin only).

Request Body:
{
  "staff_id": "550e8400-e29b-41d4-a716-446655440000",
  "earnings_id": "550e8400-e29b-41d4-a716-446655440001",
  "bonus_type": "PERFORMANCE",
  "amount": 100.00,
  "reason": "Excellent performance in January"
}

Bonus Types:
  - ON_TIME: On-time delivery (5% of base)
  - RATING: Customer rating (₹10/star)
  - COMPLETION: Completion (10% of base)
  - PERFORMANCE: Manual award

Response (200 OK):
{
  "success": true,
  "bonus_id": "550e8400-e29b-41d4-a716-446655440020",
  "message": "Bonus of ₹100 applied successfully"
}

Response (403 Forbidden):
{
  "detail": "Not authorized"
}

---

2. GET BONUSES
==============

GET /bonuses/{staff_id}?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD

Get all bonuses for staff member.

Query Parameters:
  start_date: Optional, filter from date
  end_date: Optional, filter to date

Response (200 OK):
{
  "success": true,
  "count": 15,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440020",
      "staff_id": "550e8400-e29b-41d4-a716-446655440000",
      "earnings_id": "550e8400-e29b-41d4-a716-446655440001",
      "bonus_type": "ON_TIME",
      "amount": 15.00,
      "reason": "On-time delivery bonus (96.5% on-time)",
      "created_at": "2024-01-15T10:30:00Z"
    },
    ...
  ]
}

================================================================

DEDUCTION ENDPOINTS
===================

1. APPLY DEDUCTION (ADMIN)
==========================

POST /deduction/apply

Apply deduction to earnings (admin only).

Request Body:
{
  "staff_id": "550e8400-e29b-41d4-a716-446655440000",
  "earnings_id": "550e8400-e29b-41d4-a716-446655440001",
  "deduction_type": "COMPLAINT",
  "amount": 50.00,
  "reason": "Customer complained about late delivery",
  "reference_id": "complaint_12345"
}

Deduction Types:
  - COMPLAINT: ₹50 per complaint
  - DAMAGE: ₹200 for damaged items
  - LATE_RETURN: ₹100 for late returns
  - DISCIPLINARY: Variable amount

Response (200 OK):
{
  "success": true,
  "deduction_id": "550e8400-e29b-41d4-a716-446655440030",
  "message": "Deduction of ₹50 applied successfully"
}

---

2. GET DEDUCTIONS
=================

GET /deductions/{staff_id}?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD

Get all deductions for staff member.

Response: Similar to GET /bonuses

================================================================

PAYOUT ENDPOINTS
================

1. CREATE PAYOUT REQUEST
=======================

POST /payout/request

Create new payout request.

Request Body:
{
  "staff_id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 2000.00,
  "payment_method": "BANK_TRANSFER",
  "bank_details": {
    "account_number": "1234567890123",
    "ifsc_code": "HDFC0001234",
    "account_holder": "Rajesh Kumar"
  },
  "notes": "Monthly payout request"
}

Payment Methods & Required Fields:

BANK_TRANSFER:
  - account_number: 9-18 digits
  - ifsc_code: Format ABCD0001234
  - account_holder: Full name

UPI:
  - upi_id: Format user@bank

WALLET:
  - No additional fields

CASH:
  - No additional fields

Validation Rules:
  - amount > 0
  - amount <= available balance
  - account_number matches pattern
  - IFSC code valid format
  - UPI ID valid format

Response (200 OK):
{
  "success": true,
  "payout_id": "550e8400-e29b-41d4-a716-446655440040",
  "message": "Payout request of ₹2000 created successfully"
}

Response (400 Bad Request):
{
  "detail": "Amount exceeds available balance of ₹1840.75"
}

---

2. GET PAYOUT
=============

GET /payout/{payout_id}

Get payout request details.

Response (200 OK):
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440040",
    "staff_id": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 2000.00,
    "payment_method": "BANK_TRANSFER",
    "status": "requested",
    "bank_details": {
      "account_number": "***67890",
      "ifsc_code": "HDFC0001234",
      "account_holder": "Rajesh Kumar"
    },
    "notes": "Monthly payout request",
    "requested_at": "2024-01-15T14:30:00Z",
    "approved_at": null,
    "approved_by": null,
    "processed_at": null,
    "failure_reason": null,
    "reference_id": null
  }
}

---

3. GET PAYOUT HISTORY
=====================

GET /payouts/{staff_id}?status=requested&limit=50

Get payout history.

Query Parameters:
  status: Optional filter by status
  limit: Number of records (default: 50)

Status Values:
  - requested: Pending approval
  - approved: Approved by admin
  - processing: Payment in progress
  - completed: Successfully paid
  - failed: Payment failed
  - cancelled: Request cancelled

Response (200 OK):
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440040",
      "amount": 2000.00,
      "status": "requested",
      "requested_at": "2024-01-15T14:30:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440041",
      "amount": 1500.00,
      "status": "completed",
      "requested_at": "2024-01-08T10:00:00Z",
      "processed_at": "2024-01-08T16:45:00Z",
      "reference_id": "TXN123456789"
    },
    ...
  ]
}

---

4. APPROVE PAYOUT (ADMIN)
=========================

PUT /payout/{payout_id}/approve

Approve pending payout request.

Response (200 OK):
{
  "success": true,
  "message": "Payout approved successfully"
}

---

5. PROCESS PAYOUT (ADMIN)
=========================

PUT /payout/{payout_id}/process?reference_id=TXN123

Mark payout as completed with payment reference.

Query Parameters:
  reference_id: Payment gateway transaction ID (required)

Response (200 OK):
{
  "success": true,
  "message": "Payout marked as completed",
  "reference_id": "TXN123456789"
}

---

6. FAIL PAYOUT (ADMIN)
=====================

PUT /payout/{payout_id}/fail?failure_reason=Insufficient+balance

Mark payout as failed.

Query Parameters:
  failure_reason: Reason for failure (required)

Response (200 OK):
{
  "success": true,
  "message": "Payout marked as failed",
  "failure_reason": "Insufficient balance"
}

================================================================

ADMIN ENDPOINTS
===============

1. GET ALL PENDING PAYOUTS (ADMIN)
==================================

GET /admin/payouts?status=requested&limit=100

Get all pending payouts for admin review.

Query Parameters:
  status: Filter by status (optional)
    Default: requested,approved,processing
  limit: Number of records (default: 100)

Response (200 OK):
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440040",
      "staff_id": "550e8400-e29b-41d4-a716-446655440000",
      "amount": 2000.00,
      "status": "requested",
      "requested_at": "2024-01-15T14:30:00Z"
    },
    ...
  ]
}

---

2. GET MONTHLY REPORT (ADMIN)
=============================

GET /admin/report/monthly/{month}

Get monthly earnings report for all staff.

Path Parameters:
  month: Month in YYYY-MM format

Response (200 OK):
{
  "success": true,
  "month": "2024-01",
  "total_staff": 45,
  "summary": {
    "total_deliveries": 13500,
    "base_earnings": 270000.00,
    "total_bonuses": 28650.50,
    "total_deductions": 2350.00,
    "net_earnings": 296300.50,
    "average_rating": 4.65
  },
  "statements": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "staff_id": "550e8400-e29b-41d4-a716-446655440000",
      "month": "2024-01",
      "total_deliveries": 300,
      "net_earnings": 6530.50,
      ...
    },
    ...
  ]
}

================================================================

ERROR HANDLING
==============

All errors follow standard HTTP status codes and JSON format:

{
  "detail": "Error message describing the issue"
}

Common Errors:

400 Bad Request:
  - Invalid input data
  - Missing required fields
  - Invalid date format
  - Amount exceeds available balance

401 Unauthorized:
  - Missing Authorization header
  - Invalid or expired token

403 Forbidden:
  - Admin-only endpoint without admin role
  - Accessing other staff's data

404 Not Found:
  - Staff member not found
  - Earnings record not found
  - Payout request not found

500 Internal Server Error:
  - Database error
  - Unexpected server error
  - Third-party API failure

Example Error Response:
{
  "detail": "Invalid bank account number format"
}

================================================================

RATE LIMITING
=============

Default Rate Limits:
  - 100 requests per minute per user
  - 1000 requests per hour per user

Rate Limit Headers:
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 45
  X-RateLimit-Reset: 1705334400

When limit exceeded:
  Status: 429 Too Many Requests
  Header: Retry-After: 60

================================================================

DATA TYPES
==========

Common Data Types:

UUID:
  Format: 550e8400-e29b-41d4-a716-446655440000
  Used for: IDs, references

Float:
  Format: 2000.50
  Used for: Money, percentages, ratings

Integer:
  Format: 15
  Used for: Counts, quantities

DateTime:
  Format: 2024-01-15T14:30:00Z
  TimeZone: UTC (Z indicates UTC)
  Used for: Timestamps

Date:
  Format: 2024-01-15
  Used for: Calendar dates

String:
  Format: Text with max lengths specified
  Used for: Names, descriptions, reasons

================================================================

RESPONSE EXAMPLES
=================

Success Response Format:
{
  "success": true,
  "data": { ... },
  "count": 5  # For list responses
}

Error Response Format:
{
  "detail": "Error description"
}

List Response Format:
{
  "success": true,
  "count": 10,
  "data": [ ... ]
}

================================================================

SDK EXAMPLES
============

Python (requests):
import requests

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
headers = {"Authorization": f"Bearer {token}"}

# Get wallet summary
response = requests.get(
  "https://api.yourdomain.com/api/staff/wallet/summary/staff_id",
  headers=headers
)
summary = response.json()["data"]

JavaScript (fetch):
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
const headers = {
  "Authorization": `Bearer ${token}`,
  "Content-Type": "application/json"
};

// Get wallet summary
const response = await fetch(
  "https://api.yourdomain.com/api/staff/wallet/summary/staff_id",
  { headers }
);
const { data } = await response.json();

================================================================

WEBHOOKS (Future)
=================

Webhook events (planned for Phase 4B.3):
  - earnings.calculated
  - payout.requested
  - payout.approved
  - payout.completed
  - payout.failed
  - bonus.awarded
  - deduction.applied

Subscribe to webhooks via admin dashboard.

END OF DOCUMENT

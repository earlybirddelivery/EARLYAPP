# 🔌 Staff Earnings API Reference
## Complete Endpoint Documentation

**Base URL:** `http://localhost:8000/api/earnings`  
**Authentication:** JWT Bearer Token  
**Content-Type:** application/json

---

## 📊 Earnings Endpoints

### GET /summary
Get staff earnings summary (total, this month, pending)

**Authentication Required:** Yes  
**Roles:** delivery_boy, admin  
**Rate Limit:** 100 req/hour

**Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/earnings/summary
```

**Response (200 OK):**
```json
{
  "total_earned": 45000.00,
  "earned_this_month": 8500.00,
  "earned_today": 250.00,
  "current_balance": 5200.00,
  "pending_payout": 2000.00,
  "total_paid_out": 40000.00,
  "last_30_days_deliveries": 125,
  "status": "success"
}
```

**Error Responses:**
```json
401 Unauthorized:
{
  "detail": "Unauthorized"
}

500 Internal Server Error:
{
  "detail": "Error message"
}
```

---

### GET /my-daily/{date}
Get earnings for a specific day

**Parameters:**
- `date` (path, required): Date in YYYY-MM-DD format
- `Authorization` (header, required): Bearer token

**Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/earnings/my-daily/2024-01-27
```

**Response (200 OK):**
```json
{
  "date": "2024-01-27",
  "total_deliveries": 8,
  "on_time_count": 7,
  "total_earnings": 455.50,
  "earnings": [
    {
      "delivery_id": "D001",
      "base_amount": 50.00,
      "distance_km": 5.5,
      "distance_bonus": 2.75,
      "on_time_bonus": 2.75,
      "rating_bonus": 10.00,
      "total_amount": 65.50,
      "is_on_time": true,
      "rating": 4.8,
      "created_at": "2024-01-27T10:30:00"
    },
    {
      "delivery_id": "D002",
      "base_amount": 50.00,
      "distance_km": 3.2,
      "distance_bonus": 1.60,
      "on_time_bonus": 0,
      "rating_bonus": 0,
      "total_amount": 51.60,
      "is_on_time": false,
      "rating": 4.2,
      "created_at": "2024-01-27T11:45:00"
    }
  ],
  "status": "success"
}
```

---

### GET /my-weekly/{week_start}
Get weekly earnings summary

**Parameters:**
- `week_start` (path, required): Monday date in YYYY-MM-DD format

**Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/earnings/my-weekly/2024-01-22
```

**Response (200 OK):**
```json
{
  "week_start": "2024-01-22",
  "week_end": "2024-01-28",
  "total_deliveries": 52,
  "total_earnings": 2650.00,
  "daily_breakdown": [
    {
      "date": "2024-01-22",
      "deliveries": 7,
      "total": 350.00,
      "on_time": 6
    },
    {
      "date": "2024-01-23",
      "deliveries": 8,
      "total": 420.00,
      "on_time": 8
    }
  ],
  "status": "success"
}
```

---

### GET /my-monthly/{year}/{month}
Get monthly earnings statement

**Parameters:**
- `year` (path, required): Year (e.g., 2024)
- `month` (path, required): Month (1-12)

**Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/earnings/my-monthly/2024/01
```

**Response (200 OK):**
```json
{
  "month": 1,
  "year": 2024,
  "period": "2024-01",
  "summary": {
    "total_deliveries": 125,
    "total_base_earnings": 6250.00,
    "total_distance_bonus": 412.50,
    "total_on_time_bonus": 312.50,
    "total_rating_bonus": 500.00,
    "subtotal_from_deliveries": 7475.00
  },
  "bonuses": {
    "monthly_on_time_bonus": 250.00,
    "monthly_rating_bonus": 200.00,
    "monthly_completion_bonus": 100.00,
    "total_monthly_bonus": 550.00
  },
  "payouts": {
    "total_paid_out": 5000.00,
    "payout_count": 2
  },
  "grand_total": 8025.00,
  "generated_at": "2024-01-27T14:32:00"
}
```

---

## 💰 Bonus Endpoints

### GET /performance
Get performance metrics

**Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/earnings/performance
```

**Response (200 OK):**
```json
{
  "on_time_rate": 0.9650,
  "on_time_percentage": 96.50,
  "average_rating": 4.72,
  "total_deliveries": 125,
  "on_time_deliveries": 121,
  "bonus_eligible": true,
  "bonus_message": "You're eligible for bonus!",
  "status": "success"
}
```

---

### GET /bonuses/monthly
Get monthly bonus calculation

**Query Parameters:**
- `year` (required): Year
- `month` (required): Month (1-12)

**Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/earnings/bonuses/monthly?year=2024&month=01"
```

**Response (200 OK):**
```json
{
  "bonuses": {
    "delivery_boy_id": "DB123",
    "month": 1,
    "year": 2024,
    "total_deliveries": 125,
    "on_time_count": 121,
    "on_time_rate": 0.9680,
    "avg_rating": 4.72,
    "total_earnings": 7475.00,
    "on_time_bonus": 373.75,
    "rating_bonus": 500.00,
    "completion_bonus": 100.00,
    "total_bonus": 973.75,
    "created_at": "2024-01-27T14:32:00"
  },
  "status": "success"
}
```

---

## 👛 Wallet Endpoints

### GET /wallet
Get wallet details

**Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/earnings/wallet
```

**Response (200 OK):**
```json
{
  "wallet": {
    "delivery_boy_id": "DB123",
    "balance": 5200.00,
    "total_earned": 45000.00,
    "total_paid_out": 40000.00,
    "pending_payout": 2000.00,
    "created_at": "2023-06-15T08:00:00",
    "last_updated": "2024-01-27T14:32:00"
  },
  "status": "success"
}
```

---

## 💳 Payout Endpoints

### POST /payout/request
Request a payout

**Request Body:**
```json
{
  "amount": 2000.00,
  "payment_method": "bank_transfer"
}
```

**Allowed Values:**
- `payment_method`: "bank_transfer" | "upi"

**Request:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2000.00,
    "payment_method": "bank_transfer"
  }' \
  http://localhost:8000/api/earnings/payout/request
```

**Response (200 OK):**
```json
{
  "payout": {
    "_id": "PAY123456",
    "delivery_boy_id": "DB123",
    "amount": 2000.00,
    "payment_method": "bank_transfer",
    "status": "pending",
    "requested_at": "2024-01-27T14:32:00",
    "approved_at": null,
    "processed_at": null,
    "transaction_id": null
  },
  "message": "Payout request of ₹2000.00 created successfully",
  "status": "success"
}
```

**Error Responses:**
```json
400 Bad Request:
{
  "detail": "Minimum payout amount is ₹500"
}

400 Bad Request:
{
  "detail": "Insufficient balance"
}
```

---

### GET /payout/history
Get payout request history

**Query Parameters:**
- `limit` (optional): Max records to return (default: 10)

**Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/earnings/payout/history?limit=20"
```

**Response (200 OK):**
```json
{
  "payouts": [
    {
      "_id": "PAY123456",
      "delivery_boy_id": "DB123",
      "amount": 2000.00,
      "payment_method": "bank_transfer",
      "status": "completed",
      "requested_at": "2024-01-25T10:00:00",
      "approved_at": "2024-01-25T12:00:00",
      "processed_at": "2024-01-26T16:30:00",
      "transaction_id": "TXN-78901234567"
    },
    {
      "_id": "PAY123455",
      "delivery_boy_id": "DB123",
      "amount": 3000.00,
      "payment_method": "upi",
      "status": "completed",
      "requested_at": "2024-01-15T11:00:00",
      "approved_at": "2024-01-15T13:00:00",
      "processed_at": "2024-01-15T17:45:00",
      "transaction_id": "TXN-45678901234"
    }
  ],
  "count": 2,
  "status": "success"
}
```

---

### PUT /payout/{payout_id}/approve
Admin: Approve payout request

**Parameters:**
- `payout_id` (path, required): ID of payout to approve

**Request:**
```bash
curl -X PUT \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:8000/api/earnings/payout/PAY123456/approve
```

**Response (200 OK):**
```json
{
  "payout": {
    "_id": "PAY123456",
    "status": "approved",
    "approved_at": "2024-01-27T15:00:00",
    "approved_by": "ADMIN001"
  },
  "status": "success"
}
```

**Error Responses:**
```json
403 Forbidden:
{
  "detail": "Only admins can approve payouts"
}
```

---

### PUT /payout/{payout_id}/process
Admin: Process approved payout

**Parameters:**
- `payout_id` (path, required): ID of payout to process

**Request:**
```bash
curl -X PUT \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:8000/api/earnings/payout/PAY123456/process
```

**Response (200 OK):**
```json
{
  "payout": {
    "_id": "PAY123456",
    "status": "completed",
    "processed_at": "2024-01-27T16:30:00",
    "transaction_id": "TXN-12345678901"
  },
  "status": "success"
}
```

---

## 📄 Statement Endpoints

### GET /statement/{year}/{month}
Get monthly earning statement

**Parameters:**
- `year` (path, required): Year (e.g., 2024)
- `month` (path, required): Month (1-12)

**Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/earnings/statement/2024/01
```

**Response (200 OK):**
```json
{
  "statement": {
    "delivery_boy_id": "DB123",
    "month": 1,
    "year": 2024,
    "period": "2024-01",
    "summary": {
      "total_deliveries": 125,
      "total_base_earnings": 6250.00,
      "total_distance_bonus": 412.50,
      "total_on_time_bonus": 312.50,
      "total_rating_bonus": 500.00,
      "subtotal_from_deliveries": 7475.00
    },
    "bonuses": {
      "monthly_on_time_bonus": 250.00,
      "monthly_rating_bonus": 200.00,
      "monthly_completion_bonus": 100.00,
      "total_monthly_bonus": 550.00
    },
    "payouts": {
      "total_paid_out": 5000.00,
      "payout_count": 2
    },
    "grand_total": 8025.00,
    "generated_at": "2024-01-27T14:32:00"
  },
  "status": "success"
}
```

---

### GET /export/{year}/{month}
Export earning statement as PDF

**Parameters:**
- `year` (path, required): Year
- `month` (path, required): Month

**Request:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  -o earnings_statement.pdf \
  http://localhost:8000/api/earnings/export/2024/01
```

**Response (200 OK):**
```
PDF file binary data
```

**Headers:**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="earnings_2024_01.pdf"
```

---

## 🧪 Example Workflows

### Workflow 1: Check Today's Earnings
```bash
# Step 1: Get summary
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/earnings/summary

# Step 2: Get today's detailed earnings
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/earnings/my-daily/2024-01-27

# Step 3: Check wallet balance
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/earnings/wallet
```

### Workflow 2: Request Payout
```bash
# Step 1: Check wallet balance
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/earnings/wallet

# Step 2: Request payout (₹2000)
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 2000.00, "payment_method": "bank_transfer"}' \
  http://localhost:8000/api/earnings/payout/request

# Step 3: Admin approves (as admin)
curl -X PUT \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:8000/api/earnings/payout/PAY123456/approve

# Step 4: Admin processes (as admin)
curl -X PUT \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:8000/api/earnings/payout/PAY123456/process

# Step 5: Check history
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/earnings/payout/history
```

### Workflow 3: View Monthly Statement
```bash
# Step 1: Get monthly statement
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/earnings/statement/2024/01

# Step 2: Export as PDF
curl -H "Authorization: Bearer TOKEN" \
  -o earnings_jan_2024.pdf \
  http://localhost:8000/api/earnings/export/2024/01
```

---

## 🔑 Authentication

**Token Format:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Example:**
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  http://localhost:8000/api/earnings/summary
```

**Token Expiration:** 24 hours  
**Refresh:** Get new token by logging in

---

## ⚠️ Error Codes

| Code | Message | Solution |
|------|---------|----------|
| 400 | Bad Request | Check request parameters |
| 401 | Unauthorized | Provide valid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 422 | Unprocessable Entity | Invalid input data |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Try again later |

---

## 📊 Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| /summary | 100 | 1 hour |
| /my-daily | 100 | 1 hour |
| /my-weekly | 50 | 1 hour |
| /payout/request | 5 | 1 day |
| /performance | 100 | 1 hour |

---

**Last Updated:** January 27, 2026  
**API Version:** 1.0  
**Status:** Production Ready

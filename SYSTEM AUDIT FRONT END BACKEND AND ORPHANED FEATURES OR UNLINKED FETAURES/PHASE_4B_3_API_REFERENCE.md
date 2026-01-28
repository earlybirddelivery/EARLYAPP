# PHASE 4B.3: Customer Wallet - API Reference

**Version:** 1.0  
**Last Updated:** January 28, 2026  
**Base URL:** `/api/wallet`  
**Authentication:** Bearer Token (JWT)  

---

## 📑 QUICK REFERENCE

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/create` | Create wallet | Admin |
| GET | `/{id}` | Get wallet details | User |
| GET | `/{id}/balance` | Get balance only | User |
| POST | `/{id}/add-credits` | Add credits | Admin |
| POST | `/{id}/deduct-credits` | Use credits | User |
| POST | `/{id}/refund` | Refund order | Admin |
| GET | `/{id}/transactions` | Transaction history | User |
| GET | `/{id}/transaction-summary` | Summary stats | User |
| GET | `/{id}/expiring` | Expiring credits | User |
| GET | `/{id}/expiry-history` | Expiry history | User |
| POST | `/rewards/create` | Create reward | Admin |
| GET | `/{id}/rewards/available` | Available rewards | User |
| POST | `/{id}/rewards/apply` | Claim reward | User |
| GET | `/{id}/referral-code` | Get referral code | User |
| POST | `/referral/apply` | Apply referral | Admin |
| GET | `/{id}/tier-benefits` | Tier benefits | User |
| GET | `/{id}/statistics` | Full statistics | User |
| POST | `/bulk/add-credits` | Bulk operation | Admin |

---

## 🔐 AUTHENTICATION

All endpoints require Bearer token in Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Roles:**
- `customer` - Default user role
- `admin` - Admin operations
- `staff` - Internal staff

---

## 📦 WALLET OPERATIONS

### POST /api/wallet/create

Create new customer wallet.

**Request:**
```json
POST /api/wallet/create HTTP/1.1
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "customer_id": "cust_abc123",
  "initial_balance": 1000.00
}
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| customer_id | string | Yes | Customer ID |
| initial_balance | float | No | Initial balance (₹), default 0 |

**Response (201 Created):**
```json
{
  "_id": "wallet_123",
  "customer_id": "cust_abc123",
  "balance": 1000.00,
  "total_earned": 1000.00,
  "total_spent": 0.00,
  "total_refunded": 0.00,
  "status": "ACTIVE",
  "tier": "BRONZE",
  "created_at": "2026-01-28T10:30:00Z",
  "updated_at": "2026-01-28T10:30:00Z",
  "last_transaction_date": null,
  "metadata": {
    "referral_code": "REFCUSTABC123XYZ",
    "referral_count": 0
  }
}
```

**Errors:**
```json
400 Bad Request
{
  "error": "Wallet already exists for customer cust_abc123"
}
```

---

### GET /api/wallet/{customer_id}

Get complete wallet details.

**Request:**
```
GET /api/wallet/cust_abc123 HTTP/1.1
Authorization: Bearer TOKEN
```

**Response (200 OK):**
```json
{
  "_id": "wallet_123",
  "customer_id": "cust_abc123",
  "balance": 2500.50,
  "total_earned": 5000.00,
  "total_spent": 2000.00,
  "total_refunded": 500.00,
  "status": "ACTIVE",
  "tier": "GOLD",
  "created_at": "2026-01-15T10:00:00Z",
  "updated_at": "2026-01-28T15:30:00Z",
  "last_transaction_date": "2026-01-28T15:30:00Z",
  "metadata": {
    "referral_code": "REFCUSTABC123XYZ",
    "referral_count": 2,
    "total_purchases_eligible": 8
  }
}
```

---

### GET /api/wallet/{customer_id}/balance

Get wallet balance only (lightweight).

**Request:**
```
GET /api/wallet/cust_abc123/balance HTTP/1.1
Authorization: Bearer TOKEN
```

**Response (200 OK):**
```json
{
  "balance": 2500.50
}
```

---

## 💳 CREDIT OPERATIONS

### POST /api/wallet/{customer_id}/add-credits

Add credits to wallet.

**Request:**
```json
POST /api/wallet/cust_abc123/add-credits HTTP/1.1
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "amount": 500.00,
  "reason": "Order purchase reward",
  "source": "purchase",
  "expiry_days": 365,
  "metadata": {
    "order_id": "order_789",
    "reward_percentage": 0.25
  }
}
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| amount | float | Yes | Amount in ₹ (must be > 0) |
| reason | string | Yes | Reason for addition |
| source | string | No | Source type (purchase, referral, promotion, loyalty, refund, manual) |
| expiry_days | integer | No | Days until expiry, null = no expiry |
| metadata | object | No | Additional context |

**Response (201 Created):**
```json
{
  "_id": "tx_123",
  "customer_id": "cust_abc123",
  "wallet_id": "wallet_123",
  "type": "CREDIT",
  "amount": 500.00,
  "reason": "Order purchase reward",
  "source": "purchase",
  "status": "COMPLETED",
  "expiry_date": "2027-01-28T00:00:00Z",
  "created_at": "2026-01-28T10:30:00Z",
  "metadata": {
    "order_id": "order_789",
    "reward_percentage": 0.25
  }
}
```

**Errors:**
```json
400 Bad Request
{
  "error": "Wallet not found for customer cust_abc123"
}
```

---

### POST /api/wallet/{customer_id}/deduct-credits

Deduct (use) credits from wallet.

**Request:**
```json
POST /api/wallet/cust_abc123/deduct-credits HTTP/1.1
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "amount": 250.00,
  "reason": "Order payment",
  "order_id": "order_456"
}
```

**Response (200 OK):**
```json
{
  "_id": "tx_124",
  "customer_id": "cust_abc123",
  "wallet_id": "wallet_123",
  "type": "DEBIT",
  "amount": 250.00,
  "reason": "Order payment",
  "order_id": "order_456",
  "status": "COMPLETED",
  "created_at": "2026-01-28T11:00:00Z"
}
```

**Errors:**
```json
400 Bad Request
{
  "error": "Insufficient balance. Available: ₹100, Requested: ₹250"
}
```

---

### POST /api/wallet/{customer_id}/refund

Refund credits for cancelled order.

**Request:**
```json
POST /api/wallet/cust_abc123/refund HTTP/1.1
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "amount": 500.00,
  "order_id": "order_456",
  "reason": "Customer cancellation"
}
```

**Response (200 OK):**
```json
{
  "_id": "tx_125",
  "customer_id": "cust_abc123",
  "type": "REFUND",
  "amount": 500.00,
  "reason": "Customer cancellation",
  "order_id": "order_456",
  "status": "COMPLETED",
  "created_at": "2026-01-28T11:30:00Z",
  "metadata": {
    "refund_type": "wallet_credit",
    "order_id": "order_456"
  }
}
```

---

## 📋 TRANSACTION HISTORY

### GET /api/wallet/{customer_id}/transactions

Get paginated transaction history with filters.

**Request:**
```
GET /api/wallet/cust_abc123/transactions?limit=20&skip=0&type=CREDIT&start_date=2026-01-01T00:00:00Z&end_date=2026-01-31T23:59:59Z HTTP/1.1
Authorization: Bearer TOKEN
```

**Query Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| limit | integer | 50 | Records per page |
| skip | integer | 0 | Records to skip (pagination) |
| type | string | - | Filter: CREDIT, DEBIT, REFUND |
| start_date | string | - | ISO datetime (inclusive) |
| end_date | string | - | ISO datetime (inclusive) |

**Response (200 OK):**
```json
{
  "transactions": [
    {
      "_id": "tx_125",
      "customer_id": "cust_abc123",
      "type": "CREDIT",
      "amount": 500.00,
      "reason": "Order purchase reward",
      "source": "purchase",
      "status": "COMPLETED",
      "expiry_date": "2027-01-28T00:00:00Z",
      "created_at": "2026-01-28T10:30:00Z"
    }
  ],
  "total": 47,
  "limit": 20,
  "skip": 0
}
```

---

### GET /api/wallet/{customer_id}/transaction-summary

Get transaction summary statistics.

**Request:**
```
GET /api/wallet/cust_abc123/transaction-summary HTTP/1.1
Authorization: Bearer TOKEN
```

**Response (200 OK):**
```json
{
  "credit_total": 5000.00,
  "credit_count": 15,
  "debit_total": 2000.00,
  "debit_count": 8,
  "refund_total": 500.00,
  "refund_count": 2
}
```

---

## 🎁 LOYALTY REWARDS

### POST /api/wallet/rewards/create

Create loyalty reward program (Admin only).

**Request:**
```json
POST /api/wallet/rewards/create HTTP/1.1
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "name": "Birthday Month Bonus",
  "description": "Get ₹500 extra credits in your birthday month",
  "credit_amount": 500.00,
  "min_purchase_amount": 0.00,
  "max_uses": 1000,
  "valid_from": "2026-02-01T00:00:00Z",
  "valid_until": "2026-12-31T23:59:59Z",
  "applicable_to": []
}
```

**Response (201 Created):**
```json
{
  "_id": "reward_123",
  "name": "Birthday Month Bonus",
  "description": "Get ₹500 extra credits in your birthday month",
  "credit_amount": 500.00,
  "min_purchase_amount": 0.00,
  "max_uses": 1000,
  "total_uses": 0,
  "status": "ACTIVE",
  "created_at": "2026-01-28T09:00:00Z"
}
```

---

### GET /api/wallet/{customer_id}/rewards/available

Get available rewards for customer.

**Request:**
```
GET /api/wallet/cust_abc123/rewards/available HTTP/1.1
Authorization: Bearer TOKEN
```

**Response (200 OK):**
```json
{
  "rewards": [
    {
      "_id": "reward_123",
      "name": "Birthday Month Bonus",
      "description": "Get ₹500 extra credits",
      "credit_amount": 500.00,
      "min_purchase_amount": 0.00,
      "max_uses": 1000,
      "total_uses": 234,
      "valid_until": "2026-12-31T23:59:59Z"
    }
  ]
}
```

---

### POST /api/wallet/{customer_id}/rewards/apply

Claim loyalty reward.

**Request:**
```json
POST /api/wallet/cust_abc123/rewards/apply HTTP/1.1
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "reward_id": "reward_123",
  "order_id": "order_789"
}
```

**Response (200 OK):**
```json
{
  "_id": "tx_126",
  "customer_id": "cust_abc123",
  "type": "CREDIT",
  "amount": 500.00,
  "reason": "Loyalty reward: Birthday Month Bonus",
  "source": "loyalty",
  "status": "COMPLETED",
  "created_at": "2026-01-28T14:00:00Z"
}
```

---

## ⏰ CREDIT EXPIRY

### GET /api/wallet/{customer_id}/expiring

Get credits expiring within specified days.

**Request:**
```
GET /api/wallet/cust_abc123/expiring?days_ahead=30 HTTP/1.1
Authorization: Bearer TOKEN
```

**Query Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| days_ahead | integer | 30 | Check ahead X days |

**Response (200 OK):**
```json
{
  "expiring": [
    {
      "_id": "tx_100",
      "amount": 100.00,
      "expiry_date": "2026-02-15T00:00:00Z",
      "days_remaining": 18,
      "reason": "Order purchase reward"
    }
  ]
}
```

---

### GET /api/wallet/{customer_id}/expiry-history

Get credit expiry history.

**Request:**
```
GET /api/wallet/cust_abc123/expiry-history HTTP/1.1
Authorization: Bearer TOKEN
```

**Response (200 OK):**
```json
{
  "history": [
    {
      "_id": "expiry_123",
      "customer_id": "cust_abc123",
      "amount": 100.00,
      "original_expiry": "2025-12-01T00:00:00Z",
      "expired_at": "2025-12-01T03:00:00Z",
      "reason": "Automatic expiry - 365 days passed"
    }
  ]
}
```

---

## 👥 REFERRAL SYSTEM

### GET /api/wallet/{customer_id}/referral-code

Get customer's referral code.

**Request:**
```
GET /api/wallet/cust_abc123/referral-code HTTP/1.1
Authorization: Bearer TOKEN
```

**Response (200 OK):**
```json
{
  "referral_code": "REFCUSTABC123XYZ"
}
```

---

### POST /api/wallet/referral/apply

Apply referral bonus to both customers (Admin only).

**Request:**
```json
POST /api/wallet/referral/apply HTTP/1.1
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "referrer_id": "cust_123",
  "referred_id": "cust_456",
  "bonus_amount": 100.00
}
```

**Response (200 OK):**
```json
{
  "referrer_transaction": {
    "_id": "tx_127",
    "customer_id": "cust_123",
    "amount": 100.00,
    "reason": "Referral bonus"
  },
  "referred_transaction": {
    "_id": "tx_128",
    "customer_id": "cust_456",
    "amount": 50.00,
    "reason": "Referral signup bonus"
  }
}
```

---

## 🏅 TIER & BENEFITS

### GET /api/wallet/{customer_id}/tier-benefits

Get tier and benefits information.

**Request:**
```
GET /api/wallet/cust_abc123/tier-benefits HTTP/1.1
Authorization: Bearer TOKEN
```

**Response (200 OK):**
```json
{
  "tier": "GOLD",
  "benefits": {
    "min_balance": 5000,
    "max_balance": 9999.99,
    "credit_expiry_days": 1095,
    "bonus_multiplier": 1.10,
    "exclusive_rewards": [
      "gold_cashback",
      "gold_vip_access",
      "gold_free_delivery"
    ],
    "benefits": [
      "₹5000+: Premium benefits",
      "Credits expire after 3 years",
      "Extra 10% bonus on rewards",
      "VIP customer support (priority)",
      "Free delivery on all orders",
      "Exclusive early access to sales"
    ]
  }
}
```

---

## 📊 STATISTICS

### GET /api/wallet/{customer_id}/statistics

Get comprehensive wallet statistics.

**Request:**
```
GET /api/wallet/cust_abc123/statistics HTTP/1.1
Authorization: Bearer TOKEN
```

**Response (200 OK):**
```json
{
  "customer_id": "cust_abc123",
  "current_balance": 2500.50,
  "total_earned": 5000.00,
  "total_spent": 2000.00,
  "total_refunded": 500.00,
  "tier": "GOLD",
  "tier_benefits": {
    "min_balance": 5000,
    "credit_expiry_days": 1095,
    "bonus_multiplier": 1.10
  },
  "referral_code": "REFCUSTABC123XYZ",
  "referral_count": 2,
  "transactions": {
    "credit_total": 5000.00,
    "credit_count": 15,
    "debit_total": 2000.00,
    "debit_count": 8,
    "refund_total": 500.00,
    "refund_count": 2
  },
  "expiring_soon": 1,
  "created_at": "2026-01-15T10:00:00Z",
  "last_transaction": "2026-01-28T15:30:00Z"
}
```

---

## 📦 BULK OPERATIONS

### POST /api/wallet/bulk/add-credits

Add credits to multiple customers (Admin only).

**Request:**
```json
POST /api/wallet/bulk/add-credits HTTP/1.1
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "credits": [
    {
      "customer_id": "cust_123",
      "amount": 500,
      "reason": "Campaign bonus",
      "source": "promotion"
    },
    {
      "customer_id": "cust_456",
      "amount": 250,
      "reason": "Campaign bonus",
      "source": "promotion"
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "results": [
    {
      "status": "success",
      "transaction": {
        "_id": "tx_129",
        "customer_id": "cust_123",
        "amount": 500
      }
    },
    {
      "status": "success",
      "transaction": {
        "_id": "tx_130",
        "customer_id": "cust_456",
        "amount": 250
      }
    }
  ]
}
```

---

## ⚠️ ERROR RESPONSES

### Common Errors

**400 Bad Request**
```json
{
  "error": "Valid amount required"
}
```

**401 Unauthorized**
```json
{
  "error": "Missing authorization"
}
```

**403 Forbidden**
```json
{
  "error": "Insufficient permissions"
}
```

**404 Not Found**
```json
{
  "error": "Wallet not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error"
}
```

---

## 🔄 TRANSACTION TYPES & SOURCES

### Transaction Types
- `CREDIT` - Credits added
- `DEBIT` - Credits used
- `REFUND` - Refund issued

### Credit Sources
- `purchase` - From product purchase
- `referral` - From referral bonus
- `promotion` - From promotional campaign
- `loyalty` - From loyalty reward
- `refund` - From order refund
- `manual` - Admin manual addition

### Wallet Status
- `ACTIVE` - Wallet active and usable
- `FROZEN` - Temporary freeze
- `SUSPENDED` - Permanently suspended

---

## 🎯 RATE LIMITS

- **Per user**: 100 requests/minute
- **Per admin**: 1000 requests/minute
- **Bulk operations**: 10 requests/minute

---

**API Version:** 1.0  
**Last Updated:** January 28, 2026  
**Maintained By:** Backend Team

# PHASE 4B.1: PAYMENT GATEWAY INTEGRATION - API REFERENCE

**Version:** 1.0  
**Last Updated:** January 27, 2026  
**Status:** ✅ PRODUCTION READY

---

## TABLE OF CONTENTS

1. [Base URL & Authentication](#base-url--authentication)
2. [Payment Endpoints](#payment-endpoints)
3. [Webhook Endpoints](#webhook-endpoints)
4. [Saved Methods Endpoints](#saved-methods-endpoints)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Code Examples](#code-examples)

---

## BASE URL & AUTHENTICATION

### Base URL
```
https://yourdomain.com/api
```

### Authentication
All endpoints (except webhooks) require Bearer token authentication:

```http
Authorization: Bearer <jwt_token>
```

### Headers
```http
Content-Type: application/json
Authorization: Bearer <token>
```

---

## PAYMENT ENDPOINTS

### 1. Initiate Payment

Create a new payment order and initialize gateway.

**Endpoint:** `POST /payments/initiate`

**Authentication:** Required

**Request Body:**
```json
{
  "order_id": "ORDER-001",
  "amount": 1000.00,
  "payment_method": "card",
  "gateway": "razorpay",
  "saved_method_id": null,
  "installments": 1,
  "notes": "Order payment"
}
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| order_id | string | Yes | Unique order identifier |
| amount | number | Yes | Payment amount in INR (min: 1, max: 999999.99) |
| payment_method | string | Yes | Method: card, upi, wallet, netbanking, paypal |
| gateway | string | No | Gateway to use (default: razorpay) |
| saved_method_id | string | No | Use saved payment method |
| installments | integer | No | Number of installments (1-12) |
| notes | string | No | Payment notes (max: 500 chars) |

**Response (Success - 200):**
```json
{
  "status": "success",
  "data": {
    "payment_id": "PAY-6789abcdef",
    "gateway_order_id": "order_1234567890",
    "amount": 1000.00,
    "currency": "INR",
    "gateway": "razorpay",
    "checkout_url": null,
    "key": "rzp_live_xxxxxxxxxxxxx",
    "expires_at": "2026-01-27T11:00:00Z"
  }
}
```

**Response (Error - 400):**
```json
{
  "status": "error",
  "error_code": "INVALID_AMOUNT",
  "message": "Payment amount must be between 1 and 999999.99",
  "details": {
    "received": 0,
    "min": 1,
    "max": 999999.99
  }
}
```

**Error Codes:**
| Code | Status | Description |
|------|--------|-------------|
| INVALID_AMOUNT | 400 | Amount is invalid |
| DUPLICATE_ORDER | 400 | Order already has payment |
| GATEWAY_ERROR | 502 | Gateway connection failed |
| INVALID_GATEWAY | 400 | Unsupported payment gateway |
| AUTH_REQUIRED | 401 | Authentication required |
| INSUFFICIENT_FUNDS | 402 | Wallet insufficient balance |

**cURL Example:**
```bash
curl -X POST https://yourdomain.com/api/payments/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{
    "order_id": "ORDER-001",
    "amount": 1000.00,
    "payment_method": "card"
  }'
```

---

### 2. Verify Payment

Verify payment after user completes transaction.

**Endpoint:** `POST /payments/{payment_id}/verify`

**Authentication:** Required

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| payment_id | string | Payment ID from initiate endpoint |

**Request Body:**
```json
{
  "gateway_payment_id": "pay_1234567890",
  "signature": "xxxxxxxxxxxxxxxxxxxx"
}
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| gateway_payment_id | string | Yes | Payment ID from gateway |
| signature | string | Yes | Signature for verification |

**Response (Success - 200):**
```json
{
  "status": "success",
  "data": {
    "payment_id": "PAY-6789abcdef",
    "order_id": "ORDER-001",
    "amount": 1000.00,
    "status": "COMPLETED",
    "gateway_payment_id": "pay_1234567890",
    "method_type": "card",
    "last4": "4567",
    "verified_at": "2026-01-27T10:05:30Z"
  }
}
```

**Response (Error - 400):**
```json
{
  "status": "error",
  "error_code": "INVALID_SIGNATURE",
  "message": "Payment signature verification failed",
  "details": {
    "expected": "xxxxxxxx",
    "received": "yyyyyyyy"
  }
}
```

**Error Codes:**
| Code | Status | Description |
|------|--------|-------------|
| INVALID_SIGNATURE | 400 | Signature mismatch |
| PAYMENT_NOT_FOUND | 404 | Payment order not found |
| PAYMENT_FAILED | 402 | Payment failed in gateway |
| PAYMENT_EXPIRED | 400 | Payment order expired |

**JavaScript Example:**
```javascript
async function verifyPayment(paymentId, gatewayPaymentId, signature) {
  const response = await fetch(`/api/payments/${paymentId}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      gateway_payment_id: gatewayPaymentId,
      signature: signature
    })
  });
  
  return response.json();
}
```

---

### 3. Get Payment Details

Retrieve payment information.

**Endpoint:** `GET /payments/{payment_id}`

**Authentication:** Required

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| payment_id | string | Payment ID |

**Response (Success - 200):**
```json
{
  "status": "success",
  "data": {
    "id": "PAY-6789abcdef",
    "order_id": "ORDER-001",
    "customer_id": "CUST-001",
    "amount": 1000.00,
    "currency": "INR",
    "status": "COMPLETED",
    "method_type": "card",
    "last4": "4567",
    "gateway": "razorpay",
    "gateway_order_id": "order_1234567890",
    "gateway_payment_id": "pay_1234567890",
    "receipt": "ORD-001-PAY-001",
    "created_at": "2026-01-27T10:00:00Z",
    "updated_at": "2026-01-27T10:05:30Z"
  }
}
```

**cURL Example:**
```bash
curl -X GET https://yourdomain.com/api/payments/PAY-6789abcdef \
  -H "Authorization: Bearer eyJhbGc..."
```

---

### 4. Process Refund

Refund a payment (full or partial).

**Endpoint:** `POST /payments/{payment_id}/refund`

**Authentication:** Required

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| payment_id | string | Payment ID to refund |

**Request Body:**
```json
{
  "amount": 500.00,
  "reason": "customer_request",
  "notes": "Customer refund request"
}
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| amount | number | No | Refund amount (default: full refund) |
| reason | string | Yes | Reason: customer_request, dispute, damaged, not_delivered |
| notes | string | No | Additional notes (max: 500 chars) |

**Response (Success - 200):**
```json
{
  "status": "success",
  "data": {
    "refund_id": "REFUND-123abc",
    "payment_id": "PAY-6789abcdef",
    "amount": 500.00,
    "status": "COMPLETED",
    "gateway_refund_id": "rfnd_1234567890",
    "created_at": "2026-01-27T10:10:00Z",
    "completed_at": "2026-01-27T10:10:30Z"
  }
}
```

**Response (Error - 400):**
```json
{
  "status": "error",
  "error_code": "INVALID_REFUND",
  "message": "Refund amount exceeds payment amount",
  "details": {
    "payment_amount": 1000.00,
    "refund_amount": 1500.00
  }
}
```

**Error Codes:**
| Code | Status | Description |
|------|--------|-------------|
| INVALID_REFUND | 400 | Refund amount invalid |
| NOT_REFUNDABLE | 400 | Payment cannot be refunded |
| DUPLICATE_REFUND | 400 | Refund already exists |
| REFUND_TIMEOUT | 400 | Refund window expired |

**cURL Example:**
```bash
curl -X POST https://yourdomain.com/api/payments/PAY-6789abcdef/refund \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{
    "amount": 500.00,
    "reason": "customer_request"
  }'
```

---

## SAVED METHODS ENDPOINTS

### 5. Get Saved Payment Methods

Retrieve all saved payment methods for customer.

**Endpoint:** `GET /payments/saved-methods`

**Authentication:** Required

**Query Parameters:** None

**Response (Success - 200):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "SAVED-001",
      "type": "card",
      "last4": "4567",
      "expiry": "12/25",
      "is_default": true,
      "created_at": "2026-01-20T10:00:00Z"
    },
    {
      "id": "SAVED-002",
      "type": "upi",
      "last4": "user@hdfc",
      "is_default": false,
      "created_at": "2026-01-25T14:30:00Z"
    }
  ]
}
```

---

### 6. Save New Payment Method

Add a new payment method.

**Endpoint:** `POST /payments/save-method`

**Authentication:** Required

**Request Body (Card):**
```json
{
  "type": "card",
  "cardNumber": "4532123456789010",
  "cardholderName": "John Doe",
  "expiryMonth": "12",
  "expiryYear": "25",
  "cvv": "123",
  "saveCard": true
}
```

**Request Body (UPI):**
```json
{
  "type": "upi",
  "upiId": "user@hdfc",
  "saveUpi": true
}
```

**Response (Success - 201):**
```json
{
  "status": "success",
  "data": {
    "method_id": "SAVED-003",
    "type": "card",
    "last4": "9010",
    "expiry": "12/25",
    "is_default": false,
    "created_at": "2026-01-27T10:15:00Z"
  }
}
```

**Error Codes:**
| Code | Status | Description |
|------|--------|-------------|
| INVALID_CARD | 400 | Invalid card number |
| INVALID_UPI | 400 | Invalid UPI format |
| DUPLICATE_METHOD | 400 | Payment method already saved |

---

### 7. Update Default Payment Method

Set a saved method as default.

**Endpoint:** `PATCH /payments/saved-methods/{method_id}/set-default`

**Authentication:** Required

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| method_id | string | Saved method ID |

**Response (Success - 200):**
```json
{
  "status": "success",
  "message": "Default method updated"
}
```

---

### 8. Delete Saved Payment Method

Remove a saved payment method.

**Endpoint:** `DELETE /payments/saved-methods/{method_id}`

**Authentication:** Required

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| method_id | string | Saved method ID to delete |

**Response (Success - 200):**
```json
{
  "status": "success",
  "message": "Payment method deleted successfully"
}
```

---

## PAYMENT HISTORY ENDPOINTS

### 9. Get Payment History

Retrieve customer's payment history.

**Endpoint:** `GET /payments/history`

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | integer | 50 | Results per page (max: 100) |
| skip | integer | 0 | Number of results to skip |
| status | string | - | Filter by status |
| from_date | string | - | ISO date for start range |
| to_date | string | - | ISO date for end range |

**Response (Success - 200):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "PAY-001",
      "order_id": "ORDER-001",
      "amount": 1000.00,
      "status": "COMPLETED",
      "method_type": "card",
      "created_at": "2026-01-27T10:00:00Z"
    },
    {
      "id": "PAY-002",
      "order_id": "ORDER-002",
      "amount": 500.00,
      "status": "COMPLETED",
      "method_type": "upi",
      "created_at": "2026-01-26T14:30:00Z"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 50,
    "skip": 0,
    "pages": 1
  }
}
```

**cURL Example:**
```bash
curl -X GET "https://yourdomain.com/api/payments/history?limit=10&status=COMPLETED" \
  -H "Authorization: Bearer eyJhbGc..."
```

---

## WEBHOOK ENDPOINTS

### 10. Razorpay Webhook

Receive Razorpay payment events.

**Endpoint:** `POST /webhooks/razorpay`

**Authentication:** None (signature verified)

**Headers:**
```
X-Razorpay-Signature: <webhook_signature>
```

**Request Body:**
```json
{
  "event": "payment.captured",
  "created_at": 1600256767,
  "payload": {
    "payment": {
      "id": "pay_1234567890",
      "status": "captured",
      "amount": 100000
    },
    "order": {
      "id": "order_1234567890"
    }
  }
}
```

**Response (Success - 200):**
```json
{
  "status": "ok"
}
```

**Events Handled:**
- `payment.authorized` - Payment authorized
- `payment.captured` - Payment captured
- `payment.failed` - Payment failed
- `refund.created` - Refund initiated
- `refund.completed` - Refund successful

---

### 11. PayPal Webhook

Receive PayPal payment events.

**Endpoint:** `POST /webhooks/paypal`

**Authentication:** None (signature verified)

**Request Body:**
```json
{
  "id": "WH-123456789",
  "event_type": "CHECKOUT.ORDER.COMPLETED",
  "create_time": "2026-01-27T10:00:00Z",
  "resource": {
    "id": "order_1234567890",
    "status": "COMPLETED"
  }
}
```

**Response (Success - 200):**
```json
{
  "status": "ok"
}
```

**Events Handled:**
- `CHECKOUT.ORDER.COMPLETED` - Order completed
- `CHECKOUT.ORDER.APPROVED` - Order approved
- `PAYMENT.CAPTURE.COMPLETED` - Payment captured
- `PAYMENT.CAPTURE.REFUNDED` - Payment refunded

---

## ERROR HANDLING

### Error Response Format

```json
{
  "status": "error",
  "error_code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional error details"
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 402 | Payment Required |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 429 | Too Many Requests |
| 500 | Server Error |
| 502 | Bad Gateway |
| 503 | Service Unavailable |

### Common Error Codes

```
INVALID_REQUEST        - Request format invalid
INVALID_AMOUNT         - Amount invalid
INVALID_PAYMENT_METHOD - Unsupported payment method
PAYMENT_NOT_FOUND      - Payment order not found
PAYMENT_FAILED         - Payment processing failed
INVALID_SIGNATURE      - Signature verification failed
GATEWAY_ERROR          - Gateway connection error
RATE_LIMITED           - Too many requests
INSUFFICIENT_FUNDS     - Insufficient balance
DUPLICATE_ENTRY        - Duplicate order/payment
AUTHENTICATION_FAILED  - Invalid credentials
```

---

## RATE LIMITING

### Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| /payments/initiate | 10 | 1 minute |
| /payments/*/verify | 20 | 1 minute |
| /payments/*/refund | 5 | 1 minute |
| /payments/history | 30 | 1 minute |
| /webhooks/* | Unlimited | - |

### Rate Limit Headers

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 8
X-RateLimit-Reset: 1640000000
```

### Rate Limit Response (429)

```json
{
  "status": "error",
  "error_code": "RATE_LIMITED",
  "message": "Too many requests. Please try again later.",
  "details": {
    "retry_after_seconds": 60
  }
}
```

---

## CODE EXAMPLES

### JavaScript/Node.js

#### Initiate Payment
```javascript
async function initiatePayment(orderId, amount) {
  try {
    const response = await fetch('/api/payments/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        order_id: orderId,
        amount: amount,
        payment_method: 'card'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message);
    }

    // Open Razorpay checkout
    const options = {
      key: data.data.key,
      order_id: data.data.gateway_order_id,
      amount: amount * 100,
      currency: 'INR',
      handler: function(response) {
        verifyPayment(
          data.data.payment_id,
          response.razorpay_payment_id,
          response.razorpay_signature
        );
      }
    };

    const razorpay = new Razorpay(options);
    razorpay.open();
  } catch (error) {
    console.error('Error initiating payment:', error);
  }
}
```

#### Verify Payment
```javascript
async function verifyPayment(paymentId, gatewayPaymentId, signature) {
  try {
    const response = await fetch(`/api/payments/${paymentId}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        gateway_payment_id: gatewayPaymentId,
        signature: signature
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('Payment successful!', data.data);
      window.location.href = '/success';
    } else {
      console.error('Payment verification failed:', data.message);
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
  }
}
```

#### Get Saved Methods
```javascript
async function getSavedMethods() {
  try {
    const response = await fetch('/api/payments/saved-methods', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      return data.data;  // Array of saved methods
    } else {
      console.error('Error fetching methods:', data.message);
      return [];
    }
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}
```

### Python

#### Initiate Payment
```python
import requests
from decimal import Decimal

def initiate_payment(order_id: str, amount: Decimal, auth_token: str):
    """Initiate payment"""
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {auth_token}'
    }
    
    payload = {
        'order_id': order_id,
        'amount': float(amount),
        'payment_method': 'card'
    }
    
    response = requests.post(
        'https://yourdomain.com/api/payments/initiate',
        json=payload,
        headers=headers
    )
    
    if response.status_code == 200:
        return response.json()['data']
    else:
        raise Exception(response.json()['message'])

# Usage
payment_data = initiate_payment('ORDER-001', Decimal('1000.00'), token)
print(f"Payment ID: {payment_data['payment_id']}")
print(f"Order ID: {payment_data['gateway_order_id']}")
```

#### Verify Payment
```python
def verify_payment(payment_id: str, gateway_payment_id: str, 
                  signature: str, auth_token: str):
    """Verify payment"""
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {auth_token}'
    }
    
    payload = {
        'gateway_payment_id': gateway_payment_id,
        'signature': signature
    }
    
    response = requests.post(
        f'https://yourdomain.com/api/payments/{payment_id}/verify',
        json=payload,
        headers=headers
    )
    
    return response.json()

# Usage
result = verify_payment('PAY-001', 'pay_1234', 'signature', token)
if result['status'] == 'success':
    print("Payment verified!")
```

---

**Version:** 1.0  
**Last Updated:** January 27, 2026  
**Status:** ✅ PRODUCTION READY

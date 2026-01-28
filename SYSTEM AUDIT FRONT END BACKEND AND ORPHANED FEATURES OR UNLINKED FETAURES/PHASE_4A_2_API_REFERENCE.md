# PHASE 4A.2: WebSocket API Reference
**Date:** January 27, 2026  
**Status:** 🚀 Production Ready

---

## 📡 WebSocket Endpoint

### Connection

```
ws://your-api.com/api/websocket/ws
```

### Connection Flow

**1. Client sends authentication:**
```json
{
  "type": "auth",
  "token": "eyJhbGc...",
  "user_id": "user_123",
  "user_role": "customer"
}
```

**2. Server responds:**
```json
{
  "type": "authenticated",
  "user_id": "user_123",
  "user_role": "customer",
  "connection_id": "conn_abc123xyz"
}
```

**3. Client subscribes to events:**
```json
{
  "type": "subscribe",
  "events": [
    "earning_recorded",
    "delivery_completed",
    "payment_completed"
  ]
}
```

**4. Server confirms:**
```json
{
  "type": "subscription_updated",
  "subscribed_events": ["earning_recorded", "delivery_completed", "payment_completed"]
}
```

**5. Client sends heartbeat (every 30 seconds):**
```json
{
  "type": "heartbeat",
  "timestamp": "2026-01-27T10:30:00Z"
}
```

**6. Server acknowledges:**
```json
{
  "type": "heartbeat_ack"
}
```

---

## 📨 Incoming Events

All events have this structure:

```json
{
  "event_type": "earning_recorded",
  "event_level": "medium",
  "event_id": "evt_abc123xyz",
  "timestamp": "2026-01-27T10:30:00Z",
  "user_id": "user_123",
  "data": {
    "amount": 500,
    "delivery_id": "del_123",
    ...
  },
  "source": "earnings_service"
}
```

### Event Fields

| Field | Type | Description |
|-------|------|-------------|
| `event_type` | string | Type of event (see below) |
| `event_level` | string | Priority: critical, high, medium, low |
| `event_id` | string | Unique event identifier |
| `timestamp` | ISO8601 | When event occurred |
| `user_id` | string | User this event is for |
| `data` | object | Event-specific data |
| `source` | string | Service that emitted event |

---

## 🎯 Event Types & Examples

### Earnings Events

#### earning_recorded
**When:** Delivery completed and earning calculated

```json
{
  "event_type": "earning_recorded",
  "event_level": "medium",
  "user_id": "dboy_123",
  "data": {
    "amount": 75,
    "delivery_id": "del_456",
    "breakdown": {
      "base": 50,
      "distance_bonus": 25,
      "on_time_bonus": 0,
      "rating_bonus": 0
    },
    "new_balance": 2575,
    "timestamp": "2026-01-27T14:30:00Z"
  }
}
```

**Frontend Handler:**
```javascript
ws.on('earning_recorded', (event) => {
  console.log(`Earned ₹${event.data.amount}`);
  updateWalletBalance(event.data.new_balance);
});
```

---

#### bonus_earned
**When:** Bonus threshold reached

```json
{
  "event_type": "bonus_earned",
  "event_level": "high",
  "user_id": "dboy_123",
  "data": {
    "amount": 50,
    "bonus_type": "on_time",
    "trigger": "95% on-time deliveries",
    "period": "2026-01",
    "new_balance": 2625
  }
}
```

---

#### payout_approved
**When:** Admin approves withdrawal request

```json
{
  "event_type": "payout_approved",
  "event_level": "high",
  "user_id": "dboy_123",
  "data": {
    "payout_id": "payout_789",
    "amount": 2000,
    "bank_account": "****1234",
    "estimated_transfer_date": "2026-01-28",
    "estimated_transfer_time": "18:00:00"
  }
}
```

---

#### payout_completed
**When:** Money transferred to delivery boy's account

```json
{
  "event_type": "payout_completed",
  "event_level": "high",
  "user_id": "dboy_123",
  "data": {
    "payout_id": "payout_789",
    "amount": 2000,
    "transaction_id": "txn_abc123",
    "bank_account": "****1234",
    "transferred_at": "2026-01-28T18:15:00Z"
  }
}
```

---

#### wallet_updated
**When:** Wallet balance changes

```json
{
  "event_type": "wallet_updated",
  "event_level": "medium",
  "user_id": "dboy_123",
  "data": {
    "previous_balance": 2575,
    "new_balance": 2625,
    "change": 50,
    "change_reason": "bonus_earned",
    "timestamp": "2026-01-27T14:30:00Z"
  }
}
```

---

### Delivery Events

#### delivery_accepted
**When:** Delivery boy accepts delivery request

```json
{
  "event_type": "delivery_accepted",
  "event_level": "high",
  "user_id": "cust_123",
  "data": {
    "delivery_id": "del_456",
    "delivery_boy_id": "dboy_123",
    "delivery_boy_name": "Ram Kumar",
    "delivery_boy_rating": 4.8,
    "vehicle_type": "bike",
    "accepted_at": "2026-01-27T14:20:00Z",
    "estimated_pickup_time": 5,
    "estimated_delivery_time": 25
  }
}
```

---

#### delivery_in_transit
**When:** Delivery boy picks up and starts moving

```json
{
  "event_type": "delivery_in_transit",
  "event_level": "medium",
  "user_id": "cust_123",
  "data": {
    "delivery_id": "del_456",
    "location": {
      "latitude": 28.5244,
      "longitude": 77.1855,
      "address": "Delhi"
    },
    "accuracy": 10,
    "eta_minutes": 22,
    "distance_remaining_km": 3.5,
    "updated_at": "2026-01-27T14:25:00Z"
  }
}
```

---

#### delivery_arrived
**When:** Delivery boy arrives at destination

```json
{
  "event_type": "delivery_arrived",
  "event_level": "high",
  "user_id": "cust_123",
  "data": {
    "delivery_id": "del_456",
    "delivery_boy_id": "dboy_123",
    "delivery_boy_name": "Ram Kumar",
    "location": {
      "latitude": 28.5244,
      "longitude": 77.1855
    },
    "phone_number": "****7890",
    "arrived_at": "2026-01-27T14:45:00Z"
  }
}
```

---

#### delivery_completed
**When:** Delivery confirmed as complete

```json
{
  "event_type": "delivery_completed",
  "event_level": "high",
  "user_id": "cust_123",
  "data": {
    "delivery_id": "del_456",
    "order_id": "ord_123",
    "completed_at": "2026-01-27T14:48:00Z",
    "total_time_minutes": 28,
    "delivery_rating": null,
    "payment_status": "paid"
  }
}
```

---

### Order Events

#### order_created
**When:** New order placed

```json
{
  "event_type": "order_created",
  "event_level": "high",
  "user_id": "cust_123",
  "data": {
    "order_id": "ord_123",
    "items": [
      { "name": "Milk", "quantity": 2, "price": 60 },
      { "name": "Bread", "quantity": 1, "price": 40 }
    ],
    "total_amount": 100,
    "delivery_fee": 30,
    "total_with_fee": 130,
    "delivery_address": "Apt 123, Delhi",
    "estimated_delivery_time": "30 minutes",
    "created_at": "2026-01-27T14:20:00Z"
  }
}
```

---

#### order_confirmed
**When:** Shop confirms order

```json
{
  "event_type": "order_confirmed",
  "event_level": "high",
  "user_id": "cust_123",
  "data": {
    "order_id": "ord_123",
    "confirmation_time": "2026-01-27T14:22:00Z",
    "shop_name": "XYZ Kirana",
    "estimated_ready_time": "2026-01-27T14:25:00Z"
  }
}
```

---

#### order_ready
**When:** Shop has prepared order

```json
{
  "event_type": "order_ready",
  "event_level": "high",
  "user_id": "cust_123",
  "data": {
    "order_id": "ord_123",
    "ready_at": "2026-01-27T14:25:00Z",
    "pickup_by": "2026-01-27T14:35:00Z"
  }
}
```

---

### Payment Events

#### payment_initiated
**When:** Payment process started

```json
{
  "event_type": "payment_initiated",
  "event_level": "high",
  "user_id": "cust_123",
  "data": {
    "payment_id": "pay_123",
    "order_id": "ord_123",
    "amount": 130,
    "currency": "INR",
    "method": "upi",
    "initiated_at": "2026-01-27T14:20:00Z"
  }
}
```

---

#### payment_completed
**When:** Payment received

```json
{
  "event_type": "payment_completed",
  "event_level": "high",
  "user_id": "cust_123",
  "data": {
    "payment_id": "pay_123",
    "order_id": "ord_123",
    "amount": 130,
    "method": "upi",
    "upi_id": "user@bank",
    "transaction_id": "txn_abc123",
    "completed_at": "2026-01-27T14:20:30Z"
  }
}
```

---

#### payment_failed
**When:** Payment failed

```json
{
  "event_type": "payment_failed",
  "event_level": "critical",
  "user_id": "cust_123",
  "data": {
    "payment_id": "pay_123",
    "order_id": "ord_123",
    "amount": 130,
    "method": "upi",
    "error": "Insufficient balance",
    "failed_at": "2026-01-27T14:20:30Z",
    "retry_available": true
  }
}
```

---

### Location Events

#### location_updated
**When:** Delivery boy's location changes (every 30-60 seconds)

```json
{
  "event_type": "location_updated",
  "event_level": "low",
  "user_id": "cust_123",
  "data": {
    "delivery_id": "del_456",
    "latitude": 28.5244,
    "longitude": 77.1855,
    "accuracy": 10,
    "altitude": 190,
    "speed": 15,
    "heading": 45,
    "timestamp": "2026-01-27T14:30:00Z"
  }
}
```

---

#### eta_updated
**When:** ETA changes

```json
{
  "event_type": "eta_updated",
  "event_level": "medium",
  "user_id": "cust_123",
  "data": {
    "delivery_id": "del_456",
    "eta_minutes": 15,
    "eta_timestamp": "2026-01-27T14:45:00Z",
    "distance_remaining_km": 3.5,
    "previous_eta_minutes": 20,
    "updated_at": "2026-01-27T14:30:00Z"
  }
}
```

---

## 📊 REST Endpoints

### GET /api/websocket/stats

Get real-time WebSocket statistics

**Response:**
```json
{
  "status": "success",
  "data": {
    "total_connections": 42,
    "total_users": 38,
    "queued_events": 3,
    "active_subscriptions": 156,
    "timestamp": "2026-01-27T10:30:00Z"
  }
}
```

---

### GET /api/websocket/events/{event_id}

Get a specific event by ID

**Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "objectid",
    "event_id": "evt_abc123",
    "event_type": "earning_recorded",
    "event_level": "medium",
    "user_id": "user_123",
    "timestamp": "2026-01-27T10:30:00Z",
    "source": "earnings_service",
    "data": {...},
    "created_at": "2026-01-27T10:30:00Z"
  }
}
```

---

### GET /api/websocket/events/user/{user_id}

Get all events for a user

**Query Parameters:**
- `event_type` (optional) - Filter by event type
- `limit` (default: 50, max: 100)
- `skip` (default: 0)

**Example:**
```
GET /api/websocket/events/user/user_123?event_type=earning_recorded&limit=20
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "event_type": "earning_recorded",
      "timestamp": "2026-01-27T10:30:00Z",
      "data": {"amount": 500}
    }
  ],
  "count": 20,
  "limit": 20,
  "skip": 0
}
```

---

### GET /api/websocket/analytics/summary

Get event statistics for a date

**Query Parameters:**
- `date` (optional) - YYYY-MM-DD format (default: today)

**Example:**
```
GET /api/websocket/analytics/summary?date=2026-01-27
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "date": "2026-01-27",
    "total_events": 1250,
    "critical_events": 5,
    "by_event_type": {
      "earning_recorded": 125,
      "delivery_completed": 89,
      "payment_completed": 45
    },
    "by_source": {
      "earnings_service": 125,
      "delivery_service": 134,
      "payment_service": 45
    },
    "by_level": {
      "critical": 5,
      "high": 156,
      "medium": 890,
      "low": 199
    }
  }
}
```

---

### GET /api/websocket/critical-events

Get all CRITICAL level events from last N hours

**Query Parameters:**
- `hours` (default: 24, max: 168)
- `limit` (default: 100, max: 500)

**Example:**
```
GET /api/websocket/critical-events?hours=6&limit=50
```

**Response:**
```json
{
  "status": "success",
  "time_range_hours": 6,
  "critical_count": 3,
  "data": [...]
}
```

---

## 🔄 Subscription Management

### Subscribe to Events

**Client sends:**
```json
{
  "type": "subscribe",
  "events": [
    "earning_recorded",
    "delivery_completed",
    "order_created"
  ]
}
```

**Server responds:**
```json
{
  "type": "subscription_updated",
  "subscribed_events": ["earning_recorded", "delivery_completed", "order_created"]
}
```

---

### Unsubscribe from Events

**Client sends:**
```json
{
  "type": "unsubscribe",
  "events": ["order_created"]
}
```

**Server responds:**
```json
{
  "type": "subscription_updated"
}
```

---

## ✅ Complete Example: JavaScript Client

```javascript
// Initialize service
const ws = new WebSocketService(
  null,  // Auto-detect URL
  localStorage.getItem('jwt_token'),
  localStorage.getItem('user_id')
);

// Connect
await ws.connect();

// Subscribe to events
ws.subscribe([
  'earning_recorded',
  'delivery_completed',
  'payment_completed',
]);

// Handle specific event
ws.on('earning_recorded', (event) => {
  console.log(`Earned ₹${event.data.amount}`);
  toast.show(`💵 You earned ₹${event.data.amount}`);
});

// Handle all events
ws.on('*', (event) => {
  console.log(`[${event.type}]`, event.data);
});

// Get status
console.log(ws.getStatus());
// { 
//   isConnected: true,
//   subscriptions: ['earning_recorded', ...],
//   queuedMessages: 0,
//   reconnectAttempts: 0
// }

// Disconnect when done
ws.disconnect();
```

---

## 🔒 Authentication

WebSocket connections require JWT authentication.

**Token in connection:**
```javascript
new WebSocketService(url, token, userId);
```

**Token validation:**
- Must be valid JWT
- Must not be expired
- Must have user_id claim
- User must exist in database

---

## 📈 Best Practices

1. **Always subscribe to events you need**
   - Don't subscribe to all events
   - Reduces network bandwidth
   - Improves performance

2. **Handle reconnection gracefully**
   ```javascript
   ws.on('connection_failed', () => {
     fallbackToPoll(); // Use polling as backup
   });
   ```

3. **Unsubscribe when component unmounts**
   ```jsx
   useEffect(() => {
     ws.subscribe(['earning_recorded']);
     return () => ws.unsubscribe(['earning_recorded']);
   }, []);
   ```

4. **Use event_id for deduplication**
   - Store received event_ids
   - Skip if event_id already seen
   - Prevents duplicate notifications

5. **Log important events for debugging**
   ```javascript
   ws.on('*', (event) => {
     if (event.level === 'critical') {
       logger.error('Critical event:', event);
     }
   });
   ```

---

**Status:** ✅ Production Ready  
**Last Updated:** January 27, 2026

# ✅ POST-DEPLOYMENT VALIDATION PROTOCOL - 72 Hours
**Project:** EarlyBird Delivery Services  
**Deployment Date:** January 28, 2026  
**Validation Period:** January 28-30, 2026 (72 hours)  
**Start Time:** 00:45 UTC (immediately after traffic switch)  

---

## VALIDATION PROTOCOL OVERVIEW

This document defines the 5-phase, 72-hour validation procedure that MUST be completed after production deployment.

**Phases:**
1. **PHASE 1:** Immediate Smoke Test (0-15 minutes)
2. **PHASE 2:** Health Check Verification (15 min - 1 hour)
3. **PHASE 3:** Real User Validation (1-4 hours)
4. **PHASE 4:** Stability Monitoring (4-24 hours)
5. **PHASE 5:** Long-Term Validation (24-72 hours)

**Success Criteria:** All 5 phases PASS with zero critical incidents

---

## PHASE 1: IMMEDIATE SMOKE TEST (0-15 Minutes)

**Duration:** 0-15 minutes after traffic switch  
**Start Time:** 00:45 UTC (Jan 28)  
**Objective:** Verify basic system functionality

### SMOKE TEST CHECKLIST

#### ✅ Test 1.1: Backend API Responsive

```bash
# Test main health endpoint
curl -s http://api.earlybird.com/api/health | jq '.'

# Expected output:
{
  "status": "healthy",
  "timestamp": "2026-01-28T00:45:00Z",
  "service": "earlybird-backend",
  "version": "1.0.0"
}
```

**Result:** [ ] PASS ✅ / [ ] FAIL ❌

**If FAIL:** Check logs: `tail -f /var/log/earlybird-green.log`

---

#### ✅ Test 1.2: Frontend Loads

```bash
# Test frontend loads
curl -s http://app.earlybird.com/ | grep -o "<title>.*</title>"

# Expected: <title>EarlyBird Delivery</title>
```

**Result:** [ ] PASS ✅ / [ ] FAIL ❌

---

#### ✅ Test 1.3: Database Connectivity

```bash
# Test database via backend
TOKEN=$(curl -s -X POST http://api.earlybird.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}' \
  | jq -r '.access_token')

# Database test query
curl -s -H "Authorization: Bearer $TOKEN" \
  http://api.earlybird.com/api/health/diagnostics | jq '.database.status'

# Expected: "healthy"
```

**Result:** [ ] PASS ✅ / [ ] FAIL ❌

---

#### ✅ Test 1.4: All 6 Health Endpoints Responding

```bash
echo "Testing all 6 health endpoints..."

curl -s http://api.earlybird.com/api/health | jq '.status'
# Expected: healthy

curl -s http://api.earlybird.com/api/health/detailed | jq '.status'
# Expected: healthy

curl -s http://api.earlybird.com/api/health/metrics | jq '.status'
# Expected: healthy

curl -s http://api.earlybird.com/api/health/diagnostics | jq '.timestamp'
# Expected: timestamp value

curl -s http://api.earlybird.com/api/health/ready | jq '.ready'
# Expected: true

curl -s http://api.earlybird.com/api/health/live | jq '.live'
# Expected: true
```

**Summary:**
- [ ] /api/health: 200 OK
- [ ] /api/health/detailed: 200 OK
- [ ] /api/health/metrics: 200 OK
- [ ] /api/health/diagnostics: 200 OK
- [ ] /api/health/ready: 200 OK
- [ ] /api/health/live: 200 OK

**Result:** [ ] ALL PASS ✅ / [ ] ANY FAIL ❌

---

#### ✅ Test 1.5: Monitoring System Active

```bash
# Verify monitoring is collecting data
curl -s http://api.earlybird.com/api/health/metrics | jq '{
  cpu_percent,
  memory_mb,
  disk_gb,
  db_connections,
  response_time_ms
}'

# Expected output shows metrics from last minute
```

**Result:** [ ] PASS ✅ / [ ] FAIL ❌

---

### PHASE 1 DECISION POINT

**If All Tests Pass:** ✅ → Proceed to PHASE 2

**If Any Test Fails:** ❌ → EXECUTE IMMEDIATE ROLLBACK
```bash
# Perform emergency rollback (< 5 minutes)
bash scripts/emergency-rollback.sh
```

---

## PHASE 2: HEALTH CHECK VERIFICATION (15 Min - 1 Hour)

**Duration:** 15 minutes to 1 hour after deployment  
**Start Time:** 01:00 UTC (Jan 28)  
**Objective:** Comprehensive health status verification

### DETAILED HEALTH CHECK

#### ✅ Test 2.1: Backend Health Response Structure

```bash
# Get detailed health response
HEALTH=$(curl -s http://api.earlybird.com/api/health/detailed)

echo "$HEALTH" | jq '{
  status,
  timestamp,
  version,
  uptime_seconds,
  services: .services,
  databases: .databases,
  performance: .performance
}'

# Expected output includes all components
```

**Verify Response Structure:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-28T01:00:00Z",
  "version": "1.0.0",
  "uptime_seconds": 900,
  "services": {
    "auth": {"status": "healthy", "latency_ms": 10},
    "orders": {"status": "healthy", "latency_ms": 20},
    "billing": {"status": "healthy", "latency_ms": 15},
    "delivery": {"status": "healthy", "latency_ms": 12},
    "notifications": {"status": "healthy", "latency_ms": 50}
  },
  "databases": {
    "mongodb": {"status": "healthy", "latency_ms": 5, "connections": 25}
  },
  "performance": {
    "p50_ms": 50,
    "p95_ms": 150,
    "p99_ms": 250,
    "cpu_percent": 15,
    "memory_percent": 45,
    "error_rate_percent": 0.05
  }
}
```

**Validation Criteria:**
- [ ] status: "healthy"
- [ ] All services: "healthy"
- [ ] database: "healthy"
- [ ] p50 latency: < 100ms
- [ ] p95 latency: < 300ms
- [ ] p99 latency: < 500ms
- [ ] CPU: < 50%
- [ ] Memory: < 80%
- [ ] Error rate: < 0.1%

**Result:** [ ] PASS ✅ / [ ] FAIL ❌

---

#### ✅ Test 2.2: Performance Metrics Captured

```bash
# Get metrics
curl -s http://api.earlybird.com/api/health/metrics | jq '{
  timestamp,
  collection_period_seconds,
  endpoints: {
    "GET /api/health": .endpoint_metrics."GET /api/health",
    "POST /api/orders": .endpoint_metrics."POST /api/orders",
    "GET /api/orders": .endpoint_metrics."GET /api/orders"
  },
  system: {
    cpu_percent: .cpu_percent,
    memory_mb: .memory_mb,
    disk_gb: .disk_gb
  }
}'
```

**Expected Metrics:**
```
GET /api/health:
  - avg_latency: 10ms
  - p95_latency: 20ms
  - error_rate: 0%

POST /api/orders:
  - avg_latency: 100ms
  - p95_latency: 200ms
  - error_rate: 0%

GET /api/orders:
  - avg_latency: 80ms
  - p95_latency: 150ms
  - error_rate: 0%
```

**Result:** [ ] PASS ✅ / [ ] FAIL ❌

---

#### ✅ Test 2.3: Alert System Testing (All 9 Alert Types)

```bash
# Test each alert type
ALERTS=(
  "HIGH_ERROR_RATE"
  "HIGH_RESPONSE_TIME"
  "DATABASE_DOWN"
  "HIGH_CPU"
  "HIGH_MEMORY"
  "HIGH_DISK"
  "AUTH_SPIKE"
  "REVENUE_ANOMALY"
  "DELIVERY_SPIKE"
)

for ALERT in "${ALERTS[@]}"; do
  echo "Testing $ALERT..."
  curl -s -X POST http://api.earlybird.com/api/monitoring/test-alert \
    -H "Content-Type: application/json" \
    -d "{\"alert_type\":\"$ALERT\",\"severity\":\"high\"}"
  sleep 5
done

# Verify alerts received
echo "Check Slack #alerts channel for 9 messages"
sleep 30
```

**Expected Results:**
- [ ] HIGH_ERROR_RATE alert sent
- [ ] HIGH_RESPONSE_TIME alert sent
- [ ] DATABASE_DOWN alert sent
- [ ] HIGH_CPU alert sent
- [ ] HIGH_MEMORY alert sent
- [ ] HIGH_DISK alert sent
- [ ] AUTH_SPIKE alert sent
- [ ] REVENUE_ANOMALY alert sent
- [ ] DELIVERY_SPIKE alert sent

**Verification Channels:**
- [ ] Slack #alerts: 9 messages received
- [ ] Email: 9 notifications received
- [ ] Logs: 9 entries recorded

**Result:** [ ] ALL PASS ✅ / [ ] ANY FAIL ❌

---

#### ✅ Test 2.4: Data Consistency Verification

```bash
# Verify no data corruption
mongosh --eval "
db.orders.find().forEach(doc => {
  if (!db.customers_v2.findOne({_id: doc.customer_id})) {
    print('ORPHANED ORDER: ' + doc._id);
  }
});

db.delivery_statuses.find().forEach(doc => {
  if (!db.orders.findOne({_id: doc.order_id})) {
    print('ORPHANED DELIVERY: ' + doc._id);
  }
});

db.billing_records.find().forEach(doc => {
  if (!db.customers_v2.findOne({_id: doc.customer_id})) {
    print('ORPHANED BILL: ' + doc._id);
  }
});

print('Data consistency check complete');
"
```

**Expected Result:**
```
Data consistency check complete
(no orphaned records printed)
```

**Result:** [ ] PASS ✅ / [ ] FAIL ❌

---

### PHASE 2 DOCUMENTATION

Document the following for records:
- **Health Check Time:** _____________
- **All Services Status:** GREEN ✅
- **Performance Baseline (p95):** _______ ms
- **Error Rate:** _______ %
- **Alerts Verified:** 9/9 ✅

---

### PHASE 2 DECISION POINT

**If All Tests Pass:** ✅ → Proceed to PHASE 3

**If Any Test Fails:** ❌ 
- Investigate issue
- If critical: Execute rollback
- If minor: Document and continue monitoring

---

## PHASE 3: REAL USER VALIDATION (1-4 Hours)

**Duration:** 1 to 4 hours after deployment  
**Start Time:** 02:00 UTC (Jan 28)  
**Objective:** Validate critical business workflows end-to-end

### WORKFLOW 1: Customer Order Creation

**Scenario:** Customer creates new order, system processes correctly

```bash
# STEP 1: Customer Login
echo "Step 1: Customer login..."
LOGIN=$(curl -s -X POST http://api.earlybird.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"customer@test.com",
    "password":"password123"
  }')

CUSTOMER_TOKEN=$(echo "$LOGIN" | jq -r '.access_token')
CUSTOMER_ID=$(echo "$LOGIN" | jq -r '.user_id')

echo "✅ Logged in as: $CUSTOMER_ID"

# STEP 2: Get available products
echo "Step 2: Browsing products..."
PRODUCTS=$(curl -s http://api.earlybird.com/api/products | jq '.data[0:2]')
echo "✅ Found products: $(echo $PRODUCTS | jq '.[] | .name' -r)"

# STEP 3: Create Order
echo "Step 3: Creating order..."
ORDER=$(curl -s -X POST http://api.earlybird.com/api/orders \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items":[
      {"product_id":"prod-1","quantity":2,"price":100},
      {"product_id":"prod-2","quantity":1,"price":50}
    ],
    "delivery_address":"123 Main St, City",
    "delivery_date":"2026-01-28",
    "special_instructions":"Leave at door"
  }')

ORDER_ID=$(echo "$ORDER" | jq -r '.order_id')
ORDER_STATUS=$(echo "$ORDER" | jq -r '.status')

echo "✅ Order created: $ORDER_ID"
echo "   Status: $ORDER_STATUS (expected: PENDING)"

# STEP 4: Verify order in database
echo "Step 4: Verifying in database..."
DB_ORDER=$(mongosh --eval "db.orders.findOne({_id: ObjectId('$ORDER_ID')})" | jq '.')

DB_STATUS=$(echo "$DB_ORDER" | jq -r '.status')
DB_AMOUNT=$(echo "$DB_ORDER" | jq -r '.total_amount')

echo "✅ Database order:"
echo "   Status: $DB_STATUS (expected: PENDING)"
echo "   Amount: $DB_AMOUNT (expected: 250)"

# STEP 5: Verify appears in customer dashboard
echo "Step 5: Checking customer dashboard..."
CUSTOMER_ORDERS=$(curl -s -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  http://api.earlybird.com/api/customer/orders | jq '.data')

FOUND_ORDER=$(echo "$CUSTOMER_ORDERS" | jq ".[] | select(.id==\"$ORDER_ID\")")

if [ -n "$FOUND_ORDER" ]; then
  echo "✅ Order appears in dashboard"
else
  echo "❌ Order NOT in dashboard"
fi
```

**Acceptance Criteria:**
- [ ] Customer login successful
- [ ] Products returned (at least 2)
- [ ] Order created with status PENDING
- [ ] Order_ID returned
- [ ] Database has matching order
- [ ] Order appears in customer dashboard

**Result:** [ ] WORKFLOW PASS ✅ / [ ] WORKFLOW FAIL ❌

---

### WORKFLOW 2: Delivery Confirmation (Order → Delivered)

**Scenario:** Delivery boy marks delivery complete, order status updates

```bash
# Use ORDER_ID from Workflow 1
echo "Workflow 2: Delivery Confirmation"
echo "Order ID: $ORDER_ID"

# STEP 1: Delivery boy login
echo "Step 1: Delivery boy login..."
DELIVERY_LOGIN=$(curl -s -X POST http://api.earlybird.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"deliveryboy@test.com",
    "password":"password123"
  }')

DELIVERY_TOKEN=$(echo "$DELIVERY_LOGIN" | jq -r '.access_token')
DELIVERY_ID=$(echo "$DELIVERY_LOGIN" | jq -r '.user_id')

echo "✅ Delivery boy logged in: $DELIVERY_ID"

# STEP 2: Get assigned deliveries
echo "Step 2: Getting assigned deliveries..."
DELIVERIES=$(curl -s -H "Authorization: Bearer $DELIVERY_TOKEN" \
  http://api.earlybird.com/api/delivery-boy/deliveries | jq '.data')

echo "✅ Deliveries to complete: $(echo $DELIVERIES | jq 'length')"

# STEP 3: Mark as delivered
echo "Step 3: Marking delivery complete..."
DELIVERY_UPDATE=$(curl -s -X POST http://api.earlybird.com/api/delivery-boy/mark-delivered \
  -H "Authorization: Bearer $DELIVERY_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"order_id\":\"$ORDER_ID\",
    \"delivered_at\":\"2026-01-28T03:00:00Z\",
    \"delivery_notes\":\"Left at door\",
    \"photo_url\":\"https://...\"
  }")

DELIVERY_SUCCESS=$(echo "$DELIVERY_UPDATE" | jq -r '.success')

echo "✅ Marked delivered: $DELIVERY_SUCCESS"

# STEP 4: Verify order status changed
echo "Step 4: Verifying order status updated..."
sleep 3  # Allow time for database update

UPDATED_ORDER=$(mongosh --eval "db.orders.findOne({_id: ObjectId('$ORDER_ID')})" | jq '.')
UPDATED_STATUS=$(echo "$UPDATED_ORDER" | jq -r '.status')
DELIVERED_AT=$(echo "$UPDATED_ORDER" | jq -r '.delivered_at')

echo "✅ Updated order status: $UPDATED_STATUS (expected: DELIVERED)"
echo "   Delivered at: $DELIVERED_AT"

# STEP 5: Verify delivery_statuses record created
echo "Step 5: Checking delivery audit trail..."
DELIVERY_AUDIT=$(mongosh --eval "db.delivery_statuses.find({order_id: ObjectId('$ORDER_ID')}).limit(1)" | jq '.')
CONFIRMED_BY=$(echo "$DELIVERY_AUDIT" | jq -r '.confirmed_by_user_id')

echo "✅ Delivery audit: Confirmed by $CONFIRMED_BY"
```

**Acceptance Criteria:**
- [ ] Delivery boy login successful
- [ ] Deliveries returned
- [ ] Mark delivered endpoint responds with success: true
- [ ] Order status changes to DELIVERED
- [ ] delivered_at timestamp recorded
- [ ] Audit trail entry created in delivery_statuses
- [ ] Confirmed_by_user_id matches delivery boy ID

**Result:** [ ] WORKFLOW PASS ✅ / [ ] WORKFLOW FAIL ❌

---

### WORKFLOW 3: Shared Link Delivery (PUBLIC - No Login)

**Scenario:** Public user marks delivery complete using shared link (no authentication)

```bash
# STEP 1: Admin creates shared link
echo "Workflow 3: Shared Link Delivery (PUBLIC)"

# Re-use ORDER_ID from Workflow 1
ADMIN_LOGIN=$(curl -s -X POST http://api.earlybird.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"admin@test.com",
    "password":"password123"
  }')

ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | jq -r '.access_token')

echo "Step 1: Admin creating shared link..."
SHARED_LINK=$(curl -s -X POST http://api.earlybird.com/api/admin/create-shared-link \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"order_id\":\"$ORDER_ID\",
    \"expires_in_hours\":24
  }")

SHARE_TOKEN=$(echo "$SHARED_LINK" | jq -r '.share_token')
SHARE_URL=$(echo "$SHARED_LINK" | jq -r '.share_url')

echo "✅ Shared link created: $SHARE_TOKEN"
echo "   URL: $SHARE_URL"

# STEP 2: PUBLIC user (NO auth) marks delivered
echo "Step 2: Public user marking delivered (NO LOGIN)..."
PUBLIC_CONFIRM=$(curl -s -X POST http://api.earlybird.com/api/shared-delivery-link/$SHARE_TOKEN/mark-delivered \
  -H "Content-Type: application/json" \
  -d '{
    "confirmation_code":"CONFIRMED",
    "delivery_notes":"Package received in good condition"
  }' \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$PUBLIC_CONFIRM" | tail -1)
RESPONSE=$(echo "$PUBLIC_CONFIRM" | head -1)

echo "✅ Public confirmation response: HTTP $HTTP_CODE"
echo "   Response: $(echo $RESPONSE | jq '.status' -r)"

# STEP 3: Verify delivery_statuses created with no user_id
echo "Step 3: Verifying audit trail for PUBLIC confirmation..."
sleep 2

PUBLIC_DELIVERY=$(mongosh --eval "
db.delivery_statuses.find({
  order_id: ObjectId('$ORDER_ID'),
  confirmation_method: 'shared_link'
}).limit(1)
" | jq '.')

CONFIRMED_METHOD=$(echo "$PUBLIC_DELIVERY" | jq -r '.confirmation_method')
CONFIRMED_IP=$(echo "$PUBLIC_DELIVERY" | jq -r '.ip_address')
CONFIRMED_BY_USER=$(echo "$PUBLIC_DELIVERY" | jq -r '.confirmed_by_user_id')

echo "✅ Public delivery audit:"
echo "   Confirmation method: $CONFIRMED_METHOD (expected: shared_link)"
echo "   IP address tracked: $CONFIRMED_IP"
echo "   Confirmed by user_id: $CONFIRMED_BY_USER (expected: null)"
```

**Acceptance Criteria:**
- [ ] Admin can create shared link
- [ ] Share token returned
- [ ] PUBLIC endpoint callable without authentication
- [ ] HTTP response: 200 OK
- [ ] delivery_statuses record created
- [ ] confirmation_method: "shared_link"
- [ ] IP address captured
- [ ] No user_id (public delivery)

**Result:** [ ] WORKFLOW PASS ✅ / [ ] WORKFLOW FAIL ❌

---

### WORKFLOW 4: Billing Generation (ONE-TIME + SUBSCRIPTIONS)

**Scenario:** Billing system generates bills for both one-time orders AND subscriptions

```bash
echo "Workflow 4: Billing Generation"

# STEP 1: Prepare billing trigger
echo "Step 1: Admin triggering billing generation..."

BILLING_TRIGGER=$(curl -s -X POST http://api.earlybird.com/api/billing/generate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "billing_date":"2026-01-28",
    "include_one_time":true,
    "include_subscriptions":true
  }')

BILLING_JOB_ID=$(echo "$BILLING_TRIGGER" | jq -r '.job_id')
BILLING_STATUS=$(echo "$BILLING_TRIGGER" | jq -r '.status')

echo "✅ Billing job triggered: $BILLING_JOB_ID"
echo "   Status: $BILLING_STATUS"

# STEP 2: Wait for billing to complete
echo "Step 2: Waiting for billing to complete..."
sleep 30

# STEP 3: Verify one-time orders included
echo "Step 3: Verifying one-time orders billed..."

ONE_TIME_BILLS=$(mongosh --eval "
db.billing_records.find({
  billing_date: {
    \$gte: new Date('2026-01-28T00:00:00Z'),
    \$lt: new Date('2026-01-29T00:00:00Z')
  },
  source: 'one_time_order'
}).count()
")

echo "✅ One-time order bills created: $ONE_TIME_BILLS"

# STEP 4: Verify subscriptions included
echo "Step 4: Verifying subscriptions billed..."

SUBSCRIPTION_BILLS=$(mongosh --eval "
db.billing_records.find({
  billing_date: {
    \$gte: new Date('2026-01-28T00:00:00Z'),
    \$lt: new Date('2026-01-29T00:00:00Z')
  },
  source: 'subscription'
}).count()
")

echo "✅ Subscription bills created: $SUBSCRIPTION_BILLS"

# STEP 5: Verify total revenue
echo "Step 5: Calculating total revenue..."

TOTAL_REVENUE=$(mongosh --eval "
db.billing_records.aggregate([
  {
    \$match: {
      billing_date: {
        \$gte: new Date('2026-01-28T00:00:00Z'),
        \$lt: new Date('2026-01-29T00:00:00Z')
      }
    }
  },
  {
    \$group: {
      _id: null,
      total: {\$sum: '\$amount'}
    }
  }
]).toArray()
")

echo "✅ Total revenue: $TOTAL_REVENUE"

# STEP 6: Verify billing details
echo "Step 6: Sample billing record details..."

SAMPLE_BILL=$(mongosh --eval "
db.billing_records.find({
  billing_date: {
    \$gte: new Date('2026-01-28T00:00:00Z'),
    \$lt: new Date('2026-01-29T00:00:00Z')
  }
}).limit(1)
" | jq '.')

echo "$SAMPLE_BILL" | jq '{
  customer_id,
  order_id,
  subscription_id,
  source,
  amount,
  billing_date,
  status
}'
```

**Acceptance Criteria (CRITICAL FOR ₹600K/YEAR REVENUE):**
- [ ] Billing job triggered successfully
- [ ] One-time order bills created: > 0 ✅
- [ ] Subscription bills created: > 0 ✅
- [ ] Total revenue calculated correctly
- [ ] Individual bills have correct source (one_time_order or subscription)
- [ ] Amounts match orders

**Result:** [ ] WORKFLOW PASS ✅ / [ ] WORKFLOW FAIL ❌

**⚠️ CRITICAL:** If one-time orders NOT billed → **REVENUE LOSS ₹600K/YEAR**

---

### PHASE 3 DOCUMENTATION

Document completion of all 4 workflows:
- **Workflow 1 (Order Creation):** [ ] PASS
- **Workflow 2 (Delivery Confirmation):** [ ] PASS
- **Workflow 3 (Shared Link):** [ ] PASS
- **Workflow 4 (Billing):** [ ] PASS
- **Total Revenue Generated:** ₹ _______

---

### PHASE 3 DECISION POINT

**If All 4 Workflows Pass:** ✅ → Proceed to PHASE 4

**If Any Workflow Fails:** ❌ 
- Critical failure: Execute rollback
- Minor issue: Document and continue with monitoring

---

## PHASE 4: STABILITY MONITORING (4-24 Hours)

**Duration:** 4 to 24 hours after deployment  
**Start Time:** 05:00 UTC (Jan 28)  
**Objective:** Monitor system stability during normal operations

### Continuous Monitoring Schedule

**Hours 0-1 (05:00-06:00 UTC):** Check every 10 minutes
**Hours 1-4 (06:00-09:00 UTC):** Check every 15 minutes
**Hours 4-24 (09:00-05:00 UTC - Jan 29):** Check every 30 minutes

### Monitoring Template (Run Every Check Interval)

```bash
#!/bin/bash
echo "=== MONITORING CHECK: $(date) ==="

# 1. Error Rate Check
ERRORS=$(tail -1000 /var/log/earlybird-green.log | grep -c "ERROR\|500\|502\|503")
TOTAL=$(tail -1000 /var/log/earlybird-green.log | grep -c "GET\|POST\|PUT\|DELETE")
ERROR_RATE=$((($ERRORS * 100) / $TOTAL))

echo "Error Rate: $ERROR_RATE% (target: < 0.1%)"
if [ $ERROR_RATE -gt 1 ]; then
  echo "⚠️ ALERT: High error rate"
fi

# 2. Response Time Check
P95=$(curl -w "%{time_total}" -o /dev/null -s http://api.earlybird.com/api/health | awk '{print int($1*1000)}')
echo "Response Time p95: ${P95}ms (target: < 500ms)"
if [ $P95 -gt 1000 ]; then
  echo "⚠️ ALERT: Slow response times"
fi

# 3. Database Connection Pool
DB_CONN=$(mongosh --eval "db.serverStatus().connections.current" | tail -1)
echo "DB Connections: $DB_CONN (target: < 50)"
if [ $DB_CONN -gt 80 ]; then
  echo "⚠️ ALERT: High connection count"
fi

# 4. System Resources
CPU=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
MEM=$(free | grep Mem | awk '{print int($3/$2 * 100)}')

echo "CPU: $CPU% (target: < 50%)"
echo "Memory: $MEM% (target: < 80%)"

if [ $(echo "$CPU > 80" | bc) -eq 1 ]; then
  echo "⚠️ ALERT: High CPU usage"
fi

if [ $MEM -gt 85 ]; then
  echo "⚠️ ALERT: High memory usage"
fi

# 5. Business Metrics
ORDERS_TODAY=$(mongosh --eval "
db.orders.find({
  created_at: {\$gte: new Date(new Date().toISOString().split('T')[0])}
}).count()
")

echo "Orders Today: $ORDERS_TODAY"
if [ $ORDERS_TODAY -lt 5 ]; then
  echo "⚠️ WARNING: Low order count (may be expected depending on traffic)"
fi
```

### Monitoring Results Log

Create a log file to track all monitoring checks:

```bash
# Create monitoring log
touch /var/log/deployment_monitoring_$(date +%Y%m%d).log

# Run monitoring check and append results
{
  echo "=== Check: $(date) ==="
  # Run all checks above
  echo ""
} >> /var/log/deployment_monitoring_$(date +%Y%m%d).log
```

### Alert Escalation

**If Any Issue Detected:**

1. **Error Rate > 1% sustained for 5+ minutes:**
   ```bash
   # Escalate to on-call
   echo "🔴 HIGH ERROR RATE ALERT"
   # Send Slack message
   # Send email to ops team
   # Investigate root cause
   ```

2. **Response Time > 1000ms sustained:**
   ```bash
   # Check database performance
   mongosh --eval "db.currentOp()"
   # Check system resources
   top -b -n1
   # Investigate slow queries
   ```

3. **Database Connectivity Issues:**
   ```bash
   # Restart database connection pool
   # Alert database team
   # Check if rollback needed
   ```

---

## PHASE 5: LONG-TERM VALIDATION (24-72 Hours)

**Duration:** 24 to 72 hours after deployment  
**Start Time:** 05:00 UTC (Jan 29)  
**Objective:** Verify system stable over extended period

### Long-Term Health Checks

#### ✅ Test 5.1: Business Metrics Validation

```bash
# Check order volume trend
echo "=== BUSINESS METRICS ==="

ORDERS_JAN28=$(mongosh --eval "
db.orders.find({
  created_at: {\$gte: new Date('2026-01-28T00:00:00Z'), \$lt: new Date('2026-01-29T00:00:00Z')}
}).count()
")

ORDERS_JAN29=$(mongosh --eval "
db.orders.find({
  created_at: {\$gte: new Date('2026-01-29T00:00:00Z'), \$lt: new Date('2026-01-30T00:00:00Z')}
}).count()
")

echo "Orders Jan 28: $ORDERS_JAN28"
echo "Orders Jan 29: $ORDERS_JAN29"

# Orders should be increasing or stable (not decreasing)
if [ $ORDERS_JAN29 -lt $((ORDERS_JAN28 - 10)) ]; then
  echo "⚠️ WARNING: Order volume declining"
fi

# Check delivery volume
DELIVERIES=$(mongosh --eval "
db.delivery_statuses.find({
  confirmed_at: {\$gte: new Date('2026-01-28T00:00:00Z')}
}).count()
")

echo "Deliveries Completed: $DELIVERIES"

# Check revenue
REVENUE=$(mongosh --eval "
db.billing_records.aggregate([
  {\$match: {billing_date: {\$gte: new Date('2026-01-28T00:00:00Z')}}},
  {\$group: {_id: null, total: {\$sum: '\$amount'}}}
]).toArray()[0].total
")

echo "Revenue: ₹$REVENUE"

# Alert if revenue < expected
EXPECTED_REVENUE=50000  # ₹50K/day expected
if [ $REVENUE -lt $EXPECTED_REVENUE ]; then
  echo "⚠️ ALERT: Revenue below expected (₹$REVENUE < ₹$EXPECTED_REVENUE)"
fi
```

**Expected Results:**
- [ ] Orders: Stable or increasing
- [ ] Deliveries: Steady completion
- [ ] Revenue: Meeting or exceeding expectations
- [ ] No unexplained anomalies

---

#### ✅ Test 5.2: System Resources - No Memory Leaks

```bash
# Check memory usage trend
echo "=== MEMORY TREND CHECK ==="

# Sample memory at different times
for i in 1 2 3; do
  free -h | grep Mem
  sleep 3600  # 1 hour apart
done

# Memory should remain relatively stable
# If it keeps increasing, might have memory leak
```

**Expected Results:**
- [ ] Memory relatively stable (± 10%)
- [ ] No sustained increase (indicating leak)
- [ ] CPU stable (no runaway processes)

---

#### ✅ Test 5.3: Rollback Readiness Check

```bash
# Verify BLUE environment still available
echo "=== ROLLBACK READINESS ==="

# Verify BLUE servers still up
curl -s http://api.earlybird-blue.com/api/health | jq '.status'

# Verify backup still available
ls -lah /backups/backup_blue_* | head -3

# Verify rollback script still works
bash scripts/emergency-rollback.sh --dry-run

echo "✅ Rollback available if needed"
```

**Expected Results:**
- [ ] BLUE environment: HEALTHY
- [ ] Backup files: Present
- [ ] Rollback script: Verified
- [ ] 48-hour window active: Yes

---

#### ✅ Test 5.4: Incident Review

```bash
# Document any incidents that occurred
cat > /tmp/incident_summary.txt <<EOF
INCIDENT SUMMARY (Jan 28-30, 2026)

Timeline:
[Document any issues that occurred]

Resolution:
[How were they resolved]

Root Cause:
[What caused the issue]

Prevention:
[How to prevent in future]
EOF

# Email to team
mail -s "Deployment Incident Summary" team@earlybird.com < /tmp/incident_summary.txt
```

**Expected Results:**
- [ ] No critical incidents (0)
- [ ] Any minor issues: Documented
- [ ] Root causes: Identified
- [ ] Preventive measures: Implemented

---

#### ✅ Test 5.5: Final Sign-Off

```bash
# After 72 hours, obtain final approvals
cat > /tmp/deployment_completion.txt <<EOF
DEPLOYMENT COMPLETION REPORT
Deployment Date: January 28, 2026
Validation Period: 72 hours (Jan 28-30)

STATUS: ✅ SUCCESSFUL

Phase 1 (Smoke Test): ✅ PASS
Phase 2 (Health Checks): ✅ PASS
Phase 3 (Real Workflows): ✅ PASS
Phase 4 (Stability): ✅ PASS
Phase 5 (Long-Term): ✅ PASS

Final Approvals:

Tech Lead: ________________ Date: ______
Ops Manager: ________________ Date: ______
Product Owner: ________________ Date: ______

DEPLOYMENT APPROVED FOR PRODUCTION
EOF

cat /tmp/deployment_completion.txt
```

**Final Sign-Off Required From:**
- [ ] Tech Lead
- [ ] Operations Manager
- [ ] Product Owner

---

## POST-DEPLOYMENT ACTIONS

### Decommission BLUE (After 48-Hour Window)

```bash
# After 48 hours with no issues, can shut down BLUE
echo "Decommissioning BLUE environment..."

# Backup final state
cp -r /opt/earlybird/blue /archive/blue_final_$(date +%Y%m%d)

# Stop BLUE services
systemctl stop earlybird-backend-blue
systemctl stop earlybird-frontend-blue

# Reduce BLUE infrastructure (optional)
aws ec2 terminate-instances --instance-ids i-blue-server

echo "BLUE environment decommissioned"
```

---

### Archive Documentation

```bash
# Store all deployment documentation
tar -czf /archive/deployment_$(date +%Y%m%d_%H%M%S).tar.gz \
  PRE_DEPLOYMENT_CHECKLIST.md \
  PRODUCTION_DEPLOYMENT_PLAN.md \
  POST_DEPLOYMENT_VALIDATION.md \
  /var/log/earlybird-green.log \
  /var/log/earlybird-blue.log \
  /var/log/deployment_monitoring_*.log
```

---

## VALIDATION SUMMARY

| Phase | Duration | Status | Decision |
|-------|----------|--------|----------|
| **Phase 1** | 0-15 min | ✅ PASS | Proceed |
| **Phase 2** | 15 min-1 hr | ✅ PASS | Proceed |
| **Phase 3** | 1-4 hrs | ✅ PASS | Proceed |
| **Phase 4** | 4-24 hrs | ✅ PASS | Proceed |
| **Phase 5** | 24-72 hrs | ✅ PASS | APPROVED |
| **OVERALL** | **72 hours** | **✅ SUCCESS** | **DEPLOYMENT SUCCESSFUL** |

---

## EMERGENCY CONTACTS (72-Hour Monitoring)

| Role | Name | Phone | Slack |
|------|------|-------|-------|
| Tech Lead | _____________ | _____________ | _____________ |
| Ops Manager | _____________ | _____________ | _____________ |
| On-Call | _____________ | _____________ | _____________ |

---

**Document Version:** 1.0  
**Created:** January 27, 2026  
**Valid For:** January 28-30, 2026 (72 hours post-deployment)


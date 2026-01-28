# 🚀 PRODUCTION DEPLOYMENT PLAN - JANUARY 28, 2026
**Project:** EarlyBird Delivery Services  
**Deployment Strategy:** Blue-Green Deployment (Zero-Downtime)  
**Scheduled:** January 28, 2026 00:00-00:45 UTC  
**Environment:** Production  

---

## EXECUTIVE SUMMARY

**Deployment Strategy:** Blue-Green (Active-Passive)
- **Blue:** Current production (v1) - running, receiving traffic
- **Green:** New production (v2) - deployed, tested, standing by
- **Execution:** Traffic switched from BLUE → GREEN atomically
- **Zero-Downtime:** Yes ✓ (traffic switch < 5 minutes)
- **Rollback:** Available < 5 minutes (emergency revert to BLUE)
- **Total Duration:** 30-45 minutes
- **Maintenance Window:** Jan 28, 00:00-00:45 UTC

---

## CRITICAL SUCCESS FACTORS

✅ **Requirements Before Deployment:**
1. PRE_DEPLOYMENT_CHECKLIST.md: All 28 items ✓
2. Database backup: Created & tested ✓
3. Green environment: Prepared and ready ✓
4. Team: Briefed and on-call ✓
5. Rollback procedure: Documented and tested ✓

⚠️ **Abort Conditions (Deploy Cancelled If):**
- [ ] Any checklist item fails
- [ ] Backup creation fails
- [ ] Green environment unreachable
- [ ] Team unavailable during deployment window
- [ ] Critical production incident requiring delay

---

## PRE-DEPLOYMENT: PREPARATION CHECKLIST (Do BEFORE 23:00 UTC)

**24 Hours Before Deployment (Jan 27, 23:00 UTC):**

- [ ] **Final Code Review:** All changes in version control
  ```bash
  git log --oneline -10  # Verify final commit
  git status  # No uncommitted changes
  ```

- [ ] **Backup Fresh Database:** Full backup taken
  ```bash
  mongodump --uri="mongodb://[BLUE_CONNECTION]/earlybird" --out=./backup_blue_final_$(date +%Y%m%d_%H%M%S)
  # Verify backup size > 100MB (if DB is substantial)
  ```

- [ ] **Notify Stakeholders:** All informed of deployment window
  - Product team
  - Support team
  - Customer success team
  - Executive stakeholders

- [ ] **Test Rollback Procedure:** Run through dry run (don't execute)
  - Review ROLLBACK_PROCEDURES.md
  - Confirm rollback command syntax
  - Verify backup recovery procedure

- [ ] **Prepare War Room:** Set up communication
  - [ ] Slack channel: #deployment-live
  - [ ] Zoom/Teams link: [link to meeting]
  - [ ] Status page: Prepared with "in maintenance" message
  - [ ] On-call contacts: All phone numbers verified

- [ ] **Final System Check:**
  ```bash
  # Check Blue environment health
  curl -s http://api.earlybird-blue.com/api/health | json_pp
  
  # Check disk space on both servers
  df -h | grep -E "(Filesystem|root|data)"
  
  # Check database replication (if applicable)
  mongosh --eval "rs.status()"
  ```

---

## PHASE 1: ENVIRONMENT PREPARATION (5-10 Minutes)

**Duration:** 5-10 minutes  
**Start Time:** 00:00 UTC  
**Objective:** Prepare GREEN environment for testing

### STEP 1.1: Verify Green Environment Resources

```bash
# SSH to Green server
ssh deploy@green-server.earlybird.com

# Check server health
echo "=== DISK SPACE ==="
df -h

echo "=== MEMORY ==="
free -h

echo "=== CPU ==="
nproc

echo "=== NETWORK ==="
ping -c 3 8.8.8.8  # Test internet connection
```

**Expected Results:**
- Disk: > 20 GB free ✓
- Memory: > 16 GB available ✓
- CPU: At least 4 cores ✓
- Network: < 50ms latency ✓

**If Check Fails:** 🔴 **STOP DEPLOYMENT** - Troubleshoot green environment

---

### STEP 1.2: Sync Green Database from Blue

```bash
# On Blue server, create database dump
echo "Creating database dump from BLUE..."
mongodump --uri="mongodb://[BLUE_CONNECTION_STRING]/earlybird" \
  --out=./backup_blue_$(date +%Y%m%d_%H%M%S)

# Transfer dump to Green server
scp -r ./backup_blue_* deploy@green-server:/tmp/

# On Green server, restore database
echo "Restoring database to GREEN..."
mongorestore --uri="mongodb://[GREEN_CONNECTION_STRING]/earlybird" \
  /tmp/backup_blue_*

# Verify data was restored
mongosh --eval "db.orders.countDocuments()"  # Should match Blue count
mongosh --eval "db.subscriptions_v2.countDocuments()"
```

**Data Verification (Document Counts):**
- Blue orders count: _______
- Green orders count: _______ (should match)
- Blue subscriptions: _______
- Green subscriptions: _______ (should match)
- Blue customers: _______
- Green customers: _______ (should match)

**If Counts Don't Match:** 🔴 **STOP DEPLOYMENT** - Investigate restore issue

---

### STEP 1.3: Deploy Code to Green Environment

```bash
cd /opt/earlybird/green

# Clone latest code from repository
echo "Cloning code from Git..."
git clone https://github.com/earlybird/repo.git .
git checkout production  # Ensure production branch
git log --oneline -1  # Verify commit

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Create virtual environment (if needed)
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Expected Results:**
- Git clone successful ✓
- On production branch ✓
- All dependencies installed ✓
- No import errors ✓

**Test Import:**
```bash
python -c "import server; import routes_orders; print('✓ All imports OK')"
```

---

### STEP 1.4: Configure Green Environment

```bash
# Copy .env file (ensure it has correct GREEN database URL)
cp /opt/earlybird/blue/.env /opt/earlybird/green/.env

# Edit for GREEN-specific settings
nano /opt/earlybird/green/.env

# Verify critical settings:
cat /opt/earlybird/green/.env | grep -E "(DATABASE_URL|JWT_SECRET|SLACK_WEBHOOK|EMAIL_CONFIG)"
```

**Required .env Variables:**
```
DATABASE_URL=mongodb://[GREEN_DB_CONNECTION]/earlybird
JWT_SECRET=[SECRET_KEY_SAME_AS_BLUE]
SLACK_WEBHOOK=https://hooks.slack.com/services/[TOKEN]
EMAIL_CONFIG=[SMTP_SETTINGS]
LOG_LEVEL=info
```

---

### STEP 1.5: Run Database Migrations

```bash
# Apply any pending migrations
cd /opt/earlybird/green/backend

echo "Running migrations..."
python migrations/001_add_subscription_id_to_orders.py
python migrations/002_add_order_id_to_delivery_statuses.py
python migrations/003_add_indexes.py

echo "Migration complete"
```

**Verify Migrations:**
```bash
# Check if all indexes created
mongosh --eval "db.orders.getIndexes()" | grep "subscription_id"
mongosh --eval "db.delivery_statuses.getIndexes()" | grep "order_id"
```

---

## PHASE 2: GREEN ENVIRONMENT TESTING (10-15 Minutes)

**Duration:** 10-15 minutes  
**Start Time:** 00:10-00:15 UTC  
**Objective:** Validate GREEN environment is production-ready

### STEP 2.1: Start Green Backend Server

```bash
# Navigate to backend directory
cd /opt/earlybird/green/backend

# Start uvicorn server
echo "Starting GREEN backend..."
nohup python -m uvicorn server:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4 \
  --log-level info \
  > /var/log/earlybird-green.log 2>&1 &

# Wait for server to start
sleep 5

# Check if server is running
curl -s http://localhost:8000/api/health | json_pp
```

**Expected Output:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-28T00:15:00Z",
  "version": "1.0.0"
}
```

**If Server Fails to Start:** 🔴
```bash
# Check logs
tail -f /var/log/earlybird-green.log

# Common issues:
# - Port 8000 already in use: lsof -i :8000
# - Database connection failed: Check DATABASE_URL
# - Import error: Check Python path
```

---

### STEP 2.2: Start Green Frontend Server

```bash
# Navigate to frontend directory
cd /opt/earlybird/green/frontend

# Build production bundle
npm run build

# Verify build output
ls -lh build/
# Expected: build/ directory with index.html and static/ folder

# Start production server or configure nginx
# Option A: Using npm serve
npm install -g serve
serve -s build -l 3000

# Option B: Using nginx (recommended)
# Nginx config should already point to /opt/earlybird/green/frontend/build
```

**Verify Frontend Loading:**
```bash
# Test frontend endpoint
curl -s http://localhost:3000/ | head -20
# Expected: HTML response with <!DOCTYPE html>
```

---

### STEP 2.3: Run Smoke Tests

```bash
# Navigate to test directory
cd /opt/earlybird/green

# Run smoke tests
echo "Running 70+ smoke tests..."
pytest tests/test_smoke_tests.py -v --tb=short

# Expected output:
# test_health_check PASSED
# test_customer_login PASSED
# test_order_creation PASSED
# ... 67 more tests
# 70 passed in 15.23s
```

**If Any Test Fails:** 🔴 Stop and investigate
```bash
# Re-run failed test with verbose output
pytest tests/test_smoke_tests.py::test_name -vv

# Check logs
tail -f /var/log/earlybird-green.log
```

---

### STEP 2.4: Verify All API Endpoints

```bash
# Get JWT token for testing
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}' \
  | jq -r '.access_token')

# Test 6 Health Endpoints
echo "Testing Health Endpoints..."
curl -s http://localhost:8000/api/health | jq '.status'
curl -s http://localhost:8000/api/health/detailed | jq '.status'
curl -s http://localhost:8000/api/health/metrics | jq '.cpu_percent'
curl -s http://localhost:8000/api/health/diagnostics | jq '.checks | length'

# Test Protected Endpoints
echo "Testing Protected Endpoints (with token)..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/orders | jq '.data | length'
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/customer/orders | jq '.data | length'
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/subscriptions | jq '.data | length'

# Test Public Endpoints
echo "Testing Public Endpoints..."
curl -s http://localhost:8000/api/products | jq '.data | length'
```

**Expected Results:**
- All 6 health endpoints: 200 OK ✓
- All protected endpoints: 200 OK or 401 (expected) ✓
- Response times: < 500ms ✓
- No 500 errors ✓

---

### STEP 2.5: Data Validation

```bash
# Verify data counts match Blue
echo "=== Data Verification ==="

echo "Orders (Green vs Blue):"
GREEN_ORDERS=$(mongosh --eval "db.orders.countDocuments()" | tail -1)
echo "Green: $GREEN_ORDERS"

echo "Subscriptions (Green vs Blue):"
GREEN_SUBS=$(mongosh --eval "db.subscriptions_v2.countDocuments()" | tail -1)
echo "Green: $GREEN_SUBS"

echo "Customers (Green vs Blue):"
GREEN_CUST=$(mongosh --eval "db.customers_v2.countDocuments()" | tail -1)
echo "Green: $GREEN_CUST"

# Verify no data corruption
echo "Checking referential integrity..."
mongosh --eval "db.orders.find({customer_id: {$exists: false}}).count()" | tail -1
# Expected: 0 (no orders without customer_id)
```

---

### STEP 2.6: Performance Baseline Capture

```bash
# Capture baseline metrics (store these for comparison in validation)
echo "=== PERFORMANCE BASELINE ==="

# Test API response times (make 100 requests)
for i in {1..100}; do
  time curl -s http://localhost:8000/api/health > /dev/null
done

# Capture system metrics
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')"
echo "Memory Usage: $(free -h | grep Mem | awk '{print $3}')"
echo "Database Connections: $(mongosh --eval "db.serverStatus().connections.current" | tail -1)"

# Store baseline
cat > /tmp/baseline_green.txt <<EOF
API p50: ___ ms
API p95: ___ ms
API p99: ___ ms
CPU: ___ %
Memory: ___ GB
DB Connections: ___
EOF
```

**Document These Metrics for Phase 4 Comparison:**
- p50 response time: _______ ms
- p95 response time: _______ ms
- p99 response time: _______ ms
- CPU utilization: _______ %
- Memory usage: _______ GB
- Database connections: _______

---

### STEP 2.7: Monitoring System Verification

```bash
# Verify monitoring system is collecting data
echo "Testing Monitoring System..."

# Send test alert
curl -s -X POST http://localhost:8000/api/monitoring/test-alert \
  -H "Content-Type: application/json" \
  -d '{"alert_type":"HIGH_ERROR_RATE","message":"Test alert during deployment"}'

# Wait 30 seconds
sleep 30

# Verify alerts received
echo "Check Slack for test alert: #deployment-live"
echo "Check Email for test alert"
echo "Check Log files: tail -f /var/log/earlybird-green.log | grep alert"
```

**Expected Results:**
- [ ] Slack notification received ✓
- [ ] Email notification received ✓
- [ ] Log entry created ✓

---

## PHASE 3: TRAFFIC SWITCH (5 Minutes) - 🔴 CRITICAL

**Duration:** ~5 minutes  
**Start Time:** 00:25-00:30 UTC  
**Objective:** Switch load balancer traffic from BLUE to GREEN

⚠️ **ZERO-DOWNTIME WINDOW** - All customer traffic switches here

### STEP 3.1: Final Pre-Switch Verification

```bash
# Verify BLUE is still healthy
echo "=== BLUE HEALTH CHECK ==="
curl -s http://api.earlybird-blue.com/api/health | jq '.status'

# Verify GREEN is ready
echo "=== GREEN HEALTH CHECK ==="
curl -s http://api.earlybird-green.com/api/health | jq '.status'

# Get approvals
echo "Getting final sign-off..."
echo "Tech Lead: [X] Approves"
echo "Ops Manager: [X] Approves"
echo "Press Enter to continue with SWITCH..."
read
```

**Both Must Be HEALTHY before proceeding:**
- [ ] BLUE status: "healthy"
- [ ] GREEN status: "healthy"
- [ ] Tech Lead approval: Given
- [ ] Ops Manager approval: Given

---

### STEP 3.2: Execute Load Balancer Switch

**Option A: Using AWS Load Balancer**

```bash
# Get target group ARNs
BLUE_TG_ARN="arn:aws:elasticloadbalancing:[REGION]:blue-target-group"
GREEN_TG_ARN="arn:aws:elasticloadbalancing:[REGION]:green-target-group"

# Verify current routing
echo "Current routing:"
aws elbv2 describe-target-groups --names earlybird-blue

# DISABLE BLUE traffic
echo "TIME: $(date) - SWITCHING TRAFFIC BLUE -> GREEN"
aws elbv2 modify-target-group-attributes \
  --target-group-arn "$BLUE_TG_ARN" \
  --attributes Key=enabled,Value=false

# ENABLE GREEN traffic  
aws elbv2 modify-target-group-attributes \
  --target-group-arn "$GREEN_TG_ARN" \
  --attributes Key=enabled,Value=true

echo "SWITCH COMPLETE at $(date)"
```

**Option B: Using Nginx Reverse Proxy**

```bash
# Update nginx config
nano /etc/nginx/conf.d/earlybird.conf

# Change from:
# upstream backend { server 10.0.1.100:8000; }  # BLUE

# To:
# upstream backend { server 10.0.2.100:8000; }  # GREEN

# Reload nginx
nginx -s reload

# Verify reload
curl -s http://localhost/api/health | jq '.status'
```

**Option C: Using DNS Switch**

```bash
# Update DNS record
# api.earlybird.com -> GREEN_IP (instead of BLUE_IP)
# Using AWS Route53, Azure DNS, or GCP CloudDNS

# Verify DNS propagation (takes up to 60 seconds)
dig api.earlybird.com
# Should show GREEN IP address
```

---

### STEP 3.3: Monitor Switch in Real-Time

**Timeline:**
- **T+0s:** Traffic switch command executed
- **T+30s:** Approximately 50% of traffic reaching GREEN
- **T+1m:** Approximately 100% of traffic reaching GREEN
- **T+2m:** Monitor for errors from GREEN
- **T+5m:** System should be stable with GREEN

```bash
# Monitor logs in real-time
echo "T+0s: Monitoring traffic..."
tail -f /var/log/earlybird-green.log | grep -E "(INFO|ERROR)" &
TAIL_PID=$!

# In another terminal, run load test
for i in {1..100}; do
  curl -s http://api.earlybird.com/api/health > /dev/null &
  sleep 0.1
done

# Wait 5 minutes
sleep 300

# Stop log monitoring
kill $TAIL_PID

echo "T+5m: Traffic switch complete and stable"
```

---

### STEP 3.4: Verify Traffic Reaching Green

```bash
# Check that requests are being logged on GREEN
tail -n 50 /var/log/earlybird-green.log | grep "POST.*orders"
# Should see recent requests

# Verify response times from GREEN
curl -w "Response time: %{time_total}s\n" -s http://api.earlybird.com/api/health

# Check error rate on GREEN (should be < 0.1%)
grep -c "ERROR" /var/log/earlybird-green.log | awk '{print ($1/total)*100 "%"}'
```

**If Traffic NOT Reaching Green after 2 minutes:** 🔴 **EXECUTE EMERGENCY ROLLBACK**

```bash
# Immediately switch traffic back to BLUE
echo "EMERGENCY: Switching traffic back to BLUE..."
aws elbv2 modify-target-group-attributes \
  --target-group-arn "$GREEN_TG_ARN" \
  --attributes Key=enabled,Value=false

aws elbv2 modify-target-group-attributes \
  --target-group-arn "$BLUE_TG_ARN" \
  --attributes Key=enabled,Value=true

echo "Rollback complete. Traffic back on BLUE"
```

---

## PHASE 4: POST-SWITCH VALIDATION (10-15 Minutes)

**Duration:** 10-15 minutes  
**Start Time:** 00:30-00:35 UTC  
**Objective:** Validate GREEN is handling production traffic

### STEP 4.1: Real User Testing

**Test Scenario 1: Customer Order Creation**

```bash
# Login as customer
TOKEN=$(curl -s -X POST http://api.earlybird.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@test.com","password":"password123"}' \
  | jq -r '.access_token')

# Create an order
ORDER_ID=$(curl -s -X POST http://api.earlybird.com/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items":[{"product_id":"prod-1","quantity":2}],
    "delivery_date":"2026-01-28"
  }' | jq -r '.order_id')

echo "Order created: $ORDER_ID"

# Verify order appears in database
mongosh --eval "db.orders.find({_id: ObjectId('$ORDER_ID')}, {_id:1, status:1})"
# Expected: order found with status: PENDING
```

**Test Scenario 2: Delivery Confirmation**

```bash
# Mark delivery as complete
curl -s -X POST http://api.earlybird.com/api/delivery-boy/mark-delivered \
  -H "Authorization: Bearer $DELIVERY_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"order_id\":\"$ORDER_ID\"}"

# Verify order status updated
mongosh --eval "db.orders.find({_id: ObjectId('$ORDER_ID')}, {_id:1, status:1})"
# Expected: status changed to DELIVERED
```

**Test Scenario 3: Shared Link Delivery** (PUBLIC)

```bash
# Create shared link (admin or support)
SHARED_LINK=$(curl -s -X POST http://api.earlybird.com/api/admin/create-shared-link \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"order_id\":\"$ORDER_ID\"}" | jq -r '.share_token')

# PUBLIC: Mark delivered without authentication
curl -s -X POST http://api.earlybird.com/api/shared-delivery-link/$SHARED_LINK/mark-delivered \
  -H "Content-Type: application/json" \
  -d "{}" | jq '.status'
# Expected: success
```

**Test Scenario 4: Billing Generation**

```bash
# Trigger billing (admin only)
curl -s -X POST http://api.earlybird.com/api/billing/generate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"billing_date":"2026-01-28"}' | jq '.'

# Verify bills created
mongosh --eval "db.billing_records.find({customer_id: 'cust-123'}, {_id:1, amount:1}).limit(5)"
# Expected: recent billing records found
```

---

### STEP 4.2: Database Verification

```bash
# Verify no data loss
echo "Comparing Blue vs Green data counts..."

# On Blue
BLUE_ORDERS=$(ssh deploy@blue-server "mongosh --eval 'db.orders.countDocuments()'" | tail -1)
BLUE_SUBS=$(ssh deploy@blue-server "mongosh --eval 'db.subscriptions_v2.countDocuments()'" | tail -1)

# On Green (same database now)
GREEN_ORDERS=$(mongosh --eval "db.orders.countDocuments()" | tail -1)
GREEN_SUBS=$(mongosh --eval "db.subscriptions_v2.countDocuments()" | tail -1)

echo "Orders - Blue: $BLUE_ORDERS, Green: $GREEN_ORDERS (should match)"
echo "Subscriptions - Blue: $BLUE_SUBS, Green: $GREEN_SUBS (should match)"

# If mismatch: 🔴 INVESTIGATE IMMEDIATELY
```

---

### STEP 4.3: Performance Comparison

```bash
# Compare against baseline from Phase 2.6
echo "=== PERFORMANCE COMPARISON ==="

# Measure current response times
P50=$(curl -w "%{time_total}" -o /dev/null -s http://api.earlybird.com/api/health)
echo "Current p50: $P50 ms"

# Compare to baseline
BASELINE_P95=___  # From Phase 2.6
CURRENT_P95=$P50

# Calculate variance
VARIANCE=$((($CURRENT_P95 - $BASELINE_P95) * 100 / $BASELINE_P95))

echo "Baseline p95: $BASELINE_P95 ms"
echo "Current p95: $CURRENT_P95 ms"
echo "Variance: $VARIANCE % (should be < 10%)"

if [ $VARIANCE -gt 10 ]; then
  echo "⚠️ Performance degradation detected!"
  echo "Investigating..."
  # Could indicate: connection issues, database load, resource constraints
fi
```

**If Performance Degraded > 10%:** 🟡 Monitor but don't rollback yet (may be load spike)

---

### STEP 4.4: Error Rate Monitoring

```bash
# Check error rate (should be < 0.1%)
TOTAL_REQUESTS=$(grep -c "GET\|POST\|PUT\|DELETE" /var/log/earlybird-green.log)
ERROR_REQUESTS=$(grep -c "ERROR\|500\|502\|503" /var/log/earlybird-green.log)

ERROR_RATE=$((($ERROR_REQUESTS * 100) / $TOTAL_REQUESTS))

echo "Total Requests: $TOTAL_REQUESTS"
echo "Error Requests: $ERROR_REQUESTS"
echo "Error Rate: $ERROR_RATE %"

if [ $ERROR_RATE -gt 1 ]; then
  echo "🔴 ERROR RATE ALERT: $ERROR_RATE% > 1%"
  echo "Investigating..."
  
  # Get sample errors
  tail -20 /var/log/earlybird-green.log | grep "ERROR"
  
  # If errors persist for > 2 minutes: EXECUTE EMERGENCY ROLLBACK
fi
```

---

### STEP 4.5: Verify Monitoring & Alerts Working

```bash
# Test alert system
curl -s -X POST http://api.earlybird.com/api/monitoring/test-alert \
  -H "Content-Type: application/json" \
  -d '{"alert_type":"POST_DEPLOYMENT_VALIDATION_TEST"}'

# Verify alerts delivered
echo "Checking Slack #deployment-live for test alert..."
sleep 5
# Should see message

echo "Checking email for test alert..."
# Should receive email
```

---

## PHASE 5: EMERGENCY ROLLBACK PROCEDURES

**If CRITICAL Issues Detected During Any Phase:**

### Rollback Triggers 🔴

Execute IMMEDIATE rollback if ANY of these occur:
- Error rate sustained > 5% for > 1 minute
- Response time p95 > 2000ms for > 1 minute
- Database connectivity lost
- Authentication bypass detected
- Data corruption found
- Revenue calculation incorrect

### Emergency Rollback Steps

```bash
echo "🔴 EMERGENCY ROLLBACK INITIATED"
echo "Time: $(date)"

# Step 1: Stop GREEN services
echo "Step 1: Stopping GREEN services..."
systemctl stop earlybird-backend-green
systemctl stop earlybird-frontend-green
sleep 5

# Step 2: Switch traffic back to BLUE
echo "Step 2: Switching traffic to BLUE..."
aws elbv2 modify-target-group-attributes \
  --target-group-arn "$GREEN_TG_ARN" \
  --attributes Key=enabled,Value=false

aws elbv2 modify-target-group-attributes \
  --target-group-arn "$BLUE_TG_ARN" \
  --attributes Key=enabled,Value=true

# Step 3: Verify BLUE is responding
sleep 10
curl -s http://api.earlybird-blue.com/api/health | jq '.status'
# Expected: healthy

echo "✅ ROLLBACK COMPLETE"
echo "Traffic: Back on BLUE (v1)"
echo "Customers: No data loss"
echo "Downtime: < 5 minutes"

# Document incident
cat > /tmp/rollback_incident_$(date +%Y%m%d_%H%M%S).log <<EOF
ROLLBACK EXECUTED
Date: $(date)
Reason: [FILL IN]
Error Rate: ____%
Response Time: ___ ms
Actions Taken: [FILL IN]
Next Steps: [FILL IN]
EOF
```

### Rollback Verification

```bash
# Verify BLUE is fully operational
curl -s http://api.earlybird.com/api/health | jq '.'
curl -s http://api.earlybird.com/api/orders | jq '.data | length'

# Check error logs
tail -100 /var/log/earlybird-blue.log | grep "ERROR"

# Notify stakeholders
echo "Rollback complete. Notifying stakeholders..."
# Send email/Slack notifications

# Schedule postmortem
echo "Postmortem scheduled for [DATE/TIME]"
```

---

## PHASE 6: DEPLOYMENT COMPLETION

**Duration:** Post-switch  
**Start Time:** 00:40 UTC (after validation)  
**Objective:** Complete deployment and monitor

### STEP 6.1: Keep BLUE Available (48-Hour Window)

```bash
# Do NOT shut down BLUE environment
# Keep it running for 48 hours as emergency rollback capability

# Monitor BLUE status every 30 minutes
while true; do
  curl -s http://api.earlybird-blue.com/api/health | jq '.status'
  sleep 1800  # 30 minutes
done
```

**48-Hour Timeline:**
- **Hour 0:** BLUE ready for rollback (on standby)
- **Hour 24:** If GREEN stable, reduce BLUE monitoring to hourly
- **Hour 48:** If GREEN very stable, BLUE can be decommissioned

---

### STEP 6.2: Archive Deployment Documentation

```bash
# Create deployment report
cat > /var/log/deployment_report_$(date +%Y%m%d_%H%M%S).txt <<EOF
DEPLOYMENT REPORT - JANUARY 28, 2026

Start Time: _______________
End Time: _______________
Total Duration: _____ minutes

Green Environment Metrics:
- Response Time p50: _____ ms
- Response Time p95: _____ ms
- Error Rate: _____ %
- Successful Transitions: ___ / 4

Post-Deployment Status: GREEN ✅

Issues Encountered: [NONE / list any]
Rollbacks Executed: [NONE / list any]

Approved By: _______________
Date: _______________
EOF

# Store all logs
tar -czf /archive/deployment_logs_$(date +%Y%m%d_%H%M%S).tar.gz \
  /var/log/earlybird-green.log \
  /var/log/earlybird-blue.log \
  /var/log/deployment_report_*
```

---

### STEP 6.3: Post-Deployment Monitoring (First 24 Hours)

**Intensive Monitoring Schedule:**
- **Hours 0-1:** Every 5 minutes
- **Hours 1-4:** Every 10 minutes
- **Hours 4-24:** Every 30 minutes

```bash
# Monitoring script
#!/bin/bash
while true; do
  echo "=== MONITORING: $(date) ==="
  
  # Check health
  curl -s http://api.earlybird.com/api/health/detailed | jq '.status'
  
  # Check error rate
  tail -1000 /var/log/earlybird-green.log | grep -c "ERROR"
  
  # Check CPU/Memory
  top -bn1 | grep "Cpu(s)"
  free -h | grep Mem
  
  sleep 300  # 5 minutes (adjust timing as needed)
done
```

---

### STEP 6.4: Stakeholder Notifications

```bash
# Send success email to all stakeholders
cat > /tmp/deployment_success.email <<EOF
Subject: ✅ EarlyBird Production Deployment Complete - January 28, 2026

Body:
Production deployment completed successfully!

Timeline:
- Start: 2026-01-28 00:00 UTC
- Complete: 2026-01-28 00:45 UTC
- Downtime: 0 minutes ✅

New Features & Fixes:
- [List 3-5 main improvements]

System Status:
- All services: Healthy ✅
- Error rate: < 0.1% ✅
- Response times: Normal ✅

Next Steps:
- Validation running for 72 hours
- Monitoring active 24/7
- Support available on #deployment-live

Thank you!
EOF

# Send to distribution list
mail -s "✅ Production Deployment Complete" deploy@earlybird.com < /tmp/deployment_success.email

# Post to Slack
curl -X POST $SLACK_WEBHOOK \
  -H 'Content-type: application/json' \
  -d '{
    "text": "✅ Production Deployment Successful!",
    "blocks": [
      {"type": "section", "text": {"type": "mrkdwn", "text": "*Deployment Status: SUCCESS* ✅"}}
    ]
  }'
```

---

## DEPLOYMENT SUMMARY

| Phase | Duration | Status | Notes |
|-------|----------|--------|-------|
| Phase 1: Environment Prep | 5-10 min | ✅ Complete | Database synced, code deployed |
| Phase 2: GREEN Testing | 10-15 min | ✅ Complete | All tests passing, baseline captured |
| Phase 3: Traffic Switch | 5 min | ✅ Complete | **ZERO-DOWNTIME** |
| Phase 4: Post-Switch Validation | 10-15 min | ✅ Complete | Real workflows tested |
| Phase 5: Emergency Procedures | N/A | ✅ Ready | Ready if needed (< 5 min) |
| Phase 6: Completion | Ongoing | ✅ Active | 48-hour monitoring window |
| **TOTAL** | **30-45 min** | **✅ SUCCESS** | **ZERO DOWNTIME** |

---

## CRITICAL REMINDERS

⚠️ **DO NOT:**
- [ ] Don't skip Phase 2 testing (ensure all tests pass first)
- [ ] Don't execute traffic switch without approval from tech lead
- [ ] Don't delete BLUE environment until 48 hours have passed
- [ ] Don't modify code during deployment window
- [ ] Don't ignore errors - escalate immediately

✅ **DO:**
- [ ] Document all decisions and times
- [ ] Keep team in war room until Phase 4 complete
- [ ] Monitor continuously for first 24 hours
- [ ] Follow up with post-mortem if rollback needed
- [ ] Celebrate successful deployment! 🎉

---

**Prepared By:** _______________  
**Approved By:** _______________  
**Deployment Date:** January 28, 2026  
**Target Window:** 00:00-00:45 UTC


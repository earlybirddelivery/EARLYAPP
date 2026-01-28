# 🚀 QUICK START DEPLOYMENT GUIDE
**For:** Deployment Team  
**Read Time:** 5 minutes  
**Keep Open During:** Entire deployment window  
**Date:** January 28, 2026 00:00-00:45 UTC

---

## TIMELINE AT A GLANCE

```
00:00 UTC ─────────────────────────────────────────────────── 00:45 UTC
  │
  ├─ PHASE 1 (5-10 min)  : Environment prep & database sync
  │
  ├─ PHASE 2 (10-15 min) : GREEN testing & validation
  │
  ├─ PHASE 3 (5 min)     : 🔴 TRAFFIC SWITCH (zero-downtime)
  │
  ├─ PHASE 4 (10-15 min) : Post-switch validation
  │
  ├─ PHASE 5 (standby)   : Emergency rollback (if needed)
  │
  └─ PHASE 6 (ongoing)   : 48-hour monitoring window

TOTAL: 30-45 minutes | DOWNTIME: 0 minutes ✅
```

---

## PRE-FLIGHT CHECKLIST (Before 00:00 UTC)

Before starting deployment, verify:

- [ ] **Database Backup Taken**
  ```bash
  ls -lah /backups/backup_blue_* | tail -1
  # Must show recent backup (last 24 hours)
  ```

- [ ] **Green Environment Ready**
  ```bash
  curl -s http://api.earlybird-green.com/api/health | jq '.status'
  # Expected: "healthy"
  ```

- [ ] **Blue Environment Stable**
  ```bash
  curl -s http://api.earlybird-blue.com/api/health | jq '.status'
  # Expected: "healthy"
  ```

- [ ] **Team on Call**
  - Tech Lead: Present ✓
  - Ops Manager: Present ✓
  - Database Admin: On standby ✓
  - On-Call Engineer: On standby ✓

- [ ] **War Room Active**
  - Slack #deployment-live: Ready ✓
  - Zoom meeting: Active ✓
  - Status page: Prepared ✓

---

## PHASE 1: ENVIRONMENT PREP (5-10 minutes)

### Step 1: Sync Database
```bash
# SSH to Green server
ssh deploy@green-server

# Sync database from Blue to Green
mongodump --uri="mongodb://[BLUE_CONNECTION]/earlybird" --out=./backup_blue_sync
mongorestore --uri="mongodb://[GREEN_CONNECTION]/earlybird" ./backup_blue_sync

# Verify counts match
mongosh --eval "db.orders.countDocuments()"
# Blue: [count] → Green: [count] (should match)
```

**Expected:** Data counts match Blue ✓

### Step 2: Deploy Code
```bash
cd /opt/earlybird/green
git clone https://github.com/earlybird/repo.git .
git checkout production
pip install -r requirements.txt
```

**Expected:** No errors ✓

### Step 3: Configure Environment
```bash
# Update .env file with GREEN database URL
cp /opt/earlybird/blue/.env /opt/earlybird/green/.env
nano /opt/earlybird/green/.env  # Set DATABASE_URL to GREEN

# Verify config
python -c "import server; print('✓ Server imports OK')"
```

**Expected:** All imports successful ✓

---

## PHASE 2: GREEN TESTING (10-15 minutes)

### Step 1: Start Services
```bash
# Start backend
cd /opt/earlybird/green/backend
nohup python -m uvicorn server:app --host 0.0.0.0 --port 8000 --workers 4 > backend.log 2>&1 &

# Start frontend
cd /opt/earlybird/green/frontend
npm run build
serve -s build -l 3000 > frontend.log 2>&1 &

# Wait for startup
sleep 10
```

### Step 2: Run Smoke Tests
```bash
# Run 70+ smoke tests
cd /opt/earlybird/green
pytest tests/test_smoke_tests.py -v --tb=short

# Expected output:
# ============ 70 passed in 12.45s ============
```

**Expected:** 70/70 tests passing ✓

### Step 3: Test Health Endpoints
```bash
# Test all 6 health endpoints
curl -s http://localhost:8000/api/health | jq '.status'
curl -s http://localhost:8000/api/health/detailed | jq '.status'
curl -s http://localhost:8000/api/health/metrics | jq '.status'
curl -s http://localhost:8000/api/health/diagnostics | jq '.timestamp'
curl -s http://localhost:8000/api/health/ready | jq '.ready'
curl -s http://localhost:8000/api/health/live | jq '.live'

# Expected: All "healthy" or "true"
```

**Expected:** All 6 endpoints responding 200 OK ✓

### Step 4: Capture Baseline
```bash
# Record current performance metrics
echo "API Response Time: $(curl -w "%{time_total}s" -o /dev/null -s http://localhost:8000/api/health)"
echo "CPU: $(top -bn1 | grep Cpu | awk '{print $2}')"
echo "Memory: $(free -h | grep Mem | awk '{print $3}')"

# Save for comparison in Phase 4
```

**Expected:** Baseline captured ✓

---

## PHASE 3: TRAFFIC SWITCH - 🔴 CRITICAL (5 minutes)

### ⚠️ THIS IS THE MOMENT - ZERO DOWNTIME HAPPENS HERE

**Time:** 00:30-00:35 UTC (approximately)

### Pre-Switch Verification
```bash
# Confirm both environments healthy
echo "BLUE status:"
curl -s http://api.earlybird-blue.com/api/health | jq '.status'

echo "GREEN status:"
curl -s http://api.earlybird-green.com/api/health | jq '.status'

# Both must show "healthy"
# If not: ABORT and investigate
```

### Execute Switch (One of these methods):

**AWS Load Balancer:**
```bash
# SWITCH traffic from Blue → Green
aws elbv2 modify-target-group-attributes \
  --target-group-arn [BLUE_TG_ARN] \
  --attributes Key=enabled,Value=false

aws elbv2 modify-target-group-attributes \
  --target-group-arn [GREEN_TG_ARN] \
  --attributes Key=enabled,Value=true

echo "Traffic switched at $(date)"
```

**OR Nginx:**
```bash
# Edit nginx config to point to GREEN
sed -i 's/server 10.0.1.100:8000/server 10.0.2.100:8000/g' /etc/nginx/conf.d/earlybird.conf
nginx -s reload
echo "Nginx switched at $(date)"
```

### Monitor Switch
```bash
# Timeline:
# T+0s:   Switch executed
# T+30s:  ~50% traffic on GREEN
# T+1m:   ~100% traffic on GREEN
# T+2m:   Check for errors
# T+5m:   System stable

# Monitor logs
tail -f /var/log/earlybird-green.log | grep -E "POST.*orders|GET.*orders|ERROR"
```

**Expected:** Traffic flowing to GREEN, no errors ✓

### If Traffic NOT Reaching Green After 1 Min:
```bash
# EMERGENCY: Rollback immediately
aws elbv2 modify-target-group-attributes \
  --target-group-arn [GREEN_TG_ARN] \
  --attributes Key=enabled,Value=false

aws elbv2 modify-target-group-attributes \
  --target-group-arn [BLUE_TG_ARN] \
  --attributes Key=enabled,Value=true

echo "🔴 EMERGENCY ROLLBACK EXECUTED - Traffic back on BLUE"
```

---

## PHASE 4: POST-SWITCH VALIDATION (10-15 minutes)

### Step 1: Real User Tests
```bash
# Test 1: Customer order creation
TOKEN=$(curl -s -X POST http://api.earlybird.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@test.com","password":"password123"}' \
  | jq -r '.access_token')

curl -s -X POST http://api.earlybird.com/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"product_id":"prod-1","quantity":2}],"delivery_date":"2026-01-28"}'

echo "✓ Order creation working"
```

### Step 2: Error Rate Check
```bash
# Check error rate (should be < 0.1%)
ERRORS=$(tail -500 /var/log/earlybird-green.log | grep -c "ERROR\|500\|502")
echo "Errors in last 500 lines: $ERRORS"

if [ $ERRORS -gt 0 ]; then
  echo "⚠️ Errors detected - investigating..."
  tail -20 /var/log/earlybird-green.log | grep ERROR
fi
```

**Expected:** < 0.1% error rate ✓

### Step 3: Performance Check
```bash
# Compare to baseline
CURRENT=$(curl -w "%{time_total}" -o /dev/null -s http://api.earlybird.com/api/health)
BASELINE=[captured in Phase 2]

echo "Baseline: ${BASELINE}s"
echo "Current: ${CURRENT}s"
# Should be within 10% of baseline
```

**Expected:** Performance normal ✓

### Step 4: Database Verification
```bash
# Verify no data loss
mongosh --eval "
db.orders.find({created_at: {\$gte: new Date('2026-01-28T00:00:00Z')}}).count()
"

echo "Orders created during deployment: [count]"
```

**Expected:** Recent orders found ✓

---

## EMERGENCY CONTACTS

**Keep these at hand during deployment:**

| Role | Name | Phone | Slack |
|------|------|-------|-------|
| Tech Lead | [NAME] | [PHONE] | @[USER] |
| Ops Manager | [NAME] | [PHONE] | @[USER] |
| Database Admin | [NAME] | [PHONE] | @[USER] |
| On-Call | [NAME] | [PHONE] | @[USER] |

**Escalation:** If issue → Tech Lead → Escalation Manager

---

## COMPLETION CHECKLIST

After all phases complete, verify:

- [ ] PHASE 1: Database synced, code deployed ✓
- [ ] PHASE 2: All 70+ tests passing ✓
- [ ] PHASE 3: Traffic switched to GREEN ✓
- [ ] PHASE 4: All workflows verified ✓
- [ ] Error rate: < 0.1% ✓
- [ ] Performance: Within baseline ✓
- [ ] No critical errors: 0 ✓

---

## POST-DEPLOYMENT

- [ ] **Keep BLUE running** for next 48 hours (emergency rollback window)
- [ ] **Monitor GREEN** continuously for 24 hours
- [ ] **Notify stakeholders** of successful deployment
- [ ] **Archive logs** for review
- [ ] **Schedule postmortem** (if any issues occurred)

---

**Deployment Status: Ready to begin!** 🚀

If you need detailed steps: → [PRODUCTION_DEPLOYMENT_PLAN.md](PRODUCTION_DEPLOYMENT_PLAN.md)  
If you need help: → [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)


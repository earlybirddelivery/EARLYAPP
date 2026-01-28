# Deployment Checklist: MyOperator WhatsApp Integration

**Date:** January 27, 2026  
**Component:** Phase 2.1 - WhatsApp Communication  
**Status:** Ready for Production

---

## PRE-DEPLOYMENT VERIFICATION

### Code Review
- [x] notification_service.py updated with MyOperator API
- [x] notification_templates.py ready (10 templates)
- [x] routes_notifications.py complete (10 endpoints)
- [x] Database migration prepared
- [x] All helper functions working
- [x] Error handling in place
- [x] Logging configured

### Dependencies
- [x] httpx (async HTTP) - already in requirements.txt
- [x] jinja2 (templating) - already in requirements.txt
- [x] python-dotenv - already in requirements.txt
- [x] No new external dependencies needed

### Environment Variables
- [ ] MYOPERATOR_API_KEY set in .env
- [ ] MYOPERATOR_API_SECRET set in .env
- [ ] MYOPERATOR_ACCOUNT_ID set in .env
- [ ] MYOPERATOR_WHATSAPP_NUMBER set in .env
- [ ] No old Twilio variables interfering

### Database
- [ ] MongoDB connection tested
- [ ] Migration 004 executable
- [ ] Collections schema verified
- [ ] Indexes planned

---

## STAGING DEPLOYMENT

### Preparation (30 min)
- [ ] Backup current database
- [ ] Clone to staging environment
- [ ] Copy backend files to staging
- [ ] Update .env in staging
- [ ] Install dependencies: `pip install -r requirements.txt`

### Initialization (10 min)
- [ ] Run migration: `python run_migrations.py`
- [ ] Verify 4 collections created:
  - notification_templates
  - notifications_log
  - notifications_queue
  - notification_settings
- [ ] Check indexes created

### Testing (30 min)

#### Test 1: Service Import
```bash
python -c "import notification_service; print('✓ OK')"
```
- [ ] No import errors
- [ ] Logs show initialization

#### Test 2: Template Loading
```bash
python -c "from notification_templates import initialize_templates; asyncio.run(initialize_templates())"
```
- [ ] 10 templates loaded
- [ ] No errors in logs

#### Test 3: API Health Check
```bash
curl http://localhost:1001/api/notifications/health
```
- [ ] Returns: `{"status": "ok"}`

#### Test 4: Send Test Message
```bash
curl -X POST http://localhost:1001/api/notifications/send-message \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "message_type": "delivery_reminder",
    "context": {
      "customer_name": "Test",
      "delivery_date": "Jan 28",
      "area": "Test"
    },
    "immediate": true
  }'
```
- [ ] Returns message ID
- [ ] Status is "sent"
- [ ] MyOperator ID present
- [ ] Message appears in history

#### Test 5: Message History
```bash
curl http://localhost:1001/api/notifications/history \
  -H "Authorization: Bearer TOKEN"
```
- [ ] Returns message list
- [ ] Contains sent message
- [ ] Has all required fields

#### Test 6: Statistics
```bash
curl http://localhost:1001/api/notifications/statistics \
  -H "Authorization: Bearer TOKEN"
```
- [ ] Returns stats object
- [ ] Shows 1 sent message
- [ ] Shows success rate

#### Test 7: Background Processor
```bash
curl -X POST http://localhost:1001/api/notifications/process-queue \
  -H "Authorization: Bearer TOKEN"
```
- [ ] Processes queue
- [ ] Returns processed count

### Route Integration Testing (1 hour)

- [ ] Update routes_orders.py - send on order
- [ ] Test order creation - WhatsApp sent
- [ ] Update routes_subscriptions.py - send on subscription
- [ ] Test subscription creation - WhatsApp sent
- [ ] Update routes_billing.py - send on payment
- [ ] Test payment - WhatsApp sent
- [ ] Update routes_delivery_boy.py - send on delivery
- [ ] Test delivery - WhatsApp sent

### Performance Testing (30 min)

#### Load Test
- [ ] Send 100 messages via API
- [ ] Monitor response times (should be <1s)
- [ ] Check database performance
- [ ] Verify all messages queued/sent

#### Failure Handling
- [ ] Disconnect MyOperator API
- [ ] Try sending message
- [ ] Message should queue for retry
- [ ] Reconnect API
- [ ] Queue should retry and succeed

#### Concurrency Test
- [ ] Send 10 messages simultaneously
- [ ] All should be handled correctly
- [ ] No race conditions
- [ ] Database consistency verified

### Integration Testing (1 hour)

- [ ] Create test customer
- [ ] Create test order
- [ ] Verify WhatsApp sent
- [ ] Create subscription
- [ ] Verify WhatsApp sent
- [ ] Make payment
- [ ] Verify WhatsApp sent
- [ ] Mark delivery
- [ ] Verify WhatsApp sent

### Security Testing (30 min)

- [ ] Try accessing API without token - should fail
- [ ] Try accessing as non-admin - should get limited access
- [ ] Try invalid phone number - should error gracefully
- [ ] Try XSS injection in context - should be escaped
- [ ] Try SQL injection - should fail safely
- [ ] Credentials not exposed in logs

### Monitoring (1 hour)

- [ ] Check logs for errors
- [ ] Monitor database connections
- [ ] Monitor API response times
- [ ] Check message success rate
- [ ] Verify background task running
- [ ] Check disk space usage

---

## PRODUCTION DEPLOYMENT

### Pre-Production
- [ ] All staging tests passed
- [ ] Team sign-off obtained
- [ ] Backup created
- [ ] Rollback plan documented
- [ ] Deployment window scheduled

### Deployment (30 min)
- [ ] Stop current backend
- [ ] Backup current code and database
- [ ] Deploy new code
- [ ] Update .env with production credentials
- [ ] Run migration: `python run_migrations.py`
- [ ] Verify 4 collections created
- [ ] Start backend with new code
- [ ] Verify backend started successfully

### Post-Deployment Verification (30 min)

#### Health Checks
- [ ] Backend responding on correct port
- [ ] All endpoints accessible
- [ ] Database connected
- [ ] Templates loaded
- [ ] Background processor running
- [ ] No errors in logs

#### Functional Tests
- [ ] Send test message
- [ ] Verify appears in history
- [ ] Check MyOperator dashboard
- [ ] Verify delivery status
- [ ] Check statistics

#### Smoke Tests
- [ ] Create test order (triggers WhatsApp)
- [ ] Create test subscription (triggers WhatsApp)
- [ ] Record test payment (triggers WhatsApp)
- [ ] Mark test delivery (triggers WhatsApp)
- [ ] All should send WhatsApp without errors

#### Performance Baseline
- [ ] Note average response times
- [ ] Note message success rate
- [ ] Note system resource usage
- [ ] Document for comparison

---

## ROLLOUT STRATEGY

### Phase 1: Canary (1-2 hours)
- [ ] Enable for 1% of orders
- [ ] Monitor closely
- [ ] Check success rate (target: >95%)
- [ ] Check error logs
- [ ] Get customer feedback

### Phase 2: Early Adopters (4 hours)
- [ ] Enable for 5% of orders
- [ ] Monitor success rate
- [ ] Monitor error logs
- [ ] Monitor system performance
- [ ] Adjust if needed

### Phase 3: Limited Launch (12 hours)
- [ ] Enable for 25% of orders
- [ ] Full monitoring
- [ ] Support team on standby
- [ ] Performance dashboards active

### Phase 4: Full Production (24+ hours)
- [ ] Enable for 100% of orders
- [ ] Maintain monitoring
- [ ] Collect metrics
- [ ] Document success

---

## SUCCESS METRICS

### Technical Metrics
- [ ] API response time: <1 second (target: <500ms)
- [ ] Message success rate: >95% (target: >98%)
- [ ] Delivery rate: >90%
- [ ] Zero failed deployments

### Business Metrics
- [ ] Customer satisfaction: >4.5/5
- [ ] Delivery confirmation rate: +10%
- [ ] Payment confirmation rate: +5%
- [ ] Subscription pause reduction: -20%

### Operational Metrics
- [ ] No critical errors in logs
- [ ] Background processor uptime: 99.9%
- [ ] Database performance: within baseline
- [ ] No customer complaints (target: 0)

---

## ROLLBACK PLAN

### If Issues Arise

1. **Immediate (5 min)**
   - Stop accepting new messages
   - Queue existing messages
   - Alert team

2. **Investigation (15 min)**
   - Check error logs
   - Identify issue
   - Determine if rollback needed

3. **Rollback (10 min)**
   - Stop backend
   - Restore previous code
   - Restore database from backup
   - Start backend
   - Verify working

4. **Post-Mortem (within 24 hours)**
   - Document what went wrong
   - Fix root cause
   - Replan deployment

---

## MONITORING & ALERTING

### Set Up Monitoring
- [ ] API health check: Every 5 minutes
- [ ] Message success rate: Every 15 minutes
- [ ] Error rate: Real-time alerts if >1%
- [ ] Queue depth: Alert if >100 messages
- [ ] Database connections: Monitor pool
- [ ] Background processor: Check runs every 5 min

### Alert Thresholds
- [ ] Success rate drops below 90% → Page on-call
- [ ] Error rate exceeds 5% → Page on-call
- [ ] Queue depth exceeds 500 → Warning
- [ ] Response time exceeds 5 seconds → Warning
- [ ] Background processor misses run → Alert

### Dashboards
- [ ] Create Grafana dashboard
- [ ] Add real-time metrics
- [ ] Add daily trends
- [ ] Share with team

---

## DOCUMENTATION

### User Documentation
- [ ] Publish: MYOPERATOR_QUICK_START_15MIN.md
- [ ] Publish: MYOPERATOR_INTEGRATION_GUIDE.md
- [ ] Create internal wiki entry
- [ ] Train support team

### Developer Documentation
- [ ] Publish: CODE_CHANGES_TWILIO_TO_MYOPERATOR.md
- [ ] Publish: MYOPERATOR_MIGRATION_SUMMARY.md
- [ ] Add to architecture docs
- [ ] Document API endpoints

### Operations Documentation
- [ ] Deployment runbook
- [ ] Troubleshooting guide
- [ ] Rollback procedures
- [ ] Monitoring setup

---

## POST-DEPLOYMENT (24-48 hours)

- [ ] Monitor all metrics
- [ ] Collect customer feedback
- [ ] Review logs for issues
- [ ] Document learnings
- [ ] Plan improvements
- [ ] Schedule follow-up review

---

## SIGN-OFF

| Role | Name | Date | Status |
|------|------|------|--------|
| Developer | _____ | _____ | _____ |
| QA Lead | _____ | _____ | _____ |
| DevOps | _____ | _____ | _____ |
| Product | _____ | _____ | _____ |
| Operations | _____ | _____ | _____ |

---

## DEPLOYMENT NOTES

**Start Date:** January 27, 2026  
**Target Go-Live:** January 28-29, 2026  
**Estimated Duration:** 2-3 hours  
**Risk Level:** LOW (internal API change, zero breaking changes)  
**Rollback Risk:** LOW (can revert to Twilio or previous version)  

---

**Ready to deploy!** ✅


# Wallet & Payment Gateway Integration - Deployment Guide

**Phase:** 4B.3.1 (Integration Extension)  
**Status:** Ready for Deployment  
**Date:** January 28, 2026

---

## ✅ Integration Deployment Checklist

### Backend Setup (30 minutes)

- [ ] Copy `wallet_payment_integration.py` to `/backend/`
- [ ] Copy `routes_integration.py` to `/backend/`
- [ ] Register integration blueprint in `server.py`:
  ```python
  from backend.routes_integration import integration_bp
  app.register_blueprint(integration_bp)
  ```
- [ ] Test: `curl http://localhost:5000/api/integration/health`
- [ ] Response: `{"status": "healthy", "service": "wallet_payment_integration", ...}`

### Frontend Setup (20 minutes)

- [ ] Copy `integrationService.js` to `/frontend/src/services/`
- [ ] Update existing components to use integration service:
  - `AddCredits.jsx` → Call `integrationService.initiateWalletTopup()`
  - `CheckoutFlow.jsx` → Add "Pay with Wallet" option
- [ ] Test: Open dev console → `integrationService.healthCheck()`
- [ ] Response: Service status shown

### Database Updates (10 minutes)

- [ ] Add to `orders` collection schema:
  ```javascript
  db.orders.updateMany(
    {},
    { $set: {
      "payment_transaction_id": null,
      "paid_at": null,
      "refund_amount": null,
      "refunded_at": null
    }}
  )
  ```
- [ ] Create index for integration logging (optional):
  ```javascript
  db.integration_logs.createIndex({ customer_id: 1, created_at: -1 })
  ```

### Payment Gateway Configuration (15 minutes)

**Razorpay:**
- [ ] Open Razorpay Dashboard → Settings → Webhooks
- [ ] Add webhook URL: `https://yourdomain.com/api/integration/webhook/razorpay`
- [ ] Select events: `payment.authorized`, `payment.failed`, `refund.created`
- [ ] Save and test webhook
- [ ] Verify webhook deliveries in Razorpay logs

**PayPal (if enabled):**
- [ ] Open PayPal Dashboard → App & Credentials → Webhooks
- [ ] Add webhook URL: `https://yourdomain.com/api/integration/webhook/paypal`
- [ ] Select events: `PAYMENT.CAPTURE.COMPLETED`, `REFUND.COMPLETED`
- [ ] Save and test

**Google Pay (if enabled):**
- [ ] Configure in Google Cloud Console
- [ ] Add webhook: `https://yourdomain.com/api/integration/webhook/google-pay`

### Testing (1 hour)

#### Unit Tests
```bash
# Test integration service
python -m pytest backend/tests/test_integration.py -v
```

#### Integration Tests
```bash
# Test complete workflow
python -m pytest backend/tests/test_integration_e2e.py -v
```

#### Manual Testing - Wallet Topup

1. **Initiate Topup:**
   ```bash
   curl -X POST http://localhost:5000/api/integration/wallet/topup/initiate \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "customer_id": "cust_123",
       "amount": 100,
       "payment_method": "razorpay"
     }'
   ```
   Expected Response:
   ```json
   {
     "success": true,
     "payment_order_id": "order_...",
     "gateway": "razorpay",
     "redirect_url": "https://checkout.razorpay.com/..."
   }
   ```

2. **Simulate Webhook:**
   ```bash
   curl -X POST http://localhost:5000/api/integration/webhook/razorpay \
     -H "Content-Type: application/json" \
     -d '{
       "event": "payment.authorized",
       "payload": {
         "payment": {
           "entity": {
             "id": "pay_123",
             "amount": 10000,
             "order_id": "order_123"
           }
         }
       },
       "customer_id": "cust_123",
       "metadata": {
         "add_credits": true,
         "amount": 100
       }
     }'
   ```
   Expected: Credits added to wallet

#### Manual Testing - Order Payment with Wallet

1. **Pay Order:**
   ```bash
   curl -X POST http://localhost:5000/api/integration/order/pay-with-wallet \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "order_id": "ord_456",
       "customer_id": "cust_123",
       "amount": 300
     }'
   ```
   Expected: Order marked as PAID, wallet deducted

#### Manual Testing - Refund

1. **Refund Order:**
   ```bash
   curl -X POST http://localhost:5000/api/integration/order/refund-to-wallet \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "order_id": "ord_456",
       "customer_id": "cust_123",
       "amount": 300,
       "reason": "Customer request"
     }'
   ```
   Expected: Wallet credited, order marked as REFUNDED

### Load Testing (30 minutes)

```bash
# Test 100 concurrent wallet topups
ab -n 100 -c 10 \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -p payload.json \
  http://localhost:5000/api/integration/wallet/topup/initiate
```

Expected: >95% success rate, <500ms response time

### Monitoring Setup (20 minutes)

- [ ] Set up logging:
  ```python
  import logging
  logging.basicConfig(level=logging.INFO)
  logger = logging.getLogger('integration')
  ```

- [ ] Create monitoring dashboard:
  - Webhook success rate (should be >99%)
  - Integration API response time (should be <500ms)
  - Wallet topup conversion rate
  - Refund rate

- [ ] Set up alerts:
  ```
  Alert if webhook_success_rate < 95%
  Alert if api_response_time > 1000ms
  Alert if integration_service_down
  ```

---

## 🚀 Deployment Steps

### Pre-Deployment (30 minutes)

1. **Code Review**
   - [ ] Review `wallet_payment_integration.py`
   - [ ] Review `routes_integration.py`
   - [ ] Review `integrationService.js`
   - [ ] All team approvals obtained

2. **Backup**
   - [ ] Database backup created
   - [ ] Code backed up
   - [ ] Current version tagged in git

3. **Staging Verification**
   - [ ] Deploy to staging environment
   - [ ] Run all tests in staging
   - [ ] Manual testing completed
   - [ ] Performance verified

### Deployment (30 minutes)

1. **Prepare Deployment**
   ```bash
   # In project directory
   git pull origin main
   git checkout v1.0.0  # Latest version
   ```

2. **Stop Services**
   ```bash
   # Stop Flask backend
   pkill -f "python server.py"
   
   # Stop frontend (optional - if serving from same server)
   npm run build
   ```

3. **Install/Update Code**
   ```bash
   # Copy new files
   cp backend/wallet_payment_integration.py /app/backend/
   cp backend/routes_integration.py /app/backend/
   cp frontend/src/services/integrationService.js /app/frontend/src/services/
   ```

4. **Database Migrations**
   ```bash
   # Add payment fields to orders (if not exists)
   python scripts/migrate_integration.py
   ```

5. **Update Configuration**
   ```python
   # In server.py, register integration blueprint
   from backend.routes_integration import integration_bp
   app.register_blueprint(integration_bp)
   ```

6. **Start Services**
   ```bash
   # Start Flask backend
   python server.py &
   
   # Start frontend (if needed)
   npm start &
   
   # Verify services running
   curl http://localhost:5000/api/integration/health
   ```

7. **Verify Deployment**
   ```bash
   # Check services running
   ps aux | grep python
   ps aux | grep node
   
   # Check logs for errors
   tail -f logs/integration.log
   tail -f logs/error.log
   
   # Test endpoints
   curl http://localhost:5000/api/integration/health
   ```

### Post-Deployment (1 hour)

1. **Smoke Tests**
   - [ ] GET /api/integration/health → OK
   - [ ] POST /api/integration/wallet/topup/initiate → Success
   - [ ] Test wallet topup workflow
   - [ ] Test order payment with wallet
   - [ ] Test refund to wallet

2. **Monitor**
   - [ ] Watch error logs for issues
   - [ ] Monitor webhook success rate
   - [ ] Check response times (<500ms)
   - [ ] Monitor database for errors

3. **Rollback Plan (If Issues)**
   ```bash
   # Revert code
   git checkout previous_version
   cp previous_code/wallet_payment_integration.py /app/backend/
   cp previous_code/routes_integration.py /app/backend/
   
   # Restart services
   pkill -f "python server.py"
   python server.py &
   
   # Verify rollback
   curl http://localhost:5000/api/integration/health
   ```

---

## 🔧 Configuration

### Environment Variables (Optional)

```bash
# .env file
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
GOOGLE_PAY_MERCHANT_ID=...
APPLE_PAY_MERCHANT_ID=...

# Integration settings
INTEGRATION_WEBHOOK_TIMEOUT=30
INTEGRATION_MAX_RETRIES=3
INTEGRATION_LOG_LEVEL=INFO
```

### Logging Configuration

```python
# logging.conf
[loggers]
keys=root,integration

[handlers]
keys=console,file

[logger_integration]
level=INFO
handlers=console,file
qualname=integration

[handler_file]
class=FileHandler
level=INFO
formatter=verbose
args=('logs/integration.log', 'a')
```

---

## 📈 Performance Expectations

After deployment, expect:

| Metric | Value |
|--------|-------|
| Wallet topup success rate | >98% |
| Webhook processing time | <100ms |
| API response time | <500ms |
| Order payment with wallet | <1 second |
| Refund processing | <2 seconds |
| Concurrent capacity | 1000+ requests/min |

---

## 🆘 Rollback Procedure

**If critical issues occur:**

1. **Stop deployment**
2. **Revert code to previous version**
3. **Restart services**
4. **Verify functionality**
5. **Debug issue in staging**
6. **Re-deploy after fix**

```bash
# Quick rollback script
#!/bin/bash
pkill -f "python server.py"
git checkout previous_version
python server.py &
curl http://localhost:5000/api/integration/health
```

---

## 📞 Support Contacts

**For Issues During Deployment:**
- Backend Lead: [Contact]
- Frontend Lead: [Contact]
- DevOps: [Contact]
- Payment Gateway Support: [Contact]

**For Questions:**
- Integration documentation: `PHASE_4B_3_1_INTEGRATION_GUIDE.md`
- API reference: API endpoints in `routes_integration.py`
- Testing guide: Test cases in this document

---

## ✨ Success Criteria

Deployment is successful when:

- ✅ All endpoints responding (health check OK)
- ✅ Wallet topup workflow working end-to-end
- ✅ Order payment with wallet working
- ✅ Refund to wallet working
- ✅ Webhooks being received and processed
- ✅ Credits added to wallet after payment
- ✅ Transactions linked correctly
- ✅ No errors in logs
- ✅ Performance within targets
- ✅ Team can troubleshoot issues

---

**Status:** ✅ Ready for Deployment  
**Date:** January 28, 2026  
**Estimated Deployment Time:** 2 hours  
**Estimated Testing Time:** 1 hour  
**Total Effort:** 3 hours

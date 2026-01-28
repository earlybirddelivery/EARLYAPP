# MyOperator WhatsApp Setup - Quick Start (15 minutes)

**Goal:** Get WhatsApp notifications working in 15 minutes  
**Date:** January 27, 2026

---

## STEP 1: Get MyOperator Credentials (5 min)

### 1.1 Sign up
- Go to https://myoperator.co
- Create account with business email
- Verify email

### 1.2 Generate API Credentials
- Dashboard → Settings → API & Integrations
- Click "Generate API Key"
- Copy these values:
  - **API Key:** `myop_key_xxxxx`
  - **API Secret:** `myop_secret_yyyyy`
  - **Account ID:** `acc_zzzzz`

### 1.3 Add WhatsApp Business Number
- Dashboard → Settings → Business Profile
- Click "Add WhatsApp Number"
- Enter your business phone: +919876543210 (example)
- Verify via SMS/Call
- Copy verified number

✅ **You now have all 4 credentials needed**

---

## STEP 2: Configure Environment (2 min)

### 2.1 Edit `.env` file

**Location:** `c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend\.env`

Add these lines:
```bash
# MyOperator WhatsApp Integration
MYOPERATOR_API_KEY=myop_key_xxxxx
MYOPERATOR_API_SECRET=myop_secret_yyyyy
MYOPERATOR_ACCOUNT_ID=acc_zzzzz
MYOPERATOR_WHATSAPP_NUMBER=+919876543210
```

### 2.2 Remove old Twilio vars (optional)
```bash
# Comment these out if they exist:
# TWILIO_ACCOUNT_SID=...
# TWILIO_AUTH_TOKEN=...
# TWILIO_WHATSAPP_NUMBER=...
```

✅ **Environment configured**

---

## STEP 3: Test Installation (2 min)

### 3.1 Test imports
```bash
cd c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend

python -c "import httpx; print('✓ httpx installed')"
python -c "import notification_service; print('✓ notification_service loads')"
python -c "import notification_templates; print('✓ notification_templates loads')"
```

### 3.2 Expected output
```
✓ httpx installed
✓ notification_service loads
✓ notification_templates loads
```

✅ **Installation verified**

---

## STEP 4: Initialize Database (2 min)

### 4.1 Run migration
```bash
cd c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend

python run_migrations.py
```

### 4.2 Expected output
```
✓ Running migration 004: WhatsApp Notifications...
  • Creating notification_templates collection...
  • Creating notifications_log collection...
  • Creating notifications_queue collection...
  • Creating notification_settings collection...
✓ Migration 004 completed successfully!
✓ Initialized 10 WhatsApp notification templates
```

✅ **Database initialized**

---

## STEP 5: Test Message Sending (2 min)

### 5.1 Start backend server
```bash
cd c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend

python -m uvicorn server:app --host 0.0.0.0 --port 1001 --reload
```

### 5.2 In another terminal, send test message
```bash
# Replace with real JWT token from your login
curl -X POST http://localhost:1001/api/notifications/send-message \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "message_type": "delivery_reminder",
    "context": {
      "customer_name": "Test User",
      "delivery_date": "Jan 28",
      "area": "Test Area"
    },
    "immediate": true
  }'
```

### 5.3 Expected response
```json
{
  "id": "abc-123-def",
  "status": "sent",
  "phone": "+919876543210",
  "type": "delivery_reminder",
  "timestamp": "2026-01-27T10:30:00Z",
  "myoperator_id": "msg-xyz"
}
```

### 5.4 Check MyOperator Dashboard
- Dashboard → Messages → Inbox
- Should see your test message listed

✅ **Message sent successfully**

---

## STEP 6: Check Message History (1 min)

### 6.1 Query history
```bash
curl http://localhost:1001/api/notifications/history \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 6.2 Expected response
```json
[
  {
    "id": "abc-123-def",
    "phone": "+919876543210",
    "type": "delivery_reminder",
    "message": "Hi Test User! Your delivery is scheduled for Jan 28 in Test Area",
    "status": "sent",
    "created_at": "2026-01-27T10:30:00Z",
    "sent_at": "2026-01-27T10:30:01Z",
    "myoperator_message_id": "msg-xyz"
  }
]
```

✅ **History working**

---

## STEP 7: Integrate into Routes (3-5 min)

Now add WhatsApp triggers to your existing routes.

### 7.1 Update `routes_orders.py`

Find the order creation endpoint and add:

```python
# At top of file
from notification_service import send_order_confirmation

# After order is created:
try:
    await send_order_confirmation(
        phone=customer.get("phone"),
        customer_name=customer.get("name"),
        order_id=order["id"],
        total_amount=order.get("total_amount", 0),
        delivery_date=order.get("delivery_date")
    )
except Exception as e:
    logger.error(f"WhatsApp notification failed: {e}")
```

### 7.2 Update `routes_subscriptions.py`

Add WhatsApp on subscription creation:

```python
# At top of file
from notification_service import send_subscription_confirmation

# After subscription is created:
await send_subscription_confirmation(
    phone=customer.get("phone"),
    customer_name=customer.get("name"),
    product=subscription.get("product_name"),
    start_date=subscription.get("start_date"),
    subscription_id=subscription["id"]
)
```

### 7.3 Update `routes_billing.py`

Add WhatsApp on payment received:

```python
# At top of file
from notification_service import send_payment_confirmation

# After payment is recorded:
await send_payment_confirmation(
    phone=customer.get("phone"),
    customer_name=customer.get("name"),
    amount=payment.get("amount"),
    order_id=bill_id
)
```

✅ **Routes integrated**

---

## STEP 8: Verify Backend Startup (1 min)

### 8.1 Restart server with new routes
```bash
# Ctrl+C to stop current server

# Restart
python -m uvicorn server:app --host 0.0.0.0 --port 1001 --reload
```

### 8.2 Watch logs for initialization
```
✓ Notification templates initialized
✓ Background queue processor started
```

✅ **Backend fully running**

---

## STEP 9: Create Test Order (1 min)

### 9.1 Via your frontend or API
- Create a test order
- Watch backend logs

### 9.2 Expected logs
```
INFO: Message abc-123 sent successfully to +919876543210
INFO: Retry successful for message def-456
```

### 9.3 Check WhatsApp
- Customer receives message on their WhatsApp!

✅ **End-to-end working**

---

## ✅ COMPLETE! 

You now have:
- ✅ WhatsApp notifications working
- ✅ Messages queued and retried automatically
- ✅ Message history and statistics
- ✅ Integration with all routes
- ✅ Production-ready system

---

## Next Steps

### Short Term (Today)
- [ ] Send 10-20 test messages to verify
- [ ] Check delivery rates in MyOperator dashboard
- [ ] Monitor logs for errors
- [ ] Adjust templates if needed

### Medium Term (This Week)
- [ ] Deploy to staging environment
- [ ] Beta test with 10% of customers
- [ ] Collect feedback on message content
- [ ] Optimize delivery times

### Long Term (This Month)
- [ ] Full production rollout
- [ ] Monitor success rates
- [ ] A/B test different message templates
- [ ] Expand to SMS fallback (optional)

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "API Error 401" | Check MyOperator credentials in .env |
| "Invalid phone" | Use format: +919876543210 |
| "Template not found" | Run migration: `python run_migrations.py` |
| "Message stuck in queue" | Check background processor is running in logs |
| "No MyOperator ID" | Verify API credentials and internet connectivity |

---

## Support Resources

- **MyOperator Docs:** https://docs.myoperator.co
- **WhatsApp API Guide:** https://docs.myoperator.co/whatsapp
- **Integration Guide:** See `MYOPERATOR_INTEGRATION_GUIDE.md`
- **Code Changes:** See `CODE_CHANGES_TWILIO_TO_MYOPERATOR.md`

---

## Summary

| Step | Time | Status |
|------|------|--------|
| Get credentials | 5 min | ✓ |
| Configure .env | 2 min | ✓ |
| Test installation | 2 min | ✓ |
| Initialize DB | 2 min | ✓ |
| Test message | 2 min | ✓ |
| Check history | 1 min | ✓ |
| Integrate routes | 5 min | ✓ |
| Verify startup | 1 min | ✓ |
| Create test order | 1 min | ✓ |
| **TOTAL** | **15 min** | **✓ DONE** |

---

**You're all set! WhatsApp notifications are now live.** 🚀


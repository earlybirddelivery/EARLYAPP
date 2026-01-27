# 📋 ROUTE EXECUTION ORDER - SAFE DEPLOYMENT SEQUENCE

**Project:** EarlyBird Delivery Services  
**Analysis Date:** January 27, 2026  
**Status:** PHASE 3 STEP 17 COMPLETION  
**Deployment Timeline:** 5 phases over 2-3 weeks

---

## 🎯 EXECUTIVE SUMMARY

### Deployment Phases

| Phase | Routes | Duration | Risk | Priority |
|-------|--------|----------|------|----------|
| Phase 1 (Foundation) | products, customer | 1-2 days | ✅ None | P0 |
| Phase 2 (Legacy) | orders, subscriptions | 2-3 days | ✅ Low | P1 (optional) |
| Phase 3 (Modern) | phase0, delivery_boy, shared_links | 3-4 days | 🟠 Medium | P0 |
| Phase 4 (Billing) | billing | 1-2 days | 🔴 High | **P0 CRITICAL** |
| Phase 5 (Admin) | admin, marketing, supplier | 1 day | ✅ Low | P1 |

### Key Requirements

**MUST FIX BEFORE DEPLOYMENT:**
1. 🔴 routes_billing.py - Add one-time orders query (blocks revenue)
2. 🔴 routes_shared_links.py - Add authentication (blocks security)
3. 🔴 Customer linking - Link users ↔ customers_v2 (blocks auth)

---

## 📅 DETAILED DEPLOYMENT SCHEDULE

### Phase 1: Foundation (Days 1-2)

**Routes to Deploy:**
1. ✅ routes_products.py
2. ✅ routes_customer.py

**Why First:**
- All other routes depend on these
- No upstream dependencies
- Foundation for everything else

**Deployment Steps:**

```
Day 1 Morning:
├─ Code review: routes_products.py
├─ Deploy to staging
├─ Test: Can create/read/update products
├─ Monitor: No errors in logs
└─ ✅ Approve for production

Day 1 Afternoon:
├─ Code review: routes_customer.py
├─ Deploy to staging
├─ Test: Can create/manage addresses
├─ Monitor: Addresses persist correctly
└─ ✅ Approve for production

Day 2 Morning:
├─ Backup: db.products and db.addresses
├─ Deploy Phase 1 to production (low risk)
├─ Health check: endpoints responding
├─ Database check: Collections created
└─ ✅ Phase 1 complete
```

**Pre-Deployment Checklist:**
- [ ] Code reviewed and approved
- [ ] Unit tests passing
- [ ] Integration tests passing (with mock dependencies)
- [ ] Database indexed
- [ ] Monitoring configured
- [ ] Rollback plan documented
- [ ] Team notified

**Post-Deployment Validation (1 day):**
- [ ] Products can be created/retrieved
- [ ] Addresses can be created/retrieved
- [ ] No error logs
- [ ] Response times acceptable

---

### Phase 2: Legacy System (Days 3-5) - OPTIONAL

**Routes to Deploy:**
1. routes_orders.py (legacy one-time orders)
2. routes_subscriptions.py (legacy recurring orders)

**Why Optional:**
- Modern system (Phase 0 V2) is recommended
- Legacy system won't be billed (see Phase 4 fix)
- Can skip if focused on Phase 0 only

**Deployment Steps:**

```
Day 3 Morning:
├─ Code review: routes_orders.py
├─ Verify: Depends only on products + addresses (✅ both deployed)
├─ Deploy to staging
├─ Test: Create orders → verify db.orders
├─ Test: Validate product exists
├─ Test: Validate address exists
└─ ✅ Approve for production

Day 3 Afternoon:
├─ Code review: routes_subscriptions.py
├─ Verify: Depends only on products + addresses (✅ both deployed)
├─ Deploy to staging
├─ Test: Create subscription → verify db.subscriptions
├─ Test: Pause/resume subscription
└─ ✅ Approve for production

Day 4 Morning:
├─ Backup: db.orders and db.subscriptions
├─ Deploy Phase 2 to production (low risk)
├─ Health check: endpoints responding
└─ ✅ Phase 2 complete

Day 5:
├─ Monitor for 24 hours
├─ Verify: Order/subscription creation working
├─ Verify: No data corruption
└─ ✅ Phase 2 stable
```

**CRITICAL NOTE:**
⚠️ These orders will NOT be billed until Phase 4 is fixed!

---

### Phase 3: Modern System (Days 6-9)

**Routes to Deploy:**
1. routes_phase0_updated.py (customers_v2 + subscriptions_v2)
2. routes_delivery_boy.py (delivery operations)
3. routes_shared_links.py (delivery confirmation links)

**Why This Phase:**
- Modern system replacing legacy
- Phase 0 V2 is the recommended path forward
- Depends only on products (Phase 1 ✅)

**PREREQUISITE - MUST FIX FIRST:**
🔴 Customer Linking (create user_id ↔ customer_v2_id linkage)

**Deployment Steps:**

```
Day 6 Morning:
├─ CODE FREEZE for customer linking fix
├─ File: models.py (add customer_v2_id to User)
├─ File: models_phase0_updated.py (add user_id to Customer)
├─ File: routes_phase0_updated.py (update creation logic)
├─ Create: Migration script for linking
├─ Test: User creation → link to customer_v2
└─ Review & approve customer linking changes

Day 6 Afternoon:
├─ Deploy customer linking fix to staging
├─ Run migration: Link all existing users to customers_v2 (if any)
├─ Test: Customer creation also creates user
├─ Test: User can login and see customer profile
├─ ✅ Approve for production

Day 7 Morning:
├─ Code review: routes_phase0_updated.py
├─ Verify: Uses fixed customer linking
├─ Deploy to staging
├─ Test: Create customers_v2 (also creates db.users)
├─ Test: Create subscriptions_v2
├─ Test: Customer can login
└─ ✅ Approve for production

Day 7 Afternoon:
├─ Code review: routes_delivery_boy.py
├─ Verify: Depends on subscriptions_v2 (from phase0 ✅)
├─ Deploy to staging
├─ Test: Get today's deliveries
├─ Test: Mark delivery complete
├─ Test: Adjust quantities
└─ ✅ Approve for production

Day 8 Morning:
├─ Code review: routes_shared_links.py
├─ Review: PUBLIC endpoint security (see Phase 4 prerequisites)
├─ Deploy to staging with MONITORING enabled
├─ Test: Get shared link
├─ Test: Mark delivered (verify audit log)
├─ Test: Rate limiting (if implemented)
└─ ✅ Approve for production (with caveats)

Day 8 Afternoon:
├─ Backup: db.customers_v2, db.subscriptions_v2
├─ Deploy Phase 3 to production
├─ Health check: All endpoints responding
├─ Verify: customers_v2, subscriptions_v2 collections created
└─ Monitor: No errors in logs

Day 9:
├─ Monitor for 24 hours
├─ Verify: Customers can be created
├─ Verify: Delivery boys can mark deliveries
├─ Verify: Shared links work
├─ ✅ Phase 3 stable
```

**CRITICAL NOTES:**

⚠️ **Security Risk - routes_shared_links.py:**
- Public endpoints with no authentication
- Anyone can mark deliveries as complete
- Anyone can pause/stop customer subscriptions
- Requires MONITORING and RATE LIMITING

**Monitoring During Phase 3:**
- Alert on: Unusual delivery confirmation patterns
- Alert on: Same link used 100+ times per hour
- Alert on: Pause requests from unique IPs

---

### Phase 4: Billing System (Days 10-12) - CRITICAL

**Routes to Deploy:**
1. routes_billing.py (MUST FIX FIRST!)

**Why Critical:**
- Generates customer invoices (revenue!)
- CURRENTLY BROKEN: Doesn't bill one-time orders
- ₹50K+/month revenue loss if not fixed

**PREREQUISITE - MUST FIX FIRST:**
🔴 One-Time Orders Billing (add db.orders query to routes_billing.py)

**Critical Fix Required:**

```python
# Current Code (routes_billing.py line 181) - BROKEN:
subscriptions = await db.subscriptions_v2.find({
    "status": {"$in": ["active", "paused"]}
}).to_list(1000)

# Fixed Code:
subscriptions = await db.subscriptions_v2.find({
    "status": {"$in": ["active", "paused"]}
}).to_list(1000)

# ADD THIS:
one_time_orders = await db.orders.find({
    "status": "DELIVERED",
    "billed": {"$ne": True}  # Not yet billed
}).to_list(1000)

# Then: Include both in billing
all_items = subscriptions + one_time_orders
```

**Deployment Steps:**

```
Day 10 Morning:
├─ CODE FREEZE for billing fix
├─ File: routes_billing.py line 181
├─ Change: Query db.orders + db.subscriptions_v2
├─ Change: Include both in billing calculation
├─ Add: billed flag to track if order was billed
├─ Test: One-time order → delivery → billing
├─ Test: Subscription → delivery → billing
├─ Test: Verify both included in bill
└─ Code review: Approved

Day 10 Afternoon:
├─ Create: Migration script to set billed=false on all orders
├─ Test: Migration doesn't corrupt existing orders
├─ Deploy: Fix to staging
├─ Test: Generate billing with one-time orders
├─ Verify: Bill amount includes orders
├─ Verify: billed flag set correctly
├─ ✅ Approve for production

Day 11 Morning:
├─ Verify Phase 3 is stable (delivery_boy, shared_links working)
├─ Backup: db.orders, db.subscriptions_v2, db.billing_records
├─ Run migration: Set billed=false on orders
├─ Deploy: Billing fix to production
├─ Health check: Billing endpoints responding
└─ Generate test bill to verify fix works

Day 11 Afternoon:
├─ Monitor: Billing generation
├─ Verify: Orders included in bills
├─ Verify: Revenue calculations correct
├─ Check: billed flag being set
└─ Alert if: Any bills missing orders

Day 12:
├─ Monitor for 24 hours
├─ Verify: Daily billing runs correctly
├─ Verify: Revenue recovered (orders billed!)
├─ Verify: No data corruption
└─ ✅ Phase 4 stable - CRITICAL FIX COMPLETE!
```

**Expected Impact:**
✅ One-time orders now included in billing  
✅ Revenue recovery: ₹50K+/month  
✅ Billing system now complete

**Post-Deployment Revenue Check:**
- [ ] One-time orders in bills
- [ ] Bill totals include order amounts
- [ ] billed flag correctly set
- [ ] Monthly revenue matches expected

---

### Phase 5: Admin & Misc (Days 13-14)

**Routes to Deploy:**
1. routes_admin.py (admin dashboard)
2. routes_marketing.py (marketing operations)
3. routes_supplier.py (supplier portal)

**Why Last:**
- Read-only operations (mostly)
- All dependencies exist
- Low-priority features

**Deployment Steps:**

```
Day 13 Morning:
├─ Code review: routes_admin.py
├─ Verify: All read operations on existing collections
├─ Deploy to staging
├─ Test: Admin can view dashboard
├─ Test: User statistics accurate
├─ ✅ Approve for production

Day 13 Afternoon:
├─ Code review: routes_marketing.py
├─ Deploy to staging
├─ Test: Marketing operations work
├─ ✅ Approve for production

Day 13 Evening:
├─ Code review: routes_supplier.py
├─ Deploy to staging
├─ Test: Supplier portal works
├─ ✅ Approve for production

Day 14 Morning:
├─ Backup: db.users (for admin)
├─ Deploy Phase 5 to production
├─ Health check: Admin endpoints responding
└─ ✅ All routes deployed!

Day 14 Afternoon:
├─ Monitor for 24 hours
├─ Verify: Admin dashboard working
├─ Verify: No cascading failures
└─ ✅ Full system deployed and stable
```

---

## 🔄 ROLLBACK PROCEDURES

### If Something Goes Wrong:

**Rollback Order (reverse of deployment):**

```
1. ROLLBACK Phase 5 (Admin routes)
   ├─ Easiest to rollback (read-only)
   ├─ Time: 5-10 minutes
   └─ Verification: No changes to core system

2. ROLLBACK Phase 4 (Billing)
   ├─ Remove db.orders query from routes_billing.py
   ├─ Restore routes_billing.py from backup
   ├─ Time: 10-15 minutes
   └─ Impact: Back to old (broken) system, but safe

3. ROLLBACK Phase 3 (Modern System)
   ├─ Disable routes_delivery_boy.py endpoints
   ├─ Disable routes_shared_links.py endpoints
   ├─ Restore routes_phase0_updated.py from backup
   ├─ Time: 15-20 minutes
   └─ Verification: customers_v2, subscriptions_v2 not created

4. ROLLBACK Phase 2 (Legacy)
   ├─ Disable routes_orders.py endpoints
   ├─ Disable routes_subscriptions.py endpoints
   ├─ Time: 5-10 minutes
   └─ Verification: No new orders/subs created

5. ROLLBACK Phase 1 (Foundation)
   ├─ DO NOT ROLLBACK - breaks everything else!
   ├─ If needed: Full database restore required
   ├─ Time: 1+ hour
   └─ Verification: All collections restored
```

**EMERGENCY ROLLBACK (Full DB Restore):**
```
If multiple phases broke simultaneously:
1. Stop all API servers
2. Restore MongoDB from backup (pre-deployment)
3. Restart API servers
4. Investigate what went wrong
5. Fix issues in staging
6. Re-deploy with fixes
```

---

## 📊 DEPLOYMENT RISK ASSESSMENT

### Phase-by-Phase Risk

| Phase | Risk Level | Issues | Mitigation |
|-------|-----------|--------|-----------|
| 1 (Foundation) | 🟢 None | Minimal dependencies | Standard testing |
| 2 (Legacy) | 🟢 Low | Won't be billed | Use Phase 3 instead |
| 3 (Modern) | 🟠 Medium | Public endpoints | Rate limiting + monitoring |
| 4 (Billing) | 🔴 High | Revenue critical | Extensive testing + backups |
| 5 (Admin) | 🟢 Low | Read-only | No special concerns |

### Critical Checkpoints

**Before Phase 1:**
- [ ] Database backed up (can restore if needed)
- [ ] Monitoring configured (alerts for errors)
- [ ] Team trained on deployment
- [ ] Runbook created for issues

**Before Phase 3:**
- [ ] Customer linking fix deployed and tested
- [ ] Rate limiting configured for shared_links
- [ ] Monitoring alerts configured
- [ ] Deployment plan reviewed

**Before Phase 4:**
- [ ] One-time orders billing fix deployed and tested
- [ ] Test billing with mix of orders + subscriptions
- [ ] Revenue figures verified
- [ ] Backup of pre-fix data

**Before Phase 5:**
- [ ] All critical phases (1-4) stable
- [ ] No alerts or errors in logs
- [ ] System performance acceptable

---

## ✅ DEPLOYMENT CHECKLIST

### Pre-Deployment (All Phases)

General checks before ANY deployment:

- [ ] Code reviewed and approved by 2+ team members
- [ ] All tests passing (unit + integration)
- [ ] No broken imports or syntax errors
- [ ] Database backed up
- [ ] Monitoring configured and tested
- [ ] Rollback plan documented
- [ ] Team notification sent (all relevant parties)
- [ ] Support team briefed on changes
- [ ] Staging deployment successful
- [ ] Performance tested (no slowdowns)

### Phase 1 Specific

- [ ] db.products collection ready
- [ ] db.addresses collection ready
- [ ] Products and addresses can be created

### Phase 2 Specific (Optional)

- [ ] db.orders collection exists
- [ ] db.subscriptions collection exists
- [ ] Products and addresses deployed (Phase 1 ✅)

### Phase 3 Specific

- [ ] Customer linking fix deployed (user_id ↔ customer_v2_id)
- [ ] db.customers_v2 collection ready
- [ ] db.subscriptions_v2 collection ready
- [ ] db.delivery_statuses collection ready
- [ ] Rate limiting configured for shared_links
- [ ] Monitoring alerts configured for shared_links

### Phase 4 Specific

- [ ] One-time orders billing fix deployed
- [ ] Test: Orders + subscriptions both billed
- [ ] Backup of billing records before first run
- [ ] Revenue calculation verified
- [ ] billed flag working correctly

### Phase 5 Specific

- [ ] All critical phases (1-4) deployed and stable
- [ ] Admin can view dashboard
- [ ] No cascading failures from earlier phases

---

## 📈 POST-DEPLOYMENT MONITORING

### Daily Checks (First Week)

```
✅ Every 4 hours:
   ├─ Check: Application responding
   ├─ Check: No errors in logs
   ├─ Check: Database responsive
   └─ Check: Alerts configured

✅ Once daily:
   ├─ Verify: Data consistency
   ├─ Check: Revenue metrics correct
   ├─ Monitor: API response times
   ├─ Check: No orphaned records
   └─ Review: Customer feedback
```

### Weekly Checks (First Month)

```
✅ Every week:
   ├─ Data consistency report
   ├─ Revenue reconciliation
   ├─ Performance analysis
   ├─ Security audit (especially shared_links)
   └─ Team retrospective
```

### Success Metrics

| Metric | Target | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 |
|--------|--------|---------|---------|---------|---------|---------|
| Uptime | > 99% | ✅ | ✅ | ✅ | ✅ | ✅ |
| API Response Time | < 500ms | ✅ | ✅ | ✅ | ✅ | ✅ |
| Error Rate | < 1% | ✅ | ✅ | ✅ | ✅ | ✅ |
| Orders Created/Day | Baseline + 10% | - | ✅ | ✅ | ✅ | ✅ |
| Revenue Collected | +₹50K/month | - | ❌ | ❌ | ✅ | ✅ |
| Deliveries/Day | Baseline | - | - | ✅ | ✅ | ✅ |

---

## 🎯 CRITICAL SUCCESS FACTORS

### For Each Phase:

**Phase 1 (Foundation):**
- Products and addresses are REQUIRED for everything else
- Must be 100% stable before Phase 2/3

**Phase 2 (Legacy):**
- Can be skipped if using Phase 3 only
- If deployed: won't be billed until Phase 4 fix

**Phase 3 (Modern):**
- Customer linking MUST be fixed before deployment
- Public endpoints need monitoring
- Delivery boys can't operate without this

**Phase 4 (Billing):**
- ONE-TIME ORDERS FIX is mandatory
- Revenue depends on this working correctly
- Extensive testing required

**Phase 5 (Admin):**
- Can only deploy if Phases 1-4 successful
- Low-risk, low-priority

---

## 📞 ESCALATION PROCEDURES

If issues occur during deployment:

```
MINOR ISSUES (1 endpoint broken):
├─ Immediately: Disable affected endpoint (return 503)
├─ Investigate: Root cause
├─ Fix: In staging first
├─ Redeploy: Only the fix
└─ Timeline: 1-2 hours

MAJOR ISSUES (Multiple routes affected):
├─ Immediately: Rollback to previous version
├─ Notify: All stakeholders
├─ Investigate: Why it broke
├─ Fix: In staging with extensive testing
├─ Redeploy: With extra validation
└─ Timeline: 4-8 hours

CRITICAL ISSUES (Revenue/Security affected):
├─ Immediately: Full rollback or disable feature
├─ Notify: CTO + Product + Support
├─ Investigate: Severity + scope
├─ Fix: With emergency review process
├─ Redeploy: Only when fully resolved
└─ Timeline: 1+ hours
```

---

## 📋 DEPLOYMENT SIGN-OFF

### Who Must Approve Each Phase:

| Phase | Code Review | Testing | Product | CTO | Release |
|-------|---|---|---|---|---|
| 1 | ✅ 2 devs | ✅ QA | ✅ Product | ✅ CTO | ✅ Tech Lead |
| 2 | ✅ 2 devs | ✅ QA | ✅ Product | ⚠️ CTO | ✅ Tech Lead |
| 3 | ✅ 2 devs | ✅ QA | ✅ Product | ✅ CTO | ✅ Tech Lead |
| 4 | ✅ 2 devs | ✅ QA + CFO | ✅ Product | ✅ CTO | ✅ CTO |
| 5 | ✅ 2 devs | ✅ QA | ⚠️ Optional | ✅ CTO | ✅ Tech Lead |

---

**Timeline:** 2-3 weeks  
**Risk Level:** 🟠 Medium (high upfront, then low)  
**Status:** ✅ READY FOR IMPLEMENTATION


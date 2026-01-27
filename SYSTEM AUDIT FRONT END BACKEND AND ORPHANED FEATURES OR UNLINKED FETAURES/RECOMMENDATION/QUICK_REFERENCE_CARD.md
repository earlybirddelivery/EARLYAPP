# ⚡ QUICK REFERENCE CARD (Print This)

## 15 SEQUENTIAL CHANGES - ONE PAGE SUMMARY

**Objective:** Fix billing system to include all orders (one-time + subscriptions)  
**Timeline:** 5 days | **Total Time:** 31 hours | **Risk:** Medium  

---

## CHANGE LIST (Execution Order)

```
DAY 1: FOUNDATION (4 changes, 7 hours, Low Risk)
  #1  Qty validation (2h)      → Prevents delivery qty > ordered
  #2  Add user_id (3h)         → Link customer to user account  
  #3  Audit billing (1h)       → Document current structure
  #4  Delete stubs (1h)        → Remove fake code

DAY 2: EXTEND (4 changes, 7 hours, Low Risk)
  #5  Permission check (1.5h)  → Only authorized delivery marking
  #6  Audit log (2h)           → Track who marked delivery
  #7  Date validation (1.5h)   → Prevent future delivery dates
  #8  Notes/photo (2h)         → Store delivery confirmation details

DAY 3: LINK (2 changes, 5 hours, Moderate Risk)
  #9  Add subscription_id (2h) → Link delivery to order 🔴 CRITICAL
  #10 Unified API (3h)         → View all order types together

DAY 4: FIX (2 changes, 5 hours, High Risk)
  #11 Include 1-time orders (3h)    → 💰 REVENUE RECOVERY 🔴 CRITICAL
  #12 Link login to customer (2h)   → User login returns customer profile

DAY 5: INTEGRATE (3 changes, 7 hours, Very High Risk)
  #13 Status validation (2h)   → Prevent invalid state changes
  #14 Report (3h)              → Data consistency dashboard
  #15 Backfill (2h)            → Populate missing fields 🔴 NEEDS BACKUP
```

---

## CRITICAL DEPENDENCIES

```
#1  ◄── No dependencies (START HERE)
#2  ◄── Requires: #1
#3  ◄── No dependencies
#4  ◄── No dependencies
#5  ◄── Requires: #1, #2
#6  ◄── Requires: #1, #5
#7  ◄── No dependencies
#8  ◄── No dependencies
#9  ◄── Requires: #1, #8 (ENABLES #11)
#10 ◄── No dependencies
#11 ◄── Requires: #1, #3, #9 (THE FIX)
#12 ◄── Requires: #1, #2
#13 ◄── No dependencies
#14 ◄── No dependencies
#15 ◄── Requires: #2, #9 (DATA MODIFICATION - BACKUP FIRST)
```

---

## 🚨 BEFORE YOU START

- [ ] Database backed up
- [ ] Test environment ready  
- [ ] Team notified of 5-day sprint
- [ ] SEQUENTIAL_REPAIR_STRATEGY.md printed
- [ ] Daily stand-ups scheduled
- [ ] Git repository clean

---

## EACH DAY: CHECKLIST

### **MONDAY**
```
Morning: Deploy #1, #2, #3, #4
  [ ] Change #1: Add qty validation
  [ ] Change #2: Add user_id field
  [ ] Change #3: Audit billing
  [ ] Change #4: Delete stubs

Afternoon: Test all changes
  [ ] Simple tests pass
  [ ] No regressions
  [ ] Database clean

Evening: Commit & document
  [ ] Code committed to git
  [ ] Testing notes recorded
  [ ] Ready for Tuesday
```

### **TUESDAY**
```
Morning: Deploy #5, #6, #7, #8
  [ ] Change #5: Permission check
  [ ] Change #6: Audit log
  [ ] Change #7: Date validation
  [ ] Change #8: Notes/photo

Afternoon: Test all changes
  [ ] Delivery flow works
  [ ] No regressions
  [ ] Delivery boy tests pass

Evening: Commit & prepare
  [ ] Code committed
  [ ] Ready for linking phase
```

### **WEDNESDAY**
```
Morning: Deploy #9, #10
  [ ] Change #9: Add subscription_id (DATABASE MIGRATION)
  [ ] Run backfill: Link deliveries to subscriptions
  [ ] Change #10: Unified API

Afternoon: Verify linking
  [ ] Query: db.delivery_statuses.findOne()
  [ ] Check: Has subscription_id? ✅
  [ ] Check: Billing can find order? ✅

Evening: Commit & prepare
  [ ] Database migration logged
  [ ] Ready for revenue fix
```

### **THURSDAY** 🔴 CRITICAL
```
Morning: Deploy #11, #12 (REVENUE FIX)
  [ ] Change #11: Include one-time orders in billing
  [ ] Change #12: Link users to customers on login

Afternoon: EXTENSIVE TESTING
  [ ] Create one-time order
  [ ] Mark as delivered
  [ ] Generate monthly bill
  [ ] Verify: Order in bill ✅
  [ ] Verify: No double billing ✅
  [ ] Test: Subscription still works ✅
  [ ] Test: Login gets customer ✅

Evening: Commit & celebrate
  [ ] Revenue fix deployed
  [ ] All tests passed
```

### **FRIDAY**
```
Morning: Deploy #13, #14, #15
  [ ] Change #13: Status validation
  [ ] Change #14: Consistency report
  [ ] Change #15: Run backfill script (AFTER BACKUP)

Midday: Run diagnostics
  [ ] python backend/backfill_missing_data.py
  [ ] Check /api/admin/reports/data-consistency
  [ ] Verify: 0 warnings ✅

Afternoon: Final validation
  [ ] All 15 changes deployed
  [ ] All tests passing
  [ ] No regressions
  [ ] Data clean & consistent

Evening: Ready for production
  [ ] System unified & working
  [ ] Documentation updated
  [ ] Team trained
```

---

## TESTING GATES (CRITICAL PATHS)

**Before Change #11 (Revenue Fix):**
```
✓ Change #3 done? (audit billing)
✓ Change #9 done? (subscription_id added)
✓ Test: Mark delivery → Check delivery_statuses has subscription_id
✓ Test: Billing query → Can find subscription_id
✓ ONLY THEN: Deploy #11
```

**Before Change #15 (Backfill):**
```
✓ Database backed up? (BACKUP IS MANDATORY)
✓ Changes #2, #9 deployed?
✓ Consistency report shows issues?
✓ Test on copy first?
✓ ONLY THEN: Run backfill script
```

---

## RED FLAGS (STOP & FIX)

| Issue | Likely Cause | Fix |
|-------|--------------|-----|
| Qty validation not working | Code not in right file | Check routes_delivery_boy.py line 84 |
| user_id field null | Didn't add to creation | Add field in customer create endpoint |
| Subscription not in bill | Change #9 incomplete | Verify subscription_id in deliveries |
| One-time order not billed | Change #11 not deployed | Check billing query includes db.orders |
| Login error | Change #12 error | Check users/customers_v2 join logic |
| Data inconsistent | Backfill incomplete | Re-run backfill script from #15 |

---

## GREEN FLAGS (PROCEED)

| Success | What It Means | Next Step |
|---------|--------------|-----------|
| One-time order in bill | #11 working | ✓ Continue to #12 |
| 0 warnings in report | Data clean | ✓ Ready for production |
| Login returns customer | #12 working | ✓ Full integration done |
| All deliveries linked | #9 working | ✓ Billing will work |

---

## ESTIMATE VS ACTUAL

```
Change #1:  Estimate 2h  →  Typical: 1.5-2.5h ✓
Change #2:  Estimate 3h  →  Typical: 2.5-3.5h ✓
Change #3:  Estimate 1h  →  Typical: 0.5-1.5h ✓
Change #4:  Estimate 1h  →  Typical: 0.5-1h ✓
Change #5:  Estimate 1.5h → Typical: 1-2h ✓
Change #6:  Estimate 2h  →  Typical: 1.5-2.5h ✓
Change #7:  Estimate 1.5h → Typical: 1-2h ✓
Change #8:  Estimate 2h  →  Typical: 1.5-2.5h ✓
Change #9:  Estimate 2h  →  Typical: 2-3h ✓ (DB migration)
Change #10: Estimate 3h  →  Typical: 2.5-3.5h ✓
Change #11: Estimate 3h  →  Typical: 2.5-4h ⚠️ (test intensive)
Change #12: Estimate 2h  →  Typical: 1.5-2.5h ✓
Change #13: Estimate 2h  →  Typical: 1.5-2.5h ✓
Change #14: Estimate 3h  →  Typical: 2.5-3.5h ✓
Change #15: Estimate 2h  →  Typical: 1.5-3h ⚠️ (depends on data)

TOTAL: 31 hours ± 5 hours
REALISTIC: 26-36 hours (4-6 days with 1 dev)
```

---

## TIME ALLOCATION

```
26% - Changes #1-4 (foundation)
26% - Changes #5-8 (extend)
16% - Changes #9-10 (link)
16% - Changes #11-12 (fix)
16% - Changes #13-15 (integrate)
```

---

## ROLLBACK DIFFICULTY

```
#1-4, #7-8, #10, #13-14  ← EASY (revert code only)
#5-6, #9, #12            ← MEDIUM (revert + small migration)
#11                      ← HARD (need to recalculate bills)
#15                      ← CRITICAL (needs database restore)
```

---

## KEY FILES TO EDIT

| Change | Files |
|--------|-------|
| #1 | routes_delivery_boy.py, routes_shared_links.py |
| #2 | models_phase0_updated.py, routes_phase0_updated.py |
| #3 | routes_billing.py (read only) |
| #4 | Delete modules/* |
| #5 | routes_delivery_boy.py |
| #6 | routes_delivery_boy.py, routes_shared_links.py |
| #7 | routes_delivery_boy.py, routes_shared_links.py |
| #8 | routes_delivery_boy.py, routes_shared_links.py, models.py |
| #9 | routes_delivery_boy.py, models.py (database migration) |
| #10 | CREATE: routes_unified_orders.py |
| #11 | routes_billing.py (CRITICAL) |
| #12 | auth.py, routes_phase0_updated.py |
| #13 | Create validation function (shared) |
| #14 | CREATE: routes_admin_reports.py |
| #15 | CREATE: backfill_missing_data.py (run script) |

---

## COMMANDS TO RUN

```
# Day 3: Backfill subscription IDs
db.delivery_statuses.find().forEach(function(d) {
  var sub = db.subscriptions_v2.findOne({customer_id: d.customer_id});
  if(sub) db.delivery_statuses.updateOne({_id: d._id}, {$set: {subscription_id: sub.id}});
});

# Day 4: Generate monthly bill (for testing)
curl -X POST http://localhost:1001/api/billing/generate-bill

# Day 5: Run backfill script
cd backend
python backfill_missing_data.py

# Day 5: Check consistency
curl -X GET http://localhost:1001/api/admin/reports/data-consistency
```

---

## CONTACT POINTS

If stuck on:
- **Code logic:** See SEQUENTIAL_REPAIR_STRATEGY.md for that change
- **Dependencies:** See VISUAL_DEPENDENCY_MAP.md  
- **Testing:** See QUICK_START_15_CHANGES.md testing section
- **Timeline:** See VISUAL_DEPENDENCY_MAP.md Gantt chart
- **Rollback:** See SEQUENTIAL_REPAIR_STRATEGY.md rollback section

---

**Print this page. Tape to desk. Reference daily.** 📌

**Ready? Start with Change #1 →** 🚀

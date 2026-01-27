# VISUAL DEPENDENCY MAP & CRITICAL PATH

## 🎯 CRITICAL PATH TO REVENUE RECOVERY

This is the MINIMUM you must do to fix the billing issue:

```
┌─────────────────────────────────────────────────────────┐
│ DAY 1: Change #1 (2h)                                   │
│ Add quantity validation to delivery confirmation        │
│ - Prevents delivering more than ordered                │
│ - No dependencies, safe to start                        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────┐
│ DAY 1: Change #3 (1h)                                   │
│ Audit current billing structure                         │
│ - Understand what's in db.billing_records now           │
│ - Baseline for change #11                               │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────┐
│ DAY 2: Change #8 (2h)                                   │
│ Add delivery notes/photo field                          │
│ - Enables change #9                                     │
│ - Tracks delivery confirmation details                  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────┐
│ DAY 3: Change #9 (2h) ⚠️ CRITICAL                        │
│ Add subscription_id to deliveries                       │
│ - Links delivery to originating order                   │
│ - Required for billing to find orders                   │
│ - Database migration needed                             │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────┐
│ DAY 4: Change #11 (3h) 🔴 REVENUE FIX                    │
│ Include one-time orders in billing                      │
│ - Query db.orders (was ignored)                         │
│ - Link to deliveries (now have subscription_id)         │
│ - Calculate billing for both subscription + one-time    │
│ - REVENUE RECOVERED                                      │
└─────────────────────────────────────────────────────────┘

CRITICAL PATH TIME: 10 hours (1 week)
BUSINESS IMPACT: Stop losing revenue from one-time orders
```

---

## 📊 CHANGE PREREQUISITES MATRIX

```
          #1   #2   #3   #4   #5   #6   #7   #8   #9  #10  #11  #12  #13  #14  #15
#1 (Qty)  ✓    -    -    -    -    -    -    -    -    -    -    -    -    -    -
#2 (FK)   ✓    ✓    -    -    ✓    -    -    -    -    -    -    ✓    -    -    ✓
#3 (Bill) ✓    -    ✓    -    -    -    -    -    -    -    ✓    -    -    -    -
#4 (Del)  ✓    -    -    ✓    -    -    -    -    -    -    -    -    -    -    -
#5 (Perm) ✓    ✓    -    -    ✓    -    -    -    -    -    -    -    -    -    -
#6 (Audi) ✓    -    -    -    ✓    ✓    -    -    -    -    -    -    -    -    -
#7 (Date) ✓    -    -    -    -    -    ✓    -    -    -    -    -    -    -    -
#8 (Note) ✓    -    -    -    -    -    -    ✓    ✓    -    -    -    -    -    -
#9 (Sub)  ✓    -    -    -    -    -    -    ✓    ✓    -    ✓    -    -    -    ✓
#10(Unif) ✓    -    -    -    -    -    -    -    -    ✓    -    -    -    -    -
#11(1Time)✓    -    ✓    -    -    -    -    -    ✓    -    ✓    -    -    -    -
#12(User) ✓    ✓    -    -    -    -    -    -    -    -    -    ✓    -    -    -
#13(Stat) ✓    -    -    -    -    -    -    -    -    -    -    -    ✓    -    -
#14(Rept) ✓    -    -    -    -    -    -    -    -    -    -    -    -    ✓    -
#15(Back) ✓    ✓    -    -    -    -    -    -    ✓    -    -    -    -    -    ✓

Legend: ✓ = Required, - = Not required, ✓ in column = Must do this first
```

---

## ⏱️ TIMELINE WITH DEPENDENCIES RESPECTED

```
         MONDAY          TUESDAY        WEDNESDAY      THURSDAY       FRIDAY
         ──────────────────────────────────────────────────────────────────

         #1 #2 #3 #4    #5 #6 #7 #8    #9 #10         #11 #12        #13 #14 #15
         ↓  ↓  ↓  ↓     ↓  ↓  ↓  ↓     ↓  ↓           ↓   ↓          ↓   ↓   ↓
09:00    ┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
         │ Qty Validate │ Permission   │ Add Sub ID   │ Include 1-T  │ Status Valid │
10:00    │ (2h)         │ Check (1.5h) │ to Delivery  │ Orders in    │ (2h)         │
11:00    │              │              │ (2h)         │ Billing      │              │
         │              │              │              │ (3h)         │              │
12:00    ├──────────────┤              │              │              │  Data Report │
         │ User ID FK   │ Audit Log    │              │              │  (3h)        │
13:00    │ (3h)         │ (2h)         │              │              │              │
14:00    │              │              ├──────────────┤              ├──────────────┤
         │              ├──────────────┤              │ User→Cust    │ Backfill     │
15:00    │              │ Date Valid   │ Unified API  │ Login (2h)   │ Script (2h)  │
16:00    └──────────────┤ (1.5h)       │ (3h)         │              │              │
                        │              │              │              │              │
         Audit Billing  │ Notes/Photo  │              │              │              │
         (1h)           │ (2h)         │              │              │              │
         Delete Stubs   │              │              │              │              │
         (1h)           │              │              │              │              │
         ────────────── ├──────────────┴──────────────┴──────────────┴──────────────┘
                        │
                        ↓
                    KEY MILESTONES:
                    ✓ Mon: Foundation set
                    ✓ Tue: Extended features
                    ✓ Wed: Systems linking
                    ✓ Thu: Revenue recovered
                    ✓ Fri: Integrated & clean
```

---

## 🔀 DEPENDENCY DAG (Directed Acyclic Graph)

```
                        START
                         │
        ┌────────────────┼────────────────┬───────────────────┐
        │                │                │                   │
        ▼                ▼                ▼                   ▼
    [#1 Qty]         [#3 Audit]       [#4 Delete]        [#7 Date]
    ZERO DEP         ZERO DEP         ZERO DEP           ZERO DEP
        │                │                │                   │
        │                │                │                   │
        ├────────────────┴────────────────┴───────────────────┤
        │                                                      │
        ▼                                                      ▼
    [#2 User_ID]                                          [#13 Status]
    (depends: #1)                                         (depends: #1)
        │                                                      │
    ┌───┴────────────────────────────────────────┐            │
    │                                            │            │
    ▼                                            ▼            │
[#5 Permission]                            [#12 Login]       │
(depends: #1,#2)                           (depends: #1,#2)  │
    │                                            │            │
    ▼                                            │            │
[#6 Audit Log]                                  │            │
(depends: #1,#5)                                │            │
    │                                            │            │
    │                        ┌───────────────────┘            │
    │                        │                                │
    │                        ▼                                │
    │                    [#8 Notes/Photo]                    │
    │                    (depends: #1)                        │
    │                        │                                │
    │                        ▼                                │
    │                    [#9 Sub_ID]  ◄─ CRITICAL            │
    │                    (depends: #1,#8)                     │
    │                        │                                │
    │    ┌───────────────────┴─────────────────┐             │
    │    │                                     │             │
    │    ▼                                     ▼             │
    ├─ [#10 Unified API]              [#11 One-Time Bill]    │
    │   (depends: #1)                 (depends: #1,#3,#9)    │
    │                                     │                  │
    │                    ┌────────────────┘                  │
    │                    │                                   │
    │                    ▼                                   │
    │                [#14 Report] ◄── HEALTH CHECK          │
    │                (depends: #1)                           │
    │                    │                                   │
    └────────┬───────────┴───────────────┬───────────────────┘
             │                           │
             ▼                           ▼
         [#15 Backfill] ◄─ NUCLEAR (depends: #2, #9)
             │
             ▼
            END
```

---

## 📈 RISK PROGRESSION

```
Risk Level Over Time
     │
HIGH │     ╱╲
     │    ╱  ╲         ╱──────
     │   ╱    ╲       ╱
     │  ╱      ╲     ╱
MED  │ ╱        ╲   ╱
     │╱          ╲ ╱
LOW  │────────────╲────────────
     │             ╲           ╲___
  0  └──────────────────────────────── Time
        D1    D2     D3     D4    D5
       Low   Low    Med    High   Very High
       
Key Points:
- D1-D2: LOW (read validation, field adds)
- D3: MEDIUM (linking systems)
- D4: HIGH (billing changes, user linking)
- D5: CRITICAL (data backfill - backup required)
```

---

## 📋 DAILY STAND-UP SCRIPT

### **Monday Morning**
```
[ ] Database backed up? YES
[ ] All team members read this doc? YES
[ ] Test environment ready? YES

WORK: Deploy changes #1, #2, #3, #4
  [ ] Change #1: Qty validation
  [ ] Change #2: User_ID field  
  [ ] Change #3: Audit billing
  [ ] Change #4: Delete stubs
  
TESTING: Run simple tests for each
COMMIT: "Day 1 Foundation: Qty validation, user_id field, billing audit, cleanup"
```

### **Tuesday Morning**
```
[ ] Monday's tests all passed? YES
[ ] No regressions? YES

WORK: Deploy changes #5, #6, #7, #8
  [ ] Change #5: Permission check
  [ ] Change #6: Audit log
  [ ] Change #7: Date validation
  [ ] Change #8: Notes/photo field
  
TESTING: Verify delivery flow still works
COMMIT: "Day 2 Extended: Permission checks, audit log, validations"
```

### **Wednesday Morning**
```
[ ] Tuesday's tests all passed? YES

WORK: Deploy changes #9, #10
  [ ] Change #9: Add subscription_id (critical!)
  [ ] Run database migration for backfill
  [ ] Change #10: Unified orders API
  
TESTING: Verify deliveries linked to subscriptions
  ✓ db.delivery_statuses.findOne() has subscription_id
  ✓ Billing query can find delivery from subscription
  
COMMIT: "Day 3 Linking: Subscription ID linking, unified API"
```

### **Thursday Morning**
```
[ ] Wednesday's linking verified? YES
[ ] Delivery→Subscription relationship confirmed? YES

WORK: Deploy changes #11, #12 (CRITICAL FIXES)
  [ ] Change #11: Include one-time orders in billing
  [ ] Test: One-time order → Delivered → Billed
  [ ] Change #12: Link users to customers on login
  [ ] Test: Login returns customer profile
  
TESTING (EXTENSIVE):
  ✓ Subscription still appears in bill
  ✓ One-time order appears in bill
  ✓ Both in same month: both billed
  ✓ No duplicate billing
  ✓ Login returns customer_id
  
COMMIT: "Day 4 Revenue Fix: One-time orders in billing, login linking"
```

### **Friday Morning**
```
[ ] Thursday's revenue fix verified? YES
[ ] Both order types billing correctly? YES
[ ] No regressions in login? YES

WORK: Deploy changes #13, #14, #15 (INTEGRATION)
  [ ] Change #13: Status validation
  [ ] Change #14: Consistency report
  [ ] Change #15: Backfill script
  
  [ ] RUN: python backend/backfill_missing_data.py
  [ ] RUN: curl http://localhost:1001/api/admin/reports/data-consistency
  [ ] CHECK: All warnings resolved
  
TESTING: Full end-to-end validation
  ✓ Consistency report shows 0 warnings
  ✓ All customers have user_id
  ✓ All deliveries have subscription_id
  ✓ No orphaned data
  
COMMIT: "Day 5 Complete: Status validation, backfill, system unified"
```

---

## 🎯 DECISION TREE: "What should I do next?"

```
                         START HERE
                             │
                             ▼
                    Have you backed up
                     the database?
                    /              \
                  NO                YES
                  │                  │
                  ▼                  ▼
            DO IT NOW          Is Day 1 done?
              (Then)          ✓ Changes #1-4
                  │          /              \
                  │       NO                YES
                  │        │                  │
                  └────────┘                  ▼
                           │            Is Day 2 done?
                           │          ✓ Changes #5-8
                           │          /              \
                           │       NO                YES
                           │        │                  │
                           └────────┘                  ▼
                                   │            Is Day 3 done?
                                   │          ✓ Changes #9-10
                                   │          /              \
                                   │       NO                YES
                                   │        │                  │
                                   └────────┘                  ▼
                                           │            Is Day 4 done?
                                           │          ✓ Changes #11-12
                                           │          /              \
                                           │       NO                YES
                                           │        │                  │
                                           └────────┘                  ▼
                                                   │             Is Day 5 ready?
                                                   │          ✓ Changes #13-15
                                                   │          /              \
                                                   │       NO                YES
                                                   │        │                  │
                                                   └────────┘                  ▼
                                                           │          🎉 DONE!
                                                           │       Production
                                                           │       Ready
```

---

## 🔴 RED FLAGS (Stop and Fix)

| Flag | Meaning | Action |
|------|---------|--------|
| `Subscription not in billing after #11` | Query not working | Verify Change #9 completed, db has subscription_id |
| `One-time order billed twice` | Duplicate query | Check billing query doesn't count both sources |
| `Customer can't login after #12` | User link broken | Verify user_id field exists and is populated |
| `Permission error on delivery` | #5 too strict | Check delivery_boy_id matches current user |
| `Consistency report shows warnings` | Data incomplete | Run Change #15 backfill script |

---

## ✅ GREEN FLAGS (You're good)

| Flag | Meaning | Proceed |
|------|---------|---------|
| One-time order appears in monthly bill | Change #11 working | ✓ Continue |
| Consistency report: 0 warnings | All data clean | ✓ Deploy to prod |
| Login returns customer profile | Change #12 working | ✓ Continue |
| Delivery marked → Audit log entry created | Change #6 working | ✓ Continue |
| All 15 changes deployed & tested | Full system ready | ✓ DONE |

---

**END OF VISUAL REFERENCE**

*Pin this to your desk. Reference during daily stand-ups.*

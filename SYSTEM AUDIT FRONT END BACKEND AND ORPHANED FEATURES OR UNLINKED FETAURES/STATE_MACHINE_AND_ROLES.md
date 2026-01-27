# 🔄 LIFECYCLE STATE MACHINE & ROLE TRANSITION MATRIX
## Clear Order Lifecycle with Permission Controls

**Date:** January 27, 2026  
**Purpose:** Define all valid state transitions and who can perform them

---

## PART 1: ORDER LIFECYCLE STATE MACHINE

### Master State Diagram

```
                          ┌─────────────────────────────────────┐
                          │   ORDER CREATED (Initial State)     │
                          │   DRAFT / PENDING_STOCK             │
                          └──────────────┬──────────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                    ↓                    ↓                    ↓
            ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
            │   DRAFT      │    │PENDING_STOCK │    │ CANCELLED    │
            │              │    │              │    │(By Customer) │
            │ Awaiting     │    │ Checking     │    │              │
            │ confirmation │    │ inventory    │    └──────────────┘
            └──────┬───────┘    └──────┬───────┘
                   │                   │
                   └───────────┬───────┘
                               │
                               ↓
                        ┌─────────────┐
                        │ SCHEDULED   │
                        │             │
                        │ Ready to    │
                        │ deliver     │
                        └──────┬──────┘
                               │
                         ┌─────┴─────┐
                         │           │
                         ↓           ↓
                  ┌────────────┐  ┌────────────┐
                  │  ACTIVE    │  │  CANCELLED │
                  │(Sub only)  │  │(By Admin)  │
                  │            │  │            │
                  │Generating  │  └────────────┘
                  │deliveries  │
                  └─────┬──────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ↓               ↓               ↓
   ┌─────────┐   ┌──────────────┐ ┌──────────┐
   │OUT_FOR_ │   │  PAUSED      │ │  STOPPED │
   │DELIVERY │   │(Via pause    │ │          │
   │         │   │ request)     │ │ (Complete│
   │Assigned │   │              │ │  or user)│
   │to boy   │   └────────┬─────┘ └────────┬─┘
   │         │            │                │
   └────┬────┘      ┌─────┴──────┐         │
        │           ↓            │         │
        │      ┌─────────┐       │         │
        │      │SCHEDULED│       │         │
        │      │(Resume) │       │         │
        │      └────┬────┘       │         │
        │           │            │         │
        │      ┌────┴──────┐     │         │
        │      ↓           ↓     │         │
        └─→┌──────────────┐├─────┘         │
           │  DELIVERED   ││                │
           │   (Or        ││                │
           │ PARTIALLY)   ││                │
           │              ││                │
           │ Confirmed    ││                │
           └──────┬───────┘└─────────────┐  │
                  │                     │  │
                  ↓                     ↓  ↓
           ┌────────────────────────────────┐
           │         BILLED                 │
           │                                │
           │ Included in monthly invoice    │
           └────────────┬───────────────────┘
                        │
                        ↓
                ┌─────────────────┐
                │   COMPLETED     │
                │                 │
                │ Billing done,   │
                │ paid or pending │
                │ payment         │
                └─────────────────┘
```

---

## PART 2: DETAILED STATE DESCRIPTIONS & TRANSITIONS

### STATE 1: DRAFT
**What it means:**
- Order just created, not finalized
- Can be edited freely
- No operations started

**Valid Transitions:**
- → PENDING_STOCK (Check inventory)
- → CANCELLED (Customer or admin can cancel)

**Role Permissions:**
- ✅ CUSTOMER: Create own, Cancel
- ✅ ADMIN: Create, Edit, Cancel any
- ✅ MARKETING_STAFF: Create, Cancel
- ❌ DELIVERY_BOY: Cannot access
- ❌ SUPPLIER: Cannot access

**Data Operations Allowed:**
```
✅ Edit all fields (name, address, products, qty)
✅ Change customer address
✅ Change delivery date
✅ Change subscription pattern
✅ Cancel order
❌ Cannot mark delivered
❌ Cannot add to billing
```

---

### STATE 2: PENDING_STOCK
**What it means:**
- Inventory check in progress
- Waiting for supplier confirmation
- Can't proceed until stock confirmed

**Valid Transitions:**
- → SCHEDULED (Stock confirmed, ready to deliver)
- → CANCELLED (Stock unavailable)
- → ON_HOLD (Temporary issue, waiting)

**Role Permissions:**
- ✅ ADMIN: Move to next state
- ✅ SUPPLIER: Confirm stock availability
- ⚠️ CUSTOMER: Can cancel if waiting too long
- ❌ DELIVERY_BOY: Cannot access
- ❌ MARKETING_STAFF: Cannot move forward

**Data Operations Allowed:**
```
✅ Note stock status
✅ Cancel if stock unavailable
✅ Add to "waiting" queue
❌ No edits to order
❌ Cannot mark delivered
```

---

### STATE 3: SCHEDULED
**What it means:**
- Stock confirmed, ready for delivery
- Assigned to route/delivery boy
- Can be picked up for delivery

**Valid Transitions:**
- → OUT_FOR_DELIVERY (Assigned to delivery boy)
- → ACTIVE (If subscription, starts recurring)
- → CANCELLED (Last chance to cancel before delivery)

**Role Permissions:**
- ✅ ADMIN: Assign to delivery boy
- ✅ DELIVERY_BOY: View own assignments
- ⚠️ CUSTOMER: Can cancel until delivery starts
- ❌ SUPPLIER: Cannot access

**Data Operations Allowed:**
```
✅ Assign delivery boy
✅ Set delivery date/time
✅ Cancel (last chance)
❌ Change order contents
❌ Cannot mark delivered from here
```

---

### STATE 4: OUT_FOR_DELIVERY
**What it means:**
- Delivery boy has picked up, on the way
- Customer should expect delivery
- Real-time tracking starts

**Valid Transitions:**
- → DELIVERED (Full delivery confirmed)
- → PARTIALLY_DELIVERED (Some items not delivered)
- → NOT_DELIVERED (Delivery failed)

**Role Permissions:**
- ✅ DELIVERY_BOY: Update status, confirm delivery
- ✅ CUSTOMER: Can track location (if GPS enabled)
- ✅ ADMIN: Can reassign if needed
- ⚠️ SHARED_LINK: Can confirm delivery (no auth)

**Data Operations Allowed:**
```
✅ Mark delivered (full or partial)
✅ Collect payment
✅ Add delivery notes
✅ Update status
✅ Add product requests (pending approval)
✅ Pause subscription (via request)
❌ Cannot cancel (must return stock)
```

---

### STATE 5: ACTIVE (Subscriptions Only)
**What it means:**
- Subscription is live, generating daily/weekly deliveries
- Each delivery shows as OUT_FOR_DELIVERY
- Stays ACTIVE until paused, stopped, or end_date

**Valid Transitions:**
- → PAUSED (Customer/admin pause)
- → STOPPED (Subscription ended)
- → CANCELLED (Cancelled)

**Role Permissions:**
- ✅ CUSTOMER: Pause/Resume own
- ✅ ADMIN: Pause/Resume/Stop any
- ✅ DELIVERY_BOY: Can pause during delivery (as request)
- ❌ SUPPLIER: Cannot access

**Data Operations Allowed:**
```
✅ Generate daily/weekly delivery lists
✅ Apply day overrides
✅ Pause (date range)
✅ Resume
✅ Stop subscription
✅ Add pause notes
❌ Cannot edit basic fields while active
```

---

### STATE 6: PAUSED
**What it means:**
- Subscription temporarily paused
- No deliveries generated during pause period
- Will auto-resume on end_date (if set)

**Valid Transitions:**
- → ACTIVE (Resume/Auto-resume)
- → STOPPED (Cancel instead of resume)

**Role Permissions:**
- ✅ CUSTOMER: Pause/Resume own
- ✅ ADMIN: Pause/Resume any
- ⚠️ DELIVERY_BOY: Can pause during delivery (as request)

**Data Operations Allowed:**
```
✅ Update pause reason
✅ View pause end date
✅ Resume early
✅ Extend pause
❌ Cannot mark delivered during pause
```

---

### STATE 7: DELIVERED / PARTIALLY_DELIVERED
**What it means:**
- Delivery confirmed
- DELIVERED: All items delivered
- PARTIALLY_DELIVERED: Some items not delivered

**Valid Transitions:**
- → BILLED (Included in next monthly bill)

**Role Permissions:**
- ✅ DELIVERY_BOY: Confirm (authenticated)
- ✅ SHARED_LINK: Confirm (public, no auth)
- ✅ ADMIN: Confirm (manual override)
- ⚠️ CUSTOMER: Cannot change status

**Data Operations Allowed:**
```
✅ Locked (no edits)
✅ View delivery details
✅ Photo/signature attached
✅ Payment recorded
✅ Delivery notes
❌ Cannot undo delivery
❌ Cannot edit items
```

---

### STATE 8: NOT_DELIVERED
**What it means:**
- Delivery failed (customer not home, cancelled, etc)
- Will be rescheduled
- NOT counted in billing

**Valid Transitions:**
- → SCHEDULED (Reschedule)
- → CANCELLED (Give up)

**Role Permissions:**
- ✅ DELIVERY_BOY: Report failure
- ✅ ADMIN: Reschedule
- ✅ CUSTOMER: Request reschedule

**Data Operations Allowed:**
```
✅ Update reason for non-delivery
✅ Reschedule to new date
✅ Cancel entirely
❌ Cannot bill
❌ Cannot mark as delivered
```

---

### STATE 9: BILLED
**What it means:**
- Delivered items added to monthly bill
- Customer now owes money
- Amount locked in

**Valid Transitions:**
- → COMPLETED (Payment received or settled)

**Role Permissions:**
- ✅ ADMIN: Generate bills (system)
- ✅ CUSTOMER: View bill
- ⚠️ SUPPORT: Send reminders

**Data Operations Allowed:**
```
✅ View invoice
✅ Make payment
✅ View payment links (QR, UPI)
❌ Cannot dispute (must contact support)
❌ Cannot undo billing
```

---

### STATE 10: COMPLETED
**What it means:**
- Order fully processed
- Subscription ended or one-time delivered + paid
- Final state

**Valid Transitions:**
- None (final state)

**Role Permissions:**
- ✅ CUSTOMER: View history
- ✅ ADMIN: View, generate reports

**Data Operations Allowed:**
```
✅ View read-only
✅ Download receipt
✅ Request invoice copy
❌ No edits
❌ No changes
```

---

### STATE 11: CANCELLED
**What it means:**
- Order cancelled, no longer active
- No deliveries, no billing

**Valid Transitions:**
- None (final state)

**Role Permissions:**
- ✅ CUSTOMER: Cancel own before OUT_FOR_DELIVERY
- ✅ ADMIN: Cancel any anytime
- ⚠️ DELIVERY_BOY: Cannot cancel (can refuse delivery)

**Data Operations Allowed:**
```
✅ View reason
✅ View history
❌ No reactivation
❌ No refunds automatically
```

---

### STATE 12: ON_HOLD
**What it means:**
- Temporary issue (payment issue, stock pending)
- Not cancelled, waiting for resolution
- Resumes when issue resolved

**Valid Transitions:**
- → SCHEDULED (Resume)
- → CANCELLED (Give up)

**Role Permissions:**
- ✅ ADMIN: Put on hold, resume
- ⚠️ CUSTOMER: Request hold

**Data Operations Allowed:**
```
✅ View hold reason
✅ View estimated resume date
❌ Cannot confirm delivery while on hold
```

---

## PART 3: ROLE-BASED PERMISSION MATRIX

### Complete Role × Action Matrix

```
ACTION                              | ADMIN | MARKETING | DELIVERY_BOY | CUSTOMER | SUPPLIER | SUPPORT
────────────────────────────────────┼───────┼───────────┼──────────────┼──────────┼──────────┼─────────
Create Order                        |  ✅   |    ✅     |      ❌      |    ✅    |    ❌    |   ✅
Edit Order (Draft)                  |  ✅   |    ❌     |      ❌      |    ✅    |    ❌    |   ❌
Cancel Order (any state)            |  ✅   |    ✅     |      ❌      |    ⚠️    |    ❌    |   ✅
────────────────────────────────────┼───────┼───────────┼──────────────┼──────────┼──────────┼─────────
Create Subscription                 |  ✅   |    ✅     |      ❌      |    ✅    |    ❌    |   ✅
Pause Subscription                  |  ✅   |    ❌     |      ⚠️      |    ✅    |    ❌    |   ❌
Resume Subscription                 |  ✅   |    ❌     |      ❌      |    ✅    |    ❌    |   ❌
Stop Subscription                   |  ✅   |    ❌     |      ❌      |    ✅    |    ❌    |   ❌
────────────────────────────────────┼───────┼───────────┼──────────────┼──────────┼──────────┼─────────
View Daily Deliveries               |  ✅   |    ✅     |      ✅      |    ❌    |    ❌    |   ❌
Mark Delivered (Auth)               |  ✅   |    ❌     |      ✅      |    ❌    |    ❌    |   ❌
Mark Delivered (Shared Link)        |  ✅   |    ❌     |      ❌      |    ❌    |    ❌    |   ❌
Mark Delivered (Manual)             |  ✅   |    ❌     |      ❌      |    ❌    |    ❌    |   ❌
────────────────────────────────────┼───────┼───────────┼──────────────┼──────────┼──────────┼─────────
Request Product Add                 |  ✅   |    ❌     |      ✅      |    ❌    |    ❌    |   ❌
Approve Product Request             |  ✅   |    ❌     |      ❌      |    ❌    |    ❌    |   ❌
Reject Product Request              |  ✅   |    ❌     |      ❌      |    ❌    |    ❌    |   ❌
────────────────────────────────────┼───────┼───────────┼──────────────┼──────────┼──────────┼─────────
View Billing                        |  ✅   |    ❌     |      ❌      |    ✅    |    ❌    |   ⚠️
Generate Bill                       |  ✅   |    ❌     |      ❌      |    ❌    |    ❌    |   ❌
Send Bill Reminder                  |  ✅   |    ❌     |      ❌      |    ❌    |    ❌    |   ⚠️
Record Payment                      |  ✅   |    ❌     |      ❌      |    ✅    |    ❌    |   ✅
────────────────────────────────────┼───────┼───────────┼──────────────┼──────────┼──────────┼─────────
Assign Delivery Boy                 |  ✅   |    ❌     |      ❌      |    ❌    |    ❌    |   ❌
View Delivery Boy Performance       |  ✅   |    ✅     |      ❌      |    ❌    |    ❌    |   ❌
────────────────────────────────────┼───────┼───────────┼──────────────┼──────────┼──────────┼─────────
Manage Products                     |  ✅   |    ❌     |      ❌      |    ❌    |    ⚠️    |   ❌
Manage Inventory                    |  ✅   |    ❌     |      ❌      |    ❌    |    ✅    |   ❌
────────────────────────────────────┼───────┼───────────┼──────────────┼──────────┼──────────┼─────────
View Reports                        |  ✅   |    ⚠️     |      ❌      |    ❌    |    ❌    |   ❌
View Audit Logs                     |  ✅   |    ❌     |      ❌      |    ❌    |    ❌    |   ❌

Legend:
✅ = Full permission
⚠️ = Limited permission (own data only, or requires approval)
❌ = No permission
```

---

## PART 4: STATE TRANSITION VALIDATION RULES

### Rules for Every Transition

```
RULE SET 1: Time-Based Validations
├─ Can only transition to OUT_FOR_DELIVERY if delivery_date is today or tomorrow
├─ Can only DELIVERED if is_delivered_at is > created_at
├─ Cannot move to BILLED if delivery_date is in future
└─ COMPLETED requires delivery_date < today AND payment_status = "PAID" or "PARTIAL"

RULE SET 2: Data-Based Validations
├─ Cannot move to ACTIVE without auto_start = true
├─ Cannot move to OUT_FOR_DELIVERY without delivery_boy_id assigned
├─ Cannot move to DELIVERED without items_delivered list populated
├─ PARTIALLY_DELIVERED requires delivered_qty ≤ ordered_qty
└─ Cannot move to BILLED without all mandatory fields populated

RULE SET 3: Permission-Based Validations
├─ CUSTOMER can only transition own orders
├─ DELIVERY_BOY can only OUT_FOR_DELIVERY → DELIVERED (own route)
├─ ADMIN can transition any order any time
└─ SUPPORT can transition assigned orders only

RULE SET 4: Business Logic Validations
├─ Cannot cancel if already DELIVERED
├─ Cannot PAUSE if already STOPPED
├─ Cannot move backward in state (e.g., DELIVERED → SCHEDULED not allowed)
└─ Can only have ONE active order per customer per delivery_date
```

---

## PART 5: STATE TRANSITION TABLE (Complete)

```
FROM STATE           → TO STATE              WHO CAN    CONDITIONS
────────────────────────────────────────────────────────────────────────────
DRAFT                → PENDING_STOCK         ADMIN      ✅ All fields filled
DRAFT                → CANCELLED             ADMIN,     ✅ Any time
                                            CUSTOMER
DRAFT                → SCHEDULED             ADMIN      ✅ Inventory confirmed
────────────────────────────────────────────────────────────────────────────
PENDING_STOCK        → SCHEDULED             ADMIN,     ✅ Stock confirmed by
                                            SUPPLIER      supplier
PENDING_STOCK        → ON_HOLD               ADMIN      ✅ Reason provided
PENDING_STOCK        → CANCELLED             ADMIN,     ✅ Stock unavailable
                                            CUSTOMER
────────────────────────────────────────────────────────────────────────────
SCHEDULED            → OUT_FOR_DELIVERY      ADMIN,     ✅ Delivery boy assigned
                                            DELIVERY_BOY  ✅ Delivery date = today
SCHEDULED            → ACTIVE               ADMIN      ✅ If subscription
                                                       ✅ auto_start = true
SCHEDULED            → CANCELLED             ADMIN,     ✅ Before delivery starts
                                            CUSTOMER
────────────────────────────────────────────────────────────────────────────
OUT_FOR_DELIVERY     → DELIVERED             DELIVERY_BOY,✅ Delivery confirmed
                                            ADMIN,     ✅ All items delivered
                                            SHARED_LINK
OUT_FOR_DELIVERY     → PARTIALLY_DELIVERED   DELIVERY_BOY,✅ Some items missing
                                            ADMIN,     ✅ qty_delivered ≤ 
                                            SHARED_LINK   qty_ordered
OUT_FOR_DELIVERY     → NOT_DELIVERED         DELIVERY_BOY,✅ Delivery failed
                                            ADMIN      ✅ Reason provided
────────────────────────────────────────────────────────────────────────────
ACTIVE (Sub)         → PAUSED                CUSTOMER,  ✅ Pause date range
                                            ADMIN      ✅ Will auto-resume
ACTIVE (Sub)         → STOPPED               CUSTOMER,  ✅ No auto-resume
                                            ADMIN      ✅ Reason provided
────────────────────────────────────────────────────────────────────────────
PAUSED               → ACTIVE                CUSTOMER,  ✅ Auto-resume or
                                            ADMIN         manual resume
PAUSED               → STOPPED               CUSTOMER,  ✅ Cancel pause,
                                            ADMIN         stop subscription
────────────────────────────────────────────────────────────────────────────
DELIVERED            → BILLED                ADMIN      ✅ In monthly billing
                    / PARTIALLY_DELIVERED              cycle
DELIVERED            → COMPLETED             ADMIN      ✅ If one-time order
                                                       ✅ Payment received
────────────────────────────────────────────────────────────────────────────
NOT_DELIVERED        → SCHEDULED             ADMIN,     ✅ Reschedule date
                                            DELIVERY_BOY  ✅ Stock available
NOT_DELIVERED        → CANCELLED             ADMIN,     ✅ Give up on delivery
                                            CUSTOMER
────────────────────────────────────────────────────────────────────────────
BILLED               → COMPLETED             ADMIN      ✅ Payment settled
────────────────────────────────────────────────────────────────────────────
ON_HOLD              → SCHEDULED             ADMIN      ✅ Issue resolved
ON_HOLD              → CANCELLED             ADMIN,     ✅ Give up on order
                                            CUSTOMER
────────────────────────────────────────────────────────────────────────────
CANCELLED            (Final state - no transitions)
COMPLETED            (Final state - no transitions)
STOPPED              (Final state - no transitions)
```

---

## PART 6: DELIVERY STATUS SPECIFIC STATE MACHINE

### Separate Lifecycle for Deliveries (Different from Orders)

```
                        ┌──────────────┐
                        │   PENDING    │
                        │              │
                        │ Scheduled    │
                        │ delivery     │
                        └──────┬───────┘
                               │
                          ┌────┴─────┐
                          │           │
                          ↓           ↓
                    ┌─────────┐  ┌──────────────┐
                    │OUT_FOR_ │  │  CANCELLED   │
                    │DELIVERY │  │(By customer  │
                    │         │  │ or admin)    │
                    │In transit│  │              │
                    └────┬────┘  └──────────────┘
                         │
            ┌────────────┼─────────────┐
            │            │             │
            ↓            ↓             ↓
       ┌─────────┐  ┌──────────┐  ┌──────────────┐
       │DELIVERED│  │PARTIALLY │  │NOT_DELIVERED │
       │         │  │DELIVERED │  │              │
       │ Full    │  │          │  │ Failed       │
       │ delivery│  │Some items│  │              │
       │confirmed│  │missing   │  └──────┬───────┘
       └────┬────┘  └────┬─────┘         │
            │            │               │
            └─────┬──────┘         ┌─────┴────┐
                  │                │          │
                  ↓                ↓          ↓
              ┌─────────────┐  ┌───────────────┐
              │  BILLED     │  │   RESCHEDULED │
              │             │  │ (Reschedule   │
              │ Included in │  │  to new date) │
              │ invoice     │  │                │
              └─────────────┘  └────────┬──────┘
                                        │
                                        ↓
                               ┌──────────────┐
                               │   PENDING    │
                               │(Try again)   │
                               └──────────────┘
```

---

## PART 7: EMERGENCY STATE TRANSITIONS

### When Normal Rules Don't Apply

#### Scenario 1: Customer Wants Refund
```
Current State: DELIVERED or BILLED
Can transition: DELIVERED → CANCELLED (with approval)
Requires:
  - Admin approval
  - Refund reason
  - Payment adjustment
  - Audit log entry
```

#### Scenario 2: Delivery Boy Accident (Order Lost)
```
Current State: OUT_FOR_DELIVERY
Can transition: OUT_FOR_DELIVERY → NOT_DELIVERED
Then: NOT_DELIVERED → RESCHEDULE or CANCELLED
Requires:
  - Delivery boy incident report
  - Admin investigation
  - Customer notification
  - Replacement delivery setup
```

#### Scenario 3: Payment Dispute
```
Current State: COMPLETED
Can transition: COMPLETED → ON_HOLD (for investigation)
Then: ON_HOLD → COMPLETED (after verification)
Requires:
  - Customer complaint
  - Admin review
  - Evidence collection
  - Resolution & adjustment
```

---

## PART 8: MONITORING & ALERTS

### State Transition Monitoring Rules

**Alert if stuck in state for:**
```
DRAFT:           24 hours (not finalized)
PENDING_STOCK:   48 hours (stock checking)
SCHEDULED:       12 hours (assigned but not out)
OUT_FOR_DELIVERY: 4 hours (should be delivered by end of shift)
PAUSED:          90 days (long paused, might churn)
```

**Red Flags for Manual Intervention:**
```
⚠️ Same customer: >3 NOT_DELIVERED in month
⚠️ Same delivery_boy: >50% NOT_DELIVERED
⚠️ Same product: >20% PARTIALLY_DELIVERED
⚠️ Customer: Status bouncing (ACTIVE→PAUSED→ACTIVE frequently)
⚠️ Billing: Order DELIVERED but never BILLED
```

---

## FINAL IMPLEMENTATION CHECKLIST

Before deployment, ensure:

- [ ] All state transitions have role checks
- [ ] All transitions validate data before proceeding
- [ ] All transitions logged with who/when/why
- [ ] No backward transitions allowed (except emergencies)
- [ ] Status timeline persisted for audit
- [ ] Audit table captures all changes
- [ ] Alerts configured for stuck states
- [ ] Emergency transition procedure documented
- [ ] Role permissions enforced in code
- [ ] State machine rules testable and tested
- [ ] Customer notifications sent on key transitions
- [ ] Delivery boy notifications sent for new assignments
- [ ] Admin dashboard shows state distribution

---

**END OF STATE MACHINE & ROLE MATRIX**

*This defines the complete operational flow. Combined with the data model and audit report, it provides a complete picture of the corrected system.*

# 📋 QUICK REFERENCE - AI AGENT EXECUTION PROMPTS

**File:** `AI_AGENT_EXECUTION_PROMPTS.md` (Main file with all 41 prompts)

---

## What This Is

A **single comprehensive document** containing 41 actionable AI Agent prompts to:
1. Audit frontend + backend systems
2. Identify orphaned/unlinked features
3. Provide step-by-step fixes for each issue
4. Create tests and monitoring
5. Deploy safely to production

---

## The 7 Phases

| Phase | Steps | Purpose | Effort | Risk |
|-------|-------|---------|--------|------|
| **1. Frontend Cleanup** | 1-6 | Remove orphaned files, consolidate duplicates | 4h | Low |
| **2. Backend Audit** | 7-13 | Map collections, trace data flows | 8h | None |
| **3. Route Analysis** | 14-18 | Inventory all endpoints, find overlaps | 6h | None |
| **4. Linkage Fixes** | 19-29 | Fix broken connections between systems | 25h | Medium |
| **5. Data Integrity** | 30-34 | Add validation, consistency checks | 15h | Low |
| **6. Testing** | 35-38 | Integration tests, monitoring setup | 10h | Low |
| **7. Deployment** | 39-41 | Pre-deploy checklist, rollback procedures | 4h | Low |
| | **TOTAL** | | **73 hours** | |

---

## Critical Fixes

| Fix | Step | Impact | Time | Revenue |
|-----|------|--------|------|---------|
| One-Time Orders in Billing | **23** | ⭐⭐⭐⭐⭐ CRITICAL | 3h | **₹50K+/month** |
| User ↔ Customer Linking | 21 | ⭐⭐⭐⭐ HIGH | 3h | Auth works |
| Order ↔ Delivery Linking | 20,22 | ⭐⭐⭐⭐ HIGH | 4h | Billing works |
| Role Validation | 24 | ⭐⭐⭐ MEDIUM | 2h | Security |
| Data Validation | 26,27,33 | ⭐⭐⭐ MEDIUM | 6h | Reliability |

---

## How to Use This Document

### For Quick Execution (AI Agent)
```
Read: AI_AGENT_EXECUTION_PROMPTS.md
Select: Phase 1 (Steps 1-6) - Frontend Cleanup
For each step:
  1. Read the prompt
  2. Execute the actions
  3. Create the specified output file
  4. Move to next step
```

### For Planning (Project Manager)
```
Review: "PHASES" and "CRITICAL FIXES" sections above
Total Time: 73 hours (2-3 weeks)
Critical Path: Step 23 (billing fix) = ₹50K+/month recovery
Risk Level: Low-Medium (no breaking changes)
Rollback: Possible at each step (documented in prompts)
```

### For Verification (QA)
```
After each phase:
  Phase 1: Verify frontend build passes (npm run build)
  Phase 2: Verify database collections exist and valid
  Phase 3: Verify all endpoints still respond (smoke tests)
  Phase 4: Verify data linkages work (integration tests)
  Phase 5: Verify consistency checks pass
  Phase 6: Verify test suite passing
  Phase 7: Verify production deployment smooth
```

---

## What Gets Fixed

### ✅ Frontend Issues (Phase 1)
- Orphaned /src/ folder → archived
- Duplicate pages (v2, v3, OLD) → consolidated
- Mixed .js/.jsx files → cleaned up
- Inconsistent imports → validated

### ✅ Backend Issues (Phases 2-5)
- Two customer systems (users vs customers_v2) → **LINKED** (Step 21)
- Orders not in billing → **INCLUDED** (Step 23) = ₹50K+/month recovery
- Deliveries unlinked to orders → **LINKED** (Step 20,22)
- 15 overlapping route files → **PLANNED for consolidation** (Step 28)
- Missing validations → **ADDED** (Steps 24-27, 32-33)
- No audit trail → **ADDED** (Step 25)
- Inconsistent UUIDs → **STANDARDIZED** (Step 29)

### ✅ Testing & Safety (Phases 6-7)
- No integration tests → **CREATED** (Step 35)
- No monitoring → **SET UP** (Step 37)
- Unclear rollback → **DOCUMENTED** (Step 38)
- Risky deployment → **PLANNED** (Step 40)

---

## Expected Outcomes

**After All Steps:**
- ✅ One-time orders appearing in monthly bills (₹50K+/month)
- ✅ Customers can login (user ↔ customer linked)
- ✅ Deliveries properly confirm orders
- ✅ All data linkages working
- ✅ Data validation prevents errors
- ✅ Audit trail for all operations
- ✅ 0 orphaned records
- ✅ Test coverage for critical paths
- ✅ Monitoring and alerts active
- ✅ Safe rollback procedures documented

---

## How to Give Prompts to AI Agent

### Recommended Format:

```
Please execute STEP [NUMBER] from AI_AGENT_EXECUTION_PROMPTS.md

Step: [NUMBER] - [TITLE]

[Copy the exact prompt from the document]

After completion, create file: [FILENAME]

Then move to STEP [NEXT NUMBER]
```

### Example:
```
Please execute STEP 23 from AI_AGENT_EXECUTION_PROMPTS.md

Step: 23 - Fix One-Time Order Inclusion in Billing

[Copy entire Step 23 prompt...]

After completion, create file: LINKAGE_FIX_005_CRITICAL.md

Then move to STEP 24.
```

---

## Files Created by Prompts

After all 41 steps, you'll have:

**Audit Reports:**
- FRONTEND_FILE_AUDIT.md
- DATABASE_COLLECTION_MAP.md
- COMPLETE_API_INVENTORY.md
- ORDER_CREATION_PATHS.md
- DELIVERY_CONFIRMATION_PATHS.md
- BILLING_GENERATION_TRACE.md

**Fix Documentation:**
- LINKAGE_FIX_001.md → 005.md (5 fixes)
- ROLE_VALIDATION_FIXES.md
- AUDIT_TRAIL_FIX.md
- DATA_CONSISTENCY_CHECKS.md

**Implementation Guides:**
- ROUTE_CONSOLIDATION_PLAN.md
- UUID_STANDARDIZATION.md
- DATA_MIGRATION_FRAMEWORK.md
- INTEGRATION_TEST_SUITE.md

**Deployment Guides:**
- PRE_DEPLOYMENT_CHECKLIST.md
- PRODUCTION_DEPLOYMENT_PLAN.md
- ROLLBACK_PROCEDURES.md
- POST_DEPLOYMENT_VALIDATION.md

---

## Timeline

**Week 1:**
- Days 1-2: Phase 1 (Frontend) = 4h
- Days 3-5: Phase 2 (Backend Audit) = 8h

**Week 2:**
- Days 6-8: Phase 3 (Route Analysis) = 6h
- Days 9-12: Phase 4 (Linkage Fixes) = 25h

**Week 3:**
- Days 13-15: Phase 5 (Data Integrity) = 15h
- Days 16-18: Phase 6 (Testing) = 10h

**Week 4:**
- Days 19-20: Phase 7 (Deployment) = 4h
- Days 21+: Post-deployment monitoring

---

## Critical Success Factors

1. **Execute in order** - Each step builds on previous ones
2. **Create all audit files** - You need these to understand the system
3. **Test before deploying** - Phases 5-6 are not optional
4. **Have rollback ready** - Document before deploying anything
5. **Monitor production** - Step 37 (monitoring) saves you when issues occur
6. **Database backup** - MANDATORY before any production change

---

## Emergency Contacts

If things go wrong:
1. **Database locked?** → Check STEP 30 (indexes might be long-running)
2. **Deployments failed?** → Rollback immediately using procedures from STEP 38
3. **Revenue dropped?** → Check Step 23 (billing) is working correctly
4. **Logins broken?** → Check Step 21 (user↔customer linking) worked
5. **Deliveries not confirming?** → Check Steps 20,22 (order linkage)

---

**Status:** Ready to execute with AI Agent  
**Next Action:** Read AI_AGENT_EXECUTION_PROMPTS.md and execute STEP 1

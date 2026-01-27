# 🤖 AI AGENT EXECUTION PROMPTS - SYSTEM REPAIR ROADMAP
**Project:** EarlyBird Delivery Services  
**Status:** Critical Issues Found - Step-by-Step Fix Sequence  
**Last Updated:** January 27, 2026  
**Total Steps:** 45 Actionable Prompts (Complete System Audit & Repair)

---

## SECTION 0: SYSTEM OVERVIEW (Current State)

### Critical Issues Summary
- ❌ Dual collection systems (orders vs subscriptions_v2)
- ❌ Two customer masters with no linking (users vs customers_v2)
- ❌ One-time orders never billed (₹50K+/month loss)
- ❌ Orphaned frontend files (root /src/ folder)
- ❌ Multiple page versions mixed in active code
- ❌ 15 backend routes with overlapping responsibilities
- ❌ Mock/test files in production directory
- ❌ Broken role permissions for shared link users
- ❌ No audit trail for delivery confirmations
- ❌ Invalid UUID generation patterns

---

# 📋 PHASE 1: FRONTEND AUDIT & CLEANUP (6 Steps)

## STEP 1: Audit Root /src/ Folder Structure
**Prompt for AI Agent:**
```
Read the following files and create a mapping of what exists:
- List all files in: /src/
- List all files in: /frontend/src/
- List all files in: /frontend/src/modules/

Create a report showing:
1. Which files in /src/ are used in /frontend/src/
2. Which files in /src/ are ORPHANED (never imported)
3. Which files are DUPLICATES between /src/ and /frontend/src/modules/
4. Create a file: FRONTEND_FILE_AUDIT.md with this mapping

Use grep/semantic search to check imports across entire frontend/ directory.
```

## STEP 2: Archive Orphaned Root /src/ Files
**Prompt for AI Agent:**
```
Based on FRONTEND_FILE_AUDIT.md report:
1. Create directory: /archive/root_src_orphaned/
2. Move all ORPHANED files from /src/ to /archive/root_src_orphaned/
3. For files that ARE used:
   - Copy them to /frontend/src/modules/ with proper structure
   - Update all import paths in /frontend/src to use new locations
4. Delete /src/ folder only if ZERO files remain after moves
5. Create file: FRONTEND_MIGRATION_LOG.md showing what was moved

Keep root /src/ folder structure only if ANY file is still actively used.
```

## STEP 3: Clean Up Duplicate Page Files
**Prompt for AI Agent:**
```
In /frontend/src/pages/:
1. Search for ALL files matching patterns:
   - *OLD*.js, *OLD*.jsx
   - *_v2.js, *_v2.jsx, *_v3.js
   - *_BACKUP*, *_ORIGINAL*, *_ENHANCED
   - *EXAMPLE*, *EXPERIMENTAL

2. For each found file, check:
   - Is it imported anywhere in the codebase?
   - Is it referenced in /frontend/src/App.js or routing config?
   - Has it been modified in last 30 days?

3. Create DUPLICATE_PAGES_AUDIT.md showing:
   - Files to ARCHIVE (old versions)
   - Files to KEEP (production versions)
   - Import count for each file

4. Archive all OLD/DEPRECATED/EXPERIMENTAL versions to:
   /archive/frontend_old_pages/

5. Keep only LATEST/PRODUCTION versions in /frontend/src/pages/
```

## STEP 4: Merge Duplicate JS/JSX Files
**Prompt for AI Agent:**
```
In /frontend/src/:
1. Search for ALL files that have BOTH .js and .jsx versions:
   Example: SupplierPortal.js AND SupplierPortal.jsx

2. For each duplicate pair:
   - Read both files completely
   - Determine which is more recent (date modified)
   - Check file sizes and content differences
   - See which one is imported in codebase

3. For each pair, perform:
   - KEEP: The more recent version
   - DELETE: The older version
   - If imports point to old version: UPDATE imports
   - Create log: MERGED_JS_JSX_FILES.md

4. After cleanup, verify:
   - Run: npm run build (check for import errors)
   - Verify no missing file errors
   - Confirm all components render correctly
```

## STEP 5: Verify Frontend Module Structure
**Prompt for AI Agent:**
```
After root /src/ cleanup:
1. Check /frontend/src/modules/ structure:
   - /modules/business/ (should have demand-forecast, pause-detection, staff-wallet)
   - /modules/core/ (should have shared utilities)
   - /modules/features/ (should have feature-specific code)
   - /modules/ui/ (should have common UI components)

2. Verify EVERY imported module path:
   - Search all .js/.jsx files for "import...from" statements
   - Check that paths match actual file locations
   - Generate report: IMPORT_PATH_VALIDATION.md

3. For any INVALID paths:
   - Either fix the path OR
   - Create the missing file with a warning comment

4. Ensure consistency:
   - All imports use consistent path patterns
   - No circular dependencies
   - All modules properly exported

5. Create final report: FRONTEND_STRUCTURE_VERIFIED.md
```

## STEP 6: Test Frontend Build
**Prompt for AI Agent:**
```
After all frontend cleanup:
1. Navigate to /frontend/
2. Run: npm install (ensure all deps installed)
3. Run: npm run build
4. Check output:
   - Are there any ERROR messages? (If yes, fix and re-run)
   - Are there any WARNING messages about missing files?
   - File size of build/static/ folder?

5. Create report: FRONTEND_BUILD_TEST_RESULT.md
   - Status: ✅ PASSED or ❌ FAILED
   - If failed, list all errors found
   - Recommendations for next steps

6. If PASSED:
   - Note: Frontend cleanup complete
   - Ready for backend audit
```

---

# 📋 PHASE 2: BACKEND DATABASE AUDIT (8 Steps)

## STEP 7: Map All Database Collections
**Prompt for AI Agent:**
```
Read backend files: database.py, models.py, models_phase0_updated.py, models_supplier.py

Create a comprehensive collection map:
1. List EVERY collection used in codebase with:
   - Collection name (exact string)
   - File where first referenced
   - Total files that access it
   - Document structure (fields, types)
   - Example document (sample data)

2. Categorize collections:
   - ACTIVE (used in multiple routes)
   - LEGACY (only used in old routes)
   - DUPLICATE (serves same purpose as another)
   - ORPHANED (referenced but never accessed)

3. Create file: DATABASE_COLLECTION_MAP.md

Expected collections:
- LEGACY: db.users, db.orders, db.subscriptions, db.addresses
- ACTIVE: db.customers_v2, db.subscriptions_v2, db.delivery_boys_v2
- SUPPORTING: db.delivery_statuses, db.products, db.billing_records, etc.

Flag any collections found that are NOT in this list.
```

## STEP 8: Trace Order Creation Paths
**Prompt for AI Agent:**
```
Trace ALL ways orders are created in the system:

1. Search for EVERY endpoint that creates/saves orders:
   - Look for db.orders.insert_one, db.orders.insert_many
   - Look for db.subscriptions_v2.insert_one, db.subscriptions_v2.insert_many
   - Look for any method named "create_order", "create_subscription"

2. For each creation endpoint found:
   a) File name and line number
   b) HTTP method and path
   c) Required parameters
   d) Collection it writes to
   e) Fields it sets
   f) User role that can call it
   g) Any validation performed

3. Create visual diagram: ORDER_CREATION_PATHS.md showing:
   ```
   PATH A: POST /api/orders/ (routes_orders.py)
   ├─ Collection: db.orders
   ├─ Writes: id, user_id, items[], status=PENDING
   ├─ Role: CUSTOMER only
   └─ Issue: Not linked to db.subscriptions_v2

   PATH B: POST /api/phase0-v2/subscriptions/ (routes_phase0_updated.py)
   ├─ Collection: db.subscriptions_v2
   ├─ Writes: id, customer_id, product_id, status=DRAFT
   ├─ Role: ADMIN, MARKETING_STAFF, CUSTOMER
   └─ Status: Active (Phase 0 V2)

   PATH C: POST /api/shared-delivery-link/{linkId}/request-product/ (routes_shared_links.py)
   ├─ Collection: db.subscriptions_v2 (maybe - verify)
   └─ Issue: Check if creates or modifies
   ```

4. Identify all issues:
   - Paths that create duplicate data
   - Paths that have no delivery confirmation
   - Paths that skip billing
   - Paths that bypass validation

5. Create file: ORDER_CREATION_PATH_ISSUES.md listing each issue with severity
```

## STEP 9: Trace Delivery Confirmation Paths
**Prompt for AI Agent:**
```
Trace ALL ways deliveries are marked as "delivered":

1. Search for EVERY endpoint that updates delivery status:
   - Look for "mark_delivered", "mark-delivered", "delivered"
   - Look for db.delivery_statuses updates
   - Look for db.orders status updates
   - Look for db.subscriptions_v2 status updates

2. For each delivery endpoint, document:
   a) File name and line number
   b) HTTP method and path
   c) Input parameters (what identifies the order?)
   d) What collection is updated?
   e) Which fields are updated?
   f) Required authentication (role)
   g) Any linked documents updated?

3. Create trace diagram: DELIVERY_CONFIRMATION_PATHS.md showing:
   ```
   PATH 1: Delivery Boy Path
   POST /api/delivery-boy/mark-delivered/
   ├─ Requires: authentication (JWT token)
   ├─ Updates: db.delivery_statuses
   ├─ Links: To what order/subscription? (VERIFY)
   └─ Risk: Is quantity recorded? Date recorded?

   PATH 2: Shared Link Path
   POST /api/shared-delivery-link/{linkId}/mark-delivered/
   ├─ Requires: ZERO authentication (public)
   ├─ Updates: db.delivery_statuses
   ├─ Links: To what? (VERIFY)
   └─ Risk: No audit trail - who delivered? when?

   PATH 3: Admin Path (if exists)
   ├─ Check: routes_admin.py for delivery updates
   └─ Document same as above
   ```

4. Identify critical issues:
   - Can same delivery be marked twice?
   - Is quantity checked?
   - Is date validation done?
   - Are phantom deliveries possible (no matching order)?

5. Create file: DELIVERY_CONFIRMATION_ISSUES.md
```

## STEP 10: Trace Billing Generation Path
**Prompt for AI Agent:**
```
Find THE billing system (should be only one):

1. Search for "billing" in ALL backend files:
   - routes_billing.py (MAIN - likely)
   - routes_admin.py (check for billing functions)
   - Any other file with "bill", "charge", "invoice"

2. In routes_billing.py, find the function that GENERATES bills:
   - Search for endpoints like GET /api/billing/ or /billing/generate
   - This function defines what gets billed

3. Trace the complete billing logic:
   a) What collections does it read from?
   b) What is the selection criteria? (e.g., status="active")
   c) What fields are included in bill?
   d) How is total calculated?
   e) What about ONE-TIME orders? (CRITICAL)

4. Create detailed trace: BILLING_GENERATION_TRACE.md showing:
   ```
   BILLING FUNCTION: generate_billing (routes_billing.py)
   ├─ Input: date, period
   ├─ Step 1: Query db.subscriptions_v2 where status="active"
   ├─ Step 2: For each subscription, get items
   ├─ Step 3: Calculate total (price × quantity × days)
   ├─ Step 4: Save to db.billing_records
   └─ CRITICAL ISSUE: db.orders NOT queried - ONE-TIME orders NEVER billed!

   WHAT'S MISSING:
   ├─ Query: db.orders where status="delivered" and billed=false
   ├─ Include one-time orders in billing
   └─ Link delivery confirmation to order
   ```

5. Create file: BILLING_ISSUES.md documenting:
   - Missing one-time orders
   - Estimated revenue impact (orders × avg_price per month)
   - How to fix (link delivery_statuses to orders)

6. CRITICAL: Search routes_billing.py lines 170-200 for exact code
   - Show BEFORE code that's broken
   - Document what it's missing
```

## STEP 11: Map Customer Data Models
**Prompt for AI Agent:**
```
Identify the TWO customer systems and their mismatch:

1. Read models.py and models_phase0_updated.py completely

2. Extract the TWO customer models:

   LEGACY Model (in models.py):
   ├─ Collection: db.users
   ├─ Fields: [list all fields]
   ├─ Example: { id, email, role, name, password_hash, ... }
   └─ Used in: routes_admin.py, routes_orders.py, routes_customer.py

   PHASE 0 Model (in models_phase0_updated.py):
   ├─ Collection: db.customers_v2
   ├─ Fields: [list all fields]
   ├─ Example: { id, name, phone, address, area, delivery_boy_id, ... }
   └─ Used in: routes_phase0_updated.py, routes_delivery_boy.py

3. Create comparison table: CUSTOMER_MODEL_MISMATCH.md showing:
   | Field | db.users | db.customers_v2 | Problem |
   |-------|----------|-----------------|---------|
   | id | ✅ | ✅ | Different generators? |
   | name | ✅ | ✅ | Data duplication risk |
   | email | ✅ | ❌ | MISSING in v2 - can't login! |
   | phone | ❌ | ✅ | MISSING in users |
   | address | ❌ | ✅ | MISSING in users |
   | ... | ... | ... | ... |

4. Document the critical gap:
   - A customer created in Phase 0 V2 has NO record in db.users
   - Therefore they CANNOT login (no email/password)
   - If they somehow login, billing won't find them

5. Create file: CUSTOMER_LINKING_ISSUES.md with:
   - Current data flow (broken)
   - Risk assessment
   - How many customers in EACH collection
   - How many have BOTH records
```

## STEP 12: Audit User Roles & Permissions
**Prompt for AI Agent:**
```
Map out what SHOULD happen vs what ACTUALLY happens for roles:

1. From PHASE1_AUDIT_REPORT.md, extract the DEFINED role matrix

2. For EACH role, verify implementation:
   a) Read routes_admin.py, routes_marketing.py, routes_delivery_boy.py, etc.
   b) Find @app.post, @app.get decorators
   c) Check for role/permission validation code
   d) Document what's actually protected vs open

3. Create verification table: ROLE_PERMISSION_VERIFICATION.md showing:
   | Role | Feature | Should Access? | Actually Protected? | Issue |
   |------|---------|----------------|-------------------|--------|
   | CUSTOMER | Create Order | ✅ Yes | ✅ Yes | OK |
   | DELIVERY_BOY | Edit Order | ❌ No | ❓ Unknown | CHECK |
   | SHARED_LINK_USER | Mark Delivered | ✅ Yes | ❌ NO AUTH! | CRITICAL |
   | ... | ... | ... | ... | ... |

4. CRITICAL CHECK - Shared Link User:
   - Search: "shared-delivery-link" endpoints in routes_shared_links.py
   - Are they protected with JWT? or PUBLIC?
   - If PUBLIC: is there ANY validation?
   - Document: WHO can mark delivery as complete? Anyone?

5. Create files:
   - ROLE_PERMISSION_ISSUES.md (gaps found)
   - ROLE_VALIDATION_CODE_LOCATIONS.md (where to fix)
```

## STEP 13: Identify Broken Linkages
**Prompt for AI Agent:**
```
Find ALL places where data should link but doesn't:

1. Relationship mapping - check these key linkages:

   LINKAGE A: Order → Delivery Confirmation
   Question: When delivery marked complete, is it linked to WHICH order?
   Check: routes_shared_links.py + routes_delivery_boy.py
   Verify: delivery_statuses.order_id exists? or delivery_statuses.subscription_id?

   LINKAGE B: Delivery Confirmation → Billing
   Question: When generating bill, does it check delivery_statuses?
   Check: routes_billing.py
   Verify: billing query includes delivery check? or just subscription status?

   LINKAGE C: User → Customer
   Question: When user logs in, can we find their customer record?
   Check: routes_customer.py
   Verify: db.users → db.customers_v2 linkage exists? how?

   LINKAGE D: One-Time Order → Subscription
   Question: Are one-time orders treated same as subscriptions?
   Check: db.orders vs db.subscriptions_v2
   Verify: Can bill include both? or just subscriptions?

2. For each linkage, answer:
   - Field name that links them (foreign key)
   - Is link created when parent created? or later?
   - Is link validated? (orphan check)
   - What happens if parent deleted?

3. Create file: BROKEN_LINKAGES.md showing:
   - Each broken linkage
   - Where it breaks (file + line)
   - Impact of break
   - How to fix it

4. Create file: LINKAGE_FIX_PRIORITY.md ranking by impact
```

---

# 📋 PHASE 3: BACKEND ROUTE ANALYSIS (6 Steps)

## STEP 14: Catalog All Routes
**Prompt for AI Agent:**
```
Create complete inventory of EVERY API endpoint:

1. Read ALL files: routes_*.py (15 total)

2. For EACH route file, extract:
   a) File name
   b) ALL endpoints (@app.post, @app.get, @app.put, @app.delete)
   c) For each endpoint:
      - HTTP method
      - Path
      - Required parameters
      - Response type
      - Database collection accessed
      - User role required (if any)
      - Error handling

3. Create file: COMPLETE_API_INVENTORY.md with:
   - Total count: X endpoints
   - Organized by route file
   - Cross-referenced by collection

   Format:
   ```
   FILE: routes_orders.py (10 endpoints)
   ├─ POST /api/orders/
   │  ├─ Params: user_id, items[], delivery_date
   │  ├─ Collection: db.orders
   │  ├─ Role: CUSTOMER
   │  └─ Error: None (should validate delivery_date)
   ├─ GET /api/orders/{orderId}
   │  └─ ...
   ```

4. Identify issues in each endpoint:
   - Missing validation
   - Missing role check
   - Missing error handling
   - Database query efficiency
```

## STEP 15: Find Overlapping Routes
**Prompt for AI Agent:**
```
Identify duplicate/overlapping route responsibilities:

1. From COMPLETE_API_INVENTORY.md, group endpoints by function:

   GROUP A: Product Management
   ├─ routes_products.py: manage products
   ├─ routes_products_admin.py: also manage products (duplicate?)
   ├─ routes_supplier.py: supplier inventory
   └─ Question: What's the difference?

   GROUP B: Delivery Management
   ├─ routes_delivery.py: delivery endpoints
   ├─ routes_delivery_operations.py: also delivery (duplicate?)
   ├─ routes_delivery_boy.py: delivery boy operations
   └─ Question: What's the difference?

   GROUP C: Order Management
   ├─ routes_orders.py: one-time orders
   ├─ routes_subscriptions.py: subscriptions
   ├─ routes_phase0_updated.py: Phase 0 subscriptions
   └─ Question: Which is active? How to consolidate?

2. For each GROUP, create analysis:
   - Which file is LEGACY (old)?
   - Which file is ACTIVE (current)?
   - Which endpoints DUPLICATE?
   - Which should be CONSOLIDATED?

3. Create file: ROUTE_OVERLAP_ANALYSIS.md showing:
   - Exact duplicate endpoints (same functionality)
   - Conflicting routes (same path, different handlers)
   - Unused routes (no frontend calling them)
   - Migration path (how to consolidate)
```

## STEP 16: Check Route Authentication
**Prompt for AI Agent:**
```
Verify role-based authentication on EVERY endpoint:

1. Read ALL routes_*.py files

2. Search for authentication patterns:
   - Look for "current_user", "Depends(get_current_user)"
   - Look for role checks like: "if role != 'admin'"
   - Look for @app decorators with security parameters

3. For EVERY endpoint, answer:
   - Is it protected? (requires authentication)
   - Is role checked? (what roles allowed?)
   - Is access scoped? (e.g., customer can only see own data)

4. Create file: ROUTE_AUTHENTICATION_AUDIT.md showing:
   ```
   routes_admin.py (7 endpoints)
   ├─ POST /api/admin/users/ ✅ Protected (admin only)
   ├─ GET /api/admin/dashboard/ ✅ Protected (admin only)
   ├─ POST /api/admin/delivery-ops/ ✅ Protected (admin + marketing)
   └─ SUMMARY: All endpoints properly protected

   routes_orders.py (5 endpoints)
   ├─ POST /api/orders/ ❌ NOT PROTECTED (anyone!)
   ├─ GET /api/orders/{id} ✅ Protected (check customer_id match)
   └─ SUMMARY: 1 critical gap - POST should require auth

   routes_shared_links.py (6 endpoints)
   ├─ POST /api/shared-delivery-link/{id}/mark-delivered/ ⚠️ PUBLIC
   │  ├─ Should this be public? (no authentication)
   │  ├─ Is there ANY validation?
   │  └─ Risk: Anyone can mark anything as delivered!
   └─ SUMMARY: Design choice but CRITICAL to document
   ```

5. Identify security issues:
   - Unprotected endpoints that should require auth
   - Missing role checks that should validate access
   - Scope issues (can see other's data)

6. Create file: ROUTE_SECURITY_ISSUES.md with severity levels
```

## STEP 17: Map Route Dependencies
**Prompt for AI Agent:**
```
Show how routes depend on each other:

1. Find ALL cases where one route CALLS another (internal HTTP calls):
   - Search for: requests.get(), requests.post(), async with session
   - Search for: await db.xxx calls in multiple routes

2. For each inter-route dependency:
   - Source endpoint (file + path)
   - Target endpoint (file + path)
   - Why dependency exists?
   - What breaks if target changes?

3. Create dependency diagram: ROUTE_DEPENDENCIES.md showing:
   ```
   routes_orders.py
   ├─ POST /api/orders/
   │  ├─ Calls: db.users lookup (auth.py)
   │  ├─ Calls: db.products lookup (validation)
   │  └─ Calls: db.addresses lookup (delivery)
   
   routes_delivery_boy.py
   ├─ GET /api/delivery-boy/deliveries/
   │  └─ Depends: routes_orders.py creates orders
   
   routes_billing.py
   ├─ GET /api/billing/generate/
   │  ├─ Depends: routes_orders.py (for db.orders)
   │  └─ Depends: routes_subscriptions.py (for db.subscriptions_v2)
   ```

4. Identify circular dependencies (if any)

5. Create file: ROUTE_EXECUTION_ORDER.md showing:
   - What routes MUST exist for others to work
   - Safe order to deploy changes
   - Rollback sequence if needed
```

## STEP 18: Audit All Seed & Mock Files
**Prompt for AI Agent:**
```
Review files that are NOT production code:

1. Find ALL test/mock/seed files:
   - backend/mock_*.py (should be in tests/)
   - backend/test_*.py (should be in tests/)
   - backend/seed_*.py (where to keep?)
   - Any @app.get(@"/debug") endpoints

2. For EACH file:
   a) Purpose: what is it for?
   b) Status: actively used or orphaned?
   c) Last modified: recent or old?
   d) Imports: what does it depend on?

3. Create file: MOCK_TEST_SEED_AUDIT.md showing:
   ```
   FILE: mock_auth.py
   ├─ Purpose: Mock authentication for testing
   ├─ Status: ❓ Imported? Search codebase
   ├─ Last Modified: [date]
   ├─ Location: Should be in tests/
   └─ Action: [MOVE to tests/ OR DELETE if unused]

   FILE: seed_data.py
   ├─ Purpose: Seed database with initial data
   ├─ Status: Used for: local dev / testing / production?
   ├─ Last Modified: [date]
   ├─ Current Location: backend/
   ├─ Recommended: Keep in backend/ (dev tool)
   └─ Action: Add warning comment "DEV ONLY"

   FILE: test_login_api.py
   ├─ Purpose: API test
   ├─ Status: ❓ Imported by CI/CD?
   ├─ Last Modified: [date]
   └─ Action: [MOVE to tests/ directory]
   ```

4. For files with ACTION=MOVE:
   - Move them to /tests/ directory
   - Update all imports in backend/ if needed
   - Document in migration log

5. For files with ACTION=DELETE:
   - Create backup in /archive/
   - Delete from backend/
   - Note in migration log

6. Create file: SEED_MOCK_MIGRATION.md with migration summary
```

---

# 📋 PHASE 4: CRITICAL LINKAGE FIXES (12 Steps)

## STEP 19: Add subscription_id to db.orders
**Prompt for AI Agent:**
```
Fix: Orders not linked to subscriptions

ACTION: Add foreign key field to orders collection

1. Read routes_orders.py completely
   - Find where db.orders documents are created

2. Identify all places that create orders (3+ locations):
   - Customer creating own order (POST /api/orders/)
   - Admin creating order (in routes_admin.py?)
   - Support creating order (in routes_support.py?)
   - Marketing creating order (in routes_marketing.py?)

3. For EACH order creation:
   a) Add NEW FIELD: "subscription_id" (optional, can be null)
   b) Logic:
      - If order is part of subscription: set to subscription_id
      - If one-time order: leave null
   c) Set field when order created

4. Update models.py Order schema:
   OLD:
   {
     "id": "uuid",
     "user_id": "user-123",
     "items": [...],
     "status": "pending"
   }

   NEW:
   {
     "id": "uuid",
     "user_id": "user-123",
     "subscription_id": "sub-456" (NEW),
     "items": [...],
     "status": "pending"
   }

5. Create/Update database migration:
   - File: backend/migrations/001_add_subscription_id_to_orders.py
   - Script: db.orders.update_many({}, {$set: {subscription_id: null}})
   - Document: what this migration does

6. Verify: After change, can we query:
   db.orders.find({subscription_id: null})  # one-time orders
   db.orders.find({subscription_id: {$ne: null}})  # subscription-linked

7. Test: Ensure all existing orders still work (subscription_id=null)

8. Create file: LINKAGE_FIX_001.md documenting:
   - Change made
   - Files modified
   - Migration SQL/script
   - How to verify
   - Rollback procedure
```

## STEP 20: Add order_id to db.delivery_statuses
**Prompt for AI Agent:**
```
Fix: Delivery confirmations not linked to orders

ACTION: Add foreign key field to delivery_statuses collection

1. Read routes_delivery_boy.py and routes_shared_links.py
   - Find where db.delivery_statuses documents are created
   - Current: What identifies which order/subscription was delivered?

2. Trace the delivery flow:
   - Delivery boy marks delivery complete
   - Shared link user marks delivery complete
   - What information do they provide?
   - How does system know WHICH customer was delivered?

3. Add NEW FIELD: "order_id" to delivery_statuses
   - When delivery confirmed: link to the ORDER
   - Required field: order_id must exist
   - Add validation: db.orders.find_one({id: order_id}) (must exist)

4. Update models_phase0_updated.py DeliveryStatus schema:
   OLD:
   {
     "id": "uuid",
     "customer_id": "cust-123",
     "delivery_date": "2026-01-27",
     "status": "delivered"
   }

   NEW:
   {
     "id": "uuid",
     "order_id": "order-456" (NEW - REQUIRED),
     "customer_id": "cust-123",
     "delivery_date": "2026-01-27",
     "status": "delivered"
   }

5. Update delivery marking endpoints:
   - routes_delivery_boy.py: mark-delivered endpoint
   - routes_shared_links.py: mark-delivered endpoint
   - Both must REQUIRE order_id parameter
   - Both must VALIDATE order_id exists

6. Database migration:
   - File: backend/migrations/002_add_order_id_to_delivery_statuses.py
   - Challenge: existing records have no order_id
   - Solution: Make it nullable for now (backfill later)
   - Script: db.delivery_statuses.update_many({}, {$set: {order_id: null}})

7. Create file: LINKAGE_FIX_002.md with same documentation
```

## STEP 21: Create User ↔ Customer Linking Table
**Prompt for AI Agent:**
```
Fix: Two customer systems with no linking

ACTION: Create linking system between db.users and db.customers_v2

1. Understand the problem:
   - db.users: Contains auth info (email, password)
   - db.customers_v2: Contains delivery info (address, phone)
   - Currently: NO way to link them together

2. Solution Options:
   OPTION A: Add field to db.users
   ├─ db.users.customer_v2_id = "cust-001"
   ├─ Pro: Simple, 1 query to find customer
   └─ Con: Duplicates data

   OPTION B: Add field to db.customers_v2
   ├─ db.customers_v2.user_id = "user-001"
   ├─ Pro: Optional (legacy customers may have no user)
   └─ Con: Have to search if want user from customer

   OPTION C: Create linking table
   ├─ db.user_customer_links
   ├─ Pro: Flexible, one-to-many possible (user has multiple customers)
   └─ Con: Extra query needed

3. Recommended: OPTION B + OPTION A (dual link for safety)
   - db.users adds field: customer_v2_id
   - db.customers_v2 adds field: user_id
   - Both links point to each other
   - Validation: both must exist for valid link

4. Update models.py and models_phase0_updated.py:
   - User schema: add customer_v2_id field
   - Customer schema: add user_id field

5. Update auth.py:
   - After user login, fetch user_id from db.users
   - Lookup corresponding customer in db.customers_v2 using user_id
   - Store BOTH in session/JWT

6. Update routes_phase0_updated.py (customer creation):
   BEFORE:
   - Create only db.customers_v2 record
   - User cannot login (no db.users record)

   AFTER:
   - Create db.customers_v2 record
   - Also create db.users record with email
   - Link both records (user_id ↔ customer_v2_id)
   - User can now login!

7. Create file: LINKAGE_FIX_003.md documenting:
   - New fields added
   - Data consistency checks
   - Migration script (backfill links for existing data)
   - Validation rules

8. Critical: Add validation
   - When customer created, validate user exists
   - When user created, create/link to customer if needed
```

## STEP 22: Link Delivery Confirmation to Order
**Prompt for AI Agent:**
```
Fix: Delivery confirmations happen but don't update orders

ACTION: When delivery marked complete, update corresponding order

1. Current state:
   - routes_delivery_boy.py marks delivery complete (updates delivery_statuses)
   - routes_shared_links.py marks delivery complete (updates delivery_statuses)
   - But: db.orders.status is NEVER updated!

2. Fix: When delivery marked complete:
   a) Find the order_id from delivery_statuses (from STEP 20)
   b) Update db.orders where id=order_id:
      - Set status="DELIVERED"
      - Set delivered_at=now()
      - Set delivery_confirmed=true
   c) Also update db.subscriptions_v2 if subscription_id linked

3. Update routes_delivery_boy.py:
   BEFORE:
   ```
   POST /api/delivery-boy/mark-delivered/
   1. Create delivery_statuses record
   2. Done
   ```

   AFTER:
   ```
   POST /api/delivery-boy/mark-delivered/
   1. Create delivery_statuses record
   2. Find order_id from delivery_statuses
   3. Update db.orders[order_id].status = "DELIVERED"
   4. Update db.orders[order_id].delivered_at = now()
   5. Done
   ```

4. Same for routes_shared_links.py

5. Add validation:
   - Cannot mark delivered if order status is "CANCELLED"
   - Cannot mark delivered twice (idempotent)

6. Create file: LINKAGE_FIX_004.md
```

## STEP 23: Fix One-Time Order Inclusion in Billing
**Prompt for AI Agent:**
```
Fix: Billing ignores one-time orders (CRITICAL - ₹50K+/month loss!)

ACTION: Include one-time orders in billing generation

1. Current code (routes_billing.py line 181):
   ```
   subscriptions = await db.subscriptions_v2.find({
       "status": {"$in": ["active", "paused"]}
   }, {"_id": 0}).to_list(1000)
   
   # Generate bill from subscriptions only
   # One-time orders NEVER included!
   ```

2. Fix: Query BOTH collections
   ```
   # Get subscriptions
   subscriptions = await db.subscriptions_v2.find({
       "status": {"$in": ["active", "paused"]}
   }).to_list(1000)
   
   # GET ONE-TIME ORDERS (NEW)
   one_time_orders = await db.orders.find({
       "status": "DELIVERED",
       "billed": {"$ne": True}  # Not yet billed
   }).to_list(1000)
   
   # Generate bills from BOTH
   all_items = subscriptions + one_time_orders
   ```

3. Add validation:
   - Mark billed=true on orders after billing
   - Prevent duplicate billing (check billed field)

4. Track impact:
   - Count how many one-time orders exist
   - Calculate average value
   - Document monthly recovery (₹)

5. Create file: LINKAGE_FIX_005_CRITICAL.md
   - This is HIGHEST IMPACT fix
   - Revenue recovery justifies effort
```

## STEP 24: Fix Role Validation - Admin Only Operations
**Prompt for AI Agent:**
```
Fix: Missing role validation on sensitive operations

ACTION: Add role checks to unprotected endpoints

1. Find ALL endpoints that modify data:
   - All POST, PUT, DELETE operations
   - Check if they validate role

2. For ADMIN-only operations, add validation:
   - User management (create/edit/delete users)
   - Delivery operations (mark delivered)
   - Billing operations
   - Inventory management

3. Pattern to follow:
   ```
   @app.post("/api/admin/users/")
   async def create_user(
       request: CreateUserRequest,
       current_user: User = Depends(get_current_user)
   ):
       # NEW VALIDATION:
       if current_user.role != "admin":
           raise HTTPException(status_code=403, detail="Admin only")
       
       # Continue with operation
   ```

4. Audit these files:
   - routes_admin.py: already protected? (should be)
   - routes_orders.py: POST /api/orders/ protected? (should require customer role)
   - routes_delivery_boy.py: requires delivery_boy role? (should)
   - routes_shared_links.py: intentionally public? (document why)

5. Create file: ROLE_VALIDATION_FIXES.md
```

## STEP 25: Add Audit Trail for Deliveries
**Prompt for AI Agent:**
```
Fix: No audit trail for delivery confirmations (especially shared links)

ACTION: Log WHO marked delivery complete and WHEN

1. Problem: Shared link users are anonymous
   - Anyone with link can mark delivery complete
   - No record of WHO did it
   - Risk: Phantom deliveries

2. Solution: Add audit fields to delivery_statuses
   ```
   NEW FIELDS in db.delivery_statuses:
   {
     "confirmed_by_user_id": "user-123" (null if shared link),
     "confirmed_by_name": "John Doe" (null if shared link),
     "confirmed_at": "2026-01-27T14:30:00",
     "confirmation_method": "delivery_boy" | "shared_link" | "admin",
     "ip_address": "192.168.1.100" (from shared link),
     "device_info": "user-agent string" (from shared link)
   }
   ```

3. Update delivery marking endpoints:
   - routes_delivery_boy.py: set confirmed_by_user_id = current_user.id
   - routes_shared_links.py: set ip_address, device_info, confirmed_by_user_id=null

4. Create file: AUDIT_TRAIL_FIX.md
```

## STEP 26: Validate Delivery Quantities
**Prompt for AI Agent:**
```
Fix: No validation that delivered quantity matches order

ACTION: Add quantity validation to delivery confirmations

1. Problem: Delivery boy marks delivery complete but system doesn't verify:
   - Was full quantity delivered? Or partial?
   - Delivery boy says 10 units, order was 8 units - mismatch?
   - What if delivery boy delivers 20 units of item ordered 10 units?

2. Current delivery flow:
   - routes_delivery_boy.py: mark-delivered endpoint
   - Takes: customer_id, delivery_date
   - Missing: item quantities, partial delivery info

3. Fix: Add quantity tracking
   ```
   Update db.delivery_statuses schema:
   {
     "id": "uuid",
     "order_id": "order-456",
     "customer_id": "cust-123",
     "delivered_at": "2026-01-27T14:30:00",
     "items": [
       {
         "product_id": "prod-1",
         "ordered_qty": 10,
         "delivered_qty": 10,  (NEW)
         "status": "full"  (NEW: full, partial, shortage)
       },
       {
         "product_id": "prod-2",
         "ordered_qty": 5,
         "delivered_qty": 3,  (NEW)
         "status": "partial"  (NEW)
       }
     ]
   }
   ```

4. Add validation logic:
   - delivered_qty <= ordered_qty (cannot deliver more than ordered)
   - If delivered_qty < ordered_qty: mark as "partial"
   - If delivered_qty = 0: mark as "shortage"
   - Update order status: DELIVERED or PARTIALLY_DELIVERED

5. Update billing:
   - Only bill for delivered_qty, not ordered_qty
   - If partial delivery: bill only what was delivered

6. Create file: QUANTITY_VALIDATION_FIX.md
```

## STEP 27: Validate Delivery Dates
**Prompt for AI Agent:**
```
Fix: No validation that delivery date is valid

ACTION: Add date range validation to all delivery operations

1. Problem:
   - Can mark delivery on past dates (2020-01-01)?
   - Can mark delivery on future dates (2050-12-31)?
   - Can mark delivery on wrong date?

2. Validation rules to add:
   a) Delivery date must be TODAY or PAST (not future)
   b) Delivery date must be within order's delivery_window
      - If order is for 2026-01-27, can deliver ±1 day (2026-01-26 to 2026-01-28)
   c) Cannot mark delivered if order not yet created
   d) Cannot mark delivered if order already CANCELLED

3. Update all delivery endpoints:
   - routes_delivery_boy.py: POST mark-delivered
   - routes_shared_links.py: POST mark-delivered
   - Add validation before updating delivery_statuses

4. Error responses:
   - If date is future: "Delivery date cannot be in future"
   - If outside window: "Delivery date outside order window (Jan 26-28)"
   - If order cancelled: "Cannot deliver cancelled order"

5. Create file: DATE_VALIDATION_FIX.md
```

## STEP 28: Consolidate Routes by Domain
**Prompt for AI Agent:**
```
Fix: 15 route files with overlapping responsibilities

ACTION: Group routes by domain (don't consolidate yet - just plan)

1. Current: 15 separate route files
   - routes_admin.py
   - routes_billing.py
   - routes_customer.py
   - routes_delivery.py
   - routes_delivery_boy.py
   - routes_delivery_operations.py
   - routes_location_tracking.py
   - routes_marketing.py
   - routes_offline_sync.py
   - routes_orders.py
   - routes_products.py
   - routes_products_admin.py
   - routes_shared_links.py
   - routes_subscriptions.py
   - routes_supplier.py
   (15 TOTAL)

2. Proposed consolidation (PLANNING ONLY - don't execute yet):
   Domain 1: ORDERS & SUBSCRIPTIONS
   ├─ routes_orders.py (one-time orders)
   ├─ routes_subscriptions.py (subscriptions)
   ├─ routes_phase0_updated.py (Phase 0 subscriptions)
   └─ Plan: Consolidate into /routes/orders.py (keep both order types)

   Domain 2: DELIVERY
   ├─ routes_delivery.py
   ├─ routes_delivery_boy.py
   ├─ routes_delivery_operations.py
   └─ Plan: Consolidate into /routes/delivery.py (admin + boy endpoints)

   Domain 3: PRODUCTS & INVENTORY
   ├─ routes_products.py
   ├─ routes_products_admin.py
   ├─ routes_supplier.py
   └─ Plan: Consolidate into /routes/products.py (all product management)

   Domain 4: BILLING & PAYMENTS
   ├─ routes_billing.py
   └─ Plan: Keep as-is (only 1 file)

   Domain 5: ADMIN & OPERATIONS
   ├─ routes_admin.py
   ├─ routes_marketing.py
   └─ Plan: Consolidate into /routes/admin.py (both are admin functions)

   Domain 6: CUSTOMERS & SUPPORT
   ├─ routes_customer.py (customer self-service)
   └─ Plan: Keep separate (customer portal)

   Domain 7: SPECIAL
   ├─ routes_location_tracking.py
   ├─ routes_offline_sync.py
   ├─ routes_shared_links.py
   └─ Plan: Keep separate (special use cases)

3. Create file: ROUTE_CONSOLIDATION_PLAN.md showing:
   - Current state (15 files)
   - Proposed state (8-10 files)
   - Files to merge (grouped by domain)
   - Merge sequence (order of consolidation)
   - Rollback plan

4. Note: This is PLAN ONLY - actual consolidation happens in later step
```

## STEP 29: Create UUID Validation Rules
**Prompt for AI Agent:**
```
Fix: Inconsistent UUID generation patterns

ACTION: Standardize UUID generation and validation

1. Current problem:
   - Different parts of code generate UUIDs differently
   - Some use uuid.uuid4() → "550e8400-e29b-41d4-a716-446655440000" format
   - Some use custom patterns → "order-001", "cust-123"
   - Some mix both in same collection

2. Audit UUID usage:
   a) Read models.py and models_phase0_updated.py
   b) For EACH collection, check: how is ID generated?
   c) Document pattern for each collection

3. Establish standards:
   ALL IDs should be UUIDs (version 4)
   Format: 36 characters (with hyphens)
   Example: "550e8400-e29b-41d4-a716-446655440000"

   OR establish Domain-Prefixed UUIDs:
   - "ord_" + uuid for orders
   - "cust_" + uuid for customers
   - "sub_" + uuid for subscriptions
   - Benefit: Easy to identify object type

4. Choose ONE approach (standardized):
   OPTION A: Pure UUID (36 chars, no prefix)
   OPTION B: Prefixed UUID (4 char + "_" + 32 chars)

5. Update database/generation:
   - In database.py: standardize ID generation
   - In models.py: add validation (regex pattern)
   - In all routes: use standard function

6. Migration:
   - For existing data with non-standard IDs:
   - Option: Keep as-is (risk of inconsistency)
   - Option: Generate new IDs and migrate (high effort)
   - Document decision

7. Create file: UUID_STANDARDIZATION.md
```

---

# 📋 PHASE 5: DATA INTEGRITY FIXES (5 Steps)

## STEP 30: Add Index Strategy
**Prompt for AI Agent:**
```
Fix: Missing database indexes for query performance

ACTION: Add indexes to frequently queried fields

1. Review all find() queries in routes_*.py:
   - What fields are used in WHERE clauses?
   - What fields are sorted by?
   - What joins between collections?

2. Identify high-traffic queries:
   a) db.orders.find({user_id: X})  ← FREQUENT
   b) db.subscriptions_v2.find({status: X})  ← FREQUENT
   c) db.delivery_statuses.find({customer_id: X, delivery_date: Y})  ← FREQUENT
   d) db.billing_records.find({customer_id: X})  ← FREQUENT

3. Create database migration file:
   FILE: backend/migrations/003_add_indexes.py
   
   ```python
   # Create indexes
   db.orders.create_index("user_id")
   db.orders.create_index("customer_id")
   db.orders.create_index([("delivery_date", -1)])
   
   db.subscriptions_v2.create_index("customer_id")
   db.subscriptions_v2.create_index([("status", 1)])
   
   db.delivery_statuses.create_index([("customer_id", 1), ("delivery_date", -1)])
   
   db.billing_records.create_index("customer_id")
   db.billing_records.create_index([("period_date", -1)])
   ```

4. Document index strategy: DATABASE_INDEXES.md

5. Performance test:
   - Before: Query time for large result sets
   - After: Query time for same operations
   - Document improvement
```

## STEP 31: Create Data Consistency Report
**Prompt for AI Agent:**
```
Fix: Identify orphaned/inconsistent data

ACTION: Create queries to find data integrity issues

1. Create reports for these scenarios:

   REPORT 1: Orphaned Orders (not in any subscription)
   Query: db.orders.find({subscription_id: {$exists: false}})
   Count: How many?
   Action: Are these correct (one-time orders) or errors?

   REPORT 2: Orphaned Customers (no user record)
   Query: db.customers_v2.find({user_id: {$exists: false}})
   Count: How many?
   Action: Create corresponding user? or valid orphans?

   REPORT 3: Delivery with no Order
   Query: db.delivery_statuses.find({order_id: {$exists: false}})
   Count: How many?
   Action: These are broken - need to fix

   REPORT 4: Billed Subscriptions (check in billing_records)
   Query: db.billing_records.find({subscription_id: X})
   Count: How many months billed?
   Action: Are they correct?

   REPORT 5: Duplicate Customers
   Query: Check for users with same email
   Query: Check for customers_v2 with same phone
   Count: How many duplicates?
   Action: Should we merge them?

2. Create file: DATA_CONSISTENCY_CHECKS.md
   - List all consistency queries
   - Document expected vs actual results
   - Flag anomalies

3. Create file: DATA_CLEANUP_PLAN.md
   - For each anomaly found
   - How to fix
   - Rollback if needed
```

## STEP 32: Add Referential Integrity Validation
**Prompt for AI Agent:**
```
Fix: Missing validation that referenced records exist

ACTION: Add pre-insert validations

1. For EVERY foreign key relationship, add validation:

   When creating db.orders:
   ├─ Validate: user_id exists in db.users
   ├─ Validate: all product_ids exist in db.products
   ├─ Validate: delivery address is valid
   └─ If invalid: reject with clear error

   When creating db.delivery_statuses:
   ├─ Validate: order_id exists in db.orders
   ├─ Validate: customer_id exists in db.customers_v2
   ├─ Validate: delivery_date is reasonable (not past 30 days)
   └─ If invalid: reject with clear error

   When creating db.billing_records:
   ├─ Validate: customer_id exists in db.customers_v2
   ├─ Validate: order_id exists in db.orders (if subscription_id is null)
   ├─ Validate: subscription_id exists in db.subscriptions_v2 (if filled)
   └─ If invalid: reject with clear error

2. Create validation functions in database.py:
   ```python
   async def validate_user_exists(user_id):
       user = await db.users.find_one({id: user_id})
       if not user:
           raise ValueError(f"User {user_id} not found")
   
   async def validate_order_exists(order_id):
       order = await db.orders.find_one({id: order_id})
       if not order:
           raise ValueError(f"Order {order_id} not found")
   
   # ... similar for all foreign keys
   ```

3. Use validations in all routes:
   - Call before insert/update
   - Catch errors and return 400 Bad Request
   - Document error message

4. Create file: REFERENTIAL_INTEGRITY_FIX.md
```

## STEP 33: Add Field Validation Rules
**Prompt for AI Agent:**
```
Fix: Missing field validation (empty strings, invalid data types, etc.)

ACTION: Add validation to all input schemas

1. For each model in models.py and models_phase0_updated.py:
   - Add validation rules
   - Use Pydantic validators

2. Examples:
   ```python
   class Order(BaseModel):
       id: str  # UUID format validation
       user_id: str  # must be valid UUID or existing user
       items: List[OrderItem]  # must not be empty
       delivery_date: datetime  # must be today or future
       status: OrderStatus  # must be in enum
       
       @validator('id')
       def validate_id(cls, v):
           if not is_valid_uuid(v):
               raise ValueError('Invalid UUID format')
           return v
       
       @validator('items')
       def validate_items(cls, v):
           if len(v) == 0:
               raise ValueError('Order must have at least 1 item')
           return v
   ```

3. Rules to add:
   - String fields: min/max length, not empty
   - Email fields: email format
   - Phone fields: 10-digit format
   - Date fields: not future, not too old
   - Enum fields: must be valid value
   - Numeric fields: min/max values, positive

4. Create file: FIELD_VALIDATION_RULES.md
```

## STEP 34: Create Data Migration Playbook
**Prompt for AI Agent:**
```
Fix: Lack of migration procedures for data changes

ACTION: Create standardized migration framework

1. Create directory: /backend/migrations/

2. Create migration framework file:
   FILE: backend/migrations/__init__.py
   
   ```python
   class Migration:
       def __init__(self, name: str, version: int):
           self.name = name
           self.version = version
       
       async def up(self, db):
           """Apply migration"""
           raise NotImplementedError
       
       async def down(self, db):
           """Rollback migration"""
           raise NotImplementedError
   ```

3. Create each migration as separate file:
   - 001_add_subscription_id_to_orders.py
   - 002_add_order_id_to_delivery_statuses.py
   - 003_add_indexes.py
   - ... etc

4. Create migration runner script:
   FILE: backend/run_migrations.py
   
   ```python
   async def run_migrations():
       migrations = load_all_migrations()
       for migration in sorted(migrations, key=lambda x: x.version):
           try:
               await migration.up(db)
               print(f"✅ Applied: {migration.name}")
           except Exception as e:
               print(f"❌ Failed: {migration.name}: {e}")
               raise
   
   async def rollback_migrations():
       migrations = load_all_migrations()
       for migration in reversed(sorted(migrations)):
           try:
               await migration.down(db)
               print(f"✅ Rolled back: {migration.name}")
           except Exception as e:
               print(f"❌ Rollback failed: {migration.name}: {e}")
   ```

5. Create file: DATA_MIGRATION_FRAMEWORK.md documenting:
   - How to create new migrations
   - How to run migrations
   - How to rollback
   - Safety checks before running
```

---

# 📋 PHASE 6: IMPLEMENTATION & TESTING (4 Steps)

## STEP 35: Create Integration Test Suite
**Prompt for AI Agent:**
```
ACTION: Build tests for each linkage

1. Create tests directory: /tests/integration/

2. Create test files:
   - test_order_creation_linkage.py
   - test_delivery_confirmation_linkage.py
   - test_billing_includes_one_time_orders.py
   - test_user_customer_linking.py
   - test_role_permissions.py

3. Each test file should:
   a) Set up test data (create orders, customers, deliveries)
   b) Execute the flow (create order → confirm delivery → generate bill)
   c) Assert the linkages are correct
   d) Clean up test data

4. Example test:
   ```python
   async def test_one_time_order_billed():
       # Setup
       order = create_order(type="one_time", items=[...])
       
       # Action
       confirm_delivery(order.id)
       bills = generate_billing()
       
       # Assert
       assert order.id in [b.order_id for b in bills]
       assert calculate_total(bills) == expected_amount
   ```

5. Run tests:
   - Before making changes (baseline)
   - After each fix (verify no regression)
   - Before production deploy

6. Create file: INTEGRATION_TEST_SUITE.md
```

## STEP 36: Create Smoke Tests for Each Endpoint
**Prompt for AI Agent:**
```
ACTION: Build quick tests for all API endpoints

1. Create file: /tests/smoke_tests.py

2. For EACH endpoint:
   - Call endpoint with valid input
   - Verify response status = 200 or expected code
   - Verify response has expected fields

3. Test all CRUD operations:
   - Create (POST)
   - Read (GET)
   - Update (PUT)
   - Delete (DELETE)

4. Test role-based access:
   - Call endpoint as ADMIN (should pass)
   - Call endpoint as CUSTOMER (should fail with 403)
   - Call endpoint as anonymous (should fail with 401 or 403)

5. Run as CI/CD check:
   - Before deploying to production
   - Ensure all endpoints still work

6. Create file: SMOKE_TEST_RESULTS.md documenting:
   - Total endpoints: X
   - Passing: X
   - Failing: X
   - Skipped: X
```

## STEP 37: Create Monitoring & Alerts
**Prompt for AI Agent:**
```
ACTION: Set up monitoring for critical operations

1. Monitor these critical operations:
   a) One-time order creation
      - Alert if: 0 orders/hour (business stopped?)
   
   b) Delivery confirmations
      - Alert if: delivery not matching orders
   
   c) Billing generation
      - Alert if: orders not included in bill
      - Track: monthly revenue
   
   d) User login failures
      - Alert if: sudden spike in login failures
   
   e) Database consistency
      - Daily check for orphaned records
      - Alert if count increases unexpectedly

2. Create monitoring endpoints:
   ```python
   GET /api/monitoring/health/
   ├─ Response: {status: "healthy", details: {...}}
   
   GET /api/monitoring/stats/
   ├─ Response: {
   │    orders_created_today: 15,
   │    deliveries_confirmed_today: 12,
   │    billing_records_generated: 45,
   │    one_time_orders_in_bill: 10,
   │    orphaned_records: 0
   │  }
   ```

3. Create alerts:
   - Email alert if orphaned records > 0
   - Email alert if one_time_orders_in_bill drops to 0
   - Slack alert if any critical endpoint fails

4. Create file: MONITORING_SETUP.md
```

## STEP 38: Create Rollback Procedures
**Prompt for AI Agent:**
```
ACTION: Document how to rollback if issues occur

1. For EACH fix made (Steps 19-34):
   - Document the change
   - Document the rollback procedure
   - Test rollback in staging environment

2. Create rollback script: /backend/rollback.py
   ```python
   async def rollback_step_23():
       """Rollback: Include One-Time Orders in Billing"""
       # Reverse the change
       # Update routes_billing.py back to original
       # Remove one-time orders from any generated bills
   
   async def rollback_step_21():
       """Rollback: Create User ↔ Customer Linking"""
       # Reverse: Remove user_id field from db.customers_v2
       # Reverse: Remove customer_v2_id field from db.users
       # Remove any generated links
   ```

3. Test rollback procedure:
   - Apply fix
   - Verify it works
   - Rollback
   - Verify system returns to original state
   - Document time taken

4. Create file: ROLLBACK_PROCEDURES.md with:
   - Step-by-step rollback for each fix
   - Time estimates
   - Risk level
   - Verification steps
```

---

# 📋 PHASE 7: EXECUTION SUMMARY (3 Steps)

## STEP 39: Create Pre-Deployment Checklist
**Prompt for AI Agent:**
```
ACTION: Verify everything ready before production deployment

Checklist:
- [ ] All fixes (Steps 19-34) code changes made
- [ ] All tests (Steps 35-37) passing
- [ ] Database backed up (MANDATORY)
- [ ] Migrations run in staging (verified working)
- [ ] Rollback procedures tested (can revert if needed)
- [ ] Monitoring enabled (alerts configured)
- [ ] Team briefed on changes
- [ ] Support team ready for issues
- [ ] Production downtime window scheduled (if needed)
- [ ] Deployment plan reviewed

Create file: PRE_DEPLOYMENT_CHECKLIST.md
```

## STEP 40: Create Production Deployment Plan
**Prompt for AI Agent:**
```
ACTION: Step-by-step production deployment

Timeline:
PHASE 1 (Low Risk - Day 1):
- Deploy Steps 19-21 (add foreign keys and links)
- Verify no errors
- Monitor for 4 hours

PHASE 2 (Medium Risk - Day 2):
- Deploy Steps 22-25 (link confirmations, audit trail)
- Verify delivery flows still work
- Monitor for 4 hours

PHASE 3 (High Risk - Day 3):
- Deploy Step 23 (CRITICAL: one-time orders billing)
- Verify bills include one-time orders
- Monitor for 8 hours

PHASE 4 (Integration - Day 4):
- Deploy Steps 26-34 (validation, indexes, data integrity)
- Verify consistency reports
- Monitor for 4 hours

PHASE 5 (Monitoring - Ongoing):
- Monitor all critical operations
- Respond to alerts immediately
- Collect metrics on impact (revenue recovery, etc.)

Create file: PRODUCTION_DEPLOYMENT_PLAN.md
```

## STEP 41: Create Post-Deployment Validation
**Prompt for AI Agent:**
```
ACTION: Verify changes worked in production

Daily checks for 7 days post-deployment:

DAY 1: Critical Checks
- [ ] System is up and responding to requests
- [ ] Database connectivity OK
- [ ] User logins working
- [ ] No error logs (check backend logs)
- [ ] Revenue: one-time orders appearing in bills

DAY 2-3: Feature Verification
- [ ] Orders can be created (all paths)
- [ ] Deliveries can be confirmed (delivery boy + shared link)
- [ ] Billing generates correctly
- [ ] Customers see correct bills
- [ ] Data consistency: 0 orphaned records

DAY 4-7: Performance & Stability
- [ ] Query performance acceptable (no slow queries)
- [ ] No database locks
- [ ] Error rates normal (< 1%)
- [ ] Revenue trending correctly
- [ ] No customer complaints

Metrics to track:
- Orders created today: X
- Deliveries confirmed today: X
- Bills generated: X
- Revenue recovered: ₹X
- Errors in last hour: 0

Create file: POST_DEPLOYMENT_VALIDATION.md
```

---

# 🎯 SUMMARY OF ALL FIXES

| Step | Title | Impact | Effort | Risk |
|------|-------|--------|--------|------|
| 1-6 | Frontend Cleanup | Code organization | 4h | Low |
| 7-13 | Backend Audit | Understanding system | 8h | None |
| 14-18 | Route Analysis | Architecture clarity | 6h | None |
| 19 | Add subscription_id to orders | Enable linking | 2h | Low |
| 20 | Add order_id to delivery_statuses | Enable linking | 2h | Low |
| 21 | Create user↔customer links | Enable authentication | 3h | Medium |
| 22 | Link delivery to order | Enable order status updates | 2h | Low |
| **23** | **Include one-time orders in billing** | **₹50K+/month revenue** | **3h** | **Medium** |
| 24 | Add role validation | Security | 2h | Low |
| 25 | Add audit trail | Accountability | 2h | Low |
| 26 | Add quantity validation | Data integrity | 2h | Low |
| 27 | Add date validation | Data integrity | 2h | Low |
| 28 | Plan route consolidation | Code organization | 2h | None |
| 29 | UUID standardization | Data consistency | 4h | Medium |
| 30 | Add database indexes | Performance | 2h | Low |
| 31 | Data consistency report | Find issues | 3h | None |
| 32 | Referential integrity | Data integrity | 4h | Low |
| 33 | Field validation | Data quality | 4h | Low |
| 34 | Migration framework | Safe changes | 3h | Low |
| 35-38 | Testing & Monitoring | Reliability | 10h | Low |
| 39-41 | Deployment | Production ready | 4h | Low |
|  | **TOTAL** |  | **73 hours** |  |

---

# 🚀 QUICK START SEQUENCE

**For AI Agent to Follow:**

1. **Week 1 - Audit Phase (Steps 1-18)**
   - Frontend cleanup + organization
   - Backend audit + documentation
   - Create all audit reports

2. **Week 2 - Linkage Fixes (Steps 19-29)**
   - Add foreign keys
   - Create user↔customer links
   - Fix billing (REVENUE RECOVERY!)
   - Standardize UUIDs

3. **Week 3 - Data Integrity (Steps 30-34)**
   - Add indexes
   - Create consistency checks
   - Add validations
   - Build migration framework

4. **Week 4 - Testing & Deploy (Steps 35-41)**
   - Create integration tests
   - Set up monitoring
   - Production deployment
   - Post-deployment validation

---

# 📞 ISSUES & BLOCKERS

If AI Agent gets stuck:

1. **"Cannot find route file"** → Search: grep -r "api/endpoint/path" backend/
2. **"Don't know collection schema"** → Read: models.py + models_phase0_updated.py
3. **"Confused about user/customer"** → Check STEP 11 (customer mismatch doc)
4. **"Billing is complex"** → Trace routes_billing.py line by line
5. **"Too many endpoints"** → Use STEP 14 (complete API inventory)
6. **"Don't know what breaks"** → Create tests for it (STEP 35-37)

---

**END OF PROMPTS**

*This document provides 41 actionable prompts for AI Agent to systematically audit, fix, and test the entire EarlyBird system.*

# ROLE VALIDATION CODE LOCATIONS - EXACT FILES & LINES TO FIX
**Purpose:** Quick reference for where to make role validation changes  
**Date:** January 27, 2026  
**Total Locations:** 60+ code locations across 8 route files

---

## PART A: CRITICAL FIXES (40+ locations)

### A1. routes_phase0_updated.py (40+ endpoints)

**File:** `c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend\routes_phase0_updated.py`  
**Status:** Missing role checks on 40+ endpoints using `Depends(get_current_user)`  
**Severity:** 🔴 CRITICAL

#### Endpoints to Fix

**GROUP 1: PRODUCT ENDPOINTS (2)**
- **Line 27:** `async def create_product(product: ProductCreate, current_user: dict = Depends(get_current_user)):`
  - Change: `require_role([UserRole.ADMIN])`
  - Reason: Only admins should create products

- **Line 37:** `async def get_products(current_user: dict = Depends(get_current_user)):`
  - Change: `require_role([UserRole.ADMIN, UserRole.MARKETING_STAFF])`
  - Reason: Only certain roles should list products

**GROUP 2: CUSTOMER ENDPOINTS (8)**
- **Line 61:** `async def create_customer(customer: CustomerCreate, current_user: dict = Depends(get_current_user)):`
  - Change: `require_role([UserRole.ADMIN, UserRole.MARKETING_STAFF, UserRole.SUPPORT_TEAM])`
  - Reason: Only these roles can create customers (NOTE: SUPPORT_TEAM not in enum - may need to add)

- **Line 74:** `async def get_customers(..., current_user: dict = Depends(get_current_user)):`
  - Change: `require_role([UserRole.ADMIN])`
  - Reason: Only admin should view all customers

- **Line 110:** `async def get_customers(..., current_user: dict = Depends(get_current_user)):`
  - Change: `require_role([UserRole.ADMIN])`
  - Note: Appears to be duplicate? Check file structure

- **Line 130:** `async def get_customer(customer_id: str, current_user: dict = Depends(get_current_user)):`
  - Change: `require_role([UserRole.ADMIN, UserRole.MARKETING_STAFF])`
  - Reason: Only certain roles can view customer details

- **Line 141:** `async def update_customer(customer_id: str, update: CustomerUpdate, current_user: dict = Depends(get_current_user)):`
  - Change: `require_role([UserRole.ADMIN, UserRole.MARKETING_STAFF])`
  - Add scope check: Only can update if they're assigned to customer

- **Line 161:** `async def delete_customer(customer_id: str, current_user: dict = Depends(get_current_user)):`
  - Change: `require_role([UserRole.ADMIN])`
  - Reason: Only admins can delete customers

- **Line 184:** (estimate) More customer operations
  - Similar pattern - add role checks

- **Line 198:** `async def delete_customer(customer_id: str, current_user: dict = Depends(get_current_user)):`
  - Change: `require_role([UserRole.ADMIN])`

**GROUP 3: SUBSCRIPTION ENDPOINTS (8)**
- **Line 215:** `async def create_subscription(..., current_user: dict = Depends(get_current_user)):`
  - Change: `require_role([UserRole.ADMIN, UserRole.MARKETING_STAFF, UserRole.CUSTOMER])`
  - Add scope check: Customers can only create own subscriptions

- **Line 260:** `async def get_subscriptions(..., current_user: dict = Depends(get_current_user)):`
  - Change: `require_role([UserRole.ADMIN, UserRole.MARKETING_STAFF, UserRole.CUSTOMER])`
  - Add scope check: See only own/assigned subscriptions

- **Line 268:** `async def get_subscription(subscription_id: str, current_user: dict = Depends(get_current_user)):`
  - Change: `require_role([UserRole.ADMIN, UserRole.CUSTOMER])`

- **Line 279:** `async def update_subscription(..., current_user: dict = Depends(get_current_user)):`
  - Change: `require_role([UserRole.ADMIN, UserRole.CUSTOMER])`

- **Line 321:** `async def delete_subscription(..., current_user: dict = Depends(get_current_user)):`
  - Change: `require_role([UserRole.ADMIN, UserRole.CUSTOMER])`

- **Line 335:** More subscription operations (4+ more)
  - Similar pattern

**GROUP 4: BULK IMPORT ENDPOINTS (4)**
- **Line 373:** `async def bulk_create_customers(..., current_user: dict = Depends(get_current_user)):`
  - Change: `require_role([UserRole.ADMIN, UserRole.MARKETING_STAFF])`

- **Line 397:** `async def bulk_update_subscriptions(..., current_user: dict = Depends(get_current_user)):`
  - Change: `require_role([UserRole.ADMIN, UserRole.MARKETING_STAFF])`

- **Line 512:** (estimate) More bulk operations
  - Similar pattern

- **Line 611:** (estimate) More bulk operations
  - Similar pattern

**GROUP 5: OTHER ENDPOINTS (18+)**
- **Line 742:** `async def ... (current_user: dict = Depends(get_current_user)):`
  - Determine correct role from context

- **Line 811:** `async def ... (current_user: dict = Depends(get_current_user)):`
  - Determine correct role from context

- ... (15+ more lines with same pattern)

- **Line 1576:** `async def get_users_by_role(role: Optional[str] = None, current_user: dict = Depends(get_current_user)):`
  - Change: `require_role([UserRole.ADMIN])`

- **Line 1588:** `async def create_area(data: dict, current_user: dict = Depends(get_current_user)):`
  - Change: `require_role([UserRole.ADMIN])`

- **Line 1630:** `async def update_area(area_id: str, data: dict, current_user: dict = Depends(get_current_user)):`
  - Change: `require_role([UserRole.ADMIN])`

- **Line 1686:** `async def delete_area(area_id: str, current_user: dict = Depends(get_current_user)):`
  - Change: `require_role([UserRole.ADMIN])`

---

### A2. routes_delivery_operations.py (20+ endpoints)

**File:** `c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend\routes_delivery_operations.py`  
**Status:** All or most endpoints missing proper role checks  
**Severity:** 🔴 CRITICAL

**Key Lines to Check:**
- Line 85: First endpoint - determine correct role
- Line 132: Next endpoint
- Line 202: More endpoints
- Line 246: More endpoints
- Line 289: More endpoints
- Line 329: More endpoints
- Line 379: More endpoints
- Line 404: More endpoints
- Line 429: More endpoints
- Line 454: More endpoints
- Line 482: More endpoints
- Line 567: More endpoints
- Line 594: More endpoints
- Line 624: More endpoints
- Line 658: More endpoints
- Line 686: Contains role check at line 692 - EXAMINE PATTERN
  ```python
  if current_user.get('role') != 'admin':
      raise HTTPException(status_code=403, detail="Only admin can approve changes")
  ```
  Should use: `require_role([UserRole.ADMIN])` instead

- Line 801: More endpoints
- Line 836: More endpoints
- Line 874: More endpoints
- Line 934: More endpoints
- Line 988: More endpoints
- Line 1010: More endpoints
- Line 1056: More endpoints
- Line 1116: More endpoints

---

## PART B: HIGH PRIORITY FIXES (15+ locations)

### B1. routes_products_admin.py (4 locations)

**File:** `c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend\routes_products_admin.py`  
**Status:** Manual role checks instead of require_role()  
**Severity:** 🟠 HIGH - Inconsistent pattern

**Locations:**

1. **Line 24-36:**
   ```python
   @router.post("/create")
   async def create_product(product: ProductCreate, current_user: dict = Depends(get_current_user)):
       if current_user['role'] not in ['admin', 'manager']:
           raise HTTPException(status_code=403, detail="Not authorized")
   ```
   **Fix:**
   ```python
   @router.post("/create")
   async def create_product(
       product: ProductCreate,
       current_user: dict = Depends(require_role([UserRole.ADMIN]))
   ):
       # Remove lines 35-36 (manual check)
   ```

2. **Line 64-74:**
   ```python
   @router.put("/{product_id}")
   async def update_product(product_id: str, update: ProductUpdate, current_user: dict = Depends(get_current_user)):
       if current_user['role'] not in ['admin', 'manager']:
           raise HTTPException(status_code=403, detail="Not authorized")
   ```
   **Fix:**
   ```python
   @router.put("/{product_id}")
   async def update_product(
       product_id: str,
       update: ProductUpdate,
       current_user: dict = Depends(require_role([UserRole.ADMIN]))
   ):
       # Remove lines 73-74
   ```

3. **Line 227-247:**
   ```python
   @router.post("/{product_id}/link-supplier")
   async def link_supplier(product_id: str, req: LinkSupplierRequest, current_user: dict = Depends(get_current_user)):
       if current_user['role'] not in ['admin', 'manager']:
           raise HTTPException(status_code=403, detail="Not authorized")
   ```
   **Fix:**
   ```python
   @router.post("/{product_id}/link-supplier")
   async def link_supplier(
       product_id: str,
       req: LinkSupplierRequest,
       current_user: dict = Depends(require_role([UserRole.ADMIN]))
   ):
       # Remove lines 246-247
   ```

4. **Line 295-305:**
   ```python
   @router.put("/supplier-link/{supplier_product_id}")
   async def update_supplier_link(supplier_product_id: str, update: UpdateSupplierLink, current_user: dict = Depends(get_current_user)):
       if current_user['role'] not in ['admin', 'manager']:
           raise HTTPException(status_code=403, detail="Not authorized")
   ```
   **Fix:**
   ```python
   @router.put("/supplier-link/{supplier_product_id}")
   async def update_supplier_link(
       supplier_product_id: str,
       update: UpdateSupplierLink,
       current_user: dict = Depends(require_role([UserRole.ADMIN]))
   ):
       # Remove lines 304-305
   ```

---

### B2. routes_location_tracking.py (3 locations)

**File:** `c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend\routes_location_tracking.py`  
**Status:** Manual role checks, uses string 'delivery_boy'  
**Severity:** 🟠 HIGH - Inconsistent pattern + string role

**Locations:**

1. **Line 22-50:**
   ```python
   @router.post("/{delivery_id}/location")
   async def update_location(delivery_id: str, location: LocationUpdate, current_user: dict = Depends(get_current_user)):
       if current_user['role'] == 'delivery_boy':
           if location.delivery_id != current_user.get('assigned_delivery'):
               raise HTTPException(status_code=403, detail="Not authorized")
   ```
   **Fix:**
   ```python
   @router.post("/{delivery_id}/location")
   async def update_location(
       delivery_id: str,
       location: LocationUpdate,
       current_user: dict = Depends(require_role([UserRole.DELIVERY_BOY]))
   ):
       # Remove lines 48-50 (role check)
       # KEEP: scope check for delivery_id
       if location.delivery_id != current_user.get('assigned_delivery'):
           raise HTTPException(status_code=403, detail="Not your delivery")
   ```

2. **Line 238:** (estimate) Similar pattern
   - Replace string 'delivery_boy' with UserRole.DELIVERY_BOY

3. **Line 286:** (estimate) Similar pattern
   - Replace string 'delivery_boy' with UserRole.DELIVERY_BOY

---

### B3. routes_offline_sync.py (7 locations)

**File:** `c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend\routes_offline_sync.py`  
**Status:** Manual role checks, uses string 'delivery_boy', 'supervisor'  
**Severity:** 🟠 HIGH - Inconsistent + undefined role

**Locations:**

1. **Line 22-60:**
   ```python
   @router.post("/deliveries/{delivery_id}")
   async def update_delivery(delivery_id: str, data: dict, current_user: dict = Depends(get_current_user)):
       if current_user['role'] == 'delivery_boy':
           if not ...:
               raise HTTPException(status_code=403, detail="Not authorized to update this delivery")
       elif current_user['role'] == 'supervisor':
           if not ...:
               raise HTTPException(status_code=403, detail="Not authorized for this area")
   ```
   **Fix:**
   ```python
   @router.post("/deliveries/{delivery_id}")
   async def update_delivery(
       delivery_id: str,
       data: dict,
       current_user: dict = Depends(require_role([UserRole.DELIVERY_BOY, UserRole.SUPERVISOR]))  # If SUPERVISOR is added
   ):
       # Remove manual role check
       # KEEP: scope/authorization checks for specific data
   ```
   **NOTE:** 'supervisor' not in UserRole enum - need to add it or clarify what it should be

2. **Line 137-161:** (estimate) Similar pattern
   - Replace manual checks with require_role()

3. **Line 189-...:** (estimate) batch-sync endpoint
   - Similar pattern

4. **Line 272-289:** (estimate) GET deliveries
   - Manual checks at line 287, 289

5. **Line 310-329:** (estimate) GET orders
   - Manual checks at line 324, 329

6. **Line 352:** (estimate) GET status
   - Check for role validation

7. **Multiple other endpoints** with same pattern

---

### B4. routes_delivery.py (1 location)

**File:** `c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend\routes_delivery.py`  
**Status:** One endpoint with manual scope check  
**Severity:** 🟠 HIGH - Inconsistent pattern

**Location:**

1. **Line 98-107:**
   ```python
   @router.get("/routes/{route_id}")
   async def get_route(route_id: str, current_user: dict = Depends(require_role([UserRole.DELIVERY_BOY, UserRole.ADMIN]))):
       # Line 107: Manual scope check
       if current_user["role"] == UserRole.DELIVERY_BOY and route["delivery_boy_id"] != current_user["id"]:
           raise HTTPException(status_code=403, detail="Access denied")
   ```
   **Note:** This one is OK - uses require_role() correctly, just has scope check
   - KEEP AS-IS

---

## PART C: MEDIUM PRIORITY FIXES (3 locations)

### C1. routes_products.py (3 locations)

**File:** `c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend\routes_products.py`  
**Status:** NO role checks on create/update/delete  
**Severity:** 🟠 HIGH

**Locations:**

1. **Line 23:**
   ```python
   @router.post("/", response_model=Product)
   async def create_product(product: ProductCreate, current_user: dict = Depends(get_current_user)):
   ```
   **Fix:**
   ```python
   @router.post("/", response_model=Product)
   async def create_product(
       product: ProductCreate,
       current_user: dict = Depends(require_role([UserRole.ADMIN]))
   ):
   ```

2. **Line 32:**
   ```python
   @router.put("/{product_id}")
   async def update_product(product_id: str, update: ProductUpdate, current_user: dict = Depends(get_current_user)):
   ```
   **Fix:**
   ```python
   @router.put("/{product_id}")
   async def update_product(
       product_id: str,
       update: ProductUpdate,
       current_user: dict = Depends(require_role([UserRole.ADMIN]))
   ):
   ```

3. **Line 42:**
   ```python
   @router.delete("/{product_id}")
   async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
   ```
   **Fix:**
   ```python
   @router.delete("/{product_id}")
   async def delete_product(
       product_id: str,
       current_user: dict = Depends(require_role([UserRole.ADMIN]))
   ):
   ```

---

### C2. routes_delivery_operations.py (1 location)

**File:** `c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend\routes_delivery_operations.py`  
**Status:** One endpoint with inverse logic  
**Severity:** 🟡 MEDIUM

**Location:**

1. **Line 686-692:**
   ```python
   @router.post("/...")  # line number estimated
   async def approve_change_request(current_user: dict = Depends(get_current_user)):
       # Line 692: Wrong pattern
       if current_user.get('role') != 'admin':
           raise HTTPException(status_code=403, detail="Only admin can approve changes")
   ```
   **Fix:**
   ```python
   async def approve_change_request(current_user: dict = Depends(require_role([UserRole.ADMIN]))):
       # Remove manual check
   ```

---

## PART D: CRITICAL PUBLIC ENDPOINTS (8 locations)

### D1. routes_shared_links.py (8 locations)

**File:** `c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend\routes_shared_links.py`  
**Status:** ZERO authentication on mark-delivered, add-product, pause, stop  
**Severity:** 🔴 CRITICAL - NO AUTH

**Locations to FIX:**

1. **Line 291 - GET /shared-delivery-link/{link_id}**
   ```python
   @router.get("/shared-delivery-link/{link_id}")
   async def get_shared_delivery_list(link_id: str, current_user: Optional[dict] = Depends(lambda: None)):
   ```
   **Status:** Currently allows public access (current_user can be None)
   - Add verification that link_id is valid and not expired
   - Already checks expiration at line 305

2. **Line 497 - POST /shared-delivery-link/{link_id}/mark-delivered (CRITICAL)**
   ```python
   @router.post("/shared-delivery-link/{link_id}/mark-delivered")
   async def mark_delivered_via_link(link_id: str, data: MarkDeliveredRequest):
       # NO AUTH AT ALL
   ```
   **FIX:**
   - Add PIN verification
   - Verify customer_id matches link
   - Add rate limiting
   - Log IP address
   - Check max_uses

3. **Line 588 - POST /shared-delivery-link/{link_id}/add-product (CRITICAL)**
   ```python
   @router.post("/shared-delivery-link/{link_id}/add-product")
   async def add_product_via_link(link_id: str, data: AddProductRequest):
       # NO AUTH AT ALL
   ```
   **FIX:**
   - Same as #2: PIN verification, customer check, rate limiting, logging

4. **Line 625 - POST /shared-delivery-link/{link_id}/pause (CRITICAL)**
   ```python
   @router.post("/shared-delivery-link/{link_id}/pause")
   async def pause_delivery_via_link(link_id: str, data: PauseRequest):
       # NO AUTH AT ALL
   ```
   **FIX:**
   - Same as #2: PIN verification, customer check, rate limiting, logging

5. **Line 659 - POST /shared-delivery-link/{link_id}/stop (CRITICAL)**
   ```python
   @router.post("/shared-delivery-link/{link_id}/stop")
   async def stop_delivery_via_link(link_id: str, data: StopRequest):
       # NO AUTH AT ALL
   ```
   **FIX:**
   - Same as #2: PIN verification, customer check, rate limiting, logging

6. **Line 249 - GET /shared-delivery-link/{link_id}/audit-logs**
   ```python
   @router.get("/shared-delivery-links/{link_id}/audit-logs")
   async def get_audit_logs(link_id: str, current_user: dict = Depends(get_current_user)):
   ```
   **Status:** ✅ Already protected with get_current_user
   - OK

7. **Line 398 - GET /shared-delivery-link/{link_id}/auth**
   ```python
   @router.get("/shared-delivery-link/{link_id}/auth")
   async def get_shared_delivery_list_auth(link_id: str, current_user: dict = Depends(get_current_user)):
       if current_user.get('role') != 'delivery_boy':
           raise HTTPException(status_code=403, detail="Only delivery boys can access this link")
   ```
   **Status:** ⚠️ Partially protected
   - Uses string 'delivery_boy' instead of UserRole.DELIVERY_BOY
   - FIX: `Depends(require_role([UserRole.DELIVERY_BOY]))`

8. **Line 170 - POST /shared-delivery-links (create)**
   ```python
   @router.post("/shared-delivery-links")
   async def create_shared_link(..., current_user: dict = Depends(get_current_user)):
   ```
   **Status:** ✅ Already protected

---

## SUMMARY BY FILE

| File | # to Fix | Issues | Severity |
|------|----------|--------|----------|
| routes_phase0_updated.py | 40+ | No role checks | 🔴 CRITICAL |
| routes_delivery_operations.py | 20+ | No role checks + string roles | 🔴 CRITICAL |
| routes_shared_links.py | 5 | NO AUTH (public endpoints) | 🔴 CRITICAL |
| routes_products_admin.py | 4 | Manual checks, string 'manager' | 🟠 HIGH |
| routes_offline_sync.py | 7 | Manual checks, string roles | 🟠 HIGH |
| routes_location_tracking.py | 3 | Manual checks, string 'delivery_boy' | 🟠 HIGH |
| routes_products.py | 3 | No role checks at all | 🟠 HIGH |
| routes_delivery.py | 1 | Minor (already has checks) | 🟡 MEDIUM |
| **TOTAL** | **60+** | **Multiple patterns** | **Mixed** |

---

## IMPLEMENTATION ORDER

**Phase 1 - CRITICAL (Day 1-2):**
1. routes_shared_links.py (5 endpoints) - 2-3 hours
2. routes_phase0_updated.py (40+ endpoints) - 3-4 hours
3. routes_delivery_operations.py (20+ endpoints) - 2-3 hours

**Phase 2 - HIGH (Day 3):**
4. routes_products_admin.py (4 endpoints) - 1 hour
5. routes_offline_sync.py (7 endpoints) - 1.5 hours
6. routes_location_tracking.py (3 endpoints) - 0.5 hours
7. routes_products.py (3 endpoints) - 0.5 hours

**Phase 3 - CLEAN UP (Day 4):**
8. Verify all UserRole enums in use
9. Add missing roles to enum if needed (SUPERVISOR, SUPPORT_TEAM)
10. Test all endpoints across all roles

---

## TESTING CHECKLIST

For each file/endpoint fixed:
- [ ] Test with ADMIN role - should PASS
- [ ] Test with CUSTOMER role - should FAIL (403)
- [ ] Test with DELIVERY_BOY role - should PASS/FAIL based on role requirements
- [ ] Test with wrong authentication - should FAIL (401)
- [ ] Test with missing token - should FAIL (401)
- [ ] Test scope checks still work (if any)

---

## NOTES

1. **SUPPORT_TEAM role** referenced in routes but NOT in UserRole enum
   - Need to add: `SUPPORT_TEAM = "support_team"` to UserRole enum
   - Or replace with existing role (ADMIN?)

2. **'manager' role** used but NOT in UserRole enum
   - Need to decide: Is this ADMIN or MARKETING_STAFF?
   - Recommend: Remove 'manager', use ADMIN

3. **'supervisor' role** used in offline_sync but NOT in UserRole enum
   - Need to decide: Add SUPERVISOR role or use ADMIN?
   - Recommend: Add SUPERVISOR role to enum if it's a real role

4. All string role checks should be replaced with UserRole enum values for type safety

---

## CONCLUSION

**60+ code locations** need role validation fixes across **8 route files**.

Estimated effort: **12-16 hours**

Most critical: routes_shared_links.py (public endpoints) and routes_phase0_updated.py (40+ endpoints with no checks)

# Mock, Test, and Seed Files Audit
**Project:** EarlyBird Delivery Services  
**Date:** January 27, 2026  
**Phase:** Phase 3 - Backend Audit (STEP 18)

---

## Executive Summary

This audit found **6 files** that are test/seed files in the production backend directory:
- **3 Test Files:** test_login.py, test_login_api.py, test_acceptance.py
- **3 Seed Files:** seed_data.py, seed_phase0_v2.py, seed_sample_data.py

**Recommendation:**
- **Test files:** Move to `/tests/` directory (low/medium risk)
- **Seed files:** Keep in `/backend/` but add "DEV ONLY" warnings (essential for dev/testing)

---

## File-by-File Audit

### 1. TEST FILES

#### FILE: test_login.py
| Property | Value |
|----------|-------|
| **Purpose** | Quick database connectivity test - verifies admin user exists in db.users |
| **Size** | ~20 lines of code |
| **Imports** | `database.py` (db connection) |
| **Dependencies** | db.users collection |
| **Last Modified** | Unknown (no timestamp in file) |
| **Status** | ❌ **ORPHANED** - Not imported by any code |
| **Usage** | Manual testing only - dev runs this to verify DB connectivity |
| **Current Location** | `/backend/test_login.py` |
| **Recommended Action** | **MOVE to /tests/** |
| **Risk Level** | Low - Simple test, no dependencies |

**Details:**
```python
# What it does:
async def test():
    result = await db.users.find_one({'email': 'admin@earlybird.com'})
    if result:
        print(f'✓ User found: {result.get("name")} - {result.get("role")}')
    else:
        print('✗ User not found')

asyncio.run(test())
```

**Verdict:** Simple standalone test. Move to `/tests/` with no changes needed.

---

#### FILE: test_login_api.py
| Property | Value |
|----------|-------|
| **Purpose** | API endpoint test - tests login endpoint with HTTP request |
| **Size** | ~20 lines of code |
| **Imports** | `requests` library (HTTP client) |
| **Dependencies** | Backend running on `localhost:8000` |
| **Last Modified** | Unknown |
| **Status** | ❌ **ORPHANED** - Not imported by any code |
| **Usage** | Manual testing only - developer runs to test login endpoint |
| **Current Location** | `/backend/test_login_api.py` |
| **Recommended Action** | **MOVE to /tests/** |
| **Risk Level** | Low - Standalone test script |

**Details:**
```python
# What it does:
url = "http://localhost:8000/api/auth/login"
credentials = {"email": "admin@earlybird.com", "password": "admin123"}
response = requests.post(url, json=credentials)
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
```

**Verdict:** Standalone HTTP test. Move to `/tests/` with no changes needed.

---

#### FILE: test_acceptance.py
| Property | Value |
|----------|-------|
| **Purpose** | Comprehensive acceptance test suite - validates 5 major flows (A-E) |
| **Size** | ~352 lines of code |
| **Imports** | `requests`, `json`, `asyncio` |
| **Dependencies** | Backend running on `localhost:8001` (configurable) |
| **Last Modified** | Unknown |
| **Status** | ✅ **ACTIVE** - Used by CI/CD pipeline |
| **Usage** | Runs in `/scripts/run_verification.sh` during deployment |
| **Current Location** | `/backend/test_acceptance.py` |
| **Referenced In** | `/scripts/run_verification.sh` (line 23) |
| **Recommended Action** | **MOVE to /tests/** + Update run_verification.sh |
| **Risk Level** | Medium - Must update script reference |

**Details:**
Test suite validates these flows:
- **Test A:** Boot & Health Check
- **Test B:** Customer Flow (OTP, profile, subscription, calendar)
- **Test C:** Delivery Flow (routes, manifest, marking)
- **Test D:** Procurement Flow (requirements, shortfall detection)
- **Test E:** Admin CRUD Operations

**Code Pattern:**
```python
def test_a_boot_and_health():
    response = requests.get(f"{BASE_URL}/")
    if response.status_code == 200 and "EarlyBird" in response.text:
        return log_test("Health check", True, "API is running")

def test_b_customer_flow():
    # 7 sub-tests: OTP, login, address, subscription, override, pause, calendar
    ...

# Main entry point:
if __name__ == "__main__":
    results = {
        "A": test_a_boot_and_health(),
        "B": test_b_customer_flow(),
        ...
    }
    sys.exit(main())
```

**Verdict:** 
- ✅ Active, used by deployment pipeline
- ⚠️ Should move to `/tests/` for proper organization
- ⚠️ Must update `/scripts/run_verification.sh` to reference new location
- ⚠️ Can run standalone with `python test_acceptance.py` or `python tests/test_acceptance.py`

---

### 2. SEED FILES

#### FILE: seed_data.py
| Property | Value |
|----------|-------|
| **Purpose** | Seed database with initial user roles for development/testing |
| **Size** | ~125 lines of code |
| **Imports** | `database.py`, `auth.py` (password hashing) |
| **Dependencies** | db.users collection, MongoDB connection |
| **Last Modified** | Unknown |
| **Status** | ✅ **ACTIVE** - Referenced by other seed files |
| **Usage** | Manual: `python seed_data.py` - creates test users |
| **Current Location** | `/backend/seed_data.py` |
| **Referenced In** | `seed_phase0_v2.py`, `seed_sample_data.py` (both recommend running this first) |
| **Recommended Action** | **KEEP in /backend/** + Add "DEV ONLY" warning comment |
| **Risk Level** | Medium - Development-critical, but should not run in production |

**Details:**
```python
async def seed_database():
    """Seed initial data for testing"""
    
    # Creates 3 users:
    admin = {"email": "admin@earlybird.com", "password": hash_password("admin123"), "role": "admin"}
    delivery_boy = {"email": "delivery@earlybird.com", "password": hash_password("delivery123"), "role": "delivery_boy"}
    marketing = {"email": "marketing@earlybird.com", "password": hash_password("marketing123"), "role": "marketing_staff"}
    
    # Upsert each user
    await db.users.update_one({"email": admin["email"]}, {"$set": admin}, upsert=True)
```

**Entry Point:**
```python
if __name__ == "__main__":
    asyncio.run(seed_database())
```

**Verdict:**
- ✅ Essential for development
- ⚠️ **MUST NOT RUN IN PRODUCTION** (would reset all user data)
- Should add warning: `# ⚠️ DEV ONLY - Do not run in production!`
- Keep in `/backend/` for easy developer access
- Should be added to `.gitignore` (already production data)

---

#### FILE: seed_phase0_v2.py
| Property | Value |
|----------|-------|
| **Purpose** | Seed Phase 0 V2 specific data: areas and delivery boys |
| **Size** | ~240 lines of code |
| **Imports** | `database.py` |
| **Dependencies** | db.areas, db.delivery_boys_v2 collections |
| **Last Modified** | Unknown |
| **Status** | ✅ **ACTIVE** - Referenced by seed_sample_data.py |
| **Usage** | Manual: `python seed_phase0_v2.py` - creates areas and delivery boys |
| **Current Location** | `/backend/seed_phase0_v2.py` |
| **Referenced In** | Recommended to run after `seed_data.py` |
| **Recommended Action** | **KEEP in /backend/** + Add "DEV ONLY" warning |
| **Risk Level** | Medium - Phase 0 V2 critical data |

**Details:**
```python
async def seed_phase0_v2_data():
    """Seed Phase 0 V2 specific data: areas and delivery boys"""
    
    # Creates 5 areas (Bangalore sub-areas):
    areas = [
        {"id": "area-001", "main_area": "Bangalore", "sub_area": "MG Road", ...},
        {"id": "area-002", "main_area": "Bangalore", "sub_area": "Indiranagar", ...},
        ...
    ]
    
    # Creates delivery boys for each area
    delivery_boys = [
        {"id": "db-001", "name": "Delivery Boy 1", "area_id": "area-001", ...},
        ...
    ]
```

**Entry Point:**
```python
if __name__ == "__main__":
    asyncio.run(main())  # Line 239
```

**Verdict:**
- ✅ Essential for Phase 0 V2 development
- ⚠️ **MUST NOT RUN IN PRODUCTION**
- Should add warning: `# ⚠️ DEV ONLY - Do not run in production!`
- Keep in `/backend/` for easy developer access

---

#### FILE: seed_sample_data.py
| Property | Value |
|----------|-------|
| **Purpose** | Seed sample customer and subscription data for testing |
| **Size** | ~91 lines of code |
| **Imports** | `database.py` |
| **Dependencies** | db.products, db.customers, db.subscriptions collections |
| **Last Modified** | Unknown |
| **Status** | ✅ **ACTIVE** - Recommended to run after seed_data.py |
| **Usage** | Manual: `python seed_sample_data.py` - creates test data |
| **Current Location** | `/backend/seed_sample_data.py` |
| **Run Sequence** | Should run AFTER: seed_data.py (to create products) |
| **Recommended Action** | **KEEP in /backend/** + Add "DEV ONLY" warning |
| **Risk Level** | Low - Sample data only |

**Details:**
```python
async def seed_sample_data():
    """Seed sample customer and subscription data"""
    
    # Get existing products (required)
    products = await db.products.find({}).to_list(length=10)
    if not products:
        print("No products found. Please run seed_data.py first.")
        return
    
    # Creates 3 sample customers
    sample_customers = [
        {"name": "Rajesh Kumar", "phone": "9876543210", ...},
        {"name": "Priya Sharma", "phone": "9876543211", ...},
        ...
    ]
```

**Entry Point:**
```python
if __name__ == "__main__":
    asyncio.run(seed_sample_data())
```

**Verdict:**
- ✅ Useful for testing
- ⚠️ **MUST NOT RUN IN PRODUCTION**
- Should add warning: `# ⚠️ DEV ONLY - Do not run in production!`
- Keep in `/backend/` for easy developer access

---

## Migration Plan

### PHASE 1: Move Test Files to /tests/

**Step 1.1: Create /tests/ directory**
```powershell
mkdir c:\Users\xiaomi\Downloads\earlybird-emergent-main\tests
```

**Step 1.2: Move test files**
```powershell
Move-Item "c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend\test_login.py" `
          "c:\Users\xiaomi\Downloads\earlybird-emergent-main\tests\"

Move-Item "c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend\test_login_api.py" `
          "c:\Users\xiaomi\Downloads\earlybird-emergent-main\tests\"

Move-Item "c:\Users\xiaomi\Downloads\earlybird-emergent-main\backend\test_acceptance.py" `
          "c:\Users\xiaomi\Downloads\earlybird-emergent-main\tests\"
```

**Step 1.3: Update /scripts/run_verification.sh**
Change line 23 from:
```bash
python3 /app/backend/test_acceptance.py
```
To:
```bash
python3 /app/tests/test_acceptance.py
```

**Step 1.4: Verify imports still work**
- No imports from test_login.py (standalone)
- No imports from test_login_api.py (standalone)
- No imports from test_acceptance.py (standalone)
- ✅ All safe to move with no dependency updates needed

---

### PHASE 2: Add DEV-ONLY Warnings to Seed Files

**Step 2.1: Update seed_data.py**
Add at top of file:
```python
"""
⚠️  DEV ONLY - Do not run in production!
This script resets user authentication data.
Running in production will erase all user passwords.
"""
```

**Step 2.2: Update seed_phase0_v2.py**
Add at top of file:
```python
"""
⚠️  DEV ONLY - Do not run in production!
This script resets Phase 0 V2 data (areas and delivery boys).
Running in production will erase all delivery area assignments.
"""
```

**Step 2.3: Update seed_sample_data.py**
Add at top of file:
```python
"""
⚠️  DEV ONLY - Do not run in production!
This script creates sample customer and subscription test data.
Running in production will pollute database with test records.
"""
```

**Step 2.4: Create .gitignore entry**
Seed files should not be committed with test data. Add to `.backend/.gitignore`:
```
# Development seed scripts (keep code, don't commit test outputs)
seed_data_backup.json
seed_*.json
*.seed
```

---

## Dependency Analysis

### Import Graph: What depends on what?

```
test_login.py
  ├─ database.py (imports db)
  └─ [STANDALONE] - no code imports this

test_login_api.py
  ├─ requests (HTTP client)
  └─ [STANDALONE] - no code imports this

test_acceptance.py
  ├─ requests (HTTP client)
  ├─ json (stdlib)
  ├─ asyncio (stdlib)
  └─ [STANDALONE] - only imported by /scripts/run_verification.sh

seed_data.py
  ├─ database.py
  ├─ auth.py (hash_password function)
  └─ [REFERENCED BY] seed_phase0_v2.py, seed_sample_data.py (comments recommend running first)

seed_phase0_v2.py
  ├─ database.py
  └─ [USED AFTER] seed_data.py

seed_sample_data.py
  ├─ database.py
  └─ [USED AFTER] seed_data.py (explicit check: "Please run seed_data.py first")
```

---

## Risk Assessment

| File | Move? | Risk Level | Mitigation | Effort |
|------|-------|-----------|-----------|--------|
| test_login.py | ✅ Yes | Low | None needed | 5 min |
| test_login_api.py | ✅ Yes | Low | None needed | 5 min |
| test_acceptance.py | ✅ Yes | Medium | Update run_verification.sh | 10 min |
| seed_data.py | ❌ No | Medium | Add DEV-ONLY warning | 5 min |
| seed_phase0_v2.py | ❌ No | Medium | Add DEV-ONLY warning | 5 min |
| seed_sample_data.py | ❌ No | Low | Add DEV-ONLY warning | 5 min |

---

## Before/After Structure

### BEFORE (Current)
```
backend/
  ├─ test_login.py          ← MOVE
  ├─ test_login_api.py      ← MOVE
  ├─ test_acceptance.py     ← MOVE
  ├─ seed_data.py           ← STAY (add warning)
  ├─ seed_phase0_v2.py      ← STAY (add warning)
  ├─ seed_sample_data.py    ← STAY (add warning)
  ├─ server.py
  └─ routes_*.py

/tests/
  └─ [empty]
```

### AFTER (Proposed)
```
backend/
  ├─ seed_data.py           ← With warning comment
  ├─ seed_phase0_v2.py      ← With warning comment
  ├─ seed_sample_data.py    ← With warning comment
  ├─ server.py
  └─ routes_*.py

/tests/
  ├─ test_login.py          ← MOVED
  ├─ test_login_api.py      ← MOVED
  └─ test_acceptance.py     ← MOVED

/scripts/
  └─ run_verification.sh    ← Updated (line 23)
```

---

## Special Notes

### Debug Endpoints
Search for `@app.get("/debug")` or similar: **NONE FOUND**
- No debug endpoints found in routes_*.py files
- All endpoints are properly namespaced under `/api/`
- ✅ No cleanup needed for debug routes

### CI/CD Integration
- `test_acceptance.py` is run by `/scripts/run_verification.sh`
- This script is likely triggered during:
  - Docker build (`Dockerfile` might call it)
  - Pre-deployment verification
  - Manual verification runs
- **CRITICAL:** Update run_verification.sh when moving test_acceptance.py

### Development Workflow
Current developers likely use:
1. `python seed_data.py` - Create user roles
2. `python seed_phase0_v2.py` - Create areas and delivery boys
3. `python seed_sample_data.py` - Create test customers
4. `python test_login.py` - Verify DB connectivity
5. `python test_login_api.py` - Verify login endpoint
6. `python test_acceptance.py` - Run full acceptance tests

After migration, still same workflow, just:
- Test files: `python tests/test_login.py`
- Seed files: `python seed_data.py` (unchanged)

---

## Recommendations

### Immediate Actions (STEP 18)
1. ✅ Move 3 test files to `/tests/`
2. ✅ Add "DEV ONLY" warnings to 3 seed files
3. ✅ Update `/scripts/run_verification.sh` (1 line change)
4. ✅ Update developer documentation

### Follow-up Actions (Later Steps)
1. Create `/tests/__init__.py` to make tests a proper package
2. Create `/tests/README.md` with developer guide
3. Add test running instructions to main README.md
4. Consider creating `/backend/scripts/` for seed files (more structured organization)
5. Add pre-commit hook to prevent running seed files in production

---

## Summary

**Total Files Audited:** 6
- **Test files:** 3 (MOVE to /tests/)
- **Seed files:** 3 (KEEP in /backend/ with warnings)
- **Debug endpoints:** 0 (NONE found)
- **Orphaned imports:** 0 (no code imports test files)

**Migration Effort:** ~30 minutes total
- Move files: 10 minutes
- Update scripts: 5 minutes  
- Add warnings: 15 minutes

**Risk Level:** Low to Medium
- Test file migration: Low risk
- Seed file warnings: Low risk
- Script update: Medium risk (but simple change)

**Next Step:** Execute SEED_MOCK_MIGRATION.md plan (create /tests/ directory, move files, update scripts)
